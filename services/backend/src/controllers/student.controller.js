const StudentService = require('../services/student.service');
const { z } = require('zod');
const logger = require('../utils/logger');

const studentQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'transferred']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const studentIdSchema = z.object({
  id: z.string().uuid()
});

const statusUpdateSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'transferred'])
});

class StudentController {
  static async getStudents(req, res) {
    try {
      const filters = studentQuerySchema.parse(req.query);
      const result = await StudentService.getStudents(filters, filters.page, filters.limit);
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Get students error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch students' 
      });
    }
  }

  static async createStudent(req, res) {
    try {
      const studentData = {
        ...req.body,
        admission_date: req.body.admission_date || new Date().toISOString().split('T')[0]
      };
      
      const result = await StudentService.createStudent(studentData);
      
      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: result
      });
    } catch (error) {
      if (error.message === 'Admission number already exists') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Create student error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create student' 
      });
    }
  }

  static async getStudentById(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const student = await StudentService.getStudentById(id);
      
      res.status(200).json({
        success: true,
        data: student
      });
    } catch (error) {
      if (error.message === 'Student not found') {
        return res.status(404).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Get student by ID error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch student' 
      });
    }
  }

  static async updateStudent(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const result = await StudentService.updateStudent(id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update student error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update student' 
      });
    }
  }

  static async updateStudentStatus(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const { status } = statusUpdateSchema.parse(req.body);
      
      const result = await StudentService.updateStudentStatus(id, status);
      
      res.status(200).json({
        success: true,
        message: 'Student status updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update student status error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to update student status' 
      });
    }
  }

  static async deleteStudent(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      await StudentService.updateStudentStatus(id, 'deleted');
      
      res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      logger.error('Delete student error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete student' 
      });
    }
  }

  static async bulkImportStudents(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      const result = await StudentService.bulkImportStudents(req.file.path);
      
      res.status(201).json({
        success: true,
        message: 'Students imported successfully',
        data: result
      });
    } catch (error) {
      logger.error('Bulk import students error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to import students' 
      });
    }
  }

  static async getStudentAttendance(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const attendance = await StudentService.getStudentAttendance(id);
      
      res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Get student attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch attendance' 
      });
    }
  }

  static async getStudentAcademicReport(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const report = await StudentService.getStudentAcademicReport(id);
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Get academic report error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch academic report' 
      });
    }
  }

  static async getStudentFinance(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const finance = await StudentService.getStudentFinance(id);
      
      res.status(200).json({
        success: true,
        data: finance
      });
    } catch (error) {
      logger.error('Get student finance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch finance details' 
      });
    }
  }

  static async uploadDocument(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      const documentData = {
        document_type: req.body.document_type,
        file_url: req.file.location || req.file.path,
        file_name: req.file.originalname,
        file_size: req.file.size,
        uploaded_by: req.user.id
      };

      const result = await StudentService.uploadDocument(id, documentData);
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: result
      });
    } catch (error) {
      logger.error('Upload document error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to upload document' 
      });
    }
  }

  static async getStudentDocuments(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const documents = await StudentService.getStudentDocuments(id);
      
      res.status(200).json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error('Get student documents error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch documents' 
      });
    }
  }

  static async promoteStudent(req, res) {
    try {
      const { id } = studentIdSchema.parse(req.params);
      const { to_class_id, to_section_id, session, result } = req.body;
      
      const promotion = await StudentService.promoteStudent(id, {
        to_class_id,
        to_section_id,
        session,
        result
      });
      
      res.status(200).json({
        success: true,
        message: 'Student promoted successfully',
        data: promotion
      });
    } catch (error) {
      logger.error('Promote student error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to promote student' 
      });
    }
  }
}

module.exports = StudentController;
