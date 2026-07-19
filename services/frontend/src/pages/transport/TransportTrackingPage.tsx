import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import {
  Bus, CheckCircle2, XCircle, Clock, RefreshCw,
  MapPin, Navigation, User, Phone, Users
} from 'lucide-react';

type TripType = 'morning' | 'afternoon';

export function TransportTrackingPage() {
  const [overview, setOverview]     = useState<any[]>([]);
  const [tripType, setTripType]     = useState<TripType>('morning');
  const [loading, setLoading]       = useState(true);
  const [selectedRoute, setRoute]   = useState<string | null>(null);
  const [session, setSession]       = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getTransportTrackingOverview({ trip_type: tripType });
      setOverview(res?.data || []);
    } finally { setLoading(false); }
  };

  const loadSession = async (routeId: string) => {
    setRoute(routeId);
    setSessionLoading(true);
    try {
      const res: any = await (api as any).getDriverSession({ route_id: routeId, trip_type: tripType });
      setSession(res?.data);
    } finally { setSessionLoading(false); }
  };

  useEffect(() => { loadOverview(); }, [tripType]);

  const total      = overview.reduce((a, r) => a + Number(r.total_students || 0), 0);
  const picked     = overview.reduce((a, r) => a + Number(r.picked   || 0), 0);
  const dropped    = overview.reduce((a, r) => a + Number(r.dropped  || 0), 0);
  const successful = picked + dropped;
  const missed     = overview.reduce((a, r) => a + Number(r.missed   || 0), 0);
  const onboard    = total - successful - missed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transport Tracking</h2>
          <p className="text-gray-500">Live student pickup status across all routes</p>
        </div>
        <div className="flex gap-2">
          {(['morning','afternoon'] as TripType[]).map(t => (
            <Button key={t} variant={tripType===t?'default':'outline'} size="sm" onClick={() => setTripType(t)} className="capitalize">
              {t === 'morning' ? '🌅' : '🌆'} {t}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={loadOverview}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', val: total,      icon: Users,       color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Picked/Dropped', val: successful, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Not Yet',        val: onboard,    icon: Clock,        color: 'text-gray-500',  bg: 'bg-gray-50'  },
          { label: 'Not Found',      val: missed,     icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50'   },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Route cards */}
      {loading ? (
        <div className="text-center py-10"><RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview.map(route => {
            const routeSuccessful = Number(route.picked || 0) + Number(route.dropped || 0);
            const pct = route.total_students > 0
              ? Math.round((routeSuccessful / Number(route.total_students)) * 100)
              : 0;
            return (
              <Card key={route.route_id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => loadSession(route.route_id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bus className="h-4 w-4 text-blue-500" />
                    <span className="flex-1 truncate">{route.route_name}</span>
                  </CardTitle>
                  <p className="text-xs text-gray-400">{route.vehicle_registration}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-600">{route.driver_name || 'No driver'}</span>
                    {route.driver_phone && (
                      <a href={`tel:${route.driver_phone}`} className="ml-auto text-blue-500" onClick={e => e.stopPropagation()}>
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{routeSuccessful}/{route.total_students} {tripType === 'afternoon' ? 'picked/dropped' : 'picked'}</span>
                      <span className={pct === 100 ? 'text-green-600 font-semibold' : 'text-blue-600'}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs flex-wrap">
                    {Number(route.picked) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> {route.picked} picked
                      </span>
                    )}
                    {Number(route.dropped) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> {route.dropped} dropped
                      </span>
                    )}
                    {Number(route.missed) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full">
                        <XCircle className="h-3 w-3" /> {route.missed} not found
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs">View Students</Button>
                </CardContent>
              </Card>
            );
          })}
          {overview.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Bus className="h-16 w-16 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No active routes found</p>
            </div>
          )}
        </div>
      )}

      {/* Session detail panel */}
      {selectedRoute && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              {overview.find(r => r.route_id === selectedRoute)?.route_name} — Student Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionLoading ? (
              <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Class</th>
                      <th className="py-2 pr-3">Stop</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(session?.students || []).map((s: any) => (
                      <tr key={s.student_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium">
                          {s.first_name} {s.last_name}
                          <span className="text-xs text-gray-400 block">{s.admission_number}</span>
                        </td>
                        <td className="py-2 pr-3 text-gray-500">{s.class_name}</td>
                        <td className="py-2 pr-3 text-gray-500">{s.pickup_stop || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            s.pickup_status === 'picked'  ? 'bg-green-100 text-green-700' :
                            s.pickup_status === 'dropped' ? 'bg-green-100 text-green-700' :
                            s.pickup_status === 'missed'  ? 'bg-red-100   text-red-700'   :
                            s.pickup_status === 'absent'  ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {(s.pickup_status === 'picked' || s.pickup_status === 'dropped') && s.pickup_time
                              ? new Date(s.pickup_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})
                              : s.pickup_status === 'missed' ? 'Not Found'
                              : s.pickup_status === 'dropped' ? 'Dropped Off'
                              : s.pickup_status}
                          </span>
                        </td>
                        <td className="py-2">
                          {s.latitude ? (
                            <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-blue-500 flex items-center gap-1 text-xs hover:underline">
                              <Navigation className="h-3 w-3" /> Map
                            </a>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
