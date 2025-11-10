import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { StudentListPage } from './pages/students/StudentListPage';
import { TeacherListPage } from './pages/TeacherListPage';
import { AttendancePage } from './pages/AttendancePage';
import { FeeManagementPage } from './pages/FeeManagementPage';
import { AcademicPage } from './pages/AcademicPage';
import { TimetablePage } from './pages/TimetablePage';
import { CommunicationPage } from './pages/CommunicationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PayrollPage } from './pages/PayrollPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="teachers" element={<TeacherListPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fee" element={<FeeManagementPage />} />
          <Route path="academic" element={<AcademicPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
