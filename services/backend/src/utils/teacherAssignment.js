import { query } from '../config/database.js';

// Shared assignment checks used to scope teacher-facing write endpoints
// (results entry, attendance) to only the classes/subjects a teacher is
// actually assigned to. Mirrors the resolution logic in teacherService.js
// getTeacherClasses(): a teacher is tied to a class either as the homeroom
// "class teacher" (teachers.class_id) or as a per-subject teacher
// (class_subjects.teacher_id, which references users.id).

// True if this user is the homeroom/class teacher for classId.
export async function isClassTeacher(userId, classId, tenantId) {
  if (!classId) return false;
  const rows = await query(
    'SELECT 1 FROM teachers WHERE user_id = $1 AND class_id = $2 AND tenant_id = $3',
    [userId, classId, tenantId]
  );
  return rows.length > 0;
}

// True if this user teaches subjectId in classId (class_subjects assignment).
export async function isSubjectTeacher(userId, classId, subjectId, tenantId) {
  if (!classId || !subjectId) return false;
  const rows = await query(
    'SELECT 1 FROM class_subjects WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3 AND tenant_id = $4',
    [userId, classId, subjectId, tenantId]
  );
  return rows.length > 0;
}

// True if this user has ANY assignment to classId — class teacher, or
// subject teacher for at least one subject in that class.
export async function isAssignedToClass(userId, classId, tenantId) {
  if (!classId) return false;
  const rows = await query(
    `SELECT 1 FROM teachers WHERE user_id = $1 AND class_id = $2 AND tenant_id = $3
     UNION
     SELECT 1 FROM class_subjects WHERE teacher_id = $1 AND class_id = $2 AND tenant_id = $3`,
    [userId, classId, tenantId]
  );
  return rows.length > 0;
}

// Class-teacher status grants marking rights for every subject in the class;
// otherwise the teacher must be specifically assigned to that subject.
export async function canGradeSubject(userId, classId, subjectId, tenantId) {
  if (await isClassTeacher(userId, classId, tenantId)) return true;
  if (!subjectId) return false;
  return isSubjectTeacher(userId, classId, subjectId, tenantId);
}
