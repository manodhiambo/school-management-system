import express from 'express';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured');
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const resp = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  if (!resp.ok) throw new Error(`M-Pesa auth failed: ${resp.status}`);
  const json = await resp.json();
  return json.access_token;
}

// Independently verify a transaction with Safaricom rather than trusting the
// callback body, since the callback endpoint has no auth (it's a public webhook)
// and anyone who has initiated their own STK push knows their CheckoutRequestID —
// trusting the POSTed Amount/ResultCode directly would let them forge "paid" results.
async function verifyWithSafaricom(checkoutRequestId) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error('M-Pesa not configured');
  const token = await getMpesaToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const resp = await fetch(
    'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
    }
  );
  return resp.json();
}

// POST /api/v1/fee/mpesa/callback — Safaricom STK push result (no auth required — public webhook)
router.post('/callback', async (req, res) => {
  // Always respond 200 immediately so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: 'OK' });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return;

    const { CheckoutRequestID } = body;
    if (!CheckoutRequestID) return;

    // Find invoice by the checkout ID we stored when initiating
    const invoiceRows = await query(
      `SELECT id, tenant_id, student_id, net_amount, paid_amount, balance_amount, metadata
       FROM fee_invoices
       WHERE (metadata->>'mpesa_checkout_id') = $1`,
      [CheckoutRequestID]
    );
    if (!invoiceRows.length) {
      logger.warn('M-Pesa callback: no invoice found for checkout', CheckoutRequestID);
      return;
    }
    const inv = invoiceRows[0];

    // Don't trust the callback body for the result — re-verify directly with
    // Safaricom using our own credentials, which an attacker cannot forge.
    const verified = await verifyWithSafaricom(CheckoutRequestID);
    if (String(verified.ResultCode) !== '0') {
      logger.warn(`M-Pesa STK not completed [${CheckoutRequestID}]: ${verified.ResultDesc || verified.errorMessage}`);
      return;
    }

    // The query API only confirms completion — it does not return the amount or
    // receipt number (those only ever appear in the unauthenticated callback body,
    // which we don't trust). Credit exactly the amount our own server fixed when
    // it initiated this STK push, since that is what Safaricom actually debited.
    const amount = parseFloat(inv.metadata?.mpesa_amount || 0);
    if (!amount) {
      logger.warn('M-Pesa callback: no recorded mpesa_amount for checkout', CheckoutRequestID);
      return;
    }
    const mpesaRef = String(verified.MerchantRequestID || CheckoutRequestID);
    const newPaid = parseFloat(inv.paid_amount || 0) + amount;
    const newBalance = Math.max(0, parseFloat(inv.balance_amount ?? inv.net_amount ?? 0) - amount);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE fee_invoices
       SET paid_amount = $1, balance_amount = $2, status = $3,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mpesa_ref', $4::text)
       WHERE id = $5`,
      [newPaid, newBalance, newStatus, mpesaRef, inv.id]
    );

    await query(
      `INSERT INTO fee_payments
         (id, invoice_id, student_id, tenant_id, amount, payment_method,
          transaction_id, payment_date, description, status)
       VALUES ($1,$2,$3,$4,$5,'mpesa',$6,NOW(),'M-Pesa STK payment','completed')
       ON CONFLICT DO NOTHING`,
      [uuidv4(), inv.id, inv.student_id, inv.tenant_id, amount, mpesaRef]
    );

    logger.info(`M-Pesa payment confirmed: ${mpesaRef} KES ${amount} for invoice ${inv.id}`);
  } catch (err) {
    logger.error('M-Pesa callback processing error:', err);
  }
});

export default router;
