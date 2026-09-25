import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { useSEO } from '@/hooks/useSEO';
import {
  GraduationCap, Eye, EyeOff, ArrowLeft, CheckCircle,
  BookOpen, UserCheck, Shield, Wallet, Bus, ShieldCheck, KeyRound, Sparkles, Loader2, Wrench, Award,
} from 'lucide-react';

type View = 'role' | 'login' | '2fa' | 'forgot' | 'forgot-success';
type Role = 'teacher' | 'student' | 'parent' | 'admin' | 'finance_officer' | 'driver' | 'security' | 'technician' | 'alumni';

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
  {
    key: 'finance_officer',
    label: 'Finance Officer',
    description: 'Manage fees, expenses & financial reports',
    icon: Wallet,
    color: 'text-amber-600',
    bg: 'bg-amber-50 hover:bg-amber-100',
    border: 'border-amber-200 hover:border-amber-400',
  },
  {
    key: 'driver',
    label: 'Driver',
    description: 'Track student pickups & transport routes',
    icon: Bus,
    color: 'text-orange-600',
    bg: 'bg-orange-50 hover:bg-orange-100',
    border: 'border-orange-200 hover:border-orange-400',
  },
  {
    key: 'security',
    label: 'Security Officer',
    description: 'Manage visitors, gate check-in & student pickup',
    icon: ShieldCheck,
    color: 'text-slate-700',
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-200 hover:border-slate-400',
  },
  {
    key: 'technician',
    label: 'Technician',
    description: 'Handle assigned maintenance & repair jobs',
    icon: Wrench,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    border: 'border-cyan-200 hover:border-cyan-400',
  },
  {
    key: 'alumni',
    label: 'Alumni',
    description: 'Connect with your school, mentor and give back',
    icon: Award,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    border: 'border-indigo-200 hover:border-indigo-400',
  },
];

