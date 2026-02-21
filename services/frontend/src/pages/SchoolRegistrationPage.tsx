import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, CheckCircle, Loader2, AlertCircle,
  Phone, Mail, Building2, MapPin, User, Lock, Eye, EyeOff, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

type Step = 'form' | 'success';

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika',
  'Kiambu', 'Machakos', 'Meru', 'Nyeri', 'Kakamega', 'Kisii',
  'Bungoma', 'Embu', 'Garissa', 'Isiolo', 'Lamu', 'Mandera',
  'Marsabit', 'Migori', 'Muranga', 'Samburu', 'Siaya',
  'Taita Taveta', 'Tana River', 'Tharaka Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot', 'Other'
];

interface FormData {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  county: string;
  registrationNumber: string;
  contactPerson: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

interface SuccessData {
  schoolName: string;
  adminEmail: string;
  trialEndsAt: string;
  trialDays: number;
}

export function SchoolRegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<FormData>({
    schoolName: '',
    schoolEmail: '',
    schoolPhone: '',
    schoolAddress: '',
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
      const payload = {
        schoolName:         form.schoolName,
        schoolEmail:        form.schoolEmail,
        schoolPhone:        form.schoolPhone,
        schoolAddress:      form.schoolAddress || undefined,
        county:             form.county || undefined,
        contactPerson:      form.contactPerson,
        registrationNumber: form.registrationNumber || undefined,
        adminEmail:         form.adminEmail,
        adminPassword:      form.adminPassword,
      };

      const res: any = await api.registerSchool(payload);
      const data = res?.data;

      setSuccessData({
        schoolName:  data?.schoolName  || form.schoolName,
        adminEmail:  data?.adminEmail  || form.adminEmail,
        trialEndsAt: data?.trialEndsAt || '',
        trialDays:   data?.trialDays   || 5,
      });
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const trialEndDate = successData?.trialEndsAt
    ? new Date(successData.trialEndsAt).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

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

          {/* ── STEP 1: Registration Form ── */}
          {step === 'form' && (
            <div className="p-6 sm:p-8">
              {/* Pricing Banner */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">5-Day Free Trial — No payment needed to start</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Explore all features free. After your trial: <strong className="text-blue-700">KSh 50,000</strong> one-time activation &nbsp;+&nbsp; <strong className="text-blue-700">KSh 10,000/year</strong> renewal
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Register Your School</h2>
                  <p className="text-gray-500 mt-1 text-sm">Your admin account will be created instantly — start exploring right away.</p>
                </div>

                {error && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* School Information */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">School Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        School Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="schoolPhone" value={form.schoolPhone} onChange={handleChange} required
                          placeholder="07XXXXXXXX"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                      <select name="county" value={form.county} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select county...</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
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

                {/* Administrator Account */}
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Administrator Account</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Login Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="adminEmail" value={form.adminEmail} onChange={handleChange} required type="email"
                          placeholder="Your login email address"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="adminPassword" value={form.adminPassword} onChange={handleChange} required
                          type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                          className="w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <button type="button" onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                          {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required
                          type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
                          className={`w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                            form.confirmPassword && form.confirmPassword !== form.adminPassword
                              ? 'border-red-300 focus:ring-red-400' : 'focus:ring-blue-500'
                          }`} />
                        <button type="button" onClick={() => setShowConfirm(p => !p)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      {form.confirmPassword && form.confirmPassword !== form.adminPassword && (
                        <p className="text-xs text-red-500 mt-0.5">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button type="submit" disabled={loading} className="w-full py-3 text-base font-semibold bg-green-600 hover:bg-green-700">
                    {loading
                      ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Creating your account...</>
                      : <><Clock className="mr-2 h-5 w-5" />Start 5-Day Free Trial</>}
                  </Button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 2: Success / Trial Active ── */}
          {step === 'success' && successData && (
            <div className="p-6 sm:p-8">
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-5">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
                  <p className="text-gray-500 mt-1">
                    <strong className="text-gray-900">{successData.schoolName}</strong> is registered and your trial is active.
                  </p>
                </div>

                {/* Trial Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left space-y-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <p className="font-bold text-blue-800">
                      {successData.trialDays}-Day Free Trial Active
                    </p>
                  </div>
                  {trialEndDate && (
                    <p className="text-sm text-blue-700">
                      Trial expires on: <strong>{trialEndDate}</strong>
                    </p>
                  )}
                  <hr className="border-blue-200" />
                  <p className="text-sm font-semibold text-blue-800">Your Login Details:</p>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-700"><span className="font-medium">Email:</span> {successData.adminEmail}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">Password:</span> (as set during registration)</p>
                  </div>
                </div>

                {/* What happens after trial */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                  <p className="text-xs font-semibold text-amber-800 mb-2">After your trial ends:</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• One-time activation: <strong>KSh 50,000</strong></li>
                    <li>• Annual renewal: <strong>KSh 10,000/year</strong></li>
                    <li>• Payment via M-Pesa — available inside your dashboard</li>
                  </ul>
                </div>

                <Button onClick={() => navigate('/login')} className="w-full py-3 text-base font-semibold">
                  Login to Your Dashboard →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-5 space-y-1">
          <p className="text-blue-200 text-xs">Powered by <strong>Helvino Technologies Limited</strong></p>
          <p className="text-blue-300 text-xs">helvinotechltd@gmail.com · 0703 445 756</p>
          <Link to="/" className="text-blue-400 text-xs hover:text-white">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
