import pool from '../config/database.js';

class FinanceService {
  
  async getChartOfAccounts(filters = {}) {
    const { account_type, is_active } = filters;
    let query = 'SELECT coa.*, parent.account_name as parent_account_name FROM chart_of_accounts coa LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id WHERE 1=1';
    const params = [];
    let paramCount = 1;
    if (account_type) {
      query += ` AND coa.account_type = $${paramCount++}`;
      params.push(account_type);
    }
    if (is_active !== undefined) {
      query += ` AND coa.is_active = $${paramCount++}`;
      params.push(is_active);
    }
    query += ' ORDER BY coa.account_code';
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getAccountById(id) {
    const result = await pool.query('SELECT coa.*, parent.account_name as parent_account_name FROM chart_of_accounts coa LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id WHERE coa.id = $1', [id]);
    return result.rows[0];
  }

  async createAccount(accountData, userId) {
    const { account_code, account_name, account_type, parent_account_id, description } = accountData;
    const result = await pool.query('INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, description, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [account_code, account_name, account_type, parent_account_id, description, userId]);
    return result.rows[0];
  }

  async updateAccount(id, accountData) {
    const { account_name, description, is_active } = accountData;
    const result = await pool.query('UPDATE chart_of_accounts SET account_name = COALESCE($1, account_name), description = COALESCE($2, description), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *', [account_name, description, is_active, id]);
    return result.rows[0];
  }

  async getFinancialYears() {
    const result = await pool.query('SELECT fy.*, ay.year_name as academic_year_name FROM financial_years fy JOIN academic_years ay ON fy.academic_year_id = ay.id ORDER BY fy.start_date DESC');
    return result.rows;
  }

  async getCurrentFinancialYear() {
    const result = await pool.query('SELECT fy.*, ay.year_name as academic_year_name FROM financial_years fy JOIN academic_years ay ON fy.academic_year_id = ay.id WHERE fy.is_current = true LIMIT 1');
    return result.rows[0];
  }

  async createFinancialYear(yearData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (yearData.is_current) {
        await client.query('UPDATE financial_years SET is_current = false');
      }
      const result = await client.query('INSERT INTO financial_years (academic_year_id, year_name, start_date, end_date, status, is_current) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [yearData.academic_year_id, yearData.year_name, yearData.start_date, yearData.end_date, yearData.status || 'active', yearData.is_current || false]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async closeFinancialYear(id) {
    const result = await pool.query('UPDATE financial_years SET status = $1, is_current = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', ['closed', id]);
    return result.rows[0];
  }

  async getIncomeRecords(filters = {}) {
    const { start_date, end_date, income_category, student_id, status, limit = 100, offset = 0 } = filters;
    let query = 'SELECT ir.*, coa.account_name, CONCAT(s.first_name, $1, s.last_name) as student_name, ba.account_name as bank_account_name FROM income_records ir LEFT JOIN chart_of_accounts coa ON ir.account_id = coa.id LEFT JOIN students s ON ir.student_id = s.id LEFT JOIN bank_accounts ba ON ir.bank_account_id = ba.id WHERE 1=1';
    const params = [' '];
    let paramCount = 2;
    if (start_date) {
      query += ` AND ir.income_date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND ir.income_date <= $${paramCount++}`;
      params.push(end_date);
    }
    if (income_category) {
      query += ` AND ir.income_category = $${paramCount++}`;
      params.push(income_category);
    }
    if (student_id) {
      query += ` AND ir.student_id = $${paramCount++}`;
      params.push(student_id);
    }
    if (status) {
      query += ` AND ir.status = $${paramCount++}`;
      params.push(status);
    }
    query += ` ORDER BY ir.income_date DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM income_records WHERE 1=1');
    return { data: result.rows, total: parseInt(countResult.rows[0].count), limit, offset };
  }

  async createIncome(incomeData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { income_date, income_category, account_id, student_id, payer_name, amount, vat_rate = 0, payment_method, payment_reference, bank_account_id, description } = incomeData;
      const vat_amount = (amount * vat_rate) / 100;
      const total_amount = parseFloat(amount) + parseFloat(vat_amount);
      const incomeNumberResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_num FROM income_records');
      const income_number = `INC-${incomeNumberResult.rows[0].next_num}`;
      const incomeResult = await client.query('INSERT INTO income_records (income_number, income_date, income_category, account_id, student_id, payer_name, amount, vat_rate, vat_amount, total_amount, payment_method, payment_reference, bank_account_id, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *', [income_number, income_date, income_category, account_id, student_id, payer_name, amount, vat_rate, vat_amount, total_amount, payment_method, payment_reference, bank_account_id, description, 'completed', userId]);
      const income = incomeResult.rows[0];
      if (bank_account_id) {
        await client.query('UPDATE bank_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [total_amount, bank_account_id]);
      }
      await client.query('COMMIT');
      return income;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getExpenseRecords(filters = {}) {
    const { start_date, end_date, approval_status, status, limit = 100, offset = 0 } = filters;
    let query = 'SELECT er.*, coa.account_name, v.vendor_name, ba.account_name as bank_account_name FROM expense_records er LEFT JOIN chart_of_accounts coa ON er.account_id = coa.id LEFT JOIN vendors v ON er.vendor_id = v.id LEFT JOIN bank_accounts ba ON er.bank_account_id = ba.id WHERE 1=1';
    const params = [];
    let paramCount = 1;
    if (start_date) {
      query += ` AND er.expense_date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND er.expense_date <= $${paramCount++}`;
      params.push(end_date);
    }
    if (approval_status) {
      query += ` AND er.approval_status = $${paramCount++}`;
      params.push(approval_status);
    }
    if (status) {
      query += ` AND er.status = $${paramCount++}`;
      params.push(status);
    }
    query += ` ORDER BY er.expense_date DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM expense_records WHERE 1=1');
    return { data: result.rows, total: parseInt(countResult.rows[0].count), limit, offset };
  }

  async createExpense(expenseData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { expense_date, expense_category, account_id, vendor_id, payee_name, amount, vat_rate = 16, withholding_vat_rate = 0, payment_method, payment_reference, bank_account_id, invoice_number, invoice_date, description, budget_allocation_id } = expenseData;
      const vat_amount = (amount * vat_rate) / 100;
      const withholding_vat_amount = (amount * withholding_vat_rate) / 100;
      const total_amount = parseFloat(amount) + parseFloat(vat_amount) - parseFloat(withholding_vat_amount);
      const expenseNumberResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_num FROM expense_records');
      const expense_number = `EXP-${expenseNumberResult.rows[0].next_num}`;
      const expenseResult = await client.query('INSERT INTO expense_records (expense_number, expense_date, expense_category, account_id, vendor_id, payee_name, amount, vat_rate, vat_amount, withholding_vat_rate, withholding_vat_amount, total_amount, payment_method, payment_reference, bank_account_id, invoice_number, invoice_date, description, budget_allocation_id, approval_status, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *', [expense_number, expense_date, expense_category, account_id, vendor_id, payee_name, amount, vat_rate, vat_amount, withholding_vat_rate, withholding_vat_amount, total_amount, payment_method, payment_reference, bank_account_id, invoice_number, invoice_date, description, budget_allocation_id, 'pending', 'pending', userId]);
      await client.query('COMMIT');
      return expenseResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveExpense(id, userId) {
    const result = await pool.query('UPDATE expense_records SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *', ['approved', userId, id]);
    return result.rows[0];
  }

  async rejectExpense(id, userId) {
    const result = await pool.query('UPDATE expense_records SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *', ['rejected', userId, id]);
    return result.rows[0];
  }

  async payExpense(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const expenseResult = await client.query('SELECT * FROM expense_records WHERE id = $1', [id]);
      const expense = expenseResult.rows[0];
      if (!expense) throw new Error('Expense not found');
      if (expense.approval_status !== 'approved') throw new Error('Expense must be approved before payment');
      await client.query('UPDATE expense_records SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2', ['paid', id]);
      if (expense.bank_account_id) {
        await client.query('UPDATE bank_accounts SET current_balance = current_balance - $1 WHERE id = $2', [expense.total_amount, expense.bank_account_id]);
      }
      await client.query('COMMIT');
      return { ...expense, status: 'paid' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getVendors(filters = {}) {
    const result = await pool.query('SELECT * FROM vendors ORDER BY vendor_name');
    return result.rows;
  }

  async createVendor(vendorData, userId) {
    const { vendor_name, contact_person, email, phone, address, kra_pin, payment_terms, credit_limit } = vendorData;
    const codeResult = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_num FROM vendors');
    const vendor_code = `VND${String(codeResult.rows[0].next_num).padStart(4, '0')}`;
    const result = await pool.query('INSERT INTO vendors (vendor_code, vendor_name, contact_person, email, phone, address, kra_pin, payment_terms, credit_limit, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [vendor_code, vendor_name, contact_person, email, phone, address, kra_pin, payment_terms, credit_limit, userId]);
    return result.rows[0];
  }

  async getBankAccounts() {
    const result = await pool.query('SELECT * FROM bank_accounts ORDER BY account_name');
    return result.rows;
  }

  async createBankAccount(accountData, userId) {
    const { account_name, account_number, bank_name, branch, account_type, opening_balance, coa_account_id } = accountData;
    const result = await pool.query('INSERT INTO bank_accounts (account_name, account_number, bank_name, branch, account_type, opening_balance, current_balance, coa_account_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [account_name, account_number, bank_name, branch, account_type, opening_balance, opening_balance, coa_account_id, userId]);
    return result.rows[0];
  }

  async getDashboardStats(filters = {}) {
    const incomeResult = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM income_records WHERE status = $1', ['completed']);
    const expenseResult = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_records WHERE status = $1', ['paid']);
    const pendingResult = await pool.query('SELECT COUNT(*) as count FROM expense_records WHERE approval_status = $1', ['pending']);
    const bankResult = await pool.query('SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE is_active = true');
    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);
    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: totalIncome - totalExpenses,
      pending_approvals: parseInt(pendingResult.rows[0].count),
      total_bank_balance: parseFloat(bankResult.rows[0].total)
    };
  }

  async getIncomeByCategory() {
    const result = await pool.query('SELECT income_category, SUM(total_amount) as total FROM income_records WHERE status = $1 GROUP BY income_category ORDER BY total DESC', ['completed']);
    return result.rows;
  }

  async getExpensesByCategory() {
    const result = await pool.query('SELECT expense_category, SUM(total_amount) as total FROM expense_records WHERE status = $1 GROUP BY expense_category ORDER BY total DESC', ['paid']);
    return result.rows;
  }

  async getSettings() {
    const result = await pool.query('SELECT * FROM finance_settings ORDER BY setting_key');
    return result.rows;
  }

  async updateSetting(key, value, userId) {
    const result = await pool.query('UPDATE finance_settings SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $3 RETURNING *', [value, userId, key]);
    return result.rows[0];
  }
}

export default new FinanceService();
