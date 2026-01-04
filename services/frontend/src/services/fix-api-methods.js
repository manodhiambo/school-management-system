import fs from 'fs';

let content = fs.readFileSync('api.ts', 'utf8');

// Remove the incorrectly added methods at the end
content = content.replace(/\n  \/\/ Bank Account Operations[\s\S]*$/, '');

// Find the last method before the closing brace and add after it
const bankMethods = `
  // Bank Account Operations
  updateBankAccount(id: string, data: any) {
    return this.api.put(\`/finance/bank-accounts/\${id}\`, data);
  }

  deleteBankAccount(id: string) {
    return this.api.delete(\`/finance/bank-accounts/\${id}\`);
  }

  createBankTransaction(data: any) {
    return this.api.post('/finance/bank-transactions', data);
  }

  getBankTransactions(accountId?: string) {
    return this.api.get('/finance/bank-transactions', { params: { accountId } });
  }
`;

// Insert before the last closing brace of the class
content = content.replace(/}\s*}\s*export default new ApiService/, bankMethods + '\n}\n}\n\nexport default new ApiService');

fs.writeFileSync('api.ts', content);
console.log('✅ Fixed API methods!');
