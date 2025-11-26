import express from 'express';
import feeController from '../controllers/feeController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';
import mpesaService from '../services/mpesaService.js';
import ApiResponse from '../utils/ApiResponse.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ==================== VALIDATION SCHEMAS ====================
const createFeeStructureSchema = Joi.object({
  body: Joi.object({
    classId: schemas.id.optional(),
    name: Joi.string().required(),
    description: Joi.string().optional(),
    amount: Joi.number().min(0).required(),
    frequency: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time').required(),
    dueDay: Joi.number().min(1).max(31).default(10),
    lateFeeAmount: Joi.number().min(0).default(0),
    lateFeePerDay: Joi.number().min(0).default(0),
    gracePeriodDays: Joi.number().min(0).default(0),
    isMandatory: Joi.boolean().default(true),
    academicYear: Joi.string().required()
  })
});

const updateFeeStructureSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    amount: Joi.number().min(0).optional(),
    frequency: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time').optional(),
    dueDay: Joi.number().min(1).max(31).optional(),
    lateFeeAmount: Joi.number().min(0).optional(),
    lateFeePerDay: Joi.number().min(0).optional(),
    gracePeriodDays: Joi.number().min(0).optional(),
    isMandatory: Joi.boolean().optional(),
    isActive: Joi.boolean().optional()
  })
});

const createDiscountSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('percentage', 'fixed').required(),
    value: Joi.number().min(0).required(),
    applicableTo: Joi.string().valid('all', 'specific').default('all'),
    description: Joi.string().optional()
  })
});

const applyDiscountSchema = Joi.object({
  body: Joi.object({
    studentId: schemas.id,
    discountId: schemas.id,
    reason: Joi.string().optional(),
    validFrom: schemas.date.optional(),
    validUntil: schemas.date.optional()
  })
});

const generateInvoiceSchema = Joi.object({
  body: Joi.object({
    studentId: schemas.id,
    month: Joi.date().required()
  })
});

const recordPaymentSchema = Joi.object({
  body: Joi.object({
    invoiceId: schemas.id,
    paymentMethod: Joi.string().valid('cash', 'cheque', 'card', 'upi', 'net_banking', 'wallet', 'mpesa', 'other').required(),
    transactionId: Joi.string().optional(),
    amount: Joi.number().min(0).required(),
    bankName: Joi.string().optional(),
    chequeNumber: Joi.string().optional(),
    chequeDate: schemas.date.optional(),
    remarks: Joi.string().optional()
  })
});

const mpesaPaymentSchema = Joi.object({
  body: Joi.object({
    invoiceId: Joi.string().uuid().required(),
    phoneNumber: Joi.string().pattern(/^(\+?254|0)?[17]\d{8}$/).required().messages({
      'string.pattern.base': 'Please provide a valid Kenyan phone number'
    }),
    amount: Joi.number().min(1).required()
  })
});

// All routes require authentication (except M-Pesa callback)
router.use((req, res, next) => {
  // Skip authentication for M-Pesa callback
  if (req.path === '/mpesa/callback') {
    return next();
  }
  return authenticate(req, res, next);
});

// ==================== M-PESA ROUTES ====================

// Initiate M-Pesa STK Push payment (accessible by parent)
router.post(
  '/mpesa/pay',
  requireRole(['admin', 'parent']),
  validateRequest(mpesaPaymentSchema),
  async (req, res, next) => {
    try {
      const { invoiceId, phoneNumber, amount } = req.body;
      const result = await mpesaService.initiateSTKPush(invoiceId, phoneNumber, amount, req.user.id);
      
      res.status(200).json(
        new ApiResponse(200, result, 'M-Pesa payment initiated. Check your phone.')
      );
    } catch (error) {
      next(error);
    }
  }
);

// M-Pesa callback (no authentication required - called by Safaricom)
router.post('/mpesa/callback', async (req, res) => {
  try {
    logger.info('M-Pesa callback received');
    const result = await mpesaService.handleCallback(req.body);
    
    // Always respond with success to Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    logger.error('M-Pesa callback error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
});

// Query M-Pesa transaction status
router.get(
  '/mpesa/status/:checkoutRequestId',
  requireRole(['admin', 'parent']),
  async (req, res, next) => {
    try {
      const result = await mpesaService.queryTransactionStatus(req.params.checkoutRequestId);
      res.status(200).json(
        new ApiResponse(200, result, 'Transaction status retrieved')
      );
    } catch (error) {
      next(error);
    }
  }
);

// Get M-Pesa transaction details
router.get(
  '/mpesa/transaction/:transactionId',
  requireRole(['admin', 'parent']),
  async (req, res, next) => {
    try {
      const transaction = await mpesaService.getTransaction(req.params.transactionId);
      res.status(200).json(
        new ApiResponse(200, transaction, 'Transaction retrieved')
      );
    } catch (error) {
      next(error);
    }
  }
);

// Get all M-Pesa transactions for a student
router.get(
  '/mpesa/student/:studentId',
  requireRole(['admin', 'parent', 'teacher']),
  async (req, res, next) => {
    try {
      const transactions = await mpesaService.getStudentTransactions(req.params.studentId);
      res.status(200).json(
        new ApiResponse(200, transactions, 'Transactions retrieved')
      );
    } catch (error) {
      next(error);
    }
  }
);

// ==================== FEE STRUCTURE ROUTES ====================
router.post(
  '/structure',
  requireRole(['admin']),
  validateRequest(createFeeStructureSchema),
  feeController.createFeeStructure
);

router.get(
  '/structure',
  requireRole(['admin', 'teacher']),
  feeController.getFeeStructures
);

router.get(
  '/structure/:id',
  requireRole(['admin', 'teacher']),
  feeController.getFeeStructureById
);

router.put(
  '/structure/:id',
  requireRole(['admin']),
  validateRequest(updateFeeStructureSchema),
  feeController.updateFeeStructure
);

// ==================== DISCOUNT ROUTES ====================
router.post(
  '/discount',
  requireRole(['admin']),
  validateRequest(createDiscountSchema),
  feeController.createDiscount
);

router.post(
  '/discount/apply',
  requireRole(['admin']),
  validateRequest(applyDiscountSchema),
  feeController.applyDiscountToStudent
);

// ==================== INVOICE ROUTES ====================
router.post(
  '/invoice',
  requireRole(['admin']),
  validateRequest(generateInvoiceSchema),
  feeController.generateInvoice
);

router.get(
  '/invoice',
  requireRole(['admin', 'teacher', 'parent']),
  feeController.getInvoices
);

router.get(
  '/invoice/:id',
  requireRole(['admin', 'teacher', 'parent']),
  feeController.getInvoiceById
);

// ==================== PAYMENT ROUTES ====================
router.post(
  '/payment',
  requireRole(['admin']),
  validateRequest(recordPaymentSchema),
  feeController.recordPayment
);

router.get(
  '/payment',
  requireRole(['admin', 'teacher', 'parent']),
  feeController.getPayments
);

// ==================== REPORTS ROUTES ====================
router.get(
  '/defaulters',
  requireRole(['admin', 'teacher']),
  feeController.getDefaulters
);

router.get(
  '/statistics',
  requireRole(['admin']),
  feeController.getFeeStatistics
);

// Student fee account route
router.get(
  '/student/:studentId',
  requireRole(['admin', 'teacher', 'parent', 'student']),
  feeController.getStudentFeeAccount
);

export default router;
