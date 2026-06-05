import { jsPDF } from 'jspdf';

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  navy:    [15,  32,  86]  as [number,number,number],
  blue:    [37, 99, 235]   as [number,number,number],
  sky:     [224, 236, 255] as [number,number,number],
  teal:    [20, 148, 132]  as [number,number,number],
  green:   [22, 163,  74]  as [number,number,number],
  amber:   [217, 119,  6]  as [number,number,number],
  red:     [220,  38,  38] as [number,number,number],
  purple:  [124,  58, 237] as [number,number,number],
  slate:   [71,  85, 105]  as [number,number,number],
  light:   [248, 250, 252] as [number,number,number],
  white:   [255, 255, 255] as [number,number,number],
  black:   [15,  23,  42]  as [number,number,number],
  border:  [226, 232, 240] as [number,number,number],
  muted:   [148, 163, 184] as [number,number,number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M      = 14; // margin
const COL    = PAGE_W - M * 2;

type RGB = [number, number, number];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setFill(doc: jsPDF, rgb: RGB)   { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc: jsPDF, rgb: RGB)   { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
function setTxt(doc: jsPDF,  rgb: RGB)   { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

function bold(doc: jsPDF, sz: number)   { doc.setFont('helvetica', 'bold');   doc.setFontSize(sz); }
function normal(doc: jsPDF, sz: number) { doc.setFont('helvetica', 'normal'); doc.setFontSize(sz); }
function italic(doc: jsPDF, sz: number) { doc.setFont('helvetica', 'italic'); doc.setFontSize(sz); }

/** Wrapped text, returns new y */
function wrapText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const lines = doc.splitTextToSize(text, maxW);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

/** Check page space, add new page if needed */
function guard(doc: jsPDF, y: number, need: number, pageNum: { n: number }): number {
  if (y + need > PAGE_H - 18) {
    doc.addPage();
    pageNum.n++;
    addPageFooter(doc, pageNum.n);
    return 22;
  }
  return y;
}

function addPageFooter(doc: jsPDF, pageNum: number) {
  const total = doc.getNumberOfPages();
  setFill(doc, C.navy);
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
  setTxt(doc, C.white);
  normal(doc, 7);
  doc.text('SkulManager — System Blueprint & Feature Guide  |  Confidential', M, PAGE_H - 3.5);
  doc.text(`Page ${pageNum} of ${total}`, PAGE_W - M, PAGE_H - 3.5, { align: 'right' });
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function addCoverPage(doc: jsPDF, schoolName: string) {
  // Full-page navy background
  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Decorative teal stripe at top
  setFill(doc, C.teal);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  // Large logo box
  setFill(doc, [255, 255, 255, 0.08] as any);
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.07 }));
  doc.circle(PAGE_W / 2, 80, 55, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // "S" monogram
  bold(doc, 48);
  setTxt(doc, C.teal);
  doc.text('S', PAGE_W / 2, 88, { align: 'center' });

  // Title block
  bold(doc, 26);
  setTxt(doc, C.white);
  doc.text('SkulManager', PAGE_W / 2, 118, { align: 'center' });

  bold(doc, 13);
  setTxt(doc, C.teal);
  doc.text('System Blueprint & Feature Guide', PAGE_W / 2, 128, { align: 'center' });

  // Subtitle band
  setFill(doc, C.teal);
  doc.rect(M, 137, COL, 0.5, 'F');

  normal(doc, 11);
  setTxt(doc, [186, 230, 253] as any);
  doc.text('CBE • Finance • Welfare • SMS • Transport • Hostel • Payroll • IGCSE', PAGE_W / 2, 148, { align: 'center' });

  // School name box
  setFill(doc, [255, 255, 255, 0.1] as any);
  doc.setFillColor(25, 50, 110);
  doc.roundedRect(M + 20, 160, COL - 40, 22, 4, 4, 'F');
  bold(doc, 12);
  setTxt(doc, C.white);
  doc.text(schoolName, PAGE_W / 2, 171, { align: 'center' });
  normal(doc, 9);
  setTxt(doc, C.muted);
  doc.text('Prepared exclusively for your institution', PAGE_W / 2, 178, { align: 'center' });

  // Stats row
  const stats = [
    { val: '25+', lbl: 'Modules' },
    { val: '600+', lbl: 'Features' },
    { val: '7', lbl: 'User Roles' },
    { val: '100%', lbl: 'CBE Ready' },
  ];
  const boxW = (COL - 12) / 4;
  stats.forEach((s, i) => {
    const bx = M + i * (boxW + 4);
    setFill(doc, [25, 50, 110]);
    doc.roundedRect(bx, 195, boxW, 26, 3, 3, 'F');
    bold(doc, 16);
    setTxt(doc, C.teal);
    doc.text(s.val, bx + boxW / 2, 207, { align: 'center' });
    normal(doc, 7.5);
    setTxt(doc, C.muted);
    doc.text(s.lbl, bx + boxW / 2, 214, { align: 'center' });
  });

  // Version + date
  normal(doc, 8);
  setTxt(doc, C.muted);
  doc.text(`Version 2.0  ·  ${new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' })}`, PAGE_W / 2, 240, { align: 'center' });

  italic(doc, 8);
  setTxt(doc, [100, 116, 139] as any);
  doc.text('This document is intended for school administrators, board members, and prospective clients.', PAGE_W / 2, 250, { align: 'center' });
  doc.text('All features described are fully implemented and operational.', PAGE_W / 2, 257, { align: 'center' });

  // Bottom teal band
  setFill(doc, C.teal);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F');
  bold(doc, 9);
  setTxt(doc, C.white);
  doc.text('Helvino Technologies Ltd  |  helvinotechltd@gmail.com', PAGE_W / 2, PAGE_H - 5.5, { align: 'center' });
}

// ─── Section heading banner ───────────────────────────────────────────────────
function sectionBanner(doc: jsPDF, y: number, title: string, accent: RGB): number {
  setFill(doc, accent);
  doc.rect(M, y, COL, 10, 'F');
  bold(doc, 11);
  setTxt(doc, C.white);
  doc.text(title.toUpperCase(), M + 4, y + 7);
  return y + 14;
}

// ─── Module card (with icon char) ────────────────────────────────────────────
interface ModuleData {
  num: string;
  title: string;
  color: RGB;
  features: string[];
  description: string;
}

function moduleCard(doc: jsPDF, y: number, mod: ModuleData, pageNum: { n: number }): number {
  const cardH = 10 + mod.features.length * 5.5 + 16;
  y = guard(doc, y, cardH, pageNum);

  // Header bar
  setFill(doc, mod.color);
  doc.roundedRect(M, y, COL, 10, 2, 2, 'F');
  bold(doc, 10);
  setTxt(doc, C.white);
  doc.text(`${mod.num}  ${mod.title}`, M + 4, y + 7);
  y += 12;

  // Light background
  setFill(doc, C.light);
  doc.rect(M, y, COL, cardH - 12, 'F');

  // Description
  y += 4;
  normal(doc, 8.5);
  setTxt(doc, C.slate);
  const lines = doc.splitTextToSize(mod.description, COL - 8);
  lines.forEach((l: string) => { doc.text(l, M + 4, y); y += 4.5; });
  y += 2;

  // Feature bullets in 2 columns
  const half = Math.ceil(mod.features.length / 2);
  const leftFeatures  = mod.features.slice(0, half);
  const rightFeatures = mod.features.slice(half);
  const colW = (COL - 8) / 2;
  const startY = y;

  leftFeatures.forEach((f, i) => {
    setFill(doc, mod.color);
    doc.circle(M + 5.5, startY + i * 5.5 - 1, 1.2, 'F');
    normal(doc, 8);
    setTxt(doc, C.black);
    doc.text(f, M + 9, startY + i * 5.5);
  });

  rightFeatures.forEach((f, i) => {
    setFill(doc, mod.color);
    doc.circle(M + colW + 9, startY + i * 5.5 - 1, 1.2, 'F');
    normal(doc, 8);
    setTxt(doc, C.black);
    doc.text(f, M + colW + 13, startY + i * 5.5);
  });

  y = startY + Math.max(leftFeatures.length, rightFeatures.length) * 5.5 + 4;

  // Bottom separator
  setDraw(doc, C.border);
  doc.line(M, y, M + COL, y);
  return y + 6;
}

// ─── Table of Contents ───────────────────────────────────────────────────────
function addTOC(doc: jsPDF) {
  doc.addPage();
  const pageNum = { n: 2 };
  addPageFooter(doc, 2);

  // Header
  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('Table of Contents', M, 18);
  normal(doc, 9);
  setTxt(doc, C.teal);
  doc.text('Click any section header to navigate', M, 24);

  let y = 38;
  const sections = [
    { num: '1',   title: 'Executive Summary',                    pg: 3  },
    { num: '2',   title: 'System Modules At a Glance',           pg: 4  },
    { num: '3',   title: 'People Management',                    pg: 5  },
    { num: '4',   title: 'Academic Management (CBE)',            pg: 6  },
    { num: '5',   title: 'Attendance Management',                pg: 8  },
    { num: '6',   title: 'Results, Exams & Grading',             pg: 9  },
    { num: '7',   title: 'Finance & Fee Management',             pg: 10 },
    { num: '8',   title: 'Library Management',                   pg: 12 },
    { num: '9',   title: 'Communication, SMS & WhatsApp',        pg: 13 },
    { num: '10',  title: 'Student Welfare (Discipline & Health)', pg: 14 },
    { num: '11',  title: 'Transport, Driver & Gate Management',  pg: 15 },
    { num: '11c', title: 'Hostel & Canteen Management',          pg: 16 },
    { num: '12',  title: 'Staff Leave Management',               pg: 17 },
    { num: '13',  title: 'IGCSE Cambridge Module',               pg: 17 },
    { num: '14',  title: 'Timetable Management',                 pg: 18 },
    { num: '14b', title: 'Payroll, Appraisals & Substitutes',    pg: 18 },
    { num: '14c', title: 'Bursary & Inventory',                  pg: 19 },
    { num: '14d', title: 'Teacher Check-in & Counseling',        pg: 19 },
    { num: '14e', title: 'NEMIS Export & Audit Log',             pg: 20 },
    { num: '15',  title: 'Dashboards & Analytics',               pg: 20 },
    { num: '16',  title: 'User Roles & Permissions',             pg: 21 },
    { num: '17',  title: 'CBE Grading Reference',                pg: 22 },
    { num: '18',  title: 'Kenya Education Structure',            pg: 22 },
    { num: '19',  title: 'Payment Methods Supported',            pg: 23 },
    { num: '20',  title: 'Technical Specifications',             pg: 23 },
    { num: '21',  title: 'Getting Started Checklist',            pg: 24 },
  ];

  sections.forEach((s, i) => {
    const rowY = y + i * 9;
    if (i % 2 === 0) {
      setFill(doc, C.light);
      doc.rect(M, rowY - 4, COL, 9, 'F');
    }
    bold(doc, 9);
    setTxt(doc, C.navy);
    doc.text(`${s.num}.`, M + 3, rowY + 1);
    normal(doc, 9);
    setTxt(doc, C.black);
    doc.text(s.title, M + 12, rowY + 1);
    setTxt(doc, C.muted);
    doc.text(`${s.pg}`, PAGE_W - M, rowY + 1, { align: 'right' });
    // dots
    const dotsX1 = M + 12 + doc.getTextWidth(s.title) + 3;
    const dotsX2 = PAGE_W - M - 10;
    setTxt(doc, C.border);
    doc.text('.' .repeat(Math.max(0, Math.floor((dotsX2 - dotsX1) / 1.5))), dotsX1, rowY + 1);
  });
}

// ─── Executive Summary ────────────────────────────────────────────────────────
function addExecutiveSummary(doc: jsPDF, schoolName: string, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('1. Executive Summary', M, 18);

  let y = 38;

  // Intro paragraph
  normal(doc, 9.5);
  setTxt(doc, C.black);
  y = wrapText(doc,
    `SkulManager is a comprehensive, cloud-based school management system developed by Helvino Technologies Ltd specifically ` +
    `for Kenyan educational institutions operating under the Competency-Based Education (CBE) curriculum. The platform ` +
    `serves all stakeholders — administrators, teachers, students, parents, and finance officers — through a single ` +
    `integrated solution accessible from any device with an internet connection.`,
    M, y, COL, 5.5);
  y += 4;

  // Key value boxes
  const values = [
    { title: 'CBE-First Design',      desc: 'Built from the ground up for Kenya\'s CBE curriculum with strand-based assessments, competency tracking, and holistic report cards.',     color: C.blue },
    { title: 'All-in-One Platform',   desc: 'Replaces paper registers, spreadsheets, and disparate tools with a single platform covering 25+ modules and 600+ features.',              color: C.teal },
    { title: 'SMS & WhatsApp',        desc: 'Africa\'s Talking bulk SMS, device-native WhatsApp, two-way keyword replies — parents stay informed in real time.',                       color: C.green },
    { title: 'Financial Integrity',   desc: 'Comprehensive fee management, M-Pesa, payroll, bursary, inventory, double-entry finance module, petty cash and asset tracking.',          color: C.amber },
    { title: 'Student Welfare',       desc: 'Discipline, health records, counselling, transport tracking, hostel, canteen, gate management — holistic oversight of every learner.',    color: C.purple },
    { title: 'Multi-Tenant SaaS',     desc: 'Schools are fully isolated tenants. Your data is private, secure, and accessible only to authorised users in your institution.',          color: C.navy },
  ];

  values.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx  = M + col * (COL / 2 + 2);
    const by  = y + row * 42;
    const bw  = COL / 2 - 2;

    setFill(doc, C.light);
    doc.roundedRect(bx, by, bw, 38, 3, 3, 'F');
    setFill(doc, v.color);
    doc.roundedRect(bx, by, 3, 38, 1, 1, 'F');

    bold(doc, 9);
    setTxt(doc, v.color);
    doc.text(v.title, bx + 7, by + 8);

    normal(doc, 7.5);
    setTxt(doc, C.slate);
    const dlines = doc.splitTextToSize(v.desc, bw - 10);
    dlines.slice(0, 5).forEach((l: string, li: number) => {
      doc.text(l, bx + 7, by + 15 + li * 4.5);
    });
  });

  y += 3 * 42 + 8;

  // Why SkulManager section
  setFill(doc, C.sky);
  doc.rect(M, y, COL, 0.5, 'F');
  y += 5;

  bold(doc, 11);
  setTxt(doc, C.navy);
  doc.text('Why SkulManager?', M, y);
  y += 7;

  const bullets = [
    'Designed specifically for Kenyan schools — CBE, 8-4-4 legacy, IGCSE Cambridge all supported',
    'Reduces administrative workload by up to 70% — no more paper registers, manual receipts, or spreadsheet grades',
    'Parents receive instant SMS/WhatsApp alerts for absences, discipline, fees, and results on their phones',
    'Role-based access (7 roles) — teachers see only what they need, parents only their children\'s data',
    'Built-in SMS (Africa\'s Talking), device-native WhatsApp, and two-way SMS keyword auto-replies',
    'Real-time transport tracking — parents see whether their child was picked up this morning',
    'Generate professional CBE report cards, fee receipts, analytics PDFs, and timetables in one click',
    'NEMIS compliance tools — validate, export, and submit government-required student data',
    'Full HR suite: payroll, appraisals, substitutes, teacher check-in, leave management',
    'Secure, multi-tenant cloud architecture — your data is never shared with other schools',
  ];

  bullets.forEach(b => {
    y = guard(doc, y, 8, pageNum);
    setFill(doc, C.teal);
    doc.circle(M + 3, y - 1.5, 1.5, 'F');
    normal(doc, 8.5);
    setTxt(doc, C.black);
    y = wrapText(doc, b, M + 8, y, COL - 8, 4.8);
    y += 2;
  });
}

