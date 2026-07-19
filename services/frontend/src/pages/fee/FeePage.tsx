import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign, TrendingUp, AlertCircle, FileText, Plus, Users,
  Search, Download, Trash2, Eye, RefreshCw, CheckCircle, Printer,
  Send, XCircle
} from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { GenerateInvoicesModal } from '@/components/modals/GenerateInvoicesModal';
import api from '@/services/api';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentSummary {
  id: string; first_name: string; last_name: string; admission_number: string;
  class_name: string; student_type: string;
  total_invoiced: number; total_paid: number; total_balance: number; invoice_count: number;
}
interface Invoice {
  id: string; invoice_number: string; description: string;
  net_amount: number; paid_amount: number; balance_amount: number;
  status: string; due_date: string; created_at: string; term: string; academic_year: string;
}
interface Payment {
  id: string; amount: number; payment_method: string;
  payment_date: string; transaction_id: string; remarks: string;
  invoice_id?: string; receipt_number?: string;
}
interface ExpectedFee {
  id: string; name: string; amount: number; frequency?: string; description?: string;
}

// ─── PDF generator ────────────────────────────────────────────────────────────
function downloadFeeStatement(
  student: StudentSummary,
  invoices: Invoice[],
  payments: Payment[],
  expected: ExpectedFee[],
  extraFees: ExpectedFee[],
  schoolName: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pw / 2, 12, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('FEE STATEMENT', pw / 2, 20, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, pw / 2, 26, { align: 'center' });

  let y = 36;
  doc.setTextColor(30, 30, 30);

  // Student info
  doc.setFillColor(240, 245, 255);
  doc.rect(10, y, pw - 20, 22, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(`${student.first_name} ${student.last_name}`, 15, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Admission No: ${student.admission_number}`, 15, y + 15);
  doc.text(`Class: ${student.class_name || '—'}`, 90, y + 15);
  y += 28;

  const fmt = (n: number) => `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  // Summary box
  doc.setFillColor(255, 248, 230);
  doc.rect(10, y, pw - 20, 22, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  const cols = [15, pw / 4 + 5, pw / 2 + 5, (3 * pw) / 4 + 5];
  doc.text('TOTAL EXPECTED', cols[0], y + 7);
  doc.text('TOTAL INVOICED', cols[1], y + 7);
  doc.text('TOTAL PAID', cols[2], y + 7);
  doc.text('BALANCE DUE', cols[3], y + 7);
  doc.setFont('helvetica', 'normal');
  // Compute totals from live invoice data (excludes cancelled) so summary is always accurate
  const nonCancelledInvoices = invoices.filter(i => i.status !== 'cancelled');
  const totalExpected   = [...expected, ...extraFees].reduce((s, f) => s + Number(f.amount), 0);
  const totalInvoiced   = nonCancelledInvoices.reduce((s, i) => s + Number(i.net_amount || 0), 0);
  const totalPaid       = nonCancelledInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const totalBalance    = nonCancelledInvoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0);
  doc.text(fmt(totalExpected), cols[0], y + 16);
  doc.text(fmt(totalInvoiced), cols[1], y + 16);
  doc.text(fmt(totalPaid), cols[2], y + 16);
  doc.setTextColor(totalBalance > 0 ? 180 : 30, 30, 30);
  doc.text(fmt(totalBalance), cols[3], y + 16);
  doc.setTextColor(30, 30, 30);
  y += 28;

  // Expected fees table
  if (expected.length || extraFees.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Expected Fees', 10, y); y += 5;
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Fee Name', 14, y + 5);
    doc.text('Frequency', pw / 2, y + 5);
    doc.text('Amount', pw - 35, y + 5, { align: 'right' });
    y += 7; doc.setTextColor(30, 30, 30);
    let rowBg = false;
    for (const f of [...expected, ...extraFees]) {
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 7, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.text(f.name, 14, y + 5);
      doc.text(f.frequency || 'extra', pw / 2, y + 5);
      doc.text(fmt(f.amount), pw - 14, y + 5, { align: 'right' });
      y += 7; rowBg = !rowBg;
    }
    y += 4;
  }

  // Invoices table — only print active invoices, never show cancelled/deleted ones
  const activeInvoices = invoices.filter(i => i.status !== 'cancelled');
  if (activeInvoices.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Invoices', 10, y); y += 5;
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Invoice #', 14, y + 5);
    doc.text('Description', 55, y + 5);
    doc.text('Amount', 115, y + 5, { align: 'right' });
    doc.text('Paid', 140, y + 5, { align: 'right' });
    doc.text('Balance', 166, y + 5, { align: 'right' });
    doc.text('Status', pw - 14, y + 5, { align: 'right' });
    y += 7; doc.setTextColor(30, 30, 30);
    let rowBg = false;
    for (const inv of activeInvoices) {
      if (y > 270) { doc.addPage(); y = 15; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 7, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.text(inv.invoice_number, 14, y + 5);
      doc.text((inv.description || '').substring(0, 30), 55, y + 5);
      doc.text(fmt(inv.net_amount), 115, y + 5, { align: 'right' });
      doc.text(fmt(inv.paid_amount || 0), 140, y + 5, { align: 'right' });
      doc.setTextColor(Number(inv.balance_amount) > 0 ? 180 : 30, 30, 30);
      doc.text(fmt(inv.balance_amount), 166, y + 5, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      doc.text(inv.status, pw - 14, y + 5, { align: 'right' });
      y += 7; rowBg = !rowBg;
    }
    y += 4;
  }

  // Payments table
  if (payments.length) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Payment History', 10, y); y += 5;
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Date', 14, y + 5);
    doc.text('Method', 60, y + 5);
    doc.text('Reference', 100, y + 5);
    doc.text('Amount', pw - 14, y + 5, { align: 'right' });
    y += 7; doc.setTextColor(30, 30, 30);
    let rowBg = false;
    for (const p of payments) {
      if (y > 270) { doc.addPage(); y = 15; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 7, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(p.payment_date).toLocaleDateString('en-KE'), 14, y + 5);
      doc.text((p.payment_method || '').replace('_', ' '), 60, y + 5);
      doc.text(p.transaction_id || p.remarks || '—', 100, y + 5);
      doc.setTextColor(0, 120, 60);
      doc.text(fmt(p.amount), pw - 14, y + 5, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      y += 7; rowBg = !rowBg;
    }
  }

  // Footer
  doc.setFontSize(7); doc.setTextColor(130, 130, 130);
  doc.text('This is a computer-generated statement. No signature required.', pw / 2, 292, { align: 'center' });

  doc.save(`FeeStatement_${student.admission_number}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ─── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'paid' ? 'bg-green-100 text-green-800' :
    status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
    status === 'overdue' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

const fmt = (n: number | string) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

function printPaymentReceipt(p: any, studentName?: string, admNo?: string, className?: string, schoolName = 'School') {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const margin = 15;
  const pageW = 148;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('PAYMENT RECEIPT', pageW / 2, 17, { align: 'center' });

  let y = 30;
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

  addRow('Receipt No', p.receipt_number || p.transaction_id || `RCP-${p.id?.slice(-6) || Date.now()}`);
  addRow('Date', new Date(p.payment_date).toLocaleDateString('en-KE'));
  if (studentName) addRow('Student', studentName);
  if (admNo) addRow('Adm No', admNo);
  if (className) addRow('Class', className);
  if (p.invoice_number) addRow('Invoice', p.invoice_number);
  if (p.remarks) addRow('Remarks', p.remarks);

  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`Amount Paid: ${fmt(p.amount)}`, margin, y);
  y += 7;

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  addRow('Payment Method', (p.payment_method || '').replace(/_/g, ' ').toUpperCase());
  if (p.transaction_id) addRow('Reference', p.transaction_id);

  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('This is a computer-generated receipt. No signature required.', pageW / 2, y, { align: 'center' });

  const filename = `receipt-${(admNo || 'student').replace(/\s/g, '')}-${p.receipt_number || p.transaction_id || p.id?.slice(-6) || Date.now()}.pdf`;
  doc.save(filename);
}

// ─── Fee Statement Modal ───────────────────────────────────────────────────────
function FeeStatementModal({
  student, onClose, onPaymentRecorded
}: {
  student: StudentSummary;
  onClose: () => void;
  onPaymentRecorded: () => void;
}) {
  const { user } = useAuthStore();
  const isFinanceOfficer = user?.role === 'finance_officer';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expected, setExpected] = useState<ExpectedFee[]>([]);
  const [extraFees, setExtraFees] = useState<ExpectedFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('School');
  const [genLoading, setGenLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingPmt, setDeletingPmt] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const totalExpected = [...expected, ...extraFees].reduce((s, f) => s + Number(f.amount), 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feeRes, expectedRes, settingsRes]: any[] = await Promise.all([
        api.getStudentFeeAccount(student.id),
        api.getExpectedFees(student.id),
        api.getSettings().catch(() => ({ data: { school_name: 'School' } })),
      ]);
      const feeData = feeRes?.data || {};
      setInvoices(feeData.invoices || []);
      setPayments(feeData.payments || []);
      setExpected(expectedRes?.data?.structures || []);
      setExtraFees(expectedRes?.data?.extra_fees || []);
      setSchoolName(settingsRes?.data?.school_name || 'School');
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateInvoice = async () => {
    setGenLoading(true);
    try {
      await api.generateInvoiceForStudent({ student_id: student.id });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteInvoice = async (invId: string) => {
    if (!confirm('Delete this invoice and its payments? This cannot be undone.')) return;
    setDeleting(invId);
    try {
      await api.deleteFeeInvoice(invId);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeletePayment = async (pmtId: string) => {
    if (!confirm('Delete this payment? The invoice balance will be reversed.')) return;
    setDeletingPmt(pmtId);
    try {
      await api.deleteFeePayment(pmtId);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete payment');
    } finally {
      setDeletingPmt(null);
    }
  };

  const updatedStudent = {
    ...student,
    total_invoiced: invoices.reduce((s, i) => s + Number(i.net_amount), 0),
    total_paid: invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0),
    total_balance: invoices.reduce((s, i) => s + Number(i.balance_amount), 0),
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>
                Fee Statement — {student.first_name} {student.last_name}
                <span className="ml-2 text-sm font-normal text-gray-500">{student.admission_number}</span>
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() =>
                  downloadFeeStatement(updatedStudent, invoices, payments, expected, extraFees, schoolName)
                }>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                </Button>
                <Button size="sm" onClick={handleGenerateInvoice} disabled={genLoading}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {genLoading ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-5 pt-1">

              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Expected', val: totalExpected, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Invoiced', val: updatedStudent.total_invoiced, color: 'text-gray-800', bg: 'bg-gray-50' },
                  { label: 'Paid', val: updatedStudent.total_paid, color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Balance Due', val: updatedStudent.total_balance, color: updatedStudent.total_balance > 0 ? 'text-red-700' : 'text-green-700', bg: updatedStudent.total_balance > 0 ? 'bg-red-50' : 'bg-green-50' },
                ].map(({ label, val, color, bg }) => (
                  <div key={label} className={`${bg} rounded-lg p-3`}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{fmt(val)}</p>
                  </div>
                ))}
              </div>

              {/* Expected Fees */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Expected Fees (from fee structures)</h3>
                {expected.length === 0 && extraFees.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No fee structures assigned to this student's class.</p>
                ) : (
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="text-left px-3 py-2">Fee Name</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-right px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expected.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{f.name}</td>
                          <td className="px-3 py-2 text-gray-500 capitalize">{f.frequency || 'standard'}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmt(f.amount)}</td>
                        </tr>
                      ))}
                      {extraFees.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{f.name} <span className="text-xs text-purple-600">(extra)</span></td>
                          <td className="px-3 py-2 text-gray-500">extra</td>
                          <td className="px-3 py-2 text-right font-medium">{fmt(f.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2" colSpan={2}>Total Expected</td>
                        <td className="px-3 py-2 text-right">{fmt(totalExpected)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Invoices */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-700">Invoices</h3>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No invoices generated yet.</p>
                ) : (
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="text-left px-3 py-2">Invoice #</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-3 py-2">Amount</th>
                        <th className="text-right px-3 py-2">Paid</th>
                        <th className="text-right px-3 py-2">Balance</th>
                        <th className="text-center px-3 py-2">Status</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs max-w-[160px] truncate">{inv.description || '—'}</td>
                          <td className="px-3 py-2 text-right">{fmt(inv.net_amount)}</td>
                          <td className="px-3 py-2 text-right text-green-700">{fmt(inv.paid_amount || 0)}</td>
                          <td className="px-3 py-2 text-right text-red-700">{fmt(inv.balance_amount)}</td>
                          <td className="px-3 py-2 text-center"><StatusBadge status={inv.status} /></td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 justify-end">
                              <button
                                className="text-blue-500 hover:text-blue-700 p-1"
                                title="Record payment"
                                onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                              </button>
                              {!isFinanceOfficer && (
                                <button
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="Delete invoice"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  disabled={deleting === inv.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Payment History</h3>
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No payments recorded yet.</p>
                ) : (
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Method</th>
                        <th className="text-left px-3 py-2">Reference</th>
                        <th className="text-left px-3 py-2">Remarks</th>
                        <th className="text-right px-3 py-2">Amount</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs">{new Date(p.payment_date).toLocaleDateString('en-KE')}</td>
                          <td className="px-3 py-2 capitalize">{(p.payment_method || '').replace('_', ' ')}</td>
                          <td className="px-3 py-2 font-mono text-xs">{p.transaction_id || p.receipt_number || '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{p.remarks || '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="text-blue-500 hover:text-blue-700 p-1"
                                title="Print receipt"
                                onClick={() => printPaymentReceipt(p, `${student.first_name} ${student.last_name}`, student.admission_number, student.class_name, schoolName)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              {!isFinanceOfficer && (
                                <button
                                  className="text-red-400 hover:text-red-600 p-1 disabled:opacity-40"
                                  title="Delete payment"
                                  disabled={deletingPmt === p.id}
                                  onClick={() => handleDeletePayment(p.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record payment within the statement */}
      {showPayModal && (
        <RecordPaymentModal
          open={showPayModal}
          onOpenChange={(v) => { setShowPayModal(v); if (!v) setSelectedInvoice(null); }}
          onSuccess={() => { load(); onPaymentRecorded(); }}
          preselectedStudentId={student.id}
          preselectedInvoiceId={selectedInvoice?.id}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function FeePage() {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const isFinanceOfficer = user?.role === 'finance_officer';
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'invoices' | 'payments' | 'requests'>('students');
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchInv, setSearchInv] = useState('');
  const [deletingInv, setDeletingInv] = useState<string | null>(null);
  const [deletingPay, setDeletingPay] = useState<string | null>(null);
  const [pageSchoolName, setPageSchoolName] = useState('School');

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, studRes, classRes]: any[] = await Promise.all([
        api.getFeeStatistics(),
        api.getStudentsSummary({ search, classId: filterClass }),
        api.getClasses(),
      ]);
      setStats(statsRes?.data || {});
      setStudents(studRes?.data || []);
      setClasses(classRes?.data || []);
      if (!pageSchoolName || pageSchoolName === 'School') {
        api.getSettings().then((r: any) => { if (r?.data?.school_name) setPageSchoolName(r.data.school_name); }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterClass]);

  const loadInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const res: any = await api.getFeeInvoices();
      setInvoices(res?.data || []);
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setInvLoading(true);
    try {
      const res: any = await api.getFeePayments();
      setPayments(res?.data || []);
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadPaymentRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res: any = await api.getPaymentRequests('pending_confirmation');
      setPaymentRequests(res?.data || []);
      setRequestsCount((res?.data || []).length);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const handleConfirmRequest = async (id: string) => {
    setProcessingRequest(id);
    try {
      await api.confirmPaymentRequest(id);
      await loadPaymentRequests();
      loadSummary();
    } catch (e: any) {
      alert(e?.message || 'Failed to confirm payment');
    } finally {
      setProcessingRequest(null);
    }
  };

  const openRejectModal = (req: any) => {
    setRejectTarget(req);
    setRejectNote('');
    setRejectModalOpen(true);
  };

  const handleRejectRequest = async () => {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) { alert('Please enter a reason for rejection'); return; }
    setProcessingRequest(rejectTarget.id);
    try {
      await api.rejectPaymentRequest(rejectTarget.id, rejectNote);
      setRejectModalOpen(false);
      await loadPaymentRequests();
    } catch (e: any) {
      alert(e?.message || 'Failed to reject payment');
    } finally {
      setProcessingRequest(null);
    }
  };

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'requests') loadPaymentRequests();
  }, [activeTab, loadInvoices, loadPayments, loadPaymentRequests]);
  // Load request count on mount for badge
  useEffect(() => {
    api.getPaymentRequestsCount()
      .then((r: any) => setRequestsCount(r?.data?.count || 0))
      .catch(() => {});
  }, []);

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice and all its payments? This cannot be undone.')) return;
    setDeletingInv(id);
    try {
      await api.deleteFeeInvoice(id);
      loadInvoices();
      loadSummary();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingInv(null);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this payment? The invoice balance will be reversed.')) return;
    setDeletingPay(id);
    try {
      await api.deleteFeePayment(id);
      loadPayments();
      loadSummary();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete payment');
    } finally {
      setDeletingPay(null);
    }
  };

  const totalAmount    = parseFloat(stats?.total_amount    || '0');
  const totalCollected = parseFloat(stats?.total_collected || '0');
  const totalPending   = parseFloat(stats?.total_pending   || '0');
  const collectionPct  = totalAmount > 0 ? ((totalCollected / totalAmount) * 100).toFixed(1) : '0';

  const filteredInvoices = invoices.filter(inv => {
    if (!searchInv) return true;
    const q = searchInv.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.first_name?.toLowerCase().includes(q) ||
      inv.last_name?.toLowerCase().includes(q) ||
      inv.admission_number?.toLowerCase().includes(q)
    );
  });

  const TABS = [
    { id: 'students', label: t('Students & Expected Fees') },
    { id: 'invoices', label: t('Invoices') },
    { id: 'payments', label: t('Payment History') },
    { id: 'requests', label: `Payment Requests${requestsCount > 0 ? ` (${requestsCount})` : ''}` },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('Fee Management')}</h2>
          <p className="text-sm text-gray-500">{t('Manage expected fees, invoices and payments')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInvoiceModal(true)}>
            <FileText className="h-4 w-4 mr-1" /> {t('Generate Bulk Invoices')}
          </Button>
          <Button onClick={() => setShowPaymentModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t('Record Payment')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Total Invoiced'), val: totalAmount, icon: DollarSign, color: 'text-gray-800', sub: `${stats?.total_invoices || 0} ${t('invoices')}` },
          { label: t('Collected'), val: totalCollected, icon: TrendingUp, color: 'text-green-700', sub: `${stats?.paid_count || 0} ${t('paid')}` },
          { label: t('Outstanding'), val: totalPending, icon: AlertCircle, color: 'text-yellow-700', sub: `${stats?.pending_count || 0} ${t('pending')}` },
          { label: t('Collection Rate'), val: null, icon: CheckCircle, color: 'text-primary', sub: `${collectionPct}%`, pct: Number(collectionPct) },
        ].map(({ label, val, icon: Icon, color, sub, pct }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {val !== null ? (
                <div className={`text-xl font-bold ${color}`}>{fmt(val)}</div>
              ) : (
                <>
                  <div className={`text-xl font-bold ${color}`}>{sub}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(pct!, 100)}%` }} />
                  </div>
                </>
              )}
              {val !== null && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Students & Expected Fees ── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Search + class filter */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('Search students...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="">{t('All Classes')}</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={loadSummary}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('Refresh')}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>{t('No students found.')}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 font-medium">{t('Student')}</th>
                      <th className="text-left px-4 py-3 font-medium">{t('Class')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Invoiced')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Paid')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Balance')}</th>
                      <th className="text-center px-4 py-3 font-medium">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-gray-400">{s.admission_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.class_name || '—'}</td>
                        <td className="px-4 py-3 text-right">{fmt(s.total_invoiced)}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(s.total_paid)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={Number(s.total_balance) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                            {fmt(s.total_balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStudent(s)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> {t('Statement')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Invoices ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('Search invoice or student...')}
              value={searchInv}
              onChange={e => setSearchInv(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>{t('No invoices found.')}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 font-medium">{t('Invoice #')}</th>
                      <th className="text-left px-4 py-3 font-medium">{t('Student')}</th>
                      <th className="text-left px-4 py-3 font-medium">{t('Class')}</th>
                      <th className="text-left px-4 py-3 font-medium">{t('Description')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Amount')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Paid')}</th>
                      <th className="text-right px-4 py-3 font-medium">{t('Balance')}</th>
                      <th className="text-center px-4 py-3 font-medium">{t('Status')}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{inv.first_name} {inv.last_name}</p>
                          <p className="text-xs text-gray-400">{inv.admission_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{inv.class_name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{inv.description || '—'}</td>
                        <td className="px-4 py-3 text-right">{fmt(inv.net_amount)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{fmt(inv.paid_amount || 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={Number(inv.balance_amount) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                            {fmt(inv.balance_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-2">
                          {!isFinanceOfficer && (
                            <button
                              className="text-red-400 hover:text-red-600 p-1"
                              title="Delete invoice"
                              disabled={deletingInv === inv.id}
                              onClick={() => handleDeleteInvoice(inv.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Payment History ── */}
      {activeTab === 'payments' && (
        <Card>
          <CardContent className="p-0">
            {invLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{t('No payments recorded yet.')}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium">{t('Date')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('Student')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('Invoice')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('Method')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('Reference')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('Amount')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">{new Date(p.payment_date).toLocaleDateString('en-KE')}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.first_name} {p.last_name}</p>
                        {p.admission_number && <p className="text-xs text-gray-400">{p.admission_number}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.invoice_number || '—'}</td>
                      <td className="px-4 py-3 capitalize">{(p.payment_method || '').replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.transaction_id || p.receipt_number || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Print receipt"
                            onClick={() => printPaymentReceipt(p, `${p.first_name || ''} ${p.last_name || ''}`.trim(), p.admission_number, p.class_name, pageSchoolName)}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {!isFinanceOfficer && (
                            <button
                              className="text-red-400 hover:text-red-600 p-1 disabled:opacity-40"
                              title="Delete payment (reverses invoice balance)"
                              disabled={deletingPay === p.id}
                              onClick={() => handleDeletePayment(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Payment Requests ── */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Parent Payment Requests
              {requestsCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {requestsCount} pending
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Parents have submitted these payment proofs. Verify and confirm or reject each one.
            </p>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : paymentRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No pending payment requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentRequests.map((req: any) => (
                  <div key={req.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {req.first_name} {req.last_name}
                          </span>
                          <span className="text-xs text-gray-500">{req.admission_number}</span>
                          {req.class_name && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{req.class_name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Invoice:</span> {req.invoice_number}
                          {req.invoice_description && <span className="ml-1 text-gray-400">— {req.invoice_description}</span>}
                        </p>
                        {req.term && (
                          <p className="text-xs text-gray-400">{req.term} · {req.academic_year}</p>
                        )}
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400 text-xs">Method</span>
                            <p className="font-medium capitalize">{(req.payment_method || '').replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Amount</span>
                            <p className="font-bold text-green-700">KES {parseFloat(req.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Invoice Balance</span>
                            <p className="font-medium text-red-600">KES {parseFloat(req.invoice_balance || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Submitted</span>
                            <p className="font-medium">{new Date(req.payment_date).toLocaleDateString('en-KE')}</p>
                          </div>
                        </div>
                        {req.transaction_id && (
                          <p className="mt-2 text-sm">
                            <span className="text-gray-400 text-xs">Reference:</span>
                            <span className="ml-1 font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{req.transaction_id}</span>
                          </p>
                        )}
                        {req.parent_message && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                            <span className="text-xs font-medium text-blue-500">Parent message: </span>
                            {req.parent_message}
                          </div>
                        )}
                        {req.parent_name && (
                          <p className="mt-1 text-xs text-gray-400">By: {req.parent_name} ({req.parent_email})</p>
                        )}
                      </div>
                      <div className="flex flex-row md:flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={processingRequest === req.id}
                          onClick={() => handleConfirmRequest(req.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={processingRequest === req.id}
                          onClick={() => openRejectModal(req)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-1">Reject Payment Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              {rejectTarget?.first_name} {rejectTarget?.last_name} — KES {parseFloat(rejectTarget?.amount || 0).toLocaleString()}
            </p>
            <label className="block text-sm font-medium mb-1">Reason for rejection *</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              rows={3}
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. Reference code not found, please send M-Pesa screenshot to accounts office..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!!processingRequest}
                onClick={handleRejectRequest}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Statement modal */}
      {selectedStudent && (
        <FeeStatementModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onPaymentRecorded={loadSummary}
        />
      )}

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        onSuccess={loadSummary}
      />
      <GenerateInvoicesModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        onSuccess={() => { loadSummary(); if (activeTab === 'invoices') loadInvoices(); }}
      />
    </div>
  );
}
