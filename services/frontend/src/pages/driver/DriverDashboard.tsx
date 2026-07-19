import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { UserManualCard } from '@/components/UserManualCard';
import { playNotificationSound } from '@/utils/notificationSound';
import {
  Bus, MapPin, CheckCircle2, XCircle, AlertTriangle,
  User, Phone, Navigation, RefreshCw, Clock, Users, Home
} from 'lucide-react';

type TripType = 'morning' | 'afternoon';
type PickupStatus = 'pending' | 'picked' | 'dropped' | 'missed' | 'absent';

const STATUS_META: Record<PickupStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'Pending',    color: 'text-gray-500',  bg: 'bg-gray-100',   icon: Clock         },
  picked:   { label: 'Picked',     color: 'text-green-700', bg: 'bg-green-100',  icon: CheckCircle2  },
  dropped:  { label: 'Dropped Off',color: 'text-green-700', bg: 'bg-green-100',  icon: CheckCircle2  },
  missed:   { label: 'Not Found',  color: 'text-red-700',   bg: 'bg-red-100',    icon: XCircle       },
  absent:   { label: 'Absent',     color: 'text-amber-700', bg: 'bg-amber-100',  icon: AlertTriangle },
};

export function DriverDashboard() {
  const { user } = useAuthStore();
  const [routeData, setRouteData]     = useState<any>(null);
  const [session, setSession]         = useState<any>(null);
  const [tripType, setTripType]       = useState<TripType>(() => (new Date().getHours() < 12 ? 'morning' : 'afternoon'));
  const [loading, setLoading]         = useState(true);
  const [marking, setMarking]         = useState<string | null>(null);
  const [gpsError, setGpsError]       = useState('');
  const [filter, setFilter]           = useState<'all' | PickupStatus>('all');
  const prevStatusRef = useRef<Record<string, string>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    // Load route and session independently — a session failure must not hide the route
    try {
      const routeRes: any = await (api as any).getDriverRoute();
      setRouteData(routeRes?.data);
    } catch { /* no route assigned or server error */ }
    try {
      const sessionRes: any = await (api as any).getDriverSession({ trip_type: tripType });
      const students: any[] = sessionRes?.data?.students || [];

      // Play sound if a parent confirmed "left home" since last poll
      students.forEach((s: any) => {
        const prevLeftHome = prevStatusRef.current[s.student_id + '_lh'];
        const hasLeftHome  = s.parent_left_home_at;
        if (!prevLeftHome && hasLeftHome) {
          // New "left home" notification from parent
          playNotificationSound('warning');
        }
        prevStatusRef.current[s.student_id + '_lh'] = hasLeftHome || '';
      });

      setSession(sessionRes?.data);
    } catch { /* session not available yet */ }
    if (!silent) setLoading(false);
  }, [tripType]);

  useEffect(() => {
    load();
    // Poll every 30 seconds so driver sees parent "left home" confirmations in real-time
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { setGpsError('GPS not supported'); resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        pos => { setGpsError(''); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        err => {
          if (err.code === 1) setGpsError('Location blocked — allow location in browser settings');
          else if (err.code === 3) setGpsError('GPS timed out — marking without coordinates');
          else setGpsError('GPS unavailable — marking without coordinates');
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    });

  const markPickup = async (studentId: string, status: PickupStatus) => {
    if (!routeData?.route?.id) return;
    setMarking(studentId);
    try {
      const coords = await getCoords();
      await (api as any).recordDriverPickup({
        student_id: studentId,
        route_id:   routeData.route.id,
        trip_type:  tripType,
        status,
        latitude:   coords?.lat,
        longitude:  coords?.lng,
      });
      setGpsError('');
      // Play confirmation sound
      if (status === 'picked' || status === 'dropped') playNotificationSound('success');
      else if (status === 'missed') playNotificationSound('urgent');
      else if (status === 'absent') playNotificationSound('warning');
      await load(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record pickup');
    } finally {
      setMarking(null);
    }
  };

  const students: any[] = session?.students || [];
  const summary         = session?.session   || {};

  const displayed = filter === 'all' ? students : students.filter(s => s.pickup_status === filter);

  // Group by pickup stop
  const stops = Array.from(new Set(students.map((s: any) => s.pickup_stop || 'Unassigned')));

  const hour = new Date().getHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Bus className="h-12 w-12 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading route…</p>
        </div>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Bus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700">No Route Assigned</h2>
            <p className="text-gray-500 mt-2 text-sm">Ask the school admin to assign you to a transport route.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const route = routeData.route;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 pt-10 pb-6 text-white">
        <div className="flex items-start justify-between max-w-2xl mx-auto">
          <div>
            <p className="text-blue-200 text-sm">Good {hour < 12 ? 'morning' : 'afternoon'},</p>
            <h1 className="text-2xl font-bold">{(user as any)?.first_name} {(user as any)?.last_name}</h1>
            <div className="flex items-center gap-2 mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-flex">
              <Bus className="h-4 w-4" />
              <span className="text-sm font-semibold">{route.route_name}</span>
              {route.vehicle_registration && (
                <span className="text-xs text-blue-200">· {route.vehicle_registration}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => load()} className="text-white hover:bg-white/20">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-10">
        {/* Trip type selector */}
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-2">
              {(['morning', 'afternoon'] as TripType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTripType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                    tripType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t === 'morning' ? '🌅' : '🌆'} {t} Trip
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary bar */}
        <div className={`grid gap-2 ${tripType === 'afternoon' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {[
            { label: 'Total',   val: summary.total   || students.length, color: 'bg-blue-50   text-blue-700',   filter: 'all'     },
            { label: tripType === 'afternoon' ? 'Picked' : 'Picked',
              val: summary.picked  || 0,               color: 'bg-green-50  text-green-700',  filter: 'picked'  },
            ...(tripType === 'afternoon' ? [{ label: 'Dropped', val: students.filter((s:any) => s.pickup_status === 'dropped').length, color: 'bg-green-50 text-green-700', filter: 'dropped' }] : []),
            { label: 'Pending', val: summary.pending || 0,               color: 'bg-gray-50   text-gray-600',   filter: 'pending' },
            { label: 'Not Found',  val: summary.missed  || 0,               color: 'bg-red-50    text-red-700',    filter: 'missed'  },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilter(s.filter as any)}
              className={`rounded-xl p-2 text-center transition-all border-2 ${s.color} ${
                filter === s.filter ? 'border-current shadow-md' : 'border-transparent'
              }`}
            >
              <p className="text-xl font-bold">{s.val}</p>
              <p className="text-xs">{s.label}</p>
            </button>
          ))}
        </div>

        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {gpsError}
          </div>
        )}

        {/* Student list grouped by stop */}
        {stops.map(stop => {
          const stopStudents = displayed.filter((s: any) => (s.pickup_stop || 'Unassigned') === stop);
          if (!stopStudents.length) return null;
          return (
            <div key={stop}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-700">{stop}</span>
                <span className="text-xs text-gray-400">({stopStudents.length} students)</span>
              </div>
              <div className="space-y-2">
                {stopStudents.map((student: any) => {
                  const meta = STATUS_META[student.pickup_status as PickupStatus] || STATUS_META.pending;
                  const Icon = meta.icon;
                  const isBusy = marking === student.student_id;
                  return (
                    <Card key={student.student_id} className={`border-l-4 ${
                      student.pickup_status === 'picked'  ? 'border-green-500' :
                      student.pickup_status === 'dropped' ? 'border-green-500' :
                      student.pickup_status === 'missed'  ? 'border-red-500'   :
                      student.pickup_status === 'absent'  ? 'border-amber-500' :
                      student.parent_left_home_at         ? 'border-blue-400'  :
                      'border-gray-200'
                    }`}>
                      <CardContent className="p-3">
                        {/* Parent "left home" alert banner */}
                        {student.parent_left_home_at && (
                          <div className={`flex items-start gap-1.5 rounded-md px-2.5 py-2 mb-2 text-xs ${
                            student.pickup_status === 'missed'
                              ? 'bg-red-100 border border-red-300 text-red-800'
                              : 'bg-blue-50 border border-blue-200 text-blue-800'
                          }`}>
                            <Home className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">
                                {student.pickup_status === 'missed'
                                  ? '🚨 URGENT — Parent confirmed child left home!'
                                  : '🏠 Parent confirmed child left home'}
                              </span>
                              <span className="ml-1">
                                at {new Date(student.parent_left_home_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                {student.parent_left_home_note ? ` — "${student.parent_left_home_note}"` : ''}
                              </span>
                              {student.pickup_status === 'missed' && (
                                <p className="font-semibold mt-0.5">Child left home but not at pickup stop. Take action immediately.</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-10 w-10 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                              {student.profile_photo_url ? (
                                <img src={student.profile_photo_url} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <User className={`h-5 w-5 ${meta.color}`} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{student.class_name} · {student.admission_number}</p>
                              {student.parent_phone && (
                                <a href={`tel:${student.parent_phone}`} className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                  <Phone className="h-3 w-3" /> {student.parent_name}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.color} flex items-center gap-1`}>
                              <Icon className="h-3 w-3" />
                              {(student.pickup_status === 'picked' || student.pickup_status === 'dropped') && student.pickup_time
                                ? new Date(student.pickup_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                                : meta.label}
                            </span>

                            {student.pickup_status !== 'picked' && student.pickup_status !== 'dropped' && (
                              <div className="flex gap-1">
                                {tripType === 'morning' ? (
                                  <>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'picked')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {isBusy ? '…' : <><CheckCircle2 className="h-3 w-3" /> Picked Up</>}
                                    </button>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'missed')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {isBusy ? '…' : <><XCircle className="h-3 w-3" /> Not Found</>}
                                    </button>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'absent')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg font-semibold disabled:opacity-50"
                                    >
                                      Absent
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'dropped')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {isBusy ? '…' : <><CheckCircle2 className="h-3 w-3" /> Dropped Off</>}
                                    </button>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'missed')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {isBusy ? '…' : <><XCircle className="h-3 w-3" /> Not Found</>}
                                    </button>
                                    <button
                                      onClick={() => markPickup(student.student_id, 'absent')}
                                      disabled={!!isBusy}
                                      className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg font-semibold disabled:opacity-50"
                                    >
                                      Absent
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            {(student.pickup_status === 'picked' || student.pickup_status === 'dropped') && student.latitude && (
                              <a
                                href={`https://www.google.com/maps?q=${student.latitude},${student.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 flex items-center gap-1"
                              >
                                <Navigation className="h-3 w-3" /> View location
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {displayed.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No students to show for this filter</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <UserManualCard />
      </div>
    </div>
  );
}
