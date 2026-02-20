export const EDUCATION_LEVELS = [
  { value: 'playgroup', label: 'Playgroup', ageRange: '2-3 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'pre_primary', label: 'Pre-Primary', ageRange: '3-5 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'lower_primary', label: 'Lower Primary (Grades 1-3)', ageRange: '6-8 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'upper_primary', label: 'Upper Primary (Grades 4-6)', ageRange: '9-11 years', gradeScale: 'EE/ME/AE/BE' },
  { value: 'junior_secondary', label: 'Junior Secondary (Grades 7-9)', ageRange: '12-14 years', gradeScale: 'A/B/C/D/E' },
  { value: 'senior_secondary', label: 'Senior Secondary (Grades 10-12)', ageRange: '15-17 years', gradeScale: 'A/B/C/D/E' },
  { value: 'university', label: 'University', ageRange: '18+ years', gradeScale: 'First Class/Second Upper/Second Lower/Pass/Fail' },
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number]['value'];

export function computeCBCGrade(percentage: number, educationLevel: string): string {
  if (['playgroup', 'pre_primary', 'lower_primary', 'upper_primary'].includes(educationLevel)) {
    if (percentage >= 75) return 'EE';
    if (percentage >= 50) return 'ME';
    if (percentage >= 25) return 'AE';
    return 'BE';
  }
  if (['junior_secondary', 'senior_secondary'].includes(educationLevel)) {
    if (percentage >= 75) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 35) return 'D';
    return 'E';
  }
  // university
  if (percentage >= 70) return 'First Class';
  if (percentage >= 60) return 'Second Upper';
  if (percentage >= 50) return 'Second Lower';
  if (percentage >= 40) return 'Pass';
  return 'Fail';
}

export function getCBCGradeBadgeClass(grade: string): string {
  switch (grade) {
    case 'EE':
    case 'A':
    case 'First Class':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ME':
    case 'B':
    case 'Second Upper':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'AE':
    case 'C':
    case 'Second Lower':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'D':
    case 'Pass':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'BE':
    case 'E':
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
  if (['playgroup', 'pre_primary', 'lower_primary', 'upper_primary'].includes(educationLevel)) {
    return [
      { grade: 'EE', label: 'Exceeds Expectation', min: 75, max: 100 },
      { grade: 'ME', label: 'Meets Expectation', min: 50, max: 74 },
      { grade: 'AE', label: 'Approaches Expectation', min: 25, max: 49 },
      { grade: 'BE', label: 'Below Expectation', min: 0, max: 24 },
    ];
  }
  if (['junior_secondary', 'senior_secondary'].includes(educationLevel)) {
    return [
      { grade: 'A', label: 'Excellent', min: 75, max: 100 },
      { grade: 'B', label: 'Good', min: 60, max: 74 },
      { grade: 'C', label: 'Average', min: 50, max: 59 },
      { grade: 'D', label: 'Below Average', min: 35, max: 49 },
      { grade: 'E', label: 'Poor', min: 0, max: 34 },
    ];
  }
  return [
    { grade: 'First Class', label: 'First Class Honours', min: 70, max: 100 },
    { grade: 'Second Upper', label: 'Second Class Upper', min: 60, max: 69 },
    { grade: 'Second Lower', label: 'Second Class Lower', min: 50, max: 59 },
    { grade: 'Pass', label: 'Pass', min: 40, max: 49 },
    { grade: 'Fail', label: 'Fail', min: 0, max: 39 },
  ];
}
