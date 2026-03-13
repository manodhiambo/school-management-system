import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Calendar,
  DollarSign,
  Clock,
  MessageSquare,
  Settings,
  X,
  Shield,
  Award,
  User,
  FileText,
  Bell,
  TrendingUp,
  Library,
  Wallet,
  Receipt,
  CreditCard,
  Building2,
  Monitor,
  BarChart2,
  ListChecks,
  ChevronRight,
  Bus,
  Heart,
  AlertTriangle,
  ClipboardList,
  CalendarDays,
  BookMarked,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  section: string;
  badge?: string;
};

const navigationItems: NavItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student', 'parent', 'finance_officer'], section: '' },

  // ── People ────────────────────────────────────────────────────────────────
  { name: 'Students',        href: '/app/students',  icon: Users,         roles: ['admin', 'teacher'],                    section: 'People' },
  { name: 'Teachers',        href: '/app/teachers',  icon: GraduationCap, roles: ['admin'],                               section: 'People' },
  { name: 'Parents',         href: '/app/parents',   icon: UserCheck,     roles: ['admin', 'teacher'],                    section: 'People' },
  { name: 'User Management', href: '/app/users',     icon: Shield,        roles: ['admin'],                               section: 'People' },

  // ── Academic (admin / teacher) ────────────────────────────────────────────
  { name: 'Academic',           href: '/app/academic',         icon: BookOpen,      roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'Attendance',         href: '/app/attendance',       icon: Calendar,      roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'CBC Assessments',    href: '/app/cbc-assessments',  icon: ClipboardList, roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'CBC Report Cards',   href: '/app/cbc-report-cards', icon: BookMarked,    roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'CBC Analytics',      href: '/app/cbc-analytics',    icon: BarChart2,     roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'CBC Curriculum',     href: '/app/curriculum',       icon: GraduationCap, roles: ['admin'],            section: 'Academic' },
  { name: 'Academic Calendar',  href: '/app/academic-calendar',icon: CalendarDays,  roles: ['admin'],            section: 'Academic' },

  // ── Academic (teacher) ────────────────────────────────────────────────────
  { name: 'My Classes',    href: '/app/my-classes',   icon: Users,      roles: ['teacher'], section: 'Academic' },
  { name: 'Grade Book',    href: '/app/gradebook',    icon: Award,      roles: ['teacher'], section: 'Academic' },
  { name: 'Exams Manager', href: '/app/teacher-exams',icon: ListChecks, roles: ['teacher'], section: 'Academic' },

  // ── Academic (student) ────────────────────────────────────────────────────
  { name: 'My Exams',      href: '/app/my-exams',      icon: Monitor,  roles: ['student'], section: 'Academic' },
  { name: 'My Courses',    href: '/app/my-courses',    icon: BookOpen, roles: ['student'], section: 'Academic' },
  { name: 'My Attendance', href: '/app/my-attendance', icon: Calendar, roles: ['student'], section: 'Academic' },
  { name: 'My Results',    href: '/app/my-results',    icon: Award,    roles: ['student'], section: 'Academic' },

  // ── Finance ───────────────────────────────────────────────────────────────
  { name: 'Finance Overview',  href: '/app/finance',                  icon: Wallet,    roles: ['admin', 'finance_officer'], section: 'Finance', badge: 'New' },
  { name: 'Income & Expenses', href: '/app/finance/transactions',     icon: Receipt,   roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Budgets',           href: '/app/finance/budgets',          icon: TrendingUp,roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Vendors & POs',     href: '/app/finance/vendors',          icon: Building2, roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Bank Accounts',     href: '/app/finance/bank-accounts',    icon: CreditCard,roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Petty Cash',        href: '/app/finance/petty-cash',       icon: DollarSign,roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Assets',            href: '/app/finance/assets',           icon: Building2, roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Financial Reports', href: '/app/finance/reports',          icon: FileText,  roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Financial Years',   href: '/app/finance/financial-years',  icon: Calendar,  roles: ['admin', 'finance_officer'], section: 'Finance' },
  { name: 'Fee Management',    href: '/app/fee',                      icon: DollarSign,roles: ['admin'],                    section: 'Finance' },
  { name: 'Fee Structure',     href: '/app/fee-structure',            icon: DollarSign,roles: ['admin'],                    section: 'Finance' },
  { name: 'My Fees',           href: '/app/my-fees',                  icon: DollarSign,roles: ['student'],                  section: 'Finance' },

  // ── Family (parent) ───────────────────────────────────────────────────────
  { name: 'My Children',       href: '/app/my-children',       icon: Users,         roles: ['parent'], section: 'Family' },
  { name: 'Children Progress', href: '/app/children-progress', icon: TrendingUp,    roles: ['parent'], section: 'Family' },
  { name: 'Fee Payments',      href: '/app/fee-payments',      icon: DollarSign,    roles: ['parent'], section: 'Family' },
  { name: 'My Alerts',         href: '/app/my-alerts',         icon: Bell,          roles: ['parent'], section: 'Family' },

  // ── Schedule ──────────────────────────────────────────────────────────────
  { name: 'Timetable',    href: '/app/timetable',    icon: Clock,    roles: ['admin', 'teacher'],           section: 'Schedule' },
  { name: 'My Timetable', href: '/app/my-timetable', icon: Clock,    roles: ['student', 'teacher'],         section: 'Schedule' },
  { name: 'Assignments',  href: '/app/assignments',  icon: FileText, roles: ['student', 'teacher'],         section: 'Schedule' },

  // ── Communication ─────────────────────────────────────────────────────────
  { name: 'Communication', href: '/app/communication', icon: MessageSquare, roles: ['admin', 'teacher'],          section: 'Messages' },
  { name: 'Messages',      href: '/app/messages',      icon: MessageSquare, roles: ['student'],                   section: 'Messages' },
  { name: 'Notifications', href: '/app/notifications', icon: Bell,          roles: ['parent', 'student'],         section: 'Messages' },

  // ── Student Welfare ───────────────────────────────────────────────────────
  { name: 'Discipline',  href: '/app/discipline', icon: AlertTriangle, roles: ['admin', 'teacher'], section: 'Welfare' },
  { name: 'Health',      href: '/app/health',     icon: Heart,         roles: ['admin', 'teacher'], section: 'Welfare' },
  { name: 'Transport',   href: '/app/transport',  icon: Bus,           roles: ['admin'],            section: 'Welfare' },

  // ── Library ───────────────────────────────────────────────────────────────
  { name: 'Library Catalog',    href: '/app/library',            icon: Library,  roles: ['admin', 'teacher', 'student', 'parent'], section: 'Library' },
  { name: 'My Borrowed Books',  href: '/app/my-books',           icon: BookOpen, roles: ['teacher', 'student'],                    section: 'Library' },
  { name: 'Issue / Return',     href: '/app/library-borrowings', icon: BookOpen, roles: ['admin', 'teacher'],                      section: 'Library' },
  { name: 'Library Management', href: '/app/library-management', icon: Library,  roles: ['admin'],                                 section: 'Library' },
  { name: 'Library Members',    href: '/app/library-members',    icon: Users,    roles: ['admin'],                                 section: 'Library' },

  // ── Account ───────────────────────────────────────────────────────────────
  { name: 'Settings',   href: '/app/settings', icon: Settings, roles: ['admin'], section: 'Account' },
  { name: 'My Profile', href: '/app/profile',  icon: User,     roles: ['admin', 'teacher', 'student', 'parent', 'finance_officer'], section: 'Account' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
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

  const filteredNavigation = navigationItems.filter(item => item.roles.includes(userRole));

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      admin:           'bg-rose-500',
      teacher:         'bg-blue-500',
      student:         'bg-emerald-500',
      parent:          'bg-purple-500',
      finance_officer: 'bg-amber-500',
      superadmin:      'bg-yellow-400',
    };
    return map[role] ?? 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'finance_officer') return 'Finance Officer';
    if (role === 'superadmin') return 'Super Admin';
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
                      {item.section}
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
                  <span className="flex-1 leading-none">{item.name}</span>
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
                href="mailto:helvinotechltd@gmail.com"
                className="text-indigo-400 hover:text-indigo-600 transition-colors font-medium"
              >
                Helvino Technologies
              </a>
            </p>
            <a
              href="tel:0703445756"
              className="block text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              0703 445 756
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
