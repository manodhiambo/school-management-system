import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  UserCheck, Calendar, Plus, RefreshCw, Filter, CheckCircle,
  XCircle, Users, AlertTriangle
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  absent_teacher_id: '',
  substitute_teacher_id: '',
  class_id: '',
  subject: '',
  date: '',
  period: '',
  reason: '',
};

export function SubstitutePage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dateFilter, setDateFilter] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, tRes, cRes]: any[] = await Promise.all([
        (api as any).getSubstitutes(dateFilter ? { date: dateFilter } : {}),
        api.getTeachers(),
        api.getClasses(),
      ]);
      setSubstitutes(subRes?.data || []);
      setTeachers(tRes?.data || []);
      setClasses(cRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadAvailableTeachers = async (date: string) => {
    if (!date) return;
    setAvailLoading(true);
    try {
      const res: any = await (api as any).getAvailableTeachers(date);
      setAvailable(res?.data || []);
    } catch { setAvailable([]); }
    finally { setAvailLoading(false); }
  };

  const onDateChange = (date: string) => {
    setForm(f => ({ ...f, date }));
    loadAvailableTeachers(date);
  };

  const createSubstitute = async () => {
    setFormError('');
    if (form.absent_teacher_id === form.substitute_teacher_id && form.absent_teacher_id) {
      setFormError('A teacher cannot substitute for themselves.');
      return;
    }
    if (!form.absent_teacher_id || !form.substitute_teacher_id || !form.date) {
      setFormError('Please fill in all required fields.');
      return;
    }
    try {
      await (api as any).createSubstitute({
        absent_teacher: form.absent_teacher_id,
        substitute: form.substitute_teacher_id,
        assignment_date: form.date,
        class_id: form.class_id || null,
        period: form.period || null,
        reason: form.reason || null,
      });
      toast({ title: 'Substitute assignment created' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setAvailable([]);
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await (api as any).updateSubstituteStatus(id, { status });
      toast({ title: `Marked as ${status}` });
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = dateFilter
    ? substitutes.filter(s => (s.assignment_date || s.date) === dateFilter)
    : substitutes;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Substitute Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage substitute teacher assignments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowForm(!showForm); setFormError(''); }}>
            <Plus className="h-4 w-4 mr-2" /> Assign Substitute
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && isAdmin && (
        <Card>
          <CardHeader><CardTitle>New Substitute Assignment</CardTitle></CardHeader>
          <CardContent>
            {formError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded p-3 mb-4 text-sm">
                <AlertTriangle className="h-4 w-4" /> {formError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Absent Teacher <span className="text-red-500">*</span></Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  value={form.absent_teacher_id}
                  onChange={e => setForm(f => ({ ...f, absent_teacher_id: e.target.value }))}>
                  <option value="">Select absent teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.user_id || t.id}>{`${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}</option>)}
                </select>
              </div>
              <div>
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="mt-1" value={form.date} onChange={e => onDateChange(e.target.value)} />
              </div>
              <div>
                <Label>Substitute Teacher <span className="text-red-500">*</span></Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  value={form.substitute_teacher_id}
                  onChange={e => setForm(f => ({ ...f, substitute_teacher_id: e.target.value }))}>
                  <option value="">Select substitute</option>
                  {teachers
                    .filter(t => (t.user_id || t.id) !== form.absent_teacher_id)
                    .map(t => (
                      <option key={t.id} value={t.user_id || t.id}>
                        {`${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
                        {available.find((a: any) => a.id === (t.user_id || t.id)) ? ' ✓ Available' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label>Period <span className="text-red-500">*</span></Label>
                <Input className="mt-1" placeholder="e.g. 1st, 2nd, Morning" value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <Label>Class</Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  value={form.class_id}
                  onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select class (optional)</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input className="mt-1" placeholder="e.g. Mathematics (optional)" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Reason / Notes</Label>
                <textarea className="w-full mt-1 border rounded p-2 text-sm" rows={2}
                  placeholder="Reason for absence or additional notes"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createSubstitute}>Create Assignment</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setFormError(''); setAvailable([]); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Teachers panel */}
      {form.date && available.length > 0 && showForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader><CardTitle className="text-base text-green-800">
            <Users className="inline h-4 w-4 mr-2" />
            Available Teachers on {form.date}
          </CardTitle></CardHeader>
          <CardContent>
            {availLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {available.map((t: any) => (
                  <Badge key={t.id} className="bg-green-100 text-green-800">{t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <Input type="date" className="w-48" value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); }}
          placeholder="Filter by date" />
        {dateFilter && (
          <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>Clear</Button>
        )}
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {dateFilter ? `No substitutions found for ${dateFilter}` : 'No substitute assignments yet'}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Date</th>
                    <th className="text-left py-3 pr-4">Absent Teacher</th>
                    <th className="text-left py-3 pr-4">Substitute</th>
                    <th className="text-left py-3 pr-4">Class</th>
                    <th className="text-left py-3 pr-4">Subject</th>
                    <th className="text-left py-3 pr-4">Period</th>
                    <th className="text-left py-3 pr-4">Status</th>
                    {isAdmin && <th className="text-left py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4">{s.assignment_date || s.date}</td>
                      <td className="py-3 pr-4">{s.absent_teacher_name || '—'}</td>
                      <td className="py-3 pr-4">{s.substitute_name || s.substitute_teacher_name || '—'}</td>
                      <td className="py-3 pr-4">{s.class_name || '—'}</td>
                      <td className="py-3 pr-4">{s.subject_name || s.subject || '—'}</td>
                      <td className="py-3 pr-4">{s.period}</td>
                      <td className="py-3 pr-4">
                        <Badge className={STATUS_COLORS[s.status] || ''}>{s.status}</Badge>
                      </td>
                      {isAdmin && (
                        <td className="py-3">
                          <div className="flex gap-1">
                            {s.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'completed')}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Done
                              </Button>
                            )}
                            {!['completed','cancelled'].includes(s.status) && (
                              <Button size="sm" variant="outline" className="text-red-600"
                                onClick={() => updateStatus(s.id, 'cancelled')}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
