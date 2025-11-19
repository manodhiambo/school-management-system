import express from 'express';
import communicationController from '../controllers/communicationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

router.use(authenticate);

// Validation schemas
const sendMessageSchema = Joi.object({
  body: Joi.object({
    recipientId: schemas.id.optional(),
    recipientRole: Joi.string().valid('admin', 'teacher', 'student', 'parent', 'all').optional(),
    recipientClassId: schemas.id.optional(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
    messageType: Joi.string().valid('direct', 'broadcast', 'announcement').default('direct'),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    attachments: Joi.array().optional(),
    parentMessageId: schemas.id.optional()
  })
});

const createAnnouncementSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required(),
    targetRole: Joi.string().valid('all', 'admin', 'teacher', 'student', 'parent').default('all'),
    targetClassId: schemas.id.optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    publishDate: schemas.date,
    expiryDate: schemas.date.optional(),
    attachments: Joi.array().optional()
  })
});

const updateAnnouncementSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    title: Joi.string().optional(),
    content: Joi.string().optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    publishDate: schemas.date.optional(),
    expiryDate: schemas.date.optional(),
    isPublished: Joi.boolean().optional()
  })
});

const schedulePTMSchema = Joi.object({
  body: Joi.object({
    parentId: schemas.id,
    teacherId: schemas.id,
    studentId: schemas.id,
    meetingDate: schemas.date,
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
    location: Joi.string().optional(),
    purpose: Joi.string().required()
  })
});

const updatePTMStatusSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled').required(),
    meetingNotes: Joi.string().optional()
  })
});

// Message routes
router.post('/messages', validateRequest(sendMessageSchema), communicationController.sendMessage);
router.get('/messages', communicationController.getMessages);
router.get('/messages/sent', communicationController.getSentMessages);
router.get('/messages/:id', communicationController.getMessage);
router.patch('/messages/:id/read', communicationController.markMessageAsRead);
router.delete('/messages/:id', communicationController.deleteMessage);

// Notification routes
router.get('/notifications', communicationController.getNotifications);
router.patch('/notifications/:id/read', communicationController.markNotificationAsRead);
router.patch('/notifications/read-all', communicationController.markAllNotificationsAsRead);
router.delete('/notifications/:id', communicationController.deleteNotification);

// Announcement routes
router.post('/announcements', requireRole(['admin', 'teacher']), validateRequest(createAnnouncementSchema), communicationController.createAnnouncement);
router.get('/announcements', communicationController.getAnnouncements);
router.get('/announcements/:id', communicationController.getAnnouncement);
router.put('/announcements/:id', requireRole(['admin', 'teacher']), validateRequest(updateAnnouncementSchema), communicationController.updateAnnouncement);
router.delete('/announcements/:id', requireRole(['admin']), communicationController.deleteAnnouncement);

// PTM routes
router.post('/ptm', requireRole(['admin', 'teacher', 'parent']), validateRequest(schedulePTMSchema), communicationController.schedulePTM);
router.get('/ptm', communicationController.getPTMs);
router.get('/ptm/:id', communicationController.getPTM);
router.patch('/ptm/:id/status', requireRole(['admin', 'teacher']), validateRequest(updatePTMStatusSchema), communicationController.updatePTMStatus);
router.delete('/ptm/:id', requireRole(['admin']), communicationController.deletePTM);

export default router;
