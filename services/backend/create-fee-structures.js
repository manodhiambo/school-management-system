import pg from 'pg';

const { Pool } = pg;

async function createFeeStructures() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Creating Fee Structures ===\n');
    
    // Check if fee structures exist
    const existing = await pool.query('SELECT COUNT(*) as count FROM fee_structure');
    console.log('Existing fee structures:', existing.rows[0].count);
    
    if (parseInt(existing.rows[0].count) === 0) {
      // Insert sample fee structures with valid frequency values
      // Valid: monthly, quarterly, half_yearly, yearly, one_time
      await pool.query(`
        INSERT INTO fee_structure (id, name, amount, frequency, description, due_day, academic_year) VALUES
        (gen_random_uuid(), 'Tuition Fee', 50000, 'quarterly', 'Term tuition fee', 15, '2025'),
        (gen_random_uuid(), 'Activity Fee', 5000, 'quarterly', 'Sports and clubs activities', 15, '2025'),
        (gen_random_uuid(), 'Library Fee', 2000, 'yearly', 'Library access and materials', 1, '2025'),
        (gen_random_uuid(), 'Lab Fee', 3000, 'quarterly', 'Science laboratory usage', 15, '2025'),
        (gen_random_uuid(), 'Transport Fee', 10000, 'monthly', 'School bus transport', 15, '2025'),
        (gen_random_uuid(), 'Lunch Fee', 8000, 'monthly', 'School lunch program', 15, '2025'),
        (gen_random_uuid(), 'Exam Fee', 2500, 'quarterly', 'Examination and assessment fee', 15, '2025'),
        (gen_random_uuid(), 'Computer Lab Fee', 3500, 'quarterly', 'Computer and IT resources', 15, '2025'),
        (gen_random_uuid(), 'Admission Fee', 15000, 'one_time', 'One-time admission fee', 1, '2025'),
        (gen_random_uuid(), 'Uniform Fee', 5000, 'one_time', 'School uniform', 1, '2025')
      `);
      console.log('Created sample fee structures');
    }
    
    // List all fee structures
    const structures = await pool.query('SELECT id, name, amount, frequency FROM fee_structure');
    console.log('\nFee Structures:');
    structures.rows.forEach(s => {
      console.log(`  - ${s.name}: KES ${s.amount} (${s.frequency})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createFeeStructures();
