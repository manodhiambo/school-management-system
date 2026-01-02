-- =====================================================
-- FINANCE MODULE - DATABASE SCHEMA (FULL UUID Support)
-- School Management System - Kenya
-- =====================================================

-- 1. CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(15,2) DEFAULT 0,
    is_system_account BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);

-- 2. FINANCIAL YEARS
CREATE TABLE IF NOT EXISTS financial_years (
    id SERIAL PRIMARY KEY,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    year_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_fy_status ON financial_years(status);

-- 3. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    budget_name VARCHAR(200) NOT NULL,
    financial_year_id INTEGER REFERENCES financial_years(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_fy ON budgets(financial_year_id);

-- 4. BUDGET ALLOCATIONS
CREATE TABLE IF NOT EXISTS budget_allocations (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ba_budget ON budget_allocations(budget_id);

-- 5. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    kra_pin VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    outstanding_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_code ON vendors(vendor_code);

-- 6. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    bank_name VARCHAR(200) NOT NULL,
    branch VARCHAR(100),
    account_type VARCHAR(50) CHECK (account_type IN ('savings', 'current', 'mpesa', 'fixed_deposit')),
    currency VARCHAR(10) DEFAULT 'KES',
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    coa_account_id INTEGER REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_acc_num ON bank_accounts(account_number);

-- 7. JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    financial_year_id INTEGER REFERENCES financial_years(id),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    description TEXT NOT NULL,
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'reversed')),
    posted_at TIMESTAMP,
    posted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_je_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);

-- 8. JOURNAL ENTRY LINES
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(journal_entry_id);

-- 9. INCOME RECORDS
CREATE TABLE IF NOT EXISTS income_records (
    id SERIAL PRIMARY KEY,
    income_number VARCHAR(50) UNIQUE NOT NULL,
    income_date DATE NOT NULL,
    income_category VARCHAR(100) NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    student_id UUID REFERENCES students(id),
    payer_name VARCHAR(200),
    amount DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    description TEXT,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_income_number ON income_records(income_number);
CREATE INDEX IF NOT EXISTS idx_income_date ON income_records(income_date);

-- 10. EXPENSE RECORDS
CREATE TABLE IF NOT EXISTS expense_records (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    expense_category VARCHAR(100) NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    vendor_id INTEGER REFERENCES vendors(id),
    payee_name VARCHAR(200),
    amount DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 16,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    withholding_vat_rate DECIMAL(5,2) DEFAULT 0,
    withholding_vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    description TEXT,
    budget_allocation_id INTEGER REFERENCES budget_allocations(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_number ON expense_records(expense_number);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_records(expense_date);

-- 11. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    expected_delivery_date DATE,
    subtotal DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    terms_conditions TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'received', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);

-- 12. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 16,
    amount DECIMAL(15,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(po_id);

-- 13. PETTY CASH
CREATE TABLE IF NOT EXISTS petty_cash (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('replenishment', 'expense', 'refund')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    category VARCHAR(100),
    payee_name VARCHAR(200),
    description TEXT NOT NULL,
    receipt_number VARCHAR(100),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_petty_number ON petty_cash(transaction_number);

-- 14. ASSETS REGISTER
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(200) NOT NULL,
    asset_category VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(15,2) NOT NULL,
    depreciation_method VARCHAR(50) DEFAULT 'straight_line',
    depreciation_rate DECIMAL(5,2) DEFAULT 0,
    useful_life_years INTEGER,
    salvage_value DECIMAL(15,2) DEFAULT 0,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2),
    location VARCHAR(200),
    serial_number VARCHAR(100),
    vendor_id INTEGER REFERENCES vendors(id),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'under_maintenance', 'disposed', 'sold', 'stolen', 'written_off')),
    disposal_date DATE,
    disposal_value DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_code ON assets(asset_code);

-- 15. ASSET DEPRECIATION LOG
CREATE TABLE IF NOT EXISTS asset_depreciation (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    depreciation_date DATE NOT NULL,
    depreciation_amount DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    book_value DECIMAL(15,2) NOT NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_dep_asset ON asset_depreciation(asset_id);

-- 16. BANK RECONCILIATION
CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    reconciliation_date DATE NOT NULL,
    statement_date DATE NOT NULL,
    statement_balance DECIMAL(15,2) NOT NULL,
    book_balance DECIMAL(15,2) NOT NULL,
    reconciled_balance DECIMAL(15,2),
    unreconciled_credits DECIMAL(15,2) DEFAULT 0,
    unreconciled_debits DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_br_bank ON bank_reconciliations(bank_account_id);

-- 17. BANK TRANSACTIONS
CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    reference VARCHAR(200),
    description TEXT,
    payee_payer VARCHAR(200),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    reconciliation_id INTEGER REFERENCES bank_reconciliations(id),
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bt_number ON bank_transactions(transaction_number);

-- 18. PAYROLL PERIODS
CREATE TABLE IF NOT EXISTS payroll_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    financial_year_id INTEGER REFERENCES financial_years(id),
    total_gross DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_periods(start_date, end_date);

-- 19. PAYROLL ENTRIES
CREATE TABLE IF NOT EXISTS payroll_entries (
    id SERIAL PRIMARY KEY,
    payroll_period_id INTEGER REFERENCES payroll_periods(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id),
    basic_salary DECIMAL(15,2) NOT NULL,
    allowances DECIMAL(15,2) DEFAULT 0,
    overtime DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) NOT NULL,
    paye_tax DECIMAL(15,2) DEFAULT 0,
    nhif DECIMAL(15,2) DEFAULT 0,
    nssf DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON payroll_entries(teacher_id);

-- 20. FINANCE SETTINGS
CREATE TABLE IF NOT EXISTS finance_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50),
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- 21. APPROVAL WORKFLOWS
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(200) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2) DEFAULT 0,
    max_amount DECIMAL(15,2),
    requires_admin_approval BOOLEAN DEFAULT false,
    requires_finance_approval BOOLEAN DEFAULT true,
    approval_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_type ON approval_workflows(workflow_type);

