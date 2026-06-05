import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Package, Tag, ArrowLeftRight, AlertTriangle,
  Plus, Edit2, X, RefreshCw, TrendingDown
} from 'lucide-react';

type Tab = 'items' | 'categories' | 'transactions' | 'lowstock';
type TxType = 'stock_in' | 'stock_out' | 'damaged' | 'adjustment';

const TX_TYPES: { value: TxType; label: string; color: string }[] = [
  { value: 'stock_in', label: 'Stock In', color: 'bg-green-100 text-green-700' },
  { value: 'stock_out', label: 'Stock Out', color: 'bg-blue-100 text-blue-700' },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-700' },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-yellow-100 text-yellow-700' },
];

const CONDITIONS = ['new', 'good', 'fair', 'poor', 'damaged'];

export function InventoryPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('items');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Items
  const [items, setItems] = useState<any[]>([]);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    category_id: '', name: '', sku: '', quantity: '', unit_cost: '',
    reorder_level: '', location: '', condition: 'good'
  });

  // Transactions
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txModal, setTxModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [txForm, setTxForm] = useState({ type: 'stock_in' as TxType, quantity: '', notes: '' });

  // Low stock
  const [lowStock, setLowStock] = useState<any[]>([]);

  // Valuation
  const [valuation, setValuation] = useState<any>(null);

  useEffect(() => {
    loadCategories();
    loadItems();
  }, []);

  useEffect(() => {
    if (tab === 'transactions') loadTransactions();
    if (tab === 'lowstock') loadLowStock();
  }, [tab]);

  const loadCategories = async () => {
    try {
      const res: any = await (api as any).getInventoryCategories();
      setCategories(res?.data || []);
    } catch {}
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getInventoryItems();
      setItems(res?.data || []);
      const val: any = await (api as any).getInventoryValuation();
      setValuation(val?.data || null);
    } catch { setError('Failed to load items'); }
    setLoading(false);
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getInventoryTransactions?.() || { data: [] };
      setTransactions(res?.data || []);
    } catch { setError('Failed to load transactions'); }
    setLoading(false);
  };

  const loadLowStock = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getLowStockItems();
      setLowStock(res?.data || []);
    } catch { setError('Failed to load low stock'); }
    setLoading(false);
  };

  const saveCat = async () => {
    try {
      if (editCat) {
        await (api as any).updateInventoryCategory(editCat.id, catForm);
      } else {
        await (api as any).createInventoryCategory(catForm);
      }
      setCatModal(false);
      setEditCat(null);
      setCatForm({ name: '', description: '' });
      loadCategories();
    } catch { setError('Failed to save category'); }
  };

  const saveItem = async () => {
    try {
      if (editItem) {
        await (api as any).updateInventoryItem(editItem.id, itemForm);
      } else {
        await (api as any).createInventoryItem(itemForm);
      }
      setItemModal(false);
      setEditItem(null);
      setItemForm({ category_id: '', name: '', sku: '', quantity: '', unit_cost: '', reorder_level: '', location: '', condition: 'good' });
      loadItems();
    } catch { setError('Failed to save item'); }
  };

  const doTransaction = async () => {
    if (!selectedItem) return;
    try {
      await (api as any).inventoryTransaction(selectedItem.id, txForm);
      setTxModal(false);
      setTxForm({ type: 'stock_in', quantity: '', notes: '' });
      loadItems();
      if (tab === 'transactions') loadTransactions();
    } catch { setError('Transaction failed'); }
  };

  const TABS = [
    { id: 'items', label: 'Items', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'lowstock', label: 'Low Stock Alert', icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-orange-600" /> Inventory Management
        </h1>
        {valuation && (
          <Card className="px-4 py-2">
            <p className="text-xs text-gray-500">Total Stock Value</p>
            <p className="text-lg font-bold text-orange-600">KES {Number(valuation.total_value || 0).toLocaleString()}</p>
          </Card>
        )}
      </div>

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
              tab === t.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {t.id === 'lowstock' && lowStock.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStock.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">All inventory items. Red qty = at or below reorder level.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadItems}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => { setEditItem(null); setItemForm({ category_id: '', name: '', sku: '', quantity: '', unit_cost: '', reorder_level: '', location: '', condition: 'good' }); setItemModal(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">SKU</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Unit Cost</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Condition</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No items found.</td></tr>
                    ) : items.map((item: any) => {
                      const isLow = Number(item.quantity) <= Number(item.reorder_level || 0);
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{item.category_name || '-'}</td>
                          <td className="px-4 py-2 font-medium">{item.name}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{item.sku || '-'}</td>
                          <td className={`px-4 py-2 font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                            {isLow && <TrendingDown className="inline h-3 w-3 mr-1" />}{item.quantity}
                          </td>
                          <td className="px-4 py-2">KES {Number(item.unit_cost || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-gray-500">{item.location || '-'}</td>
                          <td className="px-4 py-2 capitalize text-xs">{item.condition || '-'}</td>
                          <td className="px-4 py-2 flex gap-1">
                            <button className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Edit" onClick={() => {
                              setEditItem(item);
                              setItemForm({ category_id: item.category_id || '', name: item.name, sku: item.sku || '', quantity: item.quantity, unit_cost: item.unit_cost, reorder_level: item.reorder_level || '', location: item.location || '', condition: item.condition || 'good' });
                              setItemModal(true);
                            }}>
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button className="text-orange-600 hover:bg-orange-50 p-1 rounded" title="Transaction" onClick={() => {
                              setSelectedItem(item);
                              setTxForm({ type: 'stock_in', quantity: '', notes: '' });
                              setTxModal(true);
                            }}>
                              <ArrowLeftRight className="h-3 w-3" />
                            </button>
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

      {/* Categories */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Group inventory items into categories.</p>
            <Button size="sm" onClick={() => { setEditCat(null); setCatForm({ name: '', description: '' }); setCatModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 && <p className="text-gray-400 col-span-3 text-center py-8">No categories yet.</p>}
            {categories.map((c: any) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-4 flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{c.item_count || 0} items</p>
                  </div>
                  <button className="text-blue-600 hover:bg-blue-50 p-1 rounded" onClick={() => {
                    setEditCat(c);
                    setCatForm({ name: c.name, description: c.description || '' });
                    setCatModal(true);
                  }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Recent inventory movements.</p>
            <Button variant="outline" size="sm" onClick={loadTransactions}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Notes</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No transactions found.</td></tr>
                    ) : transactions.map((tx: any, i: number) => {
                      const txType = TX_TYPES.find(t => t.value === tx.type);
                      return (
                        <tr key={tx.id || i} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{tx.item_name || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${txType?.color || 'bg-gray-100 text-gray-700'}`}>{tx.type}</span>
                          </td>
                          <td className="px-4 py-2">{tx.quantity}</td>
                          <td className="px-4 py-2 text-gray-500">{tx.notes || '-'}</td>
                          <td className="px-4 py-2 text-gray-500">{tx.created_at?.split('T')[0] || '-'}</td>
                          <td className="px-4 py-2 text-gray-500">{tx.user_name || '-'}</td>
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

      {/* Low Stock */}
      {tab === 'lowstock' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Items at or below their reorder level.</p>
            <Button variant="outline" size="sm" onClick={loadLowStock}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : lowStock.length === 0 ? (
            <div className="text-center py-12 text-green-600">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">All stock levels are healthy!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStock.map((item: any) => {
                const shortage = Math.max(0, Number(item.reorder_level || 0) - Number(item.quantity || 0));
                const suggestion = Math.max(shortage, Number(item.reorder_level || 0) * 2);
                return (
                  <Card key={item.id} className="border-l-4 border-l-red-400">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      </div>
                      <p className="text-sm text-gray-500">{item.category_name || 'Uncategorized'}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Current</p>
                          <p className="font-bold text-red-600">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Reorder Level</p>
                          <p className="font-bold text-gray-600">{item.reorder_level}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Suggested Order</p>
                          <p className="font-bold text-orange-600">{suggestion}</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-1" variant="outline" onClick={() => {
                        setSelectedItem(item);
                        setTxForm({ type: 'stock_in', quantity: String(suggestion), notes: 'Reorder replenishment' });
                        setTxModal(true);
                      }}>
                        <ArrowLeftRight className="h-3 w-3 mr-1" /> Record Stock In
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editCat ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setCatModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCatModal(false)}>Cancel</Button>
              <Button onClick={saveCat}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button onClick={() => setItemModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Category</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={itemForm.category_id} onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Label>Name</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>SKU</Label><Input value={itemForm.sku} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Location</Label><Input value={itemForm.location} onChange={e => setItemForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><Label>Quantity</Label><Input type="number" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Reorder Level</Label><Input type="number" value={itemForm.reorder_level} onChange={e => setItemForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
              <div><Label>Unit Cost (KES)</Label><Input type="number" value={itemForm.unit_cost} onChange={e => setItemForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
              <div>
                <Label>Condition</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={itemForm.condition} onChange={e => setItemForm(f => ({ ...f, condition: e.target.value }))}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setItemModal(false)}>Cancel</Button>
              <Button onClick={saveItem}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {txModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Transaction — {selectedItem.name}</h2>
              <button onClick={() => setTxModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500">Current qty: <strong>{selectedItem.quantity}</strong></p>
            <div className="space-y-3">
              <div>
                <Label>Transaction Type</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value as TxType }))}>
                  {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><Label>Quantity</Label><Input type="number" value={txForm.quantity} onChange={e => setTxForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTxModal(false)}>Cancel</Button>
              <Button onClick={doTransaction}>Record</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
