import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { AlertTriangle, Plus, CheckCircle, X } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-blue-100 text-blue-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  serious: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const INCIDENT_TYPES = [
  'absenteeism','lateness','bullying','fighting','vandalism',
  'cheating','insubordination','substance_abuse','theft','cyberbullying','dress_code','other',
];
const ACTION_TYPES = [
  'verbal_warning','written_warning','detention','suspension',
  'parent_meeting','counseling','expulsion','other',
];

function fmtLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }

export function DisciplinePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ class_id: '', is_resolved: '', from: '', to: '' });
  const [form, setForm] = useState<any>({
    incident_type: 'other', severity: 'minor', description: '',
    action_taken: '', incident_date: new Date().toISOString().split('T')[0],
  });

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.getClasses() });
  const { data: studentsData } = useQuery({
    queryKey: ['students', form.class_id],
    queryFn: () => api.getStudents(form.class_id ? { classId: form.class_id } : undefined),
    enabled: showForm,
  });
  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ['discipline', filters],
    queryFn: () => (api as any).getDisciplineIncidents(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => (api as any).createDisciplineIncident(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discipline'] });
      setShowForm(false);
      setForm({ incident_type: 'other', severity: 'minor', description: '', action_taken: '', incident_date: new Date().toISOString().split('T')[0] });
    },
  });

  const classes = (classesData as any)?.data || [];
  const students = (studentsData as any)?.data || [];
  const incidents = (incidentsData as any)?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discipline Management</h1>
          <p className="text-sm text-gray-500 mt-1">Record and track student discipline incidents</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" /> Record Incident
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['minor','moderate','serious','critical'] as const).map(sev => (
          <Card key={sev}>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{incidents.filter((i: any) => i.severity === sev).length}</p>
              <Badge className={`${SEVERITY_COLORS[sev]} mt-1 capitalize`}>{sev}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-lg text-red-700">Record Discipline Incident</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Class</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.class_id || ''} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">Select class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Student *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.student_id || ''} onChange={e => setForm({ ...form, student_id: e.target.value })} required>
                  <option value="">Select student</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.incident_date}
                  onChange={e => setForm({ ...form, incident_date: e.target.value })} required />
              </div>
              <div>
                <Label>Incident Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })}>
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{fmtLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <Label>Severity *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="serious">Serious</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <Label>Action Taken</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })}>
                  <option value="">Select action</option>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{fmtLabel(t)}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description *</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the incident in detail..." required />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Classroom 4A, Playground" />
              </div>
              {form.action_taken === 'suspension' && (
                <>
                  <div><Label>Suspension Days</Label><Input type="number" value={form.suspension_days || ''}
                    onChange={e => setForm({ ...form, suspension_days: e.target.value })} /></div>
                  <div><Label>Suspension Start</Label><Input type="date" value={form.suspension_start || ''}
                    onChange={e => setForm({ ...form, suspension_start: e.target.value })} /></div>
                  <div><Label>Suspension End</Label><Input type="date" value={form.suspension_end || ''}
                    onChange={e => setForm({ ...form, suspension_end: e.target.value })} /></div>
                </>
              )}
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700">
                  {createMutation.isPending ? 'Saving...' : 'Record Incident'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
              {(createMutation as any).isError && (
                <p className="md:col-span-3 text-sm text-red-600">Failed to record incident. Please try again.</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Class</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.class_id} onChange={e => setFilters({ ...filters, class_id: e.target.value })}>
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.is_resolved} onChange={e => setFilters({ ...filters, is_resolved: e.target.value })}>
                <option value="">All</option>
                <option value="false">Open</option>
                <option value="true">Resolved</option>
              </select>
            </div>
            <div><Label className="text-xs">From</Label><Input className="h-8 mt-1" type="date" value={filters.from}
              onChange={e => setFilters({ ...filters, from: e.target.value })} /></div>
            <div><Label className="text-xs">To</Label><Input className="h-8 mt-1" type="date" value={filters.to}
              onChange={e => setFilters({ ...filters, to: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-2" />
              <p className="text-gray-500">No discipline incidents found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Student','Class','Date','Type','Severity','Action','Status','Parent Notified'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incidents.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{inc.student_name}</td>
                      <td className="px-4 py-3 text-gray-500">{inc.class_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(inc.incident_date).toLocaleDateString('en-KE')}</td>
                      <td className="px-4 py-3 capitalize">{inc.incident_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge className={SEVERITY_COLORS[inc.severity] || ''}>{inc.severity}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{inc.action_taken?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-4 py-3">
                        {inc.is_resolved
                          ? <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                          : <Badge variant="outline" className="text-orange-700 border-orange-300">Open</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {inc.parent_notified
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <X className="h-4 w-4 text-red-400" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
