import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  ShoppingCart, Plus, Minus, Trash2, RefreshCw, Search, X,
  Package, Receipt, BarChart2, QrCode, Smartphone,
} from 'lucide-react';

type Tab = 'pos' | 'products' | 'sales' | 'reports';
type ReportView = 'daily' | 'products' | 'profit';

const EMPTY_PRODUCT = { name: '', category_id: '', sku: '', unit: 'pieces', quantity: '', reorder_level: '', unit_cost: '', selling_price: '' };

const studentLabel = (s: any) => s.first_name ? `${s.first_name} ${s.last_name}` : (s.name || s.full_name || 'Unknown');

function Badge2({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{label}</span>;
}

const saleStatusColor = (s: string) => ({
  completed: 'bg-green-100 text-green-800', refunded: 'bg-red-100 text-red-800',
  partial_refund: 'bg-orange-100 text-orange-800', pending_mpesa: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-600',
}[s] || 'bg-gray-100 text-gray-700');

export function SchoolStorePage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [tab, setTab] = useState<Tab>('pos');
  const [loading, setLoading] = useState(false);

  // Products (shared across POS + Products tab)
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ ...EMPTY_PRODUCT });
  const [qrPreview, setQrPreview] = useState<{ barcode: string; url: string } | null>(null);

  // POS cart
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'wallet'>('cash');
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [tendered, setTendered] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [pendingSale, setPendingSale] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);

  // Sales history
  const [sales, setSales] = useState<any[]>([]);
  const [refundModal, setRefundModal] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({ sale_item_id: '', quantity: '', reason: '' });

  // Reports
  const [reportView, setReportView] = useState<ReportView>('daily');
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [productsReport, setProductsReport] = useState<any>(null);
  const [profitReport, setProfitReport] = useState<any>(null);

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    if (tab === 'pos' && !students.length) loadStudents();
    if (tab === 'sales') loadSales();
    if (tab === 'reports') loadReport();
  }, [tab, reportView]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [pRes, cRes]: any[] = await Promise.all([
        (api as any).getStoreProducts(),
        api.getInventoryCategories(),
      ]);
      setProducts(pRes?.data || []);
      setCategories(cRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadStudents = async () => {
    try {
      const res: any = await api.getStudents();
      setStudents(res?.data?.students || res?.data || []);
    } catch { /* non-critical */ }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getStoreSales();
      setSales(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      if (reportView === 'daily') {
        const res: any = await (api as any).getStoreDailyReport();
        setDailyReport(res?.data || null);
      } else if (reportView === 'products') {
        const res: any = await (api as any).getStoreProductsReport();
        setProductsReport(res?.data || null);
      } else {
        const res: any = await (api as any).getStoreProfitReport();
        setProfitReport(res?.data || null);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // ── Products CRUD ──────────────────────────────────────────────────────────

  const saveProduct = async () => {
    try {
      if (editProduct) {
        await (api as any).updateStoreProduct(editProduct.id, productForm);
      } else {
        const res: any = await (api as any).createStoreProduct(productForm);
        if (res?.data?.qr_data_url) setQrPreview({ barcode: res.data.barcode, url: res.data.qr_data_url });
      }
      setProductModal(false);
      setEditProduct(null);
      setProductForm({ ...EMPTY_PRODUCT });
      loadProducts();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode?.includes(productSearch)
  );

  // ── POS cart ───────────────────────────────────────────────────────────────

  const addToCart = (product: any) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.quantity)) return c;
        return c.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...c, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(c => c
      .map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, Math.min(i.quantity + delta, Number(i.product.quantity))) } : i)
      .filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId: string) => setCart(c => c.filter(i => i.product.id !== productId));

  const scanToCart = () => {
    const found = products.find(p => p.barcode === productSearch.trim());
    if (found) { addToCart(found); setProductSearch(''); }
    else toast({ title: 'No product found for that barcode', variant: 'destructive' });
  };

  const subtotal = cart.reduce((s, i) => s + Number(i.product.selling_price || 0) * i.quantity, 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);
  const changeDue = paymentMethod === 'cash' && tendered ? Math.max(Number(tendered) - total, 0) : null;

  const resetCart = () => {
    setCart([]); setDiscount(''); setTendered(''); setPhone(''); setStudentId(''); setCustomerName(''); setPendingSale(null);
  };

  const checkout = async () => {
    if (!cart.length) return;
    if (paymentMethod === 'wallet' && !studentId) {
      toast({ title: 'Select a student for wallet payment', variant: 'destructive' });
      return;
    }
    if (paymentMethod === 'mpesa' && !phone.trim()) {
      toast({ title: 'Enter a phone number for M-Pesa', variant: 'destructive' });
      return;
    }
    setCheckingOut(true);
    try {
      const res: any = await (api as any).checkoutStoreSale({
        items: cart.map(i => ({ item_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        student_id: paymentMethod === 'wallet' ? studentId : (studentId || undefined),
        customer_name: customerName || undefined,
        discount_amount: Number(discount) || 0,
        amount_tendered: paymentMethod === 'cash' ? Number(tendered) || undefined : undefined,
        phone: paymentMethod === 'mpesa' ? phone : undefined,
      });
      const sale = res?.data;
      if (sale?.status === 'pending_mpesa') {
        setPendingSale(sale);
        toast({ title: 'STK push sent — ask the customer to enter their M-Pesa PIN' });
      } else {
        setReceipt(sale);
        toast({ title: `Sale ${sale.sale_number} completed` });
        loadProducts();
        resetCart();
      }
    } catch (e: any) {
      toast({ title: 'Checkout failed', description: e.message, variant: 'destructive' });
    } finally { setCheckingOut(false); }
  };

  const confirmMpesaPayment = async () => {
    if (!pendingSale) return;
    try {
      await (api as any).confirmStoreMpesa(pendingSale.id);
      toast({ title: `Sale ${pendingSale.sale_number} confirmed` });
      setReceipt(pendingSale);
      loadProducts();
      resetCart();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // ── Refunds ────────────────────────────────────────────────────────────────

  const openRefund = async (sale: any) => {
    try {
      const res: any = await (api as any).getStoreSale(sale.id);
      setRefundModal(res?.data || sale);
      setRefundForm({ sale_item_id: '', quantity: '', reason: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const doRefund = async () => {
    if (!refundModal) return;
    try {
      await (api as any).refundStoreSale(refundModal.id, refundForm);
      toast({ title: 'Refund processed' });
      setRefundModal(null);
      loadSales();
      loadProducts();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">School Store is only available to administrators.</div>;
  }

  const TABS = [
    { key: 'pos' as Tab, label: 'Point of Sale', icon: ShoppingCart },
    { key: 'products' as Tab, label: 'Products', icon: Package },
    { key: 'sales' as Tab, label: 'Sales History', icon: Receipt },
    { key: 'reports' as Tab, label: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingCart className="h-6 w-6 text-green-600" /> School Store (POS)
      </h1>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* POS */}
      {tab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search product or scan barcode..." className="pl-8" value={productSearch}
                onChange={e => setProductSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && scanToCart()} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} disabled={Number(p.quantity) <= 0}
                  className="border rounded-lg p-3 text-left hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.quantity} in stock</div>
                  <div className="text-green-700 font-bold mt-1">KES {Number(p.selling_price || 0).toFixed(2)}</div>
                </button>
              ))}
              {filteredProducts.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-8">No products found</p>}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</h3>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-sm">Cart is empty</p>
              ) : (
                <div className="space-y-2">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{i.product.name}</div>
                        <div className="text-xs text-gray-400">KES {i.product.selling_price} × {i.quantity}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => changeQty(i.product.id, -1)}><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-5 text-center">{i.quantity}</span>
                        <button onClick={() => changeQty(i.product.id, 1)}><Plus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeFromCart(i.product.id)} className="text-red-400 ml-1"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Discount (KES)</Label>
                <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>KES {total.toFixed(2)}</span></div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                  <option value="wallet">Student Wallet</option>
                </select>
              </div>

              {paymentMethod === 'wallet' && (
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={studentId} onChange={e => setStudentId(e.target.value)}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                  </select>
                </div>
              )}
              {paymentMethod === 'mpesa' && (
                <div><Label>Phone Number</Label><Input placeholder="07XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              )}
              {paymentMethod === 'cash' && (
                <div><Label>Amount Tendered</Label><Input type="number" value={tendered} onChange={e => setTendered(e.target.value)} />
                  {changeDue != null && <p className="text-xs text-gray-500 mt-1">Change due: KES {changeDue.toFixed(2)}</p>}
                </div>
              )}
              {paymentMethod !== 'wallet' && (
                <div><Label>Customer Name (optional)</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              )}

              {pendingSale ? (
                <div className="space-y-2">
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Waiting for customer to complete M-Pesa payment...
                  </div>
                  <Button className="w-full" onClick={confirmMpesaPayment}>Confirm Payment Received</Button>
                  <Button variant="outline" className="w-full" onClick={() => setPendingSale(null)}>Cancel</Button>
                </div>
              ) : (
                <Button className="w-full" onClick={checkout} disabled={!cart.length || checkingOut}>
                  {checkingOut ? 'Processing...' : `Checkout — KES ${total.toFixed(2)}`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Manage store products, prices and stock.</p>
            <Button size="sm" onClick={() => { setEditProduct(null); setProductForm({ ...EMPTY_PRODUCT }); setProductModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </div>
          {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Category</th><th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2">Cost</th><th className="px-4 py-2">Sell Price</th><th className="px-4 py-2">Barcode</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No products yet.</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.is_low_stock ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-gray-500">{p.category_name || '-'}</td>
                      <td className={`px-4 py-2 ${p.is_low_stock ? 'text-amber-600 font-bold' : ''}`}>{p.quantity} {p.unit}</td>
                      <td className="px-4 py-2">KES {Number(p.unit_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-green-700">KES {Number(p.selling_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-400 flex items-center gap-1"><QrCode className="h-3 w-3" /> {p.barcode || '-'}</td>
                      <td className="px-4 py-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditProduct(p);
                          setProductForm({
                            name: p.name, category_id: p.category_id || '', sku: p.sku || '', unit: p.unit,
                            quantity: p.quantity, reorder_level: p.reorder_level, unit_cost: p.unit_cost, selling_price: p.selling_price,
                          });
                          setProductModal(true);
                        }}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Sales History */}
      {tab === 'sales' && (
        <div className="space-y-4">
          {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div> : sales.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No sales recorded yet</div>
          ) : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">Sale #</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Total</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">{s.sale_number}</td>
                      <td className="px-4 py-2">{s.student_name || s.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-2 capitalize">{s.payment_method}</td>
                      <td className="px-4 py-2 font-bold">KES {Number(s.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-2"><Badge2 label={s.status.replace('_', ' ')} color={saleStatusColor(s.status)} /></td>
                      <td className="px-4 py-2">
                        {['completed', 'partial_refund'].includes(s.status) && (
                          <Button size="sm" variant="outline" onClick={() => openRefund(s)}>Refund</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['daily', 'products', 'profit'] as ReportView[]).map(v => (
              <button key={v} onClick={() => setReportView(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${reportView === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {v}
              </button>
            ))}
          </div>
          {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div> : (
            <>
              {reportView === 'daily' && dailyReport && (
                <div className="space-y-4">
                  <Card><CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Total Revenue — {dailyReport.date}</p>
                    <p className="text-3xl font-bold text-green-600">KES {Number(dailyReport.totals?.total_revenue || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">{dailyReport.totals?.total_sales || 0} sales</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6 space-y-2">
                    <h3 className="font-semibold text-sm">By Payment Method</h3>
                    {(dailyReport.by_payment_method || []).map((m: any) => (
                      <div key={m.payment_method} className="flex justify-between text-sm">
                        <span className="capitalize">{m.payment_method}</span>
                        <span>KES {Number(m.total_amount).toFixed(2)} ({m.sale_count} sales)</span>
                      </div>
                    ))}
                    {(!dailyReport.by_payment_method || dailyReport.by_payment_method.length === 0) && <p className="text-gray-400 text-sm">No sales today.</p>}
                  </CardContent></Card>
                </div>
              )}
              {reportView === 'products' && productsReport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card><CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-2">Fast Moving</h3>
                    {productsReport.fast_moving.map((p: any) => (
                      <div key={p.item_id} className="flex justify-between text-sm py-1">
                        <span>{p.item_name}</span><span className="font-medium">{p.total_sold} sold</span>
                      </div>
                    ))}
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-2">Slow Moving</h3>
                    {productsReport.slow_moving.map((p: any) => (
                      <div key={p.item_id} className="flex justify-between text-sm py-1">
                        <span>{p.item_name}</span><span className="font-medium">{p.total_sold} sold</span>
                      </div>
                    ))}
                  </CardContent></Card>
                </div>
              )}
              {reportView === 'profit' && profitReport && (
                <div className="space-y-4">
                  <Card><CardContent className="pt-6">
                    <p className="text-sm text-gray-500">Total Profit</p>
                    <p className="text-3xl font-bold text-green-600">KES {Number(profitReport.grand_total_profit || 0).toFixed(2)}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                        <th className="px-4 py-2">Product</th><th className="px-4 py-2">Units</th><th className="px-4 py-2">Revenue</th><th className="px-4 py-2">Profit</th>
                      </tr></thead>
                      <tbody>
                        {profitReport.items.map((p: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">{p.item_name}</td>
                            <td className="px-4 py-2">{p.units_sold}</td>
                            <td className="px-4 py-2">KES {Number(p.revenue).toFixed(2)}</td>
                            <td className="px-4 py-2 text-green-700 font-medium">KES {Number(p.profit).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent></Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Product Modal */}
      {productModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setProductModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>Category</Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={productForm.category_id} onChange={e => setProductForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
                <div><Label>Unit</Label><Input value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" value={productForm.quantity} onChange={e => setProductForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Reorder Level</Label><Input type="number" value={productForm.reorder_level} onChange={e => setProductForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cost Price (KES)</Label><Input type="number" value={productForm.unit_cost} onChange={e => setProductForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
                <div><Label>Selling Price (KES)</Label><Input type="number" value={productForm.selling_price} onChange={e => setProductForm(f => ({ ...f, selling_price: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProductModal(false)}>Cancel</Button>
              <Button onClick={saveProduct}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview after adding a product */}
      {qrPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xs">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-end"><button onClick={() => setQrPreview(null)}><X className="h-4 w-4 text-gray-400" /></button></div>
              <p className="font-mono text-sm mb-3">{qrPreview.barcode}</p>
              <img src={qrPreview.url} alt="Barcode QR" className="mx-auto rounded border" />
              <Button className="w-full mt-4" onClick={() => setQrPreview(null)}>Done</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipt */}
      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xs">
            <CardContent className="pt-6 text-center space-y-2">
              <Receipt className="h-8 w-8 text-green-500 mx-auto" />
              <p className="font-bold">{receipt.sale_number}</p>
              <p className="text-2xl font-bold text-green-700">KES {Number(receipt.total_amount).toFixed(2)}</p>
              <p className="text-sm text-gray-500 capitalize">{receipt.payment_method}</p>
              {receipt.change_due != null && <p className="text-sm">Change: KES {Number(receipt.change_due).toFixed(2)}</p>}
              <Button className="w-full mt-4" onClick={() => setReceipt(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Refund — {refundModal.sale_number}</h2>
              <button onClick={() => setRefundModal(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Item</Label>
                <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={refundForm.sale_item_id}
                  onChange={e => setRefundForm(f => ({ ...f, sale_item_id: e.target.value }))}>
                  <option value="">Select item</option>
                  {(refundModal.items || []).filter((it: any) => Number(it.refunded_quantity) < Number(it.quantity)).map((it: any) => (
                    <option key={it.id} value={it.id}>{it.item_name} (up to {Number(it.quantity) - Number(it.refunded_quantity)})</option>
                  ))}
                </select>
              </div>
              <div><Label>Quantity to Refund</Label><Input type="number" value={refundForm.quantity} onChange={e => setRefundForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Reason</Label><Input value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundModal(null)}>Cancel</Button>
              <Button onClick={doRefund} disabled={!refundForm.sale_item_id || !refundForm.quantity}>Process Refund</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
