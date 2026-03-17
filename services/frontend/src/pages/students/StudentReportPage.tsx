import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, FileText, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { jsPDF } from 'jspdf';

const GRADE_COLORS_HEX: Record<string, [number, number, number]> = {
  EE: [22, 163, 74], ME: [37, 99, 235], AE: [202, 138, 4], BE: [220, 38, 38],
  WD: [22, 163, 74], D: [202, 138, 4], B: [220, 38, 38],
};
const AUTO_COMMENTS: Record<string, string> = {
  EE: 'EXCELLENT', ME: 'GOOD', AE: 'Can do better', BE: 'Put More Effort',
  WD: 'EXCELLENT', D: 'Can do better', B: 'Put More Effort',
};

async function generateStudentReportPDF(
  student: any,
  assessments: any[],
  feeAccount: any,
  school: any,
  feeStructures: any[],
  term: string,
  academicYear: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // ── School Header ───────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 36, 'F');

  // School logo (if URL provided — draw placeholder box)
  if (school.school_logo_url) {
    try {
      // Try loading the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try { doc.addImage(img, 'JPEG', margin, 4, 22, 22); } catch { /* skip */ }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = school.school_logo_url;
      });
    } catch { /* no logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(school.school_name || 'School Management System', pageW / 2, 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const addrLine = [school.address, school.city, school.state].filter(Boolean).join(', ');
  if (addrLine) doc.text(addrLine, pageW / 2, 19, { align: 'center' });
  const contactLine = [school.phone, school.email].filter(Boolean).join('  |  ');
  if (contactLine) doc.text(contactLine, pageW / 2, 25, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const termLabel = term.replace('term', 'Term ');
  doc.text(`STUDENT REPORT FORM — ${termLabel} ${academicYear}`, pageW / 2, 32, { align: 'center' });
  y = 44;

  // ── Student Details ─────────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, y, pageW - 2 * margin, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('STUDENT INFORMATION', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const leftCol = margin + 4;
  const rightCol = pageW / 2 + 4;
  doc.text(`Name: ${student.first_name} ${student.last_name}`, leftCol, y + 14);
  doc.text(`Adm No: ${student.admission_number || '—'}`, rightCol, y + 14);
  doc.text(`Class: ${student.class_name || '—'}`, leftCol, y + 20);
  doc.text(`Category: ${student.student_type === 'boarder' ? 'Boarder' : 'Day Scholar'}`, rightCol, y + 20);
  y += 30;

  // ── Assessments Table ────────────────────────────────────────────────────────
  if (assessments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('CBC ASSESSMENT RESULTS', margin + 4, y + 5.5);
    y += 10;
    doc.setTextColor(0, 0, 0);

    // Table header
    const colX = [margin, margin + 52, margin + 88, margin + 110, margin + 124, margin + 140];
    const colHeads = ['Learning Area', 'Type / Period', 'Score', 'Grade', 'Comment'];
    doc.setFillColor(219, 234, 254);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    colHeads.forEach((h, i) => doc.text(h, colX[i], y + 5));
    y += 8;

    doc.setFont('helvetica', 'normal');
    assessments.forEach((a, idx) => {
      if (y > 240) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
      }
      const grade = a.cbc_grade || a.pre_primary_grade || '';
      const score = a.result_code ? a.result_code : (a.score != null ? `${a.score}/${a.max_score}` : '—');
      const comment = a.teacher_comments || (grade ? AUTO_COMMENTS[grade] : '—') || '—';
      const period = a.exam_period ? a.exam_period.replace('_', '-') : a.assessment_type || '';

      doc.text((a.subject_name || '—').slice(0, 24), colX[0], y + 5);
      doc.text(period.slice(0, 18), colX[1], y + 5);
      doc.text(score, colX[2], y + 5);

      // Grade badge
      if (grade) {
        const [r, g, b] = GRADE_COLORS_HEX[grade] || [100, 100, 100];
        doc.setFillColor(r, g, b);
        doc.setTextColor(255, 255, 255);
        doc.roundedRect(colX[3], y + 0.5, 12, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(grade, colX[3] + 2, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('—', colX[3], y + 5);
      }

      doc.text(comment.slice(0, 24), colX[4], y + 5);
      y += 7;
    });
    y += 4;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('No assessment records found for the selected term.', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // ── Fees Section ─────────────────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('FEES ACCOUNT', margin + 4, y + 5.5);
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Build fees breakdown from feeAccount + feeStructures
  const invoices: any[] = feeAccount?.invoices || [];
  const totalBilled = Number(feeAccount?.total_fees) || 0;
  const totalPaid = Number(feeAccount?.paid) || 0;
  const balance = Number(feeAccount?.pending) || 0;

  // Identify transport structure
  const transportStructure = feeStructures.find(f =>
    f.name?.toLowerCase().includes('transport') || f.description?.toLowerCase().includes('transport')
  );
  const transportFee = transportStructure ? Number(transportStructure.amount) || 0 : 0;

  // Next term expected fees (same structures for next term)
  const termOrder: Record<string, string> = { term1: 'Term 2', term2: 'Term 3', term3: 'Term 1 (Next Year)' };
  const nextTerm = termOrder[term] || 'Next Term';
  const nextTermFees = feeStructures.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);

  const feeRows = [
    ['Current Term Total Fees Billed', `KES ${totalBilled.toLocaleString()}`],
    ['Amount Paid', `KES ${totalPaid.toLocaleString()}`],
    ['Outstanding Balance', `KES ${balance.toLocaleString()}`],
    ['Transport Charges (Term)', transportFee > 0 ? `KES ${transportFee.toLocaleString()}` : 'Not assigned'],
    [`Expected Fees — ${nextTerm}`, nextTermFees > 0 ? `KES ${nextTermFees.toLocaleString()}` : 'See fee structure'],
  ];

  doc.setFontSize(9);
  feeRows.forEach(([label, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    // Highlight balance in red if > 0
    if (label.includes('Outstanding') && balance > 0) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    doc.text(val, pageW - margin - 4, y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 7;
  });
  y += 4;

  // Individual invoice lines
  if (invoices.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Invoice Details:', margin + 4, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    invoices.slice(0, 6).forEach((inv: any) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`• ${inv.description || inv.invoice_number || 'Invoice'}`, margin + 6, y);
      doc.text(`KES ${Number(inv.net_amount || 0).toLocaleString()}  (Bal: KES ${Number(inv.balance_amount || 0).toLocaleString()})`, pageW - margin - 4, y, { align: 'right' });
      y += 5;
    });
    y += 3;
  }

  // ── Signatures ──────────────────────────────────────────────────────────────
  if (y > 250) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(180);
  const sigY = y + 12;
  doc.line(margin, sigY, margin + 50, sigY);
  doc.line(pageW / 2 - 10, sigY, pageW / 2 + 40, sigY);
  doc.line(pageW - margin - 50, sigY, pageW - margin, sigY);
  doc.text('Class Teacher', margin, sigY + 5);
  doc.text('Head Teacher', pageW / 2 - 10, sigY + 5);
  doc.text("Parent's Signature", pageW - margin - 50, sigY + 5);

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}  |  ${school.school_name || 'SkulManager'}  |  Confidential`,
    pageW / 2, 290, { align: 'center' }
  );

  const safeFileName = `${student.first_name}_${student.last_name}_${termLabel}_${academicYear}_report.pdf`.replace(/\s+/g, '_');
  doc.save(safeFileName);
}

// ── Page Component ──────────────────────────────────────────────────────────

export function StudentReportPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [term, setTerm] = useState('term1');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getStudents().then((res: any) => setStudents(res?.data || [])).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s =>
    !searchTerm || `${s.first_name} ${s.last_name} ${s.admission_number} ${s.class_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const [schoolRes, assessRes, feeRes, feeStructRes]: any[] = await Promise.all([
        api.getSettings(),
        api.getCbcAssessments({ student_id: selectedStudent.id, term, academic_year: academicYear }),
        api.getStudentFeeAccount(selectedStudent.id).catch(() => null),
        api.getFeeStructures({ classId: selectedStudent.class_id }).catch(() => ({ data: [] })),
      ]);

      const school = schoolRes?.data || schoolRes || {};
      const assessments = assessRes?.data || [];
      const feeAccount = feeRes?.data || feeRes || null;
      const feeStructures = feeStructRes?.data || [];

      await generateStudentReportPDF(
        selectedStudent, assessments, feeAccount, school, feeStructures, term, academicYear
      );
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

          {/* Info note */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
            <p>The PDF report will include:</p>
            <p>• School logo, name, address and contact</p>
            <p>• Student details and CBC assessment grades with auto-comments</p>
            <p>• Fees section: amount billed, paid, outstanding balance</p>
            <p>• Transport charges and next term expected fees</p>
            <p>• Signature lines for Class Teacher, Head Teacher, and Parent</p>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={!selectedStudent || generating}>
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