export function LoginPage() {
  useSEO({
    title: 'Sign In | SkulManager',
    description: 'Sign in to your SkulManager account.',
    path: '/login',
    noindex: true,
  });
  const [view, setView] = useState<View>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleDropdownSelection, setRoleDropdownSelection] = useState('');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 2FA state
  const [totpCode, setTotpCode] = useState('');
  const [totpTempToken, setTotpTempToken] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Live demo "log in as" picker
  type DemoUser = { email: string; role: string; first_name: string; last_name: string };
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [demoSelection, setDemoSelection] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    api.getDemoUsers()
      .then((res: any) => setDemoUsers(res?.data || []))
      .catch(() => { /* demo picker is optional — silently hide it if this fails */ });
  }, []);

  const demoRoleLabel = (role: string) => {
    if (role === 'finance_officer') return 'Finance Officer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleDemoUserSelect = async (email: string) => {
    setDemoSelection(email);
    if (!email) return;
    const demoUser = demoUsers.find(u => u.email === email);
    if (!demoUser) return;

    // "Autofill": show the picked account's credentials on the login form for
    // a moment before signing in, so it's visibly not a silent teleport.
    const knownRole = ROLES.some(r => r.key === demoUser.role) || demoUser.role === 'admin';
    setSelectedRole((knownRole ? demoUser.role : 'admin') as Role);
    setEmail(demoUser.email);
    setPassword('••••••••••••');
    setLoginError('');
    setDemoError('');
    setView('login');
    setDemoLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 450));
      const res: any = await api.demoLogin(demoUser.email);
      const { accessToken, refreshToken, user } = res.data;
      setAuth(user, accessToken, true, refreshToken);
      navigate('/app/dashboard');
    } catch (err: any) {
      setDemoError(err?.response?.data?.message || err?.message || 'Could not start the live demo — please try again shortly.');
      setDemoLoading(false);
    }
  };

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
      // 2FA challenge for admins
      if ((response as any).requires_2fa) {
        setTotpTempToken((response as any).temp_token);
        setTotpCode('');
        setTotpError('');
        setView('2fa');
        setLoginLoading(false);
        return;
      }

      const { accessToken, refreshToken, user } = response.data;

      // Validate the logged-in user's role matches the selected tile
      const skipRoleCheck = !selectedRole || selectedRole === 'admin';
      if (!skipRoleCheck && user.role !== selectedRole) {
        const roleConfig = ROLES.find(r => r.key === selectedRole);
        const roleLabel = roleConfig ? roleConfig.label : selectedRole;
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

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    setTotpLoading(true);
    try {
      const response: any = await api.validate2FA(totpTempToken, totpCode);
      const { accessToken, refreshToken, user } = response.data;
      setAuth(user, accessToken, rememberMe, refreshToken);
      navigate('/app/dashboard');
    } catch (err: any) {
      setTotpError(err.message || 'Invalid code. Please try again.');
    } finally {
      setTotpLoading(false);
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
    setRoleDropdownSelection('');
    setLoginError('');
    setDemoError('');
    setDemoLoading(false);
    setDemoSelection('');
    setEmail('');
    setPassword('');
    setView('role');
  };

  const selectedRoleConfig = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo-mark.png" alt="SkulManager logo" className="h-16 w-16 mb-3" />
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
                <div className="space-y-2">
                  <Label htmlFor="roleSelect">Your role</Label>
                  <select
                    id="roleSelect"
                    value={roleDropdownSelection}
                    onChange={(e) => setRoleDropdownSelection(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Select your role...</option>
                    {ROLES.map((role) => (
                      <option key={role.key} value={role.key}>{role.label}</option>
                    ))}
                    <option value="admin">Administrator</option>
                  </select>
                  {roleDropdownSelection && roleDropdownSelection !== 'admin' && (
                    <p className="text-xs text-gray-500">
                      {ROLES.find((r) => r.key === roleDropdownSelection)?.description}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={!roleDropdownSelection}
                    onClick={() => handleRoleSelect(roleDropdownSelection as Role)}
                  >
                    Continue
                  </Button>
                </div>

                {demoUsers.length > 0 && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <p className="text-xs font-semibold text-indigo-700">Just exploring? Try the live demo</p>
                    </div>
                    <select
                      value={demoSelection}
                      onChange={(e) => handleDemoUserSelect(e.target.value)}
                      className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Sign in as a demo user...</option>
                      {demoUsers.map((u) => (
                        <option key={u.email} value={u.email}>
                          {demoRoleLabel(u.role)} — {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-indigo-400 mt-1.5">No password needed — picks the account and signs you straight in.</p>
                  </div>
                )}

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
                  {selectedRoleConfig ? (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${selectedRoleConfig.bg} ${selectedRoleConfig.color} border ${selectedRoleConfig.border}`}>
                      <selectedRoleConfig.icon className="h-3.5 w-3.5" />
                      {selectedRoleConfig.label}
                    </div>
                  ) : selectedRole === 'admin' ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      <Shield className="h-3.5 w-3.5" />
                      Administrator
                    </div>
                  ) : selectedRole === 'driver' ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                      <Bus className="h-3.5 w-3.5" />
                      Driver
                    </div>
                  ) : null}
                </div>
                <CardTitle className="text-xl">Sign In</CardTitle>
                <CardDescription>
                  {demoLoading ? 'Signing you in to the live demo...' : 'Enter your credentials to access your account'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {demoLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">{email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Loading the demo dashboard...</p>
                    </div>
                  </div>
                ) : demoError ? (
                  <div className="space-y-3">
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{demoError}</div>
                    <Button variant="outline" className="w-full" onClick={() => { setDemoError(''); setView('role'); }}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </>
          )}

          {/* ── 2FA CHALLENGE ── */}
          {view === '2fa' && (
            <>
              <CardHeader className="pb-2 text-center">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
                <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totpCode">Authentication Code</Label>
                    <Input
                      id="totpCode"
                      type="text"
                      inputMode="numeric"
                      placeholder="000 000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9\-A-Z ]/gi, '').slice(0, 9))}
                      required
                      autoFocus
                      className="text-center text-xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-gray-400 text-center">
                      Also accepts a backup code (format: XXXX-XXXX)
                    </p>
                  </div>

                  {totpError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {totpError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={totpLoading || totpCode.length < 6}>
                    {totpLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setTotpCode(''); setTotpError(''); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
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
          © {new Date().getFullYear()} <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Helvino Technologies Limited</a>, Siaya · 0110 421 320
        </p>
      </div>
    </div>
  );
}
