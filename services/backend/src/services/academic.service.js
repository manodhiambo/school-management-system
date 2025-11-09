const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const { z } = require('zod');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['core', 'elective', 'co_curricular']).default('core')
});

const classSchema = z.object({
  name: z.string().min(1),
  numeric_value: z.coerce.number().min(1),
  section: z.string().min(1),
  max_students: z.coerce.number().min(1).default(40),
  room_number: z.string().optional()
});

const examSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['unit_test', 'term', 'half_yearly', 'final', 'practical']),
  session: z.string().min(1),
  class_id: z.string().uuid(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  max_marks: z.coerce.number().min(0),
  passing_marks: z.coerce.number().min(0),
  weightage: z.coerce.number().min(0).max(1).optional()
});

const gradebookSchema = z.object({
  class_id: z.string().uuid(),
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  assessment_type: z.enum(['homework', 'classwork', 'project', 'presentation', 'behavior']),
  marks: z.coerce.number().min(0),
  max_marks: z.coerce.number().min(1),
  grade: z.string().optional(),
  date: z.string().date(),
  notes: z.string().optional()
});

class AcademicService {
  static async createSubject(subjectData) {
    const validatedData = subjectSchema.parse(subjectData);

    const [result] = await query(
      `INSERT INTO subjects (id, name, code, description, category)
       VALUES (UUID(), ?, ?, ?, ?)`,
      [
        validatedData.name,
        validatedData.code || null,
        validatedData.description || null,
        validatedData.category
      ]
    );

    logger.info(`Subject created: ${validatedData.name}`);
    
    return { subjectId: result.insertId };
  }

  static async getSubjects(filters = {}) {
    let whereConditions = ['is_active = TRUE'];
    let params = [];

    if (filters.category) {
      whereConditions.push('category = ?');
      params.push(filters.category);
    }

    const whereClause = whereConditions.join(' AND ');

    const [subjects] = await query(
      `SELECT * FROM subjects 
       WHERE ${whereClause}
       ORDER BY name`,
      params
    );

    return subjects;
  }

  static async updateSubject(subjectId, updateData) {
    const validatedData = subjectSchema.partial().parse(updateData);

    const updates = [];
    const params = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(subjectId);

    await query(
      `UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    logger.info(`Subject updated: ${subjectId}`);
    
    return { success: true };
  }

  static async deleteSubject(subjectId) {
    // Check if subject is in use
    const [usage] = await query(
      'SELECT id FROM class_subjects WHERE subject_id = ? LIMIT 1',
      [subjectId]
    );

    if (usage.length > 0) {
      throw new Error('Cannot delete subject that is assigned to classes');
    }

    await query('UPDATE subjects SET is_active = FALSE WHERE id = ?', [subjectId]);

    logger.info(`Subject deactivated: ${subjectId}`);
    
    return { success: true };
  }

  static async createClass(classData) {
    const validatedData = classSchema.parse(classData);

    const [result] = await query(
      `INSERT INTO classes (id, name, numeric_value, section, max_students, room_number)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [
        validatedData.name,
        validatedData.numeric_value,
        validatedData.section,
        validatedData.max_students,
        validatedData.room_number || null
      ]
    );

    logger.info(`Class created: ${validatedData.name} - ${validatedData.section}`);
    
    return { classId: result.insertId };
  }

  static async getClasses() {
    const [classes] = await query(
      `SELECT 
        c.*,
        COUNT(s.id) as student_count,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
      LEFT JOIN teachers t ON c.class_teacher_id = t.id
      GROUP BY c.id
      ORDER BY c.numeric_value, c.section`
    );

    return classes;
  }

  static async addClassSubject(classId, subjectData) {
    const { subject_id, teacher_id, is_optional, weekly_hours } = subjectData;

    const [result] = await query(
      `INSERT INTO class_subjects (id, class_id, subject_id, teacher_id, is_optional, weekly_hours)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [classId, subject_id, teacher_id || null, is_optional || false, weekly_hours || 0]
    );

    logger.info(`Subject added to class ${classId}`);
    
    return { classSubjectId: result.insertId };
  }

  static async getClassSubjects(classId) {
    const [subjects] = await query(
      `SELECT 
        cs.*,
        s.name as subject_name,
        s.code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.class_id = ?
      ORDER BY s.name`,
      [classId]
    );

    return subjects;
  }

  static async createExam(examData) {
    const validatedData = examSchema.parse(examData);

    const [result] = await query(
      `INSERT INTO exams 
       (id, name, type, session, class_id, start_date, end_date, max_marks, passing_marks, weightage)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.name,
        validatedData.type,
        validatedData.session,
        validatedData.class_id,
        validatedData.start_date,
        validatedData.end_date,
        validatedData.max_marks,
        validatedData.passing_marks,
        validatedData.weightage || 0
      ]
    );

