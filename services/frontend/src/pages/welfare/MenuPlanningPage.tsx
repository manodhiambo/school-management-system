import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { CalendarDays, Plus, RefreshCw, Trash2 } from 'lucide-react';

type View = 'day' | 'week' | 'month';

const MEAL_TYPES = ['breakfast', 'lunch', 'supper', 'snack', 'full_day'];

const EMPTY_FORM = { menu_date: new Date().toISOString().slice(0, 10), meal_type: 'lunch', meal_plan_id: '', dish_name: '', nutrition_notes: '', notes: '' };

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function rangeFor(view: View, anchor: string): { from: string; to: string } {
  const d = new Date(anchor + 'T00:00:00');
  if (view === 'day') return { from: anchor, to: anchor };
  if (view === 'week') {
    const day = d.getDay();
    const start = new Date(d); start.setDate(d.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: toISO(start), to: toISO(end) };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toISO(start), to: toISO(end) };
}

export function MenuPlanningPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [menus, setMenus] = useState<any[]>([]);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { from, to } = rangeFor(view, anchor);

  useEffect(() => { load(); }, [view, anchor]);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, pRes]: any[] = await Promise.all([
        (api as any).getCanteenMenus({ from, to }),
        (api as any).getMealPlans(),
      ]);
      setMenus(mRes?.data || []);
      setMealPlans(pRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createMenu = async () => {
    try {
      await (api as any).createCanteenMenu(form);
      toast({ title: 'Menu entry added' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deleteMenu = async (id: string) => {
    try {
      await (api as any).deleteCanteenMenu(id);
      toast({ title: 'Menu entry removed' });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Menu planning is only available to administrators.</div>;
  }

  // Group by date
  const byDate: Record<string, any[]> = {};
  menus.forEach(m => {
    const d = (m.menu_date || '').slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  });
  const dates = Object.keys(byDate).sort();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Plan daily, weekly and monthly menus</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM, menu_date: anchor }); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Menu Entry
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${view === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {v}
            </button>
          ))}
        </div>
        <Input type="date" className="w-auto" value={anchor} onChange={e => setAnchor(e.target.value)} />
        <span className="text-xs text-gray-400">{from} to {to}</span>
      </div>

      {showForm && (
        <Card><CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1" value={form.menu_date} onChange={e => setForm(f => ({ ...f, menu_date: e.target.value }))} />
            </div>
            <div>
              <Label>Meal Type</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Meal Plan (for pricing)</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.meal_plan_id} onChange={e => setForm(f => ({ ...f, meal_plan_id: e.target.value }))}>
                <option value="">None</option>
                {mealPlans.map(m => <option key={m.id} value={m.id}>{m.name} — KES {m.price}</option>)}
              </select>
            </div>
            <div>
              <Label>Dish Name</Label>
              <Input className="mt-1" placeholder="e.g. Ugali, Sukuma Wiki & Beef Stew" value={form.dish_name} onChange={e => setForm(f => ({ ...f, dish_name: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Nutrition Notes</Label>
              <Input className="mt-1" placeholder="e.g. High protein, balanced carbs" value={form.nutrition_notes} onChange={e => setForm(f => ({ ...f, nutrition_notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={createMenu}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : dates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No menu entries planned for this period</div>
      ) : (
        <div className="space-y-4">
          {dates.map(d => (
            <Card key={d}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3 font-semibold text-gray-800">
                  <CalendarDays className="h-4 w-4 text-green-600" /> {new Date(d + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-2">
                  {byDate[d].map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <Badge className="bg-blue-100 text-blue-800 capitalize mr-2">{m.meal_type.replace('_', ' ')}</Badge>
                        <span className="font-medium">{m.dish_name || m.meal_plan_name || 'Untitled'}</span>
                        {m.nutrition_notes && <div className="text-xs text-gray-400 mt-0.5">{m.nutrition_notes}</div>}
                      </div>
                      <button onClick={() => deleteMenu(m.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
