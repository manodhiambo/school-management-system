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
  transaction_date: Date | string;
  transaction_type: 'disbursement' | 'replenishment';
  amount: number;
  description: string;
  payee_name?: string;
  custodian?: string;
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

// Helper to extract data array from API responses
const unwrap = async <T>(promise: Promise<any>): Promise<T[]> => {
  const res: any = await promise;
  return (res?.data ?? res?.items ?? res ?? []) as T[];
};

const unwrapOne = async <T>(promise: Promise<any>): Promise<T> => {
  const res: any = await promise;
  return (res?.data ?? res) as T;
};

class FinanceService {
  // Chart of Accounts
  async getChartOfAccounts(): Promise<ChartOfAccount[]> {
    return unwrap<ChartOfAccount>(api.getChartOfAccounts());
  }

  createAccount(data: Partial<ChartOfAccount>) {
    return api.createChartOfAccount(data);
  }

  // Financial Years
  async getFinancialYears(): Promise<FinancialYear[]> {
    return unwrap<FinancialYear>(api.getFinancialYears());
  }

  createFinancialYear(data: Partial<FinancialYear>) {
    return api.createFinancialYear(data);
  }

  // Income
  async getIncomeRecords(params?: any): Promise<IncomeRecord[]> {
    return unwrap<IncomeRecord>(api.getIncomeRecords(params));
  }

  createIncome(data: Partial<IncomeRecord>) {
    return api.createIncome(data);
  }

  // Expenses
  async getExpenseRecords(params?: any): Promise<ExpenseRecord[]> {
    return unwrap<ExpenseRecord>(api.getExpenseRecords(params));
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
  async getVendors(): Promise<Vendor[]> {
    return unwrap<Vendor>(api.getVendors());
  }

  createVendor(data: Partial<Vendor>) {
    return api.createVendor(data);
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return unwrap<BankAccount>(api.getBankAccounts());
  }

  createBankAccount(data: Partial<BankAccount>) {
    return api.createBankAccount(data);
  }

  // Petty Cash
  async getPettyCash(params?: any): Promise<PettyCashTransaction[]> {
    return unwrap<PettyCashTransaction>(api.getPettyCash(params));
  }

  createPettyCash(data: Partial<PettyCashTransaction>) {
    return api.createPettyCash(data);
  }

  async getPettyCashSummary(): Promise<PettyCashSummary> {
    return unwrapOne<PettyCashSummary>(api.getPettyCashSummary());
  }

  deletePettyCash(id: string) {
    return api.deletePettyCash(id);
  }

  // Assets
  async getAssets(params?: any): Promise<Asset[]> {
    return unwrap<Asset>(api.getAssets(params));
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

  async getAssetsSummary(): Promise<any> {
    return unwrapOne<any>(api.getAssetsSummary());
  }

  // Budgets
  async getBudgets(params?: any): Promise<Budget[]> {
    return unwrap<Budget>(api.getBudgets(params));
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
  async getPurchaseOrders(params?: any): Promise<PurchaseOrder[]> {
    return unwrap<PurchaseOrder>(api.getPurchaseOrders(params));
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
  async getDashboard(): Promise<any> {
    return unwrapOne<any>(api.getFinanceDashboard());
  }

  // Reports
  async getIncomeByCategory(params?: any): Promise<any[]> {
    return unwrap<any>(api.getIncomeByCategory(params));
  }

  async getExpensesByCategory(params?: any): Promise<any[]> {
    return unwrap<any>(api.getExpensesByCategory(params));
  }

  // Settings
  async getSettings(): Promise<any> {
    return unwrapOne<any>(api.getFinanceSettings());
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

  async getBankTransactions(accountId?: string): Promise<any[]> {
    return unwrap<any>(api.getBankTransactions(accountId));
  }

}

export default new FinanceService();
