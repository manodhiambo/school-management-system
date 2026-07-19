import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import procurementService from '@/services/procurementService';
import {
  Wrench, Plus, RefreshCw, MapPin, BarChart2, ListChecks,
} from 'lucide-react';

type Tab = 'requests' | 'schedules' | 'reports';
type ReportView = 'pending' | 'completed' | 'cost-by-asset' | 'technician-performance' | 'trends';

const CATEGORIES = ['electrical', 'plumbing', 'carpentry', 'ict', 'civil_works', 'painting', 'vehicles', 'furniture', 'grounds', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'emergency'];

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-600',
};
const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700', under_review: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-indigo-100 text-indigo-800',
  inspection: 'bg-purple-100 text-purple-800', completed: 'bg-green-100 text-green-700',
  verified: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-500',
};

const EMPTY_FORM = { category: 'electrical', priority: 'medium', title: '', description: '', location: '', asset_id: '' };

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label.replace(/_/g, ' ')}</span>;
}

export function MaintenanceRequestsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isOffice = ['admin', 'superadmin'].includes(user?.role || '');

  const [tab, setTab] = useState<Tab>('requests');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTechId, setAssignTechId] = useState('');

  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ title: '', category: 'electrical', frequency: 'monthly', next_due_date: '', notes: '' });

  const [reportView, setReportView] = useState<ReportView>('pending');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => { loadRequests(); if (isOffice) loadSupportData(); }, []);
  useEffect(() => { loadRequests(); }, [statusFilter]);
  useEffect(() => { if (tab === 'schedules') loadSchedules(); if (tab === 'reports') loadReport(); }, [tab, reportView]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getMaintenanceRequests(statusFilter ? { status: statusFilter } : undefined);
      setRequests(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadSupportData = async () => {
    try {
      const res: any = await (api as any).getUsers();
      const users = res?.data || res || [];
      setTechnicians(users.filter((u: any) => u.role === 'technician'));
    } catch { /* non-critical */ }
    try {
      const res: any = await procurementService.getAssets();
      setAssets(res?.data || res || []);
    } catch { /* procurement assets optional */ }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getMaintenanceSchedules();
      setSchedules(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const map: Record<ReportView, () => Promise<any>> = {
        pending: () => (api as any).getMaintenancePendingReport(),
        completed: () => (api as any).getMaintenanceCompletedReport(),
        'cost-by-asset': () => (api as any).getMaintenanceCostByAssetReport(),
        'technician-performance': () => (api as any).getMaintenanceTechnicianPerformanceReport(),
        trends: () => (api as any).getMaintenanceTrendsReport(),
      };
      const res: any = await map[reportView]();
      setReportData(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const submitRequest = async () => {
    try {
      await (api as any).createMaintenanceRequest({ ...form, asset_id: form.asset_id || undefined });
      toast({ title: 'Request submitted' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      loadRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const assign = async (id: string) => {
    if (!assignTechId) return;
    try {
      await (api as any).assignMaintenanceRequest(id, assignTechId);
      toast({ title: 'Technician assigned' });
      setAssigningId(null);
      setAssignTechId('');
      loadRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const inspect = async (id: string, passed: boolean) => {
    try {
      await (api as any).inspectMaintenanceRequest(id, { passed });
      toast({ title: passed ? 'Marked completed' : 'Sent back for rework' });
      loadRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const verify = async (id: string) => {
    try {
      await (api as any).verifyMaintenanceRequest(id);
      toast({ title: 'Request verified and closed' });
      loadRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Reason for rejecting this request:');
    if (reason == null) return;
    try {
      await (api as any).rejectMaintenanceRequest(id, reason);
      toast({ title: 'Request rejected' });
      loadRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createSchedule = async () => {
    try {
      await (api as any).createMaintenanceSchedule(scheduleForm);
      toast({ title: 'Schedule created' });
      setShowScheduleForm(false);
      setScheduleForm({ title: '', category: 'electrical', frequency: 'monthly', next_due_date: '', notes: '' });
      loadSchedules();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const TABS = isOffice
    ? [{ key: 'requests' as Tab, label: 'Requests', icon: Wrench }, { key: 'schedules' as Tab, label: 'Preventive Schedule', icon: ListChecks }, { key: 'reports' as Tab, label: 'Reports', icon: BarChart2 }]
    : [{ key: 'requests' as Tab, label: 'My Requests', icon: Wrench }];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-orange-600" /> Maintenance {isOffice ? 'Management' : 'Requests'}</h1>
          <p className="text-sm text-gray-500 mt-1">{isOffice ? 'Track, assign and verify repair jobs' : 'Submit and track your maintenance requests'}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" /> Submit Request</Button>
      </div>

      {showForm && (
        <Card><CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary of the issue" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Room 4B, Borehole Room" />
            </div>
            {assets.length > 0 && (
              <div>
                <Label>Related Asset (optional)</Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}>
                  <option value="">None</option>
                  {assets.map((a: any) => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_tag})</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={submitRequest} disabled={!form.title}>Submit</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {TABS.length > 1 && (
        <div className="flex gap-2 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          {isOffice && (
            <div className="flex gap-2 flex-wrap">
              {['', 'submitted', 'assigned', 'in_progress', 'inspection', 'completed', 'verified', 'rejected'].map(s => (
                <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s ? s.replace('_', ' ') : 'All'}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No maintenance requests</div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge label={r.priority} color={PRIORITY_COLORS[r.priority]} />
                          <Badge label={r.status} color={STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'} />
                          <span className="text-xs text-gray-400 font-mono">{r.request_number}</span>
                        </div>
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="text-xs text-gray-500 capitalize">{r.category.replace('_', ' ')}</p>
                        {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                        {r.location && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {r.location}</p>}
                        {r.technician_name && <p className="text-xs text-gray-500 mt-1">Technician: {r.technician_name}</p>}
                        {r.repair_cost != null && <p className="text-xs text-gray-500">Repair cost: KES {Number(r.repair_cost).toLocaleString()}</p>}
                        {r.requested_by_name && <p className="text-xs text-gray-400 mt-1">Requested by {r.requested_by_name}</p>}
                      </div>
                    </div>

                    {isOffice && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {['submitted', 'under_review'].includes(r.status) && (
                          <>
                            {assigningId === r.id ? (
                              <div className="flex items-center gap-2">
                                <select className="border rounded px-2 py-1 text-xs" value={assignTechId} onChange={e => setAssignTechId(e.target.value)}>
                                  <option value="">Select technician...</option>
                                  {technicians.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                </select>
                                <Button size="sm" onClick={() => assign(r.id)} disabled={!assignTechId}>Go</Button>
                                <Button size="sm" variant="outline" onClick={() => setAssigningId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => setAssigningId(r.id)}>Assign Technician</Button>
                            )}
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => reject(r.id)}>Reject</Button>
                          </>
                        )}
                        {r.status === 'inspection' && (
                          <>
                            <Button size="sm" onClick={() => inspect(r.id, true)}>Pass Inspection</Button>
                            <Button size="sm" variant="outline" className="text-orange-600" onClick={() => inspect(r.id, false)}>Send Back</Button>
                          </>
                        )}
                        {r.status === 'completed' && (
                          <Button size="sm" onClick={() => verify(r.id)}>Verify & Close</Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'schedules' && isOffice && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Preventive Maintenance Schedule</h2>
            <Button size="sm" onClick={() => setShowScheduleForm(!showScheduleForm)}><Plus className="h-4 w-4 mr-1" /> Add Schedule</Button>
          </div>
          {showScheduleForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Title</Label><Input value={scheduleForm.title} onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div>
                  <Label>Category</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={scheduleForm.category} onChange={e => setScheduleForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={scheduleForm.frequency} onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option><option value="annually">Annually</option>
                  </select>
                </div>
                <div><Label>Next Due Date</Label><Input type="date" value={scheduleForm.next_due_date} onChange={e => setScheduleForm(f => ({ ...f, next_due_date: e.target.value }))} /></div>
                <div className="sm:col-span-2"><Label>Notes</Label><Input value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createSchedule}>Save</Button>
                <Button variant="outline" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}
          {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div> : schedules.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No preventive maintenance schedules yet</div>
          ) : (
            <div className="space-y-2">
              {schedules.map(s => (
                <Card key={s.id}><CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-gray-500 capitalize">{s.category?.replace('_', ' ')} · {s.frequency} · Next due {s.next_due_date?.slice(0, 10)}</div>
                  </div>
                  {!s.is_active && <Badge label="inactive" color="bg-gray-100 text-gray-500" />}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && isOffice && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['pending', 'completed', 'cost-by-asset', 'technician-performance', 'trends'] as ReportView[]).map(v => (
              <button key={v} onClick={() => setReportView(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${reportView === v ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {v.replace(/-/g, ' ')}
              </button>
            ))}
          </div>

          {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div> : (
            <>
              {(reportView === 'pending' || reportView === 'completed') && (
                <div className="space-y-2">
                  {(reportData || []).length === 0 ? <p className="text-gray-400 text-sm">No jobs found.</p> : (reportData || []).map((r: any) => (
                    <Card key={r.id}><CardContent className="py-3 flex items-center justify-between text-sm">
                      <span>{r.request_number} — {r.title}</span>
                      <Badge label={r.status} color={STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'} />
                    </CardContent></Card>
                  ))}
                </div>
              )}
              {reportView === 'cost-by-asset' && (
                <Card><CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Asset</th><th className="px-4 py-2">Jobs</th><th className="px-4 py-2">Total Cost</th></tr></thead>
                    <tbody>
                      {(reportData || []).length === 0 ? <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No cost data yet.</td></tr> : (reportData || []).map((a: any) => (
                        <tr key={a.asset_id} className="border-b"><td className="px-4 py-2">{a.asset_name} ({a.asset_tag})</td><td className="px-4 py-2">{a.job_count}</td><td className="px-4 py-2">KES {Number(a.total_cost).toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent></Card>
              )}
              {reportView === 'technician-performance' && (
                <Card><CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Technician</th><th className="px-4 py-2">Completed</th><th className="px-4 py-2">Open</th><th className="px-4 py-2">Avg Hours</th></tr></thead>
                    <tbody>
                      {(reportData || []).length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No technicians yet.</td></tr> : (reportData || []).map((t: any) => (
                        <tr key={t.technician_id} className="border-b"><td className="px-4 py-2">{t.technician_name}</td><td className="px-4 py-2">{t.jobs_completed}</td><td className="px-4 py-2">{t.jobs_open}</td><td className="px-4 py-2">{t.avg_hours_to_complete ? Number(t.avg_hours_to_complete).toFixed(1) : '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent></Card>
              )}
              {reportView === 'trends' && (
                <Card><CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Month</th><th className="px-4 py-2">Category</th><th className="px-4 py-2">Requests</th><th className="px-4 py-2">Cost</th></tr></thead>
                    <tbody>
                      {(reportData || []).length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No trend data yet.</td></tr> : (reportData || []).map((t: any, i: number) => (
                        <tr key={i} className="border-b"><td className="px-4 py-2">{t.month?.slice(0, 7)}</td><td className="px-4 py-2 capitalize">{t.category?.replace('_', ' ')}</td><td className="px-4 py-2">{t.request_count}</td><td className="px-4 py-2">{t.total_cost ? `KES ${Number(t.total_cost).toLocaleString()}` : '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent></Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
