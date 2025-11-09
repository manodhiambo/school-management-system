const TimetableService = require('../services/timetable.service');
const { z } = require('zod');
const logger = require('../utils/logger');

const periodSchema = z.object({
  name: z.string().min(1),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  is_break: z.boolean().default(false)
});

const timetableEntrySchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  period_id: z.string().uuid(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  room_number: z.string().optional()
});

const substitutionSchema = z.object({
  original_teacher_id: z.string().uuid(),
  substitute_teacher_id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  date: z.string().date(),
  period_id: z.string().uuid(),
  reason: z.string().min(1)
});

const generateTimetableSchema = z.object({
  class_id: z.string().uuid().optional(),
  session: z.string().min(1)
});

const examScheduleSchema = z.object({
  exam_id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  date: z.string().date(),
  period_id: z.string().uuid(),
  room_number: z.string().optional(),
  max_students: z.number().int().positive().optional()
});

class TimetableController {
  static async createPeriod(req, res) {
    try {
      const periodData = periodSchema.parse(req.body);
      const result = await TimetableService.createPeriod(periodData);
      
      res.status(201).json({
        success: true,
        message: 'Period created successfully',
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
      logger.error('Create period error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create period' 
      });
    }
  }

  static async getPeriods(req, res) {
    try {
      const periods = await TimetableService.getPeriods();
      
      res.status(200).json({
        success: true,
        data: periods
      });
    } catch (error) {
      logger.error('Get periods error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch periods' 
      });
    }
  }

  static async createTimetableEntry(req, res) {
    try {
      const entryData = timetableEntrySchema.parse(req.body);
      const result = await TimetableService.createTimetableEntry(entryData);
      
      res.status(201).json({
        success: true,
        message: 'Timetable entry created successfully',
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
      if (error.message === 'Timetable conflict detected') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Create timetable entry error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create timetable entry' 
      });
    }
  }

  static async getClassTimetable(req, res) {
    try {
      const classId = req.params.classId;
      const timetable = await TimetableService.getClassTimetable(classId);
      
      res.status(200).json({
        success: true,
        data: timetable
      });
    } catch (error) {
      logger.error('Get class timetable error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch class timetable' 
      });
    }
  }

  static async getTeacherTimetable(req, res) {
    try {
      const teacherId = req.params.teacherId;
      const timetable = await TimetableService.getTeacherTimetable(teacherId);
      
      res.status(200).json({
        success: true,
        data: timetable
      });
    } catch (error) {
      logger.error('Get teacher timetable error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch teacher timetable' 
      });
    }
  }

  static async getRoomTimetable(req, res) {
    try {
      const roomNumber = req.params.roomId;
      const timetable = await TimetableService.getRoomTimetable(roomNumber);
      
      res.status(200).json({
        success: true,
        data: timetable
      });
    } catch (error) {
      logger.error('Get room timetable error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch room timetable' 
      });
    }
  }

  static async generateTimetable(req, res) {
    try {
      const { class_id, session } = generateTimetableSchema.parse(req.body);
      
      if (!class_id) {
        // Generate for all classes
        const result = await TimetableService.generateAllTimetables(session);
        return res.status(200).json({
          success: true,
          message: 'Timetables generated for all classes',
          data: result
        });
      }
      
      const result = await TimetableService.generateClassTimetable(class_id, session);
      
      res.status(200).json({
        success: true,
        message: 'Timetable generated successfully',
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
      logger.error('Generate timetable error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate timetable' 
      });
    }
  }

  static async scheduleExam(req, res) {
    try {
      const examData = examScheduleSchema.parse(req.body);
      const result = await TimetableService.scheduleExam(examData);
      
      res.status(201).json({
        success: true,
        message: 'Exam scheduled successfully',
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
      if (error.message === 'Exam scheduling conflict detected') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Schedule exam error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to schedule exam' 
      });
    }
  }

  static async createSubstitution(req, res) {
    try {
      const substitutionData = substitutionSchema.parse(req.body);
      const result = await TimetableService.createSubstitution(substitutionData);
      
      res.status(201).json({
        success: true,
        message: 'Substitution created successfully',
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
      if (error.message === 'Substitution conflict detected') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Create substitution error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create substitution' 
      });
    }
  }

  static async getConflicts(req, res) {
    try {
      const { date, period_id } = req.query;
      const conflicts = await TimetableService.detectConflicts(date, period_id);
      
      res.status(200).json({
        success: true,
        data: conflicts
      });
    } catch (error) {
      logger.error('Get conflicts error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch timetable conflicts' 
      });
    }
  }
}

module.exports = TimetableController;
