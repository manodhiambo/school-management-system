require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Middleware (simplified, no Socket.io for now)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'School Management API', version: '1.0.0' });
});

// Add the critical auth route directly
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (password === 'password123') {
    const role = email.includes('admin') ? 'admin' : 'teacher';
    res.json({
      success: true,
      data: {
        accessToken: 'demo-jwt-token',
        user: { id: '1', email, firstName: email.split('@')[0], lastName: 'User', role, isActive: true, createdAt: new Date().toISOString() }
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/v1/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  
  res.json({
    success: true,
    data: { id: '1', email: 'admin@school.com', firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true, createdAt: new Date().toISOString() }
  });
});

app.get('/api/v1/dashboard/stats', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  
  res.json({ success: true, data: { totalStudents: 450, totalTeachers: 35, totalClasses: 42, recentMessages: 12 } });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Demo API endpoints ready`);
});
