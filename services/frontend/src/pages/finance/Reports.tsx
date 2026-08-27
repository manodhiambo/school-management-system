import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import {
  BarChart2, DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  Download, RefreshCw, FileText, ChevronRight,
  CheckCircle, Filter,
} from 'lucide-react';
import apiService from '../../services/api';
import financeService from '../../services/financeService';
import { studentTypeLabel, isBoarder } from '../../utils/studentType';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const api: any = apiService;
const fmt = (n: number | string) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const pct = (num: number, den: number) =>
  den > 0 ? ((num / den) * 100).toFixed(1) : '0.0';
const currentYear = new Date().getFullYear().toString();

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'fee-collection' | 'defaulters' | 'student-payments' | 'income-expense' | 'budget' | 'cash-flow';

interface Summary {
  total_invoiced: number; total_collected: number; total_outstanding: number;
  total_invoices: number; students_invoiced: number;
  paid_count: number; pending_count: number; partial_count: number; overdue_count: number;
}
interface ClassRow {
  class_id: string; class_name: string; education_level: string;
  total_students: number; invoice_count: number;
  invoiced: number; collected: number; outstanding: number; paid_count: number;
}
interface MethodRow { payment_method: string; count: number; total: number; }
interface TrendRow  { month: string; month_label: string; collected: number; transactions: number; }
interface Defaulter {
  id: string; first_name: string; last_name: string; admission_number: string;
  class_name: string; student_type: string;
  total_invoiced: number; total_paid: number; total_due: number;
  invoice_count: number; earliest_due: string;
}

// ─── CSV export ──────────────────────────────────────────────────────────────
function downloadCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r =>
    keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── PDF export ──────────────────────────────────────────────────────────────
