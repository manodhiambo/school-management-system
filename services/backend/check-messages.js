import pg from 'pg';

const { Pool } = pg;

async function checkMessages() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== All Messages ===\n');
    
    const messages = await pool.query(`
      SELECT m.*, 
        su.email as sender_email, 
        ru.email as recipient_email
      FROM messages m
      LEFT JOIN users su ON m.sender_id = su.id
      LEFT JOIN users ru ON m.recipient_id = ru.id
      ORDER BY m.created_at DESC
    `);
    
    console.log('Total messages:', messages.rows.length);
    messages.rows.forEach(m => {
      console.log(`\n  ID: ${m.id}`);
      console.log(`  From: ${m.sender_email} -> To: ${m.recipient_email}`);
      console.log(`  Subject: ${m.subject}`);
      console.log(`  Recipient ID: ${m.recipient_id}`);
      console.log(`  Is Read: ${m.is_read}`);
    });

    console.log('\n=== Teacher User ===\n');
    const teacher = await pool.query(`
      SELECT u.id, u.email, u.role, t.id as teacher_id, t.first_name, t.last_name
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE u.role = 'teacher'
    `);
    teacher.rows.forEach(t => {
      console.log(`  User ID: ${t.id}`);
      console.log(`  Email: ${t.email}`);
      console.log(`  Teacher ID: ${t.teacher_id}`);
      console.log(`  Name: ${t.first_name} ${t.last_name}`);
    });

    console.log('\n=== Notifications ===\n');
    const notifs = await pool.query(`
      SELECT n.*, u.email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 10
    `);
    console.log('Recent notifications:', notifs.rows.length);
    notifs.rows.forEach(n => {
      console.log(`  - ${n.email}: ${n.title} (read: ${n.is_read})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMessages();
