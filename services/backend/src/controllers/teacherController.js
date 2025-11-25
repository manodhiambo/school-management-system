import teacherService from '../services/teacherService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

class TeacherController {
  createTeacher = asyncHandler(async (req, res) => {
    const teacherData = req.body;
    const teacher = await teacherService.createTeacher(teacherData);

    res.status(201).json(
      new ApiResponse(201, teacher, 'Teacher created successfully')
    );
  });

  getTeachers = asyncHandler(async (req, res) => {
    const filters = {
      departmentId: req.query.departmentId,
      status: req.query.status,
      search: req.query.search,
      designation: req.query.designation,
      isClassTeacher: req.query.isClassTeacher === 'true'
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await teacherService.getTeachers(filters, pagination);

    res.status(200).json(
      new ApiResponse(200, result.teachers, 'Teachers retrieved successfully', result.pagination)
    );
  });

  getTeacherById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const teacher = await teacherService.getTeacherById(id);

    res.status(200).json(
      new ApiResponse(200, teacher, 'Teacher retrieved successfully')
    );
  });

  updateTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const teacher = await teacherService.updateTeacher(id, updateData);

    res.status(200).json(
      new ApiResponse(200, teacher, 'Teacher updated successfully')
    );
  });

  assignClass = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { classId } = req.body;
    const teacher = await teacherService.assignClassToTeacher(id, classId);

    res.status(200).json(
      new ApiResponse(200, teacher, 'Class assigned successfully')
    );
  });

  assignSubject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { classId, subjectId, weeklyHours } = req.body;
    const teacher = await teacherService.assignSubjectToTeacher(id, classId, subjectId, weeklyHours);

    res.status(200).json(
      new ApiResponse(200, teacher, 'Subject assigned successfully')
    );
  });

  getTeacherSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schedule = await teacherService.getTeacherSchedule(id);

    res.status(200).json(
      new ApiResponse(200, schedule, 'Teacher schedule retrieved successfully')
    );
  });

  markAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, status, checkInTime, checkOutTime, location, remarks } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const attendance = await teacherService.markAttendance(
      id,
      date,
      status,
      checkInTime,
      checkOutTime,
      location,
      ipAddress,
      req.user.id,
      remarks
    );

    res.status(200).json(
      new ApiResponse(200, attendance, 'Attendance marked successfully')
    );
  });

  getTeacherAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      month: req.query.month,
      status: req.query.status
    };

    const result = await teacherService.getTeacherAttendance(id, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Teacher attendance retrieved successfully')
    );
  });

  applyLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const leaveData = req.body;
    const leave = await teacherService.applyLeave(id, leaveData);

    res.status(201).json(
      new ApiResponse(201, leave, 'Leave application submitted successfully')
    );
  });

  getTeacherLeaves = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      status: req.query.status,
      leaveType: req.query.leaveType,
      year: req.query.year
    };

    const result = await teacherService.getTeacherLeaves(id, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Teacher leaves retrieved successfully')
    );
  });

  approveLeave = asyncHandler(async (req, res) => {
    const { leaveId } = req.params;
    const { status, rejectionReason } = req.body;

    const leave = await teacherService.approveLeave(leaveId, req.user.id, status, rejectionReason);

    res.status(200).json(
      new ApiResponse(200, leave, `Leave ${status} successfully`)
    );
  });

  getTeacherSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      month: req.query.month,
      year: req.query.year
    };

    const salary = await teacherService.getTeacherSalary(id, filters);

    res.status(200).json(
      new ApiResponse(200, salary, 'Teacher salary details retrieved successfully')
    );
  });

  getAvailableTeachers = asyncHandler(async (req, res) => {
    const { date, periodId } = req.query;

    if (!date || !periodId) {
      throw new ApiError(400, 'Date and periodId are required');
    }

    const teachers = await teacherService.getAvailableTeachers(date, periodId);

    res.status(200).json(
      new ApiResponse(200, teachers, 'Available teachers retrieved successfully')
    );
  });

  getTeacherStatistics = asyncHandler(async (req, res) => {
    const filters = {
      departmentId: req.query.departmentId
    };

    const stats = await teacherService.getTeacherStatistics(filters);

    res.status(200).json(
      new ApiResponse(200, stats, 'Teacher statistics retrieved successfully')
    );
  });

  deleteTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await teacherService.deleteTeacher(id);

    res.status(200).json(
      new ApiResponse(200, result, 'Teacher deleted successfully')
    );
  });


  getTeacherClasses = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const classes = await teacherService.getTeacherClasses(id);
    
    res.status(200).json(
      new ApiResponse(200, classes, 'Teacher classes retrieved successfully')
    );
  });


  getTeacherTimetable = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const timetable = await teacherService.getTeacherTimetable(id);
    
    res.status(200).json(
      new ApiResponse(200, timetable, 'Teacher timetable retrieved successfully')
    );
  });
}

export default new TeacherController();
