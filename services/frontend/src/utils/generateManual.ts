import { jsPDF } from 'jspdf';

type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'finance_officer' | 'driver' | 'superadmin';

interface Section {
  title: string;
  content: string[];
}

interface ManualChapter {
  chapter: string;
  sections: Section[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Content definitions per role
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your web browser.',
          '2. Enter your email address and password on the Login page.',
          '3. Click "Sign In". You will be taken to the Admin Dashboard.',
          '4. If you forget your password, click "Forgot Password?" and follow the email reset link.',
          'TIP: Keep your login credentials secure and do not share them with others.',
        ],
      },
      {
        title: 'Understanding the Dashboard',
        content: [
          'The Admin Dashboard shows a real-time overview of your school:',
          '• Total Students – number of enrolled students.',
          '• Total Teachers – number of active teachers.',
          '• Fee Collected – total fees collected this term.',
          '• Today\'s Attendance – percentage of students present today.',
          'The sidebar on the left gives you access to all modules.',
          'TIP: Click the school logo or "Dashboard" to return here at any time.',
        ],
      },
      {
        title: 'Navigating the Sidebar',
        content: [
          'The sidebar is organized into sections. Here is where to find each feature:',
          '',
          '• PEOPLE',
          '   – Students: enrol, edit, export student records',
          '   – Teachers: staff records and class assignments',
          '   – Parents: parent/guardian profiles and student links',
          '   – User Management: create login accounts and assign roles',
          '',
          '• ACADEMIC',
          '   – CBE Academics: Schemes of Work, Lesson Plans, SBA, Projects, Life Skills, Career Guidance, Learning Materials, Promotions',
          '   – Classes & Subjects: add/edit class groups and learning areas',
          '   – CBE Assessments: record and view individual assessment marks',
          '   – CBE Analytics: grade distribution charts and class rankings',
          '   – CBE Report Cards: generate, publish, share, and download PDF report cards',
          '   – Grade Book: quick mark entry per class',
          '   – Attendance: view and mark daily attendance',
          '   – IGCSE: full Cambridge International module (see Chapter 13)',
          '',
          '• FINANCE',
          '   – Fee Management: create fee structures (with student type & transport options), bulk generate invoices',
          '   – Transactions: record payments and expenses',
          '   – Budgets: plan and track spending',
          '   – Bank Accounts: manage school accounts',
          '   – Reports: income statement, fee collection, outstanding fees, expense reports',
          '   – Assets, Vendors, Purchase Orders, Petty Cash',
          '',
          '• SCHEDULE',
          '   – Timetable: create and publish class timetables',
          '   – Assignments: set and grade student assignments',
          '',
          '• WELFARE',
          '   – Discipline: log incidents, auto-alerts to parents',
          '   – Health: student medical profiles and incident records',
          '   – Transport: bus routes, vehicle details, student assignments',
          '   – Staff Leave: approve or reject leave and permission requests',
          '',
          '• LIBRARY',
          '   – Catalog: manage book inventory',
          '   – Issue / Return: borrow and return tracking',
          '',
          '• MESSAGES: send announcements and communicate with staff, students, parents',
          '',
          '• ACCOUNT',
          '   – My Profile: update your name, email, password, and photo',
          '   – Settings: school name, logo (upload image), address, term, academic year',
          'TIP: Click the school name or logo at the top of the sidebar to return to the Dashboard.',
        ],
      },
    ],
  },
  {
    chapter: '2. Managing Students',
    sections: [
      {
        title: 'Adding a New Student',
        content: [
          '1. Click "Students" in the sidebar under People.',
          '2. Click the green "+ Add Student" button (top right).',
          '3. Fill in the student form:',
          '   – First Name, Last Name (required)',
          '   – Email and Password (default: student123)',
          '   – Class / Grade (required) – select from the dropdown',
          '   – Gender, Date of Birth, Blood Group',
          '   – Student Category: choose "Day Scholar" or "Boarder"',
          '     * Day Scholar – student goes home daily',
          '     * Boarder – student lives in school hostel (different fee structure applies)',
          '4. Click "Add Student". The student is now enrolled with an auto-generated admission number.',
          'TIP: Boarding/Day Scholar status is used to apply the correct fee structure for each student.',
        ],
      },
      {
        title: 'Editing a Student / Changing Admission Number',
        content: [
          '1. Go to Students in the sidebar.',
          '2. Find the student using the search bar or filters.',
          '3. Click the pencil (edit) icon on the student\'s row.',
          '4. You can now edit ANY field including:',
          '   – Admission Number – overwrite with your school\'s custom format',
          '   – Student Category – switch between Boarder and Day Scholar',
          '   – Status: Active, Inactive, Suspended, or Transferred',
          '5. Click "Update Student" to save.',
          'To permanently delete: click the trash icon and confirm the prompt.',
          'WARNING: Deletion is permanent. Prefer setting Status to "Inactive" for record-keeping.',
        ],
      },
      {
        title: 'Exporting Student Data',
        content: [
          '1. Go to Students in the sidebar.',
          '2. Apply any filters you need (class, status, gender).',
          '3. Click the "Export" button (download icon, top right).',
          '4. A CSV file will download automatically to your device.',
          'TIP: Open the CSV in Excel or Google Sheets for further analysis.',
        ],
      },
    ],
  },
  {
    chapter: '3. Managing Teachers',
    sections: [
      {
        title: 'Adding a Teacher',
        content: [
          '1. Click "Teachers" in the sidebar.',
          '2. Click "+ Add Teacher".',
          '3. Enter the teacher\'s details: Name, Email, Phone, Subject Specialization, Employee Number.',
          '4. Click "Save". The teacher record is created.',
          '5. To give the teacher system access, go to User Management and create a user account linked to the teacher.',
        ],
      },
      {
        title: 'Assigning Teachers to Classes',
        content: [
          '1. Go to Academic → Classes.',
          '2. Select a class and click "Edit".',
          '3. In the Class Teacher field, select the teacher from the dropdown.',
          '4. Save. The teacher now sees this class in their dashboard.',
        ],
      },
    ],
  },
  {
    chapter: '4. User Management & Roles',
    sections: [
      {
        title: 'Creating User Accounts',
        content: [
          '1. Click "User Management" in the sidebar under People.',
          '2. Click "+ Add User".',
          '3. Enter the user\'s email, select their Role:',
          '   – admin: full system access',
          '   – teacher: class and academic access',
          '   – student: own records only',
          '   – parent: their children\'s records',
          '   – finance_officer: finance module only',
          '4. Set a temporary password. The user can change it after first login.',
          '5. Click "Create User".',
        ],
      },
      {
        title: 'Editing User Roles',
        content: [
          '1. Go to User Management.',
          '2. Find the user and click the edit icon.',
          '3. Change the Role dropdown as needed.',
          '4. Click "Save". Changes take effect at the user\'s next login.',
          'TIP: Never share the admin account. Create individual accounts for each person.',
        ],
      },
    ],
  },
  {
    chapter: '5. Academic Management (CBE)',
    sections: [
      {
        title: 'Managing Classes & Learning Areas',
        content: [
          '1. Go to Academic in the sidebar.',
          '2. Use the "Classes" tab to add/edit class groups (e.g., Grade 4 East).',
          '3. Use the "Learning Areas" tab to manage subjects per grade level.',
          'CBE Grade Levels: Playgroup → PP1/PP2 → Grade 1–6 → Grade 7–9 (JSS) → Grade 10–12 (SSS).',
        ],
      },
      {
        title: 'Schemes of Work',
        content: [
          '1. Go to Academic → "Schemes of Work" tab.',
          '2. Click "+ New Scheme".',
          '3. Select Class, Learning Area, Term, and Year.',
          '4. Add weekly entries: topic, objectives, resources, activities.',
          '5. Submit for approval when complete.',
          'TIP: Teachers can create drafts; admins approve them.',
        ],
      },
      {
        title: 'CBE Assessments — Recording Marks',
        content: [
          '1. Go to "CBE Assessments" in the sidebar under Academic.',
          '2. Click "+ Record Assessment".',
          '3. Fill in the form:',
          '   – Class, Student, Subject',
          '   – Assessment Type: Formative, Summative, Project, Portfolio, or Observation',
          '   – Exam Period: General / Mid-Term / End-Term',
          '   – Term (Term 1 / 2 / 3) and Academic Year',
          '   – Special Status (if applicable): WD = Withheld Result, Y = Missed Exam',
          '   – Score and Out-of (Max Score) – leave blank if using WD or Y',
          '4. Teacher Comments are auto-filled based on the grade:',
          '   – EE/EE1/EE2 → "EXCELLENT"   ME/ME1/ME2 → "GOOD"',
          '   – AE/AE1/AE2 → "Can do better"   BE/BE1/BE2 → "Put More Effort"',
          '   You can still type your own comment to override.',
          '5. Click "Save Assessment".',
          'CBE Grade Scales:',
          '  Standard (Grade 1–6, Senior Secondary):',
          '    EE ≥80% | ME 60–79% | AE 40–59% | BE <40%',
          '  JSS 2025 KJSEA (Grade 7–9) — 8 Achievement Levels:',
          '    EE1 90–100% (8pts) | EE2 75–89% (7pts)',
          '    ME1 58–74% (6pts) | ME2 41–57% (5pts)',
          '    AE1 31–40% (4pts) | AE2 21–30% (3pts)',
          '    BE1 11–20% (2pts) | BE2 1–10% (1pt)',
          '  Pre-Primary (PP1, PP2, Playgroup): WD ≥75% | D 40–74% | B <40%',
        ],
      },
      {
        title: 'CBE Assessments — Editing & Deleting Records',
        content: [
          '1. Go to "CBE Assessments" in the sidebar.',
          '2. Use the filters (Class, Subject, Term, Year) to find the record.',
          '3. To edit: click the pencil icon on the assessment row.',
          '   – Update the score, max score, exam period, special status (WD/Y), or comments inline.',
          '   – Click the green tick (✓) to save, or X to cancel.',
          '4. To delete: click the red trash icon and confirm the popup.',
          'WARNING: Deleted assessments cannot be recovered.',
        ],
      },
      {
        title: 'CBE Assessments — Downloading Results',
        content: [
          '1. Go to "CBE Assessments" in the sidebar.',
          '2. Use the filters to narrow down to the class, subject, or term you need.',
          '3. Click the "Download CSV" button (top right of the page).',
          '4. A spreadsheet file downloads to your device containing:',
          '   – Student name, Subject, Type, Exam Period, Score, Grade, Result Code, Comments.',
          '5. Open in Excel or Google Sheets for printing or further analysis.',
        ],
      },
      {
        title: 'CBE Report Cards — Generating & Sharing',
        content: [
          '1. Go to "CBE Report Cards" in the sidebar.',
          '2. Select the Class, Term, and Academic Year.',
          '3. Click "Generate Report Cards for All Students".',
          '4. Click on a student\'s name to open their individual report card.',
          '5. Review the competency grades and teacher comments.',
          '6. Click "Publish" to finalise the report card.',
          '7. Click "Share with Parent" to send via Email or WhatsApp.',
          'NOTE: Parents must be linked to the student for sharing to work.',
          'If sharing fails, go to Parents → find the parent → click "Link Student".',
        ],
      },
      {
        title: 'CBE Report Cards — Bulk PDF Download',
        content: [
          'You can download report cards as a single PDF file for printing or record-keeping.',
          '',
          '1. Go to "CBE Report Cards" in the sidebar.',
          '2. Select the Class, Term, and Academic Year to load the report cards.',
          '3. Click the "Download PDF" dropdown button (top right of the page).',
          '4. Choose one of three options:',
          '   – This Class (All) — downloads all report cards for the selected class.',
          '   – Published Only — downloads only report cards that have been published.',
          '   – Selected Student — downloads the report card for the student currently open.',
          '5. The PDF is generated in your browser and downloaded automatically.',
          '   Each student gets one page in the PDF with:',
          '   – School name and logo (set in Account → Settings)',
          '   – Student name, class, and admission number',
          '   – Attendance summary',
          '   – Learning area grades with colour-coded CBE badges',
          '   – Teacher comments and overall grade',
          'TIP: Use "Published Only" before parents\' day to print only finalised cards.',
          'TIP: Set your school logo in Account → Settings so it appears on the PDF header.',
          'NOTE: For JSS (Grade 7–9) report cards, the PDF shows 8-level grades (EE1–BE2) with grade points.',
        ],
      },
      {
        title: 'CBE Analytics — Class View',
        content: [
          '1. Go to "CBE Analytics" in the sidebar.',
          '2. Click the "Class View" tab.',
          '3. Select a class from the dropdown.',
          '4. The system displays:',
          '   – CBE Grade Distribution chart (EE / ME / AE / BE breakdown)',
          '   – Student Rankings by average score across all CBE assessments',
          '   – Subject Performance showing average % per learning area',
          'NOTE: Data comes from CBE Assessments you have recorded — the more',
          'assessments entered, the richer the analytics.',
          'TIP: Use Class View to identify students who need extra support (BE/AE).',
        ],
      },
      {
        title: 'CBE Analytics — Broadsheet (Class Performance Grid)',
        content: [
          'The Broadsheet gives you a complete class performance snapshot — all students × all subjects in one table.',
          '',
          '1. Go to "CBE Analytics" in the sidebar.',
          '2. Click the "Broadsheet" tab.',
          '3. Select a Class, Term (optional), and Academic Year.',
          '4. Click "Generate" — the grid loads automatically.',
          '',
          'Reading the Broadsheet:',
          '   – Rows = individual students',
          '   – Columns = learning areas / subjects',
          '   – Each cell shows the CBE grade for that student in that subject:',
          '       EE (green) = Exceeding Expectations (≥80%)',
          '       ME (blue)  = Meeting Expectations (60–79%)',
          '       AE (yellow)= Approaching Expectations (40–59%)',
          '       BE (red)   = Below Expectations (<40%)',
          '   – Pre-Primary classes show WD / D / B instead.',
          '   – The "Overall" column shows the average grade.',
          '   – The "Rank" column ranks students by total score descending.',
          '',
          'Exporting the Broadsheet:',
          '   – Click "↓ CSV" to download a spreadsheet (Excel/Google Sheets).',
          '   – Click "↓ PDF" to download a landscape PDF report for printing.',
          '',
          'TIP: Generate the Broadsheet at the end of each term to review overall class performance.',
          'TIP: Share the PDF with the head teacher or board of management.',
          'WARNING: Cells showing "—" mean no assessment has been recorded for that student in that subject.',
        ],
      },
      {
        title: 'Student Promotions',
        content: [
          '1. Go to Academic → "Promotion" tab.',
          '2. Configure promotion rules (e.g., minimum ME in core subjects).',
          '3. Click "Evaluate Students" to preview who qualifies.',
          '4. Review the list, override if needed, then click "Promote".',
          '5. Students are moved to the next grade automatically.',
        ],
      },
    ],
  },
  {
    chapter: '6. Fee & Finance Management',
    sections: [
      {
        title: 'Setting Up Fee Structures',
        content: [
          'Go to Finance → Fee Management → "Fee Structures" tab.',
          'Click "+ Add Fee Structure". The form has these key fields:',
          '',
          '  Fee Name & Amount — e.g. "Term 1 Tuition Fee", 18000',
          '',
          '  Student Type — choose ONE of:',
          '    • All Students — applies to every student (e.g. tuition, exam fees)',
          '    • Day Scholar  — only day students are billed (e.g. lunch fee)',
          '    • Boarder      — only boarding students are billed (e.g. boarding levy)',
          '  NOTE: A student\'s type is set when adding/editing them under Students.',
          '  Bulk invoice generation will automatically skip students who do not match.',
          '',
          '  Frequency — Monthly / Quarterly (Per Term) / Half Yearly / Yearly / One Time',
          '',
          '  Term — set this when the amount differs by term (e.g. Term 1 tuition is higher',
          '  than Term 3). Create one fee structure per term, each with its own amount and',
          '  the matching Term selected — invoice generation for that term only picks up the',
          '  matching row. Leave as "All Terms" for fees that stay the same all year, like',
          '  transport or lunch.',
          '',
          '  Transport Fee checkbox — tick this ONLY if the fee is for school transport.',
          '    – Optionally link to a specific Route to bill only students on that route.',
          '    – Leave route as "All routes" to bill any student assigned to transport.',
          '    – Students without a transport route assigned are always skipped.',
          '',
          '  Apply to Class — leave blank to apply to all classes, or pick one class.',
          '  Due Day — day of the month when payment is due (e.g. 15).',
          '',
          'Click "Create Fee Structure" to save.',
          'TIP: Create separate structures for boarders and day scholars rather than one "all students" fee that you manually adjust later.',
          'TIP: For a fee that changes each term, create it three times (once per term) with',
          '     the same name and each term\'s own amount — the fee report will show them together.',
        ],
      },
      {
        title: 'Bulk Invoice Generation',
        content: [
          'After setting up fee structures, use the Bulk Generate tab to create invoices for all students at once.',
          '',
          'Go to Finance → Fee Management → "Bulk Generate Invoices" tab.',
          '',
          'Step 1 — Select Classes: tick the classes to include (or "Select All").',
          'Step 2 — Select Fee Structures: tick the fees you want to bill this period.',
          '  The system shows the student type and whether it is a transport fee.',
          'Step 3 — Invoice Settings: choose Term, Academic Year, and Due Date.',
          '',
          'Click "Preview" first. The system will show:',
          '  • Students to be billed — name, class, student type, and invoice amount.',
          '  • Skipped students — and WHY they are skipped:',
          '      – Wrong student category (e.g. boarder fee billed to day scholar)',
          '      – No transport assigned (transport fee, but student has no route)',
          '      – Different route (student is on a different bus route)',
          '',
          'Once satisfied with the preview, click "Generate" to create all invoices.',
          'WARNING: Do not generate invoices twice for the same term — duplicates will be created.',
          'TIP: Always Preview before generating. It costs nothing and saves correction work.',
        ],
      },
      {
        title: 'Recording Fee Payments',
        content: [
          '1. Go to Finance → Transactions.',
          '2. Click "+ Record Payment".',
          '3. Search for the student by name or admission number.',
          '4. Enter the Amount, Payment Method (cash, M-Pesa, bank), and Reference.',
          '5. Click "Save". The student\'s balance updates immediately.',
          'TIP: Always record the M-Pesa or bank reference number for traceability.',
        ],
      },
      {
        title: 'Finance Reports',
        content: [
          'Go to Finance → Reports. Six report tabs are available:',
          '',
          '1. Fee Collection — summary stats, class breakdown, payment methods, monthly trend.',
          '2. Defaulters — students with outstanding balances (filter by class/term/year).',
          '3. Student Payments — ALL students: invoiced, paid, balance due. Searchable.',
          '4. Income & Expenses — revenue vs. spending P&L by category.',
          '5. Budget vs Actual — approved budgets and spending progress.',
          '6. Cash Flow — cash in / out / net for any date range.',
          '',
          'Every tab has PDF and CSV export buttons in the top-right header.',
          'Use filters (Year, Term, Class, Date Range) + "Apply" to narrow data.',
          'TIP: Run Fee Collection + Defaulters every end of term.',
          'TIP: Student Payments report is ideal for term-end fee clearance checks.',
        ],
      },
      {
        title: 'Budget Management',
        content: [
          '1. Go to Finance → Budgets.',
          '2. Click "+ New Budget" and enter the category, amount, and period.',
          '3. Track actual vs. budgeted spending in real time.',
          '4. Raise purchase orders under Vendors & Purchase Orders.',
        ],
      },
    ],
  },
  {
    chapter: '7. Attendance Management',
    sections: [
      {
        title: 'Viewing Attendance Records',
        content: [
          '1. Click "Attendance" in the sidebar.',
          '2. Filter by Class and Date.',
          '3. View the list of students with their status: Present / Absent / Late.',
          '4. Attendance is marked by teachers from their dashboard.',
          'TIP: Use the summary chart to spot attendance trends by week or month.',
        ],
      },
    ],
  },
  {
    chapter: '8. Timetable Management',
    sections: [
      {
        title: 'Creating & Editing Timetables',
        content: [
          '1. Go to Schedule → Timetable.',
          '2. Select the Class and Term.',
          '3. Click a time slot to add a lesson: choose Learning Area, Teacher, Room.',
          '4. Drag and drop to rearrange lessons.',
          '5. Click "Publish" to make the timetable visible to teachers and students.',
        ],
      },
      {
        title: 'Auto-Generating a Timetable',
        content: [
          'Instead of placing every lesson by hand, let the system build the whole week for you:',
          '',
          '1. Go to Schedule → Timetable and click "Auto-Generate".',
          '2. Choose Scope: All Classes, or just the class currently selected.',
          '3. Choose the Working Days, Periods/Day, Period length, and the time the day starts.',
          '4. Tick "Replace existing entries" if you want to regenerate a class that already has',
          '   a timetable — leave it unticked to only fill in classes that don\'t have one yet.',
          '5. Click "Generate".',
          '',
          'The system reads each class\'s assigned subjects, teachers and weekly period counts',
          '(set under People → Managing Teachers → Assigning Teachers to Classes), then spreads',
          'each subject across different days and guarantees no teacher or class is ever double-',
          'booked. A summary shows how many periods were created, and flags any subject it',
          'couldn\'t fully place — usually because a teacher is already booked elsewhere at every',
          'remaining slot — so you know exactly what to check by hand.',
          '',
          'TIP: Set up every class\'s subjects and teachers first — Auto-Generate can only',
          '     schedule what has been assigned.',
        ],
      },
    ],
  },
  {
    chapter: '9. Welfare Modules',
    sections: [
      {
        title: 'Discipline Records',
        content: [
          '1. Go to Welfare → Discipline.',
          '2. Click "+ New Incident" to log a discipline case.',
          '3. Select the student, describe the incident, and choose severity.',
          '4. The system automatically notifies the parent via alert.',
          '5. Record the action taken (counselling, suspension, etc.).',
        ],
      },
      {
        title: 'Health Records',
        content: [
          '1. Go to Welfare → Health.',
          '2. View and update student medical profiles.',
          '3. Log health incidents: date, complaint, treatment.',
          '4. For emergencies, the system sends an automatic alert to the parent.',
        ],
      },
      {
        title: 'Transport Management — Routes',
        content: [
          'Go to Welfare → Transport in the sidebar.',
          '',
          'ADDING A ROUTE:',
          '1. Click "+ Add Route" (top right).',
          '2. Fill in the route form:',
          '   – Route Name (required) e.g. "Westlands Morning Route"',
          '   – Route Code e.g. RT01',
          '   – Vehicle Registration e.g. KCB 123A',
          '   – Capacity — number of seats on the vehicle',
          '   – Driver Name and Driver Phone',
          '   – Morning Pickup Time and Afternoon Drop-off Time',
          '   Transport Fees (used by bulk invoice generation):',
          '   – Monthly Fee — if you charge monthly',
          '   – Term Fee — charged once per term (used for bulk invoicing)',
          '   – Distance (km) and Fare per km — system shows calculated fare per trip',
          '3. Click "Add Route" to save.',
          '',
          'EDITING A ROUTE:',
          '1. Click on the route name in the left panel to select it.',
          '2. Click the "Edit" button that appears on the right panel.',
          '3. Update any details and click "Update Route".',
          '',
          'ASSIGNING STUDENTS TO A ROUTE:',
          '1. Select the route from the left panel.',
          '2. Click "+ Assign Student".',
          '3. Select the student from the dropdown.',
          '4. Optionally enter their Pickup Stop and Drop-off Stop.',
          '5. Click "Assign".',
          'NOTE: Only students assigned to a route will be billed for transport fees during bulk invoice generation.',
          '',
          'REMOVING A STUDENT FROM A ROUTE:',
          '  Click "Remove" on the student row in the route detail view.',
          '',
          'TIP: Set up transport fee structures in Finance → Fee Management and link them to the relevant routes for automatic billing.',
        ],
      },
      {
        title: 'Staff Leave & Permission Requests',
        content: [
          'Go to Welfare → Staff Leave in the sidebar.',
          '',
          'AS ADMIN — Reviewing Requests:',
          '1. You will see all leave requests submitted by staff.',
          '2. The status panel shows: Pending / Approved / Rejected counts.',
          '3. Click "Review" on any Pending request.',
          '4. Choose "Approve" or "Reject" from the dropdown.',
          '5. Optionally add a reviewer comment for the staff member.',
          '6. Click the colour-coded button to confirm your decision.',
          '',
          'Filtering: Use the status buttons (All / Pending / Approved / Rejected / Cancelled) to narrow the list.',
          '',
          'Leave Types supported:',
          '   Annual | Sick | Maternity | Paternity | Compassionate | Permission/Half-day | Unpaid | Other',
          'TIP: Approved leave is visible to the staff member in their own leave page.',
        ],
      },
    ],
  },
  {
    chapter: '10. Library',
    sections: [
      {
        title: 'Managing the Book Catalog',
        content: [
          '1. Go to Library → Library Management.',
          '2. Click "+ Add Book" and enter: Title, Author, ISBN, Category, Copies.',
          '3. Click "Save". The book is searchable by all users.',
        ],
      },
      {
        title: 'Issuing & Returning Books',
        content: [
          '1. Go to Library → Issue / Return.',
          '2. To issue: search for student, select book, set due date, click "Issue".',
          '3. To return: find the borrowing record and click "Mark Returned".',
          '4. Overdue books are highlighted in red.',
        ],
      },
    ],
  },
  {
    chapter: '11. Communication & Messages',
    sections: [
      {
        title: 'Sending School Announcements',
        content: [
          '1. Go to Messages in the sidebar.',
          '2. Click "+ New Message".',
          '3. Choose recipients: All Students, All Teachers, All Parents, or specific users.',
          '4. Type your message and click "Send".',
          'TIP: Use announcements for important events, deadlines, and reminders.',
        ],
      },
    ],
  },
  {
    chapter: '12. Settings & Profile',
    sections: [
      {
        title: 'School Settings',
        content: [
          '1. Go to Account → Settings in the sidebar.',
          '2. Update the following:',
          '   – School Name, Address, Phone, Email, Website',
          '   – Current Academic Year and Current Term',
          '   – School Motto',
          '',
          'SCHOOL LOGO:',
          '   – Click the "Upload Logo" button to select an image file from your device.',
          '     Supported formats: JPG, PNG, GIF. Recommended: square image, at least 256×256 px.',
          '   – The image is automatically resized and stored. A preview appears immediately.',
          '   – To remove the logo, click the "Remove" link below the preview.',
          '   – The logo appears on CBE Report Card PDFs and other printed documents.',
          'TIP: Use a clear, square version of your school crest for best results on printed reports.',
          '',
          '3. Click "Save Settings" to apply all changes.',
        ],
      },
      {
        title: 'Your Profile',
        content: [
          '1. Go to Account → My Profile.',
          '2. Update your name, email, and profile photo.',
          '3. To change your password: enter current password, then new password twice.',
          '4. Click "Save Profile".',
        ],
      },
    ],
  },
  {
    chapter: '13. IGCSE Module (Cambridge International)',
    sections: [
      {
        title: 'What is the IGCSE Module?',
        content: [
          'The IGCSE module supports the Cambridge International General Certificate of Secondary',
          'Education curriculum alongside (not instead of) the Kenya CBE curriculum.',
          '',
          'It provides:',
          '  • Subject and syllabus management with Cambridge subject codes (e.g. 0580 = Maths)',
          '  • Multi-component grading: Paper 1, Paper 2, Coursework, Practicals, Oral',
          '  • Core and Extended tier support per student per subject',
          '  • A*–G grade scale with dynamic grade boundaries (changeable per exam session)',
          '  • May/June and Oct/Nov exam session management',
          '  • Cambridge-style Statement of Results report cards',
          '',
          'Access the IGCSE module from the sidebar: Academic → IGCSE.',
          'The module has 8 tabs across the top of the page.',
        ],
      },
      {
        title: 'Step 1 — Grading Setup',
        content: [
          'Before using any other feature, set up your grading system.',
          '',
          '1. Go to Academic → IGCSE → "Grading Setup" tab.',
          '2. Click "+ Add System".',
          '3. Enter a Name (e.g. "IGCSE A*-G 2026") and select Scale Type: A*–G or 9–1.',
          '4. Click "Save".',
          '',
          'Setting Grade Boundaries:',
          '1. Click "Boundaries" on the grading system you just created.',
          '2. A panel opens showing default grade boundaries for A*–G:',
          '   A* = 90–100% | A = 80–89% | B = 70–79% | C = 60–69%',
          '   D = 50–59%   | E = 40–49% | F = 30–39% | G = 20–29% | U = 0–19%',
          '3. Edit the Min% and Max% for each grade to match Cambridge official thresholds',
          '   for the current exam series (thresholds change every year — check Cambridge).',
          '4. Click "Save Boundaries".',
          '',
          'TIP: Create a new grading system each year and update the boundaries to match',
          '     the official Cambridge grade threshold documents.',
          'NOTE: Grade boundaries apply to the weighted final score (sum of all components).',
        ],
      },
      {
        title: 'Step 2 — Exam Sessions',
        content: [
          'Create an exam session for each Cambridge exam sitting.',
          '',
          '1. Go to IGCSE → "Exam Sessions" tab.',
          '2. Click "+ Add Session".',
          '3. Fill in the form:',
          '   – Session Name: e.g. "May/June 2026"',
          '   – Series: choose May/June, Oct/Nov, or Jan/Feb',
          '   – Year: e.g. 2026',
          '   – Start Date and End Date (optional)',
          '4. Tick "Set as active session" to make this the current working session.',
          '5. Click "Save".',
          '',
          'Only one session can be active at a time.',
          'Activating a new session automatically deactivates the previous one.',
          '',
          'LOCKING a session:',
          '   – Once all marks are submitted and grades published, an admin can lock the session.',
          '   – Locked sessions prevent further mark changes.',
          '   – Use the Edit button on the session and toggle the Lock option.',
        ],
      },
      {
        title: 'Step 3 — Subjects & Syllabi',
        content: [
          '1. Go to IGCSE → "Subjects & Syllabi" tab.',
          '2. Click "+ Add Subject".',
          '3. Enter:',
          '   – Subject Name: e.g. "Mathematics"',
          '   – Cambridge Code: e.g. "0580"',
          '   – Subject Group: Sciences | Languages | Mathematics | Humanities | Arts & Technology',
          '4. Click "Save".',
          '',
          'Adding a Syllabus to a Subject:',
          '1. Click "+ Syllabus" on the subject row.',
          '2. Enter:',
          '   – Syllabus Code: e.g. "0580"',
          '   – Version: e.g. "2023-2025"',
          '   – Grading System: select the one you created in Step 1',
          '   – Tiers: "Core & Extended" (most subjects) or "Single tier"',
          '3. Click "Add Syllabus".',
          '',
          'Adding Assessment Components:',
          '1. Click the arrow (▶) on a syllabus to expand it.',
          '2. Click "+ Component".',
          '3. Fill in:',
          '   – Name: e.g. "Paper 2 (Extended)"',
          '   – Code: e.g. "22"',
          '   – Type: Written | Coursework | Practical | Oral | Portfolio',
          '   – Tier: Core | Extended | Both',
          '   – Max Marks: e.g. 80',
          '   – Weight (%): the proportion of the final grade this component carries',
          '   – Duration (minutes): e.g. 90',
          '4. Click "Add Component".',
          '',
          'IMPORTANT: All component weights for a syllabus should add up to 100%.',
          'Example — Cambridge Maths 0580 (Extended):',
          '   Paper 2 (Extended): Written, 80 marks, 30% weight',
          '   Paper 4 (Extended): Written, 130 marks, 70% weight',
        ],
      },
      {
        title: 'Step 4 — Enrolling Students',
        content: [
          '1. Go to IGCSE → "Enrollments" tab.',
          '2. Click "+ Enroll Student" to enroll one student at a time.',
          '3. Select: Student, Syllabus, Exam Session, and Tier (Core or Extended).',
          '4. Optionally enter a Candidate Number (from Cambridge centre registration).',
          '5. Click "Enroll".',
          '',
          'Bulk Enrollment:',
          '1. Click "Bulk Enroll" to enroll multiple students in one subject at once.',
          '2. Select: Syllabus, Exam Session, Tier, and Class.',
          '3. Click "Enroll All" — all students in the selected class are enrolled.',
          '',
          'Viewing Enrollments:',
          '  The table shows every student with their subject, session, tier, and current grade.',
          '  Use the subject and session filters at the top to narrow the list.',
          '',
          'Core vs Extended Tier:',
          '  Extended: students can achieve A*–G (full range). This is the standard path.',
          '  Core: students can achieve C–G only. Used for students who need more support.',
          '  The tier affects which assessment components apply to each student.',
        ],
      },
      {
        title: 'Step 5 — Entering Marks (Teacher Workflow)',
        content: [
          '1. Go to IGCSE → "Mark Entry" tab.',
          '2. Select a Syllabus and Exam Session from the dropdowns.',
          '3. Click "Load Sheet".',
          '',
          'The mark entry grid loads:',
          '  – Rows = enrolled students',
          '  – Columns = assessment components (Paper 1, Paper 2, etc.)',
          '  – Each cell shows max marks and weight in the column header',
          '',
          'Entering a mark:',
          '  – Click into a cell and type the raw score.',
          '  – Cells turn blue when you have an unsaved change.',
          '  – Leave a cell blank to indicate not yet marked.',
          '',
          'Saving marks:',
          '  – Click "Save Marks" (blue button, top left).',
          '  – Only cells that changed are saved.',
          '',
          'Locking marks (Admin only):',
          '  – Click "Lock All" to prevent further editing of this syllabus/session.',
          '  – Locked cells show a padlock icon.',
          '  – Only admin accounts can override a lock.',
          '',
          'Computing Grades:',
          '  – Click "Calculate Grades" to compute weighted scores and assign A*–G grades.',
          '  – The Grade column updates immediately.',
          '  – Weighted score = sum of (component score / max marks × weight) across all components.',
          '  – The final grade is looked up against the grade boundaries you set in Step 1.',
          '',
          'TIP: Enter marks for all components before clicking Calculate Grades.',
          'TIP: Students with missing marks will not get a final grade — only components',
          '     with a raw score entered will contribute to the weighted calculation.',
        ],
      },
      {
        title: 'Viewing Results',
        content: [
          '1. Go to IGCSE → "Results" tab.',
          '2. Select a student and optionally filter by exam session.',
          '3. Click "View Results".',
          '',
          'The results page shows:',
          '  – Each subject enrolled, with Cambridge code and syllabus version',
          '  – Component breakdown: name, raw score, max marks, %, weight',
          '  – Weighted final score (overall %)',
          '  – Final grade (A*–G) displayed prominently',
          '',
          'The grade colour coding:',
          '  A* = violet  | A = green  | B = blue   | C = teal',
          '  D = yellow   | E = orange | F = red    | G = rose | U = grey',
        ],
      },
      {
        title: 'Generating Report Cards',
        content: [
          '1. Go to IGCSE → "Report Cards" tab.',
          '2. Select a student and exam session.',
          '3. Click "Generate Report".',
          '',
          'The Cambridge-style Statement of Results shows:',
          '  – School name and session details in the header',
          '  – Student name, admission number, class, session, series, and year',
          '  – A table of all enrolled subjects:',
          '      Subject name and Cambridge code',
          '      Tier (Core / Extended)',
          '      Component breakdown (e.g. Paper 2: 65/80)',
          '      Weighted final percentage',
          '      Final grade (A*–G)',
          '  – Cambridge footer with generation date',
          '',
          'TIP: Ensure all marks are entered and grades calculated before generating a report.',
          'TIP: Students can view their own report card from the IGCSE → Results tab.',
          'NOTE: Report cards can be printed by using the browser Print function (Ctrl+P / Cmd+P)',
          '      on the generated report page.',
        ],
      },
      {
        title: 'IGCSE Grading Quick Reference',
        content: [
          'Cambridge IGCSE A*–G Scale:',
          '',
          '  A* (Distinction)  — Exceptional performance (typically 90%+)',
          '  A  (Very good)    — Outstanding performance',
          '  B  (Good)         — Above average performance',
          '  C  (Credit)       — Satisfactory performance (minimum for most university entry)',
          '  D  (Acceptable)   — Below average but passing',
          '  E  (Limited)      — Below average',
          '  F  (Very limited) — Significantly below average',
          '  G  (Minimum)      — Minimum pass grade',
          '  U  (Ungraded)     — Below the minimum standard, not awarded a grade',
          '',
          'Core Tier: candidates can achieve a maximum of C grade.',
          'Extended Tier: candidates can achieve A* through G.',
          '',
          'Grade boundaries change every exam session — always verify against the official',
          'Cambridge grade threshold documents published after each exam series.',
          '',
          'Cambridge exam sessions:',
          '  May/June — main session, results published August',
          '  Oct/Nov  — second session, results published January',
        ],
      },
    ],
  },
  {
    chapter: '14. SMS Messaging & WhatsApp',
    sections: [
      {
        title: 'Sending Bulk SMS (Africa\'s Talking)',
        content: [
          'SkulManager integrates with Africa\'s Talking for bulk SMS. You must configure',
          'your API credentials before sending:',
          '1. Go to Messages → SMS Messaging in the sidebar.',
          '2. Click "Settings" and enter your Africa\'s Talking API Key, Username, and Sender ID.',
          '3. Click "Save Settings". Your SMS balance is shown at the top.',
          '',
          'To send an SMS:',
          '1. Go to Messages → SMS Messaging.',
          '2. Choose the Target:',
          '   – All Parents: sends to every parent linked to your school.',
          '   – Class Parents: sends to parents of students in one class.',
          '   – All Teachers: sends to all teacher phone numbers.',
          '   – Custom Numbers: paste specific phone numbers (comma-separated).',
          '3. Select or type your message (use a pre-built template or write your own).',
          '4. Click "Send SMS".',
          '5. View delivery logs in the SMS Logs section below.',
          'TIP: Messages are charged per SMS unit. Check your AT balance before bulk sends.',
        ],
      },
      {
        title: 'SMS Message Templates',
        content: [
          'SkulManager includes 8 ready-made templates:',
          '  1. School Opening — remind parents of school opening date',
          '  2. Fee Reminder — remind parents to pay outstanding fees',
          '  3. Exam Timetable — notify parents of upcoming exams',
          '  4. Results Released — inform parents results are available',
          '  5. Event Notice — announce a school event',
          '  6. Emergency — urgent communication template',
          '  7. General Announcement — custom school-wide message',
          '  8. Meeting Notice — invite parents to a school meeting',
          '',
          'Click any template to pre-fill the message box. Edit as needed before sending.',
          'TIP: You can type any custom message in the text area instead of using templates.',
        ],
      },
      {
        title: 'WhatsApp Communication',
        content: [
          'SkulManager supports WhatsApp in two ways:',
          '',
          'Option 1 — Device-Native (No API key needed):',
          '1. Go to Messages → WhatsApp in the sidebar.',
          '2. Under "Direct WhatsApp (Device App)", select target (All Parents or By Class).',
          '3. Type your message.',
          '4. Click "Get Phone Numbers" to load parent contacts.',
          '5. Click a "Send on WhatsApp" link next to each parent — your device WhatsApp opens.',
          'This option works even without a WhatsApp Business API subscription.',
          '',
          'Option 2 — WhatsApp Business API (Requires Meta/WhatsApp credentials):',
          '1. Go to Messages → WhatsApp.',
          '2. Enter your Phone Number ID, Access Token, and WhatsApp Number.',
          '3. Use the "Send via API" panel to send template messages programmatically.',
          '',
          'TIP: Use the device-native option to quickly send the same message to multiple',
          '     parents without needing any API subscription.',
        ],
      },
      {
        title: 'Two-Way SMS Keywords',
        content: [
          'Two-way SMS allows parents to send an SMS keyword and receive an automatic reply.',
          '1. Go to Messages → Two-Way SMS in the sidebar.',
          '2. Click "+ New Keyword".',
          '3. Enter a keyword (e.g. "FEES") and the automatic reply text.',
          '4. Activate the keyword.',
          '',
          'When a parent sends "FEES" to your school\'s SMS short code,',
          'the system automatically replies with your configured message.',
          'Useful for: fee balance inquiries, school closure notices, exam dates.',
          '',
          'NOTE: Two-way SMS requires your Africa\'s Talking account to have',
          '      a registered short code or alphanumeric sender configured.',
        ],
      },
    ],
  },
  {
    chapter: '15. Gate Management & Security',
    sections: [
      {
        title: 'Logging Visitors',
        content: [
          '1. Go to Security → Gate Manager in the sidebar.',
          '2. Click "+ Log Visitor".',
          '3. Fill in: Visitor Name, Phone, Purpose, Host (person being visited), Badge/Pass Number.',
          '4. The system records the Check-In time automatically.',
          '5. When the visitor leaves, click "Check Out" on their entry row.',
          'The gate dashboard shows all current visitors and today\'s log.',
          'TIP: Assign a dedicated device at the school gate for the gate manager role.',
        ],
      },
      {
        title: 'Gate Dashboard & Reports',
        content: [
          '1. Go to Security → Gate Dashboard.',
          '2. View all current checked-in visitors and their purpose.',
          '3. Filter by date to view historical logs.',
          '4. Click "Export CSV" to download the visitor log for any date range.',
          '',
          'Visitor Log (Security → Visitor Log):',
          '• Shows all visitor records with entry/exit times.',
          '• Search by visitor name, purpose, or host.',
          '• Useful for security audits and safeguarding reviews.',
        ],
      },
    ],
  },
  {
    chapter: '16. Transport Tracking & Driver Management',
    sections: [
      {
        title: 'Setting Up Transport Routes',
        content: [
          '1. Go to Welfare → Transport in the sidebar.',
          '2. Click "+ Add Route".',
          '3. Enter Route Name, pickup and drop-off points.',
          '4. Assign a fee charge (if transport is billed separately).',
          '5. Go to the "Assign Students" tab to assign students to routes.',
          'TIP: Students set as "Uses Transport" in their profile are listed here for easy assignment.',
        ],
      },
      {
        title: 'Creating Driver Accounts',
        content: [
          '1. Go to People → User Management.',
          '2. Click "+ Add User".',
          '3. Set the Role to "driver".',
          '4. Enter the driver\'s email and password.',
          '5. Assign the driver to a transport route in Welfare → Transport → Routes.',
          '',
          'The driver logs in and sees a dedicated Driver Dashboard showing:',
          '• Today\'s route and assigned students.',
          '• Pickup list with student name, class, and parent phone.',
          '• Ability to mark each student as: Picked Up, Missed, or Absent.',
          '• GPS coordinates are recorded with each pickup event.',
        ],
      },
      {
        title: 'Monitoring Transport Tracking',
        content: [
          '1. Go to Welfare → Transport Tracking in the sidebar.',
          '2. Select a date and route to view pickup status.',
          '3. Each row shows student name, status (Picked/Missed/Absent), time, and GPS.',
          '4. Export the tracking log as CSV for records.',
          '',
          'Parents see transport status for their child on the Parent Dashboard.',
          'They can see if the child was picked up this morning and the pickup time.',
          'TIP: Encourage drivers to mark pickups promptly — parents depend on this.',
        ],
      },
    ],
  },
  {
    chapter: '17. Hostel & Canteen Management',
    sections: [
      {
        title: 'Managing Hostels & Rooms',
        content: [
          '1. Go to Welfare → Hostel Management in the sidebar.',
          '2. Under the "Hostels" tab, click "+ Add Hostel".',
          '3. Enter: Hostel Name, Type (Boys/Girls/Mixed), Capacity.',
          '4. In the "Rooms" tab, click "+ Add Room" to subdivide the hostel.',
          '5. Enter: Room Number, Room Type (dormitory/private), Capacity.',
          '',
          'Allocating Students to Rooms:',
          '1. Go to the "Allocations" tab.',
          '2. Click "+ Allocate Student".',
          '3. Select Student, Hostel, and Room.',
          '4. Enter Check-In Date.',
          '5. Click "Allocate". The room occupancy updates automatically.',
          '',
          'The Occupancy Report shows: Hostel name, capacity, occupied beds, and available beds.',
        ],
      },
      {
        title: 'Canteen Management',
        content: [
          'The canteen uses a pre-paid wallet system. Students must have a balance to buy food.',
          '',
          '1. Go to Welfare → Canteen in the sidebar.',
          '2. Under "Menu Items", click "+ Add Item".',
          '3. Enter: Item Name, Price, Category (Breakfast/Lunch/Snack/Beverage).',
          '',
          'Topping Up a Student\'s Canteen Balance:',
          '1. Go to the "Top-Up" tab.',
          '2. Search for a student by name.',
          '3. Enter the amount and payment method.',
          '4. Click "Top Up". The student\'s wallet is credited immediately.',
          '',
          'Viewing Canteen Transactions:',
          '• Go to the "Transactions" tab to see all purchases and top-ups.',
          '• Filter by student, date, or item.',
          '• Students can view their own canteen balance from the Welfare → Canteen Balance page.',
        ],
      },
    ],
  },
  {
    chapter: '18. Payroll Management',
    sections: [
      {
        title: 'Setting Up Staff Payroll',
        content: [
          '1. Go to Finance → Payroll in the sidebar.',
          '2. Click "+ Add Staff Salary".',
          '3. Select the Staff member (teacher or non-teaching staff).',
          '4. Enter:',
          '   – Basic Salary (monthly gross)',
          '   – Allowances: House, Transport, Medical (add as many as needed)',
          '   – Deductions: NSSF, NHIF, PAYE, Loan, other',
          '5. Click "Save Salary Structure".',
          '',
          'TIP: NSSF/NHIF/PAYE are required statutory deductions in Kenya.',
          'TIP: Set up salary structures for all staff before running payroll.',
        ],
      },
      {
        title: 'Running Monthly Payroll',
        content: [
          '1. Go to Finance → Payroll.',
          '2. Click "Run Payroll for [Month]".',
          '3. Select the month and year.',
          '4. Review the payroll summary — total gross, deductions, and net pay.',
          '5. Click "Confirm & Run".',
          '',
          'After running payroll:',
          '• Each staff member\'s payslip is generated automatically.',
          '• Staff can download their payslip from Finance → My Payslips.',
          '• Download the payroll summary for your finance records.',
          '',
          'TIP: Always review the payroll summary before confirming — changes after',
          '     processing require a manual adjustment entry.',
        ],
      },
    ],
  },
  {
    chapter: '19. Appraisals & Substitutes',
    sections: [
      {
        title: 'Creating Teacher Appraisals',
        content: [
          '1. Go to Welfare → Appraisals in the sidebar.',
          '2. Click "+ New Appraisal".',
          '3. Select: Teacher, Appraisal Period (Term/Year), Academic Year.',
          '4. Rate each criterion on the scale configured for your school.',
          '5. Add written comments and overall observations.',
          '6. Click "Save". The teacher can view their appraisal from My Appraisal.',
          '7. Click "Finalise" to lock the appraisal for the record.',
          '',
          'TIP: Conduct appraisals at the end of each term for best results.',
          'TIP: Discuss the appraisal results with the teacher in a face-to-face meeting.',
        ],
      },
      {
        title: 'Assigning Substitute Teachers',
        content: [
          '1. Go to Welfare → Substitutes in the sidebar.',
          '2. Click "+ Assign Substitute".',
          '3. Select: Date, Absent Teacher, Class, Subject, Substitute Teacher.',
          '4. Add any notes for the substitute.',
          '5. Click "Save".',
          '',
          'The substitute teacher sees the assignment on their dashboard on that day.',
          'Substitute records are kept for administrative records and appraisal purposes.',
        ],
      },
    ],
  },
  {
    chapter: '20. Counseling',
    sections: [
      {
        title: 'Recording Counseling Sessions',
        content: [
          '1. Go to Welfare → Counseling in the sidebar.',
          '2. Click "+ New Session".',
          '3. Select: Student, Session Type (Academic / Behavioural / Personal / Career).',
          '4. Enter: Session Date, Duration, Counselor Name.',
          '5. Add detailed session notes (these are kept confidential).',
          '6. Set follow-up date if needed.',
          '7. Click "Save Session".',
          '',
          'NOTE: Counseling records are confidential. Only the admin and assigned',
          '      counselor can view session notes.',
          'TIP: Use the Career session type for JSS Grade 7–9 career guidance discussions.',
        ],
      },
      {
        title: 'Viewing Counseling History',
        content: [
          '1. Go to Welfare → Counseling.',
          '2. Use the search/filter to find a student\'s records.',
          '3. Click on a session to view the full notes.',
          '4. Sessions are sorted by date, most recent first.',
          '5. The statistics panel shows total sessions, average duration, and top concerns.',
        ],
      },
    ],
  },
  {
    chapter: '21. Bursary & Inventory',
    sections: [
      {
        title: 'Managing Bursary Awards',
        content: [
          '1. Go to Finance → Bursary in the sidebar.',
          '2. Click "+ Create Bursary Programme".',
          '3. Enter Programme Name, Sponsor, Total Budget.',
          '4. To award bursary to a student:',
          '   – Click "+ Award Bursary".',
          '   – Select Student, Programme, Amount.',
          '   – Enter criteria/reason for the award.',
          '   – Click "Award".',
          '5. The bursary amount is reflected on the student\'s fee account.',
          '6. View all beneficiaries and amounts paid under the programme.',
          'TIP: Use bursary for CDF, County Government, NGO, or school fund awards.',
        ],
      },
      {
        title: 'Inventory Management',
        content: [
          '1. Go to Finance → Inventory in the sidebar.',
          '2. Click "+ Add Item" to create an inventory record.',
          '3. Enter: Item Name, Category, Unit, Reorder Level.',
          '4. To add stock: click "Stock In" and enter quantity and date.',
          '5. To remove stock: click "Stock Out" and enter quantity and reason.',
          '',
          'Low-stock alerts appear when stock falls below the reorder level.',
          'Go to the "Low Stock" tab to see all items needing restocking.',
          'TIP: Use Inventory for stationery, cleaning supplies, lab items, and textbooks.',
          'TIP: Link Purchase Orders (Finance → Vendors & POs) to inventory receipts.',
        ],
      },
    ],
  },
  {
    chapter: '22. NEMIS Export',
    sections: [
      {
        title: 'Validating Student Data for NEMIS',
        content: [
          'NEMIS (National Education Management Information System) is the Kenya government',
          'database for tracking all enrolled learners. You must export student data periodically.',
          '',
          '1. Go to Account → NEMIS Export in the sidebar.',
          '2. Click "Run Validation" to check all student records.',
          '3. The validation report shows:',
          '   – Total students checked.',
          '   – Complete records (green) — ready for export.',
          '   – Incomplete records (amber) — missing required fields.',
          '4. Click on any student with issues to see which fields are missing.',
          '5. Go to People → Students to update the missing information.',
          '6. Re-run validation until all records are complete.',
          '',
          'Required NEMIS fields: First Name, Last Name, Date of Birth, Gender, NEMIS Number,',
          'Class/Grade, and Nationality.',
        ],
      },
      {
        title: 'Exporting NEMIS Data',
        content: [
          '1. After validation is complete (no issues), click "Export NEMIS Data".',
          '2. Choose the format: CSV or Excel.',
          '3. The file downloads to your device.',
          '4. Upload the file to the Kenya NEMIS portal: nemis.education.go.ke.',
          '',
          'TIP: Export at least once per term or as required by the Ministry of Education.',
          'TIP: If a student does not have a NEMIS number, contact your Sub-County',
          '     Education Office to have one assigned.',
        ],
      },
    ],
  },
  {
    chapter: '23. Audit Log',
    sections: [
      {
        title: 'Viewing the Audit Log',
        content: [
          'The Audit Log records every significant action taken in the system.',
          '1. Go to Account → Audit Log in the sidebar.',
          '2. The log shows: Timestamp, User, Role, Action, Resource, Resource ID, IP Address.',
          '',
          'Filtering logs:',
          '• Action: filter by action type (e.g. create_student, update_fee, delete_user)',
          '• From Date / To Date: narrow to a specific time range.',
          '• Search User: type a name or email to filter by user.',
          '',
          '3. Click "Export CSV" to download the filtered log for offline analysis.',
          '',
          'Summary metrics at the top:',
          '• Actions Today: number of system actions taken today.',
          '• Most Active User: user with most actions today.',
          '• Most Common Action: the action type performed most often.',
        ],
      },
      {
        title: 'Understanding Audit Actions',
        content: [
          'Actions are automatically logged for all mutations (create/update/delete):',
          '',
          '  login / logout      — user sign-in and sign-out events',
          '  create_student      — new student enrolled',
          '  update_student      — student record edited',
          '  delete_student      — student deleted',
          '  create_fee          — fee invoice generated',
          '  update_fee          — payment recorded',
          '  create_exam         — new exam created',
          '  create_discipline   — discipline incident logged',
          '  create_user         — new user account created',
          '  update_user         — user role or details changed',
          '  … and all other modules follow the same pattern.',
          '',
          'NOTE: Read operations (viewing pages) are not logged to keep the log concise.',
          'TIP: Use the audit log to investigate unauthorised changes or resolve disputes.',
        ],
      },
    ],
  },
  {
    chapter: '24. Procurement Module',
    sections: [
      {
        title: 'Procurement Dashboard Overview',
        content: [
          'Go to Procurement in the sidebar. The dashboard shows:',
          '• Total active suppliers, open requisitions, pending POs, and overdue invoices.',
          '• Procurement pipeline summary: PR → RFQ → Quotation → PO → GRN → Invoice → Payment.',
          '• Recent activity feed and budget utilisation chart.',
          '',
          'TIP: The entire procurement lifecycle follows Kenya public procurement best practices:',
          '     three-quote rule, approval workflows, and 3-way matching (PO ↔ GRN ↔ Invoice).',
        ],
      },
      {
        title: 'Supplier Management',
        content: [
          '1. Go to Procurement → Suppliers.',
          '2. Click "+ Add Supplier". Enter: Company Name, Contact Person, Phone, Email, Address.',
          '3. Select the supply Category (Stationery, IT, Construction, Catering, etc.).',
          '4. Click "Save".',
          '',
          'Prequalification:',
          '1. Click on a supplier row, then click "Prequalify".',
          '2. Enter: Registration Number, KRA PIN, Tax Compliance status, Expiry Date, Score (0–100).',
          '3. Set status to "Approved", "Pending", or "Rejected".',
          '4. Click "Save Prequalification".',
          '',
          'TIP: Only prequalified (approved) suppliers can receive RFQs and be awarded contracts.',
          'TIP: Review prequalification status annually or when tax compliance certificates expire.',
        ],
      },
      {
        title: 'Purchase Requisitions (PR)',
        content: [
          'A Purchase Requisition is the first step — any staff member can initiate a request.',
          '',
          '1. Go to Procurement → Requisitions.',
          '2. Click "+ New Requisition".',
          '3. Fill in: Title, Description, Required Date, Department, Budget Code.',
          '4. Add line items: Description, Quantity, Unit, Estimated Unit Cost.',
          '5. Click "Save as Draft".',
          '',
          'Submitting for approval:',
          '1. Open the draft PR and click "Submit for Approval".',
          '2. The system automatically routes to the approver.',
          '3. As admin, go to the PR and click "Approve" or "Reject" with comments.',
          '',
          'PR statuses: Draft → Submitted → Approved → PO Created → Completed / Rejected.',
          'Auto-numbering: PRs are numbered PR-000001, PR-000002, etc.',
          'TIP: Rejected PRs can be edited and resubmitted after the requester addresses comments.',
        ],
      },
      {
        title: 'Request for Quotation (RFQ)',
        content: [
          'After a PR is approved, create an RFQ to collect supplier quotes.',
          '',
          '1. Go to Procurement → RFQs → click "+ New RFQ".',
          '2. Link it to an approved PR (select from dropdown).',
          '3. Enter: Title, Deadline Date, Terms and Conditions, Delivery Requirements.',
          '4. Select at least 3 suppliers from the prequalified list.',
          '5. Click "Save". Status = Draft.',
          '',
          'Publishing:',
          '1. Click "Publish RFQ". Status changes to "Open" — suppliers are notified.',
          '2. When the deadline passes (or you are ready), click "Close RFQ".',
          '',
          'Auto-numbering: RFQs are numbered RFQ-000001, RFQ-000002, etc.',
          'NOTE: Kenya procurement rules require at least 3 competing quotations for most purchases.',
          'TIP: Always set a realistic deadline — at least 7 days for standard supplies.',
        ],
      },
      {
        title: 'Quotation Evaluation',
        content: [
          '1. Go to Procurement → Quotations.',
          '2. Quotations received from suppliers are listed against each RFQ.',
          '3. For each quotation, view: Supplier, Line Items, Unit Prices, Total Amount.',
          '4. To evaluate: open the quotation and compare prices across all bids.',
          '5. Click "Recommend" on the best-value quotation.',
          '',
          'Creating a quotation (entering supplier responses):',
          '1. Click "+ Add Quotation".',
          '2. Select: RFQ, Supplier, Validity Period, Payment Terms.',
          '3. Add the supplier\'s item prices matching the RFQ line items.',
          '4. Click "Save".',
          '',
          'TIP: Award based on Value for Money (price + quality + delivery), not lowest price alone.',
          'TIP: Document your evaluation rationale in the comments field for audit purposes.',
        ],
      },
      {
        title: 'Purchase Orders (PO)',
        content: [
          'A PO is a formal commitment to a supplier after quotation evaluation.',
          '',
          '1. Go to Procurement → Purchase Orders → click "+ New PO".',
          '2. Select the approved PR and the recommended supplier.',
          '3. Enter: Delivery Date, Delivery Address, Payment Terms, Special Instructions.',
          '4. Line items are auto-populated from the quotation (editable).',
          '5. Click "Save". Status = Draft.',
          '',
          'Approval and sending:',
          '1. Click "Approve PO" to authorise the purchase.',
          '2. Click "Send to Supplier" — status changes to "Sent".',
          '3. Once goods are received, create a GRN (see next section).',
          '',
          'PO statuses: Draft → Approved → Sent → Partially Delivered → Completed / Cancelled.',
          'Auto-numbering: POs are numbered PO-000001, PO-000002, etc.',
          'TIP: Never pay an invoice without a matching PO — this protects against unauthorised spending.',
        ],
      },
      {
        title: 'Goods Receipt Notes (GRN)',
        content: [
          'A GRN records what was actually received from the supplier.',
          '',
          '1. Go to Procurement → GRN → click "+ New GRN".',
          '2. Select the relevant PO from the dropdown.',
          '3. Enter: Received Date, Condition (Good / Damaged), Notes.',
          '4. For each line item, enter the Quantity Received.',
          '5. Click "Save GRN".',
          '',
          'The system automatically updates the PO status:',
          '   – If all items received → PO status: Completed',
          '   – If partial items received → PO status: Partially Delivered',
          '',
          'Auto-numbering: GRNs are numbered GRN-000001, GRN-000002, etc.',
          'TIP: Create the GRN on the day goods are received — do not delay.',
          'WARNING: Do not receive goods without a matching PO. Unapproved receipts will flag in audit.',
        ],
      },
      {
        title: 'Supplier Invoices',
        content: [
          '1. Go to Procurement → Invoices → click "+ New Invoice".',
          '2. Select the related GRN or PO.',
          '3. Enter: Invoice Number (from supplier), Invoice Date, Due Date.',
          '4. Verify line items and amounts match the GRN and PO (3-way match).',
          '5. Click "Save".',
          '',
          'Approval:',
          '1. Review the invoice for accuracy.',
          '2. Click "Approve Invoice" to authorise payment.',
          '3. To reject: click "Reject Invoice" and add a reason.',
          '',
          'Invoice statuses: Pending → Approved → Partially Paid → Paid / Rejected.',
          'TIP: Reject invoices that do not match the GRN quantities or agreed prices.',
          'TIP: The system tracks paid amount, balance, and due dates automatically.',
        ],
      },
      {
        title: 'Supplier Payments',
        content: [
          '1. Go to Procurement → Payments → click "+ New Payment".',
          '2. Select the approved Invoice.',
          '3. Enter: Payment Date, Amount, Payment Method (Bank Transfer, Cheque, M-Pesa).',
          '4. Enter Reference Number (bank reference or cheque number).',
          '5. Click "Save". Status = Pending Approval.',
          '',
          'Approving payment:',
          '1. Open the payment record and click "Approve Payment".',
          '2. The invoice\'s paid_amount and balance update automatically.',
          '3. If balance reaches zero, the invoice status becomes "Paid".',
          '',
          'TIP: Always record the payment reference number for reconciliation.',
          'TIP: For M-Pesa payments, use the Mpesa transaction confirmation code as the reference.',
        ],
      },
      {
        title: 'Contracts',
        content: [
          '1. Go to Procurement → Contracts → click "+ New Contract".',
          '2. Enter: Contract Title, Supplier, Contract Number, Start Date, End Date.',
          '3. Enter: Contract Value, Payment Schedule, Scope of Work.',
          '4. Click "Save".',
          '',
          'Managing contracts:',
          '• Edit contract details before the start date.',
          '• The system highlights contracts expiring within 30 days.',
          '• Contracts can be extended: edit the End Date and save.',
          '',
          'Auto-numbering: Contracts are numbered CON-000001, CON-000002, etc.',
          'TIP: Enter long-term service contracts (cleaning, security, catering) here.',
          'TIP: Review all active contracts at the start of each academic year.',
        ],
      },
      {
        title: 'Procurement Budgets & Annual Plans',
        content: [
          'Budgets:',
          '1. Go to Procurement → Planning → Budgets tab.',
          '2. Click "+ New Budget". Enter: Category, Allocated Amount, Financial Year, Term.',
          '3. Click "Save". The system tracks spent vs. allocated for each category.',
          '',
          'Annual Procurement Plans:',
          '1. Click the "Plans" tab.',
          '2. Click "+ New Plan". Enter: Title, Financial Year, Description.',
          '3. Add planned procurement items with estimated values.',
          '4. Use the plan to guide PRs throughout the year.',
          '',
          'TIP: Create your Annual Procurement Plan at the start of each academic year.',
          'TIP: Budget utilisation is visible on the Procurement Dashboard.',
          'WARNING: Raise a PR only for items included in the approved Annual Plan (for audit compliance).',
        ],
      },
      {
        title: 'Asset Management',
        content: [
          '1. Go to Procurement → Asset Management.',
          '2. Click "+ Add Asset".',
          '3. Enter: Asset Name, Category, Serial Number, Purchase Date, Cost, Supplier, Location.',
          '4. Click "Save". The system auto-generates an Asset Number (AST-000001).',
          '',
          'Recording depreciation:',
          '1. Open an asset and enter the Annual Depreciation Rate.',
          '2. The current book value is calculated automatically.',
          '',
          'Disposal:',
          '1. Open the asset, click "Mark as Disposed".',
          '2. Enter: Disposal Date, Disposal Method (Sold / Scrapped / Donated), Proceeds (if any).',
          '',
          'Categories: Computers & IT, Furniture, Vehicles, Lab Equipment, Office Equipment, Other.',
          'TIP: Link assets to the PO that acquired them for full traceability.',
          'TIP: Review the asset register annually and reconcile with physical verification.',
        ],
      },
      {
        title: 'Procurement Reports & Audit Trail',
        content: [
          'Reports:',
          '1. Go to Procurement → Reports.',
          '2. Filter by: Date Range, Supplier, Category, Status.',
          '3. Summary cards show: Total PRs, Total PO Value, Paid Invoices, Outstanding Invoices.',
          '4. Supplier spend analysis table shows spend per supplier for the period.',
          '5. Click "Export CSV" to download for board reporting.',
          '',
          'Audit Trail:',
          '1. Go to Procurement → Audit Trail.',
          '2. Every procurement action is logged: User, Action, Module, Record ID, Timestamp, IP.',
          '3. Filter by: User, Action Type, Date Range.',
          '4. Click "Export CSV" to download the audit log.',
          '',
          'TIP: Run the Procurement Report at the end of each term for the Finance Committee.',
          'TIP: The Audit Trail is immutable — no user can delete entries.',
          'NOTE: The audit trail captures: create, update, approve, reject, and payment events.',
        ],
      },
    ],
  },
  {
    chapter: '25. Online Admissions',
    sections: [
      {
        title: 'Sharing Your Application Link',
        content: [
          '1. Go to Settings → General, or People → Admissions → Settings.',
          '2. Your school\'s unique public application link is shown next to your School Code',
          '   (e.g. skulmanager.com/apply/YOURCODE) with a copy button.',
          '3. Share this link on your website, social media, or via SMS/WhatsApp — anyone who',
          '   applies through it is added straight to your Admissions → Applications list.',
          '4. In Admissions → Settings, set the application fee amount and toggle admissions',
          '   open/closed for the current intake.',
          '',
          'TIP: A superadmin can also copy every school\'s application link from the Tenants list.',
        ],
      },
      {
        title: 'Reviewing Applications',
        content: [
          '1. Go to People → Admissions → Applications.',
          '2. Filter by status: Submitted, Document Review, Interview Scheduled, Offered, Rejected, Enrolled.',
          '3. Click an application to view the applicant, guardian details, and any uploaded',
          '   documents (birth certificate, KCPE results, passport photo, report form, medical form).',
          '4. Click "Verify Documents" once you\'ve checked the uploads.',
          '5. Click "Schedule Interview" and enter the date, time, and venue.',
          '6. After the interview, click "Record Interview Outcome" and add notes.',
          '7. Click "Offer" or "Reject" with optional notes for the family.',
          '8. Once offered, select a class from the dropdown and click "Enroll Student" — this',
          '   creates the real student record, ready for the class register and fee invoicing.',
          '',
          'TIP: Applicants can track their own status any time using their application number',
          '     on your school\'s application link.',
        ],
      },
      {
        title: 'Adding a Walk-in or Phoned-in Application',
        content: [
          '1. Go to People → Admissions → Applications.',
          '2. Click "Add Application" — use this for a family who visited or called in rather',
          '   than applying online themselves.',
          '3. Fill in the applicant and guardian details and click "Save".',
          '4. The application then follows the exact same review pipeline as an online one.',
        ],
      },
    ],
  },
  {
    chapter: '26. Alumni Management',
    sections: [
      {
        title: 'Building the Alumni Directory',
        content: [
          '1. Go to People → Alumni.',
          '2. To convert a current student who has graduated, click "Convert Student", select',
          '   the student and graduation year.',
          '3. To add a graduate who was never in the system, click "Add Legacy Alumni" and',
          '   fill in their name, email, graduation year, occupation, employer and university.',
          '4. Alumni can log in and complete their own profile, mark themselves as a mentor,',
          '   and control whether they appear in the public directory.',
        ],
      },
      {
        title: 'Events, Donations & the Job Board',
        content: [
          '1. Events tab: click "New Event" to create a reunion, fundraiser or networking event.',
          '   Alumni register themselves; mark attendance from the event\'s registration list.',
          '2. Donations tab: click "Record Donation" to log a donation on an alumnus\'s behalf —',
          '   useful for cash/cheque gifts received directly or pledges phoned in. Choose the',
          '   donor, type, amount, and whether it\'s already received or still pledged. Alumni can',
          '   also pledge donations themselves (with M-Pesa for cash gifts) from their own portal.',
          '3. Jobs tab: click "Post a Job" to list an opportunity on behalf of a partner employer.',
          '   Alumni can also post jobs themselves for the network to see.',
          '',
          'TIP: The Donations tab shows a running total by donation type for reporting to the board.',
        ],
      },
    ],
  },
];

