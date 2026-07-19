import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Boxes, Plus, RefreshCw, QrCode, X, AlertTriangle } from 'lucide-react';

type Tab = 'units' | 'issuances' | 'liability';

const CONDITION_STYLES: Record<string, string> = {
  new: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800', poor: 'bg-orange-100 text-orange-800',
  damaged: 'bg-red-100 text-red-800', lost: 'bg-gray-200 text-gray-700',
};

const ISSUANCE_STYLES: Record<string, string> = {
  issued: 'bg-blue-100 text-blue-800', returned: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800', damaged: 'bg-orange-100 text-orange-800',
};

const studentLabel = (s: any) => s.first_name ? `${s.first_name} ${s.last_name}` : (s.name || s.full_name || 'Unknown');

export function HostelInventoryPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [tab, setTab] = useState<Tab>('units');
  const [loading, setLoading] = useState(false);

  // Item + unit management
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ serial_number: '', condition: 'new', purchase_cost: '' });
  const [qrPreview, setQrPreview] = useState<{ barcode: string; url: string } | null>(null);

  // Issue modal
  const [issuingUnit, setIssuingUnit] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [issueStudentId, setIssueStudentId] = useState('');

  // Issuances
  const [issuances, setIssuances] = useState<any[]>([]);
  const [issuanceFilter, setIssuanceFilter] = useState('');

  // Liability
  const [charges, setCharges] = useState<any[]>([]);

  useEffect(() => { loadCategoriesAndItems(); }, []);
  useEffect(() => { if (tab === 'issuances') loadIssuances(); if (tab === 'liability') loadCharges(); }, [tab, issuanceFilter]);

  const loadCategoriesAndItems = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, sRes]: any[] = await Promise.all([
        api.getInventoryCategories(),
        api.getInventoryItems(),
        api.getStudents(),
      ]);
      setCategories(catRes?.data || []);
      setItems(itemRes?.data || []);
      setStudents(sRes?.data?.students || sRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const seedCategories = async () => {
    try {
      await (api as any).seedHostelInventoryCategories();
      toast({ title: 'Hostel categories added' });
      loadCategoriesAndItems();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadUnits = async (itemId: string) => {
    setSelectedItemId(itemId);
    if (!itemId) { setUnits([]); return; }
    setLoading(true);
    try {
      const res: any = await (api as any).getInventoryItemUnits(itemId);
      setUnits(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createUnit = async () => {
    if (!selectedItemId) return;
    try {
      const res: any = await (api as any).createInventoryItemUnit(selectedItemId, {
        ...unitForm, purchase_cost: unitForm.purchase_cost || 0,
      });
      toast({ title: 'Unit registered' });
      setShowUnitForm(false);
      setUnitForm({ serial_number: '', condition: 'new', purchase_cost: '' });
      if (res?.data?.qr_data_url) setQrPreview({ barcode: res.data.barcode, url: res.data.qr_data_url });
      loadUnits(selectedItemId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openIssueModal = (unit: any) => { setIssuingUnit(unit); setIssueStudentId(''); };

  const issueUnit = async () => {
    if (!issuingUnit || !issueStudentId) return;
    try {
      await (api as any).createIssuance({ item_unit_id: issuingUnit.id, student_id: issueStudentId });
      toast({ title: 'Item issued' });
      setIssuingUnit(null);
      loadUnits(selectedItemId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadIssuances = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getIssuances(issuanceFilter ? { status: issuanceFilter } : undefined);
      setIssuances(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const returnIssuance = async (id: string) => {
    try {
      await (api as any).returnIssuance(id);
      toast({ title: 'Item returned' });
      loadIssuances();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const closeOutIssuance = async (id: string, outcome: 'lost' | 'damaged') => {
    const cost = prompt(`Replacement cost for this ${outcome} item (KES):`, '0');
    if (cost == null) return;
    try {
      if (outcome === 'lost') await (api as any).markIssuanceLost(id, { replacement_cost: parseFloat(cost) || 0 });
      else await (api as any).markIssuanceDamaged(id, { replacement_cost: parseFloat(cost) || 0 });
      toast({ title: `Marked ${outcome}` });
      loadIssuances();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadCharges = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getReplacementCharges();
      setCharges(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Hostel inventory is only available to administrators.</div>;
  }

  const TABS = [
    { key: 'units' as Tab,      label: 'Items & Units' },
    { key: 'issuances' as Tab,  label: 'Issued Items' },
    { key: 'liability' as Tab,  label: 'Student Liability' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostel Inventory & Asset Issuing</h1>
          <p className="text-sm text-gray-500 mt-1">Track lockers, mattresses, bedding and other boarding assets by unit</p>
        </div>
        {categories.length === 0 && (
          <Button variant="outline" onClick={seedCategories}>Set up hostel categories</Button>
        )}
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>}

      {/* ITEMS & UNITS */}
      {!loading && tab === 'units' && (
        <div className="space-y-4">
          <Card><CardContent className="pt-6">
            <Label>Select Item</Label>
            <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={selectedItemId} onChange={e => loadUnits(e.target.value)}>
              <option value="">Select an item to view its trackable units...</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.category_name ? `${i.category_name} — ` : ''}{i.name}</option>
              ))}
            </select>
          </CardContent></Card>

          {selectedItemId && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Trackable Units</h2>
                <Button onClick={() => setShowUnitForm(!showUnitForm)}>
                  <Plus className="h-4 w-4 mr-2" /> Register Unit
                </Button>
              </div>

              {showUnitForm && (
                <Card><CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Serial Number (optional)</Label>
                      <Input className="mt-1" value={unitForm.serial_number}
                        onChange={e => setUnitForm(f => ({ ...f, serial_number: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                        value={unitForm.condition} onChange={e => setUnitForm(f => ({ ...f, condition: e.target.value }))}>
                        <option value="new">New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                      </select>
                    </div>
                    <div>
                      <Label>Purchase Cost (KES)</Label>
                      <Input type="number" className="mt-1" value={unitForm.purchase_cost}
                        onChange={e => setUnitForm(f => ({ ...f, purchase_cost: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={createUnit}>Register (auto-generates barcode + QR)</Button>
                    <Button variant="outline" onClick={() => setShowUnitForm(false)}>Cancel</Button>
                  </div>
                </CardContent></Card>
              )}

              {units.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No trackable units registered for this item yet</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map(u => (
                    <Card key={u.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm font-mono text-gray-500">
                            <QrCode className="h-4 w-4" /> {u.barcode}
                          </div>
                          <Badge className={CONDITION_STYLES[u.condition] || ''}>{u.condition}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {u.current_holder_type === 'student' && u.current_holder_name
                            ? <>Holder: <span className="font-medium">{u.current_holder_name}</span></>
                            : <span className="text-gray-400">Not issued</span>}
                        </div>
                        {u.current_holder_type === 'none' && (
                          <Button size="sm" className="w-full" onClick={() => openIssueModal(u)}>Issue to Student</Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ISSUANCES */}
      {!loading && tab === 'issuances' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'issued', 'returned', 'lost', 'damaged'].map(s => (
              <button key={s || 'all'} onClick={() => setIssuanceFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${issuanceFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
          {issuances.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No issuances found</div>
          ) : (
            <div className="space-y-2">
              {issuances.map(iss => (
                <Card key={iss.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{iss.item_name} <span className="text-xs font-mono text-gray-400">({iss.barcode})</span></div>
                      <div className="text-sm text-gray-500">
                        {iss.student_name} ({iss.admission_number}) · issued {iss.issued_at?.slice(0, 10)}
                        {iss.replacement_cost > 0 && ` · KES ${iss.replacement_cost} liability`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={ISSUANCE_STYLES[iss.status] || ''}>{iss.status}</Badge>
                      {iss.status === 'issued' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => returnIssuance(iss.id)}>Return</Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => closeOutIssuance(iss.id, 'lost')}>Lost</Button>
                          <Button size="sm" variant="outline" className="text-orange-600" onClick={() => closeOutIssuance(iss.id, 'damaged')}>Damaged</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIABILITY */}
      {!loading && tab === 'liability' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Outstanding Replacement Charges</h2>
          {charges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No outstanding replacement charges</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Student</th>
                    <th className="text-left py-3 pr-4">Items</th>
                    <th className="text-left py-3">Total Charges</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c: any) => (
                    <tr key={c.student_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{c.student_name} <span className="text-gray-400 font-normal">({c.admission_number})</span></td>
                      <td className="py-3 pr-4">{c.item_count}</td>
                      <td className="py-3 flex items-center gap-1.5 text-red-700 font-medium">
                        <AlertTriangle className="h-4 w-4" /> KES {parseFloat(c.total_charges).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QR preview modal after registering a unit */}
      {qrPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xs">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-end">
                <button onClick={() => setQrPreview(null)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <Boxes className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-mono text-sm mb-3">{qrPreview.barcode}</p>
              <img src={qrPreview.url} alt="QR code" className="mx-auto rounded border" />
              <Button className="w-full mt-4" onClick={() => setQrPreview(null)}>Done</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issue modal */}
      {issuingUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Issue {issuingUnit.barcode}</h3>
                <button onClick={() => setIssuingUnit(null)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <Label>Student</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={issueStudentId} onChange={e => setIssueStudentId(e.target.value)}>
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
              </select>
              <div className="flex gap-2 mt-4">
                <Button className="flex-1" onClick={issueUnit} disabled={!issueStudentId}>Issue</Button>
                <Button variant="outline" onClick={() => setIssuingUnit(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
