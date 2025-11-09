const AcademicService = require('../services/academic.service');
const { z } = require('zod');
const logger = require('../utils/logger');

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

const resultUpdateSchema = z.object({
  marks_obtained: z.coerce.number().min(0),
  grade: z.string().optional(),
  remarks: z.string().optional()
});

class AcademicController {
  static async createSubject(req, res) {
    try {
      const subjectData = subjectSchema.parse(req.body);
      const result = await AcademicService.createSubject(subjectData);
      
      res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Create subject error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create subject' 
      });
    }
  }

  static async getSubjects(req, res) {
    try {
      const filters = {
        category: req.query.category
      };
      const subjects = await AcademicService.getSubjects(filters);
      
      res.status(200).json({
        success: true,
        data: subjects
      });
    } catch (error) {
      logger.error('Get subjects error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch subjects' 
      });
    }
  }

  static async updateSubject(req, res) {
    try {
      const subjectId = req.params.id;
      const updateData = subjectSchema.partial().parse(req.body);
      const result = await AcademicService.updateSubject(subjectId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Subject updated successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Update subject error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update subject' 
      });
    }
  }

  static async deleteSubject(req, res) {
    try {
      const subjectId = req.params.id;
      const result = await AcademicService.deleteSubject(subjectId);
      
      res.status(200).json({
        success: true,
        message: 'Subject deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Delete subject error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to delete subject' 
      });
    }
  }

  static async createClass(req, res) {
    try {
      const classData = classSchema.parse(req.body);
      const result = await AcademicService.createClass(classData);
      
      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Create class error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create class' 
      });
    }
  }

  static async getClasses(req, res) {
    try {
      const classes = await AcademicService.getClasses();
      
      res.status(200).json({
        success: true,
        data: classes
      });
    } catch (error) {
      logger.error('Get classes error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch classes' 
      });
    }
  }

  static async addClassSubject(req, res) {
    try {
      const classId = req.params.id;
      const subjectData = req.body;
      const result = await AcademicService.addClassSubject(classId, subjectData);
      
      res.status(201).json({
        success: true,
        message: 'Subject added to class successfully',
        data: result
      });
    } catch (error) {
      logger.error('Add class subject error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add subject to class' 
      });
    }
  }

  static async getClassSubjects(req, res) {
    try {
      const classId = req.params.id;
      const subjects = await AcademicService.getClassSubjects(classId);
      
      res.status(200).json({
        success: true,
        data: subjects
      });
    } catch (error) {
      logger.error('Get class subjects error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch class subjects' 
      });
    }
  }

  static async createExam(req, res) {
    try {
      const examData = examSchema.parse(req.body);
      const result = await AcademicService.createExam(examData);
      
      res.status(201).json({
        success: true,
        message: 'Exam created successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Create exam error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create exam' 
      });
    }
  }

  static async getExams(req, res) {
    try {
      const filters = {
        classId: req.query.classId,
        session: req.query.session
      };
      const exams = await AcademicService.getExams(filters);
      
      res.status(200).json({
        success: true,
        data: exams
      });
    } catch (error) {
      logger.error('Get exams error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch exams' 
      });
    }
  }

  static async updateExamResult(req, res) {
    try {
      const examId = req.params.examId;
      const studentId = req.params.studentId;
      const subjectId = req.params.subjectId;
      const resultData = resultUpdateSchema.parse(req.body);
      
      const result = await AcademicService.updateExamResult(examId, studentId, subjectId, resultData);
      
      res.status(200).json({
        success: true,
        message: 'Exam result updated successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Update exam result error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update exam result' 
      });
    }
  }

  static async bulkUploadResults(req, res) {
    try {
      const examId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      const result = await AcademicService.bulkUploadResults(examId, req.file.path);
      
      res.status(200).json({
        success: true,
        message: 'Results uploaded successfully',
        data: result
      });
    } catch (error) {
      logger.error('Bulk upload results error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to upload results' 
      });
    }
  }

  static async getStudentExamResults(req, res) {
    try {
      const studentId = req.params.studentId;
      const results = await AcademicService.getStudentExamResults(studentId);
      
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Get student exam results error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch exam results' 
      });
    }
  }

  static async publishExamResults(req, res) {
    try {
      const examId = req.params.id;
      const result = await AcademicService.publishExamResults(examId);
      
      res.status(200).json({
        success: true,
        message: 'Exam results published successfully',
        data: result
      });
    } catch (error) {
      logger.error('Publish exam results error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to publish exam results' 
      });
    }
  }

  static async addGradebookEntry(req, res) {
    try {
      const entryData = gradebookSchema.parse(req.body);
      const result = await AcademicService.addGradebookEntry(entryData, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Gradebook entry added successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Add gradebook entry error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add gradebook entry' 
      });
    }
  }

  static async getStudentGradebook(req, res) {
    try {
      const studentId = req.params.studentId;
      const subjectId = req.query.subjectId;
      const entries = await AcademicService.getStudentGradebook(studentId, subjectId);
      
      res.status(200).json({
        success: true,
        data: entries
      });
    } catch (error) {
      logger.error('Get student gradebook error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch gradebook' 
      });
    }
  }

  static async generateReportCard(req, res) {
    try {
      const studentId = req.params.studentId;
      const examIds = req.body.examIds;
      
      if (!examIds || !Array.isArray(examIds)) {
        return res.status(400).json({ 
          success: false, 
          message: 'examIds array is required' 
        });
      }

      const reportPath = await AcademicService.generateReportCard(studentId, examIds);
      
      res.download(reportPath, `report_card_${studentId}.pdf`);
    } catch (error) {
      logger.error('Generate report card error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate report card' 
      });
    }
  }
}

module.exports = AcademicController;
