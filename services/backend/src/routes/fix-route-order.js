import fs from 'fs';

let content = fs.readFileSync('financeRoutes.js', 'utf8');

// Find and reorganize expense routes - put specific routes BEFORE general routes
const expenseSection = `// Expenses - specific routes MUST come before general routes
router.put('/expenses/:id/approve', financeController.approveExpense);
router.put('/expenses/:id/reject', financeController.rejectExpense);
router.put('/expenses/:id/pay', financeController.payExpense);
router.get('/expenses', financeController.getExpenseRecords);
router.post('/expenses', financeController.createExpense);`;

// Remove old expense routes
content = content.replace(/\/\/ Expense approval workflow routes\n/, '');
content = content.replace(/\/\/ Expenses\nrouter\.get\('\/expenses'[\s\S]*?router\.put\('\/expenses\/:id\/pay'[^;]+;/m, expenseSection);

fs.writeFileSync('financeRoutes.js', content);
console.log('✅ Fixed route ordering!');