function exportFeeCollectionPDF(
  summary: Summary,
  byClass: ClassRow[],
  methods: MethodRow[],
  trend: TrendRow[],
  defaulters: Defaulter[],
  filters: { year: string; term: string },
  schoolName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  const header = (title: string) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pw, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pw / 2, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text(title, pw / 2, 20, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const sub = `Academic Year: ${filters.year}${filters.term ? ' · ' + filters.term.toUpperCase() : ''} · Generated: ${new Date().toLocaleDateString('en-KE')}`;
    doc.text(sub, pw / 2, 26, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    y = 36;
  };

  const sectionTitle = (t: string) => {
    if (y > 260) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.setFillColor(240, 244, 255);
    doc.rect(10, y - 1, pw - 20, 7, 'F');
    doc.text(t, 12, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    y += 10;
  };

  // ── Page 1: Summary ──
  header('FEE COLLECTION REPORT');

  // Summary cards
  const cols4 = [12, pw / 4 + 2, pw / 2 + 2, (3 * pw) / 4 + 2];
  const cards = [
    { label: 'Total Invoiced',   val: fmt(summary.total_invoiced),   color: [37, 99, 235] as [number,number,number] },
    { label: 'Total Collected',  val: fmt(summary.total_collected),  color: [22, 163, 74] as [number,number,number] },
    { label: 'Outstanding',      val: fmt(summary.total_outstanding), color: [220, 38, 38] as [number,number,number] },
    { label: 'Collection Rate',  val: pct(summary.total_collected, summary.total_invoiced) + '%', color: [124, 58, 237] as [number,number,number] },
  ];
  cards.forEach((c, i) => {
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(cols4[i], y, pw / 4 - 4, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(c.label, cols4[i] + 2, y + 5);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(c.val, cols4[i] + 2, y + 13);
  });
  doc.setTextColor(30, 30, 30);
  y += 24;

  // Invoice status row
  const statusItems = [
    { label: 'Paid', val: summary.paid_count },
    { label: 'Pending', val: summary.pending_count },
    { label: 'Partial', val: summary.partial_count },
    { label: 'Overdue', val: summary.overdue_count },
    { label: 'Students Invoiced', val: summary.students_invoiced },
    { label: 'Total Invoices', val: summary.total_invoices },
  ];
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  statusItems.forEach((s, i) => {
    const col = 12 + (i % 3) * ((pw - 24) / 3);
    if (i === 3) y += 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(col, y + (i < 3 ? 0 : -8), (pw - 24) / 3 - 2, 7, 'F');
    doc.text(`${s.label}: ${s.val}`, col + 2, y + (i < 3 ? 5 : -3));
  });
  y += 14;

  // ── Class breakdown ──
  sectionTitle('Collection by Class');
  doc.setFillColor(37, 99, 235);
  doc.rect(10, y, pw - 20, 6, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Class', 12, y + 4);
  doc.text('Students', 65, y + 4, { align: 'right' });
  doc.text('Invoiced', 95, y + 4, { align: 'right' });
  doc.text('Collected', 125, y + 4, { align: 'right' });
  doc.text('Outstanding', 158, y + 4, { align: 'right' });
  doc.text('Rate', pw - 12, y + 4, { align: 'right' });
  y += 6; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
  let rowBg = false;
  for (const r of byClass) {
    if (y > 270) { doc.addPage(); y = 15; }
    if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
    doc.text(r.class_name, 12, y + 4);
    doc.text(String(r.total_students), 65, y + 4, { align: 'right' });
    doc.text(fmt(r.invoiced), 95, y + 4, { align: 'right' });
    doc.text(fmt(r.collected), 125, y + 4, { align: 'right' });
    doc.text(fmt(r.outstanding), 158, y + 4, { align: 'right' });
    doc.text(pct(r.collected, r.invoiced) + '%', pw - 12, y + 4, { align: 'right' });
    y += 6; rowBg = !rowBg;
  }
  y += 6;

  // ── Payment Methods ──
  if (methods.length) {
    sectionTitle('Payment Methods Breakdown');
    const totalPaid = methods.reduce((s, m) => s + Number(m.total), 0);
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Method', 12, y + 4);
    doc.text('Transactions', 90, y + 4, { align: 'right' });
    doc.text('Amount', 130, y + 4, { align: 'right' });
    doc.text('Share', pw - 12, y + 4, { align: 'right' });
    y += 6; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); rowBg = false;
    for (const m of methods) {
      if (y > 270) { doc.addPage(); y = 15; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
      doc.text(m.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 12, y + 4);
      doc.text(String(m.count), 90, y + 4, { align: 'right' });
      doc.text(fmt(m.total), 130, y + 4, { align: 'right' });
      doc.text(pct(Number(m.total), totalPaid) + '%', pw - 12, y + 4, { align: 'right' });
      y += 6; rowBg = !rowBg;
    }
    y += 6;
  }

  // ── Monthly Trend ──
  if (trend.length) {
    if (y > 200) { doc.addPage(); y = 15; }
    sectionTitle('Monthly Collection Trend');
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Month', 12, y + 4);
    doc.text('Transactions', 90, y + 4, { align: 'right' });
    doc.text('Amount Collected', pw - 12, y + 4, { align: 'right' });
    y += 6; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); rowBg = false;
    for (const t of trend) {
      if (y > 270) { doc.addPage(); y = 15; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
      doc.text(t.month_label, 12, y + 4);
      doc.text(String(t.transactions), 90, y + 4, { align: 'right' });
      doc.text(fmt(t.collected), pw - 12, y + 4, { align: 'right' });
      y += 6; rowBg = !rowBg;
    }
    y += 6;
  }

  // ── Defaulters ──
  if (defaulters.length) {
    if (y > 200) { doc.addPage(); y = 15; }
    sectionTitle(`Top Defaulters (${defaulters.length} students)`);
    doc.setFillColor(37, 99, 235);
    doc.rect(10, y, pw - 20, 6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Student', 12, y + 4);
    doc.text('Adm #', 68, y + 4);
    doc.text('Class', 90, y + 4);
    doc.text('Invoiced', 120, y + 4, { align: 'right' });
    doc.text('Paid', 143, y + 4, { align: 'right' });
    doc.text('Outstanding', pw - 12, y + 4, { align: 'right' });
    y += 6; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); rowBg = false;
    for (const d of defaulters.slice(0, 50)) {
      if (y > 270) { doc.addPage(); y = 15; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
      doc.text(`${d.first_name} ${d.last_name}`.substring(0, 28), 12, y + 4);
      doc.text(d.admission_number || '', 68, y + 4);
      doc.text((d.class_name || '').substring(0, 14), 90, y + 4);
      doc.text(fmt(d.total_invoiced), 120, y + 4, { align: 'right' });
      doc.text(fmt(d.total_paid), 143, y + 4, { align: 'right' });
      doc.setTextColor(180, 30, 30);
      doc.text(fmt(d.total_due), pw - 12, y + 4, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      y += 6; rowBg = !rowBg;
    }
  }

  doc.save(`fee-collection-${filters.year}${filters.term ? '-' + filters.term : ''}.pdf`);
}

// ─── Student Payments PDF ─────────────────────────────────────────────────────
function exportStudentPaymentsPDF(students: any[], schoolName: string, year: string, term: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pw / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text('STUDENT FEE PAYMENTS REPORT', pw / 2, 20, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Year: ${year}${term ? ' · ' + term.toUpperCase() : ''} · Generated: ${new Date().toLocaleDateString('en-KE')}`, pw / 2, 26, { align: 'center' });
  doc.setTextColor(30, 30, 30);
  y = 36;

  // Summary
  const totalInvoiced = students.reduce((s, r) => s + Number(r.total_invoiced), 0);
  const totalPaid = students.reduce((s, r) => s + Number(r.total_paid), 0);
  const totalBalance = students.reduce((s, r) => s + Number(r.total_balance), 0);

  const cols3 = [12, pw / 3 + 2, (2 * pw) / 3 + 2];
  const sumCards = [
    { label: 'Total Invoiced', val: fmt(totalInvoiced), color: [37, 99, 235] as [number, number, number] },
    { label: 'Total Paid', val: fmt(totalPaid), color: [22, 163, 74] as [number, number, number] },
    { label: 'Total Balance Due', val: fmt(totalBalance), color: [220, 38, 38] as [number, number, number] },
  ];
  sumCards.forEach((c, i) => {
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(cols3[i], y, pw / 3 - 4, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(c.label, cols3[i] + 2, y + 5);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(c.val, cols3[i] + 2, y + 12);
  });
  doc.setTextColor(30, 30, 30);
  y += 22;

  // Table header
  doc.setFillColor(37, 99, 235);
  doc.rect(10, y, pw - 20, 6, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Student', 12, y + 4);
  doc.text('Adm #', 65, y + 4);
  doc.text('Class', 88, y + 4);
  doc.text('Invoiced', 118, y + 4, { align: 'right' });
  doc.text('Paid', 143, y + 4, { align: 'right' });
  doc.text('Balance', pw - 12, y + 4, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  let rowBg = false;
  for (const s of students) {
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setTextColor(30, 30, 30);
    if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
    doc.text(`${s.first_name} ${s.last_name}`.substring(0, 28), 12, y + 4);
    doc.text(s.admission_number || '', 65, y + 4);
    doc.text((s.class_name || '').substring(0, 14), 88, y + 4);
    doc.text(fmt(s.total_invoiced), 118, y + 4, { align: 'right' });
    doc.text(fmt(s.total_paid), 143, y + 4, { align: 'right' });
    if (Number(s.total_balance) > 0) doc.setTextColor(180, 30, 30);
    doc.text(fmt(s.total_balance), pw - 12, y + 4, { align: 'right' });
    y += 6; rowBg = !rowBg;
  }

  // Footer totals
  y += 2;
  doc.setFillColor(30, 30, 30);
  doc.rect(10, y, pw - 20, 6, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text(`TOTALS (${students.length} students)`, 12, y + 4);
  doc.text(fmt(totalInvoiced), 118, y + 4, { align: 'right' });
  doc.text(fmt(totalPaid), 143, y + 4, { align: 'right' });
  doc.text(fmt(totalBalance), pw - 12, y + 4, { align: 'right' });

  doc.save(`student-payments-${year}${term ? '-' + term : ''}.pdf`);
}

// ─── Bar chart component (CSS-based, no external lib) ────────────────────────
function BarChart({ data, labelKey, valueKey, color = 'bg-blue-500' }: {
  data: any[]; labelKey: string; valueKey: string; color?: string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-28 text-xs text-gray-600 truncate shrink-0">{d[labelKey]}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full ${color} transition-all`}
              style={{ width: `${(Number(d[valueKey]) / max) * 100}%` }}
            />
          </div>
          <div className="w-28 text-right text-xs font-medium text-gray-700 shrink-0">
            {fmt(d[valueKey])}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        <Icon className="h-6 w-6 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const Reports: React.FC = () => {
  const [tab, setTab] = useState<Tab>('fee-collection');
  const [year, setYear] = useState(currentYear);
  const [term, setTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Fee collection state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byClass, setByClass] = useState<ClassRow[]>([]);
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('School');
  const [loading, setLoading] = useState(false);

  // Student payments state
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [spLoading, setSpLoading] = useState(false);
  const [spSearch, setSpSearch] = useState('');

  // Finance module state
  const [incomeData, setIncomeData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [finLoading, setFinLoading] = useState(false);

  useEffect(() => {
    api.getClasses().then((r: any) => setClasses(r?.data || []));
    api.getStudentCategories().then((r: any) => setCategories(r?.data || [])).catch(() => {});
    api.getSettings().then((r: any) => setSchoolName(r?.data?.school_name || 'School')).catch(() => {});
  }, []);

  // ── Fee collection load ──
  // date_from/date_to now flow into every sub-report (summary, by-class,
  // monthly trend, payment methods) so "Total Collected" and the trend
  // chart actually reflect the chosen Payment Date range — previously only
  // Payment Methods honored it and Monthly Trend ignored it entirely.
  const loadFeeReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        academic_year: year,
        term: term || undefined,
        class_id: classId || undefined,
        category_id: categoryId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      const [sumRes, classRes, methodRes, trendRes, defRes]: any[] = await Promise.all([
        api.getFeeReportSummary(params),
        api.getFeeReportByClass(params),
        api.getFeeReportPaymentMethods({ date_from: dateFrom, date_to: dateTo }),
        api.getFeeReportMonthlyTrend({ date_from: dateFrom, date_to: dateTo }),
        api.getFeeReportDefaulters({ academic_year: year, term: term || undefined, class_id: classId || undefined, category_id: categoryId || undefined }),
      ]);
      setSummary(sumRes?.data || null);
      setByClass(classRes?.data || []);
      setMethods(methodRes?.data || []);
      setTrend(trendRes?.data || []);
      setDefaulters(defRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, [year, term, classId, categoryId, dateFrom, dateTo]);

  // ── Finance module load ──
  const loadFinanceReport = useCallback(async () => {
    setFinLoading(true);
    try {
      const [incCat, expCat, budgets, incRec, expRec]: any[] = await Promise.all([
        financeService.getIncomeByCategory({ dateFrom, dateTo }).catch(() => []),
        financeService.getExpensesByCategory({ dateFrom, dateTo }).catch(() => []),
        api.getAllBudgets({ status: 'approved' }).catch(() => []),
        financeService.getIncomeRecords({ dateFrom, dateTo, status: 'completed' }).catch(() => []),
        financeService.getExpenseRecords({ dateFrom, dateTo }).catch(() => []),
      ]);

      const totalIncome   = (incCat || []).reduce((s: number, c: any) => s + Number(c.total), 0);
      const totalExpenses = (expCat || []).reduce((s: number, c: any) => s + Number(c.total), 0);
      setIncomeData({ total_income: totalIncome, total_expenses: totalExpenses, net: totalIncome - totalExpenses, income_by_category: incCat || [], expenses_by_category: expCat || [] });

      const rawBudgets = budgets?.data ?? budgets?.budgets ?? budgets ?? [];
      setBudgetData(Array.isArray(rawBudgets) ? rawBudgets : []);

      const cashIn  = (incRec || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      const cashOut = (expRec || []).filter((e: any) => e.status === 'paid').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      setCashFlowData({ cash_in: cashIn, cash_out: cashOut, net: cashIn - cashOut });

      const totalExp = (expRec || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      const paidExp  = (expRec || []).filter((e: any) => e.status === 'paid').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      setExpenseData({ total: totalExp, paid: paidExp, pending: totalExp - paidExp, by_category: expCat || [] });
    } finally {
      setFinLoading(false);
    }
  }, [dateFrom, dateTo]);

  const loadStudentPayments = useCallback(async () => {
    setSpLoading(true);
    try {
      const params: any = {};
      if (classId) params.classId = classId;
      if (categoryId) params.categoryId = categoryId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res: any = await api.getStudentsSummary(params);
      setStudentPayments(res?.data || []);
    } finally {
      setSpLoading(false);
    }
  }, [classId, categoryId, dateFrom, dateTo]);

  useEffect(() => {
    if (tab === 'fee-collection' || tab === 'defaulters') loadFeeReport();
    else if (tab === 'student-payments') loadStudentPayments();
    else loadFinanceReport();
  }, [tab, loadFeeReport, loadFinanceReport, loadStudentPayments]);

  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - 2 + i).toString());
  const collectionRate = summary ? Number(pct(summary.total_collected, summary.total_invoiced)) : 0;

  // ─── Tabs ────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'fee-collection',   label: 'Fee Collection',    icon: DollarSign },
    { id: 'defaulters',       label: 'Defaulters',        icon: AlertTriangle },
    { id: 'student-payments', label: 'Student Payments',  icon: Users },
    { id: 'income-expense',   label: 'Income & Expenses', icon: BarChart2 },
    { id: 'budget',           label: 'Budget vs Actual',  icon: TrendingUp },
    { id: 'cash-flow',        label: 'Cash Flow',         icon: TrendingDown },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500">Comprehensive financial analysis and insights</p>
        </div>
        <div className="flex gap-2">
          {(tab === 'fee-collection' || tab === 'defaulters') && (
            <>
              <button
                onClick={() => summary && exportFeeCollectionPDF(summary, byClass, methods, trend, defaulters, { year, term }, schoolName)}
                disabled={!summary}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => downloadCSV(defaulters, `defaulters-${year}.csv`)}
                disabled={!defaulters.length}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </>
          )}
          {tab === 'student-payments' && (
            <>
              <button
                onClick={() => exportStudentPaymentsPDF(studentPayments, schoolName, year, term)}
                disabled={!studentPayments.length}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => downloadCSV(
                  studentPayments.map(s => ({
                    Name: `${s.first_name} ${s.last_name}`,
                    'Admission #': s.admission_number,
                    Class: s.class_name,
                    Type: s.student_type,
                    'Total Invoiced (KES)': Number(s.total_invoiced).toFixed(2),
                    'Total Paid (KES)': Number(s.total_paid).toFixed(2),
                    'Balance Due (KES)': Number(s.total_balance).toFixed(2),
                    'Invoices': s.invoice_count,
                  })),
                  `student-payments-${year}.csv`
                )}
                disabled={!studentPayments.length}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (tab === 'fee-collection' || tab === 'defaulters') loadFeeReport();
              else if (tab === 'student-payments') loadStudentPayments();
              else loadFinanceReport();
            }}
            disabled={loading || finLoading || spLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || finLoading || spLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-end bg-gray-50 rounded-xl p-4">
        {(tab === 'fee-collection' || tab === 'defaulters' || tab === 'student-payments') ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
              <select value={term} onChange={e => setTerm(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
                <option value="">All Terms</option>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="term3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
              <select value={classId} onChange={e => setClassId(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
                <option value="">All Students</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
          </>
        )}
        <button
          onClick={() => {
            if (tab === 'fee-collection' || tab === 'defaulters') loadFeeReport();
            else if (tab === 'student-payments') loadStudentPayments();
            else loadFinanceReport();
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Filter className="h-3.5 w-3.5" /> Apply
        </button>
      </div>

      {/* ═══════════════ FEE COLLECTION TAB ═══════════════ */}
      {tab === 'fee-collection' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
            <>
              {/* Summary cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total Invoiced"  value={fmt(summary.total_invoiced)}   sub={`${summary.total_invoices} invoices`} icon={FileText}    color="bg-blue-600 text-white" />
                  <StatCard label="Total Collected" value={fmt(summary.total_collected)}  sub={`${summary.paid_count} fully paid`}   icon={CheckCircle} color="bg-green-600 text-white" />
                  <StatCard label="Outstanding"     value={fmt(summary.total_outstanding)} sub={`${summary.pending_count + summary.overdue_count} unpaid`} icon={AlertTriangle} color="bg-red-500 text-white" />
                  <StatCard label="Collection Rate" value={pct(summary.total_collected, summary.total_invoiced) + '%'} sub={`${summary.students_invoiced} students invoiced`} icon={TrendingUp} color="bg-purple-600 text-white" />
                </div>
              )}

              {/* Collection rate bar */}
              {summary && (
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Overall Collection Progress</h3>
                    <span className="text-lg font-bold text-blue-600">{collectionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Collected: {fmt(summary.total_collected)}</span>
                    <span>Outstanding: {fmt(summary.total_outstanding)}</span>
                    <span>Total: {fmt(summary.total_invoiced)}</span>
                  </div>
                  {/* Status breakdown */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {[
                      { label: 'Paid',    count: summary.paid_count,    color: 'bg-green-100 text-green-700' },
                      { label: 'Partial', count: summary.partial_count, color: 'bg-yellow-100 text-yellow-700' },
                      { label: 'Pending', count: summary.pending_count, color: 'bg-gray-100 text-gray-700' },
                      { label: 'Overdue', count: summary.overdue_count, color: 'bg-red-100 text-red-700' },
                    ].map(s => (
                      <div key={s.label} className={`rounded-lg px-3 py-2 text-center ${s.color}`}>
                        <p className="text-2xl font-bold">{s.count}</p>
                        <p className="text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection by class */}
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Collection by Class</h3>
                    <button onClick={() => downloadCSV(byClass, `collection-by-class-${year}.csv`)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Download className="h-3 w-3" /> CSV</button>
                  </div>
                  {byClass.filter(c => c.invoice_count > 0).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No invoiced classes for this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="text-left px-2 py-2">Class</th>
                            <th className="text-right px-2 py-2">Invoiced</th>
                            <th className="text-right px-2 py-2">Collected</th>
                            <th className="text-right px-2 py-2">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {byClass.filter(c => c.invoice_count > 0).map(c => {
                            const rate = Number(pct(c.collected, c.invoiced));
                            return (
                              <tr key={c.class_id} className="hover:bg-gray-50">
                                <td className="px-2 py-2 font-medium">{c.class_name}</td>
                                <td className="px-2 py-2 text-right">{fmt(c.invoiced)}</td>
                                <td className="px-2 py-2 text-right text-green-700">{fmt(c.collected)}</td>
                                <td className="px-2 py-2 text-right">
                                  <span className={`font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {rate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payment methods */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Payment Methods</h3>
                  {methods.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No payment data for this period.</p>
                  ) : (
                    <>
                      <BarChart
                        data={methods}
                        labelKey="payment_method"
                        valueKey="total"
                        color="bg-blue-500"
                      />
                      <div className="mt-4 border-t pt-3 space-y-1">
                        {methods.map(m => {
                          const grandTotal = methods.reduce((s, x) => s + Number(x.total), 0);
                          return (
                            <div key={m.payment_method} className="flex justify-between text-xs text-gray-600">
                              <span className="capitalize">{m.payment_method.replace(/_/g, ' ')}</span>
                              <span>{m.count} transactions · {pct(Number(m.total), grandTotal)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Monthly trend */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Monthly Collection Trend (Last 12 Months)</h3>
                  <button onClick={() => downloadCSV(trend, `monthly-trend.csv`)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Download className="h-3 w-3" /> CSV</button>
                </div>
                {trend.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No payment records found.</p>
                ) : (
                  <div className="space-y-2">
                    {trend.map(t => {
                      const maxVal = Math.max(...trend.map(x => Number(x.collected)), 1);
                      const w = (Number(t.collected) / maxVal) * 100;
                      return (
                        <div key={t.month} className="flex items-center gap-3">
                          <div className="w-20 text-xs text-gray-500 shrink-0">{t.month_label}</div>
                          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                            <div className="h-5 bg-gradient-to-r from-blue-400 to-blue-600 rounded" style={{ width: `${w}%` }} />
                          </div>
                          <div className="w-32 text-right text-xs font-medium text-gray-700 shrink-0">{fmt(t.collected)}</div>
                          <div className="w-20 text-right text-xs text-gray-400 shrink-0">{t.transactions} txns</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top 10 defaulters preview */}
              {defaulters.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Top Defaulters ({defaulters.length} students)
                    </h3>
                    <button onClick={() => setTab('defaulters')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50 border-b">
                        <th className="text-left px-3 py-2">Student</th>
                        <th className="text-left px-3 py-2">Class</th>
                        <th className="text-right px-3 py-2">Invoiced</th>
                        <th className="text-right px-3 py-2">Paid</th>
                        <th className="text-right px-3 py-2 text-red-600">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {defaulters.slice(0, 10).map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <p className="font-medium">{d.first_name} {d.last_name}</p>
                            <p className="text-gray-400">{d.admission_number}</p>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{d.class_name || '—'}</td>
                          <td className="px-3 py-2 text-right">{fmt(d.total_invoiced)}</td>
                          <td className="px-3 py-2 text-right text-green-700">{fmt(d.total_paid)}</td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">{fmt(d.total_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ DEFAULTERS TAB ═══════════════ */}
      {tab === 'defaulters' && (
        <div className="space-y-5">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
            <>
              {/* Summary cards */}
              {defaulters.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Students with Balance" value={String(defaulters.length)} icon={Users} color="bg-red-500 text-white" />
                  <StatCard label="Total Outstanding" value={fmt(defaulters.reduce((s, d) => s + Number(d.total_due), 0))} icon={DollarSign} color="bg-orange-500 text-white" />
                  <StatCard label="Total Invoiced (Defaulters)" value={fmt(defaulters.reduce((s, d) => s + Number(d.total_invoiced), 0))} icon={FileText} color="bg-gray-600 text-white" />
                </div>
              )}

              <div className="bg-white rounded-xl border">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">
                    {defaulters.length === 0 ? 'No defaulters for this period' : `${defaulters.length} Students with Outstanding Balances`}
                  </h3>
                  <button onClick={() => downloadCSV(defaulters, `defaulters-${year}${term ? '-' + term : ''}.csv`)} disabled={!defaulters.length} className="flex items-center gap-1.5 text-sm text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-40">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                {defaulters.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">All clear! No outstanding balances.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-4 py-3">#</th>
                          <th className="text-left px-4 py-3">Student</th>
                          <th className="text-left px-4 py-3">Class</th>
                          <th className="text-left px-4 py-3">Type</th>
                          <th className="text-right px-4 py-3">Invoiced</th>
                          <th className="text-right px-4 py-3">Paid</th>
                          <th className="text-right px-4 py-3 text-red-600">Outstanding</th>
                          <th className="text-center px-4 py-3">Invoices</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {defaulters.map((d, i) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{d.first_name} {d.last_name}</p>
                              <p className="text-xs text-gray-400">{d.admission_number}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{d.class_name || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${isBoarder(d.student_type) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {studentTypeLabel(d.student_type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">{fmt(d.total_invoiced)}</td>
                            <td className="px-4 py-3 text-right text-green-700">{fmt(d.total_paid)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(d.total_due)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{d.invoice_count}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 font-bold text-sm">TOTAL</td>
                          <td className="px-4 py-3 text-right font-bold">{fmt(defaulters.reduce((s, d) => s + Number(d.total_invoiced), 0))}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(defaulters.reduce((s, d) => s + Number(d.total_paid), 0))}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(defaulters.reduce((s, d) => s + Number(d.total_due), 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ STUDENT PAYMENTS TAB ═══════════════ */}
      {tab === 'student-payments' && (
        <div className="space-y-5">
          {spLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
            <>
              {/* Summary cards */}
              {studentPayments.length > 0 && (() => {
                const totInv = studentPayments.reduce((s, r) => s + Number(r.total_invoiced), 0);
                const totPaid = studentPayments.reduce((s, r) => s + Number(r.total_paid), 0);
                const totBal = studentPayments.reduce((s, r) => s + Number(r.total_balance), 0);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Students" value={String(studentPayments.length)} sub="active students" icon={Users} color="bg-blue-600 text-white" />
                    <StatCard label="Total Invoiced" value={fmt(totInv)} icon={FileText} color="bg-gray-600 text-white" />
                    <StatCard label="Total Paid" value={fmt(totPaid)} sub={pct(totPaid, totInv) + '% collected'} icon={CheckCircle} color="bg-green-600 text-white" />
                    <StatCard label="Balance Due" value={fmt(totBal)} icon={AlertTriangle} color={totBal > 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} />
                  </div>
                );
              })()}

              <div className="bg-white rounded-xl border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">
                    Fee Payments &amp; Balance Due — All Students
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={spSearch}
                      onChange={e => setSpSearch(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-sm w-48"
                    />
                  </div>
                </div>

                {studentPayments.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No student data found.</p>
                    <p className="text-sm mt-1">Try selecting a different class or refreshing.</p>
                  </div>
                ) : (() => {
                  const filtered = spSearch
                    ? studentPayments.filter(s =>
                        `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(spSearch.toLowerCase())
                      )
                    : studentPayments;
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left px-4 py-3">#</th>
                            <th className="text-left px-4 py-3">Student</th>
                            <th className="text-left px-4 py-3">Class</th>
                            <th className="text-left px-4 py-3">Type</th>
                            <th className="text-right px-4 py-3">Invoiced</th>
                            <th className="text-right px-4 py-3 text-green-700">Paid</th>
                            <th className="text-right px-4 py-3 text-red-600">Balance Due</th>
                            <th className="text-center px-4 py-3">Invoices</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filtered.map((s, i) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium">{s.first_name} {s.last_name}</p>
                                <p className="text-xs text-gray-400">{s.admission_number}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{s.class_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isBoarder(s.student_type) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {studentTypeLabel(s.student_type)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">{fmt(s.total_invoiced)}</td>
                              <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(s.total_paid)}</td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: Number(s.total_balance) > 0 ? '#dc2626' : '#16a34a' }}>
                                {fmt(s.total_balance)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${s.invoice_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {s.invoice_count}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 font-bold text-sm">TOTAL ({filtered.length} students)</td>
                            <td className="px-4 py-3 text-right font-bold">{fmt(filtered.reduce((s, r) => s + Number(r.total_invoiced), 0))}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(filtered.reduce((s, r) => s + Number(r.total_paid), 0))}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(filtered.reduce((s, r) => s + Number(r.total_balance), 0))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ INCOME & EXPENSES TAB ═══════════════ */}
      {tab === 'income-expense' && (
        <div className="space-y-6">
          {finLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : incomeData ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Income"   value={fmt(incomeData.total_income)}   icon={TrendingUp}   color="bg-green-600 text-white" />
                <StatCard label="Total Expenses" value={fmt(incomeData.total_expenses)} icon={TrendingDown} color="bg-red-500 text-white" />
                <StatCard
                  label={incomeData.net >= 0 ? 'Net Surplus' : 'Net Deficit'}
                  value={fmt(Math.abs(incomeData.net))}
                  icon={DollarSign}
                  color={incomeData.net >= 0 ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Income by Category</h3>
                  {incomeData.income_by_category.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No income records in this period.</p>
                  ) : (
                    <BarChart data={incomeData.income_by_category} labelKey="category" valueKey="total" color="bg-green-500" />
                  )}
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Expenses by Category</h3>
                  {incomeData.expenses_by_category.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No expense records in this period.</p>
                  ) : (
                    <BarChart data={incomeData.expenses_by_category} labelKey="category" valueKey="total" color="bg-red-400" />
                  )}
                </div>
              </div>

              {expenseData && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Expense Payment Status</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Expenses</p>
                      <p className="text-xl font-bold mt-1">{fmt(expenseData.total)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Paid</p>
                      <p className="text-xl font-bold text-green-800 mt-1">{fmt(expenseData.paid)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-yellow-600">Pending</p>
                      <p className="text-xl font-bold text-yellow-800 mt-1">{fmt(expenseData.pending)}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-400 py-12">No data available. Check your date range.</p>
          )}
        </div>
      )}

      {/* ═══════════════ BUDGET VS ACTUAL TAB ═══════════════ */}
      {tab === 'budget' && (
        <div className="space-y-5">
          {finLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : budgetData.length === 0 ? (
            <div className="bg-white rounded-xl border py-16 text-center text-gray-400">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No approved budgets found for this period.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Budgeted" value={fmt(budgetData.reduce((s, b) => s + Number(b.total_amount || 0), 0))} icon={FileText} color="bg-blue-600 text-white" />
                <StatCard label="Total Spent"    value={fmt(budgetData.reduce((s, b) => s + Number(b.spent_amount || 0), 0))} icon={TrendingDown} color="bg-red-500 text-white" />
                <StatCard label="Total Remaining" value={fmt(budgetData.reduce((s, b) => s + Number(b.total_amount || 0) - Number(b.spent_amount || 0), 0))} icon={DollarSign} color="bg-green-600 text-white" />
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-4 py-3">Budget</th>
                      <th className="text-right px-4 py-3">Allocated</th>
                      <th className="text-right px-4 py-3">Spent</th>
                      <th className="text-right px-4 py-3">Remaining</th>
                      <th className="text-left px-4 py-3">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {budgetData.map((b: any, i: number) => {
                      const allocated = Number(b.total_amount || 0);
                      const spent = Number(b.spent_amount || 0);
                      const remaining = allocated - spent;
                      const utilPct = allocated > 0 ? (spent / allocated) * 100 : 0;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{b.budget_name}</td>
                          <td className="px-4 py-3 text-right">{fmt(allocated)}</td>
                          <td className="px-4 py-3 text-right">{fmt(spent)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(remaining)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div className={`h-2 rounded-full ${utilPct > 100 ? 'bg-red-500' : utilPct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-600 w-10 text-right">{utilPct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ CASH FLOW TAB ═══════════════ */}
      {tab === 'cash-flow' && (
        <div className="space-y-6">
          {finLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : cashFlowData ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Cash Inflows"  value={fmt(cashFlowData.cash_in)}  sub="Completed income" icon={TrendingUp}   color="bg-green-600 text-white" />
                <StatCard label="Cash Outflows" value={fmt(cashFlowData.cash_out)} sub="Paid expenses"    icon={TrendingDown} color="bg-red-500 text-white" />
                <StatCard
                  label={cashFlowData.net >= 0 ? 'Net Cash Inflow' : 'Net Cash Outflow'}
                  value={fmt(Math.abs(cashFlowData.net))}
                  icon={DollarSign}
                  color={cashFlowData.net >= 0 ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}
                />
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-gray-800 mb-5">Cash Flow Summary</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Total Cash Received (Income)', value: cashFlowData.cash_in, color: 'text-green-700', bg: 'bg-green-50' },
                    { label: 'Total Cash Disbursed (Expenses)', value: cashFlowData.cash_out, color: 'text-red-700', bg: 'bg-red-50' },
                    { label: 'Net Cash Position', value: cashFlowData.net, color: cashFlowData.net >= 0 ? 'text-blue-700' : 'text-orange-700', bg: cashFlowData.net >= 0 ? 'bg-blue-50' : 'bg-orange-50' },
                  ].map(row => (
                    <div key={row.label} className={`flex items-center justify-between ${row.bg} rounded-lg px-5 py-4`}>
                      <span className="font-medium text-gray-700">{row.label}</span>
                      <span className={`text-lg font-bold ${row.color}`}>{fmt(row.value)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Note: Cash inflows are based on completed income transactions. Cash outflows are based on paid expense records.
                </p>
              </div>

              {/* Fee collection also contributes to cash flow */}
              {summary && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Fee Collections Contribution</h3>
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg px-5 py-4">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Fee Payments Collected</p>
                      <p className="text-xs text-blue-500 mt-0.5">From student fee invoices ({year}{term ? ' · ' + term : ''})</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{fmt(summary.total_collected)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-400 py-12">No data available. Check your date range.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
