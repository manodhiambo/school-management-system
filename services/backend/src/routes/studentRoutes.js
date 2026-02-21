import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all students
router.get('/', requireRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { classId, status, search } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT
        s.*,
        u.email,
        u.is_active,
        c.name as class_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND s.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY s.created_at DESC';

    const students = await query(sql, params);

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    logger.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
});

// Get student statistics
router.get('/statistics', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const stats = await query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students
      FROM students
      WHERE tenant_id = $1
    `, [tid]);

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const students = await query(
      `SELECT s.*, u.email, c.name as class_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [req.params.id, tid]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: students[0]
    });
  } catch (error) {
    logger.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student' });
  }
});

// Create student
router.post('/', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    logger.info('Create student request body:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      email, password, firstName, first_name, lastName, last_name,
      dateOfBirth, date_of_birth, gender, bloodGroup, blood_group,
      classId, class_id, parentId, parent_id, admissionDate, admission_date,
      address, city, state, pincode, phonePrimary, phone_primary, phone
    } = req.body;

    const actualFirstName = firstName || first_name;
    const actualLastName = lastName || last_name;
    const actualEmail = email;
    const actualClassId = classId || class_id || null;
    const actualParentId = parentId || parent_id || null;
    const actualDateOfBirth = dateOfBirth || date_of_birth || null;
    const actualGender = gender || null;
    const actualBloodGroup = bloodGroup || blood_group || null;
    const actualAdmissionDate = admissionDate || admission_date || new Date();
    const actualPhone = phonePrimary || phone_primary || phone || null;

    if (!actualEmail || !actualFirstName || !actualLastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, firstName, and lastName are required'
      });
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [actualEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate admission number scoped to tenant
    const year = new Date().getFullYear();
    const lastStudent = await query(
      `SELECT admission_number FROM students
       WHERE admission_number LIKE $1 AND tenant_id = $2
       ORDER BY admission_number DESC LIMIT 1`,
      [`STD${year}%`, tid]
    );

    let sequence = 1;
    if (lastStudent.length > 0) {
      sequence = parseInt(lastStudent[0].admission_number.slice(-4)) + 1;
    }
    const admissionNumber = `STD${year}${sequence.toString().padStart(4, '0')}`;

    // Create user with tenant_id
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);

    await query(
      `INSERT INTO users (id, email, password, role, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, 'student', $4, true, true)`,
      [userId, actualEmail, hashedPassword, tid]
    );

    // Create student with tenant_id
    const studentId = uuidv4();
    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth,
        gender, blood_group, class_id, parent_id, admission_date,
        address, city, state, pincode, phone, tenant_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active')`,
      [
        studentId, userId, admissionNumber, actualFirstName, actualLastName,
        actualDateOfBirth, actualGender, actualBloodGroup,
        actualClassId, actualParentId, actualAdmissionDate,
        address || null, city || null, state || null, pincode || null, actualPhone, tid
      ]
    );

    const newStudent = await query(
      `SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [studentId]
    );

    logger.info('Student created:', studentId);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: newStudent[0]
    });
  } catch (error) {
    logger.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Error creating student', error: error.message });
  }
});

// Update student
router.put('/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      firstName, first_name, lastName, last_name, dateOfBirth, date_of_birth,
      gender, bloodGroup, blood_group, classId, class_id, parentId, parent_id,
      address, city, state, pincode, phone, status
    } = req.body;

    await query(
      `UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        blood_group = COALESCE($5, blood_group),
        class_id = COALESCE($6, class_id),
        parent_id = COALESCE($7, parent_id),
        address = COALESCE($8, address),
        city = COALESCE($9, city),
        state = COALESCE($10, state),
        pincode = COALESCE($11, pincode),
        phone = COALESCE($12, phone),
        status = COALESCE($13, status),
        updated_at = NOW()
       WHERE id = $14 AND tenant_id = $15`,
      [
        firstName || first_name, lastName || last_name,
        dateOfBirth || date_of_birth, gender,
        bloodGroup || blood_group, classId || class_id,
        parentId || parent_id, address, city, state, pincode,
        phone, status, req.params.id, tid
      ]
    );

    const updated = await query(
      `SELECT s.*, u.email, c.name as class_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [req.params.id, tid]
    );

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Error updating student' });
  }
});

