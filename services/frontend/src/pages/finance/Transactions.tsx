import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, Download, Check, X, Eye, XCircle } from 'lucide-react';
import financeService, { IncomeRecord, ExpenseRecord } from '@/services/financeService';

type TransactionType = 'income' | 'expense';

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TransactionType>(
    (searchParams.get('type') as TransactionType) || 'income'
  );
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    dateFrom: '',
    dateTo: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    account_id: '',
    vendor_id: '',
    amount: '',
    description: '',
    reference_number: '',
    payment_method: 'cash',
    include_vat: true,
  });

  useEffect(() => {
    loadTransactions();
    loadAccounts();
    if (activeTab === 'expense') {
      loadVendors();
    }
  }, [activeTab, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      if (activeTab === 'income') {
        const data = await financeService.getIncomeRecords(filters);
        setIncomeRecords(data);
      } else {
        const data = await financeService.getExpenseRecords(filters);
        setExpenseRecords(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await financeService.getChartOfAccounts();
      const filteredAccounts = data.filter((acc: any) => 
        activeTab === 'income' ? acc.account_type === 'income' : acc.account_type === 'expense'
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await financeService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amount = parseFloat(formData.amount);
      let vat_amount = 0;
      let final_amount = amount;
      
      if (formData.include_vat) {
        vat_amount = financeService.calculateVAT(amount);
      }

      const transactionData = {
        transaction_date: formData.transaction_date,
        account_id: formData.account_id,
        amount: final_amount,
        vat_amount: vat_amount,
        description: formData.description,
        reference_number: formData.reference_number,
        payment_method: formData.payment_method,
        ...(activeTab === 'expense' && formData.vendor_id ? { vendor_id: formData.vendor_id } : {}),
      };

      if (activeTab === 'income') {
        await financeService.createIncome(transactionData);
      } else {
        await financeService.createExpense(transactionData);
      }

      alert(`${activeTab === 'income' ? 'Income' : 'Expense'} recorded successfully!`);
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      account_id: '',
      vendor_id: '',
      amount: '',
      description: '',
      reference_number: '',
      payment_method: 'cash',
      include_vat: true,
    });
  };

  const handleApproveExpense = async (id: string) => {
    if (!confirm('Approve this expense?')) return;
    
    try {
      await financeService.approveExpense(id);
      alert('Expense approved successfully');
      loadTransactions();
    } catch (error) {
      console.error('Failed to approve expense:', error);
      alert('Failed to approve expense');
    }
  };

  const handleRejectExpense = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await financeService.rejectExpense(id, reason);
      alert('Expense rejected');
      loadTransactions();
    } catch (error) {
      console.error('Failed to reject expense:', error);
      alert('Failed to reject expense');
    }
  };

  const handlePayExpense = async (id: string) => {
    if (!confirm('Mark this expense as paid?')) return;
    
    try {
      await financeService.payExpense(id);
      alert('Expense marked as paid');
      loadTransactions();
    } catch (error) {
      console.error('Failed to pay expense:', error);
      alert('Failed to mark expense as paid');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-KE');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px;
              background: white;
            }
            .print\:hidden {
              display: none !important;
            }
            @page {
              margin: 20mm;
            }
          }
        `}
      </style>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">Manage income and expenses</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New {activeTab === 'income' ? 'Income' : 'Expense'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('income')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'income'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
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
              onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : activeTab === 'income' ? (
              incomeRecords.length > 0 ? (
                incomeRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(activeTab === 'income' ? record.income_date : record.expense_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.account_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(parseFloat(record.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.vat_amount ? formatCurrency(parseFloat(record.vat_amount)) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(parseFloat(record.amount) + parseFloat(record.vat_amount || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => handleViewDetails(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No income records found
                  </td>
                </tr>
              )
            ) : expenseRecords.length > 0 ? (
              expenseRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(activeTab === 'income' ? record.income_date : record.expense_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.account_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.reference_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(parseFloat(record.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.vat_amount ? formatCurrency(parseFloat(record.vat_amount)) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {formatCurrency(parseFloat(record.amount) + parseFloat(record.vat_amount || 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {record.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveExpense(record.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectExpense(record.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {record.status === 'approved' && (
                        <button
                          onClick={() => handlePayExpense(record.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-600 rounded"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="text-gray-600 hover:text-gray-800"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No expense records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for New Transaction */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                New {activeTab === 'income' ? 'Income' : 'Expense'}
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
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor (Optional)
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
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
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., INV-001, REC-123"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include_vat"
                  checked={formData.include_vat}
                  onChange={(e) => setFormData({ ...formData, include_vat: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="include_vat" className="ml-2 text-sm text-gray-700">
                  Include 16% VAT
                </label>
              </div>

              {formData.include_vat && formData.amount && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <div className="flex justify-between mb-1">
                      <span>Amount:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(formData.amount || '0'))}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>VAT (16%):</span>
                      <span className="font-medium">{formatCurrency(financeService.calculateVAT(parseFloat(formData.amount || '0')))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(financeService.calculateTotalWithVAT(parseFloat(formData.amount || '0')))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                  Record {activeTab === 'income' ? 'Income' : 'Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}
      {/* View Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "income" ? "Income" : "Expense"} Details
              </h2>
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 print:hidden"
              >
                Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 print-content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Number</label>
                  <p className="text-gray-900">
                    {activeTab === "income" ? selectedRecord.income_number : selectedRecord.expense_number}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">
                    {formatDate(activeTab === "income" ? selectedRecord.income_date : selectedRecord.expense_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account</label>
                  <p className="text-gray-900">{selectedRecord.account_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">
                    {activeTab === "income" ? selectedRecord.income_category : selectedRecord.expense_category}
                  </p>
                </div>
                {activeTab === "expense" && selectedRecord.vendor_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-gray-900">{selectedRecord.vendor_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-gray-900 capitalize">{selectedRecord.payment_method}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-gray-900 font-semibold">
                    {formatCurrency(parseFloat(selectedRecord.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">VAT</label>
                  <p className="text-gray-900">
                    {selectedRecord.vat_amount ? formatCurrency(parseFloat(selectedRecord.vat_amount)) : "Ksh 0"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(parseFloat(selectedRecord.total_amount))}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{selectedRecord.description}</p>
              </div>

              {selectedRecord.payment_reference && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Number</label>
                  <p className="text-gray-900">{selectedRecord.payment_reference}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full $${getStatusBadge(selectedRecord.status)}`}>
                  {selectedRecord.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
    </>
  );
}
