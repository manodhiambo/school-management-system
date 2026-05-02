import { useState, useEffect } from 'react';
import { CheckCircle2, LogIn, LogOut, MapPin, Clock, AlertTriangle } from 'lucide-react';
import api from '@/services/api';

export function TeacherCheckinWidget() {
  const [status, setStatus]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [gpsMsg, setGpsMsg]     = useState('');
  const [message, setMessage]   = useState('');

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const res: any = await (api as any).getMyCheckinStatus();
      setStatus(res?.data);
    } catch { /* silent */ }
  };

  const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { setGpsMsg('GPS unavailable'); resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        p  => { setGpsMsg(''); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        () => { setGpsMsg('Location could not be retrieved'); resolve(null); },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });

  const handleCheckin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const coords = await getCoords();
      const res: any = await (api as any).teacherCheckin({
        latitude:  coords?.lat,
        longitude: coords?.lng,
      });
      setMessage(res?.status === 'late' ? 'Checked in (marked late)' : 'Checked in successfully');
      await loadStatus();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setMessage('');
    try {
      const coords = await getCoords();
      await (api as any).teacherCheckout({ latitude: coords?.lat, longitude: coords?.lng });
      setMessage('Checked out');
      await loadStatus();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Checkout failed');
    } finally { setLoading(false); }
  };

  const now     = new Date();
  const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });

  const isCheckedIn  = !!status?.checkin_time;
  const isCheckedOut = !!status?.checkout_time;
  const isLate       = status?.status === 'late';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
      isCheckedOut ? 'border-gray-200 bg-gray-50' :
      isLate       ? 'border-amber-300 bg-amber-50' :
      isCheckedIn  ? 'border-green-400 bg-green-50' :
      'border-blue-300 bg-blue-50'
    }`}>
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        isCheckedOut ? 'bg-gray-100' :
        isLate       ? 'bg-amber-100' :
        isCheckedIn  ? 'bg-green-100' :
        'bg-blue-100'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${isLate ? 'text-amber-600' : isCheckedIn ? 'text-green-600' : 'text-blue-600'}`} />
          <span className="font-semibold text-sm text-gray-800">Daily Check-in</span>
        </div>
        <span className="text-xs text-gray-500">{dateStr} · {timeStr}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Current status */}
        <div className="flex items-center gap-3">
          {isCheckedOut ? (
            <CheckCircle2 className="h-8 w-8 text-gray-400" />
          ) : isCheckedIn ? (
            <CheckCircle2 className={`h-8 w-8 ${isLate ? 'text-amber-500' : 'text-green-500'}`} />
          ) : (
            <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {isCheckedOut ? 'Signed out for today' :
               isLate       ? 'Checked in — Late' :
               isCheckedIn  ? 'Checked in — On time' :
               'Not checked in yet'}
            </p>
            {status?.checkin_time && (
              <p className="text-xs text-gray-500">
                In: {new Date(status.checkin_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                {status.checkout_time && ` · Out: ${new Date(status.checkout_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            )}
            {status?.checkin_lat && (
              <a
                href={`https://www.google.com/maps?q=${status.checkin_lat},${status.checkin_lng}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 flex items-center gap-1 mt-0.5"
              >
                <MapPin className="h-3 w-3" /> Location recorded
              </a>
            )}
          </div>
        </div>

        {gpsMsg && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {gpsMsg}
          </div>
        )}

        {message && (
          <div className={`text-xs rounded-lg px-3 py-1.5 ${
            message.includes('failed') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Action buttons */}
        {!isCheckedIn && !isCheckedOut && (
          <button
            onClick={handleCheckin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><LogIn className="h-4 w-4" /> Mark myself Present</>
            )}
          </button>
        )}

        {isCheckedIn && !isCheckedOut && (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-700 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><LogOut className="h-4 w-4" /> Sign Out</>
            )}
          </button>
        )}

        {isCheckedOut && (
          <div className="text-center text-xs text-gray-400 py-1">All done for today. See you tomorrow!</div>
        )}

        <p className="text-[10px] text-gray-400 text-center">Your GPS coordinates are recorded and sent to admin</p>
      </div>
    </div>
  );
}
