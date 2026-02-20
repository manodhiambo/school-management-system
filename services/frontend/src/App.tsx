import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';

// Dashboard & Main Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { TeachersPage } from './pages/teachers/TeachersPage';
import { ParentsPage } from './pages/parents/ParentsPage';
import { AcademicPage } from './pages/academic/AcademicPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { FeePage } from './pages/fee/FeePage';
import { FeeStructurePage } from './pages/fee/FeeStructurePage';
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

// Parent Pages
import { MyChildrenPage } from './pages/parent/MyChildrenPage';
import { ChildrenProgressPage } from './pages/parent/ChildrenProgressPage';
import { FeePaymentsPage } from './pages/parent/FeePaymentsPage';

// Teacher Pages
import { MyClassesPage } from './pages/teacher/MyClassesPage';
import { GradeBookPage } from './pages/teacher/GradeBookPage';
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage';

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

// CBC / Academic Pages
import { CbcAnalyticsPage } from './pages/academic/CbcAnalyticsPage';
import { CurriculumPage } from './pages/academic/CurriculumPage';

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
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="academic" element={<AcademicPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="fee" element={<FeePage />} />
              <Route path="fee-structure" element={<FeeStructurePage />} />
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

              {/* Parent Routes */}
              <Route path="my-children" element={<MyChildrenPage />} />
              <Route path="children-progress" element={<ChildrenProgressPage />} />
              <Route path="fee-payments" element={<FeePaymentsPage />} />

              {/* Teacher Routes */}
              <Route path="my-classes" element={<MyClassesPage />} />
              <Route path="gradebook" element={<GradeBookPage />} />
              <Route path="teacher-exams" element={<TeacherExamsPage />} />

              {/* Library Routes */}
              <Route path="library" element={<LibraryCatalogPage />} />
              <Route path="my-books" element={<MyBorrowingsPage />} />
              <Route path="library-management" element={<LibraryManagementPage />} />
              <Route path="library-borrowings" element={<BorrowingsPage />} />
              <Route path="library-members" element={<LibraryMembersPage />} />

              {/* CBC Routes */}
              <Route path="cbc-analytics" element={<CbcAnalyticsPage />} />
              <Route path="curriculum" element={<CurriculumPage />} />

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
