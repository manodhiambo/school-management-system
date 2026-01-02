import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Building2,
  CreditCard,
  AlertCircle,
  Calendar,
  FileText,
} from 'lucide-react';
import financeService from '@/services/financeService';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingApprovals: number;
  bankBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashFlow: number;
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingApprovals: 0,
    bankBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    cashFlow: 0,
  });
  const [loading, setLoading] = useState(true);
  const [incomeByCategory, setIncomeByCategory] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardData, incomeData, expenseData] = await Promise.all([
        financeService.getDashboard(),
        financeService.getIncomeByCategory(),
        financeService.getExpensesByCategory(),
      ]);
      
      setStats(dashboardData);
      setIncomeByCategory(incomeData);
      setExpensesByCategory(expenseData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const quickActions = [
    { name: 'Record Income', href: '/app/finance/transactions?type=income', icon: TrendingUp, color: 'bg-green-500' },
    { name: 'Record Expense', href: '/app/finance/transactions?type=expense', icon: TrendingDown, color: 'bg-red-500' },
    { name: 'Add Vendor', href: '/app/finance/vendors?action=new', icon: Building2, color: 'bg-blue-500' },
    { name: 'Create PO', href: '/app/finance/vendors?tab=purchase-orders&action=new', icon: FileText, color: 'bg-purple-500' },
    { name: 'Bank Transaction', href: '/app/finance/bank-accounts?action=transaction', icon: CreditCard, color: 'bg-indigo-500' },
    { name: 'Petty Cash', href: '/app/finance/petty-cash?action=new', icon: DollarSign, color: 'bg-yellow-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your financial operations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-KE', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">This month: {formatCurrency(stats.monthlyIncome)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">This month: {formatCurrency(stats.monthlyExpenses)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold mt-2 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.netProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${stats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <Wallet className={`h-6 w-6 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Cash flow: {formatCurrency(stats.cashFlow)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Balance</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(stats.bankBalance)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all accounts</p>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have <strong>{stats.pendingApprovals}</strong> expense(s) pending approval.
                <Link to="/app/finance/transactions?status=pending" className="ml-2 font-medium underline">
                  Review now
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className={`${action.color} p-3 rounded-full mb-2`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Income by Category</h2>
          {incomeByCategory.length > 0 ? (
            <div className="space-y-3">
              {incomeByCategory.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(category.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(category.total / stats.totalIncome) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No income data available</p>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h2>
          {expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {expensesByCategory.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(category.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(category.total / stats.totalExpenses) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No expense data available</p>
          )}
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/app/finance/budgets"
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
        >
          <TrendingUp className="h-8 w-8 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Budget Management</h3>
          <p className="text-blue-100">Track and manage your budgets</p>
        </Link>

        <Link
          to="/app/finance/reports"
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
        >
          <Receipt className="h-8 w-8 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Financial Reports</h3>
          <p className="text-purple-100">Generate detailed reports</p>
        </Link>

        <Link
          to="/app/finance/assets"
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow"
        >
          <Building2 className="h-8 w-8 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Asset Register</h3>
          <p className="text-green-100">Manage school assets</p>
        </Link>
      </div>
    </div>
  );
}
