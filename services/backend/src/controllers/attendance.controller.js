const AttendanceService = require('../services/attendance.service');
const { z } = require('zod');
const logger = require('../utils/logger');

const attendanceSchema = z.object({
  student_id: z.string().uuid(),
  date: z.string().date(),
  status: z.enum(['present', 'absent', 'late', 'half_day']),
  check_in_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  check_out_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  reason: z.string().optional(),
  is_excused: z.boolean().default(false)
});

const bulkAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().date(),
  attendance: z.array(attendanceSchema)
});

const reportFiltersSchema = z.object({
  classId: z.string().uuid().optional(),
  startDate: z.string().date(),
  endDate: z.string().date()
});

class AttendanceController {
  static async markAttendance(req, res) {
    try {
      const attendanceData = attendanceSchema.parse(req.body);
      const result = await AttendanceService.markAttendance(attendanceData, req.user.id);
      
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

  static async markBulkAttendance(req, res) {
    try {
      const bulkData = bulkAttendanceSchema.parse(req.body);
      const result = await AttendanceService.markBulkAttendance(bulkData, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Bulk attendance marked successfully',
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
      logger.error('Mark bulk attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark bulk attendance' 
      });
    }
  }

  static async getClassAttendance(req, res) {
    try {
      const classId = req.params.classId;
      const date = req.params.date;
      const attendance = await AttendanceService.getClassAttendance(classId, date);
      
      res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Get class attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch class attendance' 
      });
    }
  }

  static async getStudentMonthlyAttendance(req, res) {
    try {
      const studentId = req.params.studentId;
      const month = req.params.month;
      const attendance = await AttendanceService.getStudentMonthlyAttendance(studentId, month);
      
      res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Get student monthly attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch monthly attendance' 
      });
    }
  }

  static async getStudentAttendanceStats(req, res) {
    try {
      const studentId = req.params.studentId;
      const stats = await AttendanceService.getStudentAttendanceStats(studentId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get student attendance stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch attendance stats' 
      });
    }
  }

  static async importBiometricAttendance(req, res) {
    try {
      const data = req.body;
      const result = await AttendanceService.importBiometricAttendance(data);
      
      res.status(200).json({
        success: true,
        message: 'Biometric attendance imported successfully',
        data: result
      });
    } catch (error) {
      logger.error('Import biometric attendance error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to import biometric attendance' 
      });
    }
  }

  static async generateAttendanceReport(req, res) {
    try {
      const filters = reportFiltersSchema.parse(req.query);
      const report = await AttendanceService.generateAttendanceReport(filters);
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Generate attendance report error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate report' 
      });
    }
  }
}

module.exports = AttendanceController;
