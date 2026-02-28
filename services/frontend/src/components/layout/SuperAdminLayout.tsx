import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Menu,
  X,
  GraduationCap,
  User,
  Shield,
} from 'lucide-react';

const NAV = [
  { name: 'Dashboard',     href: '/superadmin/dashboard', icon: LayoutDashboard },
  { name: 'Tenant Schools',href: '/superadmin/tenants',   icon: Building2       },
  { name: 'My Profile',    href: '/superadmin/profile',   icon: User            },
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
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col',
        'bg-gray-950 border-r border-gray-800 shadow-2xl lg:shadow-none',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-900/40">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[14px] font-bold text-white leading-none tracking-tight">SkulManager</h1>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">SuperAdmin</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-md shadow-amber-900/30">
              {user?.email?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">
                {user?.email?.split('@')[0] || 'SuperAdmin'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Helvino Technologies Ltd</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon
                  className={cn('flex-shrink-0', isActive ? 'text-amber-400' : 'text-gray-500')}
                  style={{ height: 18, width: 18 }}
                />
                <span className="flex-1">{item.name}</span>
                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-gray-800 space-y-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut style={{ height: 18, width: 18 }} className="flex-shrink-0" />
            Sign Out
          </button>
          <p className="text-center text-[10px] text-gray-600">
            © {new Date().getFullYear()} Helvino Technologies Ltd
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h1 className="hidden lg:block text-sm font-semibold text-gray-900">Platform Management</h1>
              <span className="hidden lg:inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                <Shield className="h-2.5 w-2.5" />
                SuperAdmin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
