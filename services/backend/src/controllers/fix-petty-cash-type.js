import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// After reading transaction_type from req.body, map disbursement to expense
content = content.replace(
  /const \{\s*transaction_date,\s*transaction_type,\s*amount,/,
  `const {
        transaction_date,
        transaction_type: raw_transaction_type,
        amount,`
);

// Add the mapping right before the balance calculation
content = content.replace(
  /\/\/ Get current balance/,
  `// Map frontend transaction_type to database constraint
      const transaction_type = raw_transaction_type === 'disbursement' ? 'expense' : raw_transaction_type;

      // Get current balance`
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed petty cash transaction type mapping!');
