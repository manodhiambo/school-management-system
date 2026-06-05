import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { SchoolRegistrationPage } from './pages/SchoolRegistrationPage';

// SuperAdmin
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { TenantsPage } from './pages/superadmin/TenantsPage';
import { SuperAdminProfilePage } from './pages/superadmin/SuperAdminProfilePage';
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
import { MyTimetablePage } from './pages/student/MyTimetablePage';
import { AssignmentsPage } from './pages/student/AssignmentsPage';
import { MessagesPage } from './pages/student/MessagesPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { MyExamsPage } from './pages/student/MyExamsPage';
import { TakeExamPage } from './pages/student/TakeExamPage';
import { LearningMaterialsPage } from './pages/student/LearningMaterialsPage';

// Parent Pages
import { MyChildrenPage } from './pages/parent/MyChildrenPage';
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

// Shared Pages
import { ProfilePage } from './pages/settings/ProfilePage';

import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<SchoolRegistrationPage />} />

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
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="academic" element={<AcademicPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="fee" element={<FeePage />} />
              <Route path="fee-structure" element={<FeeStructurePage />} />
              <Route path="extra-fees" element={<ExtraFeesPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="communication" element={<CommunicationPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Finance Routes - Admin & Finance Officer */}
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="finance/transactions" element={<Transactions />} />
              <Route path="finance/budgets" element={<Budgets />} />
              <Route path="finance/vendors" element={<Vendors />} />
              <Route path="finance/bank-accounts" element={<BankAccounts />} />
              <Route path="finance/petty-cash" element={<PettyCash />} />
              <Route path="finance/assets" element={<Assets />} />
              <Route path="finance/reports" element={<Reports />} />
              <Route path="finance/financial-years" element={<FinancialYears />} />

              {/* Student Routes */}
              <Route path="my-courses" element={<MyCoursesPage />} />
              <Route path="my-attendance" element={<MyAttendancePage />} />
              <Route path="my-results" element={<MyResultsPage />} />
              <Route path="my-fees" element={<MyFeesPage />} />
              <Route path="my-timetable" element={<MyTimetablePage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="my-exams" element={<MyExamsPage />} />
              <Route path="take-exam/:examId" element={<TakeExamPage />} />
              <Route path="learning-materials" element={<LearningMaterialsPage />} />

              {/* Parent Routes */}
              <Route path="my-children" element={<MyChildrenPage />} />
              <Route path="children-progress" element={<ChildrenProgressPage />} />
              <Route path="fee-payments" element={<FeePaymentsPage />} />
              <Route path="my-transport" element={<MyTransportPage />} />

              {/* Teacher Routes */}
              <Route path="my-classes" element={<MyClassesPage />} />
              <Route path="gradebook" element={<GradeBookPage />} />
              <Route path="teacher-exams" element={<TeacherExamsPage />} />
              <Route path="my-checkin" element={<TeacherMyAttendancePage />} />

              {/* New Feature Routes — all 20 features */}
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="fee-reminders" element={<FeeRemindersPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="term-reports" element={<TermReportsPage />} />
              <Route path="nemis" element={<NemisPage />} />
              <Route path="exam-analytics" element={<ExamAnalyticsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="appraisals" element={<AppraisalPage />} />
              <Route path="substitutes" element={<SubstitutePage />} />
              <Route path="bursary" element={<BursaryPage />} />
              <Route path="canteen" element={<CanteenPage />} />
              <Route path="counseling" element={<CounselingPage />} />
              <Route path="hostel-management" element={<HostelManagementPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="sms-keywords" element={<SmsKeywordsPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />

              {/* Library Routes */}
              <Route path="library" element={<LibraryCatalogPage />} />
              <Route path="my-books" element={<MyBorrowingsPage />} />
              <Route path="library-management" element={<LibraryManagementPage />} />
              <Route path="library-borrowings" element={<BorrowingsPage />} />
              <Route path="library-members" element={<LibraryMembersPage />} />

              {/* IGCSE Module */}
              <Route path="igcse" element={<IgcsePage />} />

              {/* CBE Routes */}
              <Route path="cbc-analytics" element={<CbcAnalyticsPage />} />
              <Route path="cbe-analytics" element={<CbcAnalyticsPage />} />
              <Route path="curriculum" element={<CurriculumPage />} />
              <Route path="cbc-assessments" element={<CbcAssessmentPage />} />
              <Route path="cbc-report-cards" element={<CbcReportCardPage />} />
              <Route path="academic-calendar" element={<AcademicCalendarPage />} />

              {/* Discipline / Transport / Health */}
              <Route path="discipline" element={<DisciplinePage />} />
              <Route path="transport" element={<TransportPage />} />
              <Route path="transport-tracking" element={<TransportTrackingPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="staff-leave" element={<StaffLeavePage />} />

              {/* Teacher Check-in Admin */}
              <Route path="teacher-checkin" element={<TeacherCheckinAdminPage />} />

              {/* SMS Messaging */}
              <Route path="sms" element={<SMSPage />} />

              {/* Gate Management */}
              <Route path="gate-manager" element={<GateManagerPage />} />

              {/* Parent Alerts */}
              <Route path="my-alerts" element={<ParentAlertsPage />} />

              {/* Shared Routes */}
              <Route path="profile" element={<ProfilePage />} />

              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
