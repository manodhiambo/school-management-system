import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSEO } from '@/hooks/useSEO';
import api from '@/services/api';
import { GraduationCap, ArrowLeft, CheckCircle, Search, Loader2, Upload, FileCheck, X } from 'lucide-react';

type Step = 'loading' | 'not-found' | 'closed' | 'form' | 'submitted' | 'track';

const EDUCATION_LEVELS = [
  { value: 'playgroup', label: 'Playgroup' },
  { value: 'pre_primary', label: 'Pre-Primary (PP1/PP2)' },
  { value: 'lower_primary', label: 'Lower Primary (Grade 1-3)' },
  { value: 'upper_primary', label: 'Upper Primary (Grade 4-6)' },
  { value: 'junior_secondary', label: 'Junior Secondary (Grade 7-9)' },
  { value: 'senior_secondary', label: 'Senior Secondary (Grade 10-12)' },
];

const EMPTY_FORM = {
  first_name: '', last_name: '', date_of_birth: '', gender: '', education_level: '', previous_school: '',
  guardian_name: '', guardian_phone: '', guardian_email: '', guardian_relationship: '',
};

const DOCUMENT_SLOTS: { key: string; label: string }[] = [
  { key: 'birth_certificate', label: 'Birth Certificate' },
  { key: 'kcpe_results', label: 'KCPE Results' },
  { key: 'passport_photo', label: 'Passport Photo' },
  { key: 'previous_report_form', label: 'Previous Report Form' },
  { key: 'medical_form', label: 'Medical Form' },
];

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB per document

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ApplyPage() {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  useSEO({ title: 'Apply for Admission', description: 'Submit a student admission application online.', path: '/apply/' + schoolCode, noindex: true });

  const [step, setStep] = useState<Step>('loading');
  const [school, setSchool] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [documents, setDocuments] = useState<Record<string, { name: string; dataUrl: string } | undefined>>({});
  const [docError, setDocError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');

  // Track view state
  const [trackNumber, setTrackNumber] = useState('');
  const [trackContact, setTrackContact] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  useEffect(() => {
    if (!schoolCode) return;
    api.getAdmissionPublicInfo(schoolCode)
      .then((res: any) => {
        const data = res?.data;
        setSchool(data);
        setStep(data?.is_open === false ? 'closed' : 'form');
      })
      .catch(() => setStep('not-found'));
  }, [schoolCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (key: string, file: File | null) => {
    setDocError('');
    if (!file) {
      setDocuments(d => ({ ...d, [key]: undefined }));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setDocError(`${file.name} is larger than 3MB. Please upload a smaller file.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setDocuments(d => ({ ...d, [key]: { name: file.name, dataUrl } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.first_name || !form.last_name || !form.guardian_name || !form.guardian_phone) {
      setError('Please fill in the applicant name and guardian name/phone.');
      return;
    }
    setSubmitting(true);
    try {
      const uploadedDocuments = DOCUMENT_SLOTS
        .filter(slot => documents[slot.key])
        .map(slot => ({ type: slot.key, name: documents[slot.key]!.name, url: documents[slot.key]!.dataUrl }));

      const res: any = await api.submitAdmissionApplication(schoolCode!, {
        first_name: form.first_name, last_name: form.last_name, date_of_birth: form.date_of_birth || null,
        gender: form.gender || null, education_level: form.education_level || null,
        previous_school: form.previous_school || null, guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone, guardian_email: form.guardian_email || null,
        guardian_relationship: form.guardian_relationship || null, documents: uploadedDocuments,
      });
      setApplicationNumber(res?.data?.application_number || '');
      setStep('submitted');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    if (!trackNumber || !trackContact) {
      setTrackError('Enter your application number and the phone or email you applied with.');
      return;
    }
    setTrackLoading(true);
    try {
      const isEmail = trackContact.includes('@');
      const res: any = await api.trackAdmissionApplication(schoolCode!, trackNumber.trim(), isEmail ? { email: trackContact.trim() } : { phone: trackContact.trim() });
      setTrackResult(res?.data);
    } catch (err: any) {
      setTrackError(err?.response?.data?.message || 'No matching application found.');
    } finally {
      setTrackLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (step === 'not-found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="pt-8 text-center space-y-3">
            <p className="text-gray-600">We couldn't find an admissions page for this school.</p>
            <Link to="/" className="text-indigo-600 font-medium hover:underline">Go to homepage</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-10">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{school?.school_name || 'Admissions'}</h1>
          <p className="text-sm text-gray-500">Online Admission Application</p>
        </div>

        <Card className="shadow-xl border-0">
          {step === 'closed' && (
            <CardContent className="pt-8 text-center space-y-3">
              <p className="text-gray-600">Admissions are currently closed at {school?.school_name}. Please check back later.</p>
            </CardContent>
          )}

          {step === 'form' && (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Student Application</CardTitle>
                <CardDescription>
                  {school?.application_fee_amount > 0
                    ? `An application fee of KSh ${Number(school.application_fee_amount).toLocaleString()} applies after submission.`
                    : 'Fill in the details below to apply.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name">Applicant First Name</Label>
                      <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last_name">Applicant Last Name</Label>
                      <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <select id="gender" name="gender" value={form.gender} onChange={handleChange} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="education_level">Grade Applying For</Label>
                    <select id="education_level" name="education_level" value={form.education_level} onChange={handleChange} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                      <option value="">Select...</option>
                      {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="previous_school">Previous School (optional)</Label>
                    <Input id="previous_school" name="previous_school" value={form.previous_school} onChange={handleChange} />
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Parent / Guardian</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="guardian_name">Full Name</Label>
                        <Input id="guardian_name" name="guardian_name" value={form.guardian_name} onChange={handleChange} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="guardian_phone">Phone</Label>
                          <Input id="guardian_phone" name="guardian_phone" placeholder="07XXXXXXXX" value={form.guardian_phone} onChange={handleChange} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="guardian_relationship">Relationship</Label>
                          <Input id="guardian_relationship" name="guardian_relationship" placeholder="Mother, Father..." value={form.guardian_relationship} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="guardian_email">Email (optional)</Label>
                        <Input id="guardian_email" name="guardian_email" type="email" value={form.guardian_email} onChange={handleChange} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Documents</p>
                    <p className="text-xs text-gray-400 mb-2">Upload a photo or scan of each document (max 3MB each). All optional at this stage.</p>
                    <div className="space-y-2">
                      {DOCUMENT_SLOTS.map(slot => {
                        const doc = documents[slot.key];
                        return (
                          <div key={slot.key} className="flex items-center gap-2">
                            <label className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                              {doc ? <FileCheck className="h-4 w-4 text-green-600 shrink-0" /> : <Upload className="h-4 w-4 text-gray-400 shrink-0" />}
                              <span className={`truncate ${doc ? 'text-gray-800' : 'text-gray-400'}`}>{doc ? doc.name : slot.label}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={e => handleFileChange(slot.key, e.target.files?.[0] || null)}
                              />
                            </label>
                            {doc && (
                              <button type="button" onClick={() => handleFileChange(slot.key, null)} className="text-gray-400 hover:text-red-500 shrink-0">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {docError && <p className="text-xs text-red-600 mt-2">{docError}</p>}
                  </div>

                  {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <button type="button" onClick={() => setStep('track')} className="w-full text-center text-sm text-indigo-600 hover:underline flex items-center justify-center gap-1">
                    <Search className="h-3.5 w-3.5" /> Track an existing application
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'submitted' && (
            <CardContent className="pt-8 text-center space-y-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Application Submitted</p>
                <p className="text-sm text-gray-500 mt-1">Save your application number to track your status:</p>
              </div>
              <p className="text-2xl font-mono font-bold text-indigo-600 bg-indigo-50 rounded-lg py-3">{applicationNumber}</p>
              <Button variant="outline" className="w-full" onClick={() => { setTrackNumber(applicationNumber); setStep('track'); }}>
                <Search className="h-4 w-4 mr-2" /> Track this application
              </Button>
            </CardContent>
          )}

          {step === 'track' && (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep('form')} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
                <CardTitle className="text-xl">Track Application</CardTitle>
                <CardDescription>Enter your application number and the phone or email you applied with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleTrack} className="space-y-3">
                  <Input placeholder="Application number (e.g. ADM-2026-00001)" value={trackNumber} onChange={e => setTrackNumber(e.target.value)} required />
                  <Input placeholder="Phone or email used on the application" value={trackContact} onChange={e => setTrackContact(e.target.value)} required />
                  {trackError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{trackError}</div>}
                  <Button type="submit" className="w-full" disabled={trackLoading}>{trackLoading ? 'Searching...' : 'Track'}</Button>
                </form>

                {trackResult && (
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <p><span className="text-gray-400">Applicant:</span> {trackResult.first_name} {trackResult.last_name}</p>
                    <p><span className="text-gray-400">Status:</span> <span className="font-semibold capitalize">{trackResult.status.replace(/_/g, ' ')}</span></p>
                    {trackResult.interview_date && (
                      <p><span className="text-gray-400">Interview:</span> {trackResult.interview_date.slice(0, 10)} {trackResult.interview_time} at {trackResult.interview_venue}</p>
                    )}
                    {trackResult.decision !== 'pending' && (
                      <p><span className="text-gray-400">Decision:</span> <span className="capitalize">{trackResult.decision}</span></p>
                    )}
                    {trackResult.status === 'submitted' && school?.application_fee_amount > 0 && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={async () => {
                          const phone = prompt('M-Pesa phone number to pay the application fee:');
                          if (!phone) return;
                          try {
                            const res: any = await api.payAdmissionFee(schoolCode!, trackResult.application_number, phone);
                            alert(res?.message || 'Payment request sent');
                          } catch (err: any) {
                            alert(err?.response?.data?.message || 'Could not initiate payment');
                          }
                        }}
                      >
                        Pay Application Fee
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">Back to SkulManager</Link>
        </p>
      </div>
    </div>
  );
}
