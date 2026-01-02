import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Building2, FileText, Search, XCircle, Edit, Trash } from 'lucide-react';
import financeService, { Vendor } from '@/services/financeService';

export default function Vendors() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
  });

  useEffect(() => {
    if (activeTab === 'vendors') {
      loadVendors();
    }
  }, [activeTab]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await financeService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      alert('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await financeService.createVendor(formData);
      alert('Vendor created successfully!');
      setShowModal(false);
      resetForm();
      loadVendors();
    } catch (error) {
      console.error('Failed to create vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
    });
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors & Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage suppliers and purchase orders</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
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
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Contact:</span> {vendor.contact_person}
                    </p>
                  )}
                  {vendor.email && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Email:</span> {vendor.email}
                    </p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Phone:</span> {vendor.phone}
                    </p>
                  )}
                  {vendor.tax_id && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tax ID:</span> {vendor.tax_id}
                    </p>
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

      {/* Vendor Modal */}
      {showModal && activeTab === 'vendors' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add New Vendor</h2>
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
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., ABC Suppliers Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="+254 700 000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / PIN
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="A000000000A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Physical address"
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
                  Create Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
