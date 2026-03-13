/**
 * Comprehensive CBC Academics Module Routes
 * Covers: Schemes of Work, Lesson Plans, SBA, Projects,
 *         Life Skills, Career Guidance, Learning Materials, Promotions
 */
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

const tid = (req) => req.user.tenant_id;
const uid = (req) => req.user.id;

// ================================================================
// SCHEMES OF WORK
// ================================================================

// GET /schemes
router.get('/schemes', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, academic_year, term, status } = req.query;
    let where = ['s.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (class_id) { where.push(`s.class_id = $${i++}`); params.push(class_id); }
    if (subject_id) { where.push(`s.subject_id = $${i++}`); params.push(subject_id); }
    if (teacher_id) { where.push(`s.teacher_id = $${i++}`); params.push(teacher_id); }
    if (academic_year) { where.push(`s.academic_year = $${i++}`); params.push(academic_year); }
    if (term) { where.push(`s.term = $${i++}`); params.push(term); }
    if (status) { where.push(`s.status = $${i++}`); params.push(status); }
    // Teachers only see their own unless admin
    if (req.user.role === 'teacher') {
      where.push(`s.teacher_id = $${i++}`);
      params.push(uid(req));
    }

    const result = await query(`
      SELECT s.*,
        sub.name AS subject_name,
        c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name,
        COUNT(sw.id) AS week_count
      FROM schemes_of_work s
      LEFT JOIN subjects sub ON sub.id = s.subject_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN teachers u ON u.user_id = s.teacher_id
      LEFT JOIN scheme_weeks sw ON sw.scheme_id = s.id
      WHERE ${where.join(' AND ')}
      GROUP BY s.id, sub.name, c.name, u.first_name, u.last_name
      ORDER BY s.created_at DESC
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /schemes
router.post('/schemes', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { subject_id, class_id, academic_year, term, title, strand_id, total_weeks, objectives, resources } = req.body;
    const result = await query(`
      INSERT INTO schemes_of_work (tenant_id, subject_id, class_id, teacher_id, academic_year, term, title, strand_id, total_weeks, objectives, resources)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [tid(req), subject_id, class_id, uid(req), academic_year, term, title, strand_id, total_weeks || 13, objectives, resources]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /schemes/:id
router.get('/schemes/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const scheme = await query(`
      SELECT s.*, sub.name AS subject_name, c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name
      FROM schemes_of_work s
      LEFT JOIN subjects sub ON sub.id = s.subject_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN teachers u ON u.user_id = s.teacher_id
      WHERE s.id = $1 AND s.tenant_id = $2
    `, [req.params.id, tid(req)]);
    if (!scheme[0]) return res.status(404).json({ error: 'Not found' });

    const weeks = await query(
      'SELECT sw.*, ss.title AS sub_strand_name FROM scheme_weeks sw LEFT JOIN cbc_sub_strands ss ON ss.id = sw.sub_strand_id WHERE sw.scheme_id = $1 ORDER BY sw.week_number',
      [req.params.id]
    );
    res.json({ data: { ...scheme[0], weeks: weeks } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /schemes/:id
router.put('/schemes/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { title, objectives, resources, status, hod_remarks } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (title !== undefined) { fields.push(`title=$${i++}`); params.push(title); }
    if (objectives !== undefined) { fields.push(`objectives=$${i++}`); params.push(objectives); }
    if (resources !== undefined) { fields.push(`resources=$${i++}`); params.push(resources); }
    if (status !== undefined) { fields.push(`status=$${i++}`); params.push(status); }
    if (hod_remarks !== undefined) { fields.push(`hod_remarks=$${i++}`); params.push(hod_remarks); }
    if (req.user.role === 'admin' && status === 'approved') {
      fields.push(`hod_approved_by=$${i++}`); params.push(uid(req));
      fields.push(`hod_approved_at=$${i++}`); params.push(new Date());
    }
    fields.push(`updated_at=$${i++}`); params.push(new Date());
    params.push(req.params.id); params.push(tid(req));
    const result = await query(
      `UPDATE schemes_of_work SET ${fields.join(',')} WHERE id=$${i++} AND tenant_id=$${i} RETURNING *`,
      params
    );
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /schemes/:id/weeks (batch save)
router.post('/schemes/:id/weeks', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { weeks } = req.body; // array of week objects
    await query('DELETE FROM scheme_weeks WHERE scheme_id = $1', [req.params.id]);
    for (const w of weeks) {
      await query(`
        INSERT INTO scheme_weeks (scheme_id, week_number, topic, sub_strand_id, learning_outcomes, activities, resources, assessment_type, remarks)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [req.params.id, w.week_number, w.topic, w.sub_strand_id || null, w.learning_outcomes, w.activities, w.resources, w.assessment_type, w.remarks]);
    }
    const result = await query('SELECT * FROM scheme_weeks WHERE scheme_id = $1 ORDER BY week_number', [req.params.id]);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /schemes/:id
router.delete('/schemes/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM schemes_of_work WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// LESSON PLANS
// ================================================================

// GET /lesson-plans
router.get('/lesson-plans', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { class_id, subject_id, academic_year, term, week_number, status } = req.query;
    let where = ['lp.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (class_id) { where.push(`lp.class_id = $${i++}`); params.push(class_id); }
    if (subject_id) { where.push(`lp.subject_id = $${i++}`); params.push(subject_id); }
    if (academic_year) { where.push(`lp.academic_year = $${i++}`); params.push(academic_year); }
    if (term) { where.push(`lp.term = $${i++}`); params.push(term); }
    if (week_number) { where.push(`lp.week_number = $${i++}`); params.push(week_number); }
    if (status) { where.push(`lp.status = $${i++}`); params.push(status); }
    if (req.user.role === 'teacher') {
      where.push(`lp.teacher_id = $${i++}`);
      params.push(uid(req));
    }
    const result = await query(`
      SELECT lp.*, sub.name AS subject_name, c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name
      FROM lesson_plans lp
      LEFT JOIN subjects sub ON sub.id = lp.subject_id
      LEFT JOIN classes c ON c.id = lp.class_id
      LEFT JOIN teachers u ON u.user_id = lp.teacher_id
      WHERE ${where.join(' AND ')}
      ORDER BY lp.date DESC, lp.week_number, lp.lesson_number
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /lesson-plans
router.post('/lesson-plans', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      subject_id, class_id, scheme_id, strand_id, sub_strand_id,
      academic_year, term, week_number, lesson_number, date, duration_minutes,
      topic, learning_objectives, key_vocabulary, prior_knowledge,
      teaching_methods, introduction, development, conclusion,
      activities, homework, resources, assessment_method
    } = req.body;
    const result = await query(`
      INSERT INTO lesson_plans (
        tenant_id, teacher_id, subject_id, class_id, scheme_id, strand_id, sub_strand_id,
        academic_year, term, week_number, lesson_number, date, duration_minutes,
        topic, learning_objectives, key_vocabulary, prior_knowledge,
        teaching_methods, introduction, development, conclusion,
        activities, homework, resources, assessment_method
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
    `, [tid(req), uid(req), subject_id, class_id, scheme_id, strand_id, sub_strand_id,
        academic_year, term, week_number, lesson_number || 1, date, duration_minutes || 40,
        topic, learning_objectives, key_vocabulary, prior_knowledge,
        teaching_methods, introduction, development, conclusion,
        activities, homework, resources, assessment_method]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /lesson-plans/:id
router.get('/lesson-plans/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const result = await query(`
      SELECT lp.*, sub.name AS subject_name, c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name
      FROM lesson_plans lp
      LEFT JOIN subjects sub ON sub.id = lp.subject_id
      LEFT JOIN classes c ON c.id = lp.class_id
      LEFT JOIN teachers u ON u.user_id = lp.teacher_id
      WHERE lp.id = $1 AND lp.tenant_id = $2
    `, [req.params.id, tid(req)]);
    if (!result[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /lesson-plans/:id
router.put('/lesson-plans/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const fields = [];
    const params = [];
    let i = 1;
    const allowed = ['topic','learning_objectives','teaching_methods','activities','homework',
      'resources','assessment_method','reflection','status','introduction','development',
      'conclusion','key_vocabulary','prior_knowledge','date','duration_minutes'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k}=$${i++}`); params.push(req.body[k]); }
    }
    if (req.user.role === 'admin' && req.body.status === 'approved') {
      fields.push(`approved_by=$${i++}`); params.push(uid(req));
      fields.push(`approved_at=$${i++}`); params.push(new Date());
      if (req.body.approval_remarks) { fields.push(`approval_remarks=$${i++}`); params.push(req.body.approval_remarks); }
    }
    fields.push(`updated_at=$${i++}`); params.push(new Date());
    params.push(req.params.id); params.push(tid(req));
    const result = await query(
      `UPDATE lesson_plans SET ${fields.join(',')} WHERE id=$${i++} AND tenant_id=$${i} RETURNING *`,
      params
    );
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /lesson-plans/:id
router.delete('/lesson-plans/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    await query('DELETE FROM lesson_plans WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// SCHOOL BASED ASSESSMENTS (SBA)
// ================================================================

// GET /sba
router.get('/sba', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { class_id, subject_id, academic_year, term, status } = req.query;
    let where = ['s.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (class_id) { where.push(`s.class_id = $${i++}`); params.push(class_id); }
    if (subject_id) { where.push(`s.subject_id = $${i++}`); params.push(subject_id); }
    if (academic_year) { where.push(`s.academic_year = $${i++}`); params.push(academic_year); }
    if (term) { where.push(`s.term = $${i++}`); params.push(term); }
    if (status) { where.push(`s.status = $${i++}`); params.push(status); }
    if (req.user.role === 'teacher') {
      where.push(`s.teacher_id = $${i++}`); params.push(uid(req));
    }
    const result = await query(`
      SELECT s.*,
        sub.name AS subject_name,
        c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name,
        COUNT(sr.id) AS submissions_count,
        COUNT(st.id) AS total_students
      FROM sba_setups s
      LEFT JOIN subjects sub ON sub.id = s.subject_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN teachers u ON u.user_id = s.teacher_id
      LEFT JOIN sba_student_records sr ON sr.sba_setup_id = s.id
      LEFT JOIN students st ON st.class_id = s.class_id AND st.status = 'active'
      WHERE ${where.join(' AND ')}
      GROUP BY s.id, sub.name, c.name, u.first_name, u.last_name
      ORDER BY s.created_at DESC
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sba
router.post('/sba', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      class_id, subject_id, strand_id, sub_strand_id, academic_year, term,
      title, assessment_type, description, max_score, weight_percentage,
      assessment_date, submission_deadline, instructions, rubric
    } = req.body;
    const result = await query(`
      INSERT INTO sba_setups (tenant_id, class_id, subject_id, teacher_id, strand_id, sub_strand_id,
        academic_year, term, title, assessment_type, description, max_score, weight_percentage,
        assessment_date, submission_deadline, instructions, rubric)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [tid(req), class_id, subject_id, uid(req), strand_id, sub_strand_id,
        academic_year, term, title, assessment_type, description, max_score || 100,
        weight_percentage || 10, assessment_date, submission_deadline, instructions, rubric]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sba/:id/records - student records for this SBA
router.get('/sba/:id/records', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const result = await query(`
      SELECT sr.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number
      FROM sba_student_records sr
      JOIN students s ON s.id = sr.student_id
      WHERE sr.sba_setup_id = $1
      ORDER BY s.first_name
    `, [req.params.id]);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sba/:id/records (bulk save)
router.post('/sba/:id/records', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { records } = req.body; // [{ student_id, score, is_absent, teacher_remarks }]
    const sba = await query(
      'SELECT * FROM sba_setups WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]
    );
    if (!sba[0]) return res.status(404).json({ error: 'SBA not found' });
    const maxScore = parseFloat(sba[0].max_score);

    for (const r of records) {
      const score = r.is_absent ? null : parseFloat(r.score);
      let cbc_grade = null;
      if (score !== null && !isNaN(score)) {
        const pct = (score / maxScore) * 100;
        cbc_grade = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
      }
      await query(`
        INSERT INTO sba_student_records (sba_setup_id, student_id, teacher_id, score, cbc_grade, is_absent, teacher_remarks)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (sba_setup_id, student_id) DO UPDATE SET
          score=EXCLUDED.score, cbc_grade=EXCLUDED.cbc_grade,
          is_absent=EXCLUDED.is_absent, teacher_remarks=EXCLUDED.teacher_remarks,
          submitted_at=NOW()
      `, [req.params.id, r.student_id, uid(req), score, cbc_grade, r.is_absent || false, r.teacher_remarks]);
    }
    res.json({ message: `Saved ${records.length} records` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /sba/:id
router.put('/sba/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { status } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    const allowed = ['title','description','assessment_date','submission_deadline','instructions','rubric','status'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k}=$${i++}`); params.push(req.body[k]); }
    }
    if (status === 'moderated') {
      fields.push(`moderated_by=$${i++}`); params.push(uid(req));
      fields.push(`moderated_at=$${i++}`); params.push(new Date());
    }
    fields.push(`updated_at=$${i++}`); params.push(new Date());
    params.push(req.params.id); params.push(tid(req));
    const result = await query(
      `UPDATE sba_setups SET ${fields.join(',')} WHERE id=$${i++} AND tenant_id=$${i} RETURNING *`,
      params
    );
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// PROJECTS
// ================================================================

// GET /projects
router.get('/projects', requireRole(['admin','teacher','student']), async (req, res) => {
  try {
    const { class_id, subject_id, academic_year, term, project_type } = req.query;
    let where = ['p.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (class_id) { where.push(`p.class_id = $${i++}`); params.push(class_id); }
    if (subject_id) { where.push(`p.subject_id = $${i++}`); params.push(subject_id); }
    if (academic_year) { where.push(`p.academic_year = $${i++}`); params.push(academic_year); }
    if (term) { where.push(`p.term = $${i++}`); params.push(term); }
    if (project_type) { where.push(`p.project_type = $${i++}`); params.push(project_type); }
    if (req.user.role === 'teacher') {
      where.push(`p.teacher_id = $${i++}`); params.push(uid(req));
    }

    const result = await query(`
      SELECT p.*, sub.name AS subject_name, c.name AS class_name,
        u.first_name || ' ' || u.last_name AS teacher_name,
        COUNT(DISTINCT ps.id) AS submission_count,
        COUNT(DISTINCT pm.id) AS milestone_count
      FROM projects p
      LEFT JOIN subjects sub ON sub.id = p.subject_id
      LEFT JOIN classes c ON c.id = p.class_id
      LEFT JOIN teachers u ON u.user_id = p.teacher_id
      LEFT JOIN project_submissions ps ON ps.project_id = p.id
      LEFT JOIN project_milestones pm ON pm.project_id = p.id
      WHERE ${where.join(' AND ')}
      GROUP BY p.id, sub.name, c.name, u.first_name, u.last_name
      ORDER BY p.created_at DESC
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /projects
router.post('/projects', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      class_id, subject_id, strand_id, sub_strand_id, academic_year, term,
      title, description, project_type, is_stem, start_date, due_date,
      max_score, rubric, learning_outcomes, materials_needed
    } = req.body;
    const result = await query(`
      INSERT INTO projects (tenant_id, teacher_id, class_id, subject_id, strand_id, sub_strand_id,
        academic_year, term, title, description, project_type, is_stem, start_date, due_date,
        max_score, rubric, learning_outcomes, materials_needed)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *
    `, [tid(req), uid(req), class_id, subject_id, strand_id, sub_strand_id,
        academic_year, term, title, description, project_type || 'individual',
        is_stem || false, start_date, due_date, max_score || 100,
        rubric, learning_outcomes, materials_needed]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /projects/:id — with milestones, groups, submissions
router.get('/projects/:id', requireRole(['admin','teacher','student']), async (req, res) => {
  try {
    const project = await query(`
      SELECT p.*, sub.name AS subject_name, c.name AS class_name
      FROM projects p
      LEFT JOIN subjects sub ON sub.id = p.subject_id
      LEFT JOIN classes c ON c.id = p.class_id
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [req.params.id, tid(req)]);
    if (!project[0]) return res.status(404).json({ error: 'Not found' });

    const milestones = await query('SELECT * FROM project_milestones WHERE project_id=$1 ORDER BY sort_order', [req.params.id]);
    const submissions = await query(`
      SELECT ps.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number
      FROM project_submissions ps
      LEFT JOIN students s ON s.id = ps.student_id
      WHERE ps.project_id = $1
      ORDER BY ps.submission_date DESC
    `, [req.params.id]);

    res.json({ data: { ...project[0], milestones: milestones, submissions: submissions } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /projects/:id/milestones
router.post('/projects/:id/milestones', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { title, description, due_date, sort_order } = req.body;
    const result = await query(
      'INSERT INTO project_milestones (project_id, title, description, due_date, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, title, description, due_date, sort_order || 0]
    );
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /projects/:id/submissions
router.post('/projects/:id/submissions', requireRole(['admin','teacher','student']), async (req, res) => {
  try {
    const { student_id, project_group_id, title, description, evidence_urls, milestone_id } = req.body;
    const project = await query('SELECT * FROM projects WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    if (!project[0]) return res.status(404).json({ error: 'Not found' });
    const now = new Date();
    const isLate = project[0].due_date && now > new Date(project[0].due_date);
    const result = await query(`
      INSERT INTO project_submissions (project_id, student_id, project_group_id, title, description, evidence_urls, milestone_id, is_late)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.params.id, student_id, project_group_id, title, description,
        evidence_urls || [], milestone_id, isLate]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /projects/:projectId/submissions/:subId/grade
router.put('/projects/:projectId/submissions/:subId/grade', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { score, teacher_remarks } = req.body;
    const project = await query('SELECT max_score FROM projects WHERE id=$1', [req.params.projectId]);
    const maxScore = parseFloat(project[0]?.max_score || 100);
    const pct = (parseFloat(score) / maxScore) * 100;
    const cbc_grade = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
    const result = await query(`
      UPDATE project_submissions SET score=$1, cbc_grade=$2, teacher_remarks=$3, graded_at=NOW(), graded_by=$4
      WHERE id=$5 RETURNING *
    `, [score, cbc_grade, teacher_remarks, uid(req), req.params.subId]);
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// LIFE SKILLS & VALUES ASSESSMENT
// ================================================================

// GET /life-skills
router.get('/life-skills', requireRole(['admin','teacher','parent']), async (req, res) => {
  try {
    const { class_id, student_id, academic_year, term } = req.query;
    let where = ['ls.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (class_id) { where.push(`ls.class_id = $${i++}`); params.push(class_id); }
    if (student_id) { where.push(`ls.student_id = $${i++}`); params.push(student_id); }
    if (academic_year) { where.push(`ls.academic_year = $${i++}`); params.push(academic_year); }
    if (term) { where.push(`ls.term = $${i++}`); params.push(term); }

    const result = await query(`
      SELECT ls.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
        c.name AS class_name, u.first_name || ' ' || u.last_name AS teacher_name
      FROM life_skills_assessments ls
      JOIN students s ON s.id = ls.student_id
      JOIN classes c ON c.id = ls.class_id
      LEFT JOIN teachers u ON u.user_id = ls.teacher_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.first_name
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /life-skills (upsert)
router.post('/life-skills', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      student_id, class_id, academic_year, term,
      responsibility, respect, integrity, patriotism,
      communication, collaboration, critical_thinking, creativity,
      digital_literacy, self_management, leadership, physical_health,
      teacher_remarks, areas_of_improvement, strengths
    } = req.body;

    const result = await query(`
      INSERT INTO life_skills_assessments (
        tenant_id, student_id, class_id, teacher_id, academic_year, term,
        responsibility, respect, integrity, patriotism,
        communication, collaboration, critical_thinking, creativity,
        digital_literacy, self_management, leadership, physical_health,
        teacher_remarks, areas_of_improvement, strengths
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      ON CONFLICT (student_id, class_id, academic_year, term) DO UPDATE SET
        responsibility=EXCLUDED.responsibility, respect=EXCLUDED.respect,
        integrity=EXCLUDED.integrity, patriotism=EXCLUDED.patriotism,
        communication=EXCLUDED.communication, collaboration=EXCLUDED.collaboration,
        critical_thinking=EXCLUDED.critical_thinking, creativity=EXCLUDED.creativity,
        digital_literacy=EXCLUDED.digital_literacy, self_management=EXCLUDED.self_management,
        leadership=EXCLUDED.leadership, physical_health=EXCLUDED.physical_health,
        teacher_remarks=EXCLUDED.teacher_remarks, areas_of_improvement=EXCLUDED.areas_of_improvement,
        strengths=EXCLUDED.strengths, teacher_id=EXCLUDED.teacher_id, updated_at=NOW()
      RETURNING *
    `, [tid(req), student_id, class_id, uid(req), academic_year, term,
        responsibility, respect, integrity, patriotism,
        communication, collaboration, critical_thinking, creativity,
        digital_literacy, self_management, leadership, physical_health,
        teacher_remarks, areas_of_improvement, strengths]);
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /life-skills/bulk (save for entire class)
router.post('/life-skills/bulk', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { records } = req.body;
    for (const r of records) {
      await query(`
        INSERT INTO life_skills_assessments (
          tenant_id, student_id, class_id, teacher_id, academic_year, term,
          responsibility, respect, integrity, patriotism,
          communication, collaboration, critical_thinking, creativity,
          digital_literacy, self_management, leadership, physical_health,
          teacher_remarks, areas_of_improvement, strengths
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        ON CONFLICT (student_id, class_id, academic_year, term) DO UPDATE SET
          responsibility=EXCLUDED.responsibility, respect=EXCLUDED.respect,
          integrity=EXCLUDED.integrity, patriotism=EXCLUDED.patriotism,
          communication=EXCLUDED.communication, collaboration=EXCLUDED.collaboration,
          critical_thinking=EXCLUDED.critical_thinking, creativity=EXCLUDED.creativity,
          digital_literacy=EXCLUDED.digital_literacy, self_management=EXCLUDED.self_management,
          leadership=EXCLUDED.leadership, physical_health=EXCLUDED.physical_health,
          teacher_remarks=EXCLUDED.teacher_remarks, teacher_id=EXCLUDED.teacher_id, updated_at=NOW()
      `, [tid(req), r.student_id, r.class_id, uid(req), r.academic_year, r.term,
          r.responsibility, r.respect, r.integrity, r.patriotism,
          r.communication, r.collaboration, r.critical_thinking, r.creativity,
          r.digital_literacy, r.self_management, r.leadership, r.physical_health,
          r.teacher_remarks, r.areas_of_improvement, r.strengths]);
    }
    res.json({ message: `Saved ${records.length} life skills records` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// CAREER GUIDANCE
// ================================================================

// GET /career/pathways
router.get('/career/pathways', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM career_pathways WHERE (tenant_id=$1 OR tenant_id IS NULL) AND is_active=TRUE ORDER BY name',
      [tid(req)]
    );
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /career/pathways
router.post('/career/pathways', requireRole(['admin']), async (req, res) => {
  try {
    const { name, category, description, required_subjects, key_competencies, career_options, institutions } = req.body;
    const result = await query(`
      INSERT INTO career_pathways (tenant_id, name, category, description, required_subjects, key_competencies, career_options, institutions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [tid(req), name, category, description, required_subjects, key_competencies, career_options, institutions]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /career/profiles
router.get('/career/profiles', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { class_id, academic_year } = req.query;
    let where = ['cp.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (academic_year) { where.push(`cp.academic_year = $${i++}`); params.push(academic_year); }

    let joinClause = '';
    if (class_id) {
      joinClause = `JOIN students st ON st.id = cp.student_id AND st.class_id = $${i++}`;
      params.push(class_id);
    }

    const result = await query(`
      SELECT cp.*, s.first_name || ' ' || s.last_name AS student_name,
        s.admission_number, p.name AS pathway_name
      FROM student_career_profiles cp
      JOIN students s ON s.id = cp.student_id
      ${joinClause}
      LEFT JOIN career_pathways p ON p.id = cp.recommended_pathway_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.first_name
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /career/profiles (upsert)
router.post('/career/profiles', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      student_id, academic_year,
      stem_interest, arts_interest, social_sciences_interest, technical_interest,
      business_interest, health_interest, recommended_pathway_id,
      career_aspirations, teacher_recommendation, counselor_notes, subject_combination
    } = req.body;
    const result = await query(`
      INSERT INTO student_career_profiles (
        student_id, tenant_id, academic_year,
        stem_interest, arts_interest, social_sciences_interest, technical_interest,
        business_interest, health_interest, recommended_pathway_id,
        career_aspirations, teacher_recommendation, counselor_notes, subject_combination, recommended_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (student_id, academic_year) DO UPDATE SET
        stem_interest=EXCLUDED.stem_interest, arts_interest=EXCLUDED.arts_interest,
        social_sciences_interest=EXCLUDED.social_sciences_interest,
        technical_interest=EXCLUDED.technical_interest, business_interest=EXCLUDED.business_interest,
        health_interest=EXCLUDED.health_interest,
        recommended_pathway_id=EXCLUDED.recommended_pathway_id,
        career_aspirations=EXCLUDED.career_aspirations,
        teacher_recommendation=EXCLUDED.teacher_recommendation,
        counselor_notes=EXCLUDED.counselor_notes, subject_combination=EXCLUDED.subject_combination,
        recommended_by=EXCLUDED.recommended_by, updated_at=NOW()
      RETURNING *
    `, [student_id, tid(req), academic_year,
        stem_interest, arts_interest, social_sciences_interest, technical_interest,
        business_interest, health_interest, recommended_pathway_id,
        career_aspirations, teacher_recommendation, counselor_notes, subject_combination, uid(req)]);
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /career/profiles/student/:studentId
router.get('/career/profiles/student/:studentId', requireRole(['admin','teacher','student','parent']), async (req, res) => {
  try {
    const result = await query(`
      SELECT cp.*, p.name AS pathway_name, p.description AS pathway_description,
        p.career_options, p.required_subjects
      FROM student_career_profiles cp
      LEFT JOIN career_pathways p ON p.id = cp.recommended_pathway_id
      WHERE cp.student_id = $1 AND cp.tenant_id = $2
      ORDER BY cp.academic_year DESC
    `, [req.params.studentId, tid(req)]);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// LEARNING MATERIALS
// ================================================================

// GET /materials
router.get('/materials', requireRole(['admin','teacher','student','parent']), async (req, res) => {
  try {
    const { subject_id, class_id, material_type, education_level, term, academic_year } = req.query;
    let where = ['m.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (subject_id) { where.push(`m.subject_id = $${i++}`); params.push(subject_id); }
    if (class_id) { where.push(`m.class_id = $${i++}`); params.push(class_id); }
    if (material_type) { where.push(`m.material_type = $${i++}`); params.push(material_type); }
    if (education_level) { where.push(`m.education_level = $${i++}`); params.push(education_level); }
    if (term) { where.push(`m.term = $${i++}`); params.push(term); }
    if (academic_year) { where.push(`m.academic_year = $${i++}`); params.push(academic_year); }
    // Students and parents only see public materials
    if (['student','parent'].includes(req.user.role)) {
      where.push('m.is_public = TRUE');
    }

    const result = await query(`
      SELECT m.*, sub.name AS subject_name, c.name AS class_name,
        u.first_name || ' ' || u.last_name AS uploaded_by_name
      FROM learning_materials m
      LEFT JOIN subjects sub ON sub.id = m.subject_id
      LEFT JOIN classes c ON c.id = m.class_id
      LEFT JOIN teachers u ON u.user_id = m.uploaded_by
      WHERE ${where.join(' AND ')}
      ORDER BY m.created_at DESC
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /materials
router.post('/materials', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const {
      subject_id, class_id, strand_id, title, description, material_type,
      education_level, academic_year, term, file_url, external_url, is_public, tags
    } = req.body;
    const result = await query(`
      INSERT INTO learning_materials (tenant_id, uploaded_by, subject_id, class_id, strand_id,
        title, description, material_type, education_level, academic_year, term,
        file_url, external_url, is_public, tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [tid(req), uid(req), subject_id, class_id, strand_id, title, description,
        material_type, education_level, academic_year, term, file_url,
        external_url, is_public || false, tags || []]);
    res.status(201).json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /materials/:id
router.put('/materials/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { title, description, is_public, tags } = req.body;
    const result = await query(`
      UPDATE learning_materials SET title=$1, description=$2, is_public=$3, tags=$4, updated_at=NOW()
      WHERE id=$5 AND tenant_id=$6 RETURNING *
    `, [title, description, is_public, tags || [], req.params.id, tid(req)]);
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /materials/:id
router.delete('/materials/:id', requireRole(['admin','teacher']), async (req, res) => {
  try {
    await query('DELETE FROM learning_materials WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /materials/:id/download — increment download count
router.put('/materials/:id/download', async (req, res) => {
  try {
    const result = await query(
      'UPDATE learning_materials SET download_count=download_count+1 WHERE id=$1 AND tenant_id=$2 RETURNING file_url, external_url, title',
      [req.params.id, tid(req)]
    );
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// PROMOTION & PROGRESSION
// ================================================================

// GET /promotion/rules
router.get('/promotion/rules', requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(`
      SELECT pr.*, fc.name AS from_class_name, tc.name AS to_class_name
      FROM promotion_rules pr
      JOIN classes fc ON fc.id = pr.from_class_id
      LEFT JOIN classes tc ON tc.id = pr.to_class_id
      WHERE pr.tenant_id = $1
      ORDER BY fc.name
    `, [tid(req)]);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /promotion/rules
router.post('/promotion/rules', requireRole(['admin']), async (req, res) => {
  try {
    const {
      from_class_id, to_class_id, academic_year,
      min_attendance_percent, min_subjects_passed, min_average_percent,
      cbc_min_me_count, auto_promote, notes
    } = req.body;
    const result = await query(`
      INSERT INTO promotion_rules (tenant_id, from_class_id, to_class_id, academic_year,
        min_attendance_percent, min_subjects_passed, min_average_percent, cbc_min_me_count, auto_promote, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (from_class_id, academic_year) DO UPDATE SET
        to_class_id=EXCLUDED.to_class_id, min_attendance_percent=EXCLUDED.min_attendance_percent,
        min_subjects_passed=EXCLUDED.min_subjects_passed, min_average_percent=EXCLUDED.min_average_percent,
        cbc_min_me_count=EXCLUDED.cbc_min_me_count, auto_promote=EXCLUDED.auto_promote, notes=EXCLUDED.notes
      RETURNING *
    `, [tid(req), from_class_id, to_class_id, academic_year,
        min_attendance_percent || 75, min_subjects_passed || 5,
        min_average_percent || 40, cbc_min_me_count || 3,
        auto_promote || false, notes]);
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /promotion/history
router.get('/promotion/history', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { academic_year, class_id, promotion_type } = req.query;
    let where = ['sp.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (academic_year) { where.push(`sp.academic_year = $${i++}`); params.push(academic_year); }
    if (class_id) { where.push(`sp.from_class_id = $${i++}`); params.push(class_id); }
    if (promotion_type) { where.push(`sp.promotion_type = $${i++}`); params.push(promotion_type); }

    const result = await query(`
      SELECT sp.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
        fc.name AS from_class_name, tc.name AS to_class_name,
        u.first_name || ' ' || u.last_name AS promoted_by_name
      FROM student_promotions sp
      JOIN students s ON s.id = sp.student_id
      JOIN classes fc ON fc.id = sp.from_class_id
      LEFT JOIN classes tc ON tc.id = sp.to_class_id
      LEFT JOIN teachers u ON u.user_id = sp.promoted_by
      WHERE ${where.join(' AND ')}
      ORDER BY sp.promoted_at DESC
    `, params);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /promotion/promote-student
router.post('/promotion/promote-student', requireRole(['admin']), async (req, res) => {
  try {
    const {
      student_id, from_class_id, to_class_id, academic_year,
      promotion_type, attendance_percent, average_score, remarks
    } = req.body;

    const result = await query(`
      INSERT INTO student_promotions (student_id, tenant_id, from_class_id, to_class_id, academic_year,
        promotion_type, attendance_percent, average_score, remarks, promoted_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (student_id, academic_year) DO UPDATE SET
        from_class_id=EXCLUDED.from_class_id, to_class_id=EXCLUDED.to_class_id,
        promotion_type=EXCLUDED.promotion_type, attendance_percent=EXCLUDED.attendance_percent,
        average_score=EXCLUDED.average_score, remarks=EXCLUDED.remarks,
        promoted_by=EXCLUDED.promoted_by, promoted_at=NOW()
      RETURNING *
    `, [student_id, tid(req), from_class_id, to_class_id, academic_year,
        promotion_type || 'promoted', attendance_percent, average_score, remarks, uid(req)]);

    // Update student class if promoted
    if (to_class_id && promotion_type !== 'repeated') {
      await query('UPDATE students SET class_id=$1 WHERE id=$2', [to_class_id, student_id]);
    }
    res.json({ data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /promotion/bulk-promote
router.post('/promotion/bulk-promote', requireRole(['admin']), async (req, res) => {
  try {
    const { promotions, academic_year } = req.body; // array of { student_id, to_class_id, promotion_type, remarks }
    let count = 0;
    for (const p of promotions) {
      await query(`
        INSERT INTO student_promotions (student_id, tenant_id, from_class_id, to_class_id, academic_year,
          promotion_type, remarks, promoted_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (student_id, academic_year) DO UPDATE SET
          to_class_id=EXCLUDED.to_class_id, promotion_type=EXCLUDED.promotion_type,
          remarks=EXCLUDED.remarks, promoted_by=EXCLUDED.promoted_by, promoted_at=NOW()
      `, [p.student_id, tid(req), p.from_class_id, p.to_class_id, academic_year,
          p.promotion_type || 'promoted', p.remarks, uid(req)]);
      if (p.to_class_id && p.promotion_type !== 'repeated') {
        await query('UPDATE students SET class_id=$1 WHERE id=$2', [p.to_class_id, p.student_id]);
      }
      count++;
    }
    res.json({ message: `Processed ${count} promotions` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ACADEMICS DASHBOARD / OVERVIEW
// ================================================================
router.get('/dashboard', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const { academic_year, term } = req.query;
    const year = academic_year || new Date().getFullYear().toString();
    const termNum = term || 1;

    const [schemes, lessonPlans, sbas, projects, materials] = await Promise.all([
      query('SELECT COUNT(*) AS total, SUM(CASE WHEN status=\'approved\' THEN 1 ELSE 0 END) AS approved FROM schemes_of_work WHERE tenant_id=$1 AND academic_year=$2 AND term=$3', [tid(req), year, termNum]),
      query('SELECT COUNT(*) AS total, SUM(CASE WHEN status=\'approved\' THEN 1 ELSE 0 END) AS approved FROM lesson_plans WHERE tenant_id=$1 AND academic_year=$2 AND term=$3', [tid(req), year, termNum]),
      query('SELECT COUNT(*) AS total FROM sba_setups WHERE tenant_id=$1 AND academic_year=$2 AND term=$3', [tid(req), year, termNum]),
      query('SELECT COUNT(*) AS total, SUM(CASE WHEN status=\'active\' THEN 1 ELSE 0 END) AS active FROM projects WHERE tenant_id=$1 AND academic_year=$2 AND term=$3', [tid(req), year, termNum]),
      query('SELECT COUNT(*) AS total FROM learning_materials WHERE tenant_id=$1', [tid(req)]),
    ]);

    res.json({
      data: {
        schemes: { total: parseInt(schemes[0].total), approved: parseInt(schemes[0].approved || 0) },
        lesson_plans: { total: parseInt(lessonPlans[0].total), approved: parseInt(lessonPlans[0].approved || 0) },
        sbas: { total: parseInt(sbas[0].total) },
        projects: { total: parseInt(projects[0].total), active: parseInt(projects[0].active || 0) },
        materials: { total: parseInt(materials[0].total) },
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ROOMS MANAGEMENT
// ================================================================

router.get('/rooms', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, COUNT(c.id) AS class_count
       FROM rooms r
       LEFT JOIN classes c ON c.room_id = r.id
       WHERE r.tenant_id = $1
       GROUP BY r.id ORDER BY r.name`,
      [tid(req)]
    );
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rooms', requireRole(['admin']), async (req, res) => {
  try {
    const { name, room_number, capacity, building, floor, room_type, features, notes } = req.body;
    const result = await query(
      `INSERT INTO rooms (tenant_id, name, room_number, capacity, building, floor, room_type, features, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tid(req), name, room_number, capacity || 45, building, floor, room_type || 'classroom', features || [], notes]
    );
    res.status(201).json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/rooms/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, room_number, capacity, building, floor, room_type, features, is_available, notes } = req.body;
    const result = await query(
      `UPDATE rooms SET name=$1, room_number=$2, capacity=$3, building=$4, floor=$5,
       room_type=$6, features=$7, is_available=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 AND tenant_id=$11 RETURNING *`,
      [name, room_number, capacity, building, floor, room_type, features || [], is_available !== false, notes, req.params.id, tid(req)]
    );
    res.json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/rooms/:id', requireRole(['admin']), async (req, res) => {
  try {
    // Unlink from classes first
    await query('UPDATE classes SET room_id=NULL WHERE room_id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    await query('DELETE FROM rooms WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Room deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================================================================
// CLASS MANAGEMENT (with streams, rooms, teacher assignment)
// ================================================================

router.get('/classes', requireRole(['admin','teacher','student','parent']), async (req, res) => {
  try {
    const { education_level } = req.query;
    let where = 'c.tenant_id = $1';
    const params = [tid(req)];
    if (education_level) { where += ' AND c.education_level = $2'; params.push(education_level); }

    const result = await query(`
      SELECT c.*,
        u.first_name || ' ' || u.last_name AS class_teacher_name,
        r.name AS room_name, r.capacity AS room_capacity,
        COUNT(DISTINCT s.id) AS student_count,
        COUNT(DISTINCT cs.subject_id) AS subject_count
      FROM classes c
      LEFT JOIN teachers u ON u.user_id = c.class_teacher_id
      LEFT JOIN rooms r ON r.id = c.room_id
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
      LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE ${where}
      GROUP BY c.id, u.first_name, u.last_name, r.name, r.capacity
      ORDER BY c.sort_order ASC, c.name ASC, c.section ASC
    `, params);
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classes', requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, section, education_level, grade_number, capacity,
      room_id, class_teacher_id, academic_year, sort_order
    } = req.body;
    const result = await query(
      `INSERT INTO classes (tenant_id, name, section, education_level, grade_number, capacity, room_id, class_teacher_id, academic_year, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)
       ON CONFLICT DO NOTHING RETURNING *`,
      [tid(req), name, section || 'A', education_level || 'lower_primary', grade_number, capacity || 45,
       room_id || null, class_teacher_id || null, academic_year || new Date().getFullYear().toString(), sort_order || 0]
    );
    res.status(201).json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/classes/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, section, capacity, room_id, class_teacher_id, academic_year, is_active, education_level } = req.body;
    const result = await query(
      `UPDATE classes SET name=$1, section=$2, capacity=$3, room_id=$4,
       class_teacher_id=$5, academic_year=$6, is_active=$7, education_level=$8, updated_at=NOW()
       WHERE id=$9 AND tenant_id=$10 RETURNING *`,
      [name, section, capacity || 45, room_id || null, class_teacher_id || null,
       academic_year, is_active !== false, education_level, req.params.id, tid(req)]
    );
    res.json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classes/:id', requireRole(['admin']), async (req, res) => {
  try {
    const count = await query('SELECT COUNT(*) FROM students WHERE class_id=$1', [req.params.id]);
    if (parseInt(count[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete class with enrolled students' });
    }
    await query('DELETE FROM classes WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Class deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /classes/:id/subjects — subjects linked to this class
router.get('/classes/:id/subjects', requireRole(['admin','teacher']), async (req, res) => {
  try {
    const result = await query(`
      SELECT cs.*, s.name AS subject_name, s.code, s.education_level, s.color, s.is_elective, s.weekly_periods,
        u.first_name || ' ' || u.last_name AS teacher_name
      FROM class_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      LEFT JOIN teachers u ON u.user_id = cs.teacher_id
      WHERE cs.class_id = $1 AND cs.tenant_id = $2
      ORDER BY s.sort_order, s.name
    `, [req.params.id, tid(req)]);
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /classes/:id/subjects — link subject to class
router.post('/classes/:id/subjects', requireRole(['admin']), async (req, res) => {
  try {
    const { subject_id, teacher_id, is_optional, weekly_periods } = req.body;
    const result = await query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, tenant_id, is_optional, weekly_periods)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id=EXCLUDED.teacher_id, weekly_periods=EXCLUDED.weekly_periods
       RETURNING *`,
      [req.params.id, subject_id, teacher_id || null, tid(req), is_optional || false, weekly_periods || 5]
    );
    res.status(201).json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /classes/:id/subjects/:subjectId — unlink
router.delete('/classes/:id/subjects/:subjectId', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM class_subjects WHERE class_id=$1 AND subject_id=$2 AND tenant_id=$3',
      [req.params.id, req.params.subjectId, tid(req)]);
    res.json({ message: 'Subject removed from class' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================================================================
// SUBJECT / LEARNING AREA MANAGEMENT
// ================================================================

router.get('/subjects', requireRole(['admin','teacher','student','parent']), async (req, res) => {
  try {
    const { education_level, subject_group, is_elective } = req.query;
    let where = ['s.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (education_level) { where.push(`s.education_level = $${i++}`); params.push(education_level); }
    if (subject_group) { where.push(`s.subject_group = $${i++}`); params.push(subject_group); }
    if (is_elective !== undefined) { where.push(`s.is_elective = $${i++}`); params.push(is_elective === 'true'); }

    const result = await query(`
      SELECT s.*, COUNT(DISTINCT cs.class_id) AS class_count
      FROM subjects s
      LEFT JOIN class_subjects cs ON cs.subject_id = s.id
      WHERE ${where.join(' AND ')}
      GROUP BY s.id
      ORDER BY s.sort_order ASC, s.education_level, s.name
    `, params);
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, description, education_level, category, subject_group, is_elective, weekly_periods, color, sort_order } = req.body;
    const result = await query(
      `INSERT INTO subjects (tenant_id, name, code, description, education_level, category, subject_group, is_elective, weekly_periods, color, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
       ON CONFLICT DO NOTHING RETURNING *`,
      [tid(req), name, code, description, education_level, category || 'core',
       subject_group, is_elective || false, weekly_periods || 5, color, sort_order || 0]
    );
    res.status(201).json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, description, education_level, category, subject_group, is_elective, weekly_periods, color, is_active } = req.body;
    const result = await query(
      `UPDATE subjects SET name=$1, code=$2, description=$3, education_level=$4, category=$5,
       subject_group=$6, is_elective=$7, weekly_periods=$8, color=$9, is_active=$10, updated_at=NOW()
       WHERE id=$11 AND tenant_id=$12 RETURNING *`,
      [name, code, description, education_level, category || 'core',
       subject_group, is_elective || false, weekly_periods || 5, color, is_active !== false,
       req.params.id, tid(req)]
    );
    res.json({ data: result[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM subjects WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================================================================
// SEED CBC DEFAULTS (classes + subjects)
// ================================================================

const CBC_CLASSES = [
  // sort, name, section, education_level, grade_number, capacity
  { sort: 1,  name: 'Playgroup', section: 'A', education_level: 'pre_primary',       grade_number: 0,  capacity: 20 },
  { sort: 2,  name: 'PP 1',      section: 'A', education_level: 'pre_primary',       grade_number: 1,  capacity: 25 },
  { sort: 3,  name: 'PP 2',      section: 'A', education_level: 'pre_primary',       grade_number: 2,  capacity: 25 },
  { sort: 4,  name: 'Grade 1',   section: 'A', education_level: 'lower_primary',     grade_number: 1,  capacity: 40 },
  { sort: 5,  name: 'Grade 2',   section: 'A', education_level: 'lower_primary',     grade_number: 2,  capacity: 40 },
  { sort: 6,  name: 'Grade 3',   section: 'A', education_level: 'lower_primary',     grade_number: 3,  capacity: 40 },
  { sort: 7,  name: 'Grade 4',   section: 'A', education_level: 'upper_primary',     grade_number: 4,  capacity: 45 },
  { sort: 8,  name: 'Grade 5',   section: 'A', education_level: 'upper_primary',     grade_number: 5,  capacity: 45 },
  { sort: 9,  name: 'Grade 6',   section: 'A', education_level: 'upper_primary',     grade_number: 6,  capacity: 45 },
  { sort: 10, name: 'Grade 7',   section: 'A', education_level: 'junior_secondary',  grade_number: 7,  capacity: 45 },
  { sort: 11, name: 'Grade 8',   section: 'A', education_level: 'junior_secondary',  grade_number: 8,  capacity: 45 },
  { sort: 12, name: 'Grade 9',   section: 'A', education_level: 'junior_secondary',  grade_number: 9,  capacity: 45 },
  { sort: 13, name: 'Grade 10',  section: 'A', education_level: 'senior_secondary',  grade_number: 10, capacity: 45 },
  { sort: 14, name: 'Grade 11',  section: 'A', education_level: 'senior_secondary',  grade_number: 11, capacity: 45 },
  { sort: 15, name: 'Grade 12',  section: 'A', education_level: 'senior_secondary',  grade_number: 12, capacity: 45 },
];

const CBC_SUBJECTS = [
  // Pre-Primary
  { name: 'Activities for Early Learning', code: 'AEL', education_level: 'pre_primary', category: 'core', subject_group: 'other', weekly_periods: 5, sort_order: 1, color: '#ec4899' },
  { name: 'Literacy Activities',           code: 'LTA', education_level: 'pre_primary', category: 'core', subject_group: 'languages', weekly_periods: 6, sort_order: 2, color: '#f97316' },
  { name: 'Numeracy Activities',           code: 'NMA', education_level: 'pre_primary', category: 'core', subject_group: 'stem', weekly_periods: 6, sort_order: 3, color: '#3b82f6' },
  { name: 'Environmental Activities',      code: 'ENA', education_level: 'pre_primary', category: 'core', subject_group: 'stem', weekly_periods: 4, sort_order: 4, color: '#22c55e' },
  { name: 'Psychomotor & Creative Arts',   code: 'PCA', education_level: 'pre_primary', category: 'core', subject_group: 'arts', weekly_periods: 4, sort_order: 5, color: '#a855f7' },
  { name: 'Religious Education (PP)',      code: 'REP', education_level: 'pre_primary', category: 'core', subject_group: 'humanities', weekly_periods: 2, sort_order: 6, color: '#eab308' },

  // Lower Primary (Grade 1–3)
  { name: 'English Literacy',             code: 'ENG', education_level: 'lower_primary', category: 'core', subject_group: 'languages', weekly_periods: 6, sort_order: 10, color: '#f97316' },
  { name: 'Kiswahili Literacy',           code: 'KIS', education_level: 'lower_primary', category: 'core', subject_group: 'languages', weekly_periods: 5, sort_order: 11, color: '#84cc16' },
  { name: 'Mathematics',                  code: 'MTH', education_level: 'lower_primary', category: 'core', subject_group: 'stem', weekly_periods: 6, sort_order: 12, color: '#3b82f6' },
  { name: 'Environmental Activities (LP)',code: 'ENV', education_level: 'lower_primary', category: 'core', subject_group: 'stem', weekly_periods: 4, sort_order: 13, color: '#22c55e' },
  { name: 'Creative Arts (LP)',           code: 'CRA', education_level: 'lower_primary', category: 'core', subject_group: 'arts', weekly_periods: 3, sort_order: 14, color: '#a855f7' },
  { name: 'Physical & Health Education',  code: 'PHE', education_level: 'lower_primary', category: 'core', subject_group: 'sports', weekly_periods: 3, sort_order: 15, color: '#f43f5e' },
  { name: 'Religious Education',          code: 'REL', education_level: 'lower_primary', category: 'core', subject_group: 'humanities', weekly_periods: 2, sort_order: 16, color: '#eab308' },

  // Upper Primary (Grade 4–6)
  { name: 'English',                      code: 'ENG4', education_level: 'upper_primary', category: 'core', subject_group: 'languages', weekly_periods: 6, sort_order: 20, color: '#f97316' },
  { name: 'Kiswahili',                    code: 'KIS4', education_level: 'upper_primary', category: 'core', subject_group: 'languages', weekly_periods: 5, sort_order: 21, color: '#84cc16' },
  { name: 'Mathematics',                  code: 'MTH4', education_level: 'upper_primary', category: 'core', subject_group: 'stem', weekly_periods: 6, sort_order: 22, color: '#3b82f6' },
  { name: 'Integrated Science',           code: 'ISC',  education_level: 'upper_primary', category: 'core', subject_group: 'stem', weekly_periods: 5, sort_order: 23, color: '#06b6d4' },
  { name: 'Social Studies',               code: 'SST',  education_level: 'upper_primary', category: 'core', subject_group: 'humanities', weekly_periods: 4, sort_order: 24, color: '#8b5cf6' },
  { name: 'Agriculture',                  code: 'AGR',  education_level: 'upper_primary', category: 'core', subject_group: 'technical', weekly_periods: 3, sort_order: 25, color: '#16a34a' },
  { name: 'Home Science',                 code: 'HMS',  education_level: 'upper_primary', category: 'core', subject_group: 'technical', weekly_periods: 3, sort_order: 26, color: '#db2777' },
  { name: 'Creative Arts & Crafts',       code: 'CAC',  education_level: 'upper_primary', category: 'core', subject_group: 'arts', weekly_periods: 3, sort_order: 27, color: '#a855f7' },
  { name: 'Physical & Health Education',  code: 'PHE4', education_level: 'upper_primary', category: 'core', subject_group: 'sports', weekly_periods: 3, sort_order: 28, color: '#f43f5e' },
  { name: 'Religious Education',          code: 'REL4', education_level: 'upper_primary', category: 'core', subject_group: 'humanities', weekly_periods: 2, sort_order: 29, color: '#eab308' },

  // Junior Secondary (Grade 7–9) — Core
  { name: 'English',                         code: 'ENGJ', education_level: 'junior_secondary', category: 'core', subject_group: 'languages', weekly_periods: 6, sort_order: 30, color: '#f97316' },
  { name: 'Kiswahili',                       code: 'KISJ', education_level: 'junior_secondary', category: 'core', subject_group: 'languages', weekly_periods: 5, sort_order: 31, color: '#84cc16' },
  { name: 'Mathematics',                     code: 'MTHJ', education_level: 'junior_secondary', category: 'core', subject_group: 'stem', weekly_periods: 6, sort_order: 32, color: '#3b82f6' },
  { name: 'Integrated Science',              code: 'ISCJ', education_level: 'junior_secondary', category: 'core', subject_group: 'stem', weekly_periods: 5, sort_order: 33, color: '#06b6d4' },
  { name: 'Social Studies',                  code: 'SSTJ', education_level: 'junior_secondary', category: 'core', subject_group: 'humanities', weekly_periods: 4, sort_order: 34, color: '#8b5cf6' },
  { name: 'Pre-Technical & Pre-Career Ed',   code: 'PTC',  education_level: 'junior_secondary', category: 'core', subject_group: 'technical', weekly_periods: 4, sort_order: 35, color: '#78716c' },
  { name: 'Agriculture & Nutrition',         code: 'AGN',  education_level: 'junior_secondary', category: 'core', subject_group: 'technical', weekly_periods: 3, sort_order: 36, color: '#16a34a' },
  { name: 'Physical & Health Education',     code: 'PHEJ', education_level: 'junior_secondary', category: 'core', subject_group: 'sports', weekly_periods: 3, sort_order: 37, color: '#f43f5e' },
  { name: 'Creative Arts & Sports',          code: 'CAS',  education_level: 'junior_secondary', category: 'core', subject_group: 'arts', weekly_periods: 3, sort_order: 38, color: '#a855f7' },
  { name: 'Religious Education',             code: 'RELJ', education_level: 'junior_secondary', category: 'core', subject_group: 'humanities', weekly_periods: 2, sort_order: 39, color: '#eab308' },
  // Junior Secondary — Electives
  { name: 'Business Studies',    code: 'BST',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'business', weekly_periods: 3, sort_order: 40, color: '#0ea5e9' },
  { name: 'Computer Science',    code: 'CSC',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 3, sort_order: 41, color: '#6366f1' },
  { name: 'Home Science (JSS)',  code: 'HMSJ', education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'technical', weekly_periods: 3, sort_order: 42, color: '#db2777' },
  { name: 'Visual Arts',         code: 'VAR',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'arts', weekly_periods: 3, sort_order: 43, color: '#d946ef' },
  { name: 'Performing Arts',     code: 'PAR',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'arts', weekly_periods: 3, sort_order: 44, color: '#ec4899' },
  { name: 'French',              code: 'FRE',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'languages', weekly_periods: 3, sort_order: 45, color: '#64748b' },
  { name: 'German',              code: 'GER',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'languages', weekly_periods: 3, sort_order: 46, color: '#64748b' },
  { name: 'Arabic',              code: 'ARB',  education_level: 'junior_secondary', category: 'elective', is_elective: true, subject_group: 'languages', weekly_periods: 3, sort_order: 47, color: '#64748b' },

  // Senior Secondary (Grade 10–12) — Core
  { name: 'English',    code: 'ENGS', education_level: 'senior_secondary', category: 'core', subject_group: 'languages', weekly_periods: 6, sort_order: 50, color: '#f97316' },
  { name: 'Kiswahili',  code: 'KISS', education_level: 'senior_secondary', category: 'core', subject_group: 'languages', weekly_periods: 5, sort_order: 51, color: '#84cc16' },
  { name: 'Mathematics',code: 'MTHS', education_level: 'senior_secondary', category: 'core', subject_group: 'stem', weekly_periods: 6, sort_order: 52, color: '#3b82f6' },
  { name: 'Physical Education (SS)',code: 'PHES',education_level: 'senior_secondary', category: 'core', subject_group: 'sports', weekly_periods: 2, sort_order: 53, color: '#f43f5e' },
  // Senior Secondary — Electives (pathway-based)
  { name: 'Physics',              code: 'PHY',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 4, sort_order: 60, color: '#0284c7' },
  { name: 'Chemistry',            code: 'CHE',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 4, sort_order: 61, color: '#7c3aed' },
  { name: 'Biology',              code: 'BIO',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 4, sort_order: 62, color: '#16a34a' },
  { name: 'Further Mathematics',  code: 'FMT',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 4, sort_order: 63, color: '#2563eb' },
  { name: 'Computer Science (SS)',code: 'CSCS', education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'stem', weekly_periods: 4, sort_order: 64, color: '#6366f1' },
  { name: 'History & Government', code: 'HIG',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'humanities', weekly_periods: 4, sort_order: 65, color: '#92400e' },
  { name: 'Geography',            code: 'GEO',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'humanities', weekly_periods: 4, sort_order: 66, color: '#065f46' },
  { name: 'Economics',            code: 'ECO',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'business', weekly_periods: 4, sort_order: 67, color: '#0369a1' },
  { name: 'Business Studies (SS)',code: 'BSTS', education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'business', weekly_periods: 4, sort_order: 68, color: '#0ea5e9' },
  { name: 'Agriculture (SS)',     code: 'AGRS', education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'technical', weekly_periods: 4, sort_order: 69, color: '#15803d' },
  { name: 'Home Science (SS)',    code: 'HMSS', education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'technical', weekly_periods: 4, sort_order: 70, color: '#be185d' },
  { name: 'Religious Education (SS)', code: 'RELS', education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'humanities', weekly_periods: 2, sort_order: 71, color: '#eab308' },
  { name: 'Art & Design',         code: 'ART',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'arts', weekly_periods: 4, sort_order: 72, color: '#d946ef' },
  { name: 'Music',                code: 'MUS',  education_level: 'senior_secondary', category: 'elective', is_elective: true, subject_group: 'arts', weekly_periods: 4, sort_order: 73, color: '#ec4899' },
];

// POST /setup/seed-classes
router.post('/setup/seed-classes', requireRole(['admin']), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    let created = 0, skipped = 0;

    for (const cls of CBC_CLASSES) {
      const existing = await query(
        'SELECT id FROM classes WHERE tenant_id=$1 AND name=$2 AND section=$3',
        [tid(req), cls.name, cls.section]
      );
      if (existing.length > 0) { skipped++; continue; }

      await query(
        `INSERT INTO classes (tenant_id, name, section, education_level, grade_number, capacity, sort_order, academic_year, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)`,
        [tid(req), cls.name, cls.section, cls.education_level, cls.grade_number, cls.capacity, cls.sort, currentYear]
      );
      created++;
    }
    res.json({ message: `Classes seeded: ${created} created, ${skipped} already exist` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /setup/seed-subjects
router.post('/setup/seed-subjects', requireRole(['admin']), async (req, res) => {
  try {
    let created = 0, skipped = 0;

    for (const sub of CBC_SUBJECTS) {
      const existing = await query(
        'SELECT id FROM subjects WHERE tenant_id=$1 AND code=$2',
        [tid(req), sub.code]
      );
      if (existing.length > 0) { skipped++; continue; }

      await query(
        `INSERT INTO subjects (tenant_id, name, code, education_level, category, subject_group, is_elective, weekly_periods, color, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)`,
        [tid(req), sub.name, sub.code, sub.education_level, sub.category,
         sub.subject_group, sub.is_elective || false, sub.weekly_periods, sub.color, sub.sort_order]
      );
      created++;
    }
    res.json({ message: `Subjects seeded: ${created} created, ${skipped} already exist` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /setup/seed-all
router.post('/setup/seed-all', requireRole(['admin']), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    let classesCreated = 0, subjectsCreated = 0;

    for (const cls of CBC_CLASSES) {
      const existing = await query('SELECT id FROM classes WHERE tenant_id=$1 AND name=$2 AND section=$3', [tid(req), cls.name, cls.section]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO classes (tenant_id, name, section, education_level, grade_number, capacity, sort_order, academic_year, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)`,
          [tid(req), cls.name, cls.section, cls.education_level, cls.grade_number, cls.capacity, cls.sort, currentYear]
        );
        classesCreated++;
      }
    }

    for (const sub of CBC_SUBJECTS) {
      const existing = await query('SELECT id FROM subjects WHERE tenant_id=$1 AND code=$2', [tid(req), sub.code]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO subjects (tenant_id, name, code, education_level, category, subject_group, is_elective, weekly_periods, color, sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)`,
          [tid(req), sub.name, sub.code, sub.education_level, sub.category,
           sub.subject_group, sub.is_elective || false, sub.weekly_periods, sub.color, sub.sort_order]
        );
        subjectsCreated++;
      }
    }

    res.json({
      message: `Seeding complete: ${classesCreated} classes + ${subjectsCreated} subjects created`,
      classes_created: classesCreated,
      subjects_created: subjectsCreated,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /setup/status — check if tenant has classes/subjects seeded
router.get('/setup/status', requireRole(['admin']), async (req, res) => {
  try {
    const [cls, sub] = await Promise.all([
      query('SELECT COUNT(*) FROM classes WHERE tenant_id=$1', [tid(req)]),
      query('SELECT COUNT(*) FROM subjects WHERE tenant_id=$1', [tid(req)]),
    ]);
    res.json({
      data: {
        class_count: parseInt(cls[0].count),
        subject_count: parseInt(sub[0].count),
        needs_setup: parseInt(cls[0].count) === 0,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
