import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import {
  Users, Plus, RefreshCw, BarChart2, Megaphone, ArrowRightCircle, XCircle,
} from 'lucide-react';

type Tab = 'leads' | 'campaigns' | 'reports';

const SOURCES = ['admission_enquiry', 'walk_in', 'website', 'referral', 'social_media', 'phone', 'other'];
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700', contacted: 'bg-blue-100 text-blue-800',
  follow_up: 'bg-yellow-100 text-yellow-800', qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800', lost: 'bg-red-100 text-red-800',
};
const CAMPAIGN_TYPES = ['sms', 'email', 'whatsapp', 'open_day', 'school_tour'];

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label.replace(/_/g, ' ')}</span>;
}

const EMPTY_LEAD_FORM = { source: 'walk_in', applicant_name: '', education_level_interested: '', guardian_name: '', guardian_phone: '', guardian_email: '', notes: '' };
const EMPTY_CAMPAIGN_FORM = { name: '', type: 'sms', message: '', event_date: '' };

export function CRMPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('leads');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ ...EMPTY_LEAD_FORM });

  const [followUp, setFollowUp] = useState({ activity_type: 'call', notes: '', next_follow_up_date: '' });

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ ...EMPTY_CAMPAIGN_FORM });

  const [sources, setSources] = useState<any[]>([]);
  const [conversion, setConversion] = useState<any>(null);
  const [campaignReport, setCampaignReport] = useState<any[]>([]);

  useEffect(() => { loadLeads(); }, [statusFilter]);
  useEffect(() => {
    if (tab === 'campaigns') loadCampaigns();
    if (tab === 'reports') loadReports();
  }, [tab]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res: any = await api.getCrmLeads(statusFilter ? { status: statusFilter } : undefined);
      setLeads(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadCampaigns = async () => {
    try {
      const res: any = await api.getCrmCampaigns();
      setCampaigns(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadReports = async () => {
    try {
      const [sRes, cRes, campRes]: any[] = await Promise.all([
        api.getCrmSourcesReport(), api.getCrmConversionReport(), api.getCrmCampaignsReport(),
      ]);
      setSources(sRes?.data || []);
      setConversion(cRes?.data || null);
      setCampaignReport(campRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createLead = async () => {
    if (!leadForm.applicant_name || !leadForm.guardian_name || !leadForm.guardian_phone) {
      return toast({ title: 'Applicant name, guardian name and phone are required', variant: 'destructive' });
    }
    try {
      await api.createCrmLead(leadForm);
      toast({ title: 'Lead created' });
      setShowLeadForm(false);
      setLeadForm({ ...EMPTY_LEAD_FORM });
      loadLeads();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openLead = async (id: string) => {
    try {
      const res: any = await api.getCrmLead(id);
      setSelected(res?.data);
      setFollowUp({ activity_type: 'call', notes: '', next_follow_up_date: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const res: any = await api.getCrmLead(selected.id);
    setSelected(res?.data);
    loadLeads();
  };

  const submitFollowUp = async () => {
    try {
      await api.logCrmFollowUp(selected.id, followUp);
      toast({ title: 'Follow-up logged' });
      setFollowUp({ activity_type: 'call', notes: '', next_follow_up_date: '' });
      refreshSelected();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const convert = async () => {
    try {
      const res: any = await api.convertCrmLead(selected.id);
      toast({ title: 'Converted', description: 'Application ' + res?.data?.application?.application_number + ' created' });
      refreshSelected();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const markLost = async () => {
    const reason = prompt('Reason lead was lost:') || undefined;
    try {
      await api.markCrmLeadLost(selected.id, reason || '');
      toast({ title: 'Lead marked as lost' });
      refreshSelected();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const createCampaign = async () => {
    if (!campaignForm.name) return toast({ title: 'Campaign name is required', variant: 'destructive' });
    try {
      await api.createCrmCampaign(campaignForm);
      toast({ title: 'Campaign created' });
      setShowCampaignForm(false);
      setCampaignForm({ ...EMPTY_CAMPAIGN_FORM });
      loadCampaigns();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const sendCampaign = async (id: string) => {
    try {
      const res: any = await api.sendCrmCampaign(id);
      toast({ title: res?.message || 'Campaign sent' });
      loadCampaigns();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const TABS = [
    { key: 'leads' as Tab, label: 'Leads', icon: Users },
    { key: 'campaigns' as Tab, label: 'Campaigns', icon: Megaphone },
    { key: 'reports' as Tab, label: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-pink-600" /> School CRM</h1>
        <p className="text-sm text-gray-500 mt-1">Track enquiries, follow up, and convert leads into admission applications</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-pink-600 text-pink-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'leads' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {['', 'new', 'contacted', 'follow_up', 'qualified', 'converted', 'lost'].map(s => (
                  <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {s ? s.replace(/_/g, ' ') : 'All'}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => setShowLeadForm(!showLeadForm)}><Plus className="h-4 w-4 mr-1" /> New Lead</Button>
            </div>

            {showLeadForm && (
              <Card><CardContent className="pt-4 space-y-3">
                <div>
                  <Label>Source</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={leadForm.source} onChange={e => setLeadForm(f => ({ ...f, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <Input placeholder="Applicant name" value={leadForm.applicant_name} onChange={e => setLeadForm(f => ({ ...f, applicant_name: e.target.value }))} />
                <Input placeholder="Grade interested in (optional)" value={leadForm.education_level_interested} onChange={e => setLeadForm(f => ({ ...f, education_level_interested: e.target.value }))} />
                <Input placeholder="Guardian name" value={leadForm.guardian_name} onChange={e => setLeadForm(f => ({ ...f, guardian_name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Guardian phone" value={leadForm.guardian_phone} onChange={e => setLeadForm(f => ({ ...f, guardian_phone: e.target.value }))} />
                  <Input placeholder="Guardian email (optional)" value={leadForm.guardian_email} onChange={e => setLeadForm(f => ({ ...f, guardian_email: e.target.value }))} />
                </div>
                <Input placeholder="Notes" value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createLead}>Save Lead</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowLeadForm(false)}>Cancel</Button>
                </div>
              </CardContent></Card>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-pink-500" /></div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No leads</div>
            ) : (
              <div className="space-y-2">
                {leads.map(l => (
                  <Card key={l.id} className={`cursor-pointer ${selected?.id === l.id ? 'ring-2 ring-pink-400' : ''}`} onClick={() => openLead(l.id)}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{l.applicant_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{l.lead_number} · {l.source.replace(/_/g, ' ')}</p>
                        </div>
                        <Badge label={l.status} color={STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-600'} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            {!selected ? (
              <div className="text-center py-16 text-gray-400 border rounded-lg">Select a lead to review</div>
            ) : (
              <Card><CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selected.applicant_name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{selected.lead_number}</p>
                  </div>
                  <Badge label={selected.status} color={STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-600'} />
                </div>

                <div className="text-sm space-y-1">
                  <p><span className="text-gray-400">Source:</span> {selected.source.replace(/_/g, ' ')}</p>
                  <p><span className="text-gray-400">Grade interested:</span> {selected.education_level_interested || '—'}</p>
                  <p><span className="text-gray-400">Guardian:</span> {selected.guardian_name}</p>
                  <p><span className="text-gray-400">Contact:</span> {selected.guardian_phone} {selected.guardian_email ? `· ${selected.guardian_email}` : ''}</p>
                  {selected.next_follow_up_date && <p><span className="text-gray-400">Next follow-up:</span> {selected.next_follow_up_date.slice(0, 10)}</p>}
                  {selected.notes && <p><span className="text-gray-400">Notes:</span> {selected.notes}</p>}
                </div>

                {selected.status === 'converted' && (
                  <div className="text-sm text-green-700 bg-green-50 rounded p-2">Converted to an admission application.</div>
                )}
                {selected.status === 'lost' && (
                  <div className="text-sm text-red-700 bg-red-50 rounded p-2">Lost: {selected.lost_reason || 'No reason given'}</div>
                )}

                {!['converted', 'lost'].includes(selected.status) && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-600">Log Follow-up</p>
                      <select className="w-full border rounded px-2 py-1.5 text-sm" value={followUp.activity_type} onChange={e => setFollowUp(f => ({ ...f, activity_type: e.target.value }))}>
                        {['call', 'email', 'sms', 'whatsapp', 'meeting', 'note'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Input placeholder="Notes" value={followUp.notes} onChange={e => setFollowUp(f => ({ ...f, notes: e.target.value }))} />
                      <Input type="date" value={followUp.next_follow_up_date} onChange={e => setFollowUp(f => ({ ...f, next_follow_up_date: e.target.value }))} />
                      <Button size="sm" className="w-full" onClick={submitFollowUp}>Log Follow-up</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={convert}><ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Convert to Application</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={markLost}><XCircle className="h-3.5 w-3.5 mr-1" /> Mark Lost</Button>
                    </div>
                  </div>
                )}

                {Array.isArray(selected.activities) && selected.activities.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Activity Timeline</p>
                    <div className="space-y-2">
                      {selected.activities.map((a: any) => (
                        <div key={a.id} className="text-xs border-l-2 border-pink-200 pl-2">
                          <span className="font-medium capitalize">{a.activity_type}</span> — {a.notes || 'No notes'}
                          <div className="text-gray-400">{new Date(a.created_at).toLocaleString()} {a.performed_by_name ? `· ${a.performed_by_name}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent></Card>
            )}
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCampaignForm(!showCampaignForm)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
          </div>
          {showCampaignForm && (
            <Card><CardContent className="pt-4 space-y-3">
              <Input placeholder="Campaign name" value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} />
              <select className="w-full border rounded px-3 py-2 text-sm" value={campaignForm.type} onChange={e => setCampaignForm(f => ({ ...f, type: e.target.value }))}>
                {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              {['sms', 'email', 'whatsapp'].includes(campaignForm.type) && (
                <Input placeholder="Message" value={campaignForm.message} onChange={e => setCampaignForm(f => ({ ...f, message: e.target.value }))} />
              )}
              <Input type="date" value={campaignForm.event_date} onChange={e => setCampaignForm(f => ({ ...f, event_date: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={createCampaign}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowCampaignForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No campaigns yet</div>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <Card key={c.id}><CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.type.replace(/_/g, ' ')} {c.sent_count > 0 ? `· sent to ${c.sent_count}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={c.status} color={c.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} />
                    {['sms', 'email', 'whatsapp'].includes(c.type) && c.status === 'draft' && (
                      <Button size="sm" onClick={() => sendCampaign(c.id)}>Send</Button>
                    )}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {conversion && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold">{conversion.total}</p><p className="text-xs text-gray-400">Total Leads</p></CardContent></Card>
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-green-600">{conversion.converted}</p><p className="text-xs text-gray-400">Converted</p></CardContent></Card>
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-red-600">{conversion.lost}</p><p className="text-xs text-gray-400">Lost</p></CardContent></Card>
              <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-pink-600">{conversion.conversion_rate}%</p><p className="text-xs text-gray-400">Conversion Rate</p></CardContent></Card>
            </div>
          )}

          <Card><CardContent className="p-0">
            <div className="px-4 py-3 border-b text-sm font-semibold text-gray-600">Lead Sources</div>
            <table className="w-full text-sm">
              <tbody>
                {sources.length === 0 ? <tr><td className="px-4 py-6 text-center text-gray-400">No leads yet.</td></tr> : sources.map((s: any) => (
                  <tr key={s.source} className="border-b"><td className="px-4 py-2 capitalize">{s.source.replace(/_/g, ' ')}</td><td className="px-4 py-2 text-right">{s.count}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <div className="px-4 py-3 border-b text-sm font-semibold text-gray-600">Campaign Performance</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Campaign</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Sent</th></tr></thead>
              <tbody>
                {campaignReport.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No campaigns yet.</td></tr> : campaignReport.map((c: any) => (
                  <tr key={c.id} className="border-b"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 capitalize">{c.type.replace(/_/g, ' ')}</td><td className="px-4 py-2 capitalize">{c.status}</td><td className="px-4 py-2">{c.sent_count}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
