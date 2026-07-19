import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InstallAppButton } from '@/components/InstallAppButton';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  GraduationCap, Users, BookOpen, Calendar, TrendingUp, Shield,
  ArrowRight, CheckCircle, UserCheck, BarChart3, Phone, Mail,
  Star, Award, Globe, Zap, Play, X, Bus, Heart, Package,
  MessageSquare, Library, ClipboardList, Briefcase, DollarSign,
  Bell, MapPin, Activity, FileText, Layers, Clock, ChevronRight,
  Loader2,
} from 'lucide-react';

/* ── Pexels photo helpers ── */
const px  = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const PHOTOS = {
  hero:       px(8943074, 1400),
  students1:  px(8167393, 700),
  students2:  px(5212345, 700),
  classroom:  px(8943151, 700),
  teacher:    px(8471997, 700),
  building:   px(1643383, 700),
  outdoor:    px(8943047, 700),
  library:    px(1550337, 700),
  graduation: px(7659564, 700),
  kids:       px(8471822, 700),
  reading:    px(4260325, 700),
  science:    px(8923944, 700),
};

/* ── Feature categories ── */
const FEATURE_CATS = [
  {
    label: 'Academic Management',
    color: 'blue',
    items: [
      { icon: <Users className="h-5 w-5" />,        title: 'Student Admissions',       desc: 'Full CBE onboarding — NEMIS, birth cert, county, special needs, parent linking, transport in one wizard.' },
      { icon: <GraduationCap className="h-5 w-5" />, title: 'Kenya CBE Curriculum',     desc: 'Strand-based grading (EE/ME/AE/BE), competency tracking, CBC report cards for all levels.' },
      { icon: <ClipboardList className="h-5 w-5" />, title: 'Schemes & Lesson Plans',   desc: 'Weekly schemes of work and lesson plans with objectives, methods, and approval workflow.' },
      { icon: <Activity className="h-5 w-5" />,      title: 'School-Based Assessments', desc: 'SBA mark entry with auto CBE grade computation; mid-term and end-term per strand.' },
      { icon: <FileText className="h-5 w-5" />,      title: 'Exams & Results',          desc: 'Online & offline exams, bulk result entry, controlled publishing to students and parents.' },
      { icon: <Layers className="h-5 w-5" />,        title: 'Projects & Portfolios',    desc: 'Individual and group project management, milestones, submissions, and student portfolios.' },
      { icon: <Calendar className="h-5 w-5" />,      title: 'Timetables',               desc: 'Automated timetable generation with PDF export and printable landscape layout.' },
      { icon: <TrendingUp className="h-5 w-5" />,    title: 'Promotions',               desc: 'Configurable promotion rules, bulk student promotion, and promotion history.' },
      { icon: <Briefcase className="h-5 w-5" />,     title: 'Career Guidance',          desc: 'Career pathways and student profiles for Junior Secondary (Grade 7–9) learners.' },
      { icon: <BookOpen className="h-5 w-5" />,      title: 'Learning Materials',        desc: 'Resource library with file/URL upload, public/private access, and type filtering.' },
    ],
  },
  {
    label: 'Administration & Welfare',
    color: 'emerald',
    items: [
      { icon: <UserCheck className="h-5 w-5" />,     title: 'Teacher Management',       desc: 'Teacher profiles, subjects, class assignments, TSC numbers, and leave requests.' },
      { icon: <Clock className="h-5 w-5" />,         title: 'Teacher Check-In',         desc: 'GPS-enabled teacher check-in with configurable hours, late tracking, and admin reports.' },
      { icon: <CheckCircle className="h-5 w-5" />,   title: 'Attendance Tracking',      desc: 'Daily student and teacher attendance, absence notifications, and analytics.' },
      { icon: <Bus className="h-5 w-5" />,           title: 'Transport Management',     desc: 'Route management, GPS pickup tracking, driver app, and real-time parent alerts.' },
      { icon: <Library className="h-5 w-5" />,       title: 'Library Management',       desc: 'Book catalogue, borrowing records, member management, and overdue tracking.' },
      { icon: <Heart className="h-5 w-5" />,         title: 'Health Records',           desc: 'Student medical profiles, conditions, medications, and emergency auto-notifications.' },
      { icon: <Shield className="h-5 w-5" />,        title: 'Discipline Management',    desc: 'Incident logging, categorisation, and automatic parent notification on creation.' },
      { icon: <Award className="h-5 w-5" />,         title: 'Clubs & Activities',       desc: 'School clubs management with student enrolment and activity tracking.' },
      { icon: <Package className="h-5 w-5" />,       title: 'Hostel / Boarding',        desc: 'Hostel rooms, boarder assignments, and boarding fee tracking.' },
      { icon: <Briefcase className="h-5 w-5" />,     title: 'Procurement & Assets',     desc: 'Full procurement lifecycle: PR → RFQ → Quotation → PO → GRN → Invoice → Payment + Asset register.' },
    ],
  },
  {
    label: 'Finance & Communication',
    color: 'violet',
    items: [
      { icon: <DollarSign className="h-5 w-5" />,    title: 'Fee Management',           desc: 'M-Pesa, cash, bank, cheque — all payment methods with automatic receipts and statements.' },
      { icon: <BarChart3 className="h-5 w-5" />,     title: 'Budget & Expenses',        desc: 'Budget allocation, expense recording, income tracking, and financial dashboards.' },
      { icon: <FileText className="h-5 w-5" />,      title: 'Fee Invoicing',            desc: 'Auto-generated invoices per student, batch processing, and outstanding fee reports.' },
      { icon: <MessageSquare className="h-5 w-5" />, title: 'Internal Messaging',       desc: 'In-app messaging between admin, teachers, students, and parents with sound alerts.' },
      { icon: <Bell className="h-5 w-5" />,          title: 'Parent Alerts',            desc: 'Instant push alerts for fees, results, discipline, health emergencies, and events.' },
      { icon: <Phone className="h-5 w-5" />,         title: 'SMS Broadcasting',         desc: 'Bulk SMS via Africa\'s Talking to all parents, class parents, or custom numbers.' },
      { icon: <Globe className="h-5 w-5" />,         title: 'Multi-School SaaS',        desc: 'Full multi-tenant isolation — every school has its own secure data environment.' },
      { icon: <BarChart3 className="h-5 w-5" />,     title: 'CBE Analytics',            desc: 'Competency heatmaps, strand performance, grade distributions, and attendance rates.' },
      { icon: <MapPin className="h-5 w-5" />,        title: 'GPS & Location',           desc: 'Real-time GPS for transport pickup tracking and teacher check-in location tagging.' },
      { icon: <FileText className="h-5 w-5" />,      title: 'System Blueprint PDF',     desc: 'Auto-generated system blueprint and role-based user manuals downloadable as PDF.' },
    ],
  },
];

