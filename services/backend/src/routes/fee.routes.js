const express = require('express');
const router = express.Router();
const FeeController = require('../controllers/fee.controller');
const { requireRole } = require('../middleware/auth.middleware');

const requireAdmin = requireRole(['admin']);
const requireAdminOrAccountant = requireRole(['admin', 'accountant']);

// Fee structure management - admin only
router.post('/structure', requireAdmin, FeeController.createFeeStructure);
router.get('/structure', requireAdminOrAccountant, FeeController.getFeeStructure);

// Student fee accounts
router.get('/student/:studentId', requireAdminOrAccountant, FeeController.getStudentFeeAccount);

// Payments
router.post('/payment', requireAdminOrAccountant, FeeController.recordPayment);
router.post('/payment/online', FeeController.processOnlinePayment);
router.get('/receipt/:paymentId', requireAdminOrAccountant, FeeController.generateReceipt);

// Reports and analytics
router.get('/defaulters', requireAdminOrAccountant, FeeController.getFeeDefaulters);
router.get('/analytics', requireAdmin, FeeController.getFeeAnalytics);

// Webhooks for payment gateways (public)
router.post('/webhook/:provider', express.raw({ type: 'application/json' }), FeeController.handleWebhook);

module.exports = router;
