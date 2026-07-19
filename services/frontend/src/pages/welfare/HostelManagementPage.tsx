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
  ChevronLeft, AlertTriangle, CheckCircle, LogOut, Clock, ListPlus, DoorOpen, ShieldCheck,
} from 'lucide-react';

type Tab = 'occupancy' | 'rooms' | 'allocations' | 'waiting-list' | 'vacant-beds' | 'movements';

const GENDER_COLORS: Record<string, string> = {
  boys:  'bg-blue-100 text-blue-800',
  girls: 'bg-pink-100 text-pink-800',
  mixed: 'bg-purple-100 text-purple-800',
};

const MOV_STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-800',
};

const MOVEMENT_TYPES = [
  { value: 'exeat',     label: 'Exeat' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'departure', label: 'Departure' },
  { value: 'return',    label: 'Return' },
];

const EMPTY_HOSTEL = { name: '', hostel_type: 'boys', capacity: '' };
const EMPTY_ROOM   = { room_number: '', capacity: '', room_type: 'dormitory' };
const EMPTY_ALLOC  = { hostel_id: '', room_id: '', student_id: '', bed_number: '' };
const EMPTY_MOV     = { student_id: '', movement_type: 'exeat', departure_at: '', expected_return_at: '', guardian_name: '', guardian_phone: '', reason: '' };
const EMPTY_WAITING = { student_id: '', hostel_id: '', priority: '0', notes: '' };