-- INSERT DEFAULT DATA
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_system_account) VALUES
('1000', 'Assets', 'asset', 'All Assets', true),
('1100', 'Current Assets', 'asset', 'Short-term assets', true),
('1110', 'Cash on Hand', 'asset', 'Physical cash', true),
('1120', 'Petty Cash', 'asset', 'Petty cash fund', true),
('1130', 'Bank Account - Main', 'asset', 'Primary bank account', true),
('1140', 'Bank Account - Secondary', 'asset', 'Secondary bank account', true),
('1150', 'M-Pesa Account', 'asset', 'Mobile money account', true),
('1160', 'Accounts Receivable', 'asset', 'Money owed to school', true),
('1170', 'Student Fee Receivables', 'asset', 'Outstanding student fees', true),
('1200', 'Fixed Assets', 'asset', 'Long-term assets', true),
('1210', 'Furniture & Fixtures', 'asset', 'School furniture', true),
('1220', 'Equipment', 'asset', 'School equipment', true),
('1230', 'Vehicles', 'asset', 'School vehicles', true),
('1240', 'Buildings', 'asset', 'School buildings', true),
('1250', 'Land', 'asset', 'School land', true),
('1260', 'Computers & IT Equipment', 'asset', 'IT assets', true),
('1270', 'Accumulated Depreciation', 'asset', 'Depreciation of assets', true),
('2000', 'Liabilities', 'liability', 'All Liabilities', true),
('2100', 'Current Liabilities', 'liability', 'Short-term obligations', true),
('2110', 'Accounts Payable', 'liability', 'Money owed to vendors', true),
('2120', 'Salaries Payable', 'liability', 'Unpaid salaries', true),
('2130', 'PAYE Payable', 'liability', 'Tax withholdings', true),
('2140', 'NHIF Payable', 'liability', 'Health insurance payable', true),
('2150', 'NSSF Payable', 'liability', 'Pension payable', true),
('2160', 'VAT Payable', 'liability', 'VAT owed to KRA', true),
('2170', 'Student Deposits', 'liability', 'Refundable deposits', true),
('2200', 'Long-term Liabilities', 'liability', 'Long-term debt', true),
('2210', 'Loans Payable', 'liability', 'Bank loans', true),
('3000', 'Equity', 'equity', 'Owners Equity', true),
('3100', 'Retained Earnings', 'equity', 'Accumulated profits', true),
('3200', 'Current Year Earnings', 'equity', 'Current year profit/loss', true),
('4000', 'Income', 'income', 'All Income', true),
('4100', 'Tuition Fee Income', 'income', 'Student tuition fees', true),
('4110', 'Exam Fee Income', 'income', 'Examination fees', true),
('4120', 'Library Fee Income', 'income', 'Library fees', true),
('4130', 'Transport Fee Income', 'income', 'Transport fees', true),
('4200', 'Other Income', 'income', 'Miscellaneous income', true),
('4210', 'Donations', 'income', 'Donations received', true),
('4220', 'Grants', 'income', 'Government/NGO grants', true),
('4230', 'Interest Income', 'income', 'Bank interest', true),
('5000', 'Expenses', 'expense', 'All Expenses', true),
('5100', 'Staff Costs', 'expense', 'Employee expenses', true),
('5110', 'Salaries & Wages', 'expense', 'Staff salaries', true),
('5120', 'Staff Benefits', 'expense', 'Employee benefits', true),
('5200', 'Operating Expenses', 'expense', 'Day-to-day operations', true),
('5210', 'Utilities', 'expense', 'Water, electricity, internet', true),
('5220', 'Supplies & Materials', 'expense', 'School supplies', true),
('5230', 'Maintenance & Repairs', 'expense', 'Repairs and maintenance', true),
('5240', 'Transport & Fuel', 'expense', 'Vehicle expenses', true),
('5250', 'Insurance', 'expense', 'Insurance premiums', true),
('5260', 'Professional Fees', 'expense', 'Legal, audit fees', true),
('5300', 'Administrative Expenses', 'expense', 'Admin costs', true),
('5310', 'Office Expenses', 'expense', 'Stationery, printing', true),
('5320', 'Communication', 'expense', 'Phone, postage', true),
('5330', 'Bank Charges', 'expense', 'Bank fees', true),
('5400', 'Other Expenses', 'expense', 'Miscellaneous', true),
('5410', 'Depreciation Expense', 'expense', 'Asset depreciation', true)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO finance_settings (setting_key, setting_value, setting_type, description) VALUES
('default_vat_rate', '16', 'number', 'Standard VAT rate'),
('withholding_vat_rate', '2', 'number', 'Withholding VAT rate'),
('currency', 'KES', 'text', 'Base currency'),
('currency_symbol', 'KSh', 'text', 'Currency symbol'),
('financial_year_start_month', '1', 'number', 'Month financial year starts'),
('enable_vat_calculation', 'true', 'boolean', 'Enable automatic VAT calculation'),
('enable_approval_workflow', 'true', 'boolean', 'Enable expense approval workflow'),
('petty_cash_limit', '50000', 'number', 'Maximum petty cash amount'),
('expense_approval_threshold', '100000', 'number', 'Amount requiring admin approval'),
('auto_generate_journal_entries', 'true', 'boolean', 'Auto-create journal entries')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO approval_workflows (workflow_name, workflow_type, min_amount, max_amount, requires_admin_approval, requires_finance_approval) 
SELECT * FROM (VALUES
  ('Small Expenses', 'expense', 0, 50000, false, true),
  ('Medium Expenses', 'expense', 50001, 100000, false, true),
  ('Large Expenses', 'expense', 100001, NULL, true, true),
  ('Standard Purchase Order', 'purchase_order', 0, NULL, false, true),
  ('Budget Approval', 'budget', 0, NULL, true, true)
) AS v(workflow_name, workflow_type, min_amount, max_amount, requires_admin_approval, requires_finance_approval)
WHERE NOT EXISTS (SELECT 1 FROM approval_workflows WHERE workflow_name = v.workflow_name);

