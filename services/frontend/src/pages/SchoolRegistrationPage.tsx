import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, CheckCircle, Loader2, AlertCircle, ArrowLeft,
  Phone, Mail, Building2, MapPin, User, Lock, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

type Step = 'form' | 'waiting' | 'success';

const SCHOOL_TYPES = [
  'Primary School', 'Secondary School', 'Mixed (Primary & Secondary)',
  'Playgroup & Pre-Primary', 'University / College', 'Other'
];
const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika',
  'Kiambu', 'Machakos', 'Meru', 'Nyeri', 'Kakamega', 'Kisii',
  'Kakamega', 'Bungoma', 'Embu', 'Garissa', 'Isiolo', 'Lamu',
  'Mandera', 'Marsabit', 'Migori', 'Muranga', 'Samburu', 'Siaya',
  'Taita Taveta', 'Tana River', 'Tharaka Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot', 'Other'
];

interface FormData {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolType: string;
  county: string;
  registrationNumber: string;
  contactPerson: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

export function SchoolRegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<FormData>({
    schoolName: '',
    schoolEmail: '',
    schoolPhone: '',
    schoolAddress: '',
    schoolType: '',
    county: '',
    registrationNumber: '',
    contactPerson: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = (): string => {
    if (!form.schoolName.trim()) return 'School name is required.';
    if (!form.schoolEmail.trim()) return 'School email is required.';
    if (!form.schoolPhone.trim()) return 'School phone is required.';
    if (!form.contactPerson.trim()) return 'Administrator name is required.';
    if (!form.adminEmail.trim()) return 'Admin login email is required.';
    if (!form.adminPassword) return 'Admin password is required.';
    if (form.adminPassword.length < 6) return 'Password must be at least 6 characters.';
    if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match.';
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(form.schoolEmail)) return 'Invalid school email address.';
    if (!emailReg.test(form.adminEmail)) return 'Invalid admin email address.';
    return '';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      // Send exact field names the backend expects
      const payload = {
        schoolName: form.schoolName,
        schoolEmail: form.schoolEmail,
        schoolPhone: form.schoolPhone,
        schoolAddress: form.schoolAddress || undefined,
        county: form.county || undefined,
        contactPerson: form.contactPerson,
        registrationNumber: form.registrationNumber || undefined,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
      };

      const res: any = await api.registerSchool(payload);
      const id = res?.data?.tenantId || res?.data?.tenant_id || res?.tenantId || res?.tenant_id;

      if (!id) throw new Error('No tenant ID returned from server. Please contact support.');

      setTenantId(id);
      setStep('waiting');

      // Start polling every 5 seconds for activation
      const iv = setInterval(async () => {
        try {
          const status: any = await api.pollRegistrationStatus(id);
          const s = status?.data?.status || status?.status;
          if (s === 'active') {
            clearInterval(iv);
            setPollingInterval(null);
            setStep('success');
          }
        } catch { /* keep polling */ }
      }, 5000);
      setPollingInterval(iv);

    } catch (err: any) {
      const msg = err?.message || err?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const stopPolling = () => {
    if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null); }
  };

