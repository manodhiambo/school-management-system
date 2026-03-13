import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { Heart, Plus, AlertTriangle } from 'lucide-react';

const RECORD_TYPES = [
  'general_checkup','illness','injury','vaccination','vision',
  'dental','hearing','mental_health','allergy_reaction','emergency','other',
];
const TYPE_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  illness: 'bg-orange-100 text-orange-800',
  injury: 'bg-yellow-100 text-yellow-800',
  vaccination: 'bg-green-100 text-green-800',
  general_checkup: 'bg-blue-100 text-blue-800',
};
function fmtLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }

export function HealthPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ record_type: '', from: '', to: '' });
  const [form, setForm] = useState<any>({
    record_type: 'illness', description: '',
    record_date: new Date().toISOString().split('T')[0],
    is_emergency: false, referred_to_hospital: false,
  });

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.getClasses() });
  const { data: studentsData } = useQuery({
    queryKey: ['students', form.class_id],
    queryFn: () => api.getStudents(form.class_id ? { classId: form.class_id } : undefined),
    enabled: showForm,
  });
  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['health-records', filters],
    queryFn: () => (api as any).getHealthRecords(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => (api as any).createHealthRecord(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      setShowForm(false);
      setForm({ record_type: 'illness', description: '', record_date: new Date().toISOString().split('T')[0], is_emergency: false, referred_to_hospital: false });
    },
  });

  const classes = (classesData as any)?.data || [];
  const students = (studentsData as any)?.data || [];
  const records = (recordsData as any)?.data || [];
  const emergencies = records.filter((r: any) => r.is_emergency);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Health Records</h1>
          <p className="text-sm text-gray-500 mt-1">Track health incidents, vaccinations, and medical history</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-2" /> New Health Record
        </Button>
      </div>

      {emergencies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {emergencies.length} emergency health record(s) on file. Parents have been notified.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{records.length}</p><p className="text-sm text-gray-500 mt-1">Total Records</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-red-600">{emergencies.length}</p><p className="text-sm text-gray-500 mt-1">Emergencies</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-orange-600">{records.filter((r: any) => r.record_type === 'illness').length}</p><p className="text-sm text-gray-500 mt-1">Illnesses</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">{records.filter((r: any) => r.record_type === 'vaccination').length}</p><p className="text-sm text-gray-500 mt-1">Vaccinations</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-rose-200">
          <CardHeader><CardTitle className="text-lg">New Health Record</CardTitle></CardHeader>
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
                <Input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} required />
              </div>
              <div>
                <Label>Record Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.record_type} onChange={e => setForm({ ...form, record_type: e.target.value })}>
                  {RECORD_TYPES.map(t => <option key={t} value={t}>{fmtLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <Label>Attended By</Label>
                <Input value={form.attended_by || ''} onChange={e => setForm({ ...form, attended_by: e.target.value })} placeholder="Nurse / Teacher name" />
              </div>
              <div className="flex items-center gap-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_emergency} onChange={e => setForm({ ...form, is_emergency: e.target.checked })} className="h-4 w-4" />
                  <span className="text-sm text-red-600 font-medium">Emergency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.referred_to_hospital} onChange={e => setForm({ ...form, referred_to_hospital: e.target.checked })} className="h-4 w-4" />
                  <span className="text-sm">Referred to Hospital</span>
                </label>
              </div>
              {form.referred_to_hospital && (
                <div><Label>Hospital Name</Label><Input value={form.hospital_name || ''} onChange={e => setForm({ ...form, hospital_name: e.target.value })} /></div>
              )}
              <div className="md:col-span-2">
                <Label>Description *</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div><Label>Symptoms</Label><textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]" value={form.symptoms || ''} onChange={e => setForm({ ...form, symptoms: e.target.value })} /></div>
              <div><Label>Treatment</Label><textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]" value={form.treatment || ''} onChange={e => setForm({ ...form, treatment: e.target.value })} /></div>
              <div><Label>Medication</Label><Input value={form.medication || ''} onChange={e => setForm({ ...form, medication: e.target.value })} /></div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending} className="bg-rose-600 hover:bg-rose-700">
                  {createMutation.isPending ? 'Saving...' : 'Save Record'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Record Type</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.record_type} onChange={e => setFilters({ ...filters, record_type: e.target.value })}>
                <option value="">All Types</option>
                {RECORD_TYPES.map(t => <option key={t} value={t}>{fmtLabel(t)}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">From</Label><Input type="date" className="h-8 mt-1" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" className="h-8 mt-1" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-gray-500">Loading...</div>
            : records.length === 0 ? (
              <div className="p-8 text-center">
                <Heart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No health records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Student','Class','Date','Type','Description','Treatment','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((r: any) => (
                      <tr key={r.id} className={`hover:bg-gray-50 ${r.is_emergency ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">{r.student_name}</td>
                        <td className="px-4 py-3 text-gray-500">{r.class_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(r.record_date).toLocaleDateString('en-KE')}</td>
                        <td className="px-4 py-3">
                          <Badge className={TYPE_COLORS[r.record_type] || 'bg-gray-100 text-gray-700'}>
                            {fmtLabel(r.record_type)}
                          </Badge>
                          {r.is_emergency && <Badge className="ml-1 bg-red-600 text-white text-xs">EMERGENCY</Badge>}
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate text-gray-700">{r.description}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{r.treatment || r.medication || '—'}</td>
                        <td className="px-4 py-3">
                          {r.referred_to_hospital
                            ? <Badge className="bg-orange-100 text-orange-800">Referred</Badge>
                            : <Badge className="bg-green-100 text-green-800">Treated</Badge>}
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
