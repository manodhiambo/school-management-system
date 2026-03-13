import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { FileText, CheckCircle, Eye, Download } from 'lucide-react';

const GRADE_COLORS: Record<string, string> = {
  EE: 'bg-green-100 text-green-800 border-green-200',
  ME: 'bg-blue-100 text-blue-800 border-blue-200',
  AE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BE: 'bg-red-100 text-red-800 border-red-200',
};

export function CbcReportCardPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ class_id: '', term: 'term1', academic_year: new Date().getFullYear().toString() });
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.getClasses() });
  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['cbc-report-cards', filters],
    queryFn: () => api.getCbcReportCards(filters),
    enabled: !!filters.class_id,
  });
  const { data: cardDetail } = useQuery({
    queryKey: ['cbc-report-card', selectedCard?.id],
    queryFn: () => api.getCbcReportCard(selectedCard.id),
    enabled: !!selectedCard?.id,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishCbcReportCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const classes = (classesData as any)?.data || [];
  const cards = (cardsData as any)?.data || [];
  const detail = (cardDetail as any)?.data;

  const statusBadge = (status: string) => {
    if (status === 'published') return <Badge className="bg-green-100 text-green-800">Published</Badge>;
    if (status === 'acknowledged') return <Badge className="bg-purple-100 text-purple-800">Acknowledged</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBC Report Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Holistic Learner Progress Reports — Kenya CBC</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Class *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={filters.class_id} onChange={e => setFilters({ ...filters, class_id: e.target.value })}>
                <option value="">Select a class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Term</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={filters.term} onChange={e => setFilters({ ...filters, term: e.target.value })}>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="term3">Term 3</option>
              </select>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={filters.academic_year} onChange={e => setFilters({ ...filters, academic_year: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Learners ({cards.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!filters.class_id ? (
                <p className="p-4 text-sm text-gray-500">Select a class to view report cards.</p>
              ) : isLoading ? (
                <p className="p-4 text-sm text-gray-500">Loading...</p>
              ) : cards.length === 0 ? (
                <div className="p-4 text-center">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No report cards found.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {cards.map((card: any) => (
                    <button key={card.id} onClick={() => setSelectedCard(card)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedCard?.id === card.id ? 'bg-indigo-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{card.student_name}</p>
                          <p className="text-xs text-gray-500">{card.admission_number}</p>
                        </div>
                        {statusBadge(card.status)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report card detail */}
        <div className="lg:col-span-2">
          {!selectedCard ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a learner to view their report card.</p>
              </CardContent>
            </Card>
          ) : detail ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{detail.student_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {detail.class_name} · {detail.term?.replace('term', 'Term ')} · {detail.academic_year}
                    </p>
                    <p className="text-xs text-gray-400">Admission: {detail.admission_number}</p>
                  </div>
                  <div className="flex gap-2">
                    {statusBadge(detail.status)}
                    {detail.status === 'draft' && (
                      <Button size="sm" onClick={() => publishMutation.mutate(detail.id)} disabled={publishMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attendance */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{detail.days_present || 0}</p>
                    <p className="text-xs text-green-600">Days Present</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{detail.days_absent || 0}</p>
                    <p className="text-xs text-red-600">Days Absent</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{detail.days_late || 0}</p>
                    <p className="text-xs text-yellow-600">Days Late</p>
                  </div>
                </div>

                {/* Learning areas */}
                {detail.competencies?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Learning Areas</h3>
                    <div className="space-y-2">
                      {detail.competencies.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium">{c.subject_name}</span>
                          <div className="flex items-center gap-2">
                            {c.percentage && <span className="text-xs text-gray-500">{c.percentage}%</span>}
                            {(c.overall_cbc_grade || c.pre_primary_grade) && (
                              <Badge className={GRADE_COLORS[c.overall_cbc_grade || c.pre_primary_grade] || 'bg-gray-100'}>
                                {c.overall_cbc_grade || c.pre_primary_grade}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher comment */}
                {detail.class_teacher_comment && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Class Teacher's Comment</p>
                    <p className="text-sm text-blue-900">{detail.class_teacher_comment}</p>
                  </div>
                )}

                {/* Head teacher comment */}
                {detail.head_teacher_comment && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Head Teacher's Comment</p>
                    <p className="text-sm text-purple-900">{detail.head_teacher_comment}</p>
                  </div>
                )}

                {/* Parent acknowledgment */}
                {detail.status === 'acknowledged' && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Parent Acknowledged</p>
                    {detail.parent_comment && <p className="text-sm text-green-900">{detail.parent_comment}</p>}
                    <p className="text-xs text-green-600 mt-1">
                      {detail.parent_acknowledged_at ? new Date(detail.parent_acknowledged_at).toLocaleString() : ''}
                    </p>
                  </div>
                )}

                {/* Overall grade */}
                {detail.overall_grade && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <span className="text-sm font-semibold text-gray-600">Overall Grade:</span>
                    <Badge className={GRADE_COLORS[detail.overall_grade] || 'bg-gray-100 text-gray-800'}>
                      {detail.overall_grade}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading report card...</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