/* ── Role cards ── */
const ROLES = [
  {
    role: 'Admin', gradient: 'from-red-500 to-rose-600', icon: <Shield className="h-8 w-8 text-white" />,
    items: ['Full student & staff management', 'Finance & fee oversight', 'CBE analytics dashboard', 'Procurement & assets', 'Transport & hostel', 'System settings & audit logs'],
  },
  {
    role: 'Teachers', gradient: 'from-blue-500 to-cyan-600', icon: <GraduationCap className="h-8 w-8 text-white" />,
    items: ['Record attendance & CBE grades', 'Enter SBA & exam marks', 'Manage schemes & lesson plans', 'View timetable & my classes', 'GPS check-in', 'Communicate with parents'],
  },
  {
    role: 'Students', gradient: 'from-green-500 to-emerald-600', icon: <BookOpen className="h-8 w-8 text-white" />,
    items: ['Take online CBE exams', 'View results & competency grades', 'Access learning materials', 'Check fees & timetable', 'Library borrowings', 'Message teachers'],
  },
  {
    role: 'Parents', gradient: 'from-purple-500 to-violet-600', icon: <UserCheck className="h-8 w-8 text-white" />,
    items: ["Monitor child's CBE progress", 'View attendance & results', 'Track fee payments', 'Real-time transport tracking', 'Receive instant school alerts', 'WhatsApp & SMS notifications'],
  },
  {
    role: 'Finance Officer', gradient: 'from-orange-500 to-amber-600', icon: <DollarSign className="h-8 w-8 text-white" />,
    items: ['Record & track all payments', 'Issue fee invoices', 'Manage budgets & expenses', 'Procurement approvals', 'Financial reports & dashboards', 'M-Pesa reconciliation'],
  },
  {
    role: 'Driver', gradient: 'from-teal-500 to-cyan-700', icon: <Bus className="h-8 w-8 text-white" />,
    items: ['View assigned route & students', 'Mark student pickups with GPS', 'Flag absent or missed students', 'Real-time location sharing', 'Trip history & reports'],
  },
];

