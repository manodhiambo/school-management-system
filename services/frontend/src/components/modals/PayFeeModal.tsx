import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle, AlertCircle, Loader2, Building2, Send, XCircle, Phone, CreditCard, ChevronRight,
} from 'lucide-react';
import api from '@/services/api';

function fmt(n: any) { return parseFloat(n || 0).toLocaleString('en-KE'); }

const METHODS = [
  { value: 'mpesa_paybill',  label: 'M-Pesa Paybill',   icon: '📱', hint: 'M-Pesa confirmation code (e.g. QJK8XXXXXXX)' },
  { value: 'mpesa_stk',      label: 'M-Pesa STK Push',  icon: '📲', hint: 'Automated prompt sent to your phone' },
  { value: 'intasend',       label: 'Bank / Card',       icon: '💳', hint: 'Pay by bank transfer or card — auto-confirmed' },
  { value: 'bank_transfer',  label: 'Bank Transfer',     icon: '🏦', hint: 'Bank reference / deposit slip number' },
  { value: 'mpesa',          label: 'M-Pesa (Other)',    icon: '💚', hint: 'M-Pesa confirmation code' },
  { value: 'cash',           label: 'Cash',              icon: '💵', hint: 'Receipt number from accounts office' },
  { value: 'cheque',         label: 'Cheque',            icon: '📄', hint: 'Cheque number' },
  { value: 'other',          label: 'Other',             icon: '💳', hint: 'Reference / proof of payment' },
];

interface PayFeeModalProps {
  open: boolean;
  invoice: any;
  studentName: string;
  settings: any;
  onClose: () => void;
  onSuccess: () => void;
}