    logger.info(`Exam created: ${validatedData.name}`);
    
    return { examId: result.insertId };
  }

  static async getExams(filters = {}) {
    let whereConditions = [];
    let params = [];

    if (filters.classId) {
      whereConditions.push('e.class_id = ?');
      params.push(filters.classId);
    }

    if (filters.session) {
      whereConditions.push('e.session = ?');
      params.push(filters.session);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [exams] = await query(
      `SELECT 
        e.*,
        c.name as class_name
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      ${whereClause}
      ORDER BY e.start_date DESC`,
      params
    );

    return exams;
  }

  static async updateExamResult(examId, studentId, subjectId, resultData) {
    const { marks_obtained, grade, remarks } = resultData;

    const [existing] = await query(
      'SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ? AND subject_id = ?',
      [examId, studentId, subjectId]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE exam_results SET 
          marks_obtained = ?, grade = ?, remarks = ?
         WHERE id = ?`,
        [marks_obtained, grade || null, remarks || null, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO exam_results 
         (id, exam_id, student_id, subject_id, marks_obtained, grade, remarks)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [examId, studentId, subjectId, marks_obtained, grade || null, remarks || null]
      );
    }

    logger.info(`Exam result updated: ${examId} - ${studentId} - ${subjectId}`);
    
    return { success: true };
  }

  static async bulkUploadResults(examId, resultsFile) {
    const workbook = XLSX.readFile(resultsFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      try {
        const {
          student_admission_number,
          subject_code,
          marks_obtained,
          grade,
          remarks
        } = row;

        // Get student ID
        const [student] = await query(
          'SELECT id FROM students WHERE admission_number = ?',
          [student_admission_number]
        );

        if (!student.length) {
          throw new Error(`Student not found: ${student_admission_number}`);
        }

        // Get subject ID
        const [subject] = await query(
          'SELECT id FROM subjects WHERE code = ?',
          [subject_code]
        );

        if (!subject.length) {
          throw new Error(`Subject not found: ${subject_code}`);
        }

        await this.updateExamResult(
          examId,
          student[0].id,
          subject[0].id,
          { marks_obtained, grade, remarks }
        );

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ row, error: error.message });
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      errors
    };
  }

  static async getStudentExamResults(studentId) {
    const [results] = await query(
      `SELECT 
        e.name as exam_name,
        e.type as exam_type,
        e.session,
        e.start_date,
        s.name as subject_name,
        er.marks_obtained,
        er.grade,
        er.remarks
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN subjects s ON er.subject_id = s.id
      WHERE er.student_id = ?
      ORDER BY e.start_date DESC, s.name`,
      [studentId]
    );

    return results;
  }

  static async publishExamResults(examId) {
    await query(
      'UPDATE exams SET is_results_published = TRUE WHERE id = ?',
      [examId]
    );

    // Send notifications to parents
    const [students] = await query(
      `SELECT DISTINCT 
        s.id as student_id,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        p.email,
        p.phone_primary
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      JOIN parent_students ps ON s.id = ps.student_id
      JOIN parents p ON ps.parent_id = p.id
      WHERE er.exam_id = ?`,
      [examId]
    );

    for (const student of students) {
      try {
        if (student.email) {
          await EmailService.sendExamResultNotification(
            student.email,
            `${student.student_first_name} ${student.student_last_name}`,
            exam.name,
            'Published'
          );
        }
      } catch (error) {
        logger.error(`Failed to send result notification for student ${student.student_id}:`, error);
      }
    }

    logger.info(`Exam results published: ${examId}`);
    
    return { success: true };
  }

  static async addGradebookEntry(entryData, teacherId) {
    const validatedData = gradebookSchema.parse(entryData);

    const [result] = await query(
      `INSERT INTO gradebook 
       (id, class_id, student_id, subject_id, assessment_type, marks, max_marks, grade, teacher_id, date, notes)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.class_id,
        validatedData.student_id,
        validatedData.subject_id,
        validatedData.assessment_type,
        validatedData.marks,
        validatedData.max_marks,
        validatedData.grade || null,
        teacherId,
        validatedData.date,
        validatedData.notes || null
      ]
    );

    logger.info(`Gradebook entry added for student ${validatedData.student_id}`);
    
    return { gradebookId: result.insertId };
  }

  static async getStudentGradebook(studentId, subjectId = null) {
    let queryStr = `SELECT 
      g.*,
      s.name as subject_name,
      t.first_name as teacher_first_name,
      t.last_name as teacher_last_name
    FROM gradebook g
    JOIN subjects s ON g.subject_id = s.id
    JOIN teachers t ON g.teacher_id = t.id
    WHERE g.student_id = ?`;
    
    const params = [studentId];

    if (subjectId) {
      queryStr += ' AND g.subject_id = ?';
      params.push(subjectId);
    }

    queryStr += ' ORDER BY g.date DESC';

    const [entries] = await query(queryStr, params);

    return entries;
  }

  static async generateReportCard(studentId, examIds) {
    const [student] = await query(
      `SELECT 
        s.*,
        c.name as class_name,
        sec.section as section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.id = ?`,
      [studentId]
    );

    if (!student.length) {
      throw new Error('Student not found');
    }

    const [results] = await query(
      `SELECT 
        e.name as exam_name,
        e.type as exam_type,
        s.name as subject_name,
        er.marks_obtained,
        er.grade,
        er.remarks
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN subjects s ON er.subject_id = s.id
      WHERE er.student_id = ? AND er.exam_id IN (?)
      ORDER BY e.start_date DESC, s.name`,
      [studentId, examIds]
    );

    const [attendance] = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days
      FROM attendance
      WHERE student_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`,
      [studentId]
    );

    // Create PDF report card
    const doc = new PDFDocument();
    const reportPath = path.join(__dirname, `../../reports/report_card_${studentId}_${Date.now()}.pdf`);
    
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    doc.fontSize(20).text(process.env.SCHOOL_NAME || 'School Management System', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Report Card', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Student: ${student[0].first_name} ${student[0].last_name}`);
    doc.text(`Class: ${student[0].class_name} - ${student[0].section_name}`);
    doc.text(`Admission #: ${student[0].admission_number}`);
    doc.moveDown();

    // Group results by exam
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.exam_name]) {
        acc[result.exam_name] = [];
      }
      acc[result.exam_name].push(result);
      return acc;
    }, {});

    Object.entries(groupedResults).forEach(([examName, subjects]) => {
      doc.fontSize(14).text(examName, { underline: true });
      subjects.forEach(subject => {
        doc.fontSize(10).text(`${subject.subject_name}: ${subject.marks_obtained} - Grade: ${subject.grade}`);
      });
      doc.moveDown();
    });

    doc.moveDown();
    doc.text(`Attendance: ${attendance[0].present_days}/${attendance[0].total_days} days`);

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return reportPath;
  }

  static async getCurriculumProgress(classId, subjectId) {
    const [topics] = await query(
      `SELECT 
        cc.*,
        COUNT(ct.id) as total_topics,
        SUM(CASE WHEN ct.is_completed = TRUE THEN 1 ELSE 0 END) as completed_topics
      FROM curriculum_content cc
      LEFT JOIN curriculum_topics ct ON cc.id = ct.content_id
      WHERE cc.class_id = ? AND cc.subject_id = ?
      GROUP BY cc.id`,
      [classId, subjectId]
    );

    return topics.map(topic => ({
      ...topic,
      progress_percentage: Math.round((topic.completed_topics / topic.total_topics) * 100)
    }));
  }

  static async updateCurriculumProgress(contentId, topicId, isCompleted) {
    await query(
      'UPDATE curriculum_topics SET is_completed = ?, completed_at = NOW() WHERE content_id = ? AND id = ?',
      [isCompleted, contentId, topicId]
    );

    logger.info(`Curriculum progress updated: ${contentId} - ${topicId}`);
    
    return { success: true };
  }
}

module.exports = AcademicService;
