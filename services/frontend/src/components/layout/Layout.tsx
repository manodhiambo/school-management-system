import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TrialBanner } from './TrialBanner';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Wallet, Settings, BookOpen,
  Calendar, Award, DollarSign, User, TrendingUp,
} from 'lucide-react';

type BottomNavItem = { name: string; href: string; icon: React.ElementType };

const roleBottomNav: Record<string, BottomNavItem[]> = {
  admin: [
    { name: 'Home',     href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/app/students',  icon: Users           },
    { name: 'Finance',  href: '/app/finance',   icon: Wallet          },
    { name: 'Settings', href: '/app/settings',  icon: Settings        },
  ],
  finance_officer: [
    { name: 'Home',    href: '/app/dashboard',       icon: LayoutDashboard },
    { name: 'Finance', href: '/app/finance',          icon: Wallet          },
    { name: 'Reports', href: '/app/finance/reports',  icon: BookOpen        },
    { name: 'Profile', href: '/app/profile',          icon: User            },
  ],
  teacher: [
    { name: 'Home',     href: '/app/dashboard',   icon: LayoutDashboard },
    { name: 'Students', href: '/app/students',    icon: Users           },
    { name: 'Classes',  href: '/app/my-classes',  icon: BookOpen        },
    { name: 'Schedule', href: '/app/my-timetable',icon: Calendar        },
    { name: 'Profile',  href: '/app/profile',     icon: User            },
  ],
  student: [
    { name: 'Home',    href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Exams',   href: '/app/my-exams',  icon: BookOpen        },
    { name: 'Results', href: '/app/my-results',icon: Award           },
    { name: 'Fees',    href: '/app/my-fees',   icon: DollarSign      },
    { name: 'Profile', href: '/app/profile',   icon: User            },
  ],
  parent: [
    { name: 'Home',     href: '/app/dashboard',       icon: LayoutDashboard },
    { name: 'Children', href: '/app/my-children',     icon: Users           },
    { name: 'Progress', href: '/app/children-progress',icon: TrendingUp     },
    { name: 'Fees',     href: '/app/fee-payments',    icon: DollarSign      },
    { name: 'Profile',  href: '/app/profile',         icon: User            },
  ],
};

function MobileBottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  const items = roleBottomNav[user?.role ?? ''] ?? [];
  if (items.length === 0) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <div className="flex">
        {items.map(item => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/app/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2.5 gap-1 transition-colors',
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className={cn(
                'flex items-center justify-center h-6 w-6 rounded-lg transition-colors',
                isActive ? 'bg-indigo-100' : ''
              )}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : '')} />
              </div>
              <span className="text-[10px] font-semibold leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TrialBanner />
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