// Shared "pay this invoice" modal — used by both the parent's Fee Payments
// page and the student's My Fees page, so M-Pesa STK / IntaSend / manual
// payment-request logic only needs to exist and be maintained once.
export function PayFeeModal({ open, invoice, studentName, settings, onClose, onSuccess }: PayFeeModalProps) {
  const [step, setStep] = useState<'method' | 'details' | 'stk' | 'intasend' | 'done'>('method');
  const [method, setMethod] = useState('mpesa_paybill');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState('');
  const [stkPhone, setStkPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'processing' | 'sent' | 'failed'>('idle');
  const [stkMsg, setStkMsg] = useState('');
  const [intasendStatus, setIntasendStatus] = useState<'idle' | 'processing' | 'sent' | 'failed'>('idle');
  const [intasendMsg, setIntasendMsg] = useState('');
  const [intasendRedirectUrl, setIntasendRedirectUrl] = useState('');

  useEffect(() => {
    if (!open || !invoice) return;
    setMethod('mpesa_paybill');
    setAmount(fmt(invoice.balance_amount || invoice.net_amount).replace(/,/g, ''));
    setRef(''); setMsg(''); setStkPhone('');
    setFormError(''); setStkStatus('idle'); setStkMsg('');
    setIntasendStatus('idle'); setIntasendMsg(''); setIntasendRedirectUrl('');
    setStep('method');
  }, [open, invoice]);

  if (!open || !invoice) return null;

  const hasMpesaStk = !!(settings?.mpesa_paybill || settings?.mpesa_till);
  const hasPayInfo = settings && (
    settings.bank_account_number || settings.mpesa_paybill ||
    settings.mpesa_till || settings.payment_instructions
  );
  const hasIntasend = !!settings?.intasend_enabled;
  const availableMethods = METHODS.filter(m =>
    (m.value !== 'mpesa_stk' || hasMpesaStk) &&
    (m.value !== 'intasend' || hasIntasend)
  );
  const activeMethod = METHODS.find(m => m.value === method) || METHODS[0];

  const handleSubmit = async () => {
    setFormError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount'); return; }
    const maxBal = parseFloat(invoice.balance_amount || 0);
    if (amt > maxBal + 0.01) { setFormError(`Amount exceeds balance due (KES ${fmt(maxBal)})`); return; }

    const dbMethod = method === 'mpesa_paybill' ? 'mpesa' : method;

    try {
      setSubmitting(true);
      const res: any = await api.submitPaymentRequest({
        invoiceId: invoice.id,
        amount: amt,
        paymentMethod: dbMethod,
        transactionRef: ref.trim() || undefined,
        parentMessage: msg.trim() || undefined,
      });
      if (res.success || res.data?.success) {
        setStep('done');
        onSuccess();
      } else {
        setFormError(res.message || res.data?.message || 'Failed to submit');
      }
    } catch (e: any) {
      setFormError(e?.response?.data?.message || e.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStkPush = async () => {
    setFormError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount'); return; }
    if (!/^(\+?254|0)?[17]\d{8}$/.test(stkPhone.replace(/\s/g, ''))) {
      setFormError('Enter a valid Kenyan phone number e.g. 0712345678'); return;
    }
    try {
      setStkStatus('processing'); setStkMsg('Sending prompt to your phone...');
      const res: any = await api.initiateMpesaPayment(invoice.id, stkPhone.replace(/\s/g, ''), amt);
      if (res.success || res.data?.success) {
        setStkStatus('sent');
        setStkMsg(res.message || res.data?.message || 'Check your phone and enter your PIN to complete payment.');
        setTimeout(onSuccess, 8000);
      } else {
        setStkStatus('failed');
        setStkMsg(res.message || res.data?.message || 'STK push failed. Try manual payment.');
      }
    } catch (e: any) {
      setStkStatus('failed');
      setStkMsg(e?.response?.data?.message || e.message || 'Failed to send STK push');
    }
  };

  const handleIntasendCheckout = async () => {
    setFormError('');
    try {
      setIntasendStatus('processing'); setIntasendMsg('Creating secure payment session...');
      const res: any = await api.initiateIntasendCheckout(invoice.id);
      const data = res.data || res.data?.data;
      if ((res.success || res.data?.success) && data) {
        setIntasendStatus('sent');
        setIntasendMsg(res.message || res.data?.message || 'Payment session created.');
        if (data.redirectUrl) {
          setIntasendRedirectUrl(data.redirectUrl);
          window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        }
        setTimeout(onSuccess, 8000);
      } else {
        setIntasendStatus('failed');
        setIntasendMsg(res.message || res.data?.message || 'Could not start payment. Try another method.');
      }
    } catch (e: any) {
      setIntasendStatus('failed');
      setIntasendMsg(e?.response?.data?.message || e.message || 'Failed to start bank/card payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Pay School Fee</h2>
              <p className="text-blue-200 text-sm mt-0.5">{studentName}</p>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-3 bg-blue-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200">Paying for</p>
              <p className="font-semibold">{invoice.description || invoice.structure_name || 'School Fees'}</p>
              <p className="text-blue-200 text-xs">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">Balance Due</p>
              <p className="text-xl font-bold">KES {fmt(invoice.balance_amount)}</p>
              {parseFloat(invoice.paid_amount || 0) > 0 && (
                <p className="text-xs text-green-300">KES {fmt(invoice.paid_amount)} already paid</p>
              )}
            </div>
          </div>
        </div>

        {step === 'done' && (
          <div className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-700">Payment Submitted!</h3>
            <p className="text-gray-500 mt-2">
              Your payment has been sent to the school admin for confirmation. You will see an update once they verify it.
            </p>
            <Button onClick={onClose} className="mt-6 w-full">Done</Button>
          </div>
        )}

        {step === 'method' && (
          <div className="p-6 space-y-4">
            <p className="font-semibold text-gray-700">How would you like to pay?</p>
            <div className="grid grid-cols-2 gap-3">
              {availableMethods.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center ${
                    method === m.value
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  <span className="text-2xl mb-1">{m.icon}</span>
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
              onClick={() => setStep(method === 'mpesa_stk' ? 'stk' : method === 'intasend' ? 'intasend' : 'details')}
            >
              Continue with {activeMethod.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="p-6 space-y-5">
            {hasPayInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-2">
                  <Building2 className="h-3.5 w-3.5" /> Pay to the school using:
                </p>
                <div className="space-y-1 text-sm text-blue-900">
                  {settings.mpesa_paybill && (
                    <div className="flex items-start gap-2">
                      <span className="text-lg">📱</span>
                      <div>
                        <p className="font-semibold">M-Pesa Paybill: <span className="text-blue-700 text-base">{settings.mpesa_paybill}</span></p>
                        {settings.mpesa_account_ref && (
                          <p className="text-xs text-blue-600">Account No: {settings.mpesa_account_ref}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {settings.mpesa_till && (
                    <div className="flex items-start gap-2">
                      <span className="text-lg">💚</span>
                      <p><span className="font-semibold">M-Pesa Till:</span> <span className="text-blue-700 text-base">{settings.mpesa_till}</span></p>
                    </div>
                  )}
                  {settings.bank_name && (
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🏦</span>
                      <div>
                        <p className="font-semibold">{settings.bank_name}</p>
                        {settings.bank_account_number && (
                          <p className="text-xs text-blue-600">Account: {settings.bank_account_number}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {settings.payment_instructions && (
                    <p className="text-xs text-blue-700 border-t border-blue-200 pt-2 mt-2 italic">
                      {settings.payment_instructions}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">How to complete payment:</p>
              <p>1. Pay using the details above</p>
              <p>2. Copy your confirmation code / reference</p>
              <p>3. Fill in the form below and click <strong>Submit</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Amount Paying (KES) *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-lg font-semibold mt-1"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can pay a partial amount. Balance due: KES {fmt(invoice.balance_amount)}
                </p>
              </div>

              <div>
                <Label>{activeMethod.hint.split('(')[0].trim()} *</Label>
                <Input
                  value={ref}
                  onChange={e => setRef(e.target.value)}
                  placeholder={activeMethod.hint}
                  className="mt-1 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">e.g. {activeMethod.hint}</p>
              </div>

              <div>
                <Label>Message to Admin <span className="text-gray-400 text-xs">(optional)</span></Label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2}
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="e.g. Paid via paybill 400200 on 15/06/2026, name John Doe"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit to Admin
              </Button>
            </div>
          </div>
        )}

        {step === 'stk' && (
          <div className="p-6 space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <span className="text-4xl">📲</span>
              <p className="font-semibold text-green-800 mt-2">M-Pesa STK Push</p>
              <p className="text-sm text-green-600 mt-1">
                Enter your phone number and we'll send a payment prompt directly to it. Enter your PIN to complete.
              </p>
            </div>

            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="text-lg font-semibold mt-1" />
              <p className="text-xs text-gray-400 mt-1">Balance due: KES {fmt(invoice.balance_amount)}</p>
            </div>

            <div>
              <Label>M-Pesa Phone Number</Label>
              <Input type="tel" value={stkPhone} onChange={e => setStkPhone(e.target.value)} placeholder="0712345678" className="mt-1" />
            </div>

            {stkStatus === 'idle' && formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{formError}
              </div>
            )}
            {stkStatus === 'processing' && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-blue-700">{stkMsg}</p>
              </div>
            )}
            {stkStatus === 'sent' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <Phone className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-700">Prompt Sent!</p>
                <p className="text-sm text-green-600 mt-1">{stkMsg}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Payment will be auto-confirmed once you enter your PIN. This may take 1–2 minutes.
                </p>
              </div>
            )}
            {stkStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-semibold text-red-600">STK Push Failed</p>
                <p className="text-sm text-red-500 mt-1">{stkMsg}</p>
                <Button variant="outline" size="sm" className="mt-3"
                  onClick={() => { setMethod('mpesa_paybill'); setStep('details'); setStkStatus('idle'); }}>
                  Use Manual Payment Instead
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">Back</Button>
              {stkStatus !== 'sent' && (
                <Button onClick={handleStkPush} disabled={stkStatus === 'processing'} className="flex-1 bg-green-600 hover:bg-green-700">
                  {stkStatus === 'processing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                  Send Prompt
                </Button>
              )}
              {stkStatus === 'sent' && <Button onClick={onClose} className="flex-1">Done</Button>}
            </div>
          </div>
        )}

        {step === 'intasend' && (
          <div className="p-6 space-y-5">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <CreditCard className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-semibold text-indigo-800">Bank / Card Payment</p>
              <p className="text-sm text-indigo-600 mt-1">
                You'll be taken to a secure payment page. Once you complete payment there, it's automatically confirmed here.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              Balance due: <span className="font-semibold">KES {fmt(invoice.balance_amount)}</span>
            </div>

            {intasendStatus === 'idle' && formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{formError}
              </div>
            )}
            {intasendStatus === 'processing' && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-blue-700">{intasendMsg}</p>
              </div>
            )}
            {intasendStatus === 'sent' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-700">Payment Page Opened</p>
                <p className="text-sm text-green-600 mt-1">{intasendMsg}</p>
                {intasendRedirectUrl && (
                  <a href={intasendRedirectUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-2 inline-block">
                    Didn't open? Click here
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-2">This page will update automatically once payment is confirmed.</p>
              </div>
            )}
            {intasendStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-semibold text-red-600">Could Not Start Payment</p>
                <p className="text-sm text-red-500 mt-1">{intasendMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">Back</Button>
              {intasendStatus !== 'sent' && (
                <Button onClick={handleIntasendCheckout} disabled={intasendStatus === 'processing'} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {intasendStatus === 'processing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Pay Now
                </Button>
              )}
              {intasendStatus === 'sent' && <Button onClick={onClose} className="flex-1">Done</Button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PayFeeModal;
