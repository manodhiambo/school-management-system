import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<div className="p-6">Students Page (Coming Soon)</div>} />
            <Route path="teachers" element={<div className="p-6">Teachers Page (Coming Soon)</div>} />
            <Route path="parents" element={<div className="p-6">Parents Page (Coming Soon)</div>} />
            <Route path="academic" element={<div className="p-6">Academic Page (Coming Soon)</div>} />
            <Route path="attendance" element={<div className="p-6">Attendance Page (Coming Soon)</div>} />
            <Route path="fee" element={<div className="p-6">Fee Page (Coming Soon)</div>} />
            <Route path="timetable" element={<div className="p-6">Timetable Page (Coming Soon)</div>} />
            <Route path="communication" element={<div className="p-6">Communication Page (Coming Soon)</div>} />
            <Route path="settings" element={<div className="p-6">Settings Page (Coming Soon)</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
