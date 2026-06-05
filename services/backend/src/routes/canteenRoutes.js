import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── MEAL PLANS ───────────────────────────────────────────────────────────────

// GET /meal-plans — list active meal plans
router.get('/meal-plans', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT * FROM canteen_meal_plans WHERE tenant_id = $1 AND is_active = TRUE ORDER BY meal_type, name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get meal plans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /meal-plans — admin, create
router.post('/meal-plans', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { name, description, price, meal_type } = req.body;
    if (!name || price == null || !meal_type) {
      return res.status(400).json({ success: false, message: 'name, price and meal_type are required' });
    }
    const rows = await query(
      `INSERT INTO canteen_meal_plans (tenant_id, name, description, price, meal_type, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [tid, name, description || null, price, meal_type]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create meal plan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /meal-plans/:id — admin, update
router.put('/meal-plans/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { name, description, price, meal_type, is_active } = req.body;
    const rows = await query(
      `UPDATE canteen_meal_plans SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         meal_type = COALESCE($4, meal_type),
         is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [name, description, price, meal_type, is_active, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update meal plan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /meal-plans/:id — admin, deactivate
router.delete('/meal-plans/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const rows = await query(
      `UPDATE canteen_meal_plans SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Deactivate meal plan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

// GET /accounts — admin, list all student accounts with balance
router.get('/accounts', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const rows = await query(
      `SELECT ca.*,
              s.first_name || ' ' || s.last_name AS student_name,
              s.admission_number,
              c.name AS class_name
       FROM canteen_accounts ca
       JOIN students s ON s.id = ca.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE ca.tenant_id = $1
       ORDER BY s.first_name, s.last_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get canteen accounts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /accounts/student/:studentId — balance + last 20 transactions
router.get('/accounts/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId } = req.params;

    const accountRows = await query(
      `SELECT ca.*,
              s.first_name || ' ' || s.last_name AS student_name,
              s.admission_number
       FROM canteen_accounts ca
       JOIN students s ON s.id = ca.student_id
       WHERE ca.student_id = $1 AND ca.tenant_id = $2`,
      [studentId, tid]
    );
    const account = accountRows[0] || { student_id: studentId, balance: 0 };

    const txRows = await query(
      `SELECT ct.*,
              mp.name AS meal_plan_name,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM canteen_transactions ct
       LEFT JOIN canteen_meal_plans mp ON mp.id = ct.meal_plan_id
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.student_id = $1 AND ct.tenant_id = $2
       ORDER BY ct.created_at DESC
       LIMIT 20`,
      [studentId, tid]
    );

    res.json({ success: true, data: { account, transactions: txRows } });
  } catch (err) {
    logger.error('Get student canteen account error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /accounts/topup — admin/finance, top up
router.post('/accounts/topup', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { student_id, amount, reference } = req.body;
    if (!student_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'student_id and positive amount are required' });
    }

    // Upsert account balance
    const accountRows = await query(
      `INSERT INTO canteen_accounts (tenant_id, student_id, balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, tenant_id) DO UPDATE
         SET balance = canteen_accounts.balance + EXCLUDED.balance
       RETURNING *`,
      [tid, student_id, parseFloat(amount)]
    );

    // Log transaction
    const txRows = await query(
      `INSERT INTO canteen_transactions
         (tenant_id, student_id, amount, type, reference, created_by)
       VALUES ($1, $2, $3, 'topup', $4, $5) RETURNING *`,
      [tid, student_id, parseFloat(amount), reference || null, req.user.id]
    );

    res.status(201).json({ success: true, data: { account: accountRows[0], transaction: txRows[0] } });
  } catch (err) {
    logger.error('Top up canteen account error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /accounts/purchase — admin/canteen, deduct meal
router.post('/accounts/purchase', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { student_id, meal_plan_id } = req.body;
    if (!student_id || !meal_plan_id) {
      return res.status(400).json({ success: false, message: 'student_id and meal_plan_id are required' });
    }

    // Get meal plan price
    const planRows = await query(
      `SELECT * FROM canteen_meal_plans WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [meal_plan_id, tid]
    );
    if (!planRows.length) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    const plan = planRows[0];

    // Get current balance
    const accountRows = await query(
      `SELECT balance FROM canteen_accounts WHERE student_id = $1 AND tenant_id = $2`,
      [student_id, tid]
    );
    const balance = accountRows.length ? parseFloat(accountRows[0].balance) : 0;
    if (balance < parseFloat(plan.price)) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: ${balance}, Required: ${plan.price}` });
    }

    // Deduct balance
    const updatedAccount = await query(
      `UPDATE canteen_accounts SET balance = balance - $1
       WHERE student_id = $2 AND tenant_id = $3 RETURNING *`,
      [parseFloat(plan.price), student_id, tid]
    );

    // Log transaction
    const txRows = await query(
      `INSERT INTO canteen_transactions
         (tenant_id, student_id, amount, type, meal_plan_id, created_by)
       VALUES ($1, $2, $3, 'debit', $4, $5) RETURNING *`,
      [tid, student_id, parseFloat(plan.price), meal_plan_id, req.user.id]
    );

    res.status(201).json({ success: true, data: { account: updatedAccount[0], transaction: txRows[0] } });
  } catch (err) {
    logger.error('Purchase meal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── STOCK ────────────────────────────────────────────────────────────────────

// GET /stock — list stock items with low-stock flag
router.get('/stock', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT *, (quantity <= reorder_level) AS is_low_stock
       FROM canteen_stock
       WHERE tenant_id = $1
       ORDER BY item_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /stock — add stock item
router.post('/stock', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { item_name, unit, quantity, reorder_level, unit_cost } = req.body;
    if (!item_name || !unit) {
      return res.status(400).json({ success: false, message: 'item_name and unit are required' });
    }
    const rows = await query(
      `INSERT INTO canteen_stock (tenant_id, item_name, unit, quantity, reorder_level, unit_cost)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, item_name, unit, quantity || 0, reorder_level || 0, unit_cost || 0]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /stock/:id — update stock item
router.put('/stock/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { item_name, unit, quantity, reorder_level, unit_cost } = req.body;
    const rows = await query(
      `UPDATE canteen_stock SET
         item_name = COALESCE($1, item_name),
         unit = COALESCE($2, unit),
         quantity = COALESCE($3, quantity),
         reorder_level = COALESCE($4, reorder_level),
         unit_cost = COALESCE($5, unit_cost)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [item_name, unit, quantity, reorder_level, unit_cost, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock item not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /stock/:id/adjust — adjust quantity
router.post('/stock/:id/adjust', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { quantity, notes } = req.body;
    if (quantity == null) {
      return res.status(400).json({ success: false, message: 'quantity is required' });
    }
    const rows = await query(
      `UPDATE canteen_stock SET quantity = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [quantity, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock item not found' });
    logger.info(`Canteen stock adjusted: item=${req.params.id}, qty=${quantity}, notes=${notes}, by=${req.user.id}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Adjust canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

// GET /reports/daily — daily sales by meal_type
router.get('/reports/daily', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = await query(
      `SELECT mp.meal_type,
              COUNT(ct.id) AS transaction_count,
              SUM(ct.amount) AS total_amount
       FROM canteen_transactions ct
       LEFT JOIN canteen_meal_plans mp ON mp.id = ct.meal_plan_id
       WHERE ct.tenant_id = $1
         AND ct.type = 'debit'
         AND DATE(ct.created_at) = $2
       GROUP BY mp.meal_type
       ORDER BY mp.meal_type`,
      [tid, date]
    );
    const totalRows = await query(
      `SELECT COUNT(*) AS total_transactions, SUM(amount) AS total_sales
       FROM canteen_transactions
       WHERE tenant_id = $1 AND type = 'debit' AND DATE(created_at) = $2`,
      [tid, date]
    );
    res.json({ success: true, data: { date, by_meal_type: rows, totals: totalRows[0] } });
  } catch (err) {
    logger.error('Get daily canteen report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
