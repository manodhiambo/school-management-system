import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { Plus, ClipboardList, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'compassionate', label: 'Compassionate Leave' },
  { value: 'permission', label: 'Permission/Half-day' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const COVER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  reason: '',
  covering_staff_id: '',
};

export function StaffLeavePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({ status: 'approved', reviewer_comment: '' });
  const [statusFilter, setStatusFilter] = useState('');

  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['staff-leave', statusFilter],
    queryFn: () => api.getStaffLeaveRequests(statusFilter ? { status: statusFilter } : {}),
  });
  const requests: any[] = (requestsData as any)?.data || [];

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-for-cover'],
    queryFn: () => api.getTeachers(),
  });
  const colleagues: any[] = ((teachersData as any)?.data || []).filter((t: any) => t.user_id !== user?.id);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createStaffLeaveRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-leave'] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: 'Request submitted', description: 'Your leave request has been sent to your covering colleague and for review.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message || 'Failed to submit request', variant: 'destructive' }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.reviewStaffLeaveRequest(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-leave'] });
      setReviewId(null);
      toast({ title: 'Done', description: `Request ${reviewData.status}` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelStaffLeaveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-leave'] });
      toast({ title: 'Cancelled', description: 'Leave request cancelled.' });
    },
  });

  const coverResponseMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => api.respondToLeaveCoverRequest(id, { status }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['staff-leave'] });
      toast({ title: vars.status === 'accepted' ? 'Cover accepted' : 'Cover declined', description: vars.status === 'accepted' ? 'You have agreed to cover for your colleague.' : 'Your colleague will need to pick someone else.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ id, covering_staff_id }: { id: string; covering_staff_id: string }) => api.reassignLeaveCover(id, { covering_staff_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-leave'] });
      setReassignId(null);
      setReassignTo('');
      toast({ title: 'Colleague reassigned', description: 'A new cover request has been sent.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Leave & Permission Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Submit and manage staff leave applications</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-gray-500">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Submit Form */}
      {showForm && !isAdmin && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle className="text-lg">New Leave / Permission Request</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Leave Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} required>
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div></div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>Reason *</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  required placeholder="Please provide details for your leave request..." />
              </div>
              <div className="md:col-span-2">
                <Label>Colleague to Cover for You *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.covering_staff_id} onChange={e => setForm({ ...form, covering_staff_id: e.target.value })} required>
                  <option value="">— Select a colleague —</option>
                  {colleagues.map((c: any) => (
                    <option key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">They'll be asked to accept or decline before your leave can be reviewed. You can't apply without naming someone to take your place.</p>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending || !form.covering_staff_id}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin can submit for any staff */}
      {showForm && isAdmin && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle className="text-lg">New Leave Request</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Leave Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} required>
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div></div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>Reason *</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  required placeholder="Reason for leave..." />
              </div>
              <div className="md:col-span-2">
                <Label>Colleague to Cover *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.covering_staff_id} onChange={e => setForm({ ...form, covering_staff_id: e.target.value })} required>
                  <option value="">— Select a colleague —</option>
                  {colleagues.map((c: any) => (
                    <option key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">A leave request cannot be submitted without a covering colleague.</p>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending || !form.covering_staff_id}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Filter by status:</Label>
        {['', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="ml-auto">
            <Plus className="h-3 w-3 mr-1" /> Add Request
          </Button>
        )}
      </div>

      {/* Review modal */}
      {reviewId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-4">Review Leave Request</h3>
            <div className="space-y-4">
              <div>
                <Label>Decision *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={reviewData.status} onChange={e => setReviewData({ ...reviewData, status: e.target.value })}>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={reviewData.reviewer_comment}
                  onChange={e => setReviewData({ ...reviewData, reviewer_comment: e.target.value })}
                  placeholder="Add a comment for the staff member..." />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setReviewId(null)}>Cancel</Button>
                <Button
                  className={reviewData.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  onClick={() => reviewMutation.mutate({ id: reviewId, data: reviewData })}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? 'Saving...' : reviewData.status === 'approved' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No leave requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Staff</th>}
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Covering</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewer Note</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r: any) => {
                    const isApplicant = r.user_id === user?.id;
                    const isCoveringMe = r.covering_staff_id === user?.id;
                    return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.staff_name || r.staff_email?.split('@')[0]}</div>
                          <div className="text-xs text-gray-500 capitalize">{r.staff_role}</div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {LEAVE_TYPES.find(t => t.value === r.leave_type)?.label || r.leave_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{new Date(r.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{new Date(r.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">{r.days_requested}</td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="truncate block text-gray-600">{r.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{r.covering_name || r.covering_email?.split('@')[0] || '—'}</div>
                        <Badge className={`${COVER_STATUS_COLORS[r.cover_status] || 'bg-gray-100'} text-xs mt-0.5`}>
                          {r.cover_status === 'accepted' ? <CheckCircle className="h-3 w-3 mr-1 inline" /> :
                           r.cover_status === 'declined' ? <XCircle className="h-3 w-3 mr-1 inline" /> :
                           <Clock className="h-3 w-3 mr-1 inline" />}
                          {r.cover_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[r.status] || 'bg-gray-100'}>
                          {r.status === 'pending' ? <Clock className="h-3 w-3 mr-1 inline" /> :
                           r.status === 'approved' ? <CheckCircle className="h-3 w-3 mr-1 inline" /> :
                           r.status === 'rejected' ? <XCircle className="h-3 w-3 mr-1 inline" /> : null}
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[140px]">
                        <span className="truncate block text-xs">{r.reviewer_comment || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {isAdmin && r.status === 'pending' && (
                            <button
                              onClick={() => { setReviewId(r.id); setReviewData({ status: 'approved', reviewer_comment: '' }); }}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              Review
                            </button>
                          )}
                          {isApplicant && r.status === 'pending' && (
                            <button
                              onClick={() => cancelMutation.mutate(r.id)}
                              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          )}
                          {isCoveringMe && r.cover_status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => coverResponseMutation.mutate({ id: r.id, status: 'accepted' })}
                                disabled={coverResponseMutation.isPending}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center gap-1"
                              >
                                <UserCheck className="h-3 w-3" /> Accept
                              </button>
                              <button
                                onClick={() => coverResponseMutation.mutate({ id: r.id, status: 'declined' })}
                                disabled={coverResponseMutation.isPending}
                                className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          {isApplicant && r.status === 'pending' && r.cover_status === 'declined' && (
                            reassignId === r.id ? (
                              <div className="flex gap-1 items-center">
                                <select className="border rounded text-xs px-1 py-1"
                                  value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                                  <option value="">— Select —</option>
                                  {colleagues.map((c: any) => (
                                    <option key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => reassignTo && reassignMutation.mutate({ id: r.id, covering_staff_id: reassignTo })}
                                  disabled={!reassignTo || reassignMutation.isPending}
                                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                >
                                  Send
                                </button>
                                <button
                                  onClick={() => { setReassignId(null); setReassignTo(''); }}
                                  className="text-xs px-1 text-gray-400 hover:text-gray-600"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setReassignId(r.id); setReassignTo(''); }}
                                className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                              >
                                Pick another colleague
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
