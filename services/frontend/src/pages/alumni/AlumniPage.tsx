import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { GraduationCap, Users, Calendar, Heart, Briefcase, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

type Tab = 'directory' | 'events' | 'donations' | 'jobs';

export function AlumniPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('directory');
  const [loading, setLoading] = useState(false);

  // Directory
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [showConvert, setShowConvert] = useState(false);
  const [convertStudentId, setConvertStudentId] = useState('');
  const [convertYear, setConvertYear] = useState(String(new Date().getFullYear()));
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [legacyForm, setLegacyForm] = useState({ first_name: '', last_name: '', email: '', graduation_year: '', current_occupation: '', employer: '', university: '' });

  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', event_type: 'reunion', event_date: '', venue: '', description: '' });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);

  // Donations
  const [donations, setDonations] = useState<any[]>([]);
  const [donationsReport, setDonationsReport] = useState<any[]>([]);

  // Jobs
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => { loadDirectory(); }, []);
  useEffect(() => {
    if (tab === 'events') loadEvents();
    if (tab === 'donations') loadDonations();
    if (tab === 'jobs') loadJobs();
  }, [tab]);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, statRes]: any[] = await Promise.all([
        (api as any).getAlumniProfiles(),
        api.getStudents(),
        (api as any).getAlumniDirectoryStats(),
      ]);
      setProfiles(pRes?.data || []);
      setStudents(sRes?.data?.students || sRes?.data || []);
      setStats(statRes?.data || null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const convertStudent = async () => {
    if (!convertStudentId) return toast({ title: 'Select a student', variant: 'destructive' });
    try {
      await (api as any).convertStudentToAlumni(convertStudentId, { graduation_year: parseInt(convertYear) || null, mark_graduated: true });
      toast({ title: 'Student converted to alumni' });
      setShowConvert(false);
      setConvertStudentId('');
      loadDirectory();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createLegacyAlumnus = async () => {
    if (!legacyForm.first_name || !legacyForm.last_name || !legacyForm.email) {
      return toast({ title: 'Name and email are required', variant: 'destructive' });
    }
    try {
      await (api as any).createAlumniProfile({ ...legacyForm, graduation_year: parseInt(legacyForm.graduation_year) || null });
      toast({ title: 'Alumni profile created' });
      setShowLegacyForm(false);
      setLegacyForm({ first_name: '', last_name: '', email: '', graduation_year: '', current_occupation: '', employer: '', university: '' });
      loadDirectory();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadEvents = async () => {
    try {
      const res: any = await (api as any).getAlumniEvents();
      setEvents(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createEvent = async () => {
    if (!eventForm.name) return toast({ title: 'Event name is required', variant: 'destructive' });
    try {
      await (api as any).createAlumniEvent(eventForm);
      toast({ title: 'Event created' });
      setShowEventForm(false);
      setEventForm({ name: '', event_type: 'reunion', event_date: '', venue: '', description: '' });
      loadEvents();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openRegistrations = async (event: any) => {
    setSelectedEvent(event);
    try {
      const res: any = await (api as any).getAlumniEventRegistrations(event.id);
      setRegistrations(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const markAttended = async (alumniId: string) => {
    try {
      await (api as any).markAlumniAttended(selectedEvent.id, alumniId);
      toast({ title: 'Marked attended' });
      openRegistrations(selectedEvent);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadDonations = async () => {
    try {
      const [dRes, rRes]: any[] = await Promise.all([
        (api as any).getAlumniDonations(),
        (api as any).getAlumniDonationsReport(),
      ]);
      setDonations(dRes?.data || []);
      setDonationsReport(rRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const completeDonation = async (id: string) => {
    try {
      await (api as any).completeAlumniDonation(id);
      toast({ title: 'Donation marked completed' });
      loadDonations();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadJobs = async () => {
    try {
      const res: any = await api.getAlumniJobs();
      setJobs(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deactivateJob = async (id: string) => {
    try {
      await (api as any).deactivateAlumniJob(id);
      toast({ title: 'Job posting deactivated' });
      loadJobs();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const TABS = [
    { key: 'directory' as Tab, label: 'Directory', icon: Users },
    { key: 'events' as Tab, label: 'Events', icon: Calendar },
    { key: 'donations' as Tab, label: 'Donations', icon: Heart },
    { key: 'jobs' as Tab, label: 'Jobs', icon: Briefcase },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-indigo-600" /> Alumni Management</h1>
        <p className="text-sm text-gray-500 mt-1">Directory, events, donations and job board for graduated students</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-400">Total Alumni</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-purple-600">{stats.mentors}</p><p className="text-xs text-gray-400">Mentors</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-indigo-600">{stats.graduation_years}</p><p className="text-xs text-gray-400">Graduation Years</p></CardContent></Card>
        </div>
      )}

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'directory' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap justify-end">
            <Button size="sm" variant="outline" onClick={loadDirectory}><RefreshCw className="h-3.5 w-3.5" /></Button>
            <Button size="sm" onClick={() => setShowConvert(!showConvert)}>Convert Student</Button>
            <Button size="sm" variant="outline" onClick={() => setShowLegacyForm(!showLegacyForm)}><Plus className="h-4 w-4 mr-1" /> Add Legacy Alumni</Button>
          </div>

          {showConvert && (
            <Card><CardContent className="pt-4 space-y-3">
              <Label>Student</Label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={convertStudentId} onChange={e => setConvertStudentId(e.target.value)}>
                <option value="">Select a student...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
              </select>
              <Label>Graduation Year</Label>
              <Input type="number" value={convertYear} onChange={e => setConvertYear(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={convertStudent}>Convert</Button>
                <Button size="sm" variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {showLegacyForm && (
            <Card><CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="First name" value={legacyForm.first_name} onChange={e => setLegacyForm(f => ({ ...f, first_name: e.target.value }))} />
                <Input placeholder="Last name" value={legacyForm.last_name} onChange={e => setLegacyForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
              <Input placeholder="Email (login)" value={legacyForm.email} onChange={e => setLegacyForm(f => ({ ...f, email: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Graduation year" value={legacyForm.graduation_year} onChange={e => setLegacyForm(f => ({ ...f, graduation_year: e.target.value }))} />
                <Input placeholder="Occupation" value={legacyForm.current_occupation} onChange={e => setLegacyForm(f => ({ ...f, current_occupation: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Employer" value={legacyForm.employer} onChange={e => setLegacyForm(f => ({ ...f, employer: e.target.value }))} />
                <Input placeholder="University" value={legacyForm.university} onChange={e => setLegacyForm(f => ({ ...f, university: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createLegacyAlumnus}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowLegacyForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-indigo-500" /></div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No alumni yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((a: any) => (
                <Card key={a.id}><CardContent className="pt-4">
                  <p className="font-semibold">{a.first_name} {a.last_name}</p>
                  <p className="text-xs text-gray-400">{a.graduation_year ? `Class of ${a.graduation_year}` : 'Year unset'}</p>
                  <p className="text-sm text-gray-600 mt-1">{a.current_occupation || '—'}{a.employer ? ` at ${a.employer}` : ''}</p>
                  <div className="flex gap-1 mt-2">
                    {a.is_mentor && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Mentor</span>}
                    {!a.is_public && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Private</span>}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowEventForm(!showEventForm)}><Plus className="h-4 w-4 mr-1" /> New Event</Button>
            </div>
            {showEventForm && (
              <Card><CardContent className="pt-4 space-y-3">
                <Input placeholder="Event name" value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} />
                <select className="w-full border rounded px-3 py-2 text-sm" value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}>
                  <option value="reunion">Reunion</option><option value="fundraiser">Fundraiser</option><option value="networking">Networking</option>
                </select>
                <Input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} />
                <Input placeholder="Venue" value={eventForm.venue} onChange={e => setEventForm(f => ({ ...f, venue: e.target.value }))} />
                <Input placeholder="Description" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createEvent}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
                </div>
              </CardContent></Card>
            )}
            {events.map((e: any) => (
              <Card key={e.id} className={`cursor-pointer ${selectedEvent?.id === e.id ? 'ring-2 ring-indigo-400' : ''}`} onClick={() => openRegistrations(e)}>
                <CardContent className="py-3">
                  <p className="font-semibold text-sm">{e.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{e.event_type} · {e.event_date?.slice(0, 10) || 'No date'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            {!selectedEvent ? (
              <div className="text-center py-16 text-gray-400 border rounded-lg">Select an event to view registrations</div>
            ) : (
              <Card><CardContent className="pt-4">
                <h3 className="font-semibold mb-3">{selectedEvent.name} — Registrations</h3>
                {registrations.length === 0 ? (
                  <p className="text-sm text-gray-400">No registrations yet</p>
                ) : (
                  <div className="space-y-2">
                    {registrations.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2">
                        <span>{r.first_name} {r.last_name}</span>
                        {r.attended ? (
                          <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Attended</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => markAttended(r.alumni_id)}>Mark Attended</Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            )}
          </div>
        </div>
      )}

      {tab === 'donations' && (
        <div className="space-y-4">
          <Card><CardContent className="p-0">
            <div className="px-4 py-3 border-b text-sm font-semibold text-gray-600">Donations by Type</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Type</th><th className="px-4 py-2">Count</th><th className="px-4 py-2">Total Completed (KES)</th></tr></thead>
              <tbody>
                {donationsReport.length === 0 ? <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No donations yet.</td></tr> : donationsReport.map((d: any) => (
                  <tr key={d.donation_type} className="border-b"><td className="px-4 py-2 capitalize">{d.donation_type.replace(/_/g, ' ')}</td><td className="px-4 py-2">{d.count}</td><td className="px-4 py-2">{Number(d.total_completed).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>

          {donations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No donations yet</div>
          ) : (
            <div className="space-y-2">
              {donations.map((d: any) => (
                <Card key={d.id}><CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{d.first_name} {d.last_name} — <span className="capitalize">{d.donation_type.replace(/_/g, ' ')}</span></p>
                    <p className="text-xs text-gray-400">{d.description || 'No description'} {d.amount ? `· KES ${Number(d.amount).toLocaleString()}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{d.status}</span>
                    {d.status === 'pledged' && <Button size="sm" onClick={() => completeDonation(d.id)}>Mark Completed</Button>}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No job postings</div>
          ) : (
            jobs.map((j: any) => (
              <Card key={j.id}><CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-sm text-gray-500">{j.company}</p>
                </div>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => deactivateJob(j.id)}>Deactivate</Button>
              </CardContent></Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
