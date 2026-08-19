import express from 'express';
import { authenticate, authorize, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import pool from '../config/database.js';

const router = express.Router();

// Auto-wrap all route handlers so async errors go to Express error handler
// instead of crashing Node.js 20 as unhandled rejections
['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
  const orig = router[method].bind(router);
  router[method] = (path, ...fns) =>
    orig(path, ...fns.map(fn => (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch(next)
    ));
});

const PROC_ROLES = ['admin', 'finance_officer'];

router.use(authenticate);
router.use(requireModule('finance'));
router.use(tenantContext);
router.use(requireActiveTenant);
router.use(authorize(PROC_ROLES));

// ── Helpers ──────────────────────────────────────────────────────────────────
const tid = (req) => req.user.tenant_id;
const uid = (req) => req.user.id;

function padNum(n, prefix, len = 6) {
  return `${prefix}-${String(n).padStart(len, '0')}`;
}

async function nextSeq(client, tenant, table, column, prefix) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = $1`, [tenant]
  );
  return padNum(Number(rows[0].cnt) + 1, prefix);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const t = tid(req);
    const [prRow, poRow, grnRow, invRow, payRow, budRow] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) total,
        COUNT(*) FILTER (WHERE status IN ('submitted','pending_approval')) pending_approvals,
        COUNT(*) FILTER (WHERE status = 'approved') approved
        FROM proc_purchase_requisitions WHERE tenant_id=$1`, [t]),
      pool.query(`SELECT
        COUNT(*) total,
        COUNT(*) FILTER (WHERE status='approved') active,
        COUNT(*) FILTER (WHERE status IN ('partially_delivered','completed')) delivered,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled')) pending_delivery,
        COALESCE(SUM(total_amount),0) total_value
        FROM proc_purchase_orders WHERE tenant_id=$1`, [t]),
      pool.query(`SELECT COUNT(*) total FROM proc_grn WHERE tenant_id=$1`, [t]),
      pool.query(`SELECT
        COUNT(*) total,
        COALESCE(SUM(total_amount),0) total_amount,
        COALESCE(SUM(paid_amount),0) paid_amount,
        COALESCE(SUM(balance),0) balance
        FROM proc_invoices WHERE tenant_id=$1`, [t]),
      pool.query(`SELECT
        COUNT(*) total,
        COALESCE(SUM(amount),0) total_paid,
        COUNT(*) FILTER (WHERE status='pending') pending
        FROM proc_payments WHERE tenant_id=$1`, [t]),
      pool.query(`SELECT department,total_budget,spent,available FROM proc_budgets WHERE tenant_id=$1 AND status='active'`, [t]),
    ]);

    const topSuppliers = await pool.query(
      `SELECT s.supplier_name, COUNT(po.id) po_count, COALESCE(SUM(po.total_amount),0) total_value
       FROM proc_purchase_orders po
       JOIN proc_suppliers s ON s.id = po.supplier_id
       WHERE po.tenant_id=$1
       GROUP BY s.id, s.supplier_name ORDER BY total_value DESC LIMIT 5`, [t]
    );

    res.json({
      requisitions: prRow.rows[0],
      purchase_orders: poRow.rows[0],
      grn: grnRow.rows[0],
      invoices: invRow.rows[0],
      payments: payRow.rows[0],
      budgets: budRow.rows,
      top_suppliers: topSuppliers.rows,
    });
  } catch (err) {
    console.error('procurement dashboard', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Suppliers ─────────────────────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
  const { status, category, search } = req.query;
  let q = `SELECT * FROM proc_suppliers WHERE tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND status=$${params.length}`; }
  if (category) { params.push(category); q += ` AND category=$${params.length}`; }
  if (search) { params.push(`%${search}%`); q += ` AND (supplier_name ILIKE $${params.length} OR email ILIKE $${params.length} OR kra_pin ILIKE $${params.length})`; }
  q += ' ORDER BY supplier_name';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/suppliers', async (req, res) => {
  const { supplier_name, business_registration, kra_pin, email, phone, address,
    category, bank_name, bank_account, bank_branch, payment_terms, notes } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const code = await nextSeq(client, t, 'proc_suppliers', 'supplier_code', 'SUP');
    const { rows } = await client.query(
      `INSERT INTO proc_suppliers (tenant_id,supplier_code,supplier_name,business_registration,kra_pin,
        email,phone,address,category,bank_name,bank_account,bank_branch,payment_terms,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [t, code, supplier_name, business_registration, kra_pin, email, phone, address,
        category, bank_name, bank_account, bank_branch, payment_terms, notes, uid(req)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/suppliers/:id', async (req, res) => {
  const fields = ['supplier_name','business_registration','kra_pin','email','phone','address',
    'category','bank_name','bank_account','bank_branch','payment_terms','status','rating','notes'];
  const updates = []; const params = [req.params.id, tid(req)];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); }
  });
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(new Date());
  const { rows } = await pool.query(
    `UPDATE proc_suppliers SET ${updates.join(',')},updated_at=$${params.length} WHERE id=$1 AND tenant_id=$2 RETURNING *`, params
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/suppliers/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_suppliers WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── Prequalification ──────────────────────────────────────────────────────────
router.get('/suppliers/:sid/prequalification', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, CONCAT(u.first_name,' ',u.last_name) approver_name FROM proc_supplier_prequalification p
     LEFT JOIN users u ON u.id=p.approved_by
     WHERE p.tenant_id=$1 AND p.supplier_id=$2 ORDER BY p.application_date DESC`,
    [tid(req), req.params.sid]
  );
  res.json(rows);
});

