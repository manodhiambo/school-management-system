/**
 * Seeds all default data for a newly registered tenant.
 * Covers: chart of accounts, finance settings, school settings,
 * default academic year, and default financial year.
 *
 * Safe to call multiple times — all inserts use existence checks.
 */
import { query } from '../config/database.js';

export async function seedTenantData(tenantId, { schoolName, email, phone, schoolCode }) {
  const currentYear = new Date().getFullYear().toString();
  const startDate  = `${currentYear}-01-01`;
  const endDate    = `${currentYear}-12-31`;

  // ----------------------------------------------------------------
  // 1. Chart of accounts — standard Kenyan school accounts
  // ----------------------------------------------------------------
  await query(`
    INSERT INTO chart_of_accounts
      (tenant_id, account_code, account_name, account_type, description, is_active, is_system_account)
    VALUES
      ($1, '1000', 'Assets',                  'asset',    'All Assets',                  true, true),
      ($1, '1100', 'Current Assets',           'asset',    'Short-term assets',           true, true),
      ($1, '1110', 'Cash on Hand',             'asset',    'Physical cash',               true, true),
      ($1, '1120', 'Petty Cash',               'asset',    'Petty cash fund',             true, true),
      ($1, '1130', 'Bank Account - Main',      'asset',    'Primary bank account',        true, true),
      ($1, '1140', 'Bank Account - Secondary', 'asset',    'Secondary bank account',      true, true),
      ($1, '1150', 'M-Pesa Account',           'asset',    'Mobile money account',        true, true),
      ($1, '1160', 'Accounts Receivable',      'asset',    'Money owed to school',        true, true),
      ($1, '1170', 'Student Fee Receivables',  'asset',    'Outstanding student fees',    true, true),
      ($1, '1200', 'Fixed Assets',             'asset',    'Long-term assets',            true, true),
      ($1, '1210', 'Furniture & Fixtures',     'asset',    'School furniture',            true, true),
      ($1, '1220', 'Equipment',                'asset',    'School equipment',            true, true),
      ($1, '1230', 'Vehicles',                 'asset',    'School vehicles',             true, true),
      ($1, '1240', 'Buildings',                'asset',    'School buildings',            true, true),
      ($1, '1250', 'Land',                     'asset',    'School land',                 true, true),
      ($1, '1260', 'Computers & IT Equipment', 'asset',    'IT assets',                   true, true),
      ($1, '1270', 'Accumulated Depreciation', 'asset',    'Depreciation of assets',      true, true),
      ($1, '2000', 'Liabilities',              'liability','All Liabilities',             true, true),
      ($1, '2100', 'Current Liabilities',      'liability','Short-term obligations',      true, true),
      ($1, '2110', 'Accounts Payable',         'liability','Money owed to vendors',       true, true),
      ($1, '2120', 'Salaries Payable',         'liability','Unpaid salaries',             true, true),
      ($1, '2130', 'PAYE Payable',             'liability','Tax withholdings',            true, true),
      ($1, '2140', 'NHIF Payable',             'liability','Health insurance payable',    true, true),
      ($1, '2150', 'NSSF Payable',             'liability','Pension payable',             true, true),
      ($1, '2160', 'VAT Payable',              'liability','VAT owed to KRA',             true, true),
      ($1, '2170', 'Student Deposits',         'liability','Refundable deposits',         true, true),
      ($1, '2200', 'Long-term Liabilities',    'liability','Long-term debt',              true, true),
      ($1, '2210', 'Loans Payable',            'liability','Bank loans',                  true, true),
      ($1, '3000', 'Equity',                   'equity',   'Owners Equity',               true, true),
      ($1, '3100', 'Retained Earnings',        'equity',   'Accumulated profits',         true, true),
      ($1, '3200', 'Current Year Earnings',    'equity',   'Current year profit/loss',    true, true),
      ($1, '4000', 'Income',                   'income',   'All Income',                  true, true),
      ($1, '4100', 'Tuition Fee Income',       'income',   'Student tuition fees',        true, true),
      ($1, '4110', 'Exam Fee Income',          'income',   'Examination fees',            true, true),
      ($1, '4120', 'Library Fee Income',       'income',   'Library fees',                true, true),
      ($1, '4130', 'Transport Fee Income',     'income',   'Transport fees',              true, true),
      ($1, '4200', 'Other Income',             'income',   'Miscellaneous income',        true, true),
      ($1, '4210', 'Donations',                'income',   'Donations received',          true, true),
      ($1, '4220', 'Grants',                   'income',   'Government/NGO grants',       true, true),
      ($1, '4230', 'Interest Income',          'income',   'Bank interest',               true, true),
      ($1, '5000', 'Expenses',                 'expense',  'All Expenses',                true, true),
      ($1, '5100', 'Staff Costs',              'expense',  'Employee expenses',           true, true),
      ($1, '5110', 'Salaries & Wages',         'expense',  'Staff salaries',              true, true),
      ($1, '5120', 'Staff Benefits',           'expense',  'Employee benefits',           true, true),
      ($1, '5200', 'Operating Expenses',       'expense',  'Day-to-day operations',       true, true),
      ($1, '5210', 'Utilities',                'expense',  'Water, electricity, internet',true, true),
      ($1, '5220', 'Supplies & Materials',     'expense',  'School supplies',             true, true),
      ($1, '5230', 'Maintenance & Repairs',    'expense',  'Repairs and maintenance',     true, true),
      ($1, '5240', 'Transport & Fuel',         'expense',  'Vehicle expenses',            true, true),
      ($1, '5250', 'Insurance',                'expense',  'Insurance premiums',          true, true),
      ($1, '5260', 'Professional Fees',        'expense',  'Legal, audit fees',           true, true),
      ($1, '5300', 'Administrative Expenses',  'expense',  'Admin costs',                 true, true),
      ($1, '5310', 'Office Expenses',          'expense',  'Stationery, printing',        true, true),
      ($1, '5320', 'Communication',            'expense',  'Phone, postage',              true, true),
      ($1, '5330', 'Bank Charges',             'expense',  'Bank fees',                   true, true),
      ($1, '5400', 'Other Expenses',           'expense',  'Miscellaneous',               true, true),
      ($1, '5410', 'Depreciation Expense',     'expense',  'Asset depreciation',          true, true)
    ON CONFLICT (account_code, tenant_id) DO NOTHING
  `, [tenantId]);

  // ----------------------------------------------------------------
  // 2. Finance settings — Kenyan defaults
  // ----------------------------------------------------------------
  await query(`
    INSERT INTO finance_settings (tenant_id, setting_key, setting_value, setting_type, description)
    VALUES
      ($1, 'default_vat_rate',            '16',    'number',  'Standard VAT rate'),
      ($1, 'withholding_vat_rate',         '2',     'number',  'Withholding VAT rate'),
      ($1, 'currency',                     'KES',   'text',    'Base currency'),
      ($1, 'currency_symbol',              'KSh',   'text',    'Currency symbol'),
      ($1, 'financial_year_start_month',   '1',     'number',  'Month financial year starts'),
      ($1, 'enable_vat_calculation',       'true',  'boolean', 'Enable automatic VAT calculation'),
      ($1, 'enable_approval_workflow',     'true',  'boolean', 'Enable expense approval workflow'),
      ($1, 'petty_cash_limit',             '50000', 'number',  'Maximum petty cash amount'),
      ($1, 'expense_approval_threshold',   '100000','number',  'Amount requiring admin approval'),
      ($1, 'auto_generate_journal_entries','true',  'boolean', 'Auto-create journal entries')
    ON CONFLICT (setting_key, tenant_id) DO NOTHING
  `, [tenantId]);

  // ----------------------------------------------------------------
  // 3. School settings — insert once per tenant
  // ----------------------------------------------------------------
  const existingSettings = await query(
    'SELECT id FROM settings WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  if (existingSettings.length === 0) {
    await query(`
      INSERT INTO settings
        (tenant_id, school_name, school_code, email, phone,
         current_academic_year, timezone, currency, date_format, time_format)
      VALUES ($1, $2, $3, $4, $5, $6, 'Africa/Nairobi', 'KES', 'DD/MM/YYYY', '12')
    `, [tenantId, schoolName, schoolCode, email, phone || null, currentYear]);
  }

  // ----------------------------------------------------------------
  // 4. Academic year — current calendar year, marked as current
  // ----------------------------------------------------------------
  const existingAcYear = await query(
    'SELECT id FROM academic_years WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  let academicYearId;
  if (existingAcYear.length === 0) {
    const newAcYear = await query(`
      INSERT INTO academic_years (tenant_id, year, start_date, end_date, is_current)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id
    `, [tenantId, currentYear, startDate, endDate]);
    academicYearId = newAcYear[0].id;
  } else {
    academicYearId = existingAcYear[0].id;
  }

  // ----------------------------------------------------------------
  // 5. Financial year — linked to the academic year above
  // ----------------------------------------------------------------
  const existingFinYear = await query(
    'SELECT id FROM financial_years WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  if (existingFinYear.length === 0) {
    await query(`
      INSERT INTO financial_years
        (tenant_id, academic_year_id, year_name, start_date, end_date, status, is_current, is_active)
      VALUES ($1, $2, $3, $4, $5, 'active', true, true)
      ON CONFLICT (academic_year_id) DO NOTHING
    `, [tenantId, academicYearId, currentYear, startDate, endDate]);
  }
}
