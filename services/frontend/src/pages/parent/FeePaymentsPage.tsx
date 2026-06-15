import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, CheckCircle, AlertCircle, Clock, Phone, Loader2,
  Printer, Building2, Send, XCircle, Info, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { jsPDF } from 'jspdf';

function printPaymentReceipt(payment: any, studentName: string, schoolName = 'School') {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const margin = 15;
  const pageW = 148;
  let y = margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('PAYMENT RECEIPT', pageW / 2, 17, { align: 'center' });

  y = 30;
  doc.setTextColor(30, 30, 30);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  const addRow = (label: string, value: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 42, y);
    y += 6;
  };

  addRow('Receipt No', payment.transaction_id || payment.receipt_number || `RCP-${Date.now()}`);
  addRow('Date', new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-KE'));
  addRow('Student', studentName);
  if (payment.description || payment.invoice_description) addRow('Description', payment.description || payment.invoice_description);
  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`Amount Paid: KES ${Number(payment.amount || 0).toLocaleString()}`, margin, y);
  y += 7;

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  addRow('Payment Method', (payment.payment_method || '').replace(/_/g, ' ').toUpperCase() || 'N/A');
  if (payment.transaction_id) addRow('Reference', payment.transaction_id);

  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('This is a computer-generated receipt. No signature required.', pageW / 2, y, { align: 'center' });

  doc.save(`receipt-${studentName.replace(/\s+/g, '-')}-${payment.transaction_id || Date.now()}.pdf`);
}

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa (Paybill/Till)' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'coop_bus_bank', label: 'Co-op Bank' },
  { value: 'other', label: 'Other' },
];

