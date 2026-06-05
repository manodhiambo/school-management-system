import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import {
  Calendar, Clock, Users, User, Plus, CheckCircle, XCircle,
  AlertCircle, BookOpen, RefreshCw, ChevronRight
} from 'lucide-react';

type Tab = 'admin' | 'teacher' | 'parent';

const STATUS_COLORS: Record<string, string> = {
  available:  'bg-green-100 text-green-800',
  booked:     'bg-blue-100 text-blue-800',
  confirmed:  'bg-indigo-100 text-indigo-800',
  completed:  'bg-gray-100 text-gray-700',
  cancelled:  'bg-red-100 text-red-800',
  pending:    'bg-yellow-100 text-yellow-800',
};

const EMPTY_SLOT = { teacher_id: '', date: '', start_time: '', end_time: '' };
const EMPTY_BOOK = { student_id: '', agenda: '' };

export function MeetingsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const role = user?.role || '';

  const defaultTab: Tab = role === 'parent' ? 'parent' : role === 'teacher' ? 'teacher' : 'admin';
  const [tab, setTab] = useState<Tab>(defaultTab);

  const [slots, setSlots]         = useState<any[]>([]);
  const [bookings, setBookings]   = useState<any[]>([]);
  const [teachers, setTeachers]   = useState<any[]>([]);
  const [students, setStudents]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState<string | null>(null); // slotId
  const [slotForm, setSlotForm]   = useState({ ...EMPTY_SLOT });
  const [bookForm, setBookForm]   = useState({ ...EMPTY_BOOK });
  const [noteId, setNoteId]       = useState<string | null>(null);
  const [noteText, setNoteText]   = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  useEffect(() => { loadAll(); }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, bRes]: any[] = await Promise.all([
        (api as any).getPTMSlots(),
        (api as any).getPTMBookings(),
      ]);
      setSlots(sRes?.data || []);
      setBookings(bRes?.data || []);

      if (tab === 'admin' || tab === 'teacher' || tab === 'parent') {
        const tRes: any = await api.getTeachers();
        setTeachers(tRes?.data || []);
      }
      if (tab === 'parent') {
        const sRes2: any = await (api as any).getMyChildren?.() || { data: [] };
        setStudents(sRes2?.data || []);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load data', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createSlot = async () => {
    try {
      await (api as any).createPTMSlot({
        teacher_id: slotForm.teacher_id || undefined,
        slot_date: slotForm.date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
      });
      toast({ title: 'Slot created' });
      setShowSlotForm(false);
      setSlotForm({ ...EMPTY_SLOT });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const bookSlot = async (slotId: string) => {
    try {
      await (api as any).bookPTMSlot(slotId, bookForm);
      toast({ title: 'Slot booked successfully' });
      setShowBookForm(null);
      setBookForm({ ...EMPTY_BOOK });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const updateBooking = async (id: string, status: string, extra?: any) => {
    try {
      await (api as any).updatePTMBooking(id, { status, ...extra });
      toast({ title: `Booking ${status}` });
      if (noteId) setNoteId(null);
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const adminSlots  = slots;
  const myBookings  = bookings;
  const availSlots  = slots.filter(s =>
    s.status === 'available' &&
    (!filterTeacher || s.teacher_id === filterTeacher)
  );

  const totalSlots   = adminSlots.length;
  const bookedSlots  = adminSlots.filter(s => ['booked','confirmed'].includes(s.status)).length;
  const pendingConf  = bookings.filter(b => b.status === 'pending').length;

  const tabs: { key: Tab; label: string }[] = [
    ...(role !== 'parent' && role !== 'teacher' ? [{ key: 'admin' as Tab, label: 'Admin' }] : []),
    ...(role !== 'parent' ? [{ key: 'teacher' as Tab, label: 'Teacher' }] : []),
    { key: 'parent' as Tab, label: 'Parent' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent-Teacher Meetings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage meeting slots and bookings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* ADMIN TAB */}
      {!loading && tab === 'admin' && (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-500" />
                <div><div className="text-2xl font-bold">{totalSlots}</div><div className="text-sm text-gray-500">Total Slots</div></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div><div className="text-2xl font-bold">{bookedSlots}</div><div className="text-sm text-gray-500">Booked</div></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-yellow-500" />
                <div><div className="text-2xl font-bold">{pendingConf}</div><div className="text-sm text-gray-500">Pending Confirmation</div></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Create slot */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Slots</h2>
            <Button onClick={() => setShowSlotForm(!showSlotForm)}>
              <Plus className="h-4 w-4 mr-2" /> Create Slot
            </Button>
          </div>

          {showSlotForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Teacher</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={slotForm.teacher_id} onChange={e => setSlotForm(f => ({ ...f, teacher_id: e.target.value }))}>
                    <option value="">Select teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.user_id || t.id}>
                        {`${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="mt-1" value={slotForm.date}
                    onChange={e => setSlotForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" className="mt-1" value={slotForm.start_time}
                    onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" className="mt-1" value={slotForm.end_time}
                    onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createSlot}>Create</Button>
                <Button variant="outline" onClick={() => setShowSlotForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {/* Bookings management */}
          <Card>
            <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No bookings yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="text-left py-2 pr-4">Teacher</th>
                        <th className="text-left py-2 pr-4">Parent</th>
                        <th className="text-left py-2 pr-4">Student</th>
                        <th className="text-left py-2 pr-4">Date & Time</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 pr-4">{b.teacher_name || '—'}</td>
                          <td className="py-2 pr-4">{b.parent_name || '—'}</td>
                          <td className="py-2 pr-4">{b.student_name || '—'}</td>
                          <td className="py-2 pr-4">{b.date} {b.start_time}–{b.end_time}</td>
                          <td className="py-2 pr-4">
                            <Badge className={STATUS_COLORS[b.status] || ''}>{b.status}</Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              {b.status === 'pending' && (
                                <Button size="sm" variant="outline" onClick={() => updateBooking(b.id, 'confirmed')}>
                                  Confirm
                                </Button>
                              )}
                              {['confirmed','booked'].includes(b.status) && (
                                <Button size="sm" variant="outline" onClick={() => updateBooking(b.id, 'completed')}>
                                  Complete
                                </Button>
                              )}
                              {!['completed','cancelled'].includes(b.status) && (
                                <Button size="sm" variant="outline" className="text-red-600"
                                  onClick={() => updateBooking(b.id, 'cancelled')}>
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TEACHER TAB */}
      {!loading && tab === 'teacher' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Meeting Slots</h2>
            <Button onClick={() => setShowSlotForm(!showSlotForm)}>
              <Plus className="h-4 w-4 mr-2" /> Add Slot
            </Button>
          </div>

          {showSlotForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="mt-1" value={slotForm.date}
                    onChange={e => setSlotForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" className="mt-1" value={slotForm.start_time}
                    onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" className="mt-1" value={slotForm.end_time}
                    onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => createSlot()}>Create</Button>
                <Button variant="outline" onClick={() => setShowSlotForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          <Card>
            <CardHeader><CardTitle>My Bookings</CardTitle></CardHeader>
            <CardContent>
              {myBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No bookings for your slots</div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map(b => (
                    <div key={b.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{b.parent_name || 'Parent'}</div>
                          <div className="text-sm text-gray-500">Student: {b.student_name || '—'}</div>
                          <div className="text-sm text-gray-500">{b.date} · {b.start_time}–{b.end_time}</div>
                          {b.agenda && <div className="text-sm mt-1 italic text-gray-600">"{b.agenda}"</div>}
                        </div>
                        <Badge className={STATUS_COLORS[b.status] || ''}>{b.status}</Badge>
                      </div>

                      {noteId === b.id ? (
                        <div className="mt-3">
                          <textarea
                            className="w-full border rounded p-2 text-sm"
                            rows={2}
                            placeholder="Add teacher notes..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => updateBooking(b.id, 'completed', { teacher_notes: noteText })}>
                              Save & Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setNoteId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          {b.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => updateBooking(b.id, 'confirmed')}>
                              Confirm
                            </Button>
                          )}
                          {['confirmed','booked'].includes(b.status) && (
                            <Button size="sm" variant="outline"
                              onClick={() => { setNoteId(b.id); setNoteText(''); }}>
                              Complete with Notes
                            </Button>
                          )}
                          {!['completed','cancelled'].includes(b.status) && (
                            <Button size="sm" variant="outline" className="text-red-600"
                              onClick={() => updateBooking(b.id, 'cancelled')}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PARENT TAB */}
      {!loading && tab === 'parent' && (
        <div className="space-y-6">
          {/* My bookings */}
          <Card>
            <CardHeader><CardTitle>My Bookings</CardTitle></CardHeader>
            <CardContent>
              {myBookings.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No bookings yet</div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map(b => (
                    <div key={b.id} className="border rounded-lg p-4 flex items-start justify-between">
                      <div>
                        <div className="font-medium">{b.teacher_name || 'Teacher'}</div>
                        <div className="text-sm text-gray-500">{b.date} · {b.start_time}–{b.end_time}</div>
                        <div className="text-sm text-gray-500">Student: {b.student_name || '—'}</div>
                        {b.agenda && <div className="text-sm italic text-gray-600 mt-1">"{b.agenda}"</div>}
                        {b.teacher_notes && (
                          <div className="text-sm mt-2 text-blue-700 bg-blue-50 rounded px-2 py-1">
                            Note: {b.teacher_notes}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={STATUS_COLORS[b.status] || ''}>{b.status}</Badge>
                        {b.status === 'pending' && (
                          <Button size="sm" variant="outline" className="text-red-600"
                            onClick={() => updateBooking(b.id, 'cancelled')}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available slots */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold">Available Slots</h2>
              <select className="border rounded px-3 py-1.5 text-sm"
                value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
                <option value="">All Teachers</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.user_id || t.id}>
                    {`${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
                  </option>
                ))}
              </select>
            </div>
            {availSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No available slots</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availSlots.map(s => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium">{s.teacher_name || 'Teacher'}</div>
                          <div className="text-sm text-gray-500">{s.date}</div>
                          <div className="text-sm text-gray-500">{s.start_time}–{s.end_time}</div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Available</Badge>
                      </div>
                      {showBookForm === s.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Select Student</Label>
                            <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                              value={bookForm.student_id}
                              onChange={e => setBookForm(f => ({ ...f, student_id: e.target.value }))}>
                              <option value="">Choose student</option>
                              {students.map(s2 => <option key={s2.id} value={s2.id}>{s2.name || s2.full_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>Agenda / Topic</Label>
                            <textarea className="w-full mt-1 border rounded p-2 text-sm" rows={2}
                              placeholder="What would you like to discuss?"
                              value={bookForm.agenda}
                              onChange={e => setBookForm(f => ({ ...f, agenda: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => bookSlot(s.id)}>Book</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowBookForm(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button className="w-full" size="sm"
                          onClick={() => { setShowBookForm(s.id); setBookForm({ ...EMPTY_BOOK }); }}>
                          Book This Slot
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
