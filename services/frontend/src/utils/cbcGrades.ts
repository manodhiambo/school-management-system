export const EDUCATION_LEVELS = [
  { value: 'playgroup', label: 'Playgroup', ageRange: '2-3 years', gradeScale: 'WD/D/B' },
  { value: 'pre_primary', label: 'Pre-Primary', ageRange: '3-5 years', gradeScale: 'WD/D/B' },
  { value: 'lower_primary', label: 'Lower Primary (Grades 1-3)', ageRange: '6-8 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'upper_primary', label: 'Upper Primary (Grades 4-6)', ageRange: '9-11 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'junior_secondary', label: 'Junior Secondary (Grades 7-9)', ageRange: '12-14 years', gradeScale: 'EE1-BE2 (8-level KJSEA)' },
  { value: 'senior_secondary', label: 'Senior Secondary (Grades 10-12)', ageRange: '15-17 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'university', label: 'University', ageRange: '18+ years', gradeScale: 'First Class/Second Upper/Second Lower/Pass/Fail' },
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number]['value'];

export function computeCBEGrade(percentage: number, educationLevel: string): string {
  if (['playgroup', 'pre_primary'].includes(educationLevel)) {
    if (percentage >= 75) return 'WD'; // Well Developed
    if (percentage >= 40) return 'D';  // Developing
    return 'B';                         // Beginning
  }
  // Kenya 2025 KJSEA 8-level grading for Junior Secondary (Grade 7-9)
  if (educationLevel === 'junior_secondary') {
    if (percentage >= 90) return 'EE1'; // Exceeding Expectations Level 1
    if (percentage >= 75) return 'EE2'; // Exceeding Expectations Level 2
    if (percentage >= 58) return 'ME1'; // Meeting Expectations Level 1
    if (percentage >= 41) return 'ME2'; // Meeting Expectations Level 2
    if (percentage >= 31) return 'AE1'; // Approaching Expectations Level 1
    if (percentage >= 21) return 'AE2'; // Approaching Expectations Level 2
    if (percentage >= 11) return 'BE1'; // Below Expectations Level 1
    return 'BE2';                        // Below Expectations Level 2
  }
  if (educationLevel === 'university') {
    if (percentage >= 70) return 'First Class';
    if (percentage >= 60) return 'Second Upper';
    if (percentage >= 50) return 'Second Lower';
    if (percentage >= 40) return 'Pass';
    return 'Fail';
  }
  // Standard CBE for lower_primary, upper_primary, senior_secondary
  if (percentage >= 80) return 'EE'; // Exceeding Expectations
  if (percentage >= 60) return 'ME'; // Meeting Expectations
  if (percentage >= 40) return 'AE'; // Approaching Expectations
  return 'BE';                        // Below Expectations
}

export function getCBEGradeBadgeClass(grade: string): string {
  switch (grade) {
    case 'EE':
    case 'EE1':
    case 'EE2':
    case 'WD':
    case 'First Class':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ME':
    case 'ME1':
    case 'ME2':
    case 'Second Upper':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'AE':
    case 'AE1':
    case 'AE2':
    case 'D':
    case 'Second Lower':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Pass':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'BE':
    case 'BE1':
    case 'BE2':
    case 'B':
    case 'Fail':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getEducationLevelLabel(level: string): string {
  return EDUCATION_LEVELS.find(l => l.value === level)?.label || level;
}

export function getGradingScale(educationLevel: string) {
  if (['playgroup', 'pre_primary'].includes(educationLevel)) {
    return [
      { grade: 'WD', label: 'Well Developed', min: 75, max: 100 },
      { grade: 'D', label: 'Developing', min: 40, max: 74 },
      { grade: 'B', label: 'Beginning', min: 0, max: 39 },
    ];
  }
  if (educationLevel === 'junior_secondary') {
    return [
      { grade: 'EE1', label: 'Exceeding Expectations Level 1', min: 90, max: 100 },
      { grade: 'EE2', label: 'Exceeding Expectations Level 2', min: 75, max: 89 },
      { grade: 'ME1', label: 'Meeting Expectations Level 1', min: 58, max: 74 },
      { grade: 'ME2', label: 'Meeting Expectations Level 2', min: 41, max: 57 },
      { grade: 'AE1', label: 'Approaching Expectations Level 1', min: 31, max: 40 },
      { grade: 'AE2', label: 'Approaching Expectations Level 2', min: 21, max: 30 },
      { grade: 'BE1', label: 'Below Expectations Level 1', min: 11, max: 20 },
      { grade: 'BE2', label: 'Below Expectations Level 2', min: 0, max: 10 },
    ];
  }
  if (educationLevel === 'university') {
    return [
      { grade: 'First Class', label: 'First Class Honours', min: 70, max: 100 },
      { grade: 'Second Upper', label: 'Second Class Upper', min: 60, max: 69 },
      { grade: 'Second Lower', label: 'Second Class Lower', min: 50, max: 59 },
      { grade: 'Pass', label: 'Pass', min: 40, max: 49 },
      { grade: 'Fail', label: 'Fail', min: 0, max: 39 },
    ];
  }
  // lower_primary, upper_primary, senior_secondary
  return [
    { grade: 'EE', label: 'Exceeds Expectation', min: 80, max: 100 },
    { grade: 'ME', label: 'Meets Expectation', min: 60, max: 79 },
    { grade: 'AE', label: 'Approaches Expectation', min: 40, max: 59 },
    { grade: 'BE', label: 'Below Expectation', min: 0, max: 39 },
  ];
}
