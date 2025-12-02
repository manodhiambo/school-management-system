import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get attendance
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, date, studentId } = req.query;
    
    let sql = `
      SELECT a.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (classId) {
      sql += ` AND s.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (date) {
      sql += ` AND DATE(a.date) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (studentId) {
      sql += ` AND a.student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    sql += ' ORDER BY a.date DESC, s.first_name';

    const attendance = await query(sql, params);
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Get attendance statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE DATE(date) = CURRENT_DATE
    `);
    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    logger.error('Get attendance statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get attendance by class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const attendance = await query(`
      SELECT a.*, s.first_name, s.last_name, s.admission_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = $1 AND DATE(a.date) = $2
      ORDER BY s.first_name
    `, [req.params.classId, date || new Date().toISOString().split('T')[0]]);
    
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get class attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Get student attendance
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const attendance = await query(`
      SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC
    `, [req.params.studentId]);
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get student attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Mark attendance (single)
router.post('/', authenticate, async (req, res) => {
  try {
    logger.info('Mark attendance request:', JSON.stringify(req.body));
    
    const { studentId, student_id, date, status, remarks, classId, class_id } = req.body;
    
    const actualStudentId = studentId || student_id;
    const actualDate = date || new Date().toISOString().split('T')[0];
    const actualStatus = status || 'present';
    
    if (!actualStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    // Check if attendance already exists
    const existing = await query(
      'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
      [actualStudentId, actualDate]
    );

    if (existing.length > 0) {
      // Update existing
      await query(
        `UPDATE attendance SET status = $1, remarks = $2, updated_at = NOW() WHERE id = $3`,
        [actualStatus, remarks || null, existing[0].id]
      );
    } else {
      // Create new
      const attendanceId = uuidv4();
      await query(
        `INSERT INTO attendance (id, student_id, date, status, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [attendanceId, actualStudentId, actualDate, actualStatus, remarks || null]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking attendance' });
  }
});

// Mark bulk attendance
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { attendances, classId, date } = req.body;
    const actualDate = date || new Date().toISOString().split('T')[0];

    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ success: false, message: 'Attendances array is required' });
    }

    for (const record of attendances) {
      const studentId = record.studentId || record.student_id;
      const status = record.status || 'present';
      
      if (!studentId) continue;

      const existing = await query(
        'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
        [studentId, actualDate]
      );

      if (existing.length > 0) {
        await query(
          'UPDATE attendance SET status = $1, remarks = $2, updated_at = NOW() WHERE id = $3',
          [status, record.remarks || null, existing[0].id]
        );
      } else {
        const attendanceId = uuidv4();
        await query(
          `INSERT INTO attendance (id, student_id, date, status, remarks)
           VALUES ($1, $2, $3, $4, $5)`,
          [attendanceId, studentId, actualDate, status, record.remarks || null]
        );
      }
    }

    res.json({ success: true, message: 'Bulk attendance marked successfully' });
  } catch (error) {
    logger.error('Bulk attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking bulk attendance' });
  }
});

// Legacy route for marking attendance
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const actualDate = date || new Date().toISOString().split('T')[0];
    
    const existing = await query(
      'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
      [studentId, actualDate]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE attendance SET status = $1, remarks = $2, updated_at = NOW() WHERE id = $3',
        [status || 'present', remarks || null, existing[0].id]
      );
    } else {
      const attendanceId = uuidv4();
      await query(
        `INSERT INTO attendance (id, student_id, date, status, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [attendanceId, studentId, actualDate, status || 'present', remarks || null]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking attendance' });
  }
});

export default router;
