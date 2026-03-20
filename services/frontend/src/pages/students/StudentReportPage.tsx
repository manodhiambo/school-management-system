import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, FileText, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { jsPDF } from 'jspdf';

const GRADE_COLORS_HEX: Record<string, [number, number, number]> = {
  EE: [22, 163, 74],   EE1: [15, 118, 54],  EE2: [22, 163, 74],
  ME: [37, 99, 235],   ME1: [29, 78, 216],  ME2: [37, 99, 235],
  AE: [202, 138, 4],   AE1: [180, 120, 2],  AE2: [202, 138, 4],
  BE: [220, 38, 38],   BE1: [185, 28, 28],  BE2: [220, 38, 38],
  WD: [22, 163, 74], D: [202, 138, 4], B: [220, 38, 38],
};
const GRADE_POINTS: Record<string, number> = {
  EE1: 8, EE2: 7, ME1: 6, ME2: 5, AE1: 4, AE2: 3, BE1: 2, BE2: 1,
};
const GRADE_POINTS_PRIMARY: Record<string, number> = {
  EE: 4, ME: 3, AE: 2, BE: 1,
};
const AUTO_COMMENTS: Record<string, string> = {
  EE: 'EXCELLENT', EE1: 'EXCELLENT', EE2: 'EXCELLENT',
  ME: 'GOOD',      ME1: 'GOOD',      ME2: 'GOOD',
  AE: 'Can do better', AE1: 'Can do better', AE2: 'Can do better',
  BE: 'Put More Effort', BE1: 'Put More Effort', BE2: 'Put More Effort',
  WD: 'EXCELLENT', D: 'Can do better', B: 'Put More Effort',
};

// Facilitator comment based on average points per subject (JSS scale: 1–8)
function getFacilitatorComment(avgPoints: number): { comment: string; color: [number, number, number] } {
  const rounded = Math.round(avgPoints);
  if (rounded >= 8) return { comment: 'Outstanding! You are a star performer. Keep it up!',               color: [22, 163, 74]  };
  if (rounded === 7) return { comment: 'Excellent work! Your hard work is really showing.',                color: [34, 197, 94]  };
  if (rounded === 6) return { comment: 'Good job! You are doing great, keep putting in the effort.',       color: [37, 99, 235]  };
  if (rounded === 5) return { comment: 'Well done! You have mastered this. Stay focused.',                 color: [59, 130, 246] };
  if (rounded === 4) return { comment: 'Nice effort! You are so close, just a little more practice.',      color: [202, 138, 4]  };
  if (rounded === 3) return { comment: 'Nice effort! I believe you can do even better next time.',         color: [217, 119, 6]  };
  if (rounded === 2) return { comment: "Don't give up! Keep trying until you get there.",                  color: [220, 38, 38]  };
  return                    { comment: 'You can do it! Keep trying until you get it.',                     color: [185, 28, 28]  };
}

// Facilitator comment based on average points per subject (Primary scale: 1–4)
function getFacilitatorCommentPrimary(avgPoints: number): { comment: string; color: [number, number, number] } {
  const rounded = Math.round(avgPoints);
  if (rounded >= 4) return { comment: 'Outstanding! You are a star performer. Keep it up!',         color: [22, 163, 74]  };
  if (rounded === 3) return { comment: 'Good job! You are doing great, keep putting in the effort.', color: [37, 99, 235]  };
  if (rounded === 2) return { comment: "Nice effort! I believe you can do even better next time.",   color: [202, 138, 4]  };
  return                    { comment: 'You can do it! Keep trying until you get it.',               color: [220, 38, 38]  };
}

// Facilitator comment based on grade distribution (pre-primary)
function getFacilitatorCommentFromGrades(grades: string[]): { comment: string; color: [number, number, number] } {
  const total = grades.length;
  if (total === 0) return { comment: 'No assessment data available for this term.', color: [150, 150, 150] };
  const eeCount = grades.filter(g => g.startsWith('EE') || g === 'WD').length;
  const meCount = grades.filter(g => g.startsWith('ME') || g === 'D').length;
  const beCount = grades.filter(g => g.startsWith('BE') || g === 'B').length;
  const pctHigh = (eeCount + meCount) / total;
  if (pctHigh >= 0.85 && eeCount / total >= 0.5)
    return { comment: 'Outstanding performance! Keep up the excellent work.', color: [22, 163, 74] };
  if (pctHigh >= 0.7)
    return { comment: 'Good performance. Continue working hard to achieve more.', color: [37, 99, 235] };
  if (beCount / total < 0.3)
    return { comment: 'Fair performance. More effort is needed to improve.', color: [202, 138, 4] };
  if (beCount / total < 0.6)
    return { comment: 'Below average. Put in more effort to catch up with the class.', color: [220, 38, 38] };
  return { comment: 'Very poor performance. Urgent improvement required — please see the class teacher.', color: [185, 28, 28] };
}

