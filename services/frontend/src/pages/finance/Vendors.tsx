import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Building2, FileText, Search } from 'lucide-react';
import financeService, { Vendor } from '@/services/financeService';

export default function Vendors() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await financeService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors & Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage suppliers and purchase orders</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          {activeTab === 'vendors' ? 'Add Vendor' : 'Create PO'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'vendors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'purchase-orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Purchase Orders
          </button>
        </nav>
      </div>

      {activeTab === 'vendors' && (
        <>
          {/* Search */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading vendors...</div>
            ) : filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{vendor.vendor_name}</h3>
                  {vendor.contact_person && (
                    <p className="text-sm text-gray-600 mb-1">Contact: {vendor.contact_person}</p>
                  )}
                  {vendor.email && (
                    <p className="text-sm text-gray-600 mb-1">Email: {vendor.email}</p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm text-gray-600 mb-1">Phone: {vendor.phone}</p>
                  )}
                  {vendor.tax_id && (
                    <p className="text-sm text-gray-600">Tax ID: {vendor.tax_id}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No vendors found. Click "Add Vendor" to create one.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchase-orders' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-gray-500 py-8">
            Purchase Orders feature coming soon!
          </p>
        </div>
      )}
    </div>
  );
}
