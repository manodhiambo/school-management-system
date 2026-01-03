import pool from '../config/database.js';

class BudgetController {
  // Helper to generate budget number
  async generateBudgetNumber() {
    const result = await pool.query(`
      SELECT budget_name FROM budgets 
      WHERE budget_name LIKE 'BDG-%' 
      ORDER BY budget_name DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'BDG-00001';
    }
    
    const lastNumber = result.rows[0].budget_name;
    const numPart = parseInt(lastNumber.replace('BDG-', '')) + 1;
    return `BDG-${String(numPart).padStart(5, '0')}`;
  }

  // Get all budgets with detailed information
  async getBudgets(req, res) {
    try {
      const { status, financial_year_id } = req.query;
      
      let query = `
        SELECT 
          b.*,
          fy.year_name as financial_year_name,
          fy.start_date as fy_start_date,
          fy.end_date as fy_end_date,
          u.email as created_by_name,
          au.email as approved_by_name,
          COUNT(DISTINCT bi.id) as item_count,
          COALESCE(SUM(bi.allocated_amount), 0) as total_allocated,
          COALESCE(SUM(bi.spent_amount), 0) as total_spent,
          CASE 
            WHEN b.total_amount > 0 THEN 
              ROUND((COALESCE(SUM(bi.spent_amount), 0) / b.total_amount * 100), 2)
            ELSE 0 
          END as utilization_percentage
        FROM budgets b
        LEFT JOIN financial_years fy ON b.financial_year_id = fy.id
        LEFT JOIN users u ON b.created_by = u.id
        LEFT JOIN users au ON b.approved_by = au.id
        LEFT JOIN budget_items bi ON b.id = bi.budget_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND b.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (financial_year_id) {
        query += ` AND b.financial_year_id = $${paramCount}`;
        params.push(financial_year_id);
        paramCount++;
      }
      
      query += `
        GROUP BY b.id, fy.id, u.email, au.email
        ORDER BY b.created_at DESC
      `;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({ error: 'Failed to fetch budgets' });
    }
  }

