import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  GraduationCap, Eye, EyeOff, ArrowLeft, CheckCircle,
  BookOpen, Users, UserCheck, Shield,
} from 'lucide-react';

type View = 'role' | 'login' | 'forgot' | 'forgot-success';
type Role = 'teacher' | 'student' | 'parent' | 'admin';

const ROLES: { key: Role; label: string; description: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
  {
    key: 'teacher',
    label: 'Teacher',
    description: 'Manage classes, grades & attendance',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-400',
  },
  {
    key: 'student',
    label: 'Student',
    description: 'View results, timetable & assignments',
    icon: GraduationCap,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    border: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    key: 'parent',
    label: 'Parent / Guardian',
    description: 'Track your child\'s progress & alerts',
    icon: UserCheck,
    color: 'text-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100',
    border: 'border-purple-200 hover:border-purple-400',
  },
];

export function LoginPage() {
  const [view, setView] = useState<View>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setLoginError('');
    setEmail('');
    setPassword('');
    setView('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response: any = await api.login(email, password);
      const { accessToken, refreshToken, user } = response.data;

      // Validate the logged-in user's role matches selection (skip for admin)
      if (selectedRole && selectedRole !== 'admin' && user.role !== selectedRole) {
        const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
        setLoginError(`This account is not registered as a ${roleLabel}. Please select the correct role.`);
        setLoginLoading(false);
        return;
      }

      setAuth(user, accessToken, rememberMe, refreshToken);
      if (user?.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await api.forgotPassword(forgotEmail.trim());
      setView('forgot-success');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const goBackToRoles = () => {
    setSelectedRole(null);
    setLoginError('');
    setView('role');
  };

  const selectedRoleConfig = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-3">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">SkulManager</h1>
          <p className="text-sm text-gray-500">Kenya School Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          {/* ── ROLE SELECTION ── */}
          {view === 'role' && (
            <>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-xl">Welcome! Who are you?</CardTitle>
                <CardDescription>Select your role to continue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => handleRoleSelect(role.key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left ${role.bg} ${role.border}`}
                  >
                    <div className={`flex-shrink-0 h-11 w-11 rounded-full bg-white flex items-center justify-center shadow-sm`}>
                      <role.icon className={`h-5 w-5 ${role.color}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${role.color}`}>{role.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    </div>
                  </button>
                ))}

                {/* Admin link — subtle, not a prominent card */}
                <div className="pt-2 text-center">
                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Shield className="h-3 w-3" />
                    Sign in as Administrator
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 pt-1">
                  New school?{' '}
                  <Link to="/register" className="text-indigo-600 font-medium hover:underline">
                    Register here
                  </Link>
                </p>
              </CardContent>
            </>
          )}

          {/* ── LOGIN FORM ── */}
          {view === 'login' && (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <button
                    onClick={goBackToRoles}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {selectedRoleConfig && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${selectedRoleConfig.bg} ${selectedRoleConfig.color} border ${selectedRoleConfig.border}`}>
                      <selectedRoleConfig.icon className="h-3.5 w-3.5" />
                      {selectedRoleConfig.label}
                    </div>
                  )}
                  {selectedRole === 'admin' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      <Shield className="h-3.5 w-3.5" />
                      Administrator
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@school.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>

                  {loginError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {loginError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-xl">Forgot Password</CardTitle>
                <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Email address</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="you@school.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {forgotError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {forgotError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setForgotError(''); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {/* ── FORGOT SUCCESS ── */}
          {view === 'forgot-success' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Check Your Email</CardTitle>
                <CardDescription>A password reset link has been sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <p className="text-sm text-gray-600">
                  If an account exists for <strong>{forgotEmail}</strong>, a reset link has been sent.
                  Check your inbox (and spam folder).
                </p>
                <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setView('login'); setForgotEmail(''); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Helvino Technologies Limited · 0703 445 756
        </p>
      </div>
    </div>
  );
}
