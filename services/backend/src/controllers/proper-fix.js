import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// First, add the standalone function at the top
const imports = "import pool from '../config/database.js';";
const helperFunction = `
import pool from '../config/database.js';

// Helper function to generate unique numbers (standalone)
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
}
`;

// Replace the import line with import + helper
content = content.replace(imports, helperFunction);

// Remove the class method version
content = content.replace(/  \/\/ Helper function to generate unique numbers\s+async generateNumber\(prefix, table, column\) \{[\s\S]*?\n  \}\n\n/, '');

// Replace all this.generateNumber calls
content = content.replace(/await this\.generateNumber\(/g, 'await generateNumber(');

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed!');
