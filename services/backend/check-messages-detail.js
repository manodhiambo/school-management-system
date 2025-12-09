import pg from 'pg';

const { Pool } = pg;

async function checkMessages() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== All Messages in DB ===\n');
    
    const messages = await pool.query(`
      SELECT m.*, 
        su.email as sender_email,
        su.role as sender_role,
        ru.email as recipient_email,
        ru.role as recipient_role
      FROM messages m
      LEFT JOIN users su ON m.sender_id = su.id
      LEFT JOIN users ru ON m.recipient_id = ru.id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    
    console.log('Total messages:', messages.rows.length);
    messages.rows.forEach((m, i) => {
      console.log(`\n--- Message ${i + 1} ---`);
      console.log(`  ID: ${m.id}`);
      console.log(`  Subject: ${m.subject}`);
      console.log(`  Sender: ${m.sender_email} (${m.sender_role}) - ID: ${m.sender_id}`);
      console.log(`  Recipient: ${m.recipient_email} (${m.recipient_role}) - ID: ${m.recipient_id}`);
      console.log(`  Content: ${m.content?.substring(0, 50)}...`);
    });

    console.log('\n=== All Users ===\n');
    const users = await pool.query('SELECT id, email, role FROM users');
    users.rows.forEach(u => {
      console.log(`  ${u.email} (${u.role}) - ID: ${u.id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMessages();
