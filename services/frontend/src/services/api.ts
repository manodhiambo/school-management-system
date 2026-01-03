import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        throw error.response?.data || error;
      }
    );
  }

  // Auth
  login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  logout() {
    return this.api.post('/auth/logout');
  }

  getMe() {
    return this.api.get('/auth/me');
  }

  getCurrentUser() {
    return this.api.get('/auth/me');
  }

  // Dashboard
  getDashboardStats() {
    return this.api.get('/admin/dashboard');
  }

  // Students
  getStudents(params?: any) {
    return this.api.get('/students', { params });
  }

  getStudent(id: string) {
    return this.api.get('/students/' + id);
  }

  createStudent(data: any) {
    return this.api.post('/students', data);
  }

  updateStudent(id: string, data: any) {
    return this.api.put('/students/' + id, data);
  }

  deleteStudent(id: string) {
    return this.api.delete('/students/' + id);
  }

  getStudentAttendance(studentId: string, params?: any) {
    return this.api.get('/attendance/student/' + studentId, { params });
  }

  getStudentExamResults(studentId: string) {
    return this.api.get('/students/' + studentId + '/exam-results');
  }

  getStudentFeeAccount(studentId: string) {
    return this.api.get('/fee/student/' + studentId);
  }

  // Teachers
  getTeachers(params?: any) {
    return this.api.get('/teachers', { params });
  }

  getTeacher(id: string) {
    return this.api.get('/teachers/' + id);
  }

  createTeacher(data: any) {
    return this.api.post('/teachers', data);
  }

  updateTeacher(id: string, data: any) {
    return this.api.put('/teachers/' + id, data);
  }

  deleteTeacher(id: string) {
    return this.api.delete('/teachers/' + id);
  }

  getTeacherClasses(teacherId: string) {
    return this.api.get('/teachers/' + teacherId + '/classes');
  }

  // Parents
  getParents(params?: any) {
    return this.api.get('/parents', { params });
  }

  getParent(id: string) {
    return this.api.get('/parents/' + id);
  }

  getParentByUserId(userId: string) {
    return this.api.get('/parents/by-user/' + userId);
  }

  createParent(data: any) {
    return this.api.post('/parents', data);
  }

  updateParent(id: string, data: any) {
    return this.api.put('/parents/' + id, data);
  }

  deleteParent(id: string) {
    return this.api.delete('/parents/' + id);
  }

  linkStudentToParent(parentId: string, data: any) {
    return this.api.post('/parents/' + parentId + '/link-student', data);
  }

  unlinkStudentFromParent(parentId: string, studentId: string) {
    return this.api.delete('/parents/' + parentId + '/unlink-student/' + studentId);
  }

  getParentByUser(userId: string) {
    return this.api.get('/parents/by-user/' + userId);
  }

  // Classes
  getClasses(params?: any) {
    return this.api.get('/classes', { params });
  }

  getClass(id: string) {
    return this.api.get('/classes/' + id);
  }

  createClass(data: any) {
    return this.api.post('/classes', data);
  }

  updateClass(id: string, data: any) {
    return this.api.put('/classes/' + id, data);
  }

  deleteClass(id: string) {
    return this.api.delete('/classes/' + id);
  }

  getClassStudents(classId: string) {
    return this.api.get('/students', { params: { classId } });
  }

  // Subjects
  getSubjects(params?: any) {
    return this.api.get('/subjects', { params });
  }

  getSubject(id: string) {
    return this.api.get('/subjects/' + id);
  }

  createSubject(data: any) {
    return this.api.post('/subjects', data);
  }

  updateSubject(id: string, data: any) {
    return this.api.put('/subjects/' + id, data);
  }

  deleteSubject(id: string) {
    return this.api.delete('/subjects/' + id);
  }

  // Attendance
  getAttendance(params?: any) {
    return this.api.get('/attendance', { params });
  }

  markAttendance(data: any) {
    return this.api.post('/attendance', data);
  }

  markBulkAttendance(data: any) {
    return this.api.post('/attendance/bulk', data);
  }

  getAttendanceByClass(classId: string, date: string) {
    return this.api.get('/attendance/class/' + classId, { params: { date } });
  }

  getAttendanceStatistics(params?: any) {
    return this.api.get('/attendance/statistics', { params });
  }

  getStudentAttendanceStatistics(studentId: string) {
    return this.api.get('/attendance/statistics/' + studentId);
  }

  // Fee Management
  getFeeStructures(params?: any) {
    return this.api.get('/fee/structure', { params });
  }

  createFeeStructure(data: any) {
    return this.api.post('/fee/structure', data);
  }

  getFeeInvoices(params?: any) {
    return this.api.get('/fee/invoice', { params });
  }

  getFeeInvoice(id: string) {
    return this.api.get('/fee/invoice/' + id);
  }

  createFeeInvoice(data: any) {
    return this.api.post('/fee/invoice', data);
  }

  generateInvoices(data: any) {
    return this.api.post('/fee/invoice/bulk', data);
  }

  generateBulkInvoices(data: any) {
    return this.api.post("/fee/invoice/bulk", data);
  }

  recordFeePayment(data: any) {
    return this.api.post('/fee/payment', data);
  }

  getFeePayments(params?: any) {
    return this.api.get('/fee/payment', { params });
  }

  getFeeDefaulters(params?: any) {
    return this.api.get('/fee/defaulters', { params });
  }

  getFeeStatistics(params?: any) {
    return this.api.get('/fee/statistics', { params });
  }

  // M-Pesa Payments
  initiateMpesaPayment(invoiceId: string, phoneNumber: string, amount: number) {
    return this.api.post('/fee/mpesa/pay', { invoiceId, phoneNumber, amount });
  }

  getMpesaTransactionStatus(checkoutRequestId: string) {
    return this.api.get('/fee/mpesa/status/' + checkoutRequestId);
  }

  getMpesaTransaction(transactionId: string) {
    return this.api.get('/fee/mpesa/transaction/' + transactionId);
  }

  getStudentMpesaTransactions(studentId: string) {
    return this.api.get('/fee/mpesa/student/' + studentId);
  }

  // Exams
  getExams(params?: any) {
    return this.api.get('/exams', { params });
  }

  getExam(id: string) {
    return this.api.get('/exams/' + id);
  }

  createExam(data: any) {
    return this.api.post('/exams', data);
  }

  updateExam(id: string, data: any) {
    return this.api.put('/exams/' + id, data);
  }

  deleteExam(id: string) {
    return this.api.delete('/exams/' + id);
  }

  // Academic Results
  getResults(params?: any) {
    return this.api.get('/academic/results', { params });
  }

  submitResults(data: any) {
    return this.api.post('/academic/results', data);
  }

  // Timetable
  getTimetable(classIdOrParams?: string | any) {
    if (typeof classIdOrParams === 'string') {
      return this.api.get('/timetable', { params: { classId: classIdOrParams } });
    }
    return this.api.get('/timetable', { params: classIdOrParams });
  }

  createTimetableEntry(data: any) {
    return this.api.post('/timetable', data);
  }

  getTeacherTimetable(teacherId: string) {
    return this.api.get('/timetable/teacher/' + teacherId);
  }

  getStudentTimetable(studentId: string) {
    return this.api.get('/timetable/student/' + studentId);
  }

  createPeriod(data: any) {
    return this.api.post('/timetable/period', data);
  }

  assignSubstitute(data: any) {
    return this.api.post('/timetable/substitute', data);
  }

  // Communication
  getAnnouncements(params?: any) {
    return this.api.get('/communication/announcements', { params });
  }

  createAnnouncement(data: any) {
    return this.api.post('/communication/announcements', data);
  }

  getMessages(params?: any) {
    return this.api.get("/messages/inbox", { params });
  }

  sendMessage(data: any) {
    return this.api.post("/messages/send", data);
  }

  markMessageAsRead(id: string) {
    return this.api.patch("/messages/" + id + "/read");
  }

  // Notifications
  getNotifications() {
    return this.api.get('/notifications');
  }

  createNotification(data: any) {
    return this.api.post('/notifications', data);
  }

  markNotificationAsRead(id: string) {
    return this.api.put('/notifications/' + id + '/read');
  }

  markAllNotificationsAsRead() {
    return this.api.post('/notifications/mark-all-read');
  }

  // Users
  getUsers(params?: any) {
    return this.api.get('/users', { params });
  }

  getUser(id: string) {
    return this.api.get('/users/' + id);
  }

  createUser(data: any) {
    return this.api.post('/users', data);
  }

  updateUser(id: string, data: any) {
    return this.api.put('/users/' + id, data);
  }

  deleteUser(id: string) {
    return this.api.delete('/users/' + id);
  }

  // Settings
  getSettings() {
    return this.api.get('/settings');
  }

  updateSettings(data: any) {
    return this.api.put('/settings', data);
  }

  getAcademicYears() {
    return this.api.get('/settings/academic-years');
  }

  createAcademicYear(data: any) {
    return this.api.post('/settings/academic-years', data);
  }

  // Bulk Import
  bulkImportStudents(data: any) {
    return this.api.post('/students/bulk-import', data);
  }

  bulkImportTeachers(data: any) {
    return this.api.post('/teachers/bulk-import', data);
  }

  // Assignments
  getAssignments(params?: any) {
    return this.api.get('/assignments', { params });
  }

  getAssignment(id: string) {
    return this.api.get('/assignments/' + id);
  }

  getTeacherAssignments(teacherId: string) {
    return this.api.get('/assignments/teacher/' + teacherId);
  }

  getStudentAssignments(studentId: string) {
    return this.api.get('/assignments/student/' + studentId);
  }

  getClassAssignments(classId: string) {
    return this.api.get('/assignments/class/' + classId);
  }

  createAssignment(data: any) {
    return this.api.post('/assignments', data);
  }

  updateAssignment(id: string, data: any) {
    return this.api.put('/assignments/' + id, data);
  }

  deleteAssignment(id: string) {
    return this.api.delete('/assignments/' + id);
  }

  submitAssignment(id: string, data: any) {
    return this.api.post('/assignments/' + id + '/submit', data);
  }

  gradeAssignment(assignmentId: string, submissionId: string, data: any) {
    return this.api.post('/assignments/' + assignmentId + '/grade/' + submissionId, data);
  }

  getAssignmentSubmissions(assignmentId: string) {
    return this.api.get('/assignments/' + assignmentId + '/submissions');
  }

  // Fee Structure CRUD
  updateFeeStructure(id: string, data: any) {
    return this.api.put('/fee/structure/' + id, data);
  }

  deleteFeeStructure(id: string) {
    return this.api.delete('/fee/structure/' + id);
  }

  getFeeStructure(id: string) {
    return this.api.get('/fee/structure/' + id);
  }

  // Timetable Delete/Reset (Admin only)
  deleteTimetableEntry(id: string) {
    return this.api.delete("/timetable/" + id);
  }

  deleteClassTimetable(classId: string) {
    return this.api.delete("/timetable/class/" + classId + "/all");
  }

  deleteTeacherTimetable(teacherId: string) {
    return this.api.delete("/timetable/teacher/" + teacherId + "/all");
  }

  resetAllTimetable() {
    return this.api.delete("/timetable/reset/all?confirm=yes");
  }

  // Gradebook
  getGradebookEntries(params?: any) {
    return this.api.get('/gradebook', { params });
  }

  createGradebookEntry(data: any) {
    return this.api.post('/gradebook', data);
  }

  saveBulkGrades(data: any) {
    return this.api.post('/gradebook/bulk', data);
  }

  updateGradebookEntry(id: string, data: any) {
    return this.api.put('/gradebook/' + id, data);
  }

  deleteGradebookEntry(id: string) {
    return this.api.delete('/gradebook/' + id);
  }

  getStudentGrades(studentId: string) {
    return this.api.get('/gradebook/student/' + studentId);
  }

  // Password & Notifications
  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.api.post('/password/change', data);
  }

  resetUserPassword(userId: string, data?: { newPassword?: string; sendEmail?: boolean }) {
    return this.api.post('/password/reset/' + userId, data || {});
  }

  bulkResetPasswords(data: { userIds: string[]; sendEmail?: boolean }) {
    return this.api.post('/password/reset-bulk', data);
  }

  sendNotification(data: {
    title: string;
    message: string;
    type?: string;
    targetRole?: string;
    targetUserIds?: string[];
    sendEmailNotification?: boolean;
    priority?: string;
  }) {
    return this.api.post('/notifications', data);
  }

  sendAnnouncement(data: {
    title: string;
    message: string;
    targetRole?: string;
    priority?: string;
    sendEmail?: boolean;
  }) {
    return this.api.post('/notifications/announcement', data);
  }

  getUnreadNotificationCount() {
    return this.api.get('/notifications/unread-count');
  }

  deleteNotification(id: string) {
    return this.api.delete('/notifications/' + id);
  }

  // ======================
  // FINANCE MODULE
  // ======================

  getFinanceDashboard() {
    return this.api.get('/finance/dashboard');
  }

  getChartOfAccounts() {
    return this.api.get('/finance/chart-of-accounts');
  }

  createChartOfAccount(data: any) {
    return this.api.post('/finance/chart-of-accounts', data);
  }

  getFinancialYears() {
    return this.api.get('/finance/financial-years');
  }

  createFinancialYear(data: any) {
    return this.api.post('/finance/financial-years', data);
  }

  getIncomeRecords(params?: any) {
    return this.api.get('/finance/income', { params });
  }

  createIncome(data: any) {
    return this.api.post('/finance/income', data);
  }

  getExpenseRecords(params?: any) {
    return this.api.get('/finance/expenses', { params });
  }

  createExpense(data: any) {
    return this.api.post('/finance/expenses', data);
  }

  approveExpense(id: string) {
    return this.api.put('/finance/expenses/' + id + '/approve');
  }

  rejectExpense(id: string, reason: string) {
    return this.api.put('/finance/expenses/' + id + '/reject', { reason });
  }

  payExpense(id: string) {
    return this.api.put('/finance/expenses/' + id + '/pay');
  }

  getVendors() {
    return this.api.get('/finance/vendors');
  }

  createVendor(data: any) {
    return this.api.post('/finance/vendors', data);
  }

  getBankAccounts() {
    return this.api.get('/finance/bank-accounts');
  }

  createBankAccount(data: any) {
    return this.api.post('/finance/bank-accounts', data);
  }

  getPettyCash(params?: any) {
    return this.api.get('/finance/petty-cash', { params });
  }

  createPettyCash(data: any) {
    return this.api.post('/finance/petty-cash', data);
  }

  getPettyCashSummary() {
    return this.api.get('/finance/petty-cash/summary');
  }

  deletePettyCash(id: string) {
    return this.api.delete('/finance/petty-cash/' + id);
  }

  getIncomeByCategory(params?: any) {
    return this.api.get('/finance/reports/income-by-category', { params });
  }

  getExpensesByCategory(params?: any) {
    return this.api.get('/finance/reports/expenses-by-category', { params });
  }

  getFinanceSettings() {
    return this.api.get('/finance/settings');
  }

  updateFinanceSetting(key: string, value: any) {
    return this.api.put('/finance/settings/' + key, { value });
  }

  // ======================
  // FINANCE ASSETS
  // ======================
  getAssets(params?: any) {
    return this.api.get('/finance/assets', { params });
  }

  createAsset(data: any) {
    return this.api.post('/finance/assets', data);
  }

  updateAsset(id: string, data: any) {
    return this.api.put('/finance/assets/' + id, data);
  }

  deleteAsset(id: string) {
    return this.api.delete('/finance/assets/' + id);
  }

  getAssetsSummary() {
    return this.api.get('/finance/assets/summary');
  }

  // ======================
  // FINANCE BUDGETS
  // ======================
  getBudgets(params?: any) {
    return this.api.get('/finance/budgets', { params });
  }

  createBudget(data: any) {
    return this.api.post('/finance/budgets', data);
  }

  updateBudget(id: string, data: any) {
    return this.api.put('/finance/budgets/' + id, data);
  }

  deleteBudget(id: string) {
    return this.api.delete('/finance/budgets/' + id);
  }

  approveBudget(id: string) {
    return this.api.put('/finance/budgets/' + id + '/approve');
  }

  // ======================
  // PURCHASE ORDERS
  // ======================
  getPurchaseOrders(params?: any) {
    return this.api.get('/finance/purchase-orders', { params });
  }

  createPurchaseOrder(data: any) {
    return this.api.post('/finance/purchase-orders', data);
  }

  updatePurchaseOrder(id: string, data: any) {
    return this.api.put('/finance/purchase-orders/' + id, data);
  }

  deletePurchaseOrder(id: string) {
    return this.api.delete('/finance/purchase-orders/' + id);
  }

  approvePurchaseOrder(id: string) {
    return this.api.put('/finance/purchase-orders/' + id + '/approve');
  }
}

export default new ApiService();
