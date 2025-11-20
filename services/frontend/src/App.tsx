import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { TeachersPage } from './pages/teachers/TeachersPage';
import { ParentsPage } from './pages/parents/ParentsPage';
import { AcademicPage } from './pages/academic/AcademicPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { FeePage } from './pages/fee/FeePage';
import { TimetablePage } from './pages/timetable/TimetablePage';
import { CommunicationPage } from './pages/communication/CommunicationPage';
import { UsersPage } from './pages/users/UsersPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';

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

            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

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
              <Route path="students" element={<StudentsPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="academic" element={<AcademicPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="fee" element={<FeePage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="communication" element={<CommunicationPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Route>

          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
