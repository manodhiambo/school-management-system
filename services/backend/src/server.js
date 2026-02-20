import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';

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

// Import routes with different naming
import classesRoutes from './routes/classes.routes.js';
import subjectsRoutes from './routes/subjects.routes.js';
import examsRoutes from './routes/exams.routes.js';
import onlineExamRoutes from './routes/onlineExam.routes.js';
import offlineResultsRoutes from './routes/offlineResults.routes.js';
import cbcAnalyticsRoutes from './routes/cbcAnalytics.routes.js';

dotenv.config();

const app = express();

// CORS configuration - allow production domain
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://skulmanager.org',
    'https://www.skulmanager.org'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Test database connection
testConnection();

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fee', feeRoutes);
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
app.use('/api/v1/cbc-analytics', cbcAnalyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
