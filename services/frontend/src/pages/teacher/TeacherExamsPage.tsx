import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Plus, Trash2, Check, X, Save, Eye, Upload } from 'lucide-react';
import api from '@/services/api';
import { computeCBCGrade, getCBCGradeBadgeClass, EDUCATION_LEVELS } from '@/utils/cbcGrades';

type Tab = 'my-exams' | 'create' | 'offline-results';

interface Question {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options: { label: string; text: string }[];
  correct_answer: string;
  marks: number;
}

export function TeacherExamsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('my-exams');
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Create exam form
  const [newExam, setNewExam] = useState({
    name: '', description: '', exam_type: '', academic_year: '',
    term: '', start_date: '', end_date: '', class_id: '',
    mode: 'offline', duration_minutes: 60, instructions: ''
  });
  const [questions, setQuestions] = useState<Question[]>([]);

  // Offline results
  const [selectedExamId, setSelectedExamId] = useState('');
  const [offlineStudents, setOfflineStudents] = useState<any[]>([]);
  const [offlineResults, setOfflineResults] = useState<Record<string, { marks: number; max_marks: number; absent: boolean }>>({});
  const [selectedOfflineClass, setSelectedOfflineClass] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [examsRes, classesRes, subjectsRes]: any[] = await Promise.all([
        api.getExams(),
        api.getClasses(),
        api.getSubjects()
      ]);
      setExams(examsRes.data || examsRes || []);
      setClasses(classesRes.data || classesRes || []);
      setSubjects(subjectsRes.data || subjectsRes || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'multiple_choice',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ],
      correct_answer: 'A',
      marks: 1
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, optIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOpts = q.options.map((o, oi) => oi === optIdx ? { ...o, text } : o);
      return { ...q, options: newOpts };
    }));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateExam = async () => {
    if (!newExam.name) return;
    setSaving(true);
    try {
      await api.createExam({
        ...newExam,
        questions: newExam.mode === 'online' ? questions : undefined
      });
      setMessage('Exam created successfully!');
      setNewExam({ name: '', description: '', exam_type: '', academic_year: '', term: '', start_date: '', end_date: '', class_id: '', mode: 'offline', duration_minutes: 60, instructions: '' });
      setQuestions([]);
      loadData();
      setActiveTab('my-exams');
    } catch (err: any) {
      setMessage('Error: ' + (err?.message || 'Failed to create exam'));
    }
    setSaving(false);
  };

  const loadOfflineStudents = async (classId: string) => {
    if (!classId) return;
    setSelectedOfflineClass(classId);
    try {
      const res: any = await api.getClassStudents(classId);
      const students = res.data || res || [];
      setOfflineStudents(students);
      const initial: typeof offlineResults = {};
      for (const s of students) {
        initial[s.id] = { marks: 0, max_marks: 100, absent: false };
      }
      setOfflineResults(initial);
    } catch { /* silent */ }
  };

  const handleSaveOfflineResults = async () => {
    if (!selectedExamId) { setMessage('Please select an exam'); return; }
    setSaving(true);
    try {
      const results = offlineStudents.map(s => ({
        student_id: s.id,
        marks_obtained: offlineResults[s.id]?.marks || 0,
        max_marks: offlineResults[s.id]?.max_marks || 100,
        is_absent: offlineResults[s.id]?.absent || false
      }));
      await api.saveOfflineResults({ exam_id: selectedExamId, results });
      setMessage('Results saved successfully!');
    } catch (err: any) {
      setMessage('Error: ' + (err?.message || 'Failed to save'));
    }
    setSaving(false);
  };

  const getOfflineExamClass = () => {
    const exam = exams.find(e => e.id === selectedExamId);
    return exam?.education_level || 'lower_primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'my-exams', label: 'My Exams' },
    { key: 'create', label: 'Create Online Exam' },
    { key: 'offline-results', label: 'Record Offline Results' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Exam Manager</h2>
        <p className="text-gray-500">Create and manage exams, record results</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
          <button onClick={() => setMessage('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: My Exams */}
      {activeTab === 'my-exams' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.length === 0 ? (
            <Card className="md:col-span-3">
              <CardContent className="pt-6 text-center text-gray-500">No exams found</CardContent>
            </Card>
          ) : exams.map(exam => (
            <Card key={exam.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{exam.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${exam.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {exam.mode || 'offline'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-500 space-y-1">
                {exam.class_name && <p>Class: {exam.class_name}</p>}
                {exam.start_date && <p>Date: {new Date(exam.start_date).toLocaleDateString()}</p>}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1"
                    onClick={() => { setSelectedExamId(exam.id); setActiveTab('offline-results'); }}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Create Online Exam */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Exam Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Exam Name *</label>
                <Input value={newExam.name} onChange={e => setNewExam(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Term 1 Mathematics" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Class</label>
                <select value={newExam.class_id} onChange={e => setNewExam(p => ({ ...p, class_id: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section && `(${c.section})`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mode</label>
                <select value={newExam.mode} onChange={e => setNewExam(p => ({ ...p, mode: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (minutes)</label>
                <Input type="number" value={newExam.duration_minutes} onChange={e => setNewExam(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <Input type="datetime-local" value={newExam.start_date} onChange={e => setNewExam(p => ({ ...p, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <Input type="datetime-local" value={newExam.end_date} onChange={e => setNewExam(p => ({ ...p, end_date: e.target.value }))} className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Instructions</label>
                <textarea value={newExam.instructions} onChange={e => setNewExam(p => ({ ...p, instructions: e.target.value }))} rows={2} placeholder="Exam instructions for students..." className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </CardContent>
          </Card>

          {/* Questions builder (only for online) */}
          {newExam.mode === 'online' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
                <Button onClick={addQuestion} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>

              {questions.map((q, qi) => (
                <Card key={qi}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Question {qi + 1}</span>
                      <button onClick={() => removeQuestion(qi)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                      rows={2}
                      placeholder="Enter question text..."
                      className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Type</label>
                        <select value={q.question_type} onChange={e => updateQuestion(qi, 'question_type', e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm">
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True/False</option>
                          <option value="short_answer">Short Answer</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500">Marks</label>
                        <Input type="number" value={q.marks} onChange={e => updateQuestion(qi, 'marks', parseInt(e.target.value) || 1)} className="mt-1 text-sm" min={1} />
                      </div>
                    </div>

                    {q.question_type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuestion(qi, 'correct_answer', opt.label)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correct_answer === opt.label ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                            >
                              {opt.label}
                            </button>
                            <Input
                              value={opt.text}
                              onChange={e => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${opt.label}`}
                              className="text-sm"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-400">Click the letter to mark the correct answer</p>
                      </div>
                    )}

                    {q.question_type === 'true_false' && (
                      <div className="flex gap-3">
                        {['True', 'False'].map(val => (
                          <button
                            key={val}
                            onClick={() => updateQuestion(qi, 'correct_answer', val)}
                            className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${q.correct_answer === val ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 hover:border-green-300'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={handleCreateExam} disabled={saving || !newExam.name} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      )}

      {/* Tab 3: Record Offline Results */}
      {activeTab === 'offline-results' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select Exam</label>
                <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">-- Select exam --</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Select Class</label>
                <select value={selectedOfflineClass} onChange={e => loadOfflineStudents(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">-- Select class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section && `(${c.section})`}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {offlineStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Enter Marks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Student</th>
                        <th className="text-left py-2 px-2 w-28">Marks</th>
                        <th className="text-left py-2 px-2 w-28">Max Marks</th>
                        <th className="text-left py-2 px-2 w-20">Absent</th>
                        <th className="text-left py-2 px-2 w-20">CBC Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offlineStudents.map(student => {
                        const r = offlineResults[student.id] || { marks: 0, max_marks: 100, absent: false };
                        const pct = r.max_marks > 0 ? (r.marks / r.max_marks) * 100 : 0;
                        const grade = r.absent ? '–' : computeCBCGrade(pct, getOfflineExamClass());
                        return (
                          <tr key={student.id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">
                              {student.first_name} {student.last_name}
                              <span className="text-gray-400 text-xs ml-1">({student.admission_number})</span>
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                type="number"
                                min={0}
                                max={r.max_marks}
                                value={r.marks}
                                disabled={r.absent}
                                onChange={e => setOfflineResults(prev => ({ ...prev, [student.id]: { ...r, marks: parseFloat(e.target.value) || 0 } }))}
                                className="text-sm h-8 w-24"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                type="number"
                                min={1}
                                value={r.max_marks}
                                onChange={e => setOfflineResults(prev => ({ ...prev, [student.id]: { ...r, max_marks: parseFloat(e.target.value) || 100 } }))}
                                className="text-sm h-8 w-24"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <input
                                type="checkbox"
                                checked={r.absent}
                                onChange={e => setOfflineResults(prev => ({ ...prev, [student.id]: { ...r, absent: e.target.checked } }))}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getCBCGradeBadgeClass(grade)}`}>
                                {grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button onClick={handleSaveOfflineResults} disabled={saving || !selectedExamId} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Results'}
                  </Button>
                  {selectedExamId && (
                    <Button variant="outline" onClick={() => api.publishExamResults(selectedExamId).then(() => setMessage('Results published!'))}>
                      Publish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
