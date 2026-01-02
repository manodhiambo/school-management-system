import { useState, useEffect } from 'react';
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight, User } from 'lucide-react';

interface PettyCashTransaction {
  id: string;
  transaction_date: Date;
  transaction_type: 'disbursement' | 'replenishment';
  amount: number;
  description: string;
  custodian: string;
  receipt_number?: string;
  created_at: Date;
}

export default function PettyCash() {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Mock data for demonstration
  const currentBalance = 25000;
  const totalDisbursed = 15000;
  const totalReplenished = 40000;

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
                {formatCurrency(currentBalance)}
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
                {formatCurrency(totalDisbursed)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowUpRight className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Replenished</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(totalReplenished)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <ArrowDownRight className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left">
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

        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custodian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Click "New Transaction" to get started</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Custodians Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Petty Cash Custodians</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Main Office</p>
                <p className="text-sm text-gray-600">Receptionist</p>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(15000)}</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
