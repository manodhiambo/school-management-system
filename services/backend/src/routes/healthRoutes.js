import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/health/records?student_id=&record_type=&from=&to=
router.get('/records', authenticate, async (req, res) => {
  try {
    const { student_id, record_type, from, to, is_emergency } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT hr.*, s.first_name||' '||s.last_name as student_name,
               s.admission_number, c.name as class_name
               FROM student_health_records hr
               JOIN students s ON s.id = hr.student_id
               LEFT JOIN classes c ON c.id = s.class_id
               WHERE hr.tenant_id=$1`;
    const params = [tid];
    if (student_id) { sql += ` AND hr.student_id=$${params.length+1}`; params.push(student_id); }
    if (record_type) { sql += ` AND hr.record_type=$${params.length+1}`; params.push(record_type); }
    if (from) { sql += ` AND hr.record_date>=$${params.length+1}`; params.push(from); }
    if (to) { sql += ` AND hr.record_date<=$${params.length+1}`; params.push(to); }
    if (is_emergency === 'true') { sql += ` AND hr.is_emergency=TRUE`; }
    sql += ' ORDER BY hr.record_date DESC, hr.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get health records error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/health/records
router.post('/records', authenticate, async (req, res) => {
  try {
    const {
      student_id, record_date, record_type, description, symptoms, diagnosis,
      treatment, medication, referred_to_hospital, hospital_name,
      follow_up_required, follow_up_date, attended_by, is_emergency
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO student_health_records
       (student_id, record_date, record_type, description, symptoms, diagnosis,
        treatment, medication, referred_to_hospital, hospital_name,
        follow_up_required, follow_up_date, attended_by, nurse_teacher_id,
        is_emergency, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [student_id, record_date || new Date(), record_type, description,
       symptoms, diagnosis, treatment, medication,
       referred_to_hospital || false, hospital_name,
       follow_up_required || false, follow_up_date || null,
       attended_by, req.user.id, is_emergency || false, tid]
    );
    const record = rows[0];

    // Notify parents if emergency
    if (is_emergency) {
      try {
        const { sendStudentAlert } = await import('./parentAlertsRoutes.js');
        await sendStudentAlert(student_id, 'health_incident',
          'URGENT: Health Emergency at School',
          `Your child has had a health emergency at school. Type: ${record_type}. ${description}. ${referred_to_hospital ? 'Referred to ' + (hospital_name || 'hospital') + '.' : ''} Please contact the school immediately.`,
          'health_record', record.id, tid
        );
        await query('UPDATE student_health_records SET parent_notified=TRUE, parent_notified_at=NOW() WHERE id=$1', [record.id]);
      } catch (e) {
        logger.warn('Health alert failed:', e.message);
      }
    }

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    logger.error('Create health record error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/health/profile/:studentId
router.get('/profile/:studentId', authenticate, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM student_medical_profile WHERE student_id=$1', [req.params.studentId]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST/PUT /api/v1/health/profile (upsert)
router.post('/profile', authenticate, async (req, res) => {
  try {
    const {
      student_id, allergies, chronic_conditions, current_medications,
      vaccination_status, disability_details, dietary_requirements,
      insurance_provider, insurance_policy_number, doctor_name, doctor_phone
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO student_medical_profile
       (student_id, allergies, chronic_conditions, current_medications,
        vaccination_status, disability_details, dietary_requirements,
        insurance_provider, insurance_policy_number, doctor_name, doctor_phone, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (student_id) DO UPDATE SET
       allergies=$2, chronic_conditions=$3, current_medications=$4,
       vaccination_status=$5, disability_details=$6, dietary_requirements=$7,
       insurance_provider=$8, insurance_policy_number=$9,
       doctor_name=$10, doctor_phone=$11, updated_at=NOW()
       RETURNING *`,
      [student_id, allergies, chronic_conditions, current_medications,
       JSON.stringify(vaccination_status || {}), disability_details, dietary_requirements,
       insurance_provider, insurance_policy_number, doctor_name, doctor_phone, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Upsert health profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/health/records/:id
router.delete('/records/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM student_health_records WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Health record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
