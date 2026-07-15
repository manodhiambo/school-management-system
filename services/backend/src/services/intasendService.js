import axios from 'axios';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// IntaSend bank/card collection integration — modeled on mpesaService.js's style
// (plain axios, no SDK) so this security-sensitive payment code stays fully
// auditable. Confirmed against IntaSend's public documentation
// (github.com/IntaSend/documentation): base URLs, the /api/v1/payment/collection/
// and /api/v1/payment/status/ endpoints, and their public_key-based auth model.
// NOT yet verified against a live account — do that first against sandbox before
// taking this to production; see the comment on REDIRECT_URL_FIELD_CANDIDATES below.

const SANDBOX_BASE_URL = 'https://sandbox.intasend.com';
const LIVE_BASE_URL = 'https://payment.intasend.com';

async function getTenantConfig(tenantId) {
  const rows = await query(
    `SELECT publishable_key, secret_key_encrypted, webhook_challenge_encrypted, is_enabled, is_test_mode
     FROM intasend_config WHERE tenant_id = $1`,
    [tenantId]
  );
  if (!rows.length || !rows[0].is_enabled) {
    throw new Error('IntaSend is not configured or not enabled for this school');
  }
  const row = rows[0];
  return {
    publicKey: row.publishable_key,
    secretKey: decrypt(row.secret_key_encrypted),
    webhookChallenge: decrypt(row.webhook_challenge_encrypted),
    baseUrl: row.is_test_mode ? SANDBOX_BASE_URL : LIVE_BASE_URL,
  };
}

/**
 * Creates an IntaSend collection request for a fee invoice and records the
 * checkout reference on the invoice, mirroring mpesa_checkout_id/mpesa_amount
 * in mpesaCallbackRoutes.js — the webhook handler looks the invoice back up
 * by this id and credits exactly the amount recorded here, never whatever the
 * webhook body claims.
 */
export async function createCheckout(tenantId, invoice, customer) {
  const cfg = await getTenantConfig(tenantId);
  const amount = parseFloat(invoice.balance_amount ?? invoice.net_amount);
  if (!amount || amount <= 0) {
    throw new Error('Invoice has no outstanding balance to collect');
  }

  const response = await axios.post(
    `${cfg.baseUrl}/api/v1/payment/collection/`,
    {
      public_key: cfg.publicKey,
      currency: 'KES',
      method: 'CARD-PAYMENT', // bank/card collection — M-Pesa already goes through mpesaService.js directly via Safaricom
      amount,
      api_ref: invoice.id,
      name: customer.name,
      email: customer.email,
      phone_number: customer.phone,
    },
    { timeout: 15000 }
  ).catch(err => {
    const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error('IntaSend checkout creation failed:', msg);
    throw new Error(`Failed to create IntaSend checkout: ${msg}`);
  });

  const inv = response.data?.invoice;
  if (!inv?.id) {
    throw new Error('IntaSend did not return an invoice id');
  }

  // TODO: confirm the exact field name IntaSend returns for the hosted checkout
  // redirect URL against a real sandbox account (candidates seen in different
  // IntaSend API surfaces: `url`, `checkout_url`, `redirect_url`) — falls back
  // to null (no redirect) until confirmed, at which point the frontend can open it.
  const redirectUrl = response.data?.url || response.data?.checkout_url || response.data?.redirect_url || null;

  await query(
    `UPDATE fee_invoices
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'intasend_invoice_id', $1::text,
           'intasend_amount', $2::numeric
         )
     WHERE id = $3`,
    [inv.id, amount, invoice.id]
  );

  logger.info(`IntaSend checkout created: ${inv.id} KES ${amount} for invoice ${invoice.id}`);
  return { intasendInvoiceId: inv.id, redirectUrl, state: inv.state };
}

/**
 * Independently queries IntaSend for an invoice's real status — the webhook
 * handler must call this rather than trusting the webhook payload's `state`
 * field directly, same anti-forgery pattern as verifyWithSafaricom() in
 * mpesaCallbackRoutes.js.
 */
export async function verifyCheckoutStatus(tenantId, intasendInvoiceId) {
  const cfg = await getTenantConfig(tenantId);
  const response = await axios.post(
    `${cfg.baseUrl}/api/v1/payment/status/`,
    { public_key: cfg.publicKey, invoice_id: intasendInvoiceId },
    { timeout: 15000 }
  ).catch(err => {
    const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error('IntaSend status check failed:', msg);
    throw new Error(`Failed to verify IntaSend payment status: ${msg}`);
  });
  return response.data?.invoice; // { id, invoice_id, state, ... } — state e.g. PENDING/COMPLETE/FAILED
}

/**
 * Fetches (and decrypts) the tenant's configured webhook challenge, for the
 * webhook route to compare against the payload's `challenge` field.
 */
export async function getWebhookChallenge(tenantId) {
  const cfg = await getTenantConfig(tenantId);
  return cfg.webhookChallenge;
}

export async function saveConfig(tenantId, { publishableKey, secretKey, webhookChallenge, isEnabled, isTestMode }) {
  await query(
    `INSERT INTO intasend_config (tenant_id, publishable_key, secret_key_encrypted, webhook_challenge_encrypted, is_enabled, is_test_mode, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       publishable_key = COALESCE($2, intasend_config.publishable_key),
       secret_key_encrypted = COALESCE($3, intasend_config.secret_key_encrypted),
       webhook_challenge_encrypted = COALESCE($4, intasend_config.webhook_challenge_encrypted),
       is_enabled = $5,
       is_test_mode = $6,
       updated_at = NOW()`,
    [
      tenantId,
      publishableKey || null,
      secretKey ? encrypt(secretKey) : null,
      webhookChallenge ? encrypt(webhookChallenge) : null,
      !!isEnabled,
      isTestMode !== false,
    ]
  );
}

export async function getConfigForDisplay(tenantId) {
  const rows = await query(
    `SELECT publishable_key, secret_key_encrypted, webhook_challenge_encrypted, is_enabled, is_test_mode, updated_at
     FROM intasend_config WHERE tenant_id = $1`,
    [tenantId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  const { maskSecret } = await import('../utils/encryption.js');
  return {
    publishable_key: row.publishable_key,
    secret_key_masked: row.secret_key_encrypted ? maskSecret(decrypt(row.secret_key_encrypted)) : null,
    webhook_challenge_masked: row.webhook_challenge_encrypted ? maskSecret(decrypt(row.webhook_challenge_encrypted)) : null,
    is_enabled: row.is_enabled,
    is_test_mode: row.is_test_mode,
    updated_at: row.updated_at,
  };
}
