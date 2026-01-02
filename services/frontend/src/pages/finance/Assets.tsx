import { useState, useEffect } from 'react';
import { Plus, Building2, Search, TrendingDown, Calendar } from 'lucide-react';

interface Asset {
  id: string;
  asset_name: string;
  asset_code: string;
  category: string;
  purchase_date: Date;
  purchase_cost: number;
  current_value: number;
  depreciation_method: string;
  useful_life_years: number;
  status: 'active' | 'disposed' | 'under_maintenance';
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const categories = ['Furniture', 'Equipment', 'Computers', 'Vehicles', 'Buildings', 'Land'];
  
  const totalAssetValue = 5000000; // Mock data
  const totalDepreciation = 1250000; // Mock data
  const activeAssets = 45; // Mock data

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

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      disposed: 'bg-red-100 text-red-800',
      under_maintenance: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Active',
      disposed: 'Disposed',
      under_maintenance: 'Under Maintenance',
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Register</h1>
          <p className="text-gray-600 mt-1">Track and manage school assets</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Add Asset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Asset Value</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(totalAssetValue)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Purchase cost</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Depreciation</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {formatCurrency(totalDepreciation)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Accumulated</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Book Value</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(totalAssetValue - totalDepreciation)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{activeAssets} active assets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disposed">Disposed</option>
              <option value="under_maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p>No assets registered yet</p>
                <p className="text-sm mt-1">Click "Add Asset" to register your first asset</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Asset Categories Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <div key={category} className="text-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">{category}</p>
              <p className="text-sm text-gray-600">0 items</p>
            </div>
          ))}
        </div>
      </div>

      {/* Depreciation Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Depreciation Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-1">Straight Line Method</p>
            <p>Equal depreciation amount each year over the useful life of the asset.</p>
          </div>
          <div>
            <p className="font-medium mb-1">Reducing Balance Method</p>
            <p>Higher depreciation in early years, declining over time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
