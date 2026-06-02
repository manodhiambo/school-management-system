import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  Shield, Users, UserCheck, UserX, Clock, CheckCircle2, XCircle,
  Search, Plus, LogOut, RefreshCw, Eye, AlertTriangle, Ban,
  Phone, Building2, Car, KeyRound, UserCircle2
} from 'lucide-react';

type Tab = 'dashboard' | 'checkin' | 'register' | 'pickup' | 'live' | 'history';

const PURPOSE_OPTIONS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'parent', label: 'Parent Visit' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'interview', label: 'Interview' },
  { value: 'government', label: 'Government Official' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export function SecurityDashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [recentPickups, setRecentPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // Visitor check-in state
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorResults, setVisitorResults] = useState<any[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [visitForm, setVisitForm] = useState({ purpose: 'meeting', purpose_details: '', host_name: '', department: '', vehicle_registration: '', gate: 'Main Gate' });
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [activeVisits, setActiveVisits] = useState<any[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Register visitor state
  const [regForm, setRegForm] = useState({ full_name: '', national_id: '', phone: '', email: '', gender: '', organization: '', notes: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<any>(null);

  // Student pickup state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [authorizedPersons, setAuthorizedPersons] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [pickupForm, setPickupForm] = useState({ pickup_person_name: '', pickup_person_relationship: '', pickup_person_id_number: '', pickup_person_phone: '', verification_method: 'id_check', remarks: '', gate: 'Main Gate' });
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupResult, setPickupResult] = useState<any>(null);

  // Live monitoring
  const [liveVisitors, setLiveVisitors] = useState<any[]>([]);
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  // History
  const [historyVisits, setHistoryVisits] = useState<any[]>([]);
  const [historyPickups, setHistoryPickups] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getGateDashboard();
      setStats(res.data?.stats);
      setRecentVisits(res.data?.recent_visits || []);
      setRecentPickups(res.data?.recent_pickups || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (tab === 'checkin') loadActiveVisits();
    if (tab === 'live') loadLive();
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadActiveVisits = async () => {
    try {
      const res: any = await (api as any).getVisits({ status: 'checked_in', limit: 100 });
      setActiveVisits(res.data || []);
    } catch { /* silent */ }
  };

  const loadLive = async () => {
    setLiveLoading(true);
    try {
      const [v, s] = await Promise.all([
        (api as any).getLiveVisitors(),
        (api as any).getLiveStudentsWaiting(),
      ]);
      setLiveVisitors((v as any).data || []);
      setLiveStudents((s as any).data || []);
    } catch { /* silent */ }
    setLiveLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [v, p] = await Promise.all([
        (api as any).getVisits({ date: historyDate, limit: 100 }),
        (api as any).getPickupHistory({ date: historyDate, limit: 100 }),
      ]);
      setHistoryVisits((v as any).data || []);
      setHistoryPickups((p as any).data || []);
    } catch { /* silent */ }
    setHistoryLoading(false);
  };

  const searchVisitors = async (q: string) => {
    setVisitorSearch(q);
    if (q.length < 2) { setVisitorResults([]); return; }
    try {
      const res: any = await (api as any).getVisitors({ search: q, limit: 10 });
      setVisitorResults(res.data || []);
    } catch { /* silent */ }
  };

  const selectVisitor = async (v: any) => {
    setSelectedVisitor(v);
    setVisitorResults([]);
    setVisitorSearch(v.full_name);
  };

  const handleCheckin = async () => {
    if (!selectedVisitor) { setActionError('Search and select a visitor first'); return; }
    setCheckinLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      await (api as any).createVisit({ visitor_id: selectedVisitor.id, ...visitForm });
      setActionMsg(`${selectedVisitor.full_name} checked in successfully. Pass issued.`);
      setSelectedVisitor(null);
      setVisitorSearch('');
      setVisitForm({ purpose: 'meeting', purpose_details: '', host_name: '', department: '', vehicle_registration: '', gate: 'Main Gate' });
      loadActiveVisits();
      loadDashboard();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Check-in failed');
    }
    setCheckinLoading(false);
  };

  const handleCheckout = async (visitId: string, name: string) => {
    setCheckoutLoading(visitId);
    try {
      await (api as any).checkoutVisit(visitId);
      setActionMsg(`${name} checked out successfully`);
      loadActiveVisits();
      loadDashboard();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Checkout failed');
    }
    setCheckoutLoading(null);
  };

  const handleRegister = async () => {
    if (!regForm.full_name || !regForm.phone) { setActionError('Name and phone are required'); return; }
    setRegLoading(true);
    setActionMsg('');
    setActionError('');
    setRegResult(null);
    try {
      const res: any = await (api as any).createVisitor(regForm);
      setRegResult(res.data);
      setActionMsg(`Visitor ${regForm.full_name} registered successfully`);
      setRegForm({ full_name: '', national_id: '', phone: '', email: '', gender: '', organization: '', notes: '' });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setActionError('Visitor already exists with this ID number');
        setRegResult(err?.response?.data?.data);
      } else {
        setActionError(err?.response?.data?.message || 'Registration failed');
      }
    }
    setRegLoading(false);
  };

  const searchStudents = async (q: string) => {
    setStudentSearch(q);
    setSelectedStudent(null);
    setAuthorizedPersons([]);
    if (q.length < 2) { setStudentResults([]); return; }
    try {
      const res: any = await (api as any).searchStudentsForPickup(q);
      setStudentResults(res.data || []);
    } catch { /* silent */ }
  };

  const selectStudent = async (s: any) => {
    setSelectedStudent(s);
    setStudentSearch(s.first_name + ' ' + s.last_name);
    setStudentResults([]);
    setSelectedPerson(null);
    setPickupResult(null);
    try {
      const res: any = await (api as any).getAuthorizedPersons(s.id);
      setAuthorizedPersons((res.data || []).filter((p: any) => p.is_active && !p.is_blacklisted));
    } catch { /* silent */ }
  };

  const selectAuthorizedPerson = (p: any) => {
    setSelectedPerson(p);
    setPickupForm(f => ({
      ...f,
      pickup_person_name: p.full_name,
      pickup_person_relationship: p.relationship,
      pickup_person_id_number: p.national_id || '',
      pickup_person_phone: p.phone || '',
    }));
  };

  const handlePickup = async () => {
    if (!selectedStudent) { setActionError('Select a student first'); return; }
    if (!pickupForm.pickup_person_name) { setActionError('Pickup person name is required'); return; }
    setPickupLoading(true);
    setActionMsg('');
    setActionError('');
    setPickupResult(null);
    try {
      const payload = {
        student_id: selectedStudent.id,
        authorized_person_id: selectedPerson?.id || null,
        is_authorized: !!selectedPerson,
        ...pickupForm,
      };
      const res: any = await (api as any).releaseStudent(payload);
      setPickupResult(res);
      setActionMsg(`${res.student_name || selectedStudent.first_name} released to ${pickupForm.pickup_person_name}`);
      setSelectedStudent(null);
      setSelectedPerson(null);
      setStudentSearch('');
      setStudentResults([]);
      setAuthorizedPersons([]);
      setPickupForm({ pickup_person_name: '', pickup_person_relationship: '', pickup_person_id_number: '', pickup_person_phone: '', verification_method: 'id_check', remarks: '', gate: 'Main Gate' });
      loadDashboard();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Release failed');
    }
    setPickupLoading(false);
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: Shield },
    { key: 'checkin',   label: 'Check In/Out', icon: UserCheck },
    { key: 'register',  label: 'Register Visitor', icon: Plus },
    { key: 'pickup',    label: 'Student Pickup', icon: UserCircle2 },
    { key: 'live',      label: 'Live Monitor', icon: Eye },
    { key: 'history',   label: 'History', icon: Clock },
  ];

  const fmtTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDateTime = (ts: string) => ts ? new Date(ts).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gate Management</h1>
            <p className="text-xs text-gray-500">Security Officer — {user?.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Global feedback */}
      {actionMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {actionMsg}
          <button className="ml-auto text-green-500" onClick={() => setActionMsg('')}><XCircle className="h-4 w-4" /></button>
        </div>
      )}
      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {actionError}
          <button className="ml-auto text-red-400" onClick={() => setActionError('')}><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setActionMsg(''); setActionError(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-slate-800 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Visitors Inside', val: stats?.visitors_inside ?? '—', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Awaiting Pickup', val: stats?.students_awaiting_pickup ?? '—', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Released Today', val: stats?.released_today ?? '—', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Blocked Attempts', val: stats?.blocked_attempts ?? '—', icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.val}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Visitor Activity</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentVisits.length === 0 ? <p className="text-sm text-gray-400">No recent visits</p> : recentVisits.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <div className={`h-2 w-2 rounded-full ${v.status === 'checked_in' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.full_name}</p>
                      <p className="text-xs text-gray-500">{v.purpose} · {v.organization || 'Individual'}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{fmtTime(v.check_in_time)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Student Pickups</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentPickups.length === 0 ? <p className="text-sm text-gray-400">No pickups yet today</p> : recentPickups.map((p: any) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.is_authorized ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`h-2 w-2 rounded-full ${p.is_authorized ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.student_name}</p>
                      <p className="text-xs text-gray-500">{p.pickup_person_name} ({p.pickup_person_relationship || '—'})</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{fmtTime(p.pickup_time)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── CHECK IN / OUT ── */}
      {tab === 'checkin' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Check In Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" /> Check In Visitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Search Existing Visitor</Label>
                <Input placeholder="Name, ID, or phone…" value={visitorSearch} onChange={e => searchVisitors(e.target.value)} />
                {visitorResults.length > 0 && (
                  <div className="mt-1 border rounded-lg divide-y shadow-sm bg-white z-10">
                    {visitorResults.map((v: any) => (
                      <button key={v.id} onClick={() => selectVisitor(v)} className="w-full text-left p-2.5 hover:bg-gray-50 flex items-center gap-3">
                        <UserCircle2 className="h-8 w-8 text-gray-300 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{v.full_name}</p>
                          <p className="text-xs text-gray-500">{v.phone} · {v.national_id || 'No ID'} · Visits: {v.visit_count}</p>
                          {v.is_blacklisted && <p className="text-xs text-red-600 font-semibold">⛔ BLACKLISTED</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedVisitor && (
                  <div className="mt-2 p-2.5 bg-blue-50 rounded-lg text-sm border border-blue-200">
                    <p className="font-medium text-blue-800">{selectedVisitor.full_name}</p>
                    <p className="text-blue-600 text-xs">{selectedVisitor.phone} · {selectedVisitor.organization || 'Individual'}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Purpose</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={visitForm.purpose} onChange={e => setVisitForm(f => ({ ...f, purpose: e.target.value }))}>
                  {PURPOSE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Host Name</Label><Input placeholder="Staff member" value={visitForm.host_name} onChange={e => setVisitForm(f => ({ ...f, host_name: e.target.value }))} /></div>
                <div><Label className="text-xs">Department</Label><Input placeholder="e.g. Administration" value={visitForm.department} onChange={e => setVisitForm(f => ({ ...f, department: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Vehicle Reg (optional)</Label>
                <Input placeholder="e.g. KCA 123A" value={visitForm.vehicle_registration} onChange={e => setVisitForm(f => ({ ...f, vehicle_registration: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Gate</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={visitForm.gate} onChange={e => setVisitForm(f => ({ ...f, gate: e.target.value }))}>
                  <option>Main Gate</option><option>Side Gate</option><option>Back Gate</option>
                </select>
              </div>
              <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={handleCheckin} disabled={checkinLoading}>
                {checkinLoading ? 'Processing…' : 'Check In & Issue Pass'}
              </Button>
              <p className="text-xs text-center text-gray-400">Don't see the visitor? <button onClick={() => setTab('register')} className="text-blue-600 underline">Register new visitor</button></p>
            </CardContent>
          </Card>

          {/* Active Visits */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><LogOut className="h-4 w-4" /> Visitors Inside ({activeVisits.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadActiveVisits}><RefreshCw className="h-3.5 w-3.5" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {activeVisits.length === 0 && <p className="text-sm text-gray-400">No visitors currently inside</p>}
                {activeVisits.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{v.full_name}</p>
                      <p className="text-xs text-gray-500">{v.purpose} · Pass: {v.pass_number}</p>
                      <p className="text-xs text-gray-400">In: {fmtTime(v.check_in_time)} · Gate: {v.gate}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCheckout(v.id, v.full_name)} disabled={checkoutLoading === v.id}>
                      {checkoutLoading === v.id ? '…' : 'Out'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REGISTER VISITOR ── */}
      {tab === 'register' && (
        <Card className="max-w-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Register New Visitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {regResult && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                <p className="font-semibold text-green-800">Registered: {regResult.full_name}</p>
                <p className="text-green-600 text-xs">Now go to <button onClick={() => setTab('checkin')} className="underline">Check In/Out</button> to check them in.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs">Full Name *</Label><Input value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full legal name" /></div>
              <div><Label className="text-xs">National ID / Passport</Label><Input value={regForm.national_id} onChange={e => setRegForm(f => ({ ...f, national_id: e.target.value }))} placeholder="ID number" /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder="07xx xxx xxx" /></div>
              <div><Label className="text-xs">Email</Label><Input value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional" /></div>
              <div>
                <Label className="text-xs">Gender</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={regForm.gender} onChange={e => setRegForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-2"><Label className="text-xs">Organization / Company</Label><Input value={regForm.organization} onChange={e => setRegForm(f => ({ ...f, organization: e.target.value }))} placeholder="Optional" /></div>
              <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={regForm.notes} onChange={e => setRegForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this visitor" /></div>
            </div>
            <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={handleRegister} disabled={regLoading}>
              {regLoading ? 'Registering…' : 'Register Visitor'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── STUDENT PICKUP ── */}
      {tab === 'pickup' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Student Search */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Find Student</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Search by Name or Admission No.</Label>
                <Input placeholder="e.g. Kevin Odhiambo or ADM-001" value={studentSearch} onChange={e => searchStudents(e.target.value)} />
                {studentResults.length > 0 && (
                  <div className="mt-1 border rounded-lg divide-y shadow-sm bg-white">
                    {studentResults.map((s: any) => (
                      <button key={s.id} onClick={() => selectStudent(s)} className={`w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 ${s.already_picked_today ? 'opacity-50' : ''}`}>
                        <div>
                          <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-gray-500">{s.admission_number} · {s.class_name || s.grade_level}</p>
                          {s.already_picked_today && <p className="text-xs text-amber-600 font-semibold">Already picked today</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-semibold text-blue-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                    <p className="text-xs text-blue-600">{selectedStudent.admission_number} · {selectedStudent.class_name || selectedStudent.grade_level}</p>
                    {selectedStudent.already_picked_today && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">⚠ Already picked up today</p>
                    )}
                  </div>

                  {authorizedPersons.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Authorized Pickup Persons</p>
                      <div className="space-y-2">
                        {authorizedPersons.map((p: any) => (
                          <button key={p.id} onClick={() => selectAuthorizedPerson(p)} className={`w-full text-left p-2.5 rounded-lg border transition-all ${selectedPerson?.id === p.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`h-4 w-4 ${selectedPerson?.id === p.id ? 'text-green-600' : 'text-gray-300'}`} />
                              <div>
                                <p className="text-sm font-medium">{p.full_name}</p>
                                <p className="text-xs text-gray-500">{p.relationship} · {p.phone}</p>
                                {p.national_id && <p className="text-xs text-gray-400">ID: {p.national_id}</p>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
                      No authorized pickup persons registered for this student. You can still proceed with manual verification.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Release Form */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" /> Release Student</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pickupResult && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Student Released</p>
                  <p className="text-sm text-green-700 mt-1">Released to: <strong>{pickupResult.data?.pickup_person_name}</strong></p>
                  <p className="text-xs text-green-600">Time: {fmtDateTime(pickupResult.data?.pickup_time)}</p>
                </div>
              )}
              <div><Label className="text-xs">Pickup Person Name *</Label><Input value={pickupForm.pickup_person_name} onChange={e => setPickupForm(f => ({ ...f, pickup_person_name: e.target.value }))} placeholder="Full name of person collecting" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Relationship</Label><Input value={pickupForm.pickup_person_relationship} onChange={e => setPickupForm(f => ({ ...f, pickup_person_relationship: e.target.value }))} placeholder="e.g. Mother" /></div>
                <div><Label className="text-xs">ID Number</Label><Input value={pickupForm.pickup_person_id_number} onChange={e => setPickupForm(f => ({ ...f, pickup_person_id_number: e.target.value }))} placeholder="National ID" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Phone</Label><Input value={pickupForm.pickup_person_phone} onChange={e => setPickupForm(f => ({ ...f, pickup_person_phone: e.target.value }))} placeholder="07xx" /></div>
                <div>
                  <Label className="text-xs">Verification Method</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={pickupForm.verification_method} onChange={e => setPickupForm(f => ({ ...f, verification_method: e.target.value }))}>
                    <option value="id_check">ID Check</option>
                    <option value="otp">OTP</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Gate</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={pickupForm.gate} onChange={e => setPickupForm(f => ({ ...f, gate: e.target.value }))}>
                  <option>Main Gate</option><option>Side Gate</option><option>Back Gate</option>
                </select>
              </div>
              <div><Label className="text-xs">Remarks</Label><Input value={pickupForm.remarks} onChange={e => setPickupForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional notes" /></div>

              {selectedPerson ? (
                <div className="p-2.5 bg-green-50 rounded-lg text-xs text-green-700 border border-green-200">
                  ✓ Authorized person selected: <strong>{selectedPerson.full_name}</strong>
                </div>
              ) : selectedStudent ? (
                <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-200">
                  ⚠ No authorized person selected — this pickup will be logged as unverified
                </div>
              ) : null}

              <Button
                className={`w-full ${selectedPerson ? 'bg-green-700 hover:bg-green-800' : 'bg-amber-600 hover:bg-amber-700'}`}
                onClick={handlePickup}
                disabled={pickupLoading || !selectedStudent || selectedStudent.already_picked_today}
              >
                {pickupLoading ? 'Processing…' : selectedPerson ? 'Release (Authorized)' : 'Release (Manual Verification)'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── LIVE MONITOR ── */}
      {tab === 'live' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadLive} disabled={liveLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${liveLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  Visitors Inside ({liveVisitors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {liveVisitors.length === 0 && <p className="text-sm text-gray-400">No visitors currently inside</p>}
                  {liveVisitors.map((v: any) => (
                    <div key={v.id} className={`p-3 rounded-lg border ${v.is_overstay ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{v.full_name}</p>
                          <p className="text-xs text-gray-500">{v.purpose} · {v.organization || 'Individual'}</p>
                          <p className="text-xs text-gray-400">In: {fmtTime(v.check_in_time)} · Gate: {v.gate}</p>
                          {v.host_name && <p className="text-xs text-gray-400">Host: {v.host_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{Math.round(v.minutes_inside)} min</p>
                          {v.is_overstay && <p className="text-xs text-red-600 font-semibold">OVERSTAY</p>}
                          <p className="text-xs font-mono text-gray-500">{v.pass_number}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  Students Awaiting Pickup ({liveStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {liveStudents.length === 0 && <p className="text-sm text-gray-400">No students awaiting pickup</p>}
                  {liveStudents.map((s: any) => (
                    <div key={s.id} className="p-3 rounded-lg border bg-amber-50 border-amber-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.class_name} · {s.admission_number}</p>
                        </div>
                        <div className="text-xs text-gray-500">{s.authorized_count} authorized</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-40" />
            <Button size="sm" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load'}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Visitor Log ({historyVisits.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {historyVisits.length === 0 && <p className="text-sm text-gray-400">No visits on this date</p>}
                  {historyVisits.map((v: any) => (
                    <div key={v.id} className="p-2.5 rounded-lg border bg-gray-50 text-xs">
                      <p className="font-semibold text-sm">{v.full_name}</p>
                      <p className="text-gray-500">{v.purpose} · {v.organization || 'Individual'}</p>
                      <p className="text-gray-400">In: {fmtTime(v.check_in_time)} · Out: {v.check_out_time ? fmtTime(v.check_out_time) : <span className="text-amber-600">Still inside</span>}</p>
                      <p className="text-gray-400 font-mono">{v.pass_number}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pickup Log ({historyPickups.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {historyPickups.length === 0 && <p className="text-sm text-gray-400">No pickups on this date</p>}
                  {historyPickups.map((p: any) => (
                    <div key={p.id} className={`p-2.5 rounded-lg border text-xs ${p.is_authorized ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <p className="font-semibold text-sm">{p.student_name}</p>
                      <p className="text-gray-500">{p.class_name} · {p.admission_number}</p>
                      <p className="text-gray-600">By: {p.pickup_person_name} ({p.pickup_person_relationship || '—'})</p>
                      <p className="text-gray-400">Time: {fmtTime(p.pickup_time)} · {p.is_authorized ? '✓ Authorized' : '⚠ Unverified'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
