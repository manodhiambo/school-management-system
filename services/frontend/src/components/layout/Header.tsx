import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, User, Settings, ChevronRight, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

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
    } catch {
      /* silent */
    }
  };

  const handleBellClick = async () => {
    setShowUserMenu(false);
    setShowNotifs((prev) => !prev);
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
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* silent */
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const getRoleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-red-500',
      teacher: 'bg-blue-500',
      student: 'bg-green-500',
      parent: 'bg-purple-500',
      finance_officer: 'bg-yellow-500',
    };
    return map[role] ?? 'bg-gray-500';
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const initials = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 z-30">
      {/* Left: welcome */}
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Welcome,{' '}
          <span className="text-primary">{user?.email?.split('@')[0]}</span>
        </h2>
      </div>

      {/* Right: icons */}
      <div className="flex items-center space-x-2">

        {/* ── BELL ── */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBellClick}
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkOneRead(notif.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notif.is_read ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${!notif.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notif.title || notif.message}
                        </p>
                        {notif.title && notif.message && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-4 py-2 bg-gray-50">
                <button
                  onClick={() => { setShowNotifs(false); navigate('/app/notifications'); }}
                  className="flex items-center justify-center gap-1 w-full text-xs text-blue-600 hover:text-blue-800 font-medium py-1"
                >
                  View all notifications
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── USER MENU ── */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowNotifs(false); setShowUserMenu((prev) => !prev); }}
            className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRoleColor(user?.role ?? '')}`}>
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400 capitalize leading-none mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1">
              {/* Identity header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
              </div>

              <button
                onClick={() => { setShowUserMenu(false); navigate('/app/profile'); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 text-gray-400" />
                My Profile
              </button>

              <button
                onClick={() => { setShowUserMenu(false); navigate('/app/settings'); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </button>

              <div className="border-t my-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
