import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Plus, BookOpen, Download, Pencil, Trash2, X, Check, Search } from 'lucide-react';

const CBE_GRADES = ['EE', 'ME', 'AE', 'BE'];
const JSS_GRADES = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'];
const PP_GRADES = ['WD', 'D', 'B'];
const GRADE_COLORS: Record<string, string> = {
  EE: 'bg-green-100 text-green-800', EE1: 'bg-green-200 text-green-900', EE2: 'bg-green-100 text-green-800',
  ME: 'bg-blue-100 text-blue-800',   ME1: 'bg-blue-200 text-blue-900',   ME2: 'bg-blue-100 text-blue-800',
  AE: 'bg-yellow-100 text-yellow-800', AE1: 'bg-yellow-200 text-yellow-900', AE2: 'bg-yellow-100 text-yellow-800',
  BE: 'bg-red-100 text-red-800',     BE1: 'bg-red-200 text-red-900',     BE2: 'bg-red-100 text-red-800',
  WD: 'bg-green-100 text-green-800', D: 'bg-yellow-100 text-yellow-800', B: 'bg-red-100 text-red-800',
};
const GRADE_LABELS: Record<string, string> = {
  EE: 'Exceeding Expectations', ME: 'Meeting Expectations',
  AE: 'Approaching Expectations', BE: 'Below Expectations',
  WD: 'Well Developed', D: 'Developing', B: 'Beginning',
  EE1: 'EE Level 1 (90–100%)', EE2: 'EE Level 2 (75–89%)',
  ME1: 'ME Level 1 (58–74%)',  ME2: 'ME Level 2 (41–57%)',
  AE1: 'AE Level 1 (31–40%)',  AE2: 'AE Level 2 (21–30%)',
  BE1: 'BE Level 1 (11–20%)',  BE2: 'BE Level 2 (1–10%)',
};
const GRADE_POINTS: Record<string, number> = {
  EE1: 8, EE2: 7, ME1: 6, ME2: 5, AE1: 4, AE2: 3, BE1: 2, BE2: 1,
};
const AUTO_COMMENTS: Record<string, string> = {
  EE: 'EXCELLENT', EE1: 'EXCELLENT', EE2: 'EXCELLENT',
  ME: 'GOOD',      ME1: 'GOOD',      ME2: 'GOOD',
  AE: 'Can do better', AE1: 'Can do better', AE2: 'Can do better',
  BE: 'Put More Effort', BE1: 'Put More Effort', BE2: 'Put More Effort',
  WD: 'EXCELLENT', D: 'Can do better', B: 'Put More Effort',
};

const EMPTY_FORM = {
  assessment_type: 'formative',
  exam_period: '',
  term: 'term1',
  academic_year: new Date().getFullYear().toString(),
  score: '',
  max_score: '',
  result_code: '',
  teacher_comments: '',
  education_level: '',
};

