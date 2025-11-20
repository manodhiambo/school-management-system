import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Teachers', href: '/teachers', icon: GraduationCap },
  { name: 'Parents', href: '/parents', icon: UserCheck },
  { name: 'Academic', href: '/academic', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Fee Management', href: '/fee', icon: DollarSign },
  { name: 'Timetable', href: '/timetable', icon: Clock },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">School Management</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className={cn('mr-3 h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