const studentLabel = (s: any) => s.first_name ? `${s.first_name} ${s.last_name}` : (s.name || s.full_name || 'Unknown');

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
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferRoomId, setTransferRoomId] = useState('');
  const [transferOptions, setTransferOptions] = useState<any[]>([]);

  // Waiting list
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [showWaitForm, setShowWaitForm] = useState(false);
  const [waitForm, setWaitForm] = useState({ ...EMPTY_WAITING });

  // Vacant beds
  const [vacantBeds, setVacantBeds] = useState<any[]>([]);

  // Movements (leave/outpass)
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
        setOccupancy(oRes?.data?.hostels || []);
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
        setStudents(sRes?.data?.students || sRes?.data || []);
      }
      if (tab === 'waiting-list') {
        const [wRes, hRes, sRes]: any[] = await Promise.all([
          (api as any).getWaitingList(),
          (api as any).getHostels(),
          api.getStudents(),
        ]);
        setWaitingList(wRes?.data || []);
        setHostels(hRes?.data || []);
        setStudents(sRes?.data?.students || sRes?.data || []);
      }
      if (tab === 'vacant-beds') {
        const vRes: any = await (api as any).getVacantBeds();
        setVacantBeds(vRes?.data || []);
      }
      if (tab === 'movements') {
        const [mRes, sRes]: any[] = await Promise.all([
          (api as any).getMovements(),
          api.getStudents(),
        ]);
        setMovements(mRes?.data || []);
        setStudents(sRes?.data?.students || sRes?.data || []);
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

  const startTransfer = async (alloc: any) => {
    setTransferringId(alloc.id);
    setTransferRoomId('');
    try {
      const res: any = await (api as any).getVacantBeds();
      setTransferOptions(res?.data || []);
    } catch { setTransferOptions([]); }
  };

  const submitTransfer = async (allocId: string) => {
    if (!transferRoomId) return;
    try {
      await (api as any).transferAllocation(allocId, { room_id: transferRoomId });
      toast({ title: 'Student transferred' });
      setTransferringId(null);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const addToWaitingList = async () => {
    try {
      await (api as any).addToWaitingList(waitForm);
      toast({ title: 'Added to waiting list' });
      setShowWaitForm(false);
      setWaitForm({ ...EMPTY_WAITING });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const cancelWaiting = async (id: string) => {
    try {
      await (api as any).updateWaitingList(id, { status: 'cancelled' });
      toast({ title: 'Removed from waiting list' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const logMovement = async () => {
    try {
      await (api as any).logMovement(movForm);
      toast({ title: 'Leave/outpass request logged' });
      setShowMovForm(false);
      setMovForm({ ...EMPTY_MOV });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const parentApprove = async (id: string) => {
    try {
      await (api as any).parentApproveMovement(id);
      toast({ title: 'Parent approval recorded' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const approveMovement = async (id: string) => {
    try {
      await (api as any).approveMovement(id);
      toast({ title: 'Boarding master approval recorded' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const gateVerifyOut = async (id: string) => {
    try {
      await (api as any).gateVerifyOutMovement(id);
      toast({ title: 'Gate exit verified' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const gateVerifyIn = async (id: string) => {
    try {
      await (api as any).gateVerifyInMovement(id);
      toast({ title: 'Gate return verified' });
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
    if (m.status === 'returned' || m.return_at) return false;
    if (m.status === 'overdue') return true;
    if (m.status !== 'approved') return false;
    if (m.expected_return_at) return new Date(m.expected_return_at) < new Date();
    return new Date(m.departure_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;
  };

  const TABS = [
    { key: 'occupancy' as Tab,    label: 'Occupancy',    icon: Home },
    { key: 'rooms' as Tab,        label: 'Rooms',        icon: BedDouble },
    { key: 'allocations' as Tab,  label: 'Allocations',  icon: Users },
    { key: 'waiting-list' as Tab, label: 'Waiting List', icon: ListPlus },
    { key: 'vacant-beds' as Tab,  label: 'Vacant Beds',  icon: DoorOpen },
    { key: 'movements' as Tab,    label: 'Leave/Outpass', icon: ArrowRightLeft },
  ];

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Hostel management is only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hostel / Boarding Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage dormitories, rooms, allocations and leave/outpass requests</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedHostel(null); setRooms([]); setTransferringId(null); }}
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
            <h2 className="text-lg font-semibold">Dormitory Overview</h2>
            <Button onClick={() => setShowHostelForm(!showHostelForm)}>
              <Plus className="h-4 w-4 mr-2" /> Add Dormitory
            </Button>
          </div>

          {showHostelForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Dormitory Name</Label>
                  <Input className="mt-1" placeholder="e.g. Kilimanjaro House" value={hostelForm.name}
                    onChange={e => setHostelForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={hostelForm.hostel_type}
                    onChange={e => setHostelForm(f => ({ ...f, hostel_type: e.target.value }))}>
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
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
            <div className="text-center py-12 text-gray-400">No dormitories registered</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(occupancy.length > 0 ? occupancy : hostels).map((h: any) => {
                const capacity = h.room_capacity ?? h.total_room_capacity ?? h.capacity ?? 0;
                const occupied = h.current_occupancy ?? 0;
                const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
                const available = h.available_beds ?? Math.max(capacity - occupied, 0);
                const gender = h.gender || h.hostel_type;
                return (
                  <Card key={h.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => { setTab('rooms'); loadRooms(h); }}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-lg">{h.name}</div>
                          <Badge className={GENDER_COLORS[gender] || ''}>{gender}</Badge>
                        </div>
                        <Home className="h-8 w-8 text-blue-400" />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Room Capacity</span>
                          <span className="font-medium">{capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Occupied</span>
                          <span className="font-medium text-blue-600">{occupied}</span>
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
              <h2 className="text-lg font-semibold mb-4">Select a Dormitory</h2>
              {hostels.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No dormitories available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hostels.map(h => (
                    <button key={h.id} className="text-left border rounded-lg p-4 hover:bg-gray-50 transition"
                      onClick={() => loadRooms(h)}>
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{h.hostel_type} · {h.capacity} beds</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { setSelectedHostel(null); setRooms([]); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> All Dormitories
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
                        <option value="semi-private">Semi-Private</option>
                        <option value="private">Private</option>
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
                            (r.current_occupancy || 0) >= r.capacity
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }>
                            {r.current_occupancy || 0}/{r.capacity}
                          </Badge>
                        </div>
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
                    {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Dormitory</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={allocForm.hostel_id}
                    onChange={e => onAllocHostelChange(e.target.value)}>
                    <option value="">Select dormitory</option>
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
                        Room {r.room_number} ({r.current_occupancy || 0}/{r.capacity} beds)
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
                    <th className="text-left py-3 pr-4">Dormitory</th>
                    <th className="text-left py-3 pr-4">Room</th>
                    <th className="text-left py-3 pr-4">Bed</th>
                    <th className="text-left py-3 pr-4">Since</th>
                    <th className="text-left py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 align-top">
                      <td className="py-3 pr-4 font-medium">{a.student_name}</td>
                      <td className="py-3 pr-4">{a.hostel_name}</td>
                      <td className="py-3 pr-4">Room {a.room_number}</td>
                      <td className="py-3 pr-4">{a.bed_number || '—'}</td>
                      <td className="py-3 pr-4 text-gray-500">{a.check_in?.slice(0, 10) || '—'}</td>
                      <td className="py-3">
                        {transferringId === a.id ? (
                          <div className="flex items-center gap-2">
                            <select className="border rounded px-2 py-1 text-xs"
                              value={transferRoomId} onChange={e => setTransferRoomId(e.target.value)}>
                              <option value="">Select room...</option>
                              {transferOptions.filter((r: any) => r.room_id !== a.room_id).map((r: any) => (
                                <option key={r.room_id} value={r.room_id}>{r.hostel_name} · Room {r.room_number} ({r.vacant} vacant)</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => submitTransfer(a.id)} disabled={!transferRoomId}>Go</Button>
                            <Button size="sm" variant="outline" onClick={() => setTransferringId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startTransfer(a)}>
                              <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600"
                              onClick={() => checkoutStudent(a.id)}>
                              <LogOut className="h-3 w-3 mr-1" /> Checkout
                            </Button>
                          </div>
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

      {/* WAITING LIST */}
      {!loading && tab === 'waiting-list' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Boarding Waiting List</h2>
            <Button onClick={() => setShowWaitForm(!showWaitForm)}>
              <Plus className="h-4 w-4 mr-2" /> Add to Waiting List
            </Button>
          </div>

          {showWaitForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Student</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={waitForm.student_id}
                    onChange={e => setWaitForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Preferred Dormitory</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={waitForm.hostel_id}
                    onChange={e => setWaitForm(f => ({ ...f, hostel_id: e.target.value }))}>
                    <option value="">Any</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input type="number" className="mt-1" value={waitForm.priority}
                    onChange={e => setWaitForm(f => ({ ...f, priority: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={addToWaitingList}>Add</Button>
                <Button variant="outline" onClick={() => setShowWaitForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {waitingList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Waiting list is empty</div>
          ) : (
            <div className="space-y-2">
              {waitingList.map(w => (
                <Card key={w.id}><CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.student_name} <span className="text-gray-400 font-normal">({w.admission_number})</span></div>
                    <div className="text-sm text-gray-500">{w.hostel_name || 'Any dormitory'} · Priority {w.priority} · Requested {w.requested_at?.slice(0, 10)}</div>
                  </div>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => cancelWaiting(w.id)}>Remove</Button>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VACANT BEDS */}
      {!loading && tab === 'vacant-beds' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vacant Beds</h2>
          {vacantBeds.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No vacant beds — every room is full</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Dormitory</th>
                    <th className="text-left py-3 pr-4">Room</th>
                    <th className="text-left py-3 pr-4">Capacity</th>
                    <th className="text-left py-3 pr-4">Occupied</th>
                    <th className="text-left py-3">Vacant</th>
                  </tr>
                </thead>
                <tbody>
                  {vacantBeds.map((r: any) => (
                    <tr key={r.room_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4">{r.hostel_name}</td>
                      <td className="py-3 pr-4">Room {r.room_number}</td>
                      <td className="py-3 pr-4">{r.capacity}</td>
                      <td className="py-3 pr-4">{r.occupied}</td>
                      <td className="py-3"><Badge className="bg-green-100 text-green-800">{r.vacant}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MOVEMENTS (Leave/Outpass) */}
      {!loading && tab === 'movements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Leave / Outpass Requests</h2>
            <Button onClick={() => setShowMovForm(!showMovForm)}>
              <Plus className="h-4 w-4 mr-2" /> Log Request
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
                    {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Movement Type</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={movForm.movement_type}
                    onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))}>
                    {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Departure Date/Time</Label>
                  <Input type="datetime-local" className="mt-1" value={movForm.departure_at}
                    onChange={e => setMovForm(f => ({ ...f, departure_at: e.target.value }))} />
                </div>
                <div>
                  <Label>Expected Return</Label>
                  <Input type="datetime-local" className="mt-1" value={movForm.expected_return_at}
                    onChange={e => setMovForm(f => ({ ...f, expected_return_at: e.target.value }))} />
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
                <div className="sm:col-span-2">
                  <Label>Reason</Label>
                  <Input className="mt-1" placeholder="Reason for leave" value={movForm.reason}
                    onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={logMovement}>Log Request</Button>
                <Button variant="outline" onClick={() => setShowMovForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No leave/outpass requests recorded</div>
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
                          <div className="text-sm text-gray-500 mt-1 capitalize">{m.movement_type}</div>
                          <div className="text-sm text-gray-500">
                            Departed: {m.departure_at ? new Date(m.departure_at).toLocaleString() : '—'}
                            {m.expected_return_at && <> · Expected back: {new Date(m.expected_return_at).toLocaleString()}</>}
                          </div>
                          {m.guardian_name && (
                            <div className="text-sm text-gray-500">
                              Guardian: {m.guardian_name} {m.guardian_phone && `· ${m.guardian_phone}`}
                            </div>
                          )}
                          {m.reason && <div className="text-sm text-gray-600 mt-1 italic">"{m.reason}"</div>}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge className={m.parent_approved_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                              {m.parent_approved_at ? `Parent ✓ ${m.parent_approved_by || ''}` : 'Parent pending'}
                            </Badge>
                            <Badge className={m.approved_by ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                              {m.approved_by ? 'Boarding Master ✓' : 'Boarding Master pending'}
                            </Badge>
                            {m.status === 'approved' && (
                              <Badge className={m.gate_verified_out_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                {m.gate_verified_out_at ? 'Gate out ✓' : 'Gate out pending'}
                              </Badge>
                            )}
                            {m.gate_verified_out_at && (
                              <Badge className={m.gate_verified_in_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                {m.gate_verified_in_at ? 'Gate in ✓' : 'Gate in pending'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={MOV_STATUS_COLORS[overdue ? 'overdue' : m.status] || ''}>
                          {overdue ? 'overdue' : m.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {!m.parent_approved_at && (
                          <Button size="sm" variant="outline" onClick={() => parentApprove(m.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Parent Approve
                          </Button>
                        )}
                        {!m.approved_by && (
                          <Button size="sm" variant="outline" onClick={() => approveMovement(m.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Boarding Master Approve
                          </Button>
                        )}
                        {m.status === 'approved' && !m.gate_verified_out_at && (
                          <Button size="sm" variant="outline" onClick={() => gateVerifyOut(m.id)}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify Gate Exit
                          </Button>
                        )}
                        {m.gate_verified_out_at && !m.gate_verified_in_at && !m.return_at && (
                          <Button size="sm" variant="outline" onClick={() => gateVerifyIn(m.id)}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify Gate Return
                          </Button>
                        )}
                        {['approved', 'pending'].includes(m.status) && !m.return_at && (
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
