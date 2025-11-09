import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Users, BookOpen, Calendar, DollarSign, BarChart3, Settings, LogOut, Home, Clock, MessageSquare, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@school/shared-ui';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Teachers', href: '/teachers', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Fee Management', href: '/fee', icon: DollarSign },
  { name: 'Academic', href: '/academic', icon: BookOpen },
  { name: 'Timetable', href: '/timetable', icon: Clock },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Audit Logs', href: '/audit-logs', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </Button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                    isActive ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-white md:shadow-lg md:flex md:flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-xl font-bold">School Management</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  isActive ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </a>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Welcome back!</span>
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                A
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
