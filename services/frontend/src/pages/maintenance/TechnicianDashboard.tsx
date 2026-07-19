import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Wrench, RefreshCw, MapPin, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-yellow-100 text-yellow-800', in_progress: 'bg-blue-100 text-blue-800',
  inspection: 'bg-purple-100 text-purple-800',
};

export function TechnicianDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [repairCost, setRepairCost] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getMyMaintenanceJobs();
      setJobs(res?.data || []);
    } catch { /* non-critical */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const start = async (id: string) => {
    try {
      await (api as any).startMaintenanceJob(id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to start job');
    }
  };

  const submitComplete = async (id: string) => {
    try {
      await (api as any).completeMaintenanceJob(id, { repair_cost: repairCost || null, notes: notes || null });
      setCompletingId(null);
      setRepairCost('');
      setNotes('');
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to complete job');
    }
  };

  const hour = new Date().getHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Wrench className="h-12 w-12 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading your jobs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 pt-10 pb-6 text-white">
        <div className="flex items-start justify-between max-w-2xl mx-auto">
          <div>
            <p className="text-slate-300 text-sm">Good {hour < 12 ? 'morning' : 'afternoon'},</p>
            <h1 className="text-2xl font-bold">{(user as any)?.first_name} {(user as any)?.last_name}</h1>
            <div className="flex items-center gap-2 mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-flex">
              <Wrench className="h-4 w-4" />
              <span className="text-sm font-semibold">{jobs.length} assigned job{jobs.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={load} className="text-white hover:bg-white/20">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-3 pb-10">
        {jobs.length === 0 ? (
          <Card><CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500">No jobs assigned right now</p>
          </CardContent></Card>
        ) : (
          jobs.map(job => (
            <Card key={job.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[job.priority]}`}>{job.priority}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>{job.status.replace('_', ' ')}</span>
                    </div>
                    <h3 className="font-semibold mt-1">{job.title}</h3>
                    <p className="text-xs text-gray-400 font-mono">{job.request_number}</p>
                  </div>
                </div>
                {job.description && <p className="text-sm text-gray-600 mb-2">{job.description}</p>}
                {job.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin className="h-3 w-3" /> {job.location}</p>
                )}
                {job.asset_name && (
                  <p className="text-xs text-gray-500 mb-2">Asset: {job.asset_name} ({job.asset_tag})</p>
                )}

                {job.status === 'assigned' && (
                  <Button className="w-full" onClick={() => start(job.id)}>
                    <PlayCircle className="h-4 w-4 mr-2" /> Start Job
                  </Button>
                )}

                {job.status === 'in_progress' && completingId !== job.id && (
                  <Button className="w-full" onClick={() => setCompletingId(job.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                  </Button>
                )}

                {job.status === 'in_progress' && completingId === job.id && (
                  <div className="space-y-2 mt-2 border-t pt-3">
                    <Input type="number" placeholder="Repair cost (KES, optional)" value={repairCost} onChange={e => setRepairCost(e.target.value)} />
                    <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => submitComplete(job.id)}>Submit</Button>
                      <Button variant="outline" onClick={() => setCompletingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {job.status === 'inspection' && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 rounded p-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Waiting for office inspection
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
