import api from './api';

export interface BudgetItem {
  id: string;
  budget_id: string;
  item_name: string;
  account_id: string;
  account_name?: string;
  account_code?: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount?: number;
  utilization_percentage?: number;
  description?: string;
  created_at: string;
  updated_at: string;
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
  remaining_amount?: number;
  utilization_percentage?: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  description?: string;
  created_at: string;
  created_by_name?: string;
  approved_by_name?: string;
  approved_at?: string;
  item_count?: number;
  items?: BudgetItem[];
}

export interface BudgetSummary {
  id: string;
  budget_name: string;
  total_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_percentage: number;
  status: string;
  total_items: number;
  exhausted_items: number;
  total_allocated: number;
  total_item_spent: number;
  by_category: Array<{
    category: string;
    account_name: string;
    item_count: number;
    allocated: number;
    spent: number;
    remaining: number;
  }>;
}

export interface BudgetVariance {
  id: string;
  item_name: string;
  account_name: string;
  allocated_amount: number;
  spent_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'Over Budget' | 'Under Utilized' | 'On Track';
}

const unwrapArr = async <T>(p: Promise<any>): Promise<T[]> => {
  const r: any = await p;
  return (r?.data ?? r?.items ?? r ?? []) as T[];
};

const unwrapObj = async <T>(p: Promise<any>): Promise<T> => {
  const r: any = await p;
  return (r?.data ?? r) as T;
};

class BudgetService {
  // Budget CRUD
  async getBudgets(params?: any): Promise<Budget[]> {
    return unwrapArr<Budget>(api.getAllBudgets(params));
  }

  async getBudget(id: string): Promise<Budget> {
    return unwrapObj<Budget>(api.getBudgetById(id));
  }

  async createBudget(data: Partial<Budget & { items?: any[] }>) {
    return api.createNewBudget(data);
  }

  async updateBudget(id: string, data: Partial<Budget>) {
    return api.updateBudgetById(id, data);
  }

  async deleteBudget(id: string) {
    return api.deleteBudgetById(id);
  }

  async approveBudget(id: string) {
    return api.approveBudgetById(id);
  }

  async closeBudget(id: string) {
    return api.closeBudget(id);
  }

  // Budget Items
  async getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
    return unwrapArr<BudgetItem>(api.getBudgetItemsById(budgetId));
  }

  async addBudgetItem(budgetId: string, data: Partial<BudgetItem>) {
    return api.addBudgetItem(budgetId, data);
  }

  async updateBudgetItem(id: string, data: Partial<BudgetItem>) {
    return api.updateBudgetItemById(id, data);
  }

  async deleteBudgetItem(id: string) {
    return api.deleteBudgetItemById(id);
  }

  // Budget Analytics
  async getBudgetSummary(id: string): Promise<BudgetSummary> {
    return unwrapObj<BudgetSummary>(api.getBudgetSummaryById(id));
  }

  async getBudgetVariance(id: string): Promise<BudgetVariance[]> {
    return unwrapArr<BudgetVariance>(api.getBudgetVarianceById(id));
  }

  // Helper methods
  calculateUtilization(spent: number, total: number): number {
    return total > 0 ? (spent / total) * 100 : 0;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getVarianceColor(status: string): string {
    switch (status) {
      case 'Over Budget':
        return 'bg-red-100 text-red-800';
      case 'Under Utilized':
        return 'bg-yellow-100 text-yellow-800';
      case 'On Track':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getUtilizationColor(percentage: number): string {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    if (percentage >= 50) return 'bg-blue-600';
    return 'bg-green-600';
  }
}

export default new BudgetService();