// ─── All-modules overview (grid) ─────────────────────────────────────────────
function addModuleOverview(doc: jsPDF, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('2. System Modules At a Glance', M, 18);

  const modules = [
    { icon: '👥', title: 'People Management',      desc: 'Students, teachers, parents, staff profiles and user accounts',                       color: C.blue   },
    { icon: '📚', title: 'CBE Academics',           desc: 'Classes, subjects, schemes of work, lesson plans, SBA, projects, promotions',          color: C.teal   },
    { icon: '✅', title: 'Attendance',              desc: 'Daily marking, bulk entry, monthly reports, parent absent alerts',                     color: C.green  },
    { icon: '📝', title: 'Exams & Results',         desc: 'Online & offline exams, mark entry, publish results, CBE grade computation',           color: C.purple },
    { icon: '💰', title: 'Fee Management',          desc: 'Invoices, payments, receipts, defaulter reports, extra fees, multi-method support',    color: C.amber  },
    { icon: '🏦', title: 'Finance Module',          desc: 'Income, expenses, budgets, bank accounts, petty cash, assets, purchase orders',        color: C.red    },
    { icon: '📖', title: 'Library',                 desc: 'Book catalogue, issue/return, borrowings, fines, member management',                   color: C.teal   },
    { icon: '💬', title: 'Communication & SMS',     desc: 'Messaging, announcements, bulk SMS (Africa\'s Talking), WhatsApp, two-way SMS',        color: C.blue   },
    { icon: '🚌', title: 'Transport & Driver',      desc: 'Routes, GPS pickup tracking, driver dashboard, parent transport widget',               color: C.green  },
    { icon: '⚕️', title: 'Health & Welfare',       desc: 'Health records, medical profiles, discipline incidents, counselling sessions',          color: C.red    },
    { icon: '🗓️', title: 'Timetable',             desc: 'Class schedules, teacher assignments, conflict detection, PDF download & print',        color: C.navy   },
    { icon: '🎓', title: 'IGCSE Cambridge',         desc: 'Sessions, syllabi, component marks, grade calculation, results publication',           color: C.purple },
    { icon: '🏖️', title: 'Staff Leave',            desc: 'Leave requests, types, admin approval, leave balance tracking',                        color: C.amber  },
    { icon: '📊', title: 'Analytics & Reports',     desc: 'CBE analytics, broadsheet, attendance rates, finance reports, exam analytics',         color: C.teal   },
    { icon: '🏠', title: 'Hostel & Canteen',        desc: 'Hostel rooms, student allocation, canteen items, student wallet, top-up',              color: C.slate  },
    { icon: '💼', title: 'Payroll & Appraisals',    desc: 'Staff payroll, payslips, performance appraisals, substitute management',               color: C.green  },
    { icon: '🛡️', title: 'Gate Management',        desc: 'Visitor log, student check-in/out, gate dashboard, security records',                  color: C.navy   },
    { icon: '🎒', title: 'Bursary & Inventory',     desc: 'Bursary awards, beneficiary tracking, inventory, stock management, reorder alerts',    color: C.amber  },
    { icon: '📋', title: 'NEMIS & Audit Log',       desc: 'NEMIS data export, validation, audit trail of all user actions, CSV export',           color: C.slate  },
    { icon: '⚙️', title: 'Settings & Admin',        desc: 'School profile, user roles, logo branding, account management, multi-tenant admin',    color: C.slate  },
  ];

  let y = 36;
  const cols    = 3;
  const cellW   = (COL - (cols - 1) * 4) / cols;
  const cellH   = 34;
  const rowGap  = 4;

  modules.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx  = M + col * (cellW + 4);
    const by  = y + row * (cellH + rowGap);

    if (by + cellH > PAGE_H - 20) return;

    // Card
    setFill(doc, C.light);
    doc.roundedRect(bx, by, cellW, cellH, 3, 3, 'F');
    setFill(doc, m.color);
    doc.roundedRect(bx, by, 3, cellH, 1.5, 1.5, 'F');

    bold(doc, 9);
    setTxt(doc, m.color);
    doc.text(m.title, bx + 7, by + 9);
    normal(doc, 7.5);
    setTxt(doc, C.slate);
    const descLines = doc.splitTextToSize(m.desc, cellW - 10);
    descLines.slice(0, 3).forEach((l: string, li: number) => {
      doc.text(l, bx + 7, by + 16 + li * 5);
    });
  });
}