router.post('/suppliers/:sid/prequalification', async (req, res) => {
  const { application_date, category, evaluation_score, qualification_criteria, expiry_date, notes } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO proc_supplier_prequalification (tenant_id,supplier_id,application_date,category,evaluation_score,qualification_criteria,expiry_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tid(req), req.params.sid, application_date, category, evaluation_score, qualification_criteria, expiry_date, notes]
  );
  res.status(201).json(rows[0]);
});

// ── Purchase Requisitions ─────────────────────────────────────────────────────
router.get('/requisitions', async (req, res) => {
  const { status, department } = req.query;
  let q = `SELECT r.*, CONCAT(u.first_name,' ',u.last_name) requester_name FROM proc_purchase_requisitions r
           LEFT JOIN users u ON u.id=r.requested_by WHERE r.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND r.status=$${params.length}`; }
  if (department) { params.push(department); q += ` AND r.department=$${params.length}`; }
  q += ' ORDER BY r.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.get('/requisitions/:id', async (req, res) => {
  const [pr, items, steps] = await Promise.all([
    pool.query(`SELECT r.*, CONCAT(u.first_name,' ',u.last_name) requester_name FROM proc_purchase_requisitions r
                LEFT JOIN users u ON u.id=r.requested_by WHERE r.id=$1 AND r.tenant_id=$2`,
               [req.params.id, tid(req)]),
    pool.query(`SELECT * FROM proc_pr_items WHERE pr_id=$1`, [req.params.id]),
    pool.query(`SELECT s.*, CONCAT(u.first_name,' ',u.last_name) approver_name FROM proc_approval_steps s
                LEFT JOIN users u ON u.id=s.approver_id
                WHERE s.reference_type='pr' AND s.reference_id=$1 ORDER BY s.step_number`,
               [req.params.id]),
  ]);
  if (!pr.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...pr.rows[0], items: items.rows, approval_trail: steps.rows });
});

router.post('/requisitions', async (req, res) => {
  const { department, required_date, urgency, reason, notes, items = [] } = req.body;
  const t = tid(req); const u = uid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prNum = await nextSeq(client, t, 'proc_purchase_requisitions', 'pr_number', 'PR');
    const totalEst = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.estimated_unit_cost || 0)), 0);
    const { rows } = await client.query(
      `INSERT INTO proc_purchase_requisitions (tenant_id,pr_number,department,requested_by,required_date,urgency,reason,notes,status,total_estimated_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9) RETURNING *`,
      [t, prNum, department, u, required_date, urgency, reason, notes, totalEst]
    );
    const prId = rows[0].id;
    for (const item of items) {
      const total = Number(item.quantity) * Number(item.estimated_unit_cost || 0);
      await client.query(
        `INSERT INTO proc_pr_items (tenant_id,pr_id,item_name,quantity,unit,estimated_unit_cost,estimated_total,specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t, prId, item.item_name, item.quantity, item.unit, item.estimated_unit_cost || 0, total, item.specifications]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/requisitions/:id/submit', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_purchase_requisitions SET status='submitted',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.put('/requisitions/:id/approve', async (req, res) => {
  const { comments } = req.body;
  const t = tid(req);
  const { rows } = await pool.query(
    `UPDATE proc_purchase_requisitions SET status='approved',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, t]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await pool.query(
    `INSERT INTO proc_approval_steps (tenant_id,reference_type,reference_id,step_number,approver_id,action,comments,actioned_at)
     VALUES ($1,'pr',$2,(SELECT COALESCE(MAX(step_number),0)+1 FROM proc_approval_steps WHERE reference_id=$2),$3,'approved',$4,NOW())`,
    [t, req.params.id, uid(req), comments]
  );
  res.json(rows[0]);
});

