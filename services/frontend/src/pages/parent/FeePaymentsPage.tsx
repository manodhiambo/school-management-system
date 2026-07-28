import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Loader2, Printer, XCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { jsPDF } from 'jspdf';
import { PayFeeModal } from '@/components/modals/PayFeeModal';

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

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  // ── derived ──────────────────────────────────────────────────────────────

  const invoices: any[]  = feeDetails?.invoices  || [];
  const payments: any[]  = feeDetails?.payments   || [];
  const summary          = feeDetails?.summary    || {};
  const unpaidInvoices   = invoices.filter(i => i.status !== 'paid' && parseFloat(i.balance_amount || 0) > 0);

  const pendingByInvoice: Record<string, any> = {};
  for (const r of pendingRequests) if (r.invoice_id) pendingByInvoice[r.invoice_id] = r;

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
    setPayModalOpen(true);
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

      <PayFeeModal
        open={payModalOpen}
        invoice={activeInvoice}
        studentName={studentName}
        settings={settings}
        onClose={() => setPayModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
