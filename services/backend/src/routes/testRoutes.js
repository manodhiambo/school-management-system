import express from 'express';
import { testConnection } from '../config/database.js';

const router = express.Router();

router.get('/db-connection', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.status(200).json({
      success: true,
      message: 'Database connection test',
      connected: isConnected
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

router.get('/endpoints', (req, res) => {
  res.status(200).json({
    success: true,
    modules: {
      authentication: {
        base: '/api/v1/auth',
        endpoints: [
          'POST /register', 'POST /login', 'POST /logout', 
          'POST /refresh-token', 'GET /me', 'POST /change-password'
        ]
      },
      students: {
        base: '/api/v1/students',
        endpoints: [
          'GET /', 'POST /', 'GET /:id', 'PUT /:id', 
          'DELETE /:id', 'POST /bulk-import'
        ]
      },
      teachers: {
        base: '/api/v1/teachers',
        endpoints: [
          'GET /', 'POST /', 'GET /:id', 'PUT /:id', 
          'GET /:id/schedule', 'POST /:id/attendance'
        ]
      },
      parents: {
        base: '/api/v1/parents',
        endpoints: [
          'GET /', 'POST /', 'GET /:id', 'POST /:id/link-student',
          'GET /:id/dashboard'
        ]
      },
      academic: {
        base: '/api/v1/academic',
        endpoints: [
          'GET /subjects', 'POST /subjects', 'GET /classes',
          'POST /exams', 'POST /results'
        ]
      },
      attendance: {
        base: '/api/v1/attendance',
        endpoints: [
          'POST /mark', 'POST /mark/bulk', 'GET /',
          'GET /statistics', 'GET /defaulters'
        ]
      },
      fee: {
        base: '/api/v1/fee',
        endpoints: [
          'GET /structure', 'POST /invoice', 'POST /payment',
          'GET /defaulters', 'GET /statistics'
        ]
      },
      timetable: {
        base: '/api/v1/timetable',
        endpoints: [
          'GET /', 'POST /', 'GET /periods', 'POST /substitutions',
          'POST /auto-generate'
        ]
      },
      communication: {
        base: '/api/v1/communication',
        endpoints: [
          'POST /messages', 'GET /notifications', 'POST /announcements',
          'POST /ptm'
        ]
      },
      admin: {
        base: '/api/v1/admin',
        endpoints: [
          'GET /settings', 'PUT /settings', 'GET /dashboard',
          'GET /audit-logs'
        ]
      }
    }
  });
});

export default router;
