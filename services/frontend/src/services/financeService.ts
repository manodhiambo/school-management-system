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
    const response = await api.get(`${BASE_URL}/chart-of-accounts`);
    return response.data;
  }

  async createAccount(data: Partial<ChartOfAccount>) {
    const response = await api.post(`${BASE_URL}/chart-of-accounts`, data);
    return response.data;
  }

  // Financial Years
  async getFinancialYears() {
    const response = await api.get(`${BASE_URL}/financial-years`);
    return response.data;
  }

  async createFinancialYear(data: Partial<FinancialYear>) {
    const response = await api.post(`${BASE_URL}/financial-years`, data);
    return response.data;
  }

  // Income
  async getIncomeRecords(params?: any) {
    const response = await api.get(`${BASE_URL}/income`, { params });
    return response.data;
  }

  async createIncome(data: Partial<IncomeRecord>) {
    const response = await api.post(`${BASE_URL}/income`, data);
    return response.data;
  }

  // Expenses
  async getExpenseRecords(params?: any) {
    const response = await api.get(`${BASE_URL}/expenses`, { params });
    return response.data;
  }

  async createExpense(data: Partial<ExpenseRecord>) {
    const response = await api.post(`${BASE_URL}/expenses`, data);
    return response.data;
  }

  async approveExpense(id: string) {
    const response = await api.put(`${BASE_URL}/expenses/${id}/approve`);
    return response.data;
  }

  async rejectExpense(id: string, reason: string) {
    const response = await api.put(`${BASE_URL}/expenses/${id}/reject`, { reason });
    return response.data;
  }

  async payExpense(id: string) {
    const response = await api.put(`${BASE_URL}/expenses/${id}/pay`);
    return response.data;
  }

  // Vendors
  async getVendors() {
    const response = await api.get(`${BASE_URL}/vendors`);
    return response.data;
  }

  async createVendor(data: Partial<Vendor>) {
    const response = await api.post(`${BASE_URL}/vendors`, data);
    return response.data;
  }

  // Bank Accounts
  async getBankAccounts() {
    const response = await api.get(`${BASE_URL}/bank-accounts`);
    return response.data;
  }

  async createBankAccount(data: Partial<BankAccount>) {
    const response = await api.post(`${BASE_URL}/bank-accounts`, data);
    return response.data;
  }

  // Petty Cash
  async getPettyCash(params?: any) {
    const response = await api.get(`${BASE_URL}/petty-cash`, { params });
    return response.data;
  }

  async createPettyCash(data: Partial<PettyCashTransaction>) {
    const response = await api.post(`${BASE_URL}/petty-cash`, data);
    return response.data;
  }

  async getPettyCashSummary() {
    const response = await api.get(`${BASE_URL}/petty-cash/summary`);
    return response.data;
  }

  async deletePettyCash(id: string) {
    const response = await api.delete(`${BASE_URL}/petty-cash/${id}`);
    return response.data;
  }

  // Dashboard
  async getDashboard() {
    const response = await api.get(`${BASE_URL}/dashboard`);
    return response.data;
  }

  // Reports
  async getIncomeByCategory(params?: any) {
    const response = await api.get(`${BASE_URL}/reports/income-by-category`, { params });
    return response.data;
  }

  async getExpensesByCategory(params?: any) {
    const response = await api.get(`${BASE_URL}/reports/expenses-by-category`, { params });
    return response.data;
  }

  // Settings
  async getSettings() {
    const response = await api.get(`${BASE_URL}/settings`);
    return response.data;
  }

  async updateSetting(key: string, value: any) {
    const response = await api.put(`${BASE_URL}/settings/${key}`, { value });
    return response.data;
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
