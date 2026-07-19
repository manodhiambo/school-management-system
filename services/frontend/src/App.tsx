import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { SchoolRegistrationPage } from './pages/SchoolRegistrationPage';
import { DocumentationPage } from './pages/public/DocumentationPage';
import { VideoTutorialsPage } from './pages/public/VideoTutorialsPage';
import { FAQPage } from './pages/public/FAQPage';
import { ContactSupportPage } from './pages/public/ContactSupportPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/public/TermsOfServicePage';
import { FeatureLandingPage } from './pages/public/FeatureLandingPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// SuperAdmin
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { TenantsPage } from './pages/superadmin/TenantsPage';
import { SuperAdminProfilePage } from './pages/superadmin/SuperAdminProfilePage';
import { SecurityPage } from './pages/superadmin/SecurityPage';
import { ProtectedSuperAdmin } from './components/auth/ProtectedSuperAdmin';

// Dashboard & Main Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { StudentReportPage } from './pages/students/StudentReportPage';
import { TeachersPage } from './pages/teachers/TeachersPage';
import { ParentsPage } from './pages/parents/ParentsPage';
import { AcademicPage } from './pages/academic/AcademicPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { FeePage } from './pages/fee/FeePage';
import { FeeStructurePage } from './pages/fee/FeeStructurePage';
import { ExtraFeesPage } from './pages/fee/ExtraFeesPage';
import { TimetablePage } from './pages/timetable/TimetablePage';
import { CommunicationPage } from './pages/communication/CommunicationPage';
import { UsersPage } from './pages/users/UsersPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Student Pages
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { MyAttendancePage } from './pages/student/MyAttendancePage';
import { MyResultsPage } from './pages/student/MyResultsPage';
import { MyFeesPage } from './pages/student/MyFeesPage';
import { MyReportCardPage } from './pages/student/MyReportCardPage';
import { MyTimetablePage } from './pages/student/MyTimetablePage';
import { AssignmentsPage } from './pages/student/AssignmentsPage';
import { MessagesPage } from './pages/student/MessagesPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { MyExamsPage } from './pages/student/MyExamsPage';
import { TakeExamPage } from './pages/student/TakeExamPage';
import { LearningMaterialsPage } from './pages/student/LearningMaterialsPage';

// Parent Pages
import { MyChildrenPage } from './pages/parent/MyChildrenPage';
import { ParentReportCardsPage } from './pages/parent/ParentReportCardsPage';
import { ChildrenProgressPage } from './pages/parent/ChildrenProgressPage';
import { FeePaymentsPage } from './pages/parent/FeePaymentsPage';
import { MyTransportPage } from './pages/parent/MyTransportPage';

// Teacher Pages
import { MyClassesPage } from './pages/teacher/MyClassesPage';
import { GradeBookPage } from './pages/teacher/GradeBookPage';
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage';
import { TeacherMyAttendancePage } from './pages/teacher/TeacherMyAttendancePage';

// New Feature Pages (20 features)
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { FeeRemindersPage } from './pages/admin/FeeRemindersPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { TermReportsPage } from './pages/admin/TermReportsPage';
import { NemisPage } from './pages/admin/NemisPage';
import { ExamAnalyticsPage } from './pages/academic/ExamAnalyticsPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { AppraisalPage } from './pages/staff/AppraisalPage';
import { SubstitutePage } from './pages/staff/SubstitutePage';
import { BursaryPage } from './pages/finance/BursaryPage';
import { CanteenPage } from './pages/welfare/CanteenPage';
import { CounselingPage } from './pages/welfare/CounselingPage';
import { HostelManagementPage } from './pages/welfare/HostelManagementPage';
import { RollCallPage } from './pages/welfare/RollCallPage';
import { LaundryPage } from './pages/welfare/LaundryPage';
import { DormitoryInspectionPage } from './pages/welfare/DormitoryInspectionPage';
import { HostelInventoryPage } from './pages/welfare/HostelInventoryPage';
import { WhatsAppPage } from './pages/communication/WhatsAppPage';
import { SmsKeywordsPage } from './pages/communication/SmsKeywordsPage';
import { PortfolioPage } from './pages/student/PortfolioPage';