// ─── Detailed module pages ────────────────────────────────────────────────────
const MODULES: ModuleData[] = [
  {
    num: '3', title: 'People Management', color: C.blue,
    description: 'Central directory for all school stakeholders. Manage complete profiles, link family relationships, and control system access for every user.',
    features: [
      'Student enrolment with admission numbers', 'Bulk student import from CSV/Excel',
      'Teacher profiles and subject assignments',  'Parent accounts linked to children',
      'User account creation for all roles',       'Role-based access control (6 roles)',
      'Profile photo upload',                      'Reset passwords and deactivate accounts',
      'Student class transfers',                   'Admission number auto-generation',
    ],
  },
  {
    num: '4', title: 'CBE Academic Management', color: C.teal,
    description: 'Full implementation of Kenya\'s CBE curriculum framework — from class setup and schemes of work to SBA mark entry, life skills, career guidance and student promotions.',
    features: [
      'Class & stream creation with capacity',     'CBE strands and sub-strand management',
      'Schemes of work with weekly breakdown',     'Lesson plan creation per subject',
      'School-Based Assessment (SBA) mark entry',  'Auto-compute EE/ME/AE/BE grades',
      'Individual & group project management',     'Values & Life Skills competency tracking',
      'Career guidance pathways (JSS Grade 7–9)',  'Learning materials resource library',
      'Academic terms and calendar setup',         'Student promotion rules & bulk promote',
      'CBE report card generation & publishing',   'Parent report card acknowledgement',
      'Broadsheet & analytics dashboards',         'IGCSE Cambridge parallel module',
    ],
  },
  {
    num: '5', title: 'Attendance Management', color: C.green,
    description: 'Fast, reliable daily attendance marking for all classes. Supports bulk marking, period-by-period attendance, and automatic absent notifications to parents.',
    features: [
      'Daily attendance marking per class',        'Bulk mark entire class present',
      'Period attendance (morning/afternoon)',      'Absent student notification to parents',
      'Monthly attendance summary reports',        'Student attendance % tracking',
      'Personal attendance view (students)',       'Attendance analytics by class/date',
      'Late arrival logging',                      'Export attendance reports',
    ],
  },
  {
    num: '6', title: 'Exams, Results & Grading', color: C.purple,
    description: 'End-to-end exam lifecycle management — create, schedule, administer online or offline, enter marks, publish to students, and view analytics.',
    features: [
      'Create online and offline exams',           'Multiple choice & short answer questions',
      'Student online exam portal',                'Auto-marking for online exams',
      'Offline bulk mark entry per class',         'CBE grade auto-computation',
      'Teacher and admin publish results',         'Students see only published results',
      'Parent result visibility (published only)', 'Grade book per subject per teacher',
      'Exam analytics & class rankings',           'Result export and download',
      'Academic year and term organisation',       'Exam schedule per class',
    ],
  },
  {
    num: '7', title: 'Fee & Finance Management', color: C.amber,
    description: 'Complete school financial management — from fee structure creation and invoice generation to multi-method payment collection, M-Pesa integration, budgets, and asset tracking.',
    features: [
      'Fee structure per class/term',              'Smart bulk invoice generation',
      'M-Pesa, cash, Co-op, bank payments',        'PDF payment receipts with WhatsApp share',
      'Fee defaulter reports by class',            'Student fee account view',
      'Extra fees (transport, lunch, uniform)',     'Fee collection analytics & trends',
      'Full double-entry finance module',          'Income & expense tracking with approval',
      'Departmental budgets vs actuals',           'Vendor management & purchase orders',
      'Multiple bank account management',          'Petty cash vouchers & summaries',
      'Asset register with depreciation',          'Financial year management',
      'Income, expense & cash flow reports',       'Finance officer dedicated dashboard',
    ],
  },
  {
    num: '8', title: 'Library Management', color: C.teal,
    description: 'Complete library administration system covering cataloguing, issuing, returns, member management, overdue tracking, and fine collection.',
    features: [
      'Book catalogue with ISBN and cover',        'Search by title, author, category',
      'Barcode-based issue and return',            'Member registration and management',
      'Student and teacher borrowing portal',      'Overdue book alerts',
      'Fine calculation and collection',           'Borrowing history per member',
      'Book category management',                  'Library statistics & popular titles',
    ],
  },
  {
    num: '9', title: 'Communication, SMS & WhatsApp', color: C.blue,
    description: 'Multi-channel communication system covering direct messaging, announcements, bulk SMS via Africa\'s Talking, device-native WhatsApp, two-way SMS keywords, and automatic parent alerts.',
    features: [
      'Direct messaging between users',              'School-wide broadcast announcements',
      'Bulk SMS — all parents or by class',          'Bulk SMS — all teachers or custom phones',
      '8 pre-built SMS message templates',           'SMS delivery logs & statistics',
      'Africa\'s Talking API integration',           'WhatsApp via wa.me (device-native)',
      'WhatsApp Business API (optional)',            'Two-way SMS keyword auto-replies',
      'Automatic absent parent SMS alerts',          'Discipline incident parent alerts',
      'Fee reminder bulk SMS',                       'Results published notifications',
      'PTM scheduling and booking',                  'Read receipts & unread badge counts',
    ],
  },
  {
    num: '10', title: 'Student Welfare', color: C.red,
    description: 'Holistic student well-being management covering health records, discipline incidents, and welfare monitoring for safeguarding and pastoral care.',
    features: [
      'Health records & medical profiles',         'Allergy and medication tracking',
      'Emergency contact management',              'Discipline incident recording',
      'Severity levels: minor to critical',        '10+ incident types tracked',
      'Actions taken: warning to expulsion',       'Discipline statistics & reports',
      'Incident resolution tracking',              'Parent auto-alert on discipline',
    ],
  },
  {
    num: '11', title: 'Transport Management & Driver Tracking', color: C.green,
    description: 'Full transport lifecycle — route management, student assignment, and real-time driver pickup tracking with GPS coordinates. Parents see live pickup status on their dashboard.',
    features: [
      'Create and manage transport routes',          'Define pickup and drop-off points',
      'Assign students to routes',                   'Bulk student route assignment',
      'Transport charges per route',                 'Driver role & dedicated dashboard',
      'Driver marks picked / missed / absent',       'GPS coordinates per pickup event',
      'Parent transport widget (live status)',        'Admin transport tracking page',
      'Daily pickup logs & export',                  'Transport report per route',
    ],
  },
  {
    num: '11b', title: 'Gate Management & Security', color: C.navy,
    description: 'Digital gate management for visitor registration, student entry/exit tracking, and security logs. Replaces paper-based visitor books.',
    features: [
      'Visitor registration & purpose logging',      'Student check-in / check-out tracking',
      'Host assignment for visitors',                'Badge / pass number recording',
      'Gate dashboard with live log',                'Visitor statistics by date/type',
      'Search visitor history',                      'Export gate log to CSV',
    ],
  },
  {
    num: '11c', title: 'Hostel & Canteen Management', color: C.teal,
    description: 'Full boarding school management — hostel rooms with occupancy tracking, student allocation, and canteen wallet system with top-up and purchase logs.',
    features: [
      'Create hostels and define rooms',             'Room capacity and occupancy tracking',
      'Allocate students to rooms',                  'Hostel movement records',
      'Hostel meal scheduling',                      'Canteen menu and item management',
      'Student canteen wallet (pre-paid)',            'Top-up canteen balance',
      'Purchase/transaction logs per student',       'Canteen balance reports',
      'Admin canteen balance overview',              'Low balance alerts',
    ],
  },
  {
    num: '12', title: 'Timetable Management', color: C.navy,
    description: 'Visual weekly timetable creation and management for all classes, with print and PDF download for posting on notice boards.',
    features: [
      'Create class timetable entries',            'Assign teacher per period',
      'Day and time slot management',              'Room assignment per period',
      'Teacher conflict detection',                'Student personal timetable view',
      'Teacher personal timetable view',           'Print timetable (wall-ready)',
      'Download landscape PDF',                    'Reset class or teacher timetable',
    ],
  },
  {
    num: '13', title: 'IGCSE Cambridge Module', color: C.purple,
    description: 'Full Cambridge International General Certificate of Secondary Education module — grading systems, sessions, syllabi, component marks, moderation, and results.',
    features: [
      'Custom grading system setup',               'IGCSE session management',
      'Subject and syllabus management',           'Syllabus component mark allocation',
      'Teacher to IGCSE subject assignment',       'Student IGCSE enrolment',
      'Bulk marks entry per component',            'Marks moderation and locking',
      'Automatic grade calculation',               'Results publication to students',
      'Student IGCSE results portal',              'Grade distribution analytics',
    ],
  },
  {
    num: '14', title: 'Staff Leave Management', color: C.amber,
    description: 'Leave request workflow for teaching and non-teaching staff, covering all leave types with admin approval and leave balance tracking.',
    features: [
      'Leave application by staff',                'Leave types: sick, annual, compassionate',
      'Admin review and approve/reject',           'Leave balance tracking',
      'Leave calendar view',                       'Cancel leave requests',
      'Leave history per staff member',            'Leave statistics for admin',
    ],
  },
  {
    num: '14b', title: 'Payroll, Appraisals & Substitutes', color: C.amber,
    description: 'Complete staff HR module — run monthly payroll with allowances and deductions, performance appraisals for teachers, and substitute teacher assignment when staff are absent.',
    features: [
      'Staff payroll: basic salary + allowances',    'Deductions: NSSF, NHIF, PAYE, other',
      'Run payroll per month',                       'Download individual payslips (PDF)',
      'Staff payslip portal',                        'Payroll summary reports',
      'Annual appraisal creation per teacher',       'Multi-criteria rating system',
      'Admin reviews and finalises appraisals',      'Teacher views own appraisal result',
      'Substitute assignment for absent teachers',   'Substitute records per class per day',
    ],
  },
  {
    num: '14c', title: 'Bursary & Inventory', color: C.green,
    description: 'Bursary award management for needy students, and full inventory system for school assets and consumable stock with reorder alerts.',
    features: [
      'Create bursary programmes',                   'Award bursary to students',
      'Sponsor tracking per award',                  'Bursary payment history',
      'Beneficiary list & amounts',                  'Inventory item catalogue',
      'Stock levels with reorder threshold',         'Stock-in and stock-out records',
      'Low-stock alerts',                            'Inventory category management',
      'Purchase order integration',                  'Inventory audit reports',
    ],
  },
  {
    num: '14d', title: 'Teacher Check-in & Counseling', color: C.purple,
    description: 'Digital teacher attendance via daily check-in, and a dedicated counseling module for student welfare sessions with confidential notes.',
    features: [
      'Teacher daily check-in from dashboard',       'GPS location on check-in (optional)',
      'Admin view of teacher attendance',            'Check-in history per teacher',
      'Late check-in flagging',                      'Counseling session records',
      'Counselor assigns sessions per student',      'Confidential session notes',
      'Session types: academic / behavioural',       'Follow-up scheduling',
      'Counseling statistics per term',              'Export counseling report',
    ],
  },
  {
    num: '14e', title: 'NEMIS Export & Audit Log', color: C.slate,
    description: 'NEMIS compliance data export for the Kenya government school database, and a full audit trail of all user actions in the system.',
    features: [
      'NEMIS data validation per student',           'Identify missing NEMIS fields',
      'Export NEMIS-compliant CSV/Excel',            'NEMIS number recording per student',
      'Bulk NEMIS data update',                      'Validation report with issues list',
      'Audit log: all mutations captured',           'Filter by user, action, date range',
      'Most active user & common action metrics',    'Export audit log to CSV',
      'Auto-audit middleware (non-invasive)',         'Login/logout events tracked',
    ],
  },
  {
    num: '15', title: 'Dashboards & Analytics', color: C.teal,
    description: 'Seven role-specific dashboards giving every stakeholder a personalised view of the metrics and actions most relevant to their responsibilities.',
    features: [
      'Admin: full school metrics + quick actions',  'Teacher: class and check-in dashboard',
      'Student: personal academic hub',              'Parent: children\'s progress & transport',
      'Finance Officer: financial overview',         'Driver: route & pickup dashboard',
      'SuperAdmin: multi-school SaaS panel',         'Live attendance rates',
      'Fee collection rates & trends',               'CBE analytics with broadsheet',
      'Monthly income/expense charts',               'Exam analytics & class rankings',
      'Exportable PDF reports per role',             'User manual & blueprint downloads',
    ],
  },
];

