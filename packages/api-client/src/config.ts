export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
} as const;

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh-token',
    me: '/auth/me',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password/:token',
    mfa: {
      enable: '/auth/mfa/enable',
      verify: '/auth/mfa/verify'
    },
    impersonate: '/auth/impersonate/:userId'
  },
  students: {
    list: '/students',
    create: '/students',
    get: '/students/:id',
    update: '/students/:id',
    delete: '/students/:id',
    status: '/students/:id/status',
    bulkImport: '/students/bulk-import',
    attendance: '/students/:id/attendance',
    academicReport: '/students/:id/academic-report',
    finance: '/students/:id/finance',
    documents: '/students/:id/documents',
    promote: '/students/:id/promote',
    timetable: '/students/:id/timetable',
    behavior: '/students/:id/behavior'
  },
  teachers: {
    list: '/teachers',
    create: '/teachers',
    get: '/teachers/:id',
    update: '/teachers/:id',
    delete: '/teachers/:id',
    assignClass: '/teachers/:id/assign-class',
    schedule: '/teachers/:id/schedule',
    leave: '/teachers/:id/leave',
    attendance: '/teachers/:id/attendance',
    available: '/teachers/available'
  },
  parents: {
    create: '/parents',
    get: '/parents/:id',
    update: '/parents/:id',
    children: '/parents/:id/children',
    linkStudent: '/parents/:id/link-student',
    payments: '/parents/:id/payments',
    notifications: '/parents/:id/notifications'
  },
  academy: {
    subjects: {
      list: '/subjects',
      create: '/subjects',
      update: '/subjects/:id',
      delete: '/subjects/:id'
    },
    classes: {
      list: '/classes',
      create: '/classes',
      sections: '/classes/:id/sections',
      addSection: '/classes/:id/sections'
    },
    exams: {
      list: '/exams',
      create: '/exams',
      get: '/exams/:id',
      results: '/exams/:id/results',
      updateResult: '/exams/:examId/students/:studentId/result'
    },
    gradebook: '/gradebook',
    reports: '/reports/generate',
    curriculum: {
      topics: '/curriculum/topics',
      subject: '/curriculum/:subjectId',
      complete: '/curriculum/topics/:id/complete'
    }
  },
  attendance: {
    mark: '/attendance/mark',
    class: '/attendance/class/:classId/date/:date',
    student: '/attendance/student/:studentId',
    monthly: '/attendance/student/:studentId/monthly/:month',
    report: '/attendance/report',
    biometric: '/attendance/import/biometric',
    statistics: '/attendance/statistics/:studentId'
  },
  fee: {
    structure: '/fee/structure',
    student: '/fee/student/:studentId',
    payment: '/fee/payment',
    online: '/fee/payment/online',
    receipt: '/fee/receipt/:paymentId',
    defaulters: '/fee/defaulters',
    reminders: '/fee/reminders',
    analytics: '/fee/analytics'
  },
  timetable: {
    generate: '/timetable/generate',
    class: '/timetable/class/:classId',
    teacher: '/timetable/teacher/:teacherId',
    room: '/timetable/room/:roomId',
    exam: '/timetable/exam',
    substitute: '/timetable/substitute',
    conflicts: '/timetable/conflicts'
  },
  communication: {
    messages: '/messages',
    send: '/messages',
    inbox: '/messages',
    sent: '/messages/sent',
    read: '/messages/:id/read',
    broadcast: '/messages/broadcast',
    ptm: '/messages/parent-teacher-meeting',
    notifications: '/notifications',
    markRead: '/notifications/:id/read',
    sms: '/sms/send',
    email: '/email/send'
  },
  reporting: {
    enrollment: '/reports/enrollment',
    attendance: '/reports/attendance',
    finance: '/reports/finance',
    academic: '/reports/academic',
    teacher: '/reports/teacher-performance',
    custom: '/reports/custom',
    export: '/reports/export'
  },
  admin: {
    settings: '/admin/settings',
    sessions: '/admin/sessions',
    currentSession: '/admin/sessions/current',
    staff: '/admin/staff',
    salary: '/admin/staff/salary',
    payroll: '/admin/staff/payroll/:teacherId',
    inventory: '/admin/inventory',
    issue: '/admin/inventory/issue',
    auditLogs: '/admin/audit-logs'
  }
} as const;
