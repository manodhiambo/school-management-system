const TeacherService = require('../services/teacher.service');
const { z } = require('zod');
const logger = require('../utils/logger');
const { upload } = require('../utils/fileUpload');

const teacherQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'resigned']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const teacherIdSchema = z.object({
  id: z.string().uuid()
});

const assignClassSchema = z.object({
  class_id: z.string().uuid(),
  section_id: z.string().uuid(),
  is_class_teacher: z.boolean().default(false)
});

const attendanceSchema = z.object({
  date: z.string().date(),
  status: z.enum(['present', 'absent', 'late', 'half_day']),
  check_in_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  check_out_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional()
});

const leaveSchema = z.object({
  leave_type: z.enum(['casual', 'sick', 'earned', 'maternity', 'paternity', 'other']),
  start_date: z.string().date(),
  end_date: z.string().date(),
  reason: z.string().min(1)
});

class TeacherController {
  static async getTeachers(req, res) {
    try {
      const filters = teacherQuerySchema.parse(req.query);
      const result = await TeacherService.getTeachers(filters, filters.page, filters.limit);
      
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
      logger.error('Get teachers error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch teachers' 
      });
    }
  }

  static async createTeacher(req, res) {
    try {
      const result = await TeacherService.createTeacher(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: result
      });
    } catch (error) {
      logger.error('Create teacher error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create teacher' 
      });
    }
  }

  static async getTeacherById(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const teacher = await TeacherService.getTeacherById(id);
      
      res.status(200).json({
        success: true,
        data: teacher
      });
    } catch (error) {
      if (error.message === 'Teacher not found') {
        return res.status(404).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Get teacher by ID error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch teacher' 
      });
    }
  }

  static async updateTeacher(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const result = await TeacherService.updateTeacher(id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Teacher updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update teacher error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update teacher' 
      });
    }
  }

  static async assignClass(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const classData = assignClassSchema.parse(req.body);
      
      const result = await TeacherService.assignClass(id, classData);
      
      res.status(200).json({
        success: true,
        message: 'Class assigned successfully',
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
      logger.error('Assign class error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to assign class' 
      });
    }
  }

  static async markAttendance(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const attendanceData = attendanceSchema.parse(req.body);
      
      const result = await TeacherService.markAttendance(id, attendanceData);
      
      res.status(200).json({
        success: true,
        message: 'Attendance marked successfully',
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
      logger.error('Mark attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark attendance' 
      });
    }
  }

  static async getTeacherAttendance(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }
      
      const attendance = await TeacherService.getTeacherAttendance(id, startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Get teacher attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch attendance' 
      });
    }
  }

  static async applyLeave(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const leaveData = leaveSchema.parse(req.body);
      
      const result = await TeacherService.applyLeave(id, leaveData);
      
      res.status(201).json({
        success: true,
        message: 'Leave applied successfully',
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
      logger.error('Apply leave error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to apply leave' 
      });
    }
  }

  static async getTeacherLeaves(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const leaves = await TeacherService.getTeacherLeaves(id);
      
      res.status(200).json({
        success: true,
        data: leaves
      });
    } catch (error) {
      logger.error('Get teacher leaves error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch leaves' 
      });
    }
  }

  static async getTeacherSchedule(req, res) {
    try {
      const { id } = teacherIdSchema.parse(req.params);
      const schedule = await TeacherService.getTeacherSchedule(id);
      
      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Get teacher schedule error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch schedule' 
      });
    }
  }

  static async getAvailableTeachers(req, res) {
    try {
      const { date, periodId } = req.query;
      
      if (!date || !periodId) {
        return res.status(400).json({ 
          success: false, 
          message: 'date and periodId are required' 
        });
      }
      
      const teachers = await TeacherService.getAvailableTeachers(date, periodId);
      
      res.status(200).json({
        success: true,
        data: teachers
      });
    } catch (error) {
      logger.error('Get available teachers error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch available teachers' 
      });
    }
  }
}

module.exports = TeacherController;
