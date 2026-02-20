import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp, GraduationCap, Users } from 'lucide-react';
import api from '@/services/api';
import { EDUCATION_LEVELS, getGradingScale } from '@/utils/cbcGrades';

interface LevelInfo {
  value: string;
  label: string;
  ageRange: string;
  gradeScale: string;
  subjects: string[];
  classCount: number;
}

export function CurriculumPage() {
  const [classCountByLevel, setClassCountByLevel] = useState<Record<string, number>>({});
  const [subjectsByLevel, setSubjectsByLevel] = useState<Record<string, string[]>>({});
  const [openLevel, setOpenLevel] = useState<string | null>('lower_primary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesRes, subjectsRes]: any[] = await Promise.all([
        api.getClasses(), api.getSubjects()
      ]);
      const classes: any[] = classesRes.data || classesRes || [];
      const subjects: any[] = subjectsRes.data || subjectsRes || [];

      const counts: Record<string, number> = {};
      for (const c of classes) {
        if (c.education_level) {
          counts[c.education_level] = (counts[c.education_level] || 0) + 1;
        }
      }
      setClassCountByLevel(counts);

      const byLevel: Record<string, string[]> = {};
      for (const s of subjects) {
        if (s.education_level) {
          if (!byLevel[s.education_level]) byLevel[s.education_level] = [];
          byLevel[s.education_level].push(s.name);
        }
      }
      setSubjectsByLevel(byLevel);
    } catch { /* silent */ }
    setLoading(false);
  };

  const cbcLevelDescriptions: Record<string, string> = {
    playgroup: 'Early childhood care and education for the youngest learners. Focus on play-based learning, social skills, and basic motor development.',
    pre_primary: 'Pre-Primary 1 & 2. Introduces structured learning through play, language development, numeracy awareness, and creativity.',
    lower_primary: 'Grades 1–3. Core subjects including Literacy, Kiswahili, English, Mathematics, Environmental Activities, Creative Arts, and Physical Education.',
    upper_primary: 'Grades 4–6. Expands to Science & Technology, Social Studies, Religious Education, Home Science, Agriculture, and Life Skills.',
    junior_secondary: 'Grades 7–9. Introduces specialization tracks: Arts & Sports, Social Sciences, STEM. Students begin career pathway exploration.',
    senior_secondary: 'Grades 10–12. Three career pathways: Arts & Sports Science, Social Sciences, STEM. Prepares students for university/TVET.',
    university: 'Degree and postgraduate programmes. Graded using standard university classification system.'
  };

  const coreSubjectsByLevel: Record<string, string[]> = {
    playgroup: ['Play Activities', 'Language Activities', 'Psychomotor & Creative Activities', 'Religious Education Activities'],
    pre_primary: ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Creative Activities', 'Religious Education Activities', 'Movement & Creative Activities'],
    lower_primary: ['Literacy', 'Kiswahili Language', 'English Language', 'Mathematical Activities', 'Environmental Activities', 'Creative Arts', 'Religious Education', 'Physical & Health Education'],
    upper_primary: ['English Language', 'Kiswahili Language', 'Mathematics', 'Science & Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Agriculture', 'Home Science', 'Physical & Health Education', 'Life Skills'],
    junior_secondary: ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts', 'Agriculture', 'Home Science', 'Physical Education', 'Life Skills', 'Computer Science'],
    senior_secondary: ['English', 'Kiswahili', 'Mathematics', 'Pathway-specific subjects (Arts/Social Sciences/STEM)'],
    university: ['Programme-specific courses', 'Common University Courses (CUC)']
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
        <h2 className="text-3xl font-bold">Kenya CBC Curriculum</h2>
        <p className="text-gray-500">Competency-Based Curriculum structure — Playgroup to University</p>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <GraduationCap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{EDUCATION_LEVELS.length}</p>
            <p className="text-sm text-blue-700">Education Levels</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {Object.values(classCountByLevel).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-sm text-green-700">Total Classes</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">3</p>
            <p className="text-sm text-purple-700">Grading Systems</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">2-25+</p>
            <p className="text-sm text-orange-700">Age Range (years)</p>
          </CardContent>
        </Card>
      </div>

      {/* Accordion for each level */}
      <div className="space-y-3">
        {EDUCATION_LEVELS.map(level => {
          const isOpen = openLevel === level.value;
          const classCount = classCountByLevel[level.value] || 0;
          const schoolSubjects = subjectsByLevel[level.value] || [];
          const defaultSubjects = coreSubjectsByLevel[level.value] || [];
          const gradingScale = getGradingScale(level.value);

          const levelColors: Record<string, string> = {
            playgroup: 'bg-pink-50 border-pink-200',
            pre_primary: 'bg-yellow-50 border-yellow-200',
            lower_primary: 'bg-green-50 border-green-200',
            upper_primary: 'bg-teal-50 border-teal-200',
            junior_secondary: 'bg-blue-50 border-blue-200',
            senior_secondary: 'bg-indigo-50 border-indigo-200',
            university: 'bg-purple-50 border-purple-200',
          };

          return (
            <Card key={level.value} className={`border-2 ${levelColors[level.value] || ''}`}>
              <button
                className="w-full text-left"
                onClick={() => setOpenLevel(isOpen ? null : level.value)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-gray-600" />
                      <div>
                        <CardTitle className="text-base">{level.label}</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">Age: {level.ageRange} · Grading: {level.gradeScale}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {classCount > 0 && (
                        <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-600">
                          {classCount} {classCount === 1 ? 'class' : 'classes'} in school
                        </span>
                      )}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="pt-0 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-600">{cbcLevelDescriptions[level.value]}</p>

                  {/* Grading scale */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Grading Scale</h4>
                    <div className="flex flex-wrap gap-2">
                      {gradingScale.map(g => (
                        <div key={g.grade} className="text-xs border rounded-lg px-3 py-1.5 bg-white">
                          <span className="font-bold">{g.grade}</span>
                          <span className="text-gray-500 ml-1">{g.label} ({g.min}–{g.max}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Core Subjects
                      {schoolSubjects.length > 0 && (
                        <span className="text-xs text-blue-600 ml-2 font-normal">({schoolSubjects.length} configured in school)</span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(schoolSubjects.length > 0 ? schoolSubjects : defaultSubjects).map(sub => (
                        <span key={sub} className="text-xs bg-white border rounded-full px-3 py-1 text-gray-700">
                          {sub}
                        </span>
                      ))}
                    </div>
                    {schoolSubjects.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">* Default CBC subjects shown. Configure subjects in Academic settings.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
