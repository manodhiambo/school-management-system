import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Helper: compute CBE grade from percentage and education level
function computeCBEGrade(percentage, level) {
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
  // Standard CBE for lower_primary, upper_primary, senior_secondary
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

function cbeGradeLabel(grade) {
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

// GET /api/v1/cbe/strands?subject_id=&education_level=
router.get('/strands', authenticate, requireModule('academics'), async (req, res) => {
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

// POST /api/v1/cbe/strands
router.post('/strands', authenticate, requireModule('academics'), async (req, res) => {
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

// PUT /api/v1/cbe/strands/:id
router.put('/strands/:id', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { name, code, education_level, order_index } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE cbc_strands SET name=$1, code=$2, education_level=$3, order_index=$4 WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [name, code, education_level, order_index || 0, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbe/strands/:id
router.delete('/strands/:id', authenticate, requireModule('academics'), async (req, res) => {
  try {
    await query('DELETE FROM cbc_strands WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]);
    res.json({ success: true, message: 'Strand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// SUB-STRANDS
// ============================================================

// GET /api/v1/cbe/sub-strands?strand_id=
router.get('/sub-strands', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { strand_id } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT ss.*, s.name as strand_name FROM cbc_sub_strands ss
               JOIN cbc_strands s ON s.id = ss.strand_id WHERE s.tenant_id = $1`;
    const params = [tid];
    if (strand_id) { sql += ` AND ss.strand_id = $${params.length + 1}`; params.push(strand_id); }
    sql += ' ORDER BY ss.order_index, ss.name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbe/sub-strands
router.post('/sub-strands', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { strand_id, name, code, order_index } = req.body;
    const tid = req.user.tenant_id;
    // Verify the parent strand belongs to this tenant
    const strand = await query('SELECT id FROM cbc_strands WHERE id=$1 AND tenant_id=$2', [strand_id, tid]);
    if (!strand.length) return res.status(403).json({ success: false, message: 'Strand not found' });
    const rows = await query(
      `INSERT INTO cbc_sub_strands (strand_id, name, code, order_index) VALUES ($1,$2,$3,$4) RETURNING *`,
      [strand_id, name, code, order_index || 0]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbe/sub-strands/:id
router.put('/sub-strands/:id', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { name, code, order_index } = req.body;
    const tid = req.user.tenant_id;
    // Sub-strands have no tenant_id; scope by parent strand's tenant_id
    const rows = await query(
      `UPDATE cbc_sub_strands SET name=$1, code=$2, order_index=$3
       WHERE id=$4 AND strand_id IN (SELECT id FROM cbc_strands WHERE tenant_id=$5) RETURNING *`,
      [name, code, order_index || 0, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbe/sub-strands/:id
router.delete('/sub-strands/:id', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query(
      'DELETE FROM cbc_sub_strands WHERE id=$1 AND strand_id IN (SELECT id FROM cbc_strands WHERE tenant_id=$2)',
      [req.params.id, tid]
    );
    res.json({ success: true, message: 'Sub-strand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ASSESSMENTS
// ============================================================

// GET /api/v1/cbe/assessments?student_id=&class_id=&subject_id=&term=&academic_year=
router.get('/assessments', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { student_id, class_id, subject_id, term, academic_year } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT a.*, s.first_name||' '||s.last_name as student_name,
               sub.name as subject_name, st.name as strand_name,
               UPPER(t.first_name || ' ' || t.last_name) AS teacher_name
               FROM cbc_assessments a
               JOIN students s ON s.id = a.student_id
               JOIN subjects sub ON sub.id = a.subject_id
               LEFT JOIN cbc_strands st ON st.id = a.strand_id
               LEFT JOIN teachers t ON t.user_id = a.teacher_id
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

// POST /api/v1/cbe/assessments
router.post('/assessments', authenticate, requireModule('academics'), async (req, res) => {
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
        pre_primary_grade = computeCBEGrade(pct, education_level);
      } else {
        cbc_grade = computeCBEGrade(pct, education_level || 'lower_primary');
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

// PUT /api/v1/cbe/assessments/:id — admin or teacher who created it
router.put('/assessments/:id', authenticate, requireModule('academics'), async (req, res) => {
  if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  // Teachers can only edit their own assessments
  if (req.user.role === 'teacher') {
    const existing = await query('SELECT teacher_id FROM cbc_assessments WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]);
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
        ppGrade = computeCBEGrade(pct, education_level);
      } else {
        grade = computeCBEGrade(pct, education_level || 'lower_primary');
      }
    }
    if (!result_code && grade) grade_pts = gradePoints(grade);
    const finalGrade = grade || ppGrade;
    const finalComment = teacher_comments || (finalGrade ? autoComment(finalGrade) : null);
    const rows = await query(
      `UPDATE cbc_assessments SET score=$1, max_score=$2, cbc_grade=$3, pre_primary_grade=$4,
       teacher_comments=$5, exam_period=$6, result_code=$7, grade_points=$8, updated_at=NOW()
       WHERE id=$9 AND tenant_id=$10 RETURNING *`,
      [result_code ? null : (score || null), max_score || null, result_code ? null : grade, result_code ? null : ppGrade,
       finalComment, exam_period || null, result_code || null, result_code ? null : grade_pts,
       req.params.id, req.user.tenant_id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/cbe/assessments/:id — admin or teacher who created it
router.delete('/assessments/:id', authenticate, requireModule('academics'), async (req, res) => {
  if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  if (req.user.role === 'teacher') {
    const existing = await query('SELECT teacher_id FROM cbc_assessments WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]);
    if (!existing.length || existing[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own assessments' });
    }
  }
  try {
    await query('DELETE FROM cbc_assessments WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]);
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// COMPETENCY SUMMARY (per student per subject per term)
// ============================================================

// GET /api/v1/cbe/competency-summary?student_id=&term=&academic_year=
router.get('/competency-summary', authenticate, requireModule('academics'), async (req, res) => {
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

// POST /api/v1/cbe/competency-summary (upsert)
router.post('/competency-summary', authenticate, requireModule('academics'), async (req, res) => {
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

// GET /api/v1/cbe/report-cards/my — student fetches their own published report cards
router.get('/report-cards/my', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    // Resolve user_id → students.id
    const studentRows = await query(
      'SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2 LIMIT 1',
      [req.user.id, tid]
    );
    if (!studentRows.length) return res.json({ success: true, data: [] });
    const studentId = studentRows[0].id;

    const rows = await query(
      `SELECT rc.*,
              s.first_name||' '||s.last_name AS student_name,
              s.admission_number, c.name AS class_name
       FROM cbc_report_cards rc
       JOIN students s ON s.id = rc.student_id
       JOIN classes c ON c.id = rc.class_id
       WHERE rc.student_id = $1 AND rc.tenant_id = $2
         AND rc.status IN ('published','acknowledged')
       ORDER BY rc.academic_year DESC, rc.term`,
      [studentId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get my report cards error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/cbe/report-cards?student_id=&term=&academic_year=&class_id=
// When class_id is provided, returns ALL students in that class (LEFT JOIN) so students without
// a report card yet still appear in the list.
router.get('/report-cards', authenticate, requireModule('academics'), async (req, res) => {
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

// POST /api/v1/cbe/report-cards/generate — bulk-create draft report cards for all students in a class
router.post('/report-cards/generate', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { class_id, term, academic_year, closing_date, opening_date } = req.body;
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
      if (existing.length) {
        // Update closing/opening dates if provided
        if (closing_date || opening_date) {
          await query(
            `UPDATE cbc_report_cards SET closing_date=COALESCE($1, closing_date), opening_date=COALESCE($2, opening_date), updated_at=NOW()
             WHERE student_id=$3 AND class_id=$4 AND term=$5 AND academic_year=$6 AND tenant_id=$7`,
            [closing_date || null, opening_date || null, s.id, class_id, term, academic_year, tid]
          );
        }
        continue;
      }

      await query(
        `INSERT INTO cbc_report_cards (id, tenant_id, student_id, class_id, term, academic_year, closing_date, opening_date, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',NOW(),NOW())`,
        [uuidv4(), tid, s.id, class_id, term, academic_year, closing_date || null, opening_date || null]
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
router.get('/report-cards/:id', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT rc.*,
       s.first_name||' '||s.last_name AS student_name,
       s.admission_number, s.date_of_birth, s.nemis_number,
       s.profile_photo_url,
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
       WHERE rc.id = $1 AND rc.tenant_id = $2`, [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    // Students may only view their own published/acknowledged report cards
    if (req.user.role === 'student') {
      const studentRows = await query(
        'SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2 LIMIT 1',
        [req.user.id, req.user.tenant_id]
      );
      const studentId = studentRows[0]?.id;
      if (rows[0].student_id !== studentId || !['published','acknowledged'].includes(rows[0].status)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    const rc = rows[0];
    const competencies = await query(
      `SELECT cs.*, sub.name as subject_name,
              UPPER(t.first_name || ' ' || t.last_name) AS teacher_name,
              CASE cs.overall_cbc_grade
                WHEN 'EE'  THEN 4 WHEN 'ME'  THEN 3 WHEN 'AE'  THEN 2 WHEN 'BE'  THEN 1
                WHEN 'WD'  THEN 4 WHEN 'D'   THEN 2 WHEN 'B'   THEN 1
                WHEN 'EE1' THEN 8 WHEN 'EE2' THEN 7
                WHEN 'ME1' THEN 6 WHEN 'ME2' THEN 5
                WHEN 'AE1' THEN 4 WHEN 'AE2' THEN 3
                WHEN 'BE1' THEN 2 WHEN 'BE2' THEN 1
                ELSE NULL
              END AS grade_points
       FROM student_competency_summary cs
       JOIN subjects sub ON sub.id = cs.subject_id
       LEFT JOIN class_subjects csj ON csj.class_id = $4 AND csj.subject_id = cs.subject_id
       LEFT JOIN teachers t ON t.user_id = csj.teacher_id
       WHERE cs.student_id = $1 AND cs.term = $2 AND cs.academic_year = $3`,
      [rc.student_id, rc.term, rc.academic_year, rc.class_id]
    );

    // If student_competency_summary is empty, fall back to cbc_assessments
    // (same data source used by Student Report page — ensures both pages show the same grades)
    let finalCompetencies = competencies;
    if (competencies.length === 0) {
      const gradePointMap = {
        EE:4, ME:3, AE:2, BE:1, WD:4, D:2, B:1,
        EE1:8, EE2:7, ME1:6, ME2:5, AE1:4, AE2:3, BE1:2, BE2:1,
      };
      const fallback = await query(
        `SELECT
           a.subject_id,
           sub.name AS subject_name,
           UPPER(t.first_name || ' ' || t.last_name) AS teacher_name,
           SUM(COALESCE(a.score, 0))::numeric        AS total_score,
           SUM(COALESCE(a.max_score, 0))::numeric     AS max_score,
           CASE WHEN SUM(COALESCE(a.max_score, 0)) > 0
             THEN ROUND(
               SUM(COALESCE(a.score, 0))::numeric /
               SUM(COALESCE(a.max_score, 0))::numeric * 100, 2)
             ELSE NULL END                            AS percentage,
           (SELECT a2.cbc_grade FROM cbc_assessments a2
            WHERE a2.student_id = $1 AND a2.subject_id = a.subject_id
              AND a2.term = $2 AND a2.academic_year = $3 AND a2.tenant_id = $5
              AND a2.cbc_grade IS NOT NULL
            ORDER BY a2.assessment_date DESC LIMIT 1) AS overall_cbc_grade,
           (SELECT a2.pre_primary_grade FROM cbc_assessments a2
            WHERE a2.student_id = $1 AND a2.subject_id = a.subject_id
              AND a2.term = $2 AND a2.academic_year = $3 AND a2.tenant_id = $5
              AND a2.pre_primary_grade IS NOT NULL
            ORDER BY a2.assessment_date DESC LIMIT 1) AS pre_primary_grade
         FROM cbc_assessments a
         JOIN subjects sub ON sub.id = a.subject_id
         LEFT JOIN class_subjects csj ON csj.class_id = $4 AND csj.subject_id = a.subject_id
         LEFT JOIN teachers t ON t.user_id = csj.teacher_id
         WHERE a.student_id = $1 AND a.term = $2 AND a.academic_year = $3 AND a.tenant_id = $5
         GROUP BY a.subject_id, sub.name, t.first_name, t.last_name
         ORDER BY sub.name`,
        [rc.student_id, rc.term, rc.academic_year, rc.class_id, rc.tenant_id]
      ).catch(() => []);

      finalCompetencies = fallback.map(r => ({
        ...r,
        grade_points: gradePointMap[r.overall_cbc_grade || r.pre_primary_grade || ''] ?? null,
      }));
    }

    // Class teacher name (teacher marked as class teacher for this class)
    const classTeacherRows = await query(
      `SELECT UPPER(t.first_name || ' ' || t.last_name) AS name
       FROM teachers t WHERE t.class_id = $1 AND t.is_class_teacher = TRUE AND t.tenant_id = $2 LIMIT 1`,
      [rc.class_id, rc.tenant_id]
    ).catch(() => []);
    const classTeacherName = classTeacherRows[0]?.name || null;

    // Head teacher / principal name (teacher linked to an admin user for this tenant)
    const headTeacherRows = await query(
      `SELECT UPPER(t.first_name || ' ' || t.last_name) AS name
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.tenant_id = $1 AND u.role = 'admin'
       ORDER BY t.created_at ASC LIMIT 1`,
      [rc.tenant_id]
    ).catch(() => []);
    const headTeacherName = headTeacherRows[0]?.name || null;

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

    // Fee breakdown for this term/year:
    //   Part 1 — invoices already issued (filtered to current term/year when term column is set)
    //   Part 2 — fee_structure entries applicable to this student/class that have NO invoice yet
    //            (ensures school-wide fees like exam fee always appear even if not yet billed)
    const feeBreakdown = await query(
      `SELECT fee_name, is_transport_fee, route_name,
              SUM(total_amount) AS total_amount,
              SUM(paid_amount)  AS paid_amount,
              SUM(balance_amount) AS balance_amount,
              MIN(due_date) AS due_date,
              STRING_AGG(DISTINCT statuses, ', ') AS statuses
       FROM (
         -- Issued invoices (current term/year when term is recorded, else all)
         SELECT
           COALESCE(fs.name, fi.description, 'School Fee') AS fee_name,
           COALESCE(fs.is_transport_fee, FALSE) AS is_transport_fee,
           COALESCE(tr.route_name, '') AS route_name,
           fi.total_amount,
           COALESCE(fi.paid_amount, 0) AS paid_amount,
           fi.balance_amount,
           fi.due_date,
           fi.status AS statuses
         FROM fee_invoices fi
         LEFT JOIN fee_structure fs ON fs.id = fi.fee_structure_id AND fs.tenant_id = $2
         LEFT JOIN transport_routes tr ON tr.id = fs.route_id
         WHERE fi.student_id = $1
           AND fi.tenant_id = $2
           AND fi.status NOT IN ('cancelled')
           AND (fi.term IS NULL OR fi.term = $3)
           AND (fi.academic_year IS NULL OR fi.academic_year = $4)

         UNION ALL

         -- Applicable fee structures with NO invoice for this student in this term/year.
         -- Excludes auto-managed extra-fee structures (shown via extra_fees section below).
         SELECT
           fs.name AS fee_name,
           COALESCE(fs.is_transport_fee, FALSE) AS is_transport_fee,
           COALESCE(tr.route_name, '') AS route_name,
           fs.amount AS total_amount,
           0 AS paid_amount,
           fs.amount AS balance_amount,
           NULL AS due_date,
           'not invoiced' AS statuses
         FROM fee_structure fs
         LEFT JOIN transport_routes tr ON tr.id = fs.route_id
         JOIN students stu ON stu.id = $1 AND stu.tenant_id = $2
         WHERE fs.tenant_id = $2
           AND fs.is_active = TRUE
           AND (fs.academic_year IS NULL OR fs.academic_year = $4)
           AND fs.extra_fee_id IS NULL
           AND (fs.class_id IS NULL OR fs.class_id = stu.class_id)
           -- Student type: all, exact match, null student_type, or hostel-assigned boarder
           AND (
             fs.student_type = 'all'
             OR fs.student_type = stu.student_type
             OR stu.student_type IS NULL
             OR (fs.student_type = 'boarder' AND EXISTS (
               SELECT 1 FROM student_hostel sh
               WHERE sh.student_id = stu.id
                 AND sh.is_active = TRUE
                 AND (sh.term IS NULL OR sh.term = $3)
                 AND (sh.academic_year IS NULL OR sh.academic_year = $4)
             ))
           )
           -- Transport fees only for students with an active route assignment
           AND (
             COALESCE(fs.is_transport_fee, FALSE) = FALSE
             OR EXISTS (
               SELECT 1 FROM student_transport st
               WHERE st.student_id = $1
                 AND (fs.route_id IS NULL OR st.route_id = fs.route_id)
                 AND st.is_active = TRUE
             )
           )
           AND NOT EXISTS (
             SELECT 1 FROM fee_invoices fi2
             WHERE fi2.fee_structure_id = fs.id
               AND fi2.student_id = $1
               AND fi2.tenant_id = $2
               AND (fi2.term IS NULL OR fi2.term = $3)
               AND (fi2.academic_year IS NULL OR fi2.academic_year = $4)
               AND fi2.status NOT IN ('cancelled')
           )
       ) sub
       GROUP BY fee_name, is_transport_fee, route_name
       ORDER BY is_transport_fee, fee_name`,
      [rc.student_id, rc.tenant_id, rc.term, rc.academic_year]
    );

    // If no transport row in invoices, check direct student transport assignment
    const hasTransportInvoice = feeBreakdown.some(r => r.is_transport_fee);
    if (!hasTransportInvoice) {
      const transportAssignment = await query(
        `SELECT st.student_id, tr.route_name, tr.term_fee
         FROM student_transport st
         JOIN transport_routes tr ON tr.id = st.route_id AND tr.tenant_id = $2
         WHERE st.student_id = $1 AND st.tenant_id = $2 AND st.is_active = TRUE LIMIT 1`,
        [rc.student_id, rc.tenant_id]
      ).catch(() => []);
      if (transportAssignment.length > 0) {
        const ta = transportAssignment[0];
        const termFee = parseFloat(ta.term_fee) || 0;
        feeBreakdown.push({
          fee_name: `Transport — ${ta.route_name}`,
          is_transport_fee: true,
          route_name: ta.route_name,
          total_amount: termFee,
          paid_amount: 0,
          balance_amount: termFee,
          due_date: null,
          statuses: 'no invoice',
        });
      }
    }

    // Extra fees: class-level + student-level.
    // Excludes any extra fees that are already covered by an invoice (via the auto-created
    // fee_structure link or the legacy extra_fee_id column) to prevent double-counting.
    const extraFees = await query(
      `SELECT ef.name AS fee_name, ef.amount AS total_amount, 0 AS paid_amount, ef.amount AS balance_amount,
              FALSE AS is_transport_fee, '' AS route_name, TRUE AS is_extra_fee
       FROM extra_fees ef
       WHERE ef.tenant_id = $1
         AND ef.is_active = TRUE
         AND (ef.student_id = $2 OR (ef.class_id = $3 AND ef.student_id IS NULL))
         AND (ef.term IS NULL OR ef.term = $4)
         AND (ef.academic_year IS NULL OR ef.academic_year = $5)
         -- Not already invoiced via auto-created fee_structure link
         AND NOT EXISTS (
           SELECT 1 FROM fee_invoices fi_ef
           JOIN fee_structure fs_ef ON fs_ef.id = fi_ef.fee_structure_id AND fs_ef.tenant_id = $1
           WHERE fi_ef.student_id = $2 AND fi_ef.tenant_id = $1
             AND fi_ef.status NOT IN ('cancelled')
             AND (fi_ef.term IS NULL OR fi_ef.term = $4)
             AND (fi_ef.academic_year IS NULL OR fi_ef.academic_year = $5)
             AND fs_ef.extra_fee_id = ef.id
         )
         -- Not already invoiced via legacy extra_fee_id column
         AND NOT EXISTS (
           SELECT 1 FROM fee_invoices fi_ef2
           WHERE fi_ef2.student_id = $2 AND fi_ef2.tenant_id = $1
             AND fi_ef2.extra_fee_id = ef.id
             AND fi_ef2.status NOT IN ('cancelled')
             AND (fi_ef2.term IS NULL OR fi_ef2.term = $4)
             AND (fi_ef2.academic_year IS NULL OR fi_ef2.academic_year = $5)
         )
         -- Not already covered by a fee_structure invoice with the same name (prevents duplicates)
         AND NOT EXISTS (
           SELECT 1 FROM fee_invoices fi_ef3
           JOIN fee_structure fs_ef3 ON fs_ef3.id = fi_ef3.fee_structure_id AND fs_ef3.tenant_id = $1
           WHERE fi_ef3.student_id = $2 AND fi_ef3.tenant_id = $1
             AND fi_ef3.status NOT IN ('cancelled')
             AND (fi_ef3.term IS NULL OR fi_ef3.term = $4)
             AND (fi_ef3.academic_year IS NULL OR fi_ef3.academic_year = $5)
             AND LOWER(TRIM(fs_ef3.name)) = LOWER(TRIM(ef.name))
         )
       ORDER BY ef.student_id NULLS LAST, ef.name`,
      [rc.tenant_id, rc.student_id, rc.class_id, rc.term, rc.academic_year]
    ).catch(() => []);

    // Final deduplication: remove extra_fee entries whose name already appears in feeBreakdown
    const feeBreakdownNames = new Set(feeBreakdown.map(f => (f.fee_name || '').toLowerCase().trim()));
    const dedupedExtraFees = extraFees.filter(ef => !feeBreakdownNames.has((ef.fee_name || '').toLowerCase().trim()));

    const allFees = [...feeBreakdown, ...dedupedExtraFees];

    // ── Class rank for this student ────────────────────────────────────────────
    let classRank = null;
    let totalInClass = null;
    try {
      // Try student_competency_summary first (same source as competency display)
      const rankRows = await query(
        `SELECT cs.student_id, SUM(COALESCE(cs.percentage, 0)) AS total_pct
         FROM student_competency_summary cs
         JOIN students st ON st.id = cs.student_id AND st.status = 'active'
         WHERE cs.tenant_id = $1 AND cs.class_id = $2 AND cs.term = $3 AND cs.academic_year = $4
         GROUP BY cs.student_id
         ORDER BY total_pct DESC`,
        [rc.tenant_id, rc.class_id, rc.term, rc.academic_year]
      ).catch(() => []);

      let rankSource = rankRows;

      if (!rankSource.length) {
        // Fall back to cbc_assessments aggregated per student
        rankSource = await query(
          `SELECT a.student_id,
                  SUM(CASE WHEN a.max_score > 0 THEN (COALESCE(a.score,0) / a.max_score * 100) ELSE 0 END) AS total_pct
           FROM cbc_assessments a
           JOIN students st ON st.id = a.student_id AND st.status = 'active'
           WHERE a.tenant_id = $1 AND a.class_id = $2 AND a.term = $3 AND a.academic_year = $4
           GROUP BY a.student_id
           ORDER BY total_pct DESC`,
          [rc.tenant_id, rc.class_id, rc.term, rc.academic_year]
        ).catch(() => []);
      }

      if (rankSource.length) {
        totalInClass = rankSource.length;
        let rank = 1;
        for (let i = 0; i < rankSource.length; i++) {
          if (i > 0 && parseFloat(rankSource[i].total_pct) < parseFloat(rankSource[i - 1].total_pct)) {
            rank = i + 1;
          }
          if (rankSource[i].student_id === rc.student_id) {
            classRank = rank;
            break;
          }
        }
      }
    } catch (_) { /* non-critical */ }

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
    // Prefer explicitly stored dates; fall back to academic_terms lookup
    const termEndDate = rc.closing_date ? fmtDate(rc.closing_date) : fmtDate(termDates[0]?.end_date);
    const nextTermStartDate = rc.opening_date ? fmtDate(rc.opening_date) : fmtDate(nextTermDates[0]?.start_date);
    res.json({ success: true, data: {
      ...rc,
      class_teacher_name: classTeacherName,
      head_teacher_name: headTeacherName,
      term_end_date: termEndDate,
      next_term_start_date: nextTermStartDate,
      competencies: finalCompetencies,
      fee_breakdown: allFees,
      class_rank: classRank,
      total_in_class: totalInClass,
    } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cbe/report-cards/:id/share — send report card to parent via email and/or WhatsApp
router.post('/report-cards/:id/share', authenticate, requireModule('academics'), async (req, res) => {
  try {
    // channels: ['email', 'whatsapp']
    // override_email / override_phone / override_name let the sender specify a custom recipient
    const { channels = ['email'], override_email, override_phone, override_name } = req.body;
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
    // Use override contacts if provided, fall back to registered parent contacts
    const toName  = (override_name  || '').trim() || rc.guardian_name  || 'Parent/Guardian';
    const toEmail = (override_email || '').trim() || rc.guardian_email || null;
    const toPhone = (override_phone || '').trim() || rc.guardian_phone || null;

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
    if (channels.includes('email')) {
      if (toEmail) {
        const emailResult = await sendEmail(toEmail, 'reportCard', {
          guardianName: toName,
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
      } else {
        results.email = { success: false, error: 'No email address provided' };
      }
    }

    // ── WhatsApp (return wa.me link for client to open) ───────────────────────
    if (channels.includes('whatsapp')) {
      if (toPhone) {
        // Normalise phone to international format (Kenya +254)
        let phone = toPhone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '254' + phone.slice(1);
        else if (!phone.startsWith('254') && phone.length <= 9) phone = '254' + phone;

        const message =
          `Dear ${toName},\n\n` +
          `${rc.student_name}'s CBE Report Card for ${termLabel} ${rc.academic_year} is ready.\n\n` +
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
        results.whatsapp = { success: false, error: 'No phone number provided' };
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

// POST /api/v1/cbe/report-cards (create or upsert)
router.post('/report-cards', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const {
      student_id, class_id, term, academic_year,
      overall_grade, days_present, days_absent, days_late,
      learning_areas, values_citizenship, co_curricular,
      class_teacher_comment, head_teacher_comment,
      closing_date, opening_date
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO cbc_report_cards
       (student_id, class_id, term, academic_year, overall_grade,
        days_present, days_absent, days_late, learning_areas,
        values_citizenship, co_curricular, class_teacher_comment,
        head_teacher_comment, class_teacher_id, tenant_id, closing_date, opening_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (student_id, term, academic_year)
       DO UPDATE SET overall_grade=$5, days_present=$6, days_absent=$7,
       days_late=$8, learning_areas=$9, values_citizenship=$10,
       co_curricular=$11, class_teacher_comment=$12, head_teacher_comment=$13,
       class_teacher_id=$14, closing_date=COALESCE($16, cbc_report_cards.closing_date),
       opening_date=COALESCE($17, cbc_report_cards.opening_date), updated_at=NOW()
       RETURNING *`,
      [student_id, class_id, term, academic_year, overall_grade,
       days_present || 0, days_absent || 0, days_late || 0,
       JSON.stringify(learning_areas || {}),
       JSON.stringify(values_citizenship || {}),
       JSON.stringify(co_curricular || {}),
       class_teacher_comment, head_teacher_comment, req.user.id, tid,
       closing_date || null, opening_date || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create report card error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbe/report-cards/bulk-publish — publish multiple cards at once
// Must come before /:id routes so Express doesn't treat "bulk-publish" as an :id
router.put('/report-cards/bulk-publish', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const { ids, class_id, term, academic_year } = req.body;
    const tid = req.user.tenant_id;
    let rows;

    if (Array.isArray(ids) && ids.length > 0) {
      // Publish a specific list of IDs
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
      rows = await query(
        `UPDATE cbc_report_cards SET status='published', published_at=NOW(), updated_at=NOW()
         WHERE id IN (${placeholders}) AND tenant_id=$1 AND status='draft' RETURNING id`,
        [tid, ...ids]
      );
    } else if (class_id && term && academic_year) {
      // Publish all drafts for a class/term/year
      rows = await query(
        `UPDATE cbc_report_cards SET status='published', published_at=NOW(), updated_at=NOW()
         WHERE class_id=$2 AND term=$3 AND academic_year=$4 AND tenant_id=$1 AND status='draft' RETURNING id`,
        [tid, class_id, term, academic_year]
      );
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids[] or class_id + term + academic_year' });
    }

    res.json({ success: true, published: rows.length });
  } catch (err) {
    logger.error('Bulk publish error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbe/report-cards/:id/publish
router.put('/report-cards/:id/publish', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const rows = await query(
      `UPDATE cbc_report_cards SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cbe/report-cards/:id/acknowledge (parent acknowledges)
router.put('/report-cards/:id/acknowledge', authenticate, requireModule('academics'), async (req, res) => {
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

// GET /api/v1/cbe/portfolios?student_id=&subject_id=&term=&academic_year=
router.get('/portfolios', authenticate, requireModule('academics'), async (req, res) => {
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

// POST /api/v1/cbe/portfolios
router.post('/portfolios', authenticate, requireModule('academics'), async (req, res) => {
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

// DELETE /api/v1/cbe/portfolios/:id
router.delete('/portfolios/:id', authenticate, requireModule('academics'), async (req, res) => {
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

// GET /api/v1/cbe/terms
router.get('/terms', authenticate, requireModule('academics'), async (req, res) => {
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

// GET /api/v1/cbe/terms/current
router.get('/terms/current', authenticate, requireModule('academics'), async (req, res) => {
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

// POST /api/v1/cbe/terms
router.post('/terms', authenticate, requireModule('academics'), async (req, res) => {
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

// PUT /api/v1/cbe/terms/:id/set-current
router.put('/terms/:id/set-current', authenticate, requireModule('academics'), async (req, res) => {
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
// CBE GRADE SUMMARY FOR CLASS (bulk report)
// ============================================================

// GET /api/v1/cbe/class-summary/:classId?term=&academic_year=
router.get('/class-summary/:classId', authenticate, requireModule('academics'), async (req, res) => {
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

// ── BROADSHEET ─────────────────────────────────────────────────────────────
// GET /api/v1/cbe/broadsheet?class_id=&term=&academic_year=&exam_period=
// Returns a class-wide performance grid: students (rows) × subjects (columns)
router.get('/broadsheet', authenticate, requireModule('academics'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id, term, academic_year, exam_period } = req.query;
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id required' });
    const year = academic_year || new Date().getFullYear().toString();

    // All active students in this class
    const students = await query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.student_type
       FROM students s
       WHERE s.class_id = $1 AND s.tenant_id = $2 AND s.status = 'active'
       ORDER BY s.first_name, s.last_name`,
      [class_id, tid]
    );
    if (!students.length) return res.json({ success: true, data: { subjects: [], students: [] } });

    const studentIds = students.map(s => s.id);

    // Get the education level for this class (to pick the right grade scale)
    const classRow = await query(
      'SELECT education_level FROM classes WHERE id=$1 AND tenant_id=$2 LIMIT 1',
      [class_id, tid]
    );
    const educationLevel = classRow[0]?.education_level || '';

    const isJSS = educationLevel === 'junior_secondary';
    const isPrePrimary = ['playgroup', 'pp1', 'pp2', 'pre_primary'].includes(educationLevel);

    // JSS percentage → 8-level grade
    const pctToJssGrade = (pct) => {
      if (pct === null || pct === undefined) return '';
      if (pct >= 90) return 'EE1';
      if (pct >= 75) return 'EE2';
      if (pct >= 58) return 'ME1';
      if (pct >= 41) return 'ME2';
      if (pct >= 31) return 'AE1';
      if (pct >= 21) return 'AE2';
      if (pct >= 11) return 'BE1';
      return 'BE2';
    };

    // Grade code → midpoint percentage (fallback for ranking when percentage not stored)
    const gradeToMidPct = (g) => ({
      EE1: 95, EE2: 82, ME1: 66, ME2: 49, AE1: 35.5, AE2: 25.5, BE1: 15.5, BE2: 5.5,
      EE: 87.5, ME: 66, AE: 49, BE: 20,
      WD: 87.5, D: 49, B: 20,
    }[g] ?? null);

    // Grades from student_competency_summary (preferred, unless exam_period is specified) ─────
    let gradeRows = [];
    if (!exam_period) {
      let gradeParams = [tid, class_id, year];
      let gradeSql = `
        SELECT cs.student_id, sub.name AS subject_name, sub.id AS subject_id,
               cs.overall_cbc_grade AS overall_grade, cs.pre_primary_grade,
               cs.percentage, cs.total_score AS raw_score, cs.max_score AS raw_max
        FROM student_competency_summary cs
        JOIN subjects sub ON sub.id = cs.subject_id
        WHERE cs.tenant_id = $1 AND cs.class_id = $2 AND cs.academic_year = $3`;
      if (term) { gradeSql += ` AND cs.term = $${gradeParams.length + 1}`; gradeParams.push(term); }
      gradeSql += ' ORDER BY sub.name';
      gradeRows = await query(gradeSql, gradeParams);
    }

    // Fall back to (or use directly when exam_period set) cbc_assessments ─────
    if (!gradeRows.length) {
      let aParams = [tid, class_id, year];
      let aSql = `
        SELECT DISTINCT ON (a.student_id, sub.id)
               a.student_id, sub.name AS subject_name, sub.id AS subject_id,
               a.cbc_grade AS overall_grade, a.pre_primary_grade,
               CASE WHEN a.max_score > 0 THEN ROUND((a.score / a.max_score * 100)::numeric, 2) END AS percentage,
               a.score AS raw_score, a.max_score AS raw_max
        FROM cbc_assessments a
        JOIN subjects sub ON sub.id = a.subject_id
        WHERE a.tenant_id = $1 AND a.class_id = $2 AND a.academic_year = $3`;
      if (term) { aSql += ` AND a.term = $${aParams.length + 1}`; aParams.push(term); }
      if (exam_period) { aSql += ` AND a.exam_period = $${aParams.length + 1}`; aParams.push(exam_period); }
      aSql += ' ORDER BY a.student_id, sub.id, a.assessment_date DESC';
      gradeRows = await query(aSql, aParams);
    }

    // Build subject list (unique, ordered by name)
    const subjectMap = {};
    for (const r of gradeRows) subjectMap[r.subject_id] = r.subject_name;
    const subjects = Object.entries(subjectMap)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Map studentId → { subjectId → { grade, score } }
    const gradeMap = {};
    const scoreMap = {};
    for (const r of gradeRows) {
      if (!gradeMap[r.student_id]) { gradeMap[r.student_id] = {}; scoreMap[r.student_id] = {}; }

      let grade = '';
      let pct = r.percentage !== null && r.percentage !== undefined ? parseFloat(r.percentage) : null;

      if (isPrePrimary) {
        grade = r.pre_primary_grade || r.overall_grade || '';
      } else if (isJSS) {
        // For JSS: derive 8-level grade from percentage if available,
        // otherwise use stored grade (which may already be 8-level)
        if (pct !== null) {
          grade = pctToJssGrade(pct);
        } else {
          grade = r.overall_grade || '';
          // Back-compute a midpoint percentage from grade for ranking
          pct = gradeToMidPct(grade);
        }
      } else {
        grade = r.overall_grade || '';
        if (pct === null) pct = gradeToMidPct(grade);
      }

      gradeMap[r.student_id][r.subject_id] = grade;
      scoreMap[r.student_id][r.subject_id] = pct;
    }

    // Build student rows
    const resultStudents = students.map(s => {
      const grades = {};
      const scores = {};
      let totalPct = 0;
      let scoredCount = 0;

      for (const sub of subjects) {
        const g = gradeMap[s.id]?.[sub.id] || '';
        const pct = scoreMap[s.id]?.[sub.id] ?? null;
        grades[sub.id] = g;
        scores[sub.id] = pct !== null ? parseFloat(pct.toFixed(1)) : null;
        if (pct !== null) { totalPct += pct; scoredCount++; }
      }

      const meanPct = scoredCount > 0 ? parseFloat((totalPct / scoredCount).toFixed(2)) : 0;

      let overall = '';
      if (scoredCount > 0) {
        if (isJSS) {
          overall = pctToJssGrade(meanPct);
        } else if (isPrePrimary) {
          overall = meanPct >= 75 ? 'WD' : meanPct >= 40 ? 'D' : 'B';
        } else {
          overall = meanPct >= 80 ? 'EE' : meanPct >= 60 ? 'ME' : meanPct >= 40 ? 'AE' : 'BE';
        }
      }

      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        admission_number: s.admission_number,
        student_type: s.student_type,
        grades,
        scores,             // numeric percentages per subject
        overall,
        total_marks: parseFloat(totalPct.toFixed(1)),     // sum of subject percentages
        mean_score: meanPct,
        subjects_assessed: scoredCount,
      };
    });

    // Rank by total_marks descending (then mean_score for tie-break)
    resultStudents.sort((a, b) =>
      b.total_marks - a.total_marks || b.mean_score - a.mean_score
    );
    // Assign ranks (ties get same rank)
    let rank = 1;
    for (let i = 0; i < resultStudents.length; i++) {
      if (i > 0 && resultStudents[i].total_marks < resultStudents[i - 1].total_marks) {
        rank = i + 1;
      }
      resultStudents[i].rank = rank;
    }

    res.json({ success: true, data: { subjects, students: resultStudents, education_level: educationLevel } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
