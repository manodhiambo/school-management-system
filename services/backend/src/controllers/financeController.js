import pool from '../config/database.js';

class FinanceController {
  // Dashboard - Get financial overview
  async getDashboard(req, res) {
    try {
      const client = await pool.connect();
      
      try {
        // Get current financial year
        const currentYear = await client.query(`
          SELECT * FROM financial_years 
          WHERE is_active = true 
          ORDER BY start_date DESC 
          LIMIT 1
        `);
        
        const financialYear = currentYear.rows[0];
        
        // Get total income
        const incomeResult = await client.query(`
          SELECT 
            COALESCE(SUM(amount + COALESCE(vat_amount, 0)), 0) as total,
            COALESCE(SUM(CASE 
              WHEN transaction_date >= date_trunc('month', CURRENT_DATE) 
              THEN amount + COALESCE(vat_amount, 0) 
              ELSE 0 
            END), 0) as monthly
          FROM income_records
          WHERE status = 'completed'
        `);
        
        // Get total expenses
        const expenseResult = await client.query(`
          SELECT 
            COALESCE(SUM(amount + COALESCE(vat_amount, 0)), 0) as total,
            COALESCE(SUM(CASE 
              WHEN transaction_date >= date_trunc('month', CURRENT_DATE) 
              THEN amount + COALESCE(vat_amount, 0) 
              ELSE 0 
            END), 0) as monthly,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approvals
          FROM expense_records
        `);
        
        // Get bank balance
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
          pendingApprovals: parseInt(expenseResult.rows[0].pending_approvals),
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

  // Chart of Accounts
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

  // Financial Years
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

  // Income Records
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
        query += ` AND ir.transaction_date >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        query += ` AND ir.transaction_date <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
      }
      
      query += ` ORDER BY ir.transaction_date DESC`;
      
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
      
      const result = await pool.query(`
        INSERT INTO income_records (
          transaction_date, account_id, amount, vat_amount,
          description, reference_number, payment_method,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, NOW(), NOW())
        RETURNING *
      `, [
        transaction_date,
        account_id,
        amount,
        vat_amount,
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

  // Expense Records
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
        query += ` AND er.transaction_date >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
      }
      
      if (dateTo) {
        query += ` AND er.transaction_date <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
      }
      
      query += ` ORDER BY er.transaction_date DESC`;
      
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
      
      // Check if approval required based on settings
      const settingsResult = await pool.query(`
        SELECT setting_value FROM finance_settings 
        WHERE setting_key = 'expense_approval_threshold'
      `);
      
      const threshold = settingsResult.rows[0]?.setting_value || 10000;
      const status = amount >= threshold ? 'pending' : 'approved';
      
      const result = await pool.query(`
        INSERT INTO expense_records (
          transaction_date, account_id, vendor_id, amount, vat_amount,
          description, reference_number, payment_method,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        transaction_date,
        account_id,
        vendor_id,
        amount,
        vat_amount,
        description,
        reference_number,
        payment_method,
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
        SET status = 'approved', 
            approved_by = $1,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND status = 'pending'
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
        SET status = 'rejected', 
            rejection_reason = $1,
            approved_by = $2,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `, [reason, req.user.id, id]);
      
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
        WHERE id = $1 AND status = 'approved'
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

  // Vendors
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
      
      const result = await pool.query(`
        INSERT INTO vendors (
          vendor_name, contact_person, email, phone, address, tax_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `, [vendor_name, contact_person, email, phone, address, tax_id]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }

  // Bank Accounts
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

  // Petty Cash
  async getPettyCash(req, res) {
    try {
      const { dateFrom, dateTo, transaction_type } = req.query;
      
      let query = `
        SELECT 
          pc.*,
          u.username as created_by_name
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
      
      const result = await pool.query(`
        INSERT INTO petty_cash (
          transaction_date, transaction_type, amount, description,
          custodian, receipt_number, category, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
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
          custodian,
          COALESCE(SUM(CASE WHEN transaction_type = 'replenishment' THEN amount ELSE -amount END), 0) as balance
        FROM petty_cash
        GROUP BY custodian
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
      const { category, status } = req.query;
      
      let query = `
        SELECT * FROM assets
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (category) {
        query += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY purchase_date DESC`;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  }

  async createAsset(req, res) {
    try {
      const {
        asset_name,
        category,
        purchase_date,
        purchase_cost,
        current_value,
        depreciation_method,
        useful_life_years,
        salvage_value,
        location,
        serial_number,
        status,
      } = req.body;
      
      const result = await pool.query(`
        INSERT INTO assets (
          asset_name, category, purchase_date, purchase_cost,
          current_value, depreciation_method, useful_life_years,
          salvage_value, location, serial_number, status,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        asset_name,
        category,
        purchase_date,
        purchase_cost,
        current_value || purchase_cost,
        depreciation_method || 'straight_line',
        useful_life_years,
        salvage_value || 0,
        location,
        serial_number,
        status || 'active',
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
      const {
        asset_name,
        category,
        current_value,
        location,
        status,
      } = req.body;
      
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
      `, [asset_name, category, current_value, location, status, id]);
      
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
      
      const result = await pool.query(`
        DELETE FROM assets WHERE id = $1 RETURNING *
      `, [id]);
      
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
          SUM(purchase_cost) as total_purchase_cost,
          SUM(current_value) as total_current_value,
          SUM(purchase_cost - current_value) as total_depreciation,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_assets,
          COUNT(CASE WHEN status = 'disposed' THEN 1 END) as disposed_assets,
          COUNT(CASE WHEN status = 'under_maintenance' THEN 1 END) as under_maintenance
        FROM assets
      `);
      
      const byCategory = await pool.query(`
        SELECT 
          category,
          COUNT(*) as count,
          SUM(current_value) as total_value
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
          SUM(ir.amount + COALESCE(ir.vat_amount, 0)) as total
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
          SUM(er.amount + COALESCE(er.vat_amount, 0)) as total
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
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
}

export default new FinanceController();
