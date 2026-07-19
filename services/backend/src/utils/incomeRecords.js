import { query } from '../config/database.js';
import logger from './logger.js';

// Mirrors a successful fee_payments row into income_records — this is what the
// Finance Dashboard stat tiles and monthly collection chart sum (income_records
// WHERE income_category = 'Student Fees'). Every fee-payment write path (manual
// record, M-Pesa STK callback, IntaSend webhook) must call this or the dashboard
// undercounts/zeroes out regardless of how many payments were actually recorded.
// Best-effort: a failure here must not roll back the payment itself, since
// fee_payments/fee_invoices are the source of truth.
export async function recordFeeIncome({ tid, studentId, amount, paymentMethod, receiptNumber, paymentDate, userId }) {
  try {
    await query(
      `INSERT INTO income_records (
         tenant_id, income_number, income_date, income_category,
         student_id, amount, vat_rate, vat_amount, total_amount,
         payment_method, payment_reference, description, status, created_by
       ) VALUES ($1,$2,COALESCE($3::timestamptz, NOW()),'Student Fees',$4,$5,0,0,$5,$6,$7,'Fee payment',$8,$9)`,
      [tid, 'INC-FEE-' + Date.now().toString(36).toUpperCase(), paymentDate, studentId, amount, paymentMethod, receiptNumber, 'completed', userId || null]
    );
  } catch (err) {
    logger.error('Record fee income error (payment itself already saved):', err);
  }
}
