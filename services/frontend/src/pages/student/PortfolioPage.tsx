import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Briefcase, Star, Plus, X, Edit2, Trash2, ExternalLink,
  AlertTriangle, RefreshCw, Search, FileText, Image,
  Video, Music, Code, Award
} from 'lucide-react';

const PORTFOLIO_TYPES = [
  { value: 'project', label: 'Project', icon: FileText },
  { value: 'artwork', label: 'Artwork', icon: Image },
  { value: 'essay', label: 'Essay', icon: FileText },
  { value: 'science', label: 'Science Work', icon: Code },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'certificate', label: 'Certificate', icon: Award },
  { value: 'other', label: 'Other', icon: Briefcase },
];

function TypeBadge({ type }: { type: string }) {
  const t = PORTFOLIO_TYPES.find(p => p.value === type);
  const Icon = t?.icon || Briefcase;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
      <Icon className="h-3 w-3" /> {t?.label || type}
    </span>
  );
}

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export function PortfolioPage() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'superadmin';
  const isParent = user?.role === 'parent';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For non-student roles: student selection
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Portfolio data
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', description: '', type: 'project', file_url: '',
    subject: '', term: 'Term 1', academic_year: '', is_featured: false
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  useEffect(() => {
    if (isStudent) {
      loadPortfolio(user!.id);
    } else {
      loadStudents();
    }
  }, []);

  const loadStudents = async () => {
    try {
      const res: any = await (api as any).getStudents?.();
      setStudents(res?.data || []);
    } catch {}
  };

  const loadPortfolio = async (studentId: string) => {
    setLoading(true);
    try {
      const [itemsRes, summaryRes]: any[] = await Promise.all([
        (api as any).getPortfolioItems(studentId),
        (api as any).getPortfolioSummary(studentId),
      ]);
      setItems(itemsRes?.data || []);
      setSummary(summaryRes?.data || null);
    } catch { setError('Failed to load portfolio'); }
    setLoading(false);
  };

  const selectStudent = (s: any) => {
    setSelectedStudent(s);
    loadPortfolio(s.id);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ title: '', description: '', type: 'project', file_url: '', subject: '', term: 'Term 1', academic_year: '', is_featured: false });
    setAddModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ title: item.title, description: item.description || '', type: item.type, file_url: item.file_url || '', subject: item.subject || '', term: item.term || 'Term 1', academic_year: item.academic_year || '', is_featured: item.is_featured || false });
    setAddModal(true);
  };

  const saveItem = async () => {
    const studentId = isStudent ? user!.id : selectedStudent?.id;
    if (!studentId) return;
    setSaving(true);
    try {
      if (editItem) {
        await (api as any).updatePortfolioItem(editItem.id, form);
      } else {
        await (api as any).addPortfolioItem(studentId, form);
      }
      setAddModal(false);
      loadPortfolio(studentId);
    } catch { setError('Failed to save item'); }
    setSaving(false);
  };

  const deleteItem = async (item: any) => {
    const studentId = isStudent ? user!.id : selectedStudent?.id;
    try {
      await (api as any).deletePortfolioItem(item.id);
      setDeleteConfirm(null);
      if (studentId) loadPortfolio(studentId);
    } catch { setError('Failed to delete item'); }
  };

  const toggleFeature = async (item: any) => {
    const studentId = isStudent ? user!.id : selectedStudent?.id;
    try {
      await (api as any).togglePortfolioFeature(item.id);
      if (studentId) loadPortfolio(studentId);
    } catch { setError('Failed to toggle feature'); }
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const targetStudentId = isStudent ? user!.id : selectedStudent?.id;
  const canEdit = isStudent || isTeacher;

  const typeCounts = PORTFOLIO_TYPES.map(t => ({
    ...t,
    count: items.filter(i => i.type === t.value).length
  })).filter(t => t.count > 0);

  const featuredItems = items.filter(i => i.is_featured);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Briefcase className="h-6 w-6 text-indigo-600" />
        {isStudent ? 'My E-Portfolio' : 'Student E-Portfolio'}
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Student Selector for non-students */}
      {!isStudent && (
        <Card>
          <CardHeader><CardTitle className="text-base">Select Student</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search student..." className="pl-8" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {filteredStudents.slice(0, 30).map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                    selectedStudent?.id === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {s.name || s.student_name || s.first_name + ' ' + s.last_name}
                </button>
              ))}
            </div>
            {selectedStudent && (
              <p className="text-sm text-indigo-700">Viewing: <strong>{selectedStudent.name || selectedStudent.student_name}</strong></p>
            )}
          </CardContent>
        </Card>
      )}

      {targetStudentId && (
        <>
          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{items.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{featuredItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Featured</p>
                </CardContent>
              </Card>
              {typeCounts.slice(0, 2).map(t => (
                <Card key={t.value}>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-gray-700">{t.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {typeCounts.map(t => (
                <span key={t.value} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {t.label}: {t.count}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadPortfolio(targetStudentId)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              )}
            </div>
          </div>

          {/* Portfolio Grid */}
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Briefcase className="h-14 w-14 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No portfolio items yet.</p>
              {isStudent && <p className="text-sm mt-1">Start adding your best work!</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item: any) => (
                <Card key={item.id} className={`relative hover:shadow-md transition-shadow ${item.is_featured ? 'ring-2 ring-yellow-400' : ''}`}>
                  {item.is_featured && (
                    <div className="absolute top-2 right-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-800 leading-tight">{item.title}</p>
                    </div>
                    <TypeBadge type={item.type} />
                    <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
                      {item.subject && <span>{item.subject}</span>}
                      {item.term && <span>• {item.term}</span>}
                      {item.academic_year && <span>• {item.academic_year}</span>}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="h-3 w-3" /> View File
                        </a>
                      )}
                      <div className="flex gap-1 ml-auto">
                        <button
                          title={item.is_featured ? 'Unfeature' : 'Feature'}
                          onClick={() => toggleFeature(item)}
                          className={`p-1 rounded hover:bg-yellow-50 ${canEdit || isTeacher ? '' : 'hidden'}`}
                        >
                          <Star className={`h-4 w-4 ${item.is_featured ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'}`} />
                        </button>
                        {canEdit && isStudent && (
                          <>
                            <button title="Edit" onClick={() => openEdit(item)} className="p-1 rounded hover:bg-blue-50 text-blue-600">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button title="Delete" onClick={() => setDeleteConfirm(item)} className="p-1 rounded hover:bg-red-50 text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h2>
              <button onClick={() => setAddModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div>
                <Label>Type</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {PORTFOLIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><Label>Description</Label><textarea className="w-full border rounded px-3 py-2 text-sm h-20" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>File URL / Link</Label><Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
                <div>
                  <Label>Term</Label>
                  <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Academic Year</Label><Input placeholder="2024/2025" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                <span className="text-sm">Mark as Featured</span>
                <Star className="h-4 w-4 text-yellow-400" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
              <Button onClick={saveItem} disabled={saving || !form.title.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-red-600">Delete Item?</h2>
            <p className="text-sm text-gray-600">Are you sure you want to delete "<strong>{deleteConfirm.title}</strong>"? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => deleteItem(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
