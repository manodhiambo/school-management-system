import { useState, useEffect } from 'react';
import { Clock, X, CreditCard, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function TrialBanner() {
  const { user } = useAuthStore();
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [payStatus, setPayStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [payMessage, setPayMessage] = useState('');

  // Only show for admin role with a tenant_id
  const canShow = user?.role === 'admin' && user?.tenant_id;

  useEffect(() => {
    if (!canShow) return;
    api.pollRegistrationStatus(user!.tenant_id!)
      .then((res: any) => {
        const data = res?.data ?? res;
        setTrialInfo(data);
      })
      .catch(() => {});
  }, [user?.tenant_id]);

  if (!canShow || !trialInfo || dismissed) return null;

  const { isTrial, trialDaysLeft, status } = trialInfo;

  // Only show banner for trial status or expired
  if (status !== 'trial' && status !== 'expired') return null;

  const isExpired = status === 'expired' || trialDaysLeft === 0;
  const isUrgent = trialDaysLeft <= 2;

  const handlePay = async () => {
    if (!phone.trim()) return;
    setPaying(true);
    setPayStatus('idle');
    try {
      const res: any = await api.initiateRegistrationPayment(user!.tenant_id!, phone.trim());
      const msg = res?.data?.message ?? res?.message ?? 'M-Pesa prompt sent!';
      setPayMessage(msg);
      setPayStatus('sent');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Payment failed. Please try again.';
      setPayMessage(msg);
      setPayStatus('error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      {/* Banner */}
      <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${
        isExpired
          ? 'bg-red-600 text-white'
          : isUrgent
          ? 'bg-orange-500 text-white'
          : 'bg-amber-400 text-amber-900'
      }`}>
        <div className="flex items-center space-x-2 min-w-0">
          {isExpired
            ? <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            : <Clock className="h-4 w-4 flex-shrink-0" />
          }
          <span className="font-medium truncate">
            {isExpired
              ? 'Your trial has expired. Activate your school to restore access.'
              : `Trial active — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining. Activate to continue after trial.`
            }
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
          <button
            onClick={() => setShowPayModal(true)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              isExpired || isUrgent
                ? 'bg-white text-red-700 hover:bg-gray-100'
                : 'bg-amber-800 text-white hover:bg-amber-900'
            }`}
          >
            Activate Now — KSh 50,000
          </button>
          {!isExpired && (
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Activate School</h2>
              </div>
              <button onClick={() => { setShowPayModal(false); setPayStatus('idle'); setPhone(''); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {payStatus === 'sent' ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                <div>
                  <p className="font-semibold text-gray-900">M-Pesa Prompt Sent!</p>
                  <p className="text-sm text-gray-500 mt-1">{payMessage}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  Enter your M-Pesa PIN on your phone. Your school will be activated automatically once payment is confirmed.
                </div>
                <Button onClick={() => { setShowPayModal(false); setPayStatus('idle'); setPhone(''); }}
                  variant="outline" className="w-full">
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800">One-time Activation Fee</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">KSh 50,000</p>
                  <p className="text-xs text-blue-600 mt-1">Includes 1 year subscription · Renews at KSh 10,000/year</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">An STK Push will be sent to this number</p>
                </div>

                {payStatus === 'error' && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{payMessage}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button variant="outline" className="flex-1"
                    onClick={() => { setShowPayModal(false); setPayStatus('idle'); setPhone(''); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePay}
                    disabled={paying || !phone.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    {paying
                      ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Sending...</>
                      : 'Pay via M-Pesa'
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
