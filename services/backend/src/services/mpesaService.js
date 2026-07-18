import axios from 'axios';
import logger from '../utils/logger.js';

// ============================================================
// STANDALONE NAMED EXPORTS — used by school registration flow
// ============================================================

const _CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const _CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const _BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const _SHORTCODE = process.env.MPESA_SHORTCODE || '';
const _PASSKEY = process.env.MPESA_PASSKEY || '';
const _CALLBACK_URL = process.env.MPESA_CALLBACK_URL || '';

/**
 * Format phone number to 254XXXXXXXXX format.
 * Accepts: 07XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX
 */
export const formatPhone = (phone) => {
  if (!phone) throw new Error('Phone number is required');
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
    throw new Error(`Invalid phone number format: ${phone}. Use 07XXXXXXXXX or 254XXXXXXXXX`);
  }
  return cleaned;
};

/**
 * Get OAuth token from Safaricom Daraja API.
 */
export const getOAuthToken = async () => {
  const credentials = Buffer.from(`${_CONSUMER_KEY}:${_CONSUMER_SECRET}`).toString('base64');
  try {
    const response = await axios.get(
      `${_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
    const token = response.data?.access_token;
    if (!token) throw new Error('No access token in M-Pesa OAuth response');
    logger.info('M-Pesa OAuth token obtained successfully');
    return token;
  } catch (error) {
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error('M-Pesa OAuth error:', msg);
    throw new Error(`Failed to get M-Pesa OAuth token: ${msg}`);
  }
};

const _generateTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
};

/**
 * Initiate M-Pesa STK Push for school registration / renewal payments.
 *
 * @param {string} phone       - Phone number (any common Kenyan format)
 * @param {number} amount      - Amount in KES
 * @param {string} accountRef  - Account reference
 * @param {string} description - Transaction description
 * @returns {object}           - Daraja API STK push response
 */
export const initiateSTKPush = async (phone, amount, accountRef, description) => {
  try {
    const formattedPhone = formatPhone(phone);
    const accessToken = await getOAuthToken();
    const timestamp = _generateTimestamp();
    const password = Buffer.from(`${_SHORTCODE}${_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: _SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: _SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: _CALLBACK_URL,
      AccountReference: String(accountRef).substring(0, 12),
      TransactionDesc: String(description).substring(0, 13)
    };

    logger.info(`Initiating STK Push: phone=${formattedPhone}, amount=${amount}, ref=${accountRef}`);

    const response = await axios.post(
      `${_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    logger.info('STK Push response:', response.data);
    return response.data;
  } catch (error) {
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error('STK Push error:', msg);
    throw new Error(`M-Pesa STK Push failed: ${msg}`);
  }
};
