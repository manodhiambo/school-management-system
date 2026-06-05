import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  UtensilsCrossed, Wallet, Package, BarChart2,
  Plus, Edit2, RefreshCw, Search, X, AlertTriangle,
  TrendingUp, ShoppingCart
} from 'lucide-react';

type Tab = 'meals' | 'accounts' | 'stock' | 'reports';

const MEAL_TYPES = ['breakfast', 'lunch', 'supper', 'snack'];

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

export function CanteenPage() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student';

  const [tab, setTab] = useState<Tab>('meals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Meal plans
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [mealModal, setMealModal] = useState(false);
  const [editMeal, setEditMeal] = useState<any>(null);
  const [mealForm, setMealForm] = useState({ name: '', description: '', price: '', meal_type: 'lunch' });

  // Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [acctSearch, setAcctSearch] = useState('');
  const [topUpModal, setTopUpModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedAcct, setSelectedAcct] = useState<any>(null);
  const [topUpForm, setTopUpForm] = useState({ amount: '', reference: '' });
  const [purchaseForm, setPurchaseForm] = useState({ meal_plan_id: '' });

  // Student own account
  const [myAccount, setMyAccount] = useState<any>(null);
  const [myTx, setMyTx] = useState<any[]>([]);

  // Stock
  const [stock, setStock] = useState<any[]>([]);
  const [stockModal, setStockModal] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ name: '', unit: '', quantity: '', reorder_level: '', unit_cost: '' });
  const [adjustForm, setAdjustForm] = useState({ quantity: '', notes: '' });

  // Reports
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (isStudent) {
      loadMyAccount();
    } else {
      loadMealPlans();
    }
  }, []);

  useEffect(() => {
    if (!isStudent) {
      if (tab === 'accounts') loadAccounts();
      if (tab === 'stock') loadStock();
      if (tab === 'reports') loadReport();
    }
  }, [tab]);

  const loadMealPlans = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getMealPlans();
      setMealPlans(res?.data || []);
    } catch { setError('Failed to load meal plans'); }
    setLoading(false);
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getCanteenAccounts();
      setAccounts(res?.data || []);
    } catch { setError('Failed to load accounts'); }
    setLoading(false);
  };

  const loadMyAccount = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res: any = await (api as any).getStudentCanteenAccount(user.id);
      setMyAccount(res?.data?.account || null);
      setMyTx(res?.data?.transactions || []);
    } catch { setError('Failed to load your canteen account'); }
    setLoading(false);
  };

  const loadStock = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getCanteenStock();
      setStock(res?.data || []);
    } catch { setError('Failed to load stock'); }
    setLoading(false);
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getCanteenDailyReport(reportDate);
      setReport(res?.data || null);
    } catch { setError('Failed to load report'); }
    setLoading(false);
  };

  const saveMealPlan = async () => {
    try {
      if (editMeal) {
        await (api as any).updateMealPlan(editMeal.id, mealForm);
      } else {
        await (api as any).createMealPlan(mealForm);
      }
      setMealModal(false);
      setEditMeal(null);
      setMealForm({ name: '', description: '', price: '', meal_type: 'lunch' });
      loadMealPlans();
    } catch { setError('Failed to save meal plan'); }
  };

  const doTopUp = async () => {
    if (!selectedAcct) return;
    try {
      await (api as any).topUpCanteen({ student_id: selectedAcct.student_id, ...topUpForm });
      setTopUpModal(false);
      setTopUpForm({ amount: '', reference: '' });
      loadAccounts();
    } catch { setError('Top-up failed'); }
  };

  const doPurchase = async () => {
    if (!selectedAcct) return;
    try {
      await (api as any).canteenPurchase({ student_id: selectedAcct.student_id, ...purchaseForm });
      setPurchaseModal(false);
      setPurchaseForm({ meal_plan_id: '' });
      loadAccounts();
    } catch { setError('Purchase failed'); }
  };

  const doAddStock = async () => {
    try {
      await (api as any).addCanteenStock(stockForm);
      setStockModal(false);
      setStockForm({ name: '', unit: '', quantity: '', reorder_level: '', unit_cost: '' });
      loadStock();
    } catch { setError('Failed to add stock'); }
  };

  const doAdjustStock = async () => {
    if (!selectedStock) return;
    try {
      await (api as any).adjustCanteenStock(selectedStock.id, adjustForm);
      setAdjustModal(false);
      setAdjustForm({ quantity: '', notes: '' });
      loadStock();
    } catch { setError('Adjustment failed'); }
  };

  const filteredAccounts = accounts.filter(a =>
    a.student_name?.toLowerCase().includes(acctSearch.toLowerCase())
  );

  const selectedMealPlan = mealPlans.find(m => m.id === purchaseForm.meal_plan_id);

  if (isStudent) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-green-600" /> My Canteen Account
        </h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {myAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${myAccount.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                KES {Number(myAccount.balance || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {myTx.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="py-1">Date</th><th>Type</th><th>Amount</th><th>Notes</th>
                </tr></thead>
                <tbody>
                  {myTx.slice(0, 10).map((tx: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2">{tx.created_at?.split('T')[0]}</td>
                      <td>
                        <Badge label={tx.transaction_type || tx.type || '-'}
                          color={tx.transaction_type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} />
                      </td>
                      <td className={tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}KES {Number(tx.amount || 0).toFixed(2)}
                      </td>
                      <td className="text-gray-600">{tx.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const TABS = [
    { id: 'meals', label: 'Meal Plans', icon: UtensilsCrossed },
    { id: 'accounts', label: 'Student Accounts', icon: Wallet },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UtensilsCrossed className="h-6 w-6 text-green-600" /> Canteen Management
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Meal Plans */}
      {tab === 'meals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Manage available meal plans and prices.</p>
            <Button size="sm" onClick={() => { setEditMeal(null); setMealForm({ name: '', description: '', price: '', meal_type: 'lunch' }); setMealModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Plan
            </Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Price (KES)</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealPlans.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No meal plans yet.</td></tr>
                    ) : mealPlans.map((m: any) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{m.name}</td>
                        <td className="px-4 py-2 capitalize">
                          <Badge label={m.meal_type} color="bg-blue-100 text-blue-700" />
                        </td>
                        <td className="px-4 py-2">{Number(m.price).toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-600">{m.description || '-'}</td>
                        <td className="px-4 py-2">
                          <button className="text-blue-600 hover:underline text-xs" onClick={() => {
                            setEditMeal(m);
                            setMealForm({ name: m.name, description: m.description || '', price: m.price, meal_type: m.meal_type });
                            setMealModal(true);
                          }}>
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Student Accounts */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search student..." className="pl-8" value={acctSearch} onChange={e => setAcctSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={loadAccounts}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Student</th>
                      <th className="px-4 py-2">Balance (KES)</th>
                      <th className="px-4 py-2">Last Activity</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No accounts found.</td></tr>
                    ) : filteredAccounts.map((a: any) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{a.student_name}</td>
                        <td className={`px-4 py-2 font-bold ${Number(a.balance) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(a.balance || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{a.last_activity?.split('T')[0] || '-'}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedAcct(a); setTopUpModal(true); }}>
                            Top Up
                          </Button>
                          <Button size="sm" onClick={() => { setSelectedAcct(a); setPurchaseModal(true); }}>
                            <ShoppingCart className="h-3 w-3 mr-1" /> Purchase
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Manage canteen inventory. Amber rows are low stock.</p>
            <Button size="sm" onClick={() => { setStockModal(true); setStockForm({ name: '', unit: '', quantity: '', reorder_level: '', unit_cost: '' }); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Unit</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Reorder</th>
                      <th className="px-4 py-2">Unit Cost</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No stock items.</td></tr>
                    ) : stock.map((s: any) => {
                      const isLow = Number(s.quantity) <= Number(s.reorder_level);
                      return (
                        <tr key={s.id} className={`border-b hover:bg-gray-50 ${isLow ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-2 font-medium flex items-center gap-1">
                            {isLow && <AlertTriangle className="h-3 w-3 text-amber-500" />} {s.name}
                          </td>
                          <td className="px-4 py-2">{s.unit}</td>
                          <td className={`px-4 py-2 font-bold ${isLow ? 'text-amber-600' : ''}`}>{s.quantity}</td>
                          <td className="px-4 py-2">{s.reorder_level}</td>
                          <td className="px-4 py-2">KES {Number(s.unit_cost || 0).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStock(s); setAdjustModal(true); }}>
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div>
              <Label>Date</Label>
              <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
            </div>
            <Button onClick={loadReport}><TrendingUp className="h-4 w-4 mr-1" /> Load Report</Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : report ? (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Total Revenue — {reportDate}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">KES {Number(report.total_revenue || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-500 mt-1">{report.total_transactions || 0} transactions</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Meal Type Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(report.breakdown || []).map((b: any) => (
                    <div key={b.meal_type} className="flex items-center gap-3">
                      <span className="w-20 text-sm capitalize text-gray-600">{b.meal_type}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-4 bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, (b.revenue / (report.total_revenue || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">KES {Number(b.revenue || 0).toFixed(2)}</span>
                      <span className="text-xs text-gray-400">{b.count} sales</span>
                    </div>
                  ))}
                  {(!report.breakdown || report.breakdown.length === 0) && (
                    <p className="text-gray-400 text-sm">No sales data for this date.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-gray-400">Select a date and click Load Report.</p>
          )}
        </div>
      )}

      {/* Meal Plan Modal */}
      {mealModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editMeal ? 'Edit Meal Plan' : 'Add Meal Plan'}</h2>
              <button onClick={() => setMealModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={mealForm.name} onChange={e => setMealForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={mealForm.description} onChange={e => setMealForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Price (KES)</Label><Input type="number" value={mealForm.price} onChange={e => setMealForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div>
                <Label>Meal Type</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={mealForm.meal_type} onChange={e => setMealForm(f => ({ ...f, meal_type: e.target.value }))}>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMealModal(false)}>Cancel</Button>
              <Button onClick={saveMealPlan}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {topUpModal && selectedAcct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Top Up — {selectedAcct.student_name}</h2>
              <button onClick={() => setTopUpModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Amount (KES)</Label><Input type="number" value={topUpForm.amount} onChange={e => setTopUpForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Reference</Label><Input value={topUpForm.reference} onChange={e => setTopUpForm(f => ({ ...f, reference: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTopUpModal(false)}>Cancel</Button>
              <Button onClick={doTopUp}>Top Up</Button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseModal && selectedAcct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Purchase — {selectedAcct.student_name}</h2>
              <button onClick={() => setPurchaseModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Meal Plan</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={purchaseForm.meal_plan_id} onChange={e => setPurchaseForm(f => ({ ...f, meal_plan_id: e.target.value }))}>
                  <option value="">Select meal plan</option>
                  {mealPlans.map(m => <option key={m.id} value={m.id}>{m.name} — KES {m.price}</option>)}
                </select>
              </div>
              {selectedMealPlan && (
                <p className="text-sm text-gray-600">Price: <span className="font-bold text-green-600">KES {selectedMealPlan.price}</span></p>
              )}
              <p className="text-sm text-gray-500">Current balance: <span className={`font-bold ${Number(selectedAcct.balance) > 0 ? 'text-green-600' : 'text-red-600'}`}>KES {Number(selectedAcct.balance || 0).toFixed(2)}</span></p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPurchaseModal(false)}>Cancel</Button>
              <Button onClick={doPurchase} disabled={!purchaseForm.meal_plan_id}>Deduct</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Stock Item</h2>
              <button onClick={() => setStockModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={stockForm.name} onChange={e => setStockForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Unit</Label><Input placeholder="kg, litres, pieces..." value={stockForm.unit} onChange={e => setStockForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Reorder Level</Label><Input type="number" value={stockForm.reorder_level} onChange={e => setStockForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
              </div>
              <div><Label>Unit Cost (KES)</Label><Input type="number" value={stockForm.unit_cost} onChange={e => setStockForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStockModal(false)}>Cancel</Button>
              <Button onClick={doAddStock}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal && selectedStock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Adjust Stock — {selectedStock.name}</h2>
              <button onClick={() => setAdjustModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Current qty: <strong>{selectedStock.quantity}</strong> {selectedStock.unit}</p>
              <div><Label>Adjustment Quantity (+ to add, - to deduct)</Label><Input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustModal(false)}>Cancel</Button>
              <Button onClick={doAdjustStock}>Save Adjustment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
