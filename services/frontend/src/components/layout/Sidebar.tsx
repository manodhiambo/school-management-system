import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { X, ChevronRight, GraduationCap } from 'lucide-react';
import { navigationItems } from '@/config/navigationItems';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const { t } = useLanguageStore();
  const userRole = user?.role || 'admin';

  const superadminReturnToken = sessionStorage.getItem('superadmin_return_token');
  const superadminReturnUserRaw = sessionStorage.getItem('superadmin_return_user');

  const handleReturnToSuperAdmin = () => {
    if (superadminReturnToken && superadminReturnUserRaw) {
      try {
        const superUser = JSON.parse(superadminReturnUserRaw);
        sessionStorage.removeItem('superadmin_return_token');
        sessionStorage.removeItem('superadmin_return_user');
        setAuth(superUser, superadminReturnToken, true);
        navigate('/superadmin/dashboard');
      } catch { /* ignore */ }
    }
  };

  const disabledModules = user?.disabled_modules || [];
  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(userRole) && (!item.module || !disabledModules.includes(item.module))
  );

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      admin:           'bg-rose-500',
      teacher:         'bg-blue-500',
      student:         'bg-emerald-500',
      parent:          'bg-purple-500',
      finance_officer: 'bg-amber-500',
      superadmin:      'bg-yellow-400',
      driver:          'bg-orange-500',
      security:        'bg-slate-500',
      technician:      'bg-cyan-500',
      alumni:          'bg-indigo-500',
    };
    return map[role] ?? 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'finance_officer') return 'Finance Officer';
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'security') return 'Security Officer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col',
          'bg-white border-r border-gray-200 shadow-2xl lg:shadow-none',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Brand / Logo ── */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-200">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-none tracking-tight">
                SkulManager
              </h1>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5 font-medium">
                School Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── SuperAdmin impersonation banner ── */}
        {superadminReturnToken && (
          <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[11px] text-amber-700 font-semibold">Viewing as tenant admin</p>
            </div>
            <button
              onClick={handleReturnToSuperAdmin}
              className="flex items-center justify-center gap-1.5 w-full text-xs bg-amber-500 text-white rounded-lg py-1.5 font-semibold hover:bg-amber-600 transition-colors"
            >
              Return to SuperAdmin
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {filteredNavigation.map((item, index) => {
            const prevSection = index > 0 ? filteredNavigation[index - 1].section : '__start__';
            const showHeader = item.section !== '' && item.section !== prevSection;
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/app/dashboard' && location.pathname.startsWith(item.href + '/'));

            return (
              <div key={item.name}>
                {showHeader && (
                  <div className="pt-5 pb-1.5 px-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t(item.section)}
                    </span>
                  </div>
                )}
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4.5 w-4.5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-indigo-600'
                        : 'text-gray-400 group-hover:text-gray-600'
                    )}
                    style={{ height: 18, width: 18 }}
                  />
                  <span className="flex-1 leading-none">{t(item.name)}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold leading-none">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* ── User profile + footer ── */}
        <div className="flex-shrink-0 border-t border-gray-100 p-3 space-y-3">
          <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-50 transition-colors cursor-default">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                getRoleBadgeColor(userRole)
              )}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-none">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-none">
                {getRoleLabel(userRole)}
              </p>
            </div>
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-[10px] text-gray-400">
              © {new Date().getFullYear()} ·{' '}
              <a
                href="https://helvino.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-600 transition-colors font-medium"
              >
                Helvino Technologies
              </a>
            </p>
            <a
              href="tel:0110421320"
              className="block text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              0110 421 320
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
