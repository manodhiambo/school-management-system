import { useEffect, useState } from 'react';
import {
  Bus, CheckCircle2, XCircle, AlertTriangle, Clock,
  Navigation, Phone, RefreshCw, Home, Loader2
} from 'lucide-react';
import api from '@/services/api';
import { playNotificationSound } from '@/utils/notificationSound';

export function ParentTransportWidget() {
  const [data, setData]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState<string | null>(null); // student_id being processed
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [prevStatuses, setPrevStatuses] = useState<Record<string, string>>({});

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res: any = await (api as any).getChildTransportStatus();
      const rows: any[] = res?.data || [];

      // Detect status changes → play sound
      rows.forEach((child: any) => {
        const prevM = prevStatuses[child.student_id + '_m'];
        const prevA = prevStatuses[child.student_id + '_a'];
        const curM  = child.morning_status;
        const curA  = child.afternoon_status;

        if (prevM && curM !== prevM) {
          if (curM === 'picked')  playNotificationSound('success');
          else if (curM === 'missed') playNotificationSound('urgent');
          else if (curM === 'absent') playNotificationSound('warning');
        }
        if (prevA && curA !== prevA) {
          if (curA === 'dropped') playNotificationSound('success');
          else if (curA === 'missed') playNotificationSound('urgent');
          else if (curA === 'absent') playNotificationSound('warning');
        }
      });

      // Save current statuses for next comparison
      const nextPrev: Record<string, string> = {};
      rows.forEach((c: any) => {
        nextPrev[c.student_id + '_m'] = c.morning_status;
        nextPrev[c.student_id + '_a'] = c.afternoon_status;
      });
      setPrevStatuses(nextPrev);

      setData(rows);
    } catch { /* silent — parent may not have transport */ }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    load();
    // Poll every 45 seconds for real-time updates
    const interval = setInterval(() => load(true), 45000);
    return () => clearInterval(interval);
  }, []);

  const markLeftHome = async (studentId: string, tripType: 'morning' | 'afternoon') => {
    const key = studentId + tripType;
    setMarking(key);
    try {
      const res: any = await (api as any).parentLeftHome({ student_id: studentId, trip_type: tripType });
      setFeedback(prev => ({ ...prev, [key]: res?.message || 'Confirmed — driver & admin notified.' }));
      playNotificationSound('success');
      await load(true);
    } catch (err: any) {
      setFeedback(prev => ({ ...prev, [key]: err?.response?.data?.message || 'Failed to confirm. Try again.' }));
    } finally {
      setMarking(null);
      setTimeout(() => setFeedback(prev => { const n = { ...prev }; delete n[key]; return n; }), 5000);
    }
  };

  if (loading) return null;
  if (!data.length) return null;

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden shadow-sm">
      <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Bus className="h-4 w-4" />
          <span className="font-semibold text-sm">School Transport — Today</span>
        </div>
        <button onClick={() => load()} className="text-white/70 hover:text-white">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {data.map((child: any) => {
          const keyM = child.student_id + 'morning';
          const keyA = child.student_id + 'afternoon';

          return (
            <div key={child.student_id} className="bg-white rounded-xl p-3 border border-blue-100 space-y-3">
              {/* Child header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="text-xs text-gray-400">{child.route_name} · {child.vehicle_registration}</p>
                </div>
                {child.driver_phone && (
                  <a href={`tel:${child.driver_phone}`}
                     className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1">
                    <Phone className="h-3 w-3" /> Driver
                  </a>
                )}
              </div>

              {/* Morning trip */}
              <TripPanel
                label="🌅 Morning Pickup"
                status={child.morning_status}
                time={child.morning_pickup_time}
                lat={child.morning_lat}
                lng={child.morning_lng}
                leftHomeAt={child.morning_left_home_at}
                tripType="morning"
                studentId={child.student_id}
                marking={marking}
                feedback={feedback[keyM]}
                pickupStop={child.pickup_stop}
                onLeftHome={() => markLeftHome(child.student_id, 'morning')}
              />

              {/* Afternoon trip */}
              <TripPanel
                label="🌆 Afternoon Drop-off"
                status={child.afternoon_status}
                time={child.afternoon_time}
                lat={child.afternoon_lat}
                lng={child.afternoon_lng}
                leftHomeAt={child.afternoon_left_home_at}
                tripType="afternoon"
                studentId={child.student_id}
                marking={marking}
                feedback={feedback[keyA]}
                pickupStop={child.dropoff_stop}
                onLeftHome={() => markLeftHome(child.student_id, 'afternoon')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Trip panel sub-component ── */
function TripPanel({
  label, status, time, lat, lng, leftHomeAt,
  tripType, studentId, marking, feedback, pickupStop, onLeftHome,
}: {
  label: string; status: string; time: string | null; lat: number | null;
  lng: number | null; leftHomeAt: string | null; tripType: 'morning' | 'afternoon';
  studentId: string; marking: string | null; feedback?: string;
  pickupStop?: string; onLeftHome: () => void;
}) {
  const key  = studentId + tripType;
  const busy = marking === key;

  const isCompleted = status === 'picked' || status === 'dropped';
  const isMissed    = status === 'missed';
  const isAbsent    = status === 'absent';

  const panelClass =
    isCompleted ? 'bg-green-50 border-green-200' :
    isMissed    ? 'bg-red-50   border-red-300'   :
    isAbsent    ? 'bg-amber-50 border-amber-200'  :
    'bg-gray-50 border-gray-200';

  const StatusIcon = isCompleted ? CheckCircle2 : isMissed ? XCircle : isAbsent ? AlertTriangle : Clock;
  const iconClass  = isCompleted ? 'text-green-600' : isMissed ? 'text-red-600' : isAbsent ? 'text-amber-600' : 'text-gray-400';

  const statusLabel =
    status === 'picked'  ? `Picked up at ${time ? new Date(time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}` :
    status === 'dropped' ? `Dropped off at ${time ? new Date(time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}` :
    status === 'missed'  ? 'NOT FOUND at pickup' :
    status === 'absent'  ? 'Absent today' :
    'Waiting for driver';

  const leftHomeTime = leftHomeAt
    ? new Date(leftHomeAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`rounded-lg p-2.5 border ${panelClass}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {pickupStop && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Navigation className="h-2.5 w-2.5" /> {pickupStop}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <StatusIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
        <span className={`text-xs font-semibold ${iconClass}`}>{statusLabel}</span>
      </div>

      {/* GPS link when completed */}
      {isCompleted && lat && (
        <a href={`https://www.google.com/maps?q=${lat},${lng}`}
           target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-1 text-[10px] text-blue-500 mb-2 hover:underline">
          <Navigation className="h-2.5 w-2.5" />
          {status === 'dropped' ? 'View drop-off location' : 'View pickup location'}
        </a>
      )}

      {/* Parent left-home badge */}
      {leftHomeTime && (
        <div className="flex items-center gap-1.5 bg-blue-100 border border-blue-200 rounded-md px-2 py-1 text-xs text-blue-800 mb-2">
          <Home className="h-3 w-3 shrink-0" />
          <span>You confirmed child left home at <strong>{leftHomeTime}</strong></span>
        </div>
      )}

      {/* URGENT banner for missed + left home */}
      {isMissed && leftHomeAt && (
        <div className="bg-red-100 border border-red-300 rounded-md px-2.5 py-2 mb-2">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800">🚨 URGENT — Child left home but not found!</p>
              <p className="text-xs text-red-700 mt-0.5">
                You confirmed child left home at {leftHomeTime} but the driver could not find them at the pickup point.
                Please locate your child immediately and contact the school.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Regular missed banner */}
      {isMissed && !leftHomeAt && (
        <div className="bg-red-100 border border-red-300 rounded-md px-2.5 py-2 mb-2">
          <p className="text-xs font-semibold text-red-800">Driver could not find your child at the pickup stop.</p>
          <p className="text-xs text-red-700 mt-0.5">If your child left home, tap "Mark as Left Home" below — the driver and school will be alerted.</p>
        </div>
      )}

      {/* "Child has left home" button — only show when not yet completed and not absent */}
      {!isCompleted && !isAbsent && !leftHomeAt && (
        <button
          onClick={onLeftHome}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
        >
          {busy ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming…</>
          ) : (
            <><Home className="h-3.5 w-3.5" /> My child has already left home</>
          )}
        </button>
      )}

      {/* Already left home + completed */}
      {isCompleted && leftHomeAt && (
        <div className="text-[10px] text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Child left home at {leftHomeTime} and was safely {status === 'dropped' ? 'dropped off' : 'picked up'}.
        </div>
      )}

      {/* Feedback message */}
      {feedback && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 mt-1.5">
          {feedback}
        </p>
      )}
    </div>
  );
}
