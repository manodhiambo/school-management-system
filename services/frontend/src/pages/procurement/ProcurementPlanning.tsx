import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';
import { DEPARTMENTS as BASE_DEPARTMENTS } from '../../constants/departments';

const DEPARTMENTS = [...BASE_DEPARTMENTS, 'All Departments'];

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', approved: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-700');

const typeLabel = (t: string) => ({ annual: 'Annual', quarterly: 'Quarterly', monthly: 'Monthly' }[t] || t);

export const ProcurementPlanning: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans' | 'budgets'>('plans');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const currentYear = new Date().getFullYear();
  const [planForm, setPlanForm] = useState({ title: '', plan_type: 'annual', financial_year: String(currentYear), quarter: '', month: '', department: '', description: '', planned_amount: '', start_date: '', end_date: '' });
  const [budgetForm, setBudgetForm] = useState({ department: '', financial_year: String(currentYear), total_budget: '' });

  const load = () => {
    setLoading(true);
    Promise.all([procurementService.getPlans(), procurementService.getBudgets()])
      .then(([p, b]) => { setPlans(p); setBudgets(b); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) await procurementService.updatePlan(editingPlan.id, planForm);
      else await procurementService.createPlan(planForm);
      setShowPlanModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) await procurementService.updateBudget(editingBudget.id, budgetForm);
      else await procurementService.createBudget(budgetForm);
      setShowBudgetModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const openEditPlan = (p: any) => { setEditingPlan(p); setPlanForm({ ...planForm, ...p, planned_amount: String(p.planned_amount) }); setShowPlanModal(true); };
  const openEditBudget = (b: any) => { setEditingBudget(b); setBudgetForm({ ...budgetForm, ...b, total_budget: String(b.total_budget) }); setShowBudgetModal(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Procurement Planning</h1>
        <button onClick={() => tab === 'plans' ? setShowPlanModal(true) : setShowBudgetModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> {tab === 'plans' ? 'Add Plan' : 'Add Budget'}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {(['plans', 'budgets'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`py-3 text-sm font-medium border-b-2 capitalize ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'plans' ? 'Procurement Plans' : 'Department Budgets'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'plans' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>{['Plan #', 'Title', 'Type', 'Department', 'Year', 'Planned (KES)', 'Actual (KES)', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr> :
                plans.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">No plans yet</td></tr> :
                plans.map(p => {
                  const pct = p.planned_amount > 0 ? Math.round((p.actual_amount / p.planned_amount) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono">{p.plan_number}</td>
                      <td className="px-4 py-3"><div className="font-medium text-sm text-gray-900">{p.title}</div>{p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{typeLabel(p.plan_type)}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.department || 'All'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.financial_year}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{Number(p.planned_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{Number(p.actual_amount || 0).toLocaleString()}</div>
                        <div className="h-1.5 w-20 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="text-xs text-gray-400">{pct}%</div>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditPlan(p)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4" /></button>
                          <button onClick={async () => { if (confirm('Delete this plan?')) { await procurementService.deletePlan(p.id); load(); } }} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'budgets' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>{['Department', 'Year', 'Budget (KES)', 'Spent (KES)', 'Available (KES)', '% Used', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr> :
                budgets.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">No budgets configured</td></tr> :
                budgets.map(b => {
                  const pct = b.total_budget > 0 ? Math.round((b.spent / b.total_budget) * 100) : 0;
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm">{b.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{b.financial_year}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{Number(b.total_budget).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{Number(b.spent || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{Number(b.available || b.total_budget).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-2 ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditBudget(b)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4" /></button>
                          <button onClick={async () => { if (confirm('Delete budget?')) { await procurementService.deleteBudget(b.id); load(); } }} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">{editingPlan ? 'Edit Plan' : 'Add Procurement Plan'}</h3>
              <button onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                  <select value={planForm.plan_type} onChange={e => setPlanForm({ ...planForm, plan_type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                  <input value={planForm.financial_year} onChange={e => setPlanForm({ ...planForm, financial_year: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select value={planForm.department} onChange={e => setPlanForm({ ...planForm, department: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Planned Amount (KES) *</label>
                  <input type="number" required min="0" value={planForm.planned_amount} onChange={e => setPlanForm({ ...planForm, planned_amount: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={planForm.start_date} onChange={e => setPlanForm({ ...planForm, start_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={planForm.end_date} onChange={e => setPlanForm({ ...planForm, end_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">{editingBudget ? 'Edit Budget' : 'Add Department Budget'}</h3>
              <button onClick={() => { setShowBudgetModal(false); setEditingBudget(null); }}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleBudgetSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select required value={budgetForm.department} onChange={e => setBudgetForm({ ...budgetForm, department: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year *</label>
                <input required value={budgetForm.financial_year} onChange={e => setBudgetForm({ ...budgetForm, financial_year: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (KES) *</label>
                <input type="number" required min="0" value={budgetForm.total_budget} onChange={e => setBudgetForm({ ...budgetForm, total_budget: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementPlanning;
