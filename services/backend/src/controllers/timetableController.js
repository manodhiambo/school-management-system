import timetableService from '../services/timetableService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class TimetableController {
  // ==================== PERIODS ====================
  createPeriod = asyncHandler(async (req, res) => {
    const period = await timetableService.createPeriod(req.body);
    res.status(201).json(new ApiResponse(201, period, 'Period created successfully'));
  });

  getPeriods = asyncHandler(async (req, res) => {
    const periods = await timetableService.getPeriods();
    res.status(200).json(new ApiResponse(200, periods, 'Periods retrieved successfully'));
  });

  updatePeriod = asyncHandler(async (req, res) => {
    const period = await timetableService.updatePeriod(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, period, 'Period updated successfully'));
  });

  // ==================== ROOMS ====================
  createRoom = asyncHandler(async (req, res) => {
    const room = await timetableService.createRoom(req.body);
    res.status(201).json(new ApiResponse(201, room, 'Room created successfully'));
  });

  getRooms = asyncHandler(async (req, res) => {
    const filters = {
      roomType: req.query.roomType,
      isActive: req.query.isActive === 'true'
    };
    const rooms = await timetableService.getRooms(filters);
    res.status(200).json(new ApiResponse(200, rooms, 'Rooms retrieved successfully'));
  });

  // ==================== TIMETABLE ====================
  createTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await timetableService.createTimetableEntry(req.body);
    res.status(201).json(new ApiResponse(201, entry, 'Timetable entry created successfully'));
  });

  getTimetable = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      teacherId: req.query.teacherId,
      roomId: req.query.roomId,
      dayOfWeek: req.query.dayOfWeek,
      academicYear: req.query.academicYear
    };
    const timetable = await timetableService.getTimetable(filters);
    res.status(200).json(new ApiResponse(200, timetable, 'Timetable retrieved successfully'));
  });

  getTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await timetableService.getTimetableEntryById(req.params.id);
    res.status(200).json(new ApiResponse(200, entry, 'Timetable entry retrieved successfully'));
  });

  updateTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await timetableService.updateTimetableEntry(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, entry, 'Timetable entry updated successfully'));
  });

  deleteTimetableEntry = asyncHandler(async (req, res) => {
    const result = await timetableService.deleteTimetableEntry(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Timetable entry deleted successfully'));
  });

  // ==================== SUBSTITUTIONS ====================
  createSubstitution = asyncHandler(async (req, res) => {
    const substitution = await timetableService.createSubstitution({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(new ApiResponse(201, substitution, 'Substitution created successfully'));
  });

  getSubstitutions = asyncHandler(async (req, res) => {
    const filters = {
      teacherId: req.query.teacherId,
      date: req.query.date,
      status: req.query.status
    };
    const substitutions = await timetableService.getSubstitutions(filters);
    res.status(200).json(new ApiResponse(200, substitutions, 'Substitutions retrieved successfully'));
  });

  getSubstitution = asyncHandler(async (req, res) => {
    const substitution = await timetableService.getSubstitutionById(req.params.id);
    res.status(200).json(new ApiResponse(200, substitution, 'Substitution retrieved successfully'));
  });

  updateSubstitutionStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const substitution = await timetableService.updateSubstitutionStatus(req.params.id, status);
    res.status(200).json(new ApiResponse(200, substitution, 'Substitution status updated successfully'));
  });

  // ==================== AUTO-GENERATE ====================
  autoGenerateTimetable = asyncHandler(async (req, res) => {
    const { classId, academicYear } = req.body;
    const timetable = await timetableService.autoGenerateTimetable(classId, academicYear);
    res.status(201).json(new ApiResponse(201, timetable, 'Timetable auto-generated successfully'));
  });
}

export default new TimetableController();