// ─── User Roles & Permissions table ──────────────────────────────────────────
function addRolesPage(doc: jsPDF, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('16. User Roles & Access Permissions', M, 18);

  let y = 36;
  normal(doc, 9);
  setTxt(doc, C.slate);
  y = wrapText(doc,
    'SkulManager enforces strict role-based access control. Each user sees only the modules and data relevant to their role. ' +
    'Below is a complete permissions matrix across all 15 system modules.',
    M, y, COL, 5);
  y += 6;

  const roles   = ['Admin', 'Finance', 'Teacher', 'Student', 'Parent', 'Driver'];
  const modules2 = [
    { name: 'People Management',      perms: ['Full',  'View',  'View',  '–',     'Own',   '–'    ] },
    { name: 'CBE Academics',           perms: ['Full',  '–',     'Full',  'View',  'View',  '–'    ] },
    { name: 'Attendance',              perms: ['Full',  '–',     'Mark',  'Own',   'Own',   '–'    ] },
    { name: 'Exams & Results',         perms: ['Full',  '–',     'Full',  'Own',   'Own',   '–'    ] },
    { name: 'Fee Management',          perms: ['Full',  'Full',  '–',     'Own',   'Own',   '–'    ] },
    { name: 'Finance Module',          perms: ['Full',  'Full',  '–',     '–',     '–',     '–'    ] },
    { name: 'Library',                 perms: ['Full',  '–',     'Full',  'Own',   '–',     '–'    ] },
    { name: 'SMS & WhatsApp',          perms: ['Full',  '–',     'View',  '–',     '–',     '–'    ] },
    { name: 'Transport & Driver',      perms: ['Full',  '–',     '–',     '–',     'View',  'Full' ] },
    { name: 'Gate Management',         perms: ['Full',  '–',     '–',     '–',     '–',     '–'    ] },
    { name: 'Hostel & Canteen',        perms: ['Full',  '–',     '–',     'Own',   '–',     '–'    ] },
    { name: 'Payroll & Appraisals',    perms: ['Full',  'Full',  'Own',   '–',     '–',     '–'    ] },
    { name: 'Bursary & Inventory',     perms: ['Full',  'Full',  '–',     '–',     '–',     '–'    ] },
    { name: 'Health & Welfare',        perms: ['Full',  '–',     'Log',   '–',     '–',     '–'    ] },
    { name: 'IGCSE Module',            perms: ['Full',  '–',     'Full',  'Own',   '–',     '–'    ] },
    { name: 'Dashboards',              perms: ['Full',  'Own',   'Own',   'Own',   'Own',   'Own'  ] },
    { name: 'NEMIS & Audit Log',       perms: ['Full',  '–',     '–',     '–',     '–',     '–'    ] },
  ];

  const hdrH   = 8;
  const rowH   = 7;
  const colW   = (COL - 40) / roles.length;

  // Header
  setFill(doc, C.navy);
  doc.rect(M, y, COL, hdrH, 'F');
  bold(doc, 7.5);
  setTxt(doc, C.white);
  doc.text('Module', M + 2, y + 5.5);
  roles.forEach((r, i) => {
    doc.text(r, M + 40 + i * colW + colW / 2, y + 5.5, { align: 'center' });
  });
  y += hdrH;

  // Permission colour map
  const permColor: Record<string, RGB> = {
    'Full': C.green, 'View': C.blue, 'Own': C.teal, 'Mark': C.amber,
    'Log': C.amber, '–': C.muted,
  };

  modules2.forEach((row, ri) => {
    setFill(doc, ri % 2 === 0 ? C.white : C.light);
    doc.rect(M, y, COL, rowH, 'F');
    normal(doc, 7.5);
    setTxt(doc, C.black);
    doc.text(row.name, M + 2, y + 4.8);
    row.perms.forEach((p, pi) => {
      const cx = M + 40 + pi * colW + colW / 2;
      const pc = permColor[p] ?? C.muted;
      if (p !== '–') {
        setFill(doc, pc);
        doc.roundedRect(cx - 10, y + 1, 20, 5, 1, 1, 'F');
        bold(doc, 6.5);
        setTxt(doc, C.white);
        doc.text(p, cx, y + 4.8, { align: 'center' });
      } else {
        normal(doc, 7);
        setTxt(doc, C.muted);
        doc.text('–', cx, y + 4.8, { align: 'center' });
      }
    });
    y += rowH;
  });

  y += 8;
  // Legend
  bold(doc, 8);
  setTxt(doc, C.navy);
  doc.text('Legend:', M, y);
  y += 6;
  const legend = [
    { label: 'Full', desc: 'Complete create / read / update / delete access', color: C.green  },
    { label: 'View', desc: 'Read-only access to all records in the module',    color: C.blue   },
    { label: 'Own',  desc: 'Access only to own records (self or own children)', color: C.teal  },
    { label: 'Mark', desc: 'Can create and update records (e.g., mark attendance)', color: C.amber },
    { label: 'Log',  desc: 'Can log new entries but not edit others\' records',  color: C.amber },
    { label: '–',    desc: 'No access — module is hidden from this role',       color: C.muted },
  ];
  legend.forEach(l => {
    setFill(doc, l.color);
    doc.roundedRect(M, y - 3.5, 16, 5, 1, 1, 'F');
    bold(doc, 7);
    setTxt(doc, C.white);
    doc.text(l.label, M + 8, y + 0.5, { align: 'center' });
    normal(doc, 7.5);
    setTxt(doc, C.slate);
    doc.text(l.desc, M + 20, y + 0.5);
    y += 7;
  });
}

