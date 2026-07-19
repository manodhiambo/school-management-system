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
  TrendingUp, ShoppingCart, Truck, Trash2, History,
} from 'lucide-react';

type Tab = 'meals' | 'accounts' | 'stock' | 'reports';
type ReportView = 'daily' | 'consumption' | 'wastage';

const MEAL_TYPES = ['breakfast', 'lunch', 'supper', 'snack'];

const EMPTY_STOCK = { item_name: '', unit: '', quantity: '', reorder_level: '', unit_cost: '', category_id: '', batch_number: '', expiry_date: '', warehouse_location: '' };

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
  const [categories, setCategories] = useState<any[]>([]);
  const [stockModal, setStockModal] = useState(false);
  const [editStock, setEditStock] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ ...EMPTY_STOCK });
  const [receiveModal, setReceiveModal] = useState(false);
  const [wasteModal, setWasteModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [movementForm, setMovementForm] = useState({ quantity: '', reference: '', notes: '' });

  // Reports
  const [reportView, setReportView] = useState<ReportView>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<any>(null);
  const [consumption, setConsumption] = useState<any>(null);
  const [wastage, setWastage] = useState<any>(null);

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
      const [sRes, cRes]: any[] = await Promise.all([
        (api as any).getCanteenStock(),
        api.getInventoryCategories(),
      ]);
      setStock(sRes?.data || []);
      setCategories(cRes?.data || []);
    } catch { setError('Failed to load stock'); }
    setLoading(false);
  };

  const seedCategories = async () => {
    try {
      await (api as any).seedFoodCategories();
      loadStock();
    } catch { setError('Failed to seed food categories'); }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      if (reportView === 'daily') {
        const res: any = await (api as any).getCanteenDailyReport(reportDate);
        setReport(res?.data || null);
      } else if (reportView === 'consumption') {
        const res: any = await (api as any).getCanteenConsumptionReport();
        setConsumption(res?.data || null);
      } else {
        const res: any = await (api as any).getCanteenWastageReport();
        setWastage(res?.data || null);
      }
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

  const doSaveStock = async () => {
    try {
      if (editStock) {
        await (api as any).updateCanteenStock(editStock.id, stockForm);
      } else {
        await (api as any).addCanteenStock(stockForm);
      }
      setStockModal(false);
      setEditStock(null);
      setStockForm({ ...EMPTY_STOCK });
      loadStock();
    } catch { setError('Failed to save stock item'); }
  };

  const doReceive = async () => {
    if (!selectedStock) return;
    try {
      await (api as any).receiveCanteenStock(selectedStock.id, movementForm);
      setReceiveModal(false);
      setMovementForm({ quantity: '', reference: '', notes: '' });
      loadStock();
    } catch { setError('Failed to record delivery'); }
  };

  const doWaste = async () => {
    if (!selectedStock) return;
    try {
      await (api as any).wasteCanteenStock(selectedStock.id, movementForm);
      setWasteModal(false);
      setMovementForm({ quantity: '', reference: '', notes: '' });
      loadStock();
    } catch { setError('Failed to record wastage'); }
  };

  const openHistory = async (s: any) => {
    setSelectedStock(s);
    setHistoryModal(true);
    try {
      const res: any = await (api as any).getCanteenStockMovements(s.id);
      setMovements(res?.data || []);
    } catch { setMovements([]); }
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
                  {myTx.slice(0, 10).map((tx: any, i: number) => {
                    const isCredit = tx.type === 'topup' || tx.type === 'refund';
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2">{tx.created_at?.split('T')[0]}</td>
                        <td>
                          <Badge label={tx.type || '-'}
                            color={isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} />
                        </td>
                        <td className={isCredit ? 'text-green-600' : 'text-red-600'}>
                          {isCredit ? '+' : '-'}KES {Number(tx.amount || 0).toFixed(2)}
                        </td>
                        <td className="text-gray-600">{tx.meal_plan_name || tx.notes || '-'}</td>
                      </tr>
                    );
                  })}
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
    { id: 'stock', label: 'Kitchen Stock', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UtensilsCrossed className="h-6 w-6 text-green-600" /> Kitchen & Feeding
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
                      <th className="px-4 py-2">Class</th>
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
                        <td className="px-4 py-2 text-gray-500">{a.class_name || '-'}</td>
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
            <p className="text-gray-600 text-sm">Kitchen inventory. Amber rows are low stock, red badges are expiring within 7 days.</p>
            <div className="flex gap-2">
              {categories.length === 0 && (
                <Button size="sm" variant="outline" onClick={seedCategories}>Set up food categories</Button>
              )}
              <Button size="sm" onClick={() => { setEditStock(null); setStockForm({ ...EMPTY_STOCK }); setStockModal(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Batch / Expiry</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No stock items.</td></tr>
                    ) : stock.map((s: any) => (
                      <tr key={s.id} className={`border-b hover:bg-gray-50 ${s.is_low_stock ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-2 font-medium flex items-center gap-1">
                          {s.is_low_stock && <AlertTriangle className="h-3 w-3 text-amber-500" />} {s.item_name}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{s.category_name || '-'}</td>
                        <td className={`px-4 py-2 font-bold ${s.is_low_stock ? 'text-amber-600' : ''}`}>{s.quantity} {s.unit}</td>
                        <td className="px-4 py-2 text-xs">
                          {s.batch_number && <div className="text-gray-500">{s.batch_number}</div>}
                          {s.expiry_date && (
                            <Badge label={s.expiry_date.slice(0, 10)} color={s.is_expiring_soon ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{s.warehouse_location || '-'}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1.5 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStock(s); setMovementForm({ quantity: '', reference: '', notes: '' }); setReceiveModal(true); }}>
                              <Truck className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setSelectedStock(s); setMovementForm({ quantity: '', reference: '', notes: '' }); setWasteModal(true); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openHistory(s)}>
                              <History className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditStock(s);
                              setStockForm({
                                item_name: s.item_name, unit: s.unit, quantity: s.quantity, reorder_level: s.reorder_level,
                                unit_cost: s.unit_cost, category_id: s.category_id || '', batch_number: s.batch_number || '',
                                expiry_date: s.expiry_date ? s.expiry_date.slice(0, 10) : '', warehouse_location: s.warehouse_location || '',
                              });
                              setStockModal(true);
                            }}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
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

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['daily', 'consumption', 'wastage'] as ReportView[]).map(v => (
              <button key={v} onClick={() => { setReportView(v); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${reportView === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {v}
              </button>
            ))}
          </div>

          {reportView === 'daily' && (
            <div className="flex gap-2 items-end">
              <div>
                <Label>Date</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
              </div>
              <Button onClick={loadReport}><TrendingUp className="h-4 w-4 mr-1" /> Load Report</Button>
            </div>
          )}
          {reportView !== 'daily' && (
            <Button onClick={loadReport}><TrendingUp className="h-4 w-4 mr-1" /> Load Report</Button>
          )}

          {loading ? <p className="text-gray-500">Loading...</p> : reportView === 'daily' && report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Total Sales — {reportDate}</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-green-600">KES {Number(report.totals?.total_sales || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{report.totals?.total_transactions || 0} transactions</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Cost per Meal</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-blue-600">{report.totals?.cost_per_meal != null ? `KES ${report.totals.cost_per_meal}` : '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{report.totals?.meals_served || 0} meals served</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Cost per Student</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-purple-600">{report.totals?.cost_per_student != null ? `KES ${report.totals.cost_per_student}` : '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{report.totals?.distinct_students || 0} students</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Meal Type Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(report.by_meal_type || []).map((b: any) => (
                    <div key={b.meal_type || 'unknown'} className="flex items-center gap-3">
                      <span className="w-20 text-sm capitalize text-gray-600">{b.meal_type || 'Other'}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-4 bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, (Number(b.total_amount) / (Number(report.totals?.total_sales) || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">KES {Number(b.total_amount || 0).toFixed(2)}</span>
                      <span className="text-xs text-gray-400">{b.transaction_count} sales</span>
                    </div>
                  ))}
                  {(!report.by_meal_type || report.by_meal_type.length === 0) && (
                    <p className="text-gray-400 text-sm">No sales data for this date.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : reportView === 'consumption' && consumption ? (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">Item</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Quantity</th><th className="px-4 py-2">Value</th>
                </tr></thead>
                <tbody>
                  {(consumption.movements || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No stock movements in this period.</td></tr>
                  ) : consumption.movements.map((m: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{m.item_name}</td>
                      <td className="px-4 py-2 capitalize">{m.type}</td>
                      <td className="px-4 py-2">{m.total_quantity} {m.unit}</td>
                      <td className="px-4 py-2">KES {Number(m.total_value || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          ) : reportView === 'wastage' && wastage ? (
            <div className="space-y-4">
              <Card><CardContent className="pt-6">
                <p className="text-sm text-gray-500">Total Value Lost to Wastage</p>
                <p className="text-3xl font-bold text-red-600">KES {Number(wastage.grand_total_lost || 0).toFixed(2)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                    <th className="px-4 py-2">Item</th><th className="px-4 py-2">Wasted</th><th className="px-4 py-2">Value Lost</th>
                  </tr></thead>
                  <tbody>
                    {(wastage.items || []).length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No wastage recorded in this period.</td></tr>
                    ) : wastage.items.map((w: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{w.item_name}</td>
                        <td className="px-4 py-2">{w.total_wasted} {w.unit}</td>
                        <td className="px-4 py-2 text-red-600">KES {Number(w.total_value_lost || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            </div>
          ) : (
            <p className="text-gray-400">Click Load Report.</p>
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

      {/* Add/Edit Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editStock ? 'Edit Stock Item' : 'Add Stock Item'}</h2>
              <button onClick={() => setStockModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={stockForm.item_name} onChange={e => setStockForm(f => ({ ...f, item_name: e.target.value }))} /></div>
              <div>
                <Label>Category</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={stockForm.category_id} onChange={e => setStockForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Unit</Label><Input placeholder="kg, litres, pieces..." value={stockForm.unit} onChange={e => setStockForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Reorder Level</Label><Input type="number" value={stockForm.reorder_level} onChange={e => setStockForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
              </div>
              <div><Label>Unit Cost (KES)</Label><Input type="number" value={stockForm.unit_cost} onChange={e => setStockForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Batch Number</Label><Input value={stockForm.batch_number} onChange={e => setStockForm(f => ({ ...f, batch_number: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={stockForm.expiry_date} onChange={e => setStockForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>Warehouse Location</Label><Input value={stockForm.warehouse_location} onChange={e => setStockForm(f => ({ ...f, warehouse_location: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStockModal(false)}>Cancel</Button>
              <Button onClick={doSaveStock}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Delivery Modal */}
      {receiveModal && selectedStock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Receive Delivery — {selectedStock.item_name}</h2>
              <button onClick={() => setReceiveModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Current: <strong>{selectedStock.quantity}</strong> {selectedStock.unit}</p>
              <div><Label>Quantity Received</Label><Input type="number" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Reference (supplier / delivery note)</Label><Input value={movementForm.reference} onChange={e => setMovementForm(f => ({ ...f, reference: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={movementForm.notes} onChange={e => setMovementForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiveModal(false)}>Cancel</Button>
              <Button onClick={doReceive} disabled={!movementForm.quantity}>Record Delivery</Button>
            </div>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {wasteModal && selectedStock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Record Wastage — {selectedStock.item_name}</h2>
              <button onClick={() => setWasteModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Current: <strong>{selectedStock.quantity}</strong> {selectedStock.unit}</p>
              <div><Label>Quantity Wasted</Label><Input type="number" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Reason</Label><Input value={movementForm.notes} onChange={e => setMovementForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWasteModal(false)}>Cancel</Button>
              <Button onClick={doWaste} disabled={!movementForm.quantity} className="bg-red-600 hover:bg-red-700">Record Wastage</Button>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {historyModal && selectedStock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Movement History — {selectedStock.item_name}</h2>
              <button onClick={() => setHistoryModal(false)}><X className="h-5 w-5" /></button>
            </div>
            {movements.length === 0 ? (
              <p className="text-gray-400 text-sm">No movements recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {movements.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <Badge label={m.type} color={
                        m.type === 'received' ? 'bg-green-100 text-green-700' :
                        m.type === 'wasted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      } />
                      <span className="text-gray-500 ml-2">{m.created_at?.slice(0, 10)} · {m.created_by_name || 'System'}</span>
                      {m.notes && <div className="text-xs text-gray-400 mt-0.5">{m.notes}</div>}
                    </div>
                    <span className={`font-bold ${Number(m.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(m.quantity) >= 0 ? '+' : ''}{m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
