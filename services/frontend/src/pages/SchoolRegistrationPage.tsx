import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, CheckCircle, Loader2, AlertCircle, ArrowLeft, Phone, Mail, Building2, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

type Step = 'form' | 'payment' | 'pending' | 'success';

const SCHOOL_TYPES = ['Primary School', 'Secondary School', 'Mixed (Primary & Secondary)', 'Playgroup & Pre-Primary', 'University / College', 'Other'];
const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos', 'Meru', 'Nyeri', 'Kakamega', 'Other'];

export function SchoolRegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    school_name: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    school_address: '',
    school_type: '',
    county: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.school_name || !form.admin_name || !form.admin_email || !form.admin_phone) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.registerSchool(form);
      const id = res?.tenant_id || res?.data?.tenant_id;
      setTenantId(id);
      setPaymentPhone(form.admin_phone);
      setStep('payment');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!paymentPhone) { setError('Phone number is required.'); return; }
    setLoading(true);
    try {
      await api.initiateRegistrationPayment(tenantId, paymentPhone);
      setStep('pending');
      // Start polling every 5s
      const iv = setInterval(async () => {
        try {
          const status: any = await api.pollRegistrationStatus(tenantId);
          if (status?.status === 'active' || status?.data?.status === 'active') {
            clearInterval(iv);
            setPollingInterval(null);
            setStep('success');
          }
        } catch { /* keep polling */ }
      }, 5000);
      setPollingInterval(iv);
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stopPolling = () => {
    if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-10 w-10 text-yellow-400 mr-3" />
            <span className="text-3xl font-bold text-white">Skul Manager</span>
          </div>
          <p className="text-blue-200 text-sm">Kenya's #1 CBC School Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gray-50 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              {[
                { key: 'form', label: 'School Info' },
                { key: 'payment', label: 'M-Pesa Payment' },
                { key: 'pending', label: 'Processing' },
                { key: 'success', label: 'Activated' },
              ].map((s, i, arr) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                    step === s.key ? 'bg-blue-600 text-white' :
                    ['form','payment','pending','success'].indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {['form','payment','pending','success'].indexOf(step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={`text-xs font-medium ${step === s.key ? 'text-blue-600' : 'text-gray-500'}`}>{s.label}</p>
                  </div>
                  {i < arr.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-3" />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* STEP 1: School Information */}
            {step === 'form' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Register Your School</h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    One-time registration fee: <strong className="text-green-600">KSh 50,000</strong> + Annual renewal: <strong className="text-blue-600">KSh 10,000/year</strong>
                  </p>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        name="school_name" value={form.school_name} onChange={handleChange} required
                        placeholder="e.g. Nairobi Preparatory School"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        name="admin_name" value={form.admin_name} onChange={handleChange} required
                        placeholder="Principal / Administrator"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        name="admin_phone" value={form.admin_phone} onChange={handleChange} required
                        placeholder="07XXXXXXXX"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        name="admin_email" value={form.admin_email} onChange={handleChange} required type="email"
                        placeholder="admin@yourschool.ac.ke"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
                    <select name="school_type" value={form.school_type} onChange={handleChange}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select type...</option>
                      {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                    <select name="county" value={form.county} onChange={handleChange}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select county...</option>
                      {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        name="school_address" value={form.school_address} onChange={handleChange}
                        placeholder="P.O. Box, Street, Town"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full py-3 text-base font-semibold">
                  {loading ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Registering...</> : 'Continue to Payment →'}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
                </p>
              </form>
            )}

            {/* STEP 2: M-Pesa Payment */}
            {step === 'payment' && (
              <form onSubmit={handlePayment} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">M-Pesa Payment</h2>
                  <p className="text-gray-500 mt-1 text-sm">Enter the M-Pesa number to receive the STK Push prompt.</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-500 rounded-full p-2 mt-0.5">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 text-lg">Amount: KSh 50,000</p>
                      <p className="text-green-700 text-sm mt-0.5">One-time registration fee</p>
                      <p className="text-green-600 text-xs mt-2">You will receive an M-Pesa prompt on your phone. Enter your PIN to complete payment.</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} required
                      placeholder="07XXXXXXXX"
                      className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Safaricom number registered with M-Pesa</p>
                </div>

                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={() => setStep('form')} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 font-semibold">
                    {loading ? <><Loader2 className="animate-spin mr-2 h-5 w-5" />Sending prompt...</> : 'Send M-Pesa Prompt'}
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: Pending / Processing */}
            {step === 'pending' && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
                    <Phone className="h-6 w-6 text-blue-600 absolute top-5 left-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Waiting for Payment</h2>
                  <p className="text-gray-500 mt-2">
                    An M-Pesa prompt has been sent to <strong>{paymentPhone}</strong>.<br />
                    Please enter your M-Pesa PIN to complete the payment.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left space-y-2">
                  <p className="text-sm font-semibold text-yellow-800">Instructions:</p>
                  <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                    <li>Check your phone for an M-Pesa STK Push notification</li>
                    <li>Enter your 4-digit M-Pesa PIN</li>
                    <li>Your school account will be activated automatically</li>
                  </ol>
                </div>
                <p className="text-xs text-gray-400">This page will update automatically once payment is confirmed...</p>
                <Button
                  variant="outline"
                  onClick={() => { stopPolling(); setStep('payment'); }}
                  className="text-sm"
                >
                  Didn't receive prompt? Go back
                </Button>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 'success' && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">School Registered!</h2>
                  <p className="text-gray-500 mt-2">
                    <strong>{form.school_name}</strong> has been successfully registered and activated.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left space-y-2">
                  <p className="text-sm font-semibold text-blue-800">Next Steps:</p>
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                    <li>Check your email ({form.admin_email}) for login credentials</li>
                    <li>Log in and complete your school profile</li>
                    <li>Add teachers, students, and classes</li>
                    <li>Start using all features!</li>
                  </ol>
                </div>
                <Button onClick={() => navigate('/login')} className="w-full py-3 font-semibold">
                  Go to Login →
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-xs">
            Powered by <strong>Helvino Technologies Limited</strong> · helvinotechltd@gmail.com · 0703 445 756
          </p>
          <Link to="/" className="text-blue-300 text-xs hover:text-white mt-1 block">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
