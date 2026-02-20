import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface Props {
  children: React.ReactNode;
}

export function ProtectedSuperAdmin({ children }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'superadmin') {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
