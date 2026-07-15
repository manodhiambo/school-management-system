import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign, CheckCircle, AlertCircle, Clock, Loader2,
  Printer, Building2, Send, XCircle, Phone, CreditCard,
  ChevronRight, Info, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { jsPDF } from 'jspdf';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: any) { return parseFloat(n || 0).toLocaleString('en-KE'); }

function printReceipt(payment: any, studentName: string, schoolName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = 148, m = 15; let y = m;
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, W / 2, 10, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('PAYMENT RECEIPT', W / 2, 17, { align: 'center' });
  y = 30; doc.setTextColor(30, 30, 30); doc.setDrawColor(180, 180, 180);
  doc.line(m, y, W - m, y); y += 7;
  const row = (label: string, val: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(label + ':', m, y);
    doc.setFont('helvetica', 'normal'); doc.text(val, m + 44, y); y += 6;
  };
  row('Receipt', payment.transaction_id || payment.receipt_number || `RCP-${Date.now()}`);
  row('Date', new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-KE'));
  row('Student', studentName);
  if (payment.invoice_description || payment.description) row('Fee', payment.invoice_description || payment.description);
  y += 2; doc.line(m, y, W - m, y); y += 7;
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`KES ${fmt(payment.amount)} Paid`, m, y); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  row('Method', (payment.payment_method || '').replace(/_/g, ' ').toUpperCase());
  if (payment.transaction_id) row('Reference', payment.transaction_id);
  y += 2; doc.line(m, y, W - m, y); y += 8;
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
  doc.text('Computer-generated receipt. No signature required.', W / 2, y, { align: 'center' });
  doc.save(`receipt-${studentName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

// ── payment method config ────────────────────────────────────────────────────

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

// ── main component ───────────────────────────────────────────────────────────

export function FeePaymentsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [feeDetails, setFeeDetails] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  // modal state
  const [modal, setModal] = useState<'closed' | 'pay'>('closed');
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [step, setStep] = useState<'method' | 'details' | 'stk' | 'intasend' | 'done'>('method');

  // form fields
  const [method, setMethod] = useState('mpesa_paybill');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState('');
  const [stkPhone, setStkPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [stkStatus, setStkStatus] = useState<'idle'|'processing'|'sent'|'failed'>('idle');
  const [stkMsg, setStkMsg] = useState('');
  const [intasendStatus, setIntasendStatus] = useState<'idle'|'processing'|'sent'|'failed'>('idle');
  const [intasendMsg, setIntasendMsg] = useState('');
  const [intasendRedirectUrl, setIntasendRedirectUrl] = useState('');

  // ── derived ──────────────────────────────────────────────────────────────

  const hasMpesaStk = !!(settings?.mpesa_paybill || settings?.mpesa_till);
  const hasPayInfo = settings && (
    settings.bank_account_number || settings.mpesa_paybill ||
    settings.mpesa_till || settings.payment_instructions
  );

  const invoices: any[]  = feeDetails?.invoices  || [];
  const payments: any[]  = feeDetails?.payments   || [];
  const summary          = feeDetails?.summary    || {};
  const unpaidInvoices   = invoices.filter(i => i.status !== 'paid' && parseFloat(i.balance_amount || 0) > 0);

  const pendingByInvoice: Record<string, any> = {};
  for (const r of pendingRequests) if (r.invoice_id) pendingByInvoice[r.invoice_id] = r;

  const hasIntasend = !!settings?.intasend_enabled;
  const availableMethods = METHODS.filter(m =>
    (m.value !== 'mpesa_stk' || hasMpesaStk) &&
    (m.value !== 'intasend' || hasIntasend)
  );
  const activeMethod = METHODS.find(m => m.value === method) || METHODS[0];

  // ── data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.id) {
      loadAll();
      api.getSettings().then((r: any) => setSettings(r?.data || r || null)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const sid = selectedChild?.id || selectedChild?.student_id;
    if (sid) { loadFees(sid); loadPending(sid); }
  }, [selectedChild]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const r: any = await api.getParentByUserId(user?.id || '');
      const data = r?.data || r;
      const kids = data?.children || [];
      setChildren(kids);
      if (kids.length) setSelectedChild(kids[0]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadFees = async (sid: string) => {
    try {
      const r: any = await api.getStudentFeeAccount(sid);
      setFeeDetails(r?.data || r);
    } catch { setFeeDetails(null); }
  };

  const loadPending = async (sid: string) => {
    try {
      const r: any = await api.getMyPaymentRequests(sid);
      setPendingRequests(r?.data || r || []);
    } catch { setPendingRequests([]); }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const sid = selectedChild?.id || selectedChild?.student_id;
    if (sid) await Promise.all([loadFees(sid), loadPending(sid)]);
    setRefreshing(false);
  }, [selectedChild]);

  // ── modal helpers ─────────────────────────────────────────────────────────

  const openPayModal = (invoice: any) => {
    setActiveInvoice(invoice);
    setMethod('mpesa_paybill');
    setAmount(fmt(invoice.balance_amount || invoice.net_amount).replace(/,/g, ''));
    setRef(''); setMsg(''); setStkPhone('');
    setFormError(''); setStkStatus('idle'); setStkMsg('');
    setIntasendStatus('idle'); setIntasendMsg(''); setIntasendRedirectUrl('');
    setStep('method');
    setModal('pay');
  };

  const closeModal = () => {
    setModal('closed');
    setStep('method');
    setStkStatus('idle');
    setIntasendStatus('idle');
    setFormError('');
  };

  // ── submit manual payment ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount'); return; }
    const maxBal = parseFloat(activeInvoice?.balance_amount || 0);
    if (amt > maxBal + 0.01) { setFormError(`Amount exceeds balance due (KES ${fmt(maxBal)})`); return; }

    const dbMethod = method === 'mpesa_paybill' ? 'mpesa' : method;

    try {
      setSubmitting(true);
      const res: any = await api.submitPaymentRequest({
        invoiceId: activeInvoice.id,
        amount: amt,
        paymentMethod: dbMethod,
        transactionRef: ref.trim() || undefined,
        parentMessage: msg.trim() || undefined,
      });
      if (res.success || res.data?.success) {
        setStep('done');
        refresh();
      } else {
        setFormError(res.message || res.data?.message || 'Failed to submit');
      }
    } catch (e: any) {
      setFormError(e?.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  // ── STK push ─────────────────────────────────────────────────────────────

  const handleStkPush = async () => {
    setFormError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount'); return; }
    if (!/^(\+?254|0)?[17]\d{8}$/.test(stkPhone.replace(/\s/g, ''))) {
      setFormError('Enter a valid Kenyan phone number e.g. 0712345678'); return;
    }
    try {
      setStkStatus('processing'); setStkMsg('Sending prompt to your phone...');
      const res: any = await api.initiateMpesaPayment(activeInvoice.id, stkPhone.replace(/\s/g, ''), amt);
      if (res.success || res.data?.success) {
        setStkStatus('sent');
        setStkMsg(res.message || res.data?.message || 'Check your phone and enter your PIN to complete payment.');
        setTimeout(refresh, 8000);
      } else {
        setStkStatus('failed');
        setStkMsg(res.message || res.data?.message || 'STK push failed. Try manual payment.');
      }
    } catch (e: any) {
      setStkStatus('failed');
      setStkMsg(e?.message || 'Failed to send STK push');
    }
  };

  // ── IntaSend bank/card checkout ─────────────────────────────────────────

  const handleIntasendCheckout = async () => {
    setFormError('');
    try {
      setIntasendStatus('processing'); setIntasendMsg('Creating secure payment session...');
      const res: any = await api.initiateIntasendCheckout(activeInvoice.id);
      const data = res.data || res.data?.data;
      if ((res.success || res.data?.success) && data) {
        setIntasendStatus('sent');
        setIntasendMsg(res.message || res.data?.message || 'Payment session created.');
        if (data.redirectUrl) {
          setIntasendRedirectUrl(data.redirectUrl);
          window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        }
        setTimeout(refresh, 8000);
      } else {
        setIntasendStatus('failed');
        setIntasendMsg(res.message || res.data?.message || 'Could not start payment. Try another method.');
      }
    } catch (e: any) {
      setIntasendStatus('failed');
      setIntasendMsg(e?.message || 'Failed to start bank/card payment');
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={loadAll} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!children.length) return (
    <div className="flex items-center justify-center h-64">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center text-gray-500">
          No children linked to your account
        </CardContent>
      </Card>
    </div>
  );

  const studentName = `${selectedChild?.first_name || ''} ${selectedChild?.last_name || ''}`.trim();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Payments</h2>
          <p className="text-gray-500 text-sm">View outstanding fees and submit payments for confirmation</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((child) => {
            const cid = child.id || child.student_id;
            const sel = selectedChild?.id || selectedChild?.student_id;
            return (
              <button
                key={cid}
                onClick={() => setSelectedChild(child)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  cid === sel
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                }`}
              >
                {child.first_name} {child.last_name}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Total Billed</p>
            <p className="text-xl font-bold text-blue-800 mt-1">KES {fmt(summary.total_invoiced)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-green-500 font-medium uppercase tracking-wide">Confirmed Paid</p>
            <p className="text-xl font-bold text-green-800 mt-1">KES {fmt(summary.total_paid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Balance Due</p>
            <p className="text-xl font-bold text-red-800 mt-1">KES {fmt(summary.total_balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Outstanding Fees — {studentName}
            {unpaidInvoices.length > 0 && (
              <span className="ml-auto text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {unpaidInvoices.length} unpaid
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unpaidInvoices.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
              <p className="font-medium text-green-600">All fees are paid up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {unpaidInvoices.map((inv: any) => {
                const balance = parseFloat(inv.balance_amount || 0);
                const paid    = parseFloat(inv.paid_amount   || 0);
                const total   = parseFloat(inv.net_amount    || inv.total_amount || 0);
                const pct     = total > 0 ? Math.round((paid / total) * 100) : 0;
                const pending = pendingByInvoice[inv.id];
                const isRejected = pending?.status === 'rejected';
                const isPending  = pending?.status === 'pending_confirmation';

                return (
                  <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800 truncate">
                            {inv.description || inv.structure_name || 'School Fees'}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            inv.status === 'overdue' ? 'bg-red-100 text-red-700'
                            : inv.status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {inv.status}
                          </span>
                          {isPending && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Awaiting confirmation
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600 flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Rejected — resubmit
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400">
                          {inv.invoice_number}
                          {inv.term ? ` · ${inv.term}` : ''}
                          {inv.academic_year ? ` · ${inv.academic_year}` : ''}
                          {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString('en-KE')}` : ''}
                        </p>

                        {/* progress bar */}
                        {paid > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>KES {fmt(paid)} paid</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}

                        {isPending && (
                          <p className="text-xs text-orange-600 mt-1">
                            Submitted {new Date(pending.payment_date).toLocaleDateString('en-KE')} ·{' '}
                            {(pending.payment_method || '').replace(/_/g, ' ')}
                            {pending.transaction_id ? ` · Ref: ${pending.transaction_id}` : ''}
                          </p>
                        )}
                        {isRejected && pending.confirmation_note && (
                          <p className="text-xs text-red-500 mt-1">Reason: {pending.confirmation_note}</p>
                        )}
                      </div>

                      {/* Amount + Pay button */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">Balance</p>
                        <p className="text-lg font-bold text-red-700">KES {fmt(balance)}</p>
                        {!isPending ? (
                          <Button
                            size="sm"
                            onClick={() => openPayModal(inv)}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isRejected ? 'Resubmit' : 'Pay Fee'}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <p className="text-xs text-orange-500 mt-2 text-right">Pending...</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All invoices (paid too) */}
      {invoices.filter(i => i.status === 'paid').length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Paid Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {invoices.filter(i => i.status === 'paid').map((inv: any) => (
                <div key={inv.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-700">{inv.description || inv.invoice_number}</p>
                    <p className="text-xs text-gray-400">{inv.invoice_number}{inv.term ? ` · ${inv.term}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Paid</span>
                    <p className="text-sm font-bold text-gray-700 mt-1">KES {fmt(inv.net_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {payments.filter(p => p.status === 'success').length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {payments.filter(p => p.status === 'success').map((p: any) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.invoice_number || 'Payment'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.payment_date || p.created_at).toLocaleDateString('en-KE')}
                      {p.transaction_id && <span className="ml-2 font-mono">{p.transaction_id}</span>}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{(p.payment_method || '').replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-green-700">KES {fmt(p.amount)}</p>
                    <button
                      onClick={() => printReceipt(p, studentName, settings?.school_name || 'School')}
                      className="text-gray-400 hover:text-gray-700 p-1"
                      title="Print receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════ PAY FEE MODAL ══════════════════════ */}
      {modal === 'pay' && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

            {/* modal header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Pay School Fee</h2>
                  <p className="text-blue-200 text-sm mt-0.5">{studentName}</p>
                </div>
                <button onClick={closeModal} className="text-blue-200 hover:text-white p-1 rounded-lg">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              {/* invoice summary */}
              <div className="mt-3 bg-blue-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200">Paying for</p>
                  <p className="font-semibold">{activeInvoice.description || activeInvoice.structure_name || 'School Fees'}</p>
                  <p className="text-blue-200 text-xs">{activeInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-200">Balance Due</p>
                  <p className="text-xl font-bold">KES {fmt(activeInvoice.balance_amount)}</p>
                  {parseFloat(activeInvoice.paid_amount || 0) > 0 && (
                    <p className="text-xs text-green-300">KES {fmt(activeInvoice.paid_amount)} already paid</p>
                  )}
                </div>
              </div>
            </div>

            {/* STEP: DONE */}
            {step === 'done' && (
              <div className="p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-700">Payment Submitted!</h3>
                <p className="text-gray-500 mt-2">
                  Your payment has been sent to the school admin for confirmation. You will see an update once they verify it.
                </p>
                <Button onClick={closeModal} className="mt-6 w-full">Done</Button>
              </div>
            )}

            {/* STEP: CHOOSE METHOD */}
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

            {/* STEP: MANUAL PAYMENT DETAILS */}
            {step === 'details' && (
              <div className="p-6 space-y-5">
                {/* School payment details box */}
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

                {/* Instructions */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-700">How to complete payment:</p>
                  <p>1. Pay using the details above</p>
                  <p>2. Copy your confirmation code / reference</p>
                  <p>3. Fill in the form below and click <strong>Submit</strong></p>
                </div>

                {/* Form */}
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
                      You can pay a partial amount. Balance due: KES {fmt(activeInvoice.balance_amount)}
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
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit to Admin
                  </Button>
                </div>
              </div>
            )}

            {/* STEP: M-PESA STK PUSH */}
            {step === 'stk' && (
              <div className="p-6 space-y-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <span className="text-4xl">📲</span>
                  <p className="font-semibold text-green-800 mt-2">M-Pesa STK Push</p>
                  <p className="text-sm text-green-600 mt-1">
                    Enter your phone number and we'll send a payment prompt directly to it.
                    Enter your PIN to complete.
                  </p>
                </div>

                <div>
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-lg font-semibold mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Balance due: KES {fmt(activeInvoice.balance_amount)}</p>
                </div>

                <div>
                  <Label>M-Pesa Phone Number</Label>
                  <Input
                    type="tel"
                    value={stkPhone}
                    onChange={e => setStkPhone(e.target.value)}
                    placeholder="0712345678"
                    className="mt-1"
                  />
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setMethod('mpesa_paybill'); setStep('details'); setStkStatus('idle'); }}
                    >
                      Use Manual Payment Instead
                    </Button>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('method')} className="flex-1">Back</Button>
                  {stkStatus !== 'sent' && (
                    <Button
                      onClick={handleStkPush}
                      disabled={stkStatus === 'processing'}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {stkStatus === 'processing'
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Phone className="h-4 w-4 mr-2" />}
                      Send Prompt
                    </Button>
                  )}
                  {stkStatus === 'sent' && (
                    <Button onClick={closeModal} className="flex-1">Done</Button>
                  )}
                </div>
              </div>
            )}

            {/* STEP: INTASEND BANK/CARD */}
            {step === 'intasend' && (
              <div className="p-6 space-y-5">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                  <CreditCard className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="font-semibold text-indigo-800">Bank / Card Payment</p>
                  <p className="text-sm text-indigo-600 mt-1">
                    You'll be taken to a secure payment page. Once you complete payment there,
                    it's automatically confirmed here — no need to submit a reference.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  Balance due: <span className="font-semibold">KES {fmt(activeInvoice.balance_amount)}</span>
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
                    <p className="text-xs text-gray-400 mt-2">
                      This page will update automatically once payment is confirmed.
                    </p>
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
                    <Button
                      onClick={handleIntasendCheckout}
                      disabled={intasendStatus === 'processing'}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {intasendStatus === 'processing'
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <CreditCard className="h-4 w-4 mr-2" />}
                      Pay Now
                    </Button>
                  )}
                  {intasendStatus === 'sent' && (
                    <Button onClick={closeModal} className="flex-1">Done</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