// Library Pages
import { LibraryCatalogPage } from './pages/library/LibraryCatalogPage';
import { MyBorrowingsPage } from './pages/library/MyBorrowingsPage';
import { LibraryManagementPage } from './pages/library/LibraryManagementPage';
import { BorrowingsPage } from './pages/library/BorrowingsPage';
import { LibraryMembersPage } from './pages/library/LibraryMembersPage';

// Finance Pages
import {
  FinanceDashboard,
  Transactions,
  Budgets,
  Vendors,
  BankAccounts,
  PettyCash,
  Assets,
  Reports,
  AdvancedReports,
} from './pages/finance';
import FinancialYears from "./pages/finance/FinancialYears";

// IGCSE Module
import { IgcsePage } from './pages/academic/IgcsePage';

// CBE / Academic Pages
import { CbcAnalyticsPage } from './pages/academic/CbcAnalyticsPage';
import { CurriculumPage } from './pages/academic/CurriculumPage';
import { CbcAssessmentPage } from './pages/cbc/CbcAssessmentPage';
import { CbcReportCardPage } from './pages/cbc/CbcReportCardPage';
import { AcademicCalendarPage } from './pages/cbc/AcademicCalendarPage';

// Discipline / Transport / Health
import { DisciplinePage } from './pages/discipline/DisciplinePage';
import { TransportPage } from './pages/transport/TransportPage';
import { HealthPage } from './pages/health/HealthPage';
import { StaffLeavePage } from './pages/staff/StaffLeavePage';

// Parent Alerts
import { ParentAlertsPage } from './pages/parent/ParentAlertsPage';

// New features: Transport Tracking / Teacher Check-in / SMS
import { TransportTrackingPage } from './pages/transport/TransportTrackingPage';
import { TeacherCheckinAdminPage } from './pages/teacher/TeacherCheckinAdminPage';
import { SMSPage } from './pages/sms/SMSPage';

// Gate Management
import { GateManagerPage } from './pages/gate/GateManagerPage';

// Procurement Module
import {
  ProcurementDashboard,
  SupplierManagement,
  PurchaseRequisitions,
  RFQManagement,
  QuotationManagement,
  ProcurementOrders,
  ContractManagement,
  GoodsReceiptManagement,
  InvoiceManagement,
  SupplierPayments,
  ProcurementPlanning,
  ProcurementReports,
  ProcurementAuditPage,
  AssetManagement,
} from './pages/procurement';

// Shared Pages
import { ProfilePage } from './pages/settings/ProfilePage';