// ─── CBE Grading Reference ───────────────────────────────────────────────────
function addCBEReference(doc: jsPDF, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('17. CBE Grading Reference', M, 18);

  let y = 36;

  // Standard CBE grades
  y = sectionBanner(doc, y, '17.1  Standard CBE — Grades 1 to 12 (Primary, JSS, Senior Secondary)', C.teal);

  const cbGrades = [
    { g: 'EE', label: 'Exceeds Expectation',   range: '80–100%', color: C.green,  desc: 'Learner demonstrates mastery beyond the expected level.' },
    { g: 'ME', label: 'Meets Expectation',      range: '60–79%',  color: C.blue,   desc: 'Learner achieves the expected competency level.' },
    { g: 'AE', label: 'Approaches Expectation', range: '40–59%',  color: C.amber,  desc: 'Learner is progressing towards the expected level.' },
    { g: 'BE', label: 'Below Expectation',      range: '0–39%',   color: C.red,    desc: 'Learner requires significant additional support.' },
  ];
  cbGrades.forEach(g => {
    y = guard(doc, y, 14, pageNum);
    setFill(doc, g.color);
    doc.roundedRect(M, y, 14, 12, 2, 2, 'F');
    bold(doc, 12);
    setTxt(doc, C.white);
    doc.text(g.g, M + 7, y + 8.5, { align: 'center' });

    bold(doc, 9);
    setTxt(doc, g.color);
    doc.text(g.label, M + 18, y + 5);
    normal(doc, 8);
    setTxt(doc, C.slate);
    doc.text(`Score: ${g.range}   —   ${g.desc}`, M + 18, y + 10);
    y += 16;
  });

  y += 4;
  y = sectionBanner(doc, y, '17.2  Pre-Primary Grades (Playgroup, PP1, PP2)', C.purple);

  const ppGrades = [
    { g: 'WD', label: 'Well Developed',  color: C.green  },
    { g: 'D',  label: 'Developing',       color: C.blue   },
    { g: 'B',  label: 'Beginning',         color: C.amber  },
  ];
  ppGrades.forEach(g => {
    setFill(doc, g.color);
    doc.roundedRect(M, y, 14, 12, 2, 2, 'F');
    bold(doc, 11);
    setTxt(doc, C.white);
    doc.text(g.g, M + 7, y + 8.5, { align: 'center' });
    normal(doc, 9);
    setTxt(doc, C.black);
    doc.text(g.label, M + 18, y + 8);
    y += 16;
  });

  y += 4;
  y = sectionBanner(doc, y, '18.  Kenya Education Structure (CBC → CBE)', C.navy);
  y += 4;

  const levels = [
    { level: 'Playgroup',        ages: '2–3 yrs',  duration: '1 year',   detail: 'Early childhood play-based learning' },
    { level: 'Pre-Primary 1 & 2', ages: '3–5 yrs', duration: '2 years',  detail: 'Foundation literacy and numeracy' },
    { level: 'Lower Primary (G1–3)', ages: '6–8 yrs', duration: '3 years', detail: 'CBE strands: Literacy, Numeracy, Art' },
    { level: 'Upper Primary (G4–6)', ages: '9–11 yrs', duration: '3 years', detail: 'Expanded learning areas, SBA assessments' },
    { level: 'Junior Secondary (G7–9)', ages: '12–14 yrs', duration: '3 years', detail: 'STEM focus, CBE + career guidance' },
    { level: 'Senior Secondary (G10–12)', ages: '15–17 yrs', duration: '3 years', detail: 'Specialised pathways, final assessment' },
    { level: 'University / TVET', ages: '18+ yrs', duration: '3–4 years', detail: 'Degree or technical/vocational qualification' },
  ];

  const lhdr = 8;
  setFill(doc, C.navy);
  doc.rect(M, y, COL, lhdr, 'F');
  bold(doc, 8);
  setTxt(doc, C.white);
  const lcols = [0, 52, 76, 100];
  ['Education Level', 'Age Range', 'Duration', 'Key Feature'].forEach((h, i) => {
    doc.text(h, M + 3 + lcols[i], y + 5.5);
  });
  y += lhdr;

  levels.forEach((l, i) => {
    setFill(doc, i % 2 === 0 ? C.white : C.light);
    doc.rect(M, y, COL, 7, 'F');
    normal(doc, 8);
    setTxt(doc, C.black);
    doc.text(l.level,   M + 3 + lcols[0], y + 5);
    doc.text(l.ages,    M + 3 + lcols[1], y + 5);
    doc.text(l.duration, M + 3 + lcols[2], y + 5);
    doc.text(l.detail,  M + 3 + lcols[3], y + 5);
    y += 7;
  });
}

