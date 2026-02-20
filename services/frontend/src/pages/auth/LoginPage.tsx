import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { GraduationCap, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

type View = 'login' | 'forgot' | 'forgot-success';

export function LoginPage() {
  const [view, setView] = useState<View>('login');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response: any = await api.login(email, password);
      const { accessToken, user } = response.data;
      setAuth(user, accessToken, rememberMe);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="h-9 w-9 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {view === 'login' && 'School Management System'}
            {view === 'forgot' && 'Forgot Password'}
            {view === 'forgot-success' && 'Check Your Email'}
          </CardTitle>
          <CardDescription className="text-center">
            {view === 'login' && 'Enter your credentials to access your account'}
            {view === 'forgot' && 'Enter your email and we\'ll send you a reset link'}
            {view === 'forgot-success' && 'A password reset link has been sent'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* ── LOGIN FORM ── */}
          {view === 'login' && (
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
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-sm text-primary hover:underline"
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
                  className="h-4 w-4 rounded border-gray-300 text-primary"
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

          {/* ── FORGOT PASSWORD FORM ── */}
          {view === 'forgot' && (
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
          )}

          {/* ── FORGOT SUCCESS ── */}
          {view === 'forgot-success' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent.
                Check your inbox (and spam folder) and follow the instructions.
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
