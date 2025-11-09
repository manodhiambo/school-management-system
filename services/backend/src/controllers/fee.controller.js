const FeeService = require('../services/fee.service');
const { z } = require('zod');
const logger = require('../utils/logger');

const feeStructureSchema = z.object({
  class_id: z.string().uuid(),
  name: z.string().min(1),
  amount: z.coerce.number().min(0),
  frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  due_day: z.coerce.number().min(1).max(31).default(10),
  late_fee_amount: z.coerce.number().min(0).default(0),
  late_fee_per_day: z.coerce.number().min(0).default(0)
});

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  payment_method: z.enum(['cash', 'cheque', 'card', 'upi', 'net_banking', 'wallet']),
  amount: z.coerce.number().min(0),
  transaction_id: z.string().optional(),
  gateway_response: z.object({}).optional().nullable()
});

const onlinePaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  payment_method: z.enum(['card', 'upi']),
  amount: z.coerce.number().min(0)
});

class FeeController {
  static async createFeeStructure(req, res) {
    try {
      const feeData = feeStructureSchema.parse(req.body);
      const result = await FeeService.createFeeStructure(feeData);
      
      res.status(201).json({
        success: true,
        message: 'Fee structure created successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Create fee structure error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create fee structure' 
      });
    }
  }

  static async getFeeStructure(req, res) {
    try {
      const filters = {
        classId: req.query.classId
      };
      const structures = await FeeService.getFeeStructure(filters);
      
      res.status(200).json({
        success: true,
        data: structures
      });
    } catch (error) {
      logger.error('Get fee structure error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch fee structure' 
      });
    }
  }

  static async getStudentFeeAccount(req, res) {
    try {
      const studentId = req.params.studentId;
      const invoices = await FeeService.getStudentFeeAccount(studentId);
      
      res.status(200).json({
        success: true,
        data: invoices
      });
    } catch (error) {
      logger.error('Get student fee account error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch fee account' 
      });
    }
  }

  static async recordPayment(req, res) {
    try {
      const paymentData = paymentSchema.parse(req.body);
      const result = await FeeService.recordPayment(paymentData, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Record payment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to record payment' 
      });
    }
  }

  static async processOnlinePayment(req, res) {
    try {
      const paymentData = onlinePaymentSchema.parse(req.body);
      const result = await FeeService.processOnlinePayment(paymentData);
      
      res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Process online payment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process online payment' 
      });
    }
  }

  static async handleWebhook(req, res) {
    try {
      const provider = req.params.provider;
      const payload = req.body;
      const signature = req.headers['stripe-signature'] || req.headers['x-razorpay-signature'];
      
      await FeeService.handleWebhook(provider, payload, signature);
      
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(400).json({ 
        success: false, 
        message: 'Webhook processing failed' 
      });
    }
  }

  static async getFeeDefaulters(req, res) {
    try {
      const defaulters = await FeeService.getFeeDefaulters();
      
      res.status(200).json({
        success: true,
        data: defaulters
      });
    } catch (error) {
      logger.error('Get fee defaulters error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch defaulters' 
      });
    }
  }

  static async getFeeAnalytics(req, res) {
    try {
      const analytics = await FeeService.getFeeAnalytics();
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Get fee analytics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch analytics' 
      });
    }
  }

  static async generateReceipt(req, res) {
    try {
      const paymentId = req.params.paymentId;
      const receiptPath = await FeeService.generateReceipt(paymentId);
      
      res.download(receiptPath, `receipt_${paymentId}.pdf`);
    } catch (error) {
      logger.error('Generate receipt error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate receipt' 
      });
    }
  }
}

module.exports = FeeController;
