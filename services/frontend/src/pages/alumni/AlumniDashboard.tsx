import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { GraduationCap, RefreshCw, Calendar, Briefcase, Heart, MapPin } from 'lucide-react';

export function AlumniDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, eRes, jRes]: any[] = await Promise.all([
        (api as any).getMyAlumniProfile().catch(() => ({ data: null })),
        (api as any).getAlumniEvents().catch(() => ({ data: [] })),
        (api as any).getAlumniJobs().catch(() => ({ data: [] })),
      ]);
      setProfile(pRes?.data || null);
      setEvents((eRes?.data || []).slice(0, 3));
      setJobs((jRes?.data || []).slice(0, 3));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-indigo-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading your alumni dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 pt-10 pb-6 text-white">
        <div className="flex items-start justify-between max-w-2xl mx-auto">
          <div>
            <p className="text-indigo-200 text-sm">Good {hour < 12 ? 'morning' : 'afternoon'},</p>
            <h1 className="text-2xl font-bold">{(user as any)?.first_name} {(user as any)?.last_name}</h1>
            {profile?.graduation_year && (
              <div className="flex items-center gap-2 mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-flex">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm font-semibold">Class of {profile.graduation_year}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={load} className="text-white hover:bg-white/20">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-10">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">My Profile</h3>
              <Button size="sm" variant="outline" onClick={() => navigate('/app/alumni-portal')}>Edit</Button>
            </div>
            <p className="text-sm text-gray-600">{profile?.current_occupation || 'Occupation not set'} {profile?.employer ? `at ${profile.employer}` : ''}</p>
            {profile?.university && <p className="text-xs text-gray-400 mt-1">{profile.university}</p>}
            {profile?.is_mentor && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Available as mentor</span>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-500" /> Upcoming Events</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/app/alumni-portal')}>View all</Button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">No events scheduled right now</p>
            ) : (
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="text-sm border-l-2 border-indigo-200 pl-2">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {e.event_date?.slice(0, 10)} {e.venue && <><MapPin className="h-3 w-3 ml-1" /> {e.venue}</>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-indigo-500" /> Job Board</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/app/alumni-portal')}>View all</Button>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-400">No job postings yet</p>
            ) : (
              <div className="space-y-2">
                {jobs.map(j => (
                  <div key={j.id} className="text-sm border-l-2 border-indigo-200 pl-2">
                    <p className="font-medium">{j.title}</p>
                    <p className="text-xs text-gray-400">{j.company}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => navigate('/app/alumni-portal')}>
          <Heart className="h-4 w-4 mr-2" /> Give Back — Make a Donation
        </Button>
      </div>
    </div>
  );
}
