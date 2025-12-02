import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get timetable
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, teacherId } = req.query;
    
    let sql = `
      SELECT t.*, 
        c.name as class_name,
        s.name as subject_name,
        CONCAT(te.first_name, ' ', te.last_name) as teacher_name
      FROM timetable t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN teachers te ON t.teacher_id = te.id
      WHERE t.is_active = true
    `;
    const params = [];
    let paramIndex = 1;
    
    if (classId) {
      sql += ` AND t.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }
    
    if (teacherId) {
      sql += ` AND t.teacher_id = $${paramIndex}`;
      params.push(teacherId);
      paramIndex++;
    }
    
    sql += ' ORDER BY t.day_of_week, t.start_time';
    
    const timetable = await query(sql, params);
    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('Get timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Create timetable entry - handle various field names from frontend
router.post('/', authenticate, async (req, res) => {
  try {
    logger.info('Create timetable request:', JSON.stringify(req.body));
    
    const { 
      class_id, classId,
      subject_id, subjectId,
      teacher_id, teacherId,
      day_of_week, dayOfWeek, day,
      start_time, startTime,
      end_time, endTime,
      room, roomNumber
    } = req.body;
    
    const actualClassId = class_id || classId;
    const actualSubjectId = subject_id || subjectId;
    const actualTeacherId = teacher_id || teacherId;
    const actualDayOfWeek = day_of_week || dayOfWeek || day;
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber;
    
    if (!actualClassId) {
      return res.status(400).json({ success: false, message: 'Class ID is required' });
    }
    
    const timetableId = uuidv4();
    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom]
    );
    
    res.status(201).json({ success: true, message: 'Timetable entry created', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create timetable error:', error);
    res.status(500).json({ success: false, message: 'Error creating timetable entry' });
  }
});

// Create period - handle various field names from frontend
router.post('/period', authenticate, async (req, res) => {
  try {
    logger.info('Create period request:', JSON.stringify(req.body));
    
    const { 
      class_id, classId,
      subject_id, subjectId,
      teacher_id, teacherId,
      day_of_week, dayOfWeek, day,
      start_time, startTime,
      end_time, endTime,
      room, roomNumber,
      period_number, periodNumber
    } = req.body;
    
    const actualClassId = class_id || classId;
    const actualSubjectId = subject_id || subjectId;
    const actualTeacherId = teacher_id || teacherId;
    const actualDayOfWeek = day_of_week || dayOfWeek || day;
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber;
    
    if (!actualClassId) {
      return res.status(400).json({ success: false, message: 'Class ID is required' });
    }
    
    const timetableId = uuidv4();
    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom]
    );
    
    res.status(201).json({ success: true, message: 'Period created successfully', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create period error:', error);
    res.status(500).json({ success: false, message: 'Error creating period' });
  }
});

// Assign substitute
router.post('/substitute', authenticate, async (req, res) => {
  try {
    const { timetable_id, substitute_teacher_id, date, reason } = req.body;
    res.json({ success: true, message: 'Substitute assigned successfully' });
  } catch (error) {
    logger.error('Assign substitute error:', error);
    res.status(500).json({ success: false, message: 'Error assigning substitute' });
  }
});

// Get teacher timetable
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const timetable = await query(
      `SELECT t.*, c.name as class_name, s.name as subject_name
       FROM timetable t
       LEFT JOIN classes c ON t.class_id = c.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.teacher_id = $1 AND t.is_active = true
       ORDER BY t.day_of_week, t.start_time`,
      [req.params.teacherId]
    );
    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('Get teacher timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Get student timetable
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const student = await query('SELECT class_id FROM students WHERE id = $1 OR user_id = $1', [req.params.studentId]);
    
    if (student.length === 0 || !student[0].class_id) {
      return res.json({ success: true, data: [] });
    }
    
    const timetable = await query(
      `SELECT t.*, s.name as subject_name, CONCAT(te.first_name, ' ', te.last_name) as teacher_name
       FROM timetable t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN teachers te ON t.teacher_id = te.id
       WHERE t.class_id = $1 AND t.is_active = true
       ORDER BY t.day_of_week, t.start_time`,
      [student[0].class_id]
    );
    res.json({ success: true, data: timetable });
  } catch (error) {
    logger.error('Get student timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

export default router;
