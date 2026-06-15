import express from 'express';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/v1/fee/mpesa/callback — Safaricom STK push result (no auth required)
router.post('/callback', async (req, res) => {
  // Always respond 200 immediately so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: 'OK' });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;
    if (ResultCode !== 0) {
      logger.warn(`M-Pesa STK failed [${CheckoutRequestID}]: ${ResultDesc}`);
      return;
    }

    const meta = {};
    (CallbackMetadata?.Item || []).forEach(({ Name, Value }) => { meta[Name] = Value; });

    const amount = parseFloat(meta.Amount || 0);
    const mpesaRef = String(meta.MpesaReceiptNumber || '');

    // Find invoice by the checkout ID we stored when initiating
    const invoiceRows = await query(
      `SELECT id, tenant_id, student_id, net_amount, paid_amount, balance_amount
       FROM fee_invoices
       WHERE (metadata->>'mpesa_checkout_id') = $1`,
      [CheckoutRequestID]
    );
    if (!invoiceRows.length) {
      logger.warn('M-Pesa callback: no invoice found for checkout', CheckoutRequestID);
      return;
    }
    const inv = invoiceRows[0];
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
