/**
 * Seed script: Creates or updates the superadmin account.
 *
 * Usage:
 *   node src/scripts/seedSuperadmin.js
 *   (from the services/backend directory, with dotenv loaded)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import bcrypt from 'bcryptjs';

// Load .env relative to the script location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { query } from '../config/database.js';

const SUPERADMIN_EMAIL = 'helvinotechltd@gmail.com';
const SUPERADMIN_PASSWORD = 'Mycat@95';

async function seedSuperadmin() {
  console.log('=== Superadmin Seed Script ===');
  console.log(`Target email: ${SUPERADMIN_EMAIL}`);

  try {
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    console.log('Password hashed successfully.');

    // Check if superadmin already exists
    const existing = await query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [SUPERADMIN_EMAIL]
    );

    if (existing.length > 0) {
      const user = existing[0];
      console.log(`User already exists: id=${user.id}, role=${user.role}`);

      // Update password and ensure role is superadmin
      await query(
        `UPDATE users SET
           password = $1,
           role = 'superadmin',
           tenant_id = NULL,
           is_active = true,
           is_verified = true,
           updated_at = NOW()
         WHERE email = $2`,
        [hashedPassword, SUPERADMIN_EMAIL]
      );

      console.log('Superadmin password and role updated successfully.');
    } else {
      // Create new superadmin
      await query(
        `INSERT INTO users (
           email, password, role, tenant_id,
           is_active, is_verified, created_at, updated_at
         ) VALUES (
           $1, $2, 'superadmin', NULL,
           true, true, NOW(), NOW()
         )`,
        [SUPERADMIN_EMAIL, hashedPassword]
      );

      console.log('Superadmin user created successfully.');
    }

    // Verify
    const verify = await query(
      'SELECT id, email, role, tenant_id, is_active FROM users WHERE email = $1',
      [SUPERADMIN_EMAIL]
    );

    if (verify.length > 0) {
      const u = verify[0];
      console.log('\nVerification:');
      console.log(`  id:        ${u.id}`);
      console.log(`  email:     ${u.email}`);
      console.log(`  role:      ${u.role}`);
      console.log(`  tenant_id: ${u.tenant_id}`);
      console.log(`  is_active: ${u.is_active}`);
      console.log('\nSuperadmin seed completed successfully.');
    } else {
      console.error('Verification failed — user not found after insert.');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedSuperadmin();
