import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, Eye, X } from 'lucide-react';
import financeService from '@/services/financeService';

interface BankAccount {
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

interface Transaction {
  id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  description: string;
  transaction_date: string;
  reference_number?: string;
  from_account_id?: string;
  to_account_id?: string;
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransactionsView, setShowTransactionsView] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'transfer'>('deposit');
  
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    branch: '',
    account_type: 'current',
    currency: 'KES',
    current_balance: '0',
  });

  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    reference_number: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.createBankAccount({
        ...accountForm,
        current_balance: parseFloat(accountForm.current_balance),
      });
      alert('Bank account created successfully!');
      setShowAccountModal(false);
      resetAccountForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      alert('Failed to create account');
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setAccountForm({
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name,
      branch: account.branch || '',
      account_type: account.account_type,
      currency: account.currency,
      current_balance: account.current_balance.toString(),
    });
    setShowAccountModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      await financeService.updateBankAccount(selectedAccount.id, {
        ...accountForm,
        current_balance: parseFloat(accountForm.current_balance),
      });
      alert('Account updated successfully!');
      setShowAccountModal(false);
      resetAccountForm();
      setSelectedAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to update account:', error);
      alert('Failed to update account');
    }
  };

  const handleDeleteAccount = async (id: string, accountName: string) => {
    if (!confirm(`Delete "${accountName}"? This action cannot be undone.`)) return;

    try {
      await financeService.deleteBankAccount(id);
      alert('Account deleted successfully');
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...transactionForm,
        transaction_type: transactionType,
        amount: parseFloat(transactionForm.amount),
      };

      await financeService.createBankTransaction(data);
      alert(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} recorded successfully!`);
      setShowTransactionModal(false);
      resetTransactionForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to record transaction:', error);
      alert('Failed to record transaction');
    }
  };

  const resetAccountForm = () => {
    setAccountForm({
      account_name: '',
      account_number: '',
      bank_name: '',
      branch: '',
      account_type: 'current',
      currency: 'KES',
      current_balance: '0',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      account_id: '',
      to_account_id: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      reference_number: '',
    });
  };

  const openTransactionModal = (type: 'deposit' | 'withdrawal' | 'transfer') => {
    setTransactionType(type);
    setShowTransactionModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance.toString()), 0);
  const activeAccounts = accounts.filter(acc => acc.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your bank accounts and transactions</p>
        </div>
        <button
          onClick={() => {
            setSelectedAccount(null);
            resetAccountForm();
            setShowAccountModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Balance</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
          <p className="text-sm mt-2 opacity-75">Across {activeAccounts.length} account(s)</p>
        </div>

        <button
          onClick={() => openTransactionModal('deposit')}
          className="bg-white rounded-lg shadow hover:shadow-md transition p-6 text-left border-2 border-transparent hover:border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Record Deposit</h3>
              <p className="text-gray-500 text-xs mt-1">Add money to bank account</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </button>

        <button
          onClick={() => openTransactionModal('withdrawal')}
          className="bg-white rounded-lg shadow hover:shadow-md transition p-6 text-left border-2 border-transparent hover:border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Record Withdrawal</h3>
              <p className="text-gray-500 text-xs mt-1">Record money taken out</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => openTransactionModal('transfer')}
          className="bg-white rounded-lg shadow hover:shadow-md transition p-6 text-left border-2 border-transparent hover:border-purple-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Transfer Funds</h3>
              <p className="text-gray-500 text-xs mt-1">Move money between accounts</p>
            </div>
            <ArrowRightLeft className="h-8 w-8 text-purple-600" />
          </div>
        </button>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2">M-Pesa Integration</h3>
          <p className="text-xs text-green-700 mb-3">
            Track M-Pesa transactions automatically. Fee payments via M-Pesa are automatically recorded as income.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-green-600 font-medium">Business No.</span>
              <p className="text-green-900 font-semibold">247247</p>
            </div>
            <div>
              <span className="text-green-600 font-medium">Account</span>
              <p className="text-green-900 font-semibold">School Fees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-1 bg-white bg-opacity-20 rounded">
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id, account.account_name)}
                      className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-lg">{account.account_name}</h3>
                <p className="text-sm opacity-90">{account.bank_name}</p>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Number</span>
                  <span className="font-mono font-medium">{account.account_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Type</span>
                  <span className="font-medium capitalize">{account.account_type}</span>
                </div>
                {account.branch && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Branch</span>
                    <span className="font-medium">{account.branch}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Current Balance</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(parseFloat(account.current_balance.toString()))}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No bank accounts found</p>
            <button
              onClick={() => setShowAccountModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first account
            </button>
          </div>
        )}
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedAccount ? 'Edit Account' : 'New Bank Account'}
              </h2>
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  setSelectedAccount(null);
                  resetAccountForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={selectedAccount ? handleUpdateAccount : handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.account_name}
                    onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., School Operating Account"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Equity Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={accountForm.branch}
                    onChange={(e) => setAccountForm({ ...accountForm, branch: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Westlands Branch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                    <option value="fixed_deposit">Fixed Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
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
                    Initial/Current Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={accountForm.current_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, current_balance: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setSelectedAccount(null);
                    resetAccountForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {transactionType === 'deposit' && '💰 '}
                {transactionType === 'withdrawal' && '💸 '}
                {transactionType === 'transfer' && '🔄 '}
                {transactionType}
              </h2>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  resetTransactionForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={transactionForm.transaction_date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {transactionType === 'transfer' ? 'From Account' : 'Account'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={transactionForm.account_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.bank_name}) - {formatCurrency(parseFloat(acc.current_balance.toString()))}
                    </option>
                  ))}
                </select>
              </div>

              {transactionType === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={transactionForm.to_account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, to_account_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Account</option>
                    {accounts
                      .filter((acc) => acc.id !== transactionForm.account_id)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name} ({acc.bank_name})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KES) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder={`Describe this ${transactionType}...`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={transactionForm.reference_number}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., CHQ-001, TXN-12345"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    resetTransactionForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg ${
                    transactionType === 'deposit'
                      ? 'bg-green-600 hover:bg-green-700'
                      : transactionType === 'withdrawal'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  Record {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
