// apps/web/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PrivateRoute } from './components/PrivateRoute';
import { RoleBasedRoute } from './components/RoleBasedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        
        {/* Role-based Routes */}
        <Route
          path="/admin/*"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <AdminRoutes />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/teacher/*"
          element={
            <RoleBasedRoute allowedRoles={['teacher']}>
              <TeacherRoutes />
            </RoleBasedRoute>
          }
        />
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// apps/web/src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// apps/web/src/components/RoleBasedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '@school/shared-types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: User['role'][];
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(userStr) as User;
  return allowedRoles.includes(user.role) ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};
