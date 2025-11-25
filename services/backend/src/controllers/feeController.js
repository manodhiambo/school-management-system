import feeService from '../services/feeService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

class FeeController {
  // ==================== FEE STRUCTURE ====================
  createFeeStructure = asyncHandler(async (req, res) => {
    const feeStructure = await feeService.createFeeStructure(req.body);
    res.status(201).json(
      new ApiResponse(201, feeStructure, 'Fee structure created successfully')
    );
  });

  getFeeStructures = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      academicYear: req.query.academicYear,
      isActive: req.query.isActive === 'true'
    };
    const feeStructures = await feeService.getFeeStructures(filters);
    res.status(200).json(
      new ApiResponse(200, feeStructures, 'Fee structures retrieved successfully')
    );
  });

  getFeeStructureById = asyncHandler(async (req, res) => {
    const feeStructure = await feeService.getFeeStructureById(req.params.id);
    res.status(200).json(
      new ApiResponse(200, feeStructure, 'Fee structure retrieved successfully')
    );
  });

  updateFeeStructure = asyncHandler(async (req, res) => {
    const feeStructure = await feeService.updateFeeStructure(req.params.id, req.body);
    res.status(200).json(
      new ApiResponse(200, feeStructure, 'Fee structure updated successfully')
    );
  });

  // ==================== DISCOUNTS ====================
  createDiscount = asyncHandler(async (req, res) => {
    const discount = await feeService.createDiscount(req.body);
    res.status(201).json(
      new ApiResponse(201, discount, 'Discount created successfully')
    );
  });

  applyDiscountToStudent = asyncHandler(async (req, res) => {
    const { studentId, discountId, reason, validFrom, validUntil } = req.body;
    const result = await feeService.applyDiscountToStudent(
      studentId,
      discountId,
      req.user.id,
      reason,
      validFrom,
      validUntil
    );
    res.status(200).json(
      new ApiResponse(200, result, 'Discount applied to student successfully')
    );
  });

  // ==================== INVOICES ====================
  generateInvoice = asyncHandler(async (req, res) => {
    const { studentId, month } = req.body;
    const invoice = await feeService.generateInvoice(studentId, month, req.user.id);
    res.status(201).json(
      new ApiResponse(201, invoice, 'Invoice generated successfully')
    );
  });

  getInvoices = asyncHandler(async (req, res) => {
    const filters = {
      studentId: req.query.studentId,
      status: req.query.status,
      month: req.query.month,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const invoices = await feeService.getInvoices(filters);
    res.status(200).json(
      new ApiResponse(200, invoices, 'Invoices retrieved successfully')
    );
  });

  getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await feeService.getInvoiceById(req.params.id);
    res.status(200).json(
      new ApiResponse(200, invoice, 'Invoice retrieved successfully')
    );
  });

  // ==================== PAYMENTS ====================
  recordPayment = asyncHandler(async (req, res) => {
    const paymentData = {
      ...req.body,
      collectedBy: req.user.id
    };
    const payment = await feeService.recordPayment(paymentData);
    res.status(201).json(
      new ApiResponse(201, payment, 'Payment recorded successfully')
    );
  });

  getPayments = asyncHandler(async (req, res) => {
    const filters = {
      invoiceId: req.query.invoiceId,
      studentId: req.query.studentId,
      paymentMethod: req.query.paymentMethod,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const payments = await feeService.getPayments(filters);
    res.status(200).json(
      new ApiResponse(200, payments, 'Payments retrieved successfully')
    );
  });

  // ==================== DEFAULTERS ====================
  getDefaulters = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      threshold: parseFloat(req.query.threshold) || 0
    };
    const defaulters = await feeService.getDefaulters(filters);
    res.status(200).json(
      new ApiResponse(200, defaulters, 'Fee defaulters retrieved successfully')
    );
  });

  // ==================== STATISTICS ====================
  getFeeStatistics = asyncHandler(async (req, res) => {
    const filters = {
      classId: req.query.classId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      academicYear: req.query.academicYear
    };
    const stats = await feeService.getFeeStatistics(filters);
    res.status(200).json(
      new ApiResponse(200, stats, 'Fee statistics retrieved successfully')
    );
  });


  getStudentFeeAccount = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const feeAccount = await feeService.getStudentFeeAccount(studentId);
    
    res.status(200).json(
      new ApiResponse(200, feeAccount, 'Student fee account retrieved successfully')
    );
  });
}

export default new FeeController();
