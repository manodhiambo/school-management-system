import express from 'express';
import feeController from '../controllers/feeController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
    paymentMethod: Joi.string().valid('cash', 'cheque', 'card', 'upi', 'net_banking', 'wallet', 'other').required(),
    transactionId: Joi.string().optional(),
    amount: Joi.number().min(0).required(),
    bankName: Joi.string().optional(),
    chequeNumber: Joi.string().optional(),
    chequeDate: schemas.date.optional(),
    remarks: Joi.string().optional()
  })
});

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
