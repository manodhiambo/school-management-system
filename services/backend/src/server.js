import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { runMigrations } from './database/runMigrations.js';
import { authLimiter, apiLimiter } from './middleware/rateLimiter.js';
import { startTenantExpiryJob } from './jobs/tenantExpiryJob.js';
import { startDemoResetJob } from './jobs/demoResetJob.js';
import { startPeriodReminderJob } from './jobs/periodReminderJob.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import gradebookRoutes from './routes/gradebookRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import libraryRoutes from './routes/libraryRoutes.js';
import messageRoutes from './routes/simpleMessageRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import schoolRegistrationRoutes from './routes/schoolRegistrationRoutes.js';
import cronRoutes from './routes/cronRoutes.js';

// Import routes with different naming
import classesRoutes from './routes/classes.routes.js';
import subjectsRoutes from './routes/subjects.routes.js';
import examsRoutes from './routes/exams.routes.js';
import onlineExamRoutes from './routes/onlineExam.routes.js';
import offlineResultsRoutes from './routes/offlineResults.routes.js';
import cbeAnalyticsRoutes from './routes/cbcAnalytics.routes.js';

// New comprehensive Kenya CBE routes
import cbeRoutes from './routes/cbcRoutes.js';
import parentAlertsRoutes from './routes/parentAlertsRoutes.js';
import disciplineRoutes from './routes/disciplineRoutes.js';
import transportRoutes from './routes/transportRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import academicsModuleRoutes from './routes/academicsModuleRoutes.js';
import staffLeaveRoutes from './routes/staffLeaveRoutes.js';
import extraFeesRoutes from './routes/extraFeesRoutes.js';
import igcseRoutes from './routes/igcseRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import teacherCheckinRoutes from './routes/teacherCheckinRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import gateRoutes from './routes/gateRoutes.js';
import meetingsRoutes from './routes/meetingsRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import appraisalRoutes from './routes/appraisalRoutes.js';
import substituteRoutes from './routes/substituteRoutes.js';
import mpesaCallbackRouter from './routes/mpesaCallbackRoutes.js';
import intasendWebhookRoutes from './routes/intasendWebhookRoutes.js';
import intasendConfigRoutes from './routes/intasendConfigRoutes.js';
import counselingRoutes from './routes/counselingRoutes.js';
import announcementsRoutes from './routes/announcementsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import feeReminderRoutes from './routes/feeReminderRoutes.js';
import examAnalyticsRoutes from './routes/examAnalyticsRoutes.js';
import nemisRoutes from './routes/nemisRoutes.js';
import hostelMgmtRoutes from './routes/hostelMgmtRoutes.js';
import canteenRoutes from './routes/canteenRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import admissionsRoutes from './routes/admissionsRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import alumniRoutes from './routes/alumniRoutes.js';
import bursaryRoutes from './routes/bursaryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import smsKeywordRoutes from './routes/smsKeywordRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import termReportsRoutes from './routes/termReportsRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import studentCategoryRoutes from './routes/studentCategoryRoutes.js';
import { autoAuditMiddleware } from './middleware/autoAuditMiddleware.js';

dotenv.config();

const app = express();

// Both Vercel and Render sit the app behind a reverse proxy that sets
// X-Forwarded-For. Without `trust proxy`, Express's default is not to trust
// that header, and express-rate-limit throws a ValidationError on every
// request as a result (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
//
// Trusting a fixed hop count (e.g. 1) is wrong here: Vercel's edge network
// adds more than one hop, so `trust proxy: 1` resolved req.ip to an internal
// Vercel address shared by many unrelated users, which collapsed everyone
// into the same rate-limit bucket and caused mass false-positive 429s.
// `true` trusts the whole chain and takes the left-most (original client)
// entry, which is also what buildAuditContext.js already does independently
// for audit-log IPs — this makes the two agree, and is safe because Vercel
// (like Render) is the sole ingress: nothing can reach this process without
// passing through the platform's own proxy first, so a client can't spoof
// its way past it.
app.set('trust proxy', true);