const TEACHER_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your browser.',
          '2. Enter your school-issued email and password.',
          '3. Click "Sign In". You will land on the Teacher Dashboard.',
          '4. Use "Forgot Password?" if you need to reset your password.',
        ],
      },
      {
        title: 'Your Dashboard Overview',
        content: [
          'Your dashboard shows:',
          '• My Classes – number of classes you teach.',
          '• Total Students – total students across all your classes.',
          '• Assignments – number of assignments you have created.',
          '• Today\'s Classes – your schedule for today.',
          'Quick Actions: Mark Attendance | Grade Book | Assignments | Messages.',
        ],
      },
    ],
  },
  {
    chapter: '2. My Classes',
    sections: [
      {
        title: 'Viewing Your Classes',
        content: [
          '1. Click "My Classes" in the sidebar under Academic.',
          '2. You will see all classes assigned to you.',
          '3. Click on a class to see the student roster, class details, and performance summary.',
        ],
      },
    ],
  },
  {
    chapter: '3. Marking Attendance',
    sections: [
      {
        title: 'How to Mark Attendance',
        content: [
          '1. Go to Academic → Attendance in the sidebar.',
          '2. Select your Class and today\'s Date.',
          '3. For each student, click: Present, Absent, or Late.',
          '4. Click "Submit Attendance". The admin and parent are notified for absences.',
          'TIP: Mark attendance at the start of each lesson for accuracy.',
          'TIP: Attendance must be submitted before 10:00 AM each day as per school policy.',
        ],
      },
    ],
  },
  {
    chapter: '4. Grade Book',
    sections: [
      {
        title: 'Entering Student Grades',
        content: [
          '1. Go to Academic → Grade Book in the sidebar.',
          '2. Select the Class and Learning Area.',
          '3. Click the assessment column or "Add Assessment".',
          '4. Enter the student\'s score. The CBE grade is calculated automatically:',
          '   – EE: 80%+ | ME: 60–79% | AE: 40–59% | BE: below 40%',
          '5. Click "Save". Grades are immediately visible to students.',
        ],
      },
    ],
  },
  {
    chapter: '5. CBE Assessments (SBA)',
    sections: [
      {
        title: 'Recording a CBE Assessment',
        content: [
          '1. Go to "CBE Assessments" in the sidebar.',
          '2. Click "+ Record Assessment".',
          '3. Fill in the form:',
          '   – Class → Student → Subject',
          '   – Assessment Type: Formative / Summative / Project / Portfolio / Observation',
          '   – Exam Period: choose Mid-Term or End-Term (or leave as General)',
          '   – Term (1 / 2 / 3) and Academic Year',
          '   – Special Status: select WD (Withheld Result) or Y (Missed Exam) if needed',
          '   – Score and Max Score (not required when using WD or Y)',
          '4. Teacher Comments are auto-suggested based on the grade:',
          '   EE → "EXCELLENT" | ME → "GOOD" | AE → "Can do better" | BE → "Put More Effort"',
          '   You can edit the comment at any time.',
          '5. Click "Save Assessment".',
        ],
      },
      {
        title: 'Editing or Deleting an Assessment',
        content: [
          '1. Go to "CBE Assessments" in the sidebar.',
          '2. Use the filters (Class, Subject, Term) to find the record.',
          '3. To EDIT: click the pencil icon on the row.',
          '   – Change score, max score, exam period, special status (WD/Y), or comments.',
          '   – Press the green ✓ tick to save changes.',
          '4. To DELETE: click the red trash icon. Confirm the popup.',
          'NOTE: Only delete records that were entered in error.',
        ],
      },
      {
        title: 'Downloading Assessment Results',
        content: [
          '1. Go to "CBE Assessments" in the sidebar.',
          '2. Set your filters (Class, Subject, Term, Year) to get the records you need.',
          '3. Click "Download CSV" at the top right.',
          '4. A spreadsheet file is saved to your device.',
          '5. Open it in Excel to share with parents or print for records.',
        ],
      },
      {
        title: 'Understanding Grade Codes',
        content: [
          'Standard CBE (Grade 1–6, Senior Secondary Grade 10–12):',
          '   EE – Exceeding Expectations (80%+)     → EXCELLENT',
          '   ME – Meeting Expectations (60–79%)     → GOOD',
          '   AE – Approaching Expectations (40–59%) → Can do better',
          '   BE – Below Expectations (below 40%)    → Put More Effort',
          '',
          'Junior Secondary (Grade 7–9) — Kenya 2025 KJSEA 8-Level System:',
          '   EE1 – Exceeding Expectations Level 1 (90–100%)  8 points → EXCELLENT',
          '   EE2 – Exceeding Expectations Level 2 (75–89%)   7 points → EXCELLENT',
          '   ME1 – Meeting Expectations Level 1 (58–74%)     6 points → GOOD',
          '   ME2 – Meeting Expectations Level 2 (41–57%)     5 points → GOOD',
          '   AE1 – Approaching Expectations Level 1 (31–40%) 4 points → Can do better',
          '   AE2 – Approaching Expectations Level 2 (21–30%) 3 points → Can do better',
          '   BE1 – Below Expectations Level 1 (11–20%)       2 points → Put More Effort',
          '   BE2 – Below Expectations Level 2 (1–10%)        1 point  → Put More Effort',
          'NOTE: Select "Junior Secondary (Grade 7–9)" as Education Level when recording',
          'JSS assessments. The system will automatically assign the correct sub-level grade',
          'and grade points (1–8). Grade points appear in a purple badge in the Pts column',
          'and are included in CSV exports and on printed report forms.',
          '',
          'Pre-Primary (PP1, PP2, Playgroup):',
          '   WD – Well Developed (75%+)',
          '   D  – Developing (40–74%)',
          '   B  – Beginning (below 40%)',
          '',
          'Special Result Codes:',
          '   WD – Withheld Result (use when result cannot be released)',
          '   Y  – Missed Exam (student was absent for the assessment)',
        ],
      },
    ],
  },
  {
    chapter: '6. Schemes of Work',
    sections: [
      {
        title: 'Creating a Scheme of Work',
        content: [
          '1. Go to Academic → "Schemes of Work" tab.',
          '2. Click "+ New Scheme".',
          '3. Select: Class, Learning Area, Term, Year.',
          '4. Add weekly entries: Week Number, Topic, Objectives, Teaching Methods, Resources, Activities.',
          '5. Save as Draft. When complete, click "Submit for Approval" for the admin to review.',
        ],
      },
    ],
  },
  {
    chapter: '7. Lesson Plans',
    sections: [
      {
        title: 'Creating a Lesson Plan',
        content: [
          '1. Go to Academic → "Lesson Plans" tab.',
          '2. Click "+ New Lesson Plan".',
          '3. Fill in: Date, Class, Learning Area, Topic, Duration.',
          '4. Enter: Specific Learning Objectives, Key Questions, Teaching Methods, Learning Activities.',
          '5. Add Resources and Assessment method.',
          '6. Click "Save". Submit for approval when ready.',
        ],
      },
    ],
  },
  {
    chapter: '8. Assignments',
    sections: [
      {
        title: 'Creating an Assignment',
        content: [
          '1. Go to Schedule → Assignments in the sidebar.',
          '2. Click "+ New Assignment".',
          '3. Enter: Title, Class, Subject, Instructions, Due Date, Max Score.',
          '4. Click "Create". Students will see the assignment on their dashboard.',
        ],
      },
      {
        title: 'Grading Submissions',
        content: [
          '1. Go to Assignments.',
          '2. Click on an assignment to see submissions.',
          '3. Click "Grade" next to a student\'s submission.',
          '4. Enter the score and any feedback comments.',
          '5. Click "Save Grade". The student is notified.',
        ],
      },
    ],
  },
  {
    chapter: '9. Projects',
    sections: [
      {
        title: 'Setting Up a Project',
        content: [
          '1. Go to Academic → "Projects" tab.',
          '2. Click "+ New Project" and enter: Title, Description, Class, Type (Individual/Group).',
          '3. Add milestones with due dates.',
          '4. For group projects, create groups and assign students.',
          '5. Students submit through their portal; you review and grade from the Projects tab.',
        ],
      },
    ],
  },
  {
    chapter: '10. Values & Life Skills',
    sections: [
      {
        title: 'Recording Life Skills Assessments',
        content: [
          '1. Go to Academic → "Values & Life Skills" tab.',
          '2. Select your class.',
          '3. For each student, rate the CBE core values and competencies.',
          '4. Click "Save Assessment".',
          'Core Values: Integrity, Respect, Responsibility, Love, Unity, Peace, Patriotism, Ubuntu.',
          'Competencies: Communication, Critical Thinking, Creativity, Collaboration, Digital Literacy.',
        ],
      },
    ],
  },
  {
    chapter: '11. My Timetable',
    sections: [
      {
        title: 'Viewing Your Timetable',
        content: [
          '1. Go to Schedule → My Timetable in the sidebar.',
          '2. You will see your weekly teaching schedule.',
          '3. Click on any lesson slot for details: room, class, time.',
          'TIP: Your today\'s classes are also visible on your Dashboard.',
        ],
      },
      {
        title: 'Class-Time Alerts',
        content: [
          'Your Dashboard shows a live banner for your current or next lesson:',
          '  • A green "Now teaching" banner while a period is in progress, showing the',
          '    subject, class and room.',
          '  • An amber "Starting in N minutes" banner in the 15 minutes before your next',
          '    lesson begins.',
          'You will also receive an SMS reminder about 5 minutes before each period starts,',
          'sent to the phone number on your staff profile.',
        ],
      },
    ],
  },
  {
    chapter: '12. Messages & Communication',
    sections: [
      {
        title: 'Sending & Receiving Messages',
        content: [
          '1. Go to Messages in the sidebar.',
          '2. Click "+ New Message".',
          '3. Select recipients: individual students, parents, or the admin.',
          '4. Type your message and click "Send".',
          '5. Received messages appear in your inbox automatically.',
        ],
      },
    ],
  },
  {
    chapter: '13. Library Access',
    sections: [
      {
        title: 'Browsing the Library Catalog',
        content: [
          '1. Go to Library → Catalog in the sidebar.',
          '2. Search by title, author, or category.',
          '3. Check the "Available Copies" column to confirm availability.',
          'Note: Book borrowing requests are submitted through the library desk.',
        ],
      },
    ],
  },
  {
    chapter: '14. Leave & Permission Requests',
    sections: [
      {
        title: 'Submitting a Leave Request',
        content: [
          '1. Go to Welfare → Staff Leave in the sidebar.',
          '2. Click "+ New Request".',
          '3. Select the Leave Type:',
          '   Annual | Sick | Maternity | Paternity | Compassionate | Permission/Half-day | Unpaid | Other',
          '4. Enter Start Date and End Date.',
          '5. Type a Reason in the text box (be clear and specific).',
          '6. Click "Submit Request".',
          'Your request is sent to the Admin for review. You will see the status update here.',
        ],
      },
      {
        title: 'Checking Your Request Status',
        content: [
          '1. Go to Welfare → Staff Leave.',
          '2. Your requests are listed with the current status:',
          '   – Pending (yellow) – waiting for admin review',
          '   – Approved (green) – your leave is confirmed',
          '   – Rejected (red) – see the reviewer comment for the reason',
          '   – Cancelled (grey) – you cancelled it',
          '3. Use the filter buttons at the top to view by status.',
          'TIP: If urgent, contact the admin directly after submitting.',
        ],
      },
      {
        title: 'Cancelling a Request',
        content: [
          '1. Go to Welfare → Staff Leave.',
          '2. Find a request with status "Pending".',
          '3. Click "Cancel" on that row.',
          'NOTE: You can only cancel requests that have not yet been reviewed.',
        ],
      },
    ],
  },
  {
    chapter: '15. IGCSE Mark Entry (Cambridge International)',
    sections: [
      {
        title: 'About the IGCSE Module',
        content: [
          'If your school offers Cambridge IGCSE subjects, you can enter marks and view',
          'results using the IGCSE module at Academic → IGCSE in the sidebar.',
          '',
          'As a teacher you can:',
          '  • Load a mark entry sheet for any syllabus and session you are assigned to',
          '  • Enter raw scores for each component (Paper 1, Paper 2, Coursework, etc.)',
          '  • Save marks for individual cells or in bulk',
          '  • Trigger grade calculation to see weighted scores and A*–G grades',
          '  • View individual student results per subject',
          '',
          'NOTE: Subjects, syllabi, components, and student enrollments are set up by the admin.',
          '      Contact your school admin if a student or subject is missing from your sheet.',
        ],
      },
      {
        title: 'Entering Marks for a Class',
        content: [
          '1. Go to Academic → IGCSE in the sidebar.',
          '2. Click the "Mark Entry" tab.',
          '3. Select the Syllabus (e.g. "Mathematics (0580)") from the first dropdown.',
          '4. Select the Exam Session (e.g. "May/June 2026") from the second dropdown.',
          '5. Click "Load Sheet".',
          '',
          'The mark sheet loads with:',
          '  – One row per enrolled student in your class',
          '  – One column per assessment component',
          '  – The column header shows the component name, max marks (e.g. /80), and weight (%)',
          '',
          'To enter a mark:',
          '  – Click a cell and type the score.',
          '  – Do not exceed the max marks shown in the header.',
          '  – Cells with unsaved changes turn blue.',
          '  – Leave a cell empty if the student has not yet sat that component.',
          '',
          'To save:',
          '  – Click "Save Marks". Only changed cells are saved.',
          '  – A confirmation message appears at the top.',
          '',
          'TIP: Enter marks for ALL components before asking the admin to calculate grades.',
          'TIP: You can reload the sheet at any time by clicking "Load Sheet" again.',
        ],
      },
      {
        title: 'Understanding Component Weights',
        content: [
          'IGCSE grades are calculated from weighted component scores:',
          '',
          '  Final Score = sum of (student score ÷ max marks × weight) per component',
          '',
          'Example — Cambridge Maths 0580 (Extended):',
          '  Paper 2 (Extended): student scores 65 out of 80. Weight = 30%.',
          '    Contribution = (65/80) × 30 = 24.4%',
          '  Paper 4 (Extended): student scores 110 out of 130. Weight = 70%.',
          '    Contribution = (110/130) × 70 = 59.2%',
          '  Final weighted score = 24.4 + 59.2 = 83.6% → Grade A',
          '',
          'The grade is then looked up against the grade boundaries configured by the admin.',
          'Boundary thresholds change every year — the admin updates them before each session.',
        ],
      },
      {
        title: 'Viewing IGCSE Results',
        content: [
          '1. Go to IGCSE → "Results" tab.',
          '2. Select a student from the dropdown.',
          '3. Optionally filter by exam session.',
          '4. Click "View Results".',
          '',
          'The results show a card per subject with:',
          '  – Subject name and Cambridge code',
          '  – Component scores: raw / max / % / weight',
          '  – Weighted final score',
          '  – Final grade (A*–G)',
          '',
          'TIP: Share results with students verbally during individual progress reviews.',
          'TIP: The admin can generate a formal Cambridge-style report card from the Reports tab.',
        ],
      },
    ],
  },
  {
    chapter: '16. Teacher Check-in',
    sections: [
      {
        title: 'Checking In Each Morning',
        content: [
          'Daily check-in records your attendance as a teacher. Use it every morning when you arrive.',
          '',
          '1. Go to your Teacher Dashboard.',
          '2. You will see a "Check In" widget at the top.',
          '3. Click "Check In Now".',
          '4. Your check-in time and date are recorded automatically.',
          '5. If your device has GPS enabled, your location is recorded as well.',
          '',
          'Your check-in status shows on the widget:',
          '  Green ✓ — Checked in today.',
          '  Amber ⚠ — Late check-in (arrived after school start time).',
          '  Red ✗  — Not yet checked in.',
          '',
          'TIP: Check in as soon as you arrive at school — do not wait until class starts.',
          'TIP: If you forget to check in, contact the admin to manually record your attendance.',
        ],
      },
      {
        title: 'Viewing Your Check-in History',
        content: [
          '1. Go to Welfare → Teacher Check-in in the sidebar.',
          '2. Your check-in history is shown with date, time, and status.',
          '3. Filter by date range to view a specific period.',
          '',
          'NOTE: The admin can also view all teacher check-in records from the',
          '      Teacher Check-in Admin Page for school-wide attendance tracking.',
        ],
      },
    ],
  },
];

