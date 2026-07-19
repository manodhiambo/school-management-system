import express from 'express';
import pool, { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { generateQrDataUrl, generateBarcodeValue } from '../utils/codeGenerator.js';
import { initiateSTKPush } from '../services/mpesaService.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('school_store'));

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// Tenant-scoped sequential number, mirrors financeController.js's generateNumber
// (correctly tenant-scoped, unlike procurement's count-based nextSeq).
async function generateSaleNumber(client, tenantId) {
  const { rows } = await client.query(
    `SELECT sale_number FROM store_sales WHERE tenant_id = $1 AND sale_number LIKE 'SALE-%'
     ORDER BY sale_number DESC LIMIT 1`,
    [tenantId]
  );
  if (!rows.length) return 'SALE-00001';
  const next = parseInt(rows[0].sale_number.replace('SALE-', ''), 10) + 1;
  return `SALE-${String(next).padStart(5, '0')}`;
}

// ─── PRODUCTS (reuses inventory_items/inventory_categories, flagged is_store_item) ─

router.get('/products', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, search } = req.query;
    let sql = `SELECT i.*, c.name AS category_name, (i.quantity <= i.reorder_level) AS is_low_stock
               FROM inventory_items i
               LEFT JOIN inventory_categories c ON c.id = i.category_id
               WHERE i.tenant_id = $1 AND i.is_store_item = TRUE`;
    const params = [tid];
    if (category_id) { sql += ` AND i.category_id = $${params.length + 1}`; params.push(category_id); }
    if (search) { sql += ` AND (i.name ILIKE $${params.length + 1} OR i.barcode = $${params.length + 1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY i.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get store products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/products', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, name, sku, unit, quantity, reorder_level, unit_cost, selling_price } = req.body;
    if (!name || !unit || selling_price == null) {
      return res.status(400).json({ success: false, message: 'name, unit and selling_price are required' });
    }
    const barcode = generateBarcodeValue('SKU');
    const rows = await query(
      `INSERT INTO inventory_items
         (tenant_id, category_id, name, sku, unit, quantity, reorder_level, unit_cost, selling_price, barcode, qr_code, is_store_item)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE) RETURNING *`,
      [tid, category_id || null, name, sku || null, unit, quantity || 0, reorder_level || 0,
       unit_cost || 0, selling_price, barcode, barcode]
    );
    const qrDataUrl = await generateQrDataUrl(barcode);
    res.status(201).json({ success: true, data: { ...rows[0], qr_data_url: qrDataUrl } });
  } catch (err) {
    logger.error('Create store product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/products/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { category_id, name, sku, unit, reorder_level, unit_cost, selling_price } = req.body;
    const rows = await query(
      `UPDATE inventory_items SET
         category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         sku = COALESCE($3, sku),
         unit = COALESCE($4, unit),
         reorder_level = COALESCE($5, reorder_level),
         unit_cost = COALESCE($6, unit_cost),
         selling_price = COALESCE($7, selling_price),
         updated_at = NOW()
       WHERE id = $8 AND tenant_id = $9 AND is_store_item = TRUE RETURNING *`,
      [category_id, name, sku, unit, reorder_level, unit_cost, selling_price, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update store product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CHECKOUT ───────────────────────────────────────────────────────────────

// POST /sales — cart checkout
router.post('/sales', async (req, res) => {
  const tid = req.user.tenant_id;
  const { items = [], payment_method, student_id, customer_name, discount_amount, amount_tendered, phone } = req.body;
  if (!items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
  if (!['cash', 'mpesa', 'card', 'wallet'].includes(payment_method)) {
    return res.status(400).json({ success: false, message: 'Invalid payment_method' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load and lock product rows, validate stock
    const lines = [];
    let subtotal = 0;
    for (const cartItem of items) {
      const { rows } = await client.query(
        `SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2 AND is_store_item = TRUE FOR UPDATE`,
        [cartItem.item_id, tid]
      );
      if (!rows.length) throw new Error(`Product not found: ${cartItem.item_id}`);
      const product = rows[0];
      const qty = Number(cartItem.quantity);
      if (qty <= 0) throw new Error(`Invalid quantity for ${product.name}`);
      if (Number(product.quantity) < qty) throw new Error(`Insufficient stock for ${product.name} (available: ${product.quantity})`);
      const unitPrice = Number(product.selling_price || 0);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      lines.push({ product, qty, unitPrice, lineTotal });
    }

    const discount = Number(discount_amount) || 0;
    const total = Math.max(subtotal - discount, 0);

    // Wallet: verify balance up front
    if (payment_method === 'wallet') {
      if (!student_id) throw new Error('student_id is required for wallet payment');
      const acct = await client.query(
        `SELECT balance FROM canteen_accounts WHERE student_id = $1 AND tenant_id = $2`,
        [student_id, tid]
      );
      const balance = acct.rows.length ? Number(acct.rows[0].balance) : 0;
      if (balance < total) throw new Error(`Insufficient wallet balance. Available: ${balance}, Required: ${total}`);
    }

    const saleNumber = await generateSaleNumber(client, tid);
    const status = payment_method === 'mpesa' ? 'pending_mpesa' : 'completed';
    const saleRows = await client.query(
      `INSERT INTO store_sales
         (tenant_id, sale_number, student_id, customer_name, payment_method, subtotal, discount_amount,
          total_amount, amount_tendered, change_due, status, cashier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tid, saleNumber, student_id || null, customer_name || null, payment_method, subtotal, discount,
       total, amount_tendered || null, amount_tendered ? Math.max(Number(amount_tendered) - total, 0) : null,
       status, req.user.id]
    );
    const sale = saleRows.rows[0];

    for (const line of lines) {
      await client.query(
        `INSERT INTO store_sale_items (tenant_id, sale_id, item_id, item_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [tid, sale.id, line.product.id, line.product.name, line.qty, line.unitPrice, line.lineTotal]
      );
      // Only move stock immediately for methods that settle now; an mpesa sale
      // reserves nothing here and stock is deducted on confirm-mpesa instead.
      if (status === 'completed') {
        await client.query(
          `UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2 AND tenant_id = $3`,
          [line.qty, line.product.id, tid]
        );
        await client.query(
          `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, created_by)
           VALUES ($1,$2,'stock_out',$3,$4,$5)`,
          [tid, line.product.id, line.qty, sale.sale_number, req.user.id]
        );
      }
    }

    let mpesaInit = null;
    if (payment_method === 'wallet' && status === 'completed') {
      await client.query(
        `UPDATE canteen_accounts SET balance = balance - $1, updated_at = NOW() WHERE student_id = $2 AND tenant_id = $3`,
        [total, student_id, tid]
      );
      await client.query(
        `INSERT INTO canteen_transactions (tenant_id, student_id, amount, type, store_sale_id, created_by)
         VALUES ($1,$2,$3,'debit',$4,$5)`,
        [tid, student_id, total, sale.id, req.user.id]
      );
    }

    if (payment_method === 'mpesa') {
      if (!phone) throw new Error('phone is required for M-Pesa payment');
      mpesaInit = await initiateSTKPush(phone, total, sale.sale_number, `Store-${sale.sale_number}`);
      if (mpesaInit?.CheckoutRequestID) {
        await client.query(
          `UPDATE store_sales SET mpesa_checkout_request_id = $1 WHERE id = $2`,
          [mpesaInit.CheckoutRequestID, sale.id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { ...sale, mpesa: mpesaInit } });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Store checkout error:', err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// PUT /sales/:id/confirm-mpesa — cashier confirms the customer completed the STK push
router.put('/sales/:id/confirm-mpesa', adminOnly, async (req, res) => {
  const tid = req.user.tenant_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saleRows = await client.query(
      `SELECT * FROM store_sales WHERE id = $1 AND tenant_id = $2 AND status = 'pending_mpesa' FOR UPDATE`,
      [req.params.id, tid]
    );
    if (!saleRows.rows.length) throw new Error('Pending M-Pesa sale not found');
    const sale = saleRows.rows[0];

    const itemRows = await client.query(`SELECT * FROM store_sale_items WHERE sale_id = $1`, [sale.id]);
    for (const item of itemRows.rows) {
      const stockRows = await client.query(
        `SELECT quantity FROM inventory_items WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [item.item_id, tid]
      );
      if (!stockRows.rows.length || Number(stockRows.rows[0].quantity) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for ${item.item_name} — cannot confirm`);
      }
      await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2 AND tenant_id = $3`,
        [item.quantity, item.item_id, tid]);
      await client.query(
        `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, created_by)
         VALUES ($1,$2,'stock_out',$3,$4,$5)`,
        [tid, item.item_id, item.quantity, sale.sale_number, req.user.id]
      );
    }

    const rows = await client.query(
      `UPDATE store_sales SET status = 'completed', mpesa_reference = $1 WHERE id = $2 RETURNING *`,
      [req.body.mpesa_reference || null, sale.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: rows.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Confirm M-Pesa sale error:', err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ─── SALES HISTORY & REFUNDS ────────────────────────────────────────────────

router.get('/sales', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, student_id } = req.query;
    let sql = `SELECT s.*, st.first_name || ' ' || st.last_name AS student_name, st.admission_number,
                      u.first_name || ' ' || u.last_name AS cashier_name
               FROM store_sales s
               LEFT JOIN students st ON st.id = s.student_id
               LEFT JOIN users u ON u.id = s.cashier_id
               WHERE s.tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND s.status = $${params.length + 1}`; params.push(status); }
    if (student_id) { sql += ` AND s.student_id = $${params.length + 1}`; params.push(student_id); }
    sql += ' ORDER BY s.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get store sales error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sales/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const saleRows = await query(`SELECT * FROM store_sales WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!saleRows.length) return res.status(404).json({ success: false, message: 'Sale not found' });
    const items = await query(`SELECT * FROM store_sale_items WHERE sale_id = $1`, [req.params.id]);
    res.json({ success: true, data: { ...saleRows[0], items } });
  } catch (err) {
    logger.error('Get store sale error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /sales/:id/refund — refund specific line-item quantities
router.post('/sales/:id/refund', adminOnly, async (req, res) => {
  const tid = req.user.tenant_id;
  const { sale_item_id, quantity, reason } = req.body;
  if (!sale_item_id || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ success: false, message: 'sale_item_id and a positive quantity are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saleRows = await client.query(
      `SELECT * FROM store_sales WHERE id = $1 AND tenant_id = $2 AND status IN ('completed','partial_refund') FOR UPDATE`,
      [req.params.id, tid]
    );
    if (!saleRows.rows.length) throw new Error('Refundable sale not found');
    const sale = saleRows.rows[0];

    const itemRows = await client.query(
      `SELECT * FROM store_sale_items WHERE id = $1 AND sale_id = $2 FOR UPDATE`,
      [sale_item_id, sale.id]
    );
    if (!itemRows.rows.length) throw new Error('Sale item not found');
    const item = itemRows.rows[0];
    const remaining = Number(item.quantity) - Number(item.refunded_quantity);
    if (Number(quantity) > remaining) throw new Error(`Cannot refund more than remaining quantity (${remaining})`);

    const refundAmount = Number(quantity) * Number(item.unit_price);

    await client.query(`UPDATE store_sale_items SET refunded_quantity = refunded_quantity + $1 WHERE id = $2`,
      [quantity, item.id]);
    await client.query(
      `INSERT INTO store_refunds (tenant_id, sale_id, sale_item_id, quantity, amount, reason, refunded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tid, sale.id, item.id, quantity, refundAmount, reason || null, req.user.id]
    );

    // Restock
    await client.query(`UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2 AND tenant_id = $3`,
      [quantity, item.item_id, tid]);
    await client.query(
      `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, created_by)
       VALUES ($1,$2,'stock_in',$3,$4,$5)`,
      [tid, item.item_id, quantity, `Refund ${sale.sale_number}`, req.user.id]
    );

    // Reverse wallet debit if that's how it was paid
    if (sale.payment_method === 'wallet' && sale.student_id) {
      await client.query(
        `UPDATE canteen_accounts SET balance = balance + $1, updated_at = NOW() WHERE student_id = $2 AND tenant_id = $3`,
        [refundAmount, sale.student_id, tid]
      );
      await client.query(
        `INSERT INTO canteen_transactions (tenant_id, student_id, amount, type, store_sale_id, created_by)
         VALUES ($1,$2,$3,'refund',$4,$5)`,
        [tid, sale.student_id, refundAmount, sale.id, req.user.id]
      );
    }

    // Determine new sale status: full or partial refund
    const allItems = await client.query(`SELECT quantity, refunded_quantity FROM store_sale_items WHERE sale_id = $1`, [sale.id]);
    const fullyRefunded = allItems.rows.every(r => Number(r.refunded_quantity) >= Number(r.quantity));
    await client.query(`UPDATE store_sales SET status = $1 WHERE id = $2`,
      [fullyRefunded ? 'refunded' : 'partial_refund', sale.id]);

    await client.query('COMMIT');
    res.json({ success: true, data: { refund_amount: refundAmount } });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Store refund error:', err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ─── REPORTS ────────────────────────────────────────────────────────────────

router.get('/reports/daily', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const byMethod = await query(
      `SELECT payment_method, COUNT(*) AS sale_count, SUM(total_amount) AS total_amount
       FROM store_sales WHERE tenant_id = $1 AND status IN ('completed','partial_refund') AND DATE(created_at) = $2
       GROUP BY payment_method ORDER BY payment_method`,
      [tid, date]
    );
    const totals = await query(
      `SELECT COUNT(*) AS total_sales, SUM(total_amount) AS total_revenue
       FROM store_sales WHERE tenant_id = $1 AND status IN ('completed','partial_refund') AND DATE(created_at) = $2`,
      [tid, date]
    );
    res.json({ success: true, data: { date, by_payment_method: byMethod, totals: totals[0] } });
  } catch (err) {
    logger.error('Get store daily report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/products', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT si.item_id, si.item_name,
              SUM(si.quantity) AS total_sold,
              SUM(si.line_total) AS total_revenue
       FROM store_sale_items si
       JOIN store_sales s ON s.id = si.sale_id
       WHERE si.tenant_id = $1 AND s.status IN ('completed','partial_refund')
       GROUP BY si.item_id, si.item_name
       ORDER BY total_sold DESC`,
      [tid]
    );
    res.json({ success: true, data: { fast_moving: rows.slice(0, 10), slow_moving: [...rows].reverse().slice(0, 10), all: rows } });
  } catch (err) {
    logger.error('Get store products report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/profit', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT si.item_name,
              SUM(si.quantity) AS units_sold,
              SUM(si.line_total) AS revenue,
              SUM(si.quantity * COALESCE(i.unit_cost, 0)) AS cost,
              SUM(si.line_total) - SUM(si.quantity * COALESCE(i.unit_cost, 0)) AS profit
       FROM store_sale_items si
       JOIN store_sales s ON s.id = si.sale_id
       JOIN inventory_items i ON i.id = si.item_id
       WHERE si.tenant_id = $1 AND s.status IN ('completed','partial_refund')
       GROUP BY si.item_name
       ORDER BY profit DESC`,
      [tid]
    );
    const grandTotal = rows.reduce((sum, r) => sum + (parseFloat(r.profit) || 0), 0);
    res.json({ success: true, data: { items: rows, grand_total_profit: grandTotal } });
  } catch (err) {
    logger.error('Get store profit report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/valuation', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT SUM(quantity) AS total_units, SUM(quantity * unit_cost) AS cost_value, SUM(quantity * selling_price) AS retail_value
       FROM inventory_items WHERE tenant_id = $1 AND is_store_item = TRUE`,
      [tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get store valuation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
