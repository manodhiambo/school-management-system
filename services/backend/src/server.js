import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { runMigrations } from './database/runMigrations.js';
import { authLimiter, apiLimiter, registrationLimiter } from './middleware/rateLimiter.js';

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
import counselingRoutes from './routes/counselingRoutes.js';
import announcementsRoutes from './routes/announcementsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import feeReminderRoutes from './routes/feeReminderRoutes.js';
import examAnalyticsRoutes from './routes/examAnalyticsRoutes.js';
import nemisRoutes from './routes/nemisRoutes.js';
import hostelMgmtRoutes from './routes/hostelMgmtRoutes.js';
import canteenRoutes from './routes/canteenRoutes.js';
import bursaryRoutes from './routes/bursaryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import smsKeywordRoutes from './routes/smsKeywordRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import termReportsRoutes from './routes/termReportsRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import { autoAuditMiddleware } from './middleware/autoAuditMiddleware.js';

dotenv.config();

const app = express();

// CORS configuration - allow production domain
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://skulmanager.org',
  'https://www.skulmanager.org',
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
  contentSecurityPolicy: false, // managed by frontend
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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

app.use('/api/v1/superadmin', superadminRoutes);
app.use('/api/v1/registration', registrationLimiter, schoolRegistrationRoutes);

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

async function startServer() {
  try {
    await testConnection();
    await runMigrations();
  } catch (err) {
    console.error('Startup error (migrations may be incomplete):', err.message);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

export default app;
