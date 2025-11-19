import express from 'express';
import timetableController from '../controllers/timetableController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

router.use(authenticate);

// Validation schemas
const createPeriodSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    periodNumber: Joi.number().required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
    isBreak: Joi.boolean().default(false)
  })
});

const createRoomSchema = Joi.object({
  body: Joi.object({
    roomNumber: Joi.string().required(),
    roomName: Joi.string().optional(),
    building: Joi.string().optional(),
    floor: Joi.number().optional(),
    capacity: Joi.number().min(1).default(40),
    roomType: Joi.string().valid('classroom', 'laboratory', 'library', 'auditorium', 'sports', 'other').default('classroom'),
    facilities: Joi.object().optional()
  })
});

const createTimetableEntrySchema = Joi.object({
  body: Joi.object({
    classId: schemas.id,
    subjectId: schemas.id,
    teacherId: schemas.id,
    periodId: schemas.id,
    roomId: schemas.id.optional(),
    dayOfWeek: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    academicYear: Joi.string().required()
  })
});

const createSubstitutionSchema = Joi.object({
  body: Joi.object({
    timetableId: schemas.id.optional(),
    originalTeacherId: schemas.id,
    substituteTeacherId: schemas.id,
    classId: schemas.id,
    subjectId: schemas.id,
    date: schemas.date,
    periodId: schemas.id,
    reason: Joi.string().required()
  })
});

const autoGenerateSchema = Joi.object({
  body: Joi.object({
    classId: schemas.id,
    academicYear: Joi.string().required()
  })
});

// Period routes
router.post('/periods', requireRole(['admin']), validateRequest(createPeriodSchema), timetableController.createPeriod);
router.get('/periods', requireRole(['admin', 'teacher']), timetableController.getPeriods);
router.put('/periods/:id', requireRole(['admin']), timetableController.updatePeriod);

// Room routes
router.post('/rooms', requireRole(['admin']), validateRequest(createRoomSchema), timetableController.createRoom);
router.get('/rooms', requireRole(['admin', 'teacher']), timetableController.getRooms);

// Timetable routes
router.post('/', requireRole(['admin']), validateRequest(createTimetableEntrySchema), timetableController.createTimetableEntry);
router.get('/', requireRole(['admin', 'teacher', 'student', 'parent']), timetableController.getTimetable);
router.get('/:id', requireRole(['admin', 'teacher']), timetableController.getTimetableEntry);
router.put('/:id', requireRole(['admin']), timetableController.updateTimetableEntry);
router.delete('/:id', requireRole(['admin']), timetableController.deleteTimetableEntry);

// Substitution routes
router.post('/substitutions', requireRole(['admin', 'teacher']), validateRequest(createSubstitutionSchema), timetableController.createSubstitution);
router.get('/substitutions', requireRole(['admin', 'teacher']), timetableController.getSubstitutions);
router.get('/substitutions/:id', requireRole(['admin', 'teacher']), timetableController.getSubstitution);
router.patch('/substitutions/:id/status', requireRole(['admin']), timetableController.updateSubstitutionStatus);

// Auto-generate
router.post('/auto-generate', requireRole(['admin']), validateRequest(autoGenerateSchema), timetableController.autoGenerateTimetable);

export default router;
