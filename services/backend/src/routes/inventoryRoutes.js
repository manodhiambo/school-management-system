import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// Helper: admin only guard
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
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
    const rows = await query(
      `SELECT ii.*,
              ic.name AS category_name,
              (ii.reorder_level - ii.quantity + 1) AS suggested_reorder_qty
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
       WHERE ii.tenant_id = $1 AND ii.quantity <= ii.reorder_level
       ORDER BY (ii.reorder_level - ii.quantity) DESC`,
      [tid]
    );
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
    const byCategory = await query(
      `SELECT ic.name AS category_name,
              COUNT(ii.id) AS item_count,
              SUM(ii.quantity) AS total_quantity,
              SUM(ii.quantity * ii.unit_cost) AS total_value
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
       WHERE ii.tenant_id = $1
       GROUP BY ic.id, ic.name
       ORDER BY total_value DESC`,
      [tid]
    );
    const totalRows = await query(
      `SELECT SUM(quantity * unit_cost) AS grand_total, COUNT(*) AS total_items
       FROM inventory_items WHERE tenant_id = $1`,
      [tid]
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

export default router;
