import fs from 'fs';

let content = fs.readFileSync('financeService.ts', 'utf8');

// Remove any duplicates first
content = content.replace(/  \/\/ Bank Account Management[\s\S]*?getBankTransactions\(accountId\?\: string\) \{[\s\S]*?\n  \}/g, '');

// Add all bank methods before the closing brace
const bankMethods = `
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

// Insert before the last export
content = content.replace(/}\s*export default new FinanceService\(\);?/, bankMethods + '\n}\n\nexport default new FinanceService();');

fs.writeFileSync('financeService.ts', content);
console.log('✅ Added all bank methods!');
