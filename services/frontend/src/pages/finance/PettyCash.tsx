import { useState, useEffect } from 'react';
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight, User, XCircle, Trash2, Calendar } from 'lucide-react';
import financeService, { PettyCashTransaction, PettyCashSummary } from '@/services/financeService';

export default function PettyCash() {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [summary, setSummary] = useState<PettyCashSummary>({
    total_replenished: 0,
    total_disbursed: 0,
    current_balance: 0,
    monthly_disbursed: 0,
    monthly_replenished: 0,
    custodians: [],
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    transaction_type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'disbursement' as 'disbursement' | 'replenishment',
    amount: '',
    description: '',
    custodian: '',
    receipt_number: '',
    category: '',
  });

  useEffect(() => {
    loadTransactions();
    loadSummary();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await financeService.getPettyCash(filters);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load petty cash transactions:', error);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await financeService.getPettyCashSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await financeService.createPettyCash({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      alert('Transaction recorded successfully!');
      setShowModal(false);
      resetForm();
      loadTransactions();
      loadSummary();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await financeService.deletePettyCash(id);
      alert('Transaction deleted successfully');
      loadTransactions();
      loadSummary();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'disbursement',
      amount: '',
      description: '',
      custodian: '',
      receipt_number: '',
      category: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const categories = [
    'Office Supplies',
    'Transportation',
    'Meals & Refreshments',
    'Utilities',
    'Maintenance',
    'Miscellaneous',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Petty Cash Management</h1>
          <p className="text-gray-600 mt-1">Track and manage petty cash transactions</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(parseFloat(summary.current_balance?.toString() || '0'))}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Disbursed</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {formatCurrency(parseFloat(summary.total_disbursed?.toString() || '0'))}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowUpRight className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This month: {formatCurrency(parseFloat(summary.monthly_disbursed?.toString() || '0'))}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Replenished</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(parseFloat(summary.total_replenished?.toString() || '0'))}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <ArrowDownRight className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This month: {formatCurrency(parseFloat(summary.monthly_replenished?.toString() || '0'))}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => {
            setFormData({ ...formData, transaction_type: 'disbursement' });
            setShowModal(true);
          }}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-full mr-4">
              <ArrowUpRight className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Record Disbursement</h3>
              <p className="text-sm text-gray-600">Pay out petty cash</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => {
            setFormData({ ...formData, transaction_type: 'replenishment' });
            setShowModal(true);
          }}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <ArrowDownRight className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Replenish Cash</h3>
              <p className="text-sm text-gray-600">Add money to petty cash</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.transaction_type}
              onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="disbursement">Disbursement</option>
              <option value="replenishment">Replenishment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ transaction_type: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custodian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.transaction_type === 'disbursement' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.transaction_type === 'disbursement' ? 'Disbursement' : 'Replenishment'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{transaction.category || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.custodian}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.receipt_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-semibold ${
                      transaction.transaction_type === 'disbursement' 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {transaction.transaction_type === 'disbursement' ? '-' : '+'}
                      {formatCurrency(parseFloat(transaction.amount?.toString() || '0'))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p>No transactions yet</p>
                  <p className="text-sm mt-1">Click "New Transaction" to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Custodians Section */}
      {summary.custodians && summary.custodians.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Petty Cash Custodians</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.custodians.map((custodian, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{custodian.custodian}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(parseFloat(custodian.balance?.toString() || '0'))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Petty Cash Guidelines</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>All petty cash transactions must be supported by receipts</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Maximum single disbursement: KES 5,000</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Petty cash must be reconciled weekly</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Custodians are responsible for all cash in their custody</span>
          </li>
        </ul>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                New {formData.transaction_type === 'disbursement' ? 'Disbursement' : 'Replenishment'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="disbursement">Disbursement (Payment Out)</option>
                    <option value="replenishment">Replenishment (Add Cash)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (KES) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    max="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: KES 5,000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custodian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.custodian}
                    onChange={(e) => setFormData({ ...formData, custodian: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Enter transaction description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., REC-001"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