// ─── Payment Methods page ────────────────────────────────────────────────────
function addPaymentAndTech(doc: jsPDF, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('19–20. Payment Methods & Technical Specifications', M, 18);

  let y = 36;
  y = sectionBanner(doc, y, '19.  Payment Methods Supported', C.teal);
  y += 4;

  const methods = [
    { name: 'M-Pesa',                code: 'mpesa',            desc: 'Safaricom M-Pesa mobile money — most common in Kenya', color: C.green  },
    { name: 'Cash',                   code: 'cash',             desc: 'Physical cash payment at school counter',             color: C.slate  },
    { name: 'Co-op Bus Bank',         code: 'coop_bus_bank',    desc: 'Co-operative Bank bus banking payment',              color: C.blue   },
    { name: 'Co-op Bus Paybill',      code: 'coop_bus_paybill', desc: 'Co-operative Bank Paybill number payment',           color: C.blue   },
    { name: 'Fee Paybill',            code: 'fee_paybill',      desc: 'School-specific Paybill fee collection',             color: C.teal   },
    { name: 'Fee Bank Account',       code: 'fee_bank_account', desc: 'Direct deposit to school fee bank account',          color: C.teal   },
    { name: 'Bank Transfer / EFT',    code: 'bank_transfer',    desc: 'Electronic funds transfer or RTGS',                  color: C.navy   },
    { name: 'Cheque',                 code: 'cheque',           desc: 'Banker\'s or personal cheque payment',              color: C.amber  },
    { name: 'Debit / Credit Card',    code: 'card',             desc: 'Visa/Mastercard card payment',                       color: C.purple },
  ];
  methods.forEach((m, i) => {
    y = guard(doc, y, 11, pageNum);
    setFill(doc, i % 2 === 0 ? C.light : C.white);
    doc.rect(M, y - 1, COL, 10, 'F');
    setFill(doc, m.color);
    doc.rect(M, y - 1, 3, 10, 'F');
    bold(doc, 9);
    setTxt(doc, m.color);
    doc.text(m.name, M + 8, y + 4.5);
    normal(doc, 8);
    setTxt(doc, C.slate);
    doc.text(m.desc, M + 55, y + 4.5);
    y += 11;
  });

  y += 8;
  y = sectionBanner(doc, y, '20.  Technical Specifications', C.navy);
  y += 4;

  const specs = [
    ['Platform',         'Cloud SaaS — Progressive Web App (PWA), installable on mobile devices'],
    ['Hosting',          'PostgreSQL (Neon cloud DB), Node.js/Express backend, React 18 + Vite frontend'],
    ['Architecture',     'Multi-tenant SaaS — each school fully isolated via tenant_id row-level security'],
    ['Authentication',   'JWT-based with role claims (7 roles) — sessions expire after inactivity'],
    ['PDF Generation',   'Client-side PDF (jsPDF) — report cards, receipts, timetables, manuals, blueprint'],
    ['CBE Grading',      'Server-side: EE/ME/AE/BE (Grade 1–12), WD/D/B (Pre-Primary), 8-level JSS (KJSEA)'],
    ['SMS Integration',  'Africa\'s Talking API — bulk SMS, templates, delivery logs, two-way SMS keywords'],
    ['WhatsApp',         'wa.me device-native fallback + optional Meta WhatsApp Business API v18.0'],
    ['Driver Tracking',  'Transport pickup events with GPS coordinates; parent live status widget'],
    ['Audit & Security', 'Auto-audit middleware captures all mutations; login/logout events; CSV export'],
    ['NEMIS',            'Kenya NEMIS validation, export, and compliance reporting for government returns'],
    ['Data Export',      'CSV/Excel downloads for students, attendance, marks, finance, audit, NEMIS'],
    ['Browser Support',  'Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ — fully responsive on mobile'],
    ['Uptime',           '99.9% SLA target — hosted on enterprise cloud infrastructure (Render + Neon)'],
    ['Data Security',    'All traffic HTTPS/TLS, per-tenant isolation, safe storage wrappers for privacy'],
  ];

  specs.forEach((s, i) => {
    y = guard(doc, y, 9, pageNum);
    setFill(doc, i % 2 === 0 ? C.light : C.white);
    doc.rect(M, y - 1, COL, 8, 'F');
    bold(doc, 8.5);
    setTxt(doc, C.navy);
    doc.text(s[0], M + 3, y + 4);
    normal(doc, 8);
    setTxt(doc, C.black);
    doc.text(s[1], M + 45, y + 4);
    y += 9;
  });
}

