/**
 * IGCSE (Cambridge International) Module Routes
 * Fully isolated from CBE — activated per school
 * Base path: /api/v1/igcse
 */
import express from 'express';
import pool, { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

// ── Auto-migration: create IGCSE tables if they don't exist ──────────────────
// Runs once at startup so any database (prod/staging/local) gets the schema.
const IGCSE_SCHEMA = `
CREATE TABLE IF NOT EXISTS igcse_grading_systems (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  name          VARCHAR(100) NOT NULL,
  scale_type    VARCHAR(20)  NOT NULL DEFAULT 'A_to_G',
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_grade_boundaries (
  id                  SERIAL PRIMARY KEY,
  grading_system_id   INTEGER NOT NULL REFERENCES igcse_grading_systems(id) ON DELETE CASCADE,
  exam_session_id     INTEGER,
  grade               VARCHAR(5) NOT NULL,
  min_score           NUMERIC(6,2) NOT NULL,
  max_score           NUMERIC(6,2) NOT NULL,
  sort_order          INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS igcse_exam_sessions (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  name        VARCHAR(150) NOT NULL,
  series      VARCHAR(30)  NOT NULL,
  year        INTEGER      NOT NULL,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT false,
  is_locked   BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_subjects (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20)  NOT NULL,
  subject_group   VARCHAR(100),
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_syllabi (
  id                  SERIAL PRIMARY KEY,
  subject_id          INTEGER NOT NULL REFERENCES igcse_subjects(id) ON DELETE CASCADE,
  syllabus_code       VARCHAR(20) NOT NULL,
  version             VARCHAR(50),
  description         TEXT,
  grading_system_id   INTEGER REFERENCES igcse_grading_systems(id),
  has_tiers           BOOLEAN DEFAULT true,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_components (
  id              SERIAL PRIMARY KEY,
  syllabus_id     INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  component_code  VARCHAR(20),
  type            VARCHAR(30) NOT NULL DEFAULT 'written',
  tier            VARCHAR(20) DEFAULT 'both',
  weight          NUMERIC(6,2) NOT NULL DEFAULT 100,
  max_marks       NUMERIC(6,2) NOT NULL,
  duration_minutes INTEGER,
  sort_order      INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS igcse_teacher_assignments (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  teacher_id      UUID NOT NULL,
  syllabus_id     INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  exam_session_id INTEGER NOT NULL REFERENCES igcse_exam_sessions(id) ON DELETE CASCADE,
  class_id        UUID,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_student_enrollments (
  id                SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  student_id        UUID NOT NULL,
  syllabus_id       INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  exam_session_id   INTEGER NOT NULL REFERENCES igcse_exam_sessions(id) ON DELETE CASCADE,
  tier              VARCHAR(20) DEFAULT 'extended',
  candidate_number  VARCHAR(30),
  centre_number     VARCHAR(20),
  class_id          UUID,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_marks (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES igcse_student_enrollments(id) ON DELETE CASCADE,
  component_id    INTEGER NOT NULL REFERENCES igcse_components(id) ON DELETE CASCADE,
  raw_score       NUMERIC(6,2),
  moderated_score NUMERIC(6,2),
  is_absent       BOOLEAN DEFAULT false,
  is_locked       BOOLEAN DEFAULT false,
  entered_by      UUID,
  locked_by       UUID,
  entered_at      TIMESTAMP DEFAULT NOW(),
  locked_at       TIMESTAMP,
  notes           TEXT
);
CREATE TABLE IF NOT EXISTS igcse_final_grades (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES igcse_student_enrollments(id) ON DELETE CASCADE,
  weighted_score  NUMERIC(6,2),
  final_grade     VARCHAR(5),
  is_official     BOOLEAN DEFAULT false,
  computed_at     TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS igcse_report_cards (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  student_id      UUID NOT NULL,
  exam_session_id INTEGER REFERENCES igcse_exam_sessions(id),
  generated_at    TIMESTAMP DEFAULT NOW(),
  generated_by    UUID,
  is_released     BOOLEAN DEFAULT false,
  notes           TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_subjects_code        ON igcse_subjects(tenant_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_teacher_assign       ON igcse_teacher_assignments(tenant_id, teacher_id, syllabus_id, exam_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_enrollment           ON igcse_student_enrollments(tenant_id, student_id, syllabus_id, exam_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_marks                ON igcse_marks(enrollment_id, component_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_final_grade          ON igcse_final_grades(enrollment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_igcse_boundary             ON igcse_grade_boundaries(grading_system_id, COALESCE(exam_session_id, -1), grade);
CREATE INDEX IF NOT EXISTS idx_igcse_subjects_tenant              ON igcse_subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_sessions_tenant              ON igcse_exam_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_syllabi_subject              ON igcse_syllabi(subject_id);
CREATE INDEX IF NOT EXISTS idx_igcse_components_syllabus          ON igcse_components(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_igcse_enrollments_student          ON igcse_student_enrollments(student_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_enrollments_session          ON igcse_student_enrollments(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_igcse_marks_enrollment             ON igcse_marks(enrollment_id);
`;

pool.query(IGCSE_SCHEMA)
  .then(() => console.log('IGCSE schema ready'))
  .catch(err => console.error('IGCSE schema init error:', err.message));

// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();
router.use(authenticate);
router.use(requireModule('academics'));
router.use(tenantContext);
router.use(requireActiveTenant);

const tid = (req) => req.user.tenant_id;
const uid = (req) => req.user.id;

// ============================================================
// GRADING SYSTEMS
// ============================================================

router.get('/grading-systems', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM igcse_grading_systems WHERE tenant_id = $1 ORDER BY name',
      [tid(req)]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/grading-systems', requireRole(['admin']), async (req, res) => {
  try {
    const { name, scale_type, description } = req.body;
    const row = await query(
      `INSERT INTO igcse_grading_systems (tenant_id, name, scale_type, description)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tid(req), name, scale_type || 'A_to_G', description]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/grading-systems/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, scale_type, description, is_active } = req.body;
    const row = await query(
      `UPDATE igcse_grading_systems
       SET name=$1, scale_type=$2, description=$3, is_active=$4
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [name, scale_type, description, is_active ?? true, req.params.id, tid(req)]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/grading-systems/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query(
      'DELETE FROM igcse_grading_systems WHERE id=$1 AND tenant_id=$2',
      [req.params.id, tid(req)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GRADE BOUNDARIES
// ============================================================

router.get('/grading-systems/:gsId/boundaries', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    // Verify grading system belongs to this tenant
    const [gs] = await query(
      'SELECT id FROM igcse_grading_systems WHERE id=$1 AND tenant_id=$2',
      [req.params.gsId, tid(req)]
    );
    if (!gs) return res.status(404).json({ error: 'Grading system not found' });

    const { session_id } = req.query;
    let where = 'gb.grading_system_id = $1';
    const params = [req.params.gsId];
    if (session_id) {
      where += ` AND (gb.exam_session_id = $2 OR gb.exam_session_id IS NULL)`;
      params.push(session_id);
    } else {
      where += ' AND gb.exam_session_id IS NULL';
    }
    const rows = await query(
      `SELECT gb.* FROM igcse_grade_boundaries gb WHERE ${where} ORDER BY gb.sort_order ASC, gb.min_score DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/grading-systems/:gsId/boundaries', requireRole(['admin']), async (req, res) => {
  try {
    // Verify grading system belongs to this tenant
    const [gs] = await query(
      'SELECT id FROM igcse_grading_systems WHERE id=$1 AND tenant_id=$2',
      [req.params.gsId, tid(req)]
    );
    if (!gs) return res.status(404).json({ error: 'Grading system not found' });

    const { boundaries, exam_session_id } = req.body;
    // If session provided, verify it belongs to this tenant
    if (exam_session_id) {
      const [sess] = await query(
        'SELECT id FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2',
        [exam_session_id, tid(req)]
      );
      if (!sess) return res.status(404).json({ error: 'Exam session not found' });
    }
    // Delete existing boundaries for this system+session before re-inserting
    await query(
      `DELETE FROM igcse_grade_boundaries
       WHERE grading_system_id = $1
         AND COALESCE(exam_session_id::text, '__null__') = COALESCE($2::text, '__null__')`,
      [req.params.gsId, exam_session_id || null]
    );
    const result = [];
    for (const b of boundaries) {
      const row = await query(
        `INSERT INTO igcse_grade_boundaries
           (grading_system_id, exam_session_id, grade, min_score, max_score, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.params.gsId, exam_session_id || null, b.grade, b.min_score, b.max_score, b.sort_order ?? 0]
      );
      result.push(row[0]);
    }
    res.status(201).json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/grade-boundaries/:id', requireRole(['admin']), async (req, res) => {
  try {
    // Verify boundary belongs to a grading system owned by this tenant
    const [boundary] = await query(
      `SELECT gb.id FROM igcse_grade_boundaries gb
       JOIN igcse_grading_systems gs ON gs.id = gb.grading_system_id
       WHERE gb.id = $1 AND gs.tenant_id = $2`,
      [req.params.id, tid(req)]
    );
    if (!boundary) return res.status(404).json({ error: 'Boundary not found' });
    await query('DELETE FROM igcse_grade_boundaries WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// EXAM SESSIONS
// ============================================================

router.get('/sessions', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM igcse_exam_sessions WHERE tenant_id = $1 ORDER BY year DESC, series`,
      [tid(req)]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sessions', requireRole(['admin']), async (req, res) => {
  try {
    const { name, series, year, start_date, end_date, is_active } = req.body;
    const row = await query(
      `INSERT INTO igcse_exam_sessions (tenant_id, name, series, year, start_date, end_date, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tid(req), name, series, year, start_date || null, end_date || null, is_active || false]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/sessions/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, series, year, start_date, end_date, is_active, is_locked } = req.body;
    // If activating this session, deactivate others
    if (is_active) {
      await query(
        'UPDATE igcse_exam_sessions SET is_active = false WHERE tenant_id=$1 AND id != $2',
        [tid(req), req.params.id]
      );
    }
    const row = await query(
      `UPDATE igcse_exam_sessions
       SET name=$1, series=$2, year=$3, start_date=$4, end_date=$5, is_active=$6, is_locked=$7
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [name, series, year, start_date || null, end_date || null, is_active ?? false, is_locked ?? false,
       req.params.id, tid(req)]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sessions/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// SUBJECTS
// ============================================================

router.get('/subjects', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { active_only } = req.query;
    let where = 'tenant_id = $1';
    if (active_only === 'true') where += ' AND is_active = true';
    const rows = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM igcse_syllabi sy WHERE sy.subject_id = s.id) AS syllabi_count
       FROM igcse_subjects s WHERE ${where} ORDER BY subject_group, name`,
      [tid(req)]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, subject_group, description } = req.body;
    const row = await query(
      `INSERT INTO igcse_subjects (tenant_id, name, code, subject_group, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tid(req), name, code, subject_group || null, description || null]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Subject code already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, subject_group, description, is_active } = req.body;
    const row = await query(
      `UPDATE igcse_subjects
       SET name=$1, code=$2, subject_group=$3, description=$4, is_active=$5
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [name, code, subject_group, description, is_active ?? true, req.params.id, tid(req)]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM igcse_subjects WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// SYLLABI
// ============================================================

router.get('/syllabi', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    // Always filter syllabi through the subjects table which carries tenant_id
    const params = [tid(req)];
    let extraWhere = '';
    if (req.query.subject_id) { extraWhere += ` AND s.subject_id = $2`; params.push(req.query.subject_id); }
    const rows = await query(
      `SELECT s.*,
         sub.name AS subject_name, sub.code AS subject_code, sub.subject_group,
         gs.name AS grading_system_name, gs.scale_type,
         (SELECT COUNT(*) FROM igcse_components c WHERE c.syllabus_id = s.id) AS component_count
       FROM igcse_syllabi s
       JOIN igcse_subjects sub ON sub.id = s.subject_id AND sub.tenant_id = $1
       LEFT JOIN igcse_grading_systems gs ON gs.id = s.grading_system_id AND gs.tenant_id = $1
       WHERE s.is_active = true${extraWhere}
       ORDER BY sub.name, s.version`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/syllabi', requireRole(['admin']), async (req, res) => {
  try {
    const { subject_id, syllabus_code, version, description, grading_system_id, has_tiers } = req.body;
    // Verify subject belongs to this tenant
    const [subject] = await query(
      'SELECT id FROM igcse_subjects WHERE id=$1 AND tenant_id=$2',
      [subject_id, tid(req)]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    // If grading system provided, verify it belongs to this tenant
    if (grading_system_id) {
      const [gs] = await query(
        'SELECT id FROM igcse_grading_systems WHERE id=$1 AND tenant_id=$2',
        [grading_system_id, tid(req)]
      );
      if (!gs) return res.status(404).json({ error: 'Grading system not found' });
    }
    const row = await query(
      `INSERT INTO igcse_syllabi (subject_id, syllabus_code, version, description, grading_system_id, has_tiers)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [subject_id, syllabus_code, version || null, description || null, grading_system_id || null, has_tiers ?? true]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/syllabi/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { syllabus_code, version, description, grading_system_id, has_tiers, is_active } = req.body;
    // Verify syllabus belongs to this tenant via its parent subject
    const [owned] = await query(
      `SELECT s.id FROM igcse_syllabi s
       JOIN igcse_subjects sub ON sub.id = s.subject_id AND sub.tenant_id = $1
       WHERE s.id = $2`,
      [tid(req), req.params.id]
    );
    if (!owned) return res.status(404).json({ error: 'Syllabus not found' });
    if (grading_system_id) {
      const [gs] = await query(
        'SELECT id FROM igcse_grading_systems WHERE id=$1 AND tenant_id=$2',
        [grading_system_id, tid(req)]
      );
      if (!gs) return res.status(404).json({ error: 'Grading system not found' });
    }
    const row = await query(
      `UPDATE igcse_syllabi
       SET syllabus_code=$1, version=$2, description=$3, grading_system_id=$4, has_tiers=$5, is_active=$6
       WHERE id=$7 RETURNING *`,
      [syllabus_code, version, description, grading_system_id || null, has_tiers ?? true, is_active ?? true, req.params.id]
    );
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/syllabi/:id', requireRole(['admin']), async (req, res) => {
  try {
    const [owned] = await query(
      `SELECT s.id FROM igcse_syllabi s
       JOIN igcse_subjects sub ON sub.id = s.subject_id AND sub.tenant_id = $1
       WHERE s.id = $2`,
      [tid(req), req.params.id]
    );
    if (!owned) return res.status(404).json({ error: 'Syllabus not found' });
    await query('DELETE FROM igcse_syllabi WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Helper: verify a syllabus belongs to this tenant ────────────────────────
async function ownsSyllabus(syllabusId, tenantId) {
  const [row] = await query(
    `SELECT s.id FROM igcse_syllabi s
     JOIN igcse_subjects sub ON sub.id = s.subject_id AND sub.tenant_id = $1
     WHERE s.id = $2`,
    [tenantId, syllabusId]
  );
  return !!row;
}

// ── Helper: verify a component belongs to this tenant ───────────────────────
async function ownsComponent(componentId, tenantId) {
  const [row] = await query(
    `SELECT c.id FROM igcse_components c
     JOIN igcse_syllabi s ON s.id = c.syllabus_id
     JOIN igcse_subjects sub ON sub.id = s.subject_id AND sub.tenant_id = $1
     WHERE c.id = $2`,
    [tenantId, componentId]
  );
  return !!row;
}

// ============================================================
// COMPONENTS
// ============================================================

router.get('/syllabi/:syllabusId/components', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    if (!await ownsSyllabus(req.params.syllabusId, tid(req))) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    const rows = await query(
      `SELECT * FROM igcse_components WHERE syllabus_id=$1 ORDER BY sort_order, name`,
      [req.params.syllabusId]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/syllabi/:syllabusId/components', requireRole(['admin']), async (req, res) => {
  try {
    if (!await ownsSyllabus(req.params.syllabusId, tid(req))) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    const { name, component_code, type, tier, weight, max_marks, duration_minutes, sort_order } = req.body;
    const row = await query(
      `INSERT INTO igcse_components
         (syllabus_id, name, component_code, type, tier, weight, max_marks, duration_minutes, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.syllabusId, name, component_code || null, type || 'written',
       tier || 'both', weight, max_marks, duration_minutes || null, sort_order ?? 0]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/components/:id', requireRole(['admin']), async (req, res) => {
  try {
    if (!await ownsComponent(req.params.id, tid(req))) {
      return res.status(404).json({ error: 'Component not found' });
    }
    const { name, component_code, type, tier, weight, max_marks, duration_minutes, sort_order } = req.body;
    const row = await query(
      `UPDATE igcse_components
       SET name=$1, component_code=$2, type=$3, tier=$4, weight=$5, max_marks=$6,
           duration_minutes=$7, sort_order=$8
       WHERE id=$9 RETURNING *`,
      [name, component_code || null, type, tier, weight, max_marks,
       duration_minutes || null, sort_order ?? 0, req.params.id]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/components/:id', requireRole(['admin']), async (req, res) => {
  try {
    if (!await ownsComponent(req.params.id, tid(req))) {
      return res.status(404).json({ error: 'Component not found' });
    }
    await query('DELETE FROM igcse_components WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// TEACHER ASSIGNMENTS
// ============================================================

router.get('/teacher-assignments', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    let where = 'ta.tenant_id = $1';
    const params = [tid(req)];
    let i = 2;
    if (req.user.role === 'teacher') {
      where += ` AND ta.teacher_id = $${i++}`; params.push(uid(req));
    }
    const rows = await query(
      `SELECT ta.*,
         t.first_name || ' ' || t.last_name AS teacher_name,
         sub.name AS subject_name, sub.code AS subject_code,
         sy.version AS syllabus_version,
         es.name AS session_name
       FROM igcse_teacher_assignments ta
       JOIN teachers t ON t.user_id = ta.teacher_id
       JOIN igcse_syllabi sy ON sy.id = ta.syllabus_id
       JOIN igcse_subjects sub ON sub.id = sy.subject_id
       JOIN igcse_exam_sessions es ON es.id = ta.exam_session_id
       WHERE ${where}
       ORDER BY es.year DESC, sub.name`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/teacher-assignments', requireRole(['admin']), async (req, res) => {
  try {
    const { teacher_id, syllabus_id, exam_session_id, class_id } = req.body;
    // Verify both syllabus and session belong to this tenant
    if (!await ownsSyllabus(syllabus_id, tid(req))) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    const [sess] = await query(
      'SELECT id FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2',
      [exam_session_id, tid(req)]
    );
    if (!sess) return res.status(404).json({ error: 'Exam session not found' });
    const row = await query(
      `INSERT INTO igcse_teacher_assignments (tenant_id, teacher_id, syllabus_id, exam_session_id, class_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, teacher_id, syllabus_id, exam_session_id) DO NOTHING
       RETURNING *`,
      [tid(req), teacher_id, syllabus_id, exam_session_id, class_id || null]
    );
    res.status(201).json({ data: row[0] || { message: 'Already assigned' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/teacher-assignments/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM igcse_teacher_assignments WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// STUDENT ENROLLMENTS
// ============================================================

router.get('/enrollments', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { session_id, syllabus_id, student_id, class_id } = req.query;
    let where = ['e.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (session_id) { where.push(`e.exam_session_id = $${i++}`); params.push(session_id); }
    if (syllabus_id) { where.push(`e.syllabus_id = $${i++}`); params.push(syllabus_id); }
    if (student_id) { where.push(`e.student_id = $${i++}`); params.push(student_id); }
    if (class_id) { where.push(`e.class_id = $${i++}`); params.push(class_id); }
    // Students only see their own
    if (req.user.role === 'student') {
      where.push(`e.student_id = $${i++}`); params.push(uid(req));
    }
    const rows = await query(
      `SELECT e.*,
         s.first_name || ' ' || s.last_name AS student_name,
         s.admission_number,
         sy.syllabus_code, sy.version AS syllabus_version,
         sub.name AS subject_name, sub.code AS subject_code,
         es.name AS session_name,
         c.name AS class_name,
         fg.final_grade, fg.weighted_score
       FROM igcse_student_enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN igcse_syllabi sy ON sy.id = e.syllabus_id
       JOIN igcse_subjects sub ON sub.id = sy.subject_id
       JOIN igcse_exam_sessions es ON es.id = e.exam_session_id
       LEFT JOIN classes c ON c.id = e.class_id
       LEFT JOIN igcse_final_grades fg ON fg.enrollment_id = e.id
       WHERE ${where.join(' AND ')}
       ORDER BY sub.name, s.last_name`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/enrollments', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { student_id, syllabus_id, exam_session_id, tier, candidate_number, centre_number, class_id } = req.body;
    // Verify syllabus and session belong to this tenant
    if (!await ownsSyllabus(syllabus_id, tid(req))) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    const [sess] = await query(
      'SELECT id FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2',
      [exam_session_id, tid(req)]
    );
    if (!sess) return res.status(404).json({ error: 'Exam session not found' });
    const row = await query(
      `INSERT INTO igcse_student_enrollments
         (tenant_id, student_id, syllabus_id, exam_session_id, tier, candidate_number, centre_number, class_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (tenant_id, student_id, syllabus_id, exam_session_id) DO NOTHING
       RETURNING *`,
      [tid(req), student_id, syllabus_id, exam_session_id,
       tier || 'extended', candidate_number || null, centre_number || null, class_id || null]
    );
    res.status(201).json({ data: row[0] || { message: 'Already enrolled' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/enrollments/bulk', requireRole(['admin']), async (req, res) => {
  try {
    // Enroll multiple students in one subject
    const { student_ids, syllabus_id, exam_session_id, tier, class_id } = req.body;
    // Verify syllabus and session belong to this tenant
    if (!await ownsSyllabus(syllabus_id, tid(req))) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    const [sess] = await query(
      'SELECT id FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2',
      [exam_session_id, tid(req)]
    );
    if (!sess) return res.status(404).json({ error: 'Exam session not found' });
    let enrolled = 0;
    for (const sid of student_ids) {
      const r = await query(
        `INSERT INTO igcse_student_enrollments
           (tenant_id, student_id, syllabus_id, exam_session_id, tier, class_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, student_id, syllabus_id, exam_session_id) DO NOTHING`,
        [tid(req), sid, syllabus_id, exam_session_id, tier || 'extended', class_id || null]
      );
      if (r) enrolled++;
    }
    res.status(201).json({ data: { enrolled } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/enrollments/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { tier, candidate_number, centre_number, is_active } = req.body;
    const row = await query(
      `UPDATE igcse_student_enrollments
       SET tier=$1, candidate_number=$2, centre_number=$3, is_active=$4
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [tier, candidate_number, centre_number, is_active ?? true, req.params.id, tid(req)]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/enrollments/:id', requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM igcse_student_enrollments WHERE id=$1 AND tenant_id=$2', [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// MARKS ENTRY
// ============================================================

// Get marks for an enrollment (all components)
// ── Helper: verify an enrollment belongs to this tenant ─────────────────────
async function ownsEnrollment(enrollmentId, tenantId) {
  const [row] = await query(
    'SELECT id FROM igcse_student_enrollments WHERE id=$1 AND tenant_id=$2',
    [enrollmentId, tenantId]
  );
  return !!row;
}

// ── Helper: verify all enrollment_ids in a batch belong to this tenant ───────
async function ownAllEnrollments(enrollmentIds, tenantId) {
  if (!enrollmentIds.length) return true;
  const unique = [...new Set(enrollmentIds)];
  const rows = await query(
    `SELECT id FROM igcse_student_enrollments
     WHERE id = ANY($1::int[]) AND tenant_id = $2`,
    [unique, tenantId]
  );
  return rows.length === unique.length;
}

router.get('/enrollments/:enrollmentId/marks', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    // Students may only read their own enrollment marks
    if (req.user.role === 'student') {
      const [enroll] = await query(
        'SELECT id FROM igcse_student_enrollments WHERE id=$1 AND tenant_id=$2 AND student_id=$3',
        [req.params.enrollmentId, tid(req), uid(req)]
      );
      if (!enroll) return res.status(404).json({ error: 'Enrollment not found' });
    } else {
      if (!await ownsEnrollment(req.params.enrollmentId, tid(req))) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
    }
    const rows = await query(
      `SELECT m.*, c.name AS component_name, c.max_marks, c.weight, c.type, c.tier
       FROM igcse_marks m
       JOIN igcse_components c ON c.id = m.component_id
       WHERE m.enrollment_id = $1
       ORDER BY c.sort_order`,
      [req.params.enrollmentId]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upsert mark for one component
router.post('/marks', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { enrollment_id, component_id, raw_score, is_absent, notes } = req.body;
    // Verify enrollment belongs to this tenant
    if (!await ownsEnrollment(enrollment_id, tid(req))) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    // Verify component belongs to this tenant via syllabus → subject chain
    if (!await ownsComponent(component_id, tid(req))) {
      return res.status(404).json({ error: 'Component not found' });
    }
    // Check not locked (unless admin)
    if (req.user.role !== 'admin') {
      const existing = await query(
        'SELECT is_locked FROM igcse_marks WHERE enrollment_id=$1 AND component_id=$2',
        [enrollment_id, component_id]
      );
      if (existing.length && existing[0].is_locked) {
        return res.status(403).json({ error: 'Mark is locked and cannot be changed' });
      }
    }
    const row = await query(
      `INSERT INTO igcse_marks (enrollment_id, component_id, raw_score, is_absent, notes, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (enrollment_id, component_id)
       DO UPDATE SET raw_score=EXCLUDED.raw_score, is_absent=EXCLUDED.is_absent,
                     notes=EXCLUDED.notes, entered_by=EXCLUDED.entered_by, entered_at=NOW()
       RETURNING *`,
      [enrollment_id, component_id, raw_score ?? null, is_absent ?? false, notes || null, uid(req)]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Batch upsert marks for a class/syllabus (teacher workflow)
router.post('/marks/batch', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { marks } = req.body;
    if (!marks?.length) return res.status(400).json({ error: 'No marks provided' });
    // Verify ALL enrollment_ids belong to this tenant in one query
    const enrollmentIds = marks.map(m => m.enrollment_id);
    if (!await ownAllEnrollments(enrollmentIds, tid(req))) {
      return res.status(403).json({ error: 'One or more enrollments do not belong to your school' });
    }
    const result = [];
    for (const m of marks) {
      const row = await query(
        `INSERT INTO igcse_marks (enrollment_id, component_id, raw_score, is_absent, notes, entered_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (enrollment_id, component_id)
         DO UPDATE SET raw_score=EXCLUDED.raw_score, is_absent=EXCLUDED.is_absent,
                       notes=EXCLUDED.notes, entered_by=EXCLUDED.entered_by, entered_at=NOW()
         RETURNING *`,
        [m.enrollment_id, m.component_id, m.raw_score ?? null, m.is_absent ?? false, m.notes || null, uid(req)]
      );
      result.push(row[0]);
    }
    res.status(201).json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Moderate coursework mark
router.put('/marks/:enrollmentId/:componentId/moderate', requireRole(['admin']), async (req, res) => {
  try {
    // Verify enrollment belongs to this tenant
    if (!await ownsEnrollment(req.params.enrollmentId, tid(req))) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    const { moderated_score, notes } = req.body;
    const row = await query(
      `UPDATE igcse_marks
       SET moderated_score=$1, notes=$2
       WHERE enrollment_id=$3 AND component_id=$4 RETURNING *`,
      [moderated_score, notes || null, req.params.enrollmentId, req.params.componentId]
    );
    if (!row.length) return res.status(404).json({ error: 'Mark not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lock marks for a session/syllabus
router.post('/marks/lock', requireRole(['admin']), async (req, res) => {
  try {
    const { session_id, syllabus_id } = req.body;
    await query(
      `UPDATE igcse_marks m
       SET is_locked = true, locked_by = $1, locked_at = NOW()
       FROM igcse_student_enrollments e
       WHERE m.enrollment_id = e.id
         AND e.exam_session_id = $2
         AND e.syllabus_id = $3
         AND e.tenant_id = $4`,
      [uid(req), session_id, syllabus_id, tid(req)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GRADE CALCULATION ENGINE
// ============================================================

// Calculate + store final grade for one enrollment
async function computeGrade(enrollmentId, tenantId) {
  // Get enrollment + syllabus grading system
  const [enrollment] = await query(
    `SELECT e.*, sy.grading_system_id
     FROM igcse_student_enrollments e
     JOIN igcse_syllabi sy ON sy.id = e.syllabus_id
     WHERE e.id = $1 AND e.tenant_id = $2`,
    [enrollmentId, tenantId]
  );
  if (!enrollment) return null;

  // Get all components for this syllabus
  const components = await query(
    'SELECT * FROM igcse_components WHERE syllabus_id = $1',
    [enrollment.syllabus_id]
  );

  // Get marks
  const marks = await query(
    'SELECT * FROM igcse_marks WHERE enrollment_id = $1',
    [enrollmentId]
  );
  const markMap = {};
  for (const m of marks) markMap[m.component_id] = m;

  // Filter components by tier
  const relevantComponents = components.filter(
    c => c.tier === 'both' || c.tier === enrollment.tier
  );

  let totalWeight = 0;
  let weightedSum = 0;
  for (const comp of relevantComponents) {
    const mark = markMap[comp.id];
    if (!mark || mark.is_absent || mark.raw_score === null) continue;
    const score = mark.moderated_score ?? mark.raw_score;
    const pct = (parseFloat(score) / parseFloat(comp.max_marks)) * 100;
    weightedSum += pct * parseFloat(comp.weight);
    totalWeight += parseFloat(comp.weight);
  }

  if (totalWeight === 0) return null;
  const finalScore = weightedSum / totalWeight;

  // Look up grade boundary
  let finalGrade = 'U';
  if (enrollment.grading_system_id) {
    const boundaries = await query(
      `SELECT * FROM igcse_grade_boundaries
       WHERE grading_system_id = $1 AND exam_session_id IS NULL
       ORDER BY min_score DESC`,
      [enrollment.grading_system_id]
    );
    for (const b of boundaries) {
      if (finalScore >= parseFloat(b.min_score)) {
        finalGrade = b.grade;
        break;
      }
    }
  }

  // Upsert final grade
  const [result] = await query(
    `INSERT INTO igcse_final_grades (enrollment_id, weighted_score, final_grade, computed_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (enrollment_id)
     DO UPDATE SET weighted_score=EXCLUDED.weighted_score, final_grade=EXCLUDED.final_grade, computed_at=NOW()
     RETURNING *`,
    [enrollmentId, finalScore.toFixed(2), finalGrade]
  );
  return result;
}

// Calculate grade for one enrollment
router.post('/enrollments/:id/calculate', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const [enroll] = await query(
      'SELECT * FROM igcse_student_enrollments WHERE id=$1 AND tenant_id=$2',
      [req.params.id, tid(req)]
    );
    if (!enroll) return res.status(404).json({ error: 'Enrollment not found' });
    const result = await computeGrade(req.params.id, tid(req));
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Calculate all grades for a session
router.post('/sessions/:sessionId/calculate-all', requireRole(['admin']), async (req, res) => {
  try {
    const enrollments = await query(
      'SELECT id FROM igcse_student_enrollments WHERE exam_session_id=$1 AND tenant_id=$2 AND is_active=true',
      [req.params.sessionId, tid(req)]
    );
    let computed = 0;
    for (const e of enrollments) {
      const r = await computeGrade(e.id, tid(req));
      if (r) computed++;
    }
    res.json({ data: { computed, total: enrollments.length } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// RESULTS VIEW
// ============================================================

// Full results for a student in a session
router.get('/results/student/:studentId', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { session_id } = req.query;
    // Students can only view own results
    if (req.user.role === 'student' && parseInt(req.params.studentId) !== uid(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let where = ['e.student_id = $1', 'e.tenant_id = $2'];
    const params = [req.params.studentId, tid(req)];
    if (session_id) { where.push('e.exam_session_id = $3'); params.push(session_id); }

    const enrollments = await query(
      `SELECT e.*,
         sub.name AS subject_name, sub.code AS subject_code,
         sy.syllabus_code, sy.version, sy.grading_system_id,
         es.name AS session_name,
         fg.final_grade, fg.weighted_score
       FROM igcse_student_enrollments e
       JOIN igcse_syllabi sy ON sy.id = e.syllabus_id
       JOIN igcse_subjects sub ON sub.id = sy.subject_id
       JOIN igcse_exam_sessions es ON es.id = e.exam_session_id
       LEFT JOIN igcse_final_grades fg ON fg.enrollment_id = e.id
       WHERE ${where.join(' AND ')}
       ORDER BY sub.name`,
      params
    );

    // Get marks for each enrollment
    for (const enroll of enrollments) {
      enroll.marks = await query(
        `SELECT m.*, c.name AS component_name, c.max_marks, c.weight, c.type, c.sort_order
         FROM igcse_marks m
         JOIN igcse_components c ON c.id = m.component_id
         WHERE m.enrollment_id = $1
         ORDER BY c.sort_order`,
        [enroll.id]
      );
    }

    res.json({ data: enrollments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Results summary for a session (admin view)
router.get('/sessions/:sessionId/results', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         sub.name AS subject_name, sub.code AS subject_code,
         sy.version, e.tier,
         fg.final_grade,
         COUNT(*) AS student_count,
         AVG(fg.weighted_score) AS avg_score
       FROM igcse_student_enrollments e
       JOIN igcse_syllabi sy ON sy.id = e.syllabus_id
       JOIN igcse_subjects sub ON sub.id = sy.subject_id
       LEFT JOIN igcse_final_grades fg ON fg.enrollment_id = e.id
       WHERE e.exam_session_id = $1 AND e.tenant_id = $2 AND e.is_active = true
       GROUP BY sub.name, sub.code, sy.version, e.tier, fg.final_grade
       ORDER BY sub.name, fg.final_grade`,
      [req.params.sessionId, tid(req)]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark entry sheet: enrollments + marks for a given syllabus/session
router.get('/mark-entry', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { syllabus_id, session_id } = req.query;
    if (!syllabus_id || !session_id) {
      return res.status(400).json({ error: 'syllabus_id and session_id required' });
    }

    // Components for this syllabus
    const components = await query(
      'SELECT * FROM igcse_components WHERE syllabus_id=$1 ORDER BY sort_order',
      [syllabus_id]
    );

    // Enrollments
    const enrollments = await query(
      `SELECT e.*,
         s.first_name || ' ' || s.last_name AS student_name,
         s.admission_number,
         e.tier, e.candidate_number,
         fg.final_grade, fg.weighted_score
       FROM igcse_student_enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN igcse_final_grades fg ON fg.enrollment_id = e.id
       WHERE e.syllabus_id = $1 AND e.exam_session_id = $2 AND e.tenant_id = $3 AND e.is_active = true
       ORDER BY s.last_name, s.first_name`,
      [syllabus_id, session_id, tid(req)]
    );

    // Marks map
    if (enrollments.length) {
      const ids = enrollments.map(e => e.id);
      const marks = await query(
        `SELECT * FROM igcse_marks WHERE enrollment_id = ANY($1::int[])`,
        [ids]
      );
      const markMap = {};
      for (const m of marks) {
        if (!markMap[m.enrollment_id]) markMap[m.enrollment_id] = {};
        markMap[m.enrollment_id][m.component_id] = m;
      }
      for (const e of enrollments) e.marks = markMap[e.id] || {};
    }

    res.json({ data: { components, enrollments } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// REPORT CARDS
// ============================================================

router.get('/report-cards', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { session_id, student_id } = req.query;
    let where = ['rc.tenant_id = $1'];
    const params = [tid(req)];
    let i = 2;
    if (session_id) { where.push(`rc.exam_session_id = $${i++}`); params.push(session_id); }
    if (student_id) { where.push(`rc.student_id = $${i++}`); params.push(student_id); }
    if (req.user.role === 'student') {
      where.push(`rc.student_id = $${i++}`); params.push(uid(req));
    }
    const rows = await query(
      `SELECT rc.*,
         s.first_name || ' ' || s.last_name AS student_name,
         es.name AS session_name
       FROM igcse_report_cards rc
       JOIN students s ON s.id = rc.student_id
       LEFT JOIN igcse_exam_sessions es ON es.id = rc.exam_session_id
       WHERE ${where.join(' AND ')}
       ORDER BY rc.generated_at DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/report-cards/generate', requireRole(['admin']), async (req, res) => {
  try {
    const { student_id, exam_session_id, notes } = req.body;
    // Upsert
    const row = await query(
      `INSERT INTO igcse_report_cards (tenant_id, student_id, exam_session_id, notes, generated_by, generated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT DO NOTHING RETURNING *`,
      [tid(req), student_id, exam_session_id, notes || null, uid(req)]
    );
    res.status(201).json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/report-cards/:id/release', requireRole(['admin']), async (req, res) => {
  try {
    const row = await query(
      `UPDATE igcse_report_cards SET is_released = true WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [req.params.id, tid(req)]
    );
    if (!row.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: row[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Full report card data for one student/session
router.get('/report-cards/data/:studentId/:sessionId', requireRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;
    if (req.user.role === 'student' && parseInt(studentId) !== uid(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [student] = await query(
      `SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id=$1`,
      [studentId]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [session] = await query(
      'SELECT * FROM igcse_exam_sessions WHERE id=$1 AND tenant_id=$2',
      [sessionId, tid(req)]
    );

    const enrollments = await query(
      `SELECT e.*,
         sub.name AS subject_name, sub.code AS subject_code,
         sy.version,
         fg.final_grade, fg.weighted_score
       FROM igcse_student_enrollments e
       JOIN igcse_syllabi sy ON sy.id = e.syllabus_id
       JOIN igcse_subjects sub ON sub.id = sy.subject_id
       LEFT JOIN igcse_final_grades fg ON fg.enrollment_id = e.id
       WHERE e.student_id=$1 AND e.exam_session_id=$2 AND e.tenant_id=$3 AND e.is_active=true
       ORDER BY sub.name`,
      [studentId, sessionId, tid(req)]
    );

    for (const enroll of enrollments) {
      enroll.marks = await query(
        `SELECT m.*, c.name AS component_name, c.max_marks, c.weight, c.sort_order
         FROM igcse_marks m
         JOIN igcse_components c ON c.id = m.component_id
         WHERE m.enrollment_id = $1
         ORDER BY c.sort_order`,
        [enroll.id]
      );
    }

    res.json({ data: { student, session, enrollments } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// DASHBOARD STATS
// ============================================================

router.get('/dashboard', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const [subjectCount] = await query(
      'SELECT COUNT(*) FROM igcse_subjects WHERE tenant_id=$1 AND is_active=true', [tid(req)]
    );
    const [sessionCount] = await query(
      'SELECT COUNT(*) FROM igcse_exam_sessions WHERE tenant_id=$1', [tid(req)]
    );
    const [activeSession] = await query(
      'SELECT * FROM igcse_exam_sessions WHERE tenant_id=$1 AND is_active=true LIMIT 1', [tid(req)]
    );
    let enrollCount = [{ count: 0 }];
    let gradedCount = [{ count: 0 }];
    if (activeSession) {
      enrollCount = await query(
        'SELECT COUNT(*) FROM igcse_student_enrollments WHERE exam_session_id=$1 AND tenant_id=$2 AND is_active=true',
        [activeSession.id, tid(req)]
      );
      gradedCount = await query(
        `SELECT COUNT(*) FROM igcse_final_grades fg
         JOIN igcse_student_enrollments e ON e.id = fg.enrollment_id
         WHERE e.exam_session_id=$1 AND e.tenant_id=$2`,
        [activeSession.id, tid(req)]
      );
    }

    // Grade distribution for active session
    let gradeDistribution = [];
    if (activeSession) {
      gradeDistribution = await query(
        `SELECT fg.final_grade, COUNT(*) AS count
         FROM igcse_final_grades fg
         JOIN igcse_student_enrollments e ON e.id = fg.enrollment_id
         WHERE e.exam_session_id=$1 AND e.tenant_id=$2
         GROUP BY fg.final_grade ORDER BY fg.final_grade`,
        [activeSession.id, tid(req)]
      );
    }

    res.json({
      data: {
        subjects: parseInt(subjectCount.count),
        sessions: parseInt(sessionCount.count),
        active_session: activeSession || null,
        enrollments: parseInt(enrollCount[0]?.count || 0),
        graded: parseInt(gradedCount[0]?.count || 0),
        grade_distribution: gradeDistribution,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
