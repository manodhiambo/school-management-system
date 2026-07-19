import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, FileText, Truck, Receipt, CreditCard, TrendingUp,
  Clock, CheckCircle, AlertCircle, Building2
} from 'lucide-react';
import procurementService from '../../services/procurementService';

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg bg-${color}-50`}>
      <Icon className={`h-6 w-6 text-${color}-600`} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const ProcurementDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    procurementService.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!data) return null;

  const pr = data.requisitions || {};
  const po = data.purchase_orders || {};
  const inv = data.invoices || {};
  const pay = data.payments || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchasing from requisition to payment</p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Finance → Procurement</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={FileText} label="Total Requisitions" value={pr.total || 0} color="indigo" />
        <StatCard icon={Clock} label="Pending Approvals" value={pr.pending_approvals || 0} color="yellow" />
        <StatCard icon={ShoppingCart} label="Active POs" value={po.active || 0} sub={`KES ${Number(po.total_value || 0).toLocaleString()}`} color="blue" />
        <StatCard icon={Truck} label="Pending Deliveries" value={po.pending_delivery || 0} color="orange" />
        <StatCard icon={Receipt} label="Outstanding Invoices" value={inv.total || 0} sub={`KES ${Number(inv.balance || 0).toLocaleString()}`} color="red" />
        <StatCard icon={CreditCard} label="Pending Payments" value={pay.pending || 0} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Utilization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Budget Utilization</h2>
          </div>
          {data.budgets?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No budgets configured yet</p>
          )}
          <div className="space-y-3">
            {(data.budgets || []).slice(0, 6).map((b: any) => {
              const pct = b.total_budget > 0 ? Math.round((b.spent / b.total_budget) * 100) : 0;
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={b.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{b.department}</span>
                    <span className="text-gray-500">{pct}% used</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-2 ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Spent: KES {Number(b.spent || 0).toLocaleString()}</span>
                    <span>Budget: KES {Number(b.total_budget).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Top Suppliers</h2>
          </div>
          {!data.top_suppliers?.length && (
            <p className="text-sm text-gray-400 text-center py-4">No supplier data yet</p>
          )}
          <div className="space-y-3">
            {(data.top_suppliers || []).map((s: any, i: number) => (
              <div key={s.supplier_name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-800">{s.supplier_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">KES {Number(s.total_value).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{s.po_count} POs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-gray-700">PO Status</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-medium">{po.active || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivered</span><span className="font-medium">{po.delivered || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Value</span><span className="font-medium">KES {Number(po.total_value || 0).toLocaleString()}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-gray-700">Invoices</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total Invoiced</span><span className="font-medium">KES {Number(inv.total_amount || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-600">KES {Number(inv.paid_amount || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-medium text-red-600">KES {Number(inv.balance || 0).toLocaleString()}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-gray-700">Action Required</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">PRs to Approve</span><span className="font-medium text-yellow-600">{pr.pending_approvals || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pending Deliveries</span><span className="font-medium text-blue-600">{po.pending_delivery || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Supplier Payments</span><span className="font-medium text-red-600">{pay.pending || 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementDashboard;
