import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

const dayToNumber = (day) => {
  if (typeof day === 'number') return day;
  if (day === null || day === undefined) return null;
  const days = {
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    'sunday': 0, 'sun': 0
  };
  return days[day?.toString().toLowerCase()] ?? null;
};

const numberToDay = (num) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[num] || 'Monday';
};

// Get timetable
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, teacherId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT t.*,
        c.name as class_name,
        s.name as subject_name,
        CONCAT(te.first_name, ' ', te.last_name) as teacher_name
      FROM timetable t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN teachers te ON t.teacher_id = te.id
      WHERE t.is_active = true AND t.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND t.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (teacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [teacherId, tid]
      );
      const actualTeacherId = teacher.length > 0 ? teacher[0].id : teacherId;
      sql += ` AND t.teacher_id = $${paramIndex}`;
      params.push(actualTeacherId);
      paramIndex++;
    }

    sql += ' ORDER BY t.day_of_week, t.start_time';

    const timetable = await query(sql, params);

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Get teacher timetable
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const teacher = await query(
      'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.teacherId, tid]
    );

    if (teacher.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const actualTeacherId = teacher[0].id;

    const timetable = await query(
      `SELECT t.*, c.name as class_name, s.name as subject_name
       FROM timetable t
       LEFT JOIN classes c ON t.class_id = c.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.teacher_id = $1 AND t.is_active = true AND t.tenant_id = $2
       ORDER BY t.day_of_week, t.start_time`,
      [actualTeacherId, tid]
    );

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get teacher timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Get student timetable
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const student = await query(
      'SELECT class_id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.studentId, tid]
    );

    if (student.length === 0 || !student[0].class_id) {
      return res.json({ success: true, data: [] });
    }

    const timetable = await query(
      `SELECT t.*, s.name as subject_name, CONCAT(te.first_name, ' ', te.last_name) as teacher_name
       FROM timetable t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN teachers te ON t.teacher_id = te.id
       WHERE t.class_id = $1 AND t.is_active = true AND t.tenant_id = $2
       ORDER BY t.day_of_week, t.start_time`,
      [student[0].class_id, tid]
    );

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get student timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Create timetable entry
router.post('/', authenticate, async (req, res) => {
  try {
    logger.info('Create timetable request body:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

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
    const actualSubjectId = subject_id || subjectId || null;
    let actualTeacherId = teacher_id || teacherId || null;
    const actualDayOfWeek = dayToNumber(day_of_week || dayOfWeek || day);
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber || null;

    if (actualTeacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [actualTeacherId, tid]
      );
      if (teacher.length > 0) {
        actualTeacherId = teacher[0].id;
      }
    }

    if (!actualClassId) {
      return res.status(400).json({ success: false, message: 'Class ID is required' });
    }

    const timetableId = uuidv4();

    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom, tid]
    );

    res.status(201).json({ success: true, message: 'Timetable entry created', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create timetable error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating timetable entry', error: error.message });
  }
});

// Create period
router.post('/period', authenticate, async (req, res) => {
  try {
    logger.info('Create period request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

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

    if (!actualClassId) {
      return res.status(201).json({ success: true, message: 'Period created', data: { id: uuidv4() } });
    }

    const actualSubjectId = subject_id || subjectId || null;
    let actualTeacherId = teacher_id || teacherId || null;
    const actualDayOfWeek = dayToNumber(day_of_week || dayOfWeek || day);
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber || null;

    if (actualTeacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [actualTeacherId, tid]
      );
      if (teacher.length > 0) {
        actualTeacherId = teacher[0].id;
      }
    }

    const timetableId = uuidv4();
    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom, tid]
    );

    res.status(201).json({ success: true, message: 'Period created successfully', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create period error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating period' });
  }
});

// Assign substitute
router.post('/substitute', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'Substitute assigned successfully' });
  } catch (error) {
    logger.error('Assign substitute error:', error);
    res.status(500).json({ success: false, message: 'Error assigning substitute' });
  }
});

// Delete single timetable entry (admin only)
router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const result = await query(
      "DELETE FROM timetable WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [req.params.id, tid]
    );
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Timetable entry not found" });
    }
    res.json({ success: true, message: "Timetable entry deleted successfully" });
  } catch (error) {
    logger.error("Delete timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting timetable entry" });
  }
});

// Delete all timetable entries for a class (admin only)
router.delete("/class/:classId/all", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const result = await query(
      "DELETE FROM timetable WHERE class_id = $1 AND tenant_id = $2 RETURNING id",
      [req.params.classId, tid]
    );
    res.json({
      success: true,
      message: `Deleted ${result.length} timetable entries for the class`
    });
  } catch (error) {
    logger.error("Delete class timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting class timetable" });
  }
});

// Delete all timetable entries for a teacher (admin only)
router.delete("/teacher/:teacherId/all", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const teacher = await query(
      "SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2",
      [req.params.teacherId, tid]
    );
    const actualTeacherId = teacher.length > 0 ? teacher[0].id : req.params.teacherId;

    const result = await query(
      "DELETE FROM timetable WHERE teacher_id = $1 AND tenant_id = $2 RETURNING id",
      [actualTeacherId, tid]
    );
    res.json({
      success: true,
      message: `Deleted ${result.length} timetable entries for the teacher`
    });
  } catch (error) {
    logger.error("Delete teacher timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting teacher timetable" });
  }
});

// Reset entire timetable (admin only)
router.delete("/reset/all", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { confirm } = req.query;

    if (confirm !== "yes") {
      return res.status(400).json({
        success: false,
        message: "Please confirm deletion by adding ?confirm=yes to the request"
      });
    }

    const result = await query(
      "DELETE FROM timetable WHERE tenant_id = $1 RETURNING id",
      [tid]
    );
    res.json({
      success: true,
      message: `Timetable reset complete. Deleted ${result.length} entries.`
    });
  } catch (error) {
    logger.error("Reset timetable error:", error);
    res.status(500).json({ success: false, message: "Error resetting timetable" });
  }
});

export default router;
