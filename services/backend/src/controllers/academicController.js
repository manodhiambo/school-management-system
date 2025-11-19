import academicService from '../services/academicService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class AcademicController {
  // ==================== SUBJECTS ====================
  createSubject = asyncHandler(async (req, res) => {
    const subject = await academicService.createSubject(req.body);
    res.status(201).json(new ApiResponse(201, subject, 'Subject created successfully'));
  });

  getSubjects = asyncHandler(async (req, res) => {
    const filters = {
      category: req.query.category,
      isActive: req.query.isActive === 'true',
      search: req.query.search
    };
    const subjects = await academicService.getSubjects(filters);
    res.status(200).json(new ApiResponse(200, subjects, 'Subjects retrieved successfully'));
  });

  getSubjectById = asyncHandler(async (req, res) => {
    const subject = await academicService.getSubjectById(req.params.id);
    res.status(200).json(new ApiResponse(200, subject, 'Subject retrieved successfully'));
  });

  updateSubject = asyncHandler(async (req, res) => {
    const subject = await academicService.updateSubject(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, subject, 'Subject updated successfully'));
  });

  deleteSubject = asyncHandler(async (req, res) => {
    const result = await academicService.deleteSubject(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Subject deleted successfully'));
  });

  // ==================== CLASSES ====================
  createClass = asyncHandler(async (req, res) => {
    const classData = await academicService.createClass(req.body);
    res.status(201).json(new ApiResponse(201, classData, 'Class created successfully'));
  });

  getClasses = asyncHandler(async (req, res) => {
    const filters = {
      academicYear: req.query.academicYear,
      isActive: req.query.isActive === 'true',
      classTeacherId: req.query.classTeacherId
    };
    const classes = await academicService.getClasses(filters);
    res.status(200).json(new ApiResponse(200, classes, 'Classes retrieved successfully'));
  });

  getClassById = asyncHandler(async (req, res) => {
    const classData = await academicService.getClassById(req.params.id);
    res.status(200).json(new ApiResponse(200, classData, 'Class retrieved successfully'));
  });

  updateClass = asyncHandler(async (req, res) => {
    const classData = await academicService.updateClass(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, classData, 'Class updated successfully'));
  });

  assignSubjectToClass = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks } = req.body;
    
    const classData = await academicService.assignSubjectToClass(
      id, subjectId, teacherId, isOptional, weeklyHours, passingMarks, maxMarks
    );
    
    res.status(200).json(new ApiResponse(200, classData, 'Subject assigned to class successfully'));
  });

  removeSubjectFromClass = asyncHandler(async (req, res) => {
    const { id, subjectId } = req.params;
    const result = await academicService.removeSubjectFromClass(id, subjectId);
    res.status(200).json(new ApiResponse(200, result, 'Subject removed from class successfully'));
  });

  // ==================== EXAMS ====================
  createExam = asyncHandler(async (req, res) => {
    const examData = {
      ...req.body,
      createdBy: req.user.id
    };
    const exam = await academicService.createExam(examData);
    res.status(201).json(new ApiResponse(201, exam, 'Exam created successfully'));
  });

  getExams = asyncHandler(async (req, res) => {
    const filters = {
      session: req.query.session,
      type: req.query.type,
      classId: req.query.classId,
      isResultsPublished: req.query.isResultsPublished === 'true'
    };
    const exams = await academicService.getExams(filters);
    res.status(200).json(new ApiResponse(200, exams, 'Exams retrieved successfully'));
  });

  getExamById = asyncHandler(async (req, res) => {
    const exam = await academicService.getExamById(req.params.id);
    res.status(200).json(new ApiResponse(200, exam, 'Exam retrieved successfully'));
  });

  updateExam = asyncHandler(async (req, res) => {
    const exam = await academicService.updateExam(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, exam, 'Exam updated successfully'));
  });

  deleteExam = asyncHandler(async (req, res) => {
    const result = await academicService.deleteExam(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Exam deleted successfully'));
  });

  // ==================== EXAM RESULTS ====================
  enterResult = asyncHandler(async (req, res) => {
    const resultData = {
      ...req.body,
      teacherId: req.user.id
    };
    const result = await academicService.enterResult(resultData);
    res.status(201).json(new ApiResponse(201, result, 'Result entered successfully'));
  });

  bulkEnterResults = asyncHandler(async (req, res) => {
    const { examId, results } = req.body;
    const result = await academicService.bulkEnterResults(examId, results, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Bulk results entered'));
  });

  getExamResults = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const filters = {
      studentId: req.query.studentId,
      subjectId: req.query.subjectId
    };
    const results = await academicService.getExamResults(examId, filters);
    res.status(200).json(new ApiResponse(200, results, 'Exam results retrieved successfully'));
  });

  publishResults = asyncHandler(async (req, res) => {
    const result = await academicService.publishResults(req.params.examId);
    res.status(200).json(new ApiResponse(200, result, 'Results published successfully'));
  });

  unpublishResults = asyncHandler(async (req, res) => {
    const result = await academicService.unpublishResults(req.params.examId);
    res.status(200).json(new ApiResponse(200, result, 'Results unpublished successfully'));
  });

  // ==================== GRADEBOOK ====================
  createGradebookEntry = asyncHandler(async (req, res) => {
    const entryData = {
      ...req.body,
      teacherId: req.user.id
    };
    const entry = await academicService.createGradebookEntry(entryData);
    res.status(201).json(new ApiResponse(201, entry, 'Gradebook entry created successfully'));
  });

  getGradebookEntries = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      studentId: req.query.studentId,
      subjectId: req.query.subjectId,
      assessmentType: req.query.assessmentType,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const entries = await academicService.getGradebookEntries(filters);
    res.status(200).json(new ApiResponse(200, entries, 'Gradebook entries retrieved successfully'));
  });

  updateGradebookEntry = asyncHandler(async (req, res) => {
    const entry = await academicService.updateGradebookEntry(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, entry, 'Gradebook entry updated successfully'));
  });

  deleteGradebookEntry = asyncHandler(async (req, res) => {
    const result = await academicService.deleteGradebookEntry(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Gradebook entry deleted successfully'));
  });

  // ==================== REPORTS ====================
  generateStudentReportCard = asyncHandler(async (req, res) => {
    const { studentId, examId } = req.params;
    const reportCard = await academicService.generateStudentReportCard(studentId, examId);
    res.status(200).json(new ApiResponse(200, reportCard, 'Report card generated successfully'));
  });

  getClassPerformanceReport = asyncHandler(async (req, res) => {
    const { classId, examId } = req.params;
    const report = await academicService.getClassPerformanceReport(classId, examId);
    res.status(200).json(new ApiResponse(200, report, 'Class performance report generated successfully'));
  });

  getSubjectWisePerformance = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const { classId } = req.query;
    const report = await academicService.getSubjectWisePerformance(examId, classId);
    res.status(200).json(new ApiResponse(200, report, 'Subject-wise performance retrieved successfully'));
  });
}

export default new AcademicController();
