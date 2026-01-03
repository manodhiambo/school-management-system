import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Find the createExpense INSERT statement and add expense_category
content = content.replace(
  /INSERT INTO expense_records \(\s*expense_number, expense_date, account_id,/,
  `INSERT INTO expense_records (\n          expense_number, expense_date, expense_category, account_id,`
);

// Add the value 'General Expense' in the VALUES clause (after transaction_date, before account_id)
// The current VALUES has 14 parameters, we need to add one more
content = content.replace(
  /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, \$14, NOW\(\), NOW\(\)\)/,
  `VALUES ($1, $2, 'General Expense', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed expense_category!');
