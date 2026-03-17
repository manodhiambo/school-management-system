import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Helper: compute CBC grade from percentage and education level
function computeCBCGrade(percentage, level) {
  if (['playgroup', 'pre_primary'].includes(level)) {
    if (percentage >= 75) return 'WD'; // Well Developed
    if (percentage >= 40) return 'D';  // Developing
    return 'B';                         // Beginning
  }
  // Kenya 2025 KJSEA 8-level grading for Junior Secondary (Grade 7–9)
  if (level === 'junior_secondary') {
    if (percentage >= 90) return 'EE1'; // Exceeding Expectations Level 1
    if (percentage >= 75) return 'EE2'; // Exceeding Expectations Level 2
    if (percentage >= 58) return 'ME1'; // Meeting Expectations Level 1
    if (percentage >= 41) return 'ME2'; // Meeting Expectations Level 2
    if (percentage >= 31) return 'AE1'; // Approaching Expectations Level 1
    if (percentage >= 21) return 'AE2'; // Approaching Expectations Level 2
    if (percentage >= 11) return 'BE1'; // Below Expectations Level 1
    return 'BE2';                        // Below Expectations Level 2
  }
  // Standard CBC for lower_primary, upper_primary, senior_secondary
  if (percentage >= 80) return 'EE'; // Exceeding Expectations
  if (percentage >= 60) return 'ME'; // Meeting Expectations
  if (percentage >= 40) return 'AE'; // Approaching Expectations
  return 'BE';                        // Below Expectations
}

// Helper: grade points for JSS (1–8 scale)
function gradePoints(grade) {
  const points = {
    EE1: 8, EE2: 7, ME1: 6, ME2: 5,
    AE1: 4, AE2: 3, BE1: 2, BE2: 1,
    EE: null, ME: null, AE: null, BE: null,
    WD: null, D: null, B: null
  };
  return points[grade] ?? null;
}

function cbcGradeLabel(grade) {
  const labels = {
    EE: 'Exceeding Expectations', ME: 'Meeting Expectations',
    AE: 'Approaching Expectations', BE: 'Below Expectations',
    WD: 'Well Developed', D: 'Developing', B: 'Beginning',
    EE1: 'Exceeding Expectations Level 1', EE2: 'Exceeding Expectations Level 2',
    ME1: 'Meeting Expectations Level 1',   ME2: 'Meeting Expectations Level 2',
    AE1: 'Approaching Expectations Level 1', AE2: 'Approaching Expectations Level 2',
    BE1: 'Below Expectations Level 1',     BE2: 'Below Expectations Level 2',
  };
  return labels[grade] || grade;
}

function autoComment(grade) {
  const comments = {
    EE: 'EXCELLENT', EE1: 'EXCELLENT', EE2: 'EXCELLENT',
    ME: 'GOOD',      ME1: 'GOOD',      ME2: 'GOOD',
    AE: 'Can do better', AE1: 'Can do better', AE2: 'Can do better',
    BE: 'Put More Effort', BE1: 'Put More Effort', BE2: 'Put More Effort',
    WD: 'EXCELLENT', D: 'Can do better', B: 'Put More Effort'
  };
  return comments[grade] || null;
}

// ============================================================
// STRANDS
// ============================================================