router.put('/requisitions/:id/reject', async (req, res) => {
  const { comments } = req.body;
  const t = tid(req);
  const { rows } = await pool.query(
    `UPDATE proc_purchase_requisitions SET status='rejected',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, t]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await pool.query(
    `INSERT INTO proc_approval_steps (tenant_id,reference_type,reference_id,step_number,approver_id,action,comments,actioned_at)
     VALUES ($1,'pr',$2,(SELECT COALESCE(MAX(step_number),0)+1 FROM proc_approval_steps WHERE reference_id=$2),$3,'rejected',$4,NOW())`,
    [t, req.params.id, uid(req), comments]
  );
  res.json(rows[0]);
});

router.put('/requisitions/:id', async (req, res) => {
  const { department, required_date, urgency, reason, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE proc_purchase_requisitions SET department=$3,required_date=$4,urgency=$5,reason=$6,notes=$7,updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND status='draft' RETURNING *`,
    [req.params.id, tid(req), department, required_date, urgency, reason, notes]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found or not editable' });
});

router.delete('/requisitions/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_purchase_requisitions WHERE id=$1 AND tenant_id=$2 AND status='draft'`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── RFQs ──────────────────────────────────────────────────────────────────────
router.get('/rfqs', async (req, res) => {
  const { status } = req.query;
  let q = `SELECT r.*, COUNT(DISTINCT rs.supplier_id) supplier_count, COUNT(DISTINCT q.id) quote_count
           FROM proc_rfqs r LEFT JOIN proc_rfq_suppliers rs ON rs.rfq_id=r.id
           LEFT JOIN proc_quotations q ON q.rfq_id=r.id WHERE r.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND r.status=$${params.length}`; }
  q += ' GROUP BY r.id ORDER BY r.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.get('/rfqs/:id', async (req, res) => {
  const [rfq, suppliers, quotes] = await Promise.all([
    pool.query(`SELECT * FROM proc_rfqs WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]),
    pool.query(`SELECT rs.*, s.supplier_name, s.email FROM proc_rfq_suppliers rs JOIN proc_suppliers s ON s.id=rs.supplier_id WHERE rs.rfq_id=$1`, [req.params.id]),
    pool.query(`SELECT q.*, s.supplier_name FROM proc_quotations q JOIN proc_suppliers s ON s.id=q.supplier_id WHERE q.rfq_id=$1 ORDER BY q.overall_score DESC`, [req.params.id]),
  ]);
  if (!rfq.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...rfq.rows[0], suppliers: suppliers.rows, quotations: quotes.rows });
});

router.post('/rfqs', async (req, res) => {
  const { title, description, deadline, pr_id, evaluation_criteria, supplier_ids = [] } = req.body;
  const t = tid(req);
  if (pr_id) {
    const { rows: prRows } = await pool.query(`SELECT status FROM proc_purchase_requisitions WHERE id=$1 AND tenant_id=$2`, [pr_id, t]);
    if (!prRows.length) return res.status(404).json({ error: 'Purchase requisition not found' });
    if (!['approved', 'converted_to_rfq'].includes(prRows[0].status)) {
      return res.status(400).json({ error: 'Purchase requisition must be approved before it can be sent out for quotes' });
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rfqNum = await nextSeq(client, t, 'proc_rfqs', 'rfq_number', 'RFQ');
    const { rows } = await client.query(
      `INSERT INTO proc_rfqs (tenant_id,rfq_number,title,description,deadline,pr_id,evaluation_criteria,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [t, rfqNum, title, description, deadline, pr_id || null, evaluation_criteria, uid(req)]
    );
    const rfqId = rows[0].id;
    for (const sid of supplier_ids) {
      await client.query(`INSERT INTO proc_rfq_suppliers (tenant_id,rfq_id,supplier_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [t, rfqId, sid]);
    }
    if (pr_id) await client.query(`UPDATE proc_purchase_requisitions SET status='converted_to_rfq' WHERE id=$1 AND tenant_id=$2`, [pr_id, t]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/rfqs/:id/publish', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_rfqs SET status='published',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.put('/rfqs/:id/close', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_rfqs SET status='closed',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/rfqs/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_rfqs WHERE id=$1 AND tenant_id=$2 AND status='draft'`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── Quotations ────────────────────────────────────────────────────────────────
router.get('/quotations', async (req, res) => {
  const { rfq_id } = req.query;
  let q = `SELECT q.*, s.supplier_name, r.title rfq_title, r.rfq_number FROM proc_quotations q
           JOIN proc_suppliers s ON s.id=q.supplier_id JOIN proc_rfqs r ON r.id=q.rfq_id
           WHERE q.tenant_id=$1`;
  const params = [tid(req)];
  if (rfq_id) { params.push(rfq_id); q += ` AND q.rfq_id=$${params.length}`; }
  q += ' ORDER BY q.overall_score DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/quotations', async (req, res) => {
  const { rfq_id, supplier_id, quotation_number, submission_date, validity_date, total_amount,
    delivery_days, warranty_terms, payment_terms, quality_score, technical_score, financial_score, notes, items = [] } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const overall = ((Number(quality_score || 0) + Number(technical_score || 0) + Number(financial_score || 0)) / 3).toFixed(1);
    const { rows } = await client.query(
      `INSERT INTO proc_quotations (tenant_id,rfq_id,supplier_id,quotation_number,submission_date,validity_date,
        total_amount,delivery_days,warranty_terms,payment_terms,quality_score,technical_score,financial_score,overall_score,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [t, rfq_id, supplier_id, quotation_number, submission_date, validity_date, total_amount,
        delivery_days, warranty_terms, payment_terms, quality_score || 0, technical_score || 0,
        financial_score || 0, overall, notes]
    );
    const qId = rows[0].id;
    for (const item of items) {
      await client.query(
        `INSERT INTO proc_quotation_items (quotation_id,item_name,quantity,unit,unit_price,total_price,specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [qId, item.item_name, item.quantity, item.unit, item.unit_price, item.total_price, item.specifications]
      );
    }
    await client.query(`UPDATE proc_rfq_suppliers SET responded=TRUE WHERE rfq_id=$1 AND supplier_id=$2`, [rfq_id, supplier_id]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/quotations/:id/recommend', async (req, res) => {
  const t = tid(req);
  const { rows: target } = await pool.query(
    `SELECT rfq_id FROM proc_quotations WHERE id=$1 AND tenant_id=$2`, [req.params.id, t]
  );
  if (!target.length) return res.status(404).json({ error: 'Not found' });
  await pool.query(
    `UPDATE proc_quotations SET is_recommended=FALSE WHERE rfq_id=$1 AND tenant_id=$2`,
    [target[0].rfq_id, t]
  );
  const { rows } = await pool.query(
    `UPDATE proc_quotations SET is_recommended=TRUE,status='awarded' WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, t]
  );
  res.json(rows[0]);
});

// ── Purchase Orders ───────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  const { status } = req.query;
  let q = `SELECT o.*, s.supplier_name FROM proc_purchase_orders o
           JOIN proc_suppliers s ON s.id=o.supplier_id WHERE o.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND o.status=$${params.length}`; }
  q += ' ORDER BY o.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.get('/orders/:id', async (req, res) => {
  const [po, items] = await Promise.all([
    pool.query(`SELECT o.*, s.supplier_name, s.email supplier_email FROM proc_purchase_orders o
                JOIN proc_suppliers s ON s.id=o.supplier_id WHERE o.id=$1 AND o.tenant_id=$2`,
               [req.params.id, tid(req)]),
    pool.query(`SELECT * FROM proc_po_items WHERE po_id=$1`, [req.params.id]),
  ]);
  if (!po.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...po.rows[0], items: items.rows });
});

router.post('/orders', async (req, res) => {
  const { supplier_id, pr_id, rfq_id, quotation_id, delivery_date, payment_terms, delivery_terms,
    currency, notes, department, items = [] } = req.body;
  const t = tid(req);

  let resolvedDepartment = department || null;
  if (pr_id) {
    const { rows: prRows } = await pool.query(`SELECT status, department FROM proc_purchase_requisitions WHERE id=$1 AND tenant_id=$2`, [pr_id, t]);
    if (!prRows.length) return res.status(404).json({ error: 'Purchase requisition not found' });
    if (!['approved', 'converted_to_rfq', 'converted_to_po'].includes(prRows[0].status)) {
      return res.status(400).json({ error: 'Purchase requisition must be approved before a purchase order can be raised against it' });
    }
    resolvedDepartment = resolvedDepartment || prRows[0].department;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poNum = await nextSeq(client, t, 'proc_purchase_orders', 'po_number', 'PO');
    let subtotal = 0;
    const processedItems = items.map(i => {
      const total = Number(i.quantity) * Number(i.unit_price || 0);
      const vat = total * (Number(i.vat_rate || 0) / 100);
      subtotal += total;
      return { ...i, total_price: total + vat };
    });
    const vat = processedItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price || 0) * (Number(i.vat_rate || 0) / 100)), 0);
    const total = subtotal + vat;
    const { rows } = await client.query(
      `INSERT INTO proc_purchase_orders (tenant_id,po_number,supplier_id,pr_id,rfq_id,quotation_id,
        delivery_date,subtotal,vat_amount,total_amount,currency,payment_terms,delivery_terms,notes,department,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [t, poNum, supplier_id, pr_id || null, rfq_id || null, quotation_id || null,
        delivery_date, subtotal, vat, total, currency || 'KES', payment_terms, delivery_terms, notes, resolvedDepartment, uid(req)]
    );
    const poId = rows[0].id;
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO proc_po_items (tenant_id,po_id,item_name,quantity,unit,unit_price,vat_rate,total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t, poId, item.item_name, item.quantity, item.unit, item.unit_price || 0, item.vat_rate || 0, item.total_price]
      );
    }
    if (pr_id) await client.query(`UPDATE proc_purchase_requisitions SET status='converted_to_po' WHERE id=$1 AND tenant_id=$2`, [pr_id, t]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/orders/:id/approve', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_purchase_orders SET status='approved',approved_by=$3,approved_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 RETURNING *`, [req.params.id, tid(req), uid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.put('/orders/:id/send', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_purchase_orders SET status='sent',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='approved' RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found or not approved' });
});

router.put('/orders/:id/cancel', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_purchase_orders SET status='cancelled',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

// ── Contracts ─────────────────────────────────────────────────────────────────
router.get('/contracts', async (req, res) => {
  const { status } = req.query;
  let q = `SELECT c.*, s.supplier_name FROM proc_contracts c
           JOIN proc_suppliers s ON s.id=c.supplier_id WHERE c.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND c.status=$${params.length}`; }
  q += ' ORDER BY c.end_date ASC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/contracts', async (req, res) => {
  const { supplier_id, po_id, title, contract_type, start_date, end_date, contract_value, terms, notes } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const num = await nextSeq(client, t, 'proc_contracts', 'contract_number', 'CON');
    const { rows } = await client.query(
      `INSERT INTO proc_contracts (tenant_id,contract_number,supplier_id,po_id,title,contract_type,start_date,end_date,contract_value,terms,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [t, num, supplier_id, po_id || null, title, contract_type || 'supply', start_date, end_date, contract_value, terms, notes]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/contracts/:id', async (req, res) => {
  const { title, start_date, end_date, contract_value, status, performance_score, terms, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE proc_contracts SET title=$3,start_date=$4,end_date=$5,contract_value=$6,status=$7,
     performance_score=$8,terms=$9,notes=$10,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req), title, start_date, end_date, contract_value, status, performance_score || 0, terms, notes]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/contracts/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_contracts WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── GRN ──────────────────────────────────────────────────────────────────────
router.get('/grn', async (req, res) => {
  const { po_id } = req.query;
  let q = `SELECT g.*, s.supplier_name, o.po_number FROM proc_grn g
           JOIN proc_purchase_orders o ON o.id=g.po_id
           JOIN proc_suppliers s ON s.id=g.supplier_id WHERE g.tenant_id=$1`;
  const params = [tid(req)];
  if (po_id) { params.push(po_id); q += ` AND g.po_id=$${params.length}`; }
  q += ' ORDER BY g.delivery_date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.get('/grn/:id', async (req, res) => {
  const [grn, items] = await Promise.all([
    pool.query(`SELECT g.*, s.supplier_name, o.po_number FROM proc_grn g
                JOIN proc_purchase_orders o ON o.id=g.po_id
                JOIN proc_suppliers s ON s.id=g.supplier_id WHERE g.id=$1 AND g.tenant_id=$2`,
               [req.params.id, tid(req)]),
    pool.query(`SELECT * FROM proc_grn_items WHERE grn_id=$1`, [req.params.id]),
  ]);
  if (!grn.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...grn.rows[0], items: items.rows });
});

router.post('/grn', async (req, res) => {
  const { po_id, delivery_date, delivery_note_number, remarks, items = [] } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const num = await nextSeq(client, t, 'proc_grn', 'grn_number', 'GRN');
    const poRow = await client.query(`SELECT supplier_id, status FROM proc_purchase_orders WHERE id=$1 AND tenant_id=$2`, [po_id, t]);
    if (!poRow.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    if (!['approved', 'sent', 'partially_delivered'].includes(poRow.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Goods can only be received against an approved purchase order' });
    }
    const supplierId = poRow.rows[0].supplier_id;
    const { rows } = await client.query(
      `INSERT INTO proc_grn (tenant_id,grn_number,po_id,supplier_id,delivery_date,received_by,delivery_note_number,remarks,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'completed') RETURNING *`,
      [t, num, po_id, supplierId, delivery_date || new Date(), uid(req), delivery_note_number, remarks]
    );
    const grnId = rows[0].id;
    for (const item of items) {
      // Stock the good-condition received quantity into central inventory,
      // matching an existing item by name (case-insensitive) or creating one,
      // so goods received via procurement immediately show up in Inventory —
      // ready to be issued out to a department via Store Requisitions.
      let matchedItemId = null;
      const receivedQty = Number(item.received_qty || 0);
      if (receivedQty > 0 && (item.condition || 'good') === 'good') {
        const existing = await client.query(
          `SELECT id, quantity FROM inventory_items WHERE tenant_id=$1 AND LOWER(name)=LOWER($2)`,
          [t, item.item_name]
        );
        if (existing.rows.length) {
          matchedItemId = existing.rows[0].id;
          await client.query(
            `UPDATE inventory_items SET quantity = quantity + $1, updated_at = NOW() WHERE id=$2 AND tenant_id=$3`,
            [receivedQty, matchedItemId, t]
          );
        } else {
          const created = await client.query(
            `INSERT INTO inventory_items (tenant_id, name, unit, quantity, unit_cost, condition)
             VALUES ($1,$2,$3,$4,$5,'good') RETURNING id`,
            [t, item.item_name, item.unit || 'pieces', receivedQty, 0]
          );
          matchedItemId = created.rows[0].id;
        }
        await client.query(
          `INSERT INTO inventory_transactions (tenant_id, item_id, type, quantity, reference, notes, created_by)
           VALUES ($1,$2,'stock_in',$3,$4,$5,$6)`,
          [t, matchedItemId, receivedQty, num, `Received via GRN against PO`, uid(req)]
        );
      }

      await client.query(
        `INSERT INTO proc_grn_items (grn_id,po_item_id,item_name,ordered_qty,received_qty,rejected_qty,unit,condition,remarks,matched_inventory_item_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [grnId, item.po_item_id || null, item.item_name, item.ordered_qty || 0,
          item.received_qty, item.rejected_qty || 0, item.unit, item.condition || 'good', item.remarks, matchedItemId]
      );
      if (item.po_item_id) {
        await client.query(
          `UPDATE proc_po_items SET received_qty=received_qty+$1 WHERE id=$2 AND po_id=$3`,
          [item.received_qty, item.po_item_id, po_id]
        );
      }
    }
    const allReceived = await client.query(
      `SELECT COUNT(*) cnt FROM proc_po_items WHERE po_id=$1 AND received_qty < quantity`, [po_id]
    );
    const newStatus = Number(allReceived.rows[0].cnt) === 0 ? 'completed' : 'partially_delivered';
    await client.query(`UPDATE proc_purchase_orders SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, [newStatus, po_id, t]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// ── Invoices ─────────────────────────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
  const { status, supplier_id } = req.query;
  let q = `SELECT i.*, s.supplier_name, o.po_number FROM proc_invoices i
           JOIN proc_suppliers s ON s.id=i.supplier_id
           LEFT JOIN proc_purchase_orders o ON o.id=i.po_id WHERE i.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND i.status=$${params.length}`; }
  if (supplier_id) { params.push(supplier_id); q += ` AND i.supplier_id=$${params.length}`; }
  q += ' ORDER BY i.invoice_date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/invoices', async (req, res) => {
  const { invoice_number, supplier_id, po_id, grn_id, invoice_date, due_date,
    subtotal, vat_amount, total_amount, notes, items = [] } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hasPR = po_id ? 1 : 0;
    const hasGRN = grn_id ? 1 : 0;
    const threeWay = hasPR + hasGRN + 1 >= 3;
    const { rows } = await client.query(
      `INSERT INTO proc_invoices (tenant_id,invoice_number,supplier_id,po_id,grn_id,invoice_date,due_date,
        subtotal,vat_amount,total_amount,balance,three_way_match,match_status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13) RETURNING *`,
      [t, invoice_number, supplier_id, po_id || null, grn_id || null, invoice_date, due_date,
        subtotal || 0, vat_amount || 0, total_amount, threeWay, threeWay ? 'matched' : 'pending', notes]
    );
    const invId = rows[0].id;
    for (const item of items) {
      await client.query(
        `INSERT INTO proc_invoice_items (invoice_id,item_name,quantity,unit_price,total_price,vat_rate)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invId, item.item_name, item.quantity, item.unit_price, item.total_price, item.vat_rate || 0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/invoices/:id/approve', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_invoices SET status='approved',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.put('/invoices/:id/reject', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE proc_invoices SET status='rejected',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req)]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

// ── Payments ─────────────────────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  const { status, supplier_id } = req.query;
  let q = `SELECT p.*, s.supplier_name, i.invoice_number FROM proc_payments p
           JOIN proc_suppliers s ON s.id=p.supplier_id
           LEFT JOIN proc_invoices i ON i.id=p.invoice_id WHERE p.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND p.status=$${params.length}`; }
  if (supplier_id) { params.push(supplier_id); q += ` AND p.supplier_id=$${params.length}`; }
  q += ' ORDER BY p.payment_date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/payments', async (req, res) => {
  const { invoice_id, supplier_id, payment_date, amount, payment_method, reference_number, bank_name, notes } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const num = await nextSeq(client, t, 'proc_payments', 'payment_voucher_number', 'PV');
    const { rows } = await client.query(
      `INSERT INTO proc_payments (tenant_id,payment_voucher_number,invoice_id,supplier_id,payment_date,
        amount,payment_method,reference_number,bank_name,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [t, num, invoice_id || null, supplier_id, payment_date, amount, payment_method || 'bank_transfer',
        reference_number, bank_name, notes, uid(req)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/payments/:id/approve', async (req, res) => {
  const t = tid(req);
  const { rows } = await pool.query(
    `UPDATE proc_payments SET status='approved',approved_by=$3,approved_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, t, uid(req)]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  // Update invoice paid_amount and balance
  const p = rows[0];
  if (p.invoice_id) {
    await pool.query(
      `UPDATE proc_invoices SET paid_amount=paid_amount+$1, balance=balance-$1,
       status=CASE WHEN balance-$1<=0 THEN 'paid' ELSE 'partially_paid' END,updated_at=NOW()
       WHERE id=$2`, [p.amount, p.invoice_id]
    );
  }
  await pool.query(`UPDATE proc_payments SET status='paid' WHERE id=$1`, [req.params.id]);
  res.json({ ...rows[0], status: 'paid' });
});

// ── Budgets ───────────────────────────────────────────────────────────────────
router.get('/budgets', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM proc_budgets WHERE tenant_id=$1 ORDER BY financial_year DESC,department`, [tid(req)]
  );
  res.json(rows);
});

router.post('/budgets', async (req, res) => {
  const { department, financial_year, total_budget } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO proc_budgets (tenant_id,department,financial_year,total_budget,available)
     VALUES ($1,$2,$3,$4,$4) ON CONFLICT DO NOTHING RETURNING *`,
    [tid(req), department, financial_year, total_budget]
  );
  res.status(201).json(rows[0]);
});

router.put('/budgets/:id', async (req, res) => {
  const { total_budget, department, financial_year } = req.body;
  const { rows } = await pool.query(
    `UPDATE proc_budgets SET total_budget=$3,department=$4,financial_year=$5,
     available=total_budget-spent,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req), total_budget, department, financial_year]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/budgets/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_budgets WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── Plans ─────────────────────────────────────────────────────────────────────
router.get('/plans', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM proc_plans WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid(req)]
  );
  res.json(rows);
});

router.post('/plans', async (req, res) => {
  const { title, plan_type, financial_year, quarter, month, department, description, planned_amount, start_date, end_date } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const num = await nextSeq(client, t, 'proc_plans', 'plan_number', 'PLAN');
    const { rows } = await client.query(
      `INSERT INTO proc_plans (tenant_id,plan_number,title,plan_type,financial_year,quarter,month,
        department,description,planned_amount,start_date,end_date,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [t, num, title, plan_type || 'annual', financial_year, quarter || null, month || null,
        department, description, planned_amount, start_date, end_date, uid(req)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/plans/:id', async (req, res) => {
  const { title, planned_amount, actual_amount, status, description } = req.body;
  const { rows } = await pool.query(
    `UPDATE proc_plans SET title=$3,planned_amount=$4,actual_amount=$5,status=$6,description=$7,updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 RETURNING *`,
    [req.params.id, tid(req), title, planned_amount, actual_amount || 0, status, description]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/plans/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_plans WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── Assets ────────────────────────────────────────────────────────────────────
router.get('/assets', async (req, res) => {
  const { status, category } = req.query;
  let q = `SELECT a.*, s.supplier_name FROM proc_assets a
           LEFT JOIN proc_suppliers s ON s.id=a.supplier_id WHERE a.tenant_id=$1`;
  const params = [tid(req)];
  if (status) { params.push(status); q += ` AND a.status=$${params.length}`; }
  if (category) { params.push(category); q += ` AND a.category=$${params.length}`; }
  q += ' ORDER BY a.asset_name';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/assets', async (req, res) => {
  const { asset_name, category, po_id, supplier_id, purchase_date, purchase_cost, depreciation_rate,
    useful_life_years, location, assigned_department, serial_number, barcode, warranty_expiry, notes } = req.body;
  const t = tid(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tag = await nextSeq(client, t, 'proc_assets', 'asset_tag', 'AST');
    const { rows } = await client.query(
      `INSERT INTO proc_assets (tenant_id,asset_tag,asset_name,category,po_id,supplier_id,purchase_date,
        purchase_cost,current_value,depreciation_rate,useful_life_years,location,assigned_department,
        serial_number,barcode,warranty_expiry,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [t, tag, asset_name, category, po_id || null, supplier_id || null, purchase_date,
        purchase_cost || 0, depreciation_rate || 0, useful_life_years, location,
        assigned_department, serial_number, barcode, warranty_expiry, notes]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.put('/assets/:id', async (req, res) => {
  const fields = ['asset_name','category','location','assigned_to','assigned_department',
    'current_value','depreciation_rate','condition','status','warranty_expiry','notes'];
  const updates = []; const params = [req.params.id, tid(req)];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); }
  });
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(new Date());
  const { rows } = await pool.query(
    `UPDATE proc_assets SET ${updates.join(',')},updated_at=$${params.length} WHERE id=$1 AND tenant_id=$2 RETURNING *`, params
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/assets/:id', async (req, res) => {
  await pool.query(`DELETE FROM proc_assets WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
  res.json({ success: true });
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports/summary', async (req, res) => {
  const { year, department } = req.query;
  const t = tid(req);
  const safeYear = year && /^\d{4}$/.test(String(year)) ? parseInt(year, 10) : null;
  const [prStats, poStats, supStats, budStats] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) cnt, COALESCE(SUM(total_estimated_cost),0) value
                FROM proc_purchase_requisitions WHERE tenant_id=$1 ${safeYear ? `AND EXTRACT(YEAR FROM created_at)=$2` : ''}
                GROUP BY status`, safeYear ? [t, safeYear] : [t]),
    pool.query(`SELECT status, COUNT(*) cnt, COALESCE(SUM(total_amount),0) value
                FROM proc_purchase_orders WHERE tenant_id=$1 ${safeYear ? `AND EXTRACT(YEAR FROM created_at)=$2` : ''}
                GROUP BY status`, safeYear ? [t, safeYear] : [t]),
    pool.query(`SELECT s.supplier_name, COUNT(po.id) po_count, COALESCE(SUM(po.total_amount),0) total
                FROM proc_purchase_orders po JOIN proc_suppliers s ON s.id=po.supplier_id
                WHERE po.tenant_id=$1 GROUP BY s.id,s.supplier_name ORDER BY total DESC LIMIT 10`, [t]),
    pool.query(`SELECT department, total_budget, spent, available,
                CASE WHEN total_budget>0 THEN ROUND(spent/total_budget*100,1) ELSE 0 END pct_used
                FROM proc_budgets WHERE tenant_id=$1 ${department ? `AND department=$2` : ''}
                ORDER BY pct_used DESC`, department ? [t, department] : [t]),
  ]);
  res.json({ pr_stats: prStats.rows, po_stats: poStats.rows, supplier_stats: supStats.rows, budget_stats: budStats.rows });
});

// ── Audit Trail ───────────────────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  const { reference_type } = req.query;
  let q = `SELECT a.*, CONCAT(u.first_name,' ',u.last_name) approver_name FROM proc_approval_steps a
           LEFT JOIN users u ON u.id=a.approver_id WHERE a.tenant_id=$1`;
  const params = [tid(req)];
  if (reference_type) { params.push(reference_type); q += ` AND a.reference_type=$${params.length}`; }
  q += ' ORDER BY a.created_at DESC LIMIT 200';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Catch-all error handler — converts any unhandled route error to a JSON 500
router.use((err, req, res, next) => {
  console.error('[Procurement]', err.message);
  res.status(500).json({ error: err.message });
});

export default router;
