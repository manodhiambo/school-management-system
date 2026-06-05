import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bus, CheckCircle2, XCircle, AlertTriangle, Clock,
  Navigation, Phone, RefreshCw, MapPin, User,
} from 'lucide-react';
import api from '@/services/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  picked:  { label: 'Picked Up',  color: 'bg-green-50 border-green-200 text-green-700',  icon: CheckCircle2  },
  missed:  { label: 'Missed',     color: 'bg-red-50 border-red-200 text-red-700',        icon: XCircle       },
  absent:  { label: 'Absent',     color: 'bg-amber-50 border-amber-200 text-amber-700',  icon: AlertTriangle },
  pending: { label: 'Awaited',    color: 'bg-gray-50 border-gray-200 text-gray-500',     icon: Clock         },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

export function MyTransportPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await (api as any).getChildTransportStatus();
      setChildren(res?.data || []);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || 'Could not load transport status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Transport</h2>
          <p className="text-sm text-gray-500">Real-time school transport status for your children</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && children.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && children.length === 0 && (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Bus className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No transport assigned</p>
            <p className="text-sm text-gray-400 mt-1">
              Your children are not currently enrolled in school transport.
              Contact the school office to enroll them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {children.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.color}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Children cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {children.map((child: any) => (
          <Card key={child.student_id} className="overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {child.first_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-blue-100 text-xs">{child.class_name || 'Class not set'}</p>
                  </div>
                </div>
                {child.driver_phone && (
                  <a
                    href={`tel:${child.driver_phone}`}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    Call Driver
                  </a>
                )}
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Route info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Navigation className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium">{child.route_name || 'Route not assigned'}</span>
                {child.vehicle_registration && (
                  <span className="ml-auto text-gray-400 text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {child.vehicle_registration}
                  </span>
                )}
              </div>

              {child.driver_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Driver: <span className="font-medium">{child.driver_name}</span></span>
                </div>
              )}

              {child.pickup_stop && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Stop: <span className="font-medium">{child.pickup_stop}</span></span>
                </div>
              )}

              {/* Morning / Afternoon status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">🌅 Morning Pickup</p>
                  <StatusBadge status={child.morning_status || 'pending'} />
                  {child.morning_pickup_time && (
                    <p className="text-xs text-gray-400">
                      {new Date(child.morning_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">🌇 Afternoon Drop-off</p>
                  <StatusBadge status={child.afternoon_status || 'pending'} />
                  {child.afternoon_dropoff_time && (
                    <p className="text-xs text-gray-400">
                      {new Date(child.afternoon_dropoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes (if any) */}
              {child.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                  <span className="font-medium">Note: </span>{child.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Status refreshes automatically every minute. Contact the school if you have concerns.
      </p>
    </div>
  );
}
