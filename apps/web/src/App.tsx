import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PrivateRoute } from './components/PrivateRoute';
import { RoleBasedRoute } from './components/RoleBasedRoute';
import { StudentsPage } from './pages/admin/StudentsPage';
import { TeachersPage } from './pages/admin/TeachersPage';
import { AttendancePage } from './pages/teacher/AttendancePage';
import { GradesPage } from './pages/teacher/GradesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <DashboardPage />
            </RoleBasedRoute>
          } />
          <Route path="/admin/students" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <StudentsPage />
            </RoleBasedRoute>
          } />
          <Route path="/admin/teachers" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <TeachersPage />
            </RoleBasedRoute>
          } />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={
            <RoleBasedRoute allowedRoles={['teacher']}>
              <DashboardPage />
            </RoleBasedRoute>
          } />
          <Route path="/teacher/attendance" element={
            <RoleBasedRoute allowedRoles={['teacher']}>
              <AttendancePage />
            </RoleBasedRoute>
          } />
          <Route path="/teacher/grades" element={
            <RoleBasedRoute allowedRoles={['teacher']}>
              <GradesPage />
            </RoleBasedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
