// Content for the /features/:slug landing pages (src/pages/public/FeatureLandingPage.tsx).
// Each entry is a distinct indexable URL targeting a specific long-tail keyword —
// kept as data rather than 8 near-identical page files since the shell is shared.

export interface FeaturePageFAQ {
  q: string;
  a: string;
}

export interface FeaturePageContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  eyebrow: string;
  heading: string;
  tagline: string;
  gradient: string; // tailwind gradient classes for the hero
  accent: string;   // tailwind text/bg accent classes for bullets/buttons
  intro: string[];  // paragraphs
  benefits: { title: string; desc: string }[];
  faqs: FeaturePageFAQ[];
}

export const FEATURE_PAGES: Record<string, FeaturePageContent> = {
  'cbc-academics': {
    slug: 'cbc-academics',
    metaTitle: 'CBC Curriculum Management Software Kenya | SkulManager',
    metaDescription: 'Manage Kenya\'s Competency-Based Curriculum (CBC/CBE) end-to-end: strand-based EE/ME/AE/BE grading, schemes of work, lesson plans, SBA, projects, and CBC report cards — all in one platform.',
    keywords: 'CBC curriculum software Kenya, CBE grading system, EE ME AE BE grading, competency based assessment software, CBC report card generator, schemes of work software Kenya',
    eyebrow: 'CBC / CBE Academics',
    heading: 'CBC Curriculum Management Software Built for Kenya',
    tagline: 'From Playgroup to Senior Secondary — strand-based grading, schemes of work, and CBC report cards in one system.',
    gradient: 'from-blue-700 to-indigo-700',
    accent: 'text-blue-600 bg-blue-50 border-blue-200',
    intro: [
      'Kenya\'s shift to the Competency-Based Curriculum (CBC/CBE) changed what schools need from their record-keeping systems. Instead of a single exam score, teachers now track strand-level competencies, values, and life skills for every learner — a workload that spreadsheets and generic school software were never built to handle.',
      'SkulManager was designed around the CBC framework from the ground up, not adapted from a Nigerian, Indian, or generic exam-based system afterwards. It covers every education level in the Kenyan structure — Playgroup, PP1/PP2 (Pre-Primary), Grade 1–6 (Lower Primary), Grade 7–9 (Junior Secondary), and Grade 10–12 (Senior Secondary) — with the correct grading scale automatically applied for each: the standard EE (Exceeding Expectation), ME (Meeting Expectation), AE (Approaching Expectation), BE (Below Expectation) scale for Grade 1 and above, and the WD/D/B scale for Pre-Primary learners.',
      'Because every module — schemes of work, lesson plans, School-Based Assessments (SBA), projects, and report cards — shares the same strand and sub-strand data, a teacher only has to set up a subject\'s CBC structure once. From there, marks entered anywhere in the system automatically compute the correct grade band and flow through to the student\'s CBC-compliant report card, without a single manual grade lookup.',
    ],
    benefits: [
      { title: 'Automatic CBC grading', desc: 'Marks are converted to EE/ME/AE/BE (or WD/D/B for pre-primary) server-side using the official thresholds — no manual grade-band lookups, no inconsistency between teachers.' },
      { title: 'Schemes of work & lesson plans', desc: 'Week-by-week schemes with objectives, methods, and resources, plus a school-level approval workflow before a scheme goes live.' },
      { title: 'School-Based Assessments (SBA)', desc: 'Purpose-built SBA mark entry per strand and sub-strand, distinct from summative exams, with the same auto-grading pipeline.' },
      { title: 'Projects & learner portfolios', desc: 'Individual and group project tracking with milestones and submissions, feeding into a cumulative student portfolio over the learner\'s time at the school.' },
      { title: 'CBC-compliant report cards', desc: 'Strand-based competency report cards with teacher and principal remarks, exportable as PDF, linked to the actual exam or assessment they came from.' },
      { title: 'Values & life skills tracking', desc: 'Per-student core values and life-skills competency grids, a CBC requirement most legacy school systems have no concept of.' },
    ],
    faqs: [
      { q: 'Is SkulManager fully aligned with Kenya\'s CBC/CBE curriculum?', a: 'Yes. SkulManager was built specifically for Kenya\'s Competency-Based Education curriculum, not adapted from a generic exam-based system. It uses the official CBE strand-based grading (EE/ME/AE/BE) and covers every level from Playgroup through Senior Secondary.' },
      { q: 'Does it support NEMIS numbers?', a: 'Yes — every student record includes a NEMIS number field, recorded during admission and editable afterwards.' },
      { q: 'Can it generate CBC report cards automatically?', a: 'Yes. Marks entered in exams or SBA automatically compute the correct CBE grade band, and the report card generator produces a strand-based, CBC-compliant report card as a PDF, complete with teacher remarks and principal comments.' },
      { q: 'What is the difference between SBA and exams in the system?', a: 'School-Based Assessments (SBA) are CBC-specific, strand-level assessments distinct from traditional summative exams. SkulManager tracks both separately but computes grades using the same CBE scale, so results stay consistent across the school.' },
    ],
  },

  'fee-management': {
    slug: 'fee-management',
    metaTitle: 'School Fee Management System with M-Pesa Integration Kenya | SkulManager',
    metaDescription: 'Collect school fees via M-Pesa STK Push, bank transfer, cash, or card. Auto-generated invoices, real-time payment reconciliation, statements, and outstanding-fee reports for Kenyan schools.',
    keywords: 'school fee management system Kenya, M-Pesa school fees software, school fee collection software, fee invoicing system Kenya, school M-Pesa paybill integration',
    eyebrow: 'Finance & Fees',
    heading: 'School Fee Management with Real-Time M-Pesa Integration',
    tagline: 'Auto-generated invoices, M-Pesa STK Push collection, and live payment reconciliation your finance officer can trust.',
    gradient: 'from-green-700 to-emerald-700',
    accent: 'text-green-600 bg-green-50 border-green-200',
    intro: [
      'Fee collection is where most Kenyan school administration software falls short — either it has no real payment integration at all, forcing finance officers to manually reconcile M-Pesa statements against a spreadsheet every evening, or the "integration" is really just a static paybill number displayed to parents with no way to confirm who actually paid.',
      'SkulManager\'s fee module was built to close that gap. Invoices are generated automatically per student from your fee structure, and parents can pay by M-Pesa STK Push directly from their portal — the payment is independently verified against Safaricom\'s own API before it is ever credited to an invoice, so a forged or fake "payment confirmed" message can never slip through. The moment a parent pays, the invoice balance, the student\'s fee status, and the finance dashboard all update — no manual entry required.',
      'For schools that also collect via bank transfer, cash, cheque, or card, those payments are recorded by the finance officer with a full audit trail, and every payment method rolls up into the same statements, receipts, and outstanding-fee reports so nothing is ever tracked in two places.',
    ],
    benefits: [
      { title: 'M-Pesa STK Push', desc: 'Parents pay directly from their phone; the system independently re-verifies with Safaricom before crediting the invoice, so payments can\'t be forged or spoofed.' },
      { title: 'Auto-generated invoices', desc: 'Invoices are created per student from your fee structure — no manual invoice-by-invoice data entry each term.' },
      { title: 'Every Kenyan payment method', desc: 'M-Pesa, cash, bank transfer, cheque, card — all recorded against the same student ledger with automatic receipts.' },
      { title: 'Real-time balances', desc: 'Parents, finance officers, and admins all see the same up-to-the-minute balance — no end-of-day reconciliation gap.' },
      { title: 'Outstanding fee reports', desc: 'Instantly see which students owe what, filterable by class, term, or fee category, for follow-up or bursary decisions.' },
      { title: 'Parent self-service statements', desc: 'Parents can view and download their child\'s payment history and current balance any time from the parent portal.' },
    ],
    faqs: [
      { q: 'How does M-Pesa payment verification work?', a: 'When a parent completes an M-Pesa STK Push payment, SkulManager does not trust the callback message alone — it independently queries Safaricom\'s own API to confirm the transaction actually completed before crediting the invoice. This prevents forged payment notifications from ever affecting a student\'s fee balance.' },
      { q: 'Can we collect fees by bank transfer or cash as well as M-Pesa?', a: 'Yes. Finance officers can record cash, bank transfer, cheque, and card payments directly, each with its own receipt, and all methods appear together in the same student fee ledger and reports.' },
      { q: 'Do parents see their balance in real time?', a: 'Yes. As soon as a payment is confirmed — whether by M-Pesa or manually recorded by finance — the parent portal, finance dashboard, and admin view all reflect the new balance immediately.' },
      { q: 'Can a school connect its own bank account for automatic reconciliation?', a: 'Yes — SkulManager supports bank payment aggregator integration so that bank-transfer payments are automatically detected and reconciled against the correct invoice, the same way M-Pesa STK Push payments already are.' },
    ],
  },

  'exams-results': {
    slug: 'exams-results',
    metaTitle: 'Online Exam & Results Management System Kenya | SkulManager',
    metaDescription: 'Create online and offline exams, enter results in bulk, and control exactly when students and parents see published results — with automatic CBC grade computation for every mark.',
    keywords: 'online exam system Kenya, school results management software, CBC exam results system, bulk result entry software, exam management system for schools',
    eyebrow: 'Exams & Results',
    heading: 'Online Exam & Results Management, With Controlled Publishing',
    tagline: 'Bulk mark entry, offline-friendly result capture, and a publish switch that keeps unfinished results away from parents.',
    gradient: 'from-purple-700 to-violet-700',
    accent: 'text-purple-600 bg-purple-50 border-purple-200',
    intro: [
      'A results system that lets every half-entered mark leak to a worried parent is worse than no system at all. SkulManager separates "results exist in the system" from "results are visible to students and parents" as two distinct states — teachers can enter, review, and correct marks for as long as they need, and nothing reaches a student or parent portal until an admin or teacher explicitly publishes that exam.',
      'Exams can be taken online through the built-in exam engine, or captured offline when connectivity is unreliable — a common reality in many parts of Kenya — using the offline result-entry workflow, where marks are recorded locally and synced to the central system once a connection is available. Either way, every mark is automatically converted to the correct CBC grade band (EE/ME/AE/BE) the moment it\'s entered, so there\'s never a separate manual grading step.',
      'Once published, students and parents see results instantly in their own portals, and the same underlying data feeds directly into CBC report card generation and the school\'s exam analytics — grade distributions, subject performance, and competency trends — without any re-entry.',
    ],
    benefits: [
      { title: 'Controlled publishing', desc: 'Results stay hidden from students and parents until an admin or teacher explicitly publishes the exam — no accidental early leaks.' },
      { title: 'Bulk result entry', desc: 'Teachers enter marks for an entire class at once, with validation, rather than one student record at a time.' },
      { title: 'Offline-friendly capture', desc: 'When internet access is unreliable, results can be entered offline and synced once connectivity returns.' },
      { title: 'Automatic CBC grading', desc: 'Every mark is converted to the correct EE/ME/AE/BE band using the official thresholds as soon as it\'s entered.' },
      { title: 'Online exam engine', desc: 'Students can take structured online exams directly in their portal, marked and graded automatically.' },
      { title: 'Exam analytics', desc: 'Grade distributions, subject performance, and competency trends computed automatically from published results.' },
    ],
    faqs: [
      { q: 'Can parents see results before the school is ready to publish them?', a: 'No. Results are only visible to students and parents once an admin or teacher explicitly publishes that specific exam. Entered-but-unpublished marks stay internal to staff.' },
      { q: 'What if our school has unreliable internet during exam season?', a: 'SkulManager supports offline result entry — teachers can capture marks locally and sync them to the central system once connectivity is available, so a slow or intermittent connection doesn\'t block result processing.' },
      { q: 'Who can publish results — only admins?', a: 'Both admins and teachers can publish results for exams they are authorised on, so a head of department or class teacher isn\'t bottlenecked waiting on the school administrator.' },
      { q: 'How does grading work for CBC vs traditional marks?', a: 'Every mark entered is automatically converted to the appropriate CBE grade band (EE/ME/AE/BE for Grade 1+, or WD/D/B for pre-primary) using the official percentage thresholds, so grading is consistent across every teacher and subject.' },
    ],
  },

  'timetable': {
    slug: 'timetable',
    metaTitle: 'School Timetable Software Kenya | SkulManager',
    metaDescription: 'Generate, print, and share your school timetable in minutes. Landscape PDF export, per-class and per-teacher views, and instant updates visible to teachers, students, and parents.',
    keywords: 'school timetable software Kenya, timetable generator for schools, class timetable maker, school schedule software',
    eyebrow: 'Timetable & Scheduling',
    heading: 'School Timetable Software That Everyone Can Actually See',
    tagline: 'Build it once, and every teacher, student, and parent sees the current version — automatically, no photocopied notice board required.',
    gradient: 'from-amber-600 to-orange-600',
    accent: 'text-amber-600 bg-amber-50 border-amber-200',
    intro: [
      'The traditional Kenyan school timetable lives on a printed sheet pinned to the staffroom notice board, photographed on phones, and quickly out of date the moment a class or teacher changes. SkulManager keeps one authoritative timetable that every role sees live — a teacher\'s "My Classes" view, a student\'s "My Timetable", and the admin\'s master schedule are all reading from the same underlying data, so an update made once is visible everywhere immediately.',
      'Building a timetable is done directly in the browser, class by class and period by period, with conflict awareness so you don\'t accidentally double-book a teacher across two classes in the same period. Once built, it can be printed in a clean landscape A4 layout or exported as a PDF for staff who prefer a physical copy — but the digital version stays the source of truth.',
      'Because the timetable connects to the same subject and class data used everywhere else in SkulManager, there\'s no separate spreadsheet to keep in sync with the academic module — a subject added to a class automatically becomes available when scheduling that class\'s timetable.',
    ],
    benefits: [
      { title: 'One live version', desc: 'Admins, teachers, students, and parents all see the current timetable — no outdated printed copies circulating.' },
      { title: 'Conflict-aware scheduling', desc: 'The builder helps you avoid double-booking a teacher or clashing two classes in the same period.' },
      { title: 'Print & PDF export', desc: 'Clean landscape A4 print layout and PDF download for staff and notice boards that still want a physical copy.' },
      { title: 'Per-role views', desc: 'Teachers see "My Classes", students see "My Timetable" — everyone sees only the slice relevant to them.' },
      { title: 'Connected to your academic data', desc: 'Subjects and classes come straight from the academic module — no duplicate data entry.' },
      { title: 'Instant updates', desc: 'Change a period once, and it updates for every affected teacher and student immediately — no re-distribution needed.' },
    ],
    faqs: [
      { q: 'Can teachers and students see the timetable without logging in as admin?', a: 'Yes. Teachers have a "My Classes" timetable view and students have a "My Timetable" view, each scoped to what\'s relevant to them, using their own login.' },
      { q: 'Can we print the timetable for the staffroom notice board?', a: 'Yes — the timetable page has a dedicated print layout (landscape A4) and a PDF download button for anyone who wants a physical copy alongside the live digital version.' },
      { q: 'What happens if we change a teacher\'s schedule mid-term?', a: 'Update the timetable once in the admin view and every teacher, student, and parent view reflects the change immediately — there\'s no separate re-publishing step.' },
    ],
  },

  'parent-communication': {
    slug: 'parent-communication',
    metaTitle: 'Parent Communication & SMS Broadcasting Software for Schools Kenya | SkulManager',
    metaDescription: 'Reach every parent instantly: bulk SMS broadcasting, automatic parent alerts for fees/results/discipline/health, and in-app messaging — from one Kenyan school management platform.',
    keywords: 'school SMS software Kenya, parent communication app for schools, bulk SMS for schools Kenya, school parent alert system, school messaging system Kenya',
    eyebrow: 'Parent Communication',
    heading: 'Parent Communication & SMS Broadcasting for Kenyan Schools',
    tagline: 'Bulk SMS, automatic event-driven alerts, and in-app messaging — so no parent misses a fee deadline, exam result, or emergency.',
    gradient: 'from-pink-700 to-rose-700',
    accent: 'text-pink-600 bg-pink-50 border-pink-200',
    intro: [
      'Not every Kenyan parent has reliable smartphone data access, which is why SkulManager treats SMS as a first-class communication channel rather than an afterthought bolted onto an app-only platform. Bulk SMS can be sent to every parent, a specific class\'s parents, all teachers, or a custom list — using ready-made templates for common messages like fee reminders, exam schedules, or closing-day notices, alongside full SMS logs and delivery statistics.',
      'Beyond bulk broadcasts, SkulManager automatically triggers parent alerts the moment specific events happen elsewhere in the system: a discipline incident is logged, a health emergency is recorded, a fee payment is received, or new results are published. Parents don\'t have to check a portal to find out — the relevant alert reaches them automatically, through the app and SMS.',
      'For parents who are online, in-app messaging lets them communicate directly with teachers and administrators, with sound alerts so a message isn\'t missed. Every channel — SMS, push alerts, and in-app messages — is managed from one place, so the school isn\'t juggling separate tools for each.',
    ],
    benefits: [
      { title: 'Bulk SMS broadcasting', desc: 'Send to all parents, a specific class, all teachers, or a custom number list, with 8 ready-made message templates.' },
      { title: 'Automatic event alerts', desc: 'Fee payments, published results, discipline incidents, and health emergencies automatically trigger a parent notification — no manual step.' },
      { title: 'SMS delivery logs & stats', desc: 'Full visibility into what was sent, to whom, and whether it was delivered.' },
      { title: 'In-app messaging', desc: 'Direct messaging between admin, teachers, students, and parents with sound alerts for new messages.' },
      { title: 'Works without a smartphone', desc: 'SMS reaches every parent with a basic phone, not just those with a data connection and the app installed.' },
      { title: 'Inbound SMS keywords', desc: 'Parents can text keywords like BAL or RESULT to get an instant automated reply with their child\'s fee balance or latest results.' },
    ],
    faqs: [
      { q: 'Does this replace WhatsApp or just SMS?', a: 'SkulManager supports both — SMS broadcasting for guaranteed reach even without a data connection, plus WhatsApp integration for schools that want richer messaging with parents who are online.' },
      { q: 'Are parents notified automatically, or does staff have to send every message?', a: 'Both. Certain events — fee payments, published results, discipline incidents, health emergencies — trigger an automatic alert with no staff action required. Staff can also send manual bulk SMS whenever needed.' },
      { q: 'Can parents check their child\'s fee balance by SMS without the app?', a: 'Yes — a parent can text a keyword like BAL to the school\'s SMS number and receive an instant automated reply with their child\'s current fee balance, no app or internet required.' },
    ],
  },

  'transport': {
    slug: 'transport',
    metaTitle: 'School Transport & GPS Tracking Management System Kenya | SkulManager',
    metaDescription: 'Manage school transport routes, track pickups with GPS, and give parents real-time visibility of their child\'s bus — with a dedicated driver app and automatic parent alerts.',
    keywords: 'school transport management system Kenya, school bus tracking app, GPS school bus tracking Kenya, school transport software with driver app',
    eyebrow: 'Transport & GPS Tracking',
    heading: 'School Transport Management With Real-Time GPS Tracking',
    tagline: 'Route management, a mobile-friendly driver app, and live pickup tracking parents can watch from home.',
    gradient: 'from-teal-700 to-cyan-700',
    accent: 'text-teal-600 bg-teal-50 border-teal-200',
    intro: [
      'For many Kenyan parents, "did the bus actually pick up my child today" is a genuine daily anxiety — and one that a static route list on a printed sheet does nothing to address. SkulManager\'s transport module gives drivers a dedicated, mobile-optimised dashboard to mark each student as picked up, missed, or absent in real time, with GPS location attached to every pickup record.',
      'Routes and student-to-route assignments are managed centrally by the admin, so reassigning a student to a different route, or adding a new stop, takes effect immediately for the driver\'s app and the admin\'s tracking view. Parents get their own transport widget showing their child\'s pickup status and, where enabled, live location — turning a source of daily worry into a quick, reassuring glance at a phone.',
      'Every pickup event is also logged for the school\'s own records, giving admins a full history for safeguarding, incident investigation, or simply confirming a route ran on schedule — data that a paper attendance sheet on the bus could never reliably provide.',
    ],
    benefits: [
      { title: 'Driver mobile app', desc: 'Drivers mark students picked up, missed, or absent from a phone-optimised dashboard, with GPS attached to each record.' },
      { title: 'Real-time parent visibility', desc: 'Parents see their child\'s pickup status and route progress from a dedicated transport widget on their portal.' },
      { title: 'Automatic parent alerts', desc: 'Pickup and missed-pickup events can trigger an automatic notification to the parent.' },
      { title: 'Central route management', desc: 'Admins manage routes and student assignments from one screen — changes apply to the driver app instantly.' },
      { title: 'Full pickup history', desc: 'Every pickup event is logged with GPS and timestamp for safeguarding, audits, or resolving a parent query.' },
      { title: 'Admin tracking dashboard', desc: 'A dedicated transport tracking page gives admins a live, school-wide view across every route and driver.' },
    ],
    faqs: [
      { q: 'Do drivers need a special device for the app?', a: 'No — the driver dashboard is a mobile-optimised web page that works in any smartphone browser, with no separate app installation required.' },
      { q: 'Can parents see exactly when their child was picked up?', a: 'Yes — the parent transport widget shows real-time pickup status, and the system keeps a full history of every pickup event with its timestamp and GPS location.' },
      { q: 'What happens if a student is marked as missed?', a: 'A missed pickup can automatically trigger a parent alert, and the event is logged in the admin transport tracking dashboard for follow-up.' },
      { q: 'Does the driver role have its own login?', a: 'Yes — driver is a dedicated user role with access limited to their assigned route and students, separate from teacher, admin, or parent accounts.' },
    ],
  },

  'hr-payroll': {
    slug: 'hr-payroll',
    metaTitle: 'Teacher HR, Attendance & Payroll Management System Kenya | SkulManager',
    metaDescription: 'Manage teacher profiles, TSC numbers, leave requests, GPS check-in attendance, appraisals, and payroll — all in one school HR system for Kenya.',
    keywords: 'school HR software Kenya, teacher management system, school payroll software Kenya, teacher attendance app, TSC number tracking software',
    eyebrow: 'Staff, HR & Payroll',
    heading: 'Teacher HR, Attendance & Payroll Management',
    tagline: 'From TSC numbers to GPS check-in to payroll — everything about your teaching staff in one system.',
    gradient: 'from-slate-700 to-blue-700',
    accent: 'text-slate-600 bg-slate-50 border-slate-200',
    intro: [
      'Teacher records in a typical Kenyan school are scattered across a personnel file, a separate attendance register, an Excel payroll sheet, and whatever system (if any) tracks leave requests. SkulManager consolidates all of it: teacher profiles with subjects, class assignments, and TSC numbers; leave requests with an approval workflow; attendance via GPS-enabled check-in; performance appraisals; and payroll processing — under one login-protected system instead of four disconnected files.',
      'GPS check-in means a teacher\'s arrival is logged automatically from their phone within configured school hours, with late arrivals flagged for admin visibility — no signature register that can be filled in retroactively. Leave requests move through a proper approval workflow rather than a verbal "can I take Friday off" to the head teacher, giving the school a clean audit trail of who was away and why.',
      'Because staff data lives in one place, payroll processing can draw directly on the same attendance and leave records rather than a manually reconciled spreadsheet, reducing the errors that come from re-typing the same numbers into a different tool every month.',
    ],
    benefits: [
      { title: 'Teacher profiles & TSC numbers', desc: 'Subjects, class assignments, TSC numbers, and contact details in one searchable staff directory.' },
      { title: 'GPS-enabled check-in', desc: 'Teachers check in from their phone within configured hours; late arrivals are automatically flagged for admin reports.' },
      { title: 'Leave request workflow', desc: 'Staff submit leave requests that go through a proper approval flow, with a full history for every teacher.' },
      { title: 'Performance appraisals', desc: 'Structured teacher appraisal records rather than informal, undocumented reviews.' },
      { title: 'Substitute/relief tracking', desc: 'Track substitute teacher assignments when regular staff are on leave.' },
      { title: 'Payroll processing', desc: 'Payroll draws on the same staff, attendance, and leave data already in the system — no separate re-entry.' },
    ],
    faqs: [
      { q: 'How does GPS check-in work for teachers?', a: 'Teachers check in from their own phone; the system records the time and location against configurable school hours, and flags late arrivals automatically for the admin\'s attendance reports.' },
      { q: 'Can teachers request leave through the system?', a: 'Yes — leave requests go through an approval workflow rather than an informal request to the head teacher, giving the school a documented history for every staff member.' },
      { q: 'Does payroll connect to attendance data?', a: 'Yes — because attendance, leave, and staff records all live in the same system, payroll processing can reference them directly instead of relying on a manually reconciled spreadsheet.' },
    ],
  },

  'procurement': {
    slug: 'procurement',
    metaTitle: 'School Procurement & Asset Management System Kenya | SkulManager',
    metaDescription: 'Full procurement lifecycle for schools: Purchase Requisition to RFQ, Quotation, Purchase Order, GRN, Invoice, and Payment — plus asset register and vendor management.',
    keywords: 'school procurement software Kenya, procurement management system for schools, school asset management software, purchase order system for schools',
    eyebrow: 'Procurement & Assets',
    heading: 'School Procurement & Asset Management, End to End',
    tagline: 'Purchase Requisition through Payment, with a full audit trail and a searchable asset register — no more procurement on WhatsApp and paper.',
    gradient: 'from-indigo-700 to-blue-700',
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    intro: [
      'Many Kenyan schools run procurement informally — a teacher asks the bursar for supplies, a verbal quote is agreed with a supplier, and the paper trail (if it exists at all) is a stapled receipt in a drawer. That works until a school board, auditor, or sponsor asks for a clear record of how funds were spent, and it makes vendor comparison and budget control nearly impossible.',
      'SkulManager implements the full procurement lifecycle a formal institution needs: a Purchase Requisition (PR) is raised, an RFQ goes out to vendors, Quotations are compared, a Purchase Order (PO) is issued to the selected vendor, a Goods Received Note (GRN) confirms delivery, and the vendor Invoice and Payment close the loop — each stage recorded, timestamped, and linked to the ones before and after it.',
      'The same module maintains an asset register, so equipment and furniture purchased through procurement are automatically tracked as school assets from day one, rather than procurement and asset tracking living in two disconnected systems (or not existing at all).',
    ],
    benefits: [
      { title: 'Full procurement lifecycle', desc: 'PR → RFQ → Quotation → PO → GRN → Invoice → Payment, each stage recorded and linked for a complete audit trail.' },
      { title: 'Vendor management', desc: 'A searchable vendor directory with quotation and order history per supplier, useful for comparing prices over time.' },
      { title: 'Asset register', desc: 'Equipment and furniture purchased through procurement automatically become tracked assets, not a separate manual list.' },
      { title: 'Budget-aware requisitions', desc: 'Purchase requisitions tie into the same budget module finance officers already use, so spend stays visible against budget.' },
      { title: 'Approval workflow', desc: 'Requisitions and purchase orders move through a defined approval chain instead of a verbal go-ahead.' },
      { title: 'Audit-ready records', desc: 'Every stage is timestamped and attributable to a user, giving boards, auditors, and sponsors a clear spend history.' },
    ],
    faqs: [
      { q: 'Does procurement connect to the school\'s budget and finance records?', a: 'Yes — purchase requisitions and orders tie into the same finance and budget module the finance officer already uses, so procurement spend is visible against budget in real time rather than reconciled separately later.' },
      { q: 'What is a GRN and why does it matter?', a: 'A Goods Received Note (GRN) records that ordered items were actually delivered and in what condition, closing the gap between "we ordered it" and "we received it" — a step informal procurement processes usually skip entirely.' },
      { q: 'Does purchased equipment automatically become a tracked asset?', a: 'Yes — items purchased through the procurement workflow flow into the school\'s asset register automatically, so there\'s no separate manual asset-entry step after a purchase completes.' },
    ],
  },
};

export const FEATURE_PAGE_SLUGS = Object.keys(FEATURE_PAGES);
