import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  PencilIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import budgetService, { Budget, BudgetItem, BudgetSummary, BudgetVariance } from '../../services/budgetService';
import financeService from '../../services/financeService';

type ViewMode = 'list' | 'details' | 'analytics' | 'variance';

const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetVariance, setBudgetVariance] = useState<BudgetVariance[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [budgetForm, setBudgetForm] = useState({
    budget_name: '',
    financial_year_id: '',
    start_date: '',
    end_date: '',
    total_amount: '',
    description: '',
  });

  const [itemForm, setItemForm] = useState({
    item_name: '',
    account_id: '',
    allocated_amount: '',
    description: '',
  });

  const [budgetItemsList, setBudgetItemsList] = useState<Array<{
    item_name: string;
    account_id: string;
    allocated_amount: number;
    description: string;
  }>>([]);

  useEffect(() => {
    loadBudgets();
    loadFinancialYears();
    loadAccounts();
  }, [filterStatus]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? { status: filterStatus } : {};
      const data = await budgetService.getBudgets(params);
      setBudgets(data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialYears = async () => {
    try {
      const data = await financeService.getFinancialYears();
      setFinancialYears(data);
    } catch (error) {
      console.error('Failed to load financial years:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeService.getChartOfAccounts();
      setAccounts(data.filter((acc: any) => acc.account_type === 'expense'));
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleViewDetails = async (budget: Budget) => {
    try {
      setSelectedBudget(budget);
      const items = await budgetService.getBudgetItems(budget.id);
      setBudgetItems(items);
      setViewMode('details');
    } catch (error) {
      console.error('Failed to load budget details:', error);
    }
  };

  const handleViewAnalytics = async (budget: Budget) => {
    try {
      setSelectedBudget(budget);
      const summary = await budgetService.getBudgetSummary(budget.id);
      setBudgetSummary(summary);
      setViewMode('analytics');
    } catch (error) {
      console.error('Failed to load budget analytics:', error);
    }
  };

  const handleViewVariance = async (budget: Budget) => {
    try {
      setSelectedBudget(budget);
      const variance = await budgetService.getBudgetVariance(budget.id);
      setBudgetVariance(variance);
      setViewMode('variance');
    } catch (error) {
      console.error('Failed to load budget variance:', error);
    }
  };

  const handleAddItemToBudget = () => {
    if (!itemForm.item_name || !itemForm.account_id || !itemForm.allocated_amount) {
      alert('Please fill all required fields');
      return;
    }

    setBudgetItemsList([
      ...budgetItemsList,
      {
        item_name: itemForm.item_name,
        account_id: itemForm.account_id,
        allocated_amount: parseFloat(itemForm.allocated_amount),
        description: itemForm.description,
      },
    ]);

    setItemForm({
      item_name: '',
      account_id: '',
      allocated_amount: '',
      description: '',
    });
  };

  const handleRemoveItemFromList = (index: number) => {
    setBudgetItemsList(budgetItemsList.filter((_, i) => i !== index));
  };

  const handleSubmitBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAllocated = budgetItemsList.reduce(
        (sum, item) => sum + item.allocated_amount,
        0
      );

      await budgetService.createBudget({
        ...budgetForm,
        total_amount: parseFloat(budgetForm.total_amount) || totalAllocated,
        items: budgetItemsList,
      });

      setShowModal(false);
      resetBudgetForm();
      loadBudgets();
    } catch (error) {
      console.error('Failed to create budget:', error);
      alert('Failed to create budget');
    }
  };

  const handleAddBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;

    try {
      await budgetService.addBudgetItem(selectedBudget.id, {
        ...itemForm,
        allocated_amount: parseFloat(itemForm.allocated_amount),
      });

      setShowItemModal(false);
      setItemForm({
        item_name: '',
        account_id: '',
        allocated_amount: '',
        description: '',
      });

      // Reload budget items
      const items = await budgetService.getBudgetItems(selectedBudget.id);
      setBudgetItems(items);
    } catch (error) {
      console.error('Failed to add budget item:', error);
      alert('Failed to add budget item');
    }
  };

  const handleDeleteBudgetItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this budget item?')) return;

    try {
      await budgetService.deleteBudgetItem(itemId);
      if (selectedBudget) {
        const items = await budgetService.getBudgetItems(selectedBudget.id);
        setBudgetItems(items);
      }
    } catch (error) {
      console.error('Failed to delete budget item:', error);
      alert('Failed to delete budget item');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this budget?')) return;

    try {
      await budgetService.approveBudget(id);
      loadBudgets();
      if (selectedBudget?.id === id) {
        setViewMode('list');
        setSelectedBudget(null);
      }
    } catch (error) {
      console.error('Failed to approve budget:', error);
      alert('Failed to approve budget');
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close this budget? This action cannot be undone.')) return;

    try {
      await budgetService.closeBudget(id);
      loadBudgets();
      if (selectedBudget?.id === id) {
        setViewMode('list');
        setSelectedBudget(null);
      }
    } catch (error) {
      console.error('Failed to close budget:', error);
      alert('Failed to close budget');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      await budgetService.deleteBudget(id);
      loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget. Make sure there are no recorded expenses.');
    }
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      budget_name: '',
      financial_year_id: '',
      start_date: '',
      end_date: '',
      total_amount: '',
      description: '',
    });
    setBudgetItemsList([]);
  };

  const totalAllocatedInItems = budgetItemsList.reduce(
    (sum, item) => sum + item.allocated_amount,
    0
  );

  if (loading && viewMode === 'list') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading budgets...</div>
      </div>
    );
  }

  // List View
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Budget
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Budgets</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {budgets.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Allocated</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              KES {budgets.reduce((sum, b) => sum + Number(b.total_amount), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Spent</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              KES {budgets.reduce((sum, b) => sum + Number(b.spent_amount), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Active Budgets</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {budgets.filter(b => b.status === 'approved' || b.status === 'active').length}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Budgets Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgets.map((budget) => {
                  const utilization = budgetService.calculateUtilization(
                    Number(budget.spent_amount),
                    Number(budget.total_amount)
                  );

                  return (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {budget.budget_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {budget.financial_year_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(budget.start_date).toLocaleDateString()} -{' '}
                        {new Date(budget.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          KES {Number(budget.total_amount).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Spent: KES {Number(budget.spent_amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${budgetService.getUtilizationColor(utilization)}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {budget.item_count || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${budgetService.getStatusColor(
                            budget.status
                          )}`}
                        >
                          {budget.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(budget)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleViewAnalytics(budget)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Analytics"
                          >
                            <ChartBarIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleViewVariance(budget)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Variance Report"
                          >
                            <DocumentChartBarIcon className="h-5 w-5" />
                          </button>
                          {budget.status === 'draft' && (
                            <button
                              onClick={() => handleApprove(budget.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          {(budget.status === 'approved' || budget.status === 'active') && (
                            <button
                              onClick={() => handleClose(budget.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Close Budget"
                            >
                              <ArchiveBoxIcon className="h-5 w-5" />
                            </button>
                          )}
                          {budget.status === 'draft' && Number(budget.spent_amount) === 0 && (
                            <button
                              onClick={() => handleDelete(budget.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {budgets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No budgets found. Create your first budget to get started.
              </p>
            </div>
          )}
        </div>

        {/* Create Budget Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Create New Budget</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetBudgetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitBudget} className="space-y-6">
                {/* Budget Details */}
                <div className="border-b pb-4">
                  <h4 className="font-medium text-gray-900 mb-4">Budget Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Budget Name
                      </label>
                      <input
                        type="text"
                        placeholder="Leave empty for auto-generation (BDG-00001)"
                        value={budgetForm.budget_name}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, budget_name: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Financial Year *
                      </label>
                      <select
                        required
                        value={budgetForm.financial_year_id}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, financial_year_id: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Financial Year</option>
                        {financialYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Budget Amount (KES)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={budgetForm.total_amount}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, total_amount: e.target.value })
                        }
                        placeholder={`Auto-calculated: ${totalAllocatedInItems.toLocaleString()}`}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Leave empty to auto-calculate from items
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={budgetForm.start_date}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, start_date: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={budgetForm.end_date}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, end_date: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={budgetForm.description}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, description: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Budget Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Budget Line Items</h4>

                  {/* Add Item Form */}
                  <div className="bg-gray-50 p-4 rounded-md mb-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Item Name"
                          value={itemForm.item_name}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, item_name: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={itemForm.account_id}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, account_id: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Select Account</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                          value={itemForm.allocated_amount}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, allocated_amount: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Description"
                          value={itemForm.description}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, description: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={handleAddItemToBudget}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {budgetItemsList.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Item
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Account
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              Amount
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {budgetItemsList.map((item, index) => {
                            const account = accounts.find(a => a.id === item.account_id);
                            return (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {item.item_name}
                                  {item.description && (
                                    <div className="text-xs text-gray-500">
                                      {item.description}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {account ? `${account.account_code} - ${account.account_name}` : 'N/A'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  KES {item.allocated_amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromList(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-50 font-medium">
                            <td colSpan={2} className="px-4 py-2 text-sm text-gray-900">
                              Total Allocated
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              KES {totalAllocatedInItems.toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetBudgetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Budget
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Details View
  if (viewMode === 'details' && selectedBudget) {
    const utilization = budgetService.calculateUtilization(
      Number(selectedBudget.spent_amount),
      Number(selectedBudget.total_amount)
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedBudget(null);
              }}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Budgets
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedBudget.budget_name}
            </h1>
            <p className="text-gray-500">Budget Details & Line Items</p>
          </div>
          <div className="flex space-x-2">
            {selectedBudget.status !== 'closed' && (
              <button
                onClick={() => setShowItemModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Item
              </button>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Budget</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              KES {Number(selectedBudget.total_amount).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Spent</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              KES {Number(selectedBudget.spent_amount).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Remaining</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              KES {(Number(selectedBudget.total_amount) - Number(selectedBudget.spent_amount)).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Utilization</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {utilization.toFixed(1)}%
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${budgetService.getUtilizationColor(utilization)}`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Budget Items Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Budget Line Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetItems.map((item) => {
                  const itemUtilization = budgetService.calculateUtilization(
                    Number(item.spent_amount),
                    Number(item.allocated_amount)
                  );
                  const remaining = Number(item.allocated_amount) - Number(item.spent_amount);

                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.item_name}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-500">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.account_code && `${item.account_code} - `}
                        {item.account_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        KES {Number(item.allocated_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                        KES {Number(item.spent_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={remaining < 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          KES {remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${budgetService.getUtilizationColor(itemUtilization)}`}
                              style={{ width: `${Math.min(itemUtilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {itemUtilization.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {selectedBudget.status !== 'closed' && Number(item.spent_amount) === 0 && (
                          <button
                            onClick={() => handleDeleteBudgetItem(item.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {budgetItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No budget items yet. Add items to track spending by category.
              </p>
            </div>
          )}
        </div>

        {/* Add Budget Item Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Add Budget Item</h3>
                <button
                  onClick={() => {
                    setShowItemModal(false);
                    setItemForm({
                      item_name: '',
                      account_id: '',
                      allocated_amount: '',
                      description: '',
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddBudgetItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.item_name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, item_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expense Account *
                  </label>
                  <select
                    required
                    value={itemForm.account_id}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, account_id: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Allocated Amount (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={itemForm.allocated_amount}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, allocated_amount: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemModal(false);
                      setItemForm({
                        item_name: '',
                        account_id: '',
                        allocated_amount: '',
                        description: '',
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Analytics View
  if (viewMode === 'analytics' && selectedBudget && budgetSummary) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedBudget(null);
              setBudgetSummary(null);
            }}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Budgets
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Budget Analytics: {selectedBudget.budget_name}
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Items</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {budgetSummary.total_items}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Fully Utilized</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {budgetSummary.exhausted_items}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Allocated</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              KES {Number(budgetSummary.total_allocated).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Utilization</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {budgetSummary.utilization_percentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Spending by Category</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetSummary.by_category.map((cat, index) => {
                  const usage = budgetService.calculateUtilization(
                    Number(cat.spent),
                    Number(cat.allocated)
                  );

                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cat.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cat.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {cat.item_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        KES {Number(cat.allocated).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                        KES {Number(cat.spent).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                        KES {Number(cat.remaining).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${budgetService.getUtilizationColor(usage)}`}
                              style={{ width: `${Math.min(usage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {usage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Variance View
  if (viewMode === 'variance' && selectedBudget && budgetVariance) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedBudget(null);
              setBudgetVariance([]);
            }}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Budgets
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Budget Variance Report: {selectedBudget.budget_name}
          </h1>
          <p className="text-gray-500">Budget vs Actual Analysis</p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetVariance.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.account_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      KES {Number(item.allocated_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      KES {Number(item.spent_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={Number(item.variance) < 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        KES {Number(item.variance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={Number(item.variance_percentage) > 0 ? 'text-red-600' : 'text-green-600'}>
                        {item.variance_percentage > 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${budgetService.getVarianceColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {budgetVariance.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No variance data available.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default BudgetManagement;
