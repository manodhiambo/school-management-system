import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
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
  Layers,
  ArrowUpCircle,
  FolderOpen,
  Star,
  Globe,
  Navigation,
  CheckCircle,
  MessageCircle,
  ShieldCheck,
  UserCog,
  ShoppingCart,
  Truck,
  Banknote,
  LayoutGrid,
  Boxes,
  ClipboardCheck,
  FileSearch,
  Shirt,
  Utensils,
  Wrench,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  section: string;
  badge?: string;
  // Toggleable feature module key (see backend src/config/moduleRegistry.js).
  // Items without a module key are core and always visible to allowed roles.
  module?: string;
};

// Items are grouped contiguously by `section` below — the sidebar prints a
// new header only when `section` changes from the previous item in this
// array (see the `showHeader` logic further down), so scattering a section's
// items across the array (as used to happen here) produces duplicate headers
// for the same section. Keep every item for a given section adjacent to the
// rest of that section when adding new entries.
const navigationItems: NavItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student', 'parent', 'finance_officer', 'driver', 'security'], section: '' },

  // ── People ────────────────────────────────────────────────────────────────
  { name: 'Students',        href: '/app/students',       icon: Users,         roles: ['admin', 'teacher'], section: 'People' },
  { name: 'Student Report',  href: '/app/student-report', icon: FileText,      roles: ['admin', 'teacher'], section: 'People' },
  { name: 'Teachers',        href: '/app/teachers',       icon: GraduationCap, roles: ['admin'],            section: 'People' },
  { name: 'Parents',         href: '/app/parents',        icon: UserCheck,     roles: ['admin', 'teacher'], section: 'People' },
  { name: 'User Management', href: '/app/users',          icon: Shield,        roles: ['admin'],            section: 'People' },
  { name: 'Appraisals',      href: '/app/appraisals',     icon: Award,         roles: ['admin'],            section: 'People', module: 'staff' },
  { name: 'Substitutes',     href: '/app/substitutes',    icon: Users,         roles: ['admin', 'teacher'], section: 'People', module: 'staff' },

  // ── Academic (admin) ──────────────────────────────────────────────────────
  { name: 'Classes & Rooms',    href: '/app/academic',           icon: Building2,     roles: ['admin'],            section: 'Academic' },
  { name: 'Learning Areas',     href: '/app/academic',           icon: Layers,        roles: ['admin'],            section: 'Academic' },
  { name: 'Schemes of Work',    href: '/app/academic',           icon: ClipboardList, roles: ['admin'],            section: 'Academic' },
  { name: 'Attendance',         href: '/app/attendance',         icon: Calendar,      roles: ['admin', 'teacher'], section: 'Academic' },
  { name: 'CBE Assessments',    href: '/app/cbc-assessments',    icon: Star,          roles: ['admin', 'teacher'], section: 'Academic', module: 'academics' },
  { name: 'CBE Report Cards',   href: '/app/cbc-report-cards',   icon: BookMarked,    roles: ['admin', 'teacher'], section: 'Academic', module: 'academics' },
  { name: 'CBE Analytics',      href: '/app/cbe-analytics',      icon: BarChart2,     roles: ['admin', 'teacher'], section: 'Academic', module: 'academics' },
  { name: 'Projects',           href: '/app/academic',           icon: FolderOpen,    roles: ['admin'],            section: 'Academic', module: 'academics' },
  { name: 'Promotion',          href: '/app/academic',           icon: ArrowUpCircle, roles: ['admin'],            section: 'Academic', module: 'academics' },
  { name: 'Academic Calendar',  href: '/app/academic-calendar',  icon: CalendarDays,  roles: ['admin'],            section: 'Academic' },
  { name: 'IGCSE',              href: '/app/igcse',              icon: Globe,         roles: ['admin'],            section: 'Academic', badge: 'IGCSE', module: 'academics' },
  { name: 'Exam Analytics',     href: '/app/exam-analytics',     icon: BarChart2,     roles: ['admin', 'teacher'], section: 'Academic', module: 'exams' },
  { name: 'Term Reports',       href: '/app/term-reports',       icon: FileText,      roles: ['admin'],            section: 'Academic', module: 'academics' },
  { name: 'NEMIS Export',       href: '/app/nemis',              icon: Globe,         roles: ['admin'],            section: 'Academic', module: 'nemis' },

  // ── Academic (teacher) ────────────────────────────────────────────────────
  { name: 'My Classes',    href: '/app/my-classes',   icon: Users,      roles: ['teacher'], section: 'Academic' },
  { name: 'Grade Book',    href: '/app/gradebook',    icon: Award,      roles: ['teacher'], section: 'Academic', module: 'exams' },
  { name: 'Lesson Plans',  href: '/app/academic',     icon: BookOpen,   roles: ['teacher'], section: 'Academic', module: 'academics' },
  { name: 'SBA Marks',     href: '/app/academic',     icon: ClipboardList, roles: ['teacher'], section: 'Academic', module: 'academics' },
  { name: 'Exams',         href: '/app/teacher-exams',icon: ListChecks, roles: ['teacher'], section: 'Academic', module: 'exams' },
  { name: 'IGCSE',         href: '/app/igcse',         icon: Globe,     roles: ['teacher'], section: 'Academic', badge: 'IGCSE', module: 'academics' },

  // ── Academic (student) ────────────────────────────────────────────────────
  { name: 'My Exams',          href: '/app/my-exams',        icon: Monitor,   roles: ['student'], section: 'Academic', module: 'exams' },
  { name: 'My Courses',        href: '/app/my-courses',      icon: BookOpen,  roles: ['student'], section: 'Academic' },
  { name: 'My Attendance',     href: '/app/my-attendance',   icon: Calendar,  roles: ['student'], section: 'Academic' },
  { name: 'My Results',        href: '/app/my-results',      icon: Award,     roles: ['student'], section: 'Academic', module: 'exams' },
  { name: 'My Report Card',    href: '/app/my-report-card',  icon: FileText,  roles: ['student'], section: 'Academic', module: 'academics' },
  { name: 'Learning Materials',href: '/app/learning-materials', icon: BookMarked, roles: ['student'], section: 'Academic', module: 'academics' },
  { name: 'IGCSE Results',     href: '/app/igcse',           icon: Globe,     roles: ['student'], section: 'Academic', badge: 'IGCSE', module: 'academics' },
  { name: 'My Portfolio',      href: '/app/portfolio',       icon: FolderOpen, roles: ['student'], section: 'Academic', module: 'academics' },

  // ── Finance ───────────────────────────────────────────────────────────────
  { name: 'Finance Overview',  href: '/app/finance',                  icon: Wallet,    roles: ['admin', 'finance_officer'], section: 'Finance', badge: 'New', module: 'finance' },
  { name: 'Income & Expenses', href: '/app/finance/transactions',     icon: Receipt,   roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Budgets',           href: '/app/finance/budgets',          icon: TrendingUp,roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Vendors & POs',     href: '/app/finance/vendors',          icon: Building2, roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Bank Accounts',     href: '/app/finance/bank-accounts',    icon: CreditCard,roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Petty Cash',        href: '/app/finance/petty-cash',       icon: DollarSign,roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Assets',            href: '/app/finance/assets',           icon: Building2, roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Financial Reports', href: '/app/finance/reports',          icon: FileText,  roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Advanced Reports',  href: '/app/finance/advanced-reports', icon: BarChart2, roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance', badge: 'New' },
  { name: 'Financial Years',   href: '/app/finance/financial-years',  icon: Calendar,  roles: ['admin', 'finance_officer'], section: 'Finance', module: 'finance' },
  { name: 'Fee Management',    href: '/app/fee',                      icon: DollarSign,roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'finance' },
  { name: 'Fee Structure',     href: '/app/fee-structure',            icon: DollarSign,roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'finance' },
  { name: 'Extra Fees',        href: '/app/extra-fees',               icon: DollarSign,roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'finance' },
  { name: 'Fee Reminders',     href: '/app/fee-reminders',            icon: Bell,      roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'finance' },
  { name: 'Bursary',           href: '/app/bursary',                  icon: Star,      roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'finance' },
  { name: 'Inventory',         href: '/app/inventory',                icon: ListChecks,roles: ['admin'],                     section: 'Finance', module: 'inventory' },
  { name: 'Payroll',           href: '/app/payroll',                  icon: Wallet,    roles: ['admin', 'finance_officer'],  section: 'Finance', module: 'staff' },
  { name: 'My Fees',           href: '/app/my-fees',                  icon: DollarSign,roles: ['student'],                  section: 'Finance', module: 'finance' },

  // ── Procurement ───────────────────────────────────────────────────────────
  { name: 'Procurement',       href: '/app/procurement',                    icon: ShoppingCart,  roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance', badge: 'New' },
  { name: 'Requisitions',      href: '/app/procurement/requisitions',       icon: ClipboardList, roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Suppliers',         href: '/app/procurement/suppliers',          icon: Building2,     roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'RFQs',              href: '/app/procurement/rfqs',              icon: FileSearch,    roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Quotations',        href: '/app/procurement/quotations',         icon: FileText,      roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Purchase Orders',   href: '/app/procurement/orders',             icon: ClipboardCheck,roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Contracts',         href: '/app/procurement/contracts',          icon: FileText,      roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Goods Receipt',     href: '/app/procurement/grn',                icon: Truck,         roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Invoices',          href: '/app/procurement/invoices',           icon: Receipt,       roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Supplier Payments', href: '/app/procurement/payments',           icon: Banknote,      roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Proc. Planning',    href: '/app/procurement/planning',           icon: LayoutGrid,    roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Proc. Reports',     href: '/app/procurement/reports',            icon: BarChart2,     roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Audit Trail',       href: '/app/procurement/audit',              icon: ShieldCheck,   roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },
  { name: 'Asset Management',  href: '/app/procurement/assets',             icon: Boxes,         roles: ['admin', 'finance_officer'], section: 'Procurement', module: 'finance' },

  // ── Family (parent) ───────────────────────────────────────────────────────
  { name: 'My Children',       href: '/app/my-children',       icon: Users,         roles: ['parent'], section: 'Family' },
  { name: 'Children Progress', href: '/app/children-progress', icon: TrendingUp,    roles: ['parent'], section: 'Family' },
  { name: 'Report Cards',      href: '/app/report-cards',      icon: FileText,      roles: ['parent'], section: 'Family', module: 'academics' },
  { name: 'Fee Payments',      href: '/app/fee-payments',      icon: DollarSign,    roles: ['parent'], section: 'Family', module: 'finance' },
  { name: 'My Alerts',         href: '/app/my-alerts',         icon: Bell,          roles: ['parent'], section: 'Family', module: 'communication' },
  { name: 'My Transport',      href: '/app/my-transport',      icon: Bus,           roles: ['parent'], section: 'Family', module: 'transport' },

  // ── Schedule ──────────────────────────────────────────────────────────────
  { name: 'Timetable',    href: '/app/timetable',    icon: Clock,        roles: ['admin', 'teacher'],           section: 'Schedule', module: 'timetable' },
  { name: 'My Timetable', href: '/app/my-timetable', icon: Clock,        roles: ['student', 'teacher'],         section: 'Schedule', module: 'timetable' },
  { name: 'Assignments',  href: '/app/assignments',  icon: FileText,     roles: ['student', 'teacher'],         section: 'Schedule', module: 'exams' },
  { name: 'P-T Meetings', href: '/app/meetings',     icon: CalendarDays, roles: ['admin', 'teacher', 'parent'], section: 'Schedule', module: 'communication' },

  // ── Communication ─────────────────────────────────────────────────────────
  { name: 'Communication', href: '/app/communication', icon: MessageSquare, roles: ['admin', 'teacher'],          section: 'Messages', module: 'communication' },
  { name: 'Messages',      href: '/app/messages',      icon: MessageSquare, roles: ['student'],                   section: 'Messages', module: 'communication' },
  { name: 'Notifications', href: '/app/notifications', icon: Bell,          roles: ['parent', 'student'],         section: 'Messages' },
  { name: 'SMS Messaging', href: '/app/sms',           icon: MessageCircle, roles: ['admin', 'teacher'],          section: 'Messages', module: 'communication' },
  { name: 'WhatsApp',      href: '/app/whatsapp',      icon: MessageCircle, roles: ['admin'],                     section: 'Messages', module: 'communication' },
  { name: 'Two-Way SMS',   href: '/app/sms-keywords',  icon: MessageSquare, roles: ['admin'],                     section: 'Messages', module: 'communication' },
  { name: 'Announcements', href: '/app/announcements', icon: Bell,          roles: ['admin', 'teacher', 'student', 'parent', 'finance_officer'], section: 'Messages', module: 'communication' },

  // ── Student Welfare ───────────────────────────────────────────────────────
  { name: 'Discipline',         href: '/app/discipline',         icon: AlertTriangle, roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'discipline' },
  { name: 'Counseling',         href: '/app/counseling',         icon: Heart,         roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'discipline' },
  { name: 'Health',             href: '/app/health',             icon: Heart,         roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'health' },
  { name: 'Staff Leave',        href: '/app/staff-leave',        icon: ClipboardList, roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'staff' },
  { name: 'My Attendance',      href: '/app/my-checkin',         icon: CheckCircle,   roles: ['teacher'],                            section: 'Welfare', module: 'teacher_checkin' },
  { name: 'Teacher Check-in',   href: '/app/teacher-checkin',    icon: CheckCircle,   roles: ['admin'],                              section: 'Welfare', module: 'teacher_checkin' },
  { name: 'Transport',          href: '/app/transport',          icon: Bus,           roles: ['admin'],                              section: 'Welfare', module: 'transport' },
  { name: 'Transport Tracking', href: '/app/transport-tracking', icon: Navigation,    roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'transport' },
  { name: 'My Route',           href: '/app/dashboard',          icon: Bus,           roles: ['driver'],                             section: 'Welfare', module: 'transport' },
  { name: 'Hostel Management',  href: '/app/hostel-management',  icon: Building2,     roles: ['admin'],                              section: 'Welfare', module: 'hostel' },
  { name: 'Roll Call',          href: '/app/hostel-roll-call',   icon: ClipboardCheck, roles: ['admin'],                             section: 'Welfare', module: 'hostel' },
  { name: 'Laundry',            href: '/app/hostel-laundry',     icon: Shirt,         roles: ['admin'],                              section: 'Welfare', module: 'hostel' },
  { name: 'Dorm Inspections',   href: '/app/hostel-inspections', icon: ClipboardList, roles: ['admin'],                              section: 'Welfare', module: 'hostel' },
  { name: 'Hostel Inventory',   href: '/app/hostel-inventory',   icon: Boxes,         roles: ['admin'],                              section: 'Welfare', module: 'inventory' },
  { name: 'Canteen',            href: '/app/canteen',            icon: Star,          roles: ['admin', 'finance_officer'],           section: 'Welfare', module: 'canteen' },
  { name: 'Canteen Balance',    href: '/app/canteen',            icon: DollarSign,    roles: ['student'],                            section: 'Welfare', module: 'canteen' },
  { name: 'Menu Planning',      href: '/app/canteen-menu-planning', icon: CalendarDays, roles: ['admin'],                            section: 'Welfare', module: 'canteen' },
  { name: 'Meal Attendance',    href: '/app/canteen-attendance', icon: Utensils,      roles: ['admin'],                              section: 'Welfare', module: 'canteen' },
  { name: 'Kitchen Requisitions', href: '/app/canteen-requisitions', icon: ClipboardList, roles: ['admin'],                          section: 'Welfare', module: 'canteen' },
  { name: 'School Store (POS)', href: '/app/school-store',       icon: ShoppingCart,  roles: ['admin'],                              section: 'Welfare', module: 'school_store' },
  { name: 'Maintenance Requests', href: '/app/maintenance-requests', icon: Wrench,    roles: ['admin', 'teacher'],                   section: 'Welfare', module: 'maintenance' },
  { name: 'My Jobs',            href: '/app/dashboard',          icon: Wrench,        roles: ['technician'],                         section: 'Welfare', module: 'maintenance' },

  // ── Gate Management / Security ───────────────────────────────────────────
  { name: 'Gate Manager',   href: '/app/gate-manager', icon: ShieldCheck, roles: ['admin'],    section: 'Security' },
  { name: 'Gate Dashboard', href: '/app/dashboard',    icon: ShieldCheck, roles: ['security'], section: 'Security' },
  { name: 'Visitor Log',    href: '/app/gate-manager', icon: UserCog,     roles: ['security'], section: 'Security' },

  // ── Library ───────────────────────────────────────────────────────────────
  { name: 'Library Catalog',    href: '/app/library',            icon: Library,  roles: ['admin', 'teacher', 'student', 'parent'], section: 'Library' },
  { name: 'My Borrowed Books',  href: '/app/my-books',           icon: BookOpen, roles: ['teacher', 'student'],                    section: 'Library' },
  { name: 'Issue / Return',     href: '/app/library-borrowings', icon: BookOpen, roles: ['admin', 'teacher'],                      section: 'Library' },
  { name: 'Library Management', href: '/app/library-management', icon: Library,  roles: ['admin'],                                 section: 'Library' },
  { name: 'Library Members',    href: '/app/library-members',    icon: Users,    roles: ['admin'],                                 section: 'Library' },

  // ── Account ───────────────────────────────────────────────────────────────
  { name: 'Settings',     href: '/app/settings', icon: Settings, roles: ['admin'],  section: 'Account' },
  { name: 'My Payslips',  href: '/app/payroll',  icon: Receipt,  roles: ['teacher'], section: 'Account', module: 'staff' },
  { name: 'My Appraisal', href: '/app/appraisals', icon: Award,  roles: ['teacher'], section: 'Account', module: 'staff' },
  { name: 'Audit Log',    href: '/app/audit-log', icon: ClipboardList, roles: ['admin'], section: 'Account' },
  { name: 'My Profile',   href: '/app/profile',  icon: User,     roles: ['admin', 'teacher', 'student', 'parent', 'finance_officer', 'driver', 'security'], section: 'Account' },
];

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
