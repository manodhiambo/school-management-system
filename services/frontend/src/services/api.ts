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
              const newRefreshToken = data?.data?.refreshToken;

              if (newAccessToken) {
                const inLocal = !!localStorage.getItem('accessToken');
                if (inLocal) {
                  localStorage.setItem('accessToken', newAccessToken);
                  localStorage.setItem('token', newAccessToken);
                  if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
                } else {
                  sessionStorage.setItem('accessToken', newAccessToken);
                  sessionStorage.setItem('token', newAccessToken);
                  if (newRefreshToken) sessionStorage.setItem('refreshToken', newRefreshToken);
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
        if (error.response?.status === 403) {
          const msg = error.response.data?.message || 'You do not have permission to access this resource.';
          window.dispatchEvent(new CustomEvent('api:forbidden', { detail: { message: msg } }));
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

  // 2FA
  get2FAStatus() { return this.api.get('/auth/2fa/status'); }
  setup2FA() { return this.api.get('/auth/2fa/setup'); }
  enable2FA(secret: string, code: string) { return this.api.post('/auth/2fa/enable', { secret, code }); }
  disable2FA(password: string) { return this.api.post('/auth/2fa/disable', { password }); }
  validate2FA(tempToken: string, code: string) { return this.api.post('/auth/2fa/validate', { temp_token: tempToken, code }); }

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

  getNextAdmissionNumber() {
    return this.api.get('/students/next-admission-number');
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

  getFeeReceipt(paymentId: string) {
    return this.api.get('/fee/receipt/' + paymentId);
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

  getTeacherSubjectAssignments(teacherId: string) {
    return this.api.get('/teachers/' + teacherId + '/assignments');
  }

  addTeacherAssignment(teacherId: string, data: { class_id: string; subject_id: string }) {
    return this.api.post('/teachers/' + teacherId + '/assignments', data);
  }

  removeTeacherAssignment(teacherId: string, csId: string) {
    return this.api.delete('/teachers/' + teacherId + '/assignments/' + csId);
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

  getMonthlyAttendanceReport(month: string, classId?: string) {
    return this.api.get('/attendance/report/monthly', { params: { month, classId } });
  }

  getAbsentPreview(date: string, classId?: string) {
    return this.api.get('/attendance/absent-preview', { params: { date, classId } });
  }

  notifyAbsentStudents(data: { date: string; classId?: string }) {
    return this.api.post('/attendance/notify-absent', data);
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

  generateSmartBulkInvoices(data: any) {
    return this.api.post('/fee/invoice/bulk-smart', data);
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

  deleteFeeInvoice(id: string) {
    return this.api.delete('/fee/invoice/' + id);
  }

  deleteFeePayment(id: string) {
    return this.api.delete('/fee/payment/' + id);
  }

  getExpectedFees(studentId: string, params?: any) {
    return this.api.get('/fee/expected/' + studentId, { params });
  }

  getStudentsSummary(params?: any) {
    return this.api.get('/fee/students-summary', { params });
  }

  generateInvoiceForStudent(data: any) {
    return this.api.post('/fee/invoice/generate-for-student', data);
  }

  // Financial Reports
  getFeeReportSummary(params?: any) {
    return this.api.get('/fee/report/summary', { params });
  }
  getFeeReportByClass(params?: any) {
    return this.api.get('/fee/report/collection-by-class', { params });
  }
  getFeeReportPaymentMethods(params?: any) {
    return this.api.get('/fee/report/payment-methods', { params });
  }
  getFeeReportMonthlyTrend(params?: any) {
    return this.api.get('/fee/report/monthly-trend', { params });
  }
  getFeeReportDefaulters(params?: any) {
    return this.api.get('/fee/report/defaulters', { params });
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

  // IntaSend bank/card payments
  initiateIntasendCheckout(invoiceId: string) {
    return this.api.post('/fee/intasend/checkout', { invoiceId });
  }

  // Parent payment requests
  submitPaymentRequest(data: { invoiceId: string; amount: number; paymentMethod: string; transactionRef?: string; parentMessage?: string }) {
    return this.api.post('/fee/payment-request', data);
  }

  getPaymentRequests(status?: string) {
    return this.api.get('/fee/payment-requests', { params: status ? { status } : {} });
  }

  getPaymentRequestsCount() {
    return this.api.get('/fee/payment-requests/count');
  }

  confirmPaymentRequest(id: string, confirmationNote?: string) {
    return this.api.put('/fee/payment-requests/' + id + '/confirm', { confirmationNote });
  }

  rejectPaymentRequest(id: string, confirmationNote: string) {
    return this.api.put('/fee/payment-requests/' + id + '/reject', { confirmationNote });
  }

  getMyPaymentRequests(studentId: string) {
    return this.api.get('/fee/my-payment-requests/' + studentId);
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

  // Communication (legacy)
  getCommunicationAnnouncements(params?: any) {
    return this.api.get('/communication/announcements', { params });
  }

  createCommunicationAnnouncement(data: any) {
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

  getUnreadMessageCount() {
    return this.api.get('/messages/unread-count');
  }
  getNewUnreadMessages() {
    return this.api.get('/messages/new-unread');
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

  // IntaSend bank/card payment gateway config
  getIntasendConfig() {
    return this.api.get('/settings/intasend-config');
  }

  updateIntasendConfig(data: any) {
    return this.api.put('/settings/intasend-config', data);
  }

  getIntasendRecentPayments(limit = 20) {
    return this.api.get('/fee/intasend/recent', { params: { limit } });
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

  deactivateFeeStructure(id: string) {
    return this.api.put('/fee/structure/' + id + '/deactivate', {});
  }

  getFeeStructure(id: string) {
    return this.api.get('/fee/structure/' + id);
  }

  bulkSmartGenerateInvoices(data: any) {
    return this.api.post('/fee/invoice/bulk-smart', data);
  }

  // Extra Fees
  getExtraFees(params?: any) {
    return this.api.get('/extra-fees', { params });
  }
  getExtraFeesForReport(params: { student_id: string; class_id?: string; term?: string; academic_year?: string }) {
    return this.api.get('/extra-fees/for-report', { params });
  }
  createExtraFee(data: any) {
    return this.api.post('/extra-fees', data);
  }
  updateExtraFee(id: string, data: any) {
    return this.api.put('/extra-fees/' + id, data);
  }
  deleteExtraFee(id: string) {
    return this.api.delete('/extra-fees/' + id);
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

  deleteIncome(id: string) {
    return this.api.delete('/finance/income/' + id);
  }

  getExpenseRecords(params?: any) {
    return this.api.get('/finance/expenses', { params });
  }

  createExpense(data: any) {
    return this.api.post('/finance/expenses', data);
  }

  deleteExpense(id: string) {
    return this.api.delete('/finance/expenses/' + id);
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

  deleteVendor(id: string) {
    return this.api.delete('/finance/vendors/' + id);
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

  deleteBankTransaction(id: string) {
    return this.api.delete('/finance/bank-transactions/' + id);
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
  // CBE ANALYTICS
  // ======================
  getCbcOverview() {
    return this.api.get('/cbe-analytics/overview');
  }

  getCbcClassAnalytics(classId: string) {
    return this.api.get('/cbe-analytics/class/' + classId);
  }

  getCbcStudentAnalytics(studentId: string) {
    return this.api.get('/cbe-analytics/student/' + studentId);
  }

  getCbcParentOverview() {
    return this.api.get('/cbe-analytics/parent-overview');
  }

  getCbcSubjectAnalytics(subjectId: string) {
    return this.api.get('/cbe-analytics/subject/' + subjectId);
  }

  // ======================
  // CBE COMPREHENSIVE
  // ======================

  // Strands
  getCbcStrands(params?: any) { return this.api.get('/cbe/strands', { params }); }
  createCbcStrand(data: any) { return this.api.post('/cbe/strands', data); }
  updateCbcStrand(id: string, data: any) { return this.api.put('/cbe/strands/' + id, data); }
  deleteCbcStrand(id: string) { return this.api.delete('/cbe/strands/' + id); }

  // Sub-strands
  getCbcSubStrands(params?: any) { return this.api.get('/cbe/sub-strands', { params }); }
  createCbcSubStrand(data: any) { return this.api.post('/cbe/sub-strands', data); }
  updateCbcSubStrand(id: string, data: any) { return this.api.put('/cbe/sub-strands/' + id, data); }
  deleteCbcSubStrand(id: string) { return this.api.delete('/cbe/sub-strands/' + id); }

  // Assessments
  getCbcAssessments(params?: any) { return this.api.get('/cbe/assessments', { params }); }
  createCbcAssessment(data: any) { return this.api.post('/cbe/assessments', data); }
  updateCbcAssessment(id: string, data: any) { return this.api.put('/cbe/assessments/' + id, data); }
  deleteCbcAssessment(id: string) { return this.api.delete('/cbe/assessments/' + id); }

  // Competency Summary
  getCbcCompetencySummary(params?: any) { return this.api.get('/cbe/competency-summary', { params }); }
  saveCbcCompetencySummary(data: any) { return this.api.post('/cbe/competency-summary', data); }

  // Report Cards
  getCbcReportCards(params?: any) { return this.api.get('/cbe/report-cards', { params }); }
  getCbcReportCardPeriods(params?: { class_id?: string; term?: string; academic_year?: string }) {
    return this.api.get('/cbe/report-cards/periods', { params });
  }
  getCbcReportCardBatches() { return this.api.get('/cbe/report-cards/batches'); }
  getCbcReportCard(id: string) { return this.api.get('/cbe/report-cards/' + id); }
  getMyReportCards() { return this.api.get('/cbe/report-cards/my'); }
  getMyReportCard(id: string) { return this.api.get('/cbe/report-cards/' + id); }
  createCbcReportCard(data: any) { return this.api.post('/cbe/report-cards', data); }
  generateCbcReportCards(data: any) { return this.api.post('/cbe/report-cards/generate', data); }
  publishCbcReportCard(id: string) { return this.api.put('/cbe/report-cards/' + id + '/publish'); }
  bulkPublishCbcReportCards(data: { ids?: string[]; class_id?: string; term?: string; academic_year?: string }) {
    return this.api.put('/cbe/report-cards/bulk-publish', data);
  }
  shareReportCard(id: string, channels: string[], contact?: { name: string; phone: string; email: string }) {
    return this.api.post('/cbe/report-cards/' + id + '/share', {
      channels,
      override_email: contact?.email || undefined,
      override_phone: contact?.phone || undefined,
      override_name:  contact?.name  || undefined,
    });
  }
  acknowledgeCbcReportCard(id: string, data: any) { return this.api.put('/cbe/report-cards/' + id + '/acknowledge', data); }

  // Portfolios
  getCbcPortfolios(params?: any) { return this.api.get('/cbe/portfolios', { params }); }
  createCbcPortfolio(data: any) { return this.api.post('/cbe/portfolios', data); }
  deleteCbcPortfolio(id: string) { return this.api.delete('/cbe/portfolios/' + id); }

  // Academic Terms
  getAcademicTerms() { return this.api.get('/cbe/terms'); }
  getCurrentTerm() { return this.api.get('/cbe/terms/current'); }
  createAcademicTerm(data: any) { return this.api.post('/cbe/terms', data); }
  setCurrentTerm(id: string) { return this.api.put('/cbe/terms/' + id + '/set-current'); }

  // CBE Class Summary
  getCbcClassSummary(classId: string, params?: any) { return this.api.get('/cbe/class-summary/' + classId, { params }); }

  // CBE Broadsheet
  getCbcBroadsheet(params?: any) { return this.api.get('/cbe/broadsheet', { params }); }

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
  getTransportStudentsReport(params?: any) { return this.api.get('/transport/students/report', { params }); }
  assignStudentTransport(data: any) { return this.api.post('/transport/students', data); }
  bulkAssignStudentTransport(data: any) { return this.api.post('/transport/students/bulk', data); }
  removeStudentTransport(id: string) { return this.api.delete('/transport/students/' + id); }

  // Driver tracking
  getDriverRoute(params?: any) { return this.api.get('/driver/my-route', { params }); }
  getDriverSession(params?: any) { return this.api.get('/driver/session', { params }); }
  recordDriverPickup(data: any) { return this.api.post('/driver/pickup', data); }
  getDrivers() { return this.api.get('/driver/drivers'); }
  assignDriverToRoute(routeId: string, data: any) { return this.api.put('/driver/routes/' + routeId + '/driver', data); }
  getTransportTrackingOverview(params?: any) { return this.api.get('/driver/tracking-overview', { params }); }
  getChildTransportStatus(params?: any) { return this.api.get('/driver/my-child-status', { params }); }
  parentLeftHome(data: any) { return this.api.post('/driver/parent-left-home', data); }

  // Teacher check-in
  teacherCheckin(data: any) { return this.api.post('/checkin/checkin', data); }
  teacherCheckout(data: any) { return this.api.post('/checkin/checkout', data); }
  getMyCheckinStatus(params?: any) { return this.api.get('/checkin/my-status', { params }); }
  getTeacherCheckins(params?: any) { return this.api.get('/checkin/today', { params }); }
  getTeacherCheckinHistory(params?: any) { return this.api.get('/checkin/my-history', { params }); }
  getCheckinSchoolHours() { return this.api.get('/checkin/school-hours'); }

  // SMS
  sendSMS(data: any) { return this.api.post('/sms/send', data); }
  sendBulkSMS(data: any) { return this.api.post('/sms/bulk', data); }
  getSMSLogs(params?: any) { return this.api.get('/sms/logs', { params }); }
  getSMSTemplates() { return this.api.get('/sms/templates'); }
  getSMSStats() { return this.api.get('/sms/stats'); }

  // ======================
  // GATE MANAGEMENT
  // ======================
  getGateDashboard() { return this.api.get('/gate/dashboard'); }
  // Visitors
  getVisitors(params?: any) { return this.api.get('/gate/visitors', { params }); }
  createVisitor(data: any) { return this.api.post('/gate/visitors', data); }
  getVisitor(id: string) { return this.api.get('/gate/visitors/' + id); }
  updateVisitor(id: string, data: any) { return this.api.put('/gate/visitors/' + id, data); }
  // Visits (check-in / check-out)
  createVisit(data: any) { return this.api.post('/gate/visits', data); }
  checkoutVisit(id: string, data?: any) { return this.api.post('/gate/visits/' + id + '/checkout', data || {}); }
  getVisits(params?: any) { return this.api.get('/gate/visits', { params }); }
  getVisit(id: string) { return this.api.get('/gate/visits/' + id); }
  // Authorized pickup persons
  getAuthorizedPersons(studentId: string) { return this.api.get('/gate/pickup/authorized/' + studentId); }
  addAuthorizedPerson(data: any) { return this.api.post('/gate/pickup/authorized', data); }
  updateAuthorizedPerson(id: string, data: any) { return this.api.put('/gate/pickup/authorized/' + id, data); }
  removeAuthorizedPerson(id: string) { return this.api.delete('/gate/pickup/authorized/' + id); }
  // Pickup
  searchStudentsForPickup(search: string) { return this.api.get('/gate/pickup/students', { params: { search } }); }
  releaseStudent(data: any) { return this.api.post('/gate/pickup/release', data); }
  getPickupHistory(params?: any) { return this.api.get('/gate/pickup/history', { params }); }
  // OTP
  requestPickupOTP(data: any) { return this.api.post('/gate/pickup/otp/request', data); }
  verifyPickupOTP(data: any) { return this.api.post('/gate/pickup/otp/verify', data); }
  // Live monitoring
  getLiveVisitors() { return this.api.get('/gate/live/visitors'); }
  getLiveStudentsWaiting() { return this.api.get('/gate/live/students-waiting'); }
  // Blacklists
  getVisitorBlacklist() { return this.api.get('/gate/blacklist/visitors'); }
  addVisitorBlacklist(data: any) { return this.api.post('/gate/blacklist/visitors', data); }
  removeVisitorBlacklist(id: string) { return this.api.delete('/gate/blacklist/visitors/' + id); }
  getGuardianBlacklist() { return this.api.get('/gate/blacklist/guardians'); }
  addGuardianBlacklist(data: any) { return this.api.post('/gate/blacklist/guardians', data); }
  removeGuardianBlacklist(id: string) { return this.api.delete('/gate/blacklist/guardians/' + id); }
  // Reports
  getGateVisitorReport(params?: any) { return this.api.get('/gate/reports/visitors', { params }); }
  getGatePickupReport(params?: any) { return this.api.get('/gate/reports/pickups', { params }); }

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

  getSecurityLoginAttempts(params?: any) {
    return this.api.get('/superadmin/security/login-attempts', { params });
  }

  getSecuritySummary() {
    return this.api.get('/superadmin/security/summary');
  }

  getSecurityIpLocation(ip: string) {
    return this.api.get('/superadmin/security/geo-lookup', { params: { ip } });
  }

  getAllLogins(params?: any) {
    return this.api.get('/superadmin/security/all-logins', { params });
  }

  getDeviceBlacklist() {
    return this.api.get('/superadmin/security/blacklist');
  }

  blacklistDevice(data: { ip_address?: string; user_agent?: string; reason?: string }) {
    return this.api.post('/superadmin/security/blacklist', data);
  }

  unblacklistDevice(id: string) {
    return this.api.delete('/superadmin/security/blacklist/' + id);
  }

  getBlacklistedUsers() {
    return this.api.get('/superadmin/security/blacklisted-users');
  }

  blacklistUser(id: string, reason?: string) {
    return this.api.post('/superadmin/security/users/' + id + '/blacklist', { reason });
  }

  unblacklistUser(id: string) {
    return this.api.post('/superadmin/security/users/' + id + '/unblacklist');
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

  permanentlyDeleteTenant(id: string, confirm: string) {
    return this.api.delete('/superadmin/tenants/' + id + '/permanent', { data: { confirm } });
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

  getModuleRegistry() {
    return this.api.get('/superadmin/modules');
  }

  getTenantModules(id: string) {
    return this.api.get('/superadmin/tenants/' + id + '/modules');
  }

  updateTenantModules(id: string, enabledModules: string[]) {
    return this.api.put('/superadmin/tenants/' + id + '/modules', { enabled_modules: enabledModules });
  }

  updateSuperAdminProfile(data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
    return this.api.put('/superadmin/profile', data);
  }

  // ======================
  // ACADEMICS MODULE (CBE Comprehensive)
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

  // ======================
  // STAFF LEAVE REQUESTS
  // ======================
  getStaffLeaveRequests(params?: any) { return this.api.get('/staff-leave', { params }); }
  createStaffLeaveRequest(data: any) { return this.api.post('/staff-leave', data); }
  reviewStaffLeaveRequest(id: string, data: any) { return this.api.put('/staff-leave/' + id + '/review', data); }
  cancelStaffLeaveRequest(id: string) { return this.api.put('/staff-leave/' + id + '/cancel', {}); }
  deleteStaffLeaveRequest(id: string) { return this.api.delete('/staff-leave/' + id); }

  // ── Announcements ──────────────────────────────────────────────────────────
  getAnnouncements(params?: any) { return this.api.get('/announcements', { params }); }
  createAnnouncement(data: any) { return this.api.post('/announcements', data); }
  updateAnnouncement(id: string, data: any) { return this.api.put('/announcements/' + id, data); }
  deleteAnnouncement(id: string) { return this.api.delete('/announcements/' + id); }
  markAnnouncementRead(id: string) { return this.api.post('/announcements/' + id + '/read', {}); }
  getUnreadAnnouncementCount() { return this.api.get('/announcements/unread-count'); }

  // ── Audit Log ─────────────────────────────────────────────────────────────
  getAuditLog(params?: any) { return this.api.get('/audit-log', { params }); }
  getAuditActions() { return this.api.get('/audit-log/actions'); }
  getAuditSummary() { return this.api.get('/audit-log/summary'); }

  // ── Fee Reminders ─────────────────────────────────────────────────────────
  getFeeReminderConfig() { return this.api.get('/fee-reminders/config'); }
  saveFeeReminderConfig(data: any) { return this.api.put('/fee-reminders/config', data); }
  sendFeeRemindersNow() { return this.api.post('/fee-reminders/send-now', {}); }
  getFeeReminderLog(params?: any) { return this.api.get('/fee-reminders/log', { params }); }
  getFeeReminderStats() { return this.api.get('/fee-reminders/stats'); }

  // ── Exam Analytics ────────────────────────────────────────────────────────
  getExamAnalyticsSummary(examId: string) { return this.api.get('/exam-analytics/exam/' + examId + '/summary'); }
  getExamClassComparison(examId: string) { return this.api.get('/exam-analytics/exam/' + examId + '/class-comparison'); }
  getStudentPerformance(studentId: string) { return this.api.get('/exam-analytics/student/' + studentId + '/performance'); }
  getClassReport(classId: string) { return this.api.get('/exam-analytics/class/' + classId + '/report'); }
  getSubjectTrends(subjectId: string) { return this.api.get('/exam-analytics/subject/' + subjectId + '/trends'); }

  // ── NEMIS ─────────────────────────────────────────────────────────────────
  getNemisConfig() { return this.api.get('/nemis/config'); }
  saveNemisConfig(data: any) { return this.api.put('/nemis/config', data); }
  getNemisValidation() { return this.api.get('/nemis/validate'); }
  getNemisExport() { return this.api.get('/nemis/export/students'); }
  getNemisExportCSV() { return this.api.get('/nemis/export/students/csv', { responseType: 'blob' }); }

  // ── Parent-Teacher Meetings ───────────────────────────────────────────────
  getPTMSlots(params?: any) { return this.api.get('/meetings/slots', { params }); }
  createPTMSlot(data: any) { return this.api.post('/meetings/slots', data); }
  deletePTMSlot(id: string) { return this.api.delete('/meetings/slots/' + id); }
  bookPTMSlot(slotId: string, data: any) { return this.api.post('/meetings/book/' + slotId, data); }
  getPTMBookings(params?: any) { return this.api.get('/meetings/bookings', { params }); }
  updatePTMBooking(id: string, data: any) { return this.api.put('/meetings/bookings/' + id + '/status', data); }
  cancelPTMBooking(id: string) { return this.api.delete('/meetings/bookings/' + id + '/cancel'); }

  // ── Payroll ───────────────────────────────────────────────────────────────
  getSalaryStructures() { return this.api.get('/payroll/structures'); }
  createSalaryStructure(data: any) { return this.api.post('/payroll/structures', data); }
  updateSalaryStructure(id: string, data: any) { return this.api.put('/payroll/structures/' + id, data); }
  deleteSalaryStructure(id: string) { return this.api.delete('/payroll/structures/' + id); }
  getStaffAssignments() { return this.api.get('/payroll/assignments'); }
  assignSalaryStructure(userId: string, data: any) { return this.api.put('/payroll/assignments/' + userId, data); }
  getPayrollRuns() { return this.api.get('/payroll/runs'); }
  createPayrollRun(data: any) { return this.api.post('/payroll/runs', data); }
  processPayrollRun(id: string) { return this.api.post('/payroll/runs/' + id + '/process', {}); }
  approvePayrollRun(id: string) { return this.api.put('/payroll/runs/' + id + '/approve', {}); }
  markPayrollPaid(id: string) { return this.api.put('/payroll/runs/' + id + '/mark-paid', {}); }
  getRunPayslips(runId: string) { return this.api.get('/payroll/runs/' + runId + '/payslips'); }
  getMyPayslips() { return this.api.get('/payroll/my-payslips'); }
  getP9Employees(params?: any) { return this.api.get('/payroll/p9-employees', { params }); }
  getP9Form(params: any) { return this.api.get('/payroll/p9', { params }); }

  // ── Advanced Accounting Reports ────────────────────────────────────────
  getTrialBalance(params?: any) { return this.api.get('/finance/reports/trial-balance', { params }); }
  getBalanceSheet(params?: any) { return this.api.get('/finance/reports/balance-sheet', { params }); }
  getGeneralLedger(params?: any) { return this.api.get('/finance/reports/general-ledger', { params }); }
  getJournals(params?: any) { return this.api.get('/finance/journals', { params }); }
  getJournalDetail(id: string) { return this.api.get('/finance/journals/' + id); }
  createJournal(data: any) { return this.api.post('/finance/journals', data); }

  // ── Staff Appraisals ──────────────────────────────────────────────────────
  getAppraisalTemplates() { return this.api.get('/appraisals/templates'); }
  createAppraisalTemplate(data: any) { return this.api.post('/appraisals/templates', data); }
  updateAppraisalTemplate(id: string, data: any) { return this.api.put('/appraisals/templates/' + id, data); }
  deleteAppraisalTemplate(id: string) { return this.api.delete('/appraisals/templates/' + id); }
  getAppraisals(params?: any) { return this.api.get('/appraisals', { params }); }
  createAppraisal(data: any) { return this.api.post('/appraisals', data); }
  updateAppraisal(id: string, data: any) { return this.api.put('/appraisals/' + id, data); }
  submitAppraisal(id: string) { return this.api.put('/appraisals/' + id + '/submit', {}); }
  acknowledgeAppraisal(id: string) { return this.api.put('/appraisals/' + id + '/acknowledge', {}); }

  // ── Substitute Teachers ───────────────────────────────────────────────────
  getSubstitutes(params?: any) { return this.api.get('/substitutes', { params }); }
  createSubstitute(data: any) { return this.api.post('/substitutes', data); }
  updateSubstituteStatus(id: string, data: any) { return this.api.put('/substitutes/' + id + '/status', data); }
  getAvailableTeachers(date: string) { return this.api.get('/substitutes/available-teachers', { params: { date } }); }

  // ── Counseling ────────────────────────────────────────────────────────────
  getCounselingSessions(params?: any) { return this.api.get('/counseling/sessions', { params }); }
  createCounselingSession(data: any) { return this.api.post('/counseling/sessions', data); }
  updateCounselingSession(id: string, data: any) { return this.api.put('/counseling/sessions/' + id, data); }
  resolveCounselingSession(id: string, data: any) { return this.api.put('/counseling/sessions/' + id + '/resolve', data); }
  getInterventions(params?: any) { return this.api.get('/counseling/interventions', { params }); }
  createIntervention(data: any) { return this.api.post('/counseling/interventions', data); }
  updateIntervention(id: string, data: any) { return this.api.put('/counseling/interventions/' + id, data); }
  resolveIntervention(id: string, data: any) { return this.api.put('/counseling/interventions/' + id + '/resolve', data); }
  getStudentCounselingHistory(studentId: string) { return this.api.get('/counseling/student/' + studentId); }
  getCounselingDashboard() { return this.api.get('/counseling/dashboard'); }

  // ── Hostel Management ─────────────────────────────────────────────────────
  getHostels() { return this.api.get('/hostel-mgmt/hostels'); }
  createHostel(data: any) { return this.api.post('/hostel-mgmt/hostels', data); }
  getHostelRooms(hostelId: string) { return this.api.get('/hostel-mgmt/hostels/' + hostelId + '/rooms'); }
  addHostelRoom(hostelId: string, data: any) { return this.api.post('/hostel-mgmt/hostels/' + hostelId + '/rooms', data); }
  getAllocations(params?: any) { return this.api.get('/hostel-mgmt/allocations', { params }); }
  allocateStudent(data: any) { return this.api.post('/hostel-mgmt/allocations', data); }
  checkoutStudent(id: string) { return this.api.put('/hostel-mgmt/allocations/' + id + '/checkout', {}); }
  getMovements(params?: any) { return this.api.get('/hostel-mgmt/movements', { params }); }
  logMovement(data: any) { return this.api.post('/hostel-mgmt/movements', data); }
  approveMovement(id: string) { return this.api.put('/hostel-mgmt/movements/' + id + '/approve', {}); }
  returnMovement(id: string) { return this.api.put('/hostel-mgmt/movements/' + id + '/return', {}); }
  getHostelOccupancy() { return this.api.get('/hostel-mgmt/occupancy'); }

  // ── Canteen ───────────────────────────────────────────────────────────────
  getMealPlans() { return this.api.get('/canteen/meal-plans'); }
  createMealPlan(data: any) { return this.api.post('/canteen/meal-plans', data); }
  updateMealPlan(id: string, data: any) { return this.api.put('/canteen/meal-plans/' + id, data); }
  getCanteenAccounts() { return this.api.get('/canteen/accounts'); }
  getStudentCanteenAccount(studentId: string) { return this.api.get('/canteen/accounts/student/' + studentId); }
  topUpCanteen(data: any) { return this.api.post('/canteen/accounts/topup', data); }
  canteenPurchase(data: any) { return this.api.post('/canteen/accounts/purchase', data); }
  getCanteenStock() { return this.api.get('/canteen/stock'); }
  addCanteenStock(data: any) { return this.api.post('/canteen/stock', data); }
  adjustCanteenStock(id: string, data: any) { return this.api.post('/canteen/stock/' + id + '/adjust', data); }
  getCanteenDailyReport(date?: string) { return this.api.get('/canteen/reports/daily', { params: { date } }); }

  // ── Bursary ───────────────────────────────────────────────────────────────
  getBursaryFunders() { return this.api.get('/bursary/funders'); }
  createBursaryFunder(data: any) { return this.api.post('/bursary/funders', data); }
  updateBursaryFunder(id: string, data: any) { return this.api.put('/bursary/funders/' + id, data); }
  getBursaries(params?: any) { return this.api.get('/bursary/bursaries', { params }); }
  createBursary(data: any) { return this.api.post('/bursary/bursaries', data); }
  updateBursary(id: string, data: any) { return this.api.put('/bursary/bursaries/' + id, data); }
  getBursaryApplications(params?: any) { return this.api.get('/bursary/applications', { params }); }
  createBursaryApplication(data: any) { return this.api.post('/bursary/applications', data); }
  reviewBursaryApplication(id: string, data: any) { return this.api.put('/bursary/applications/' + id + '/review', data); }
  disburseBursary(id: string) { return this.api.put('/bursary/applications/' + id + '/disburse', {}); }
  getBursaryStats() { return this.api.get('/bursary/stats'); }

  // ── Inventory ─────────────────────────────────────────────────────────────
  getInventoryCategories() { return this.api.get('/inventory/categories'); }
  createInventoryCategory(data: any) { return this.api.post('/inventory/categories', data); }
  updateInventoryCategory(id: string, data: any) { return this.api.put('/inventory/categories/' + id, data); }
  getInventoryItems(params?: any) { return this.api.get('/inventory/items', { params }); }
  createInventoryItem(data: any) { return this.api.post('/inventory/items', data); }
  updateInventoryItem(id: string, data: any) { return this.api.put('/inventory/items/' + id, data); }
  inventoryTransaction(id: string, data: any) { return this.api.post('/inventory/items/' + id + '/transaction', data); }
  getLowStockItems() { return this.api.get('/inventory/low-stock'); }
  getInventoryValuation() { return this.api.get('/inventory/valuation'); }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  getWhatsAppConfig() { return this.api.get('/whatsapp/config'); }
  saveWhatsAppConfig(data: any) { return this.api.put('/whatsapp/config', data); }
  testWhatsApp(data: any) { return this.api.post('/whatsapp/test', data); }
  sendWhatsApp(data: any) { return this.api.post('/whatsapp/send', data); }
  getWhatsAppLog(params?: any) { return this.api.get('/whatsapp/log', { params }); }
  getWhatsAppPhones(params: { target: string; class_id?: string }) { return this.api.get('/whatsapp/phones', { params }); }

  // ── SMS Keywords (Two-Way) ────────────────────────────────────────────────
  getSmsKeywords() { return this.api.get('/sms-keywords/keywords'); }
  createSmsKeyword(data: any) { return this.api.post('/sms-keywords/keywords', data); }
  updateSmsKeyword(id: string, data: any) { return this.api.put('/sms-keywords/keywords/' + id, data); }
  getInboundSmsLog() { return this.api.get('/sms-keywords/inbound-log'); }

  // ── Portfolio ─────────────────────────────────────────────────────────────
  getPortfolioItems(studentId: string) { return this.api.get('/portfolio/student/' + studentId); }
  addPortfolioItem(studentId: string, data: any) { return this.api.post('/portfolio/student/' + studentId, data); }
  updatePortfolioItem(id: string, data: any) { return this.api.put('/portfolio/' + id, data); }
  deletePortfolioItem(id: string) { return this.api.delete('/portfolio/' + id); }
  togglePortfolioFeature(id: string) { return this.api.put('/portfolio/' + id + '/feature', {}); }
  getPortfolioSummary(studentId: string) { return this.api.get('/portfolio/student/' + studentId + '/summary'); }

  // ── Term Reports ──────────────────────────────────────────────────────────
  getTermReportClass(classId: string, params?: any) { return this.api.get('/term-reports/class/' + classId, { params }); }
  getTermReportStudent(studentId: string, params?: any) { return this.api.get('/term-reports/student/' + studentId, { params }); }
  getTermReportSummary(params?: any) { return this.api.get('/term-reports/school-summary', { params }); }
  generateAllTermReports(data: any) { return this.api.post('/term-reports/generate-all', data); }

  // ── User Preferences ──────────────────────────────────────────────────────
  getUserPreference() { return this.api.get('/preferences'); }
  saveUserPreference(data: any) { return this.api.put('/preferences', data); }

}

export default new ApiService();
