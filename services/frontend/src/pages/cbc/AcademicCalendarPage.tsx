import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { Calendar, Plus, CheckCircle } from 'lucide-react';

export function AcademicCalendarPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({
    academic_year: new Date().getFullYear().toString(),
    term: 'term1', term_name: '',
    start_date: '', end_date: '',
    midterm_break_start: '', midterm_break_end: '',
    end_term_exams_start: '', end_term_exams_end: '',
    reopening_date: '', is_current: false
  });

  const { data: termsData, isLoading } = useQuery({
    queryKey: ['academic-terms'],
    queryFn: () => api.getAcademicTerms(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAcademicTerm(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-terms'] }); setShowForm(false); },
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => api.setCurrentTerm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-terms'] }),
  });

  const terms = (termsData as any)?.data || [];

  const termLabel = (t: string) => t.replace('term', 'Term ');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Kenya 3-Term Academic Year Structure</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Term
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-lg">New Academic Term</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Academic Year *</Label>
                <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2024" required />
              </div>
              <div>
                <Label>Term *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
                  <option value="term1">Term 1 (Jan–Apr)</option>
                  <option value="term2">Term 2 (May–Aug)</option>
                  <option value="term3">Term 3 (Sep–Nov)</option>
                </select>
              </div>
              <div>
                <Label>Term Name</Label>
                <Input value={form.term_name} onChange={e => setForm({ ...form, term_name: e.target.value })} placeholder="e.g. January Term" />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
              <div>
                <Label>Reopening Date</Label>
                <Input type="date" value={form.reopening_date} onChange={e => setForm({ ...form, reopening_date: e.target.value })} />
              </div>
              <div>
                <Label>Midterm Break Start</Label>
                <Input type="date" value={form.midterm_break_start} onChange={e => setForm({ ...form, midterm_break_start: e.target.value })} />
              </div>
              <div>
                <Label>Midterm Break End</Label>
                <Input type="date" value={form.midterm_break_end} onChange={e => setForm({ ...form, midterm_break_end: e.target.value })} />
              </div>
              <div>
                <Label>End Term Exams Start</Label>
                <Input type="date" value={form.end_term_exams_start} onChange={e => setForm({ ...form, end_term_exams_start: e.target.value })} />
              </div>
              <div>
                <Label>End Term Exams End</Label>
                <Input type="date" value={form.end_term_exams_end} onChange={e => setForm({ ...form, end_term_exams_end: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="is_current" checked={form.is_current}
                  onChange={e => setForm({ ...form, is_current: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="is_current" className="cursor-pointer font-normal">Set as current term</Label>
              </div>
              <div className="md:col-span-3 flex gap-3 mt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Term'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading terms...</div>
      ) : terms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No academic terms configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terms.map((term: any) => (
            <Card key={term.id} className={term.is_current ? 'ring-2 ring-indigo-500' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {termLabel(term.term)} · {term.academic_year}
                  </CardTitle>
                  {term.is_current ? (
                    <Badge className="bg-indigo-100 text-indigo-800">Current</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setCurrentMutation.mutate(term.id)}
                      className="text-xs h-7">
                      <CheckCircle className="h-3 w-3 mr-1" /> Set Current
                    </Button>
                  )}
                </div>
                {term.term_name && <p className="text-sm text-gray-500">{term.term_name}</p>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Opens:</span>
                  <span className="font-medium">{term.start_date ? new Date(term.start_date).toLocaleDateString('en-KE') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Closes:</span>
                  <span className="font-medium">{term.end_date ? new Date(term.end_date).toLocaleDateString('en-KE') : '—'}</span>
                </div>
                {term.midterm_break_start && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Midterm Break:</span>
                    <span>{new Date(term.midterm_break_start).toLocaleDateString('en-KE')} – {new Date(term.midterm_break_end).toLocaleDateString('en-KE')}</span>
                  </div>
                )}
                {term.end_term_exams_start && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Term Exams:</span>
                    <span>{new Date(term.end_term_exams_start).toLocaleDateString('en-KE')} – {new Date(term.end_term_exams_end).toLocaleDateString('en-KE')}</span>
                  </div>
                )}
                {term.reopening_date && (
                  <div className="flex justify-between text-green-700">
                    <span>Reopens:</span>
                    <span className="font-medium">{new Date(term.reopening_date).toLocaleDateString('en-KE')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
