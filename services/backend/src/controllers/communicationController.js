import communicationService from '../services/communicationService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class CommunicationController {
  // ==================== MESSAGES ====================
  sendMessage = asyncHandler(async (req, res) => {
    const messageData = {
      ...req.body,
      senderId: req.user.id
    };
    const message = await communicationService.sendMessage(messageData);
    res.status(201).json(new ApiResponse(201, message, 'Message sent successfully'));
  });

  getMessages = asyncHandler(async (req, res) => {
    const filters = {
      type: req.query.type,
      isRead: req.query.isRead === 'true',
      limit: parseInt(req.query.limit) || 50
    };
    const messages = await communicationService.getMessages(req.user.id, filters);
    res.status(200).json(new ApiResponse(200, messages, 'Messages retrieved successfully'));
  });

  getSentMessages = asyncHandler(async (req, res) => {
    const filters = {
      limit: parseInt(req.query.limit) || 50
    };
    const messages = await communicationService.getSentMessages(req.user.id, filters);
    res.status(200).json(new ApiResponse(200, messages, 'Sent messages retrieved successfully'));
  });

  getMessage = asyncHandler(async (req, res) => {
    const message = await communicationService.getMessageById(req.params.id);
    res.status(200).json(new ApiResponse(200, message, 'Message retrieved successfully'));
  });

  markMessageAsRead = asyncHandler(async (req, res) => {
    const result = await communicationService.markMessageAsRead(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Message marked as read'));
  });

  deleteMessage = asyncHandler(async (req, res) => {
    const result = await communicationService.deleteMessage(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Message deleted successfully'));
  });

  // ==================== NOTIFICATIONS ====================
  getNotifications = asyncHandler(async (req, res) => {
    const filters = {
      isRead: req.query.isRead === 'true',
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50
    };
    const notifications = await communicationService.getNotifications(req.user.id, filters);
    res.status(200).json(new ApiResponse(200, notifications, 'Notifications retrieved successfully'));
  });

  markNotificationAsRead = asyncHandler(async (req, res) => {
    const result = await communicationService.markNotificationAsRead(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Notification marked as read'));
  });

  markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const result = await communicationService.markAllNotificationsAsRead(req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'All notifications marked as read'));
  });

  deleteNotification = asyncHandler(async (req, res) => {
    const result = await communicationService.deleteNotification(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Notification deleted successfully'));
  });

  // ==================== ANNOUNCEMENTS ====================
  createAnnouncement = asyncHandler(async (req, res) => {
    const announcementData = {
      ...req.body,
      createdBy: req.user.id
    };
    const announcement = await communicationService.createAnnouncement(announcementData);
    res.status(201).json(new ApiResponse(201, announcement, 'Announcement created successfully'));
  });

  getAnnouncements = asyncHandler(async (req, res) => {
    const filters = {
      targetRole: req.query.targetRole,
      targetClassId: req.query.targetClassId,
      isPublished: req.query.isPublished === 'true',
      limit: parseInt(req.query.limit) || 50
    };
    const announcements = await communicationService.getAnnouncements(filters);
    res.status(200).json(new ApiResponse(200, announcements, 'Announcements retrieved successfully'));
  });

  getAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await communicationService.getAnnouncementById(req.params.id);
    res.status(200).json(new ApiResponse(200, announcement, 'Announcement retrieved successfully'));
  });

  updateAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await communicationService.updateAnnouncement(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, announcement, 'Announcement updated successfully'));
  });

  deleteAnnouncement = asyncHandler(async (req, res) => {
    const result = await communicationService.deleteAnnouncement(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Announcement deleted successfully'));
  });

  // ==================== PTM ====================
  schedulePTM = asyncHandler(async (req, res) => {
    const ptmData = {
      ...req.body,
      scheduledBy: req.user.id
    };
    const ptm = await communicationService.schedulePTM(ptmData);
    res.status(201).json(new ApiResponse(201, ptm, 'PTM scheduled successfully'));
  });

  getPTMs = asyncHandler(async (req, res) => {
    const filters = {
      parentId: req.query.parentId,
      teacherId: req.query.teacherId,
      studentId: req.query.studentId,
      status: req.query.status,
      date: req.query.date
    };
    const ptms = await communicationService.getPTMs(filters);
    res.status(200).json(new ApiResponse(200, ptms, 'PTMs retrieved successfully'));
  });

  getPTM = asyncHandler(async (req, res) => {
    const ptm = await communicationService.getPTMById(req.params.id);
    res.status(200).json(new ApiResponse(200, ptm, 'PTM retrieved successfully'));
  });

  updatePTMStatus = asyncHandler(async (req, res) => {
    const { status, meetingNotes } = req.body;
    const ptm = await communicationService.updatePTMStatus(req.params.id, status, meetingNotes);
    res.status(200).json(new ApiResponse(200, ptm, 'PTM status updated successfully'));
  });

  deletePTM = asyncHandler(async (req, res) => {
    const result = await communicationService.deletePTM(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'PTM deleted successfully'));
  });
}

export default new CommunicationController();
