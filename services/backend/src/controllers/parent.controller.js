const ParentService = require('../services/parent.service');
const { z } = require('zod');
const logger = require('../utils/logger');

const parentQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const parentIdSchema = z.object({
  id: z.string().uuid()
});

const linkStudentSchema = z.object({
  student_id: z.string().uuid(),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']),
  is_primary_contact: z.boolean().default(false),
  can_pickup: z.boolean().default(false)
});

class ParentController {
  static async createParent(req, res) {
    try {
      const result = await ParentService.createParent(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Parent created and linked successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('already linked')) {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Create parent error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create parent' 
      });
    }
  }

  static async getParentById(req, res) {
    try {
      const { id } = parentIdSchema.parse(req.params);
      const parent = await ParentService.getParentById(id);
      
      res.status(200).json({
        success: true,
        data: parent
      });
    } catch (error) {
      if (error.message === 'Parent not found') {
        return res.status(404).json({ 
          success: false, 
          message: error.message 
        });
      }
      logger.error('Get parent by ID error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch parent' 
      });
    }
  }

  static async getParentChildren(req, res) {
    try {
      const { id } = parentIdSchema.parse(req.params);
      const children = await ParentService.getParentChildren(id);
      
      res.status(200).json({
        success: true,
        data: children
      });
    } catch (error) {
      logger.error('Get parent children error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch children' 
      });
    }
  }

  static async linkStudent(req, res) {
    try {
      const { id } = parentIdSchema.parse(req.params);
      const linkData = linkStudentSchema.parse(req.body);
      
      const result = await ParentService.linkStudent(id, linkData);
      
      res.status(201).json({
        success: true,
        message: 'Student linked successfully',
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
      logger.error('Link student error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to link student' 
      });
    }
  }

  static async getParentPayments(req, res) {
    try {
      const { id } = parentIdSchema.parse(req.params);
      const payments = await ParentService.getParentPayments(id);
      
      res.status(200).json({
        success: true,
        data: payments
      });
    } catch (error) {
      logger.error('Get parent payments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch payments' 
      });
    }
  }
}

module.exports = ParentController;
