import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'en' | 'sw';

const translations: Record<string, Record<Lang, string>> = {
  // ── UI actions ──────────────────────────────────────────────────────────────
  welcome:              { en: 'Welcome',                sw: 'Karibu' },
  login:                { en: 'Sign In',                sw: 'Ingia' },
  logout:               { en: 'Sign Out',               sw: 'Toka' },
  save:                 { en: 'Save',                   sw: 'Hifadhi' },
  cancel:               { en: 'Cancel',                 sw: 'Ghairi' },
  delete:               { en: 'Delete',                 sw: 'Futa' },
  edit:                 { en: 'Edit',                   sw: 'Hariri' },
  add:                  { en: 'Add',                    sw: 'Ongeza' },
  search:               { en: 'Search',                 sw: 'Tafuta' },
  loading:              { en: 'Loading...',              sw: 'Inapakia...' },
  error:                { en: 'Error',                  sw: 'Hitilafu' },
  submit:               { en: 'Submit',                 sw: 'Wasilisha' },
  approve:              { en: 'Approve',                sw: 'Idhini' },
  reject:               { en: 'Reject',                 sw: 'Kataa' },
  pending:              { en: 'Pending',                sw: 'Inasubiri' },
  approved:             { en: 'Approved',               sw: 'Imeidhinishwa' },
  rejected:             { en: 'Rejected',               sw: 'Imekataliwa' },
  balance:              { en: 'Balance',                sw: 'Salio' },
  amount:               { en: 'Amount',                 sw: 'Kiasi' },
  date:                 { en: 'Date',                   sw: 'Tarehe' },
  name:                 { en: 'Name',                   sw: 'Jina' },
  class:                { en: 'Class',                  sw: 'Darasa' },
  subject:              { en: 'Subject',                sw: 'Somo' },
  marks:                { en: 'Marks',                  sw: 'Alama' },
  grade:                { en: 'Grade',                  sw: 'Daraja' },
  absent:               { en: 'Absent',                 sw: 'Hayupo' },
  present:              { en: 'Present',                sw: 'Yuko' },
  late:                 { en: 'Late',                   sw: 'Amechelewa' },
  progress:             { en: 'Progress',               sw: 'Maendeleo' },
  alerts:               { en: 'Alerts',                 sw: 'Tahadhari' },

  // ── Sidebar nav — People ─────────────────────────────────────────────────
  'Dashboard':          { en: 'Dashboard',              sw: 'Dashibodi' },
  'Students':           { en: 'Students',               sw: 'Wanafunzi' },
  'Student Report':     { en: 'Student Report',         sw: 'Ripoti ya Mwanafunzi' },
  'Teachers':           { en: 'Teachers',               sw: 'Walimu' },
  'Parents':            { en: 'Parents',                sw: 'Wazazi' },
  'User Management':    { en: 'User Management',        sw: 'Usimamizi wa Watumiaji' },

  // ── Sidebar nav — Academic ───────────────────────────────────────────────
  'Classes & Rooms':    { en: 'Classes & Rooms',        sw: 'Madarasa na Vyumba' },
  'Learning Areas':     { en: 'Learning Areas',         sw: 'Maeneo ya Kujifunza' },
  'Schemes of Work':    { en: 'Schemes of Work',        sw: 'Mpango wa Kazi' },
  'Attendance':         { en: 'Attendance',             sw: 'Mahudhurio' },
  'CBE Assessments':    { en: 'CBE Assessments',        sw: 'Tathmini za CBE' },
  'CBE Report Cards':   { en: 'CBE Report Cards',       sw: 'Ripoti za CBE' },
  'CBE Analytics':      { en: 'CBE Analytics',          sw: 'Takwimu za CBE' },
  'Projects':           { en: 'Projects',               sw: 'Miradi' },
  'Promotion':          { en: 'Promotion',              sw: 'Kupanda Darasa' },
  'Academic Calendar':  { en: 'Academic Calendar',      sw: 'Kalenda ya Masomo' },
  'My Classes':         { en: 'My Classes',             sw: 'Madarasa Yangu' },
  'Grade Book':         { en: 'Grade Book',             sw: 'Kitabu cha Alama' },
  'Lesson Plans':       { en: 'Lesson Plans',           sw: 'Mipango ya Somo' },
  'SBA Marks':          { en: 'SBA Marks',              sw: 'Alama za SBA' },
  'Exams':              { en: 'Exams',                  sw: 'Mitihani' },
  'My Exams':           { en: 'My Exams',               sw: 'Mitihani Yangu' },
  'My Courses':         { en: 'My Courses',             sw: 'Masomo Yangu' },
  'My Attendance':      { en: 'My Attendance',          sw: 'Mahudhurio Yangu' },
  'My Results':         { en: 'My Results',             sw: 'Matokeo Yangu' },
  'Learning Materials': { en: 'Learning Materials',     sw: 'Vifaa vya Kujifunza' },
  'IGCSE Results':      { en: 'IGCSE Results',          sw: 'Matokeo ya IGCSE' },
  'Exam Analytics':     { en: 'Exam Analytics',         sw: 'Takwimu za Mitihani' },
  'Term Reports':       { en: 'Term Reports',           sw: 'Ripoti za Muhula' },
  'NEMIS Export':       { en: 'NEMIS Export',           sw: 'Usafirishaji wa NEMIS' },
  'My Portfolio':       { en: 'My Portfolio',           sw: 'Mkoba wa Kazi' },

  // ── Sidebar nav — Finance ────────────────────────────────────────────────
  'Finance Overview':   { en: 'Finance Overview',       sw: 'Muhtasari wa Fedha' },
  'Income & Expenses':  { en: 'Income & Expenses',      sw: 'Mapato na Matumizi' },
  'Budgets':            { en: 'Budgets',                sw: 'Bajeti' },
  'Vendors & POs':      { en: 'Vendors & POs',          sw: 'Wasambazaji na Amri' },
  'Bank Accounts':      { en: 'Bank Accounts',          sw: 'Akaunti za Benki' },
  'Petty Cash':         { en: 'Petty Cash',             sw: 'Pesa Ndogo' },
  'Assets':             { en: 'Assets',                 sw: 'Mali' },
  'Financial Reports':  { en: 'Financial Reports',      sw: 'Ripoti za Fedha' },
  'Financial Years':    { en: 'Financial Years',        sw: 'Miaka ya Fedha' },
  'Fee Management':     { en: 'Fee Management',         sw: 'Usimamizi wa Ada' },
  'Fee Structure':      { en: 'Fee Structure',          sw: 'Muundo wa Ada' },
  'Extra Fees':         { en: 'Extra Fees',             sw: 'Ada za Ziada' },
  'My Fees':            { en: 'My Fees',                sw: 'Ada Zangu' },
  'Fee Reminders':      { en: 'Fee Reminders',          sw: 'Vikumbusho vya Ada' },
  'Bursary':            { en: 'Bursary',                sw: 'Bursari' },
  'Inventory':          { en: 'Inventory',              sw: 'Hesabu ya Mali' },
  'Payroll':            { en: 'Payroll',                sw: 'Mishahara' },
  'My Payslips':        { en: 'My Payslips',            sw: 'Vocha za Mishahara' },

  // ── Sidebar nav — Family ─────────────────────────────────────────────────
  'My Children':        { en: 'My Children',            sw: 'Watoto Wangu' },
  'Children Progress':  { en: 'Children Progress',      sw: 'Maendeleo ya Watoto' },
  'Fee Payments':       { en: 'Fee Payments',           sw: 'Malipo ya Ada' },
  'My Alerts':          { en: 'My Alerts',              sw: 'Tahadhari Zangu' },
  'My Transport':       { en: 'My Transport',           sw: 'Usafiri Wangu' },

  // ── Sidebar nav — Schedule ───────────────────────────────────────────────
  'Timetable':          { en: 'Timetable',              sw: 'Ratiba' },
  'My Timetable':       { en: 'My Timetable',           sw: 'Ratiba Yangu' },
  'Assignments':        { en: 'Assignments',            sw: 'Kazi za Nyumbani' },
  'P-T Meetings':       { en: 'P-T Meetings',           sw: 'Mikutano ya Wazazi' },

  // ── Sidebar nav — Welfare ────────────────────────────────────────────────
  'Discipline':         { en: 'Discipline',             sw: 'Nidhamu' },
  'Health':             { en: 'Health',                 sw: 'Afya' },
  'Staff Leave':        { en: 'Staff Leave',            sw: 'Likizo ya Wafanyakazi' },
  'Transport':          { en: 'Transport',              sw: 'Usafiri' },
  'Transport Tracking': { en: 'Transport Tracking',     sw: 'Ufuatiliaji wa Usafiri' },
  'My Route':           { en: 'My Route',               sw: 'Njia Yangu' },
  'Teacher Check-in':   { en: 'Teacher Check-in',       sw: 'Kuingia kwa Mwalimu' },
  'Counseling':         { en: 'Counseling',             sw: 'Ushauri' },
  'Hostel Management':  { en: 'Hostel Management',      sw: 'Usimamizi wa Bweni' },
  'Canteen':            { en: 'Canteen',                sw: 'Mkahawa' },
  'Canteen Balance':    { en: 'Canteen Balance',        sw: 'Salio la Mkahawa' },
  'Appraisals':         { en: 'Appraisals',             sw: 'Tathmini za Utendaji' },
  'My Appraisal':       { en: 'My Appraisal',           sw: 'Tathmini Yangu' },
  'Substitutes':        { en: 'Substitutes',            sw: 'Wabadala' },

  // ── Sidebar nav — Security ───────────────────────────────────────────────
  'Gate Manager':       { en: 'Gate Manager',           sw: 'Msimamizi wa Lango' },
  'Gate Dashboard':     { en: 'Gate Dashboard',         sw: 'Dashibodi ya Lango' },
  'Visitor Log':        { en: 'Visitor Log',            sw: 'Kumbukumbu ya Wageni' },

  // ── Sidebar nav — Messages ───────────────────────────────────────────────
  'Communication':      { en: 'Communication',          sw: 'Mawasiliano' },
  'Messages':           { en: 'Messages',               sw: 'Ujumbe' },
  'Notifications':      { en: 'Notifications',          sw: 'Arifa' },
  'Announcements':      { en: 'Announcements',          sw: 'Matangazo' },
  'SMS Messaging':      { en: 'SMS Messaging',          sw: 'Ujumbe wa SMS' },
  'WhatsApp':           { en: 'WhatsApp',               sw: 'WhatsApp' },
  'Two-Way SMS':        { en: 'Two-Way SMS',            sw: 'SMS ya Njia Mbili' },

  // ── Sidebar nav — Library ────────────────────────────────────────────────
  'Library Catalog':       { en: 'Library Catalog',     sw: 'Orodha ya Maktaba' },
  'My Borrowed Books':     { en: 'My Borrowed Books',   sw: 'Vitabu Nilivyokopa' },
  'Issue / Return':        { en: 'Issue / Return',      sw: 'Toa / Rudisha' },
  'Library Management':    { en: 'Library Management',  sw: 'Usimamizi wa Maktaba' },
  'Library Members':       { en: 'Library Members',     sw: 'Wanachama wa Maktaba' },

  // ── Sidebar nav — Account ────────────────────────────────────────────────
  'Audit Log':          { en: 'Audit Log',              sw: 'Kumbukumbu ya Shughuli' },
  'Settings':           { en: 'Settings',               sw: 'Mipangilio' },
  'My Profile':         { en: 'My Profile',             sw: 'Wasifu Wangu' },

  // ── Sidebar section headers ──────────────────────────────────────────────
  'People':             { en: 'People',                 sw: 'Watu' },
  'Academic':           { en: 'Academic',               sw: 'Masomo' },
  'Finance':            { en: 'Finance',                sw: 'Fedha' },
  'Family':             { en: 'Family',                 sw: 'Familia' },
  'Schedule':           { en: 'Schedule',               sw: 'Ratiba' },
  'Welfare':            { en: 'Welfare',                sw: 'Ustawi' },
  'Security':           { en: 'Security',               sw: 'Usalama' },
  'Library':            { en: 'Library',                sw: 'Maktaba' },
  'Account':            { en: 'Account',                sw: 'Akaunti' },

  // ── legacy keys kept for backward compatibility ──────────────────────────
  dashboard:            { en: 'Dashboard',              sw: 'Dashibodi' },
  students:             { en: 'Students',               sw: 'Wanafunzi' },
  teachers:             { en: 'Teachers',               sw: 'Walimu' },
  parents:              { en: 'Parents',                sw: 'Wazazi' },
  attendance:           { en: 'Attendance',             sw: 'Mahudhurio' },
  fees:                 { en: 'Fees',                   sw: 'Ada' },
  assignments:          { en: 'Assignments',            sw: 'Kazi za Nyumbani' },
  exams:                { en: 'Exams',                  sw: 'Mitihani' },
  results:              { en: 'Results',                sw: 'Matokeo' },
  timetable:            { en: 'Timetable',              sw: 'Ratiba' },
  health:               { en: 'Health',                 sw: 'Afya' },
  transport:            { en: 'Transport',              sw: 'Usafiri' },
  library:              { en: 'Library',                sw: 'Maktaba' },
  communication:        { en: 'Communication',          sw: 'Mawasiliano' },
  announcements:        { en: 'Announcements',          sw: 'Matangazo' },
  my_children:          { en: 'My Children',            sw: 'Watoto Wangu' },
  fee_payment:          { en: 'Fee Payment',            sw: 'Malipo ya Ada' },
  my_courses:           { en: 'My Courses',             sw: 'Masomo Yangu' },
  my_results:           { en: 'My Results',             sw: 'Matokeo Yangu' },
  my_fees:              { en: 'My Fees',                sw: 'Ada Zangu' },
  portfolio:            { en: 'Portfolio',              sw: 'Mkoba wa Kazi' },
  settings:             { en: 'Settings',               sw: 'Mipangilio' },
  profile:              { en: 'My Profile',             sw: 'Wasifu Wangu' },
};

interface LanguageStore {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string) => string;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      t: (key: string) => {
        const lang = get().language;
        return translations[key]?.[lang] ?? key.replace(/_/g, ' ');
      },
    }),
    { name: 'skulmanager-language' }
  )
);