function downloadCSV(assessments: any[]) {
  const headers = ['Student', 'Subject', 'Strand', 'Type', 'Exam Period', 'Term', 'Year', 'Score', 'Max Score', 'CBE Grade', 'Grade Points', 'Result Code', 'Date', 'Facilitator'];
  const rows = assessments.map((a: any) => [
    a.student_name,
    a.subject_name,
    a.strand_name || '',
    a.assessment_type,
    a.exam_period || '',
    a.term,
    a.academic_year,
    a.score ?? '',
    a.max_score ?? '',
    a.cbc_grade || a.pre_primary_grade || '',
    a.grade_points ?? '',
    a.result_code || '',
    a.assessment_date ? new Date(a.assessment_date).toLocaleDateString() : '',
    a.teacher_name || '',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cbc_assessments_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CbcAssessmentPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: 'term1', academic_year: new Date().getFullYear().toString(), student_id: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Teachers must only see classes they actually teach — the student list
  // below is already scoped to a teacher's assigned classes on the backend,
  // so an unrestricted class list here let a teacher pick a class they
  // don't teach: the class would show up, but its student list would
  // silently come back empty ("class appears, but no student in the list").
  const { data: classesData } = useQuery({
    queryKey: ['classes', isAdmin, user?.id],
    queryFn: () => (isAdmin ? api.getClasses() : api.getTeacherClasses(user?.id || '')),
    enabled: isAdmin || !!user?.id,
  });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => api.getSubjects() });
  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['cbc-assessments', filters],
    queryFn: () => api.getCbcAssessments(filters),
  });
  const { data: studentsData } = useQuery({
    queryKey: ['students', form.class_id || filters.class_id],
    queryFn: () => api.getStudents((form.class_id || filters.class_id) ? { classId: form.class_id || filters.class_id } : undefined),
    enabled: showForm || !!filters.class_id,
  });
  // All students for the filter search (not scoped to class)
  const { data: allStudentsData } = useQuery({
    queryKey: ['students-all-cbc'],
    queryFn: () => api.getStudents(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCbcAssessment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cbc-assessments'] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.updateCbcAssessment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cbc-assessments'] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCbcAssessment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cbc-assessments'] });
      setDeleteId(null);
    },
  });

  const classes = (classesData as any)?.data || [];
  const subjects = (subjectsData as any)?.data || [];
  const assessments = (assessmentsData as any)?.data || [];
  const students = (studentsData as any)?.data || [];
  const allStudents: any[] = (allStudentsData as any)?.data || [];

  const filteredStudentOptions = allStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.admission_number || '').toLowerCase().includes(q);
  });
  const selectedStudent = allStudents.find(s => s.id === filters.student_id);
  const selectedStudentName = selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : '';

  // Compute auto-comment when score/max_score changes
  const handleFormChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    if ((field === 'score' || field === 'max_score' || field === 'result_code') && !updated.teacher_comments_manual) {
      if (updated.result_code) {
        updated.teacher_comments = '';
      } else if (updated.score && updated.max_score && Number(updated.max_score) > 0) {
        const pct = (Number(updated.score) / Number(updated.max_score)) * 100;
        let grade: string;
        const level = form.education_level || '';
        if (level === 'junior_secondary') {
          grade = pct >= 90 ? 'EE1' : pct >= 75 ? 'EE2' : pct >= 58 ? 'ME1' : pct >= 41 ? 'ME2' : pct >= 31 ? 'AE1' : pct >= 21 ? 'AE2' : pct >= 11 ? 'BE1' : 'BE2';
        } else {
          grade = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
        }
        updated.teacher_comments = AUTO_COMMENTS[grade] || '';
      }
    }
    if (field === 'teacher_comments') {
      updated.teacher_comments_manual = true;
    }
    setForm(updated);
  };

  const startEdit = (a: any) => {
    setEditId(a.id);
    setEditForm({
      score: a.score ?? '',
      max_score: a.max_score ?? '',
      teacher_comments: a.teacher_comments || '',
      exam_period: a.exam_period || '',
      result_code: a.result_code || '',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBE Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">Competency-Based Assessment records — Formative & Summative</p>
        </div>
        <div className="flex gap-2">
          {assessments.length > 0 && (
            <Button variant="outline" onClick={() => downloadCSV(assessments)}>
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          )}
          {(isAdmin || user?.role === 'teacher') && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" /> Record Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Grade Legend */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Standard CBE (Primary &amp; Senior Secondary)</p>
            <div className="flex flex-wrap gap-3">
              {CBE_GRADES.map(g => (
                <div key={g} className="flex items-center gap-2">
                  <Badge className={GRADE_COLORS[g]}>{g}</Badge>
                  <span className="text-xs text-gray-600">{GRADE_LABELS[g]}</span>
                </div>
              ))}
              {PP_GRADES.map(g => (
                <div key={g} className="flex items-center gap-2">
                  <Badge className={GRADE_COLORS[g]}>{g}</Badge>
                  <span className="text-xs text-gray-600">{GRADE_LABELS[g]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">JSS 2025 KJSEA (Grade 7–9) — 8-Level System</p>
            <div className="flex flex-wrap gap-3">
              {JSS_GRADES.map(g => (
                <div key={g} className="flex items-center gap-2">
                  <Badge className={GRADE_COLORS[g]}>{g}</Badge>
                  <span className="text-xs text-gray-600">{GRADE_LABELS[g]} · {GRADE_POINTS[g]}pts</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t pt-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-800">WD</Badge>
              <span className="text-xs text-gray-600">Withheld Result</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800">Y</Badge>
              <span className="text-xs text-gray-600">Missed Exam</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Assessment Form */}
      {showForm && (isAdmin || user?.role === 'teacher') && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-lg">New Assessment Record</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Class *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.class_id || ''} onChange={e => handleFormChange('class_id', e.target.value)} required>
                  <option value="">Select class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Student *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.student_id || ''} onChange={e => handleFormChange('student_id', e.target.value)} required>
                  <option value="">Select student</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Subject *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.subject_id || ''} onChange={e => handleFormChange('subject_id', e.target.value)} required>
                  <option value="">Select subject</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Education Level</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.education_level} onChange={e => handleFormChange('education_level', e.target.value)}>
                  <option value="">Standard CBE (Primary)</option>
                  <option value="pre_primary">Pre-Primary (PP1/PP2)</option>
                  <option value="playgroup">Playgroup</option>
                  <option value="junior_secondary">Junior Secondary (Grade 7–9)</option>
                  <option value="senior_secondary">Senior Secondary (Grade 10–12)</option>
                </select>
              </div>
              <div>
                <Label>Assessment Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.assessment_type} onChange={e => handleFormChange('assessment_type', e.target.value)}>
                  <option value="formative">Formative</option>
                  <option value="summative">Summative</option>
                  <option value="project">Project</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="observation">Observation</option>
                </select>
              </div>
              <div>
                <Label>Exam Period</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.exam_period} onChange={e => handleFormChange('exam_period', e.target.value)}>
                  <option value="">— General —</option>
                  <option value="mid_term">Mid-Term</option>
                  <option value="end_term">End-Term</option>
                </select>
              </div>
              <div>
                <Label>Term *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.term} onChange={e => handleFormChange('term', e.target.value)}>
                  <option value="term1">Term 1</option>
                  <option value="term2">Term 2</option>
                  <option value="term3">Term 3</option>
                </select>
              </div>
              <div>
                <Label>Academic Year *</Label>
                <Input value={form.academic_year} onChange={e => handleFormChange('academic_year', e.target.value)} placeholder="2024" />
              </div>
              <div>
                <Label>Special Status</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.result_code} onChange={e => handleFormChange('result_code', e.target.value)}>
                  <option value="">Normal</option>
                  <option value="WD">WD — Withheld Result</option>
                  <option value="Y">Y — Missed Exam</option>
                </select>
              </div>
              {!form.result_code && (
                <>
                  <div>
                    <Label>Score</Label>
                    <Input type="number" value={form.score} onChange={e => handleFormChange('score', e.target.value)} placeholder="e.g. 75" />
                  </div>
                  <div>
                    <Label>Out of (Max Score)</Label>
                    <Input type="number" value={form.max_score} onChange={e => handleFormChange('max_score', e.target.value)} placeholder="e.g. 100" />
                  </div>
                </>
              )}
              <div>
                <Label>Assessment Date</Label>
                <Input type="date" value={form.assessment_date || ''} onChange={e => handleFormChange('assessment_date', e.target.value)} />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Assessment'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}>Cancel</Button>
              </div>
              {createMutation.isError && (
                <div className="md:col-span-3 text-sm text-red-600 bg-red-50 rounded p-2">Failed to save assessment. Please try again.</div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Class</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.class_id} onChange={e => setFilters({ ...filters, class_id: e.target.value })}>
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.subject_id} onChange={e => setFilters({ ...filters, subject_id: e.target.value })}>
                <option value="">All Subjects</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Term</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm mt-1"
                value={filters.term} onChange={e => setFilters({ ...filters, term: e.target.value })}>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="term3">Term 3</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Academic Year</Label>
              <Input className="text-sm h-8 mt-1" value={filters.academic_year}
                onChange={e => setFilters({ ...filters, academic_year: e.target.value })} />
            </div>
            {/* Student search */}
            <div className="relative">
              <Label className="text-xs">Student</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  className="w-full border rounded-md pl-7 pr-7 py-1.5 text-sm"
                  placeholder="Search student..."
                  value={filters.student_id ? selectedStudentName : studentSearch}
                  onChange={e => {
                    if (filters.student_id) {
                      setFilters({ ...filters, student_id: '' });
                    }
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 150)}
                />
                {(filters.student_id || studentSearch) && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setFilters({ ...filters, student_id: '' });
                      setStudentSearch('');
                      setShowStudentDropdown(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {showStudentDropdown && !filters.student_id && (
                <div className="absolute z-30 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredStudentOptions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No students found</p>
                  ) : (
                    filteredStudentOptions.slice(0, 20).map((s: any) => (
                      <button
                        key={s.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex flex-col"
                        onMouseDown={() => {
                          setFilters({ ...filters, student_id: s.id });
                          setStudentSearch('');
                          setShowStudentDropdown(false);
                        }}
                      >
                        <span>{s.first_name} {s.last_name}</span>
                        <span className="text-xs text-gray-400">{s.admission_number}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {filters.student_id && (
            <p className="mt-2 text-xs text-indigo-600">
              Filtering by: <strong>{selectedStudentName}</strong>
              <button className="ml-2 underline text-gray-400 hover:text-gray-600"
                onClick={() => { setFilters({ ...filters, student_id: '' }); setStudentSearch(''); }}>
                Clear
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Delete Assessment?</h3>
            <p className="text-gray-600 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No assessments found. Record the first assessment above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pts</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Facilitator</th>
                    {(isAdmin || user?.role === 'teacher') && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assessments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.student_name}</td>
                      <td className="px-4 py-3">{a.subject_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">{a.assessment_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize text-xs">
                        {a.exam_period ? a.exam_period.replace('_', '-') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {editId === a.id ? (
                          <div className="flex gap-1">
                            <input type="number" className="w-16 border rounded px-1 py-0.5 text-xs"
                              value={editForm.score} onChange={e => setEditForm({ ...editForm, score: e.target.value })} />
                            <span>/</span>
                            <input type="number" className="w-16 border rounded px-1 py-0.5 text-xs"
                              value={editForm.max_score} onChange={e => setEditForm({ ...editForm, max_score: e.target.value })} />
                          </div>
                        ) : (
                          a.result_code ? (
                            <Badge className={a.result_code === 'Y' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                              {a.result_code}
                            </Badge>
                          ) : (
                            a.score != null ? `${a.score}/${a.max_score}` : '—'
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editId === a.id ? (
                          <div className="space-y-1">
                            <select className="w-full border rounded px-1 py-0.5 text-xs"
                              value={editForm.result_code} onChange={e => setEditForm({ ...editForm, result_code: e.target.value })}>
                              <option value="">Normal</option>
                              <option value="WD">WD — Withheld</option>
                              <option value="Y">Y — Missed</option>
                            </select>
                            <select className="w-full border rounded px-1 py-0.5 text-xs"
                              value={editForm.exam_period} onChange={e => setEditForm({ ...editForm, exam_period: e.target.value })}>
                              <option value="">General</option>
                              <option value="mid_term">Mid-Term</option>
                              <option value="end_term">End-Term</option>
                            </select>
                          </div>
                        ) : (
                          (a.cbc_grade || a.pre_primary_grade) ? (
                            <Badge className={GRADE_COLORS[a.cbc_grade || a.pre_primary_grade] || 'bg-gray-100'}>
                              {a.cbc_grade || a.pre_primary_grade}
                            </Badge>
                          ) : '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium">
                        {a.grade_points != null ? (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{a.grade_points}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {a.assessment_date ? new Date(a.assessment_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {a.teacher_name || '—'}
                      </td>
                      {(isAdmin || user?.role === 'teacher') && (
                        <td className="px-4 py-3">
                          {(isAdmin || a.teacher_id === user?.id) ? (
                            editId === a.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => updateMutation.mutate({ id: a.id, data: editForm })}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button onClick={() => startEdit(a)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => setDeleteId(a.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
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