// ─── Getting Started Checklist ────────────────────────────────────────────────
function addGettingStarted(doc: jsPDF, schoolName: string, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;
  addPageFooter(doc, pageNum.n);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  bold(doc, 18);
  setTxt(doc, C.white);
  doc.text('21. Getting Started — Implementation Checklist', M, 18);

  let y = 36;
  normal(doc, 9);
  setTxt(doc, C.slate);
  y = wrapText(doc,
    `Use this checklist to get ${schoolName} fully operational on SkulManager. ` +
    `Complete each step in order — each phase builds on the previous one.`,
    M, y, COL, 5);
  y += 6;

  const phases = [
    {
      phase: 'Phase 1 — Foundation (Day 1)',
      color: C.teal,
      items: [
        'Log in as admin and go to Account → Settings → update school name, motto, logo',
        'Create your academic terms in Academic → CBE Academics → Academic Calendar',
        'Create classes and streams: Academic → CBE Academics → Classes tab',
        'Create subjects/learning areas: Academic → CBE Academics → Learning Areas tab',
        'Set up CBE strands and sub-strands for each learning area',
      ],
    },
    {
      phase: 'Phase 2 — People (Days 2–3)',
      color: C.blue,
      items: [
        'Add teachers: People → Teachers → Add Teacher (or bulk import)',
        'Enrol students: People → Students → Add Student (or bulk import)',
        'Link parents to students: People → Parents → Add Parent and link',
        'Create user accounts for all teachers and parents via Account → Users',
        'Assign teachers to classes and subjects',
      ],
    },
    {
      phase: 'Phase 3 — Finance (Day 4)',
      color: C.amber,
      items: [
        'Create fee structure: Finance → Fee Structure → Add Structure per class and term',
        'Generate invoices: Finance → Fee Management → Smart Bulk Invoice Generation',
        'Set up finance module: Finance → Bank Accounts → add school bank accounts',
        'Configure payment methods accepted by your school',
        'Test recording a payment and downloading the PDF receipt',
      ],
    },
    {
      phase: 'Phase 4 — Academic Operations (Week 2)',
      color: C.purple,
      items: [
        'Build timetable: Schedule → Timetable → Add Entry per class per day',
        'Create schemes of work: Academic → CBE Academics → Schemes of Work tab',
        'Create lesson plans for each week and subject',
        'Create first exam: Academic → Exams → Create Exam',
        'Test attendance marking: Academic → Attendance → mark a class',
      ],
    },
    {
      phase: 'Phase 5 — Communication, Welfare & HR (Week 3)',
      color: C.green,
      items: [
        'Configure SMS: Messages → SMS Messaging → add Africa\'s Talking credentials',
        'Set up parent alerts: verify parents receive absence SMS notifications',
        'Configure transport routes and assign driver accounts: Welfare → Transport',
        'Set up hostel rooms and assign boarding students: Welfare → Hostel Management',
        'Set up payroll for staff: Finance → Payroll → add staff salary details',
        'Add library books if using library module: Library → Library Management',
        'Configure Gate Manager for visitor logging: Security → Gate Manager',
        'Send first school announcement via Messages → Communication',
      ],
    },
    {
      phase: 'Phase 6 — Go Live',
      color: C.navy,
      items: [
        'Distribute login credentials to all teachers and parents',
        'Share User Manual PDF with each role group from the dashboard',
        'Share this Blueprint document with school board / head teacher',
        'Download and post timetables from Schedule → Timetable → Download PDF',
        'Run first term end: generate CBE report cards, publish, and share with parents',
      ],
    },
  ];

  phases.forEach(p => {
    y = guard(doc, y, 14, pageNum);
    setFill(doc, p.color);
    doc.roundedRect(M, y, COL, 9, 2, 2, 'F');
    bold(doc, 9.5);
    setTxt(doc, C.white);
    doc.text(p.phase, M + 4, y + 6);
    y += 11;

    p.items.forEach(item => {
      y = guard(doc, y, 8, pageNum);
      setFill(doc, p.color);
      doc.rect(M, y - 0.5, 2.5, 2.5, 'F');
      normal(doc, 8.5);
      setTxt(doc, C.black);
      y = wrapText(doc, item, M + 6, y + 1.5, COL - 8, 5);
      y += 1;
    });
    y += 6;
  });

  // Final note
  y = guard(doc, y, 24, pageNum);
  setFill(doc, C.sky);
  doc.roundedRect(M, y, COL, 22, 3, 3, 'F');
  bold(doc, 10);
  setTxt(doc, C.navy);
  doc.text('Need Help?', M + 5, y + 8);
  normal(doc, 8.5);
  setTxt(doc, C.slate);
  doc.text('Contact Helvino Technologies support:', M + 5, y + 15);
  bold(doc, 8.5);
  setTxt(doc, C.blue);
  doc.text('helvinotechltd@gmail.com', M + 5, y + 21);
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function generateBlueprint(schoolName: string = 'Your School') {
  const doc     = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageNum = { n: 1 };

  // Cover
  addCoverPage(doc, schoolName);
  addPageFooter(doc, 1);

  // Table of Contents
  addTOC(doc);

  // Executive Summary
  addExecutiveSummary(doc, schoolName, pageNum);

  // Module overview grid
  addModuleOverview(doc, pageNum);
  addPageFooter(doc, pageNum.n);

  // Detailed modules — each is a new page section
  let y = 28;
  const sectionColors: Record<string, RGB> = {
    '3': C.blue, '4': C.teal, '5': C.green, '6': C.purple,
    '7': C.amber, '8': C.teal, '9': C.blue, '10': C.red,
    '11': C.green, '12': C.navy, '13': C.purple, '14': C.amber, '15': C.teal,
  };

  MODULES.forEach((mod, mi) => {
    // New page for major sections
    if (mi === 0 || [3, 4, 5, 6, 7].includes(mi)) {
      doc.addPage();
      pageNum.n++;
      addPageFooter(doc, pageNum.n);
      setFill(doc, C.navy);
      doc.rect(0, 0, PAGE_W, 16, 'F');
      bold(doc, 12);
      setTxt(doc, C.white);
      doc.text('SkulManager — Module Details', M, 11);
      y = 24;
    }
    y = moduleCard(doc, y, mod, pageNum);
    if (y > PAGE_H - 30) {
      doc.addPage();
      pageNum.n++;
      addPageFooter(doc, pageNum.n);
      y = 22;
    }
  });

  // Roles matrix
  addRolesPage(doc, pageNum);

  // CBE reference + education structure
  addCBEReference(doc, pageNum);

  // Payment methods + tech specs
  addPaymentAndTech(doc, pageNum);

  // Getting started checklist
  addGettingStarted(doc, schoolName, pageNum);

  // Patch all footers with correct total page count
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setFill(doc, C.navy);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
    normal(doc, 7);
    setTxt(doc, C.white);
    doc.text('SkulManager — System Blueprint & Feature Guide  |  Confidential', M, PAGE_H - 3.5);
    doc.text(`Page ${p} of ${total}`, PAGE_W - M, PAGE_H - 3.5, { align: 'right' });
  }

  doc.save(`SkulManager-Blueprint-${schoolName.replace(/\s+/g, '-')}.pdf`);
}
