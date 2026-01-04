import fs from 'fs';

let content = fs.readFileSync('financeService.ts', 'utf8');

const newMethods = `
  // Bank Account Management
  updateBankAccount(id: string, data: any) {
    return api.updateBankAccount(id, data);
  }

  deleteBankAccount(id: string) {
    return api.deleteBankAccount(id);
  }

  createBankTransaction(data: any) {
    return api.createBankTransaction(data);
  }

  getBankTransactions(accountId?: string) {
    return api.getBankTransactions(accountId);
  }
`;

// Insert before the closing brace and export
content = content.replace(/}\s*export default new FinanceService/, newMethods + '\n}\n\nexport default new FinanceService');

fs.writeFileSync('financeService.ts', content);
console.log('✅ Fixed financeService!');
