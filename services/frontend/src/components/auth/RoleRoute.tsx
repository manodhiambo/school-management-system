import { useAuthStore } from '@/store/authStore';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user } = useAuthStore();

  if (!user?.role || !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
