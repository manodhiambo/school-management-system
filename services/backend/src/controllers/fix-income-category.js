import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Find the createIncome INSERT statement and add income_category
content = content.replace(
  /INSERT INTO income_records \(\s*income_number, income_date, account_id,/,
  `INSERT INTO income_records (\n          income_number, income_date, income_category, account_id,`
);

// Add the value 'Other Income' in the VALUES clause (after transaction_date)
content = content.replace(
  /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, 'completed', \$11, NOW\(\), NOW\(\)\)/,
  `VALUES ($1, $2, 'Other Income', $3, $4, $5, $6, $7, $8, $9, $10, 'completed', $11, NOW(), NOW())`
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed income_category!');
