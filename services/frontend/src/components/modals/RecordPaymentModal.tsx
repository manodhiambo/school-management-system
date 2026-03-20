import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, Share2, Download, CheckCircle2, X, Loader2 } from 'lucide-react';
import api from '@/services/api';
import jsPDF from 'jspdf';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedStudentId?: string;
  preselectedInvoiceId?: string;
}

const EMPTY_FORM = {
  student_id: '',
  invoice_id: '',
  amount: '',
  payment_method: 'cash',
  transaction_id: '',
  payment_date: new Date().toISOString().split('T')[0],
  remarks: '',
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedStudentId,
  preselectedInvoiceId,
}: RecordPaymentModalProps) {
  const [step, setStep] = useState<'form' | 'receipt'>('form');
  const [loading, setLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);

  // Student search
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feeAccount, setFeeAccount] = useState<any>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [receipt, setReceipt] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load students on open
  useEffect(() => {
    if (open) {
      loadStudents();
      setStep('form');
      setReceipt(null);
      setFeeAccount(null);
      setSelectedStudent(null);
      setStudentSearch('');
      setForm({ ...EMPTY_FORM });
    }
  }, [open]);

  // Handle preselected student
  useEffect(() => {
    if (open && preselectedStudentId && students.length > 0) {
      const st = students.find((s: any) => s.id === preselectedStudentId);
      if (st) selectStudent(st);
    }
  }, [open, preselectedStudentId, students]);

  // Handle preselected invoice
  useEffect(() => {
    if (preselectedInvoiceId && feeAccount?.invoices) {
      const inv = feeAccount.invoices.find((i: any) => i.id === preselectedInvoiceId);
      if (inv) {
        setForm(f => ({
          ...f,
          invoice_id: inv.id,
          amount: String(inv.balance_amount || inv.net_amount || ''),
        }));
      }
    }
  }, [preselectedInvoiceId, feeAccount]);

  const loadStudents = async () => {
    try {
      const res: any = await api.getStudents();
      setStudents(res.data || []);
    } catch {
      setStudents([]);
    }
  };

  const selectStudent = async (student: any) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.first_name} ${student.last_name} (${student.admission_number})`);
    setShowStudentDropdown(false);
    setForm(f => ({ ...f, student_id: student.id, invoice_id: '', amount: '' }));
    setStudentLoading(true);
    try {
      const res: any = await api.getStudentFeeAccount(student.id);
      setFeeAccount(res.data || null);
    } catch {
      setFeeAccount(null);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = feeAccount?.invoices?.find((i: any) => i.id === invoiceId);
    setForm(f => ({
      ...f,
      invoice_id: invoiceId,
      amount: inv ? String(inv.balance_amount || inv.net_amount || '') : f.amount,
    }));
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch || selectedStudent) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) return;
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.recordFeePayment({
        invoice_id: form.invoice_id || null,
        student_id: form.student_id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        transaction_id: form.transaction_id || null,
        payment_date: form.payment_date || null,
        remarks: form.remarks || null,
      });

      // Fetch receipt
      const paymentId = res?.data?.id || res?.data?.payment?.id;
      if (paymentId) {
        try {
          const rRes: any = await api.getFeeReceipt(paymentId);
          const row = rRes.data;
          if (row) {
            setReceipt({
              student: {
                first_name: row.first_name,
                last_name: row.last_name,
                admission_number: row.admission_number,
                class_name: row.class_name,
              },
              payment: {
                amount: row.amount,
                payment_method: row.payment_method,
                transaction_id: row.transaction_id,
                payment_date: row.payment_date?.split('T')[0] || form.payment_date,
                remarks: row.remarks,
                receipt_number: row.receipt_number || `RCP-${paymentId.slice(-8).toUpperCase()}`,
              },
              invoice: row.invoice_number ? {
                invoice_number: row.invoice_number,
                net_amount: row.invoice_amount,
                balance_amount: row.invoice_balance,
                description: row.invoice_description,
              } : null,
              balance_after: (feeAccount?.summary?.total_balance || 0) - Number(form.amount),
            });
          } else {
            setReceipt(buildLocalReceipt(res.data));
          }
        } catch {
          setReceipt(buildLocalReceipt(res.data));
        }
      } else {
        setReceipt(buildLocalReceipt(null));
      }

      onSuccess();
      setStep('receipt');
    } catch (error: any) {
      alert(error?.response?.data?.message || error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const buildLocalReceipt = (paymentData: any) => ({
    student: selectedStudent,
    payment: {
      amount: Number(form.amount),
      payment_method: form.payment_method,
      transaction_id: form.transaction_id,
      payment_date: form.payment_date,
      remarks: form.remarks,
      receipt_number: paymentData?.receipt_number || `RCP-${Date.now()}`,
    },
    invoice: feeAccount?.invoices?.find((i: any) => i.id === form.invoice_id) || null,
    balance_after: (feeAccount?.summary?.total_balance || 0) - Number(form.amount),
  });

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    if (!receipt) return;
    const st = receipt.student || selectedStudent;
    const text = [
      `*Payment Receipt — SkulManager*`,
      `Receipt No: ${receipt.payment?.receipt_number || '-'}`,
      `Student: ${st?.first_name} ${st?.last_name} (${st?.admission_number})`,
      `Class: ${st?.class_name || '-'}`,
      `Amount Paid: KES ${fmt(receipt.payment?.amount)}`,
      `Payment Method: ${(receipt.payment?.payment_method || '').replace('_', ' ').toUpperCase()}`,
      `Date: ${receipt.payment?.payment_date || form.payment_date}`,
      receipt.payment?.transaction_id ? `Ref: ${receipt.payment.transaction_id}` : '',
      receipt.invoice ? `Invoice: ${receipt.invoice.invoice_number}` : '',
      `Balance After: KES ${fmt(receipt.balance_after)}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPDF = () => {
    if (!receipt) return;
    const st = receipt.student || selectedStudent;
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const margin = 15;
    let y = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 74, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SkulManager School Management System', 74, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, 148 - margin, y);
    y += 6;

    const addRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, y);
      y += 6;
    };

    addRow('Receipt No', receipt.payment?.receipt_number || '-');
    addRow('Date', receipt.payment?.payment_date || '-');
    addRow('Student', `${st?.first_name || ''} ${st?.last_name || ''}`);
    addRow('Adm No', st?.admission_number || '-');
    addRow('Class', st?.class_name || '-');
    if (receipt.invoice) addRow('Invoice', receipt.invoice.invoice_number);
    y += 2;
    doc.line(margin, y, 148 - margin, y);
    y += 6;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid: KES ${fmt(receipt.payment?.amount)}`, margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addRow('Payment Method', (receipt.payment?.payment_method || '').replace('_', ' ').toUpperCase());
    if (receipt.payment?.transaction_id) addRow('Reference', receipt.payment.transaction_id);
    if (receipt.payment?.remarks) addRow('Remarks', receipt.payment.remarks);
    y += 2;
    doc.line(margin, y, 148 - margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(`Balance After Payment: KES ${fmt(receipt.balance_after)}`, margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated receipt. No signature required.', 74, y, { align: 'center' });

    doc.save(`receipt-${st?.admission_number || 'student'}-${receipt.payment?.receipt_number || Date.now()}.pdf`);
  };

  const openInvoices = feeAccount?.invoices?.filter(
    (i: any) => i.status !== 'paid' && Number(i.balance_amount) > 0
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'receipt' ? 'Payment Receipt' : 'Record Payment'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student search */}
            <div ref={searchRef} className="relative">
              <Label>Student *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or admission no..."
                  value={studentSearch}
                  onChange={e => {
                    setStudentSearch(e.target.value);
                    setSelectedStudent(null);
                    setFeeAccount(null);
                    setForm(f => ({ ...f, student_id: '', invoice_id: '', amount: '' }));
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => !selectedStudent && setShowStudentDropdown(true)}
                  className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {showStudentDropdown && studentSearch && !selectedStudent && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No students found</div>
                  ) : (
                    filteredStudents.slice(0, 20).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                        onClick={() => selectStudent(s)}
                      >
                        <span>{s.first_name} {s.last_name}</span>
                        <span className="text-gray-400 text-xs">{s.admission_number} · {s.class_name || 'No class'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Student fee account summary */}
            {studentLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading fee account...
              </div>
            )}

            {feeAccount && !studentLoading && (
              <div className="rounded-lg border bg-blue-50 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Expected</p>
                    <p className="font-semibold text-gray-800">KES {fmt(feeAccount.summary?.total_expected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Paid</p>
                    <p className="font-semibold text-green-700">KES {fmt(feeAccount.summary?.total_paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Balance Due</p>
                    <p className={`font-semibold ${Number(feeAccount.summary?.total_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      KES {fmt(feeAccount.summary?.total_balance)}
                    </p>
                  </div>
                </div>

                {openInvoices.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Open Invoices</p>
                    <div className="space-y-1">
                      {openInvoices.map((inv: any) => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => handleInvoiceSelect(inv.id)}
                          className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                            form.invoice_id === inv.id
                              ? 'border-blue-500 bg-blue-100 text-blue-800'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{inv.invoice_number}</span>
                            <span className="text-red-600 font-semibold">KES {fmt(inv.balance_amount)} due</span>
                          </div>
                          {inv.description && <span className="text-gray-400">{inv.description}</span>}
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-gray-400">
                              Total: KES {fmt(inv.net_amount)} · Paid: KES {fmt(inv.paid_amount)}
                            </span>
                            <Badge variant={inv.status === 'partial' ? 'secondary' : 'outline'} className="text-[10px] py-0">
                              {inv.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {openInvoices.length === 0 && (
                  <p className="text-xs text-green-600 text-center">No outstanding invoices — recording general payment</p>
                )}
              </div>
            )}

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (KES) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Method + Ref */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <select
                  id="payment_method"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <Label htmlFor="transaction_id">Transaction ID / Reference</Label>
                <Input
                  id="transaction_id"
                  value={form.transaction_id}
                  onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}
                  placeholder="e.g., REF123456"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.student_id}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording...</> : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Receipt view */
          <div className="space-y-4">
            <div ref={receiptRef} className="border rounded-lg p-6 space-y-4 print:border-0">
              {/* Receipt header */}
              <div className="text-center border-b pb-4">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-gray-900">Payment Receipt</h2>
                <p className="text-sm text-gray-500">SkulManager School Management System</p>
                {receipt?.payment?.receipt_number && (
                  <p className="text-xs text-gray-400 mt-1">Receipt No: <span className="font-mono font-semibold">{receipt.payment.receipt_number}</span></p>
                )}
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Student:</span>
                  <span className="font-medium ml-2">
                    {receipt?.student?.first_name || selectedStudent?.first_name} {receipt?.student?.last_name || selectedStudent?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Adm No:</span>
                  <span className="font-medium ml-2">{receipt?.student?.admission_number || selectedStudent?.admission_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Class:</span>
                  <span className="font-medium ml-2">{receipt?.student?.class_name || selectedStudent?.class_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium ml-2">{receipt?.payment?.payment_date || form.payment_date}</span>
                </div>
              </div>

              {/* Payment details */}
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-3xl font-bold text-green-700">KES {fmt(receipt?.payment?.amount)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  via {(receipt?.payment?.payment_method || '').replace('_', ' ').toUpperCase()}
                  {receipt?.payment?.transaction_id && ` · Ref: ${receipt.payment.transaction_id}`}
                </p>
              </div>

              {/* Invoice details if any */}
              {receipt?.invoice && (
                <div className="border rounded-md p-3 text-sm space-y-1">
                  <p className="font-medium text-gray-700">Invoice: {receipt.invoice.invoice_number}</p>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div>
                      <p className="text-xs text-gray-400">Invoice Total</p>
                      <p className="font-semibold">KES {fmt(receipt.invoice.net_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">This Payment</p>
                      <p className="font-semibold text-green-600">KES {fmt(receipt?.payment?.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Remaining</p>
                      <p className={`font-semibold ${Number(receipt.invoice.balance_amount) - Number(receipt?.payment?.amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        KES {fmt(Math.max(0, Number(receipt.invoice.balance_amount) - Number(receipt?.payment?.amount)))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall balance */}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-gray-600 font-medium">Overall Account Balance After Payment:</span>
                <span className={`font-bold text-base ${Number(receipt?.balance_after) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  KES {fmt(receipt?.balance_after)}
                </span>
              </div>

              {receipt?.payment?.remarks && (
                <p className="text-xs text-gray-400 italic">Note: {receipt.payment.remarks}</p>
              )}

              <p className="text-center text-xs text-gray-300 mt-2">This is a computer-generated receipt. No signature required.</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                <Share2 className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
