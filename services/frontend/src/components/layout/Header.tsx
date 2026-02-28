import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, LogOut, User, Settings, ChevronRight, CheckCheck,
  Menu, GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const pageTitles: Record<string, string> = {
  '/app/dashboard':               'Dashboard',
  '/app/students':                'Students',
  '/app/teachers':                'Teachers',
  '/app/parents':                 'Parents',
  '/app/academic':                'Academic',
  '/app/attendance':              'Attendance',
  '/app/finance':                 'Finance Overview',
  '/app/finance/transactions':    'Income & Expenses',
  '/app/finance/budgets':         'Budgets',
  '/app/finance/vendors':         'Vendors & Purchase Orders',
  '/app/finance/bank-accounts':   'Bank Accounts',
  '/app/finance/petty-cash':      'Petty Cash',
  '/app/finance/assets':          'Assets',
  '/app/finance/reports':         'Financial Reports',
  '/app/finance/financial-years': 'Financial Years',
  '/app/fee':                     'Fee Management',
  '/app/fee-structure':           'Fee Structure',
  '/app/timetable':               'Timetable',
  '/app/communication':           'Communication',
  '/app/users':                   'User Management',
  '/app/cbc-analytics':           'CBC Analytics',
  '/app/curriculum':              'CBC Curriculum',
  '/app/settings':                'Settings',
  '/app/my-exams':                'My Exams',
  '/app/my-courses':              'My Courses',
  '/app/my-attendance':           'My Attendance',
  '/app/my-results':              'My Results',
  '/app/my-fees':                 'My Fees',
  '/app/my-timetable':            'My Timetable',
  '/app/assignments':             'Assignments',
  '/app/messages':                'Messages',
  '/app/my-children':             'My Children',
  '/app/children-progress':       "Children's Progress",
  '/app/fee-payments':            'Fee Payments',
  '/app/notifications':           'Notifications',
  '/app/my-classes':              'My Classes',
  '/app/gradebook':               'Grade Book',
  '/app/teacher-exams':           'Exams Manager',
  '/app/library-members':         'Library Members',
  '/app/library':                 'Library Catalog',
  '/app/my-books':                'My Borrowed Books',
  '/app/library-management':      'Library Management',
  '/app/library-borrowings':      'Issue / Return Books',
  '/app/profile':                 'My Profile',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path + '/')) return title;
  }
  return 'Dashboard';
}

function getRoleColor(role: string) {
  const map: Record<string, string> = {
    admin:           'bg-rose-500',
    teacher:         'bg-blue-500',
    student:         'bg-emerald-500',
    parent:          'bg-purple-500',
    finance_officer: 'bg-amber-500',
  };
  return map[role] ?? 'bg-gray-500';
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  /* ── Notification state ── */
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  /* ── User menu state ── */
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* ── Close dropdowns when clicking outside ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Poll unread count every 60 s ── */
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res: any = await api.getUnreadNotificationCount();
      setUnreadCount(Number(res?.data?.count ?? res?.count ?? 0));
    } catch { /* silent */ }
  };

  const handleBellClick = async () => {
    setShowUserMenu(false);
    setShowNotifs(prev => !prev);
    if (!showNotifs) {
      setNotifsLoading(true);
      try {
        const res: any = await api.getNotifications();
        const list: any[] = res?.data || res?.notifications || [];
        setNotifications(list.slice(0, 8));
      } catch {
        setNotifications([]);
      } finally {
        setNotifsLoading(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* silent */ }
    finally { clearAuth(); navigate('/login'); }
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const initials = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 z-30">

      {/* ── Left ── */}
      <div className="flex items-center gap-3">
        {/* Hamburger (mobile only) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile brand logo (shown when sidebar is hidden) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">SkulManager</span>
        </div>

        {/* Desktop page title */}
        <div className="hidden lg:block">
          <h1 className="text-base font-semibold text-gray-900 leading-none">{pageTitle}</h1>
          <p className="text-[11px] text-gray-400 leading-none mt-0.5">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-1">

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-100 z-50 overflow-hidden">
              {/* Dropdown header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
                <div>
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-5 w-5 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                    <p className="text-xs text-gray-400 mt-0.5">No new notifications</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkOneRead(notif.id)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50',
                        !notif.is_read && 'bg-indigo-50/50'
                      )}
                    >
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-2 flex-shrink-0',
                        notif.is_read ? 'bg-gray-200' : 'bg-indigo-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm leading-snug',
                          notif.is_read ? 'text-gray-600' : 'font-semibold text-gray-900'
                        )}>
                          {notif.title || notif.message}
                        </p>
                        {notif.title && notif.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.message}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => { setShowNotifs(false); navigate('/app/notifications'); }}
                  className="flex items-center justify-center gap-1 w-full text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-0.5 transition-colors"
                >
                  View all notifications
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 mx-1" />

        {/* User avatar & menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowNotifs(false); setShowUserMenu(prev => !prev); }}
            className="flex items-center gap-2.5 rounded-xl pl-1 pr-2.5 py-1 hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm',
              getRoleColor(user?.role ?? '')
            )}>
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-gray-400 capitalize leading-none mt-0.5">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-100 z-50 overflow-hidden">
              {/* Identity */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                    getRoleColor(user?.role ?? '')
                  )}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[11px] text-gray-500 capitalize mt-0.5">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/app/profile'); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  My Profile
                </button>

                <button
                  onClick={() => { setShowUserMenu(false); navigate('/app/settings'); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Settings className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  Settings
                </button>

                <div className="mx-4 my-1 border-t border-gray-100" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center">
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
