import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, PlusCircle, Users, User, Loader2, Search } from 'lucide-react';
import api from '@/services/api';

const EMPTY_FORM = {
  name: '',
  amount: '',
  scope: 'class' as 'class' | 'student',
  class_id: '',
  student_id: '',
  term: '',
  academic_year: '',
  description: '',
};

export function ExtraFeesPage() {
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feesRes, classRes, studRes]: any[] = await Promise.all([
        api.getExtraFees(),
        api.getClasses(),
        api.getStudents().catch(() => ({ data: [] })),
      ]);
      setFees(feesRes?.data || []);
      setClasses(classRes?.data || []);
      setStudents(studRes?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setStudentSearch('');
    setShowModal(true);
  };

  const openEdit = (fee: any) => {
    setEditing(fee);
    setStudentSearch('');
    setForm({
      name: fee.name || '',
      amount: String(fee.amount || ''),
      scope: fee.student_id ? 'student' : 'class',
      class_id: fee.class_id || '',
      student_id: fee.student_id || '',
      term: fee.term || '',
      academic_year: fee.academic_year || '',
      description: fee.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        amount: Number(form.amount),
        class_id: form.scope === 'class' ? (form.class_id || null) : null,
        student_id: form.scope === 'student' ? (form.student_id || null) : null,
        term: form.term || null,
        academic_year: form.academic_year || null,
        description: form.description || null,
      };
      if (editing) {
        await api.updateExtraFee(editing.id, payload);
      } else {
        await api.createExtraFee(payload);
      }
      setShowModal(false);
      loadData();
    } catch (e: any) {
      alert('Error: ' + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this extra fee?')) return;
    await api.deleteExtraFee(id).catch(() => {});
    loadData();
  };

  const handleToggleActive = async (fee: any) => {
    await api.updateExtraFee(fee.id, { is_active: !fee.is_active }).catch(() => {});
    loadData();
  };

  const filtered = fees.filter(f => {
    if (filterClass && f.class_id !== filterClass && !(!f.class_id && !f.student_id)) return false;
    if (filterStudent && f.student_id !== filterStudent) return false;
    return true;
  });

  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extra / Miscellaneous Fees</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define additional named fees per class or individual student — these appear on report cards and add to the total.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Extra Fee
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Filter by class:</Label>
          <select
            className="border rounded-md px-3 py-1.5 text-sm"
            value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setFilterStudent(''); }}
          >
            <option value="">All Classes</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Filter by student:</Label>
          <select
            className="border rounded-md px-3 py-1.5 text-sm"
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
          >
            <option value="">All Students</option>
            {students
              .filter(s => !filterClass || s.class_id === filterClass)
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </option>
              ))}
          </select>
        </div>
        {(filterClass || filterStudent) && (
          <button
            className="text-xs text-blue-600 underline"
            onClick={() => { setFilterClass(''); setFilterStudent(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <PlusCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No extra fees defined yet. Click <strong>Add Extra Fee</strong> to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium">Fee Name</th>
                  <th className="text-left px-4 py-3 font-medium">Amount (KES)</th>
                  <th className="text-left px-4 py-3 font-medium">Applies To</th>
                  <th className="text-left px-4 py-3 font-medium">Term / Year</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(fee => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {fee.name}
                      {fee.description && <p className="text-xs text-gray-400 mt-0.5">{fee.description}</p>}
                    </td>
                    <td className="px-4 py-3">{Number(fee.amount).toLocaleString('en-KE')}</td>
                    <td className="px-4 py-3">
                      {fee.student_id ? (
                        <span className="flex items-center gap-1 text-blue-700">
                          <User className="h-3.5 w-3.5" />
                          {fee.student_name || fee.student_id}
                          {fee.admission_number && <span className="text-gray-400 text-xs">({fee.admission_number})</span>}
                        </span>
                      ) : fee.class_id ? (
                        <span className="flex items-center gap-1 text-purple-700">
                          <Users className="h-3.5 w-3.5" />
                          {fee.class_name || fee.class_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">All Students</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {fee.term ? fee.term.replace('term', 'Term ') : 'All Terms'}
                      {fee.academic_year ? ` · ${fee.academic_year}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(fee)}>
                        <Badge variant={fee.is_active ? 'default' : 'secondary'}>
                          {fee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(fee)} className="text-blue-600 hover:text-blue-800">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(fee.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Extra Fee' : 'Add Extra Fee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Fee Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Examination Fee, Activity Fee"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Scope</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.scope}
                  onChange={e => { setStudentSearch(''); setForm(f => ({ ...f, scope: e.target.value as 'class' | 'student', class_id: '', student_id: '' })); }}
                >
                  <option value="class">By Class</option>
                  <option value="student">Individual Student</option>
                </select>
              </div>

              {form.scope === 'class' ? (
                <div className="col-span-2">
                  <Label>Class</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                    value={form.class_id}
                    onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
                  >
                    <option value="">— Select Class —</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-span-2">
                  <Label>Student</Label>
                  <div className="relative mt-1 mb-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or admission no..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    size={5}
                    value={form.student_id}
                    onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  >
                    <option value="">— Select Student —</option>
                    {filteredStudents.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_number}) — {s.class_name || 'No class'}
                      </option>
                    ))}
                  </select>
                  {studentSearch && filteredStudents.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No students match your search.</p>
                  )}
                </div>
              )}

              <div>
                <Label>Term (optional)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.term}
                  onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                >
                  <option value="">All Terms</option>
                  <option value="term1">Term 1</option>
                  <option value="term2">Term 2</option>
                  <option value="term3">Term 3</option>
                </select>
              </div>
              <div>
                <Label>Academic Year (optional)</Label>
                <Input
                  value={form.academic_year}
                  onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  placeholder="e.g. 2025"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.amount}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
