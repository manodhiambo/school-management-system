import settingsService from '../services/settingsService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class SettingsController {
  // ==================== SCHOOL SETTINGS ====================
  getSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings();
    res.status(200).json(new ApiResponse(200, settings, 'Settings retrieved successfully'));
  });

  updateSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.updateSettings(req.body);
    res.status(200).json(new ApiResponse(200, settings, 'Settings updated successfully'));
  });

  // ==================== ACADEMIC YEARS ====================
  createAcademicYear = asyncHandler(async (req, res) => {
    const year = await settingsService.createAcademicYear(req.body);
    res.status(201).json(new ApiResponse(201, year, 'Academic year created successfully'));
  });

  getAcademicYears = asyncHandler(async (req, res) => {
    const years = await settingsService.getAcademicYears();
    res.status(200).json(new ApiResponse(200, years, 'Academic years retrieved successfully'));
  });

  getCurrentAcademicYear = asyncHandler(async (req, res) => {
    const year = await settingsService.getCurrentAcademicYear();
    res.status(200).json(new ApiResponse(200, year, 'Current academic year retrieved successfully'));
  });

  setCurrentAcademicYear = asyncHandler(async (req, res) => {
    const { yearId } = req.body;
    const year = await settingsService.setCurrentAcademicYear(yearId);
    res.status(200).json(new ApiResponse(200, year, 'Current academic year set successfully'));
  });

  // ==================== AUDIT LOGS ====================
  getAuditLogs = asyncHandler(async (req, res) => {
    const filters = {
      userId: req.query.userId,
      resource: req.query.resource,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };
    const logs = await settingsService.getAuditLogs(filters);
    res.status(200).json(new ApiResponse(200, logs, 'Audit logs retrieved successfully'));
  });

  // ==================== SYSTEM LOGS ====================
  getSystemLogs = asyncHandler(async (req, res) => {
    const filters = {
      level: req.query.level,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };
    const logs = await settingsService.getSystemLogs(filters);
    res.status(200).json(new ApiResponse(200, logs, 'System logs retrieved successfully'));
  });

  // ==================== DASHBOARD ====================
  getDashboardStatistics = asyncHandler(async (req, res) => {
    const stats = await settingsService.getDashboardStatistics();
    res.status(200).json(new ApiResponse(200, stats, 'Dashboard statistics retrieved successfully'));
  });

  // ==================== BACKUP ====================
  createBackup = asyncHandler(async (req, res) => {
    const backup = await settingsService.createBackup();
    res.status(200).json(new ApiResponse(200, backup, 'Backup created successfully'));
  });
}

export default new SettingsController();
