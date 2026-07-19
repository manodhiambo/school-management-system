import React, { useState, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  BookOpen, Scale, List, FileEdit, Download, RefreshCw, Filter,
  Plus, X, CheckCircle, AlertTriangle,
} from 'lucide-react';
import apiService from '../../services/api';

const api: any = apiService;

const fmt = (n: number | string) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

const today = new Date().toISOString().split('T')[0];
const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

type Tab = 'trial-balance' | 'balance-sheet' | 'general-ledger' | 'journals';

// ── Shared PDF header ─────────────────────────────────────────────────────
function pdfHeader(doc: jsPDF, title: string, sub: string, schoolName: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pw / 2, 11, { align: 'center' });
  doc.setFontSize(11);
  doc.text(title, pw / 2, 19, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(sub, pw / 2, 26, { align: 'center' });
  doc.setTextColor(30, 30, 30);
  return 36;
}

// ── Trial Balance PDF ─────────────────────────────────────────────────────
function exportTrialBalancePDF(data: any, dateFrom: string, dateTo: string, schoolName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();
  let y = pdfHeader(doc, 'TRIAL BALANCE', `Period: ${dateFrom} to ${dateTo}  ·  Generated: ${new Date().toLocaleDateString('en-KE')}`, schoolName);

  const cols = { desc: 12, debit: pw - 50, credit: pw - 12 };
  doc.setFillColor(30, 58, 138);
  doc.rect(10, y, pw - 20, 6, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Account', cols.desc, y + 4);
  doc.text('Debit (KES)', cols.debit, y + 4, { align: 'right' });
  doc.text('Credit (KES)', cols.credit, y + 4, { align: 'right' });
  y += 6; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');

  let lastType = '';
  let rowBg = false;
  for (const acct of data.accounts) {
    if (y > 270) { doc.addPage(); y = 15; }
    if (acct.account_type !== lastType) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.setFillColor(230, 236, 255);
      doc.rect(10, y, pw - 20, 6, 'F');
      doc.text(acct.account_type.toUpperCase(), cols.desc, y + 4);
      y += 6; lastType = acct.account_type; rowBg = false;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    }
    if (rowBg) { doc.setFillColor(248, 250, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
    doc.text((acct.account_code ? `[${acct.account_code}] ` : '') + acct.account_name, cols.desc, y + 4);
    doc.text(acct.debit_total > 0 ? fmt(acct.debit_total) : '—', cols.debit, y + 4, { align: 'right' });
    doc.text(acct.credit_total > 0 ? fmt(acct.credit_total) : '—', cols.credit, y + 4, { align: 'right' });
    y += 6; rowBg = !rowBg;
  }
  y += 2;
  doc.setFillColor(30, 58, 138); doc.rect(10, y, pw - 20, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('TOTALS', cols.desc, y + 5);
  doc.text(fmt(data.totalDebit), cols.debit, y + 5, { align: 'right' });
  doc.text(fmt(data.totalCredit), cols.credit, y + 5, { align: 'right' });

  doc.save(`trial-balance-${dateFrom}-${dateTo}.pdf`);
}

// ── Balance Sheet PDF ─────────────────────────────────────────────────────
function exportBalanceSheetPDF(data: any, asOf: string, schoolName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();
  let y = pdfHeader(doc, 'BALANCE SHEET', `As at: ${asOf}  ·  Generated: ${new Date().toLocaleDateString('en-KE')}`, schoolName);

  const printSection = (title: string, items: { name: string; value: number }[], total: number, totalLabel: string, color: [number, number, number]) => {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFillColor(...color);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(title, 13, y + 5);
    y += 7; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    for (const item of items) {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.setFillColor(248, 250, 255); doc.rect(10, y, pw - 20, 6, 'F');
      doc.text(item.name, 15, y + 4);
      doc.text(fmt(item.value), pw - 12, y + 4, { align: 'right' });
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 236, 255); doc.rect(10, y, pw - 20, 6, 'F');
    doc.text(totalLabel, 13, y + 4);
    doc.text(fmt(total), pw - 12, y + 4, { align: 'right' });
    y += 10;
  };

  const d = data;
  printSection('CURRENT ASSETS', d.assets.currentAssets, d.assets.totalCurrentAssets, 'Total Current Assets', [22, 163, 74]);
  printSection('FIXED ASSETS', d.assets.fixedAssets, d.assets.totalFixedAssets, 'Total Fixed Assets', [37, 99, 235]);

  doc.setFillColor(30, 58, 138); doc.rect(10, y, pw - 20, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TOTAL ASSETS', 13, y + 5);
  doc.text(fmt(d.assets.totalAssets), pw - 12, y + 5, { align: 'right' });
  y += 14;

  printSection('LIABILITIES — Accounts Payable', d.liabilities.items, d.liabilities.totalLiabilities, 'Total Liabilities', [220, 38, 38]);

  doc.setFillColor(124, 58, 237); doc.rect(10, y, pw - 20, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('EQUITY (Net Assets)', 13, y + 5);
  doc.text(fmt(d.equity.totalEquity), pw - 12, y + 5, { align: 'right' });
  y += 7;
  doc.setFillColor(230, 236, 255); doc.rect(10, y, pw - 20, 6, 'F');
  doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Retained Earnings / Surplus', 15, y + 4);
  doc.text(fmt(d.equity.retainedEarnings), pw - 12, y + 4, { align: 'right' });

  doc.save(`balance-sheet-${asOf}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────
export const AdvancedReports: React.FC = () => {
  const [tab, setTab]         = useState<Tab>('trial-balance');
  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo]   = useState(today);
  const [bsDate, setBsDate]   = useState(today);
  const [glAccount, setGlAccount] = useState('');
  const [jStatus, setJStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('School');

  // Data states
  const [tbData,  setTbData]  = useState<any>(null);
  const [bsData,  setBsData]  = useState<any>(null);
  const [glData,  setGlData]  = useState<any>(null);
  const [journals, setJournals] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [journalDetail, setJournalDetail] = useState<any>(null);

  // New journal form
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [jForm, setJForm] = useState({ entry_date: today, description: '', lines: [{ account_id: '', debit_amount: '', credit_amount: '', description: '' }, { account_id: '', debit_amount: '', credit_amount: '', description: '' }] });
  const [jAccounts, setJAccounts] = useState<any[]>([]);

  useEffect(() => {
    api.getSettings?.().then((r: any) => setSchoolName(r?.data?.school_name || 'School')).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'trial-balance') {
        const res: any = await api.getTrialBalance({ dateFrom, dateTo });
        setTbData(res?.data || null);
      } else if (tab === 'balance-sheet') {
        const res: any = await api.getBalanceSheet({ date: bsDate });
        setBsData(res?.data || null);
      } else if (tab === 'general-ledger') {
        const params: any = { dateFrom, dateTo };
        if (glAccount) params.accountId = glAccount;
        const res: any = await api.getGeneralLedger(params);
        setGlData(res?.data || null);
      } else if (tab === 'journals') {
        const params: any = { dateFrom, dateTo };
        if (jStatus) params.status = jStatus;
        const res: any = await api.getJournals(params);
        setJournals(res?.data || []);
        // also fetch accounts for create form
        const acctRes: any = await api.getChartOfAccounts();
        // backend returns the array directly (not wrapped in {data:[...]})
        setJAccounts(Array.isArray(acctRes) ? acctRes : (acctRes?.data || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, dateFrom, dateTo, bsDate, glAccount, jStatus]);

  useEffect(() => { load(); }, [tab]);

  const viewJournal = async (je: any) => {
    setSelectedJournal(je);
    try {
      const res: any = await api.getJournalDetail(je.id);
      setJournalDetail(res?.data || null);
    } catch { /* detail optional — leave unset */ }
  };

  const addJournalLine = () => {
    setJForm(f => ({ ...f, lines: [...f.lines, { account_id: '', debit_amount: '', credit_amount: '', description: '' }] }));
  };

  const removeJournalLine = (i: number) => {
    setJForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  };

  const saveJournal = async () => {
    try {
      const payload = {
        entry_date:  jForm.entry_date,
        description: jForm.description,
        lines: jForm.lines.map(l => ({
          account_id:     l.account_id,
          debit_amount:   Number(l.debit_amount  || 0),
          credit_amount:  Number(l.credit_amount || 0),
          description:    l.description,
        })),
      };
      await api.createJournal(payload);
      setShowJournalForm(false);
      setJForm({ entry_date: today, description: '', lines: [{ account_id: '', debit_amount: '', credit_amount: '', description: '' }, { account_id: '', debit_amount: '', credit_amount: '', description: '' }] });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e.message || 'Failed to save journal');
    }
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'trial-balance',  label: 'Trial Balance',  icon: Scale },
    { id: 'balance-sheet',  label: 'Balance Sheet',  icon: BookOpen },
    { id: 'general-ledger', label: 'General Ledger', icon: List },
    { id: 'journals',       label: 'Journals',       icon: FileEdit },
  ];

  const TYPE_COLORS: Record<string, string> = {
    asset:     'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    equity:    'bg-purple-100 text-purple-800',
    income:    'bg-green-100 text-green-800',
    expense:   'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Finance Reports</h1>
          <p className="text-sm text-gray-500">Trial Balance · Balance Sheet · General Ledger · Journals</p>
        </div>
        <div className="flex gap-2">
          {tab === 'trial-balance' && tbData && (
            <button onClick={() => exportTrialBalancePDF(tbData, dateFrom, dateTo, schoolName)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Download className="h-4 w-4" /> PDF
            </button>
          )}
          {tab === 'balance-sheet' && bsData && (
            <button onClick={() => exportBalanceSheetPDF(bsData, bsDate, schoolName)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Download className="h-4 w-4" /> PDF
            </button>
          )}
          {tab === 'journals' && (
            <button onClick={() => setShowJournalForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Journal Entry
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-gray-50 rounded-xl p-4">
        {tab === 'balance-sheet' ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">As at Date</label>
            <input type="date" value={bsDate} onChange={e => setBsDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
          </div>
        ) : tab === 'journals' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={jStatus} onChange={e => setJStatus(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
                <option value="">All</option>
                <option value="posted">Posted</option>
                <option value="pending">Pending</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            {tab === 'general-ledger' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
                <select value={glAccount} onChange={e => setGlAccount(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm min-w-48">
                  <option value="">— Select Account —</option>
                  {(glData?.accounts || []).map((a: any) => (
                    <option key={a.id} value={a.id}>[{a.account_code}] {a.account_name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <button onClick={load}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Filter className="h-3.5 w-3.5" /> Apply
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* ═══════════ TRIAL BALANCE ═══════════ */}
      {!loading && tab === 'trial-balance' && (
        <div className="space-y-4">
          {!tbData ? (
            <div className="text-center py-12 text-gray-400">No data — apply filters and refresh.</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-blue-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Debits</p>
                  <p className="text-xl font-bold mt-1">{fmt(tbData.totalDebit)}</p>
                </div>
                <div className="bg-green-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Credits</p>
                  <p className="text-xl font-bold mt-1">{fmt(tbData.totalCredit)}</p>
                </div>
                <div className={`rounded-xl p-4 text-white ${Math.abs(tbData.totalDebit - tbData.totalCredit) < 1 ? 'bg-purple-600' : 'bg-red-500'}`}>
                  <p className="text-xs opacity-70 uppercase">{Math.abs(tbData.totalDebit - tbData.totalCredit) < 1 ? 'Balanced' : 'Difference'}</p>
                  <p className="text-xl font-bold mt-1">{fmt(Math.abs(tbData.totalDebit - tbData.totalCredit))}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="text-left px-4 py-3">Account Code</th>
                      <th className="text-left px-4 py-3">Account Name</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-right px-4 py-3">Debit (KES)</th>
                      <th className="text-right px-4 py-3">Credit (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tbData.accounts.map((a: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{a.account_code || '—'}</td>
                        <td className="px-4 py-2.5 font-medium">{a.account_name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[a.account_type] || 'bg-gray-100 text-gray-600'}`}>
                            {a.account_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {a.debit_total > 0 ? fmt(a.debit_total) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {a.credit_total > 0 ? fmt(a.credit_total) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-700">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-bold text-white text-sm">TOTALS</td>
                      <td className="px-4 py-3 text-right font-bold text-white font-mono">{fmt(tbData.totalDebit)}</td>
                      <td className="px-4 py-3 text-right font-bold text-white font-mono">{fmt(tbData.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ BALANCE SHEET ═══════════ */}
      {!loading && tab === 'balance-sheet' && (
        <div className="space-y-4">
          {!bsData ? (
            <div className="text-center py-12 text-gray-400">No data — apply filters and refresh.</div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Assets</p>
                  <p className="text-xl font-bold mt-1">{fmt(bsData.assets.totalAssets)}</p>
                </div>
                <div className="bg-red-500 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Liabilities</p>
                  <p className="text-xl font-bold mt-1">{fmt(bsData.liabilities.totalLiabilities)}</p>
                </div>
                <div className="bg-purple-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Equity (Net Assets)</p>
                  <p className="text-xl font-bold mt-1">{fmt(bsData.equity.totalEquity)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assets */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3 font-semibold text-sm">Current Assets</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {bsData.assets.currentAssets.map((a: any, i: number) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2.5">{a.name}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{fmt(a.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50">
                          <td className="px-4 py-2.5 font-bold text-blue-700">Total Current Assets</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-700 font-mono">{fmt(bsData.assets.totalCurrentAssets)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {bsData.assets.fixedAssets.length > 0 && (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <div className="bg-indigo-600 text-white px-4 py-3 font-semibold text-sm">Fixed Assets</div>
                      <table className="w-full text-sm">
                        <tbody>
                          {bsData.assets.fixedAssets.map((a: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2.5">
                                <p className="font-medium">{a.name}</p>
                                <p className="text-xs text-gray-400">{a.category}</p>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono">{fmt(a.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-50">
                            <td className="px-4 py-2.5 font-bold text-indigo-700">Total Fixed Assets</td>
                            <td className="px-4 py-2.5 text-right font-bold text-indigo-700 font-mono">{fmt(bsData.assets.totalFixedAssets)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  <div className="bg-indigo-700 text-white rounded-xl px-5 py-4 flex justify-between items-center">
                    <span className="font-bold">TOTAL ASSETS</span>
                    <span className="text-xl font-bold font-mono">{fmt(bsData.assets.totalAssets)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="bg-red-600 text-white px-4 py-3 font-semibold text-sm">Liabilities — Accounts Payable</div>
                    {bsData.liabilities.items.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" /> No outstanding liabilities
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {bsData.liabilities.items.map((l: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2.5">{l.name}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-red-700">{fmt(l.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-red-50">
                            <td className="px-4 py-2.5 font-bold text-red-700">Total Liabilities</td>
                            <td className="px-4 py-2.5 text-right font-bold text-red-700 font-mono">{fmt(bsData.liabilities.totalLiabilities)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="bg-purple-600 text-white px-4 py-3 font-semibold text-sm">Equity</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2.5">Retained Earnings / Net Surplus</td>
                          <td className={`px-4 py-2.5 text-right font-mono ${bsData.equity.retainedEarnings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {fmt(bsData.equity.retainedEarnings)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-purple-50">
                          <td className="px-4 py-2.5 font-bold text-purple-700">Total Equity</td>
                          <td className="px-4 py-2.5 text-right font-bold text-purple-700 font-mono">{fmt(bsData.equity.totalEquity)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="bg-gray-700 text-white rounded-xl px-5 py-4">
                    <p className="text-xs opacity-70 mb-1">Accounting Equation: Assets = Liabilities + Equity</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">LIABILITIES + EQUITY</span>
                      <span className="text-xl font-bold font-mono">{fmt(bsData.liabilities.totalLiabilities + bsData.equity.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ GENERAL LEDGER ═══════════ */}
      {!loading && tab === 'general-ledger' && (
        <div className="space-y-4">
          {!glAccount ? (
            <div className="text-center py-12 text-gray-400">
              <List className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Select an account from the filter above to view its ledger.</p>
            </div>
          ) : !glData?.entries?.length ? (
            <div className="text-center py-12 text-gray-400">No transactions for this account in the selected period.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Account</p>
                  <p className="text-lg font-bold mt-1">{glData.account?.account_name}</p>
                  <p className="text-xs opacity-60">[{glData.account?.account_code}] {glData.account?.account_type}</p>
                </div>
                <div className="bg-green-600 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Credits</p>
                  <p className="text-xl font-bold mt-1">{fmt(glData.entries.reduce((s: number, e: any) => s + e.credit, 0))}</p>
                </div>
                <div className="bg-orange-500 text-white rounded-xl p-4">
                  <p className="text-xs opacity-70 uppercase">Total Debits</p>
                  <p className="text-xl font-bold mt-1">{fmt(glData.entries.reduce((s: number, e: any) => s + e.debit, 0))}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Reference</th>
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-right px-4 py-3">Debit</th>
                      <th className="text-right px-4 py-3">Credit</th>
                      <th className="text-right px-4 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {glData.entries.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500">{new Date(e.txn_date).toLocaleDateString('en-KE')}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{e.ref}</td>
                        <td className="px-4 py-2.5">{e.description || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[e.txn_type] || 'bg-gray-100 text-gray-600'}`}>
                            {e.txn_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{e.debit > 0 ? fmt(e.debit) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{e.credit > 0 ? fmt(e.credit) : '—'}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-semibold ${e.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(e.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 font-bold">Closing Balance</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono text-lg ${glData.closingBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(glData.closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ JOURNALS ═══════════ */}
      {!loading && tab === 'journals' && (
        <div className="space-y-4">
          {/* New Journal Form */}
          {showJournalForm && (
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">New Manual Journal Entry</h3>
                <button onClick={() => setShowJournalForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entry Date</label>
                  <input type="date" value={jForm.entry_date} onChange={e => setJForm(f => ({ ...f, entry_date: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description / Narration</label>
                  <input type="text" value={jForm.description} onChange={e => setJForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Correction of prior period entry"
                    className="w-full border rounded-md px-3 py-1.5 text-sm" />
                </div>
              </div>

              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs">
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Debit (KES)</th>
                    <th className="text-right px-3 py-2">Credit (KES)</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {jForm.lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1.5">
                        <select value={line.account_id} onChange={e => setJForm(f => { const ls = [...f.lines]; ls[i] = { ...ls[i], account_id: e.target.value }; return { ...f, lines: ls }; })}
                          className="w-full border rounded px-2 py-1 text-xs">
                          <option value="">— Select —</option>
                          {jAccounts.map((a: any) => <option key={a.id} value={a.id}>[{a.account_code}] {a.account_name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={line.description} onChange={e => setJForm(f => { const ls = [...f.lines]; ls[i] = { ...ls[i], description: e.target.value }; return { ...f, lines: ls }; })}
                          className="w-full border rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={line.debit_amount} onChange={e => setJForm(f => { const ls = [...f.lines]; ls[i] = { ...ls[i], debit_amount: e.target.value }; return { ...f, lines: ls }; })}
                          className="w-full border rounded px-2 py-1 text-xs text-right" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={line.credit_amount} onChange={e => setJForm(f => { const ls = [...f.lines]; ls[i] = { ...ls[i], credit_amount: e.target.value }; return { ...f, lines: ls }; })}
                          className="w-full border rounded px-2 py-1 text-xs text-right" />
                      </td>
                      <td className="px-2 py-1.5">
                        {jForm.lines.length > 2 && (
                          <button onClick={() => removeJournalLine(i)} className="text-red-500 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-xs">
                    <td colSpan={2} className="px-3 py-2 text-gray-600">Totals</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {fmt(jForm.lines.reduce((s, l) => s + Number(l.debit_amount || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {fmt(jForm.lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              {(() => {
                const td = jForm.lines.reduce((s, l) => s + Number(l.debit_amount  || 0), 0);
                const tc = jForm.lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
                const diff = Math.abs(td - tc);
                return diff > 0.01 ? (
                  <div className="flex items-center gap-2 text-red-600 text-xs mb-3">
                    <AlertTriangle className="h-3.5 w-3.5" /> Journal is out of balance by {fmt(diff)} — debits must equal credits
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 text-xs mb-3">
                    <CheckCircle className="h-3.5 w-3.5" /> Journal balances
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button onClick={addJournalLine} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Line
                </button>
                <div className="flex-1" />
                <button onClick={() => setShowJournalForm(false)} className="px-4 py-1.5 text-sm border rounded-md">Cancel</button>
                <button onClick={saveJournal} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Post Journal</button>
              </div>
            </div>
          )}

          {/* Journal Detail Modal */}
          {selectedJournal && journalDetail && (
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Journal #{journalDetail.entry_number}</h3>
                <button onClick={() => { setSelectedJournal(null); setJournalDetail(null); }}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                <div><span className="text-gray-500">Date: </span>{new Date(journalDetail.entry_date).toLocaleDateString('en-KE')}</div>
                <div><span className="text-gray-500">Status: </span><span className="capitalize">{journalDetail.status}</span></div>
                <div className="sm:col-span-2"><span className="text-gray-500">Narration: </span>{journalDetail.description}</div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="text-left px-4 py-2">Account</th>
                    <th className="text-left px-4 py-2">Description</th>
                    <th className="text-right px-4 py-2">Debit (KES)</th>
                    <th className="text-right px-4 py-2">Credit (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(journalDetail.lines || []).map((l: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-medium">{l.account_name || '—'}</p>
                        <p className="text-xs text-gray-400">[{l.account_code}]</p>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{l.description || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{Number(l.debit_amount) > 0 ? fmt(l.debit_amount) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{Number(l.credit_amount) > 0 ? fmt(l.credit_amount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-bold">TOTALS</td>
                    <td className="px-4 py-2 text-right font-bold font-mono">{fmt(journalDetail.total_debit)}</td>
                    <td className="px-4 py-2 text-right font-bold font-mono">{fmt(journalDetail.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Journals list */}
          {journals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileEdit className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No journal entries found for this period.</p>
              <p className="text-sm mt-1">Manual entries and auto-generated entries will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="text-left px-4 py-3">Entry #</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Debit</th>
                    <th className="text-right px-4 py-3">Credit</th>
                    <th className="text-center px-4 py-3">Lines</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {journals.map((j: any) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{j.entry_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{new Date(j.entry_date).toLocaleDateString('en-KE')}</td>
                      <td className="px-4 py-2.5 font-medium">{j.description}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${j.status === 'posted' ? 'bg-green-100 text-green-700' : j.status === 'reversed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(j.total_debit)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(j.total_credit)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{j.line_count}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => viewJournal(j)} className="text-xs text-blue-600 hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedReports;
