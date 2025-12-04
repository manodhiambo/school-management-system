import pg from 'pg';

const { Pool } = pg;

async function checkMessagesTable() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Checking Messages Table ===\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
      )
    `);
    
    console.log('Messages table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'messages'
        ORDER BY ordinal_position
      `);
      console.log('\nColumns:');
      cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('\nCreating messages table...');
      await pool.query(`
        CREATE TABLE messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID REFERENCES users(id),
          recipient_id UUID REFERENCES users(id),
          recipient_role VARCHAR(50),
          recipient_class_id UUID REFERENCES classes(id),
          subject VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'direct',
          priority VARCHAR(20) DEFAULT 'normal',
          attachments JSONB,
          parent_message_id UUID REFERENCES messages(id),
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Messages table created!');
    }
    
    // Check notifications table
    const notifCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `);
    console.log('\nNotifications table exists:', notifCheck.rows[0].exists);
    
    if (!notifCheck.rows[0].exists) {
      console.log('Creating notifications table...');
      await pool.query(`
        CREATE TABLE notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          data JSONB,
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Notifications table created!');
    }

    // Check announcements table
    const annCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'announcements'
      )
    `);
    console.log('Announcements table exists:', annCheck.rows[0].exists);
    
    if (!annCheck.rows[0].exists) {
      console.log('Creating announcements table...');
      await pool.query(`
        CREATE TABLE announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          target_role VARCHAR(50) DEFAULT 'all',
          target_class_id UUID REFERENCES classes(id),
          priority VARCHAR(20) DEFAULT 'normal',
          publish_date DATE DEFAULT CURRENT_DATE,
          expiry_date DATE,
          attachments JSONB,
          is_published BOOLEAN DEFAULT TRUE,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Announcements table created!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMessagesTable();
