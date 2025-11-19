import attendanceService from '../services/attendanceService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class AttendanceController {
  // ==================== ATTENDANCE SESSIONS ====================
  createAttendanceSession = asyncHandler(async (req, res) => {
    const session = await attendanceService.createAttendanceSession(req.body);
    res.status(201).json(
      new ApiResponse(201, session, 'Attendance session created successfully')
    );
  });

  getAttendanceSessions = asyncHandler(async (req, res) => {
    const sessions = await attendanceService.getAttendanceSessions();
    res.status(200).json(
      new ApiResponse(200, sessions, 'Attendance sessions retrieved successfully')
    );
  });

  // ==================== MARK ATTENDANCE ====================
  markAttendance = asyncHandler(async (req, res) => {
    const attendanceData = {
      ...req.body,
      markedBy: req.user.id,
      method: req.body.method || 'manual'
    };
    const attendance = await attendanceService.markAttendance(attendanceData);
    res.status(201).json(
      new ApiResponse(201, attendance, 'Attendance marked successfully')
    );
  });

  bulkMarkAttendance = asyncHandler(async (req, res) => {
    const { attendanceList } = req.body;
    const result = await attendanceService.bulkMarkAttendance(
      attendanceList,
      req.user.id,
      req.body.method || 'manual'
    );
    res.status(200).json(
      new ApiResponse(200, result, 'Bulk attendance marked successfully')
    );
  });

  markClassAttendance = asyncHandler(async (req, res) => {
    const { classId, date, sessionId, attendanceList } = req.body;
    const result = await attendanceService.markClassAttendance(
      classId,
      date,
      sessionId,
      attendanceList,
      req.user.id
    );
    res.status(200).json(
      new ApiResponse(200, result, 'Class attendance marked successfully')
    );
  });

  // ==================== RETRIEVE ATTENDANCE ====================
  getAttendance = asyncHandler(async (req, res) => {
    const filters = {
      studentId: req.query.studentId,
      classId: req.query.classId,
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      sessionId: req.query.sessionId
    };
    const attendance = await attendanceService.getAttendance(filters);
    res.status(200).json(
      new ApiResponse(200, attendance, 'Attendance retrieved successfully')
    );
  });

  getClassAttendanceByDate = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { date, sessionId } = req.query;
    
    const attendance = await attendanceService.getClassAttendanceByDate(
      classId,
      date,
      sessionId
    );
    res.status(200).json(
      new ApiResponse(200, attendance, 'Class attendance retrieved successfully')
    );
  });

  // ==================== ATTENDANCE STATISTICS ====================
  getAttendanceStatistics = asyncHandler(async (req, res) => {
    const filters = {
      studentId: req.query.studentId,
      classId: req.query.classId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      month: req.query.month
    };
    const stats = await attendanceService.getAttendanceStatistics(filters);
    res.status(200).json(
      new ApiResponse(200, stats, 'Attendance statistics retrieved successfully')
    );
  });

  getStudentAttendanceSummary = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { month } = req.query;
    
    const summary = await attendanceService.getStudentAttendanceSummary(studentId, month);
    res.status(200).json(
      new ApiResponse(200, summary, 'Student attendance summary retrieved successfully')
    );
  });

  updateAttendanceSummary = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { month } = req.body;
    
    const summary = await attendanceService.updateAttendanceSummary(studentId, month);
    res.status(200).json(
      new ApiResponse(200, summary, 'Attendance summary updated successfully')
    );
  });

  // ==================== DEFAULTERS & REPORTS ====================
  getDefaulters = asyncHandler(async (req, res) => {
    const { classId, threshold, startDate, endDate } = req.query;
    
    const defaulters = await attendanceService.getDefaulters(
      classId,
      parseFloat(threshold) || 75,
      startDate,
      endDate
    );
    res.status(200).json(
      new ApiResponse(200, defaulters, 'Attendance defaulters retrieved successfully')
    );
  });

  getAttendanceReport = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      reportType: req.query.reportType || 'daily'
    };
    const report = await attendanceService.getAttendanceReport(filters);
    res.status(200).json(
      new ApiResponse(200, report, 'Attendance report generated successfully')
    );
  });

  // ==================== NOTIFICATIONS ====================
  notifyParentsOfAbsence = asyncHandler(async (req, res) => {
    const { date } = req.body;
    const result = await attendanceService.notifyParentsOfAbsence(date);
    res.status(200).json(
      new ApiResponse(200, result, 'Absence notifications sent successfully')
    );
  });
}

export default new AttendanceController();
