import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, CheckCircle, Loader2, AlertCircle,
  Phone, Mail, Building2, MapPin, User, Lock, Eye, EyeOff, Clock,
  Wallet, ShieldCheck, XCircle, PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { useSEO } from '@/hooks/useSEO';

type Step = 'form' | 'deposit' | 'status';
type RegistrationStatus = 'pending_deposit' | 'pending_review' | 'active' | 'suspended' | string;

// All 47 counties of Kenya (Constitution 2010, Fourth Schedule), alphabetical.
const COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana',
  'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];
const OTHER_COUNTY = 'Other';
const DEPOSIT_AMOUNT = 50000;

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

interface RegisteredTenant {
  tenantId: string;
  schoolName: string;
  adminEmail: string;
  depositAmount: number;
}

interface StatusData {
  status: RegistrationStatus;
  depositPaid: boolean;
  reviewStatus: string;
  rejectionReason?: string | null;
  balanceDaysLeft: number | null;
}

export function SchoolRegistrationPage() {
  useSEO({
    title: 'Register Your School | SkulManager',
    description: 'Register your Kenyan school on SkulManager. Pay a KSh 50,000 deposit to submit your school for activation. Want to try it first? Use our live demo — no account needed.',
    path: '/register',
  });
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<RegisteredTenant | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otherCounty, setOtherCounty] = useState('');

  const [depositPhone, setDepositPhone] = useState('');
  const [depositMessage, setDepositMessage] = useState('');
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = (): string => {
    if (!form.schoolName.trim()) return 'School name is required.';
    if (!form.schoolEmail.trim()) return 'School email is required.';
    if (!form.schoolPhone.trim()) return 'School phone is required.';
    if (!form.registrationNumber.trim()) return "Ministry of Education registration/certificate number is required — we only activate real, registered schools.";
    if (!form.contactPerson.trim()) return 'Administrator name is required.';
    if (!form.adminEmail.trim()) return 'Admin login email is required.';
    if (!form.adminPassword) return 'Admin password is required.';
    if (form.adminPassword.length < 8) return 'Password must be at least 8 characters.';
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
        county:             (form.county === OTHER_COUNTY ? otherCounty.trim() : form.county) || undefined,
        contactPerson:      form.contactPerson,
        registrationNumber: form.registrationNumber,
        adminEmail:         form.adminEmail,
        adminPassword:      form.adminPassword,
      };

      const res: any = await api.registerSchool(payload);
      const data = res?.data;

      setTenant({
        tenantId:      data?.tenantId,
        schoolName:    data?.schoolName || form.schoolName,
        adminEmail:    data?.adminEmail || form.adminEmail,
        depositAmount: data?.depositAmount || DEPOSIT_AMOUNT,
      });
      setDepositPhone(form.schoolPhone);
      setStep('deposit');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (tenantId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const poll = async () => {
      try {
        const res: any = await api.pollRegistrationStatus(tenantId);
        const d = res?.data;
        if (!d) return;
        setStatusData({
          status: d.status,
          depositPaid: !!d.depositPaid,
          reviewStatus: d.reviewStatus,
          rejectionReason: d.rejectionReason,
          balanceDaysLeft: d.balanceDaysLeft ?? null,
        });
        if (d.depositPaid) setStep('status');
        if (d.status === 'active' || d.status === 'suspended') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // transient — keep polling
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
  };

  const handlePayDeposit = async () => {
    if (!tenant) return;
    if (!depositPhone.trim()) { setError('Enter the M-Pesa phone number to pay from.'); return; }
    setError('');
    setDepositMessage('');
    setLoading(true);
    try {
      const res: any = await api.initiateRegistrationDeposit(tenant.tenantId, depositPhone);
      setDepositMessage(res?.message || 'M-Pesa prompt sent. Enter your PIN to complete the deposit.');
      startPolling(tenant.tenantId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Could not start the deposit payment. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <GraduationCap className="h-10 w-10 text-yellow-400 mr-3" />
            <span className="text-3xl font-bold text-white">Skul Manager</span>
          </div>
          <p className="text-blue-200 text-sm">Kenya's #1 CBE School Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── STEP 1: Registration Form ── */}
          {step === 'form' && (
            <div className="p-6 sm:p-8">
              {/* Deposit + demo banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Wallet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">KSh {DEPOSIT_AMOUNT.toLocaleString()} deposit to register</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Registration is for real, licensed schools only. Pay a KSh {DEPOSIT_AMOUNT.toLocaleString()} deposit
                      (of a KSh 100,000 total) via M-Pesa, then our team reviews and activates your account. The remaining
                      KSh 50,000 balance is due within 5 days of the deposit, or the account is automatically suspended.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <PlayCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-800 text-sm">Just want to look around first?</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Try the fully working <Link to="/login" className="text-purple-700 font-semibold hover:underline">live demo</Link> — no account
                      or payment needed. Explore every module with sample data before you register your school.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Register Your School</h2>
                  <p className="text-gray-500 mt-1 text-sm">We verify real schools — your Ministry of Education registration number is required.</p>
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

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ministry of Education Registration / Certificate Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} required
                          placeholder="e.g. MOE/REG/12345"
                          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Used to verify this is a real, registered school before activation.</p>
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
                        <option value={OTHER_COUNTY}>Other (not listed)</option>
                      </select>
                      {form.county === OTHER_COUNTY && (
                        <input
                          value={otherCounty}
                          onChange={e => setOtherCounty(e.target.value)}
                          placeholder="Type your county"
                          className="w-full mt-2 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
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
                          type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters, letters + numbers"
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
                      ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Submitting...</>
                      : <><Wallet className="mr-2 h-5 w-5" />Continue to KSh {DEPOSIT_AMOUNT.toLocaleString()} Deposit</>}
                  </Button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 2: Pay Deposit ── */}
          {step === 'deposit' && tenant && (
            <div className="p-6 sm:p-8">
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="bg-blue-100 rounded-full p-5">
                    <Wallet className="h-16 w-16 text-blue-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Pay the Registration Deposit</h2>
                  <p className="text-gray-500 mt-1">
                    <strong className="text-gray-900">{tenant.schoolName}</strong> is registered.
                    Pay the KSh {tenant.depositAmount.toLocaleString()} deposit to submit it for activation review.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {depositMessage && (
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                    <Phone className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">{depositMessage}</p>
                  </div>
                )}

                <div className="text-left space-y-2">
                  <label className="block text-sm font-medium text-gray-700">M-Pesa Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input value={depositPhone} onChange={e => setDepositPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                <Button onClick={handlePayDeposit} disabled={loading} className="w-full py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700">
                  {loading
                    ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Sending M-Pesa prompt...</>
                    : <>Pay KSh {tenant.depositAmount.toLocaleString()} via M-Pesa</>}
                </Button>
                <p className="text-xs text-gray-400">
                  We'll automatically detect your payment once you enter your M-Pesa PIN.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Prefer to pay directly?</p>
                  <p className="text-sm text-gray-600">
                    Send KSh {tenant.depositAmount.toLocaleString()} to <strong className="text-gray-900">Paybill 522533, Account 8071524</strong>.
                    Then call or WhatsApp <strong className="text-gray-900">0110 421 320</strong> or{' '}
                    <strong className="text-gray-900">0703445756</strong>, or email{' '}
                    <strong className="text-gray-900">info@helvino.org</strong> with your school name and M-Pesa code —
                    we'll confirm the payment and approve your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Status (pending review / active / rejected) ── */}
          {step === 'status' && tenant && (
            <div className="p-6 sm:p-8">
              <div className="text-center space-y-5">
                {(!statusData || statusData.status === 'pending_review') && (
                  <>
                    <div className="flex justify-center">
                      <div className="bg-amber-100 rounded-full p-5">
                        <Clock className="h-16 w-16 text-amber-500" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Deposit Received — Under Review</h2>
                      <p className="text-gray-500 mt-1">
                        Thanks! We've received your KSh {tenant.depositAmount.toLocaleString()} deposit for{' '}
                        <strong className="text-gray-900">{tenant.schoolName}</strong>. Our team is verifying your
                        school and will activate your account shortly.
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                      <p className="text-sm text-amber-700">
                        Once approved, you'll have <strong>5 days from your deposit payment</strong> to clear the
                        remaining KSh 50,000 balance from Settings → Billing, or the account is automatically suspended.
                        We'll email <strong>{tenant.adminEmail}</strong> as soon as you're approved.
                      </p>
                    </div>
                  </>
                )}

                {statusData?.status === 'active' && (
                  <>
                    <div className="flex justify-center">
                      <div className="bg-green-100 rounded-full p-5">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">You're Approved!</h2>
                      <p className="text-gray-500 mt-1">
                        <strong className="text-gray-900">{tenant.schoolName}</strong> is active. Log in with{' '}
                        <strong>{tenant.adminEmail}</strong> and the password you set.
                      </p>
                    </div>
                    {statusData.balanceDaysLeft !== null && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                        <p className="text-sm text-blue-700">
                          Clear the remaining KSh 50,000 balance within{' '}
                          <strong>{statusData.balanceDaysLeft} day{statusData.balanceDaysLeft === 1 ? '' : 's'}</strong> from
                          Settings → Billing, or the account will be automatically suspended.
                        </p>
                      </div>
                    )}
                    <Button onClick={() => navigate('/login')} className="w-full py-3 text-base font-semibold">
                      Login to Your Dashboard →
                    </Button>
                  </>
                )}

                {statusData?.status === 'suspended' && statusData.reviewStatus === 'rejected' && (
                  <>
                    <div className="flex justify-center">
                      <div className="bg-red-100 rounded-full p-5">
                        <XCircle className="h-16 w-16 text-red-500" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Registration Not Approved</h2>
                      <p className="text-gray-500 mt-1">
                        We couldn't approve <strong className="text-gray-900">{tenant.schoolName}</strong>.
                      </p>
                    </div>
                    {statusData.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                        <p className="text-sm text-red-700"><strong>Reason:</strong> {statusData.rejectionReason}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">Contact us at info@helvino.org or 0110 421 320 to resolve this.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-5 space-y-1">
          <p className="text-blue-200 text-xs">Powered by <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-white transition-colors">Helvino Technologies Limited</a>, Siaya</p>
          <p className="text-blue-300 text-xs">info@helvino.org · 0110 421 320</p>
          <Link to="/" className="text-blue-400 text-xs hover:text-white">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
