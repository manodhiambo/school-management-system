import { useState, useEffect } from 'react';
import { Clock, X, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function TrialBanner() {
  const { user } = useAuthStore();
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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

  const { trialDaysLeft, status } = trialInfo;

  // Only show banner for trial status or expired
  if (status !== 'trial' && status !== 'expired') return null;

  const isExpired = status === 'expired' || trialDaysLeft === 0;
  const isUrgent = trialDaysLeft <= 2;

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
            onClick={() => setShowContactModal(true)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              isExpired || isUrgent
                ? 'bg-white text-red-700 hover:bg-gray-100'
                : 'bg-amber-800 text-white hover:bg-amber-900'
            }`}
          >
            Contact Us to Activate
          </button>
          {!isExpired && (
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Activate Your School</h2>
              </div>
              <button onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Contact us and our team will give you a quote and activate your school once terms are agreed.
              </p>

              <a href="tel:0110421320" className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors">
                <Phone className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">Call / WhatsApp</p>
                  <p className="text-sm font-bold text-gray-900">0110 421 320</p>
                </div>
              </a>

              <a href="mailto:info@helvino.org" className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors">
                <Mail className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Email</p>
                  <p className="text-sm font-bold text-gray-900">info@helvino.org</p>
                </div>
              </a>

              <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Your school data is preserved during the trial. Once you've agreed on pricing with our team, we'll activate your account.</p>
              </div>

              <Button onClick={() => setShowContactModal(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
