import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Kenya grade mapping ──────────────────────────────────────────────────────
// Maps class name (or education_level) to NEMIS-standard Kenya grade label
function classToKenyaGrade(className, educationLevel) {
  if (!className && !educationLevel) return '';

  const name = (className || '').toLowerCase().trim();

  // Match patterns like "Grade 1", "Grade1", "Grade 10", etc.
  const gradeMatch = name.match(/grade\s*(\d+)/);
  if (gradeMatch) return `Grade ${gradeMatch[1]}`;

  // Pre-primary
  if (name.includes('pp1') || name.includes('pre-primary 1') || name.includes('preprimary 1')) return 'PP1';
  if (name.includes('pp2') || name.includes('pre-primary 2') || name.includes('preprimary 2')) return 'PP2';
  if (name.includes('playgroup') || name.includes('play group')) return 'Playgroup';

  // Junior Secondary
  if (name.includes('jss 1') || name.includes('jss1') || name === 'grade 7') return 'Grade 7';
  if (name.includes('jss 2') || name.includes('jss2') || name === 'grade 8') return 'Grade 8';
  if (name.includes('jss 3') || name.includes('jss3') || name === 'grade 9') return 'Grade 9';

  // Senior Secondary
  if (name.includes('form 1') || name === 'grade 10') return 'Grade 10';
  if (name.includes('form 2') || name === 'grade 11') return 'Grade 11';
  if (name.includes('form 3') || name === 'grade 12') return 'Grade 12';

  // Fallback — use education_level label
  const levelMap = {
    playgroup: 'Playgroup',
    pre_primary: 'PP1',
    lower_primary: 'Grade 1',
    upper_primary: 'Grade 4',
    junior_secondary: 'Grade 7',
    senior_secondary: 'Grade 10',
  };
  return levelMap[educationLevel] || className || '';
}

// ─── GET /config ───────────────────────────────────────────────────────────
router.get('/config', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      'SELECT * FROM nemis_config WHERE tenant_id = $1',
      [tid]
    );
    const config = rows.length > 0 ? rows[0] : { tenant_id: tid, nemis_code: null, county: null, sub_county: null, ward: null };
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error('Get NEMIS config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /config ───────────────────────────────────────────────────────────
router.put('/config', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { nemis_code, county, sub_county, ward } = req.body;

    const rows = await query(
      `INSERT INTO nemis_config (id, tenant_id, nemis_code, county, sub_county, ward, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         nemis_code = EXCLUDED.nemis_code,
         county     = EXCLUDED.county,
         sub_county = EXCLUDED.sub_county,
         ward       = EXCLUDED.ward,
         updated_at = NOW()
       RETURNING *`,
      [uuidv4(), tid, nemis_code || null, county || null, sub_county || null, ward || null]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update NEMIS config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /export/students — JSON export ────────────────────────────────────
router.get('/export/students', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id } = req.query;

    const conditions = ['s.tenant_id = $1', "s.status = 'active'"];
    const params = [tid];

    if (class_id) {
      params.push(class_id);
      conditions.push(`s.class_id = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const rows = await query(
      `SELECT
         s.id,
         s.admission_number,
         s.first_name,
         s.last_name,
         s.middle_name,
         s.gender,
         s.date_of_birth,
         c.name AS class_name,
         c.education_level
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE ${where}
       ORDER BY c.name ASC, s.last_name ASC, s.first_name ASC`,
      params
    );

    // Get NEMIS config for nemis_code
    const configRows = await query(
      'SELECT nemis_code FROM nemis_config WHERE tenant_id = $1',
      [tid]
    );
    const nemisCode = configRows[0]?.nemis_code || '';

    const exported = rows.map(s => ({
      learner_ref: s.admission_number || '',
      surname: s.last_name || '',
      other_names: [s.first_name, s.middle_name].filter(Boolean).join(' '),
      gender: s.gender || '',
      dob: s.date_of_birth || '',
      grade: classToKenyaGrade(s.class_name, s.education_level),
      nemis_code: nemisCode,
    }));

    res.json({ success: true, data: exported, total: exported.length });
  } catch (err) {
    logger.error('NEMIS export students error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /export/students/csv — CSV download ───────────────────────────────
router.get('/export/students/csv', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id } = req.query;

    const conditions = ['s.tenant_id = $1', "s.status = 'active'"];
    const params = [tid];

    if (class_id) {
      params.push(class_id);
      conditions.push(`s.class_id = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const rows = await query(
      `SELECT
         s.admission_number,
         s.first_name,
         s.last_name,
         s.middle_name,
         s.gender,
         s.date_of_birth,
         c.name AS class_name,
         c.education_level
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE ${where}
       ORDER BY c.name ASC, s.last_name ASC, s.first_name ASC`,
      params
    );

    const configRows = await query(
      'SELECT nemis_code FROM nemis_config WHERE tenant_id = $1',
      [tid]
    );
    const nemisCode = configRows[0]?.nemis_code || '';

    // Build CSV manually
    const escapeCSV = (val) => {
      const str = val == null ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['learner_ref', 'surname', 'other_names', 'gender', 'dob', 'grade', 'nemis_code'];
    const csvLines = [headers.join(',')];

    for (const s of rows) {
      const row = [
        s.admission_number || '',
        s.last_name || '',
        [s.first_name, s.middle_name].filter(Boolean).join(' '),
        s.gender || '',
        s.date_of_birth ? String(s.date_of_birth).split('T')[0] : '',
        classToKenyaGrade(s.class_name, s.education_level),
        nemisCode,
      ];
      csvLines.push(row.map(escapeCSV).join(','));
    }

    const csv = csvLines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nemis_students.csv"');
    res.send(csv);
  } catch (err) {
    logger.error('NEMIS CSV export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /validate — check how many students are missing required NEMIS fields
router.get('/validate', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const rows = await query(
      `SELECT
         s.id,
         s.first_name || ' ' || s.last_name AS name,
         s.admission_number,
         s.date_of_birth,
         s.gender
       FROM students s
       WHERE s.tenant_id = $1 AND s.status = 'active'
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [tid]
    );

    const total = rows.length;
    let missingDob = 0;
    let missingGender = 0;
    let missingAdmission = 0;
    const studentsWithIssues = [];

    for (const s of rows) {
      const missing = [];
      if (!s.date_of_birth) { missing.push('dob'); missingDob++; }
      if (!s.gender) { missing.push('gender'); missingGender++; }
      if (!s.admission_number) { missing.push('admission_number'); missingAdmission++; }

      if (missing.length > 0) {
        studentsWithIssues.push({
          id: s.id,
          name: s.name,
          admission_number: s.admission_number || null,
          missing,
        });
      }
    }

    const complete = total - studentsWithIssues.length;

    res.json({
      success: true,
      data: {
        total,
        complete,
        incomplete: studentsWithIssues.length,
        missing_dob: missingDob,
        missing_gender: missingGender,
        missing_admission: missingAdmission,
        students_with_issues: studentsWithIssues,
      },
    });
  } catch (err) {
    logger.error('NEMIS validate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
