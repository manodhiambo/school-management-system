import studentService from '../services/studentService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

class StudentController {
  createStudent = asyncHandler(async (req, res) => {
    const studentData = req.body;
    const student = await studentService.createStudent(studentData);

    res.status(201).json(
      new ApiResponse(201, student, 'Student created successfully')
    );
  });

  getStudents = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      status: req.query.status,
      search: req.query.search,
      parentId: req.query.parentId,
      gender: req.query.gender,
      session: req.query.session
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await studentService.getStudents(filters, pagination);

    res.status(200).json(
      new ApiResponse(200, result.students, 'Students retrieved successfully', result.pagination)
    );
  });

  getStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    res.status(200).json(
      new ApiResponse(200, student, 'Student retrieved successfully')
    );
  });

  updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const student = await studentService.updateStudent(id, updateData);

    res.status(200).json(
      new ApiResponse(200, student, 'Student updated successfully')
    );
  });

  updateStudentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const student = await studentService.updateStudentStatus(id, status);

    res.status(200).json(
      new ApiResponse(200, student, 'Student status updated successfully')
    );
  });

  deleteStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await studentService.deleteStudent(id);

    res.status(200).json(
      new ApiResponse(200, result, 'Student deleted successfully')
    );
  });

  getStudentAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      month: req.query.month
    };

    const result = await studentService.getStudentAttendance(id, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Student attendance retrieved successfully')
    );
  });

  getStudentAcademicReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filters = {
      session: req.query.session,
      examId: req.query.examId
    };

    const result = await studentService.getStudentAcademicReport(id, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Student academic report retrieved successfully')
    );
  });

  getStudentFinance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await studentService.getStudentFinance(id);

    res.status(200).json(
      new ApiResponse(200, result, 'Student finance details retrieved successfully')
    );
  });

  promoteStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { toClassId, session, result, percentage, remarks } = req.body;

    const student = await studentService.promoteStudent(
      id,
      toClassId,
      session,
      result,
      percentage,
      remarks,
      req.user.id
    );

    res.status(200).json(
      new ApiResponse(200, student, 'Student promoted successfully')
    );
  });

  getStudentTimetable = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const timetable = await studentService.getStudentTimetable(id);

    res.status(200).json(
      new ApiResponse(200, timetable, 'Student timetable retrieved successfully')
    );
  });

  getStudentDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const documents = await studentService.getStudentDocuments(id);

    res.status(200).json(
      new ApiResponse(200, documents, 'Student documents retrieved successfully')
    );
  });

  addStudentDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const documentData = {
      ...req.body,
      uploadedBy: req.user.id
    };

    const document = await studentService.addStudentDocument(id, documentData);

    res.status(201).json(
      new ApiResponse(201, document[0], 'Document added successfully')
    );
  });

  deleteStudentDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const result = await studentService.deleteStudentDocument(id, documentId);

    res.status(200).json(
      new ApiResponse(200, result, 'Document deleted successfully')
    );
  });

  bulkImportStudents = asyncHandler(async (req, res) => {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      throw new ApiError(400, 'Students array is required');
    }

    const result = await studentService.bulkImportStudents(students, req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Bulk import completed')
    );
  });

  getStudentStatistics = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      session: req.query.session
    };

    const stats = await studentService.getStudentStatistics(filters);

    res.status(200).json(
      new ApiResponse(200, stats, 'Student statistics retrieved successfully')
    );
  });
}

export default new StudentController();
