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
  CheckCircle, Clock, Printer, ChevronLeft, Edit2, Trash2
} from 'lucide-react';

type Tab = 'structures' | 'assignments' | 'runs' | 'payslips';

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

  useEffect(() => { loadTab(); }, [tab]);

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

  const TABS = [
    { key: 'structures' as Tab, label: 'Salary Structures', icon: DollarSign },
    { key: 'assignments' as Tab, label: 'Staff Assignments', icon: Users },
    { key: 'runs' as Tab, label: 'Payroll Runs', icon: FileText },
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