import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';
import { SoundNotificationProvider } from './components/notifications/SoundNotificationProvider';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ForbiddenToast() {
  const { toast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message || 'You do not have permission to perform this action.';
      toast({ title: 'Access Denied', description: msg, variant: 'destructive' });
    };
    window.addEventListener('api:forbidden', handler);
    return () => window.removeEventListener('api:forbidden', handler);
  }, [toast]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SoundNotificationProvider>
          <ForbiddenToast />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<SchoolRegistrationPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route path="/tutorials" element={<VideoTutorialsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactSupportPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/features/:slug" element={<FeatureLandingPage />} />

            {/* SuperAdmin routes */}
            <Route
              path="/superadmin"
              element={
                <ProtectedSuperAdmin>
                  <SuperAdminLayout />
                </ProtectedSuperAdmin>
              }
            >
              <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="profile" element={<SuperAdminProfilePage />} />
            </Route>

            {/* Protected dashboard area */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Admin & Teacher Routes */}
              <Route path="students" element={<StudentsPage />} />
              <Route path="student-report" element={<StudentReportPage />} />
              <Route path="teachers" element={<RoleRoute allowedRoles={['admin']}><TeachersPage /></RoleRoute>} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="academic" element={<AcademicPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="fee" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><FeePage /></RoleRoute>} />
              <Route path="fee-structure" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><FeeStructurePage /></RoleRoute>} />
              <Route path="extra-fees" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ExtraFeesPage /></RoleRoute>} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="communication" element={<RoleRoute allowedRoles={['admin']}><CommunicationPage /></RoleRoute>} />
              <Route path="users" element={<RoleRoute allowedRoles={['admin']}><UsersPage /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute allowedRoles={['admin']}><SettingsPage /></RoleRoute>} />

              {/* Finance Routes - Admin & Finance Officer */}
              <Route path="finance" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><FinanceDashboard /></RoleRoute>} />
              <Route path="finance/transactions" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><Transactions /></RoleRoute>} />
              <Route path="finance/budgets" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><Budgets /></RoleRoute>} />
              <Route path="finance/vendors" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><Vendors /></RoleRoute>} />
              <Route path="finance/bank-accounts" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><BankAccounts /></RoleRoute>} />
              <Route path="finance/petty-cash" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><PettyCash /></RoleRoute>} />
              <Route path="finance/assets" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><Assets /></RoleRoute>} />
              <Route path="finance/reports" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><Reports /></RoleRoute>} />
              <Route path="finance/financial-years" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><FinancialYears /></RoleRoute>} />
              <Route path="finance/advanced-reports" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><AdvancedReports /></RoleRoute>} />

              {/* Student Routes */}
              <Route path="my-courses" element={<MyCoursesPage />} />
              <Route path="my-attendance" element={<MyAttendancePage />} />
              <Route path="my-results" element={<MyResultsPage />} />
              <Route path="my-fees" element={<MyFeesPage />} />
              <Route path="my-report-card" element={<RoleRoute allowedRoles={['student']}><MyReportCardPage /></RoleRoute>} />
              <Route path="my-timetable" element={<MyTimetablePage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="my-exams" element={<MyExamsPage />} />
              <Route path="take-exam/:examId" element={<TakeExamPage />} />
              <Route path="learning-materials" element={<LearningMaterialsPage />} />

              {/* Parent Routes */}
              <Route path="my-children" element={<RoleRoute allowedRoles={['parent']}><MyChildrenPage /></RoleRoute>} />
              <Route path="children-progress" element={<RoleRoute allowedRoles={['parent']}><ChildrenProgressPage /></RoleRoute>} />
              <Route path="report-cards" element={<RoleRoute allowedRoles={['parent']}><ParentReportCardsPage /></RoleRoute>} />
              <Route path="fee-payments" element={<RoleRoute allowedRoles={['parent']}><FeePaymentsPage /></RoleRoute>} />
              <Route path="my-transport" element={<RoleRoute allowedRoles={['parent']}><MyTransportPage /></RoleRoute>} />

              {/* Teacher Routes */}
              <Route path="my-classes" element={<MyClassesPage />} />
              <Route path="gradebook" element={<GradeBookPage />} />
              <Route path="teacher-exams" element={<TeacherExamsPage />} />
              <Route path="my-checkin" element={<TeacherMyAttendancePage />} />

              {/* Shared & role-filtered feature routes */}
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="audit-log" element={<RoleRoute allowedRoles={['admin']}><AuditLogPage /></RoleRoute>} />
              <Route path="fee-reminders" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><FeeRemindersPage /></RoleRoute>} />
              <Route path="inventory" element={<RoleRoute allowedRoles={['admin']}><InventoryPage /></RoleRoute>} />
              <Route path="term-reports" element={<RoleRoute allowedRoles={['admin', 'teacher']}><TermReportsPage /></RoleRoute>} />
              <Route path="nemis" element={<RoleRoute allowedRoles={['admin']}><NemisPage /></RoleRoute>} />
              <Route path="exam-analytics" element={<ExamAnalyticsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="payroll" element={<RoleRoute allowedRoles={['admin', 'finance_officer', 'teacher']}><PayrollPage /></RoleRoute>} />
              <Route path="appraisals" element={<AppraisalPage />} />
              <Route path="substitutes" element={<RoleRoute allowedRoles={['admin']}><SubstitutePage /></RoleRoute>} />
              <Route path="bursary" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><BursaryPage /></RoleRoute>} />
              <Route path="canteen" element={<CanteenPage />} />
              <Route path="counseling" element={<CounselingPage />} />
              <Route path="hostel-management" element={<RoleRoute allowedRoles={['admin']}><HostelManagementPage /></RoleRoute>} />
              <Route path="hostel-roll-call" element={<RoleRoute allowedRoles={['admin']}><RollCallPage /></RoleRoute>} />
              <Route path="hostel-laundry" element={<RoleRoute allowedRoles={['admin']}><LaundryPage /></RoleRoute>} />
              <Route path="hostel-inspections" element={<RoleRoute allowedRoles={['admin']}><DormitoryInspectionPage /></RoleRoute>} />
              <Route path="hostel-inventory" element={<RoleRoute allowedRoles={['admin']}><HostelInventoryPage /></RoleRoute>} />
              <Route path="whatsapp" element={<RoleRoute allowedRoles={['admin']}><WhatsAppPage /></RoleRoute>} />
              <Route path="sms-keywords" element={<RoleRoute allowedRoles={['admin']}><SmsKeywordsPage /></RoleRoute>} />
              <Route path="portfolio" element={<PortfolioPage />} />

              {/* Library Routes */}
              <Route path="library" element={<LibraryCatalogPage />} />
              <Route path="my-books" element={<MyBorrowingsPage />} />
              <Route path="library-management" element={<RoleRoute allowedRoles={['admin']}><LibraryManagementPage /></RoleRoute>} />
              <Route path="library-borrowings" element={<RoleRoute allowedRoles={['admin']}><BorrowingsPage /></RoleRoute>} />
              <Route path="library-members" element={<RoleRoute allowedRoles={['admin']}><LibraryMembersPage /></RoleRoute>} />

              {/* IGCSE Module */}
              <Route path="igcse" element={<IgcsePage />} />

              {/* CBE Routes */}
              <Route path="cbc-analytics" element={<CbcAnalyticsPage />} />
              <Route path="cbe-analytics" element={<CbcAnalyticsPage />} />
              <Route path="curriculum" element={<RoleRoute allowedRoles={['admin']}><CurriculumPage /></RoleRoute>} />
              <Route path="cbc-assessments" element={<CbcAssessmentPage />} />
              <Route path="cbc-report-cards" element={<CbcReportCardPage />} />
              <Route path="academic-calendar" element={<AcademicCalendarPage />} />

              {/* Discipline / Transport / Health */}
              <Route path="discipline" element={<DisciplinePage />} />
              <Route path="transport" element={<RoleRoute allowedRoles={['admin']}><TransportPage /></RoleRoute>} />
              <Route path="transport-tracking" element={<RoleRoute allowedRoles={['admin']}><TransportTrackingPage /></RoleRoute>} />
              <Route path="health" element={<HealthPage />} />
              <Route path="staff-leave" element={<StaffLeavePage />} />

              {/* Teacher Check-in Admin */}
              <Route path="teacher-checkin" element={<RoleRoute allowedRoles={['admin']}><TeacherCheckinAdminPage /></RoleRoute>} />

              {/* SMS Messaging */}
              <Route path="sms" element={<RoleRoute allowedRoles={['admin', 'teacher']}><SMSPage /></RoleRoute>} />

              {/* Gate Management */}
              <Route path="gate-manager" element={<RoleRoute allowedRoles={['admin', 'security']}><GateManagerPage /></RoleRoute>} />

              {/* Procurement Module */}
              <Route path="procurement" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ProcurementDashboard /></RoleRoute>} />
              <Route path="procurement/suppliers" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><SupplierManagement /></RoleRoute>} />
              <Route path="procurement/requisitions" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><PurchaseRequisitions /></RoleRoute>} />
              <Route path="procurement/rfqs" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><RFQManagement /></RoleRoute>} />
              <Route path="procurement/quotations" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><QuotationManagement /></RoleRoute>} />
              <Route path="procurement/orders" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ProcurementOrders /></RoleRoute>} />
              <Route path="procurement/contracts" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ContractManagement /></RoleRoute>} />
              <Route path="procurement/grn" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><GoodsReceiptManagement /></RoleRoute>} />
              <Route path="procurement/invoices" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><InvoiceManagement /></RoleRoute>} />
              <Route path="procurement/payments" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><SupplierPayments /></RoleRoute>} />
              <Route path="procurement/planning" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ProcurementPlanning /></RoleRoute>} />
              <Route path="procurement/reports" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ProcurementReports /></RoleRoute>} />
              <Route path="procurement/audit" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><ProcurementAuditPage /></RoleRoute>} />
              <Route path="procurement/assets" element={<RoleRoute allowedRoles={['admin', 'finance_officer']}><AssetManagement /></RoleRoute>} />

              {/* Parent Alerts */}
              <Route path="my-alerts" element={<RoleRoute allowedRoles={['parent']}><ParentAlertsPage /></RoleRoute>} />

              {/* Shared Routes */}
              <Route path="profile" element={<ProfilePage />} />

              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Route>

            {/* Top-level catch-all for unmatched public URLs */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </SoundNotificationProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
