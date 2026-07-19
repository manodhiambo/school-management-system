import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Search, Plus, RefreshCw,
  CheckCircle, Shield
} from 'lucide-react';

type Tab = 'dashboard' | 'sessions' | 'interventions' | 'student';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high:     'bg-orange-100 text-orange-800',
  medium:   'bg-yellow-100 text-yellow-800',
  low:      'bg-green-100 text-green-800',
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  open:      'bg-yellow-100 text-yellow-800',
};

const SESSION_TYPES = ['academic', 'behavioral', 'social', 'emotional', 'career', 'family', 'other'];
const INTERVENTION_TYPES = ['academic_support', 'behavioral', 'attendance', 'family_concern', 'mental_health', 'peer_conflict', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const EMPTY_SESSION = { student_id: '', date: '', type: 'academic', notes: '', is_confidential: false };
const EMPTY_INTERV  = { student_id: '', type: 'academic_support', priority: 'medium', description: '' };
const EMPTY_RESOLVE = { action_taken: '' };

export function CounselingPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const canAccess = ['admin', 'superadmin', 'teacher'].includes(user?.role || '');

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [sessions, setSessions]   = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [students, setStudents]   = useState<any[]>([]);

  // Forms
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ ...EMPTY_SESSION });
  const [showIntervForm, setShowIntervForm]   = useState(false);
  const [intervForm, setIntervForm]           = useState({ ...EMPTY_INTERV });
  const [resolveSessionId, setResolveSessionId] = useState<string | null>(null);
  const [resolveIntervId, setResolveIntervId]   = useState<string | null>(null);
  const [resolveForm, setResolveForm]           = useState({ ...EMPTY_RESOLVE });

  // Filters
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('');
  const [intervTypeFilter, setIntervTypeFilter] = useState('');

  // Student view
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const res: any = await (api as any).getCounselingDashboard();
        setDashboard(res?.data || null);
      }
      if (tab === 'sessions') {
        const [sRes, stRes]: any[] = await Promise.all([
          (api as any).getCounselingSessions(),
          api.getStudents(),
        ]);
        setSessions(sRes?.data || []);
        setStudents(stRes?.data || []);
      }
      if (tab === 'interventions') {
        const [iRes, stRes]: any[] = await Promise.all([
          (api as any).getInterventions(),
          api.getStudents(),
        ]);
        setInterventions(iRes?.data || []);
        setStudents(stRes?.data || []);
      }
      if (tab === 'student') {
        const stRes: any = await api.getStudents();
        setStudents(stRes?.data || []);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createSession = async () => {
    try {
      await (api as any).createCounselingSession(sessionForm);
      toast({ title: 'Session created' });
      setShowSessionForm(false);
      setSessionForm({ ...EMPTY_SESSION });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const resolveSession = async (id: string) => {
    try {
      await (api as any).resolveCounselingSession(id, resolveForm);
      toast({ title: 'Session resolved' });
      setResolveSessionId(null);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createIntervention = async () => {
    try {
      await (api as any).createIntervention(intervForm);
      toast({ title: 'Intervention logged' });
      setShowIntervForm(false);
      setIntervForm({ ...EMPTY_INTERV });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const resolveIntervention = async (id: string) => {
    try {
      await (api as any).resolveIntervention(id, resolveForm);
      toast({ title: 'Intervention resolved' });
      setResolveIntervId(null);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredSessions = sessions.filter(s =>
    (!sessionTypeFilter || s.type === sessionTypeFilter) &&
    (!sessionStatusFilter || s.status === sessionStatusFilter)
  );

  const filteredInterventions = interventions.filter(i =>
    !intervTypeFilter || i.type === intervTypeFilter
  );

  const studentMatches = students.filter(s =>
    studentSearch.length > 1 &&
    (s.name || s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  const studentSessions = selectedStudent
    ? sessions.filter(s => s.student_id === selectedStudent.id)
    : [];
  const studentInterventions = selectedStudent
    ? interventions.filter(i => i.student_id === selectedStudent.id)
    : [];

  if (!canAccess) {
    return <div className="p-6 text-center text-gray-400">Access restricted to admin and teachers.</div>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'student', label: 'Student View' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Counseling & Interventions</h1>
        <p className="text-sm text-gray-500 mt-1">Student welfare, counseling sessions and support tracking</p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      )}

      {/* DASHBOARD */}
      {!loading && tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{dashboard?.open_sessions ?? '—'}</div>
              <div className="text-sm text-gray-500">Open Sessions</div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{dashboard?.active_interventions ?? '—'}</div>
              <div className="text-sm text-gray-500">Active Interventions</div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{dashboard?.critical ?? '—'}</div>
              <div className="text-sm text-gray-500">Critical Flags</div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{dashboard?.high ?? '—'}</div>
              <div className="text-sm text-gray-500">High Priority</div>
            </CardContent></Card>
          </div>

          {dashboard?.recent_flags && dashboard.recent_flags.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Flags</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recent_flags.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{f.student_name}</div>
                        <div className="text-xs text-gray-500">{f.type} · {f.created_at?.slice(0, 10)}</div>
                      </div>
                      <Badge className={PRIORITY_COLORS[f.priority] || ''}>{f.priority}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SESSIONS */}
      {!loading && tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <select className="border rounded px-3 py-1.5 text-sm"
                value={sessionTypeFilter} onChange={e => setSessionTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                {SESSION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
              <select className="border rounded px-3 py-1.5 text-sm"
                value={sessionStatusFilter} onChange={e => setSessionStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {['scheduled','open','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Button onClick={() => setShowSessionForm(!showSessionForm)}>
              <Plus className="h-4 w-4 mr-2" /> New Session
            </Button>
          </div>

          {showSessionForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={sessionForm.student_id}
                    onChange={e => setSessionForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="mt-1" value={sessionForm.date}
                    onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={sessionForm.type}
                    onChange={e => setSessionForm(f => ({ ...f, type: e.target.value }))}>
                    {SESSION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input type="checkbox" id="confid" checked={sessionForm.is_confidential}
                    onChange={e => setSessionForm(f => ({ ...f, is_confidential: e.target.checked }))} />
                  <Label htmlFor="confid">Mark as Confidential</Label>
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <textarea className="w-full mt-1 border rounded p-2 text-sm" rows={3}
                    placeholder="Session notes..."
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createSession}>Create Session</Button>
                <Button variant="outline" onClick={() => setShowSessionForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No sessions found</div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map(s => (
                <Card key={s.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{s.student_name}</div>
                        <div className="text-sm text-gray-500">
                          {s.date} · <span className="capitalize">{s.type}</span> ·
                          Counselor: {s.counselor_name || 'You'}
                        </div>
                        {!s.is_confidential && s.notes && (
                          <div className="text-sm mt-2 text-gray-600 italic">"{s.notes}"</div>
                        )}
                        {s.is_confidential && (
                          <div className="text-xs mt-1 text-gray-400 flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Confidential
                          </div>
                        )}
                      </div>
                      <Badge className={SESSION_STATUS_COLORS[s.status] || ''}>{s.status}</Badge>
                    </div>

                    {resolveSessionId === s.id ? (
                      <div className="mt-3">
                        <textarea className="w-full border rounded p-2 text-sm" rows={2}
                          placeholder="Action taken / resolution notes..."
                          value={resolveForm.action_taken}
                          onChange={e => setResolveForm({ action_taken: e.target.value })} />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => resolveSession(s.id)}>Resolve</Button>
                          <Button size="sm" variant="outline" onClick={() => setResolveSessionId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      !['completed','cancelled'].includes(s.status) && (
                        <Button size="sm" variant="outline" className="mt-3"
                          onClick={() => { setResolveSessionId(s.id); setResolveForm({ action_taken: '' }); }}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INTERVENTIONS */}
      {!loading && tab === 'interventions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <select className="border rounded px-3 py-1.5 text-sm"
              value={intervTypeFilter} onChange={e => setIntervTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {INTERVENTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <Button onClick={() => setShowIntervForm(!showIntervForm)}>
              <Plus className="h-4 w-4 mr-2" /> Log Intervention
            </Button>
          </div>

          {showIntervForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={intervForm.student_id}
                    onChange={e => setIntervForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Type</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={intervForm.type}
                    onChange={e => setIntervForm(f => ({ ...f, type: e.target.value }))}>
                    {INTERVENTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={intervForm.priority}
                    onChange={e => setIntervForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <textarea className="w-full mt-1 border rounded p-2 text-sm" rows={3}
                    placeholder="Describe the concern or flag..."
                    value={intervForm.description}
                    onChange={e => setIntervForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createIntervention}>Save</Button>
                <Button variant="outline" onClick={() => setShowIntervForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {filteredInterventions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No interventions logged</div>
          ) : (
            <div className="space-y-3">
              {filteredInterventions.map(i => (
                <Card key={i.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{i.student_name}</span>
                          <Badge className={PRIORITY_COLORS[i.priority] || ''}>{i.priority}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1 capitalize">
                          {i.type?.replace('_', ' ')} · {i.created_at?.slice(0, 10)}
                        </div>
                        <div className="text-sm mt-2 text-gray-600">{i.description}</div>
                        {i.action_taken && (
                          <div className="text-sm mt-1 text-green-700 bg-green-50 rounded px-2 py-1">
                            Action: {i.action_taken}
                          </div>
                        )}
                      </div>
                      <Badge className={i.resolved_at ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {i.resolved_at ? 'Resolved' : 'Open'}
                      </Badge>
                    </div>

                    {resolveIntervId === i.id ? (
                      <div className="mt-3">
                        <textarea className="w-full border rounded p-2 text-sm" rows={2}
                          placeholder="Describe action taken..."
                          value={resolveForm.action_taken}
                          onChange={e => setResolveForm({ action_taken: e.target.value })} />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => resolveIntervention(i.id)}>Mark Resolved</Button>
                          <Button size="sm" variant="outline" onClick={() => setResolveIntervId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      !i.resolved_at && (
                        <Button size="sm" variant="outline" className="mt-3"
                          onClick={() => { setResolveIntervId(i.id); setResolveForm({ action_taken: '' }); }}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Mark Resolved
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT VIEW */}
      {!loading && tab === 'student' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search student name..." value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} />
          </div>

          {studentSearch.length > 1 && !selectedStudent && studentMatches.length > 0 && (
            <div className="border rounded-lg divide-y max-w-sm shadow-sm">
              {studentMatches.map(s => (
                <button key={s.id} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                  onClick={() => { setSelectedStudent(s); setStudentSearch(s.name || s.full_name); }}>
                  {s.name || s.full_name} — {s.class_name || s.grade || ''}
                </button>
              ))}
            </div>
          )}

          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                  {(selectedStudent.name || selectedStudent.full_name || 'S')[0]}
                </div>
                <div>
                  <div className="font-semibold">{selectedStudent.name || selectedStudent.full_name}</div>
                  <div className="text-sm text-gray-500">{selectedStudent.class_name || selectedStudent.grade || ''}</div>
                </div>
                <Button size="sm" variant="outline" className="ml-auto"
                  onClick={() => { setSelectedStudent(null); setStudentSearch(''); }}>
                  Clear
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Sessions ({studentSessions.length})</CardTitle></CardHeader>
                  <CardContent>
                    {studentSessions.length === 0 ? (
                      <div className="text-sm text-gray-400">No sessions</div>
                    ) : (
                      <div className="space-y-2">
                        {studentSessions.map(s => (
                          <div key={s.id} className="text-sm border-b pb-2 last:border-0">
                            <div className="flex justify-between">
                              <span className="capitalize font-medium">{s.type}</span>
                              <Badge className={SESSION_STATUS_COLORS[s.status] || ''}>{s.status}</Badge>
                            </div>
                            <div className="text-gray-500">{s.date}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Interventions ({studentInterventions.length})</CardTitle></CardHeader>
                  <CardContent>
                    {studentInterventions.length === 0 ? (
                      <div className="text-sm text-gray-400">No interventions</div>
                    ) : (
                      <div className="space-y-2">
                        {studentInterventions.map(i => (
                          <div key={i.id} className="text-sm border-b pb-2 last:border-0">
                            <div className="flex justify-between">
                              <span className="capitalize font-medium">{i.type?.replace('_',' ')}</span>
                              <Badge className={PRIORITY_COLORS[i.priority] || ''}>{i.priority}</Badge>
                            </div>
                            <div className="text-gray-500">{i.created_at?.slice(0, 10)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
