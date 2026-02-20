import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Superadmin has their own area
  if (user?.role === 'superadmin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return <>{children}</>;
}
