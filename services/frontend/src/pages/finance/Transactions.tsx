import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Check, X, Eye, XCircle, Search, Trash2, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import financeService, { IncomeRecord, ExpenseRecord } from '@/services/financeService';
import api from '@/services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// xlsx has known prototype-pollution/ReDoS advisories in XLSX.read/parse (no fix
// upstream) but this file only ever calls json_to_sheet/writeFile on data we
// already hold — it never parses an uploaded/untrusted file — so those CVEs
// aren't reachable here. Re-evaluate if this file ever adds file-upload import.
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/store/authStore';

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'coop_bus_bank', label: 'Co-op Bus Bank' },
  { value: 'coop_bus_paybill', label: 'Co-Op Bus Paybill' },
  { value: 'fee_paybill', label: 'Fee Paybill' },
  { value: 'fee_bank_account', label: 'Fee Bank Account' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];

type TransactionType = 'income' | 'expense';

export default function Transactions() {
  const { user } = useAuthStore();
  const isFinanceOfficer = user?.role === 'finance_officer';
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TransactionType>(
    (searchParams.get('type') as TransactionType) || 'income'
  );
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'income' | 'expense' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    dateFrom: '',
    dateTo: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    account_id: '',
    vendor_id: '',
    student_id: '',
    payer_name: '',
    amount: '',
    description: '',
    reference_number: '',
    payment_method: 'mpesa',
    include_vat: true,
  });

  useEffect(() => {
    loadTransactions();
    loadAccounts();
    if (activeTab === 'expense') {
      loadVendors();
    }
    if (activeTab === 'income' && students.length === 0) {
      loadStudents();
    }
  }, [activeTab, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      if (activeTab === 'income') {
        const data = await financeService.getIncomeRecords(filters);
        setIncomeRecords(data);
      } else {
        const data = await financeService.getExpenseRecords(filters);
        setExpenseRecords(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeService.getChartOfAccounts();
      const filteredAccounts = data.filter((acc: any) => 
        activeTab === 'income' ? acc.account_type === 'income' : acc.account_type === 'expense'
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await financeService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const res: any = await api.getStudents();
      setStudents(res.data || []);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const selectStudent = (student: any) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.first_name} ${student.last_name} (${student.admission_number})`);
    setShowStudentDropdown(false);
    setFormData(prev => ({ ...prev, student_id: student.id, payer_name: `${student.first_name} ${student.last_name}` }));
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setFormData(prev => ({ ...prev, student_id: '', payer_name: '' }));
  };

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handlePrintReceipt = async () => {
    if (!selectedRecord) return;
    const isIncome = activeTab === 'income';

    // Fetch school settings for header
    let schoolName = 'School';
    let schoolAddress = '';
    let schoolPhone = '';
    try {
      const s: any = await api.getSettings();
      const settings = s?.data || s || {};
      schoolName = settings.school_name || 'School';
      schoolAddress = [settings.address, settings.city].filter(Boolean).join(', ');
      schoolPhone = settings.phone || '';
    } catch { /* use defaults */ }

    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Header ──────────────────────────────────────────────
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageW / 2, 11, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (schoolAddress) doc.text(schoolAddress, pageW / 2, 17, { align: 'center' });
    if (schoolPhone) doc.text(`Tel: ${schoolPhone}`, pageW / 2, 22, { align: 'center' });

    // ── Title bar ───────────────────────────────────────────
    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(0, 28, pageW, 12, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(isIncome ? 'RECEIPT' : 'EXPENSE VOUCHER', pageW / 2, 36, { align: 'center' });

    // ── Receipt number & date ───────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const refNo = isIncome ? selectedRecord.income_number : selectedRecord.expense_number;
    const txDate = formatDate(isIncome ? selectedRecord.income_date : selectedRecord.expense_date);
    doc.text(`Receipt No: ${refNo || '-'}`, 10, 48);
    doc.text(`Date: ${txDate}`, pageW - 10, 48, { align: 'right' });
    doc.text(`Print Date: ${today}`, pageW - 10, 54, { align: 'right' });

    // ── Divider ─────────────────────────────────────────────
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 57, pageW - 10, 57);

    // ── Details rows ────────────────────────────────────────
    const rows: [string, string][] = [];
    if (isIncome) {
      if (selectedRecord.student_name || selectedRecord.payer_name) {
        rows.push(['Received From', selectedRecord.student_name || selectedRecord.payer_name]);
      }
      if (selectedRecord.admission_number) rows.push(['Admission No', selectedRecord.admission_number]);
    } else {
      if (selectedRecord.vendor_name) rows.push(['Vendor', selectedRecord.vendor_name]);
    }
    rows.push(['Account', selectedRecord.account_name || '-']);
    rows.push(['Category', isIncome ? selectedRecord.income_category : selectedRecord.expense_category || '-']);
    rows.push(['Payment Method', (selectedRecord.payment_method || '-').toUpperCase()]);
    if (selectedRecord.payment_reference) rows.push(['Reference', selectedRecord.payment_reference]);
    if (selectedRecord.description) rows.push(['Description', selectedRecord.description]);
    rows.push(['Status', (selectedRecord.status || '-').toUpperCase()]);

    let y = 65;
    doc.setFontSize(9);
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(label + ':', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value), 55, y);
      y += 7;
    });

    // ── Amount box ──────────────────────────────────────────
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, y, pageW - 20, 28, 2, 2, 'FD');

    const amt = parseFloat(selectedRecord.amount || 0);
    const vat = parseFloat(selectedRecord.vat_amount || 0);
    const total = parseFloat(selectedRecord.total_amount || amt + vat);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Amount:', 14, y + 7);
    doc.text(formatCurrency(amt), pageW - 14, y + 7, { align: 'right' });
    doc.text('VAT (16%):', 14, y + 14);
    doc.text(formatCurrency(vat), pageW - 14, y + 14, { align: 'right' });
    doc.setDrawColor(180, 180, 180);
    doc.line(14, y + 17, pageW - 14, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('TOTAL:', 14, y + 24);
    doc.text(formatCurrency(total), pageW - 14, y + 24, { align: 'right' });

    // ── Footer ──────────────────────────────────────────────
    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, footerY - 4, pageW - 10, footerY - 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text('This is a computer-generated receipt and does not require a signature.', pageW / 2, footerY, { align: 'center' });
    doc.text(schoolName, pageW / 2, footerY + 5, { align: 'center' });

    // ── Open in new tab (print/share) ───────────────────────
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amount = parseFloat(formData.amount);
      let vat_amount = 0;
      const final_amount = amount;
      
      if (formData.include_vat) {
        vat_amount = financeService.calculateVAT(amount);
      }

      const transactionData = {
        transaction_date: formData.transaction_date,
        account_id: formData.account_id,
        amount: final_amount,
        vat_amount: vat_amount,
        description: formData.description,
        reference_number: formData.reference_number,
        payment_method: formData.payment_method,
        ...(activeTab === 'expense' && formData.vendor_id ? { vendor_id: formData.vendor_id } : {}),
        ...(activeTab === 'income' && formData.student_id ? { student_id: formData.student_id } : {}),
        ...(activeTab === 'income' && formData.payer_name ? { payer_name: formData.payer_name } : {}),
      };

      if (activeTab === 'income') {
        await financeService.createIncome(transactionData);
      } else {
        await financeService.createExpense(transactionData);
      }

      alert(`${activeTab === 'income' ? 'Income' : 'Expense'} recorded successfully!`);
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      account_id: '',
      vendor_id: '',
      student_id: '',
      payer_name: '',
      amount: '',
      description: '',
      reference_number: '',
      payment_method: 'mpesa',
      include_vat: true,
    });
    setSelectedStudent(null);
    setStudentSearch('');
    setShowStudentDropdown(false);
  };

  const handleApproveExpense = async (id: string) => {
    if (!confirm('Approve this expense?')) return;
    
    try {
      await financeService.approveExpense(id);
      alert('Expense approved successfully');
      loadTransactions();
    } catch (error) {
      console.error('Failed to approve expense:', error);
      alert('Failed to approve expense');
    }
  };

  const handleRejectExpense = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await financeService.rejectExpense(id, reason);
      alert('Expense rejected');
      loadTransactions();
    } catch (error) {
      console.error('Failed to reject expense:', error);
      alert('Failed to reject expense');
    }
  };

  const handlePayExpense = async (id: string) => {
    if (!confirm('Mark this expense as paid?')) return;

    try {
      await financeService.payExpense(id);
      alert('Expense marked as paid');
      loadTransactions();
    } catch (error) {
      console.error('Failed to pay expense:', error);
      alert('Failed to mark expense as paid');
    }
  };

  const handleDeleteIncome = (id: string) => {
    setDeleteConfirm({ id: String(id), type: 'income' });
  };

  const handleDeleteExpense = (id: string) => {
    setDeleteConfirm({ id: String(id), type: 'expense' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === 'income') {
        await financeService.deleteIncome(deleteConfirm.id);
      } else {
        await financeService.deleteExpense(deleteConfirm.id);
      }
      setDeleteConfirm(null);
      loadTransactions();
    } catch (error: any) {
      console.error('Failed to delete record:', error);
      alert(error?.message || error?.error || 'Failed to delete record. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-KE');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // ── Shared helpers for exports ──────────────────────────────────────────
  const getExportRows = () => {
    if (activeTab === 'income') {
      return incomeRecords.map((r: any) => ({
        Date: formatDate(r.income_date),
        'Receipt No': r.income_number || '-',
        Description: r.description || '-',
        Account: r.account_name || '-',
        'Student / Payer': r.student_name || r.payer_name || '-',
        'Admission No': r.admission_number || '-',
        'Payment Method': (r.payment_method || '-').toUpperCase(),
        Reference: r.payment_reference || '-',
        'Amount (KES)': parseFloat(r.amount || 0),
        'VAT (KES)': parseFloat(r.vat_amount || 0),
        'Total (KES)': parseFloat(r.total_amount || 0),
        Status: (r.status || '-').toUpperCase(),
      }));
    }
    return expenseRecords.map((r: any) => ({
      Date: formatDate(r.expense_date),
      'Voucher No': r.expense_number || '-',
      Description: r.description || '-',
      Account: r.account_name || '-',
      Vendor: r.vendor_name || '-',
      'Payment Method': (r.payment_method || '-').toUpperCase(),
      Reference: r.payment_reference || '-',
      'Amount (KES)': parseFloat(r.amount || 0),
      'VAT (KES)': parseFloat(r.vat_amount || 0),
      'Total (KES)': parseFloat(r.total_amount || 0),
      'Approval Status': (r.approval_status || '-').toUpperCase(),
      Status: (r.status || '-').toUpperCase(),
    }));
  };

  const exportCSV = () => {
    const rows = getExportRows();
    if (!rows.length) return alert('No records to export.');
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = (row as any)[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-records-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = getExportRows();
    if (!rows.length) return alert('No records to export.');
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(k => ({
      wch: Math.max(k.length, ...rows.map(r => String((r as any)[k]).length)) + 2,
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'income' ? 'Income Records' : 'Expense Records');
    XLSX.writeFile(wb, `${activeTab}-records-${Date.now()}.xlsx`);
  };

  const exportPDF = async () => {
    const rows = getExportRows();
    if (!rows.length) return alert('No records to export.');

    let schoolName = 'School';
    try {
      const s: any = await api.getSettings();
      schoolName = (s?.data || s)?.school_name || 'School';
    } catch { /* fall back to default school name */ }

    const isIncome = activeTab === 'income';
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageW / 2, 9, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(isIncome ? 'Income Records Report' : 'Expense Records Report', pageW / 2, 16, { align: 'center' });

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Generated: ${today}   |   Total records: ${rows.length}`, 14, 26);

    // Summary totals
    const totalAmt = rows.reduce((s, r) => s + (r as any)['Amount (KES)'], 0);
    const totalVat = rows.reduce((s, r) => s + (r as any)['VAT (KES)'], 0);
    const totalNet = rows.reduce((s, r) => s + (r as any)['Total (KES)'], 0);
    doc.text(
      `Total Amount: KES ${totalAmt.toLocaleString()}   |   Total VAT: KES ${totalVat.toLocaleString()}   |   Grand Total: KES ${totalNet.toLocaleString()}`,
      14, 31
    );

    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: rows.map(r => headers.map(h => (r as any)[h])),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === 'PAID' || val === 'COMPLETED' || val === 'APPROVED') data.cell.styles.textColor = [22, 163, 74];
          else if (val === 'PENDING') data.cell.styles.textColor = [234, 179, 8];
          else if (val === 'REJECTED' || val === 'CANCELLED') data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });

    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <>
      {/* eslint-disable no-useless-escape -- CSS class-name escapes (e.g. `print\:hidden`) inside this stylesheet string, not JS */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px;
              background: white;
            }
            .print\:hidden {
              display: none !important;
            }
            @page {
              margin: 20mm;
            }
          }
        `}
      </style>
      {/* eslint-enable no-useless-escape */}
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">Manage income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            title="Download CSV"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
            title="Download Excel"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            title="Download PDF"
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            New {activeTab === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('income')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'income'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              {activeTab === 'income' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : activeTab === 'income' ? (
              incomeRecords.length > 0 ? (
                incomeRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.income_date || record.expense_date || record.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.account_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {record.student_name
                        ? <span>{record.student_name}<span className="text-gray-400 text-xs ml-1">({record.admission_number})</span></span>
                        : record.payer_name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(parseFloat(record.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.vat_amount ? formatCurrency(parseFloat(record.vat_amount)) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(parseFloat(record.amount) + parseFloat(record.vat_amount || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {!isFinanceOfficer && (
                          <button
                            onClick={() => handleDeleteIncome(record.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    No income records found
                  </td>
                </tr>
              )
            ) : expenseRecords.length > 0 ? (
              expenseRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.income_date || record.expense_date || record.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.account_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.reference_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(parseFloat(record.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.vat_amount ? formatCurrency(parseFloat(record.vat_amount)) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {formatCurrency(parseFloat(record.amount) + parseFloat(record.vat_amount || 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {record.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveExpense(record.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectExpense(record.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {record.status === 'approved' && (
                        <button
                          onClick={() => handlePayExpense(record.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-600 rounded"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      {!isFinanceOfficer && (
                        <button
                          onClick={() => handleDeleteExpense(record.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No expense records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for New Transaction */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                New {activeTab === 'income' ? 'Income' : 'Expense'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor (Optional)
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'income' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student (Optional)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name or admission no..."
                      value={studentSearch}
                      onChange={e => {
                        setStudentSearch(e.target.value);
                        if (selectedStudent) clearStudent();
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => !selectedStudent && setShowStudentDropdown(true)}
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                    />
                    {selectedStudent && (
                      <button
                        type="button"
                        onClick={clearStudent}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showStudentDropdown && studentSearch && !selectedStudent && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {students
                        .filter(s => {
                          const q = studentSearch.toLowerCase();
                          return (
                            s.first_name?.toLowerCase().includes(q) ||
                            s.last_name?.toLowerCase().includes(q) ||
                            s.admission_number?.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 15)
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between border-b last:border-b-0"
                            onClick={() => selectStudent(s)}
                          >
                            <span className="font-medium">{s.first_name} {s.last_name}</span>
                            <span className="text-gray-400 text-xs">{s.admission_number} · {s.class_name || 'No class'}</span>
                          </button>
                        ))}
                      {students.filter(s => {
                        const q = studentSearch.toLowerCase();
                        return s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.admission_number?.toLowerCase().includes(q);
                      }).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">No students found</div>
                      )}
                    </div>
                  )}
                  {selectedStudent && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
                      <span className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                      <span className="text-gray-400">·</span>
                      <span>{selectedStudent.admission_number}</span>
                      {selectedStudent.class_name && <><span className="text-gray-400">·</span><span>{selectedStudent.class_name}</span></>}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (KES) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Enter transaction description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., INV-001, REC-123"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include_vat"
                  checked={formData.include_vat}
                  onChange={(e) => setFormData({ ...formData, include_vat: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="include_vat" className="ml-2 text-sm text-gray-700">
                  Include 16% VAT
                </label>
              </div>

              {formData.include_vat && formData.amount && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <div className="flex justify-between mb-1">
                      <span>Amount:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(formData.amount || '0'))}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>VAT (16%):</span>
                      <span className="font-medium">{formatCurrency(financeService.calculateVAT(parseFloat(formData.amount || '0')))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(financeService.calculateTotalWithVAT(parseFloat(formData.amount || '0')))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record {activeTab === 'income' ? 'Income' : 'Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {deleteConfirm.type === 'income' ? 'Income' : 'Expense'} Record</h3>
            <p className="text-gray-600 text-sm mb-5">This will permanently delete the record and cannot be undone. Are you sure?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "income" ? "Income" : "Expense"} Details
              </h2>
              <button
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" /> Print / Save Receipt
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 print-content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Number</label>
                  <p className="text-gray-900">
                    {activeTab === "income" ? selectedRecord.income_number : selectedRecord.expense_number}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">
                    {formatDate(activeTab === "income" ? selectedRecord.income_date : selectedRecord.expense_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account</label>
                  <p className="text-gray-900">{selectedRecord.account_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">
                    {activeTab === "income" ? selectedRecord.income_category : selectedRecord.expense_category}
                  </p>
                </div>
                {activeTab === "expense" && selectedRecord.vendor_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-gray-900">{selectedRecord.vendor_name}</p>
                  </div>
                )}
                {activeTab === "income" && (selectedRecord.student_name || selectedRecord.payer_name) && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Student / Payer</label>
                    <p className="text-gray-900">
                      {selectedRecord.student_name || selectedRecord.payer_name}
                      {selectedRecord.admission_number && (
                        <span className="text-gray-400 text-xs ml-1">({selectedRecord.admission_number})</span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-gray-900 capitalize">{selectedRecord.payment_method}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-gray-900 font-semibold">
                    {formatCurrency(parseFloat(selectedRecord.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">VAT</label>
                  <p className="text-gray-900">
                    {selectedRecord.vat_amount ? formatCurrency(parseFloat(selectedRecord.vat_amount)) : "Ksh 0"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(parseFloat(selectedRecord.total_amount))}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{selectedRecord.description}</p>
              </div>

              {selectedRecord.payment_reference && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Number</label>
                  <p className="text-gray-900">{selectedRecord.payment_reference}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full $${getStatusBadge(selectedRecord.status)}`}>
                  {selectedRecord.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
    </>
  );
}
