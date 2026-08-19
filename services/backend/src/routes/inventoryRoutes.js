import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { generateQrDataUrl, generateBarcodeValue } from '../utils/codeGenerator.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('inventory'));

// Helper: admin only guard
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// Fires a notification to every admin/finance_officer in the tenant the moment
// an item's quantity crosses from above to at-or-below its reorder level, so
// stock issued out to any department (or sold, damaged, adjusted down) gets
// flagged once rather than on every subsequent dip. Non-fatal: a notification
// failure must never block the stock movement that triggered it.
async function notifyLowStockIfCrossed(tenantId, item, previousQty, newQty) {
  const reorderLevel = parseFloat(item.reorder_level) || 0;
  const justCrossed = previousQty > reorderLevel && newQty <= reorderLevel;
  if (!justCrossed) return;
  try {
    const recipients = await query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin','finance_officer') AND is_active = TRUE`,
      [tenantId]
    );
    const title = 'Low Stock Alert';
    const message = `${item.name} is at ${newQty} ${item.unit || 'units'} — at or below its reorder level of ${reorderLevel}.`;
    for (const r of recipients) {
      await query(
        `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read)
         VALUES ($1,$2,$3,$4,$5,'low_stock',FALSE)`,
        [uuidv4(), tenantId, r.id, title, message]
      );
    }
  } catch (e) { logger.error('Low stock notification error:', e); }
}

// Shared department list — kept broad enough to cover a typical Kenyan
// school's operational departments (mirrors services/frontend's
// src/constants/departments.ts, which must be kept in sync).
const DEPARTMENTS = [
  'Administration', 'ICT', 'Science', 'Mathematics', 'Languages', 'Social Studies',
  'Humanities', 'Technical', 'Sports', 'Library', 'Health', 'Transport', 'Accounts',
  'Maintenance', 'Boarding/Hostel', 'Kitchen & Feeding', 'Security', 'Store',
];

// COUNT(*)+1 numbering collides under concurrent creation (the same bug
// already hit proc_purchase_requisitions.pr_number and proc_assets.asset_tag
// before those were fixed with a retry loop) — check-and-retry instead of
// trusting the count to still be accurate by the time we insert.
async function nextInventorySeq(tenantId, table, column, prefix) {
  const rows = await query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = $1`, [tenantId]);
  let n = Number(rows[0].cnt) + 1;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${String(n).padStart(6, '0')}`;
    const existing = await query(`SELECT 1 FROM ${table} WHERE tenant_id = $1 AND ${column} = $2`, [tenantId, candidate]);
    if (!existing.length) return candidate;
    n++;
  }
  throw new Error(`Could not generate a unique ${column} after 10 attempts`);
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