// GET /api/v1/cbc/strands?subject_id=&education_level=
router.get('/strands', authenticate, async (req, res) => {
  try {
    const { subject_id, education_level } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT s.*, sub.name as subject_name FROM cbc_strands s
               JOIN subjects sub ON sub.id = s.subject_id
               WHERE (s.tenant_id = $1 OR s.tenant_id IS NULL)`;
    const params = [tid];
    if (subject_id) { sql += ` AND s.subject_id = $${params.length + 1}`; params.push(subject_id); }
    if (education_level) { sql += ` AND (s.education_level = $${params.length + 1} OR s.education_level IS NULL)`; params.push(education_level); }
    sql += ' ORDER BY s.order_index, s.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get strands error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/strands
router.post('/strands', authenticate, async (req, res) => {
  try {
    const { subject_id, name, code, education_level, order_index } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO cbc_strands (subject_id, name, code, education_level, order_index, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [subject_id, name, code, education_level, order_index || 0, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create strand error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/strands/:id
router.put('/strands/:id', authenticate, async (req, res) => {
  try {
    const { name, code, education_level, order_index } = req.body;
    const rows = await query(
      `UPDATE cbc_strands SET name=$1, code=$2, education_level=$3, order_index=$4 WHERE id=$5 RETURNING *`,
      [name, code, education_level, order_index || 0, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbc/strands/:id
router.delete('/strands/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM cbc_strands WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Strand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// SUB-STRANDS
// ============================================================

// GET /api/v1/cbc/sub-strands?strand_id=
router.get('/sub-strands', authenticate, async (req, res) => {
  try {
    const { strand_id } = req.query;
    let sql = `SELECT ss.*, s.name as strand_name FROM cbc_sub_strands ss
               JOIN cbc_strands s ON s.id = ss.strand_id WHERE 1=1`;
    const params = [];
    if (strand_id) { sql += ` AND ss.strand_id = $${params.length + 1}`; params.push(strand_id); }
    sql += ' ORDER BY ss.order_index, ss.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/sub-strands
router.post('/sub-strands', authenticate, async (req, res) => {
  try {
    const { strand_id, name, code, order_index } = req.body;
    const rows = await query(
      `INSERT INTO cbc_sub_strands (strand_id, name, code, order_index) VALUES ($1,$2,$3,$4) RETURNING *`,
      [strand_id, name, code, order_index || 0]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/sub-strands/:id
router.put('/sub-strands/:id', authenticate, async (req, res) => {
  try {
    const { name, code, order_index } = req.body;
    const rows = await query(
      `UPDATE cbc_sub_strands SET name=$1, code=$2, order_index=$3 WHERE id=$4 RETURNING *`,
      [name, code, order_index || 0, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbc/sub-strands/:id
router.delete('/sub-strands/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM cbc_sub_strands WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Sub-strand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ASSESSMENTS
// ============================================================

// GET /api/v1/cbc/assessments?student_id=&class_id=&subject_id=&term=&academic_year=
router.get('/assessments', authenticate, async (req, res) => {
  try {
    const { student_id, class_id, subject_id, term, academic_year } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT a.*, s.first_name||' '||s.last_name as student_name,
               sub.name as subject_name, st.name as strand_name
               FROM cbc_assessments a
               JOIN students s ON s.id = a.student_id
               JOIN subjects sub ON sub.id = a.subject_id
               LEFT JOIN cbc_strands st ON st.id = a.strand_id
               WHERE a.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND a.student_id = $${params.length+1}`; params.push(student_id); }
    if (class_id) { sql += ` AND a.class_id = $${params.length+1}`; params.push(class_id); }
    if (subject_id) { sql += ` AND a.subject_id = $${params.length+1}`; params.push(subject_id); }
    if (term) { sql += ` AND a.term = $${params.length+1}`; params.push(term); }
    if (academic_year) { sql += ` AND a.academic_year = $${params.length+1}`; params.push(academic_year); }
    sql += ' ORDER BY a.assessment_date DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get assessments error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/assessments
router.post('/assessments', authenticate, async (req, res) => {
  try {
    const {
      student_id, subject_id, strand_id, sub_strand_id, class_id,
      assessment_type, assessment_date, term, academic_year,
      score, max_score, teacher_comments, education_level,
      exam_period, result_code
    } = req.body;

    let cbc_grade = null;
    let pre_primary_grade = null;
    let grade_pts = null;
    // result_code WD/Y means no score-based grade
    if (!result_code && score != null && max_score > 0) {
      const pct = (score / max_score) * 100;
      if (['playgroup', 'pre_primary'].includes(education_level)) {
        pre_primary_grade = computeCBCGrade(pct, education_level);
      } else {
        cbc_grade = computeCBCGrade(pct, education_level || 'lower_primary');
        grade_pts = gradePoints(cbc_grade);
      }
    }

    // Auto-generate comment if none provided
    const finalGrade = cbc_grade || pre_primary_grade;
    const finalComment = teacher_comments || (finalGrade ? autoComment(finalGrade) : null);

    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO cbc_assessments
       (student_id, subject_id, strand_id, sub_strand_id, class_id, assessment_type,
        assessment_date, term, academic_year, cbc_grade, pre_primary_grade,
        score, max_score, teacher_comments, teacher_id, tenant_id, exam_period, result_code, grade_points)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [student_id, subject_id, strand_id || null, sub_strand_id || null, class_id,
       assessment_type, assessment_date || new Date(), term, academic_year,
       cbc_grade, pre_primary_grade, result_code ? null : (score || null), max_score || null,
       finalComment, req.user.id, tid, exam_period || null, result_code || null, grade_pts]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create assessment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/assessments/:id — admin or teacher who created it
router.put('/assessments/:id', authenticate, async (req, res) => {
  if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  // Teachers can only edit their own assessments
  if (req.user.role === 'teacher') {
    const existing = await query('SELECT teacher_id FROM cbc_assessments WHERE id=$1', [req.params.id]);
    if (!existing.length || existing[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own assessments' });
    }
  }
  try {
    const { score, max_score, cbc_grade, pre_primary_grade, teacher_comments, education_level, exam_period, result_code } = req.body;
    let grade = cbc_grade;
    let ppGrade = pre_primary_grade;
    let grade_pts = null;
    if (!result_code && score != null && max_score > 0 && !cbc_grade && !pre_primary_grade) {
      const pct = (score / max_score) * 100;
      if (['playgroup', 'pre_primary'].includes(education_level)) {
        ppGrade = computeCBCGrade(pct, education_level);
      } else {
        grade = computeCBCGrade(pct, education_level || 'lower_primary');
      }
    }
    if (!result_code && grade) grade_pts = gradePoints(grade);
    const finalGrade = grade || ppGrade;
    const finalComment = teacher_comments || (finalGrade ? autoComment(finalGrade) : null);
    const rows = await query(
      `UPDATE cbc_assessments SET score=$1, max_score=$2, cbc_grade=$3, pre_primary_grade=$4,
       teacher_comments=$5, exam_period=$6, result_code=$7, grade_points=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [result_code ? null : (score || null), max_score || null, result_code ? null : grade, result_code ? null : ppGrade,
       finalComment, exam_period || null, result_code || null, result_code ? null : grade_pts, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbc/assessments/:id — admin or teacher who created it
router.delete('/assessments/:id', authenticate, async (req, res) => {
  if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  if (req.user.role === 'teacher') {
    const existing = await query('SELECT teacher_id FROM cbc_assessments WHERE id=$1', [req.params.id]);
    if (!existing.length || existing[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own assessments' });
    }
  }
  try {
    await query('DELETE FROM cbc_assessments WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// COMPETENCY SUMMARY (per student per subject per term)
// ============================================================

// GET /api/v1/cbc/competency-summary?student_id=&term=&academic_year=
router.get('/competency-summary', authenticate, async (req, res) => {
  try {
    const { student_id, class_id, term, academic_year } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT cs.*, s.name as subject_name,
               st.first_name||' '||st.last_name as student_name
               FROM student_competency_summary cs
               JOIN subjects s ON s.id = cs.subject_id
               JOIN students st ON st.id = cs.student_id
               WHERE cs.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND cs.student_id = $${params.length+1}`; params.push(student_id); }
    if (class_id) { sql += ` AND cs.class_id = $${params.length+1}`; params.push(class_id); }
    if (term) { sql += ` AND cs.term = $${params.length+1}`; params.push(term); }
    if (academic_year) { sql += ` AND cs.academic_year = $${params.length+1}`; params.push(academic_year); }
    sql += ' ORDER BY s.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/competency-summary (upsert)
router.post('/competency-summary', authenticate, async (req, res) => {
  try {
    const {
      student_id, subject_id, class_id, term, academic_year,
      overall_cbc_grade, pre_primary_grade, strand_grades,
      total_score, max_score, teacher_comments
    } = req.body;
    const percentage = max_score > 0 ? ((total_score / max_score) * 100).toFixed(2) : null;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO student_competency_summary
       (student_id, subject_id, class_id, term, academic_year, overall_cbc_grade,
        pre_primary_grade, strand_grades, total_score, max_score, percentage,
        teacher_comments, teacher_id, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (student_id, subject_id, term, academic_year)
       DO UPDATE SET overall_cbc_grade=$6, pre_primary_grade=$7, strand_grades=$8,
       total_score=$9, max_score=$10, percentage=$11, teacher_comments=$12,
       teacher_id=$13, updated_at=NOW()
       RETURNING *`,
      [student_id, subject_id, class_id, term, academic_year, overall_cbc_grade || null,
       pre_primary_grade || null, JSON.stringify(strand_grades || {}),
       total_score, max_score, percentage, teacher_comments, req.user.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Competency summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// REPORT CARDS
// ============================================================

// GET /api/v1/cbc/report-cards?student_id=&term=&academic_year=&class_id=
// When class_id is provided, returns ALL students in that class (LEFT JOIN) so students without
// a report card yet still appear in the list.
router.get('/report-cards', authenticate, async (req, res) => {
  try {
    const { student_id, term, academic_year, class_id, status } = req.query;
    const tid = req.user.tenant_id;
    let sql, params;

    if (class_id) {
      // Start from students so all class members are visible even without a report card
      params = [tid, class_id];
      sql = `SELECT
               s.id AS student_id,
               s.first_name||' '||s.last_name AS student_name,
               s.admission_number,
               c.name AS class_name,
               rc.id,
               rc.status,
               rc.term,
               rc.academic_year,
               rc.overall_grade,
               rc.published_at,
               rc.days_present,
               rc.days_absent,
               rc.days_late,
               rc.class_teacher_comment
             FROM students s
             JOIN classes c ON c.id = s.class_id
             LEFT JOIN cbc_report_cards rc
               ON rc.student_id = s.id
               AND rc.class_id = s.class_id
               AND rc.tenant_id = $1`;
      if (term)          { sql += ` AND rc.term = $${params.length+1}`;          params.push(term); }
      if (academic_year) { sql += ` AND rc.academic_year = $${params.length+1}`; params.push(academic_year); }
      sql += ` WHERE s.class_id = $2 AND s.tenant_id = $1 AND s.status = 'active'`;
      if (status) { sql += ` AND (rc.status = $${params.length+1} OR rc.status IS NULL)`; params.push(status); }
      sql += ' ORDER BY s.first_name, s.last_name';
    } else {
      // No class filter: return only existing report card records (original behaviour)
      params = [tid];
      sql = `SELECT rc.*,
               s.first_name||' '||s.last_name AS student_name,
               s.admission_number, c.name AS class_name
             FROM cbc_report_cards rc
             JOIN students s ON s.id = rc.student_id
             JOIN classes c ON c.id = rc.class_id
             WHERE rc.tenant_id = $1`;
      if (student_id)    { sql += ` AND rc.student_id = $${params.length+1}`;    params.push(student_id); }
      if (term)          { sql += ` AND rc.term = $${params.length+1}`;          params.push(term); }
      if (academic_year) { sql += ` AND rc.academic_year = $${params.length+1}`; params.push(academic_year); }
      if (status)        { sql += ` AND rc.status = $${params.length+1}`;        params.push(status); }
      sql += ' ORDER BY s.first_name, s.last_name';
    }

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get report cards error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/report-cards/generate — bulk-create draft report cards for all students in a class
router.post('/report-cards/generate', authenticate, async (req, res) => {
  try {
    const { class_id, term, academic_year } = req.body;
    if (!class_id || !term || !academic_year) {
      return res.status(400).json({ success: false, message: 'class_id, term and academic_year are required' });
    }
    const tid = req.user.tenant_id;
    const { v4: uuidv4 } = await import('uuid');

    // Fetch all active students in the class
    const students = await query(
      `SELECT id FROM students WHERE class_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [class_id, tid]
    );
    if (!students.length) {
      return res.json({ success: true, created: 0, message: 'No active students in this class' });
    }

    let created = 0;
    for (const s of students) {
      // Skip if report card already exists for this student/term/year
      const existing = await query(
        `SELECT id FROM cbc_report_cards WHERE student_id=$1 AND class_id=$2 AND term=$3 AND academic_year=$4 AND tenant_id=$5`,
        [s.id, class_id, term, academic_year, tid]
      );
      if (existing.length) continue;

      await query(
        `INSERT INTO cbc_report_cards (id, tenant_id, student_id, class_id, term, academic_year, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',NOW(),NOW())`,
        [uuidv4(), tid, s.id, class_id, term, academic_year]
      );
      created++;
    }

    res.json({ success: true, created, total: students.length });
  } catch (err) {
    logger.error('Generate report cards error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single report card with full details + parent/guardian contact info
router.get('/report-cards/:id', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT rc.*,
       s.first_name||' '||s.last_name AS student_name,
       s.admission_number, s.date_of_birth, s.nemis_number,
       c.name AS class_name, c.education_level,
       p.first_name||' '||p.last_name AS guardian_name,
       p.relationship AS guardian_relationship,
       p.phone_primary AS guardian_phone,
       pu.email AS guardian_email
       FROM cbc_report_cards rc
       JOIN students s ON s.id = rc.student_id
       JOIN classes c ON c.id = rc.class_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
       WHERE rc.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const rc = rows[0];
    const competencies = await query(
      `SELECT cs.*, sub.name as subject_name,
              UPPER(u.first_name || ' ' || u.last_name) AS teacher_name
       FROM student_competency_summary cs
       JOIN subjects sub ON sub.id = cs.subject_id
       LEFT JOIN class_subjects csj ON csj.class_id = $4 AND csj.subject_id = cs.subject_id
       LEFT JOIN users u ON u.id = csj.teacher_id
       WHERE cs.student_id = $1 AND cs.term = $2 AND cs.academic_year = $3`,
      [rc.student_id, rc.term, rc.academic_year, rc.class_id]
    );

    // Class teacher name (teacher marked as class teacher for this class)
    const classTeacherRows = await query(
      `SELECT UPPER(t.first_name || ' ' || t.last_name) AS name
       FROM teachers t WHERE t.class_id = $1 AND t.is_class_teacher = TRUE AND t.tenant_id = $2 LIMIT 1`,
      [rc.class_id, rc.tenant_id]
    ).catch(() => []);
    const classTeacherName = classTeacherRows[0]?.name || null;

    // Term dates from academic_terms
    const termDates = await query(
      `SELECT start_date, end_date FROM academic_terms
       WHERE term_name ILIKE $1 AND academic_year = $2 AND tenant_id = $3 LIMIT 1`,
      [rc.term, rc.academic_year, rc.tenant_id]
    ).catch(() => []);
    const nextTermDates = await query(
      `SELECT start_date FROM academic_terms
       WHERE tenant_id = $1 AND (start_date > $2) ORDER BY start_date ASC LIMIT 1`,
      [rc.tenant_id, termDates[0]?.end_date || new Date()]
    ).catch(() => []);

    // Fee breakdown: pending/partial/overdue invoices for this student
    const feeBreakdown = await query(
      `SELECT
         COALESCE(fi.description, fs.name, 'School Fee') AS fee_name,
         COALESCE(fs.is_transport_fee, FALSE) AS is_transport_fee,
         SUM(fi.total_amount) AS total_amount,
         SUM(COALESCE(fi.paid_amount, 0)) AS paid_amount,
         SUM(fi.balance_amount) AS balance_amount,
         MIN(fi.due_date) AS due_date,
         COUNT(*) AS invoice_count,
         STRING_AGG(DISTINCT fi.status, ', ') AS statuses
       FROM fee_invoices fi
       LEFT JOIN fee_structure fs ON fs.id = fi.fee_structure_id
       WHERE fi.student_id = $1
         AND fi.tenant_id = $2
         AND fi.status IN ('pending', 'partial', 'overdue')
       GROUP BY COALESCE(fi.description, fs.name, 'School Fee'), COALESCE(fs.is_transport_fee, FALSE)
       ORDER BY is_transport_fee, fee_name`,
      [rc.student_id, rc.tenant_id]
    );

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
    res.json({ success: true, data: {
      ...rc,
      class_teacher_name: classTeacherName,
      term_end_date: fmtDate(termDates[0]?.end_date),
      next_term_start_date: fmtDate(nextTermDates[0]?.start_date),
      competencies,
      fee_breakdown: feeBreakdown,
    } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/report-cards/:id/share — send report card to parent via email and/or WhatsApp
router.post('/report-cards/:id/share', authenticate, async (req, res) => {
  try {
    const { channels = ['email'] } = req.body; // channels: ['email', 'whatsapp']
    const tid = req.user.tenant_id;

    // Load report card with parent contacts + school name
    // Check both direct parent_id link and parent_students junction table
    const rows = await query(
      `SELECT rc.*,
       s.first_name||' '||s.last_name AS student_name,
       s.admission_number,
       c.name AS class_name,
       COALESCE(p.first_name||' '||p.last_name, p2.first_name||' '||p2.last_name) AS guardian_name,
       COALESCE(p.phone_primary, p2.phone_primary) AS guardian_phone,
       COALESCE(pu.email, pu2.email) AS guardian_email,
       t.name AS school_name
       FROM cbc_report_cards rc
       JOIN students s ON s.id = rc.student_id
       JOIN classes c ON c.id = rc.class_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
       LEFT JOIN parent_students ps ON ps.student_id = s.id
       LEFT JOIN parents p2 ON p2.id = ps.parent_id AND p2.id != COALESCE(s.parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
       LEFT JOIN users pu2 ON pu2.id = p2.user_id
       LEFT JOIN tenants t ON t.id = rc.tenant_id
       WHERE rc.id = $1 AND rc.tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report card not found' });

    const rc = rows[0];
    const termLabel = (rc.term || '').replace('term', 'Term ');
    const gradeLabel = rc.overall_grade
      ? `${rc.overall_grade} (${
          rc.overall_grade === 'EE' ? 'Exceeding Expectations' :
          rc.overall_grade === 'ME' ? 'Meeting Expectations' :
          rc.overall_grade === 'AE' ? 'Approaching Expectations' :
          rc.overall_grade === 'BE' ? 'Below Expectations' : rc.overall_grade
        })`
      : 'Not yet graded';

    const results = {};

    // ── Email ────────────────────────────────────────────────────────────────
    if (channels.includes('email') && rc.guardian_email) {
      const emailResult = await sendEmail(rc.guardian_email, 'reportCard', {
        guardianName: rc.guardian_name || 'Parent/Guardian',
        studentName: rc.student_name,
        className: rc.class_name,
        term: termLabel,
        academicYear: rc.academic_year,
        overallGrade: gradeLabel,
        daysPresent: rc.days_present ?? 'N/A',
        daysAbsent: rc.days_absent ?? 'N/A',
        teacherComment: rc.class_teacher_comment || '',
        schoolName: rc.school_name || 'the school',
        loginUrl: process.env.FRONTEND_URL || 'https://skulmanager.org/login',
      });
      results.email = emailResult;
    } else if (channels.includes('email')) {
      results.email = { success: false, error: 'No email address registered for this parent' };
    }

    // ── WhatsApp (return data for client-side wa.me link) ────────────────────
    if (channels.includes('whatsapp')) {
      if (rc.guardian_phone) {
        // Normalise phone to international format (Kenya +254)
        let phone = rc.guardian_phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '254' + phone.slice(1);
        else if (!phone.startsWith('254')) phone = '254' + phone;

        const message =
          `Dear ${rc.guardian_name || 'Parent/Guardian'},\n\n` +
          `${rc.student_name}'s CBC Report Card for ${termLabel} ${rc.academic_year} is ready.\n\n` +
          `📚 Class: ${rc.class_name}\n` +
          `🏅 Overall Grade: ${gradeLabel}\n` +
          `✅ Days Present: ${rc.days_present ?? 'N/A'}\n` +
          (rc.class_teacher_comment ? `\n💬 Teacher's Comment:\n"${rc.class_teacher_comment}"\n` : '') +
          `\nPlease log in to SkulManager to view the full report card:\n` +
          `${process.env.FRONTEND_URL || 'https://skulmanager.org/login'}\n\n` +
          `${rc.school_name || 'School Management'}`;

        results.whatsapp = {
          success: true,
          phone,
          waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        };
      } else {
        results.whatsapp = { success: false, error: 'No phone number registered for this parent' };
      }
    }

    // Mark report card as shared (update shared_at timestamp if column exists, otherwise skip)
    await query(
      `UPDATE cbc_report_cards SET updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    ).catch(() => {}); // non-fatal

    res.json({ success: true, results });
  } catch (err) {
    logger.error('Share report card error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/report-cards (create or upsert)
router.post('/report-cards', authenticate, async (req, res) => {
  try {
    const {
      student_id, class_id, term, academic_year,
      overall_grade, days_present, days_absent, days_late,
      learning_areas, values_citizenship, co_curricular,
      class_teacher_comment, head_teacher_comment
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO cbc_report_cards
       (student_id, class_id, term, academic_year, overall_grade,
        days_present, days_absent, days_late, learning_areas,
        values_citizenship, co_curricular, class_teacher_comment,
        head_teacher_comment, class_teacher_id, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (student_id, term, academic_year)
       DO UPDATE SET overall_grade=$5, days_present=$6, days_absent=$7,
       days_late=$8, learning_areas=$9, values_citizenship=$10,
       co_curricular=$11, class_teacher_comment=$12, head_teacher_comment=$13,
       class_teacher_id=$14, updated_at=NOW()
       RETURNING *`,
      [student_id, class_id, term, academic_year, overall_grade,
       days_present || 0, days_absent || 0, days_late || 0,
       JSON.stringify(learning_areas || {}),
       JSON.stringify(values_citizenship || {}),
       JSON.stringify(co_curricular || {}),
       class_teacher_comment, head_teacher_comment, req.user.id, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create report card error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/report-cards/:id/publish
router.put('/report-cards/:id/publish', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `UPDATE cbc_report_cards SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/report-cards/:id/acknowledge (parent acknowledges)
router.put('/report-cards/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    const rows = await query(
      `UPDATE cbc_report_cards SET status='acknowledged', parent_acknowledged_at=NOW(),
       parent_comment=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [comment || null, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// PORTFOLIOS
// ============================================================

// GET /api/v1/cbc/portfolios?student_id=&subject_id=&term=&academic_year=
router.get('/portfolios', authenticate, async (req, res) => {
  try {
    const { student_id, subject_id, term, academic_year } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT p.*, sub.name as subject_name,
               s.first_name||' '||s.last_name as student_name
               FROM student_portfolios p
               JOIN students s ON s.id = p.student_id
               LEFT JOIN subjects sub ON sub.id = p.subject_id
               WHERE p.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND p.student_id = $${params.length+1}`; params.push(student_id); }
    if (subject_id) { sql += ` AND p.subject_id = $${params.length+1}`; params.push(subject_id); }
    if (term) { sql += ` AND p.term = $${params.length+1}`; params.push(term); }
    if (academic_year) { sql += ` AND p.academic_year = $${params.length+1}`; params.push(academic_year); }
    sql += ' ORDER BY p.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/portfolios
router.post('/portfolios', authenticate, async (req, res) => {
  try {
    const { student_id, subject_id, strand_id, title, description, evidence_type, file_url, term, academic_year } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO student_portfolios
       (student_id, subject_id, strand_id, title, description, evidence_type, file_url, term, academic_year, teacher_id, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [student_id, subject_id, strand_id || null, title, description, evidence_type, file_url, term, academic_year, req.user.id, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbc/portfolios/:id
router.delete('/portfolios/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM student_portfolios WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ACADEMIC TERMS
// ============================================================

// GET /api/v1/cbc/terms
router.get('/terms', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT * FROM academic_terms WHERE tenant_id = $1 ORDER BY academic_year DESC, term ASC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/cbc/terms/current
router.get('/terms/current', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT * FROM academic_terms WHERE tenant_id = $1 AND is_current = TRUE LIMIT 1`,
      [tid]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbc/terms
router.post('/terms', authenticate, async (req, res) => {
  try {
    const {
      academic_year, term, term_name, start_date, end_date,
      midterm_break_start, midterm_break_end,
      end_term_exams_start, end_term_exams_end, reopening_date, is_current
    } = req.body;
    const tid = req.user.tenant_id;
    // If setting as current, unset others first
    if (is_current) {
      await query('UPDATE academic_terms SET is_current=FALSE WHERE tenant_id=$1', [tid]);
    }
    const rows = await query(
      `INSERT INTO academic_terms
       (academic_year, term, term_name, start_date, end_date,
        midterm_break_start, midterm_break_end,
        end_term_exams_start, end_term_exams_end, reopening_date, is_current, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (academic_year, term, tenant_id) DO UPDATE
       SET term_name=$3, start_date=$4, end_date=$5,
       midterm_break_start=$6, midterm_break_end=$7,
       end_term_exams_start=$8, end_term_exams_end=$9,
       reopening_date=$10, is_current=$11
       RETURNING *`,
      [academic_year, term, term_name, start_date, end_date,
       midterm_break_start || null, midterm_break_end || null,
       end_term_exams_start || null, end_term_exams_end || null,
       reopening_date || null, is_current || false, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create term error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbc/terms/:id/set-current
router.put('/terms/:id/set-current', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('UPDATE academic_terms SET is_current=FALSE WHERE tenant_id=$1', [tid]);
    const rows = await query(
      'UPDATE academic_terms SET is_current=TRUE WHERE id=$1 RETURNING *', [req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// CBC GRADE SUMMARY FOR CLASS (bulk report)
// ============================================================

// GET /api/v1/cbc/class-summary/:classId?term=&academic_year=
router.get('/class-summary/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { term, academic_year } = req.query;
    const tid = req.user.tenant_id;
    const students = await query(
      `SELECT s.id, s.first_name||' '||s.last_name as name, s.admission_number,
       s.nemis_number
       FROM students s WHERE s.class_id = $1 AND s.tenant_id = $2
       ORDER BY s.first_name`, [classId, tid]
    );
    const summaries = await query(
      `SELECT cs.*, sub.name as subject_name FROM student_competency_summary cs
       JOIN subjects sub ON sub.id = cs.subject_id
       WHERE cs.class_id = $1 AND cs.term = $2 AND cs.academic_year = $3
       AND cs.tenant_id = $4`,
      [classId, term, academic_year, tid]
    );
    // Organize summaries by student
    const byStudent = {};
    for (const s of students) {
      byStudent[s.id] = { ...s, subjects: [] };
    }
    for (const sm of summaries) {
      if (byStudent[sm.student_id]) {
        byStudent[sm.student_id].subjects.push(sm);
      }
    }
    res.json({ success: true, data: Object.values(byStudent) });
  } catch (err) {
    logger.error('Class summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