const STUDENT_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your web browser.',
          '2. Enter your school email (given to you by the school) and your password.',
          '3. Click "Sign In". You will see your Student Dashboard.',
          '4. Click "Forgot Password?" if you need help resetting your password.',
          'TIP: Never share your password with friends.',
        ],
      },
      {
        title: 'Your Dashboard',
        content: [
          'Your dashboard shows important information at a glance:',
          '• Attendance % – how often you have been present in school.',
          '• Pending Assignments – assignments you need to submit.',
          '• Today\'s Classes – your lessons for today.',
          '• Fee Balance – how much school fee is still owed.',
          'Quick Access buttons take you to: My Attendance, My Results, My Fees, Messages.',
        ],
      },
    ],
  },
  {
    chapter: '2. My Courses',
    sections: [
      {
        title: 'Viewing Your Subjects',
        content: [
          '1. Click "My Courses" in the sidebar.',
          '2. You will see all subjects you are enrolled in for the current term.',
          '3. Click on a subject to view the course material, assessments, and your marks.',
        ],
      },
    ],
  },
  {
    chapter: '3. Assignments',
    sections: [
      {
        title: 'Viewing & Submitting Assignments',
        content: [
          '1. Click "Assignments" in the sidebar under Schedule.',
          '2. You will see all assignments set by your teachers.',
          '3. Assignments show: Subject, Title, Due Date, and Status.',
          '4. Overdue assignments are marked in red – submit them as soon as possible.',
          '5. Click on an assignment to read the instructions.',
          '6. Follow your teacher\'s instructions for submission (written or uploaded).',
          'TIP: Always check your assignments daily so you don\'t miss deadlines.',
        ],
      },
    ],
  },
  {
    chapter: '4. My Results',
    sections: [
      {
        title: 'Checking Your Grades',
        content: [
          '1. Click "My Results" in the sidebar.',
          '2. Select the Term to view results for that period.',
          '3. Your CBE grades are shown per subject:',
          '   – EE (Exceeding Expectations): 80%+  – Excellent!',
          '   – ME (Meeting Expectations): 60–79%  – Good',
          '   – AE (Approaching Expectations): 40–59%  – Needs improvement',
          '   – BE (Below Expectations): below 40%  – Please seek help',
          '4. Click on any subject to see the breakdown by assessment.',
          '5. Below your exam results, a "CBE Assessments" table shows every continuous/formative',
          '   assessment your teacher has recorded — subject, strand, term, score and grade —',
          '   as soon as it is saved, without waiting for a formal exam to be published.',
          'TIP: If you disagree with a grade, speak to your teacher respectfully.',
        ],
      },
    ],
  },
  {
    chapter: '5. My Attendance',
    sections: [
      {
        title: 'Viewing Your Attendance Record',
        content: [
          '1. Click "My Attendance" in the sidebar.',
          '2. You will see a calendar view showing days you were Present, Absent, or Late.',
          '3. Your overall attendance percentage is shown at the top.',
          'TIP: Aim to maintain above 90% attendance. Regular attendance improves your learning and grades.',
        ],
      },
    ],
  },
  {
    chapter: '6. My Timetable',
    sections: [
      {
        title: 'Checking Your Class Schedule',
        content: [
          '1. Click "My Timetable" in the sidebar under Schedule.',
          '2. Your weekly class schedule is displayed with times, subjects, and teacher names.',
          '3. Today\'s classes are also shown on your main Dashboard.',
          'TIP: Use the timetable to prepare your books and materials the night before.',
        ],
      },
    ],
  },
  {
    chapter: '7. My Fees',
    sections: [
      {
        title: 'Checking Your Fee Balance',
        content: [
          '1. Click "My Fees" in the sidebar.',
          '2. You will see your total fees, amount paid, and outstanding balance.',
          '3. A history of all payments is shown with dates and receipt numbers.',
          '4. Share payment details with your parent/guardian if there is an outstanding balance.',
          'TIP: Fees must be paid by the due date to avoid disruption to your studies.',
        ],
      },
    ],
  },
  {
    chapter: '8. Exams',
    sections: [
      {
        title: 'Viewing Upcoming Exams',
        content: [
          '1. Click "My Exams" in the sidebar.',
          '2. You will see all upcoming exams with dates, subjects, and duration.',
          '3. Prepare early by reviewing your class notes and past assessments.',
        ],
      },
      {
        title: 'Taking an Online Exam',
        content: [
          '1. When an online exam is available, it appears in My Exams.',
          '2. Click "Start Exam" at the designated time.',
          '3. Read each question carefully before answering.',
          '4. Click "Submit Exam" when done. You cannot re-take once submitted.',
          'TIP: Use a stable internet connection and a quiet space for online exams.',
        ],
      },
    ],
  },
  {
    chapter: '9. Library',
    sections: [
      {
        title: 'Finding a Book',
        content: [
          '1. Click "Library" → "Catalog" in the sidebar.',
          '2. Search by title, author, or subject.',
          '3. Check if copies are available.',
          '4. Visit the library desk to borrow the book.',
        ],
      },
      {
        title: 'My Borrowed Books',
        content: [
          '1. Click "My Books" in the sidebar.',
          '2. You will see all books you have borrowed, their due dates, and return status.',
          '3. Return books on time to avoid fines.',
          'TIP: Overdue books are highlighted in red.',
        ],
      },
    ],
  },
  {
    chapter: '10. Messages & Notifications',
    sections: [
      {
        title: 'Reading School Messages',
        content: [
          '1. Click "Messages" in the sidebar.',
          '2. You will see messages from teachers and the school admin.',
          '3. Click on a message to read the full content.',
        ],
      },
      {
        title: 'Viewing Notifications',
        content: [
          '1. Click the bell icon at the top right of the page.',
          '2. Notifications include: new assignments, grade updates, fee reminders, and announcements.',
          'TIP: Check your notifications every morning.',
        ],
      },
    ],
  },
  {
    chapter: '11. My Profile',
    sections: [
      {
        title: 'Updating Your Profile',
        content: [
          '1. Click "My Profile" in the sidebar under Account.',
          '2. You can update your profile photo and contact details.',
          '3. To change your password: enter your current password, then the new password twice.',
          '4. Click "Save". Always use a strong password.',
        ],
      },
    ],
  },
  {
    chapter: '11b. Learning Materials & Portfolio',
    sections: [
      {
        title: 'Accessing Learning Materials',
        content: [
          '1. Click "Learning Materials" in the sidebar under Academic.',
          '2. Browse resources uploaded by your teachers.',
          '3. Filter by: Subject, Type (PDF/Video/Link/Document), or search by title.',
          '4. Click "View" or "Download" to access the material.',
          '',
          'Public materials are visible to all students.',
          'Some materials may be class-specific — only students in that class can see them.',
          'TIP: Download study materials to your device to read offline.',
        ],
      },
      {
        title: 'My Portfolio',
        content: [
          'Your portfolio stores your best pieces of work for CBE assessment.',
          '',
          '1. Click "My Portfolio" in the sidebar.',
          '2. You can see all portfolio items submitted by your teachers.',
          '3. Each item has: Title, Subject, Date, and Description.',
          '4. Click on an item to view the details.',
          '',
          'TIP: Portfolios are used by teachers to record evidence of your learning.',
          '     They are reviewed during CBE report card generation.',
        ],
      },
    ],
  },
  {
    chapter: '11c. Canteen Balance',
    sections: [
      {
        title: 'Checking Your Canteen Balance',
        content: [
          'If your school uses a pre-paid canteen wallet:',
          '',
          '1. Click "Canteen Balance" in the sidebar under Welfare.',
          '2. You can see your current wallet balance.',
          '3. Transaction history shows each purchase with: item, price, date, and running balance.',
          '',
          'If your balance is low:',
          '• Ask your parent/guardian to request a top-up at the school finance office.',
          '• Your parent can also top up remotely via M-Pesa at the school counter.',
          '',
          'TIP: Check your balance before school every morning to avoid running short during lunch.',
        ],
      },
    ],
  },
  {
    chapter: '12. IGCSE Results (Cambridge International)',
    sections: [
      {
        title: 'What is IGCSE?',
        content: [
          'IGCSE stands for International General Certificate of Secondary Education.',
          'It is a globally recognised qualification awarded by Cambridge Assessment',
          'International Education.',
          '',
          'If your school offers Cambridge IGCSE subjects, your results appear in',
          'the IGCSE module in the sidebar under Academic → IGCSE.',
          '',
          'You will see:',
          '  • The subjects you are enrolled in',
          '  • Your marks for each assessment component (Paper 1, Paper 2, Coursework, etc.)',
          '  • Your final weighted score and A*–G grade',
          '',
          'NOTE: This section only applies if your school has enabled the IGCSE module.',
        ],
      },
      {
        title: 'Viewing Your IGCSE Results',
        content: [
          '1. Click "IGCSE Results" in the sidebar under Academic.',
          '2. You will land on the IGCSE page showing your Overview.',
          '3. Click the "Results" tab.',
          '4. Optionally select an exam session (e.g. "May/June 2026").',
          '5. Click "View Results".',
          '',
          'Your results show:',
          '  – One card per subject',
          '  – Cambridge subject name and code (e.g. Mathematics 0580)',
          '  – Your tier: Core or Extended',
          '  – Component breakdown:',
          '      Component name | Your score | Max marks | Your % | Weight',
          '  – Your final weighted score (%)',
          '  – Your final grade (A*–G)',
          '',
          'Understanding your grade:',
          '  A* – Exceptional   | A – Outstanding  | B – Above average',
          '  C  – Satisfactory  | D – Below average but passed',
          '  E/F/G – Low pass grades | U – Ungraded (did not reach minimum standard)',
          '',
          'TIP: A grade of C or above in core subjects is typically required for further education.',
        ],
      },
      {
        title: 'Viewing Your Report Card',
        content: [
          '1. Click the "Report Cards" tab in the IGCSE module.',
          '2. Select the exam session.',
          '3. Click "Generate Report".',
          '',
          'Your report card shows:',
          '  – Your name, class, and candidate number',
          '  – All subjects with component scores and final grades',
          '  – Cambridge-style Statement of Results format',
          '',
          'TIP: Print your report card using Ctrl+P (Windows) or Cmd+P (Mac).',
          'TIP: Keep a copy of your report card for university and college applications.',
          'NOTE: If your report card is not available yet, the admin may still be',
          '      processing marks. Check again after your teacher enters all scores.',
        ],
      },
      {
        title: 'Core vs Extended Tier',
        content: [
          'Your tier determines which papers you sit and what grades you can achieve.',
          '',
          'Extended Tier:',
          '  – You sit the harder papers (e.g. Paper 2 and Paper 4)',
          '  – You can achieve grades A* through G',
          '  – This is the standard route for most students',
          '',
          'Core Tier:',
          '  – You sit the foundation papers (e.g. Paper 1 and Paper 3)',
          '  – Maximum grade achievable is C',
          '  – Designed for students who need extra support',
          '',
          'Your tier is assigned by your school — ask your teacher if you are unsure',
          'which tier you are on.',
        ],
      },
    ],
  },
];

