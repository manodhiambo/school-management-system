import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function addMissingTables() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding missing tables...');
    
    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        parent_message_id UUID REFERENCES messages(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ messages table created');

    // Announcements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50),
        target_audience VARCHAR(50) DEFAULT 'all',
        is_active BOOLEAN DEFAULT TRUE,
        published_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ announcements table created');

    // Timetable table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id),
        teacher_id UUID REFERENCES teachers(id),
        day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME,
        end_time TIME,
        room VARCHAR(50),
        academic_year VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ timetable table created');

    // Audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100),
        resource VARCHAR(100),
        resource_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ audit_logs table created');

    // Fee discounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fee_discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('percentage', 'fixed')),
        value DECIMAL(12, 2) NOT NULL,
        applicable_to VARCHAR(50) DEFAULT 'all',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ fee_discounts table created');

    // Student fee discounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_fee_discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        discount_id UUID REFERENCES fee_discounts(id) ON DELETE CASCADE,
        applied_by UUID REFERENCES users(id),
        reason TEXT,
        valid_from DATE,
        valid_until DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ student_fee_discounts table created');

    // Fee invoice items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fee_invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES fee_invoices(id) ON DELETE CASCADE,
        fee_structure_id UUID REFERENCES fee_structure(id),
        description VARCHAR(255),
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ fee_invoice_items table created');

    // User sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ user_sessions table created');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable(teacher_id)`);
    console.log('✓ indexes created');

    console.log('\n✓ All missing tables added successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingTables();
