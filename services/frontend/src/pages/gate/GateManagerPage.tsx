import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import {
  Shield, Users, UserCheck, Ban, Clock, CheckCircle2, XCircle, Plus, RefreshCw, AlertTriangle, UserCircle2, Trash2,
  BarChart3, FileText
} from 'lucide-react';

type Tab = 'overview' | 'visits' | 'pickups' | 'authorized' | 'blacklist' | 'reports';

export function GateManagerPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Visits state
  const [visits, setVisits] = useState<any[]>([]);
  const [visitsFilter, setVisitsFilter] = useState({ status: '', date: new Date().toISOString().split('T')[0], search: '' });
  const [visitsLoading, setVisitsLoading] = useState(false);

  // Pickups state
  const [pickups, setPickups] = useState<any[]>([]);
  const [pickupsFilter, setPickupsFilter] = useState({ date: new Date().toISOString().split('T')[0], unauthorized_only: '' });
  const [pickupsLoading, setPickupsLoading] = useState(false);

  // Authorized persons state
  const [authStudentSearch, setAuthStudentSearch] = useState('');
  const [authStudentResults, setAuthStudentResults] = useState<any[]>([]);
  const [authSelectedStudent, setAuthSelectedStudent] = useState<any>(null);
  const [authPersons, setAuthPersons] = useState<any[]>([]);
  const [authForm, setAuthForm] = useState({ full_name: '', relationship: '', national_id: '', phone: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Blacklist state
  const [visitorBlacklist, setVisitorBlacklist] = useState<any[]>([]);
  const [guardianBlacklist, setGuardianBlacklist] = useState<any[]>([]);
  const [blacklistTab, setBlacklistTab] = useState<'visitors' | 'guardians'>('visitors');
  const [blForm, setBlForm] = useState({ full_name: '', national_id: '', phone: '', reason: '', student_id: '', visitor_id: '' });
  const [blLoading, setBlLoading] = useState(false);

  // Reports state
  const [reportType, setReportType] = useState<'visitors' | 'pickups'>('visitors');
  const [reportRange, setReportRange] = useState({ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] });
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res: any = await (api as any).getGateDashboard();
      setStats(res.data?.stats);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (tab === 'visits') loadVisits();
    if (tab === 'pickups') loadPickups();
    if (tab === 'blacklist') { loadVisitorBL(); loadGuardianBL(); }
  }, [tab]);

  const loadVisits = async () => {
    setVisitsLoading(true);
    try {
      const res: any = await (api as any).getVisits({ ...visitsFilter, limit: 200 });
      setVisits(res.data || []);
    } catch { /* silent */ }
    setVisitsLoading(false);
  };

  const loadPickups = async () => {
    setPickupsLoading(true);
    try {
      const res: any = await (api as any).getPickupHistory({ ...pickupsFilter, limit: 200 });
      setPickups(res.data || []);
    } catch { /* silent */ }
    setPickupsLoading(false);
  };

  const loadVisitorBL = async () => {
    try { const r: any = await (api as any).getVisitorBlacklist(); setVisitorBlacklist(r.data || []); } catch { /* silent */ }
  };
  const loadGuardianBL = async () => {
    try { const r: any = await (api as any).getGuardianBlacklist(); setGuardianBlacklist(r.data || []); } catch { /* silent */ }
  };

  const searchAuthStudents = async (q: string) => {
    setAuthStudentSearch(q);
    if (q.length < 2) { setAuthStudentResults([]); return; }
    try { const r: any = await (api as any).searchStudentsForPickup(q); setAuthStudentResults(r.data || []); } catch { /* silent */ }
  };

  const selectAuthStudent = async (s: any) => {
    setAuthSelectedStudent(s);
    setAuthStudentSearch(s.first_name + ' ' + s.last_name);
    setAuthStudentResults([]);
    try { const r: any = await (api as any).getAuthorizedPersons(s.id); setAuthPersons(r.data || []); } catch { /* silent */ }
  };

  const addAuthPerson = async () => {
    if (!authSelectedStudent || !authForm.full_name || !authForm.phone || !authForm.relationship) {
      setErr('Student, full name, relationship, and phone are required'); return;
    }
    setAuthLoading(true);
    try {
      await (api as any).addAuthorizedPerson({ student_id: authSelectedStudent.id, ...authForm });
      setMsg('Authorized person added');
      setAuthForm({ full_name: '', relationship: '', national_id: '', phone: '' });
      setShowAuthForm(false);
      const r: any = await (api as any).getAuthorizedPersons(authSelectedStudent.id);
      setAuthPersons(r.data || []);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed'); }
    setAuthLoading(false);
  };

  const removeAuthPerson = async (id: string) => {
    if (!confirm('Deactivate this authorized person?')) return;
    try {
      await (api as any).removeAuthorizedPerson(id);
      setMsg('Authorized person removed');
      const r: any = await (api as any).getAuthorizedPersons(authSelectedStudent.id);
      setAuthPersons(r.data || []);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed'); }
  };

  const addBlacklist = async () => {
    if (!blForm.full_name || !blForm.reason) { setErr('Name and reason required'); return; }
    setBlLoading(true);
    try {
      if (blacklistTab === 'visitors') {
        await (api as any).addVisitorBlacklist(blForm);
      } else {
        await (api as any).addGuardianBlacklist(blForm);
      }
      setMsg('Added to blacklist');
      setBlForm({ full_name: '', national_id: '', phone: '', reason: '', student_id: '', visitor_id: '' });
      if (blacklistTab === 'visitors') loadVisitorBL(); else loadGuardianBL();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed'); }
    setBlLoading(false);
  };

  const removeFromBlacklist = async (id: string) => {
    if (!confirm('Remove from blacklist?')) return;
    try {
      if (blacklistTab === 'visitors') await (api as any).removeVisitorBlacklist(id);
      else await (api as any).removeGuardianBlacklist(id);
      setMsg('Removed from blacklist');
      if (blacklistTab === 'visitors') loadVisitorBL(); else loadGuardianBL();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed'); }
  };

  const runReport = async () => {
    setReportLoading(true);
    try {
      const res: any = reportType === 'visitors'
        ? await (api as any).getGateVisitorReport(reportRange)
        : await (api as any).getGatePickupReport(reportRange);
      setReportData(res.data || []);
    } catch { /* silent */ }
    setReportLoading(false);
  };

  const fmtDT = (ts: string) => ts ? new Date(ts).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—';

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview',   label: 'Overview',        icon: BarChart3 },
    { key: 'visits',     label: 'Visitor Log',      icon: Users },
    { key: 'pickups',    label: 'Pickup Log',       icon: UserCheck },
    { key: 'authorized', label: 'Authorized Persons', icon: UserCircle2 },
    { key: 'blacklist',  label: 'Blacklist',        icon: Ban },
    { key: 'reports',    label: 'Reports',          icon: FileText },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gate Management</h1>
            <p className="text-xs text-gray-500">Admin Control Centre</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      {msg && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{msg}<button className="ml-auto" onClick={() => setMsg('')}><XCircle className="h-4 w-4" /></button></div>}
      {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{err}<button className="ml-auto" onClick={() => setErr('')}><XCircle className="h-4 w-4" /></button></div>}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setMsg(''); setErr(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-slate-800 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Visitors Inside', val: stats?.visitors_inside ?? '—', color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
              { label: 'Awaiting Pickup', val: stats?.students_awaiting_pickup ?? '—', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
              { label: 'Released Today', val: stats?.released_today ?? '—', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
              { label: 'Blocked Attempts', val: stats?.blocked_attempts ?? '—', color: 'text-red-600', bg: 'bg-red-50', icon: Ban },
            ].map(s => (
              <Card key={s.label}>
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
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Visitor Log', desc: 'View and manage visitor check-in/out records', tab: 'visits' as Tab, color: 'bg-blue-600' },
              { title: 'Pickup Log', desc: 'Student pickup transactions and verification', tab: 'pickups' as Tab, color: 'bg-green-600' },
              { title: 'Authorized Persons', desc: 'Manage authorized pickup persons per student', tab: 'authorized' as Tab, color: 'bg-purple-600' },
              { title: 'Blacklist', desc: 'Blocked visitors and guardians', tab: 'blacklist' as Tab, color: 'bg-red-600' },
              { title: 'Reports', desc: 'Export visitor and pickup reports', tab: 'reports' as Tab, color: 'bg-amber-600' },
            ].map(c => (
              <button key={c.tab} onClick={() => setTab(c.tab)} className="text-left p-4 rounded-xl border bg-white hover:shadow-md transition-all">
                <div className={`h-8 w-8 rounded-lg ${c.color} flex items-center justify-center mb-2`}>
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── VISITOR LOG ── */}
      {tab === 'visits' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div><Label className="text-xs">Date</Label><Input type="date" value={visitsFilter.date} onChange={e => setVisitsFilter(f => ({ ...f, date: e.target.value }))} className="w-36" /></div>
              <div><Label className="text-xs">Status</Label>
                <select className="border rounded-md px-3 py-2 text-sm" value={visitsFilter.status} onChange={e => setVisitsFilter(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All</option><option value="checked_in">Inside</option><option value="checked_out">Checked Out</option>
                </select>
              </div>
              <div><Label className="text-xs">Search</Label><Input placeholder="Name, ID, pass…" value={visitsFilter.search} onChange={e => setVisitsFilter(f => ({ ...f, search: e.target.value }))} className="w-48" /></div>
              <Button size="sm" onClick={loadVisits} disabled={visitsLoading}>{visitsLoading ? '…' : 'Filter'}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-3">Visitor</th><th className="pb-2 pr-3">Purpose</th>
                  <th className="pb-2 pr-3">Pass</th><th className="pb-2 pr-3">In</th>
                  <th className="pb-2 pr-3">Out</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody>
                  {visits.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No visits found</td></tr>}
                  {visits.map((v: any) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 pr-3"><p className="font-medium">{v.full_name}</p><p className="text-xs text-gray-400">{v.phone} · {v.organization || '—'}</p></td>
                      <td className="py-2.5 pr-3 capitalize">{v.purpose}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{v.pass_number}</td>
                      <td className="py-2.5 pr-3 text-xs">{fmtTime(v.check_in_time)}</td>
                      <td className="py-2.5 pr-3 text-xs">{v.check_out_time ? fmtTime(v.check_out_time) : <span className="text-amber-500">Inside</span>}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v.status === 'checked_in' ? 'Inside' : 'Out'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── PICKUP LOG ── */}
      {tab === 'pickups' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div><Label className="text-xs">Date</Label><Input type="date" value={pickupsFilter.date} onChange={e => setPickupsFilter(f => ({ ...f, date: e.target.value }))} className="w-36" /></div>
              <div><Label className="text-xs">Show</Label>
                <select className="border rounded-md px-3 py-2 text-sm" value={pickupsFilter.unauthorized_only} onChange={e => setPickupsFilter(f => ({ ...f, unauthorized_only: e.target.value }))}>
                  <option value="">All Pickups</option><option value="true">Unverified Only</option>
                </select>
              </div>
              <Button size="sm" onClick={loadPickups} disabled={pickupsLoading}>{pickupsLoading ? '…' : 'Filter'}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-3">Student</th><th className="pb-2 pr-3">Pickup Person</th>
                  <th className="pb-2 pr-3">Time</th><th className="pb-2 pr-3">Gate</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody>
                  {pickups.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No pickups found</td></tr>}
                  {pickups.map((p: any) => (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 ${!p.is_authorized ? 'bg-red-50' : ''}`}>
                      <td className="py-2.5 pr-3"><p className="font-medium">{p.student_name}</p><p className="text-xs text-gray-400">{p.class_name} · {p.admission_number}</p></td>
                      <td className="py-2.5 pr-3"><p>{p.pickup_person_name}</p><p className="text-xs text-gray-400">{p.pickup_person_relationship} · {p.pickup_person_id_number}</p></td>
                      <td className="py-2.5 pr-3 text-xs">{fmtDT(p.pickup_time)}</td>
                      <td className="py-2.5 pr-3 text-xs">{p.gate}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_authorized ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_authorized ? 'Authorized' : 'Unverified'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AUTHORIZED PERSONS ── */}
      {tab === 'authorized' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Search Student</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Student name or admission no." value={authStudentSearch} onChange={e => searchAuthStudents(e.target.value)} />
              {authStudentResults.length > 0 && (
                <div className="border rounded-lg divide-y shadow-sm">
                  {authStudentResults.map((s: any) => (
                    <button key={s.id} onClick={() => selectAuthStudent(s)} className="w-full text-left p-2.5 hover:bg-gray-50">
                      <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">{s.admission_number} · {s.class_name}</p>
                    </button>
                  ))}
                </div>
              )}
              {authSelectedStudent && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-blue-900">{authSelectedStudent.first_name} {authSelectedStudent.last_name}</p>
                      <p className="text-xs text-blue-600">{authSelectedStudent.admission_number}</p>
                    </div>
                    <Button size="sm" onClick={() => setShowAuthForm(!showAuthForm)}><Plus className="h-3.5 w-3.5 mr-1" />Add Person</Button>
                  </div>
                  {showAuthForm && (
                    <div className="space-y-2 pt-2 border-t border-blue-200">
                      <Input placeholder="Full Name *" value={authForm.full_name} onChange={e => setAuthForm(f => ({ ...f, full_name: e.target.value }))} />
                      <Input placeholder="Relationship (e.g. Mother) *" value={authForm.relationship} onChange={e => setAuthForm(f => ({ ...f, relationship: e.target.value }))} />
                      <Input placeholder="National ID" value={authForm.national_id} onChange={e => setAuthForm(f => ({ ...f, national_id: e.target.value }))} />
                      <Input placeholder="Phone *" value={authForm.phone} onChange={e => setAuthForm(f => ({ ...f, phone: e.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={addAuthPerson} disabled={authLoading}>{authLoading ? '…' : 'Add'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAuthForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Authorized Persons {authSelectedStudent ? `— ${authSelectedStudent.first_name}` : ''}</CardTitle></CardHeader>
            <CardContent>
              {!authSelectedStudent && <p className="text-sm text-gray-400">Select a student to view their authorized persons</p>}
              <div className="space-y-2">
                {authPersons.map((p: any) => (
                  <div key={p.id} className={`p-3 rounded-lg border flex items-center gap-3 ${!p.is_active ? 'opacity-50' : p.is_blacklisted ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.full_name}</p>
                      <p className="text-xs text-gray-500">{p.relationship} · {p.phone}</p>
                      {p.national_id && <p className="text-xs text-gray-400">ID: {p.national_id}</p>}
                      {p.is_blacklisted && <p className="text-xs text-red-600 font-semibold">BLACKLISTED</p>}
                      {!p.is_active && <p className="text-xs text-gray-400">Inactive</p>}
                    </div>
                    {p.is_active && <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-800" onClick={() => removeAuthPerson(p.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
                {authSelectedStudent && authPersons.length === 0 && <p className="text-sm text-gray-400">No authorized persons added yet</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── BLACKLIST ── */}
      {tab === 'blacklist' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setBlacklistTab('visitors')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${blacklistTab === 'visitors' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}>Visitors</button>
                <button onClick={() => setBlacklistTab('guardians')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${blacklistTab === 'guardians' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}>Guardians</button>
              </div>
              <CardTitle className="text-sm">Add to {blacklistTab === 'visitors' ? 'Visitor' : 'Guardian'} Blacklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Full Name *" value={blForm.full_name} onChange={e => setBlForm(f => ({ ...f, full_name: e.target.value }))} />
              <Input placeholder="National ID" value={blForm.national_id} onChange={e => setBlForm(f => ({ ...f, national_id: e.target.value }))} />
              <Input placeholder="Phone" value={blForm.phone} onChange={e => setBlForm(f => ({ ...f, phone: e.target.value }))} />
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]" placeholder="Reason for blacklisting *" value={blForm.reason} onChange={e => setBlForm(f => ({ ...f, reason: e.target.value }))} />
              <Button className="w-full bg-red-700 hover:bg-red-800" onClick={addBlacklist} disabled={blLoading}>{blLoading ? '…' : 'Add to Blacklist'}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{blacklistTab === 'visitors' ? 'Visitor' : 'Guardian'} Blacklist ({blacklistTab === 'visitors' ? visitorBlacklist.length : guardianBlacklist.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(blacklistTab === 'visitors' ? visitorBlacklist : guardianBlacklist).length === 0 && <p className="text-sm text-gray-400">Blacklist is empty</p>}
                {(blacklistTab === 'visitors' ? visitorBlacklist : guardianBlacklist).map((b: any) => (
                  <div key={b.id} className="p-3 rounded-lg border bg-red-50 border-red-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{b.full_name}</p>
                        <p className="text-xs text-gray-500">{b.phone} · ID: {b.national_id || '—'}</p>
                        {b.student_name && <p className="text-xs text-gray-500">Student: {b.student_name}</p>}
                        <p className="text-xs text-red-600 mt-1">{b.reason}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeFromBlacklist(b.id)}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generate Report</CardTitle>
            <div className="flex flex-wrap gap-3 items-end mt-2">
              <div>
                <Label className="text-xs">Report Type</Label>
                <select className="border rounded-md px-3 py-2 text-sm" value={reportType} onChange={e => setReportType(e.target.value as any)}>
                  <option value="visitors">Visitor Report</option>
                  <option value="pickups">Pickup Report</option>
                </select>
              </div>
              <div><Label className="text-xs">Start Date</Label><Input type="date" value={reportRange.start_date} onChange={e => setReportRange(r => ({ ...r, start_date: e.target.value }))} className="w-36" /></div>
              <div><Label className="text-xs">End Date</Label><Input type="date" value={reportRange.end_date} onChange={e => setReportRange(r => ({ ...r, end_date: e.target.value }))} className="w-36" /></div>
              <Button onClick={runReport} disabled={reportLoading}>{reportLoading ? '…' : 'Generate'}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">{reportData.length} records found</p>
            {reportType === 'visitors' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3">Visitor</th><th className="pb-2 pr-3">Purpose</th>
                    <th className="pb-2 pr-3">Organisation</th><th className="pb-2 pr-3">Check In</th>
                    <th className="pb-2 pr-3">Check Out</th><th className="pb-2">Pass</th>
                  </tr></thead>
                  <tbody>
                    {reportData.map((v: any) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{v.full_name}<br/><span className="text-gray-400">{v.phone}</span></td>
                        <td className="py-2 pr-3 capitalize">{v.purpose}</td>
                        <td className="py-2 pr-3">{v.organization || '—'}</td>
                        <td className="py-2 pr-3">{fmtDT(v.check_in_time)}</td>
                        <td className="py-2 pr-3">{v.check_out_time ? fmtDT(v.check_out_time) : '—'}</td>
                        <td className="py-2 font-mono">{v.pass_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3">Student</th><th className="pb-2 pr-3">Class</th>
                    <th className="pb-2 pr-3">Pickup Person</th><th className="pb-2 pr-3">Time</th>
                    <th className="pb-2 pr-3">Gate</th><th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {reportData.map((p: any) => (
                      <tr key={p.id} className={`border-b last:border-0 ${!p.is_authorized ? 'bg-red-50' : ''}`}>
                        <td className="py-2 pr-3">{p.student_name}<br/><span className="text-gray-400">{p.admission_number}</span></td>
                        <td className="py-2 pr-3">{p.class_name}</td>
                        <td className="py-2 pr-3">{p.pickup_person_name}<br/><span className="text-gray-400">{p.pickup_person_relationship}</span></td>
                        <td className="py-2 pr-3">{fmtDT(p.pickup_time)}</td>
                        <td className="py-2 pr-3">{p.gate}</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded-full font-medium ${p.is_authorized ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_authorized ? 'Auth' : 'Unverified'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