  // Get single budget with all items
  async getBudget(req, res) {
    try {
      const { id } = req.params;
      
      const budgetResult = await pool.query(`
        SELECT 
          b.*,
          fy.year_name as financial_year_name,
          u.email as created_by_name,
          au.email as approved_by_name
        FROM budgets b
        LEFT JOIN financial_years fy ON b.financial_year_id = fy.id
        LEFT JOIN users u ON b.created_by = u.id
        LEFT JOIN users au ON b.approved_by = au.id
        WHERE b.id = $1
      `, [id]);
      
      if (budgetResult.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      const itemsResult = await pool.query(`
        SELECT 
          bi.*,
          coa.account_name,
          coa.account_code
        FROM budget_items bi
        LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = $1
        ORDER BY bi.item_name
      `, [id]);
      
      const budget = budgetResult.rows[0];
      budget.items = itemsResult.rows;
      
      res.json(budget);
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({ error: 'Failed to fetch budget' });
    }
  }

  // Create new budget
  async createBudget(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        budget_name,
        financial_year_id,
        start_date,
        end_date,
        total_amount,
        description,
        items,
      } = req.body;
      
      // Generate budget number if not provided
      const finalBudgetName = budget_name || await this.generateBudgetNumber();
      
      // Create budget
      const budgetResult = await client.query(`
        INSERT INTO budgets (
          budget_name, financial_year_id, start_date, end_date,
          total_amount, spent_amount, status, description,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, 'draft', $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        finalBudgetName,
        financial_year_id,
        start_date,
        end_date,
        total_amount,
        description,
        req.user.id,
      ]);
      
      const budget = budgetResult.rows[0];
      
      // Add budget items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(`
            INSERT INTO budget_items (
              budget_id, item_name, account_id, allocated_amount,
              spent_amount, description, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
          `, [
            budget.id,
            item.item_name,
            item.account_id,
            item.allocated_amount,
            item.description,
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Fetch complete budget with items
      const completeResult = await pool.query(`
        SELECT 
          b.*,
          fy.year_name as financial_year_name
        FROM budgets b
        LEFT JOIN financial_years fy ON b.financial_year_id = fy.id
        WHERE b.id = $1
      `, [budget.id]);
      
      res.status(201).json(completeResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating budget:', error);
      res.status(500).json({ error: 'Failed to create budget' });
    } finally {
      client.release();
    }
  }

  // Update budget
  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const {
        budget_name,
        financial_year_id,
        start_date,
        end_date,
        total_amount,
        status,
        description,
      } = req.body;
      
      const result = await pool.query(`
        UPDATE budgets 
        SET 
          budget_name = COALESCE($1, budget_name),
          financial_year_id = COALESCE($2, financial_year_id),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          total_amount = COALESCE($5, total_amount),
          status = COALESCE($6, status),
          description = COALESCE($7, description),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [budget_name, financial_year_id, start_date, end_date, total_amount, status, description, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating budget:', error);
      res.status(500).json({ error: 'Failed to update budget' });
    }
  }

  // Delete budget
  async deleteBudget(req, res) {
    try {
      const { id } = req.params;
      
      // Check if budget has any spent amount
      const checkResult = await pool.query(`
        SELECT spent_amount FROM budgets WHERE id = $1
      `, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      if (checkResult.rows[0].spent_amount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete budget with recorded expenses' 
        });
      }
      
      await pool.query('DELETE FROM budgets WHERE id = $1', [id]);
      
      res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
      console.error('Error deleting budget:', error);
      res.status(500).json({ error: 'Failed to delete budget' });
    }
  }

  // Approve budget
  async approveBudget(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE budgets 
        SET status = 'approved',
            approved_by = $1,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND status = 'draft'
        RETURNING *
      `, [req.user.id, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Budget not found or already approved' 
        });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error approving budget:', error);
      res.status(500).json({ error: 'Failed to approve budget' });
    }
  }

  // Close/Archive budget
  async closeBudget(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE budgets 
        SET status = 'closed',
            updated_at = NOW()
        WHERE id = $1 AND status IN ('approved', 'active')
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Budget not found or cannot be closed' 
        });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error closing budget:', error);
      res.status(500).json({ error: 'Failed to close budget' });
    }
  }

  // ==================
  // BUDGET ITEMS
  // ==================

  // Get budget items
  async getBudgetItems(req, res) {
    try {
      const { budgetId } = req.params;
      
      const result = await pool.query(`
        SELECT 
          bi.*,
          coa.account_name,
          coa.account_code,
          coa.account_type,
          (bi.allocated_amount - bi.spent_amount) as remaining_amount,
          CASE 
            WHEN bi.allocated_amount > 0 THEN 
              ROUND((bi.spent_amount / bi.allocated_amount * 100), 2)
            ELSE 0 
          END as utilization_percentage
        FROM budget_items bi
        LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = $1
        ORDER BY bi.item_name
      `, [budgetId]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      res.status(500).json({ error: 'Failed to fetch budget items' });
    }
  }

  // Add budget item
  async addBudgetItem(req, res) {
    try {
      const { budgetId } = req.params;
      const {
        item_name,
        account_id,
        allocated_amount,
        description,
      } = req.body;
      
      // Check if budget exists and is not closed
      const budgetCheck = await pool.query(`
        SELECT status FROM budgets WHERE id = $1
      `, [budgetId]);
      
      if (budgetCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      if (budgetCheck.rows[0].status === 'closed') {
        return res.status(400).json({ 
          error: 'Cannot add items to a closed budget' 
        });
      }
      
      const result = await pool.query(`
        INSERT INTO budget_items (
          budget_id, item_name, account_id, allocated_amount,
          spent_amount, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
        RETURNING *
      `, [budgetId, item_name, account_id, allocated_amount, description]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding budget item:', error);
      res.status(500).json({ error: 'Failed to add budget item' });
    }
  }

  // Update budget item
  async updateBudgetItem(req, res) {
    try {
      const { id } = req.params;
      const {
        item_name,
        account_id,
        allocated_amount,
        description,
      } = req.body;
      
      const result = await pool.query(`
        UPDATE budget_items 
        SET 
          item_name = COALESCE($1, item_name),
          account_id = COALESCE($2, account_id),
          allocated_amount = COALESCE($3, allocated_amount),
          description = COALESCE($4, description),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [item_name, account_id, allocated_amount, description, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Budget item not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating budget item:', error);
      res.status(500).json({ error: 'Failed to update budget item' });
    }
  }

  // Delete budget item
  async deleteBudgetItem(req, res) {
    try {
      const { id } = req.params;
      
      // Check if item has spent amount
      const checkResult = await pool.query(`
        SELECT spent_amount FROM budget_items WHERE id = $1
      `, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Budget item not found' });
      }
      
      if (checkResult.rows[0].spent_amount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete budget item with recorded expenses' 
        });
      }
      
      await pool.query('DELETE FROM budget_items WHERE id = $1', [id]);
      
      res.json({ message: 'Budget item deleted successfully' });
    } catch (error) {
      console.error('Error deleting budget item:', error);
      res.status(500).json({ error: 'Failed to delete budget item' });
    }
  }