// CORS configuration — CORS_ORIGIN is a comma-separated list of allowed
// origins (set in the deploy environment); always allow local dev origins
// too so `npm run dev` keeps working regardless of what's configured there.
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];
const ALLOWED_ORIGINS = [
  ...DEV_ORIGINS,
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : ['https://skulmanager.org', 'https://www.skulmanager.org']),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Security headers
app.use(helmet({
  // This API only ever serves JSON, but keep a CSP for the rare HTML response
  // (error pages, the /health route) as defense-in-depth — the real CSP for
  // app content lives in the frontend's index.html meta tag since that's what
  // actually renders untrusted-adjacent content.
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 25mb accommodates the admissions public apply form, which can carry up to
// 5 base64-encoded document uploads (3MB raw each, larger once base64-inflated).
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Global API rate limiter
app.use('/api/', apiLimiter);

// Test database connection, then await migrations before the server listens
// (Neon DDL via direct connection can take a few seconds — don't race requests against it)

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Auto-audit: log all successful mutations (POST/PUT/PATCH/DELETE) by authenticated users
app.use('/api/v1', autoAuditMiddleware);

// M-Pesa callback — must be registered BEFORE authenticate middleware (Safaricom sends no Bearer token)
app.use('/api/v1/fee/mpesa', mpesaCallbackRouter);
app.use('/api/v1/fee/intasend/webhook', intasendWebhookRoutes);

// API routes — auth gets a strict rate limiter (10 reqs / 15 min per IP)
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fee', feeRoutes);
app.use('/api/v1/extra-fees', extraFeesRoutes);
app.use('/api/v1/exams', examsRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/v1/admin', dashboardRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/gradebook', gradebookRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/settings/intasend-config', intasendConfigRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/finance/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/online-exams', onlineExamRoutes);
app.use('/api/v1/offline-results', offlineResultsRoutes);
app.use('/api/v1/cbe-analytics', cbeAnalyticsRoutes);

// Comprehensive Kenya CBE routes
app.use('/api/v1/cbe', cbeRoutes);
app.use('/api/v1/parent-alerts', parentAlertsRoutes);
app.use('/api/v1/discipline', disciplineRoutes);
app.use('/api/v1/transport', transportRoutes);
app.use('/api/v1/health', healthRoutes);

// Comprehensive CBE Academics Module
app.use('/api/v1/academics', academicsModuleRoutes);

// Staff Leave / Permission Requests
app.use('/api/v1/staff-leave', staffLeaveRoutes);

// IGCSE (Cambridge International) Module
app.use('/api/v1/igcse', igcseRoutes);

// Driver / transport tracking / teacher check-in / SMS
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/checkin', teacherCheckinRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/gate', gateRoutes);

// Parent-Teacher Meetings, Payroll, Appraisals, Substitutes, Counseling
app.use('/api/v1/meetings', meetingsRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/appraisals', appraisalRoutes);
app.use('/api/v1/substitutes', substituteRoutes);
app.use('/api/v1/counseling', counselingRoutes);

// New features: Announcements, Audit Log, Fee Reminders, Exam Analytics, NEMIS
app.use('/api/v1/announcements', announcementsRoutes);
app.use('/api/v1/audit-log', auditLogRoutes);
app.use('/api/v1/fee-reminders', feeReminderRoutes);
app.use('/api/v1/exam-analytics', examAnalyticsRoutes);
app.use('/api/v1/nemis', nemisRoutes);

// Hostel Management, Canteen, Bursary, Inventory
app.use('/api/v1/hostel-mgmt', hostelMgmtRoutes);
app.use('/api/v1/canteen', canteenRoutes);
app.use('/api/v1/school-store', storeRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/admissions', admissionsRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/alumni', alumniRoutes);
app.use('/api/v1/bursary', bursaryRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// WhatsApp, Two-Way SMS, Portfolio, Term Reports, Preferences
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/sms-keywords', smsKeywordRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/term-reports', termReportsRoutes);
app.use('/api/v1/preferences', preferencesRoutes);

// Procurement Module
app.use('/api/v1/procurement', procurementRoutes);

app.use('/api/v1/student-categories', studentCategoryRoutes);

app.use('/api/v1/superadmin', superadminRoutes);
// registrationLimiter is applied per-route inside schoolRegistrationRoutes.js (only to
// /register, /deposit, /renew) rather than to the whole router here — /check-activation
// is polled routinely by logged-in dashboards (TrialBanner) and /mpesa/callback is an
// inbound Safaricom webhook shared across every tenant's payments; neither should share a
// 3-req/hour budget meant for actual registration attempts.
app.use('/api/v1/registration', schoolRegistrationRoutes);

// Cron-triggered jobs (Vercel Cron in production; node-cron drives the same
// exported job functions directly when running as a persistent process —
// see startBackgroundJobs() below). Not behind the JWT auth middleware —
// requireCronSecret inside cronRoutes.js is what protects these.
app.use('/api/v1/cron', cronRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Something went wrong!';
  if (status < 500) {
    res.status(status).json({ success: false, message });
  } else {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;

// Running on Vercel: no persistent process, so none of this belongs at
// module load. Migrations run as a deliberate, one-off `npm run migrate`
// step (see services/backend/README) rather than on every cold start —
// running DDL against Neon's direct endpoint on every cold start would slow
// every cold invocation and risks exhausting Neon's direct-connection limit
// under a burst of simultaneous cold starts. The three node-cron jobs are
// likewise replaced by Vercel Cron hitting /api/v1/cron/* (see vercel.json
// and cronRoutes.js) since there's no long-lived process for node-cron to
// schedule inside.
async function startServer() {
  try {
    await testConnection();
    await runMigrations();
  } catch (err) {
    console.error('Startup error (migrations may be incomplete):', err.message);
  }
  startTenantExpiryJob();
  startDemoResetJob();
  startPeriodReminderJob();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
