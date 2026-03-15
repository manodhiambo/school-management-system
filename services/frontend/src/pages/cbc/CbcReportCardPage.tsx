import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { FileText, CheckCircle, Download, PlusCircle, Users, Share2, Mail, MessageCircle, X, Phone, AtSign, AlertCircle } from 'lucide-react';

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
  const [showShare, setShowShare] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);

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

  const generateMutation = useMutation({
    mutationFn: () => api.generateCbcReportCards({
      class_id: filters.class_id,
      term: filters.term,
      academic_year: filters.academic_year,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const shareMutation = useMutation({
    mutationFn: (channels: string[]) => api.shareReportCard(detail?.id, channels),
    onSuccess: (res: any) => setShareResult(res?.data?.results || res?.results || {}),
  });

  const classes = (classesData as any)?.data || [];
  const cards = (cardsData as any)?.data || [];
  const detail = (cardDetail as any)?.data;

  const statusBadge = (status: string | null) => {
    if (status === 'published') return <Badge className="bg-green-100 text-green-800">Published</Badge>;
    if (status === 'acknowledged') return <Badge className="bg-purple-100 text-purple-800">Acknowledged</Badge>;
    if (!status) return <Badge variant="outline" className="text-gray-400">No Card</Badge>;
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
              <select
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={filters.class_id}
                onChange={e => { setSelectedCard(null); setFilters({ ...filters, class_id: e.target.value }); }}
              >
                <option value="">— Select a class —</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No classes found. Add classes first.</p>
              )}
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

          {/* Generate button — shown when a class is selected */}
          {filters.class_id && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {generateMutation.isPending ? 'Generating…' : 'Generate Report Cards for All Students'}
              </Button>
              {generateMutation.isSuccess && (
                <span className="text-xs text-green-600">
                  {(generateMutation.data as any)?.data?.created === 0
                    ? 'All students already have report cards.'
                    : `Created ${(generateMutation.data as any)?.data?.created} new report card(s).`}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Learners ({cards.length})
                </CardTitle>
                {cards.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {cards.filter((c: any) => c.id).length} with card
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!filters.class_id ? (
                <div className="p-6 text-center">
                  <FileText className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Select a class above to view students.</p>
                </div>
              ) : isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No students in this class</p>
                  <p className="text-xs text-gray-400 mt-1">Enroll students first, then generate report cards.</p>
                </div>
              ) : (
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {cards.map((card: any) => (
                    <button
                      key={card.student_id}
                      onClick={() => card.id ? setSelectedCard(card) : null}
                      className={`w-full text-left px-4 py-3 transition-colors
                        ${card.id ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default opacity-60'}
                        ${selectedCard?.id === card.id ? 'bg-indigo-50' : ''}`}
                    >
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
                  <div className="flex flex-wrap gap-2">
                    {statusBadge(detail.status)}
                    {detail.status === 'draft' && (
                      <Button size="sm" onClick={() => publishMutation.mutate(detail.id)} disabled={publishMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                    {detail.status === 'published' || detail.status === 'acknowledged' ? (
                      <Button size="sm" variant="outline" onClick={() => { setShowShare(true); setShareResult(null); }}
                        className="flex items-center gap-1 border-green-300 text-green-700 hover:bg-green-50">
                        <Share2 className="h-4 w-4" />
                        Share with Parent
                      </Button>
                    ) : null}
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

      {/* ── Share Dialog ─────────────────────────────────────────────────── */}
      {showShare && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Share Report Card</h2>
              </div>
              <button onClick={() => { setShowShare(false); setShareResult(null); }}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Student info */}
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="font-semibold text-indigo-900">{detail.student_name}</p>
                <p className="text-sm text-indigo-600">{detail.class_name} · {detail.term?.replace('term', 'Term ')} {detail.academic_year}</p>
              </div>

              {/* Parent contact info (read-only) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registered Parent / Guardian Contact</p>
                {detail.guardian_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{detail.guardian_name}
                      {detail.guardian_relationship ? ` (${detail.guardian_relationship})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {detail.guardian_phone ? (
                    <span className="text-gray-700 font-mono">{detail.guardian_phone}</span>
                  ) : (
                    <span className="text-red-500 italic">No phone number registered</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AtSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {detail.guardian_email ? (
                    <span className="text-gray-700">{detail.guardian_email}</span>
                  ) : (
                    <span className="text-red-500 italic">No email address registered</span>
                  )}
                </div>
                {!detail.guardian_phone && !detail.guardian_email && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">No parent contact details found. Ask the school office to link a parent/guardian to this student.</p>
                  </div>
                )}
              </div>

              {/* Share results */}
              {shareResult && (
                <div className="space-y-2">
                  {shareResult.email !== undefined && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${shareResult.email?.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      {shareResult.email?.success
                        ? 'Email sent successfully to parent.'
                        : `Email failed: ${shareResult.email?.error}`}
                    </div>
                  )}
                  {shareResult.whatsapp !== undefined && shareResult.whatsapp?.success && (
                    <a
                      href={shareResult.whatsapp.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      Open WhatsApp to send message →
                    </a>
                  )}
                  {shareResult.whatsapp !== undefined && !shareResult.whatsapp?.success && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700">
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      WhatsApp: {shareResult.whatsapp?.error}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                {/* Email */}
                <button
                  onClick={() => shareMutation.mutate(['email'])}
                  disabled={shareMutation.isPending || !detail.guardian_email}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {shareMutation.isPending ? 'Sending…' : `Send Email to ${detail.guardian_email || 'parent'}`}
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => shareMutation.mutate(['whatsapp'])}
                  disabled={shareMutation.isPending || !detail.guardian_phone}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {shareMutation.isPending ? 'Preparing…' : `Send via WhatsApp to ${detail.guardian_phone || 'parent'}`}
                </button>

                {/* Both */}
                {detail.guardian_email && detail.guardian_phone && (
                  <button
                    onClick={() => shareMutation.mutate(['email', 'whatsapp'])}
                    disabled={shareMutation.isPending}
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 font-medium text-sm
                      border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Send via Both (Email + WhatsApp)
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Messages are sent only to the registered contact details shown above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
