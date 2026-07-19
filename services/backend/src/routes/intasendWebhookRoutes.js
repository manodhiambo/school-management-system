import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { verifyCheckoutStatus, getWebhookChallenge } from '../services/intasendService.js';
import { recordFeeIncome } from '../utils/incomeRecords.js';
import logger from '../utils/logger.js';

const router = express.Router();

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// POST /api/v1/fee/intasend/webhook — IntaSend collection webhook (no auth — public webhook).
// Same anti-forgery pattern as mpesaCallbackRoutes.js: never trust the payload's
// amount/state, always re-verify server-to-server, credit only what we recorded
// at checkout-creation time.
router.post('/', async (req, res) => {
  // Acknowledge immediately — IntaSend retries up to 5 times with exponential
  // backoff on non-2xx/timeouts, so slow processing here would cause duplicates.
  res.json({ success: true });

  try {
    const { invoice_id: intasendInvoiceId, challenge } = req.body || {};
    if (!intasendInvoiceId) {
      logger.warn('IntaSend webhook: missing invoice_id');
      return;
    }

    const invoiceRows = await query(
      `SELECT id, tenant_id, student_id, paid_amount, balance_amount, net_amount, metadata
       FROM fee_invoices
       WHERE (metadata->>'intasend_invoice_id') = $1`,
      [intasendInvoiceId]
    );
    if (!invoiceRows.length) {
      logger.warn('IntaSend webhook: no invoice found for', intasendInvoiceId);
      return;
    }
    const inv = invoiceRows[0];

    // Verify the shared challenge configured for this tenant before doing anything else.
    const expectedChallenge = await getWebhookChallenge(inv.tenant_id).catch(() => null);
    if (!expectedChallenge || !safeEqual(challenge, expectedChallenge)) {
      logger.warn('IntaSend webhook: challenge mismatch for tenant', inv.tenant_id);
      return;
    }

    // Idempotency guard — IntaSend can retry the same event; don't double-credit.
    const already = await query(
      `SELECT 1 FROM fee_payments WHERE invoice_id = $1 AND transaction_id = $2 AND payment_method = 'intasend'`,
      [inv.id, intasendInvoiceId]
    );
    if (already.length) {
      logger.info(`IntaSend webhook: payment already recorded for ${intasendInvoiceId}, skipping`);
      return;
    }

    // Never trust req.body's state/amount — re-verify directly with IntaSend
    // using our own stored credentials, which an attacker cannot forge.
    const verified = await verifyCheckoutStatus(inv.tenant_id, intasendInvoiceId);
    if (!verified || verified.state !== 'COMPLETE') {
      logger.info(`IntaSend payment not complete [${intasendInvoiceId}]: state=${verified?.state}`);
      return;
    }

    // Credit exactly the amount our own server recorded when creating the
    // checkout, not anything from the webhook body or the status response.
    const amount = parseFloat(inv.metadata?.intasend_amount || 0);
    if (!amount) {
      logger.warn('IntaSend webhook: no recorded intasend_amount for', intasendInvoiceId);
      return;
    }
    const newPaid = parseFloat(inv.paid_amount || 0) + amount;
    const newBalance = Math.max(0, parseFloat(inv.balance_amount ?? inv.net_amount ?? 0) - amount);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE fee_invoices
       SET paid_amount = $1, balance_amount = $2, status = $3
       WHERE id = $4`,
      [newPaid, newBalance, newStatus, inv.id]
    );

    await query(
      `INSERT INTO fee_payments
         (id, invoice_id, student_id, tenant_id, amount, payment_method,
          transaction_id, payment_date, description, status)
       VALUES ($1,$2,$3,$4,$5,'intasend',$6,NOW(),'IntaSend payment','completed')
       ON CONFLICT DO NOTHING`,
      [uuidv4(), inv.id, inv.student_id, inv.tenant_id, amount, intasendInvoiceId]
    );

    await recordFeeIncome({ tid: inv.tenant_id, studentId: inv.student_id, amount, paymentMethod: 'intasend', receiptNumber: intasendInvoiceId, paymentDate: null, userId: null });

    logger.info(`IntaSend payment confirmed: ${intasendInvoiceId} KES ${amount} for invoice ${inv.id}`);
  } catch (err) {
    logger.error('IntaSend webhook processing error:', err);
  }
});

export default router;
