import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import {
  GraduationCap, Users, FileText, BarChart2,
  Plus, X, AlertTriangle, CheckCircle, XCircle,
  Clock, DollarSign, RefreshCw
} from 'lucide-react';

type Tab = 'funders' | 'bursaries' | 'applications' | 'stats';
type AppStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

const FUNDER_TYPES = ['government', 'cdf', 'ngo', 'private', 'church', 'other'];

function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disbursed: 'bg-blue-100 text-blue-700',
  };
  const icons: Record<AppStatus, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    disbursed: <DollarSign className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status]} {status}
    </span>
  );
}

export function BursaryPage() {
  const [tab, setTab] = useState<Tab>('funders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Funders
  const [funders, setFunders] = useState<any[]>([]);
  const [funderModal, setFunderModal] = useState(false);
  const [funderForm, setFunderForm] = useState({ name: '', type: 'government', contact: '', phone: '', email: '' });

  // Bursaries
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [bursaryModal, setBursaryModal] = useState(false);
  const [editBursary, setEditBursary] = useState<any>(null);
  const [bursaryForm, setBursaryForm] = useState({ funder_id: '', academic_year: '', amount: '', deadline: '' });

  // Applications
  const [applications, setApplications] = useState<any[]>([]);
  const [appFilter, setAppFilter] = useState<string>('all');
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', amount_awarded: '', notes: '' });

  // Stats
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadFunders();
  }, []);

  useEffect(() => {
    if (tab === 'bursaries') loadBursaries();
    if (tab === 'applications') loadApplications();
    if (tab === 'stats') loadStats();
  }, [tab]);

  const loadFunders = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getBursaryFunders();
      setFunders(res?.data || []);
    } catch { setError('Failed to load funders'); }
    setLoading(false);
  };

  const loadBursaries = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getBursaries();
      setBursaries(res?.data || []);
    } catch { setError('Failed to load bursaries'); }
    setLoading(false);
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getBursaryApplications(appFilter !== 'all' ? { status: appFilter } : undefined);
      setApplications(res?.data || []);
    } catch { setError('Failed to load applications'); }
    setLoading(false);
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getBursaryStats();
      setStats(res?.data || null);
    } catch { setError('Failed to load stats'); }
    setLoading(false);
  };

  const saveFunder = async () => {
    try {
      await (api as any).createBursaryFunder(funderForm);
      setFunderModal(false);
      setFunderForm({ name: '', type: 'government', contact: '', phone: '', email: '' });
      loadFunders();
    } catch { setError('Failed to save funder'); }
  };

  const saveBursary = async () => {
    try {
      if (editBursary) {
        await (api as any).updateBursary(editBursary.id, bursaryForm);
      } else {
        await (api as any).createBursary(bursaryForm);
      }
      setBursaryModal(false);
      setEditBursary(null);
      setBursaryForm({ funder_id: '', academic_year: '', amount: '', deadline: '' });
      loadBursaries();
    } catch { setError('Failed to save bursary'); }
  };

  const reviewApplication = async () => {
    if (!selectedApp) return;
    try {
      await (api as any).reviewBursaryApplication(selectedApp.id, reviewForm);
      setReviewModal(false);
      loadApplications();
    } catch { setError('Failed to review application'); }
  };

  const disburse = async (id: string) => {
    if (!confirm('Disburse this bursary?')) return;
    try {
      await (api as any).disburseBursary(id);
      loadApplications();
    } catch { setError('Disbursement failed'); }
  };

  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);

  const TABS = [
    { id: 'funders', label: 'Funders', icon: Users },
    { id: 'bursaries', label: 'Bursaries', icon: GraduationCap },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-indigo-600" /> Bursary Management
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Funders */}
      {tab === 'funders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Organizations that fund bursaries.</p>
            <Button size="sm" onClick={() => setFunderModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Funder
            </Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {funders.length === 0 && <p className="text-gray-400 col-span-3 text-center py-8">No funders yet.</p>}
              {funders.map((f: any) => (
                <Card key={f.id}>
                  <CardContent className="pt-4 space-y-1">
                    <p className="font-bold text-gray-800">{f.name}</p>
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded capitalize">{f.type}</span>
                    {f.contact && <p className="text-sm text-gray-600">{f.contact}</p>}
                    {f.phone && <p className="text-sm text-gray-500">{f.phone}</p>}
                    {f.email && <p className="text-sm text-gray-500">{f.email}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bursaries */}
      {tab === 'bursaries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Available bursary funds.</p>
            <Button size="sm" onClick={() => { setEditBursary(null); setBursaryForm({ funder_id: '', academic_year: '', amount: '', deadline: '' }); setBursaryModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Bursary
            </Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Funder</th>
                      <th className="px-4 py-2">Acad. Year</th>
                      <th className="px-4 py-2">Amount (KES)</th>
                      <th className="px-4 py-2">Deadline</th>
                      <th className="px-4 py-2">Applications</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bursaries.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No bursaries yet.</td></tr>
                    ) : bursaries.map((b: any) => (
                      <tr key={b.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{b.funder_name || b.funder_id}</td>
                        <td className="px-4 py-2">{b.academic_year}</td>
                        <td className="px-4 py-2 font-bold text-green-700">{Number(b.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{b.deadline?.split('T')[0] || '-'}</td>
                        <td className="px-4 py-2">{b.application_count || 0}</td>
                        <td className="px-4 py-2">
                          <button className="text-blue-600 text-xs hover:underline" onClick={() => {
                            setEditBursary(b);
                            setBursaryForm({ funder_id: b.funder_id, academic_year: b.academic_year, amount: b.amount, deadline: b.deadline?.split('T')[0] || '' });
                            setBursaryModal(true);
                          }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Applications */}
      {tab === 'applications' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Label className="mr-1">Filter:</Label>
            {['all', 'pending', 'approved', 'rejected', 'disbursed'].map(s => (
              <button key={s} onClick={() => { setAppFilter(s); loadApplications(); }}
                className={`px-3 py-1 rounded text-xs font-medium capitalize ${appFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
            <Button variant="outline" size="sm" className="ml-auto" onClick={loadApplications}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Student</th>
                      <th className="px-4 py-2">Bursary</th>
                      <th className="px-4 py-2">Requested (KES)</th>
                      <th className="px-4 py-2">Awarded (KES)</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No applications found.</td></tr>
                    ) : filteredApps.map((a: any) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{a.student_name}</td>
                        <td className="px-4 py-2">{a.bursary_name || '-'}</td>
                        <td className="px-4 py-2">{Number(a.requested_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{a.amount_awarded ? Number(a.amount_awarded).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-2 flex gap-2">
                          {(a.status === 'pending') && (
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedApp(a);
                              setReviewForm({ status: 'approved', amount_awarded: a.requested_amount || '', notes: '' });
                              setReviewModal(true);
                            }}>Review</Button>
                          )}
                          {a.status === 'approved' && (
                            <Button size="sm" onClick={() => disburse(a.id)}>
                              <DollarSign className="h-3 w-3 mr-1" /> Disburse
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div className="space-y-6">
          {loading ? <p className="text-gray-500">Loading...</p> : stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Total Disbursed</p>
                    <p className="text-2xl font-bold text-green-600">KES {Number(stats.total_disbursed || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Pending Applications</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending_count || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Total Applications</p>
                    <p className="text-2xl font-bold text-indigo-600">{stats.total_applications || 0}</p>
                  </CardContent>
                </Card>
              </div>
              {stats.by_funder && stats.by_funder.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>By Funder</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {stats.by_funder.map((f: any) => {
                      const maxAmount = Math.max(...stats.by_funder.map((x: any) => Number(x.total || 0)));
                      return (
                        <div key={f.funder_name} className="flex items-center gap-3">
                          <span className="w-36 text-sm text-gray-600 truncate">{f.funder_name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                              className="h-5 bg-indigo-500 rounded-full"
                              style={{ width: `${maxAmount ? (Number(f.total) / maxAmount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">KES {Number(f.total || 0).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-gray-400">No stats available.</p>
          )}
        </div>
      )}

      {/* Add Funder Modal */}
      {funderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Funder</h2>
              <button onClick={() => setFunderModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={funderForm.name} onChange={e => setFunderForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>Type</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={funderForm.type} onChange={e => setFunderForm(f => ({ ...f, type: e.target.value }))}>
                  {FUNDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Contact Person</Label><Input value={funderForm.contact} onChange={e => setFunderForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={funderForm.phone} onChange={e => setFunderForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={funderForm.email} onChange={e => setFunderForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFunderModal(false)}>Cancel</Button>
              <Button onClick={saveFunder}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bursary Modal */}
      {bursaryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editBursary ? 'Edit Bursary' : 'Add Bursary'}</h2>
              <button onClick={() => setBursaryModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Funder</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={bursaryForm.funder_id} onChange={e => setBursaryForm(f => ({ ...f, funder_id: e.target.value }))}>
                  <option value="">Select funder</option>
                  {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div><Label>Academic Year</Label><Input placeholder="2024/2025" value={bursaryForm.academic_year} onChange={e => setBursaryForm(f => ({ ...f, academic_year: e.target.value }))} /></div>
              <div><Label>Amount (KES)</Label><Input type="number" value={bursaryForm.amount} onChange={e => setBursaryForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Application Deadline</Label><Input type="date" value={bursaryForm.deadline} onChange={e => setBursaryForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBursaryModal(false)}>Cancel</Button>
              <Button onClick={saveBursary}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Review Application — {selectedApp.student_name}</h2>
              <button onClick={() => setReviewModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Requested: <strong>KES {Number(selectedApp.requested_amount || 0).toLocaleString()}</strong></p>
              <div>
                <Label>Decision</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              {reviewForm.status === 'approved' && (
                <div><Label>Amount Awarded (KES)</Label><Input type="number" value={reviewForm.amount_awarded} onChange={e => setReviewForm(f => ({ ...f, amount_awarded: e.target.value }))} /></div>
              )}
              <div><Label>Notes</Label><textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={reviewForm.notes} onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewModal(false)}>Cancel</Button>
              <Button
                onClick={reviewApplication}
                className={reviewForm.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
