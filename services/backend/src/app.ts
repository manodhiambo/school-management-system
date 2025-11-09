import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import studentRoutes from './routes/student';
import teacherRoutes from './routes/teacher';
import attendanceRoutes from './routes/attendance';
import feeRoutes from './routes/fee';
import academicRoutes from './routes/academic';
import communicationRoutes from './routes/communication';
import reportRoutes from './routes/report';
import adminRoutes from './routes/admin';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fee', feeRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error handler must be last
app.use(errorHandler);

export default app;
