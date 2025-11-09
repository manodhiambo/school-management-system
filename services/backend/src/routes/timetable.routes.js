const express = require('express');
const router = express.Router();
const TimetableController = require('../controllers/timetable.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

// All routes are protected and require authentication
router.use(authMiddleware);

// Period management (Admin only)
router.post('/periods', 
  roleMiddleware.requireRole(['admin']), 
  TimetableController.createPeriod
);
router.get('/periods', 
  roleMiddleware.requireRole(['admin', 'teacher', 'student', 'parent']), 
  TimetableController.getPeriods
);

// Timetable entries (Admin and Teachers)
router.post('/entries', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.createTimetableEntry
);

// Timetable views (All authenticated users)
router.get('/class/:classId', 
  roleMiddleware.requireRole(['admin', 'teacher', 'student', 'parent']), 
  TimetableController.getClassTimetable
);
router.get('/teacher/:teacherId', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.getTeacherTimetable
);
router.get('/room/:roomId', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.getRoomTimetable
);

// Timetable generation (Admin only)
router.post('/generate', 
  roleMiddleware.requireRole(['admin']), 
  TimetableController.generateTimetable
);

// Exam scheduling (Admin and Teachers)
router.post('/exam', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.scheduleExam
);

// Substitutions (Admin and Teachers)
router.post('/substitute', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.createSubstitution
);

// Conflict detection (Admin and Teachers)
router.get('/conflicts', 
  roleMiddleware.requireRole(['admin', 'teacher']), 
  TimetableController.getConflicts
);

module.exports = router;