// Delete student
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const student = await query(
      'SELECT user_id FROM students WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );

    if (student.length > 0) {
      await query('DELETE FROM students WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
      if (student[0].user_id) {
        await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [student[0].user_id, tid]);
      }
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Error deleting student' });
  }
});

// Link student to parent
router.post('/:id/link-parent', requireRole(['admin']), async (req, res) => {
  try {
    const { parentId, parent_id } = req.body;
    const actualParentId = parentId || parent_id;
    const tid = req.user.tenant_id;

    if (!actualParentId) {
      return res.status(400).json({ success: false, message: 'Parent ID is required' });
    }

    await query(
      'UPDATE students SET parent_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
      [actualParentId, req.params.id, tid]
    );

    try {
      await query(
        'INSERT INTO parent_students (parent_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [actualParentId, req.params.id]
      );
    } catch (e) {
      // Junction table might not exist, ignore
    }

    res.json({ success: true, message: 'Student linked to parent successfully' });
  } catch (error) {
    logger.error('Link parent error:', error);
    res.status(500).json({ success: false, message: 'Error linking parent' });
  }
});

// Get student exam results
router.get("/:id/exam-results", async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const studentId = req.params.id;

    const student = await query(
      "SELECT id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2",
      [studentId, tid]
    );

    const actualStudentId = student.length > 0 ? student[0].id : studentId;

    const results = await query(`
      SELECT
        er.*,
        e.name as exam_name,
        e.exam_type,
        e.academic_year,
        e.term,
        s.name as subject_name,
        s.code as subject_code,
        ROUND((er.marks_obtained / NULLIF(er.max_marks, 0)) * 100, 1) as percentage
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      LEFT JOIN subjects s ON er.subject_id = s.id
      WHERE er.student_id = $1 AND e.tenant_id = $2
      ORDER BY e.start_date DESC, s.name
    `, [actualStudentId, tid]);

    const groupedResults = results.reduce((acc, result) => {
      const examId = result.exam_id;
      if (!acc[examId]) {
        acc[examId] = {
          exam_id: examId,
          exam_name: result.exam_name,
          exam_type: result.exam_type,
          academic_year: result.academic_year,
          term: result.term,
          subjects: [],
          total_marks: 0,
          marks_obtained: 0
        };
      }
      acc[examId].subjects.push({
        subject_name: result.subject_name,
        subject_code: result.subject_code,
        marks_obtained: parseFloat(result.marks_obtained),
        total_marks: parseFloat(result.max_marks),
        grade: result.grade,
        percentage: result.percentage,
        remarks: result.remarks
      });
      acc[examId].total_marks += parseFloat(result.max_marks || 0);
      acc[examId].marks_obtained += parseFloat(result.marks_obtained || 0);
      return acc;
    }, {});

    const formattedResults = Object.values(groupedResults).map((exam) => ({
      ...exam,
      percentage: exam.total_marks > 0 ? ((exam.marks_obtained / exam.total_marks) * 100).toFixed(1) : 0,
      grade: exam.total_marks > 0 ? (
        (exam.marks_obtained / exam.total_marks) >= 0.8 ? "A" :
        (exam.marks_obtained / exam.total_marks) >= 0.7 ? "B" :
        (exam.marks_obtained / exam.total_marks) >= 0.6 ? "C" :
        (exam.marks_obtained / exam.total_marks) >= 0.5 ? "D" : "F"
      ) : "N/A"
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    logger.error("Get student exam results error:", error);
    res.status(500).json({ success: false, message: "Error fetching exam results" });
  }
});

export default router;
