import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Fix approveExpense - it should check status='pending' not approval_status
content = content.replace(
  /WHERE id = \$2 AND approval_status = 'pending'/,
  `WHERE id = $2 AND status = 'pending'`
);

// Fix payExpense - it should check status='pending' (approved expenses ready to pay)
content = content.replace(
  /WHERE id = \$1 AND approval_status = 'approved'/,
  `WHERE id = $1 AND status = 'pending'`
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed expense workflow!');
