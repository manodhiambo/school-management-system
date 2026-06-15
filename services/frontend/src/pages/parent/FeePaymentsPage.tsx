import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, CheckCircle, AlertCircle, Clock, Phone, Loader2, Printer, Building2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  if (payment.description) addRow('Description', payment.description);

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

export function FeePaymentsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [feeDetails, setFeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // M-Pesa payment state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');

  const mpesaEnabled = !!(
    schoolSettings?.mpesa_paybill ||
    schoolSettings?.mpesa_till ||
    process.env.VITE_MPESA_ENABLED === 'true'
  );

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
      loadFeeDetails(selectedChild.id || selectedChild.student_id);
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
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (err: any) {
      console.error('Error loading children:', err);
      setError(err?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadFeeDetails = async (studentId: string) => {
    if (!studentId) return;
    try {
      const response: any = await api.getStudentFeeAccount(studentId);
      // Backend returns: { success, data: { student, invoices, payments, structures, extra_fees, summary } }
      setFeeDetails(response.data || response);
    } catch (err: any) {
      console.error('Error loading fees:', err);
      setFeeDetails(null);
    }
  };

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    const balance = parseFloat(invoice.balance_amount || invoice.net_amount || 0);
    setPaymentAmount(balance > 0 ? balance.toString() : '');
    setPhoneNumber('');
    setPaymentStatus('idle');
    setPaymentMessage('');
    setPaymentModalOpen(true);
  };

  const handleMpesaPayment = async () => {
    if (!selectedInvoice || !phoneNumber || !paymentAmount) {
      setPaymentMessage('Please fill in all fields');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentMessage('Please enter a valid amount');
      return;
    }

    const maxBalance = parseFloat(selectedInvoice.balance_amount || selectedInvoice.net_amount || 0);
    if (amount > maxBalance) {
      setPaymentMessage(`Amount exceeds the balance due (KES ${maxBalance.toLocaleString()})`);
      return;
    }

    const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setPaymentMessage('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentStatus('processing');
      setPaymentMessage('Sending payment request to your phone...');

      const response: any = await api.initiateMpesaPayment(
        selectedInvoice.id,
        phoneNumber.replace(/\s/g, ''),
        amount
      );

      if (response.success || response.data?.success) {
        setPaymentStatus('success');
        setPaymentMessage(
          response.message || response.data?.message ||
          'Payment request sent! Check your phone and enter your M-Pesa PIN to complete.'
        );
        setTimeout(() => {
          loadFeeDetails(selectedChild?.id || selectedChild?.student_id);
        }, 5000);
      } else {
        setPaymentStatus('failed');
        setPaymentMessage(response.message || response.data?.message || 'Failed to initiate payment');
      }
    } catch (err: any) {
      console.error('M-Pesa payment error:', err);
      setPaymentStatus('failed');
      setPaymentMessage(err?.message || 'Failed to initiate M-Pesa payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedInvoice(null);
    setPhoneNumber('');
    setPaymentAmount('');
    setPaymentStatus('idle');
    setPaymentMessage('');
    if (selectedChild) {
      loadFeeDetails(selectedChild.id || selectedChild.student_id);
    }
  };

  // Pull summary from backend response
  const summary = feeDetails?.summary || {};
  const invoices: any[] = feeDetails?.invoices || [];
  const payments: any[] = feeDetails?.payments || [];

  const hasPaymentInfo = schoolSettings && (
    schoolSettings.bank_account_number ||
    schoolSettings.mpesa_paybill ||
    schoolSettings.mpesa_till ||
    schoolSettings.payment_instructions
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Fee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadChildren} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No children linked to your account</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Fee Payments</h2>
        <p className="text-gray-500">View fee invoices and make payments</p>
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
            {schoolSettings.bank_name && (
              <p><span className="font-medium">Bank:</span> {schoolSettings.bank_name}</p>
            )}
            {schoolSettings.bank_account_number && (
              <p><span className="font-medium">Account No:</span> {schoolSettings.bank_account_number}</p>
            )}
            {schoolSettings.mpesa_paybill && (
              <p>
                <span className="font-medium">M-Pesa Paybill:</span> {schoolSettings.mpesa_paybill}
                {schoolSettings.mpesa_account_ref && (
                  <span className="ml-2 text-xs">(Account: {schoolSettings.mpesa_account_ref})</span>
                )}
              </p>
            )}
            {schoolSettings.mpesa_till && (
              <p><span className="font-medium">M-Pesa Till No:</span> {schoolSettings.mpesa_till}</p>
            )}
            {schoolSettings.payment_instructions && (
              <p className="mt-2 text-xs italic border-t border-blue-200 pt-2">
                {schoolSettings.payment_instructions}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedChild && (
        <>
          {/* Fee Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {parseFloat(summary.total_invoiced || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">This academic year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  KES {parseFloat(summary.total_paid || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Cleared payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  KES {parseFloat(summary.total_balance || '0').toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Outstanding amount</p>
              </CardContent>
            </Card>
          </div>

          {/* Fee Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => {
                    const balance = parseFloat(invoice.balance_amount || 0);
                    const total = parseFloat(invoice.net_amount || invoice.total_amount || 0);
                    const canPay = invoice.status !== 'paid' && balance > 0;

                    return (
                      <div
                        key={invoice.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">
                              {invoice.description || invoice.structure_name || invoice.invoice_number || 'School Fees'}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'overdue'
                                ? 'bg-red-100 text-red-700'
                                : invoice.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Inv: {invoice.invoice_number}</p>
                          {invoice.due_date && (
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Due: {new Date(invoice.due_date).toLocaleDateString('en-KE')}
                            </p>
                          )}
                          {invoice.term && (
                            <p className="text-xs text-gray-400">{invoice.term} — {invoice.academic_year}</p>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                          <div className="text-left md:text-right">
                            <p className="text-lg font-bold">
                              KES {total.toLocaleString()}
                            </p>
                            {balance > 0 && (
                              <p className="text-sm text-red-600">
                                Balance: KES {balance.toLocaleString()}
                              </p>
                            )}
                            {parseFloat(invoice.paid_amount || 0) > 0 && (
                              <p className="text-xs text-green-600">
                                Paid: KES {parseFloat(invoice.paid_amount).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {canPay && mpesaEnabled && (
                            <Button
                              onClick={() => openPaymentModal(invoice)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Pay with M-Pesa
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No invoices found for this student</p>
                  <p className="text-xs mt-1">Contact the school office if you believe fees are owed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((payment: any, index: number) => (
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
                          <p className="font-bold text-green-600">
                            KES {parseFloat(payment.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {(payment.payment_method || 'N/A').replace(/_/g, ' ')}
                          </p>
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
                <p className="text-center text-gray-500 py-8">No payment history</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* M-Pesa Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Pay with M-Pesa
            </DialogTitle>
            <DialogDescription>
              Enter your M-Pesa registered phone number to receive a payment prompt
            </DialogDescription>
          </DialogHeader>

          {paymentStatus === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice</Label>
                <Input
                  id="invoice"
                  value={selectedInvoice?.description || selectedInvoice?.invoice_number || 'School Fees'}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={parseFloat(selectedInvoice?.balance_amount || selectedInvoice?.net_amount || 0)}
                />
                <p className="text-xs text-gray-500">
                  Maximum: KES {parseFloat(selectedInvoice?.balance_amount || selectedInvoice?.net_amount || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                />
                <p className="text-xs text-gray-500">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              {paymentMessage && (
                <p className="text-sm text-red-600">{paymentMessage}</p>
              )}
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium">Processing Payment</p>
              <p className="text-gray-500">{paymentMessage}</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium text-green-600">Payment Request Sent!</p>
              <p className="text-gray-500 mt-2">{paymentMessage}</p>
              <p className="text-sm text-gray-400 mt-4">
                You will receive an SMS confirmation once the payment is complete.
              </p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <p className="text-lg font-medium text-red-600">Payment Failed</p>
              <p className="text-gray-500 mt-2">{paymentMessage}</p>
            </div>
          )}

          <DialogFooter>
            {paymentStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={closePaymentModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMpesaPayment}
                  disabled={paymentLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Send Payment Request
                    </>
                  )}
                </Button>
              </>
            )}
            {(paymentStatus === 'success' || paymentStatus === 'failed') && (
              <Button onClick={closePaymentModal}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