  // ==================
  // BUDGET ANALYTICS
  // ==================

  // Get budget summary/analytics
  async getBudgetSummary(req, res) {
    try {
      const { id } = req.params;
      
      const summary = await pool.query(`
        SELECT 
          b.id,
          b.budget_name,
          b.total_amount,
          b.spent_amount,
          b.status,
          (b.total_amount - b.spent_amount) as remaining_amount,
          CASE 
            WHEN b.total_amount > 0 THEN 
              ROUND((b.spent_amount / b.total_amount * 100), 2)
            ELSE 0 
          END as utilization_percentage,
          COUNT(bi.id) as total_items,
          COUNT(CASE WHEN bi.spent_amount >= bi.allocated_amount THEN 1 END) as exhausted_items,
          COALESCE(SUM(bi.allocated_amount), 0) as total_allocated,
          COALESCE(SUM(bi.spent_amount), 0) as total_item_spent
        FROM budgets b
        LEFT JOIN budget_items bi ON b.id = bi.budget_id
        WHERE b.id = $1
        GROUP BY b.id
      `, [id]);
      
      if (summary.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      // Get spending by category
      const byCategory = await pool.query(`
        SELECT 
          coa.account_type as category,
          coa.account_name,
          COUNT(bi.id) as item_count,
          COALESCE(SUM(bi.allocated_amount), 0) as allocated,
          COALESCE(SUM(bi.spent_amount), 0) as spent,
          COALESCE(SUM(bi.allocated_amount - bi.spent_amount), 0) as remaining
        FROM budget_items bi
        LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = $1
        GROUP BY coa.account_type, coa.account_name
        ORDER BY spent DESC
      `, [id]);
      
      res.json({
        ...summary.rows[0],
        by_category: byCategory.rows,
      });
    } catch (error) {
      console.error('Error fetching budget summary:', error);
      res.status(500).json({ error: 'Failed to fetch budget summary' });
    }
  }

  // Get budget variance report
  async getBudgetVariance(req, res) {
    try {
      const { id } = req.params;
      
      const variance = await pool.query(`
        SELECT 
          bi.id,
          bi.item_name,
          coa.account_name,
          bi.allocated_amount,
          bi.spent_amount,
          (bi.allocated_amount - bi.spent_amount) as variance,
          CASE 
            WHEN bi.allocated_amount > 0 THEN 
              ROUND(((bi.spent_amount - bi.allocated_amount) / bi.allocated_amount * 100), 2)
            ELSE 0 
          END as variance_percentage,
          CASE 
            WHEN bi.spent_amount > bi.allocated_amount THEN 'Over Budget'
            WHEN bi.spent_amount < bi.allocated_amount * 0.8 THEN 'Under Utilized'
            ELSE 'On Track'
          END as status
        FROM budget_items bi
        LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
        WHERE bi.budget_id = $1
        ORDER BY variance ASC
      `, [id]);
      
      res.json(variance.rows);
    } catch (error) {
      console.error('Error fetching budget variance:', error);
      res.status(500).json({ error: 'Failed to fetch budget variance' });
    }
  }
}

export default new BudgetController();
