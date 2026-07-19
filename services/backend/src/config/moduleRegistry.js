// Toggleable feature modules that a superadmin can enable/disable per tenant.
// `key` must match the values stored in tenants.disabled_modules and the
// keys checked by the requireModule() middleware on each route group.
export const MODULE_REGISTRY = [
  { key: 'academics', label: 'Academics (CBE, IGCSE, Portfolios, Schemes)' },
  { key: 'exams', label: 'Exams & Gradebook' },
  { key: 'finance', label: 'Finance (Fees, Budgets, Bursary, Purchase Orders)' },
  { key: 'library', label: 'Library' },
  { key: 'transport', label: 'Transport (incl. Driver Tracking)' },
  { key: 'health', label: 'Health Records' },
  { key: 'discipline', label: 'Discipline & Counseling' },
  { key: 'hostel', label: 'Hostel Management' },
  { key: 'canteen', label: 'Canteen' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'school_store', label: 'School Store (POS)' },
  { key: 'maintenance', label: 'Maintenance Management' },
  { key: 'communication', label: 'Communication (SMS, WhatsApp, Announcements, Messages)' },
  { key: 'staff', label: 'Staff Management (Payroll, Appraisals, Leave, Substitutes)' },
  { key: 'timetable', label: 'Timetable' },
  { key: 'teacher_checkin', label: 'Teacher Check-in' },
  { key: 'nemis', label: 'NEMIS Integration' },
  { key: 'admissions', label: 'Online Admission' }
];

export const MODULE_KEYS = MODULE_REGISTRY.map((m) => m.key);

export const isModuleKey = (key) => MODULE_KEYS.includes(key);
