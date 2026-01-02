import api from './api';

const BASE_URL = '/finance';

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_id?: string;
  is_active: boolean;
  description?: string;
}

export interface FinancialYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface IncomeRecord {
  id: string;
  transaction_date: Date;
  account_id: string;
  amount: number;
  vat_amount?: number;
  description: string;
  reference_number?: string;
  payment_method: string;
  status: string;
}

export interface ExpenseRecord {
  id: string;
  transaction_date: Date;
  account_id: string;
  vendor_id?: string;
  amount: number;
  vat_amount?: number;
  description: string;
  reference_number?: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approval_status?: string;
}

export interface Vendor {
  id: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active: boolean;
}

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch?: string;
  account_type: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
}

export interface PettyCashTransaction {
  id: string;
  transaction_date: Date;
  transaction_type: 'disbursement' | 'replenishment';
  amount: number;
  description: string;
  custodian: string;
  receipt_number?: string;
  category?: string;
  created_by?: string;
  created_by_name?: string;
}

export interface PettyCashSummary {
  total_replenished: number;
  total_disbursed: number;
  current_balance: number;
  monthly_disbursed: number;
  monthly_replenished: number;
  custodians: Array<{
    custodian: string;
    balance: number;
  }>;
}

class FinanceService {
  // Chart of Accounts
  async getChartOfAccounts() {
    return api.get(`${BASE_URL}/chart-of-accounts`);
  }

  async createAccount(data: Partial<ChartOfAccount>) {
    return api.post(`${BASE_URL}/chart-of-accounts`, data);
  }

  // Financial Years
  async getFinancialYears() {
    return api.get(`${BASE_URL}/financial-years`);
  }

  async createFinancialYear(data: Partial<FinancialYear>) {
    return api.post(`${BASE_URL}/financial-years`, data);
  }

  // Income
  async getIncomeRecords(params?: any) {
    return api.get(`${BASE_URL}/income`, { params });
  }

  async createIncome(data: Partial<IncomeRecord>) {
    return api.post(`${BASE_URL}/income`, data);
  }

  // Expenses
  async getExpenseRecords(params?: any) {
    return api.get(`${BASE_URL}/expenses`, { params });
  }

  async createExpense(data: Partial<ExpenseRecord>) {
    return api.post(`${BASE_URL}/expenses`, data);
  }

  async approveExpense(id: string) {
    return api.put(`${BASE_URL}/expenses/${id}/approve`);
  }

  async rejectExpense(id: string, reason: string) {
    return api.put(`${BASE_URL}/expenses/${id}/reject`, { reason });
  }

  async payExpense(id: string) {
    return api.put(`${BASE_URL}/expenses/${id}/pay`);
  }

  // Vendors
  async getVendors() {
    return api.get(`${BASE_URL}/vendors`);
  }

  async createVendor(data: Partial<Vendor>) {
    return api.post(`${BASE_URL}/vendors`, data);
  }

  // Bank Accounts
  async getBankAccounts() {
    return api.get(`${BASE_URL}/bank-accounts`);
  }

  async createBankAccount(data: Partial<BankAccount>) {
    return api.post(`${BASE_URL}/bank-accounts`, data);
  }

  // Petty Cash
  async getPettyCash(params?: any) {
    return api.get(`${BASE_URL}/petty-cash`, { params });
  }

  async createPettyCash(data: Partial<PettyCashTransaction>) {
    return api.post(`${BASE_URL}/petty-cash`, data);
  }

  async getPettyCashSummary() {
    return api.get(`${BASE_URL}/petty-cash/summary`);
  }

  async deletePettyCash(id: string) {
    return api.delete(`${BASE_URL}/petty-cash/${id}`);
  }

  // Dashboard
  async getDashboard() {
    return api.get(`${BASE_URL}/dashboard`);
  }

  // Reports
  async getIncomeByCategory(params?: any) {
    return api.get(`${BASE_URL}/reports/income-by-category`, { params });
  }

  async getExpensesByCategory(params?: any) {
    return api.get(`${BASE_URL}/reports/expenses-by-category`, { params });
  }

  // Settings
  async getSettings() {
    return api.get(`${BASE_URL}/settings`);
  }

  async updateSetting(key: string, value: any) {
    return api.put(`${BASE_URL}/settings/${key}`, { value });
  }

  // Calculate VAT (16% for Kenya)
  calculateVAT(amount: number, rate: number = 16): number {
    return (amount * rate) / 100;
  }

  calculateTotalWithVAT(amount: number, rate: number = 16): number {
    return amount + this.calculateVAT(amount, rate);
  }
}

export default new FinanceService();