/* ── Stats ── */
const STATS = [
  { label: 'Students Managed',   value: '10,000+', icon: <Users className="h-6 w-6" /> },
  { label: 'Schools Using',      value: '50+',     icon: <Globe className="h-6 w-6" /> },
  { label: 'System Modules',     value: '24+',     icon: <Layers className="h-6 w-6" /> },
  { label: 'Uptime Guaranteed',  value: '99.9%',   icon: <Zap className="h-6 w-6" /> },
];

/* ── Gallery photos ── */
const GALLERY = [
  { src: PHOTOS.students1, alt: 'Kenyan students in uniform',        label: 'Students' },
  { src: PHOTOS.teacher,   alt: 'Dedicated teacher with class',      label: 'Teachers' },
  { src: PHOTOS.classroom, alt: 'Modern classroom environment',      label: 'Classrooms' },
  { src: PHOTOS.building,  alt: 'School campus',                     label: 'Campus' },
  { src: PHOTOS.outdoor,   alt: 'Students outdoor learning',         label: 'Learning' },
  { src: PHOTOS.library,   alt: 'School library',                    label: 'Library' },
  { src: PHOTOS.graduation,alt: 'Graduation ceremony',               label: 'Graduation' },
  { src: PHOTOS.kids,      alt: 'Young learners',                    label: 'Playgroup' },
];

/* ── Video showcase photos (4 slides) ── */
const SHOWCASE = [PHOTOS.classroom, PHOTOS.teacher, PHOTOS.students1, PHOTOS.outdoor];

/* ── colour helpers ── */
const catColours: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300 hover:bg-blue-50',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50',
  violet:  'bg-violet-50 text-violet-700 border-violet-100 hover:border-violet-300 hover:bg-violet-50',
};
const catIcon: Record<string, string> = {
  blue:    'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  violet:  'bg-violet-100 text-violet-600',
};

/* ═══════════════════════════════════════════════════════════════════════════ */

