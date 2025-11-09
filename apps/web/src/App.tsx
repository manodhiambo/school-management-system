import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import { Toaster } from '@school/shared-ui';

// Simple auth hook for now
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check
    setTimeout(() => {
      // setUser({ id: '1', email: 'admin@school.com', role: 'admin' }); // Uncomment to simulate logged in
      setLoading(false);
    }, 500);
  }, []);

  return { user, loading };
}

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">School Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/students" className="text-gray-600 hover:text-gray-900">Students</a>
              <a href="/teachers" className="text-gray-600 hover:text-gray-900">Teachers</a>
              <button 
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  window.location.href = '/login';
                }} 
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
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
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
