const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Parse DATABASE_URL
    const url = process.env.DATABASE_URL;
    const match = url.match(/mysql:\/\/(\w+):([^@]+)@([^:]+):(\d+)\/(\w+)/);
    
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, user, password, host, port] = match;
    const databaseName = match[5];

    // Connect without database to create it
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    
    console.log(`✅ Database "${databaseName}" created or already exists`);
    
    // Create user if it doesn't exist (optional)
    await connection.execute(`
      CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}'
    `);
    
    await connection.execute(`
      GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${user}'@'%'
    `);
    
    await connection.execute('FLUSH PRIVILEGES');
    
    console.log(`✅ User privileges granted`);

    await connection.end();

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL server is not running. Please start it first:');
      console.error('   sudo systemctl start mysql  (Linux)');
      console.error('   brew services start mysql   (macOS)');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Check your MySQL username and password in .env file');
    }
    
    process.exit(1);
  }
}

setupDatabase();
