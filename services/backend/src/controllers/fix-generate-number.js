import fs from 'fs';

const content = fs.readFileSync('financeController.js', 'utf8');

// Move generateNumber function outside the class
const fixedContent = content.replace(
  'import pool from \'../config/database.js\';',
  `import pool from '../config/database.js';

// Helper function to generate unique numbers
async function generateNumber(prefix, table, column) {
  const result = await pool.query(\`
    SELECT \${column} FROM \${table}
    WHERE \${column} LIKE $1
    ORDER BY \${column} DESC
    LIMIT 1
  \`, [\`\${prefix}%\`]);

  if (result.rows.length === 0) {
    return \`\${prefix}00001\`;
  }

  const lastNumber = result.rows[0][column];
  const numPart = parseInt(lastNumber.replace(prefix, '')) + 1;
  return \`\${prefix}\${String(numPart).padStart(5, '0')}\`;
}`
).replace(
  /  \/\/ Helper function to generate unique numbers[\s\S]*?  \}/,
  ''
).replace(
  /await this\.generateNumber\(/g,
  'await generateNumber('
);

fs.writeFileSync('financeController.js', fixedContent);
console.log('✅ Fixed generateNumber - moved outside class');
