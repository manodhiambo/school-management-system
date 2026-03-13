import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !(originalRequest as any)._retry) {
          (originalRequest as any)._retry = true;

          const refreshToken =
            localStorage.getItem('refreshToken') ||
            sessionStorage.getItem('refreshToken');

          if (refreshToken) {
            try {
              const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
              const newAccessToken = data?.data?.accessToken;

              if (newAccessToken) {
                const inLocal = !!localStorage.getItem('accessToken');
                if (inLocal) {
                  localStorage.setItem('accessToken', newAccessToken);
                  localStorage.setItem('token', newAccessToken);
                } else {
                  sessionStorage.setItem('accessToken', newAccessToken);
                  sessionStorage.setItem('token', newAccessToken);
                }
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return this.api(originalRequest);
              }
            } catch {
              // refresh failed — fall through to clear auth
            }
          }

          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('refreshToken');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('originalAdminToken');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
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

  forgotPassword(email: string) {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.api.post('/auth/reset-password', { token, newPassword });
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

  getStudentStatistics() {
    return this.api.get('/students/statistics');
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

  getMessageRecipients() {
    return this.api.get('/messages/recipients');
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

  // ======================
  // BUDGET MANAGEMENT (Dedicated)
  // ======================
  getAllBudgets(params?: any) {
    return this.api.get('/budgets', { params });
  }

  getBudgetById(id: string) {
    return this.api.get('/budgets/' + id);
  }

  createNewBudget(data: any) {
    return this.api.post('/budgets', data);
  }

  updateBudgetById(id: string, data: any) {
    return this.api.put('/budgets/' + id, data);
  }

  deleteBudgetById(id: string) {
    return this.api.delete('/budgets/' + id);
  }

  approveBudgetById(id: string) {
    return this.api.put('/budgets/' + id + '/approve');
  }

  closeBudget(id: string) {
    return this.api.put('/budgets/' + id + '/close');
  }

  // Budget Items
  getBudgetItemsById(budgetId: string) {
    return this.api.get('/budgets/' + budgetId + '/items');
  }

  addBudgetItem(budgetId: string, data: any) {
    return this.api.post('/budgets/' + budgetId + '/items', data);
  }

  updateBudgetItemById(id: string, data: any) {
    return this.api.put('/budgets/items/' + id, data);
  }

  deleteBudgetItemById(id: string) {
    return this.api.delete('/budgets/items/' + id);
  }

  // Budget Analytics
  getBudgetSummaryById(id: string) {
    return this.api.get('/budgets/' + id + '/summary');
  }

  getBudgetVarianceById(id: string) {
    return this.api.get('/budgets/' + id + '/variance');
  }

  // ======================
  // FEE COLLECTION (Finance Integration)
  // ======================
  getFeeCollectionSummary() {
    return this.api.get('/finance/fee-collection/summary');
  }

  getFeeCollectionByMonth(params?: any) {
    return this.api.get('/finance/fee-collection/by-month', { params });
  }

  getFeeCollectionByClass() {
    return this.api.get('/finance/fee-collection/by-class');
  }
  
  // Bank Account Operations
  updateBankAccount(id: string, data: any) {
    return this.api.put(`/finance/bank-accounts/${id}`, data);
  }

  deleteBankAccount(id: string) {
    return this.api.delete(`/finance/bank-accounts/${id}`);
  }

  createBankTransaction(data: any) {
    return this.api.post('/finance/bank-transactions', data);
  }

  getBankTransactions(accountId?: string) {
    return this.api.get('/finance/bank-transactions', { params: { accountId } });
  }

  // ======================
  // ONLINE EXAMS
  // ======================
  startExamAttempt(examId: string) {
    return this.api.post('/online-exams/' + examId + '/start');
  }

  getExamAttempt(examId: string) {
    return this.api.get('/online-exams/' + examId + '/attempt');
  }

  saveExamAnswer(examId: string, data: { question_id: string; answer_text: string }) {
    return this.api.post('/online-exams/' + examId + '/answer', data);
  }

  submitExamAttempt(examId: string) {
    return this.api.post('/online-exams/' + examId + '/submit');
  }

  getMyExamResult(examId: string) {
    return this.api.get('/online-exams/' + examId + '/my-result');
  }

  getExamAttempts(examId: string) {
    return this.api.get('/online-exams/' + examId + '/results');
  }

  getExamsForClass(classId: string) {
    return this.api.get('/exams', { params: { class_id: classId } });
  }

  // ======================
  // OFFLINE RESULTS
  // ======================
  saveOfflineResults(data: { exam_id: string; results: any[] }) {
    return this.api.post('/offline-results/bulk', data);
  }

  getOfflineResults(examId: string) {
    return this.api.get('/offline-results/' + examId);
  }

  publishExamResults(examId: string) {
    return this.api.post('/offline-results/' + examId + '/publish');
  }

  // ======================
  // CBC ANALYTICS
  // ======================
  getCbcOverview() {
    return this.api.get('/cbc-analytics/overview');
  }

  getCbcClassAnalytics(classId: string) {
    return this.api.get('/cbc-analytics/class/' + classId);
  }

  getCbcStudentAnalytics(studentId: string) {
    return this.api.get('/cbc-analytics/student/' + studentId);
  }

  getCbcParentOverview() {
    return this.api.get('/cbc-analytics/parent-overview');
  }

  getCbcSubjectAnalytics(subjectId: string) {
    return this.api.get('/cbc-analytics/subject/' + subjectId);
  }

  // ======================
  // CBC COMPREHENSIVE
  // ======================

  // Strands
  getCbcStrands(params?: any) { return this.api.get('/cbc/strands', { params }); }
  createCbcStrand(data: any) { return this.api.post('/cbc/strands', data); }
  updateCbcStrand(id: string, data: any) { return this.api.put('/cbc/strands/' + id, data); }
  deleteCbcStrand(id: string) { return this.api.delete('/cbc/strands/' + id); }

  // Sub-strands
  getCbcSubStrands(params?: any) { return this.api.get('/cbc/sub-strands', { params }); }
  createCbcSubStrand(data: any) { return this.api.post('/cbc/sub-strands', data); }
  updateCbcSubStrand(id: string, data: any) { return this.api.put('/cbc/sub-strands/' + id, data); }
  deleteCbcSubStrand(id: string) { return this.api.delete('/cbc/sub-strands/' + id); }

  // Assessments
  getCbcAssessments(params?: any) { return this.api.get('/cbc/assessments', { params }); }
  createCbcAssessment(data: any) { return this.api.post('/cbc/assessments', data); }
  updateCbcAssessment(id: string, data: any) { return this.api.put('/cbc/assessments/' + id, data); }
  deleteCbcAssessment(id: string) { return this.api.delete('/cbc/assessments/' + id); }

  // Competency Summary
  getCbcCompetencySummary(params?: any) { return this.api.get('/cbc/competency-summary', { params }); }
  saveCbcCompetencySummary(data: any) { return this.api.post('/cbc/competency-summary', data); }

  // Report Cards
  getCbcReportCards(params?: any) { return this.api.get('/cbc/report-cards', { params }); }
  getCbcReportCard(id: string) { return this.api.get('/cbc/report-cards/' + id); }
  createCbcReportCard(data: any) { return this.api.post('/cbc/report-cards', data); }
  publishCbcReportCard(id: string) { return this.api.put('/cbc/report-cards/' + id + '/publish'); }
  acknowledgeCbcReportCard(id: string, data: any) { return this.api.put('/cbc/report-cards/' + id + '/acknowledge', data); }

  // Portfolios
  getCbcPortfolios(params?: any) { return this.api.get('/cbc/portfolios', { params }); }
  createCbcPortfolio(data: any) { return this.api.post('/cbc/portfolios', data); }
  deleteCbcPortfolio(id: string) { return this.api.delete('/cbc/portfolios/' + id); }

  // Academic Terms
  getAcademicTerms() { return this.api.get('/cbc/terms'); }
  getCurrentTerm() { return this.api.get('/cbc/terms/current'); }
  createAcademicTerm(data: any) { return this.api.post('/cbc/terms', data); }
  setCurrentTerm(id: string) { return this.api.put('/cbc/terms/' + id + '/set-current'); }

  // CBC Class Summary
  getCbcClassSummary(classId: string, params?: any) { return this.api.get('/cbc/class-summary/' + classId, { params }); }

  // ======================
  // PARENT ALERTS
  // ======================
  getParentAlerts(params?: any) { return this.api.get('/parent-alerts', { params }); }
  getParentAlertsCount() { return this.api.get('/parent-alerts/unread-count'); }
  markParentAlertRead(id: string) { return this.api.put('/parent-alerts/' + id + '/read'); }
  markAllParentAlertsRead() { return this.api.put('/parent-alerts/mark-all-read'); }
  sendParentAlert(data: any) { return this.api.post('/parent-alerts/send', data); }
  broadcastParentAlert(data: any) { return this.api.post('/parent-alerts/broadcast', data); }
  getStudentAlerts(studentId: string) { return this.api.get('/parent-alerts/student/' + studentId); }

  // ======================
  // DISCIPLINE
  // ======================
  getDisciplineIncidents(params?: any) { return this.api.get('/discipline', { params }); }
  getDisciplineStats(params?: any) { return this.api.get('/discipline/stats', { params }); }
  getDisciplineIncident(id: string) { return this.api.get('/discipline/' + id); }
  createDisciplineIncident(data: any) { return this.api.post('/discipline', data); }
  updateDisciplineIncident(id: string, data: any) { return this.api.put('/discipline/' + id, data); }
  deleteDisciplineIncident(id: string) { return this.api.delete('/discipline/' + id); }

  // ======================
  // TRANSPORT
  // ======================
  getTransportRoutes() { return this.api.get('/transport/routes'); }
  getTransportRoute(id: string) { return this.api.get('/transport/routes/' + id); }
  createTransportRoute(data: any) { return this.api.post('/transport/routes', data); }
  updateTransportRoute(id: string, data: any) { return this.api.put('/transport/routes/' + id, data); }
  deleteTransportRoute(id: string) { return this.api.delete('/transport/routes/' + id); }
  getTransportStudents(params?: any) { return this.api.get('/transport/students', { params }); }
  assignStudentTransport(data: any) { return this.api.post('/transport/students', data); }
  removeStudentTransport(id: string) { return this.api.delete('/transport/students/' + id); }

  // ======================
  // STUDENT HEALTH
  // ======================
  getHealthRecords(params?: any) { return this.api.get('/health/records', { params }); }
  createHealthRecord(data: any) { return this.api.post('/health/records', data); }
  deleteHealthRecord(id: string) { return this.api.delete('/health/records/' + id); }
  getStudentHealthProfile(studentId: string) { return this.api.get('/health/profile/' + studentId); }
  saveStudentHealthProfile(data: any) { return this.api.post('/health/profile', data); }

  // ======================
  // SCHOOL REGISTRATION (Public — no auth header needed)
  // ======================
  registerSchool(data: {
    schoolName: string;
    schoolEmail: string;
    schoolPhone: string;
    contactPerson: string;
    adminEmail: string;
    adminPassword: string;
    schoolAddress?: string;
    county?: string;
    registrationNumber?: string;
  }) {
    return this.api.post('/registration/register', data);
  }

  initiateRegistrationPayment(_tenantId: string, phone: string) {
    // tenant_id is resolved from JWT on the backend
    return this.api.post('/registration/pay', { phone });
  }

  pollRegistrationStatus(tenantId: string) {
    return this.api.get('/registration/check-activation/' + tenantId);
  }

  renewSubscription(tenantId: string, phone: string) {
    return this.api.post('/registration/renew', { tenant_id: tenantId, phone });
  }

  // ======================
  // SUPERADMIN
  // ======================
  getSuperAdminStats() {
    return this.api.get('/superadmin/stats');
  }

  getTenants(params?: any) {
    return this.api.get('/superadmin/tenants', { params });
  }

  getTenant(id: string) {
    return this.api.get('/superadmin/tenants/' + id);
  }

  createTenant(data: any) {
    return this.api.post('/superadmin/tenants', data);
  }

  updateTenant(id: string, data: any) {
    return this.api.put('/superadmin/tenants/' + id, data);
  }

  deleteTenant(id: string) {
    return this.api.delete('/superadmin/tenants/' + id);
  }

  activateTenant(id: string) {
    return this.api.post('/superadmin/tenants/' + id + '/activate');
  }

  suspendTenant(id: string) {
    return this.api.post('/superadmin/tenants/' + id + '/suspend');
  }

  extendTenantSubscription(id: string, months: number) {
    return this.api.post('/superadmin/tenants/' + id + '/extend', { months });
  }

  loginAsTenant(id: string) {
    return this.api.post('/superadmin/tenants/' + id + '/login-as');
  }

  getTenantPayments(id: string) {
    return this.api.get('/superadmin/tenants/' + id + '/payments');
  }

  updateSuperAdminProfile(data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
    return this.api.put('/superadmin/profile', data);
  }

  // ======================
  // ACADEMICS MODULE (CBC Comprehensive)
  // ======================

  // Dashboard
  getAcademicsDashboard(params?: any) { return this.api.get('/academics/dashboard', { params }); }

  // Schemes of Work
  getSchemes(params?: any) { return this.api.get('/academics/schemes', { params }); }
  getScheme(id: string) { return this.api.get('/academics/schemes/' + id); }
  createScheme(data: any) { return this.api.post('/academics/schemes', data); }
  updateScheme(id: string, data: any) { return this.api.put('/academics/schemes/' + id, data); }
  deleteScheme(id: string) { return this.api.delete('/academics/schemes/' + id); }
  saveSchemeWeeks(id: string, weeks: any[]) { return this.api.post('/academics/schemes/' + id + '/weeks', { weeks }); }

  // Lesson Plans
  getLessonPlans(params?: any) { return this.api.get('/academics/lesson-plans', { params }); }
  getLessonPlan(id: string) { return this.api.get('/academics/lesson-plans/' + id); }
  createLessonPlan(data: any) { return this.api.post('/academics/lesson-plans', data); }
  updateLessonPlan(id: string, data: any) { return this.api.put('/academics/lesson-plans/' + id, data); }
  deleteLessonPlan(id: string) { return this.api.delete('/academics/lesson-plans/' + id); }

  // School Based Assessments (SBA)
  getSbaSetups(params?: any) { return this.api.get('/academics/sba', { params }); }
  createSbaSetup(data: any) { return this.api.post('/academics/sba', data); }
  updateSbaSetup(id: string, data: any) { return this.api.put('/academics/sba/' + id, data); }
  getSbaRecords(id: string) { return this.api.get('/academics/sba/' + id + '/records'); }
  saveSbaRecords(id: string, records: any[]) { return this.api.post('/academics/sba/' + id + '/records', { records }); }

  // Projects
  getProjects(params?: any) { return this.api.get('/academics/projects', { params }); }
  getProject(id: string) { return this.api.get('/academics/projects/' + id); }
  createProject(data: any) { return this.api.post('/academics/projects', data); }
  addProjectMilestone(id: string, data: any) { return this.api.post('/academics/projects/' + id + '/milestones', data); }
  addProjectSubmission(id: string, data: any) { return this.api.post('/academics/projects/' + id + '/submissions', data); }
  gradeProjectSubmission(projectId: string, subId: string, data: any) {
    return this.api.put('/academics/projects/' + projectId + '/submissions/' + subId + '/grade', data);
  }

  // Life Skills & Values
  getLifeSkills(params?: any) { return this.api.get('/academics/life-skills', { params }); }
  saveLifeSkills(data: any) { return this.api.post('/academics/life-skills', data); }
  saveLifeSkillsBulk(records: any[]) { return this.api.post('/academics/life-skills/bulk', { records }); }

  // Career Guidance
  getCareerPathways() { return this.api.get('/academics/career/pathways'); }
  createCareerPathway(data: any) { return this.api.post('/academics/career/pathways', data); }
  getCareerProfiles(params?: any) { return this.api.get('/academics/career/profiles', { params }); }
  saveCareerProfile(data: any) { return this.api.post('/academics/career/profiles', data); }
  getStudentCareerProfile(studentId: string) { return this.api.get('/academics/career/profiles/student/' + studentId); }

  // Learning Materials
  getLearningMaterials(params?: any) { return this.api.get('/academics/materials', { params }); }
  createLearningMaterial(data: any) { return this.api.post('/academics/materials', data); }
  updateLearningMaterial(id: string, data: any) { return this.api.put('/academics/materials/' + id, data); }
  deleteLearningMaterial(id: string) { return this.api.delete('/academics/materials/' + id); }
  trackMaterialDownload(id: string) { return this.api.put('/academics/materials/' + id + '/download'); }

  // Promotion & Progression
  getPromotionRules() { return this.api.get('/academics/promotion/rules'); }
  savePromotionRule(data: any) { return this.api.post('/academics/promotion/rules', data); }
  getPromotionHistory(params?: any) { return this.api.get('/academics/promotion/history', { params }); }
  promoteStudent(data: any) { return this.api.post('/academics/promotion/promote-student', data); }
  bulkPromoteStudents(data: any) { return this.api.post('/academics/promotion/bulk-promote', data); }

  // Rooms
  getRooms() { return this.api.get('/academics/rooms'); }
  createRoom(data: any) { return this.api.post('/academics/rooms', data); }
  updateRoom(id: string, data: any) { return this.api.put('/academics/rooms/' + id, data); }
  deleteRoom(id: string) { return this.api.delete('/academics/rooms/' + id); }

  // Class Management (full)
  getAcademicClasses(params?: any) { return this.api.get('/academics/classes', { params }); }
  createAcademicClass(data: any) { return this.api.post('/academics/classes', data); }
  updateAcademicClass(id: string, data: any) { return this.api.put('/academics/classes/' + id, data); }
  deleteAcademicClass(id: string) { return this.api.delete('/academics/classes/' + id); }
  getClassSubjects(classId: string) { return this.api.get('/academics/classes/' + classId + '/subjects'); }
  addSubjectToClass(classId: string, data: any) { return this.api.post('/academics/classes/' + classId + '/subjects', data); }
  removeSubjectFromClass(classId: string, subjectId: string) { return this.api.delete('/academics/classes/' + classId + '/subjects/' + subjectId); }

  // Subject / Learning Area Management (full)
  getAcademicSubjects(params?: any) { return this.api.get('/academics/subjects', { params }); }
  createAcademicSubject(data: any) { return this.api.post('/academics/subjects', data); }
  updateAcademicSubject(id: string, data: any) { return this.api.put('/academics/subjects/' + id, data); }
  deleteAcademicSubject(id: string) { return this.api.delete('/academics/subjects/' + id); }

  // Setup / Seed Defaults
  getSetupStatus() { return this.api.get('/academics/setup/status'); }
  seedCbcClasses() { return this.api.post('/academics/setup/seed-classes', {}); }
  seedCbcSubjects() { return this.api.post('/academics/setup/seed-subjects', {}); }
  seedCbcAll() { return this.api.post('/academics/setup/seed-all', {}); }

}

export default new ApiService();
