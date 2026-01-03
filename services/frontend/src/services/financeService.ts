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
  income_number: string;
  income_date: Date;
  account_id: string;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  description: string;
  payment_reference?: string;
  payment_method: string;
  status: string;
}

export interface ExpenseRecord {
  id: string;
  expense_number: string;
  expense_date: Date;
  account_id: string;
  vendor_id?: string;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  description: string;
  payment_reference?: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approval_status?: string;
}

export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  kra_pin?: string;
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
  transaction_number: string;
  transaction_date: Date;
  transaction_type: 'disbursement' | 'replenishment';
  amount: number;
  description: string;
  payee_name: string;
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

export interface Budget {
  id: string;
  budget_name: string;
  financial_year_id: string;
  financial_year_name?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  spent_amount: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  description?: string;
  created_at: string;
  created_by_name?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  vendor_id: string;
  vendor_name?: string;
  expected_delivery_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  terms_conditions?: string;
  notes?: string;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
  created_at: string;
  created_by_name?: string;
}

export interface Asset {
  id: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  location?: string;
  status: 'active' | 'disposed' | 'under_maintenance';
  created_at: string;
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

  // Assets
  getAssets(params?: any) {
    return api.getAssets(params);
  }

  createAsset(data: Partial<Asset>) {
    return api.createAsset(data);
  }

  updateAsset(id: string, data: Partial<Asset>) {
    return api.updateAsset(id, data);
  }

  deleteAsset(id: string) {
    return api.deleteAsset(id);
  }

  getAssetsSummary() {
    return api.getAssetsSummary();
  }

  // Budgets
  getBudgets(params?: any) {
    return api.getBudgets(params);
  }

  createBudget(data: Partial<Budget>) {
    return api.createBudget(data);
  }

  updateBudget(id: string, data: Partial<Budget>) {
    return api.updateBudget(id, data);
  }

  deleteBudget(id: string) {
    return api.deleteBudget(id);
  }

  approveBudget(id: string) {
    return api.approveBudget(id);
  }

  // Purchase Orders
  getPurchaseOrders(params?: any) {
    return api.getPurchaseOrders(params);
  }

  createPurchaseOrder(data: Partial<PurchaseOrder>) {
    return api.createPurchaseOrder(data);
  }

  updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>) {
    return api.updatePurchaseOrder(id, data);
  }

  deletePurchaseOrder(id: string) {
    return api.deletePurchaseOrder(id);
  }

  approvePurchaseOrder(id: string) {
    return api.approvePurchaseOrder(id);
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
