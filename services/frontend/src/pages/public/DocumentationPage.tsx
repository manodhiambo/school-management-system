import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronRight, Search, BookOpen, Users, DollarSign, Bus, Package, BarChart3, Shield, ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const DOCS = [
  {
    category: 'Getting Started',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'blue',
    articles: [
      { title: 'How to register your school', content: 'Go to the landing page and click "Register Your School". Fill in your school name, Ministry of Education registration number, county, phone, admin email and password, then click Continue. You\'ll be prompted to pay a KSh 50,000 deposit via M-Pesa (of a KSh 100,000 total registration fee) — this submits your school for review.\n\nOnce our team verifies your school and approves the registration, your admin account is activated and you can log in. You then have 5 days from your deposit payment to clear the remaining KSh 50,000 balance from Settings → Billing, or the account is automatically suspended.\n\nWant to explore first? Use the live demo from the Sign In page — no account or payment needed.' },
      { title: 'Logging in for the first time', content: 'Visit the system URL and click Sign In. Enter your admin email and password. If you forget your password, use the "Forgot Password" link on the login page to reset it via email.' },
      { title: 'Setting up your school profile', content: 'Navigate to Settings → School Profile. Enter your school name, logo, address, M-Pesa Paybill number, and other details. These appear on invoices, report cards, and PDF exports.' },
      { title: 'Adding classes and subjects', content: 'Go to Academic → Classes to create your classes (e.g. Grade 1, Grade 2, JSS 1). Then go to Academic → Subjects to add subjects and link them to classes. Assign a class teacher to each class for CBE report card generation.' },
    ],
  },
  {
    category: 'Student Management',
    icon: <Users className="h-5 w-5" />,
    color: 'green',
    articles: [
      { title: 'Admitting a new student', content: 'Go to Students → Add Student. The 4-step wizard covers:\n• Step 1: Admission number (auto-generated), class, education level, NEMIS, transport option\n• Step 2: Personal details — photo, DOB, gender, blood group, county, special needs\n• Step 3: Parent/Guardian — link existing parent, create new parent with portal access, or skip\n• Step 4: Account — email, password, phone, address\n\nThe admission number is auto-generated in the format STD{YEAR}XXXX and can be edited by admin.' },
      { title: 'Editing student information', content: 'Go to Students, find the student, and click the Edit icon. You can update all details including class, NEMIS number, CBE education level, county, medical conditions, and emergency contacts.' },
      { title: 'Linking a student to a parent', content: 'When adding a student, Step 3 of the wizard lets you search for an existing parent by name or phone, or create a new parent inline. The parent can also be linked later via the Parents section.' },
    ],
  },
  {
    category: 'Finance & Fees',
    icon: <DollarSign className="h-5 w-5" />,
    color: 'yellow',
    articles: [
      { title: 'Recording a fee payment', content: 'Go to Finance → Fee Payments. Click "Record Payment", select the student, enter the amount, choose payment method (M-Pesa, cash, bank transfer, cheque, etc.) and enter the transaction reference. A receipt is generated automatically.' },
      { title: 'M-Pesa payment details', content: 'Paybill Number: 522533\nAccount Number: 8071524\n\nParents can pay directly via M-Pesa. After payment, the finance officer records it in the system using the M-Pesa transaction code as the reference. The payment is linked to the student\'s fee account.' },
      { title: 'Generating fee invoices', content: 'Go to Finance → Invoices. Click "Generate Invoice" for a student or bulk-generate for a whole class. Invoices show fee structures, amounts paid, and balance due. They can be printed or emailed.' },
    ],
  },
  {
    category: 'Transport',
    icon: <Bus className="h-5 w-5" />,
    color: 'purple',
    articles: [
      { title: 'Setting up transport routes', content: 'Go to Transport → Routes. Create a route with name, vehicle registration, and pickup stops. Then assign a driver user account to the route from the driver management section.' },
      { title: 'How the driver app works', content: 'Drivers log in with the Driver role. They see their assigned route and student list grouped by pickup stop. For each student they can mark: Picked Up, Dropped Off, Not Found, or Absent. GPS coordinates are recorded automatically.\n\nEach action immediately notifies the student\'s parent, class teacher, and admin.' },
      { title: 'Parent "Child Left Home" feature', content: 'On the parent dashboard Transport widget, parents can tap "My child has already left home" before the bus arrives. This alerts the driver and admin so they know to wait or investigate if the student is not found at the stop.\n\nIf the driver marks the student as "Not Found" after the parent confirmed they left home, an urgent alert is sent to all parties.' },
    ],
  },
  {
    category: 'Procurement',
    icon: <Package className="h-5 w-5" />,
    color: 'orange',
    articles: [
      { title: 'Procurement workflow overview', content: 'The procurement module follows this workflow:\n1. Purchase Request (PR) — teacher/staff raises a request\n2. Request for Quotation (RFQ) — admin sends RFQ to suppliers\n3. Quotations — suppliers submit prices\n4. Purchase Order (PO) — approved order sent to selected supplier\n5. Goods Received Note (GRN) — items received and logged\n6. Invoice — supplier invoice matched to PO\n7. Payment — payment processed and recorded\n\nAll steps are tracked with full audit trail.' },
    ],
  },
  {
    category: 'CBE Academics',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'indigo',
    articles: [
      { title: 'CBE grading scale explained', content: 'Skul Manager uses Kenya\'s official CBE grading:\n• EE — Exceeding Expectations (≥80%)\n• ME — Meeting Expectations (60–79%)\n• AE — Approaching Expectations (40–59%)\n• BE — Below Expectations (<40%)\n\nFor Pre-Primary (PP1, PP2, Playgroup):\n• WD — Well Developed\n• D — Developing\n• B — Beginning\n\nGrades are computed automatically from marks entered.' },
      { title: 'Entering SBA marks', content: 'Go to Academics → SBA. Select the strand, class, and assessment. A grid appears with all students. Enter each student\'s marks (0–100). The system computes the CBE grade automatically. Save to record the assessment.' },
      { title: 'Generating CBE report cards', content: 'Go to Academics → Report Cards. Select the term and class. The system compiles all SBA and exam results per strand and generates a CBE-compliant report card. Reports can be printed per student or exported as PDF.' },
    ],
  },
  {
    category: 'Analytics & Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'teal',
    articles: [
      { title: 'Attendance analytics', content: 'Go to Attendance → Reports. Filter by class, date range, or individual student. View daily, weekly, and monthly attendance rates. Export to PDF or CSV. Absence notifications can be sent to parents directly from this page.' },
      { title: 'CBE analytics dashboard', content: 'Go to Analytics → CBE Analytics. View competency heatmaps per strand, grade distribution charts, class performance comparisons, and individual student trajectories. Drill down by strand, subject, or education level.' },
    ],
  },
  {
    category: 'Security & Access',
    icon: <Shield className="h-5 w-5" />,
    color: 'red',
    articles: [
      { title: 'User roles explained', content: 'Skul Manager has 6 roles:\n• Admin — full system access\n• Teacher — academic records, attendance, SBA, lesson plans\n• Student — own results, timetable, learning materials\n• Parent — children\'s progress, fees, transport, alerts\n• Finance Officer — fee management, invoices, payments\n• Driver — transport route and pickup tracking\n\nEach role sees only what is relevant to them.' },
      { title: 'Changing passwords', content: 'Go to Profile (top-right menu) → Change Password. Enter your current password, new password (min 8 characters), and confirm. Click Save. For forgotten passwords use the login page "Forgot Password" link.' },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  teal:   'bg-teal-100 text-teal-700',
  red:    'bg-red-100 text-red-700',
};

export function DocumentationPage() {
  useSEO({
    title: 'User Documentation | SkulManager Help Center',
    description: 'Browse SkulManager\'s documentation — guides for school registration, CBE academics, fees, M-Pesa payments, transport, library, procurement and more.',
    path: '/docs',
  });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ cat: string; article: any } | null>(null);

  const filtered = DOCS.map(cat => ({
    ...cat,
    articles: cat.articles.filter(
      a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.articles.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">User Documentation</h1>
          </div>
          <p className="text-blue-100 max-w-xl">Step-by-step guides for every feature in Skul Manager. Find answers to how the system works and how to get the most out of it.</p>
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Search documentation…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {selected ? (
          /* Article view */
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to all articles
            </button>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{selected.cat}</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{selected.article.title}</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                {selected.article.content}
              </div>
            </div>
          </div>
        ) : (
          /* Category list */
          <div className="space-y-8">
            {filtered.map(cat => (
              <div key={cat.category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${COLOR_MAP[cat.color]}`}>
                    {cat.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{cat.category}</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {cat.articles.map(article => (
                    <button
                      key={article.title}
                      onClick={() => setSelected({ cat: cat.category, article })}
                      className="text-left bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{article.title}</p>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.content.slice(0, 100)}…</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No articles found for "{search}"</p>
                <p className="text-sm mt-1">Try a different search term or <button onClick={() => setSearch('')} className="text-blue-500 hover:underline">clear search</button>.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
