import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Fix approveExpense - don't change status, only set it to paid
content = content.replace(
  /UPDATE expense_records\s+SET approval_status = 'approved',\s+status = 'approved',/,
  `UPDATE expense_records
        SET status = 'paid',`
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed approve to set status=paid!');
