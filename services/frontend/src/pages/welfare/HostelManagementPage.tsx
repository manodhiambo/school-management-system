import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  Home, Users, BedDouble, ArrowRightLeft, Plus, RefreshCw,
  ChevronLeft, AlertTriangle, CheckCircle, LogOut, Clock
} from 'lucide-react';

type Tab = 'occupancy' | 'rooms' | 'allocations' | 'movements';

const GENDER_COLORS: Record<string, string> = {
  male:   'bg-blue-100 text-blue-800',
  female: 'bg-pink-100 text-pink-800',
  mixed:  'bg-purple-100 text-purple-800',
};

const MOV_STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-800',
};

const EMPTY_HOSTEL = { name: '', gender: 'male', capacity: '' };
const EMPTY_ROOM   = { room_number: '', capacity: '', room_type: 'dormitory' };
const EMPTY_ALLOC  = { hostel_id: '', room_id: '', student_id: '', bed_number: '' };
const EMPTY_MOV    = { student_id: '', movement_type: 'exeat', departure_time: '', guardian_name: '', guardian_phone: '', notes: '' };

export function HostelManagementPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [tab, setTab] = useState<Tab>('occupancy');
  const [loading, setLoading] = useState(false);

  // Occupancy
  const [hostels, setHostels]   = useState<any[]>([]);
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [hostelForm, setHostelForm] = useState({ ...EMPTY_HOSTEL });

  // Rooms
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [rooms, setRooms]       = useState<any[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ ...EMPTY_ROOM });

  // Allocations
  const [allocations, setAllocations] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [allocForm, setAllocForm] = useState({ ...EMPTY_ALLOC });
  const [allocRooms, setAllocRooms] = useState<any[]>([]);

  // Movements
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm]   = useState({ ...EMPTY_MOV });

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === 'occupancy') {
        const [hRes, oRes]: any[] = await Promise.all([
          (api as any).getHostels(),
          (api as any).getHostelOccupancy(),
        ]);
        setHostels(hRes?.data || []);
        setOccupancy(oRes?.data || []);
      }
      if (tab === 'rooms') {
        const hRes: any = await (api as any).getHostels();
        setHostels(hRes?.data || []);
      }
      if (tab === 'allocations') {
        const [hRes, aRes, sRes]: any[] = await Promise.all([
          (api as any).getHostels(),
          (api as any).getAllocations(),
          api.getStudents(),
        ]);
        setHostels(hRes?.data || []);
        setAllocations(aRes?.data || []);
        setStudents(sRes?.data || []);
      }
      if (tab === 'movements') {
        const [mRes, sRes]: any[] = await Promise.all([
          (api as any).getMovements(),
          api.getStudents(),
        ]);
        setMovements(mRes?.data || []);
        setStudents(sRes?.data || []);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createHostel = async () => {
    try {
      await (api as any).createHostel(hostelForm);
      toast({ title: 'Hostel created' });
      setShowHostelForm(false);
      setHostelForm({ ...EMPTY_HOSTEL });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadRooms = async (hostel: any) => {
    setSelectedHostel(hostel);
    setLoading(true);
    try {
      const res: any = await (api as any).getHostelRooms(hostel.id);
      setRooms(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const addRoom = async () => {
    if (!selectedHostel) return;
    try {
      await (api as any).addHostelRoom(selectedHostel.id, roomForm);
      toast({ title: 'Room added' });
      setShowRoomForm(false);
      setRoomForm({ ...EMPTY_ROOM });
      loadRooms(selectedHostel);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const onAllocHostelChange = async (hostelId: string) => {
    setAllocForm(f => ({ ...f, hostel_id: hostelId, room_id: '' }));
    if (!hostelId) { setAllocRooms([]); return; }
    try {
      const res: any = await (api as any).getHostelRooms(hostelId);
      setAllocRooms(res?.data || []);
    } catch { setAllocRooms([]); }
  };

  const allocateStudent = async () => {
    try {
      await (api as any).allocateStudent(allocForm);
      toast({ title: 'Student allocated' });
      setShowAllocForm(false);
      setAllocForm({ ...EMPTY_ALLOC });
      setAllocRooms([]);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const checkoutStudent = async (id: string) => {
    try {
      await (api as any).checkoutStudent(id);
      toast({ title: 'Student checked out' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const logMovement = async () => {
    try {
      await (api as any).logMovement(movForm);
      toast({ title: 'Movement logged' });
      setShowMovForm(false);
      setMovForm({ ...EMPTY_MOV });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const approveMovement = async (id: string) => {
    try {
      await (api as any).approveMovement(id);
      toast({ title: 'Movement approved' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const returnMovement = async (id: string) => {
    try {
      await (api as any).returnMovement(id);
      toast({ title: 'Student returned' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const isOverdue = (m: any) => {
    if (m.status === 'returned') return false;
    if (!m.expected_return_time) return false;
    return new Date(m.expected_return_time) < new Date();
  };

  const TABS = [
    { key: 'occupancy' as Tab,    label: 'Occupancy',    icon: Home },
    { key: 'rooms' as Tab,        label: 'Rooms',        icon: BedDouble },
    { key: 'allocations' as Tab,  label: 'Allocations',  icon: Users },
    { key: 'movements' as Tab,    label: 'Movements',    icon: ArrowRightLeft },
  ];

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Hostel management is only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hostel Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage hostels, rooms, allocations and student movements</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedHostel(null); setRooms([]); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      )}

      {/* OCCUPANCY */}
      {!loading && tab === 'occupancy' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Hostel Overview</h2>
            <Button onClick={() => setShowHostelForm(!showHostelForm)}>
              <Plus className="h-4 w-4 mr-2" /> Add Hostel
            </Button>
          </div>

          {showHostelForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Hostel Name</Label>
                  <Input className="mt-1" placeholder="e.g. Block A Boys" value={hostelForm.name}
                    onChange={e => setHostelForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={hostelForm.gender}
                    onChange={e => setHostelForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <Label>Total Capacity</Label>
                  <Input type="number" className="mt-1" value={hostelForm.capacity}
                    onChange={e => setHostelForm(f => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createHostel}>Save</Button>
                <Button variant="outline" onClick={() => setShowHostelForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {(occupancy.length > 0 ? occupancy : hostels).length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hostels registered</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(occupancy.length > 0 ? occupancy : hostels).map((h: any) => {
                const pct = h.capacity > 0 ? Math.round(((h.occupied || 0) / h.capacity) * 100) : 0;
                const available = (h.capacity || 0) - (h.occupied || 0);
                return (
                  <Card key={h.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => { setTab('rooms'); loadRooms(h); }}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-lg">{h.name}</div>
                          <Badge className={GENDER_COLORS[h.gender] || ''} >{h.gender}</Badge>
                        </div>
                        <Home className="h-8 w-8 text-blue-400" />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Capacity</span>
                          <span className="font-medium">{h.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Occupied</span>
                          <span className="font-medium text-blue-600">{h.occupied || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Available</span>
                          <span className={`font-medium ${available <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                            {available}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="text-xs text-right text-gray-400">{pct}% full</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ROOMS */}
      {!loading && tab === 'rooms' && (
        <div className="space-y-4">
          {!selectedHostel ? (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select a Hostel</h2>
              {hostels.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No hostels available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hostels.map(h => (
                    <button key={h.id} className="text-left border rounded-lg p-4 hover:bg-gray-50 transition"
                      onClick={() => loadRooms(h)}>
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{h.gender} · {h.capacity} beds</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { setSelectedHostel(null); setRooms([]); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> All Hostels
                </Button>
                <h2 className="text-lg font-semibold">{selectedHostel.name} — Rooms</h2>
                <Button size="sm" className="ml-auto" onClick={() => setShowRoomForm(!showRoomForm)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Room
                </Button>
              </div>

              {showRoomForm && (
                <Card><CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Room Number</Label>
                      <Input className="mt-1" placeholder="e.g. A01" value={roomForm.room_number}
                        onChange={e => setRoomForm(f => ({ ...f, room_number: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Capacity (beds)</Label>
                      <Input type="number" className="mt-1" value={roomForm.capacity}
                        onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Room Type</Label>
                      <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                        value={roomForm.room_type}
                        onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))}>
                        <option value="dormitory">Dormitory</option>
                        <option value="cubicle">Cubicle</option>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={addRoom}>Add Room</Button>
                    <Button variant="outline" onClick={() => setShowRoomForm(false)}>Cancel</Button>
                  </div>
                </CardContent></Card>
              )}

              {rooms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No rooms added yet</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map(r => (
                    <Card key={r.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold">Room {r.room_number}</div>
                            <div className="text-sm text-gray-500 capitalize">{r.room_type}</div>
                          </div>
                          <Badge className={
                            (r.occupied || 0) >= r.capacity
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }>
                            {r.occupied || 0}/{r.capacity}
                          </Badge>
                        </div>
                        {r.students && r.students.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {r.students.map((s: any) => (
                              <div key={s.id} className="text-xs text-gray-600 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {s.name || s.full_name} {s.bed_number ? `(Bed ${s.bed_number})` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ALLOCATIONS */}
      {!loading && tab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Student Allocations</h2>
            <Button onClick={() => setShowAllocForm(!showAllocForm)}>
              <Plus className="h-4 w-4 mr-2" /> Allocate Student
            </Button>
          </div>

          {showAllocForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={allocForm.student_id}
                    onChange={e => setAllocForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Hostel</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={allocForm.hostel_id}
                    onChange={e => onAllocHostelChange(e.target.value)}>
                    <option value="">Select hostel</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Room</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={allocForm.room_id}
                    onChange={e => setAllocForm(f => ({ ...f, room_id: e.target.value }))}>
                    <option value="">Select room</option>
                    {allocRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} ({r.occupied || 0}/{r.capacity} beds)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Bed Number</Label>
                  <Input className="mt-1" placeholder="e.g. 3" value={allocForm.bed_number}
                    onChange={e => setAllocForm(f => ({ ...f, bed_number: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={allocateStudent}>Allocate</Button>
                <Button variant="outline" onClick={() => { setShowAllocForm(false); setAllocRooms([]); }}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {allocations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No allocations yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Student</th>
                    <th className="text-left py-3 pr-4">Hostel</th>
                    <th className="text-left py-3 pr-4">Room</th>
                    <th className="text-left py-3 pr-4">Bed</th>
                    <th className="text-left py-3 pr-4">Allocated On</th>
                    <th className="text-left py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{a.student_name}</td>
                      <td className="py-3 pr-4">{a.hostel_name}</td>
                      <td className="py-3 pr-4">Room {a.room_number}</td>
                      <td className="py-3 pr-4">{a.bed_number || '—'}</td>
                      <td className="py-3 pr-4 text-gray-500">{a.allocated_at?.slice(0, 10) || '—'}</td>
                      <td className="py-3">
                        {!a.checked_out_at && (
                          <Button size="sm" variant="outline" className="text-red-600"
                            onClick={() => checkoutStudent(a.id)}>
                            <LogOut className="h-3 w-3 mr-1" /> Checkout
                          </Button>
                        )}
                        {a.checked_out_at && (
                          <Badge className="bg-gray-100 text-gray-600">Checked out</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MOVEMENTS */}
      {!loading && tab === 'movements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Student Movements</h2>
            <Button onClick={() => setShowMovForm(!showMovForm)}>
              <Plus className="h-4 w-4 mr-2" /> Log Movement
            </Button>
          </div>

          {showMovForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={movForm.student_id}
                    onChange={e => setMovForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Movement Type</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={movForm.movement_type}
                    onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))}>
                    <option value="exeat">Exeat</option>
                    <option value="home_visit">Home Visit</option>
                    <option value="medical">Medical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Departure Date/Time</Label>
                  <Input type="datetime-local" className="mt-1" value={movForm.departure_time}
                    onChange={e => setMovForm(f => ({ ...f, departure_time: e.target.value }))} />
                </div>
                <div>
                  <Label>Guardian Name</Label>
                  <Input className="mt-1" placeholder="Name of person collecting student" value={movForm.guardian_name}
                    onChange={e => setMovForm(f => ({ ...f, guardian_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Guardian Phone</Label>
                  <Input className="mt-1" placeholder="+254..." value={movForm.guardian_phone}
                    onChange={e => setMovForm(f => ({ ...f, guardian_phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input className="mt-1" placeholder="Additional notes" value={movForm.notes}
                    onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={logMovement}>Log Movement</Button>
                <Button variant="outline" onClick={() => setShowMovForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No movements recorded</div>
          ) : (
            <div className="space-y-3">
              {movements.map(m => {
                const overdue = isOverdue(m);
                return (
                  <Card key={m.id} className={overdue ? 'border-red-300' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.student_name}</span>
                            {overdue && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 capitalize">
                            {m.movement_type?.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            Departed: {m.departure_time ? new Date(m.departure_time).toLocaleString() : '—'}
                          </div>
                          {m.guardian_name && (
                            <div className="text-sm text-gray-500">
                              Guardian: {m.guardian_name} {m.guardian_phone && `· ${m.guardian_phone}`}
                            </div>
                          )}
                          {m.notes && <div className="text-sm text-gray-600 mt-1 italic">"{m.notes}"</div>}
                        </div>
                        <Badge className={MOV_STATUS_COLORS[overdue ? 'overdue' : m.status] || ''}>
                          {overdue ? 'overdue' : m.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {m.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => approveMovement(m.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {['approved','pending'].includes(m.status) && (
                          <Button size="sm" variant="outline" onClick={() => returnMovement(m.id)}>
                            <Clock className="h-3 w-3 mr-1" /> Mark Returned
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
