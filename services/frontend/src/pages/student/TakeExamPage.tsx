import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { getCBCGradeBadgeClass } from '@/utils/cbcGrades';

export function TakeExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewResult = searchParams.get('view') === 'result';

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (viewResult) {
      loadResult();
    } else {
      startExam();
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [examId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return (prev || 0) - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  const startExam = async () => {
    try {
      setLoading(true);
      const response: any = await api.startExamAttempt(examId!);
      const data = response.data || response;
      setExam(data.exam || data);
      setQuestions(data.questions || []);
      if (data.exam?.duration_minutes) {
        setTimeLeft(data.exam.duration_minutes * 60);
      }
      // Load saved answers if any
      try {
        const attemptRes: any = await api.getExamAttempt(examId!);
        const attemptData = attemptRes.data || attemptRes;
        const savedAnswers: Record<string, string> = {};
        for (const a of (attemptData.answers || [])) {
          savedAnswers[a.question_id] = a.answer_text || '';
        }
        setAnswers(savedAnswers);
      } catch { /* no saved answers yet */ }
    } catch (err: any) {
      setError(err?.message || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  const loadResult = async () => {
    try {
      setLoading(true);
      const response: any = await api.getMyExamResult(examId!);
      const data = response.data || response;
      setResult(data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load result');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = useCallback((questionId: string, answerText: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerText }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.saveExamAnswer(examId!, { question_id: questionId, answer_text: answerText }).catch(() => {});
    }, 500);
  }, [examId]);

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const response: any = await api.submitExamAttempt(examId!);
      const data = response.data || response;
      setResult(data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate('/app/my-exams')} className="mt-4">
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result view
  if (submitted && result) {
    const attempt = result.attempt || result;
    const breakdown = result.breakdown || result.answers || [];
    const totalScore = attempt.total_score ?? result.total_score;
    const maxScore = attempt.max_score ?? result.max_score;
    const cbcGrade = attempt.cbc_grade ?? result.cbc_grade;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Exam Result</h2>
          <p className="text-gray-500">{exam?.name || 'Exam'}</p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span className={`text-4xl font-bold px-6 py-2 rounded-xl border-2 ${getCBCGradeBadgeClass(cbcGrade)}`}>
                {cbcGrade}
              </span>
              <p className="text-2xl font-semibold">{totalScore} / {maxScore}</p>
              <p className="text-gray-500">{percentage}%</p>
            </div>
            <Button onClick={() => navigate('/app/my-exams')}>Back to Exams</Button>
          </CardContent>
        </Card>

        {breakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Question Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {breakdown.map((item: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${item.is_correct === true ? 'bg-green-50 border-green-200' : item.is_correct === false ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="font-medium text-sm">{i + 1}. {item.question_text}</p>
                  <div className="mt-1 flex gap-4 text-xs text-gray-600">
                    <span>Your answer: <strong>{item.your_answer || item.answer_text || '–'}</strong></span>
                    {item.correct_answer && <span>Correct: <strong>{item.correct_answer}</strong></span>}
                    <span>Marks: <strong>{item.marks_awarded ?? 0}/{item.marks}</strong></span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{exam?.name}</h2>
          <p className="text-gray-500">{questions.length} questions · {answeredCount} answered</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 text-lg font-mono font-bold px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {exam?.instructions && (
        <Card>
          <CardContent className="pt-4 text-sm text-gray-600">{exam.instructions}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question navigator */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-1">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 text-xs rounded font-medium transition-colors ${
                      i === currentIdx
                        ? 'bg-blue-600 text-white'
                        : answers[q.id]?.trim()
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question */}
        <div className="lg:col-span-3 space-y-4">
          {currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Question {currentIdx + 1} of {questions.length}
                  <span className="ml-2 text-xs text-gray-400 font-normal">({currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-medium">{currentQuestion.question_text}</p>

                {/* Multiple choice */}
                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                  <div className="space-y-2">
                    {(Array.isArray(currentQuestion.options) ? currentQuestion.options : JSON.parse(currentQuestion.options || '[]')).map((opt: any) => (
                      <label
                        key={opt.label}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[currentQuestion.id] === opt.label
                            ? 'bg-blue-50 border-blue-400'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={opt.label}
                          checked={answers[currentQuestion.id] === opt.label}
                          onChange={() => saveAnswer(currentQuestion.id, opt.label)}
                          className="text-blue-600"
                        />
                        <span className="font-medium">{opt.label}.</span>
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* True/False */}
                {currentQuestion.question_type === 'true_false' && (
                  <div className="flex gap-4">
                    {['True', 'False'].map(val => (
                      <button
                        key={val}
                        onClick={() => saveAnswer(currentQuestion.id, val)}
                        className={`flex-1 py-4 text-lg font-semibold rounded-xl border-2 transition-colors ${
                          answers[currentQuestion.id] === val
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {/* Short answer */}
                {currentQuestion.question_type === 'short_answer' && (
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                    rows={4}
                    placeholder="Type your answer here..."
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button onClick={() => setCurrentIdx(i => i + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Submit Exam
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Submit Exam?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                Once submitted, you cannot change your answers.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
                  Continue Exam
                </Button>
                <Button onClick={() => handleSubmit()} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                  {submitting ? 'Submitting...' : 'Confirm Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