  const STEPS = [
    { key: 'form', label: 'School Details' },
    { key: 'waiting', label: 'M-Pesa Payment' },
    { key: 'success', label: 'Activated' },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <GraduationCap className="h-10 w-10 text-yellow-400 mr-3" />
            <span className="text-3xl font-bold text-white">Skul Manager</span>
          </div>
          <p className="text-blue-200 text-sm">Kenya's #1 CBC School Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gray-50 border-b px-6 py-4">
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      currentStepIdx > i ? 'bg-green-500 text-white' :
                      currentStepIdx === i ? 'bg-blue-600 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStepIdx > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`ml-2 text-xs font-medium hidden sm:block ${
                      currentStepIdx === i ? 'text-blue-600' : 'text-gray-500'
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-3" />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* ── STEP 1: School Details Form ── */}
            {step === 'form' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Register Your School</h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    One-time registration: <strong className="text-green-600">KSh 50,000</strong> via M-Pesa &nbsp;·&nbsp;
                    Annual renewal: <strong className="text-blue-600">KSh 10,000/year</strong>
                  </p>
                </div>

                {error && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* SECTION: School Info */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">School Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* School Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        School Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="schoolName" value={form.schoolName} onChange={handleChange} required
                          placeholder="e.g. Nairobi Preparatory School"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    {/* School Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        School Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="schoolEmail" value={form.schoolEmail} onChange={handleChange} required type="email"
                          placeholder="info@yourschool.ac.ke"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    {/* School Phone (M-Pesa number) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        School Phone / M-Pesa Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="schoolPhone" value={form.schoolPhone} onChange={handleChange} required
                          placeholder="07XXXXXXXX"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">STK Push will be sent to this number</p>
                    </div>

                    {/* School Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
                      <select name="schoolType" value={form.schoolType} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select type...</option>
                        {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* County */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                      <select name="county" value={form.county} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select county...</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="schoolAddress" value={form.schoolAddress} onChange={handleChange}
                          placeholder="P.O. Box, Street, Town"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION: Admin / Principal */}
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Administrator Account</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Admin / Principal Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Principal / Admin Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="contactPerson" value={form.contactPerson} onChange={handleChange} required
                          placeholder="Full name of principal or administrator"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    {/* Admin Login Email */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Login Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="adminEmail" value={form.adminEmail} onChange={handleChange} required type="email"
                          placeholder="This will be your login email"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          name="adminPassword" value={form.adminPassword} onChange={handleChange} required
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          className="w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          className={`w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                            form.confirmPassword && form.confirmPassword !== form.adminPassword
                              ? 'border-red-300 focus:ring-red-400'
                              : 'focus:ring-blue-500'
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirm(p => !p)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {form.confirmPassword && form.confirmPassword !== form.adminPassword && (
                        <p className="text-xs text-red-500 mt-0.5">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button type="submit" disabled={loading} className="w-full py-3 text-base font-semibold">
                    {loading
                      ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Registering & Sending M-Pesa Prompt...</>
                      : 'Register & Pay KSh 50,000 via M-Pesa →'}
                  </Button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
                  </p>
                </div>
              </form>
            )}

            {/* ── STEP 2: Waiting for M-Pesa ── */}
            {step === 'waiting' && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-green-100 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Check Your Phone!</h2>
                  <p className="text-gray-500 mt-2 text-sm">
                    An M-Pesa STK Push has been sent to <strong className="text-gray-800">{form.schoolPhone}</strong>.<br />
                    Enter your M-Pesa PIN to pay <strong className="text-green-600">KSh 50,000</strong> and activate your school.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
                  <p className="text-sm font-semibold text-green-800 mb-2">How to complete payment:</p>
                  <ol className="text-sm text-green-700 space-y-1.5 list-decimal list-inside">
                    <li>Check your phone — you'll see an M-Pesa payment prompt</li>
                    <li>The amount will show <strong>KSh 50,000</strong></li>
                    <li>Enter your <strong>4-digit M-Pesa PIN</strong> and confirm</li>
                    <li>This page will activate automatically once confirmed</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600">
                    School ID: <code className="font-mono font-bold">{tenantId?.split('-')[0]?.toUpperCase()}</code>
                    &nbsp;·&nbsp; Keep this as reference
                  </p>
                </div>

                <p className="text-xs text-gray-400">This page checks every 5 seconds automatically...</p>

                <Button variant="outline" onClick={() => { stopPolling(); setStep('form'); }} className="text-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Didn't get prompt? Go back
                </Button>
              </div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 'success' && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-5">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">School Activated!</h2>
                  <p className="text-gray-500 mt-2">
                    <strong className="text-gray-900">{form.schoolName}</strong> is now live on Skul Manager.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left space-y-3">
                  <p className="text-sm font-bold text-blue-800">Your Login Details:</p>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Email:</span> {form.adminEmail}
                    </p>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Password:</span> (as set during registration)
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Next steps:</p>
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                    <li>Log in with your email and password</li>
                    <li>Complete your school profile and settings</li>
                    <li>Add teachers, classes, and students</li>
                    <li>Start using all CBC features!</li>
                  </ol>
                </div>
                <Button onClick={() => navigate('/login')} className="w-full py-3 text-base font-semibold">
                  Go to Login →
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 space-y-1">
          <p className="text-blue-200 text-xs">
            Powered by <strong>Helvino Technologies Limited</strong>
          </p>
          <p className="text-blue-300 text-xs">helvinotechltd@gmail.com · 0703 445 756</p>
          <Link to="/" className="text-blue-400 text-xs hover:text-white">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