// GET /categories
router.get('/categories', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT ic.*, COUNT(ii.id) AS item_count
       FROM inventory_categories ic
       LEFT JOIN inventory_items ii ON ii.category_id = ic.id AND ii.tenant_id = ic.tenant_id
       WHERE ic.tenant_id = $1
       GROUP BY ic.id
       ORDER BY ic.name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get inventory categories error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /categories
router.post('/categories', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const rows = await query(
      `INSERT INTO inventory_categories (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [tid, name, description || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create inventory category error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /categories/:id
router.put('/categories/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, description } = req.body;
    const rows = await query(
      `UPDATE inventory_categories SET
         name = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3 AND tenant_id = $4 RETURNING *`,
      [name, description, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update inventory category error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /categories/:id
router.delete('/categories/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    // Check no items in category
    const itemCheck = await query(
      `SELECT COUNT(*) AS cnt FROM inventory_items WHERE category_id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (parseInt(itemCheck[0].cnt) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete category with existing items' });
    }
    const rows = await query(
      `DELETE FROM inventory_categories WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Delete inventory category error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ITEMS ────────────────────────────────────────────────────────────────────

// GET /items
router.get('/items', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, low_stock, search } = req.query;
    let sql = `SELECT ii.*,
                      ic.name AS category_name,
                      (ii.quantity <= ii.reorder_level) AS is_low_stock,
                      (ii.quantity * ii.unit_cost) AS total_value
               FROM inventory_items ii
               LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
               WHERE ii.tenant_id = $1`;
    const params = [tid];
    if (category_id) { sql += ` AND ii.category_id = $${params.length + 1}`; params.push(category_id); }
    if (low_stock === 'true') { sql += ` AND ii.quantity <= ii.reorder_level`; }
    if (search) { sql += ` AND (ii.name ILIKE $${params.length + 1} OR ii.sku ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY ic.name, ii.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get inventory items error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /items
router.post('/items', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, name, description, sku, unit, quantity, reorder_level, unit_cost, location, condition } = req.body;
    if (!name || !unit) return res.status(400).json({ success: false, message: 'name and unit are required' });
    const rows = await query(
      `INSERT INTO inventory_items
         (tenant_id, category_id, name, description, sku, unit, quantity, reorder_level, unit_cost, location, condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [tid, category_id || null, name, description || null, sku || null, unit,
       quantity || 0, reorder_level || 0, unit_cost || 0, location || null, condition || 'good']
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create inventory item error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /items/:id — update item details
router.put('/items/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, name, description, sku, unit, reorder_level, unit_cost, location, condition } = req.body;
    const rows = await query(
      `UPDATE inventory_items SET
         category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         sku = COALESCE($4, sku),
         unit = COALESCE($5, unit),
         reorder_level = COALESCE($6, reorder_level),
         unit_cost = COALESCE($7, unit_cost),
         location = COALESCE($8, location),
         condition = COALESCE($9, condition)
       WHERE id = $10 AND tenant_id = $11 RETURNING *`,
      [category_id, name, description, sku, unit, reorder_level, unit_cost, location, condition, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update inventory item error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /items/:id/transaction — add inventory transaction
router.post('/items/:id/transaction', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { type, quantity, reference, notes, adjustment_value } = req.body;
    if (!type || quantity == null) {
      return res.status(400).json({ success: false, message: 'type and quantity are required' });
    }

    const validTypes = ['stock_in', 'stock_out', 'damaged', 'adjustment', 'transfer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(', ')}` });
    }

    // Get current quantity
    const itemRows = await query(
      `SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!itemRows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    const item = itemRows[0];

    let newQuantity;
    if (type === 'stock_in') {
      newQuantity = parseFloat(item.quantity) + parseFloat(quantity);
    } else if (type === 'stock_out' || type === 'damaged') {
      newQuantity = parseFloat(item.quantity) - parseFloat(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
    } else if (type === 'adjustment') {
      // If adjustment_value is provided, set directly; otherwise use quantity as delta
      newQuantity = adjustment_value != null ? parseFloat(adjustment_value) : parseFloat(item.quantity) + parseFloat(quantity);
    } else if (type === 'transfer') {
      newQuantity = parseFloat(item.quantity) - parseFloat(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock for transfer' });
      }
    }

    // Update quantity
    const updatedItem = await query(
      `UPDATE inventory_items SET quantity = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [newQuantity, req.params.id, tid]
    );

    // Log transaction
    const txRows = await query(
      `INSERT INTO inventory_transactions
         (tenant_id, item_id, type, quantity, reference, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tid, req.params.id, type, parseFloat(quantity), reference || null, notes || null, req.user.id]
    );

    await notifyLowStockIfCrossed(tid, item, parseFloat(item.quantity), newQuantity);

    res.status(201).json({ success: true, data: { item: updatedItem[0], transaction: txRows[0] } });
  } catch (err) {
    logger.error('Inventory transaction error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /items/:id/history — transaction history
router.get('/items/:id/history', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT it.*,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM inventory_transactions it
       LEFT JOIN users u ON u.id = it.created_by
       WHERE it.item_id = $1 AND it.tenant_id = $2
       ORDER BY it.created_at DESC`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get inventory item history error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

// GET /low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id } = req.query;
    const params = [tid];
    let sql = `SELECT ii.*,
              ic.name AS category_name,
              (ii.reorder_level - ii.quantity + 1) AS suggested_reorder_qty
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
       WHERE ii.tenant_id = $1 AND ii.quantity <= ii.reorder_level`;
    if (category_id) { params.push(category_id); sql += ` AND ii.category_id = $${params.length}`; }
    sql += ' ORDER BY (ii.reorder_level - ii.quantity) DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get low stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /valuation — total inventory value by category
router.get('/valuation', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id } = req.query;
    const params = [tid];
    let categoryFilter = '';
    if (category_id) { params.push(category_id); categoryFilter = ` AND ii.category_id = $${params.length}`; }
    const byCategory = await query(
      `SELECT ic.name AS category_name,
              COUNT(ii.id) AS item_count,
              SUM(ii.quantity) AS total_quantity,
              SUM(ii.quantity * ii.unit_cost) AS total_value
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
       WHERE ii.tenant_id = $1 ${categoryFilter}
       GROUP BY ic.id, ic.name
       ORDER BY total_value DESC`,
      params
    );
    const totalRows = await query(
      `SELECT SUM(quantity * unit_cost) AS grand_total, COUNT(*) AS total_items
       FROM inventory_items ii WHERE ii.tenant_id = $1 ${categoryFilter}`,
      params
    );
    res.json({
      success: true,
      data: {
        by_category: byCategory,
        grand_total: parseFloat(totalRows[0].grand_total) || 0,
        total_items: parseInt(totalRows[0].total_items)
      }
    });
  } catch (err) {
    logger.error('Get inventory valuation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SEED (hostel-relevant categories, idempotent) ────────────────────────────

router.post('/seed-hostel-categories', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const names = ['Mattresses', 'Blankets', 'Buckets', 'Lockers', 'Mosquito Nets', 'Uniforms', 'Textbooks', 'Keys', 'Pillows', 'Bedsheets'];
    const created = [];
    for (const name of names) {
      const existing = await query(`SELECT id FROM inventory_categories WHERE tenant_id = $1 AND name = $2`, [tid, name]);
      if (existing.length) continue;
      const rows = await query(
        `INSERT INTO inventory_categories (tenant_id, name) VALUES ($1, $2) RETURNING *`,
        [tid, name]
      );
      created.push(rows[0]);
    }
    res.json({ success: true, data: created });
  } catch (err) {
    logger.error('Seed hostel categories error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ITEM UNITS (individually trackable: lockers, mattresses, beds, keys) ─────

// GET /items/:itemId/units
router.get('/items/:itemId/units', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT u.*,
              CASE WHEN u.current_holder_type = 'student' THEN
                (SELECT first_name || ' ' || last_name FROM students WHERE id = u.current_holder_id)
              END AS current_holder_name
       FROM inventory_item_units u
       WHERE u.item_id = $1 AND u.tenant_id = $2
       ORDER BY u.created_at DESC`,
      [req.params.itemId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get item units error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /items/:itemId/units — register a new trackable unit (auto-generates barcode + QR)
router.post('/items/:itemId/units', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { serial_number, condition, purchase_date, purchase_cost, notes } = req.body;

    const itemRows = await query(`SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2`, [req.params.itemId, tid]);
    if (!itemRows.length) return res.status(404).json({ success: false, message: 'Item not found' });

    const barcode = generateBarcodeValue('HST');
    const rows = await query(
      `INSERT INTO inventory_item_units
         (tenant_id, item_id, barcode, qr_code, serial_number, condition, purchase_date, purchase_cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tid, req.params.itemId, barcode, barcode, serial_number || null,
       condition || 'new', purchase_date || null, purchase_cost || 0, notes || null]
    );
    const qrDataUrl = await generateQrDataUrl(barcode);
    res.status(201).json({ success: true, data: { ...rows[0], qr_data_url: qrDataUrl } });
  } catch (err) {
    logger.error('Create item unit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /units/:barcode — lookup a unit by scanned barcode/QR value
router.get('/units/:barcode', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT u.*, i.name AS item_name, i.category_id, ic.name AS category_name
       FROM inventory_item_units u
       JOIN inventory_items i ON i.id = u.item_id
       LEFT JOIN inventory_categories ic ON ic.id = i.category_id
       WHERE u.barcode = $1 AND u.tenant_id = $2`,
      [req.params.barcode, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Lookup unit by barcode error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ASSET ISSUING ─────────────────────────────────────────────────────────────

// GET /issuances
router.get('/issuances', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, student_id } = req.query;
    let sql = `SELECT iss.*, u.barcode, i.name AS item_name,
                      s.first_name || ' ' || s.last_name AS student_name, s.admission_number
               FROM inventory_issuances iss
               JOIN inventory_item_units u ON u.id = iss.item_unit_id
               JOIN inventory_items i ON i.id = u.item_id
               LEFT JOIN students s ON s.id = iss.student_id
               WHERE iss.tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND iss.status = $${params.length + 1}`; params.push(status); }
    if (student_id) { sql += ` AND iss.student_id = $${params.length + 1}`; params.push(student_id); }
    sql += ' ORDER BY iss.issued_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get issuances error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /issuances — issue a unit to a student
router.post('/issuances', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { item_unit_id, student_id, notes } = req.body;
    if (!item_unit_id || !student_id) {
      return res.status(400).json({ success: false, message: 'item_unit_id and student_id are required' });
    }
    const unitRows = await query(`SELECT * FROM inventory_item_units WHERE id = $1 AND tenant_id = $2`, [item_unit_id, tid]);
    if (!unitRows.length) return res.status(404).json({ success: false, message: 'Unit not found' });
    if (unitRows[0].current_holder_id) {
      return res.status(400).json({ success: false, message: 'Unit is already issued to someone' });
    }

    const rows = await query(
      `INSERT INTO inventory_issuances
         (tenant_id, item_unit_id, student_id, issued_by, condition_at_issue, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, item_unit_id, student_id, req.user.id, unitRows[0].condition, notes || null]
    );
    await query(
      `UPDATE inventory_item_units SET current_holder_type = 'student', current_holder_id = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [student_id, item_unit_id, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create issuance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /issuances/:id/return — return a unit (optionally noting condition)
router.put('/issuances/:id/return', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { condition_at_return } = req.body;
    const rows = await query(
      `UPDATE inventory_issuances SET status = 'returned', returned_at = NOW(), condition_at_return = $1
       WHERE id = $2 AND tenant_id = $3 AND status = 'issued' RETURNING *`,
      [condition_at_return || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Active issuance not found' });
    await query(
      `UPDATE inventory_item_units SET current_holder_type = 'none', current_holder_id = NULL,
              condition = COALESCE($1, condition), updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [condition_at_return || null, rows[0].item_unit_id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Return issuance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /issuances/:id/lost or /damaged — close out the issuance with student liability
router.put('/issuances/:id/:outcome(lost|damaged)', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { outcome } = req.params;
    const { replacement_cost, notes } = req.body;
    const rows = await query(
      `UPDATE inventory_issuances SET status = $1, returned_at = NOW(),
              replacement_cost = COALESCE($2, replacement_cost), notes = COALESCE($3, notes)
       WHERE id = $4 AND tenant_id = $5 AND status = 'issued' RETURNING *`,
      [outcome, replacement_cost || 0, notes || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Active issuance not found' });
    await query(
      `UPDATE inventory_item_units SET current_holder_type = 'none', current_holder_id = NULL,
              condition = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [outcome, rows[0].item_unit_id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Close out issuance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /issuances/:id/transfer — return current holder, issue to a new student
router.post('/issuances/:id/transfer', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, notes } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required' });

    const current = await query(
      `SELECT * FROM inventory_issuances WHERE id = $1 AND tenant_id = $2 AND status = 'issued'`,
      [req.params.id, tid]
    );
    if (!current.length) return res.status(404).json({ success: false, message: 'Active issuance not found' });

    await query(
      `UPDATE inventory_issuances SET status = 'returned', returned_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    const unitRows = await query(`SELECT condition FROM inventory_item_units WHERE id = $1 AND tenant_id = $2`, [current[0].item_unit_id, tid]);
    const rows = await query(
      `INSERT INTO inventory_issuances
         (tenant_id, item_unit_id, student_id, issued_by, condition_at_issue, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, current[0].item_unit_id, student_id, req.user.id, unitRows[0]?.condition || null, notes || `Transferred from previous holder`]
    );
    await query(
      `UPDATE inventory_item_units SET current_holder_type = 'student', current_holder_id = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [student_id, current[0].item_unit_id, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Transfer issuance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ASSET REPORTS ─────────────────────────────────────────────────────────────

// GET /issuances/student/:studentId — a student's full inventory liability report
router.get('/issuances/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT iss.*, u.barcode, i.name AS item_name, ic.name AS category_name
       FROM inventory_issuances iss
       JOIN inventory_item_units u ON u.id = iss.item_unit_id
       JOIN inventory_items i ON i.id = u.item_id
       LEFT JOIN inventory_categories ic ON ic.id = i.category_id
       WHERE iss.tenant_id = $1 AND iss.student_id = $2
       ORDER BY iss.issued_at DESC`,
      [tid, req.params.studentId]
    );
    const liability = rows
      .filter(r => r.status === 'lost' || r.status === 'damaged')
      .reduce((sum, r) => sum + (parseFloat(r.replacement_cost) || 0), 0);
    res.json({ success: true, data: { issuances: rows, total_liability: liability } });
  } catch (err) {
    logger.error('Get student inventory report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /issuances/replacement-charges — sum of outstanding replacement costs per student
router.get('/issuances/replacement-charges', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT s.id AS student_id, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
              SUM(iss.replacement_cost) AS total_charges,
              COUNT(iss.id) AS item_count
       FROM inventory_issuances iss
       JOIN students s ON s.id = iss.student_id
       WHERE iss.tenant_id = $1 AND iss.status IN ('lost','damaged') AND iss.replacement_cost > 0
       GROUP BY s.id, s.first_name, s.last_name, s.admission_number
       ORDER BY total_charges DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get replacement charges error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DEPARTMENTS (shared list for dropdowns) ───────────────────────────────────

router.get('/departments', (req, res) => {
  res.json({ success: true, data: DEPARTMENTS });
});

// ─── STORE REQUISITIONS (a department requests stock already in the store) ────
// Distinct from Purchase Requisitions (proc_purchase_requisitions), which buy
// NEW stock from a supplier. This is for stock that already exists centrally.

// GET /store-requisitions
router.get('/store-requisitions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, department, mine } = req.query;
    let sql = `SELECT r.*, CONCAT(u.first_name,' ',u.last_name) AS requester_name,
                      CONCAT(a.first_name,' ',a.last_name) AS approver_name,
                      (SELECT COUNT(*) FROM store_requisition_items i WHERE i.requisition_id = r.id) AS item_count
               FROM store_requisitions r
               LEFT JOIN users u ON u.id = r.requested_by
               LEFT JOIN users a ON a.id = r.approved_by
               WHERE r.tenant_id = $1`;
    const params = [tid];
    if (status) { params.push(status); sql += ` AND r.status = $${params.length}`; }
    if (department) { params.push(department); sql += ` AND r.department = $${params.length}`; }
    if (mine === 'true') { params.push(req.user.id); sql += ` AND r.requested_by = $${params.length}`; }
    sql += ' ORDER BY r.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get store requisitions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /store-requisitions/:id
router.get('/store-requisitions/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const [reqRows, items, issues] = await Promise.all([
      query(
        `SELECT r.*, CONCAT(u.first_name,' ',u.last_name) AS requester_name,
                CONCAT(a.first_name,' ',a.last_name) AS approver_name
         FROM store_requisitions r
         LEFT JOIN users u ON u.id = r.requested_by
         LEFT JOIN users a ON a.id = r.approved_by
         WHERE r.id = $1 AND r.tenant_id = $2`,
        [req.params.id, tid]
      ),
      query(
        `SELECT i.*, ii.name AS item_name, ii.unit, ii.quantity AS current_stock
         FROM store_requisition_items i
         JOIN inventory_items ii ON ii.id = i.item_id
         WHERE i.requisition_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT s.*, CONCAT(iu.first_name,' ',iu.last_name) AS issued_by_name,
                CONCAT(ru.first_name,' ',ru.last_name) AS received_by_name, ii.name AS item_name
         FROM store_issues s
         JOIN inventory_items ii ON ii.id = s.item_id
         LEFT JOIN users iu ON iu.id = s.issued_by
         LEFT JOIN users ru ON ru.id = s.received_by
         WHERE s.requisition_id = $1
         ORDER BY s.issued_at DESC`,
        [req.params.id]
      ),
    ]);
    if (!reqRows.length) return res.status(404).json({ success: false, message: 'Requisition not found' });
    res.json({ success: true, data: { ...reqRows[0], items, issues } });
  } catch (err) {
    logger.error('Get store requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /store-requisitions — any authenticated staff member requests stock for their department
router.post('/store-requisitions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { department, required_date, urgency, reason, notes, items = [] } = req.body;
    if (!department) return res.status(400).json({ success: false, message: 'department is required' });
    if (!items.length) return res.status(400).json({ success: false, message: 'At least one item is required' });

    const reqNumber = await nextInventorySeq(tid, 'store_requisitions', 'requisition_number', 'SR');
    const rows = await query(
      `INSERT INTO store_requisitions
         (tenant_id, requisition_number, department, requested_by, required_date, urgency, reason, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted') RETURNING *`,
      [tid, reqNumber, department, req.user.id, required_date || null, urgency || 'medium', reason || null, notes || null]
    );
    const reqId = rows[0].id;
    for (const item of items) {
      if (!item.item_id || !item.quantity_requested) continue;
      await query(
        `INSERT INTO store_requisition_items (tenant_id, requisition_id, item_id, quantity_requested, notes)
         VALUES ($1,$2,$3,$4,$5)`,
        [tid, reqId, item.item_id, item.quantity_requested, item.notes || null]
      );
    }
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create store requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /store-requisitions/:id/approve
router.put('/store-requisitions/:id/approve', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE store_requisitions SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND status = 'submitted' RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Requisition not found or not pending approval' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Approve store requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /store-requisitions/:id/reject
router.put('/store-requisitions/:id/reject', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { comments } = req.body;
    const rows = await query(
      `UPDATE store_requisitions SET status = 'rejected', approved_by = $1, approved_at = NOW(),
              notes = COALESCE(notes || E'\\n', '') || COALESCE($2, ''), updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND status = 'submitted' RETURNING *`,
      [req.user.id, comments ? `Rejected: ${comments}` : null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Requisition not found or not pending approval' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Reject store requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /store-requisitions/:id/issue — move approved quantities out of the store to the department
router.post('/store-requisitions/:id/issue', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { items = [] } = req.body; // [{ requisition_item_id, quantity }]
    if (!items.length) return res.status(400).json({ success: false, message: 'At least one item to issue is required' });

    const reqRows = await query(
      `SELECT * FROM store_requisitions WHERE id = $1 AND tenant_id = $2 AND status IN ('approved','partially_issued')`,
      [req.params.id, tid]
    );
    if (!reqRows.length) return res.status(404).json({ success: false, message: 'Requisition not found or not approved' });
    const requisition = reqRows[0];

    const issued = [];
    for (const line of items) {
      const qty = parseFloat(line.quantity);
      if (!line.requisition_item_id || !qty || qty <= 0) continue;

      const lineRows = await query(
        `SELECT * FROM store_requisition_items WHERE id = $1 AND requisition_id = $2 AND tenant_id = $3`,
        [line.requisition_item_id, req.params.id, tid]
      );
      if (!lineRows.length) continue;
      const reqItem = lineRows[0];
      const remaining = parseFloat(reqItem.quantity_requested) - parseFloat(reqItem.quantity_issued);
      if (qty > remaining) {
        return res.status(400).json({ success: false, message: `Cannot issue more than the remaining requested quantity for one of the items` });
      }

      const itemRows = await query(`SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2`, [reqItem.item_id, tid]);
      if (!itemRows.length) continue;
      const item = itemRows[0];
      const previousQty = parseFloat(item.quantity);
      const newQty = previousQty - qty;
      if (newQty < 0) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.name}` });
      }

      await query(`UPDATE inventory_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [newQty, item.id, tid]);
      const txRows = await query(
        `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, notes, created_by)
         VALUES ($1,$2,'transfer',$3,$4,$5,$6) RETURNING *`,
        [tid, item.id, qty, requisition.requisition_number, `Issued to ${requisition.department}`, req.user.id]
      );
      await query(
        `UPDATE store_requisition_items SET quantity_issued = quantity_issued + $1 WHERE id = $2`,
        [qty, reqItem.id]
      );

      const issueNumber = await nextInventorySeq(tid, 'store_issues', 'issue_number', 'SI');
      const issueRows = await query(
        `INSERT INTO store_issues
           (tenant_id, issue_number, requisition_id, item_id, quantity, to_department, issued_by, inventory_transaction_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tid, issueNumber, req.params.id, item.id, qty, requisition.department, req.user.id, txRows[0].id]
      );
      issued.push(issueRows[0]);

      await notifyLowStockIfCrossed(tid, item, previousQty, newQty);
    }

    const totals = await query(
      `SELECT COUNT(*) FILTER (WHERE quantity_issued < quantity_requested) AS remaining
       FROM store_requisition_items WHERE requisition_id = $1`,
      [req.params.id]
    );
    const newStatus = Number(totals[0].remaining) === 0 ? 'issued' : 'partially_issued';
    await query(`UPDATE store_requisitions SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [newStatus, req.params.id, tid]);

    res.status(201).json({ success: true, data: issued });
  } catch (err) {
    logger.error('Issue store requisition error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── STORE ISSUES (stock movement out of the store, with receipt signature) ───

// GET /store-issues
router.get('/store-issues', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, department, pending_for_me } = req.query;
    let sql = `SELECT s.*, ii.name AS item_name, ii.unit,
                      CONCAT(iu.first_name,' ',iu.last_name) AS issued_by_name,
                      CONCAT(ru.first_name,' ',ru.last_name) AS received_by_name,
                      r.requisition_number, r.requested_by
               FROM store_issues s
               JOIN inventory_items ii ON ii.id = s.item_id
               LEFT JOIN users iu ON iu.id = s.issued_by
               LEFT JOIN users ru ON ru.id = s.received_by
               LEFT JOIN store_requisitions r ON r.id = s.requisition_id
               WHERE s.tenant_id = $1`;
    const params = [tid];
    if (status) { params.push(status); sql += ` AND s.status = $${params.length}`; }
    if (department) { params.push(department); sql += ` AND s.to_department = $${params.length}`; }
    if (pending_for_me === 'true') {
      sql += ` AND s.status = 'pending_receipt'`;
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        params.push(req.user.id);
        sql += ` AND r.requested_by = $${params.length}`;
      }
    }
    sql += ' ORDER BY s.issued_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get store issues error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /store-issues — ad-hoc issue direct to a department, without a prior requisition
router.post('/store-issues', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { item_id, quantity, to_department, notes } = req.body;
    const qty = parseFloat(quantity);
    if (!item_id || !qty || qty <= 0 || !to_department) {
      return res.status(400).json({ success: false, message: 'item_id, quantity and to_department are required' });
    }

    const itemRows = await query(`SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2`, [item_id, tid]);
    if (!itemRows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    const item = itemRows[0];
    const previousQty = parseFloat(item.quantity);
    const newQty = previousQty - qty;
    if (newQty < 0) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    await query(`UPDATE inventory_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [newQty, item_id, tid]);
    const txRows = await query(
      `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, notes, created_by)
       VALUES ($1,$2,'transfer',$3,$4,$5,$6) RETURNING *`,
      [tid, item_id, qty, `Direct issue to ${to_department}`, notes || null, req.user.id]
    );
    const issueNumber = await nextInventorySeq(tid, 'store_issues', 'issue_number', 'SI');
    const rows = await query(
      `INSERT INTO store_issues (tenant_id, issue_number, item_id, quantity, to_department, issued_by, notes, inventory_transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tid, issueNumber, item_id, qty, to_department, req.user.id, notes || null, txRows[0].id]
    );

    await notifyLowStockIfCrossed(tid, item, previousQty, newQty);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create store issue error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /store-issues/:id/confirm-receipt — the receiving department signs for delivery
router.put('/store-issues/:id/confirm-receipt', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { condition_on_receipt, notes } = req.body;

    const rows = await query(
      `SELECT s.*, r.requested_by FROM store_issues s
       LEFT JOIN store_requisitions r ON r.id = s.requisition_id
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.status = 'pending_receipt'`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Pending delivery not found' });
    const issueRow = rows[0];

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isRequester = issueRow.requested_by && issueRow.requested_by === req.user.id;
    if (!isAdmin && !isRequester) {
      return res.status(403).json({ success: false, message: 'Only the original requester or an admin can confirm this delivery' });
    }

    const condition = ['good', 'damaged', 'short'].includes(condition_on_receipt) ? condition_on_receipt : 'good';
    const newStatus = condition === 'good' ? 'received' : 'disputed';
    const updated = await query(
      `UPDATE store_issues SET received_by = $1, received_at = NOW(), condition_on_receipt = $2, status = $3,
              notes = COALESCE(notes || E'\\n', '') || COALESCE($4, '')
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [req.user.id, condition, newStatus, notes || null, req.params.id, tid]
    );
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    logger.error('Confirm receipt error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
