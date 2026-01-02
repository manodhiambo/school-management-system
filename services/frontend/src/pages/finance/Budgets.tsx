import { useState, useEffect } from 'react';
import { Plus, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your budgets</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Create Budget
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Sample Budget Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sample Budget - 2025</h3>
              <p className="text-sm text-gray-500">Annual Budget</p>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-500" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Allocated</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(5000000)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spent</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(3750000)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(1250000)}</p>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Utilization</span>
              <span className="font-semibold text-yellow-600">75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Budget feature is under development. Full functionality coming soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
