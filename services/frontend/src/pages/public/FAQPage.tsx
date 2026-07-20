import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';

const FAQS = [
  {
    category: 'Pricing & Payment',
    items: [
      { q: 'How much does Skul Manager cost?', a: 'Skul Manager has a one-time setup fee of KSh 100,000, which covers your full first year of access. From Year 2 onwards, an annual renewal of KSh 40,000 per year keeps your system maintained and your database active.' },
      { q: 'Is there a free trial?', a: 'Yes — every school gets a 5-day free trial when they register. No payment is needed to start. You get full access to all modules during the trial so you can explore the system before committing.' },
      { q: 'How do I pay?', a: 'Payments are made via M-Pesa:\n• Paybill: 522533\n• Account Number: 8071524\n\nAfter paying, call us on 0110 421 320 or email info@helvino.org with your school name and M-Pesa transaction code to activate your account.' },
      { q: 'What happens when the trial ends?', a: 'At the end of your 5-day trial you will be prompted to activate your account. Your school data is preserved — you do not need to re-enter anything. Pay via M-Pesa and contact us to activate.' },
      { q: 'Are all modules included in the price?', a: 'Yes. All 24+ modules are included in the price — students, teachers, parents, finance, CBE academics, transport, procurement, library, health records, discipline, hostels, SMS, analytics, and more. There are no per-module fees.' },
    ],
  },
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I register my school?', a: 'Click "Register Your School" on the homepage. Fill in your school name, county, admin email, and password. Your 5-day trial starts instantly.' },
      { q: 'Can multiple people use the system at the same time?', a: 'Yes. You can create unlimited user accounts for admins, teachers, finance officers, students, parents, and drivers. Each user logs in with their own credentials and sees only what their role allows.' },
      { q: 'Do parents and students need their own accounts?', a: 'Yes, each parent and student gets their own login. When you admit a student, you can create a portal account for them in the same wizard. Parents can then log in to see their child\'s attendance, results, fees, and transport status in real time.' },
    ],
  },
  {
    category: 'CBE & Curriculum',
    items: [
      { q: 'Is Skul Manager aligned with Kenya\'s CBE curriculum?', a: 'Yes. Skul Manager is built specifically for Kenya\'s Competency-Based Education (CBE) curriculum. It supports all education levels from Playgroup and Pre-Primary through Lower Primary, Junior Secondary (Grade 7–9), and Senior Secondary. It uses the official CBE grading: EE, ME, AE, BE.' },
      { q: 'Does it support NEMIS numbers?', a: 'Yes. The student admission form includes a NEMIS number field. You can record and update NEMIS numbers for all students.' },
      { q: 'Can it generate CBC report cards?', a: 'Yes. Skul Manager generates CBE-compliant report cards that show strand-based competency grades, teacher remarks, and the principal\'s comments. Reports can be exported as PDF.' },
    ],
  },
  {
    category: 'Admissions, Alumni & Timetable',
    items: [
      { q: 'Can parents apply online without visiting the school?', a: 'Yes. Every school gets a unique, shareable application link (e.g. skulmanager.org/apply/YOURCODE). Parents fill in the applicant\'s details, upload documents like the birth certificate and KCPE results directly from their phone, pay the application fee via M-Pesa, and track their application status — all without visiting the school. Walk-in or phoned-in applicants can also be entered by staff directly.' },
      { q: 'Can the timetable be generated automatically?', a: 'Yes. Skul Manager can auto-generate a full weekly timetable for every class in one click, based on each class\'s assigned subjects, teachers, and weekly period counts. It automatically avoids double-booking any teacher or class and spreads subjects across the week — similar to dedicated timetabling software, without the manual setup.' },
      { q: 'Does Skul Manager support alumni management?', a: 'Yes. Schools can build an alumni directory, run reunions and networking events, host a job board, and track donations (including M-Pesa for cash gifts) — with a self-service portal so alumni can update their own profile and connect with the school.' },
    ],
  },
  {
    category: 'Data & Security',
    items: [
      { q: 'Is my school\'s data safe?', a: 'Yes. Each school\'s data is fully isolated in a separate database tenant — no other school can access your data. All connections are encrypted (HTTPS). Role-based access ensures each user only sees what is relevant to them.' },
      { q: 'Where is the data stored?', a: 'Data is stored on Neon PostgreSQL cloud database infrastructure in the US-West region with automatic backups. The system is hosted on Render cloud servers.' },
      { q: 'Can we migrate our existing student data?', a: 'Yes. Our onboarding team can help you import existing student records from Excel or CSV. Contact us on 0110 421 320 to arrange a data migration session.' },
    ],
  },
  {
    category: 'Technical',
    items: [
      { q: 'Do we need to install anything?', a: 'No. Skul Manager is fully cloud-based. It runs in any modern web browser (Chrome, Firefox, Edge, Safari) on a computer, tablet, or smartphone. No installation is required.' },
      { q: 'Does it work on mobile phones?', a: 'Yes. The interface is responsive and works well on smartphones. The Driver Dashboard and Parent Transport Widget are specifically optimised for mobile use.' },
      { q: 'What happens if the internet goes down?', a: 'For exam results, teachers can use the offline result entry feature to save marks locally and sync when connectivity returns. Other features require an internet connection.' },
    ],
  },
];

export function FAQPage() {
  useSEO({
    title: 'Frequently Asked Questions | SkulManager',
    description: 'Answers to common questions about SkulManager pricing, M-Pesa payments, CBE curriculum support, data security, and getting started.',
    path: '/faq',
  });

  // FAQPage structured data from the real Q&A content on this page, richer
  // than the static 5-question schema in index.html which only covers "/".
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.flatMap(cat => cat.items).map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-teal-700 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-green-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-green-100 max-w-xl">Quick answers to the most common questions about Skul Manager.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {FAQS.map(section => (
          <div key={section.category} className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{section.category}</h2>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = section.category + i;
                const isOpen = open === key;
                return (
                  <div key={i} className={`bg-white rounded-xl border transition-all ${isOpen ? 'border-green-300 shadow-sm' : 'border-gray-100'}`}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-green-600 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mt-4">
          <p className="font-semibold text-green-800 mb-1">Still have questions?</p>
          <p className="text-green-700 text-sm mb-4">Our team is happy to help. Reach us by phone, WhatsApp, or email.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:0110421320">
              <Button className="bg-green-600 hover:bg-green-700"><Phone className="mr-2 h-4 w-4" /> Call 0110 421 320</Button>
            </a>
            <a href="mailto:info@helvino.org">
              <Button variant="outline" className="border-green-300 text-green-700">Email info@helvino.org</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
