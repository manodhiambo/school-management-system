// apps/web/src/layouts/AuthLayout.tsx
import React from 'react';
import { School, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <School size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center">{title}</h1>
          {subtitle && <p className="text-blue-100 text-center mt-2">{subtitle}</p>}
        </div>
        
        {/* Content */}
        <div className="p-8">{children}</div>
        
        {/* Footer */}
        <div className="px-8 pb-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by SmartSchool Pro
          </p>
        </div>
      </div>
    </div>
  );
};

// apps/web/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertCircle } from 'lucide-react';

import { AuthLayout } from '../layouts/AuthLayout';
import { PasswordInput } from '@school/shared-ui';
import { Button } from '@school/shared-ui';
import { authClient } from '@school/api-client';
import { LoginRequest } from '@school/shared-types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'teacher', 'student', 'parent'], {
    required_error: 'Please select a role',
  }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const response = await authClient.login(data);
      
      if (response.success) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Role-based redirect
        const roleRedirects = {
          admin: '/admin/dashboard',
          teacher: '/teacher/dashboard',
          student: '/student/dashboard',
          parent: '/parent/dashboard',
        };
        
        navigate(roleRedirects[response.data.user.role]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            {...register('role')}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Role</option>
            <option value="admin">Administrator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          {errors.role && (
            <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              {...register('email')}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@school.edu"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <PasswordInput
          label="Password"
          {...register('password')}
          error={errors.password?.message}
          touched={!!errors.password}
          placeholder="••••••••"
        />

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Request Access
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

// apps/web/src/pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle } from 'lucide-react';

import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '@school/shared-ui';
import { authClient } from '@school/api-client';
import { ForgotPasswordRequest } from '@school/shared-types';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'teacher', 'student', 'parent'], {
    required_error: 'Please select your role',
  }),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    try {
      setError(null);
      await authClient.forgotPassword(data);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check Your Email">
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto text-green-500" size={64} />
          <p className="text-gray-600">
            We've sent password reset instructions to your email address.
            Please check your inbox (and spam folder).
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Back to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your details to receive reset instructions"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            {...register('role')}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            <option value="admin">Administrator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          {errors.role && (
            <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              {...register('email')}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="you@school.edu"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Send Reset Instructions
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

// apps/web/src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  DollarSign, 
  Clock,
  Calendar,
  MessageSquare,
  TrendingUp,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@school/shared-ui';
import { authClient } from '@school/api-client';
import { User as UserType } from '@school/shared-types';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  monthlyRevenue: number;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadDashboardStats();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await authClient.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      navigate('/login');
    }
  };

  const loadDashboardStats = async () => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalStudents: 1247,
        totalTeachers: 85,
        todayAttendance: 94.2,
        monthlyRevenue: 1250000,
      });
      setLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    authClient.logout();
    navigate('/login');
  };

  const roleBasedNavigation = {
    admin: [
      { path: '/students', icon: Users, label: 'Students', color: 'bg-blue-500' },
      { path: '/teachers', icon: User, label: 'Teachers', color: 'bg-green-500' },
      { path: '/academy', icon: BookOpen, label: 'Academics', color: 'bg-purple-500' },
      { path: '/finance', icon: DollarSign, label: 'Finance', color: 'bg-yellow-500' },
      { path: '/attendance', icon: Clock, label: 'Attendance', color: 'bg-red-500' },
      { path: '/communication', icon: MessageSquare, label: 'Messages', color: 'bg-indigo-500' },
      { path: '/analytics', icon: TrendingUp, label: 'Analytics', color: 'bg-pink-500' },
    ],
    teacher: [
      { path: '/my-classes', icon: BookOpen, label: 'My Classes', color: 'bg-blue-500' },
      { path: '/attendance', icon: Clock, label: 'Mark Attendance', color: 'bg-green-500' },
      { path: '/gradebook', icon: Users, label: 'Gradebook', color: 'bg-purple-500' },
      { path: '/schedule', icon: Calendar, label: 'Schedule', color: 'bg-red-500' },
    ],
    student: [
      { path: '/my-profile', icon: User, label: 'My Profile', color: 'bg-blue-500' },
      { path: '/results', icon: BookOpen, label: 'Results', color: 'bg-green-500' },
      { path: '/attendance', icon: Clock, label: 'Attendance', color: 'bg-purple-500' },
      { path: '/fee', icon: DollarSign, label: 'Fee Status', color: 'bg-yellow-500' },
    ],
    parent: [
      { path: '/children', icon: Users, label: 'My Children', color: 'bg-blue-500' },
      { path: '/results', icon: BookOpen, label: 'Results', color: 'bg-green-500' },
      { path: '/attendance', icon: Clock, label: 'Attendance', color: 'bg-purple-500' },
      { path: '/payments', icon: DollarSign, label: 'Payments', color: 'bg-yellow-500' },
    ],
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navItems = roleBasedNavigation[user.role] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <School className="text-blue-600 mr-3" size={32} />
              <h1 className="text-xl font-bold text-gray-900">School Management System</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal
              </span>
              <div className="flex items-center space-x-2">
                <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center">
                  <User size={18} className="text-gray-600" />
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold">
            Welcome back, {user.email.split('@')[0]}!
          </h2>
          <p className="mt-2 text-blue-100">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Students"
            value={stats.totalStudents.toLocaleString()}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Teachers"
            value={stats.totalTeachers.toLocaleString()}
            icon={User}
            color="green"
          />
          <StatCard
            title="Today's Attendance"
            value={`${stats.todayAttendance}%`}
            icon={Clock}
            color="purple"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${(stats.monthlyRevenue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            color="yellow"
          />
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {navItems.map((item) => (
            <NavCard
              key={item.path}
              {...item}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`bg-${color}-100 p-3 rounded-lg`}>
        <Icon className={`text-${color}-600`} size={24} />
      </div>
    </div>
  </div>
);

// Nav Card Component
const NavCard: React.FC<{
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}> = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1 text-left group"
  >
    <div className={`${color} p-3 rounded-lg inline-block group-hover:scale-105 transition-transform`}>
      <Icon className="text-white" size={24} />
    </div>
    <h3 className="mt-4 font-semibold text-gray-900">{label}</h3>
    <p className="text-sm text-gray-500 mt-1">Click to manage</p>
  </button>
);
