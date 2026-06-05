import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'en' | 'sw';

const translations: Record<string, Record<Lang, string>> = {
  dashboard:       { en: 'Dashboard',         sw: 'Dashibodi' },
  students:        { en: 'Students',           sw: 'Wanafunzi' },
  teachers:        { en: 'Teachers',           sw: 'Walimu' },
  parents:         { en: 'Parents',            sw: 'Wazazi' },
  attendance:      { en: 'Attendance',         sw: 'Mahudhurio' },
  fees:            { en: 'Fees',               sw: 'Ada' },
  assignments:     { en: 'Assignments',        sw: 'Kazi za Nyumbani' },
  exams:           { en: 'Exams',              sw: 'Mitihani' },
  results:         { en: 'Results',            sw: 'Matokeo' },
  timetable:       { en: 'Timetable',          sw: 'Ratiba' },
  welcome:         { en: 'Welcome',            sw: 'Karibu' },
  login:           { en: 'Sign In',            sw: 'Ingia' },
  logout:          { en: 'Sign Out',           sw: 'Toka' },
  settings:        { en: 'Settings',           sw: 'Mipangilio' },
  profile:         { en: 'My Profile',         sw: 'Wasifu Wangu' },
  save:            { en: 'Save',               sw: 'Hifadhi' },
  cancel:          { en: 'Cancel',             sw: 'Ghairi' },
  delete:          { en: 'Delete',             sw: 'Futa' },
  edit:            { en: 'Edit',               sw: 'Hariri' },
  add:             { en: 'Add',                sw: 'Ongeza' },
  search:          { en: 'Search',             sw: 'Tafuta' },
  loading:         { en: 'Loading...',         sw: 'Inapakia...' },
  error:           { en: 'Error',              sw: 'Hitilafu' },
  submit:          { en: 'Submit',             sw: 'Wasilisha' },
  approve:         { en: 'Approve',            sw: 'Idhini' },
  reject:          { en: 'Reject',             sw: 'Kataa' },
  pending:         { en: 'Pending',            sw: 'Inasubiri' },
  approved:        { en: 'Approved',           sw: 'Imeidhinishwa' },
  rejected:        { en: 'Rejected',           sw: 'Imekataliwa' },
  balance:         { en: 'Balance',            sw: 'Salio' },
  amount:          { en: 'Amount',             sw: 'Kiasi' },
  date:            { en: 'Date',               sw: 'Tarehe' },
  name:            { en: 'Name',               sw: 'Jina' },
  class:           { en: 'Class',              sw: 'Darasa' },
  subject:         { en: 'Subject',            sw: 'Somo' },
  marks:           { en: 'Marks',              sw: 'Alama' },
  grade:           { en: 'Grade',              sw: 'Daraja' },
  absent:          { en: 'Absent',             sw: 'Hayupo' },
  present:         { en: 'Present',            sw: 'Yuko' },
  late:            { en: 'Late',               sw: 'Amechelewa' },
  health:          { en: 'Health',             sw: 'Afya' },
  transport:       { en: 'Transport',          sw: 'Usafiri' },
  library:         { en: 'Library',            sw: 'Maktaba' },
  communication:   { en: 'Communication',      sw: 'Mawasiliano' },
  announcements:   { en: 'Announcements',      sw: 'Matangazo' },
  my_children:     { en: 'My Children',        sw: 'Watoto Wangu' },
  fee_payment:     { en: 'Fee Payment',        sw: 'Malipo ya Ada' },
  progress:        { en: 'Progress',           sw: 'Maendeleo' },
  alerts:          { en: 'Alerts',             sw: 'Tahadhari' },
  my_courses:      { en: 'My Courses',         sw: 'Masomo Yangu' },
  my_results:      { en: 'My Results',         sw: 'Matokeo Yangu' },
  my_fees:         { en: 'My Fees',            sw: 'Ada Zangu' },
  portfolio:       { en: 'Portfolio',          sw: 'Mkoba wa Kazi' },
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
