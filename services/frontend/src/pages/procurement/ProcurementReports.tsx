import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Building2, DollarSign } from 'lucide-react';
import procurementService from '../../services/procurementService';

export const ProcurementReports: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = () => {
    setLoading(true);
    procurementService.getReportSummary({ year })
      .then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year]);

  const prStats = data?.pr_stats || [];
  const poStats = data?.po_stats || [];
  const supplierStats = data?.supplier_stats || [];
  const budgetStats = data?.budget_stats || [];

  const totalPR = prStats.reduce((s: number, r: any) => s + Number(r.cnt), 0);
  const totalPO = poStats.reduce((s: number, r: any) => s + Number(r.value), 0);

  const statusLabel = (s: string) => s.replace(/_/g, ' ');

  const statColors: Record<string, string> = {
    approved: 'bg-green-500', completed: 'bg-green-600', draft: 'bg-gray-400',
    rejected: 'bg-red-500', cancelled: 'bg-red-400', sent: 'bg-blue-500',
    pending_approval: 'bg-yellow-500', submitted: 'bg-blue-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Procurement Reports</h1>
        <select value={year} onChange={e => setYear(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div> : (
        <>
          {/* PR Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Purchase Requisitions by Status ({totalPR} total)</h2>
            </div>
            <div className="space-y-3">
              {prStats.map((r: any) => {
                const pct = totalPR > 0 ? Math.round((r.cnt / totalPR) * 100) : 0;
                return (
                  <div key={r.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-gray-700">{statusLabel(r.status)}</span>
                      <span className="text-gray-500">{r.cnt} ({pct}%) · KES {Number(r.value).toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${statColors[r.status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!prStats.length && <p className="text-sm text-gray-400 text-center py-4">No requisitions data</p>}
            </div>
          </div>

          {/* PO Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-gray-900">Purchase Orders — Total Value: KES {totalPO.toLocaleString()}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {poStats.map((r: any) => (
                <div key={r.status} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 capitalize">{statusLabel(r.status)}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{r.cnt}</div>
                  <div className="text-xs text-blue-600 font-medium">KES {Number(r.value).toLocaleString()}</div>
                </div>
              ))}
              {!poStats.length && <div className="col-span-3 text-sm text-gray-400 text-center py-4">No PO data</div>}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Supplier Spending Report (Top 10)</h2>
            </div>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-200">{['Rank', 'Supplier', 'POs', 'Total Spent (KES)'].map(h => <th key={h} className="py-2 text-left text-xs font-medium text-gray-500 uppercase pr-4">{h}</th>)}</tr></thead>
              <tbody>
                {supplierStats.map((s: any, i: number) => (
                  <tr key={s.supplier_name} className="border-b border-gray-50">
                    <td className="py-2 pr-4"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span></td>
                    <td className="py-2 pr-4 font-medium text-gray-900">{s.supplier_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{s.po_count}</td>
                    <td className="py-2 font-semibold text-blue-700">{Number(s.total).toLocaleString()}</td>
                  </tr>
                ))}
                {!supplierStats.length && <tr><td colSpan={4} className="text-sm text-gray-400 text-center py-6">No supplier data</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Budget Utilization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-gray-900">Budget Utilization by Department</h2>
            </div>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-200">{['Department', 'Budget (KES)', 'Spent (KES)', 'Available (KES)', '% Used'].map(h => <th key={h} className="py-2 text-left text-xs font-medium text-gray-500 uppercase pr-4">{h}</th>)}</tr></thead>
              <tbody>
                {budgetStats.map((b: any) => {
                  const pct = Number(b.pct_used);
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <tr key={b.department} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium">{b.department}</td>
                      <td className="py-3 pr-4">{Number(b.total_budget).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-red-600">{Number(b.spent || 0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-green-600">{Number(b.available || 0).toLocaleString()}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-2 ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!budgetStats.length && <tr><td colSpan={5} className="text-sm text-gray-400 text-center py-6">No budget data</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProcurementReports;
