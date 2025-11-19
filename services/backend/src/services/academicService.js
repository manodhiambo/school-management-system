import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AcademicService {
  // ==================== SUBJECTS ====================
  async createSubject(subjectData) {
    const { name, code, description, category, credits } = subjectData;

    // Check if code already exists
    const existing = await query(
      'SELECT * FROM subjects WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Subject code already exists');
    }

    const subjectId = uuidv4();
    await query(
      `INSERT INTO subjects (id, name, code, description, category, credits, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [subjectId, name, code, description, category, credits]
    );

    logger.info(`Subject created: ${code}`);

    return await this.getSubjectById(subjectId);
  }

  async getSubjectById(id) {
    const results = await query(
      'SELECT * FROM subjects WHERE id = ?',
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Subject not found');
    }

    return results[0];
  }

  async getSubjects(filters = {}) {
    const { category, isActive, search } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    if (isActive !== undefined) {
      whereConditions.push('is_active = ?');
      queryParams.push(isActive);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR code LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const subjects = await query(
      `SELECT * FROM subjects ${whereClause} ORDER BY name`,
      queryParams
    );

    return subjects;
  }

  async updateSubject(id, updateData) {
    await this.getSubjectById(id);

    const { name, code, description, category, credits, isActive } = updateData;

    // Check if new code conflicts
    if (code) {
      const existing = await query(
        'SELECT * FROM subjects WHERE code = ? AND id != ?',
        [code, id]
      );

      if (existing.length > 0) {
        throw new ApiError(400, 'Subject code already exists');
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (credits !== undefined) {
      updateFields.push('credits = ?');
      updateValues.push(credits);
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return await this.getSubjectById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE subjects SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Subject updated: ${id}`);

    return await this.getSubjectById(id);
  }

  async deleteSubject(id) {
    // Check if subject is in use
    const inUse = await query(
      'SELECT COUNT(*) as count FROM class_subjects WHERE subject_id = ?',
      [id]
    );

    if (inUse[0].count > 0) {
      throw new ApiError(400, 'Cannot delete subject that is assigned to classes');
    }

    await query('DELETE FROM subjects WHERE id = ?', [id]);

    logger.info(`Subject deleted: ${id}`);

    return { message: 'Subject deleted successfully' };
  }

  // ==================== CLASSES & SECTIONS ====================
  async createClass(classData) {
    const {
      name,
      numericValue,
      section,
      classTeacherId,
      maxStudents,
      roomNumber,
      academicYear
    } = classData;

    // Check if class-section-year combination exists
    const existing = await query(
      'SELECT * FROM classes WHERE name = ? AND section = ? AND academic_year = ?',
      [name, section, academicYear]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Class with this section already exists for this academic year');
    }

    const classId = uuidv4();
    await query(
      `INSERT INTO classes (
        id, name, numeric_value, section, class_teacher_id, 
        max_students, room_number, academic_year, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [classId, name, numericValue, section, classTeacherId, maxStudents, roomNumber, academicYear]
    );

    // Update teacher's class assignment
    if (classTeacherId) {
      await query(
        'UPDATE teachers SET is_class_teacher = TRUE, class_id = ? WHERE id = ?',
        [classId, classTeacherId]
      );
    }

    logger.info(`Class created: ${name}-${section}`);

    return await this.getClassById(classId);
  }

  async getClassById(id) {
    const results = await query(
      `SELECT 
        c.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.employee_id as teacher_employee_id
       FROM classes c
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       WHERE c.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Class not found');
    }

    const classData = results[0];

    // Get assigned subjects
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
       WHERE cs.class_id = ?`,
      [id]
    );

    classData.subjects = subjects;

    return classData;
  }

  async getClasses(filters = {}) {
    const { academicYear, isActive, classTeacherId } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (academicYear) {
      whereConditions.push('c.academic_year = ?');
      queryParams.push(academicYear);
    }

    if (isActive !== undefined) {
      whereConditions.push('c.is_active = ?');
      queryParams.push(isActive);
    }

    if (classTeacherId) {
      whereConditions.push('c.class_teacher_id = ?');
      queryParams.push(classTeacherId);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const classes = await query(
      `SELECT 
        c.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as current_strength
       FROM classes c
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       ${whereClause}
       ORDER BY c.numeric_value, c.section`,
      queryParams
    );

    return classes;
  }

  async updateClass(id, updateData) {
    await this.getClassById(id);

    const { name, section, classTeacherId, maxStudents, roomNumber, isActive } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (section !== undefined) {
      updateFields.push('section = ?');
      updateValues.push(section);
    }
    if (classTeacherId !== undefined) {
      updateFields.push('class_teacher_id = ?');
      updateValues.push(classTeacherId);

      // Update teacher assignment
      if (classTeacherId) {
        await query(
          'UPDATE teachers SET is_class_teacher = TRUE, class_id = ? WHERE id = ?',
          [id, classTeacherId]
        );
      }
    }
    if (maxStudents !== undefined) {
      updateFields.push('max_students = ?');
      updateValues.push(maxStudents);
    }
    if (roomNumber !== undefined) {
      updateFields.push('room_number = ?');
      updateValues.push(roomNumber);
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return await this.getClassById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE classes SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Class updated: ${id}`);

    return await this.getClassById(id);
  }

  async assignSubjectToClass(classId, subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks) {
    const assignmentId = uuidv4();

    // Check if already assigned
    const existing = await query(
      'SELECT * FROM class_subjects WHERE class_id = ? AND subject_id = ?',
      [classId, subjectId]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Subject already assigned to this class');
    }

    await query(
      `INSERT INTO class_subjects (
        id, class_id, subject_id, teacher_id, is_optional, 
        weekly_hours, passing_marks, max_marks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [assignmentId, classId, subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks]
    );

    logger.info(`Subject ${subjectId} assigned to class ${classId}`);

    return await this.getClassById(classId);
  }

  async removeSubjectFromClass(classId, subjectId) {
    const result = await query(
      'DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?',
      [classId, subjectId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Subject assignment not found');
    }

    logger.info(`Subject ${subjectId} removed from class ${classId}`);

    return { message: 'Subject removed from class successfully' };
  }

  // ==================== EXAMS ====================
  async createExam(examData) {
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
        max_marks, passing_marks, weightage, is_results_published, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
      [examId, name, type, session, classId, startDate, endDate, maxMarks, passingMarks, weightage, createdBy]
    );

    logger.info(`Exam created: ${name}`);

    return await this.getExamById(examId);
  }

  async getExamById(id) {
    const results = await query(
      `SELECT 
        e.*,
        c.name as class_name,
        c.section as section_name,
        u.email as created_by_email
       FROM exams e
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Exam not found');
    }

    return results[0];
  }

  async getExams(filters = {}) {
    const { session, type, classId, isResultsPublished } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (session) {
      whereConditions.push('e.session = ?');
      queryParams.push(session);
    }

    if (type) {
      whereConditions.push('e.type = ?');
      queryParams.push(type);
    }

    if (classId) {
      whereConditions.push('e.class_id = ?');
      queryParams.push(classId);
    }

    if (isResultsPublished !== undefined) {
      whereConditions.push('e.is_results_published = ?');
      queryParams.push(isResultsPublished);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

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

  async updateExam(id, updateData) {
    await this.getExamById(id);

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

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (startDate !== undefined) {
      updateFields.push('start_date = ?');
      updateValues.push(startDate);
    }
    if (endDate !== undefined) {
      updateFields.push('end_date = ?');
      updateValues.push(endDate);
    }
    if (maxMarks !== undefined) {
      updateFields.push('max_marks = ?');
      updateValues.push(maxMarks);
    }
    if (passingMarks !== undefined) {
      updateFields.push('passing_marks = ?');
      updateValues.push(passingMarks);
    }
    if (weightage !== undefined) {
      updateFields.push('weightage = ?');
      updateValues.push(weightage);
    }

    if (updateFields.length === 0) {
      return await this.getExamById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE exams SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Exam updated: ${id}`);

    return await this.getExamById(id);
  }

  async deleteExam(id) {
    // Check if results exist
    const results = await query(
      'SELECT COUNT(*) as count FROM exam_results WHERE exam_id = ?',
      [id]
    );

    if (results[0].count > 0) {
      throw new ApiError(400, 'Cannot delete exam with existing results');
    }

    await query('DELETE FROM exams WHERE id = ?', [id]);

    logger.info(`Exam deleted: ${id}`);

    return { message: 'Exam deleted successfully' };
  }

  // ==================== EXAM RESULTS ====================
  async enterResult(resultData) {
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

    // Verify exam exists
    await this.getExamById(examId);

    const resultId = uuidv4();

    // Check if result already exists
    const existing = await query(
      'SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ? AND subject_id = ?',
      [examId, studentId, subjectId]
    );

    if (existing.length > 0) {
      // Update existing result
      await query(
        `UPDATE exam_results 
         SET marks_obtained = ?, grade = ?, is_absent = ?, remarks = ?, teacher_id = ?, updated_at = NOW()
         WHERE exam_id = ? AND student_id = ? AND subject_id = ?`,
        [marksObtained, grade, isAbsent, remarks, teacherId, examId, studentId, subjectId]
      );

      return await query(
        'SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ? AND subject_id = ?',
        [examId, studentId, subjectId]
      );
    }

    // Insert new result
    await query(
      `INSERT INTO exam_results (
        id, exam_id, student_id, subject_id, marks_obtained,
        grade, is_absent, remarks, teacher_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [resultId, examId, studentId, subjectId, marksObtained, grade, isAbsent, remarks, teacherId]
    );

    logger.info(`Result entered for student ${studentId} in exam ${examId}`);

    return await query('SELECT * FROM exam_results WHERE id = ?', [resultId]);
  }

  async bulkEnterResults(examId, results, teacherId) {
    const successfulResults = [];
    const failedResults = [];

    for (const result of results) {
      try {
        const entered = await this.enterResult({
          examId,
          ...result,
          teacherId
        });
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

  async getExamResults(examId, filters = {}) {
    const { studentId, subjectId } = filters;

    let whereConditions = ['er.exam_id = ?'];
    let queryParams = [examId];

    if (studentId) {
      whereConditions.push('er.student_id = ?');
      queryParams.push(studentId);
    }

    if (subjectId) {
      whereConditions.push('er.subject_id = ?');
      queryParams.push(subjectId);
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

  async publishResults(examId) {
    await query(
      'UPDATE exams SET is_results_published = TRUE, published_at = NOW() WHERE id = ?',
      [examId]
    );

    logger.info(`Results published for exam ${examId}`);

    return { message: 'Results published successfully' };
  }

  async unpublishResults(examId) {
    await query(
      'UPDATE exams SET is_results_published = FALSE, published_at = NULL WHERE id = ?',
      [examId]
    );

    logger.info(`Results unpublished for exam ${examId}`);

    return { message: 'Results unpublished successfully' };
  }

  // ==================== GRADEBOOK ====================
  async createGradebookEntry(entryData) {
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
        title, marks, max_marks, grade, teacher_id, date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entryId, classId, studentId, subjectId, assessmentType, title, marks, maxMarks, grade, teacherId, date, notes]
    );

    logger.info(`Gradebook entry created for student ${studentId}`);

    return await query('SELECT * FROM gradebook WHERE id = ?', [entryId]);
  }

  async getGradebookEntries(filters = {}) {
    const { classId, studentId, subjectId, assessmentType, startDate, endDate } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (classId) {
      whereConditions.push('g.class_id = ?');
      queryParams.push(classId);
    }

    if (studentId) {
      whereConditions.push('g.student_id = ?');
      queryParams.push(studentId);
    }

    if (subjectId) {
      whereConditions.push('g.subject_id = ?');
      queryParams.push(subjectId);
    }

    if (assessmentType) {
      whereConditions.push('g.assessment_type = ?');
      queryParams.push(assessmentType);
    }

    if (startDate && endDate) {
      whereConditions.push('g.date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

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

  async updateGradebookEntry(id, updateData) {
    const { marks, grade, notes } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (marks !== undefined) {
      updateFields.push('marks = ?');
      updateValues.push(marks);
    }
    if (grade !== undefined) {
      updateFields.push('grade = ?');
      updateValues.push(grade);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }

    updateValues.push(id);

    await query(
      `UPDATE gradebook SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Gradebook entry updated: ${id}`);

    return await query('SELECT * FROM gradebook WHERE id = ?', [id]);
  }

  async deleteGradebookEntry(id) {
    await query('DELETE FROM gradebook WHERE id = ?', [id]);

    logger.info(`Gradebook entry deleted: ${id}`);

    return { message: 'Gradebook entry deleted successfully' };
  }

  // ==================== REPORTS ====================
  async generateStudentReportCard(studentId, examId) {
    const exam = await this.getExamById(examId);
    
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
       WHERE s.id = ?`,
      [studentId]
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
       LEFT JOIN class_subjects cs ON er.subject_id = cs.subject_id AND cs.class_id = ?
       WHERE er.exam_id = ? AND er.student_id = ?`,
      [student[0].class_id, examId, studentId]
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

  async getClassPerformanceReport(classId, examId) {
    const exam = await this.getExamById(examId);
    
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
       WHERE s.class_id = ? AND er.exam_id = ?
       GROUP BY s.id
       ORDER BY total_marks DESC`,
      [classId, examId]
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

  async getSubjectWisePerformance(examId, classId) {
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
       WHERE er.exam_id = ? AND s.class_id = ?
       GROUP BY sub.id`,
      [examId, classId]
    );

    return results;
  }
}

export default new AcademicService();
