import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, FileText, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { jsPDF } from 'jspdf';
import { renderReportCardPage } from '@/pages/cbc/CbcReportCardPage';

// Same CBE grading scheme as the backend's computeCBEGrade (cbcRoutes.js) — recomputed
// here from raw exam marks so results shown on this report always match the school's
// official CBE scale regardless of what was stored on the exam_results row.
// (renderReportCardPage derives grade points/colors/descriptors from the grade code itself,
// so this is the only piece of grading logic this page still needs.)
function computeCBEGrade(percentage: number, level: string): string {
  if (['playgroup', 'pre_primary'].includes(level)) {
    if (percentage >= 75) return 'WD';
    if (percentage >= 40) return 'D';
    return 'B';
  }
  if (level === 'junior_secondary') {
    if (percentage >= 90) return 'EE1';
    if (percentage >= 75) return 'EE2';
    if (percentage >= 58) return 'ME1';
    if (percentage >= 41) return 'ME2';
    if (percentage >= 31) return 'AE1';
    if (percentage >= 21) return 'AE2';
    if (percentage >= 11) return 'BE1';
    return 'BE2';
  }
  if (percentage >= 80) return 'EE';
  if (percentage >= 60) return 'ME';
  if (percentage >= 40) return 'AE';
  return 'BE';
}

