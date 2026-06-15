import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const actionColor = (a: string) => ({ approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', commented: 'bg-blue-100 text-blue-700', delegated: 'bg-yellow-100 text-yellow-800' }[a] || 'bg-gray-100 text-gray-700');
const refTypeLabel = (t: string) => ({ pr: 'Purchase Requisition', rfq: 'RFQ', po: 'Purchase Order', invoice: 'Invoice', payment: 'Payment' }[t] || t.toUpperCase());

export const ProcurementAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const load = () => {
    setLoading(true);
    procurementService.getAuditTrail(typeFilter ? { reference_type: typeFilter } : {})
      .then(setLogs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Procurement Audit Trail</h1>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        All approval actions (approve, reject, delegate, comment) are permanently logged here for compliance and accountability.
      </div>

      <div className="flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Document Types</option>
          <option value="pr">Purchase Requisitions</option>
          <option value="rfq">RFQs</option>
          <option value="po">Purchase Orders</option>
          <option value="invoice">Invoices</option>
          <option value="payment">Payments</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Date & Time', 'Document Type', 'Action', 'Performed By', 'Comments'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              logs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">No audit records</td></tr> :
              logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {(() => { const d = new Date(log.actioned_at || log.created_at); return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-KE'); })()}
                  </td>
                  <td className="px-4 py-3 text-sm">{refTypeLabel(log.reference_type)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.approver_name || 'System'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.comments || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {logs.length > 0 && <div className="px-4 py-3 text-xs text-gray-400 border-t">Showing last {logs.length} records</div>}
      </div>
    </div>
  );
};

export default ProcurementAuditPage;
