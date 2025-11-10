import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentListPage from './pages/students/StudentListPage';
import StudentProfilePage from './pages/students/StudentProfilePage';
import TeacherListPage from './pages/teachers/TeacherListPage';
import AttendancePage from './pages/attendance/AttendancePage';
import FeeManagementPage from './pages/fee/FeeManagementPage';
import AcademicPage from './pages/academic/AcademicPage';
import TimetablePage from './pages/timetable/TimetablePage';
import CommunicationPage from './pages/communication/CommunicationPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import InventoryPage from './pages/InventoryPage';
import PayrollPage from './pages/PayrollPage';
import AuditLogsPage from './pages/AuditLogsPage';
import { useAuth } from '@school/shared-ui';
import './App.css';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<DashboardPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/:id" element={<StudentProfilePage />} />
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
