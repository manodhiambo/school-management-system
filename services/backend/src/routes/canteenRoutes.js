import express from 'express';
import pool, { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('canteen'));

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

function padNum(n, prefix, len = 6) {
  return `${prefix}-${String(n).padStart(len, '0')}`;
}

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
      `SELECT cs.*, ic.name AS category_name,
              (cs.quantity <= cs.reorder_level) AS is_low_stock,
              (cs.expiry_date IS NOT NULL AND cs.expiry_date <= CURRENT_DATE + INTERVAL '7 days') AS is_expiring_soon
       FROM canteen_stock cs
       LEFT JOIN inventory_categories ic ON ic.id = cs.category_id
       WHERE cs.tenant_id = $1
       ORDER BY cs.item_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /stock — add stock item
router.post('/stock', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { item_name, unit, quantity, reorder_level, unit_cost, category_id, batch_number, expiry_date, warehouse_location } = req.body;
    if (!item_name || !unit) {
      return res.status(400).json({ success: false, message: 'item_name and unit are required' });
    }
    const rows = await query(
      `INSERT INTO canteen_stock
         (tenant_id, item_name, unit, quantity, reorder_level, unit_cost, category_id, batch_number, expiry_date, warehouse_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tid, item_name, unit, quantity || 0, reorder_level || 0, unit_cost || 0,
       category_id || null, batch_number || null, expiry_date || null, warehouse_location || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /stock/:id — update stock item
router.put('/stock/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { item_name, unit, quantity, reorder_level, unit_cost, category_id, batch_number, expiry_date, warehouse_location } = req.body;
    const rows = await query(
      `UPDATE canteen_stock SET
         item_name = COALESCE($1, item_name),
         unit = COALESCE($2, unit),
         quantity = COALESCE($3, quantity),
         reorder_level = COALESCE($4, reorder_level),
         unit_cost = COALESCE($5, unit_cost),
         category_id = COALESCE($6, category_id),
         batch_number = COALESCE($7, batch_number),
         expiry_date = COALESCE($8, expiry_date),
         warehouse_location = COALESCE($9, warehouse_location)
       WHERE id = $10 AND tenant_id = $11 RETURNING *`,
      [item_name, unit, quantity, reorder_level, unit_cost, category_id, batch_number, expiry_date, warehouse_location, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock item not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Shared helper: apply a signed quantity delta to a stock item and log the movement
async function applyStockMovement(tid, stockId, userId, type, delta, reference, notes) {
  const rows = await query(
    `UPDATE canteen_stock SET quantity = quantity + $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [delta, stockId, tid]
  );
  if (!rows.length) return null;
  await query(
    `INSERT INTO canteen_stock_movements (tenant_id, stock_id, type, quantity, reference, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [tid, stockId, type, delta, reference || null, notes || null, userId]
  );
  return rows[0];
}

// POST /stock/:id/adjust — set quantity to an absolute value (logs the delta as an 'adjustment' movement)
router.post('/stock/:id/adjust', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { quantity, notes } = req.body;
    if (quantity == null) {
      return res.status(400).json({ success: false, message: 'quantity is required' });
    }
    const current = await query(`SELECT quantity FROM canteen_stock WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!current.length) return res.status(404).json({ success: false, message: 'Stock item not found' });
    const delta = parseFloat(quantity) - parseFloat(current[0].quantity);
    const updated = await applyStockMovement(tid, req.params.id, req.user.id, 'adjustment', delta, null, notes);
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Adjust canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /stock/:id/receive — log a delivery, increases quantity
router.post('/stock/:id/receive', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { quantity, reference, notes } = req.body;
    if (!quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'A positive quantity is required' });
    }
    const updated = await applyStockMovement(tid, req.params.id, req.user.id, 'received', parseFloat(quantity), reference, notes);
    if (!updated) return res.status(404).json({ success: false, message: 'Stock item not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Receive canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /stock/:id/waste — log wastage, decreases quantity
router.post('/stock/:id/waste', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { quantity, notes } = req.body;
    if (!quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'A positive quantity is required' });
    }
    const current = await query(`SELECT quantity FROM canteen_stock WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!current.length) return res.status(404).json({ success: false, message: 'Stock item not found' });
    if (parseFloat(current[0].quantity) < parseFloat(quantity)) {
      return res.status(400).json({ success: false, message: 'Cannot waste more than current stock' });
    }
    const updated = await applyStockMovement(tid, req.params.id, req.user.id, 'wasted', -parseFloat(quantity), null, notes);
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Waste canteen stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /stock/:id/movements — audit trail for one item
router.get('/stock/:id/movements', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM canteen_stock_movements m
       LEFT JOIN users u ON u.id = m.created_by
       WHERE m.stock_id = $1 AND m.tenant_id = $2
       ORDER BY m.created_at DESC`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get canteen stock movements error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /seed-food-categories (idempotent)
router.post('/seed-food-categories', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const names = ['Dry Goods', 'Dairy', 'Fresh Produce', 'Meat & Poultry', 'Grains & Cereals', 'Beverages', 'Condiments & Spices', 'Frozen Foods'];
    const created = [];
    for (const name of names) {
      const existing = await query(`SELECT id FROM inventory_categories WHERE tenant_id = $1 AND name = $2`, [tid, name]);
      if (existing.length) continue;
      const rows = await query(`INSERT INTO inventory_categories (tenant_id, name) VALUES ($1, $2) RETURNING *`, [tid, name]);
      created.push(rows[0]);
    }
    res.json({ success: true, data: created });
  } catch (err) {
    logger.error('Seed food categories error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MENU PLANNING ─────────────────────────────────────────────────────────────

// GET /menus?from=&to=
router.get('/menus', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { from, to } = req.query;
    let sql = `SELECT m.*, mp.name AS meal_plan_name, mp.price
               FROM canteen_menus m
               LEFT JOIN canteen_meal_plans mp ON mp.id = m.meal_plan_id
               WHERE m.tenant_id = $1`;
    const params = [tid];
    if (from) { sql += ` AND m.menu_date >= $${params.length + 1}`; params.push(from); }
    if (to) { sql += ` AND m.menu_date <= $${params.length + 1}`; params.push(to); }
    sql += ' ORDER BY m.menu_date, m.meal_type';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get canteen menus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /menus — plan a menu entry
router.post('/menus', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { menu_date, meal_type, meal_plan_id, dish_name, nutrition_notes, notes } = req.body;
    if (!menu_date || !meal_type) {
      return res.status(400).json({ success: false, message: 'menu_date and meal_type are required' });
    }
    const rows = await query(
      `INSERT INTO canteen_menus (tenant_id, menu_date, meal_type, meal_plan_id, dish_name, nutrition_notes, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tid, menu_date, meal_type, meal_plan_id || null, dish_name || null, nutrition_notes || null, notes || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create canteen menu error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /menus/:id
router.put('/menus/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { meal_plan_id, dish_name, nutrition_notes, notes } = req.body;
    const rows = await query(
      `UPDATE canteen_menus SET
         meal_plan_id = COALESCE($1, meal_plan_id),
         dish_name = COALESCE($2, dish_name),
         nutrition_notes = COALESCE($3, nutrition_notes),
         notes = COALESCE($4, notes)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [meal_plan_id, dish_name, nutrition_notes, notes, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Menu entry not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update canteen menu error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /menus/:id
router.delete('/menus/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`DELETE FROM canteen_menus WHERE id = $1 AND tenant_id = $2 RETURNING *`, [req.params.id, tid]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Menu entry not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Delete canteen menu error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MEAL ATTENDANCE ────────────────────────────────────────────────────────────

// GET /attendance?date=&meal_type=
router.get('/attendance', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date, meal_type } = req.query;
    let sql = `SELECT a.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number
               FROM canteen_meal_attendance a
               JOIN students s ON s.id = a.student_id
               WHERE a.tenant_id = $1`;
    const params = [tid];
    if (date) { sql += ` AND a.attendance_date = $${params.length + 1}`; params.push(date); }
    if (meal_type) { sql += ` AND a.meal_type = $${params.length + 1}`; params.push(meal_type); }
    sql += ' ORDER BY a.marked_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get meal attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /attendance — mark a student as having eaten
router.post('/attendance', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, attendance_date, meal_type, meal_plan_id, menu_id, method } = req.body;
    if (!student_id || !meal_type) {
      return res.status(400).json({ success: false, message: 'student_id and meal_type are required' });
    }
    const rows = await query(
      `INSERT INTO canteen_meal_attendance
         (tenant_id, student_id, attendance_date, meal_type, meal_plan_id, menu_id, method, marked_by)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, student_id, attendance_date, meal_type)
       DO UPDATE SET method = EXCLUDED.method, marked_by = EXCLUDED.marked_by, marked_at = NOW()
       RETURNING *`,
      [tid, student_id, attendance_date || null, meal_type, meal_plan_id || null, menu_id || null, method || 'manual', req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Mark meal attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DIET & ALLERGY (reads student_medical_profile directly — same source of
// truth as the Health module, avoids a hard cross-module route dependency) ────

// GET /diet-info/:studentId
router.get('/diet-info/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT student_id, allergies, dietary_requirements FROM student_medical_profile
       WHERE student_id = $1 AND tenant_id = $2`,
      [req.params.studentId, tid]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    logger.error('Get diet info error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /diet-alerts — every student tenant-wide with a recorded allergy or dietary requirement
router.get('/diet-alerts', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT mp.student_id, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
              mp.allergies, mp.dietary_requirements
       FROM student_medical_profile mp
       JOIN students s ON s.id = mp.student_id
       WHERE mp.tenant_id = $1
         AND (COALESCE(mp.allergies, '') <> '' OR COALESCE(mp.dietary_requirements, '') <> '')
       ORDER BY s.first_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get diet alerts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── KITCHEN REQUISITIONS (same tables/pipeline as the Procurement module —
// department is fixed to 'Kitchen' so these flow through the identical
// PR → RFQ → PO → GRN approval chain, not a parallel system) ──────────────────

// GET /requisitions
router.get('/requisitions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS requester_name
       FROM proc_purchase_requisitions r
       LEFT JOIN users u ON u.id = r.requested_by
       WHERE r.tenant_id = $1 AND r.department = 'Kitchen'
       ORDER BY r.created_at DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get kitchen requisitions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /requisitions
router.post('/requisitions', adminOnly, async (req, res) => {
  const { required_date, urgency, reason, notes, items = [] } = req.body;
  const tid = req.user.tenant_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const countRow = await client.query(`SELECT COUNT(*) AS cnt FROM proc_purchase_requisitions WHERE tenant_id = $1`, [tid]);
    const prNum = padNum(Number(countRow.rows[0].cnt) + 1, 'PR');
    const totalEst = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.estimated_unit_cost || 0)), 0);
    const { rows } = await client.query(
      `INSERT INTO proc_purchase_requisitions
         (tenant_id, pr_number, department, requested_by, required_date, urgency, reason, notes, status, total_estimated_cost)
       VALUES ($1,$2,'Kitchen',$3,$4,$5,$6,$7,'draft',$8) RETURNING *`,
      [tid, prNum, req.user.id, required_date || null, urgency || 'medium', reason || null, notes || null, totalEst]
    );
    const prId = rows[0].id;
    for (const item of items) {
      const total = Number(item.quantity) * Number(item.estimated_unit_cost || 0);
      await client.query(
        `INSERT INTO proc_pr_items (tenant_id, pr_id, item_name, quantity, unit, estimated_unit_cost, estimated_total, specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tid, prId, item.item_name, item.quantity, item.unit || null, item.estimated_unit_cost || 0, total, item.specifications || null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create kitchen requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
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
      `SELECT COUNT(*) AS total_transactions, SUM(amount) AS total_sales,
              COUNT(DISTINCT student_id) AS distinct_students
       FROM canteen_transactions
       WHERE tenant_id = $1 AND type = 'debit' AND DATE(created_at) = $2`,
      [tid, date]
    );
    const totals = totalRows[0];
    const distinctStudents = parseInt(totals.distinct_students) || 0;
    const totalSales = parseFloat(totals.total_sales) || 0;
    const attendanceRows = await query(
      `SELECT COUNT(*) AS meals_served FROM canteen_meal_attendance
       WHERE tenant_id = $1 AND attendance_date = $2`,
      [tid, date]
    );
    const mealsServed = parseInt(attendanceRows[0].meals_served) || 0;
    res.json({
      success: true,
      data: {
        date,
        by_meal_type: rows,
        totals: {
          ...totals,
          cost_per_meal: mealsServed > 0 ? +(totalSales / mealsServed).toFixed(2) : null,
          cost_per_student: distinctStudents > 0 ? +(totalSales / distinctStudents).toFixed(2) : null,
          meals_served: mealsServed,
        },
      },
    });
  } catch (err) {
    logger.error('Get daily canteen report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /reports/consumption?from=&to= — stock movement totals by type over a date range
router.get('/reports/consumption', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const from = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const rows = await query(
      `SELECT cs.item_name, cs.unit, m.type,
              SUM(ABS(m.quantity)) AS total_quantity,
              SUM(ABS(m.quantity) * cs.unit_cost) AS total_value
       FROM canteen_stock_movements m
       JOIN canteen_stock cs ON cs.id = m.stock_id
       WHERE m.tenant_id = $1 AND m.created_at::date BETWEEN $2 AND $3
       GROUP BY cs.item_name, cs.unit, m.type
       ORDER BY cs.item_name, m.type`,
      [tid, from, to]
    );
    res.json({ success: true, data: { from, to, movements: rows } });
  } catch (err) {
    logger.error('Get consumption report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /reports/wastage?from=&to=
router.get('/reports/wastage', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'finance_officer') {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const from = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const rows = await query(
      `SELECT cs.item_name, cs.unit,
              SUM(ABS(m.quantity)) AS total_wasted,
              SUM(ABS(m.quantity) * cs.unit_cost) AS total_value_lost
       FROM canteen_stock_movements m
       JOIN canteen_stock cs ON cs.id = m.stock_id
       WHERE m.tenant_id = $1 AND m.type = 'wasted' AND m.created_at::date BETWEEN $2 AND $3
       GROUP BY cs.item_name, cs.unit
       ORDER BY total_value_lost DESC`,
      [tid, from, to]
    );
    const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total_value_lost) || 0), 0);
    res.json({ success: true, data: { from, to, items: rows, grand_total_lost: grandTotal } });
  } catch (err) {
    logger.error('Get wastage report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
