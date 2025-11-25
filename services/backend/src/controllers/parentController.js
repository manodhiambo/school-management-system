import parentService from '../services/parentService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class ParentController {
  createParent = asyncHandler(async (req, res) => {
    const parentData = req.body;
    const parent = await parentService.createParent(parentData);

    res.status(201).json(
      new ApiResponse(201, parent, 'Parent created successfully')
    );
  });

  getParents = asyncHandler(async (req, res) => {
    const filters = {
      search: req.query.search,
      relationship: req.query.relationship,
      city: req.query.city,
      hasChildren: req.query.hasChildren === 'true'
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await parentService.getParents(filters, pagination);

    res.status(200).json(
      new ApiResponse(200, result.parents, 'Parents retrieved successfully', result.pagination)
    );
  });

  getParentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const parent = await parentService.getParentById(id);

    res.status(200).json(
      new ApiResponse(200, parent, 'Parent retrieved successfully')
    );
  });

  // NEW: Get parent by user_id
  getParentByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const parent = await parentService.getParentByUserId(userId);

    res.status(200).json(
      new ApiResponse(200, parent, 'Parent retrieved successfully')
    );
  });

  updateParent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const parent = await parentService.updateParent(id, updateData);

    res.status(200).json(
      new ApiResponse(200, parent, 'Parent updated successfully')
    );
  });

  linkStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, relationship, isPrimaryContact, canPickup } = req.body;

    const parent = await parentService.linkStudent(
      id,
      studentId,
      relationship,
      isPrimaryContact,
      canPickup
    );

    res.status(200).json(
      new ApiResponse(200, parent, 'Student linked successfully')
    );
  });

  unlinkStudent = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const result = await parentService.unlinkStudent(id, studentId);

    res.status(200).json(
      new ApiResponse(200, result, 'Student unlinked successfully')
    );
  });

  updateStudentLink = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const updateData = req.body;

    const parent = await parentService.updateStudentLink(id, studentId, updateData);

    res.status(200).json(
      new ApiResponse(200, parent, 'Student link updated successfully')
    );
  });

  getChildren = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const children = await parentService.getChildren(id);

    res.status(200).json(
      new ApiResponse(200, children, 'Children retrieved successfully')
    );
  });

  getChildAttendance = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      month: req.query.month
    };

    const result = await parentService.getChildAttendance(id, studentId, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Child attendance retrieved successfully')
    );
  });

  getChildAcademicReport = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const filters = {
      session: req.query.session,
      examId: req.query.examId
    };

    const results = await parentService.getChildAcademicReport(id, studentId, filters);

    res.status(200).json(
      new ApiResponse(200, results, 'Child academic report retrieved successfully')
    );
  });

  getChildFees = asyncHandler(async (req, res) => {
    const { id, studentId } = req.params;
    const result = await parentService.getChildFees(id, studentId);

    res.status(200).json(
      new ApiResponse(200, result, 'Child fees retrieved successfully')
    );
  });

  getPaymentHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payments = await parentService.getPaymentHistory(id);

    res.status(200).json(
      new ApiResponse(200, payments, 'Payment history retrieved successfully')
    );
  });

  getNotifications = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      isRead: req.query.isRead === 'true',
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50
    };

    const notifications = await parentService.getNotifications(id, filters);

    res.status(200).json(
      new ApiResponse(200, notifications, 'Notifications retrieved successfully')
    );
  });

  markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id, notificationId } = req.params;
    const result = await parentService.markNotificationAsRead(id, notificationId);

    res.status(200).json(
      new ApiResponse(200, result, 'Notification marked as read')
    );
  });

  getMessages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      limit: parseInt(req.query.limit) || 50
    };

    const messages = await parentService.getMessages(id, filters);

    res.status(200).json(
      new ApiResponse(200, messages, 'Messages retrieved successfully')
    );
  });

  getDashboard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dashboard = await parentService.getParentDashboard(id);

    res.status(200).json(
      new ApiResponse(200, dashboard, 'Dashboard data retrieved successfully')
    );
  });

  getStatistics = asyncHandler(async (req, res) => {
    const stats = await parentService.getParentStatistics();

    res.status(200).json(
      new ApiResponse(200, stats, 'Parent statistics retrieved successfully')
    );
  });

  deleteParent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await parentService.deleteParent(id);

    res.status(200).json(
      new ApiResponse(200, result, 'Parent deleted successfully')
    );
  });
}

export default new ParentController();
