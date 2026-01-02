import { useState, useEffect } from 'react';
import { Plus, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import financeService, { BankAccount } from '@/services/financeService';

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

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

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

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
                    {formatCurrency(account.current_balance)}
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
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 p-3 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Deposit</h3>
          <p className="text-sm text-gray-600">Add money to bank account</p>
        </button>

        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowUpRight className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Withdrawal</h3>
          <p className="text-sm text-gray-600">Record money taken out</p>
        </button>

        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Transfer Funds</h3>
          <p className="text-sm text-gray-600">Move money between accounts</p>
        </button>
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
    </div>
  );
}
