import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Camera, ChevronRight, ChevronLeft, Check, Bus } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

// ── static data ────────────────────────────────────────────────────────────────

const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu',
  'Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',
  "Murang'a",'Nairobi City','Nakuru','Nandi','Narok','Nyandarua','Nyamira',
  'Nyeri','Samburu','Siaya','Taita/Taveta','Tana River','Tharaka-Nithi',
  'Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

const EDUCATION_LEVELS = [
  { value: 'playgroup',         label: 'Playgroup' },
  { value: 'pre_primary',       label: 'Pre-Primary (PP1 / PP2)' },
  { value: 'lower_primary',     label: 'Lower Primary (Grade 1–6)' },
  { value: 'junior_secondary',  label: 'Junior Secondary (Grade 7–9)' },
  { value: 'senior_secondary',  label: 'Senior Secondary (Grade 10–12)' },
];

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];

const RELIGIONS = ['Christian','Muslim','Hindu','African Traditional','Other'];

const STEP_LABELS = ['Admission & Class', 'Personal Details', 'Parent / Guardian', 'Account & Address'];

// ── types ──────────────────────────────────────────────────────────────────────

type ParentMode = 'existing' | 'new' | 'skip';

interface NewParentForm {
  firstName: string; lastName: string;
  relationship: string; phonePrimary: string; phoneSecondary: string;
  email: string; password: string; occupation: string; whatsappNumber: string;
}

interface FormData {
  // Step 1
  admissionNumber: string; admissionDate: string; educationLevel: string;
  classId: string; student_type: string; uses_transport: boolean;
  nemisNumber: string; previousSchool: string; isNewAdmission: boolean;
  // Step 2
  profile_photo_url: string; firstName: string; lastName: string;
  dateOfBirth: string; gender: string; bloodGroup: string; religion: string;
  county: string; subCounty: string; birthCertificateNumber: string;
  specialNeeds: boolean; specialNeedsDetails: string;
  medicalConditions: string; emergencyContactName: string; emergencyContactPhone: string;
  // Step 3
  parentMode: ParentMode; parentId: string; newParent: NewParentForm;
  // Step 4
  email: string; password: string; phone: string;
  address: string; city: string; state: string; pincode: string;
}

const BLANK_PARENT: NewParentForm = {
  firstName: '', lastName: '', relationship: 'guardian',
  phonePrimary: '', phoneSecondary: '', email: '',
  password: 'parent123', occupation: '', whatsappNumber: '',
};

const INITIAL: FormData = {
  admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
  educationLevel: 'lower_primary', classId: '', student_type: 'day_scholar',
  uses_transport: false, nemisNumber: '', previousSchool: '', isNewAdmission: true,
  profile_photo_url: '', firstName: '', lastName: '', dateOfBirth: '',
  gender: 'male', bloodGroup: '', religion: '', county: '', subCounty: '',
  birthCertificateNumber: '', specialNeeds: false, specialNeedsDetails: '',
  medicalConditions: '', emergencyContactName: '', emergencyContactPhone: '',
  parentMode: 'existing', parentId: '', newParent: { ...BLANK_PARENT },
  email: '', password: 'student123', phone: '',
  address: '', city: '', state: '', pincode: '',
};

// ── helpers ────────────────────────────────────────────────────────────────────

