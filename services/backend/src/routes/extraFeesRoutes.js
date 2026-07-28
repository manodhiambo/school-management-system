import express from 'express';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('finance'));
router.use(tenantContext);
router.use(requireActiveTenant);

// ── GET /extra-fees — list all extra fees (optionally filter by class/student/term/year) ──
router.get('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id, student_id, term, academic_year, is_active } = req.query;

    let sql = `
      SELECT ef.*,
             c.name AS class_name,
             s.first_name || ' ' || s.last_name AS student_name,
             s.admission_number,
             fs.id AS fee_structure_id
      FROM extra_fees ef
      LEFT JOIN classes c ON c.id = ef.class_id
      LEFT JOIN students s ON s.id = ef.student_id
      LEFT JOIN fee_structure fs ON fs.extra_fee_id = ef.id AND fs.tenant_id = ef.tenant_id
      WHERE ef.tenant_id = $1
    `;
    const params = [tid];
    let pi = 2;

    if (class_id)      { sql += ` AND ef.class_id = $${pi++}`;    params.push(class_id); }
    if (student_id)    { sql += ` AND ef.student_id = $${pi++}`;  params.push(student_id); }
    if (term)          { sql += ` AND (ef.term = $${pi++} OR ef.term IS NULL)`; params.push(term); }
    if (academic_year) { sql += ` AND (ef.academic_year = $${pi++} OR ef.academic_year IS NULL)`; params.push(academic_year); }
    if (is_active !== undefined) { sql += ` AND ef.is_active = $${pi++}`; params.push(is_active === 'true'); }

    sql += ' ORDER BY ef.class_id NULLS LAST, ef.student_id NULLS LAST, ef.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /extra-fees/for-report — fees applicable to a student (class + individual) ──
router.get('/for-report', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, class_id, term, academic_year } = req.query;

    if (!student_id) return res.status(400).json({ success: false, message: 'student_id required' });

    // Returns extra fees that apply to this student:
    //   1. Student-level fees (student_id = this student)
    //   2. Class-level fees (class_id = student's class, student_id IS NULL)
    const rows = await query(
      `SELECT ef.*, c.name AS class_name
       FROM extra_fees ef
       LEFT JOIN classes c ON c.id = ef.class_id
       WHERE ef.tenant_id = $1
         AND ef.is_active = TRUE
         AND (
           ef.student_id = $2
           OR (ef.class_id = $3 AND ef.student_id IS NULL)
         )
         AND (ef.term IS NULL OR ef.term = $4)
         AND (ef.academic_year IS NULL OR ef.academic_year = $5)
       ORDER BY ef.student_id NULLS LAST, ef.name`,
      [tid, student_id, class_id || null, term || null, academic_year || null]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /extra-fees — create ──────────────────────────────────────────────────
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, amount, class_id, student_id, term, academic_year, description } = req.body;
    if (!name || amount == null) return res.status(400).json({ success: false, message: 'name and amount are required' });

    const rows = await query(
      `INSERT INTO extra_fees (tenant_id, name, amount, class_id, student_id, term, academic_year, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tid, name, Number(amount), class_id || null, student_id || null, term || null, academic_year || null, description || null]
    );
    const ef = rows[0];

    // Auto-create linked fee_structure so it appears in fee management.
    // term MUST mirror the extra fee's own term — leaving it NULL here (as
    // this used to) means "all terms" to the invoice-generation matching
    // logic, so a Term-2-only extra fee would get invoiced even when
    // generating Term 1 or Term 3 invoices.
    const fsDescription = description ? `Extra Fee: ${description}` : `Extra Fee: ${name}`;
    await query(
      `INSERT INTO fee_structure (id, name, amount, frequency, class_id, extra_fee_id,
        tenant_id, is_mandatory, student_type, academic_year, due_day, description, term)
       VALUES ($1,$2,$3,'one_time',$4,$5,$6,FALSE,'all',$7,15,$8,$9)`,
      [uuidv4(), name, Number(amount), class_id || null, ef.id, tid,
       academic_year || new Date().getFullYear().toString(), fsDescription, ef.term || null]
    );

    res.status(201).json({ success: true, data: ef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /extra-fees/:id — update ───────────────────────────────────────────────
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, amount, class_id, student_id, term, academic_year, description, is_active } = req.body;

    const rows = await query(
      `UPDATE extra_fees SET
         name = COALESCE($1, name),
         amount = COALESCE($2, amount),
         class_id = $3,
         student_id = $4,
         term = $5,
         academic_year = $6,
         description = $7,
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [name, amount != null ? Number(amount) : null,
       class_id || null, student_id || null,
       term || null, academic_year || null,
       description || null,
       is_active != null ? is_active : null,
       req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const ef = rows[0];

    // Sync linked fee_structure
    const existing = await query(
      'SELECT id FROM fee_structure WHERE extra_fee_id=$1 AND tenant_id=$2',
      [req.params.id, tid]
    );
    if (existing.length) {
      await query(
        `UPDATE fee_structure SET name=COALESCE($1,name), amount=COALESCE($2,amount),
         class_id=$3, is_active=COALESCE($4,is_active), term=$5, updated_at=NOW()
         WHERE extra_fee_id=$6 AND tenant_id=$7`,
        [ef.name, ef.amount, ef.class_id, ef.is_active, ef.term || null, req.params.id, tid]
      );
    } else {
      // Create if missing (e.g. pre-existing extra fees)
      await query(
        `INSERT INTO fee_structure (id, name, amount, frequency, class_id, extra_fee_id,
          tenant_id, is_mandatory, student_type, academic_year, due_day, term)
         VALUES ($1,$2,$3,'one_time',$4,$5,$6,FALSE,'all',$7,15,$8)`,
        [uuidv4(), ef.name, ef.amount, ef.class_id, req.params.id, tid,
         ef.academic_year || new Date().getFullYear().toString(), ef.term || null]
      );
    }

    res.json({ success: true, data: ef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /extra-fees/:id ─────────────────────────────────────────────────────
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('DELETE FROM extra_fees WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
