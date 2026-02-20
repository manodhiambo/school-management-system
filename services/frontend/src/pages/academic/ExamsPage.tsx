import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Search, Plus, Calendar, FileText, Monitor, PenLine } from 'lucide-react';
import api from '@/services/api';

export function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterMode, setFilterMode] = useState('');

  useEffect(() => {
    loadExams();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res: any = await api.getClasses();
      setClasses(res.data || res || []);
    } catch { /* silent */ }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (filterClass) params.class_id = filterClass;
      if (filterMode) params.mode = filterMode;
      const response: any = await api.getExams(params);
      setExams(response.data || response.exams || response || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    loadExams();
  }, [filterClass, filterMode]);

  const filteredExams = exams.filter(exam =>
    (exam.name || exam.exam_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadExams} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Exams & Results</h2>
          <p className="text-gray-500">Manage exams and view results</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section && `(${c.section})`}</option>
              ))}
            </select>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">All Modes</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExams.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No exams found</p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map(exam => (
            <Card key={exam.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="flex-1 truncate">{exam.name || exam.exam_name}</span>
                  {/* Mode badge */}
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    exam.mode === 'online'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {exam.mode === 'online'
                      ? <><Monitor className="h-3 w-3" /> Online</>
                      : <><PenLine className="h-3 w-3" /> Offline</>
                    }
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Class name */}
                  {(exam.class_name || exam.class_id) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      {exam.class_name || 'Class'}
                    </div>
                  )}
                  {exam.exam_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(exam.exam_date).toLocaleDateString()}
                    </div>
                  )}
                  {exam.start_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(exam.start_date).toLocaleDateString()}
                      {exam.end_date && ` – ${new Date(exam.end_date).toLocaleDateString()}`}
                    </div>
                  )}
                  {exam.duration_minutes && (
                    <p className="text-sm text-gray-500">Duration: {exam.duration_minutes} min</p>
                  )}
                  {exam.total_marks && (
                    <p className="text-sm text-gray-500">Total Marks: {exam.total_marks}</p>
                  )}
                  <div className="pt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      exam.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : exam.status === 'ongoing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {exam.status || 'scheduled'}
                    </span>
                    {exam.is_results_published && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs bg-green-50 text-green-600 border border-green-200">
                        Results Published
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  {exam.status === 'completed' && (
                    <Button size="sm" className="flex-1">
                      View Results
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
