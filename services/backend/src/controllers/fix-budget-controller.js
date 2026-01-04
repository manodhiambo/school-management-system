import fs from 'fs';

let content = fs.readFileSync('budgetController.js', 'utf8');

// Move generateBudgetNumber outside the class
const helperFunction = `import pool from '../config/database.js';

// Helper to generate budget number
async function generateBudgetNumber() {
  const result = await pool.query(\`
    SELECT budget_name FROM budgets
    WHERE budget_name LIKE 'BDG-%'
    ORDER BY budget_name DESC
    LIMIT 1
  \`);

  if (result.rows.length === 0) {
    return 'BDG-00001';
  }

  const lastNumber = result.rows[0].budget_name;
  const numPart = parseInt(lastNumber.replace('BDG-', '')) + 1;
  return \`BDG-\${String(numPart).padStart(5, '0')}\`;
}

`;

// Replace import and remove the class method
content = content.replace("import pool from '../config/database.js';", helperFunction);

// Remove the method from inside the class
content = content.replace(/  \/\/ Helper to generate budget number\s+async generateBudgetNumber\(\) \{[\s\S]*?\n  \}\n\n/, '');

// Replace this.generateBudgetNumber() with generateBudgetNumber()
content = content.replace(/await this\.generateBudgetNumber\(\)/g, 'await generateBudgetNumber()');

fs.writeFileSync('budgetController.js', content);
console.log('✅ Fixed budgetController!');
