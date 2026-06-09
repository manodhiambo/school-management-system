import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ── Kenya PAYE 2024 helper ──────────────────────────────────────────────────
function computePAYE(grossMonthly) {
  const PERSONAL_RELIEF = 2400;
  let tax = 0;
  let remaining = grossMonthly;

  const bands = [
    { limit: 24000, rate: 0.10 },
    { limit: 8333,  rate: 0.25 },  // 32,333 - 24,000
    { limit: 467667, rate: 0.30 }, // 500,000 - 32,333
    { limit: 300000, rate: 0.325 },// 800,000 - 500,000
  ];

  for (const band of bands) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }
  if (remaining > 0) {
    tax += remaining * 0.35;
  }

  tax = Math.max(0, tax - PERSONAL_RELIEF);
  return Math.round(tax);
}

function computeNSSF(basicSalary) {
  return Math.min(Math.round(basicSalary * 0.06), 1080);
}

// ── Middleware: admin / finance_officer only ────────────────────────────────
function requireFinance(req, res, next) {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'finance_officer' && role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin or finance officer access required' });
  }
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SALARY STRUCTURES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/payroll/structures
router.get('/structures', requireFinance, async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM salary_structures WHERE tenant_id = $1 ORDER BY name`,
      [req.user.tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get salary structures error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payroll/structures
router.post('/structures', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const n = (v, def = 0) => (v === '' || v === null || v === undefined) ? def : Number(v);

    const { name, basic_salary } = req.body;
    if (!name || !basic_salary) {
      return res.status(400).json({ success: false, message: 'name and basic_salary are required' });
    }

    const rows = await query(
      `INSERT INTO salary_structures
         (tenant_id, name, basic_salary, house_allowance, transport_allow, medical_allow, other_allowance, nssf_rate, nhif_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        tid, name,
        n(basic_salary),
        n(req.body.house_allowance),
        n(req.body.transport_allow),
        n(req.body.medical_allow),
        n(req.body.other_allowance),
        n(req.body.nssf_rate, 0.06),
        n(req.body.nhif_amount, 500),
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create salary structure error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/payroll/structures/:id
router.put('/structures/:id', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const n = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
    const { name } = req.body;

    const rows = await query(
      `UPDATE salary_structures
       SET name            = COALESCE($1, name),
           basic_salary    = COALESCE($2, basic_salary),
           house_allowance = COALESCE($3, house_allowance),
           transport_allow = COALESCE($4, transport_allow),
           medical_allow   = COALESCE($5, medical_allow),
           other_allowance = COALESCE($6, other_allowance),
           nssf_rate       = COALESCE($7, nssf_rate),
           nhif_amount     = COALESCE($8, nhif_amount)
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [
        name || null,
        n(req.body.basic_salary),
        n(req.body.house_allowance),
        n(req.body.transport_allow),
        n(req.body.medical_allow),
        n(req.body.other_allowance),
        n(req.body.nssf_rate),
        n(req.body.nhif_amount),
        req.params.id, tid,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Structure not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update salary structure error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/payroll/structures/:id
router.delete('/structures/:id', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `DELETE FROM salary_structures WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Structure not found' });
    res.json({ success: true, message: 'Structure deleted' });
  } catch (err) {
    logger.error('Delete salary structure error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAFF SALARY ASSIGNMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/payroll/assignments
router.get('/assignments', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT u.id AS user_id,
              COALESCE(
                CASE WHEN u.role = 'teacher' THEN t.first_name || ' ' || t.last_name END,
                NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''),
                u.email
              ) AS full_name,
              u.email, u.role,
              ssa.salary_structure_id, ssa.basic_override, ssa.effective_from,
              ss.name AS structure_name, ss.basic_salary,
              ss.house_allowance, ss.transport_allow, ss.medical_allow,
              ss.other_allowance, ss.nssf_rate, ss.nhif_amount
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.id AND u.role = 'teacher'
       LEFT JOIN staff_salary_assignments ssa ON ssa.user_id = u.id AND ssa.tenant_id = $1
       LEFT JOIN salary_structures ss ON ss.id = ssa.salary_structure_id
       WHERE u.tenant_id = $1
         AND u.role IN ('teacher', 'admin', 'finance_officer')
       ORDER BY full_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get salary assignments error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/payroll/assignments/:userId
// Body: {salary_structure_id, basic_override?, effective_from?}
router.put('/assignments/:userId', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { salary_structure_id, basic_override, effective_from } = req.body;

    // verify user belongs to tenant
    const userCheck = await query(
      `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
      [req.params.userId, tid]
    );
    if (userCheck.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    if (!salary_structure_id) {
      // Remove assignment (unassign)
      await query(
        `DELETE FROM staff_salary_assignments WHERE user_id = $1 AND tenant_id = $2`,
        [req.params.userId, tid]
      );
      return res.json({ success: true, data: null, message: 'Assignment removed' });
    }

    const rows = await query(
      `INSERT INTO staff_salary_assignments (tenant_id, user_id, salary_structure_id, basic_override, effective_from)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET salary_structure_id = EXCLUDED.salary_structure_id,
             basic_override      = EXCLUDED.basic_override,
             effective_from      = EXCLUDED.effective_from
       RETURNING *`,
      [tid, req.params.userId, salary_structure_id, basic_override || null, effective_from || new Date()]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Assign salary structure error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYROLL RUNS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/payroll/runs
router.get('/runs', requireFinance, async (req, res) => {
  try {
    const rows = await query(
      `SELECT pr.*,
              (SELECT COUNT(*) FROM payslips p WHERE p.payroll_run_id = pr.id AND p.tenant_id = pr.tenant_id)::int AS payslips_count
       FROM payroll_runs pr
       WHERE pr.tenant_id = $1
       ORDER BY pr.period_year DESC, pr.period_month DESC`,
      [req.user.tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get payroll runs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payroll/runs — create a run for a month
// Body: {period_year, period_month}
router.post('/runs', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { period_year, period_month } = req.body;
    if (!period_year || !period_month) {
      return res.status(400).json({ success: false, message: 'period_year and period_month are required' });
    }

    const existing = await query(
      `SELECT id FROM payroll_runs WHERE tenant_id=$1 AND period_year=$2 AND period_month=$3`,
      [tid, period_year, period_month]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Payroll run already exists for this period' });
    }

    const rows = await query(
      `INSERT INTO payroll_runs (tenant_id, period_year, period_month, status, total_gross, total_net)
       VALUES ($1, $2, $3, 'draft', 0, 0)
       RETURNING *`,
      [tid, period_year, period_month]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create payroll run error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payroll/runs/:id/process — compute and insert payslips
router.post('/runs/:id/process', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const runRows = await query(
      `SELECT * FROM payroll_runs WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (runRows.length === 0) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    const run = runRows[0];
    if (run.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot reprocess a paid payroll run' });
    }

    // fetch staff with salary assignments
    const staff = await query(
      `SELECT u.id AS user_id,
              COALESCE(ssa.basic_override, ss.basic_salary) AS basic_salary,
              ss.house_allowance, ss.transport_allow, ss.medical_allow,
              ss.other_allowance, ss.nssf_rate, ss.nhif_amount
       FROM users u
       JOIN staff_salary_assignments ssa ON ssa.user_id = u.id AND ssa.tenant_id = $1
       JOIN salary_structures ss ON ss.id = ssa.salary_structure_id
       WHERE u.tenant_id = $1 AND u.role IN ('teacher','admin','finance_officer')`,
      [tid]
    );

    if (staff.length === 0) {
      return res.status(400).json({ success: false, message: 'No staff with salary assignments found' });
    }

    // delete existing payslips for this run (re-process)
    await query(`DELETE FROM payslips WHERE payroll_run_id = $1 AND tenant_id = $2`, [run.id, tid]);

    let totalGross = 0;
    let totalNet = 0;

    for (const s of staff) {
      const basic          = parseFloat(s.basic_salary) || 0;
      const house          = parseFloat(s.house_allowance) || 0;
      const transport      = parseFloat(s.transport_allow) || 0;
      const medical        = parseFloat(s.medical_allow) || 0;
      const other          = parseFloat(s.other_allowance) || 0;
      const gross          = basic + house + transport + medical + other;
      const nssf           = computeNSSF(basic);
      const nhif           = parseFloat(s.nhif_amount) || 500;
      const paye           = computePAYE(gross);
      const totalDeductions = paye + nssf + nhif;
      const net            = Math.max(0, gross - totalDeductions);

      await query(
        `INSERT INTO payslips
           (tenant_id, payroll_run_id, user_id, basic_salary, house_allowance,
            transport_allow, medical_allow, other_allowance, gross_salary,
            paye_tax, nssf_deduction, nhif_deduction, other_deductions, net_salary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [tid, run.id, s.user_id, basic, house, transport, medical, other,
         gross, paye, nssf, nhif, 0, net]
      );

      totalGross += gross;
      totalNet   += net;
    }

    const updated = await query(
      `UPDATE payroll_runs
       SET status = 'draft', total_gross = $1, total_net = $2
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [Math.round(totalGross), Math.round(totalNet), run.id, tid]
    );

    res.json({ success: true, data: { ...updated[0], payslips_count: staff.length }, payslips_created: staff.length });
  } catch (err) {
    logger.error('Process payroll run error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/payroll/runs/:id/approve
router.put('/runs/:id/approve', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE payroll_runs SET status = 'approved' WHERE id = $1 AND tenant_id = $2 AND status = 'draft' RETURNING *`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Run not found or not in draft status' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Approve payroll run error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/payroll/runs/:id/mark-paid
router.put('/runs/:id/mark-paid', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE payroll_runs SET status = 'paid' WHERE id = $1 AND tenant_id = $2 AND status = 'approved' RETURNING *`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Run not found or not approved' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Mark payroll paid error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/payroll/runs/:id/payslips
router.get('/runs/:id/payslips', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT p.*,
              COALESCE(
                CASE WHEN u.role = 'teacher' THEN t.first_name || ' ' || t.last_name END,
                NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''),
                u.email
              ) AS full_name,
              u.email, u.role
       FROM payslips p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN teachers t ON t.user_id = u.id AND u.role = 'teacher'
       WHERE p.payroll_run_id = $1 AND p.tenant_id = $2
       ORDER BY full_name`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get run payslips error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/payroll/payslip/:id — single payslip detail
router.get('/payslip/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;

    const rows = await query(
      `SELECT p.*,
              COALESCE(
                CASE WHEN u.role = 'teacher' THEN t.first_name || ' ' || t.last_name END,
                NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''),
                u.email
              ) AS full_name,
              u.email, u.role,
              pr.period_year, pr.period_month, pr.status AS run_status
       FROM payslips p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN teachers t ON t.user_id = u.id AND u.role = 'teacher'
       JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payslip not found' });

    // staff can only view their own payslip
    if (role !== 'admin' && role !== 'finance_officer' && role !== 'superadmin') {
      if (rows[0].user_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get payslip error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/payroll/my-payslips — teacher/staff sees own payslips (status != draft)
router.get('/my-payslips', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT p.*,
              pr.period_year, pr.period_month, pr.status AS run_status
       FROM payslips p
       JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       WHERE p.user_id = $1 AND p.tenant_id = $2 AND pr.status != 'draft'
       ORDER BY pr.period_year DESC, pr.period_month DESC`,
      [req.user.id, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get my payslips error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── P9 Form (KRA Annual Tax Deduction Card) ────────────────────────────────

// GET /api/v1/payroll/p9-employees?year= — list all staff with salary assignments
router.get('/p9-employees', requireFinance, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT u.id,
              COALESCE(
                CASE WHEN u.role = 'teacher' THEN t.first_name || ' ' || t.last_name END,
                NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''),
                u.email
              ) AS full_name,
              u.email, u.role
       FROM users u
       JOIN staff_salary_assignments ssa ON ssa.user_id = u.id AND ssa.tenant_id = $1
       LEFT JOIN teachers t ON t.user_id = u.id AND u.role = 'teacher'
       WHERE u.tenant_id = $1
         AND u.role IN ('teacher', 'admin', 'finance_officer')
       ORDER BY full_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('P9 employees error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/payroll/p9?year=&userId= — P9 data for one employee
router.get('/p9', requireFinance, async (req, res) => {
  try {
    const tid    = req.user.tenant_id;
    const { year, userId } = req.query;
    if (!year || !userId) {
      return res.status(400).json({ success: false, message: 'year and userId are required' });
    }

    const userRows = await query(
      `SELECT u.id,
              COALESCE(
                CASE WHEN u.role = 'teacher' THEN t.first_name || ' ' || t.last_name END,
                NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''),
                u.email
              ) AS full_name,
              u.email, u.role
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.id AND u.role = 'teacher'
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [userId, tid]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Monthly payslip data for the year
    const months = await query(
      `SELECT pr.period_month, pr.period_year,
              p.basic_salary, p.house_allowance, p.transport_allow, p.medical_allow, p.other_allowance,
              p.gross_salary, p.nssf_deduction, p.nhif_deduction, p.paye_tax, p.net_salary
       FROM payslips p
       JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       WHERE p.user_id = $1 AND p.tenant_id = $2 AND pr.period_year = $3 AND pr.status = 'paid'
       ORDER BY pr.period_month`,
      [userId, tid, year]
    );

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const p9Lines = Array.from({ length: 12 }, (_, i) => {
      const m = months.find(r => Number(r.period_month) === i + 1);
      if (!m) return { month: MONTH_NAMES[i], monthNum: i + 1, gross: 0, nssf: 0, chargeablePay: 0, paye: 0, nhif: 0, net: 0 };
      const gross        = Number(m.gross_salary);
      const nssf         = Number(m.nssf_deduction);
      const chargeablePay = Math.max(0, gross - nssf);
      return {
        month:        MONTH_NAMES[i],
        monthNum:     i + 1,
        gross,
        nssf,
        chargeablePay,
        paye:         Number(m.paye_tax),
        nhif:         Number(m.nhif_deduction),
        net:          Number(m.net_salary),
      };
    });

    const totals = p9Lines.reduce((acc, l) => ({
      gross:         acc.gross         + l.gross,
      nssf:          acc.nssf          + l.nssf,
      chargeablePay: acc.chargeablePay + l.chargeablePay,
      paye:          acc.paye          + l.paye,
      nhif:          acc.nhif          + l.nhif,
      net:           acc.net           + l.net,
    }), { gross: 0, nssf: 0, chargeablePay: 0, paye: 0, nhif: 0, net: 0 });

    res.json({
      success: true,
      data: {
        employee: userRows[0],
        year,
        lines: p9Lines,
        totals,
      },
    });
  } catch (err) {
    logger.error('P9 form error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
