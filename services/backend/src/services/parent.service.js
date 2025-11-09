const { query, transaction } = require('../config/database');
const PasswordService = require('./password.service');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');
const { z } = require('zod');

const parentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']),
  occupation: z.string().optional(),
  annual_income: z.coerce.number().min(0).optional(),
  education: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  phone_primary: z.string().min(10).max(15),
  phone_secondary: z.string().min(10).max(15).optional(),
  email: z.string().email(),
  student_id: z.string().uuid()
});

const linkStudentSchema = z.object({
  student_id: z.string().uuid(),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']),
  is_primary_contact: z.boolean().default(false),
  can_pickup: z.boolean().default(false)
});

class ParentService {
  static async createParent(parentData) {
    return transaction(async (connection) => {
      const validatedData = parentSchema.parse(parentData);
      
      // Check if parent already exists with same email
      const [existingParent] = await connection.execute(
        'SELECT id FROM parents WHERE user_id IN (SELECT id FROM users WHERE email = ?)',
        [validatedData.email]
      );
      
      let parentId;
      
      if (existingParent.length > 0) {
        parentId = existingParent[0].id;
      } else {
        // Create user account for parent
        const tempPassword = PasswordService.generateTemporaryPassword();
        const hashedPassword = await PasswordService.hashPassword(tempPassword);
        
        const [userResult] = await connection.execute(
          'INSERT INTO users (id, email, password_hash, role) VALUES (UUID(), ?, ?, ?)',
          [validatedData.email, hashedPassword, 'parent']
        );

        const userId = userResult.insertId;

        // Create parent record
        const [parentResult] = await connection.execute(
          `INSERT INTO parents (
            id, user_id, first_name, last_name, relationship, occupation,
            annual_income, education, address, city, pincode, phone_primary, phone_secondary
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            validatedData.first_name,
   , pay. amount,
        pay.payment_method.toUpperCase(),
        new Date(pay.payment_date).toLocaleDateString()
      );
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return receiptPath;
    } catch (error) {
      logger.error(`Receipt generation failed for payment ${paymentId}:`, error);
      throw new Error('Failed to generate receipt');
    }
  }
}

module.exports = ParentService;
