import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle,
  UserCheck,
  BarChart3,
  Phone,
  Mail,
  Star,
  Award,
  Globe,
  Zap,
} from 'lucide-react';

/* ─── Pexels photos — Black African / Kenyan school life ─── */
const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const PHOTOS = {
  // Wide hero — African children in school uniform, classroom
  hero:       px(8943074, 1400),
  // Students in uniform — Kenya / East Africa
  students1:  px(8167393, 700),
  // Group of African students studying together
  students2:  px(5212345, 700),
  // African classroom interior with children at desks
  classroom:  px(8943151, 700),
  // Black African teacher with young pupils
  teacher:    px(8471997, 700),
  // Kenyan school building / campus exterior
  building:   px(1643383, 700),
  // African children in outdoor school environment
  outdoor:    px(8943047, 700),
  // African children reading / school library
  library:    px(1550337, 700),
  // African school graduation / prize-giving
  graduation: px(7659564, 700),
};

const FEATURES = [
  { icon: <Users className="h-7 w-7 text-blue-600" />,   title: 'Student Management',     desc: 'Comprehensive student records, CBC tracking, and performance analytics for every learner.' },
  { icon: <BookOpen className="h-7 w-7 text-green-600" />, title: 'Kenya CBC Curriculum',   desc: 'Full CBC grading (EE/ME/AE/BE), strand-based learning, and competency reports for all levels.' },
  { icon: <Calendar className="h-7 w-7 text-purple-600" />,title: 'Smart Scheduling',        desc: 'Automated timetable generation, exam scheduling and conflict-free allocation.' },
  { icon: <TrendingUp className="h-7 w-7 text-orange-600"/>,title: 'Finance & Fees',         desc: 'M-Pesa-integrated fee collection, budget tracking, and automated payment reminders.' },
  { icon: <Shield className="h-7 w-7 text-red-600" />,    title: 'Secure & Role-Based',     desc: 'Military-grade role access for Admin, Teacher, Student, Parent and Finance Officer.' },
  { icon: <BarChart3 className="h-7 w-7 text-indigo-600"/>,title: 'Real-Time Analytics',    desc: 'Live dashboards, attendance rates, grade distributions, and CBC competency heatmaps.' },
];

const ROLES = [
  {
    role: 'Admin', gradient: 'from-red-500 to-rose-600', icon: <Shield className="h-10 w-10 text-white" />,
    items: ['Manage Students, Teachers & Parents', 'Finance & Budget Oversight', 'CBC Analytics Dashboard', 'User Roles & Permissions', 'System Settings & Audit Logs'],
  },
  {
    role: 'Teachers', gradient: 'from-blue-500 to-cyan-600', icon: <GraduationCap className="h-10 w-10 text-white" />,
    items: ['Record Attendance & CBC Grades', 'Create Online & Offline Exams', 'Manage Class Assignments', 'View Timetable & My Classes', 'Communicate with Parents'],
  },
  {
    role: 'Students', gradient: 'from-green-500 to-emerald-600', icon: <BookOpen className="h-10 w-10 text-white" />,
    items: ['Take Online CBC Exams', 'View Results & CBC Grades', 'Submit Assignments', 'Check Fees & Timetable', 'Message Teachers'],
  },
  {
    role: 'Parents', gradient: 'from-purple-500 to-violet-600', icon: <UserCheck className="h-10 w-10 text-white" />,
    items: ["Monitor Child's CBC Progress", 'View Attendance & Results', 'Track Fee Payments', 'Receive School Notifications', "View Upcoming Exams"],
  },
];

