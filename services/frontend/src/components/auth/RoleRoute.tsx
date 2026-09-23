import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { getAllowedRoles } from '@/config/navigationItems';

interface RoleRouteProps {
  children: React.ReactNode;
  // Optional override for routes with no matching entry in navigationItems
  // (e.g. hidden/URL-only pages not exposed from the sidebar). When omitted,
  // the allowed roles are derived from navigationItems for the current path
  // so this can never drift from what the sidebar shows for that role - see
  // src/config/navigationItems.ts.
  allowedRoles?: string[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  const roles = allowedRoles ?? getAllowedRoles(pathname);

  if (roles && (!user?.role || !roles.includes(user.role))) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
