import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  DollarSign, Users, FileText, CreditCard, Plus, RefreshCw,
  CheckCircle, Clock, Printer, ChevronLeft, Edit2, Trash2, ClipboardList, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';

type Tab = 'structures' | 'assignments' | 'runs' | 'payslips' | 'p9';

const RUN_STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-800',
  paid:     'bg-green-100 text-green-800',
};

const EMPTY_STRUCTURE = {
  name: '', basic_salary: '', house_allowance: '', transport_allowance: '',
  medical_allowance: '', other_allowances: '', nssf_rate: '6', nhif_amount: '500',
};

export function PayrollPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin', 'finance_officer'].includes(user?.role);

  const [tab, setTab] = useState<Tab>('structures');
  const [loading, setLoading] = useState(false);

  // Structures
  const [structures, setStructures] = useState<any[]>([]);
  const [showStructForm, setShowStructForm] = useState(false);
  const [editingStruct, setEditingStruct] = useState<any>(null);
  const [structForm, setStructForm] = useState({ ...EMPTY_STRUCTURE });

  // Assignments
  const [staff, setStaff] = useState<any[]>([]);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});

  // Payroll runs
  const [runs, setRuns] = useState<any[]>([]);
  const [showRunForm, setShowRunForm] = useState(false);
  const [runForm, setRunForm] = useState({ year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString() });

  // Payslips
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);

  // P9 Forms
  const [p9Year, setP9Year]           = useState(new Date().getFullYear().toString());
  const [p9Employees, setP9Employees] = useState<any[]>([]);
  const [p9UserId, setP9UserId]       = useState('');
  const [p9Data, setP9Data]           = useState<any>(null);
  const [p9Loading, setP9Loading]     = useState(false);
  const [schoolName, setSchoolName]   = useState('School');

  useEffect(() => { loadTab(); }, [tab]);

  // Load school name once
  useEffect(() => {
    (api as any).getSettings?.().then((r: any) => setSchoolName(r?.data?.school_name || 'School')).catch(() => {});
  }, []);

  // Load P9 employees whenever p9Year changes (and tab is p9)
  useEffect(() => {
    if (tab !== 'p9') return;
    setP9Loading(true);
    (api as any).getP9Employees({ year: p9Year })
      .then((r: any) => setP9Employees(r?.data || []))
      .catch(() => {})
      .finally(() => setP9Loading(false));
  }, [p9Year, tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === 'structures') {
        const res: any = await (api as any).getSalaryStructures();
        setStructures(res?.data || []);
      }
      if (tab === 'assignments') {
        const [sRes, structRes]: any[] = await Promise.all([
          (api as any).getStaffAssignments(),
          (api as any).getSalaryStructures(),
        ]);
        const staffList = sRes?.data || [];
        setStaff(staffList);
        const map: Record<string, string> = {};
        staffList.forEach((s: any) => { map[s.id] = s.salary_structure_id || ''; });
        setAssignMap(map);
        setStructures(structRes?.data || []);
      }
      if (tab === 'runs') {
        const res: any = await (api as any).getPayrollRuns();
        setRuns(res?.data || []);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const saveStructure = async () => {
    try {
      if (editingStruct) {
        await (api as any).updateSalaryStructure(editingStruct.id, structForm);
        toast({ title: 'Structure updated' });
      } else {
        await (api as any).createSalaryStructure(structForm);
        toast({ title: 'Structure created' });
      }
      setShowStructForm(false);
      setEditingStruct(null);
      setStructForm({ ...EMPTY_STRUCTURE });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const assignStructure = async (userId: string) => {
    try {
      await (api as any).assignSalaryStructure(userId, { salary_structure_id: assignMap[userId] });
      toast({ title: 'Structure assigned' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createRun = async () => {
    try {
      await (api as any).createPayrollRun(runForm);
      toast({ title: 'Payroll run created' });
      setShowRunForm(false);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const runAction = async (id: string, action: 'process' | 'approve' | 'paid') => {
    try {
      if (action === 'process') await (api as any).processPayrollRun(id);
      if (action === 'approve') await (api as any).approvePayrollRun(id);
      if (action === 'paid')    await (api as any).markPayrollPaid(id);
      toast({ title: 'Done' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const viewPayslips = async (run: any) => {
    setSelectedRun(run);
    setTab('payslips');
    setLoading(true);
    try {
      const res: any = await (api as any).getRunPayslips(run.id);
      setPayslips(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const printPayslip = (p: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Payslip</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:auto}
      h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}
      td,th{padding:8px;border:1px solid #ddd;text-align:left}th{background:#f5f5f5}
      .total{font-weight:bold}</style></head><body>
      <h2>PAYSLIP — ${selectedRun?.month}/${selectedRun?.year}</h2>
      <p><strong>Employee:</strong> ${p.employee_name || p.name}</p>
      <p><strong>Period:</strong> ${selectedRun?.month}/${selectedRun?.year}</p>
      <table>
        <tr><th>Item</th><th>Amount (KES)</th></tr>
        <tr><td>Basic Salary</td><td>${Number(p.basic_salary||0).toLocaleString()}</td></tr>
        <tr><td>Allowances</td><td>${Number(p.total_allowances||0).toLocaleString()}</td></tr>
        <tr class="total"><td>Gross Pay</td><td>${Number(p.gross_pay||0).toLocaleString()}</td></tr>
        <tr><td>NSSF</td><td>${Number(p.nssf_deduction||0).toLocaleString()}</td></tr>
        <tr><td>NHIF</td><td>${Number(p.nhif_deduction||0).toLocaleString()}</td></tr>
        <tr><td>PAYE</td><td>${Number(p.paye||0).toLocaleString()}</td></tr>
        <tr class="total"><td>Total Deductions</td><td>${Number(p.total_deductions||0).toLocaleString()}</td></tr>
        <tr class="total"><td>Net Pay</td><td>${Number(p.net_pay||0).toLocaleString()}</td></tr>
      </table>
      <p style="margin-top:40px;text-align:center">Generated ${new Date().toLocaleDateString()}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const loadP9 = async () => {
    if (!p9UserId) return;
    setP9Loading(true);
    try {
      const res: any = await (api as any).getP9Form({ year: p9Year, userId: p9UserId });
      setP9Data(res?.data || null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setP9Loading(false); }
  };

  const printP9 = () => {
    if (!p9Data) return;
    const emp   = p9Data.employee;
    const lines = p9Data.lines;
    const tots  = p9Data.totals;
    const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw    = doc.internal.pageSize.getWidth();
    let y = 10;

    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pw, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pw / 2, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text('P9 FORM — EMPLOYEE TAX DEDUCTION CARD', pw / 2, 18, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Year of Income: ${p9Data.year}`, pw / 2, 24, { align: 'center' });
    y = 32;
    doc.setTextColor(30, 30, 30);

    // Employee details
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE DETAILS', 10, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`Name: ${emp.full_name}`, 10, y);
    doc.text(`Email: ${emp.email}`, 90, y);
    doc.text(`Role: ${emp.role}`, 160, y);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, pw - 10, y); y += 4;

    // Table header
    const cols = { month: 10, gross: 42, nssf: 72, chargeable: 102, paye: 135, nhif: 162, net: pw - 10 };
    doc.setFillColor(30, 58, 138);
    doc.rect(10, y, pw - 20, 6, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Month', cols.month + 1, y + 4);
    doc.text('Gross Pay', cols.gross, y + 4, { align: 'right' });
    doc.text('NSSF', cols.nssf, y + 4, { align: 'right' });
    doc.text('Chargeable Pay', cols.chargeable, y + 4, { align: 'right' });
    doc.text('PAYE Tax', cols.paye, y + 4, { align: 'right' });
    doc.text('NHIF', cols.nhif, y + 4, { align: 'right' });
    doc.text('Net Pay', cols.net, y + 4, { align: 'right' });
    y += 6;
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');

    let rowBg = false;
    for (const l of lines) {
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(10, y, pw - 20, 6, 'F'); }
      doc.text(l.month, cols.month + 1, y + 4);
      if (l.gross > 0) {
        doc.text(l.gross.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.gross, y + 4, { align: 'right' });
        doc.text(l.nssf.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.nssf, y + 4, { align: 'right' });
        doc.text(l.chargeablePay.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.chargeable, y + 4, { align: 'right' });
        doc.text(l.paye.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.paye, y + 4, { align: 'right' });
        doc.text(l.nhif.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.nhif, y + 4, { align: 'right' });
        doc.text(l.net.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.net, y + 4, { align: 'right' });
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text('—', cols.gross, y + 4, { align: 'right' });
        doc.text('—', cols.nssf, y + 4, { align: 'right' });
        doc.text('—', cols.chargeable, y + 4, { align: 'right' });
        doc.text('—', cols.paye, y + 4, { align: 'right' });
        doc.text('—', cols.nhif, y + 4, { align: 'right' });
        doc.text('—', cols.net, y + 4, { align: 'right' });
        doc.setTextColor(30, 30, 30);
      }
      y += 6; rowBg = !rowBg;
    }

    // Totals row
    doc.setFillColor(30, 58, 138); doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text('TOTALS', cols.month + 1, y + 5);
    doc.text(tots.gross.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.gross, y + 5, { align: 'right' });
    doc.text(tots.nssf.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.nssf, y + 5, { align: 'right' });
    doc.text(tots.chargeablePay.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.chargeable, y + 5, { align: 'right' });
    doc.text(tots.paye.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.paye, y + 5, { align: 'right' });
    doc.text(tots.nhif.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.nhif, y + 5, { align: 'right' });
    doc.text(tots.net.toLocaleString('en-KE', { minimumFractionDigits: 2 }), cols.net, y + 5, { align: 'right' });
    y += 12;

    // Signature area
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Employer Signature: _________________________', 10, y);
    doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, 145, y);
    y += 8;
    doc.text('This form should be issued to the employee by 28th February each year.', 10, y);

    doc.save(`P9-${emp.full_name.replace(/\s+/g, '-')}-${p9Data.year}.pdf`);
  };

  const TABS = [
    { key: 'structures' as Tab, label: 'Salary Structures', icon: DollarSign },
    { key: 'assignments' as Tab, label: 'Staff Assignments', icon: Users },
    { key: 'runs' as Tab, label: 'Payroll Runs', icon: FileText },
    { key: 'p9' as Tab, label: 'P9 Forms', icon: ClipboardList },
  ];

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-gray-400">
        Payroll management is only available to admin and finance officers.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage salary structures, payroll runs and payslips</p>
      </div>

      {/* Tabs */}
      {tab !== 'payslips' && (
        <div className="flex gap-2 border-b">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* STRUCTURES */}
      {!loading && tab === 'structures' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Salary Structures</h2>
            <Button onClick={() => { setShowStructForm(true); setEditingStruct(null); setStructForm({ ...EMPTY_STRUCTURE }); }}>
              <Plus className="h-4 w-4 mr-2" /> New Structure
            </Button>
          </div>

          {showStructForm && (
            <Card><CardContent className="pt-6">
              <h3 className="font-medium mb-4">{editingStruct ? 'Edit' : 'New'} Salary Structure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Structure Name</Label>
                  <Input className="mt-1" placeholder="e.g. Teacher Grade B" value={structForm.name}
                    onChange={e => setStructForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Basic Salary (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.basic_salary}
                    onChange={e => setStructForm(f => ({ ...f, basic_salary: e.target.value }))} />
                </div>
                <div>
                  <Label>House Allowance (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.house_allowance}
                    onChange={e => setStructForm(f => ({ ...f, house_allowance: e.target.value }))} />
                </div>
                <div>
                  <Label>Transport Allowance (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.transport_allowance}
                    onChange={e => setStructForm(f => ({ ...f, transport_allowance: e.target.value }))} />
                </div>
                <div>
                  <Label>Medical Allowance (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.medical_allowance}
                    onChange={e => setStructForm(f => ({ ...f, medical_allowance: e.target.value }))} />
                </div>
                <div>
                  <Label>Other Allowances (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.other_allowances}
                    onChange={e => setStructForm(f => ({ ...f, other_allowances: e.target.value }))} />
                </div>
                <div>
                  <Label>NSSF Rate (%)</Label>
                  <Input type="number" className="mt-1" value={structForm.nssf_rate}
                    onChange={e => setStructForm(f => ({ ...f, nssf_rate: e.target.value }))} />
                </div>
                <div>
                  <Label>NHIF Amount (KES)</Label>
                  <Input type="number" className="mt-1" value={structForm.nhif_amount}
                    onChange={e => setStructForm(f => ({ ...f, nhif_amount: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveStructure}>Save</Button>
                <Button variant="outline" onClick={() => { setShowStructForm(false); setEditingStruct(null); }}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {structures.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No salary structures defined</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Name</th>
                    <th className="text-right py-3 pr-4">Basic (KES)</th>
                    <th className="text-right py-3 pr-4">Allowances (KES)</th>
                    <th className="text-right py-3 pr-4">NSSF %</th>
                    <th className="text-right py-3 pr-4">NHIF (KES)</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{s.name}</td>
                      <td className="py-3 pr-4 text-right">{Number(s.basic_salary||0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right">
                        {(Number(s.house_allowance||0)+Number(s.transport_allowance||0)+
                          Number(s.medical_allowance||0)+Number(s.other_allowances||0)).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right">{s.nssf_rate}%</td>
                      <td className="py-3 pr-4 text-right">{Number(s.nhif_amount||0).toLocaleString()}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => { setEditingStruct(s); setStructForm({ ...s }); setShowStructForm(true); }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSIGNMENTS */}
      {!loading && tab === 'assignments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Staff Salary Assignments</h2>
          {staff.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No active staff found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Staff Name</th>
                    <th className="text-left py-3 pr-4">Role</th>
                    <th className="text-left py-3 pr-4">Current Structure</th>
                    <th className="text-left py-3 pr-4">Assign Structure</th>
                    <th className="text-left py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{s.name || s.full_name}</td>
                      <td className="py-3 pr-4 capitalize">{s.role}</td>
                      <td className="py-3 pr-4 text-gray-500">{s.structure_name || '—'}</td>
                      <td className="py-3 pr-4">
                        <select className="border rounded px-2 py-1 text-sm"
                          value={assignMap[s.id] || ''}
                          onChange={e => setAssignMap(m => ({ ...m, [s.id]: e.target.value }))}>
                          <option value="">None</option>
                          {structures.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3">
                        <Button size="sm" onClick={() => assignStructure(s.id)}>Save</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYROLL RUNS */}
      {!loading && tab === 'runs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Payroll Runs</h2>
            <Button onClick={() => setShowRunForm(!showRunForm)}>
              <Plus className="h-4 w-4 mr-2" /> New Payroll Run
            </Button>
          </div>

          {showRunForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <Label>Year</Label>
                  <Input className="mt-1" value={runForm.year}
                    onChange={e => setRunForm(f => ({ ...f, year: e.target.value }))} />
                </div>
                <div>
                  <Label>Month (1–12)</Label>
                  <Input type="number" min={1} max={12} className="mt-1" value={runForm.month}
                    onChange={e => setRunForm(f => ({ ...f, month: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createRun}>Create Run</Button>
                <Button variant="outline" onClick={() => setShowRunForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {runs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No payroll runs yet</div>
          ) : (
            <div className="space-y-3">
              {runs.map(r => (
                <Card key={r.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-lg">
                          {new Date(r.year, r.month - 1).toLocaleString('default', { month: 'long' })} {r.year}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Gross: KES {Number(r.total_gross||0).toLocaleString()} &nbsp;|&nbsp;
                          Net: KES {Number(r.total_net||0).toLocaleString()}
                        </div>
                      </div>
                      <Badge className={RUN_STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {r.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => runAction(r.id, 'process')}>
                          Process
                        </Button>
                      )}
                      {r.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => runAction(r.id, 'approve')}>
                          Approve
                        </Button>
                      )}
                      {r.status === 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => runAction(r.id, 'paid')}>
                          <CreditCard className="h-3 w-3 mr-1" /> Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => viewPayslips(r)}>
                        <FileText className="h-3 w-3 mr-1" /> View Payslips
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* P9 FORMS */}
      {!loading && tab === 'p9' && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            The <strong>P9 Form</strong> is the KRA Annual Employee Tax Deduction Card. It summarises each employee's monthly gross pay, NSSF deductions, chargeable pay, and PAYE tax for the income year. Issue to employees by 28th February each year.
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end bg-gray-50 rounded-xl p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year of Income</label>
              <select value={p9Year} onChange={e => { setP9Year(e.target.value); setP9UserId(''); setP9Data(null); }}
                className="border rounded-md px-3 py-1.5 text-sm">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              {p9Loading && !p9Employees.length ? (
                <div className="text-xs text-gray-400 py-1.5 px-3">Loading...</div>
              ) : (
                <select value={p9UserId} onChange={e => { setP9UserId(e.target.value); setP9Data(null); }}
                  className="border rounded-md px-3 py-1.5 text-sm min-w-56">
                  <option value="">— Select Employee —</option>
                  {p9Employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name} ({e.role})</option>)}
                </select>
              )}
            </div>
            <Button onClick={loadP9} disabled={!p9UserId || p9Loading}>
              {p9Loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Load P9
            </Button>
            {p9Data && (
              <Button variant="outline" onClick={printP9} className="flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            )}
          </div>

          {p9Employees.length === 0 && !p9Loading && (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No employees with paid payroll runs for {p9Year}.</p>
              <p className="text-sm mt-1">Process and mark payroll runs as paid to generate P9 forms.</p>
            </div>
          )}

          {p9Data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>P9 Form — {p9Data.employee.full_name} · Year {p9Data.year}</span>
                  <Badge className="bg-blue-100 text-blue-800">{p9Data.employee.role}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        <th className="text-left px-4 py-2.5">Month</th>
                        <th className="text-right px-4 py-2.5">Gross Pay (KES)</th>
                        <th className="text-right px-4 py-2.5">NSSF Deduction</th>
                        <th className="text-right px-4 py-2.5">Chargeable Pay</th>
                        <th className="text-right px-4 py-2.5">PAYE Tax</th>
                        <th className="text-right px-4 py-2.5">NHIF</th>
                        <th className="text-right px-4 py-2.5">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p9Data.lines.map((l: any) => (
                        <tr key={l.monthNum} className={`border-b ${l.gross === 0 ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50'}`}>
                          <td className="px-4 py-2">{l.month}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.gross > 0 ? l.gross.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.gross > 0 ? l.nssf.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.gross > 0 ? l.chargeablePay.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono text-red-700">{l.gross > 0 ? l.paye.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.gross > 0 ? l.nhif.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono text-green-700 font-semibold">{l.gross > 0 ? l.net.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-700 text-white font-bold">
                      <tr>
                        <td className="px-4 py-3">TOTALS</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.gross.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.nssf.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.chargeablePay.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.paye.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.nhif.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-mono">{p9Data.totals.net.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Annual Gross', value: p9Data.totals.gross, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Total PAYE', value: p9Data.totals.paye, color: 'bg-red-50 text-red-700' },
                    { label: 'Total NSSF', value: p9Data.totals.nssf, color: 'bg-orange-50 text-orange-700' },
                    { label: 'Annual Net', value: p9Data.totals.net, color: 'bg-green-50 text-green-700' },
                  ].map(card => (
                    <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
                      <p className="text-xs font-medium opacity-70">{card.label}</p>
                      <p className="text-lg font-bold mt-1">KES {card.value.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PAYSLIPS */}
      {tab === 'payslips' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setTab('runs'); setSelectedRun(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Runs
            </Button>
            <h2 className="text-lg font-semibold">
              Payslips — {selectedRun && `${new Date(selectedRun.year, selectedRun.month - 1).toLocaleString('default', { month: 'long' })} ${selectedRun.year}`}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No payslips for this run</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Employee</th>
                    <th className="text-right py-3 pr-4">Basic (KES)</th>
                    <th className="text-right py-3 pr-4">Gross (KES)</th>
                    <th className="text-right py-3 pr-4">Deductions (KES)</th>
                    <th className="text-right py-3 pr-4">Net (KES)</th>
                    <th className="text-left py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{p.employee_name || p.name}</td>
                      <td className="py-3 pr-4 text-right">{Number(p.basic_salary||0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right">{Number(p.gross_pay||0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right">{Number(p.total_deductions||0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-green-700">
                        {Number(p.net_pay||0).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <Button size="sm" variant="outline" onClick={() => printPayslip(p)}>
                          <Printer className="h-3 w-3 mr-1" /> Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-gray-50">
                    <td className="py-3 pr-4">TOTALS</td>
                    <td className="py-3 pr-4 text-right">
                      {payslips.reduce((s,p) => s + Number(p.basic_salary||0), 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {payslips.reduce((s,p) => s + Number(p.gross_pay||0), 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {payslips.reduce((s,p) => s + Number(p.total_deductions||0), 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right text-green-700">
                      {payslips.reduce((s,p) => s + Number(p.net_pay||0), 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
