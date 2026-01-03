import api from './api';

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
  getChartOfAccounts() {
    return api.getChartOfAccounts();
  }

  createAccount(data: Partial<ChartOfAccount>) {
    return api.createChartOfAccount(data);
  }

  // Financial Years
  getFinancialYears() {
    return api.getFinancialYears();
  }

  createFinancialYear(data: Partial<FinancialYear>) {
    return api.createFinancialYear(data);
  }

  // Income
  getIncomeRecords(params?: any) {
    return api.getIncomeRecords(params);
  }

  createIncome(data: Partial<IncomeRecord>) {
    return api.createIncome(data);
  }

  // Expenses
  getExpenseRecords(params?: any) {
    return api.getExpenseRecords(params);
  }

  createExpense(data: Partial<ExpenseRecord>) {
    return api.createExpense(data);
  }

  approveExpense(id: string) {
    return api.approveExpense(id);
  }

  rejectExpense(id: string, reason: string) {
    return api.rejectExpense(id, reason);
  }

  payExpense(id: string) {
    return api.payExpense(id);
  }

  // Vendors
  getVendors() {
    return api.getVendors();
  }

  createVendor(data: Partial<Vendor>) {
    return api.createVendor(data);
  }

  // Bank Accounts
  getBankAccounts() {
    return api.getBankAccounts();
  }

  createBankAccount(data: Partial<BankAccount>) {
    return api.createBankAccount(data);
  }

  // Petty Cash
  getPettyCash(params?: any) {
    return api.getPettyCash(params);
  }

  createPettyCash(data: Partial<PettyCashTransaction>) {
    return api.createPettyCash(data);
  }

  getPettyCashSummary() {
    return api.getPettyCashSummary();
  }

  deletePettyCash(id: string) {
    return api.deletePettyCash(id);
  }

  // Dashboard
  getDashboard() {
    return api.getFinanceDashboard();
  }

  // Reports
  getIncomeByCategory(params?: any) {
    return api.getIncomeByCategory(params);
  }

  getExpensesByCategory(params?: any) {
    return api.getExpensesByCategory(params);
  }

  // Settings
  getSettings() {
    return api.getFinanceSettings();
  }

  updateSetting(key: string, value: any) {
    return api.updateFinanceSetting(key, value);
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