const HOMEPAGE_FAQS = [
  {
    q: 'What is the best school management system in Kenya?',
    a: "SkulManager (skulmanager.org) is Kenya's #1 cloud-based school management system, built specifically for the CBC curriculum. It manages students, teachers, fees (M-Pesa integrated), exams, timetables and parent communication all in one platform. Developed by Helvino Technologies Limited, Siaya.",
  },
  {
    q: 'Which school management system supports Kenya CBC curriculum?',
    a: "SkulManager is fully aligned with Kenya's CBC (Competency Based Curriculum). It supports CBC grading (EE, ME, AE, BE), strand-based assessments, CBC report cards, School Based Assessments (SBA), and all education levels from Playgroup to Senior Secondary.",
  },
  {
    q: 'How do I register my school on SkulManager?',
    a: "Visit skulmanager.org and click 'Register Your School'. Fill in your school details and you will receive access credentials. For support contact Helvino Technologies at info@helvino.org or call 0110 421 320.",
  },
  {
    q: 'Does SkulManager support M-Pesa school fee payments?',
    a: 'Yes. SkulManager has built-in M-Pesa integration for fee collection. Schools use Paybill 522533, Account 8071524. Parents can pay fees directly and the system automatically updates student fee records.',
  },
  {
    q: 'Who developed SkulManager?',
    a: 'SkulManager is developed and maintained by Helvino Technologies Limited, based in Siaya, Kenya. Website: helvino.org, Email: info@helvino.org, Phone: 0110 421 320.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showVideo, setShowVideo] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleViewDemo = async () => {
    setDemoLoading(true);
    try {
      const res: any = await api.demoLogin();
      const token = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;
      const demoUser = res?.data?.user;
      if (!token || !demoUser) throw new Error('No token received');
      setAuth(demoUser, token, true, refreshToken);
      navigate('/app/dashboard');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Could not start the live demo — please try again shortly.');
    } finally {
      setDemoLoading(false);
    }
  };

  // Homepage-targeted FAQPage schema (for Google's answer box) — scoped to "/"
  // only via this component, not statically in index.html (which would leak
  // onto every route of this SPA).
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOMEPAGE_FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1)    translate(0,    0);  }
          100% { transform: scale(1.14) translate(-2%, -1%); }
        }
        @keyframes showcaseFade {
          0%,2%   { opacity: 0; }
          8%,78%  { opacity: 1; }
          88%,100%{ opacity: 0; }
        }
        .showcase-slide { animation: showcaseFade 24s infinite; }
        .showcase-slide:nth-child(1) { animation-delay: 0s;  }
        .showcase-slide:nth-child(2) { animation-delay: 6s;  }
        .showcase-slide:nth-child(3) { animation-delay: 12s; }
        .showcase-slide:nth-child(4) { animation-delay: 18s; }
        .ken-burns { animation: kenBurns 24s ease-in-out infinite alternate; }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(250,204,21,.7); }
          70%  { transform: scale(1);   box-shadow: 0 0 0 20px rgba(250,204,21,0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(250,204,21,0); }
        }
        .play-btn { animation: pulse-ring 2.5s ease-out infinite; }
        @keyframes float-card {
          0%,100% { transform: translateY(0);   }
          50%     { transform: translateY(-8px); }
        }
        .float-card { animation: float-card 4s ease-in-out infinite; }
      `}</style>

      {/* ─────────── STICKY HEADER ─────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
              Skul Manager
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#showcase" className="hover:text-blue-600 transition-colors">Tour</a>
            <a href="#features"  className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#roles"     className="hover:text-blue-600 transition-colors">For Schools</a>
            <a href="#pricing"   className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#gallery"   className="hover:text-blue-600 transition-colors">Gallery</a>
            <a href="#contact"   className="hover:text-blue-600 transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <InstallAppButton
              variant="ghost"
              className="hidden lg:inline-flex px-3 text-sm text-gray-600 hover:text-blue-600"
            />
            <Button variant="ghost" onClick={() => navigate('/login')} className="px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hover:text-blue-600">
              Sign In
            </Button>
            <Button onClick={() => navigate('/register')} className="px-2.5 sm:px-4 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 group">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url('${PHOTOS.hero}')` }} />
        {/* Kenya flag stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-black to-green-600" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left: text */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium text-blue-200 mb-6 border border-white/20">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                Kenya's #1 CBE School Management Platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                The School Management<br />
                System That<br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Transforms Kenyan Schools
                </span>
              </h1>
              <p className="text-lg text-blue-100 mb-8 max-w-lg leading-relaxed">
                The complete cloud-based school management system for Kenya — students, teachers, fees,
                exams, CBE curriculum, transport, library, procurement and parent communication,
                all in one secure platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base px-8 group"
                  onClick={() => navigate('/register')}>
                  Register Your School
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base px-8 group"
                  onClick={handleViewDemo} disabled={demoLoading}>
                  {demoLoading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Zap className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />}
                  View Live Demo
                </Button>
                <Button size="lg" variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base px-8 group"
                  onClick={() => { document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <Play className="mr-2 h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
                  Watch Tour
                </Button>
                <InstallAppButton
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base px-8"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 mt-10 text-sm text-blue-200">
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> CBE Aligned</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> M-Pesa Ready</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> NEMIS Compatible</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> Cloud Hosted</div>
              </div>
            </div>

            {/* Right: photo mosaic */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl shadow-2xl h-48">
                  <img src={PHOTOS.students1} alt="Kenyan students" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    onError={e => { (e.target as HTMLImageElement).src = PHOTOS.classroom; }} />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-2xl h-56">
                  <img src={PHOTOS.teacher} alt="Teacher with students" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    onError={e => { (e.target as HTMLImageElement).src = PHOTOS.outdoor; }} />
                </div>
              </div>
              <div className="space-y-3 pt-8">
                <div className="overflow-hidden rounded-2xl shadow-2xl h-56">
                  <img src={PHOTOS.classroom} alt="Modern classroom" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    onError={e => { (e.target as HTMLImageElement).src = PHOTOS.library; }} />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-2xl h-48">
                  <img src={PHOTOS.graduation} alt="School graduation" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    onError={e => { (e.target as HTMLImageElement).src = PHOTOS.students2; }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── STATS STRIP ─────────── */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="text-blue-200">{s.icon}</div>
                <div className="text-3xl font-extrabold">{s.value}</div>
                <div className="text-sm text-blue-200 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── VIDEO SHOWCASE ─────────── */}
      <section id="showcase" className="relative h-[620px] overflow-hidden bg-black">
        {/* Animated photo slides (Ken Burns effect) */}
        {SHOWCASE.map((src, i) => (
          <div key={i} className="showcase-slide absolute inset-0">
            <img
              src={src}
              alt="School life"
              className="ken-burns w-full h-full object-cover opacity-60"
              onError={e => { (e.target as HTMLImageElement).src = PHOTOS.hero; }}
            />
          </div>
        ))}

        {/* Dark + gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

        {/* Kenya flag stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-black to-green-600" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-4">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium border border-white/20 mb-6">
            <Play className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            Platform Tour
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 max-w-3xl leading-tight drop-shadow-lg">
            Skul Manager in<br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl">
            See how Kenya's leading schools manage students, teachers, fees, transport, and CBE learning — all from one platform.
          </p>

          {/* Play button */}
          <button
            onClick={() => setShowVideo(true)}
            className="play-btn w-20 h-20 rounded-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 flex items-center justify-center shadow-2xl transition-colors"
          >
            <Play className="h-8 w-8 fill-gray-900 ml-1" />
          </button>
          <p className="text-white/60 text-sm mt-4">Click to watch the demo</p>

          {/* Bottom module chips */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 flex-wrap px-4">
            {['Students', 'CBE Curriculum', 'Fees & M-Pesa', 'Transport', 'Exams', 'Parent Portal', 'Library', 'Procurement'].map(m => (
              <span key={m} className="bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Video modal */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-yellow-400 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
              <div className="text-center text-white p-12">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-2xl font-bold mb-2">Demo Video Coming Soon</h3>
                <p className="text-gray-400 mb-6">Contact us to schedule a live demo of Skul Manager</p>
                <a href="tel:0110421320">
                  <Button className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold">
                    <Phone className="mr-2 h-4 w-4" /> Call 0110 421 320
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── COMPREHENSIVE FEATURES ─────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-100 text-blue-700 text-sm font-semibold rounded-full px-4 py-1.5 mb-4">24+ Modules</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything Your School Needs</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Purpose-built for Kenya's CBE education system — from playgroup to senior secondary
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 justify-center mb-10 flex-wrap">
            {FEATURE_CATS.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                  activeTab === i
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURE_CATS[activeTab].items.map((f, i) => (
              <div
                key={i}
                className={`group p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default ${catColours[FEATURE_CATS[activeTab].color]}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${catIcon[FEATURE_CATS[activeTab].color]}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Module count banner */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
            <div>
              <p className="text-2xl font-extrabold">30 modules. One platform. One price.</p>
              <p className="text-blue-100 mt-1">All features included — no per-module fees, no hidden charges.</p>
            </div>
            <Button className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold shrink-0"
              onClick={() => navigate('/register')}>
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────── ROLES ─────────── */}
      <section id="roles" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold rounded-full px-4 py-1.5 mb-4">6 User Roles</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Tailored for Every Role</h2>
            <p className="text-xl text-gray-500">Each user sees exactly what they need — clean, focused, and powerful</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {ROLES.map((r, i) => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white">
                <div className={`bg-gradient-to-br ${r.gradient} p-5 flex items-center gap-4`}>
                  <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    {r.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white">{r.role}</h3>
                </div>
                <div className="p-5 space-y-2.5">
                  {r.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CBE HIGHLIGHT ─────────── */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image side */}
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[500px]">
                <img src={PHOTOS.outdoor} alt="Kenya CBE curriculum" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = PHOTOS.hero; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              {/* Floating cards */}
              <div className="float-card absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">CBE Compliant</div>
                  <div className="text-xs text-gray-500">Fully aligned with KICD</div>
                </div>
              </div>
              <div className="float-card absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100"
                style={{ animationDelay: '2s' }}>
                <div className="flex gap-1 mb-1">
                  {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <div className="text-sm font-bold text-gray-900">5.0 Rating</div>
                <div className="text-xs text-gray-500">By school principals</div>
              </div>
            </div>

            {/* Text side */}
            <div className="order-1 lg:order-2">
              <span className="inline-block bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full px-4 py-1.5 mb-5">Kenya CBE Ready</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Built for Kenya's CBE Curriculum, by Kenyans</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Skul Manager is the only school management system built from the ground up for Kenya's
                Competency-Based Education curriculum — from Playgroup to Senior Secondary. Every module
                is Kenya-specific: M-Pesa payments, NEMIS records, CBC report cards, and SMS notifications.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'Full CBE strand-based grading (EE/ME/AE/BE)',
                  'Pre-Primary grading (WD/D/B)',
                  'M-Pesa fee collection built-in',
                  'NEMIS-compatible student records',
                  'CBC competency report cards',
                  'Africa\'s Talking SMS integration',
                  'Kenya county & sub-county fields',
                  'KCPE / KCSE index tracking',
                  'WhatsApp notifications',
                  '47 Kenya counties in student forms',
                  'Offline exam entry for low connectivity',
                  'Dedicated local support team',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── GALLERY ─────────── */}
      <section id="gallery" className="py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Life at Kenyan Schools</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Celebrating the vibrant learning culture in Kenya's schools — from classrooms to campuses
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {GALLERY.map((photo, i) => (
              <div key={i} className={`group relative overflow-hidden rounded-xl shadow-md ${i === 0 || i === 5 ? 'row-span-2' : ''}`}
                style={{ aspectRatio: (i === 0 || i === 5) ? undefined : '1', height: (i === 0 || i === 5) ? '420px' : '200px' }}>
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={e => { (e.target as HTMLImageElement).src = PHOTOS.hero; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-sm font-semibold">{photo.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── PRICING ─────────── */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full px-4 py-1.5 mb-4">Simple Pricing</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Transparent Pricing. Every Feature Included.</h2>
            <p className="text-xl text-gray-500">
              All 24+ modules, unlimited students and teachers — one payment to get started
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* One-time setup */}
            <div className="rounded-2xl border-2 border-gray-200 p-8 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                One-Time Payment
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Setup & Onboarding</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-extrabold text-gray-900">100,000</span>
                <span className="text-gray-500 mb-1">KSH</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">Paid once. Covers full system setup, data migration, staff training — and your first full year of access.</p>
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white mb-8"
                onClick={() => navigate('/register')}>
                Register Your School
              </Button>
              <ul className="space-y-3">
                {[
                  'Full system installation & configuration',
                  'School data setup & migration',
                  'On-site or remote staff training',
                  'Student & parent portal setup',
                  'M-Pesa & SMS integration',
                  'First year of support included',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Annual renewal — highlighted */}
            <div className="relative rounded-2xl border-2 border-blue-600 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                ANNUAL SUBSCRIPTION
              </div>
              <div className="inline-block bg-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                Yearly Renewal
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Annual Licence — From Year 2</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-extrabold">40,000</span>
                <span className="text-blue-200 mb-1">KSH / year</span>
              </div>
              <p className="text-blue-100 text-sm mb-2">Your first year is already covered by the setup fee — from Year 2 onwards, renew annually for KSh 40,000 to keep your system active, maintained, and updated.</p>
              <p className="text-blue-200 text-xs mb-8">Pay via M-Pesa Paybill 522533 · A/C 8071524</p>
              <Button className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold mb-8"
                onClick={() => navigate('/register')}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <ul className="space-y-3">
                {[
                  'All 24+ modules always active',
                  'Unlimited students & teachers',
                  'All future updates & new features',
                  'Priority technical support',
                  'Cloud hosting & backups',
                  'SMS & WhatsApp alerts',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-blue-100">
                    <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary & M-Pesa */}
          <div className="mt-10 max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Total First Year</p>
              <p className="text-3xl font-extrabold text-gray-900">KSH 100,000</p>
              <p className="text-xs text-gray-500 mt-1">One-time setup fee — your first year is fully included. KSh 40,000/year from Year 2.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Pay via M-Pesa</p>
              <div className="flex justify-center gap-6 text-sm">
                <div><p className="text-green-600 font-medium text-xs">Paybill</p><p className="text-xl font-extrabold text-gray-900">522533</p></div>
                <div className="w-px bg-green-200" />
                <div><p className="text-green-600 font-medium text-xs">Account</p><p className="text-xl font-extrabold text-gray-900">8071524</p></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Call 0110 421 320 after payment</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── WHY US ─────────── */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="h-8 w-8 text-blue-600" />,
                title: 'Secure & Reliable',
                desc: 'Military-grade role-based access, encrypted data, HTTPS everywhere, and 99.9% uptime on cloud infrastructure. Your school data is always safe.',
              },
              {
                icon: <Zap className="h-8 w-8 text-yellow-500" />,
                title: 'Fast & Offline-Capable',
                desc: 'Designed for Kenya\'s internet landscape — offline exam entry, quick page loads, and mobile-first design that works on any device, any network.',
              },
              {
                icon: <Users className="h-8 w-8 text-green-600" />,
                title: 'Local Support Team',
                desc: 'Based in Siaya, Kenya. Our team understands the CBE curriculum, Kenya school operations, and provides training and onboarding in Swahili or English.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA BANNER ─────────── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ready to Transform<br />Your School?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of Kenyan schools already using Skul Manager — start your 30-day free trial today, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base px-10 group"
              onClick={() => navigate('/register')}>
              Register Your School Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href="tel:0110421320">
              <Button size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base px-10 w-full sm:w-auto">
                <Phone className="mr-2 h-4 w-4" />
                Call: 0110 421 320
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer id="contact" className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Skul Manager</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                Kenya's most comprehensive school management platform — CBE-aligned, M-Pesa ready,
                built for every level from Playgroup to Senior Secondary.
              </p>

              {/* Developer */}
              <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl p-4 border border-blue-800/30 mb-4">
                <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-3">Developed &amp; Maintained By</p>
                <a href="https://helvino.org" target="_blank" rel="noopener noreferrer"
                  className="text-white font-bold text-lg mb-1 hover:text-blue-300 transition-colors block">
                  Helvino Technologies Limited
                </a>
                <p className="text-xs text-gray-400 mb-3">Siaya, Kenya · <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">helvino.org</a></p>
                <div className="space-y-2">
                  <a href="mailto:info@helvino.org" className="flex items-center gap-2 text-sm text-gray-300 hover:text-blue-400 transition-colors">
                    <Mail className="h-4 w-4 text-blue-400" />info@helvino.org
                  </a>
                  <a href="tel:0110421320" className="flex items-center gap-2 text-sm text-gray-300 hover:text-blue-400 transition-colors">
                    <Phone className="h-4 w-4 text-blue-400" />0110 421 320
                  </a>
                </div>
              </div>

              {/* M-Pesa */}
              <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl p-4 border border-green-800/30">
                <p className="text-xs text-green-300 font-semibold uppercase tracking-wider mb-3">M-Pesa Payment</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Paybill</span>
                    <span className="text-white font-bold tracking-wider">522533</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Account</span>
                    <span className="text-white font-bold tracking-wider">8071524</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-green-900/50">
                    <span className="text-gray-400">Setup</span>
                    <span className="text-green-400 font-bold">KSH 100,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Annual</span>
                    <span className="text-green-400 font-bold">KSH 40,000/yr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {[
                  { label: 'Student Admissions',    path: null },
                  { label: 'Kenya CBE Curriculum',  path: '/features/cbc-academics' },
                  { label: 'Finance & M-Pesa',      path: '/features/fee-management' },
                  { label: 'Exams & Results',       path: '/features/exams-results' },
                  { label: 'Timetable',             path: '/features/timetable' },
                  { label: 'Transport Tracking',    path: '/features/transport' },
                  { label: 'Teacher HR & Payroll',  path: '/features/hr-payroll' },
                  { label: 'Procurement Module',    path: '/features/procurement' },
                  { label: 'SMS Broadcasts',        path: '/features/parent-communication' },
                  { label: 'CBE Analytics',         path: null },
                ].map(l => (
                  <li key={l.label}>
                    {l.path ? (
                      <button onClick={() => navigate(l.path!)} className="hover:text-white transition-colors text-left">{l.label}</button>
                    ) : (
                      <span className="cursor-default">{l.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {[
                  { label: 'User Documentation', path: '/docs' },
                  { label: 'Video Tutorials',    path: '/tutorials' },
                  { label: 'FAQ',                path: '/faq' },
                  { label: 'Contact Support',    path: '/contact' },
                  { label: 'Privacy Policy',     path: '/privacy' },
                  { label: 'Terms of Service',   path: '/terms' },
                ].map(l => (
                  <li key={l.label}>
                    <button onClick={() => navigate(l.path)} className="hover:text-white transition-colors text-left">{l.label}</button>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-3 bg-green-900/30 rounded-lg border border-green-800/30">
                <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  All systems operational
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/30">
                <p className="text-yellow-300 text-xs font-semibold mb-1">30-Day Free Trial</p>
                <p className="text-gray-400 text-xs">No credit card required. Full access to all modules.</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Skul Manager —{' '}
              <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                Helvino Technologies Limited
              </a>, Siaya, Kenya. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs">
              <span>Made with</span>
              <span className="text-red-500">❤</span>
              <span>in Kenya 🇰🇪</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
