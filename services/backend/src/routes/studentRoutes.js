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
router.get('/', requireRole(['admin', 'teacher', 'parent', 'finance_officer', 'student']), async (req, res) => {
  try {
    const { classId, status, search } = req.query;
    const tid = req.user.tenant_id;
    const { role } = req.user;
    const isTeacher = role === 'teacher';

    // Students can only retrieve their own record
    if (role === 'student') {
      const rows = await query(
        `SELECT s.*, u.email, u.is_active, c.name as class_name
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = $1 AND s.tenant_id = $2
         LIMIT 1`,
        [req.user.id, tid]
      );
      return res.json({ success: true, data: rows });
    }

    let sql = `
      SELECT
        s.*,
        u.email,
        u.is_active,
        c.name as class_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    // Teachers only see students in classes they teach (homeroom or subject)
    if (isTeacher) {
      sql += ` AND s.class_id IN (
        SELECT t.class_id FROM teachers t
        WHERE t.user_id = $${paramIndex} AND t.tenant_id = $1 AND t.class_id IS NOT NULL
        UNION
        SELECT cs.class_id FROM class_subjects cs
        WHERE cs.teacher_id = $${paramIndex} AND cs.tenant_id = $1
      )`;
      params.push(req.user.id);
      paramIndex++;
    }

    // Parents only see their own children
    if (role === 'parent') {
      sql += ` AND s.id IN (
        SELECT ps.student_id FROM parent_students ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE p.user_id = $${paramIndex}
      )`;
      params.push(req.user.id);
      paramIndex++;
    }

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
    const isTeacher = req.user.role === 'teacher';

    // Teacher class subquery — classes the teacher is assigned to
    const teacherClassFilter = isTeacher
      ? `AND c.id IN (
          SELECT t.class_id FROM teachers t
          WHERE t.user_id = $2::uuid AND t.tenant_id = $1::uuid AND t.class_id IS NOT NULL
          UNION
          SELECT cs.class_id FROM class_subjects cs
          WHERE cs.teacher_id = $2::uuid AND cs.tenant_id = $1::uuid
        )`
      : '';

    const statsParams = isTeacher ? [tid, req.user.id] : [tid];
    const stats = await query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_students,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_students
      FROM students
      WHERE tenant_id = $1::uuid
      ${isTeacher ? `AND class_id IN (
          SELECT t.class_id FROM teachers t WHERE t.user_id = $2::uuid AND t.tenant_id = $1::uuid AND t.class_id IS NOT NULL
          UNION
          SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id = $2::uuid AND cs.tenant_id = $1::uuid
        )` : ''}
    `, statsParams);

    const byClass = await query(`
      SELECT
        c.id as class_id,
        c.name as class_name,
        c.section,
        c.education_level,
        COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active' AND s.tenant_id = $1::uuid
      WHERE c.tenant_id = $1::uuid
      ${teacherClassFilter}
      GROUP BY c.id, c.name, c.section, c.education_level
      ORDER BY c.name, c.section
    `, statsParams);

    res.json({
      success: true,
      data: { ...(stats[0] || {}), by_class: byClass }
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get next available admission number for this tenant
router.get('/next-admission-number', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const year = new Date().getFullYear();
    const rows = await query(
      `SELECT MAX(CAST(SUBSTRING(admission_number FROM 8) AS INTEGER)) AS max_seq
       FROM students
       WHERE admission_number ~ $1 AND tenant_id = $2`,
      [`^STD${year}[0-9]+$`, tid]
    );
    const seq = (rows[0]?.max_seq || 0) + 1;
    res.json({ success: true, data: { admission_number: `STD${year}${seq.toString().padStart(4, '0')}` } });
  } catch (error) {
    logger.error('Next admission number error:', error);
    res.status(500).json({ success: false, message: error.message });
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

// Create student — admin only
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Create student request body:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      email, password, firstName, first_name, lastName, last_name,
      dateOfBirth, date_of_birth, gender, bloodGroup, blood_group,
      classId, class_id, parentId, parent_id, admissionDate, admission_date,
      address, city, state, pincode, phonePrimary, phone_primary, phone,
      student_type, studentType, uses_transport, profile_photo_url,
      admissionNumber, admission_number: admissionNumberAlt,
      // Kenya CBE comprehensive fields
      nemis_number, education_level, birth_certificate_number,
      county, sub_county, special_needs, special_needs_details,
      previous_school, medical_conditions,
      emergency_contact_name, emergency_contact_phone,
      is_new_admission, religion,
      // Inline parent creation
      newParent,
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
    const actualStudentType = student_type || studentType || 'day_scholar';
    const actualUsesTransport = uses_transport === true || uses_transport === 'true';

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

    // Resolve admission number: use custom value if provided, otherwise auto-generate
    const customAdmNum = (admissionNumber || admissionNumberAlt || '').trim();
    let finalAdmissionNumber;

    if (customAdmNum) {
      // Validate the custom number is not already in use for this tenant
      const taken = await query(
        'SELECT id FROM students WHERE admission_number = $1 AND tenant_id = $2',
        [customAdmNum, tid]
      );
      if (taken.length > 0) {
        return res.status(400).json({ success: false, message: `Admission number "${customAdmNum}" is already in use` });
      }
      finalAdmissionNumber = customAdmNum;
    } else {
      // Auto-generate collision-safe admission number
      const year = new Date().getFullYear();
      const rows = await query(
        `SELECT MAX(CAST(SUBSTRING(admission_number FROM 8) AS INTEGER)) AS max_seq
         FROM students WHERE admission_number ~ $1 AND tenant_id = $2`,
        [`^STD${year}[0-9]+$`, tid]
      );
      const seq = (rows[0]?.max_seq || 0) + 1;
      finalAdmissionNumber = `STD${year}${seq.toString().padStart(4, '0')}`;
    }

    // ── Inline parent creation (if newParent body object provided) ───────────
    let resolvedParentId = actualParentId;
    if (newParent && (newParent.firstName || newParent.first_name)) {
      const pFirst = (newParent.firstName || newParent.first_name || '').trim();
      const pLast  = (newParent.lastName  || newParent.last_name  || '').trim();
      const pEmail = (newParent.email || '').trim().toLowerCase();
      const pPhone = (newParent.phonePrimary || newParent.phone_primary || '').trim();

      let parentUserId = null;
      if (pEmail) {
        const existingPU = await query('SELECT id FROM users WHERE email = $1', [pEmail]);
        if (existingPU.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Parent email "${pEmail}" is already registered in the system`
          });
        }
        parentUserId = uuidv4();
        const parentHash = await bcrypt.hash(newParent.password || 'parent123', 10);
        await query(
          `INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active, is_verified)
           VALUES ($1, $2, $3, 'parent', $4, $5, $6, true, true)`,
          [parentUserId, pEmail, parentHash, pFirst, pLast, tid]
        );
      }

      const newParentId = uuidv4();
      await query(
        `INSERT INTO parents
           (id, user_id, first_name, last_name, relationship, phone_primary, phone_secondary,
            whatsapp_number, occupation, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          newParentId, parentUserId, pFirst, pLast,
          newParent.relationship || 'guardian', pPhone || null,
          newParent.phoneSecondary || null,
          newParent.whatsappNumber || null,
          newParent.occupation || null,
          tid,
        ]
      );
      resolvedParentId = newParentId;
    }

    // Create user with tenant_id
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);

    await query(
      `INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, 'student', $4, $5, $6, true, true)`,
      [userId, actualEmail, hashedPassword, actualFirstName, actualLastName, tid]
    );

    // Create student with all fields
    const studentId = uuidv4();
    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth,
        gender, blood_group, class_id, parent_id, admission_date,
        address, city, state, pincode, phone, student_type, uses_transport,
        tenant_id, status, profile_photo_url,
        nemis_number, education_level, birth_certificate_number,
        county, sub_county, special_needs, special_needs_details,
        previous_school, medical_conditions,
        emergency_contact_name, emergency_contact_phone, is_new_admission
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,'active',$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      )`,
      [
        studentId, userId, finalAdmissionNumber, actualFirstName, actualLastName,
        actualDateOfBirth, actualGender, actualBloodGroup,
        actualClassId, resolvedParentId, actualAdmissionDate,
        address || null, city || null, state || null, pincode || null, actualPhone,
        actualStudentType, actualUsesTransport, tid, profile_photo_url || null,
        nemis_number || null, education_level || null, birth_certificate_number || null,
        county || null, sub_county || null,
        special_needs === true || special_needs === 'true' || false,
        special_needs_details || null,
        previous_school || null, medical_conditions || null,
        emergency_contact_name || null, emergency_contact_phone || null,
        is_new_admission !== false && is_new_admission !== 'false',
      ]
    );

    // Update religion separately — column may not exist in all DB versions
    if (religion) {
      await query(
        `UPDATE students SET religion = $1 WHERE id = $2`,
        [religion, studentId]
      ).catch(() => {});
    }

    // Link parent → student in junction table
    if (resolvedParentId) {
      await query(
        `INSERT INTO parent_students (parent_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [resolvedParentId, studentId]
      ).catch(() => {});
    }

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

// Update student — admin only
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      firstName, first_name, lastName, last_name, dateOfBirth, date_of_birth,
      gender, bloodGroup, blood_group, classId, class_id, parentId, parent_id,
      address, city, state, pincode, phone, status, admission_number, student_type,
      uses_transport, profile_photo_url,
      nemis_number, education_level, birth_certificate_number,
      county, sub_county, special_needs, special_needs_details,
      previous_school, medical_conditions,
      emergency_contact_name, emergency_contact_phone,
    } = req.body;

    // Convert empty strings to null for UUID fields
    const actualClassId = (classId || class_id) || null;
    const actualParentId = (parentId || parent_id) || null;
    const actualDob = (dateOfBirth || date_of_birth) || null;

    // If admission_number is being changed, verify it's unique for this tenant
    if (admission_number && admission_number.trim()) {
      const conflict = await query(
        'SELECT id FROM students WHERE admission_number = $1 AND tenant_id = $2 AND id != $3',
        [admission_number.trim(), tid, req.params.id]
      );
      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Admission number "${admission_number.trim()}" is already assigned to another student`
        });
      }
    }

    const updatePhotoUrl = 'profile_photo_url' in req.body;
    await query(
      `UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE(NULLIF($3, '')::date, date_of_birth),
        gender = COALESCE(NULLIF($4, ''), gender),
        blood_group = COALESCE(NULLIF($5, ''), blood_group),
        class_id = $6,
        parent_id = COALESCE($7, parent_id),
        address = COALESCE(NULLIF($8, ''), address),
        city = COALESCE(NULLIF($9, ''), city),
        state = COALESCE(NULLIF($10, ''), state),
        pincode = COALESCE(NULLIF($11, ''), pincode),
        phone = COALESCE(NULLIF($12, ''), phone),
        status = COALESCE(NULLIF($13, ''), status),
        admission_number = COALESCE(NULLIF($14, ''), admission_number),
        student_type = COALESCE(NULLIF($15, ''), student_type),
        uses_transport = COALESCE($16, uses_transport),
        profile_photo_url = CASE WHEN $19 THEN $20 ELSE profile_photo_url END,
        nemis_number = COALESCE(NULLIF($21,''), nemis_number),
        education_level = COALESCE(NULLIF($22,''), education_level),
        birth_certificate_number = COALESCE(NULLIF($23,''), birth_certificate_number),
        county = COALESCE(NULLIF($24,''), county),
        sub_county = COALESCE(NULLIF($25,''), sub_county),
        special_needs = COALESCE($26, special_needs),
        special_needs_details = COALESCE(NULLIF($27,''), special_needs_details),
        previous_school = COALESCE(NULLIF($28,''), previous_school),
        medical_conditions = COALESCE(NULLIF($29,''), medical_conditions),
        emergency_contact_name = COALESCE(NULLIF($30,''), emergency_contact_name),
        emergency_contact_phone = COALESCE(NULLIF($31,''), emergency_contact_phone),
        updated_at = NOW()
       WHERE id = $17 AND tenant_id = $18`,
      [
        firstName || first_name, lastName || last_name,
        actualDob, gender,
        bloodGroup || blood_group, actualClassId,
        actualParentId, address || null, city || null, state || null, pincode || null,
        phone || null, status, admission_number || null, student_type || null,
        uses_transport !== undefined ? (uses_transport === true || uses_transport === 'true') : null,
        req.params.id, tid,
        updatePhotoUrl, profile_photo_url || null,
        nemis_number || null, education_level || null, birth_certificate_number || null,
        county || null, sub_county || null,
        special_needs !== undefined ? (special_needs === true || special_needs === 'true') : null,
        special_needs_details || null,
        previous_school || null, medical_conditions || null,
        emergency_contact_name || null, emergency_contact_phone || null,
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

    // If boarder/day-scholar status changed, any still-unpaid invoice generated under the
    // old status no longer applies (e.g. day-scholar fee left pending after becoming a boarder)
    // — cancel it so the student isn't billed for both. Paid/partial invoices are left alone
    // since real money has already moved and needs manual review.
    if (updated[0]?.student_type) {
      await query(
        `UPDATE fee_invoices fi SET status = 'cancelled', updated_at = NOW()
         FROM fee_structure fs
         WHERE fi.fee_structure_id = fs.id
           AND fi.student_id = $1 AND fi.tenant_id = $2
           AND fi.status = 'pending'
           AND fs.student_type NOT IN ('all', $3)`,
        [req.params.id, tid, updated[0].student_type]
      );
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Update student error:', error);
    if (error.code === '23505' && error.constraint?.includes('admission_number')) {
      return res.status(400).json({ success: false, message: 'This admission number is already in use by another student' });
    }
    res.status(500).json({ success: false, message: 'Error updating student' });
  }
});

// Delete student
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const sid = req.params.id;

    const student = await query(
      'SELECT user_id FROM students WHERE id = $1 AND tenant_id = $2',
      [sid, tid]
    );

    if (!student.length) {
      return res.json({ success: true, message: 'Student deleted successfully' });
    }

    // Remove rows in tables that lack ON DELETE CASCADE before deleting the student
    await query('DELETE FROM mpesa_transactions WHERE student_id = $1', [sid]).catch(() => {});
    await query('DELETE FROM income_records WHERE student_id = $1', [sid]).catch(() => {});

    await query('DELETE FROM students WHERE id = $1 AND tenant_id = $2', [sid, tid]);

    if (student[0].user_id) {
      await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [student[0].user_id, tid]);
    }

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting student' });
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
    const { role, id: callerId } = req.user;
    const studentId = req.params.id;

    const student = await query(
      "SELECT id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2",
      [studentId, tid]
    );

    const actualStudentId = student.length > 0 ? student[0].id : studentId;

    // Parents may only view results for their own children
    if (role === 'parent') {
      const access = await query(
        `SELECT 1 FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         WHERE ps.student_id = $1 AND p.user_id = $2`,
        [actualStudentId, callerId]
      );
      if (!access.length) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

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
        AND e.is_results_published = true
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
