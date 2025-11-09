import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/students/StudentList';
import StudentProfile from './pages/students/StudentProfile';
import TeacherList from './pages/teachers/TeacherList';
import Attendance from './pages/attendance/Attendance';
import FeeManagement from './pages/fee/FeeManagement';
import Academic from './pages/academic/Academic';
import Timetable from './pages/timetable/Timetable';
import Communication from './pages/communication/Communication';
import Reports from './pages/reports/Reports';
import Settings from './pages/admin/Settings';
import AuditLogs from './pages/AuditLogs';
import Layout from './components/Layout';
import { useToast } from '@school/shared-ui';

function App() {
  const { user, loading } = useAuth();
  const { ToastContainer } = useToast();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route
          path="/*"
          element={
            user ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<StudentList />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  <Route path="/teachers" element={<TeacherList />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/fee" element={<FeeManagement />} />
                  <Route path="/academic" element={<Academic />} />
                  <Route path="/timetable" element={<Timetable />} />
                  <Route path="/communication" element={<Communication />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
