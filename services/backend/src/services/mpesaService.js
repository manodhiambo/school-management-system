import axios from 'axios';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

// ============================================================
// STANDALONE NAMED EXPORTS — used by school registration flow
// ============================================================

const _CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'W1mgwbLviwQ9nA7Vbhwsebd4tf9chHEigsqqoOUsT9PKR9Vw';
const _CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'V2RZusymMw0OXZs2TtIl61n9BZtBMO9tcV9wAD8WAAfHHIxG9BrtctpX0t23oRdq';
const _BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const _SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const _PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const _CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://skulmanager.org/api/v1/registration/mpesa/callback';

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

class MpesaService {
  constructor() {
    // M-Pesa API credentials - store these in .env file
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.passKey = process.env.MPESA_PASSKEY || '';
    this.shortCode = process.env.MPESA_SHORTCODE || '174379'; // Sandbox default
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/v1/fee/mpesa/callback';
    
    // Use sandbox URL for testing, production URL for live
    this.baseUrl = process.env.MPESA_ENV === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // Get OAuth access token
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('M-Pesa OAuth error:', error.response?.data || error.message);
      throw new ApiError(500, 'Failed to authenticate with M-Pesa');
    }
  }

  // Generate password for STK Push
  generatePassword() {
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${this.shortCode}${this.passKey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Get timestamp in required format (YYYYMMDDHHmmss)
  getTimestamp() {
    const now = new Date();
    return now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
  }

  // Format phone number to 254XXXXXXXXX format
  formatPhoneNumber(phone) {
    // Remove any spaces, dashes, or plus signs
    let cleaned = phone.replace(/[\s\-\+]/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If starts with +254, remove the +
    if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    }
    
    // If doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  // Initiate STK Push
  async initiateSTKPush(invoiceId, phoneNumber, amount, initiatedBy) {
    try {
      // Validate invoice exists and has balance
      const invoices = await query(
        `SELECT fi.*, s.id as student_id, s.first_name, s.last_name, s.admission_number
         FROM fee_invoices fi
         JOIN students s ON fi.student_id = s.id
         WHERE fi.id = ?`,
        [invoiceId]
      );

      if (invoices.length === 0) {
        throw new ApiError(404, 'Invoice not found');
      }

      const invoice = invoices[0];

      if (invoice.status === 'paid') {
        throw new ApiError(400, 'Invoice is already fully paid');
      }

      const balanceAmount = parseFloat(invoice.balance_amount);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount <= 0) {
        throw new ApiError(400, 'Amount must be greater than 0');
      }

      if (paymentAmount > balanceAmount) {
        throw new ApiError(400, `Amount exceeds balance. Maximum payable: KES ${balanceAmount}`);
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate password and timestamp
      const { password, timestamp } = this.generatePassword();

      // Create transaction record first
      const transactionId = uuidv4();
      await query(
        `INSERT INTO mpesa_transactions 
         (id, invoice_id, student_id, phone_number, amount, status, initiated_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [transactionId, invoiceId, invoice.student_id, formattedPhone, paymentAmount, initiatedBy]
      );

      // Prepare STK Push request
      const stkPushData = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(paymentAmount), // M-Pesa requires whole numbers
        PartyA: formattedPhone,
        PartyB: this.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: invoice.invoice_number,
        TransactionDesc: `School Fees - ${invoice.first_name} ${invoice.last_name}`
      };

      logger.info('Initiating STK Push:', { invoiceId, phone: formattedPhone, amount: paymentAmount });

      // Make STK Push request
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data;

      // Update transaction with M-Pesa response
      await query(
        `UPDATE mpesa_transactions 
         SET merchant_request_id = ?, checkout_request_id = ?, result_desc = ?
         WHERE id = ?`,
        [
          responseData.MerchantRequestID,
          responseData.CheckoutRequestID,
          responseData.ResponseDescription,
          transactionId
        ]
      );

      logger.info('STK Push initiated successfully:', responseData);

      return {
        success: true,
        transactionId,
        merchantRequestId: responseData.MerchantRequestID,
        checkoutRequestId: responseData.CheckoutRequestID,
        responseDescription: responseData.ResponseDescription,
        message: 'Please check your phone and enter your M-Pesa PIN to complete the payment'
      };

    } catch (error) {
      logger.error('STK Push error:', error.response?.data || error.message);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
    }
  }

  // Handle M-Pesa callback
  async handleCallback(callbackData) {
    try {
      logger.info('M-Pesa callback received:', JSON.stringify(callbackData));

      const { Body } = callbackData;
      const { stkCallback } = Body;
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

      // Find the transaction
      const transactions = await query(
        'SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?',
        [CheckoutRequestID]
      );

      if (transactions.length === 0) {
        logger.error('Transaction not found for CheckoutRequestID:', CheckoutRequestID);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];

      if (ResultCode === 0) {
        // Payment successful
        const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
        
        let mpesaReceiptNumber = '';
        let transactionDate = null;
        let phoneNumber = '';
        let amount = 0;

        callbackMetadata.forEach(item => {
          switch (item.Name) {
            case 'MpesaReceiptNumber':
              mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              phoneNumber = item.Value;
              break;
            case 'Amount':
              amount = item.Value;
              break;
          }
        });

        // Update transaction status
        await query(
          `UPDATE mpesa_transactions 
           SET status = 'success', 
               result_code = ?, 
               result_desc = ?,
               mpesa_receipt_number = ?,
               transaction_date = ?,
               callback_data = ?
           WHERE id = ?`,
          [
            ResultCode,
            ResultDesc,
            mpesaReceiptNumber,
            transactionDate ? new Date(transactionDate.toString().replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6')) : new Date(),
            JSON.stringify(callbackData),
            transaction.id
          ]
        );

        // Record the payment in fee_payments
        const paymentId = uuidv4();
        const receiptNumber = await this.generateReceiptNumber();

        await query(
          `INSERT INTO fee_payments 
           (id, invoice_id, receipt_number, payment_method, transaction_id, amount, status, gateway_response, remarks)
           VALUES (?, ?, ?, 'mpesa', ?, ?, 'success', ?, ?)`,
          [
            paymentId,
            transaction.invoice_id,
            receiptNumber,
            mpesaReceiptNumber,
            transaction.amount,
            JSON.stringify(callbackData),
            `M-Pesa payment - ${mpesaReceiptNumber}`
          ]
        );

        // Update invoice
        const invoice = await query('SELECT * FROM fee_invoices WHERE id = ?', [transaction.invoice_id]);
        if (invoice.length > 0) {
          const newPaidAmount = parseFloat(invoice[0].paid_amount) + parseFloat(transaction.amount);
          const newBalanceAmount = parseFloat(invoice[0].net_amount) - newPaidAmount;
          const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

          await query(
            `UPDATE fee_invoices 
             SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = NOW()
             WHERE id = ?`,
            [newPaidAmount, Math.max(0, newBalanceAmount), newStatus, transaction.invoice_id]
          );
        }

        logger.info('M-Pesa payment recorded successfully:', mpesaReceiptNumber);

        // TODO: Send SMS/notification to parent about successful payment

        return { success: true, message: 'Payment recorded successfully' };

      } else {
        // Payment failed or cancelled
        await query(
          `UPDATE mpesa_transactions 
           SET status = 'failed', 
               result_code = ?, 
               result_desc = ?,
               callback_data = ?
           WHERE id = ?`,
          [ResultCode, ResultDesc, JSON.stringify(callbackData), transaction.id]
        );

        logger.info('M-Pesa payment failed:', ResultDesc);

        return { success: false, message: ResultDesc };
      }

    } catch (error) {
      logger.error('Callback processing error:', error);
      throw error;
    }
  }

  // Generate receipt number
  async generateReceiptNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `MREC${year}`;

    const results = await query(
      `SELECT receipt_number FROM fee_payments
       WHERE receipt_number LIKE ?
       ORDER BY receipt_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].receipt_number;
      sequence = parseInt(lastNumber.slice(-6)) + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  // Query transaction status
  async queryTransactionStatus(checkoutRequestId) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Transaction status query error:', error.response?.data || error.message);
      throw new ApiError(500, 'Failed to query transaction status');
    }
  }

  // Get transaction by ID
  async getTransaction(transactionId) {
    const transactions = await query(
      `SELECT mt.*, fi.invoice_number, s.first_name, s.last_name
       FROM mpesa_transactions mt
       JOIN fee_invoices fi ON mt.invoice_id = fi.id
       JOIN students s ON mt.student_id = s.id
       WHERE mt.id = ?`,
      [transactionId]
    );

    if (transactions.length === 0) {
      throw new ApiError(404, 'Transaction not found');
    }

    return transactions[0];
  }

  // Get transactions for a student
  async getStudentTransactions(studentId) {
    const transactions = await query(
      `SELECT mt.*, fi.invoice_number
       FROM mpesa_transactions mt
       JOIN fee_invoices fi ON mt.invoice_id = fi.id
       WHERE mt.student_id = ?
       ORDER BY mt.created_at DESC`,
      [studentId]
    );

    return transactions;
  }
}

export default new MpesaService();
