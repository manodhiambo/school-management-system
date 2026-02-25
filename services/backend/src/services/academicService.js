import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AcademicService {
  // ==================== SUBJECTS ====================
  async createSubject(subjectData, tenantId) {
    const { name, code, description, category, credits } = subjectData;

    // Check if code already exists within this tenant
    const existing = await query(
      'SELECT * FROM subjects WHERE code = $1 AND tenant_id = $2',
      [code, tenantId]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Subject code already exists');
    }

    const subjectId = uuidv4();
    await query(
      `INSERT INTO subjects (id, name, code, description, category, credits, is_active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
      [subjectId, name, code, description, category, credits, tenantId]
    );

    logger.info(`Subject created: ${code}`);

    return await this.getSubjectById(subjectId, tenantId);
  }

  async getSubjectById(id, tenantId) {
    const results = await query(
      'SELECT * FROM subjects WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Subject not found');
    }

    return results[0];
  }

  async getSubjects(filters = {}, tenantId) {
    const { category, isActive, search } = filters;

    let whereConditions = ['tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex + 1})`);
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
      paramIndex += 2;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const subjects = await query(
      `SELECT * FROM subjects ${whereClause} ORDER BY name`,
      queryParams
    );

    return subjects;
  }

  async updateSubject(id, updateData, tenantId) {
    await this.getSubjectById(id, tenantId);

    const { name, code, description, category, credits, isActive } = updateData;

    // Check if new code conflicts within this tenant
    if (code) {
      const existing = await query(
        'SELECT * FROM subjects WHERE code = $1 AND id != $2 AND tenant_id = $3',
        [code, id, tenantId]
      );

      if (existing.length > 0) {
        throw new ApiError(400, 'Subject code already exists');
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (code !== undefined) {
      updateFields.push(`code = $${paramIndex}`);
      updateValues.push(code);
      paramIndex++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      updateValues.push(category);
      paramIndex++;
    }
    if (credits !== undefined) {
      updateFields.push(`credits = $${paramIndex}`);
      updateValues.push(credits);
      paramIndex++;
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getSubjectById(id, tenantId);
    }

    updateFields.push('updated_at = NOW()');
    // id param
    updateValues.push(id);
    // tenant_id param
    updateValues.push(tenantId);

    await query(
      `UPDATE subjects SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      updateValues
    );

    logger.info(`Subject updated: ${id}`);

    return await this.getSubjectById(id, tenantId);
  }

  async deleteSubject(id, tenantId) {
    // Confirm subject belongs to this tenant before deletion
    await this.getSubjectById(id, tenantId);

    // Check if subject is in use — filter through class_id (tenant-scoped)
    const inUse = await query(
      `SELECT COUNT(*) as count FROM class_subjects cs
       JOIN classes c ON cs.class_id = c.id
       WHERE cs.subject_id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );

    if (parseInt(inUse[0].count) > 0) {
      throw new ApiError(400, 'Cannot delete subject that is assigned to classes');
    }

    await query('DELETE FROM subjects WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

    logger.info(`Subject deleted: ${id}`);

    return { message: 'Subject deleted successfully' };
  }

  // ==================== CLASSES & SECTIONS ====================
  async createClass(classData, tenantId) {
    const {
      name,
      numericValue,
      section,
      classTeacherId,
      maxStudents,
      roomNumber,
      academicYear
    } = classData;

    // Check if class-section-year combination exists within this tenant
    const existing = await query(
      'SELECT * FROM classes WHERE name = $1 AND section = $2 AND academic_year = $3 AND tenant_id = $4',
      [name, section, academicYear, tenantId]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Class with this section already exists for this academic year');
    }

    const classId = uuidv4();
    await query(
      `INSERT INTO classes (
        id, name, numeric_value, section, class_teacher_id,
        max_students, room_number, academic_year, is_active, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)`,
      [classId, name, numericValue, section, classTeacherId, maxStudents, roomNumber, academicYear, tenantId]
    );

    // Update teacher's class assignment
    if (classTeacherId) {
      await query(
        'UPDATE teachers SET is_class_teacher = TRUE, class_id = $1 WHERE id = $2 AND tenant_id = $3',
        [classId, classTeacherId, tenantId]
      );
    }

    logger.info(`Class created: ${name}-${section}`);

    return await this.getClassById(classId, tenantId);
  }

  async getClassById(id, tenantId) {
    const results = await query(
      `SELECT
        c.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.employee_id as teacher_employee_id
       FROM classes c
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Class not found');
    }

    const classData = results[0];

    // Get assigned subjects — class_subjects filtered via class_id (tenant-scoped)
    const subjects = await query(
      `SELECT
        cs.*,
        s.name as subject_name,
        s.code as subject_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       WHERE cs.class_id = $1`,
      [id]
    );

    classData.subjects = subjects;

    return classData;
  }

  async getClasses(filters = {}, tenantId) {
    const { academicYear, isActive, classTeacherId } = filters;

    let whereConditions = ['c.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (academicYear) {
      whereConditions.push(`c.academic_year = $${paramIndex}`);
      queryParams.push(academicYear);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`c.is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (classTeacherId) {
      whereConditions.push(`c.class_teacher_id = $${paramIndex}`);
      queryParams.push(classTeacherId);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const classes = await query(
      `SELECT
        c.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND s.tenant_id = c.tenant_id) as current_strength
       FROM classes c
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       ${whereClause}
       ORDER BY c.numeric_value, c.section`,
      queryParams
    );

    return classes;
  }

  async updateClass(id, updateData, tenantId) {
    await this.getClassById(id, tenantId);

    const { name, section, classTeacherId, maxStudents, roomNumber, isActive } = updateData;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (section !== undefined) {
      updateFields.push(`section = $${paramIndex}`);
      updateValues.push(section);
      paramIndex++;
    }
    if (classTeacherId !== undefined) {
      updateFields.push(`class_teacher_id = $${paramIndex}`);
      updateValues.push(classTeacherId);
      paramIndex++;

      // Update teacher assignment
      if (classTeacherId) {
        await query(
          'UPDATE teachers SET is_class_teacher = TRUE, class_id = $1 WHERE id = $2 AND tenant_id = $3',
          [id, classTeacherId, tenantId]
        );
      }
    }
    if (maxStudents !== undefined) {
      updateFields.push(`max_students = $${paramIndex}`);
      updateValues.push(maxStudents);
      paramIndex++;
    }
    if (roomNumber !== undefined) {
      updateFields.push(`room_number = $${paramIndex}`);
      updateValues.push(roomNumber);
      paramIndex++;
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getClassById(id, tenantId);
    }

    updateFields.push('updated_at = NOW()');
    // id param
    updateValues.push(id);
    // tenant_id param
    updateValues.push(tenantId);

    await query(
      `UPDATE classes SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      updateValues
    );

    logger.info(`Class updated: ${id}`);

    return await this.getClassById(id, tenantId);
  }

  async assignSubjectToClass(classId, subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks, tenantId) {
    // Verify class belongs to this tenant
    await this.getClassById(classId, tenantId);

    const assignmentId = uuidv4();

    // Check if already assigned — class_subjects filtered via class_id (tenant-scoped)
    const existing = await query(
      'SELECT * FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
      [classId, subjectId]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Subject already assigned to this class');
    }

    await query(
      `INSERT INTO class_subjects (
        id, class_id, subject_id, teacher_id, is_optional,
        weekly_hours, passing_marks, max_marks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [assignmentId, classId, subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks]
    );

    logger.info(`Subject ${subjectId} assigned to class ${classId}`);

    return await this.getClassById(classId, tenantId);
  }

  async removeSubjectFromClass(classId, subjectId, tenantId) {
    // Verify class belongs to this tenant
    await this.getClassById(classId, tenantId);

    const result = await query(
      'DELETE FROM class_subjects WHERE class_id = $1 AND subject_id = $2 RETURNING id',
      [classId, subjectId]
    );

    if (result.length === 0) {
      throw new ApiError(404, 'Subject assignment not found');
    }

    logger.info(`Subject ${subjectId} removed from class ${classId}`);

    return { message: 'Subject removed from class successfully' };
  }

  // ==================== EXAMS ====================
  async createExam(examData, tenantId) {
    const {
      name,
      type,
      session,
      classId,
      startDate,
      endDate,
      maxMarks,
      passingMarks,
      weightage,
      createdBy
    } = examData;

    const examId = uuidv4();
    await query(
      `INSERT INTO exams (
        id, name, type, session, class_id, start_date, end_date,
        max_marks, passing_marks, weightage, is_results_published, created_by, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, $11, $12)`,
      [examId, name, type, session, classId, startDate, endDate, maxMarks, passingMarks, weightage, createdBy, tenantId]
    );

    logger.info(`Exam created: ${name}`);

    return await this.getExamById(examId, tenantId);
  }

  async getExamById(id, tenantId) {
    const results = await query(
      `SELECT
        e.*,
        c.name as class_name,
        c.section as section_name,
        u.email as created_by_email
       FROM exams e
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [id, tenantId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Exam not found');
    }

    return results[0];
  }

  async getExams(filters = {}, tenantId) {
    const { session, type, classId, isResultsPublished } = filters;

    let whereConditions = ['e.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (session) {
      whereConditions.push(`e.session = $${paramIndex}`);
      queryParams.push(session);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`e.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (classId) {
      whereConditions.push(`e.class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (isResultsPublished !== undefined) {
      whereConditions.push(`e.is_results_published = $${paramIndex}`);
      queryParams.push(isResultsPublished);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const exams = await query(
      `SELECT
        e.*,
        c.name as class_name,
        c.section as section_name
       FROM exams e
       LEFT JOIN classes c ON e.class_id = c.id
       ${whereClause}
       ORDER BY e.start_date DESC`,
      queryParams
    );

    return exams;
  }

  async updateExam(id, updateData, tenantId) {
    await this.getExamById(id, tenantId);

    const {
      name,
      type,
      startDate,
      endDate,
      maxMarks,
      passingMarks,
      weightage
    } = updateData;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      updateValues.push(type);
      paramIndex++;
    }
    if (startDate !== undefined) {
      updateFields.push(`start_date = $${paramIndex}`);
      updateValues.push(startDate);
      paramIndex++;
    }
    if (endDate !== undefined) {
      updateFields.push(`end_date = $${paramIndex}`);
      updateValues.push(endDate);
      paramIndex++;
    }
    if (maxMarks !== undefined) {
      updateFields.push(`max_marks = $${paramIndex}`);
      updateValues.push(maxMarks);
      paramIndex++;
    }
    if (passingMarks !== undefined) {
      updateFields.push(`passing_marks = $${paramIndex}`);
      updateValues.push(passingMarks);
      paramIndex++;
    }
    if (weightage !== undefined) {
      updateFields.push(`weightage = $${paramIndex}`);
      updateValues.push(weightage);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getExamById(id, tenantId);
    }

    updateFields.push('updated_at = NOW()');
    // id param
    updateValues.push(id);
    // tenant_id param
    updateValues.push(tenantId);

    await query(
      `UPDATE exams SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      updateValues
    );

    logger.info(`Exam updated: ${id}`);

    return await this.getExamById(id, tenantId);
  }

  async deleteExam(id, tenantId) {
    // Confirm exam belongs to this tenant
    await this.getExamById(id, tenantId);

    // Check if results exist
    const results = await query(
      'SELECT COUNT(*) as count FROM exam_results WHERE exam_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (parseInt(results[0].count) > 0) {
      throw new ApiError(400, 'Cannot delete exam with existing results');
    }

    await query('DELETE FROM exams WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

    logger.info(`Exam deleted: ${id}`);

    return { message: 'Exam deleted successfully' };
  }

  // ==================== EXAM RESULTS ====================
  async enterResult(resultData, tenantId) {
    const {
      examId,
      studentId,
      subjectId,
      marksObtained,
      grade,
      isAbsent,
      remarks,
      teacherId
    } = resultData;

    // Verify exam exists and belongs to this tenant
    await this.getExamById(examId, tenantId);

    const resultId = uuidv4();

    // Check if result already exists
    const existing = await query(
      'SELECT * FROM exam_results WHERE exam_id = $1 AND student_id = $2 AND subject_id = $3 AND tenant_id = $4',
      [examId, studentId, subjectId, tenantId]
    );

    if (existing.length > 0) {
      // Update existing result
      await query(
        `UPDATE exam_results
         SET marks_obtained = $1, grade = $2, is_absent = $3, remarks = $4, teacher_id = $5, updated_at = NOW()
         WHERE exam_id = $6 AND student_id = $7 AND subject_id = $8 AND tenant_id = $9`,
        [marksObtained, grade, isAbsent, remarks, teacherId, examId, studentId, subjectId, tenantId]
      );

      return await query(
        'SELECT * FROM exam_results WHERE exam_id = $1 AND student_id = $2 AND subject_id = $3 AND tenant_id = $4',
        [examId, studentId, subjectId, tenantId]
      );
    }

    // Insert new result
    await query(
      `INSERT INTO exam_results (
        id, exam_id, student_id, subject_id, marks_obtained,
        grade, is_absent, remarks, teacher_id, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [resultId, examId, studentId, subjectId, marksObtained, grade, isAbsent, remarks, teacherId, tenantId]
    );

    logger.info(`Result entered for student ${studentId} in exam ${examId}`);

    return await query('SELECT * FROM exam_results WHERE id = $1 AND tenant_id = $2', [resultId, tenantId]);
  }

  async bulkEnterResults(examId, results, teacherId, tenantId) {
    const successfulResults = [];
    const failedResults = [];

    for (const result of results) {
      try {
        const entered = await this.enterResult({
          examId,
          ...result,
          teacherId
        }, tenantId);
        successfulResults.push(entered[0]);
      } catch (error) {
        failedResults.push({
          data: result,
          error: error.message
        });
      }
    }

    logger.info(`Bulk results entered: ${successfulResults.length} success, ${failedResults.length} failed`);

    return {
      success: successfulResults,
      failed: failedResults
    };
  }

  async getExamResults(examId, filters = {}, tenantId) {
    const { studentId, subjectId } = filters;

    let whereConditions = ['er.exam_id = $1', 'er.tenant_id = $2'];
    let queryParams = [examId, tenantId];
    let paramIndex = 3;

    if (studentId) {
      whereConditions.push(`er.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    if (subjectId) {
      whereConditions.push(`er.subject_id = $${paramIndex}`);
      queryParams.push(subjectId);
      paramIndex++;
    }

    const results = await query(
      `SELECT
        er.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        s.roll_number,
        sub.name as subject_name,
        sub.code as subject_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
       FROM exam_results er
       JOIN students s ON er.student_id = s.id
       JOIN subjects sub ON er.subject_id = sub.id
       LEFT JOIN teachers t ON er.teacher_id = t.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY s.roll_number, sub.name`,
      queryParams
    );

    return results;
  }

  async publishResults(examId, tenantId) {
    await query(
      'UPDATE exams SET is_results_published = TRUE, published_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    logger.info(`Results published for exam ${examId}`);

    return { message: 'Results published successfully' };
  }

  async unpublishResults(examId, tenantId) {
    await query(
      'UPDATE exams SET is_results_published = FALSE, published_at = NULL WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    logger.info(`Results unpublished for exam ${examId}`);

    return { message: 'Results unpublished successfully' };
  }

  // ==================== GRADEBOOK ====================
  async createGradebookEntry(entryData, tenantId) {
    const {
      classId,
      studentId,
      subjectId,
      assessmentType,
      title,
      marks,
      maxMarks,
      grade,
      teacherId,
      date,
      notes
    } = entryData;

    const entryId = uuidv4();
    await query(
      `INSERT INTO gradebook (
        id, class_id, student_id, subject_id, assessment_type,
        title, marks, max_marks, grade, teacher_id, date, notes, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [entryId, classId, studentId, subjectId, assessmentType, title, marks, maxMarks, grade, teacherId, date, notes, tenantId]
    );

    logger.info(`Gradebook entry created for student ${studentId}`);

    return await query('SELECT * FROM gradebook WHERE id = $1 AND tenant_id = $2', [entryId, tenantId]);
  }

  async getGradebookEntries(filters = {}, tenantId) {
    const { classId, studentId, subjectId, assessmentType, startDate, endDate } = filters;

    let whereConditions = ['g.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (classId) {
      whereConditions.push(`g.class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (studentId) {
      whereConditions.push(`g.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    if (subjectId) {
      whereConditions.push(`g.subject_id = $${paramIndex}`);
      queryParams.push(subjectId);
      paramIndex++;
    }

    if (assessmentType) {
      whereConditions.push(`g.assessment_type = $${paramIndex}`);
      queryParams.push(assessmentType);
      paramIndex++;
    }

    if (startDate && endDate) {
      whereConditions.push(`g.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const entries = await query(
      `SELECT
        g.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        sub.name as subject_name,
        sub.code as subject_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
       FROM gradebook g
       JOIN students s ON g.student_id = s.id
       JOIN subjects sub ON g.subject_id = sub.id
       LEFT JOIN teachers t ON g.teacher_id = t.id
       ${whereClause}
       ORDER BY g.date DESC`,
      queryParams
    );

    return entries;
  }

  async updateGradebookEntry(id, updateData, tenantId) {
    const { marks, grade, notes } = updateData;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (marks !== undefined) {
      updateFields.push(`marks = $${paramIndex}`);
      updateValues.push(marks);
      paramIndex++;
    }
    if (grade !== undefined) {
      updateFields.push(`grade = $${paramIndex}`);
      updateValues.push(grade);
      paramIndex++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }

    // id param
    updateValues.push(id);
    // tenant_id param
    updateValues.push(tenantId);

    await query(
      `UPDATE gradebook SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      updateValues
    );

    logger.info(`Gradebook entry updated: ${id}`);

    return await query('SELECT * FROM gradebook WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  }

  async deleteGradebookEntry(id, tenantId) {
    await query('DELETE FROM gradebook WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

    logger.info(`Gradebook entry deleted: ${id}`);

    return { message: 'Gradebook entry deleted successfully' };
  }

  // ==================== REPORTS ====================
  async generateStudentReportCard(studentId, examId, tenantId) {
    const exam = await this.getExamById(examId, tenantId);

    const student = await query(
      `SELECT
        s.*,
        c.name as class_name,
        c.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [studentId, tenantId]
    );

    if (student.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const results = await query(
      `SELECT
        er.*,
        s.name as subject_name,
        s.code as subject_code,
        cs.max_marks as subject_max_marks,
        cs.passing_marks as subject_passing_marks
       FROM exam_results er
       JOIN subjects s ON er.subject_id = s.id
       LEFT JOIN class_subjects cs ON er.subject_id = cs.subject_id AND cs.class_id = $1
       WHERE er.exam_id = $2 AND er.student_id = $3 AND er.tenant_id = $4`,
      [student[0].class_id, examId, studentId, tenantId]
    );

    // Calculate totals
    const totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks_obtained || 0), 0);
    const totalMaxMarks = results.reduce((sum, r) => sum + parseFloat(exam.max_marks || 0), 0);
    const percentage = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(2) : 0;

    // Determine result status
    const failedSubjects = results.filter(r =>
      parseFloat(r.marks_obtained) < parseFloat(r.subject_passing_marks || exam.passing_marks)
    );

    const resultStatus = failedSubjects.length === 0 ? 'PASS' : 'FAIL';

    return {
      exam,
      student: student[0],
      results,
      summary: {
        totalMarks,
        totalMaxMarks,
        percentage,
        resultStatus,
        failedSubjects: failedSubjects.length,
        totalSubjects: results.length
      }
    };
  }

  async getClassPerformanceReport(classId, examId, tenantId) {
    const exam = await this.getExamById(examId, tenantId);

    const results = await query(
      `SELECT
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.admission_number,
        SUM(er.marks_obtained) as total_marks,
        COUNT(er.id) as subjects_count,
        AVG(er.marks_obtained) as average_marks
       FROM students s
       JOIN exam_results er ON s.id = er.student_id
       WHERE s.class_id = $1 AND er.exam_id = $2 AND s.tenant_id = $3
       GROUP BY s.id, s.first_name, s.last_name, s.roll_number, s.admission_number
       ORDER BY total_marks DESC`,
      [classId, examId, tenantId]
    );

    // Add rank
    results.forEach((student, index) => {
      student.rank = index + 1;
    });

    // Class statistics
    const classStats = {
      totalStudents: results.length,
      highestMarks: results[0]?.total_marks || 0,
      lowestMarks: results[results.length - 1]?.total_marks || 0,
      averageMarks: results.reduce((sum, s) => sum + parseFloat(s.average_marks), 0) / results.length || 0
    };

    return {
      exam,
      students: results,
      classStats
    };
  }

  async getSubjectWisePerformance(examId, classId, tenantId) {
    const results = await query(
      `SELECT
        sub.id as subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        COUNT(er.id) as students_appeared,
        SUM(CASE WHEN er.is_absent = FALSE THEN 1 ELSE 0 END) as students_present,
        AVG(CASE WHEN er.is_absent = FALSE THEN er.marks_obtained ELSE NULL END) as average_marks,
        MAX(er.marks_obtained) as highest_marks,
        MIN(CASE WHEN er.is_absent = FALSE THEN er.marks_obtained ELSE NULL END) as lowest_marks,
        SUM(CASE WHEN er.marks_obtained >= cs.passing_marks THEN 1 ELSE 0 END) as students_passed
       FROM subjects sub
       JOIN exam_results er ON sub.id = er.subject_id
       JOIN students s ON er.student_id = s.id
       LEFT JOIN class_subjects cs ON sub.id = cs.subject_id AND s.class_id = cs.class_id
       WHERE er.exam_id = $1 AND s.class_id = $2 AND s.tenant_id = $3
       GROUP BY sub.id, sub.name, sub.code`,
      [examId, classId, tenantId]
    );

    return results;
  }
}

export default new AcademicService();
