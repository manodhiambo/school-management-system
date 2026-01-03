
import pool from '../config/database.js';

// Helper function to generate unique numbers (standalone)
async function generateNumber(prefix, table, column) {
  const result = await pool.query(`
    SELECT ${column} FROM ${table}
    WHERE ${column} LIKE $1
    ORDER BY ${column} DESC
    LIMIT 1
  `, [`${prefix}%`]);

  if (result.rows.length === 0) {
    return `${prefix}00001`;
  }

  const lastNumber = result.rows[0][column];
  const numPart = parseInt(lastNumber.replace(prefix, '')) + 1;
  return `${prefix}${String(numPart).padStart(5, '0')}`;
}


class FinanceController {
  // Dashboard
  async getDashboard(req, res) {
    try {
      const client = await pool.connect();
      
      try {
        const currentYear = await client.query(`
          SELECT * FROM financial_years 
          WHERE is_active = true 
          ORDER BY start_date DESC 
          LIMIT 1
        `);
        
        const financialYear = currentYear.rows[0];
        
        const incomeResult = await client.query(`
          SELECT 
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(CASE 
              WHEN income_date >= date_trunc('month', CURRENT_DATE) 
              THEN total_amount 
              ELSE 0 
            END), 0) as monthly
          FROM income_records
          WHERE status = 'completed'
        `);
        
        const expenseResult = await client.query(`
          SELECT 
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(CASE 
              WHEN expense_date >= date_trunc('month', CURRENT_DATE) 
              THEN total_amount 
              ELSE 0 
            END), 0) as monthly,
            COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approvals
          FROM expense_records
        `);
        
        const bankResult = await client.query(`
          SELECT COALESCE(SUM(current_balance), 0) as total
          FROM bank_accounts
          WHERE is_active = true
        `);
        
        const totalIncome = parseFloat(incomeResult.rows[0].total);
        const totalExpenses = parseFloat(expenseResult.rows[0].total);
        const monthlyIncome = parseFloat(incomeResult.rows[0].monthly);
        const monthlyExpenses = parseFloat(expenseResult.rows[0].monthly);
        
        res.json({
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          pendingApprovals: parseInt(expenseResult.rows[0].pending_approvals || 0),
          bankBalance: parseFloat(bankResult.rows[0].total),
          monthlyIncome,
          monthlyExpenses,
          cashFlow: monthlyIncome - monthlyExpenses,
          financialYear: financialYear || null,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  async getChartOfAccounts(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM chart_of_accounts 
        ORDER BY account_type, account_code
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  async createAccount(req, res) {
    try {
      const { account_code, account_name, account_type, parent_account_id, description } = req.body;
      
      const result = await pool.query(`
        INSERT INTO chart_of_accounts (
          account_code, account_name, account_type, parent_account_id, description, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `, [account_code, account_name, account_type, parent_account_id, description]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }

  async getFinancialYears(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM financial_years 
        ORDER BY start_date DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching financial years:', error);
      res.status(500).json({ error: 'Failed to fetch financial years' });
    }
  }

  async createFinancialYear(req, res) {
    try {
      const { name, start_date, end_date } = req.body;
      
      const result = await pool.query(`
        INSERT INTO financial_years (name, start_date, end_date, is_active)
        VALUES ($1, $2, $3, false)
        RETURNING *
      `, [name, start_date, end_date]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating financial year:', error);
      res.status(500).json({ error: 'Failed to create financial year' });
    }
  }

  async getIncomeRecords(req, res) {
    try {
      const { status, dateFrom, dateTo } = req.query;
      
      let query = `
        SELECT 
          ir.*,
          coa.account_name,
          coa.account_code
        FROM income_records ir
        LEFT JOIN chart_of_accounts coa ON ir.account_id = coa.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND ir.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (dateFrom) {
        query += ` AND ir.income_date >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        query += ` AND ir.income_date <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
      }
      
      query += ` ORDER BY ir.income_date DESC`;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching income records:', error);
      res.status(500).json({ error: 'Failed to fetch income records' });
    }
  }

  async createIncome(req, res) {
    try {
      const {
        transaction_date,
        account_id,
        amount,
        vat_amount,
        description,
        reference_number,
        payment_method,
      } = req.body;
      
      // Generate income number
      const incomeNumber = await generateNumber('INC-', 'income_records', 'income_number');
      
      // Calculate VAT if not provided
      const vatRate = vat_amount ? 0 : 16;
      const finalVatAmount = vat_amount || (amount * 16 / 100);
      const totalAmount = parseFloat(amount) + parseFloat(finalVatAmount);
      
      const result = await pool.query(`
        INSERT INTO income_records (
          income_number, income_date, account_id, amount, vat_rate, vat_amount, total_amount,
          description, payment_reference, payment_method,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', $11, NOW(), NOW())
        RETURNING *
      `, [
        incomeNumber,
        transaction_date,
        account_id,
        amount,
        vatRate,
        finalVatAmount,
        totalAmount,
        description,
        reference_number,
        payment_method,
        req.user.id,
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating income:', error);
      res.status(500).json({ error: 'Failed to create income record' });
    }
  }

  async getExpenseRecords(req, res) {
    try {
      const { status, dateFrom, dateTo } = req.query;
      
      let query = `
        SELECT 
          er.*,
          coa.account_name,
          coa.account_code,
          v.vendor_name
        FROM expense_records er
        LEFT JOIN chart_of_accounts coa ON er.account_id = coa.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND er.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (dateFrom) {
        query += ` AND er.expense_date >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        query += ` AND er.expense_date <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
      }
      
      query += ` ORDER BY er.expense_date DESC`;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching expense records:', error);
      res.status(500).json({ error: 'Failed to fetch expense records' });
    }
  }

  async createExpense(req, res) {
    try {
      const {
        transaction_date,
        account_id,
        vendor_id,
        amount,
        vat_amount,
        description,
        reference_number,
        payment_method,
      } = req.body;
      
      // Generate expense number
      const expenseNumber = await generateNumber('EXP-', 'expense_records', 'expense_number');
      
      // Calculate VAT and total
      const vatRate = vat_amount ? 0 : 16;
      const finalVatAmount = vat_amount || (amount * 16 / 100);
      const totalAmount = parseFloat(amount) + parseFloat(finalVatAmount);
      
      // Check if approval required
      const settingsResult = await pool.query(`
        SELECT setting_value FROM finance_settings 
        WHERE setting_key = 'expense_approval_threshold'
      `);
      
      const threshold = settingsResult.rows[0]?.setting_value || 10000;
      const approvalStatus = amount >= threshold ? 'pending' : 'approved';
      const status = amount >= threshold ? 'pending' : 'approved';
      
      const result = await pool.query(`
        INSERT INTO expense_records (
          expense_number, expense_date, account_id, vendor_id, amount, vat_rate, vat_amount, total_amount,
          description, payment_reference, payment_method,
          approval_status, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `, [
        expenseNumber,
        transaction_date,
        account_id,
        vendor_id,
        amount,
        vatRate,
        finalVatAmount,
        totalAmount,
        description,
        reference_number,
        payment_method,
        approvalStatus,
        status,
        req.user.id,
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense record' });
    }
  }

  async approveExpense(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE expense_records 
        SET approval_status = 'approved',
            status = 'approved', 
            approved_by = $1,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND approval_status = 'pending'
        RETURNING *
      `, [req.user.id, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense not found or already processed' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error approving expense:', error);
      res.status(500).json({ error: 'Failed to approve expense' });
    }
  }

  async rejectExpense(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const result = await pool.query(`
        UPDATE expense_records 
        SET approval_status = 'rejected',
            status = 'rejected', 
            approved_by = $1,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND approval_status = 'pending'
        RETURNING *
      `, [req.user.id, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense not found or already processed' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error rejecting expense:', error);
      res.status(500).json({ error: 'Failed to reject expense' });
    }
  }

  async payExpense(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE expense_records 
        SET status = 'paid',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND approval_status = 'approved'
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Expense not found or not approved' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      res.status(500).json({ error: 'Failed to mark expense as paid' });
    }
  }

  async getVendors(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM vendors 
        ORDER BY vendor_name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  }

  async createVendor(req, res) {
    try {
      const {
        vendor_name,
        contact_person,
        email,
        phone,
        address,
        tax_id,
      } = req.body;
      
      // Generate vendor code
      const vendorCode = await generateNumber('VEN-', 'vendors', 'vendor_code');
      
      const result = await pool.query(`
        INSERT INTO vendors (
          vendor_code, vendor_name, contact_person, email, phone, address, kra_pin, is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
        RETURNING *
      `, [vendorCode, vendor_name, contact_person, email, phone, address, tax_id, req.user.id]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }

  async getBankAccounts(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM bank_accounts 
        ORDER BY account_name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
  }

  async createBankAccount(req, res) {
    try {
      const {
        account_name,
        account_number,
        bank_name,
        branch,
        account_type,
        currency,
        current_balance,
      } = req.body;
      
      const result = await pool.query(`
        INSERT INTO bank_accounts (
          account_name, account_number, bank_name, branch,
          account_type, currency, current_balance, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
      `, [
        account_name,
        account_number,
        bank_name,
        branch,
        account_type,
        currency || 'KES',
        current_balance || 0,
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating bank account:', error);
      res.status(500).json({ error: 'Failed to create bank account' });
    }
  }

  async getPettyCash(req, res) {
    try {
      const { dateFrom, dateTo, transaction_type } = req.query;
      
      let query = `
        SELECT 
          pc.*,
          u.email as created_by_name
        FROM petty_cash pc
        LEFT JOIN users u ON pc.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (transaction_type) {
        query += ` AND pc.transaction_type = $${paramCount}`;
        params.push(transaction_type);
        paramCount++;
      }
      
      if (dateFrom) {
        query += ` AND pc.transaction_date >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        query += ` AND pc.transaction_date <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
      }
      
      query += ` ORDER BY pc.transaction_date DESC, pc.created_at DESC`;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching petty cash:', error);
      res.status(500).json({ error: 'Failed to fetch petty cash transactions' });
    }
  }

  async createPettyCash(req, res) {
    try {
      const {
        transaction_date,
        transaction_type,
        amount,
        description,
        custodian,
        receipt_number,
        category,
      } = req.body;
      
      // Generate transaction number
      const transactionNumber = await generateNumber('PC-', 'petty_cash', 'transaction_number');
      
      const result = await pool.query(`
        INSERT INTO petty_cash (
          transaction_number, transaction_date, transaction_type, amount, description,
          payee_name, receipt_number, category, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        transactionNumber,
        transaction_date,
        transaction_type,
        amount,
        description,
        custodian,
        receipt_number,
        category,
        req.user.id,
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating petty cash transaction:', error);
      res.status(500).json({ error: 'Failed to create petty cash transaction' });
    }
  }

  async getPettyCashSummary(req, res) {
    try {
      const summary = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'replenishment' THEN amount ELSE 0 END), 0) as total_replenished,
          COALESCE(SUM(CASE WHEN transaction_type = 'disbursement' THEN amount ELSE 0 END), 0) as total_disbursed,
          COALESCE(SUM(CASE WHEN transaction_type = 'replenishment' THEN amount ELSE -amount END), 0) as current_balance,
          COALESCE(SUM(CASE 
            WHEN transaction_type = 'disbursement' 
            AND transaction_date >= date_trunc('month', CURRENT_DATE)
            THEN amount ELSE 0 
          END), 0) as monthly_disbursed,
          COALESCE(SUM(CASE 
            WHEN transaction_type = 'replenishment' 
            AND transaction_date >= date_trunc('month', CURRENT_DATE)
            THEN amount ELSE 0 
          END), 0) as monthly_replenished
        FROM petty_cash
      `);
      
      const custodians = await pool.query(`
        SELECT 
          payee_name as custodian,
          COALESCE(SUM(CASE WHEN transaction_type = 'replenishment' THEN amount ELSE -amount END), 0) as balance
        FROM petty_cash
        WHERE payee_name IS NOT NULL
        GROUP BY payee_name
        HAVING COALESCE(SUM(CASE WHEN transaction_type = 'replenishment' THEN amount ELSE -amount END), 0) > 0
      `);
      
      res.json({
        ...summary.rows[0],
        custodians: custodians.rows,
      });
    } catch (error) {
      console.error('Error fetching petty cash summary:', error);
      res.status(500).json({ error: 'Failed to fetch petty cash summary' });
    }
  }

  async deletePettyCash(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        DELETE FROM petty_cash 
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      console.error('Error deleting petty cash transaction:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  }

  // Assets
  async getAssets(req, res) {
    try {
      const result = await pool.query(`SELECT * FROM assets ORDER BY purchase_date DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  }

  async createAsset(req, res) {
    try {
      const data = req.body;
      const result = await pool.query(`
        INSERT INTO assets (
          asset_name, category, purchase_date, purchase_cost,
          current_value, location, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
        data.asset_name,
        data.category,
        data.purchase_date,
        data.purchase_cost,
        data.current_value || data.purchase_cost,
        data.location,
        data.status || 'active',
        req.user.id,
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  async updateAsset(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const result = await pool.query(`
        UPDATE assets 
        SET 
          asset_name = COALESCE($1, asset_name),
          category = COALESCE($2, category),
          current_value = COALESCE($3, current_value),
          location = COALESCE($4, location),
          status = COALESCE($5, status),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `, [data.asset_name, data.category, data.current_value, data.location, data.status, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ error: 'Failed to update asset' });
    }
  }

  async deleteAsset(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(`DELETE FROM assets WHERE id = $1 RETURNING *`, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  }

  async getAssetsSummary(req, res) {
    try {
      const summary = await pool.query(`
        SELECT 
          COUNT(*) as total_assets,
          COALESCE(SUM(purchase_cost), 0) as total_purchase_cost,
          COALESCE(SUM(current_value), 0) as total_current_value,
          COALESCE(SUM(purchase_cost - current_value), 0) as total_depreciation
        FROM assets
      `);
      
      const byCategory = await pool.query(`
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(current_value), 0) as total_value
        FROM assets
        WHERE status = 'active'
        GROUP BY category
        ORDER BY total_value DESC
      `);
      
      res.json({
        ...summary.rows[0],
        by_category: byCategory.rows,
      });
    } catch (error) {
      console.error('Error fetching assets summary:', error);
      res.status(500).json({ error: 'Failed to fetch assets summary' });
    }
  }

  // Reports
  async getIncomeByCategory(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          coa.account_name as category,
          COALESCE(SUM(ir.total_amount), 0) as total
        FROM income_records ir
        JOIN chart_of_accounts coa ON ir.account_id = coa.id
        WHERE ir.status = 'completed'
        GROUP BY coa.account_name
        ORDER BY total DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching income by category:', error);
      res.status(500).json({ error: 'Failed to fetch income by category' });
    }
  }

  async getExpensesByCategory(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          coa.account_name as category,
          COALESCE(SUM(er.total_amount), 0) as total
        FROM expense_records er
        JOIN chart_of_accounts coa ON er.account_id = coa.id
        WHERE er.status IN ('approved', 'paid')
        GROUP BY coa.account_name
        ORDER BY total DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      res.status(500).json({ error: 'Failed to fetch expenses by category' });
    }
  }

  // Settings
  async getSettings(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM finance_settings 
        ORDER BY setting_key
      `);
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.setting_key] = {
          value: row.setting_value,
          type: row.setting_type,
          description: row.description,
        };
      });
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const result = await pool.query(`
        UPDATE finance_settings 
        SET setting_value = $1, updated_at = NOW(), updated_by = $2
        WHERE setting_key = $3
        RETURNING *
      `, [value, req.user.id, key]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
      

  // ==================
  // FEE COLLECTION INTEGRATION
  // ==================

  async getFeeCollectionSummary(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM v_fee_collection_summary
      `);
      
      res.json(result.rows[0] || {
        total_invoices: 0,
        total_students: 0,
        total_billed: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_rate: 0,
        paid_invoices: 0,
        partial_invoices: 0,
        pending_invoices: 0,
        overdue_invoices: 0,
      });
    } catch (error) {
      console.error('Error fetching fee collection summary:', error);
      res.status(500).json({ error: 'Failed to fetch fee collection summary' });
    }
  }

  async getFeeCollectionByMonth(req, res) {
    try {
      const { year } = req.query;
      const targetYear = year || new Date().getFullYear();
      
      const result = await pool.query(`
        SELECT 
          TO_CHAR(income_date, 'YYYY-MM') as month,
          COUNT(*) as payment_count,
          SUM(total_amount) as total_collected
        FROM income_records
        WHERE income_category = 'Student Fees'
        AND EXTRACT(YEAR FROM income_date) = $1
        GROUP BY TO_CHAR(income_date, 'YYYY-MM')
        ORDER BY month
      `, [targetYear]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching fee collection by month:', error);
      res.status(500).json({ error: 'Failed to fetch fee collection data' });
    }
  }

  async getFeeCollectionByClass(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          c.name as class_name,
          COUNT(DISTINCT fi.student_id) as student_count,
          COUNT(fi.id) as invoice_count,
          COALESCE(SUM(fi.total_amount), 0) as total_billed,
          COALESCE(SUM(fi.paid_amount), 0) as total_collected,
          COALESCE(SUM(fi.balance_amount), 0) as outstanding,
          ROUND(
            CASE 
              WHEN SUM(fi.total_amount) > 0 
              THEN (SUM(fi.paid_amount) / SUM(fi.total_amount) * 100) 
              ELSE 0 
            END, 
            2
          ) as collection_rate
        FROM fee_invoices fi
        JOIN students s ON fi.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        GROUP BY c.id, c.name
        ORDER BY total_collected DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching fee collection by class:', error);
      res.status(500).json({ error: 'Failed to fetch fee collection by class' });
    }
  }

  async getFeeDefaulters(req, res) {
    try {
      const { minBalance } = req.query;
      const minimumBalance = minBalance || 1000;
      
      const result = await pool.query(`
        SELECT 
          fi.id,
          fi.invoice_number,
          fi.student_id,
          s.first_name || ' ' || s.last_name as student_name,
          s.admission_number,
          c.name as class_name,
          fi.total_amount,
          fi.paid_amount,
          fi.balance_amount,
          fi.due_date,
          CASE 
            WHEN fi.due_date < CURRENT_DATE THEN 'overdue'
            WHEN fi.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
            ELSE 'current'
          END as urgency
        FROM fee_invoices fi
        JOIN students s ON fi.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE fi.balance_amount >= $1
        AND fi.status IN ('pending', 'partial', 'overdue')
        ORDER BY fi.balance_amount DESC, fi.due_date ASC
      `, [minimumBalance]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching fee defaulters:', error);
      res.status(500).json({ error: 'Failed to fetch fee defaulters' });
    }
  }
}

export default new FinanceController();