function formatDateKE(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Some schools record scores through the CBC Assessments feature (cbc_assessments)
// instead of the formal Exams module (exam_results) — this aggregates that raw,
// possibly multi-entry-per-subject data into one row per subject for a given period,
// mirroring the Tier-2 fallback the backend already uses for CBE Report Cards.
function aggregateAssessmentRows(rows: any[], examPeriod: string) {
  const bySubject = new Map<string, {
    subject_name: string; total_score: number; max_score: number;
    grade: string | null; pre_primary_grade: string | null;
    teacher_name: string | null; latestDate: string;
  }>();
  rows.filter(r => r.exam_period === examPeriod).forEach((r: any) => {
    const entry = bySubject.get(r.subject_id) || {
      subject_name: r.subject_name, total_score: 0, max_score: 0,
      grade: null, pre_primary_grade: null, teacher_name: null, latestDate: '',
    };
    entry.total_score += Number(r.score) || 0;
    entry.max_score += Number(r.max_score) || 0;
    const rDate = r.assessment_date || '';
    if (!entry.latestDate || rDate >= entry.latestDate) {
      entry.latestDate = rDate;
      if (r.cbc_grade) entry.grade = r.cbc_grade;
      if (r.pre_primary_grade) entry.pre_primary_grade = r.pre_primary_grade;
      if (r.teacher_name) entry.teacher_name = r.teacher_name;
    }
    bySubject.set(r.subject_id, entry);
  });
  return Array.from(bySubject.values())
    .map(e => ({
      subject_name: e.subject_name,
      total_score: e.total_score,
      max_score: e.max_score,
      percentage: e.max_score > 0 ? (e.total_score / e.max_score) * 100 : 0,
      overall_cbc_grade: e.grade,
      pre_primary_grade: e.pre_primary_grade,
      teacher_name: e.teacher_name,
    }))
    .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
}

// Class rank from the same raw cbc_assessments rows (whole class, same period),
// using the same standard-competition ranking (ties share a rank) as the exam path.
function rankFromAssessmentRows(rows: any[], examPeriod: string, targetStudentId: string) {
  const byStudent = new Map<string, { score: number; max: number }>();
  rows.filter(r => r.exam_period === examPeriod).forEach((r: any) => {
    const e = byStudent.get(r.student_id) || { score: 0, max: 0 };
    e.score += Number(r.score) || 0;
    e.max += Number(r.max_score) || 0;
    byStudent.set(r.student_id, e);
  });
  const ranked = Array.from(byStudent.entries())
    .map(([student_id, { score, max }]) => ({ student_id, pct: max > 0 ? (score / max) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
  let classRank: number | null = null;
  let rank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].pct < ranked[i - 1].pct) rank = i + 1;
    if (ranked[i].student_id === targetStudentId) { classRank = rank; break; }
  }
  return { classRank, totalInClass: ranked.length || null };
}

// ── Page Component ──────────────────────────────────────────────────────────

export function StudentReportPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [term, setTerm] = useState('term1');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [closingDate, setClosingDate] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [examOptions, setExamOptions] = useState<any[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examId, setExamId] = useState('');
  // Some schools record scores via CBC Assessments instead of the Exams module —
  // 'mid_term' / 'end_term' selects that data source instead of a real exam.
  const [assessmentPeriod, setAssessmentPeriod] = useState<'' | 'mid_term' | 'end_term'>('');

  useEffect(() => {
    api.getStudents().then((res: any) => setStudents(res?.data || [])).catch(() => {});
  }, []);

  // Exams must always be re-picked whenever the student/term/year selection changes —
  // a report can never be generated without choosing a specific exam or assessment period.
  useEffect(() => {
    setExamId('');
    setAssessmentPeriod('');
    setExamOptions([]);
    if (!selectedStudent?.class_id) return;
    setExamsLoading(true);
    api.getCbcReportCardPeriods({ class_id: selectedStudent.class_id, term, academic_year: academicYear })
      .then((res: any) => setExamOptions(res?.data?.exams || []))
      .catch(() => setExamOptions([]))
      .finally(() => setExamsLoading(false));
  }, [selectedStudent?.class_id, term, academicYear]);

  const filteredStudents = students.filter(s =>
    !searchTerm || `${s.first_name} ${s.last_name} ${s.admission_number} ${s.class_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!selectedStudent || (!examId && !assessmentPeriod)) return;
    setGenerating(true);
    try {
      const level = selectedStudent.education_level || 'lower_primary';
      const isPrePrimary = ['playgroup', 'pre_primary'].includes(level);
      let competencies: any[] = [];
      let classRank: number | null = null;
      let totalInClass: number | null = null;
      let periodLabel = '';
      let schoolRes: any;

      if (examId) {
        const selectedExam = examOptions.find((e: any) => e.id === examId);
        const [sRes, resultsRes]: any[] = await Promise.all([
          api.getSettings(),
          api.getOfflineResults(examId),
        ]);
        schoolRes = sRes;

        const allRows: any[] = resultsRes?.data || [];
        const rows = allRows.filter((r: any) => r.student_id === selectedStudent.id);
        competencies = rows.filter((r: any) => !r.is_absent).map((r: any) => {
          const maxScore = Number(r.max_marks) || 0;
          const score = Number(r.marks_obtained) || 0;
          const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const grade = computeCBEGrade(pct, level);
          return {
            subject_name: r.subject_name,
            total_score: score,
            max_score: maxScore,
            percentage: pct,
            overall_cbc_grade: isPrePrimary ? null : grade,
            pre_primary_grade: isPrePrimary ? grade : null,
            teacher_name: null,
          };
        });

        // Class rank — computed from the same exam's results across the whole class
        // (getOfflineResults returns every student in the exam), using the same
        // standard-competition ranking (ties share a rank) as the CBC Report Card page.
        const byStudent = new Map<string, { totalScore: number; totalMax: number }>();
        for (const r of allRows) {
          if (r.is_absent) continue;
          const entry = byStudent.get(r.student_id) || { totalScore: 0, totalMax: 0 };
          entry.totalScore += Number(r.marks_obtained) || 0;
          entry.totalMax += Number(r.max_marks) || 0;
          byStudent.set(r.student_id, entry);
        }
        const ranked = Array.from(byStudent.entries())
          .map(([student_id, { totalScore, totalMax }]) => ({
            student_id, pct: totalMax > 0 ? (totalScore / totalMax) * 100 : 0,
          }))
          .sort((a, b) => b.pct - a.pct);
        let rank = 1;
        for (let i = 0; i < ranked.length; i++) {
          if (i > 0 && ranked[i].pct < ranked[i - 1].pct) rank = i + 1;
          if (ranked[i].student_id === selectedStudent.id) { classRank = rank; break; }
        }
        totalInClass = ranked.length || null;
        periodLabel = selectedExam?.name || 'Exam';
      } else {
        // Assessment-period path — for schools that record scores via CBC Assessments
        // (cbc_assessments) instead of the formal Exams module.
        const [sRes, studentRowsRes, classRowsRes]: any[] = await Promise.all([
          api.getSettings(),
          api.getCbcAssessments({ student_id: selectedStudent.id, term, academic_year: academicYear }),
          api.getCbcAssessments({ class_id: selectedStudent.class_id, term, academic_year: academicYear }),
        ]);
        schoolRes = sRes;

        competencies = aggregateAssessmentRows(studentRowsRes?.data || [], assessmentPeriod);
        const rankResult = rankFromAssessmentRows(classRowsRes?.data || [], assessmentPeriod, selectedStudent.id);
        classRank = rankResult.classRank;
        totalInClass = rankResult.totalInClass;
        periodLabel = assessmentPeriod === 'mid_term' ? 'Mid-Term' : 'End-Term';
      }

      const school = schoolRes?.data || schoolRes || {};

      // Reuse the exact same renderer as the CBC Report Card page so both produce
      // an identical official report — this page just supplies a single exam's or
      // assessment period's results instead of a whole term's CBC assessment aggregate.
      const detail = {
        student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        admission_number: selectedStudent.admission_number,
        class_name: selectedStudent.class_name,
        profile_photo_url: selectedStudent.profile_photo_url,
        student_type: selectedStudent.student_type,
        education_level: level,
        period: periodLabel,
        competencies,
        class_rank: classRank,
        total_in_class: totalInClass,
        class_teacher_name: null,
        head_teacher_name: null,
        term_end_date: formatDateKE(closingDate),
        next_term_start_date: formatDateKE(openingDate),
      };

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await renderReportCardPage(doc, detail, school, term, academicYear, true);
      const safeName = `${selectedStudent.first_name}_${selectedStudent.last_name}`.replace(/\s+/g, '_');
      const termLabel = (term || 'term').replace('term', 'T');
      doc.save(`ReportCard_${safeName}_${termLabel}_${academicYear}.pdf`);
    } catch (err: any) {
      alert('Failed to generate report: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Report Form</h1>
        <p className="text-sm text-gray-500 mt-1">Search a learner, choose the term, and generate their PDF report</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Generate Report</CardTitle></CardHeader>
        <CardContent className="space-y-5">

          {/* Student Search */}
          <div>
            <Label>Search Learner *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Type name, admission number or class..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedStudent(null); }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              {showDropdown && searchTerm && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded-lg shadow-xl divide-y">
                  {filteredStudents.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No students found</div>
                  ) : filteredStudents.slice(0, 12).map(s => (
                    <button key={s.id} type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchTerm(`${s.first_name} ${s.last_name} (${s.admission_number})`);
                        setShowDropdown(false);
                      }}>
                      <span>
                        <span className="font-medium">{s.first_name} {s.last_name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{s.admission_number}</span>
                      </span>
                      <span className="text-xs text-gray-400">{s.class_name || 'No class'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected student confirmation */}
          {selectedStudent && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
              </div>
              <div>
                <div className="font-medium text-blue-900">{selectedStudent.first_name} {selectedStudent.last_name}</div>
                <div className="text-xs text-blue-600">{selectedStudent.admission_number} · {selectedStudent.class_name || 'No class'} · {selectedStudent.student_type === 'boarder' ? 'Boarder' : 'Day Scholar'}</div>
              </div>
            </div>
          )}

          {/* Term & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Term *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={term} onChange={e => setTerm(e.target.value)}>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="term3">Term 3</option>
              </select>
            </div>
            <div>
              <Label>Academic Year *</Label>
              <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025" className="mt-1" />
            </div>
          </div>

          {/* Term closing / opening dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Term Closing Date</Label>
              <Input type="date" className="mt-1" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
              <p className="text-xs text-gray-400 mt-0.5">Printed on report card</p>
            </div>
            <div>
              <Label>Next Term Opening Date</Label>
              <Input type="date" className="mt-1" value={openingDate} onChange={e => setOpeningDate(e.target.value)} />
              <p className="text-xs text-gray-400 mt-0.5">Printed on report card</p>
            </div>
          </div>

          {/* Exam — a report can be generated either from a real exam (Exams module) or,
              if the school records scores via CBC Assessments instead, from a Mid-Term/
              End-Term assessment period. One of the two is required. */}
          {selectedStudent && (
            <div>
              <Label>Select Exam or Assessment Period (required)</Label>
              {examsLoading ? (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading exams…
                </p>
              ) : (
                <div className="mt-1 space-y-3">
                  {examOptions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        From the Exams module (Mid-Term, First-Term, End-Term, CAT, etc.):
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {examOptions.map((ex: any) => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => { setExamId(ex.id); setAssessmentPeriod(''); }}
                            title={ex.start_date ? new Date(ex.start_date).toLocaleDateString() : undefined}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                              ${examId === ex.id
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            {ex.name}
                            {ex.start_date ? <span className="opacity-70"> · {new Date(ex.start_date).toLocaleDateString()}</span> : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Or from CBC Assessment records:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['mid_term', 'end_term'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setAssessmentPeriod(p); setExamId(''); }}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                            ${assessmentPeriod === p
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {p === 'mid_term' ? 'Mid-Term' : 'End-Term'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!examId && !assessmentPeriod && (
                    <p className="text-xs text-red-600">
                      Pick an exam above, or a Mid-Term/End-Term assessment period, to enable report generation.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
            <p>Generates the same official Student Report Form format used elsewhere in the system, for this one exam or assessment period:</p>
            <p>• School logo, name, address, contact and student photo</p>
            <p>• Student information (name, admission no., class, category)</p>
            <p>• CBE assessment results table with grades and points</p>
            <p>• Total points, average points per subject and facilitator's comment</p>
            <p>• Term closing and next term opening dates (if set)</p>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={!selectedStudent || (!examId && !assessmentPeriod) || generating}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Generate PDF Report Form</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
