import { useState, useEffect } from 'react';
import { Plus, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, XCircle } from 'lucide-react';
import financeService, { BankAccount } from '@/services/financeService';

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    branch: '',
    account_type: 'current',
    currency: 'KES',
    current_balance: '',
  });

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const data = await financeService.getBankAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
      alert('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await financeService.createBankAccount({
        ...formData,
        current_balance: parseFloat(formData.current_balance || '0'),
      });
      alert('Bank account created successfully!');
      setShowModal(false);
      resetForm();
      loadBankAccounts();
    } catch (error) {
      console.error('Failed to create bank account:', error);
      alert('Failed to create bank account');
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      branch: '',
      account_type: 'current',
      currency: 'KES',
      current_balance: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance?.toString() || '0')), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your bank accounts and transactions</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Account
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Balance</p>
            <h2 className="text-4xl font-bold mt-2">{formatCurrency(totalBalance)}</h2>
            <p className="text-blue-100 text-sm mt-2">Across {accounts.length} account(s)</p>
          </div>
          <div className="bg-blue-500 bg-opacity-50 p-4 rounded-full">
            <CreditCard className="h-12 w-12" />
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading accounts...</div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <div 
              key={account.id} 
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => setSelectedAccount(account)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {account.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">{account.account_name}</h3>
              <p className="text-sm text-gray-600 mb-3">{account.bank_name}</p>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Account Number</span>
                  <span className="text-sm font-medium text-gray-900">{account.account_number}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{account.account_type}</span>
                </div>
                {account.branch && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Branch</span>
                    <span className="text-sm font-medium text-gray-900">{account.branch}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Current Balance</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(parseFloat(account.current_balance?.toString() || '0'))}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bank accounts yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first bank account</p>
            <button 
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Bank Account
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 p-3 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Deposit</h3>
          <p className="text-sm text-gray-600">Add money to bank account</p>
          <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Coming Soon
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowUpRight className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Withdrawal</h3>
          <p className="text-sm text-gray-600">Record money taken out</p>
          <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Coming Soon
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Transfer Funds</h3>
          <p className="text-sm text-gray-600">Move money between accounts</p>
          <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Coming Soon
          </button>
        </div>
      </div>

      {/* M-Pesa Integration Info */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="bg-green-500 p-3 rounded-full mr-4">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">M-Pesa Integration</h3>
            <p className="text-gray-700 mb-3">
              Track M-Pesa transactions automatically. Fee payments via M-Pesa are automatically recorded as income.
            </p>
            <div className="flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-600">Business No.</p>
                <p className="font-semibold text-gray-900">247247</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-600">Account</p>
                <p className="font-semibold text-gray-900">School Fees</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add Bank Account</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., School Operating Account"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Equity Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="fixed_deposit">Fixed Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Nairobi Branch"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
