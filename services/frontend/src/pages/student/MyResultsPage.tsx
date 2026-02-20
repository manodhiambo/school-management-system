import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyResultsPage() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadResults();
    }
  }, [user]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getStudentExamResults(user?.id || '');
      console.log('My results:', response);
      const res = response as any;
      setResults(Array.isArray(res?.data?.results) ? res.data.results : (Array.isArray(res?.data) ? res.data : []));
    } catch (error: any) {
      console.error('Error loading results:', error);
      setError(error?.message || 'Failed to load exam results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadResults} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Results</h2>
        <p className="text-gray-500">View your exam results and grades</p>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No exam results available yet</p>
            </CardContent>
          </Card>
        ) : (
          results.map((result, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span>{result.exam_name}</span>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {result.percentage || 0}%
                    </p>
                    <p className="text-sm text-gray-500">Grade: {result.grade || 'N/A'}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.subjects && result.subjects.map((subject: any, sIndex: number) => (
                    <div key={sIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{subject.subject_name}</p>
                          <p className="text-sm text-gray-500">Grade: {subject.grade}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {subject.marks_obtained}/{subject.total_marks}
                        </p>
                        <div className="flex items-center text-sm text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {subject.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