const PARENT_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your web browser.',
          '2. Enter your parent email and password (provided by the school on admission).',
          '3. Click "Sign In". You will see your Parent Dashboard.',
          '4. Use "Forgot Password?" if you need to reset your password.',
          'TIP: Your account is linked to your child\'s record. Contact the school office if you cannot log in.',
        ],
      },
      {
        title: 'Your Dashboard Overview',
        content: [
          'Your dashboard shows:',
          '• My Children – number of children enrolled at the school.',
          '• Fee Balance – total outstanding fees for your children.',
          '• Notifications – recent alerts from the school.',
          'Quick Actions: View Children | Pay Fees | Messages | My Profile.',
        ],
      },
    ],
  },
  {
    chapter: '2. My Children',
    sections: [
      {
        title: 'Viewing Your Child\'s Profile',
        content: [
          '1. Click "My Children" in the sidebar under Family.',
          '2. You will see cards for each of your children.',
          '3. Each card shows: Name, Class, Attendance %, and Current Grade summary.',
          '4. Click "View Details" on any child to see their full profile.',
        ],
      },
    ],
  },
  {
    chapter: '3. Children\'s Progress',
    sections: [
      {
        title: 'Checking Academic Results',
        content: [
          '1. Click "Children\'s Progress" in the sidebar.',
          '2. Select the child and term.',
          '3. View their CBE grades per subject:',
          '   – EE (Exceeding Expectations): 80%+',
          '   – ME (Meeting Expectations): 60–79%',
          '   – AE (Approaching Expectations): 40–59%',
          '   – BE (Below Expectations): below 40%',
          '4. Look at the Attendance section to track your child\'s presence at school.',
          '5. A "CBE Assessments" table shows every continuous/formative assessment recorded',
          '   by teachers this term — subject, strand, score and grade — updated as soon as',
          '   the teacher saves it, without waiting for a formal exam.',
          'TIP: Celebrate EE and ME grades with your child. Discuss AE and BE areas and plan extra support.',
        ],
      },
    ],
  },
  {
    chapter: '3b. Children\'s Timetable',
    sections: [
      {
        title: 'Viewing Your Child\'s Class Schedule',
        content: [
          '1. Click "Children Timetable" in the sidebar under Family.',
          '2. If you have more than one child at the school, use the buttons at the top to',
          '   switch between them.',
          '3. The selected child\'s weekly class schedule is shown with subjects, times, rooms',
          '   and teacher names — the same timetable their teacher and class use.',
        ],
      },
    ],
  },
  {
    chapter: '4. Fee Payments',
    sections: [
      {
        title: 'Checking the Fee Balance',
        content: [
          '1. Click "Fee Payments" in the sidebar under Family.',
          '2. You will see the total fee, amount paid, and outstanding balance for each child.',
          '3. A full payment history is shown with dates and amounts.',
        ],
      },
      {
        title: 'Understanding Fee Statements',
        content: [
          'The fee statement shows:',
          '• Invoice Amount – total fee charged for the term.',
          '• Paid – amount received by the school.',
          '• Balance – what remains unpaid.',
          'To pay, visit the school finance office with the reference number shown.',
          'TIP: Pay fees before the due date to avoid inconveniencing your child.',
        ],
      },
    ],
  },
  {
    chapter: '5. Alerts & Notifications',
    sections: [
      {
        title: 'School Alerts',
        content: [
          '1. Click "My Alerts" in the sidebar.',
          '2. You will receive alerts for:',
          '   – Absence: when your child is marked absent',
          '   – Discipline: if your child has a discipline incident',
          '   – Health: if your child receives medical attention at school',
          '   – Fee Reminder: when a payment is due or overdue',
          '   – General Announcements from school management',
          '3. Click on any alert to read the full details.',
          'TIP: Ensure the school has your correct phone number and email to receive alerts promptly.',
        ],
      },
    ],
  },
  {
    chapter: '6. Messages',
    sections: [
      {
        title: 'Communicating with the School',
        content: [
          '1. Click "Messages" in the sidebar.',
          '2. Click "+ New Message" to write to a teacher or the school office.',
          '3. Select the recipient, type your message, and click "Send".',
          '4. Messages from teachers will appear in your inbox.',
          'TIP: Use messages for: progress queries, leave requests, health updates.',
        ],
      },
    ],
  },
  {
    chapter: '7. Transport Tracking',
    sections: [
      {
        title: 'Checking Your Child\'s Transport Status',
        content: [
          'If your child uses the school bus, you can see their pickup status every morning.',
          '',
          '1. Log in and go to your Parent Dashboard.',
          '2. Look for the "Transport Status" widget.',
          '3. It shows:',
          '   – Picked Up ✓ (green) — your child boarded the bus today.',
          '   – Missed (amber) — the bus came but your child was not at the stop.',
          '   – Absent (grey) — driver marked your child as absent.',
          '   – Pending — driver has not yet reached your child\'s stop.',
          '',
          '4. For more details, go to Family → My Transport in the sidebar.',
          '5. You can see pickup time, route name, and the driver\'s record for today.',
          '',
          'TIP: If your child was marked "Missed" unexpectedly, contact the school office',
          '     immediately. The driver records GPS coordinates for each pickup event.',
        ],
      },
    ],
  },
  {
    chapter: '8. My Profile',
    sections: [
      {
        title: 'Updating Your Contact Details',
        content: [
          '1. Go to Account → My Profile.',
          '2. Update your phone number and email address.',
          '3. Keeping this information up to date ensures you receive all alerts.',
          '4. Change your password if needed: enter current password, then new password twice.',
          '5. Click "Save Profile".',
          '',
          'IMPORTANT: Your phone number is used to send SMS alerts about your child.',
          'Ensure it is a Kenyan mobile number (07xx xxx xxx or +254 7xx xxx xxx).',
        ],
      },
    ],
  },
];