const STATS = [
  { label: 'Students Managed',  value: '10,000+', icon: <Users className="h-6 w-6" /> },
  { label: 'Schools Using',     value: '50+',     icon: <Globe className="h-6 w-6" /> },
  { label: 'CBC Subjects',      value: '200+',    icon: <BookOpen className="h-6 w-6" /> },
  { label: 'Uptime Guaranteed', value: '99.9%',   icon: <Zap className="h-6 w-6" /> },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Skul Manager
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#roles"    className="hover:text-blue-600 transition-colors">For Schools</a>
            <a href="#gallery"  className="hover:text-blue-600 transition-colors">Gallery</a>
            <a href="#contact"  className="hover:text-blue-600 transition-colors">Contact</a>
          </nav>
          <Button onClick={() => navigate('/login')} className="group bg-blue-600 hover:bg-blue-700">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
        {/* Background hero image with dark overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('${PHOTOS.hero}')` }}
        />
        {/* Kenya-flag inspired color bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-black to-green-600" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Text */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium text-blue-200 mb-6 border border-white/20">
                <Star className="h-4 w-4 text-yellow-400" />
                Kenya's #1 School Management Platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Empowering<br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Kenya's Future
                </span><br />
                Through Education
              </h1>
              <p className="text-lg text-blue-100 mb-8 max-w-lg leading-relaxed">
                A complete, cloud-based school management system built for Kenya's CBC curriculum —
                managing students, teachers, fees, exams, and parent communication all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base px-8 group"
                  onClick={() => navigate('/login')}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 text-base px-8"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore Features
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 text-sm text-blue-200">
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" /> CBC Aligned</div>
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" /> M-Pesa Ready</div>
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" /> Cloud Hosted</div>
              </div>
            </div>

            {/* Photo mosaic */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <img
                  src={PHOTOS.students1}
                  alt="Kenyan students in school uniform"
                  className="w-full h-48 object-cover rounded-2xl shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = PHOTOS.classroom; }}
                />
                <img
                  src={PHOTOS.teacher}
                  alt="Teacher with students in class"
                  className="w-full h-56 object-cover rounded-2xl shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = PHOTOS.outdoor; }}
                />
              </div>
              <div className="space-y-3 pt-8">
                <img
                  src={PHOTOS.classroom}
                  alt="Modern school classroom"
                  className="w-full h-56 object-cover rounded-2xl shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = PHOTOS.library; }}
                />
                <img
                  src={PHOTOS.students2}
                  alt="Students learning outdoors"
                  className="w-full h-48 object-cover rounded-2xl shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = PHOTOS.graduation; }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-blue-600 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="text-blue-200">{s.icon}</div>
                <div className="text-3xl font-extrabold">{s.value}</div>
                <div className="text-sm text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO GALLERY ── */}
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Life at Kenyan Schools</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Celebrating the vibrant learning culture across Kenya's schools — from classrooms to campuses
            </p>
          </div>

          {/* 5-column photo grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { src: PHOTOS.students1,  alt: 'Kenyan students in uniform',         label: 'Students' },
              { src: PHOTOS.teacher,    alt: 'Dedicated teacher with class',        label: 'Teachers' },
              { src: PHOTOS.classroom,  alt: 'Modern classroom environment',        label: 'Classrooms' },
              { src: PHOTOS.building,   alt: 'School building campus',              label: 'Buildings' },
              { src: PHOTOS.outdoor,    alt: 'Students in outdoor learning',        label: 'Environment' },
            ].map((photo, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl shadow-md aspect-square">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const imgs = [PHOTOS.library, PHOTOS.graduation, PHOTOS.outdoor, PHOTOS.students2, PHOTOS.hero];
                    (e.target as HTMLImageElement).src = imgs[i] || PHOTOS.hero;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-sm font-semibold">{photo.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Wide panoramic row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="overflow-hidden rounded-xl shadow-md h-48">
              <img src={PHOTOS.library}    alt="School library" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="overflow-hidden rounded-xl shadow-md h-48">
              <img src={PHOTOS.graduation} alt="School graduation ceremony" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="overflow-hidden rounded-xl shadow-md h-48">
              <img src={PHOTOS.students2}  alt="Students studying together" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-100 text-blue-700 text-sm font-semibold rounded-full px-4 py-1 mb-4">Platform Features</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything Your School Needs</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Purpose-built for Kenya's CBC education system with every tool to run a modern school
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
              >
                <div className="h-14 w-14 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center mb-4 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold rounded-full px-4 py-1 mb-4">Role-Based Access</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Tailored for Every Role</h2>
            <p className="text-xl text-gray-500">Each user sees only what they need — clean, focused, powerful</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {ROLES.map((r, i) => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className={`bg-gradient-to-br ${r.gradient} p-6`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">{r.role}</h3>
                    {r.icon}
                  </div>
                </div>
                <div className="bg-white p-5 space-y-3">
                  {r.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US — with side image ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full px-4 py-1 mb-5">Why Skul Manager</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Built for Kenyan Schools, by Kenyan Developers</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                We understand the unique challenges faced by Kenyan educational institutions —
                from CBC implementation to M-Pesa fee collection. Skul Manager was designed
                from the ground up to address these specific needs.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Full Kenya CBC curriculum support' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'M-Pesa integrated fee payments' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Offline-capable for low connectivity' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'NEMIS-compatible student records' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'WhatsApp & SMS notifications' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Dedicated local support team' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Real-time analytics dashboards' },
                  { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: '99.9% uptime on Kenyan infrastructure' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700 text-sm">
                    {item.icon}
                    {item.text}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[PHOTOS.students1, PHOTOS.teacher, PHOTOS.students2, PHOTOS.classroom].map((src, i) => (
                    <img key={i} src={src} alt="School user" className="h-10 w-10 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Trusted by 10,000+</span> students &amp; teachers across Kenya
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src={PHOTOS.outdoor}
                alt="Kenyan school students outside"
                className="w-full rounded-3xl shadow-2xl object-cover h-[500px]"
                onError={(e) => { (e.target as HTMLImageElement).src = PHOTOS.hero; }}
              />
              {/* Floating award card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">CBC Compliant</div>
                  <div className="text-xs text-gray-500">Fully aligned with KICD</div>
                </div>
              </div>
              {/* Floating rating card */}
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-900">5.0</span>
                <span className="text-xs text-gray-400">rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ready to Transform Your School?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of Kenyan schools already using Skul Manager to deliver better
            education outcomes every day.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base px-10 group"
              onClick={() => navigate('/login')}
            >
              Start Today — It's Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href="tel:0703445756">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 text-base px-10">
                <Phone className="mr-2 h-4 w-4" />
                Call: 0703 445 756
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
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
                Kenya's most comprehensive school management platform — CBC-aligned, M-Pesa ready,
                and built for every level from Playgroup to Senior Secondary.
              </p>

              {/* Developer credit */}
              <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl p-4 border border-blue-800/30">
                <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-3">Developed &amp; Maintained By</p>
                <p className="text-white font-bold text-lg mb-2">Helvino Technologies Limited</p>
                <div className="space-y-2">
                  <a
                    href="mailto:helvinotechltd@gmail.com"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-blue-400" />
                    helvinotechltd@gmail.com
                  </a>
                  <a
                    href="tel:0703445756"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-blue-400" />
                    0703 445 756
                  </a>
                </div>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {['Student Management', 'CBC Curriculum', 'Finance & Fees', 'Exams & Results', 'Parent Portal', 'Analytics'].map(l => (
                  <li key={l} className="hover:text-white cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {['User Documentation', 'Video Tutorials', 'FAQ', 'Contact Support', 'Privacy Policy', 'Terms of Service'].map(l => (
                  <li key={l} className="hover:text-white cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
              <div className="mt-6 p-3 bg-green-900/30 rounded-lg border border-green-800/30">
                <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  All systems operational
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Skul Manager — <span className="text-gray-400">Helvino Technologies Limited</span>. All rights reserved.</p>
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
