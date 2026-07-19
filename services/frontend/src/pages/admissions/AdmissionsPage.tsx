import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import {
  GraduationCap, RefreshCw, BarChart2, Settings as SettingsIcon, CheckCircle2, XCircle, Plus,
} from 'lucide-react';

type Tab = 'applications' | 'settings' | 'reports';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700', document_review: 'bg-yellow-100 text-yellow-800',
  fee_pending: 'bg-orange-100 text-orange-800', fee_paid: 'bg-blue-100 text-blue-800',
  interview_scheduled: 'bg-purple-100 text-purple-800', interviewed: 'bg-indigo-100 text-indigo-800',
  offered: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-800',
  enrolled: 'bg-green-100 text-green-800', withdrawn: 'bg-gray-100 text-gray-500',
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label.replace(/_/g, ' ')}</span>;
}

export function AdmissionsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('applications');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newApp, setNewApp] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '', education_level: '', previous_school: '',
    guardian_name: '', guardian_phone: '', guardian_email: '', guardian_relationship: '',
  });
  const [savingNewApp, setSavingNewApp] = useState(false);

  const [settings, setSettings] = useState({ application_fee_amount: '0', is_open: true, academic_year: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  const [funnel, setFunnel] = useState<any[]>([]);

  const [interviewForm, setInterviewForm] = useState({ interview_date: '', interview_time: '', interview_venue: '' });
  const [enrollClassId, setEnrollClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => { loadApplications(); }, [statusFilter]);
  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { if (tab === 'settings') loadSettings(); if (tab === 'reports') loadFunnel(); }, [tab]);

  const loadClasses = async () => {
    try {
      const res: any = await api.getClasses();
      setClasses(res?.data?.classes || res?.data || []);
    } catch { /* non-critical */ }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res: any = await api.getAdmissionApplications(statusFilter ? { status: statusFilter } : undefined);
      setApplications(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadSettings = async () => {
    try {
      const res: any = await api.getAdmissionSettings();
      const s = res?.data;
      if (s) setSettings({ application_fee_amount: String(s.application_fee_amount ?? '0'), is_open: s.is_open ?? true, academic_year: s.academic_year || '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadFunnel = async () => {
    try {
      const res: any = await api.getAdmissionFunnelReport();
      setFunnel(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.updateAdmissionSettings({
        application_fee_amount: parseFloat(settings.application_fee_amount) || 0,
        is_open: settings.is_open,
        academic_year: settings.academic_year || null,
      });
      toast({ title: 'Settings saved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingSettings(false); }
  };

  const createApplication = async () => {
    if (!newApp.first_name || !newApp.last_name || !newApp.guardian_name || !newApp.guardian_phone) {
      return toast({ title: 'First name, last name, guardian name and guardian phone are required', variant: 'destructive' });
    }
    setSavingNewApp(true);
    try {
      await api.createAdmissionApplication(newApp);
      toast({ title: 'Application recorded' });
      setShowNewForm(false);
      setNewApp({ first_name: '', last_name: '', date_of_birth: '', gender: '', education_level: '', previous_school: '', guardian_name: '', guardian_phone: '', guardian_email: '', guardian_relationship: '' });
      loadApplications();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingNewApp(false); }
  };

  const openApplication = async (id: string) => {
    try {
      const res: any = await api.getAdmissionApplication(id);
      setSelected(res?.data);
      setInterviewForm({ interview_date: '', interview_time: '', interview_venue: '' });
      setEnrollClassId('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const res: any = await api.getAdmissionApplication(selected.id);
    setSelected(res?.data);
    loadApplications();
  };

  const verifyDocuments = async () => {
    try { await api.verifyAdmissionDocuments(selected.id); toast({ title: 'Documents verified' }); refreshSelected(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const scheduleInterview = async () => {
    if (!interviewForm.interview_date) return toast({ title: 'Interview date is required', variant: 'destructive' });
    try { await api.scheduleAdmissionInterview(selected.id, interviewForm); toast({ title: 'Interview scheduled' }); refreshSelected(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const recordInterview = async () => {
    const notes = prompt('Interview notes:');
    if (notes == null) return;
    try { await api.recordAdmissionInterview(selected.id, notes); toast({ title: 'Interview recorded' }); refreshSelected(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const decide = async (decision: 'offered' | 'rejected') => {
    const notes = prompt(`Notes for this ${decision === 'offered' ? 'offer' : 'rejection'} (optional):`) || undefined;
    try { await api.decideAdmissionApplication(selected.id, decision, notes); toast({ title: `Application ${decision}` }); refreshSelected(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const enroll = async () => {
    if (!enrollClassId) return toast({ title: 'class_id is required', variant: 'destructive' });
    try {
      await api.enrollAdmissionApplication(selected.id, { class_id: enrollClassId });
      toast({ title: 'Enrolled — student record created' });
      refreshSelected();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const TABS = [
    { key: 'applications' as Tab, label: 'Applications', icon: GraduationCap },
    { key: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
    { key: 'reports' as Tab, label: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-indigo-600" /> Online Admission</h1>
        <p className="text-sm text-gray-500 mt-1">Review applications, schedule interviews, and enroll accepted students</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowNewForm(!showNewForm)}><Plus className="h-4 w-4 mr-1" /> Add Application</Button>
            </div>

            {showNewForm && (
              <Card><CardContent className="pt-4 space-y-3">
                <p className="text-xs text-gray-500">For a walk-in or phoned-in applicant who didn't apply online.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="First name" value={newApp.first_name} onChange={e => setNewApp(f => ({ ...f, first_name: e.target.value }))} />
                  <Input placeholder="Last name" value={newApp.last_name} onChange={e => setNewApp(f => ({ ...f, last_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" placeholder="Date of birth" value={newApp.date_of_birth} onChange={e => setNewApp(f => ({ ...f, date_of_birth: e.target.value }))} />
                  <select className="w-full border rounded px-3 py-2 text-sm" value={newApp.gender} onChange={e => setNewApp(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Grade applying for" value={newApp.education_level} onChange={e => setNewApp(f => ({ ...f, education_level: e.target.value }))} />
                  <Input placeholder="Previous school" value={newApp.previous_school} onChange={e => setNewApp(f => ({ ...f, previous_school: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Guardian name" value={newApp.guardian_name} onChange={e => setNewApp(f => ({ ...f, guardian_name: e.target.value }))} />
                  <Input placeholder="Guardian relationship" value={newApp.guardian_relationship} onChange={e => setNewApp(f => ({ ...f, guardian_relationship: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Guardian phone" value={newApp.guardian_phone} onChange={e => setNewApp(f => ({ ...f, guardian_phone: e.target.value }))} />
                  <Input placeholder="Guardian email (optional)" value={newApp.guardian_email} onChange={e => setNewApp(f => ({ ...f, guardian_email: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createApplication} disabled={savingNewApp}>{savingNewApp ? 'Saving...' : 'Save'}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
                </div>
              </CardContent></Card>
            )}

            <div className="flex gap-2 flex-wrap">
              {['', 'submitted', 'document_review', 'interview_scheduled', 'interviewed', 'offered', 'rejected', 'enrolled'].map(s => (
                <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s ? s.replace(/_/g, ' ') : 'All'}
                </button>
              ))}
              <Button size="sm" variant="outline" onClick={loadApplications}><RefreshCw className="h-3.5 w-3.5" /></Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-indigo-500" /></div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No applications</div>
            ) : (
              <div className="space-y-2">
                {applications.map(a => (
                  <Card key={a.id} className={`cursor-pointer ${selected?.id === a.id ? 'ring-2 ring-indigo-400' : ''}`} onClick={() => openApplication(a.id)}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{a.first_name} {a.last_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{a.application_number}</p>
                        </div>
                        <Badge label={a.status} color={STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            {!selected ? (
              <div className="text-center py-16 text-gray-400 border rounded-lg">Select an application to review</div>
            ) : (
              <Card><CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selected.first_name} {selected.last_name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{selected.application_number}</p>
                  </div>
                  <Badge label={selected.status} color={STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-600'} />
                </div>

                <div className="text-sm space-y-1">
                  <p><span className="text-gray-400">Grade:</span> {selected.education_level || '—'}</p>
                  <p><span className="text-gray-400">Previous school:</span> {selected.previous_school || '—'}</p>
                  <p><span className="text-gray-400">Guardian:</span> {selected.guardian_name} ({selected.guardian_relationship || 'guardian'})</p>
                  <p><span className="text-gray-400">Contact:</span> {selected.guardian_phone} {selected.guardian_email ? `· ${selected.guardian_email}` : ''}</p>
                </div>

                {Array.isArray(selected.documents) && selected.documents.filter((d: any) => d.url).length > 0 && (
                  <div className="text-sm">
                    <p className="text-gray-400 mb-1">Documents</p>
                    <ul className="space-y-1">
                      {selected.documents.filter((d: any) => d.url).map((d: any, i: number) => (
                        <li key={i}><a href={d.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline capitalize">{d.type.replace(/_/g, ' ')}</a></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  {['submitted', 'document_review'].includes(selected.status) && (
                    <Button size="sm" className="w-full" onClick={verifyDocuments} disabled={selected.status === 'document_review'}>
                      {selected.status === 'document_review' ? 'Documents Verified' : 'Verify Documents'}
                    </Button>
                  )}

                  {['document_review', 'fee_paid'].includes(selected.status) && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600">Schedule Interview</p>
                      <Input type="date" value={interviewForm.interview_date} onChange={e => setInterviewForm(f => ({ ...f, interview_date: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Time" value={interviewForm.interview_time} onChange={e => setInterviewForm(f => ({ ...f, interview_time: e.target.value }))} />
                        <Input placeholder="Venue" value={interviewForm.interview_venue} onChange={e => setInterviewForm(f => ({ ...f, interview_venue: e.target.value }))} />
                      </div>
                      <Button size="sm" className="w-full" onClick={scheduleInterview}>Schedule</Button>
                    </div>
                  )}

                  {selected.status === 'interview_scheduled' && (
                    <Button size="sm" className="w-full" onClick={recordInterview}>Record Interview Outcome</Button>
                  )}

                  {selected.status === 'interviewed' && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => decide('offered')}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Offer</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => decide('rejected')}><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                    </div>
                  )}

                  {selected.status === 'offered' && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600">Enroll — Select Class</p>
                      <select className="w-full border rounded px-3 py-2 text-sm" value={enrollClassId} onChange={e => setEnrollClassId(e.target.value)}>
                        <option value="">Select class...</option>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                      </select>
                      <Button size="sm" className="w-full" onClick={enroll} disabled={!enrollClassId}>Enroll Student</Button>
                    </div>
                  )}

                  {selected.status === 'enrolled' && (
                    <div className="text-sm text-green-700 bg-green-50 rounded p-2">Enrolled as student.</div>
                  )}
                  {selected.status === 'rejected' && (
                    <div className="text-sm text-red-700 bg-red-50 rounded p-2">{selected.decision_notes || 'Application rejected.'}</div>
                  )}
                </div>
              </CardContent></Card>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <Card><CardContent className="pt-6 space-y-4 max-w-md">
          <div>
            <Label>Application Fee (KES)</Label>
            <Input type="number" value={settings.application_fee_amount} onChange={e => setSettings(s => ({ ...s, application_fee_amount: e.target.value }))} />
          </div>
          <div>
            <Label>Academic Year</Label>
            <Input value={settings.academic_year} onChange={e => setSettings(s => ({ ...s, academic_year: e.target.value }))} placeholder="2026" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_open" checked={settings.is_open} onChange={e => setSettings(s => ({ ...s, is_open: e.target.checked }))} />
            <Label htmlFor="is_open">Admissions are open</Label>
          </div>
          <Button onClick={saveSettings} disabled={savingSettings}>{savingSettings ? 'Saving...' : 'Save Settings'}</Button>
        </CardContent></Card>
      )}

      {tab === 'reports' && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Status</th><th className="px-4 py-2">Count</th></tr></thead>
            <tbody>
              {funnel.length === 0 ? <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">No applications yet.</td></tr> : funnel.map((f: any) => (
                <tr key={f.status} className="border-b"><td className="px-4 py-2 capitalize">{f.status.replace(/_/g, ' ')}</td><td className="px-4 py-2">{f.count}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