async function generateStudentReportPDF(
  student: any,
  assessments: any[],
  feeAccount: any,
  school: any,
  feeStructures: any[],
  term: string,
  academicYear: string,
  transportAssignment?: any,
  extraFees: any[] = []
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // ── School Header ───────────────────────────────────────────────────────────
  const headerH = 40;
  const imgSize = 28;
  // White header background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, headerH, 'F');
  // Bottom border line
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(0, headerH, pageW, headerH);
  doc.setLineWidth(0.2);

  // School logo — LEFT
  if (school.school_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            const fmt = school.school_logo_url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(img, fmt, margin, (headerH - imgSize) / 2, imgSize, imgSize);
          } catch { /* skip */ }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = school.school_logo_url;
      });
    } catch { /* skip */ }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, (headerH - imgSize) / 2, imgSize, imgSize, 'D');
    doc.setFontSize(5); doc.setTextColor(150, 150, 150);
    doc.text('LOGO', margin + imgSize / 2, headerH / 2, { align: 'center' });
  }

  // Student passport photo — RIGHT
  const photoX = pageW - margin - imgSize;
  const studentPhotoUrl = student.profile_photo_url || null;
  if (studentPhotoUrl) {
    try {
      const sImg = new Image();
      sImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        sImg.onload = () => {
          try {
            const fmt = studentPhotoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(sImg, fmt, photoX, (headerH - imgSize) / 2, imgSize, imgSize);
          } catch { /* skip */ }
          resolve();
        };
        sImg.onerror = () => resolve();
        sImg.src = studentPhotoUrl;
      });
    } catch { /* skip */ }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.rect(photoX, (headerH - imgSize) / 2, imgSize, imgSize, 'D');
    doc.setFontSize(5); doc.setTextColor(150, 150, 150);
    doc.text('PHOTO', photoX + imgSize / 2, headerH / 2, { align: 'center' });
  }

  // School info — centered between logo and photo
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(school.school_name || 'School Management System', pageW / 2, 11, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const addrLine = [school.address, school.city, school.state].filter(Boolean).join(', ');
  if (addrLine) doc.text(addrLine, pageW / 2, 18, { align: 'center' });
  const contactLine = [school.phone, school.email].filter(Boolean).join('  |  ');
  if (contactLine) doc.text(contactLine, pageW / 2, 24, { align: 'center' });
  if (school.motto) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(school.motto, pageW / 2, 30, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  const termLabel = term.replace('term', 'Term ');
  doc.text(`STUDENT REPORT FORM — ${termLabel} ${academicYear}`, pageW / 2, 37, { align: 'center' });
  y = headerH + 8;

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
    // Detect level: JSS (has grade_points), Primary (cbc_grade = EE/ME/AE/BE), Pre-primary (WD/D/B)
    const hasJSS = assessments.some((a: any) => a.grade_points != null);
    const hasPrimary = !hasJSS && assessments.some((a: any) => GRADE_POINTS_PRIMARY[a.cbc_grade] != null);
    // JSS and Primary both get a Pts column; pre-primary does not
    const colX = (hasJSS || hasPrimary)
      ? [margin, margin + 48, margin + 80, margin + 100, margin + 116, margin + 128, margin + 148]
      : [margin, margin + 52, margin + 88, margin + 110, margin + 124, margin + 140];
    const colHeads = (hasJSS || hasPrimary)
      ? ['Learning Area', 'Type / Period', 'Score', 'Grade', 'Pts', 'Facilitator']
      : ['Learning Area', 'Type / Period', 'Score', 'Grade', 'Facilitator'];
    doc.setFillColor(219, 234, 254);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    colHeads.forEach((h, i) => doc.text(h, colX[i], y + 5));
    y += 8;

    doc.setFont('helvetica', 'normal');
    assessments.forEach((a: any, idx: number) => {
      if (y > 240) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
      }
      const grade = a.cbc_grade || a.pre_primary_grade || '';
      const score = a.result_code ? a.result_code : (a.score != null ? `${a.score}/${a.max_score}` : '—');
      const facilitator = (a.teacher_name || '—');
      const period = a.exam_period ? a.exam_period.replace('_', '-') : a.assessment_type || '';

      doc.text((a.subject_name || '—').slice(0, 24), colX[0], y + 5);
      doc.text(period.slice(0, 18), colX[1], y + 5);
      doc.text(score, colX[2], y + 5);

      // Grade badge
      if (grade) {
        const [r, g, b] = GRADE_COLORS_HEX[grade] || [100, 100, 100];
        doc.setFillColor(r, g, b);
        doc.setTextColor(255, 255, 255);
        doc.roundedRect(colX[3], y + 0.5, hasJSS ? 14 : 12, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(grade, colX[3] + 1.5, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('—', colX[3], y + 5);
      }

      if (hasJSS) {
        const pts = a.grade_points != null ? String(a.grade_points) : '—';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(pts, colX[4], y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(facilitator.slice(0, 22), colX[5], y + 5);
      } else if (hasPrimary) {
        const pts = GRADE_POINTS_PRIMARY[a.cbc_grade] != null ? String(GRADE_POINTS_PRIMARY[a.cbc_grade]) : '—';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(pts, colX[4], y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(facilitator.slice(0, 22), colX[5], y + 5);
      } else {
        doc.text(facilitator.slice(0, 24), colX[4], y + 5);
      }
      y += 7;
    });

    // ── Total Points & Facilitator Comment ────────────────────────────────────
    if (y > 250) { doc.addPage(); y = 20; }
    y += 2;

    if (hasJSS) {
      const validPts = assessments.filter((a: any) => a.grade_points != null);
      const totalPts = validPts.reduce((s: number, a: any) => s + Number(a.grade_points), 0);
      const avgPts = validPts.length > 0 ? totalPts / validPts.length : 0;
      const maxPts = validPts.length * 8;
      const { comment, color } = getFacilitatorComment(avgPts);

      // Total Points row
      doc.setFillColor(219, 234, 254);
      doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL POINTS', margin + 4, y + 5.5);
      doc.text(`${totalPts} / ${maxPts}`, pageW - margin - 4, y + 5.5, { align: 'right' });
      y += 9;

      // Average Points row
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Average Points per Subject', margin + 4, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(avgPts.toFixed(1), pageW - margin - 4, y + 5, { align: 'right' });
      y += 8;

      // Facilitator Comment row (two lines: label + comment)
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin, y, pageW - 2 * margin, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`FACILITATOR'S COMMENT:  (Total: ${totalPts}/${maxPts}  |  Avg: ${avgPts.toFixed(1)} pts/subject)`, margin + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(comment, margin + 4, y + 11);
      doc.setTextColor(0, 0, 0);
      y += 17;
    } else if (hasPrimary) {
      // Primary (Grade 1–6): EE=4, ME=3, AE=2, BE=1
      const validPts = assessments.filter((a: any) => GRADE_POINTS_PRIMARY[a.cbc_grade] != null);
      const totalPts = validPts.reduce((s: number, a: any) => s + GRADE_POINTS_PRIMARY[a.cbc_grade], 0);
      const avgPts = validPts.length > 0 ? totalPts / validPts.length : 0;
      const maxPts = validPts.length * 4;
      const { comment, color } = getFacilitatorCommentPrimary(avgPts);

      // Total Points row
      doc.setFillColor(219, 234, 254);
      doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL POINTS', margin + 4, y + 5.5);
      doc.text(`${totalPts} / ${maxPts}`, pageW - margin - 4, y + 5.5, { align: 'right' });
      y += 9;

      // Average Points row
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Average Points per Subject', margin + 4, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(avgPts.toFixed(1), pageW - margin - 4, y + 5, { align: 'right' });
      y += 8;

      // Facilitator Comment row (two lines)
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin, y, pageW - 2 * margin, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`FACILITATOR'S COMMENT:  (Total: ${totalPts}/${maxPts}  |  Avg: ${avgPts.toFixed(1)} pts/subject)`, margin + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(comment, margin + 4, y + 11);
      doc.setTextColor(0, 0, 0);
      y += 17;
    } else {
      // Pre-primary (WD / D / B): grade distribution comment only
      const grades = assessments.map((a: any) => a.pre_primary_grade || '');
      const { comment, color } = getFacilitatorCommentFromGrades(grades);
      const wdC = grades.filter((g: string) => g === 'WD').length;
      const dC  = grades.filter((g: string) => g === 'D').length;
      const bC  = grades.filter((g: string) => g === 'B').length;

      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin, y, pageW - 2 * margin, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`FACILITATOR'S COMMENT:  (WD:${wdC}  D:${dC}  B:${bC})`, margin + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(comment, margin + 4, y + 11);
      doc.setTextColor(0, 0, 0);
      y += 17;
    }

    y += 2;
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

  // Build fees breakdown from feeStructures (per-item list) + actuals from feeAccount
  const totalPaid = Number(feeAccount?.paid) || 0;
  const balance = Number(feeAccount?.pending) || 0;

  // Non-transport fee structures applicable to this student
  const nonTransportStructures = feeStructures.filter((f: any) => {
    if (f.is_transport_fee) return false;
    const st = f.student_type || 'all';
    return st === 'all' || st === student.student_type;
  });

  // Build transport fee row from actual route assignment (term_fee), or fee structure fallback
  type FeeItem = { label: string; amount: number };
  const feeItems: FeeItem[] = nonTransportStructures.map((f: any) => ({
    label: f.name,
    amount: Number(f.amount) || 0,
  }));

  if (transportAssignment) {
    const routeFee = Number(transportAssignment.term_fee) || 0;
    feeItems.push({
      label: `Transport — ${transportAssignment.route_name || 'Route'}`,
      amount: routeFee,
    });
  } else {
    // Fallback: any transport fee structure if student uses_transport
    const tStruct = feeStructures.find((f: any) => f.is_transport_fee && student.uses_transport);
    if (tStruct) {
      feeItems.push({
        label: `Transport — ${tStruct.route_name || tStruct.name}`,
        amount: Number(tStruct.amount) || 0,
      });
    }
  }

  // Extra / miscellaneous fees
  for (const ef of extraFees) {
    feeItems.push({ label: ef.name, amount: Number(ef.amount) || 0 });
  }

  const structureTotal = feeItems.reduce((s: number, f) => s + f.amount, 0);

  // Fee structure line items
  doc.setFontSize(9);
  feeItems.forEach((f, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(f.label, margin + 4, y + 5);
    doc.text(`KES ${f.amount.toLocaleString()}`, pageW - margin - 4, y + 5, { align: 'right' });
    y += 7;
  });

  if (feeItems.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No fee structure configured for this class/student.', margin + 4, y + 5);
    y += 7;
  }

  // Divider + Total row
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y + 1, pageW - margin, y + 1);
  y += 3;
  doc.setFillColor(220, 240, 255);
  doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL FEES', margin + 4, y + 5);
  doc.text(`KES ${structureTotal.toLocaleString()}`, pageW - margin - 4, y + 5, { align: 'right' });
  y += 7;

  // Paid & Balance summary
  const summaryRows: [string, string, boolean][] = [
    ['Amount Paid', `KES ${totalPaid.toLocaleString()}`, false],
    ['Outstanding Balance', `KES ${balance.toLocaleString()}`, balance > 0],
  ];
  summaryRows.forEach(([label, val, isRed], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isRed ? 220 : 0, isRed ? 38 : 0, isRed ? 38 : 0);
    doc.text(val, pageW - margin - 4, y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 7;
  });
  y += 4;

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
      const [schoolRes, assessRes, feeRes, feeStructRes, transportRes, extraFeesRes]: any[] = await Promise.all([
        api.getSettings(),
        api.getCbcAssessments({ student_id: selectedStudent.id, term, academic_year: academicYear }),
        api.getStudentFeeAccount(selectedStudent.id).catch(() => null),
        api.getFeeStructures({ classId: selectedStudent.class_id }).catch(() => ({ data: [] })),
        api.getTransportStudents({ student_id: selectedStudent.id }).catch(() => ({ data: [] })),
        api.getExtraFeesForReport({ student_id: selectedStudent.id, class_id: selectedStudent.class_id, term, academic_year: academicYear }).catch(() => ({ data: [] })),
      ]);

      const school = schoolRes?.data || schoolRes || {};
      const assessments = assessRes?.data || [];
      const feeAccount = feeRes?.data || feeRes || null;
      const feeStructures = feeStructRes?.data || [];
      const transportList: any[] = transportRes?.data || [];
      const transportAssignment = transportList.length > 0 ? transportList[0] : null;
      const extraFees: any[] = extraFeesRes?.data || [];

      await generateStudentReportPDF(
        selectedStudent, assessments, feeAccount, school, feeStructures, term, academicYear, transportAssignment, extraFees
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
