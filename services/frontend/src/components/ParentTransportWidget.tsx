import { useEffect, useState } from 'react';
import { Bus, CheckCircle2, XCircle, AlertTriangle, Clock, Navigation, Phone, RefreshCw } from 'lucide-react';
import api from '@/services/api';

export function ParentTransportWidget() {
  const [data, setData]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getChildTransportStatus();
      setData(res?.data || []);
    } catch { /* silent — parent may not have transport */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!data.length) return null;

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden shadow-sm">
      <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Bus className="h-4 w-4" />
          <span className="font-semibold text-sm">School Transport — Today</span>
        </div>
        <button onClick={load} className="text-white/70 hover:text-white">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {data.map((child: any) => (
          <div key={child.student_id} className="bg-white rounded-xl p-3 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">
                  {child.first_name} {child.last_name}
                </p>
                <p className="text-xs text-gray-400">{child.route_name} · {child.vehicle_registration}</p>
              </div>
              {child.driver_phone && (
                <a href={`tel:${child.driver_phone}`} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1">
                  <Phone className="h-3 w-3" /> Driver
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Morning */}
              <div className={`rounded-lg p-2.5 border ${
                child.morning_status === 'picked'  ? 'bg-green-50 border-green-200' :
                child.morning_status === 'missed'  ? 'bg-red-50   border-red-200'   :
                child.morning_status === 'absent'  ? 'bg-amber-50 border-amber-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs text-gray-500 mb-1">🌅 Morning</p>
                <div className="flex items-center gap-1.5">
                  {child.morning_status === 'picked'  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> :
                   child.morning_status === 'missed'  ? <XCircle      className="h-4 w-4 text-red-600   shrink-0" /> :
                   child.morning_status === 'absent'  ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /> :
                   <Clock className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className={`text-xs font-semibold capitalize ${
                    child.morning_status === 'picked'  ? 'text-green-700' :
                    child.morning_status === 'missed'  ? 'text-red-700'   :
                    child.morning_status === 'absent'  ? 'text-amber-700' :
                    'text-gray-500'
                  }`}>
                    {child.morning_status === 'picked' && child.morning_pickup_time
                      ? new Date(child.morning_pickup_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})
                      : child.morning_status}
                  </span>
                </div>
                {child.morning_lat && child.morning_status === 'picked' && (
                  <a
                    href={`https://www.google.com/maps?q=${child.morning_lat},${child.morning_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-500 mt-1 hover:underline"
                  >
                    <Navigation className="h-2.5 w-2.5" /> Pickup location
                  </a>
                )}
              </div>

              {/* Afternoon */}
              <div className={`rounded-lg p-2.5 border ${
                child.afternoon_status === 'dropped' ? 'bg-green-50 border-green-200' :
                child.afternoon_status === 'missed'  ? 'bg-red-50   border-red-200'   :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs text-gray-500 mb-1">🌆 Afternoon</p>
                <div className="flex items-center gap-1.5">
                  {child.afternoon_status === 'picked' || child.afternoon_status === 'dropped'
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : child.afternoon_status === 'missed'
                    ? <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    : <Clock className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className={`text-xs font-semibold capitalize ${
                    child.afternoon_status === 'picked' || child.afternoon_status === 'dropped'
                      ? 'text-green-700' :
                    child.afternoon_status === 'missed' ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {child.afternoon_status === 'picked' && child.afternoon_time
                      ? new Date(child.afternoon_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})
                      : child.afternoon_status}
                  </span>
                </div>
              </div>
            </div>

            {child.pickup_stop && (
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <Navigation className="h-2.5 w-2.5" />
                Pickup stop: {child.pickup_stop}
              </p>
            )}

            {(child.morning_status === 'missed' || child.afternoon_status === 'missed') && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  Your child was not picked up. Contact the driver or school immediately.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
