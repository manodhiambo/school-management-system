import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  CalculatorIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import financeService from '../../services/financeService';
import api from '../../services/api';

type ReportType = 
  | 'income-statement'
  | 'balance-sheet'
  | 'cash-flow'
  | 'budget-vs-actual'
  | 'fee-collection'
  | 'expense-summary';

type PeriodType = 'monthly' | 'quarterly' | 'annually' | 'custom';
type FormatType = 'pdf' | 'excel' | 'csv' | 'preview';

interface ReportData {
  income_statement?: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
    income_by_category: Array<{ category: string; total: number }>;
    expenses_by_category: Array<{ category: string; total: number }>;
  };
  balance_sheet?: {
    total_assets: number;
    total_liabilities: number;
    equity: number;
  };
  cash_flow?: {
    operating_cash_flow: number;
    investing_cash_flow: number;
    financing_cash_flow: number;
    net_cash_flow: number;
  };
  budget_variance?: Array<{
    budget_name: string;
    allocated: number;
    spent: number;
    variance: number;
    variance_percentage: number;
  }>;
  fee_collection?: {
    total_expected: number;
    total_collected: number;
    total_outstanding: number;
    collection_rate: number;
  };
  expense_summary?: {
    total: number;
    paid: number;
    pending: number;
    by_category: Array<{ category: string; amount: number; count: number }>;
  };
}

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('income-statement');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState<FormatType>('preview');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const loadDashboard = async () => {
    try {
      const data = await financeService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const handlePeriodChange = (period: PeriodType) => {
    setPeriodType(period);
    const today = new Date();
    
    switch (period) {
      case 'monthly':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(firstDay.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        setDateFrom(quarterStart.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'annually':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(yearStart.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let data: ReportData = {};

      switch (reportType) {
        case 'income-statement':
          const [incomeByCategory, expensesByCategory, dashboardData] = await Promise.all([
            financeService.getIncomeByCategory({ dateFrom, dateTo }),
            financeService.getExpensesByCategory({ dateFrom, dateTo }),
            financeService.getDashboard(),
          ]);

          const totalIncome = incomeByCategory.reduce((sum: number, cat: any) => sum + Number(cat.total), 0);
          const totalExpenses = expensesByCategory.reduce((sum: number, cat: any) => sum + Number(cat.total), 0);

          data.income_statement = {
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_profit: totalIncome - totalExpenses,
            income_by_category: incomeByCategory,
            expenses_by_category: expensesByCategory,
          };
          break;

        case 'balance-sheet':
          const assets = await financeService.getAssetsSummary();
          const bankAccounts = await financeService.getBankAccounts();
          
          const totalAssets = Number(assets.total_current_value || 0);
          const totalCash = bankAccounts.reduce((sum: number, acc: any) => sum + Number(acc.current_balance || 0), 0);
          const totalLiabilities = 0; // Would come from liabilities table
          
          data.balance_sheet = {
            total_assets: totalAssets + totalCash,
            total_liabilities: totalLiabilities,
            equity: (totalAssets + totalCash) - totalLiabilities,
          };
          break;

        case 'cash-flow':
          const incomeRecords = await financeService.getIncomeRecords({ dateFrom, dateTo, status: 'completed' });
          const expenseRecords = await financeService.getExpenseRecords({ dateFrom, dateTo, status: 'paid' });
          
          const cashInflow = incomeRecords.reduce((sum: number, rec: any) => sum + Number(rec.total_amount), 0);
          const cashOutflow = expenseRecords.reduce((sum: number, rec: any) => sum + Number(rec.total_amount), 0);
          
          data.cash_flow = {
            operating_cash_flow: cashInflow - cashOutflow,
            investing_cash_flow: 0,
            financing_cash_flow: 0,
            net_cash_flow: cashInflow - cashOutflow,
          };
          break;

        case 'budget-vs-actual':
          const budgets = await api.getAllBudgets({ status: 'approved' });
          
          data.budget_variance = budgets.map((budget: any) => ({
            budget_name: budget.budget_name,
            allocated: Number(budget.total_amount),
            spent: Number(budget.spent_amount),
            variance: Number(budget.total_amount) - Number(budget.spent_amount),
            variance_percentage: budget.total_amount > 0 
              ? ((Number(budget.spent_amount) / Number(budget.total_amount)) * 100)
              : 0,
          }));
          break;

        case 'fee-collection':
          // This would integrate with your fee management system
          data.fee_collection = {
            total_expected: 5000000,
            total_collected: 3750000,
            total_outstanding: 1250000,
            collection_rate: 75,
          };
          break;

        case 'expense-summary':
          const allExpenses = await financeService.getExpenseRecords({ dateFrom, dateTo });
          const expensesCategory = await financeService.getExpensesByCategory({ dateFrom, dateTo });
          
          const totalExp = allExpenses.reduce((sum: number, exp: any) => sum + Number(exp.total_amount), 0);
          const paidExp = allExpenses
            .filter((exp: any) => exp.status === 'paid')
            .reduce((sum: number, exp: any) => sum + Number(exp.total_amount), 0);
          const pendingExp = allExpenses
            .filter((exp: any) => exp.status === 'pending' || exp.status === 'approved')
            .reduce((sum: number, exp: any) => sum + Number(exp.total_amount), 0);
          
          data.expense_summary = {
            total: totalExp,
            paid: paidExp,
            pending: pendingExp,
            by_category: expensesCategory.map((cat: any) => ({
              category: cat.category,
              amount: Number(cat.total),
              count: 0,
            })),
          };
          break;
      }

      setReportData(data);

      if (format !== 'preview') {
        handleExport(data);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (data: ReportData) => {
    const reportContent = JSON.stringify(data, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-${dateFrom}-${dateTo}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleQuickReport = async (type: string) => {
    const today = new Date();
    
    switch (type) {
      case 'monthly':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(firstDay.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        setReportType('income-statement');
        setPeriodType('monthly');
        break;
      case 'ytd':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(yearStart.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        setReportType('income-statement');
        setPeriodType('annually');
        break;
      case 'fee-collection':
        setReportType('fee-collection');
        setPeriodType('monthly');
        break;
      case 'outstanding-expenses':
        setReportType('expense-summary');
        setPeriodType('monthly');
        break;
    }
    
    setTimeout(() => generateReport(), 100);
  };

  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'income-statement':
        return <ChartBarIcon className="h-6 w-6" />;
      case 'balance-sheet':
        return <CalculatorIcon className="h-6 w-6" />;
      case 'cash-flow':
        return <BanknotesIcon className="h-6 w-6" />;
      default:
        return <DocumentTextIcon className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500">Generate comprehensive financial reports</p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? (
            'Generating...'
          ) : (
            <>
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Report Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Type Selection */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Report Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                type: 'income-statement' as ReportType,
                title: 'Income Statement',
                description: 'Profit & Loss report showing income and expenses',
              },
              {
                type: 'balance-sheet' as ReportType,
                title: 'Balance Sheet',
                description: 'Assets, liabilities, and equity summary',
              },
              {
                type: 'cash-flow' as ReportType,
                title: 'Cash Flow Statement',
                description: 'Cash inflows and outflows',
              },
              {
                type: 'budget-vs-actual' as ReportType,
                title: 'Budget vs Actual',
                description: 'Compare budgeted amounts with actual spending',
              },
              {
                type: 'fee-collection' as ReportType,
                title: 'Fee Collection Report',
                description: 'Student fee payments and outstanding balances',
              },
              {
                type: 'expense-summary' as ReportType,
                title: 'Expense Summary',
                description: 'Detailed breakdown of all expenses',
              },
            ].map((report) => (
              <button
                key={report.type}
                onClick={() => setReportType(report.type)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  reportType === report.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${reportType === report.type ? 'text-blue-600' : 'text-gray-400'}`}>
                    {getReportTypeIcon(report.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{report.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{report.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Reports */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Reports</h3>
          <div className="space-y-3">
            <button
              onClick={() => handleQuickReport('monthly')}
              className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="font-medium text-gray-900">This Month's Summary</div>
              <div className="text-sm text-gray-500 mt-1">
                Income, expenses, and profit for current month
              </div>
            </button>
            <button
              onClick={() => handleQuickReport('ytd')}
              className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="font-medium text-gray-900">Year-to-Date Report</div>
              <div className="text-sm text-gray-500 mt-1">
                Complete financial summary for this year
              </div>
            </button>
            <button
              onClick={() => handleQuickReport('fee-collection')}
              className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="font-medium text-gray-900">Fee Collection Status</div>
              <div className="text-sm text-gray-500 mt-1">
                Current term fee collection report
              </div>
            </button>
            <button
              onClick={() => handleQuickReport('outstanding-expenses')}
              className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="font-medium text-gray-900">Outstanding Expenses</div>
              <div className="text-sm text-gray-500 mt-1">
                Pending and unpaid expense items
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Report Parameters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period Type
            </label>
            <select
              value={periodType}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as FormatType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="preview">Preview</option>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
            <button
              onClick={() => handleExport(reportData)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Report
            </button>
          </div>

          {/* Income Statement Preview */}
          {reportType === 'income-statement' && reportData.income_statement && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total Income</div>
                  <div className="text-2xl font-bold text-green-900 mt-2">
                    KES {reportData.income_statement.total_income.toLocaleString()}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-900 mt-2">
                    KES {reportData.income_statement.total_expenses.toLocaleString()}
                  </div>
                </div>
                <div className={`${reportData.income_statement.net_profit >= 0 ? 'bg-blue-50' : 'bg-red-50'} p-4 rounded-lg`}>
                  <div className={`text-sm font-medium ${reportData.income_statement.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    Net {reportData.income_statement.net_profit >= 0 ? 'Profit' : 'Loss'}
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${reportData.income_statement.net_profit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                    KES {Math.abs(reportData.income_statement.net_profit).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Income by Category</h4>
                  <div className="space-y-2">
                    {reportData.income_statement.income_by_category.map((cat: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{cat.category}</span>
                        <span className="text-sm font-medium text-gray-900">
                          KES {Number(cat.total).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Expenses by Category</h4>
                  <div className="space-y-2">
                    {reportData.income_statement.expenses_by_category.map((cat: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{cat.category}</span>
                        <span className="text-sm font-medium text-gray-900">
                          KES {Number(cat.total).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Sheet Preview */}
          {reportType === 'balance-sheet' && reportData.balance_sheet && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Assets</div>
                <div className="text-2xl font-bold text-blue-900 mt-2">
                  KES {reportData.balance_sheet.total_assets.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Total Liabilities</div>
                <div className="text-2xl font-bold text-red-900 mt-2">
                  KES {reportData.balance_sheet.total_liabilities.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Equity</div>
                <div className="text-2xl font-bold text-green-900 mt-2">
                  KES {reportData.balance_sheet.equity.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Preview */}
          {reportType === 'cash-flow' && reportData.cash_flow && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 font-medium">Operating Cash Flow</div>
                <div className="text-xl font-bold text-gray-900 mt-2">
                  KES {reportData.cash_flow.operating_cash_flow.toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Net Cash Flow</div>
                <div className="text-xl font-bold text-blue-900 mt-2">
                  KES {reportData.cash_flow.net_cash_flow.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Budget vs Actual Preview */}
          {reportType === 'budget-vs-actual' && reportData.budget_variance && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.budget_variance.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.budget_name}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        KES {item.allocated.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        KES {item.spent.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-medium ${item.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        KES {item.variance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {item.variance_percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expense Summary Preview */}
          {reportType === 'expense-summary' && reportData.expense_summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Total Expenses</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">
                    KES {reportData.expense_summary.total.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Paid</div>
                  <div className="text-2xl font-bold text-green-900 mt-2">
                    KES {reportData.expense_summary.paid.toLocaleString()}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">Pending</div>
                  <div className="text-2xl font-bold text-yellow-900 mt-2">
                    KES {reportData.expense_summary.pending.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Expenses by Category</h4>
                <div className="space-y-2">
                  {reportData.expense_summary.by_category.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{cat.category}</span>
                      <span className="text-sm font-medium text-gray-900">
                        KES {cat.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fee Collection Preview */}
          {reportType === 'fee-collection' && reportData.fee_collection && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Expected</div>
                <div className="text-xl font-bold text-blue-900 mt-2">
                  KES {reportData.fee_collection.total_expected.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Collected</div>
                <div className="text-xl font-bold text-green-900 mt-2">
                  KES {reportData.fee_collection.total_collected.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Outstanding</div>
                <div className="text-xl font-bold text-red-900 mt-2">
                  KES {reportData.fee_collection.total_outstanding.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Collection Rate</div>
                <div className="text-xl font-bold text-purple-900 mt-2">
                  {reportData.fee_collection.collection_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KRA Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <CalendarIcon className="h-6 w-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">KRA Tax Compliance</h4>
            <p className="text-sm text-blue-700 mt-1">
              All reports include VAT calculations at 16% as per Kenya Revenue Authority requirements.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-blue-600">Current VAT Rate</div>
                <div className="text-lg font-bold text-blue-900">16%</div>
              </div>
              <div>
                <div className="text-xs text-blue-600">Tax Period</div>
                <div className="text-lg font-bold text-blue-900">Monthly</div>
              </div>
              <div>
                <div className="text-xs text-blue-600">Next Filing</div>
                <div className="text-lg font-bold text-blue-900">20th of Month</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
