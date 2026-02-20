import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  User,
  ChevronRight,
} from 'lucide-react';

const NAV = [
  { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
  { name: 'Tenant Schools', href: '/superadmin/tenants', icon: Building2 },
  { name: 'My Profile', href: '/superadmin/profile', icon: User },
];

export function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-gray-900 transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center px-4 border-b border-gray-800">
          <GraduationCap className="h-7 w-7 mr-2 text-yellow-400" />
          <div>
            <p className="text-sm font-bold text-white leading-none">Skul Manager</p>
            <p className="text-[11px] text-yellow-400 mt-0.5 font-semibold">SUPERADMIN</p>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-gray-900">
                {user?.email?.charAt(0).toUpperCase() || 'S'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-yellow-400">Helvino Technologies Ltd</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-yellow-500 text-gray-900' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <div className="flex items-center">
                  <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-gray-900' : 'text-gray-400')} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
          <div className="text-center pt-1">
            <p className="text-[10px] text-gray-600">© {new Date().getFullYear()} Helvino Technologies Ltd</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
              SUPERADMIN
            </span>
            <span className="text-sm text-gray-600">Helvino Technologies Limited</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/superadmin/profile" className="text-sm text-gray-600 hover:text-gray-900">
              {user?.email}
            </Link>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