export function FeePaymentsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [feeDetails, setFeeDetails] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // M-Pesa state
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [mpesaMessage, setMpesaMessage] = useState('');

  // Submit payment request state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitInvoice, setSubmitInvoice] = useState<any>(null);
  const [submitMethod, setSubmitMethod] = useState('mpesa');
  const [submitRef, setSubmitRef] = useState('');
  const [submitAmount, setSubmitAmount] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const mpesaStkEnabled = !!(schoolSettings?.mpesa_paybill || schoolSettings?.mpesa_till);

  useEffect(() => {
    if (user?.id) {
      loadChildren();
      api.getSettings()
        .then((r: any) => setSchoolSettings(r?.data || r || null))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      const sid = selectedChild.id || selectedChild.student_id;
      loadFeeDetails(sid);
      loadPendingRequests(sid);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getParentByUserId(user?.id || '');
      const parentData = response.data || response;
      const childrenData = parentData.children || [];
      setChildren(childrenData);
      if (childrenData.length > 0) setSelectedChild(childrenData[0]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadFeeDetails = async (studentId: string) => {
    if (!studentId) return;
    try {
      const response: any = await api.getStudentFeeAccount(studentId);
      setFeeDetails(response.data || response);
    } catch {
      setFeeDetails(null);
    }
  };

  const loadPendingRequests = async (studentId: string) => {
    if (!studentId) return;
    try {
      const response: any = await api.getMyPaymentRequests(studentId);
      setPendingRequests(response.data || response || []);
    } catch {
      setPendingRequests([]);
    }
  };

  const refresh = () => {
    const sid = selectedChild?.id || selectedChild?.student_id;
    if (sid) { loadFeeDetails(sid); loadPendingRequests(sid); }
  };

  // M-Pesa STK push
  const openMpesaModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setMpesaAmount(parseFloat(invoice.balance_amount || invoice.net_amount || 0).toString());
    setMpesaPhone('');
    setMpesaStatus('idle');
    setMpesaMessage('');
    setMpesaModalOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!mpesaPhone || !mpesaAmount) { setMpesaMessage('Please fill in all fields'); return; }
    const amount = parseFloat(mpesaAmount);
    if (isNaN(amount) || amount <= 0) { setMpesaMessage('Enter a valid amount'); return; }
    const maxBalance = parseFloat(selectedInvoice?.balance_amount || selectedInvoice?.net_amount || 0);
    if (amount > maxBalance) { setMpesaMessage(`Amount exceeds balance (KES ${maxBalance.toLocaleString()})`); return; }
    if (!/^(\+?254|0)?[17]\d{8}$/.test(mpesaPhone.replace(/\s/g, ''))) {
      setMpesaMessage('Enter a valid Kenyan phone number e.g. 0712345678'); return;
    }
    try {
      setMpesaLoading(true);
      setMpesaStatus('processing');
      setMpesaMessage('Sending request to your phone...');
      const res: any = await api.initiateMpesaPayment(selectedInvoice.id, mpesaPhone.replace(/\s/g, ''), amount);
      if (res.success || res.data?.success) {
        setMpesaStatus('success');
        setMpesaMessage(res.message || res.data?.message || 'Check your phone and enter your M-Pesa PIN.');
        setTimeout(refresh, 6000);
      } else {
        setMpesaStatus('failed');
        setMpesaMessage(res.message || res.data?.message || 'Failed to initiate payment');
      }
    } catch (err: any) {
      setMpesaStatus('failed');
      setMpesaMessage(err?.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setMpesaLoading(false);
    }
  };

  // Submit payment request
  const openSubmitModal = (invoice: any) => {
    setSubmitInvoice(invoice);
    setSubmitMethod('mpesa');
    setSubmitRef('');
    setSubmitAmount(parseFloat(invoice.balance_amount || invoice.net_amount || 0).toString());
    setSubmitMessage('');
    setSubmitError('');
    setSubmitSuccess(false);
    setSubmitModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    setSubmitError('');
    const amount = parseFloat(submitAmount);
    if (isNaN(amount) || amount <= 0) { setSubmitError('Enter a valid amount'); return; }
    const maxBalance = parseFloat(submitInvoice?.balance_amount || submitInvoice?.net_amount || 0);
    if (amount > maxBalance + 0.01) { setSubmitError(`Amount exceeds balance (KES ${maxBalance.toLocaleString()})`); return; }
    if (!submitMethod) { setSubmitError('Select a payment method'); return; }

    try {
      setSubmitLoading(true);
      const res: any = await api.submitPaymentRequest({
        invoiceId: submitInvoice.id,
        amount,
        paymentMethod: submitMethod,
        transactionRef: submitRef || undefined,
        parentMessage: submitMessage || undefined,
      });
      if (res.success || res.data?.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitModalOpen(false);
          setSubmitSuccess(false);
          refresh();
        }, 2500);
      } else {
        setSubmitError(res.message || res.data?.message || 'Failed to submit request');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit payment request');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Build a map: invoiceId → pending request (if any)
  const pendingByInvoice: Record<string, any> = {};
  for (const r of pendingRequests) {
    if (r.invoice_id) pendingByInvoice[r.invoice_id] = r;
  }

  const summary = feeDetails?.summary || {};
  const invoices: any[] = feeDetails?.invoices || [];
  const payments: any[] = feeDetails?.payments || [];
  const hasPaymentInfo = schoolSettings && (
    schoolSettings.bank_account_number || schoolSettings.mpesa_paybill ||
    schoolSettings.mpesa_till || schoolSettings.payment_instructions
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle className="text-red-600">Error Loading Fee Information</CardTitle></CardHeader>
          <CardContent><p className="text-gray-600">{error}</p><Button onClick={loadChildren} className="mt-4">Retry</Button></CardContent>
        </Card>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md"><CardContent className="pt-6">
          <p className="text-center text-gray-500">No children linked to your account</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Fee Payments</h2>
        <p className="text-gray-500">View invoices, submit payments, and track confirmations</p>
      </div>

      {/* Child Selector */}
      <div className="flex gap-2 flex-wrap">
        {children.map((child) => (
          <Button
            key={child.id || child.student_id}
            variant={(selectedChild?.id || selectedChild?.student_id) === (child.id || child.student_id) ? 'default' : 'outline'}
            onClick={() => setSelectedChild(child)}
          >
            {child.first_name} {child.last_name}
          </Button>
        ))}
      </div>

      {/* School Payment Details */}
      {hasPaymentInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              School Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900 space-y-1">
            {schoolSettings.bank_name && <p><span className="font-medium">Bank:</span> {schoolSettings.bank_name}</p>}
            {schoolSettings.bank_account_number && <p><span className="font-medium">Account No:</span> {schoolSettings.bank_account_number}</p>}
            {schoolSettings.mpesa_paybill && (
              <p>
                <span className="font-medium">M-Pesa Paybill:</span> {schoolSettings.mpesa_paybill}
                {schoolSettings.mpesa_account_ref && <span className="ml-2 text-xs">(Account: {schoolSettings.mpesa_account_ref})</span>}
              </p>
            )}
            {schoolSettings.mpesa_till && <p><span className="font-medium">M-Pesa Till No:</span> {schoolSettings.mpesa_till}</p>}
            {schoolSettings.payment_instructions && (
              <p className="mt-2 text-xs italic border-t border-blue-200 pt-2">{schoolSettings.payment_instructions}</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedChild && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {parseFloat(summary.total_invoiced || '0').toLocaleString()}</div>
                <p className="text-xs text-gray-500">This academic year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">KES {parseFloat(summary.total_paid || '0').toLocaleString()}</div>
                <p className="text-xs text-gray-500">Confirmed payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">KES {parseFloat(summary.total_balance || '0').toLocaleString()}</div>
                <p className="text-xs text-gray-500">Outstanding amount</p>
              </CardContent>
            </Card>
          </div>

          {/* Invoices */}
          <Card>
            <CardHeader><CardTitle>Fee Invoices</CardTitle></CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => {
                    const balance = parseFloat(invoice.balance_amount || 0);
                    const total = parseFloat(invoice.net_amount || invoice.total_amount || 0);
                    const pending = pendingByInvoice[invoice.id];
                    const isPaid = invoice.status === 'paid';
                    const canPay = !isPaid && balance > 0 && !pending;

                    return (
                      <div key={invoice.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold">
                                {invoice.description || invoice.structure_name || invoice.invoice_number || 'School Fees'}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isPaid ? 'bg-green-100 text-green-700'
                                : invoice.status === 'overdue' ? 'bg-red-100 text-red-700'
                                : invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}>
                                {invoice.status}
                              </span>
                              {pending && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  pending.status === 'pending_confirmation'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {pending.status === 'pending_confirmation' ? 'Pending confirmation' : 'Submission rejected'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">Inv: {invoice.invoice_number}</p>
                            {invoice.due_date && (
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                Due: {new Date(invoice.due_date).toLocaleDateString('en-KE')}
                              </p>
                            )}
                            {invoice.term && (
                              <p className="text-xs text-gray-400">{invoice.term} — {invoice.academic_year}</p>
                            )}
                            {pending?.status === 'rejected' && pending.confirmation_note && (
                              <p className="text-xs text-red-500 mt-1">Reason: {pending.confirmation_note}</p>
                            )}
                            {pending?.status === 'pending_confirmation' && (
                              <p className="text-xs text-orange-600 mt-1">
                                Submitted {new Date(pending.payment_date).toLocaleDateString('en-KE')} via {(pending.payment_method || '').replace(/_/g, ' ')}
                                {pending.transaction_id ? ` · Ref: ${pending.transaction_id}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                            <div className="text-left md:text-right">
                              <p className="text-lg font-bold">KES {total.toLocaleString()}</p>
                              {balance > 0 && (
                                <p className="text-sm text-red-600">Balance: KES {balance.toLocaleString()}</p>
                              )}
                              {parseFloat(invoice.paid_amount || 0) > 0 && (
                                <p className="text-xs text-green-600">Paid: KES {parseFloat(invoice.paid_amount).toLocaleString()}</p>
                              )}
                            </div>

                            {canPay && (
                              <div className="flex flex-col gap-2">
                                {mpesaStkEnabled && (
                                  <Button
                                    size="sm"
                                    onClick={() => openMpesaModal(invoice)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Phone className="h-3 w-3 mr-1" />
                                    M-Pesa STK
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSubmitModal(invoice)}
                                  className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Submit Payment
                                </Button>
                              </div>
                            )}

                            {pending?.status === 'rejected' && canPay === false && !isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSubmitModal(invoice)}
                                className="border-blue-400 text-blue-700 hover:bg-blue-50"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Resubmit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No invoices found</p>
                  <p className="text-xs mt-1">Contact the school if you believe fees are owed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
              {payments.filter((p: any) => p.status === 'success').length > 0 ? (
                <div className="space-y-2">
                  {payments
                    .filter((p: any) => p.status === 'success')
                    .map((payment: any, index: number) => (
                      <div key={payment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{payment.invoice_number || 'Fee Payment'}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-KE')}
                            {payment.transaction_id && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {payment.transaction_id}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-green-600">KES {parseFloat(payment.amount).toLocaleString()}</p>
                            <p className="text-xs text-gray-500 capitalize">{(payment.payment_method || 'N/A').replace(/_/g, ' ')}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Print receipt"
                            onClick={() => printPaymentReceipt(
                              payment,
                              `${selectedChild?.first_name || ''} ${selectedChild?.last_name || ''}`.trim(),
                              schoolSettings?.school_name || 'School'
                            )}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No confirmed payments yet</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── M-Pesa STK Modal ── */}
      <Dialog open={mpesaModalOpen} onOpenChange={setMpesaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Pay with M-Pesa STK Push
            </DialogTitle>
            <DialogDescription>Receive a prompt on your phone to enter your PIN</DialogDescription>
          </DialogHeader>

          {mpesaStatus === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Input value={selectedInvoice?.description || selectedInvoice?.invoice_number || 'School Fees'} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpesa-amount">Amount (KES)</Label>
                <Input
                  id="mpesa-amount"
                  type="number"
                  value={mpesaAmount}
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  max={parseFloat(selectedInvoice?.balance_amount || selectedInvoice?.net_amount || 0)}
                />
                <p className="text-xs text-gray-500">Max: KES {parseFloat(selectedInvoice?.balance_amount || selectedInvoice?.net_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                <Input id="mpesa-phone" type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="0712345678" />
              </div>
              {mpesaMessage && <p className="text-sm text-red-600">{mpesaMessage}</p>}
            </div>
          )}
          {mpesaStatus === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium">Processing...</p>
              <p className="text-gray-500">{mpesaMessage}</p>
            </div>
          )}
          {mpesaStatus === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium text-green-600">Request Sent!</p>
              <p className="text-gray-500 mt-2">{mpesaMessage}</p>
            </div>
          )}
          {mpesaStatus === 'failed' && (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <p className="text-lg font-medium text-red-600">Payment Failed</p>
              <p className="text-gray-500 mt-2">{mpesaMessage}</p>
            </div>
          )}

          <DialogFooter>
            {mpesaStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setMpesaModalOpen(false)}>Cancel</Button>
                <Button onClick={handleMpesaPayment} disabled={mpesaLoading} className="bg-green-600 hover:bg-green-700">
                  {mpesaLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                  Send Request
                </Button>
              </>
            )}
            {(mpesaStatus === 'success' || mpesaStatus === 'failed') && (
              <Button onClick={() => { setMpesaModalOpen(false); refresh(); }}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Payment Request Modal ── */}
      <Dialog open={submitModalOpen} onOpenChange={(open) => { setSubmitModalOpen(open); if (!open) refresh(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Submit Payment for Confirmation
            </DialogTitle>
            <DialogDescription>
              Fill in how and how much you paid. The school will verify and confirm your payment.
            </DialogDescription>
          </DialogHeader>

          {submitSuccess ? (
            <div className="py-10 text-center">
              <CheckCircle className="h-14 w-14 mx-auto text-green-600 mb-4" />
              <p className="text-xl font-semibold text-green-700">Payment Submitted!</p>
              <p className="text-gray-500 mt-2">The school admin will verify and confirm your payment shortly.</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{submitInvoice?.description || submitInvoice?.invoice_number || 'School Fees'}</p>
                <p className="text-gray-500">Balance: KES {parseFloat(submitInvoice?.balance_amount || submitInvoice?.net_amount || 0).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submit-method">Payment Method *</Label>
                  <Select
                    id="submit-method"
                    value={submitMethod}
                    onChange={(e) => setSubmitMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submit-amount">Amount Paid (KES) *</Label>
                  <Input
                    id="submit-amount"
                    type="number"
                    value={submitAmount}
                    onChange={(e) => setSubmitAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="submit-ref">
                  Transaction Reference / Code
                  <span className="text-gray-400 text-xs ml-1">(e.g. M-Pesa code, Bank ref)</span>
                </Label>
                <Input
                  id="submit-ref"
                  value={submitRef}
                  onChange={(e) => setSubmitRef(e.target.value)}
                  placeholder="e.g. QJK8XXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submit-msg">
                  Message to Admin
                  <span className="text-gray-400 text-xs ml-1">(optional)</span>
                </Label>
                <textarea
                  id="submit-msg"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={submitMessage}
                  onChange={(e) => setSubmitMessage(e.target.value)}
                  placeholder="e.g. Paid via M-Pesa paybill 400200 on 15/06/2026..."
                />
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}
            </div>
          )}

          {!submitSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitRequest} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700">
                {submitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit to Admin
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
