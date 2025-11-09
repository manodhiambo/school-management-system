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

// Auth context
function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Decode token or set mock user
      setUser({ id: '1', email: 'admin@school.com', role: 'admin' });
    }
    setLoading(false);
  }, []);

  const login = (email: string) => {
    setUser({ id: '1', email, role: 'admin' });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return { user, loading, login, logout };
}

function Layout() {
  const { logout } = useAuth();
  
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
                onClick={logout}
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

export default function App() {
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
        <Route path="/login" element={<LoginPage />} />
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

// Login wrapper to pass auth methods
function LoginPage() {
  const { login } = useAuth();
  return <Login onLogin={login} />;
}
