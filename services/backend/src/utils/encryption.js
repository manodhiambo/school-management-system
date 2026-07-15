import crypto from 'crypto';

// AES-256-GCM encryption for financial secrets stored at rest (IntaSend API keys).
// This is the first encryption-at-rest utility in this codebase — everywhere else
// (e.g. whatsapp_config.access_token) stores third-party credentials as plaintext.
// Used only for intasend_config; ENCRYPTION_KEY must be a 32-byte value, generated
// with `openssl rand -hex 32`.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set to at least a 32-byte value (openssl rand -hex 32)');
  }
  // Accept either a 32-char raw string or a hex string >=64 chars (openssl rand -hex 32);
  // normalise to exactly 32 bytes either way.
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store iv:authTag:ciphertext, each base64, colon-delimited.
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(payload) {
  if (!payload) return null;
  const [ivB64, authTagB64, dataB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !dataB64) return null;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// Shows only the last N characters, for safely displaying a masked secret in the UI.
export function maskSecret(plaintext, visibleChars = 4) {
  if (!plaintext) return null;
  const str = String(plaintext);
  if (str.length <= visibleChars) return '*'.repeat(str.length);
  return '*'.repeat(str.length - visibleChars) + str.slice(-visibleChars);
}
