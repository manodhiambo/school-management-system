import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Loader2, Search, CheckSquare, Square, X } from 'lucide-react';
import api from '@/services/api';
import { EDUCATION_LEVELS, getEducationLevelLabel } from '@/utils/cbeGrades';

const GRADE_NUMBERS = Array.from({ length: 13 }, (_, i) => i); // 0 (playgroup) .. 12

const EMPTY_FORM = {
  name: '',
  description: '',
  is_dynamic: true,
  education_level: '',
  grade_number: '',
  student_type: '',
  gender: '',
  special_needs: '', // '' = any, 'true' / 'false'
  class_id: '',
};

function criteriaFromForm(f: typeof EMPTY_FORM) {
  const criteria: Record<string, any> = {};
  if (f.education_level) criteria.education_level = f.education_level;
  if (f.grade_number !== '') criteria.grade_number = parseInt(f.grade_number, 10);
  if (f.student_type) criteria.student_type = f.student_type;
  if (f.gender) criteria.gender = f.gender;
  if (f.special_needs !== '') criteria.special_needs = f.special_needs === 'true';
  if (f.class_id) criteria.class_id = f.class_id;
  return criteria;
}

function criteriaSummary(criteria: Record<string, any> | null | undefined, classes: any[]) {
  if (!criteria) return [];
  const chips: string[] = [];
  if (criteria.education_level) chips.push(getEducationLevelLabel(criteria.education_level));
  if (criteria.grade_number !== undefined && criteria.grade_number !== null) {
    chips.push(criteria.grade_number === 0 ? 'Playgroup (grade 0)' : `Grade ${criteria.grade_number}`);
  }
  if (criteria.student_type) chips.push(criteria.student_type === 'boarder' ? 'Boarders' : 'Day Scholars');
  if (criteria.gender) chips.push(criteria.gender === 'male' ? 'Male' : 'Female');
  if (criteria.special_needs !== undefined) chips.push(criteria.special_needs ? 'Special Needs' : 'No Special Needs');
  if (criteria.class_id) {
    const cls = classes.find((c: any) => c.id === criteria.class_id);
    chips.push(cls ? `Class: ${cls.name}${cls.section ? ' ' + cls.section : ''}` : 'Specific class');
  }
  return chips;
}

