import { jsPDF } from 'jspdf';

type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'finance_officer' | 'superadmin';

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
          'The sidebar is organized into sections:',
          '• People – manage Students, Teachers, Parents, and Users.',
          '• Academic – manage Classes, Subjects, CBC Assessments, Schemes, Lesson Plans, SBA, Projects, Promotions.',
          '• Finance – manage Fees, Transactions, Budgets, Bank Accounts, Reports.',
          '• Schedule – Timetable management.',
          '• Welfare – Discipline records, Health, Transport.',
          '• Library – Book catalog, borrowing management.',
          '• Messages – School-wide communication.',
          '• Account – Your profile and system settings.',
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
          '   – Email and Phone (optional)',
          '   – Class / Grade (required) – select from the dropdown',
          '   – Gender, Date of Birth, Admission Number',
          '   – Guardian name, Guardian phone',
          '4. Click "Save Student". The student is now enrolled.',
          'TIP: Admission numbers are auto-generated if left blank.',
        ],
      },
      {
        title: 'Editing or Removing a Student',
        content: [
          '1. Go to Students in the sidebar.',
          '2. Find the student using the search bar or filters.',
          '3. Click the pencil (edit) icon on the student\'s row.',
          '4. Update the details and click "Save".',
          'To deactivate a student: edit the student and change Status to "Inactive".',
          'To permanently delete: click the trash icon and confirm the prompt.',
          'WARNING: Deletion is permanent. Prefer deactivation for record-keeping.',
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
    chapter: '5. Academic Management (CBC)',
    sections: [
      {
        title: 'Managing Classes & Learning Areas',
        content: [
          '1. Go to Academic in the sidebar.',
          '2. Use the "Classes" tab to add/edit class groups (e.g., Grade 4 East).',
          '3. Use the "Learning Areas" tab to manage subjects per grade level.',
          'CBC Grade Levels: Playgroup → PP1/PP2 → Grade 1–6 → Grade 7–9 (JSS) → Grade 10–12 (SSS).',
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
        title: 'CBC Assessments (SBA)',
        content: [
          '1. Go to Academic → "SBA" tab.',
          '2. Select a class and learning area.',
          '3. Click "+ Add Assessment" to set up a new assessment task.',
          '4. Enter student marks. The system auto-assigns grades:',
          '   – EE (Exceeding Expectations): 80% and above',
          '   – ME (Meeting Expectations): 60–79%',
          '   – AE (Approaching Expectations): 40–59%',
          '   – BE (Below Expectations): below 40%',
          '5. Click "Save Marks".',
        ],
      },
      {
        title: 'CBC Report Cards',
        content: [
          '1. Go to Academic → CBC Report Cards.',
          '2. Select the Term and Class.',
          '3. The system compiles assessment data automatically.',
          '4. Review and click "Generate Report Cards".',
          '5. Download individual or bulk PDF report cards.',
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
          '1. Go to Finance → Fee Management.',
          '2. Click "Fee Structures".',
          '3. Click "+ New Fee Structure".',
          '4. Enter: Name (e.g., "Term 1 2025"), Amount, Class, Due Date.',
          '5. Click "Save". The fee is now assigned to students in that class.',
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
        ],
      },
      {
        title: 'Finance Reports',
        content: [
          '1. Go to Finance → Reports.',
          '2. Select the report type: Income Statement, Fee Collection, Outstanding Fees, Expense Report.',
          '3. Set the date range and click "Generate".',
          '4. Click "Export" to download as PDF or Excel.',
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
        title: 'Transport Management',
        content: [
          '1. Go to Welfare → Transport.',
          '2. Add and manage transport routes and vehicles.',
          '3. Assign students to routes.',
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
          '1. Go to Account → Settings.',
          '2. Update: School Name, Logo, Address, Contact, Academic Year, Current Term.',
          '3. Click "Save Settings" to apply changes.',
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
          '4. Enter the student\'s score. The CBC grade is calculated automatically:',
          '   – EE: 80%+ | ME: 60–79% | AE: 40–59% | BE: below 40%',
          '5. Click "Save". Grades are immediately visible to students.',
        ],
      },
    ],
  },
  {
    chapter: '5. CBC Assessments (SBA)',
    sections: [
      {
        title: 'Creating an SBA Assessment',
        content: [
          '1. Go to Academic → SBA tab.',
          '2. Click "+ Add Assessment".',
          '3. Enter: Assessment Name, Learning Area, Class, Term, Max Marks.',
          '4. Click "Save".',
        ],
      },
      {
        title: 'Entering SBA Student Marks',
        content: [
          '1. In the SBA tab, find your assessment and click "Enter Marks".',
          '2. A dialog opens with the student list.',
          '3. Enter the score for each student.',
          '4. Click "Save Marks". The CBC grade (EE/ME/AE/BE) is shown automatically.',
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
          '3. For each student, rate the CBC core values and competencies.',
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
          '3. Your CBC grades are shown per subject:',
          '   – EE (Exceeding Expectations): 80%+  – Excellent!',
          '   – ME (Meeting Expectations): 60–79%  – Good',
          '   – AE (Approaching Expectations): 40–59%  – Needs improvement',
          '   – BE (Below Expectations): below 40%  – Please seek help',
          '4. Click on any subject to see the breakdown by assessment.',
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
          '3. View their CBC grades per subject:',
          '   – EE (Exceeding Expectations): 80%+',
          '   – ME (Meeting Expectations): 60–79%',
          '   – AE (Approaching Expectations): 40–59%',
          '   – BE (Below Expectations): below 40%',
          '4. Look at the Attendance section to track your child\'s presence at school.',
          'TIP: Celebrate EE and ME grades with your child. Discuss AE and BE areas and plan extra support.',
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
    chapter: '7. My Profile',
    sections: [
      {
        title: 'Updating Your Contact Details',
        content: [
          '1. Go to Account → My Profile.',
          '2. Update your phone number and email address.',
          '3. Keeping this information up to date ensures you receive all alerts.',
          '4. Change your password if needed: enter current password, then new password twice.',
          '5. Click "Save Profile".',
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
          '1. Go to Finance → Fee Management.',
          '2. Click "Fee Structures".',
          '3. Click "+ New Fee Structure" and enter: Name, Class, Amount, Due Date.',
          '4. Click "Save". Fees are automatically assigned to students in that class.',
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
          'TIP: Always enter the M-Pesa or bank reference for traceability.',
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
        title: 'Generating Reports',
        content: [
          '1. Go to Finance → Reports.',
          '2. Choose a report type:',
          '   – Income Statement: revenue vs. expenses for a period.',
          '   – Fee Collection Report: fees collected, outstanding by class.',
          '   – Expense Report: spending by category.',
          '   – Asset Register: school assets and depreciation.',
          '3. Set the date range and click "Generate Report".',
          '4. Click "Export" to download as PDF or Excel.',
          'TIP: Generate the Income Statement at the end of each term for board meetings.',
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
  superadmin: 'System Administrator',
};

const ROLE_COLORS: Record<Role, [number, number, number]> = {
  admin: [37, 99, 235],
  teacher: [79, 70, 229],
  student: [16, 185, 129],
  parent: [245, 158, 11],
  finance_officer: [239, 68, 68],
  superadmin: [107, 114, 128],
};

function getContent(role: Role): ManualChapter[] {
  switch (role) {
    case 'admin': return ADMIN_MANUAL;
    case 'teacher': return TEACHER_MANUAL;
    case 'student': return STUDENT_MANUAL;
    case 'parent': return PARENT_MANUAL;
    case 'finance_officer': return FINANCE_MANUAL;
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

  const text = (
    txt: string,
    x: number,
    maxW: number,
    size: number,
    style: 'normal' | 'bold' | 'italic',
    rgb: [number, number, number],
  ): number => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...rgb);
    const lines = doc.splitTextToSize(txt, maxW);
    doc.text(lines, x, y);
    const lineH = size * 0.4;
    return lines.length * lineH;
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