const FINANCE_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your browser.',
          '2. Enter your finance officer email and password.',
          '3. Click "Sign In". You will land on the Finance Dashboard.',
        ],
      },
      {
        title: 'Finance Dashboard Overview',
        content: [
          'Your dashboard shows key financial metrics:',
          '• Total Revenue this term',
          '• Total Expenses',
          '• Pending Fee Payments',
          '• Budget utilization',
          'Navigate using the Finance section in the left sidebar.',
        ],
      },
    ],
  },
  {
    chapter: '2. Fee Management',
    sections: [
      {
        title: 'Setting Up Fee Structures',
        content: [
          'Go to Finance → Fee Management → "Fee Structures" tab.',
          'Click "+ Add Fee Structure". Fill in the form:',
          '',
          '  Fee Name & Amount (KES) — e.g. "Term 2 Tuition", 18000',
          '',
          '  Student Type (very important):',
          '    • All Students — applies to every enrolled student',
          '    • Day Scholar  — only bills students marked as Day Scholar',
          '    • Boarder      — only bills students marked as Boarder',
          '  Click the button for the correct category — it highlights when selected.',
          '',
          '  Frequency — how often the fee recurs:',
          '    Monthly | Quarterly (Per Term) | Half Yearly | Yearly | One Time',
          '',
          '  Term — set this when the amount is different each term (e.g. Term 1 tuition',
          '  higher than Term 3). Create the fee once per term, each with its own amount and',
          '  Term selected — only that term\'s invoices will use it. Leave as "All Terms" for',
          '  fees like transport or lunch that don\'t change term to term.',
          '',
          '  Transport Fee — tick this box ONLY for school bus/transport charges.',
          '    – Optionally pick a Route to bill only students on that specific route.',
          '    – If no route is selected, all students assigned to any route are billed.',
          '    – Students not on any route are automatically excluded.',
          '',
          '  Apply to Class — leave blank for all classes, or choose a specific one.',
          '  Academic Year — e.g. 2025',
          '  Due Day — day of month by which payment is expected (e.g. 15).',
          '',
          'Click "Create Fee Structure". The structure appears in the list immediately.',
          'To edit or delete, use the pencil or trash icon on the table row.',
          'NOTE: Deleting a fee structure is permanent. Outstanding invoices already generated are not affected.',
        ],
      },
      {
        title: 'Bulk Invoice Generation',
        content: [
          'After creating fee structures, generate invoices for all students at once.',
          '',
          'Go to Finance → Fee Management → "Bulk Generate Invoices" tab.',
          '',
          '1. Select Classes — tick which classes to include. Use "Select All" to pick all.',
          '2. Select Fee Structures — tick the fees you want to bill.',
          '   Each structure shows its amount, student type badge, and transport icon if applicable.',
          '3. Invoice Settings — set Term, Academic Year, and optional Due Date.',
          '',
          '4. Click "Preview" to see exactly who will be billed and why some will be skipped.',
          '   Skipped reasons:',
          '     – Wrong student category: e.g. a boarder fee applied to a day scholar',
          '     – No transport assigned: transport fee but student has no route',
          '     – Different route: student is on a different bus route',
          '5. Review the preview carefully, then click "Generate" to create all invoices.',
          '',
          'TIP: Always run Preview before Generate — it shows the total amount to be invoiced.',
          'WARNING: Running Generate twice for the same term creates duplicate invoices.',
        ],
      },
      {
        title: 'Recording Payments',
        content: [
          '1. Go to Finance → Transactions.',
          '2. Click "+ Record Payment".',
          '3. Search the student by name or admission number.',
          '4. Enter: Amount, Date, Payment Method (Cash / M-Pesa / Bank Transfer), Reference Number.',
          '5. Click "Save". The student\'s balance updates immediately.',
          'TIP: Always enter the M-Pesa or bank reference number for traceability.',
        ],
      },
      {
        title: 'Viewing Outstanding Fees',
        content: [
          '1. Go to Finance → Reports.',
          '2. Select "Outstanding Fees" report.',
          '3. Filter by Class or Date Range.',
          '4. Export to Excel/PDF for follow-up.',
        ],
      },
    ],
  },
  {
    chapter: '3. Income & Expenses',
    sections: [
      {
        title: 'Recording Expenses',
        content: [
          '1. Go to Finance → Transactions.',
          '2. Click "+ New Expense".',
          '3. Select Category (Utilities, Supplies, Maintenance, etc.).',
          '4. Enter: Amount, Date, Payee, Description, Receipt Reference.',
          '5. Click "Save".',
        ],
      },
      {
        title: 'Petty Cash Management',
        content: [
          '1. Go to Finance → Petty Cash.',
          '2. Record small disbursements: amount, purpose, date, authorized by.',
          '3. Click "Replenish Fund" when the petty cash balance runs low.',
        ],
      },
    ],
  },
  {
    chapter: '4. Budget Management',
    sections: [
      {
        title: 'Creating Budgets',
        content: [
          '1. Go to Finance → Budgets.',
          '2. Click "+ New Budget".',
          '3. Enter: Category, Planned Amount, Period (Term/Annual).',
          '4. Click "Save". Monitor actual vs. budgeted spend in real time.',
        ],
      },
      {
        title: 'Purchase Orders & Vendors',
        content: [
          '1. Go to Finance → Vendors & Purchase Orders.',
          '2. Add vendors: Name, Contact, Category of supply.',
          '3. Create Purchase Orders linked to a vendor and budget category.',
          '4. Mark POs as Received once goods/services are delivered.',
        ],
      },
    ],
  },
  {
    chapter: '5. Bank Accounts',
    sections: [
      {
        title: 'Managing Bank Accounts',
        content: [
          '1. Go to Finance → Bank Accounts.',
          '2. Add school bank accounts: Bank Name, Account Number, Account Name, Branch.',
          '3. Record deposits and withdrawals.',
          '4. View the running balance for each account.',
        ],
      },
    ],
  },
  {
    chapter: '6. Financial Reports',
    sections: [
      {
        title: 'Overview — Report Tabs',
        content: [
          'Go to Finance → Reports. The page has six tabs:',
          '',
          '  1. Fee Collection    — summary, class breakdown, payment methods, monthly trend, top defaulters.',
          '  2. Defaulters        — full list of students with outstanding balances.',
          '  3. Student Payments  — every student: total invoiced, paid, and balance due.',
          '  4. Income & Expenses — revenue vs. spending P&L by category.',
          '  5. Budget vs Actual  — budget utilization with color-coded progress bars.',
          '  6. Cash Flow         — cash in / out / net and fee collection contribution.',
          '',
          'Filters (top of each page):',
          '  Academic Year, Term, Class, Payment Date Range.',
          'Click "Apply" after changing filters. Click "Refresh" to reload data.',
        ],
      },
      {
        title: 'Fee Collection Report',
        content: [
          '1. Go to Reports → "Fee Collection" tab.',
          '2. Set Academic Year and Term, then click Apply.',
          '3. Summary cards show:',
          '   – Total Invoiced, Total Collected, Outstanding, Collection Rate %.',
          '4. The progress bar shows the overall collection rate at a glance.',
          '5. "Collection by Class" table breaks down each class\'s invoiced vs. collected vs. outstanding.',
          '6. "Payment Methods" chart shows cash, M-Pesa, bank transfer splits.',
          '7. "Monthly Trend" bar chart shows the last 12 months of payments.',
          '8. "Top Defaulters" preview shows students with the highest balances.',
          '',
          'Exporting:',
          '   – Click "PDF" to download a comprehensive A4 report (all sections).',
          '   – Click "CSV" to download the defaulters list as a spreadsheet.',
          'TIP: Run the Fee Collection Report at the end of every term for board meetings.',
        ],
      },
      {
        title: 'Defaulters Report',
        content: [
          '1. Go to Reports → "Defaulters" tab.',
          '2. Filter by Academic Year, Term, and/or Class, then click Apply.',
          '3. The table shows every student with a balance > 0:',
          '   – Name, Admission Number, Class, Type (Day Scholar / Boarder)',
          '   – Total Invoiced, Total Paid, Outstanding Balance, Number of Invoices',
          '4. Totals footer shows the overall outstanding amount.',
          '5. Click "Export CSV" (within the table) or the "CSV" button in the header.',
          '',
          'TIP: Use Defaulters to prepare a fee balance reminder list for parents.',
          'TIP: Students marked "Boarder" in purple and "Day Scholar" in blue.',
        ],
      },
      {
        title: 'Student Payments Report',
        content: [
          'This report shows every active student with their complete fee summary.',
          '',
          '1. Go to Reports → "Student Payments" tab.',
          '2. Filter by Class (optional), then click Apply.',
          '3. Summary cards at the top show:',
          '   – Total students, Total Invoiced, Total Paid (with collection %), Balance Due.',
          '4. Use the search box to find a specific student by name or admission number.',
          '5. The table shows all students with:',
          '   – Name, Admission Number, Class, Type, Total Invoiced, Paid, Balance Due, Invoice count.',
          '6. Balance Due is shown in red for students with outstanding amounts.',
          '7. The totals row at the bottom sums all columns.',
          '',
          'Exporting:',
          '   – Click "PDF" (header) to download a full A4 student payments report.',
          '   – Click "CSV" (header) to download the full student list as a spreadsheet.',
          'TIP: Download the CSV and share with the class teacher or bursar.',
          'TIP: Use this report to verify payments before term-end clearance lists.',
        ],
      },
      {
        title: 'Income & Expenses / Budget / Cash Flow',
        content: [
          'Income & Expenses tab:',
          '   – Shows total income vs total expenses for the selected date range.',
          '   – Net Surplus or Deficit displayed prominently.',
          '   – Bar charts show income and expense categories.',
          '',
          'Budget vs Actual tab:',
          '   – Lists all approved budgets with amount allocated vs amount spent.',
          '   – Color-coded progress bars: green (on track), orange (70%+), red (overspent).',
          '',
          'Cash Flow tab:',
          '   – Cash In (completed income records) vs Cash Out (paid expenses).',
          '   – Net cash position shown. Fee payments contribution highlighted.',
          '',
          'Set the date range using "From Date" and "To Date" filters, then click Apply.',
          'TIP: Generate Income & Expenses at end of term for the principal\'s report.',
        ],
      },
    ],
  },
  {
    chapter: '7. Assets',
    sections: [
      {
        title: 'Asset Management',
        content: [
          '1. Go to Finance → Assets.',
          '2. Click "+ Add Asset": Name, Category, Purchase Date, Cost, Location.',
          '3. Record depreciation annually.',
          '4. Mark assets as Disposed when sold or scrapped.',
        ],
      },
    ],
  },
  {
    chapter: '8. Financial Years',
    sections: [
      {
        title: 'Managing Financial Periods',
        content: [
          '1. Go to Finance → Financial Years.',
          '2. Create a new financial year at the start of each school year.',
          '3. Close the previous financial year after all accounts are reconciled.',
          'NOTE: Closing a year is irreversible. Ensure all entries are correct first.',
        ],
      },
    ],
  },
  {
    chapter: '9. Payroll & Payslips',
    sections: [
      {
        title: 'Reviewing & Running Payroll',
        content: [
          '1. Go to Finance → Payroll in the sidebar.',
          '2. Review the salary structures for all staff (set up by admin).',
          '3. At the start of each month, click "Run Payroll for [Month]".',
          '4. A summary shows: Total Gross Pay, Total Deductions, Total Net Pay.',
          '5. Verify the figures and click "Confirm & Run".',
          '6. Payslips are generated for all staff immediately.',
          '',
          'Downloading payroll summary:',
          '• Click "Download Summary" to get an Excel/PDF payroll report.',
          '• This is used for school board reporting and audit purposes.',
          '',
          'TIP: Run payroll between the 25th–30th of each month.',
          'TIP: Kenya statutory deductions: NSSF (6%), NHIF (amount depends on salary), PAYE.',
        ],
      },
      {
        title: 'Viewing Individual Payslips',
        content: [
          '1. Go to Finance → Payroll → Payslips tab.',
          '2. Filter by month and staff member.',
          '3. Click on a payslip row to view details.',
          '4. Click "Download PDF" to save or print the payslip.',
          '',
          'Staff can also view their own payslip by going to Finance → My Payslips.',
          'They can download the PDF directly from their account without admin involvement.',
        ],
      },
    ],
  },
  {
    chapter: '10. Bursary & Inventory',
    sections: [
      {
        title: 'Managing Bursary Programmes',
        content: [
          '1. Go to Finance → Bursary in the sidebar.',
          '2. Click "+ Create Programme" — enter Name, Sponsor, Total Budget.',
          '3. To award bursary to a student:',
          '   – Click "+ Award Bursary".',
          '   – Select: Student, Programme, Amount, Criteria/Reason.',
          '   – Click "Award". The bursary credits the student\'s fee account.',
          '4. View all beneficiaries and amounts disbursed per programme.',
          '5. Download the beneficiary list as CSV for sponsor reporting.',
          '',
          'TIP: Bursary types include: CDF (Constituency Development Fund), County Bursary,',
          '     NGO Sponsorship, School Fund, and private sponsorship.',
        ],
      },
      {
        title: 'Inventory Management',
        content: [
          '1. Go to Finance → Inventory in the sidebar.',
          '2. Add inventory items: Name, Category, Unit, Reorder Level.',
          '3. Use "Stock In" to record new stock received.',
          '4. Use "Stock Out" to record stock issued or consumed.',
          '5. The "Low Stock" tab flags items below the reorder threshold.',
          '',
          'Linking to Purchase Orders:',
          '• When a PO is received (Finance → Vendors & POs → Mark Received),',
          '  stock quantities update automatically.',
          '',
          'TIP: Categories: Stationery, Cleaning Supplies, Lab Equipment, Books, Food Stores.',
          'TIP: Set realistic reorder levels to avoid running out of critical supplies.',
        ],
      },
    ],
  },
  {
    chapter: '11. Fee Reminders',
    sections: [
      {
        title: 'Sending Fee Reminder Alerts',
        content: [
          '1. Go to Finance → Fee Reminders in the sidebar.',
          '2. The page shows all students with outstanding balances.',
          '3. You can send reminders in two ways:',
          '   – Individual: click "Send Reminder" next to a specific student.',
          '   – Bulk: click "Send All Reminders" to notify all defaulters at once.',
          '4. Reminders are sent via the parent alert system (in-app notification and SMS if configured).',
          '',
          'TIP: Send fee reminders at the beginning of each month and two weeks before term end.',
          'TIP: The reminder includes the student\'s name and outstanding balance amount.',
        ],
      },
    ],
  },
  {
    chapter: '12. Procurement Module',
    sections: [
      {
        title: 'Finance Role in Procurement',
        content: [
          'As Finance Officer, you work with procurement at the payment and budget stage.',
          'The full procurement workflow (PR → RFQ → Quotation → PO → GRN) is managed by admin.',
          'Your key responsibilities in procurement:',
          '  1. Approve supplier invoices for payment.',
          '  2. Record and approve supplier payments.',
          '  3. Monitor procurement budgets vs. actuals.',
          '  4. Run procurement spend reports.',
          '',
          'Access: Go to "Procurement" in the left sidebar.',
        ],
      },
      {
        title: 'Processing Supplier Invoices',
        content: [
          '1. Go to Procurement → Invoices.',
          '2. Review invoices in "Pending" status.',
          '3. Verify: Invoice amount matches the linked GRN quantities and PO prices (3-way match).',
          '4. If correct, click "Approve Invoice".',
          '5. If there is a discrepancy, click "Reject Invoice" and note the reason.',
          '',
          'Invoice statuses: Pending → Approved → Partially Paid → Paid / Rejected.',
          'TIP: Never approve an invoice without confirming there is a matching GRN (goods received).',
          'TIP: Check the "Balance" column — this is the remaining unpaid amount.',
        ],
      },
      {
        title: 'Recording Supplier Payments',
        content: [
          '1. Go to Procurement → Payments → click "+ New Payment".',
          '2. Select the approved invoice to pay.',
          '3. Enter: Payment Date, Amount, Payment Method (Bank Transfer, Cheque, M-Pesa).',
          '4. Enter the Reference Number (bank transfer ref, cheque number, or M-Pesa code).',
          '5. Click "Save". Status = Pending Approval.',
          '6. Click "Approve Payment" to finalise.',
          '',
          'The invoice paid_amount and balance update automatically.',
          'When balance = 0, the invoice status changes to "Paid".',
          '',
          'TIP: Always record the exact payment reference for bank reconciliation.',
          'TIP: For M-Pesa payments, use the transaction code (e.g. QH7F2K...) as the reference.',
          'WARNING: Only approve payments for invoices that have been verified against the GRN and PO.',
        ],
      },
      {
        title: 'Procurement Budgets',
        content: [
          '1. Go to Procurement → Planning → Budgets tab.',
          '2. Review the budget list: Category, Allocated Amount, Spent, Remaining.',
          '3. A color-coded bar shows utilisation: green (under 70%), amber (70–90%), red (over 90%).',
          '',
          'Adding a budget:',
          '1. Click "+ New Budget".',
          '2. Enter: Category, Allocated Amount, Financial Year, Term.',
          '3. Click "Save".',
          '',
          'TIP: Review budget utilisation weekly — flag categories approaching 90% to admin.',
          'TIP: The Procurement Dashboard shows a summary budget utilisation chart.',
        ],
      },
      {
        title: 'Procurement Reports',
        content: [
          '1. Go to Procurement → Reports.',
          '2. Set Date Range, then click "Apply".',
          '3. Summary cards show: Total PO Value, Total Paid, Total Outstanding, Supplier Count.',
          '4. Supplier Spend Analysis table shows total spend per supplier.',
          '5. Click "Export CSV" to download for the Finance Committee or board.',
          '',
          'TIP: Run the Procurement Report monthly and present alongside the Finance Report.',
          'TIP: Cross-reference Procurement Payments with Finance → Income & Expenses (expense side).',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Driver manual
// ─────────────────────────────────────────────────────────────────────────────

const DRIVER_MANUAL: ManualChapter[] = [
  {
    chapter: '1. Getting Started',
    sections: [
      {
        title: 'Logging In',
        content: [
          '1. Open SkulManager in your phone browser.',
          '2. Enter your driver email and password provided by the school admin.',
          '3. Click "Sign In". You will land on the Driver Dashboard.',
          'TIP: Save the SkulManager URL to your phone home screen for quick access.',
          'TIP: If you forget your password, contact the school administrator.',
        ],
      },
      {
        title: 'Driver Dashboard Overview',
        content: [
          'Your dashboard shows everything you need for your route today:',
          '• Your assigned route and the number of students on it.',
          '• Today\'s date and pickup status summary.',
          '• A "Start Pickup" button to begin marking student pickups.',
          '• Recent pickup log showing the last few records.',
          '',
          'The sidebar has:',
          '  – Dashboard (home)',
          '  – My Route (route details and student list)',
          '  – Pickup Log (history of all pickups)',
          '  – My Profile (account settings)',
        ],
      },
    ],
  },
  {
    chapter: '2. My Route',
    sections: [
      {
        title: 'Viewing Your Assigned Route',
        content: [
          '1. Go to My Route in the sidebar (or click the route card on the Dashboard).',
          '2. You will see:',
          '   – Route Name (e.g., "Westlands Morning Route")',
          '   – Route Description and pickup schedule.',
          '   – List of all students assigned to your route.',
          '3. For each student you can see:',
          '   – Name, Class, and Pickup Point / Stop.',
          '',
          'TIP: Familiarise yourself with the route and all pickup points at the start of term.',
          'TIP: If a student is missing from your list, contact the admin to update the assignment.',
        ],
      },
      {
        title: 'Student Pickup Points',
        content: [
          'The route has defined pickup points (bus stops) where students board.',
          '• Each student is assigned to a specific pickup point on your route.',
          '• The pickup list is ordered by stop sequence.',
          '',
          'TIP: Note special instructions for students — e.g., alternative pickup points or guardians.',
        ],
      },
    ],
  },
  {
    chapter: '3. Marking Pickups',
    sections: [
      {
        title: 'Starting the Daily Pickup Run',
        content: [
          'Every morning before you start the route:',
          '1. Log in to SkulManager on your phone.',
          '2. On the Dashboard, click "Start Pickup" or go to My Route.',
          '3. You will see the full student list for today.',
          '',
          'For each student at their pickup point:',
          '1. Find the student in the list.',
          '2. Click the status button next to their name:',
          '   – "Picked Up" (green) — student boarded the bus.',
          '   – "Missed" (amber) — bus arrived at the stop but student was not there.',
          '   – "Absent" (grey) — student is reported absent for today.',
          '3. The system records the time and your GPS location automatically.',
          '',
          'TIP: Mark each student as soon as you pass their stop — do not wait until journey end.',
          'TIP: GPS location is captured when you tap the button. Ensure your phone location is ON.',
        ],
      },
      {
        title: 'Handling Missed Students',
        content: [
          'If a student is not at their stop:',
          '1. Mark them as "Missed" — do not wait more than 2 minutes per stop.',
          '2. The parent is automatically notified via the parent app / SMS.',
          '3. Continue the route.',
          '',
          'NOTE: "Missed" means the student was expected but not present at the stop.',
          'NOTE: "Absent" means the school has already informed you the student is not coming today.',
          '',
          'TIP: If a parent calls after you leave, inform the school admin — they can update records.',
          'WARNING: Never pick up a student at an unregistered location without admin confirmation.',
        ],
      },
      {
        title: 'Completing the Route',
        content: [
          'After all students have been marked:',
          '1. Review the summary — Picked Up count, Missed count, Absent count.',
          '2. If everything looks correct, click "Complete Route".',
          '3. The daily pickup log is saved and visible to the admin.',
          '',
          'If you need to correct a record:',
          '1. Find the student in the list and tap the status button again to change.',
          '2. You can only update records for today\'s run.',
          '',
          'TIP: Complete the route immediately after arriving at school, while it is fresh.',
        ],
      },
    ],
  },
  {
    chapter: '4. Pickup Log',
    sections: [
      {
        title: 'Viewing Past Records',
        content: [
          '1. Go to Pickup Log in the sidebar.',
          '2. The log shows all your past pickup events:',
          '   – Date, Student Name, Status, Time, Pickup Point.',
          '3. Filter by date range to find specific records.',
          '',
          'TIP: Use the pickup log if a parent disputes a pickup status — share the time and GPS.',
          'TIP: Admin can also view your pickup log from the Transport Tracking admin page.',
        ],
      },
    ],
  },
  {
    chapter: '5. My Profile',
    sections: [
      {
        title: 'Updating Your Details',
        content: [
          '1. Go to Account → My Profile.',
          '2. You can update your phone number and email.',
          '3. Change your password: enter current password, then new password twice.',
          '4. Click "Save Profile".',
          '',
          'TIP: Keep your phone number up to date so admin can contact you on the route.',
          'TIP: Use a strong password and do not share your login credentials.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PDF generator
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  accent: [99, 102, 241] as [number, number, number],
  dark: [17, 24, 39] as [number, number, number],
  mid: [55, 65, 81] as [number, number, number],
  light: [107, 114, 128] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'School Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent / Guardian',
  finance_officer: 'Finance Officer',
  driver: 'Transport Driver',
  superadmin: 'System Administrator',
};

const ROLE_COLORS: Record<Role, [number, number, number]> = {
  admin: [37, 99, 235],
  teacher: [79, 70, 229],
  student: [16, 185, 129],
  parent: [245, 158, 11],
  finance_officer: [239, 68, 68],
  driver: [20, 184, 166],
  superadmin: [107, 114, 128],
};

function getContent(role: Role): ManualChapter[] {
  switch (role) {
    case 'admin': return ADMIN_MANUAL;
    case 'teacher': return TEACHER_MANUAL;
    case 'student': return STUDENT_MANUAL;
    case 'parent': return PARENT_MANUAL;
    case 'finance_officer': return FINANCE_MANUAL;
    case 'driver': return DRIVER_MANUAL;
    default: return ADMIN_MANUAL;
  }
}

export function generateUserManual(role: Role, schoolName: string = 'Your School') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = W - marginL - marginR;
  const color = ROLE_COLORS[role] ?? COLORS.primary;
  const chapters = getContent(role);
  const roleLabel = ROLE_LABELS[role] ?? 'User';

  let page = 1;
  let y = 0;

  // ── helpers ──────────────────────────────────────────────────────────────

  const addPage = () => {
    doc.addPage();
    page++;
    y = 20;
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.light);
    doc.text(`SkulManager — ${roleLabel} Manual`, marginL, H - 8);
    doc.text(`Page ${page}`, W - marginR, H - 8, { align: 'right' });
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(marginL, H - 13, W - marginR, H - 13);
  };

  const checkY = (needed: number) => {
    if (y + needed > H - 20) addPage();
  };

  // ── Cover Page ────────────────────────────────────────────────────────────

  // Background gradient block
  doc.setFillColor(...color);
  doc.rect(0, 0, W, 110, 'F');

  // Decorative circles
  doc.setFillColor(255, 255, 255, 0.08 as any);
  doc.circle(W - 30, 30, 60, 'F');
  doc.circle(W - 10, 90, 40, 'F');

  // School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName.toUpperCase(), W / 2, 28, { align: 'center' });

  // SkulManager brand
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 230, 255);
  doc.text('SkulManager — School Management System', W / 2, 36, { align: 'center' });

  // Manual title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('User Manual', W / 2, 60, { align: 'center' });

  // Role pill
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(W / 2 - 35, 68, 70, 12, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(roleLabel, W / 2, 76.5, { align: 'center' });

  // Subtitle stripe
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 110, W, 25, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.mid);
  doc.text(
    'A step-by-step guide to using the SkulManager school management platform.',
    W / 2,
    122,
    { align: 'center', maxWidth: contentW },
  );
  doc.setFontSize(9);
  doc.text(
    `Issued: ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    W / 2,
    130,
    { align: 'center' },
  );

  // How to use tips box
  y = 148;
  doc.setFillColor(...COLORS.bg);
  doc.roundedRect(marginL, y, contentW, 60, 4, 4, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, 60, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text('How to use this manual:', marginL + 6, y + 10);

  const tips = [
    'Read each chapter in order when you first start using the system.',
    'Use the Table of Contents (next page) to jump to a specific topic.',
    'Steps are numbered — follow them in sequence for best results.',
    'TIP notes highlight useful shortcuts and best practices.',
    'WARNING notes indicate irreversible actions — read them carefully.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mid);
  tips.forEach((tip, i) => {
    doc.text(`${i + 1}.  ${tip}`, marginL + 8, y + 20 + i * 9, { maxWidth: contentW - 12 });
  });

  // Footer first page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  doc.text(`SkulManager — ${roleLabel} Manual`, marginL, H - 8);
  doc.text('Page 1', W - marginR, H - 8, { align: 'right' });
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(marginL, H - 13, W - marginR, H - 13);

  // ── Table of Contents ─────────────────────────────────────────────────────

  addPage();

  // TOC Header
  doc.setFillColor(...color);
  doc.rect(marginL, y, contentW, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('Table of Contents', marginL + 4, y + 8.5);
  y += 18;

  chapters.forEach((ch, ci) => {
    checkY(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(ch.chapter, marginL + 2, y);
    y += 6;

    ch.sections.forEach(sec => {
      checkY(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.light);
      doc.text(`    • ${sec.title}`, marginL + 4, y);
      y += 5.5;
    });
    y += 2;

    // Divider every chapter
    if (ci < chapters.length - 1) {
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, W - marginR, y);
      y += 3;
    }
  });

  // ── Chapters ──────────────────────────────────────────────────────────────

  chapters.forEach(ch => {
    addPage();

    // Chapter header band
    doc.setFillColor(...color);
    doc.rect(0, y - 5, W, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(ch.chapter, marginL, y + 7);
    y += 22;

    ch.sections.forEach(sec => {
      checkY(20);

      // Section title bar
      doc.setFillColor(238, 242, 255);
      doc.rect(marginL, y, contentW, 9, 'F');
      doc.setDrawColor(...color);
      doc.setLineWidth(0.8);
      doc.line(marginL, y, marginL, y + 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLORS.dark);
      doc.text(sec.title, marginL + 5, y + 6.5);
      y += 13;

      sec.content.forEach(line => {
        const isTip = line.startsWith('TIP:');
        const isWarn = line.startsWith('WARNING:') || line.startsWith('NOTE:');

        if (isTip || isWarn) {
          const boxColor = isTip
            ? ([240, 253, 244] as [number, number, number])
            : ([255, 251, 235] as [number, number, number]);
          const borderC = isTip
            ? ([34, 197, 94] as [number, number, number])
            : ([245, 158, 11] as [number, number, number]);
          const textC = isTip
            ? ([22, 101, 52] as [number, number, number])
            : ([120, 53, 15] as [number, number, number]);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(line, contentW - 14);
          const boxH = wrapped.length * 5 + 6;
          checkY(boxH + 4);

          doc.setFillColor(...boxColor);
          doc.roundedRect(marginL, y, contentW, boxH, 2, 2, 'F');
          doc.setDrawColor(...borderC);
          doc.setLineWidth(0.5);
          doc.line(marginL, y, marginL, y + boxH);

          doc.setTextColor(...textC);
          doc.text(wrapped, marginL + 5, y + 4.5);
          y += boxH + 4;
        } else {
          const isIndented = line.startsWith('   ') || line.startsWith('      ');
          const xPos = isIndented ? marginL + 6 : marginL;
          const maxW = isIndented ? contentW - 6 : contentW;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...COLORS.mid);
          const wrapped = doc.splitTextToSize(line, maxW);
          checkY(wrapped.length * 5 + 2);
          doc.text(wrapped, xPos, y);
          y += wrapped.length * 5 + 2;
        }
      });

      y += 6;
    });
  });

  // ── Back Cover ────────────────────────────────────────────────────────────

  addPage();
  doc.setFillColor(...color);
  doc.rect(0, H / 2 - 40, W, 80, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Need Help?', W / 2, H / 2 - 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 255);
  doc.text(
    'Contact your school administrator or IT support for assistance.',
    W / 2,
    H / 2 - 6,
    { align: 'center', maxWidth: contentW },
  );
  doc.text(
    'This manual is provided by SkulManager for internal use only.',
    W / 2,
    H / 2 + 4,
    { align: 'center', maxWidth: contentW },
  );
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 255);
  doc.text('© SkulManager School Management System', W / 2, H / 2 + 20, { align: 'center' });

  // ── Save ──────────────────────────────────────────────────────────────────

  const filename = `SkulManager_${roleLabel.replace(/\s+/g, '_')}_Manual.pdf`;
  doc.save(filename);
}