export function StudentCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Members modal
  const [membersFor, setMembersFor] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [addingMembers, setAddingMembers] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, classRes]: any = await Promise.all([
        api.getStudentCategories(),
        api.getClasses(),
      ]);
      setCategories(catRes?.data || []);
      setClasses(classRes?.data || []);
    } catch (error) {
      console.error('Error loading student categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setPreviewCount(null);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ ...EMPTY_FORM });
    setPreviewCount(null);
  };

  const handlePreview = async () => {
    if (!formData.is_dynamic) return;
    setPreviewing(true);
    try {
      const res: any = await api.previewStudentCategory(criteriaFromForm(formData));
      setPreviewCount(res?.data?.count ?? 0);
    } catch (error: any) {
      alert(error.message || 'Failed to preview category');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        is_dynamic: formData.is_dynamic,
        criteria: formData.is_dynamic ? criteriaFromForm(formData) : {},
      };
      if (editingCategory) {
        await api.updateStudentCategory(editingCategory.id, payload);
      } else {
        await api.createStudentCategory(payload);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: any) => {
    const c = cat.criteria || {};
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      is_dynamic: cat.is_dynamic ?? true,
      education_level: c.education_level || '',
      grade_number: c.grade_number !== undefined && c.grade_number !== null ? String(c.grade_number) : '',
      student_type: c.student_type || '',
      gender: c.gender || '',
      special_needs: c.special_needs !== undefined ? String(c.special_needs) : '',
      class_id: c.class_id || '',
    });
    setPreviewCount(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student category? Reports using it will no longer be able to filter by it.')) return;
    try {
      await api.deleteStudentCategory(id);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete category');
    }
  };

  const openMembers = async (cat: any) => {
    setMembersFor(cat);
    setSelectedToAdd(new Set());
    setStudentSearch('');
    setMembersLoading(true);
    try {
      const [memRes, studRes]: any = await Promise.all([
        api.getStudentCategoryMembers(cat.id),
        api.getStudentsSummary(),
      ]);
      setMembers(memRes?.data || []);
      setAllStudents(studRes?.data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const toggleStudentToAdd = (id: string) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredStudents = allStudents.filter((s: any) => {
    if (members.some(m => m.id === s.id)) return false;
    if (!studentSearch) return true;
    return `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase());
  });

  const toggleAllToAdd = () => {
    setSelectedToAdd(prev =>
      prev.size === filteredStudents.length
        ? new Set()
        : new Set(filteredStudents.map((s: any) => s.id))
    );
  };

  const addSelectedMembers = async () => {
    if (!membersFor || !selectedToAdd.size) return;
    setAddingMembers(true);
    try {
      await api.addStudentCategoryMembers(membersFor.id, Array.from(selectedToAdd));
      await openMembers(membersFor);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to add students');
    } finally {
      setAddingMembers(false);
    }
  };

  const removeMember = async (studentId: string) => {
    if (!membersFor) return;
    try {
      await api.removeStudentCategoryMember(membersFor.id, studentId);
      await openMembers(membersFor);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to remove student');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Student Categories</h2>
          <p className="text-gray-500">
            Define reusable student groupings (e.g. "Grade 9", "Special Needs") to filter Financial Reports
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No student categories yet.</p>
              <p className="text-sm text-gray-400 mt-1">Create one to filter fee reports by a custom student group.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Criteria</th>
                    <th className="text-center px-4 py-3 font-medium">Members</th>
                    <th className="text-center px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((cat: any) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cat.is_dynamic ? 'default' : 'secondary'}>
                          {cat.is_dynamic ? 'Dynamic' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {criteriaSummary(cat.criteria, classes).map((chip, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{chip}</span>
                          ))}
                          {!cat.is_dynamic && <span className="text-xs text-gray-400 italic">Hand-picked list</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openMembers(cat)} className="text-blue-600 hover:underline text-sm">
                          {cat.member_count ?? 0} students
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(cat)} className="text-gray-500 hover:text-blue-600" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="text-gray-500 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Student Category' : 'New Student Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Grade 9 or Special Needs" required />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Optional" />
              </div>

              <div>
                <Label>Category Type</Label>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => handleChange('is_dynamic', true)}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      formData.is_dynamic ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}>
                    Dynamic (rule-based)
                  </button>
                  <button type="button" onClick={() => handleChange('is_dynamic', false)}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      !formData.is_dynamic ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}>
                    Manual (hand-picked list)
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formData.is_dynamic
                    ? 'Membership is computed automatically from the rules below (e.g. every student in Grade 9).'
                    : 'Add specific students to this category after saving it.'}
                </p>
              </div>

              {formData.is_dynamic && (
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Education Level</Label>
                      <Select value={formData.education_level} onChange={e => handleChange('education_level', e.target.value)}>
                        <option value="">Any</option>
                        {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Grade</Label>
                      <Select value={formData.grade_number} onChange={e => handleChange('grade_number', e.target.value)}>
                        <option value="">Any</option>
                        {GRADE_NUMBERS.map(n => <option key={n} value={n}>{n === 0 ? 'Playgroup' : `Grade ${n}`}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Student Type</Label>
                      <Select value={formData.student_type} onChange={e => handleChange('student_type', e.target.value)}>
                        <option value="">Any</option>
                        <option value="day_scholar">Day Scholar</option>
                        <option value="boarder">Boarder</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Gender</Label>
                      <Select value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                        <option value="">Any</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Special Needs</Label>
                      <Select value={formData.special_needs} onChange={e => handleChange('special_needs', e.target.value)}>
                        <option value="">Any</option>
                        <option value="true">Special needs only</option>
                        <option value="false">No special needs</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Specific Class</Label>
                      <Select value={formData.class_id} onChange={e => handleChange('class_id', e.target.value)}>
                        <option value="">Any</option>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
                      {previewing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                      Preview match count
                    </Button>
                    {previewCount !== null && (
                      <span className="text-sm text-gray-600">Matches <strong>{previewCount}</strong> students</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={!!membersFor} onOpenChange={(open) => { if (!open) setMembersFor(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Members of "{membersFor?.name}"</DialogTitle>
          </DialogHeader>
          {membersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Current members ({members.length})</p>
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No students match this category yet.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y border rounded-lg">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{m.first_name} {m.last_name}</span>
                          <span className="text-gray-400 ml-2">{m.admission_number}</span>
                          {m.class_name && <span className="text-gray-400 ml-2">· {m.class_name}</span>}
                          {m.is_manual && <Badge variant="secondary" className="ml-2 text-xs">Manually added</Badge>}
                        </div>
                        {m.is_manual && (
                          <button onClick={() => removeMember(m.id)} className="text-gray-400 hover:text-red-600">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Add students manually</p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-8" placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                </div>
                <button type="button" onClick={toggleAllToAdd} className="flex items-center gap-1.5 text-xs text-blue-600 mb-2">
                  {selectedToAdd.size === filteredStudents.length && filteredStudents.length > 0
                    ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  Select all ({filteredStudents.length})
                </button>
                <div className="max-h-56 overflow-y-auto divide-y border rounded-lg">
                  {filteredStudents.map((s: any) => (
                    <div key={s.id} onClick={() => toggleStudentToAdd(s.id)}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      {selectedToAdd.has(s.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="text-gray-400">{s.admission_number}</span>
                      {s.class_name && <span className="text-gray-400">· {s.class_name}</span>}
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-sm text-gray-400 italic px-3 py-4">No matching students.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMembersFor(null)}>Close</Button>
            <Button type="button" onClick={addSelectedMembers} disabled={!selectedToAdd.size || addingMembers}>
              {addingMembers ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Add {selectedToAdd.size || ''} Student{selectedToAdd.size === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentCategoriesPage;
