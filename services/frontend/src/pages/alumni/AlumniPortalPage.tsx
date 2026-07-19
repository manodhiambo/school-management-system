import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { GraduationCap, Users, Calendar, Briefcase, Heart, Plus, MapPin } from 'lucide-react';

type Tab = 'profile' | 'directory' | 'events' | 'jobs' | 'donate';

const DONATION_TYPES = [
  { value: 'financial', label: 'Financial Contribution' },
  { value: 'equipment', label: 'Equipment Donation' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'building_project', label: 'Building Project' },
];

export function AlumniPortalPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('profile');

  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ current_occupation: '', employer: '', university: '', business_details: '', phone: '', bio: '', is_mentor: false, is_public: true });
  const [savingProfile, setSavingProfile] = useState(false);

  const [directory, setDirectory] = useState<any[]>([]);
  const [mentorOnly, setMentorOnly] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const [jobs, setJobs] = useState<any[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', contact_info: '' });

  const [donationForm, setDonationForm] = useState({ donation_type: 'financial', amount: '', description: '', phone: '' });
  const [donating, setDonating] = useState(false);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => {
    if (tab === 'directory') loadDirectory();
    if (tab === 'events') loadEvents();
    if (tab === 'jobs') loadJobs();
  }, [tab, mentorOnly]);

  const loadProfile = async () => {
    try {
      const res: any = await api.getMyAlumniProfile();
      const p = res?.data;
      setProfile(p);
      if (p) {
        setProfileForm({
          current_occupation: p.current_occupation || '', employer: p.employer || '', university: p.university || '',
          business_details: p.business_details || '', phone: p.phone || '', bio: p.bio || '',
          is_mentor: !!p.is_mentor, is_public: p.is_public !== false,
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateMyAlumniProfile(profileForm);
      toast({ title: 'Profile updated' });
      loadProfile();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingProfile(false); }
  };

  const loadDirectory = async () => {
    try {
      const res: any = await api.getAlumniDirectory(mentorOnly ? { is_mentor: 'true' } : undefined);
      setDirectory(res?.data || []);
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

  const registerForEvent = async (eventId: string) => {
    try {
      await api.registerForAlumniEvent(eventId);
      toast({ title: 'Registered for event' });
      setRegisteredIds(prev => new Set(prev).add(eventId));
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Already registered', variant: 'destructive' });
      setRegisteredIds(prev => new Set(prev).add(eventId));
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

  const postJob = async () => {
    if (!jobForm.title) return toast({ title: 'Job title is required', variant: 'destructive' });
    try {
      await api.createAlumniJob(jobForm);
      toast({ title: 'Job posted' });
      setShowJobForm(false);
      setJobForm({ title: '', company: '', description: '', contact_info: '' });
      loadJobs();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const submitDonation = async () => {
    if (donationForm.donation_type === 'financial' && (!donationForm.amount || !donationForm.phone)) {
      return toast({ title: 'Amount and phone are required for a financial donation', variant: 'destructive' });
    }
    setDonating(true);
    try {
      const res: any = await api.createAlumniDonation({
        ...donationForm,
        amount: donationForm.amount ? parseFloat(donationForm.amount) : undefined,
      });
      toast({ title: res?.message || 'Thank you for your donation!' });
      setDonationForm({ donation_type: 'financial', amount: '', description: '', phone: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDonating(false); }
  };

  const TABS = [
    { key: 'profile' as Tab, label: 'My Profile', icon: GraduationCap },
    { key: 'directory' as Tab, label: 'Directory', icon: Users },
    { key: 'events' as Tab, label: 'Events', icon: Calendar },
    { key: 'jobs' as Tab, label: 'Jobs', icon: Briefcase },
    { key: 'donate' as Tab, label: 'Donate', icon: Heart },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-indigo-600" /> Alumni Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Update your profile, connect with fellow alumni, and give back</p>
      </div>

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

      {tab === 'profile' && (
        <Card><CardContent className="pt-6 space-y-4 max-w-lg">
          {profile && (
            <div>
              <p className="font-semibold text-lg">{profile.first_name} {profile.last_name}</p>
              <p className="text-sm text-gray-400">{profile.graduation_year ? `Class of ${profile.graduation_year}` : 'Graduation year not set'}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Occupation</Label><Input value={profileForm.current_occupation} onChange={e => setProfileForm(f => ({ ...f, current_occupation: e.target.value }))} /></div>
            <div><Label>Employer</Label><Input value={profileForm.employer} onChange={e => setProfileForm(f => ({ ...f, employer: e.target.value }))} /></div>
          </div>
          <div><Label>University</Label><Input value={profileForm.university} onChange={e => setProfileForm(f => ({ ...f, university: e.target.value }))} /></div>
          <div><Label>Business Details (optional)</Label><Input value={profileForm.business_details} onChange={e => setProfileForm(f => ({ ...f, business_details: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Bio</Label><Input value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_mentor" checked={profileForm.is_mentor} onChange={e => setProfileForm(f => ({ ...f, is_mentor: e.target.checked }))} />
            <Label htmlFor="is_mentor">Available as a mentor</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_public" checked={profileForm.is_public} onChange={e => setProfileForm(f => ({ ...f, is_public: e.target.checked }))} />
            <Label htmlFor="is_public">Show my profile in the alumni directory</Label>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
        </CardContent></Card>
      )}

      {tab === 'directory' && (
        <div className="space-y-4">
          <button onClick={() => setMentorOnly(!mentorOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${mentorOnly ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Mentors only
          </button>
          {directory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No alumni found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {directory.map((a: any) => (
                <Card key={a.id}><CardContent className="pt-4">
                  <p className="font-semibold">{a.first_name} {a.last_name}</p>
                  <p className="text-xs text-gray-400">{a.graduation_year ? `Class of ${a.graduation_year}` : ''}</p>
                  <p className="text-sm text-gray-600 mt-1">{a.current_occupation}{a.employer ? ` at ${a.employer}` : ''}</p>
                  {a.is_mentor && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Mentor</span>}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No events scheduled</div>
          ) : (
            events.map((e: any) => (
              <Card key={e.id}><CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{e.event_type} · {e.event_date?.slice(0, 10)}{e.venue && <> · <MapPin className="inline h-3 w-3" /> {e.venue}</>}</p>
                </div>
                <Button size="sm" onClick={() => registerForEvent(e.id)} disabled={registeredIds.has(e.id)}>
                  {registeredIds.has(e.id) ? 'Registered' : 'Register'}
                </Button>
              </CardContent></Card>
            ))
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowJobForm(!showJobForm)}><Plus className="h-4 w-4 mr-1" /> Post a Job</Button>
          </div>
          {showJobForm && (
            <Card><CardContent className="pt-4 space-y-3">
              <Input placeholder="Job title" value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Company" value={jobForm.company} onChange={e => setJobForm(f => ({ ...f, company: e.target.value }))} />
              <Input placeholder="Description" value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} />
              <Input placeholder="Contact info (email/phone)" value={jobForm.contact_info} onChange={e => setJobForm(f => ({ ...f, contact_info: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={postJob}>Post</Button>
                <Button size="sm" variant="outline" onClick={() => setShowJobForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No job postings yet</div>
          ) : (
            <div className="space-y-2">
              {jobs.map((j: any) => (
                <Card key={j.id}><CardContent className="py-4">
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-sm text-gray-500">{j.company}</p>
                  {j.description && <p className="text-sm text-gray-600 mt-1">{j.description}</p>}
                  {j.contact_info && <p className="text-xs text-gray-400 mt-1">Contact: {j.contact_info}</p>}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'donate' && (
        <Card><CardContent className="pt-6 space-y-4 max-w-md">
          <div>
            <Label>Donation Type</Label>
            <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={donationForm.donation_type} onChange={e => setDonationForm(f => ({ ...f, donation_type: e.target.value }))}>
              {DONATION_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          {donationForm.donation_type === 'financial' && (
            <>
              <div><Label>Amount (KES)</Label><Input type="number" value={donationForm.amount} onChange={e => setDonationForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>M-Pesa Phone</Label><Input value={donationForm.phone} onChange={e => setDonationForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XXXXXXXX" /></div>
            </>
          )}
          <div><Label>Description</Label><Input value={donationForm.description} onChange={e => setDonationForm(f => ({ ...f, description: e.target.value }))} placeholder={donationForm.donation_type === 'equipment' ? 'e.g. 5 laptops' : 'Details about your donation'} /></div>
          <Button className="w-full" onClick={submitDonation} disabled={donating}>
            <Heart className="h-4 w-4 mr-2" /> {donating ? 'Submitting...' : 'Donate'}
          </Button>
        </CardContent></Card>
      )}
    </div>
  );
}
