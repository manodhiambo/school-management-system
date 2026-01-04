import fs from 'fs';

let content = fs.readFileSync('financeRoutes.js', 'utf8');

// Add routes before export
const newRoutes = `
// Bank Account Management
router.put('/bank-accounts/:id', financeController.updateBankAccount);
router.delete('/bank-accounts/:id', financeController.deleteBankAccount);
router.post('/bank-transactions', financeController.createBankTransaction);
router.get('/bank-transactions', financeController.getBankTransactions);
`;

content = content.replace('export default router;', newRoutes + '\nexport default router;');

fs.writeFileSync('financeRoutes.js', content);
console.log('✅ Added bank routes!');
