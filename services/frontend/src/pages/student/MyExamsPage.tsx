import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import api from '@/services/api';
import { getCBCGradeBadgeClass, getEducationLevelLabel } from '@/utils/cbcGrades';

type Tab = 'upcoming' | 'online' | 'results';

export function MyExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getExams();
      setExams(response.data || response || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const upcomingExams = exams.filter(e => {
    const start = e.start_date ? new Date(e.start_date) : null;
    return !start || start > now;
  });

  const onlineExams = exams.filter(e => e.mode === 'online');
  const offlineExams = exams.filter(e => e.mode !== 'online');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingExams.length },
    { key: 'online', label: 'Online Exams', count: onlineExams.length },
    { key: 'results', label: 'Offline Results', count: offlineExams.length },
  ];

  const getTabExams = () => {
    if (activeTab === 'upcoming') return upcomingExams;
    if (activeTab === 'online') return onlineExams;
    return offlineExams;
  };

  const canStartExam = (exam: any) => {
    if (exam.mode !== 'online') return false;
    const start = exam.start_date ? new Date(exam.start_date) : null;
    const end = exam.end_date ? new Date(exam.end_date) : null;
    return (!start || now >= start) && (!end || now <= end);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Exams</h2>
        <p className="text-gray-500">View and take your exams</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
            <Button onClick={loadExams} className="mt-2">Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {getTabExams().length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No exams found in this category</p>
            </CardContent>
          </Card>
        ) : (
          getTabExams().map(exam => (
            <Card key={exam.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{exam.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    exam.mode === 'online'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {exam.mode === 'online' ? 'Online' : 'Offline'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {exam.class_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">{exam.class_name}</span>
                    {exam.education_level && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                        {getEducationLevelLabel(exam.education_level)}
                      </span>
                    )}
                  </div>
                )}
                {exam.start_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(exam.start_date).toLocaleDateString()}
                    {exam.end_date && ` – ${new Date(exam.end_date).toLocaleDateString()}`}
                  </div>
                )}
                {exam.duration_minutes && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {exam.duration_minutes} minutes
                  </div>
                )}
                <div className="pt-2 flex gap-2">
                  {canStartExam(exam) && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate('/app/take-exam/' + exam.id)}
                    >
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                      Start Exam
                    </Button>
                  )}
                  {exam.mode === 'online' && !canStartExam(exam) && exam.end_date && new Date(exam.end_date) < now && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/app/take-exam/' + exam.id + '?view=result')}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      View Result
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
