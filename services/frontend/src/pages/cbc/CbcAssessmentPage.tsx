import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { Plus, BookOpen, Award, ChevronDown } from 'lucide-react';

const CBC_GRADES = ['EE', 'ME', 'AE', 'BE'];
const PP_GRADES = ['WD', 'D', 'B'];
const GRADE_COLORS: Record<string, string> = {
  EE: 'bg-green-100 text-green-800', ME: 'bg-blue-100 text-blue-800',
  AE: 'bg-yellow-100 text-yellow-800', BE: 'bg-red-100 text-red-800',
  WD: 'bg-green-100 text-green-800', D: 'bg-yellow-100 text-yellow-800',
  B: 'bg-red-100 text-red-800',
};
const GRADE_LABELS: Record<string, string> = {
  EE: 'Exceeding Expectations', ME: 'Meeting Expectations',
  AE: 'Approaching Expectations', BE: 'Below Expectations',
  WD: 'Well Developed', D: 'Developing', B: 'Beginning',
};

export function CbcAssessmentPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: 'term1', academic_year: new Date().getFullYear().toString() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ assessment_type: 'formative', term: 'term1', academic_year: new Date().getFullYear().toString(), score: '', max_score: '' });

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.getClasses() });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => api.getSubjects() });
  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['cbc-assessments', filters],
    queryFn: () => api.getCbcAssessments(filters),
  });
  const { data: studentsData } = useQuery({
    queryKey: ['students', filters.class_id],
    queryFn: () => api.getStudents(filters.class_id ? { classId: filters.class_id } : undefined),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCbcAssessment(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cbc-assessments'] }); setShowForm(false); setForm({ assessment_type: 'formative', term: 'term1', academic_year: new Date().getFullYear().toString(), score: '', max_score: '' }); },
  });

  const classes = (classesData as any)?.data || [];
  const subjects = (subjectsData as any)?.data || [];
  const assessments = (assessmentsData as any)?.data || [];
  const students = (studentsData as any)?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBC Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">Competency-Based Assessment records — Formative & Summative</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Record Assessment
        </Button>
      </div>

      {/* CBC Grade Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            {[...CBC_GRADES, ...PP_GRADES].map(g => (
              <div key={g} className="flex items-center gap-2">
                <Badge className={GRADE_COLORS[g]}>{g}</Badge>
                <span className="text-xs text-gray-600">{GRADE_LABELS[g]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Assessment Form */}
      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-lg">New Assessment Record</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Class *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.class_id || ''} onChange={e => setForm({ ...form, class_id: e.target.value })} required>
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
                <Label>Subject *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.subject_id || ''} onChange={e => setForm({ ...form, subject_id: e.target.value })} required>
                  <option value="">Select subject</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Assessment Type *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.assessment_type} onChange={e => setForm({ ...form, assessment_type: e.target.value })}>
                  <option value="formative">Formative</option>
                  <option value="summative">Summative</option>
                  <option value="project">Project</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="observation">Observation</option>
                </select>
              </div>
              <div>
                <Label>Term *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
                  <option value="term1">Term 1</option>
                  <option value="term2">Term 2</option>
                  <option value="term3">Term 3</option>
                </select>
              </div>
              <div>
                <Label>Academic Year *</Label>
                <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2024" />
              </div>
              <div>
                <Label>Score</Label>
                <Input type="number" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} placeholder="e.g. 75" />
              </div>
              <div>
                <Label>Out of (Max Score)</Label>
                <Input type="number" value={form.max_score} onChange={e => setForm({ ...form, max_score: e.target.value })} placeholder="e.g. 100" />
              </div>
              <div>
                <Label>Assessment Date</Label>
                <Input type="date" value={form.assessment_date || ''} onChange={e => setForm({ ...form, assessment_date: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Label>Teacher Comments</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm mt-1 min-h-[80px]"
                  value={form.teacher_comments || ''} onChange={e => setForm({ ...form, teacher_comments: e.target.value })}
                  placeholder="Observations, feedback, areas of improvement..." />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Assessment'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
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
          </div>
        </CardContent>
      </Card>

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
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Strand</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">CBC Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assessments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.student_name}</td>
                      <td className="px-4 py-3">{a.subject_name}</td>
                      <td className="px-4 py-3 text-gray-500">{a.strand_name || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">{a.assessment_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.score != null ? `${a.score}/${a.max_score}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(a.cbc_grade || a.pre_primary_grade) ? (
                          <Badge className={GRADE_COLORS[a.cbc_grade || a.pre_primary_grade]}>
                            {a.cbc_grade || a.pre_primary_grade}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {a.assessment_date ? new Date(a.assessment_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {a.teacher_comments || '—'}
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