function resizeImageToBase64(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SelectField({ label, value, onChange, children, required }: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <Label>{label}{required ? ' *' : ''}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}

function SegmentedToggle({ options, value, onChange }: {
  options: { value: string | boolean; label: string; color?: string }[];
  value: string | boolean;
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex gap-2 mt-1">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
            value === opt.value
              ? opt.color ?? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddStudentModal({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [parentSearch, setParentSearch] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>({ ...INITIAL, newParent: { ...BLANK_PARENT } });

  // Reset and pre-load on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSubmitError('');
    setForm({ ...INITIAL, newParent: { ...BLANK_PARENT } });
    setPhotoPreview('');
    setParentSearch('');

    Promise.allSettled([
      api.getClasses(),
      (api as any).getNextAdmissionNumber(),
    ]).then(([classRes, numRes]) => {
      if (classRes.status === 'fulfilled') setClasses((classRes.value as any).data || []);
      if (numRes.status === 'fulfilled') {
        const num = (numRes.value as any).data?.admission_number || '';
        setForm(p => ({ ...p, admissionNumber: num }));
      }
    });
  }, [open]);

  // Load parents when entering step 3
  // Note: axios interceptor already unwraps response.data, so res = { statusCode, data: [...], message }
  useEffect(() => {
    if (step !== 3) return;
    api.getParents({ limit: 500 }).then((res: any) => {
      setParents(res?.data || []);
    }).catch(() => {});
  }, [step]);

  const set = (field: keyof FormData, value: any) => setForm(p => ({ ...p, [field]: value }));
  const setP = (field: keyof NewParentForm, value: string) =>
    setForm(p => ({ ...p, newParent: { ...p.newParent, [field]: value } }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await resizeImageToBase64(file, 300);
      setPhotoPreview(b64);
      set('profile_photo_url', b64);
    } catch {
      toast({ title: 'Error', description: 'Failed to process photo', variant: 'destructive' });
    }
  };

  // Per-step validation
  const validate = (): string | null => {
    if (step === 1 && !form.classId) return 'Please select a class / grade';
    if (step === 2) {
      if (!form.firstName.trim()) return 'First name is required';
      if (!form.lastName.trim())  return 'Last name is required';
      if (!form.dateOfBirth)      return 'Date of birth is required';
    }
    if (step === 3 && form.parentMode === 'new') {
      if (!form.newParent.firstName.trim())   return "Parent's first name is required";
      if (!form.newParent.phonePrimary.trim()) return "Parent's phone number is required";
    }
    if (step === 4 && !form.email.trim()) return 'Student login email is required';
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { toast({ title: 'Required', description: err, variant: 'destructive' }); return; }
    setSubmitError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast({ title: 'Required', description: err, variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const payload: any = {
        // Account
        email: form.email.trim(),
        password: form.password,
        // Names
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        // Admission
        admission_number: form.admissionNumber.trim() || undefined,
        admissionDate: form.admissionDate,
        education_level: form.educationLevel,
        classId: form.classId,
        student_type: form.student_type,
        uses_transport: form.uses_transport,
        is_new_admission: form.isNewAdmission,
        nemis_number:       form.nemisNumber || undefined,
        previous_school:    form.previousSchool || undefined,
        // Personal
        dateOfBirth:              form.dateOfBirth,
        gender:                   form.gender,
        bloodGroup:               form.bloodGroup || undefined,
        religion:                 form.religion || undefined,
        county:                   form.county || undefined,
        sub_county:               form.subCounty || undefined,
        birth_certificate_number: form.birthCertificateNumber || undefined,
        special_needs:            form.specialNeeds,
        special_needs_details:    form.specialNeedsDetails || undefined,
        medical_conditions:       form.medicalConditions || undefined,
        emergency_contact_name:   form.emergencyContactName || undefined,
        emergency_contact_phone:  form.emergencyContactPhone || undefined,
        profile_photo_url:        form.profile_photo_url || undefined,
        // Contact
        phone:    form.phone || undefined,
        address:  form.address || undefined,
        city:     form.city || undefined,
        state:    form.state || undefined,
        pincode:  form.pincode || undefined,
      };

      if (form.parentMode === 'existing' && form.parentId) {
        payload.parentId = form.parentId;
      } else if (form.parentMode === 'new') {
        payload.newParent = {
          firstName:      form.newParent.firstName.trim(),
          lastName:       form.newParent.lastName.trim(),
          relationship:   form.newParent.relationship,
          phonePrimary:   form.newParent.phonePrimary,
          phoneSecondary: form.newParent.phoneSecondary || undefined,
          email:          form.newParent.email || undefined,
          password:       form.newParent.password || 'parent123',
          occupation:     form.newParent.occupation || undefined,
          whatsappNumber: form.newParent.whatsappNumber || undefined,
        };
      }

      await api.createStudent(payload);
      toast({ title: 'Success', description: `${form.firstName} ${form.lastName} admitted successfully` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to admit student. Please try again.';
      setSubmitError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredParents = parents.filter(p => {
    if (!parentSearch.trim()) return true;
    const s = parentSearch.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(s) ||
      p.last_name?.toLowerCase().includes(s)  ||
      p.phone_primary?.includes(s)
    );
  });

  // ── Step renderers ────────────────────────────────────────────────────────────

  const Step1 = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Admission Number</Label>
        <Input
          value={form.admissionNumber}
          onChange={e => set('admissionNumber', e.target.value)}
          placeholder="Auto-generated"
        />
        <p className="text-xs text-gray-400 mt-1">Leave unchanged for auto-generated</p>
      </div>
      <div>
        <Label>Admission Date *</Label>
        <Input type="date" value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} required />
      </div>

      <SelectField label="Education Level" value={form.educationLevel} onChange={v => set('educationLevel', v)}>
        {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </SelectField>

      <SelectField label="Class / Grade" value={form.classId} onChange={v => set('classId', v)} required>
        <option value="">Select Class</option>
        {classes.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>
        ))}
      </SelectField>

      <div>
        <Label>NEMIS Number</Label>
        <Input value={form.nemisNumber} onChange={e => set('nemisNumber', e.target.value)} placeholder="e.g. 12345678" />
      </div>
      <div>
        <Label>Previous School</Label>
        <Input value={form.previousSchool} onChange={e => set('previousSchool', e.target.value)} placeholder="Name of previous school (if transfer)" />
      </div>

      <div className="md:col-span-2">
        <Label>Student Category *</Label>
        <SegmentedToggle
          value={form.student_type}
          onChange={v => set('student_type', v)}
          options={[
            { value: 'day_scholar', label: 'Day Scholar', color: 'bg-blue-600 text-white border-blue-600' },
            { value: 'boarder',     label: 'Boarder',     color: 'bg-purple-600 text-white border-purple-600' },
          ]}
        />
      </div>

      <div className="md:col-span-2">
        <Label className="flex items-center gap-1"><Bus className="h-4 w-4 text-orange-500" /> School Transport</Label>
        <SegmentedToggle
          value={form.uses_transport}
          onChange={v => set('uses_transport', v)}
          options={[
            { value: true,  label: 'Uses school transport', color: 'bg-orange-500 text-white border-orange-500' },
            { value: false, label: 'No transport needed',   color: 'bg-gray-600 text-white border-gray-600' },
          ]}
        />
        {form.uses_transport && (
          <p className="text-xs text-orange-600 mt-1">Assign to a route after admission under Welfare → Transport.</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isNewAdmission}
            onChange={e => set('isNewAdmission', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium">New admission (first time enrolling in this school)</span>
        </label>
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-4">
      {/* Photo row */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div
          className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 hover:border-blue-400 shrink-0"
          onClick={() => photoRef.current?.click()}
        >
          {photoPreview
            ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            : <div className="text-center p-2"><Camera className="h-6 w-6 text-gray-300 mx-auto" /><span className="text-[10px] text-gray-400 mt-1 block">Passport Photo</span></div>
          }
        </div>
        <div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" />{photoPreview ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {photoPreview && (
            <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500"
              onClick={() => { setPhotoPreview(''); set('profile_photo_url', ''); }}>
              Remove
            </Button>
          )}
          <p className="text-xs text-gray-400 mt-1">JPG / PNG, resized to passport size</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>First Name *</Label>
          <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
        </div>
        <div>
          <Label>Date of Birth *</Label>
          <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} required />
        </div>

        <SelectField label="Gender" value={form.gender} onChange={v => set('gender', v)} required>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </SelectField>

        <SelectField label="Blood Group" value={form.bloodGroup} onChange={v => set('bloodGroup', v)}>
          <option value="">Not Known</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </SelectField>

        <SelectField label="Religion" value={form.religion} onChange={v => set('religion', v)}>
          <option value="">Not specified</option>
          {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </SelectField>

        <div>
          <Label>Birth Certificate Number</Label>
          <Input value={form.birthCertificateNumber} onChange={e => set('birthCertificateNumber', e.target.value)} placeholder="e.g. BC/2012/123456" />
        </div>

        <SelectField label="Home County" value={form.county} onChange={v => set('county', v)}>
          <option value="">Select County</option>
          {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
        </SelectField>

        <div>
          <Label>Sub-County</Label>
          <Input value={form.subCounty} onChange={e => set('subCounty', e.target.value)} placeholder="e.g. Westlands" />
        </div>
        <div />

        {/* Special needs */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.specialNeeds}
              onChange={e => set('specialNeeds', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-orange-700">Student has special needs / learning support requirements</span>
          </label>
        </div>
        {form.specialNeeds && (
          <div className="md:col-span-2">
            <Label>Special Needs Details</Label>
            <textarea
              value={form.specialNeedsDetails}
              onChange={e => set('specialNeedsDetails', e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe specific needs, required accommodations, assistive devices..."
            />
          </div>
        )}

        <div className="md:col-span-2">
          <Label>Medical Conditions / Allergies</Label>
          <textarea
            value={form.medicalConditions}
            onChange={e => set('medicalConditions', e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Known medical conditions, allergies, current medications..."
          />
        </div>

        {/* Emergency contact */}
        <div className="md:col-span-2 border-t pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Emergency Contact (other than parent)</p>
        </div>
        <div>
          <Label>Emergency Contact Name</Label>
          <Input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <Label>Emergency Contact Phone</Label>
          <Input value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} placeholder="e.g. 0712 345 678" />
        </div>
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {([
          { value: 'existing', label: 'Link Existing Parent' },
          { value: 'new',      label: 'Register New Parent' },
          { value: 'skip',     label: 'Add Parent Later' },
        ] as { value: ParentMode; label: string }[]).map(opt => (
          <button key={opt.value} type="button"
            onClick={() => set('parentMode', opt.value)}
            className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
              form.parentMode === opt.value
                ? opt.value === 'skip'
                  ? 'bg-gray-500 text-white border-gray-500'
                  : 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >{opt.label}</button>
        ))}
      </div>

      {form.parentMode === 'skip' && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          Parent / Guardian information will be added later. You can link a parent to this student from the Students list after admission.
        </div>
      )}

      {form.parentMode === 'existing' && (
        <div className="space-y-3">
          <div>
            <Label>Search by name or phone</Label>
            <Input
              value={parentSearch}
              onChange={e => setParentSearch(e.target.value)}
              placeholder="Type to search..."
            />
          </div>
          <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
            {filteredParents.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                {parents.length === 0 ? 'No parents registered yet — use "Register New Parent"' : 'No matches found'}
              </p>
            ) : filteredParents.map(p => (
              <div
                key={p.id}
                onClick={() => set('parentId', p.id)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  form.parentId === p.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-gray-400">{p.phone_primary}{p.relationship ? ` · ${p.relationship}` : ''}</p>
                </div>
                {form.parentId === p.id && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
              </div>
            ))}
          </div>
          {form.parentId && (() => {
            const sel = parents.find(p => p.id === form.parentId);
            return sel ? (
              <p className="text-sm text-teal-700 font-medium">✓ Selected: {sel.first_name} {sel.last_name} ({sel.phone_primary})</p>
            ) : null;
          })()}
        </div>
      )}

      {form.parentMode === 'new' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>First Name *</Label>
            <Input value={form.newParent.firstName} onChange={e => setP('firstName', e.target.value)} required />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={form.newParent.lastName} onChange={e => setP('lastName', e.target.value)} />
          </div>

          <SelectField label="Relationship *" value={form.newParent.relationship} onChange={v => setP('relationship', v)}>
            <option value="father">Father</option>
            <option value="mother">Mother</option>
            <option value="guardian">Legal Guardian</option>
            <option value="other">Other</option>
          </SelectField>

          <div>
            <Label>Occupation</Label>
            <Input value={form.newParent.occupation} onChange={e => setP('occupation', e.target.value)} placeholder="e.g. Farmer, Teacher..." />
          </div>
          <div>
            <Label>Primary Phone *</Label>
            <Input value={form.newParent.phonePrimary} onChange={e => setP('phonePrimary', e.target.value)} placeholder="0712 345 678" required />
          </div>
          <div>
            <Label>Secondary Phone</Label>
            <Input value={form.newParent.phoneSecondary} onChange={e => setP('phoneSecondary', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label>WhatsApp Number</Label>
            <Input value={form.newParent.whatsappNumber} onChange={e => setP('whatsappNumber', e.target.value)} placeholder="If different from primary" />
          </div>
          <div />

          <div className="md:col-span-2 border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Portal Access</p>
            <p className="text-xs text-gray-400 mb-3">Leave email blank if the parent will not use the parent portal</p>
          </div>
          <div>
            <Label>Parent Login Email</Label>
            <Input type="email" value={form.newParent.email} onChange={e => setP('email', e.target.value)} placeholder="parent@example.com" />
          </div>
          <div>
            <Label>Portal Password</Label>
            <Input value={form.newParent.password} onChange={e => setP('password', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Default: parent123</p>
          </div>
        </div>
      )}
    </div>
  );

  const Step4 = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Student Login Email *</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          <p className="text-xs text-gray-400 mt-1">Used to access the student portal</p>
        </div>
        <div>
          <Label>Portal Password *</Label>
          <Input value={form.password} onChange={e => set('password', e.target.value)} required />
          <p className="text-xs text-gray-400 mt-1">Default: student123</p>
        </div>
        <div>
          <Label>Student Phone</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 0712 345 678" />
        </div>
        <div />

        <div className="md:col-span-2 border-t pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Home Address</p>
        </div>
        <div className="md:col-span-2">
          <Label>Street / Postal Address</Label>
          <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address or P.O. Box" />
        </div>
        <div>
          <Label>Town / City</Label>
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <Label>County / State</Label>
          <Input value={form.state} onChange={e => set('state', e.target.value)} />
        </div>
        <div>
          <Label>Postal Code</Label>
          <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="e.g. 00100" />
        </div>
      </div>

      {/* Summary preview */}
      <div className="border rounded-lg bg-gray-50 p-4 mt-2 text-sm space-y-1">
        <p className="font-semibold text-gray-700 mb-2">Admission Summary</p>
        <p><span className="text-gray-500">Student:</span> {form.firstName} {form.lastName}</p>
        <p><span className="text-gray-500">Admission No:</span> {form.admissionNumber || 'Auto-generated'}</p>
        <p><span className="text-gray-500">Class:</span> {classes.find(c => c.id === form.classId)?.name || '—'}</p>
        <p><span className="text-gray-500">Type:</span> {form.student_type === 'boarder' ? 'Boarder' : 'Day Scholar'}{form.uses_transport ? ' · Uses Transport' : ''}</p>
        {form.county && <p><span className="text-gray-500">County:</span> {form.county}</p>}
        {form.parentMode === 'new' && form.newParent.firstName && (
          <p><span className="text-gray-500">Parent:</span> {form.newParent.firstName} {form.newParent.lastName} ({form.newParent.phonePrimary})</p>
        )}
        {form.parentMode === 'existing' && form.parentId && (() => {
          const p = parents.find(x => x.id === form.parentId);
          return p ? <p><span className="text-gray-500">Parent:</span> {p.first_name} {p.last_name}</p> : null;
        })()}
        {form.parentMode === 'skip' && <p className="text-yellow-700"><span className="text-gray-500">Parent:</span> To be added later</p>}
        {form.specialNeeds && <p className="text-orange-700">⚠ Special needs flagged</p>}
      </div>
    </div>
  );

  // Call as plain functions, NOT as JSX elements (<Step1 />) — defining components
  // inside a parent causes React to unmount/remount on every keystroke (focus lost).
  const stepBody = [null, Step1(), Step2(), Step3(), Step4()];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-lg">Student Admission Wizard</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done   = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      done   ? 'bg-teal-600 border-teal-600 text-white' :
                      active ? 'bg-white border-teal-600 text-teal-700' :
                               'bg-white border-gray-200 text-gray-300'
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : n}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight hidden sm:block max-w-[70px] ${
                      active ? 'text-teal-700' : done ? 'text-gray-600' : 'text-gray-300'
                    }`}>{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-14px] sm:mt-[-22px] ${step > n ? 'bg-teal-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={e => { if (e.key === 'Enter' && step < 4) e.preventDefault(); }}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {stepBody[step]}
          </div>

          {/* Inline error banner — visible above nav buttons */}
          {submitError && (
            <div className="mx-6 mb-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => onOpenChange(false) : () => setStep(s => s - 1)}
            >
              {step === 1 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
            </Button>

            <span className="text-xs text-gray-400">Step {step} of {STEP_LABELS.length}</span>

            {step < 4 ? (
              <Button type="button" onClick={handleNext}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 min-w-[140px]">
                {loading ? 'Submitting…' : 'Admit Student'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
