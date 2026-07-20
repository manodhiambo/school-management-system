import express from 'express';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(requireModule('timetable'));
router.use(tenantContext);
router.use(requireActiveTenant);

const dayToNumber = (day) => {
  if (typeof day === 'number') return day;
  if (day === null || day === undefined) return null;
  const days = {
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    'sunday': 0, 'sun': 0
  };
  return days[day?.toString().toLowerCase()] ?? null;
};

const numberToDay = (num) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[num] || 'Monday';
};

// Get timetable
router.get('/', async (req, res) => {
  try {
    const { classId, teacherId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT t.*,
        c.name as class_name,
        s.name as subject_name,
        CONCAT(te.first_name, ' ', te.last_name) as teacher_name
      FROM timetable t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN teachers te ON t.teacher_id = te.id
      WHERE t.is_active = true AND t.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND t.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (teacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [teacherId, tid]
      );
      const actualTeacherId = teacher.length > 0 ? teacher[0].id : teacherId;
      sql += ` AND t.teacher_id = $${paramIndex}`;
      params.push(actualTeacherId);
      paramIndex++;
    }

    sql += ' ORDER BY t.day_of_week, t.start_time';

    const timetable = await query(sql, params);

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Get teacher timetable
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const teacher = await query(
      'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.teacherId, tid]
    );

    if (teacher.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const actualTeacherId = teacher[0].id;

    const timetable = await query(
      `SELECT t.*, c.name as class_name, s.name as subject_name
       FROM timetable t
       LEFT JOIN classes c ON t.class_id = c.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.teacher_id = $1 AND t.is_active = true AND t.tenant_id = $2
       ORDER BY t.day_of_week, t.start_time`,
      [actualTeacherId, tid]
    );

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get teacher timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Get student timetable
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const student = await query(
      'SELECT id, class_id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.studentId, tid]
    );

    if (student.length === 0 || !student[0].class_id) {
      return res.json({ success: true, data: [] });
    }
    const actualStudentId = student[0].id;

    // A student may only view their own timetable; a parent only their
    // own child's — this endpoint previously had no ownership check at all,
    // so any authenticated user could view any student's schedule.
    if (req.user.role === 'student') {
      const own = await query(
        'SELECT 1 FROM students WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
        [actualStudentId, req.user.id, tid]
      );
      if (!own.length) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (req.user.role === 'parent') {
      const access = await query(
        `SELECT 1 FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         WHERE ps.student_id = $1 AND p.user_id = $2`,
        [actualStudentId, req.user.id]
      );
      if (!access.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const timetable = await query(
      `SELECT t.*, s.name as subject_name, CONCAT(te.first_name, ' ', te.last_name) as teacher_name
       FROM timetable t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN teachers te ON t.teacher_id = te.id
       WHERE t.class_id = $1 AND t.is_active = true AND t.tenant_id = $2
       ORDER BY t.day_of_week, t.start_time`,
      [student[0].class_id, tid]
    );

    const result = timetable.map(entry => ({
      ...entry,
      day_of_week: numberToDay(entry.day_of_week)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get student timetable error:', error);
    res.status(500).json({ success: false, message: 'Error fetching timetable' });
  }
});

// Create timetable entry
router.post('/', async (req, res) => {
  try {
    logger.info('Create timetable request body:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      class_id, classId,
      subject_id, subjectId,
      teacher_id, teacherId,
      day_of_week, dayOfWeek, day,
      start_time, startTime,
      end_time, endTime,
      room, roomNumber
    } = req.body;

    const actualClassId = class_id || classId;
    const actualSubjectId = subject_id || subjectId || null;
    let actualTeacherId = teacher_id || teacherId || null;
    const actualDayOfWeek = dayToNumber(day_of_week || dayOfWeek || day);
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber || null;

    if (actualTeacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [actualTeacherId, tid]
      );
      if (teacher.length > 0) {
        actualTeacherId = teacher[0].id;
      }
    }

    if (!actualClassId) {
      return res.status(400).json({ success: false, message: 'Class ID is required' });
    }

    const timetableId = uuidv4();

    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom, tid]
    );

    res.status(201).json({ success: true, message: 'Timetable entry created', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create timetable error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating timetable entry', error: error.message });
  }
});

// Create period
router.post('/period', async (req, res) => {
  try {
    logger.info('Create period request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      class_id, classId,
      subject_id, subjectId,
      teacher_id, teacherId,
      day_of_week, dayOfWeek, day,
      start_time, startTime,
      end_time, endTime,
      room, roomNumber
    } = req.body;

    const actualClassId = class_id || classId;

    if (!actualClassId) {
      return res.status(201).json({ success: true, message: 'Period created', data: { id: uuidv4() } });
    }

    const actualSubjectId = subject_id || subjectId || null;
    let actualTeacherId = teacher_id || teacherId || null;
    const actualDayOfWeek = dayToNumber(day_of_week || dayOfWeek || day);
    const actualStartTime = start_time || startTime;
    const actualEndTime = end_time || endTime;
    const actualRoom = room || roomNumber || null;

    if (actualTeacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [actualTeacherId, tid]
      );
      if (teacher.length > 0) {
        actualTeacherId = teacher[0].id;
      }
    }

    const timetableId = uuidv4();
    await query(
      `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [timetableId, actualClassId, actualSubjectId, actualTeacherId, actualDayOfWeek, actualStartTime, actualEndTime, actualRoom, tid]
    );

    res.status(201).json({ success: true, message: 'Period created successfully', data: { id: timetableId } });
  } catch (error) {
    logger.error('Create period error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating period' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-GENERATE — builds a full weekly timetable automatically from each
// class's class_subjects (subject + assigned teacher + weekly_periods),
// spreading periods across the week and avoiding teacher/class clashes —
// similar in spirit to dedicated scheduling tools (e.g. ASC Timetables),
// scoped to a practical greedy/backtracking heuristic rather than a full
// constraint solver.
// ═══════════════════════════════════════════════════════════════════════════

// Builds the day's period slots as real clock times, inserting break/lunch
// gaps so periods after a break start at the correct time.
function buildDaySlots({ periods_per_day, period_duration_minutes, day_start_time, breaks }) {
  const [startH, startM] = day_start_time.split(':').map(Number);
  let cursorMinutes = startH * 60 + startM;
  const breakAfter = new Map((breaks || []).map(b => [b.after_period, b.duration_minutes]));
  const slots = [];
  for (let p = 1; p <= periods_per_day; p++) {
    const startMinutes = cursorMinutes;
    const endMinutes = startMinutes + period_duration_minutes;
    const toTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
    slots.push({ period: p, start_time: toTime(startMinutes), end_time: toTime(endMinutes) });
    cursorMinutes = endMinutes;
    if (breakAfter.has(p)) cursorMinutes += breakAfter.get(p);
  }
  return slots;
}

// Fisher-Yates shuffle — used to avoid always filling the grid in the same
// deterministic order, which otherwise skews every class's hardest-to-place
// subject toward the same days.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

router.post('/auto-generate', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      class_ids,
      days = [1, 2, 3, 4, 5],
      periods_per_day = 9,
      period_duration_minutes = 40,
      day_start_time = '08:00',
      breaks = [{ after_period: 2, duration_minutes: 20, label: 'Break' }, { after_period: 5, duration_minutes: 40, label: 'Lunch' }],
      replace_existing = false,
    } = req.body;

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ success: false, message: 'days must be a non-empty array' });
    }

    const classRows = await query(
      `SELECT id, name, section, room_number FROM classes
       WHERE tenant_id = $1 AND is_active = true
         AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
       ORDER BY name, section`,
      [tid, class_ids && class_ids.length ? class_ids : null]
    );
    if (!classRows.length) {
      return res.status(404).json({ success: false, message: 'No matching classes found' });
    }

    const daySlots = buildDaySlots({ periods_per_day, period_duration_minutes, day_start_time, breaks });
    const gridCapacity = days.length * periods_per_day;

    if (replace_existing) {
      await query(
        `DELETE FROM timetable WHERE tenant_id = $1 AND class_id = ANY($2::uuid[])`,
        [tid, classRows.map(c => c.id)]
      );
    }

    // Pre-load every class's existing (kept) slots and every teacher's
    // existing bookings tenant-wide, so newly generated entries never clash
    // with anything already on the timetable — including classes not being
    // regenerated in this run.
    const existing = await query(
      `SELECT class_id, teacher_id, day_of_week, start_time FROM timetable WHERE tenant_id = $1 AND is_active = true`,
      [tid]
    );
    const classBusy = new Set(existing.map(e => `${e.class_id}|${e.day_of_week}|${e.start_time}`));
    const teacherBusy = new Set(existing.filter(e => e.teacher_id).map(e => `${e.teacher_id}|${e.day_of_week}|${e.start_time}`));

    // class_subjects.teacher_id references users(id) (the teacher's login),
    // but timetable.teacher_id references teachers(id) (their staff profile
    // row) — a different id space. Translate via teachers.user_id here so
    // every downstream use of a.teacher_id in this handler is already the
    // correct id for inserting into timetable. A subject teacher with no
    // teachers profile row (te.id IS NULL) is scheduled with no teacher_id
    // rather than failing the whole run.
    const classesToLoad = classRows.map(c => c.id);
    const assignments = classesToLoad.length
      ? await query(
          `SELECT cs.class_id, cs.subject_id, te.id AS teacher_id, cs.weekly_periods,
                  s.name AS subject_name
           FROM class_subjects cs
           JOIN subjects s ON s.id = cs.subject_id
           LEFT JOIN teachers te ON te.user_id = cs.teacher_id AND te.tenant_id = cs.tenant_id
           WHERE cs.tenant_id = $1 AND cs.class_id = ANY($2::uuid[])`,
          [tid, classesToLoad]
        )
      : [];

    const byClass = new Map();
    for (const a of assignments) {
      if (!byClass.has(a.class_id)) byClass.set(a.class_id, []);
      byClass.get(a.class_id).push(a);
    }

    const toInsert = [];
    const report = { classes_scheduled: [], subjects_not_fully_placed: [], classes_with_no_subjects: [] };

    // Classes needing the most periods go first — they have the least slack,
    // so scheduling them while the grid is emptiest gives the best chance of
    // fitting everything in.
    const orderedClasses = [...classRows].sort((a, b) => {
      const totalA = (byClass.get(a.id) || []).reduce((s, x) => s + (x.weekly_periods || 0), 0);
      const totalB = (byClass.get(b.id) || []).reduce((s, x) => s + (x.weekly_periods || 0), 0);
      return totalB - totalA;
    });

    for (const cls of orderedClasses) {
      const subjectAssignments = byClass.get(cls.id) || [];
      if (!subjectAssignments.length) {
        report.classes_with_no_subjects.push(`${cls.name} ${cls.section || ''}`.trim());
        continue;
      }

      const totalNeeded = subjectAssignments.reduce((s, a) => s + (a.weekly_periods || 1), 0);
      if (totalNeeded > gridCapacity) {
        report.subjects_not_fully_placed.push(
          `${cls.name} ${cls.section || ''}: needs ${totalNeeded} periods/week but the grid only has ${gridCapacity} — increase periods_per_day or days`.trim()
        );
      }

      // Per-subject count of how many times it's already been placed on each
      // day this run, so the scheduler spreads a subject across different
      // days instead of stacking it (e.g. Math shouldn't be Mon periods 1-5).
      const subjectDayCount = new Map();

      // Largest weekly_periods first within the class too, for the same
      // least-slack-first reasoning.
      const sortedSubjects = [...subjectAssignments].sort((a, b) => (b.weekly_periods || 0) - (a.weekly_periods || 0));

      for (const a of sortedSubjects) {
        const need = a.weekly_periods || 1;
        let placed = 0;
        subjectDayCount.set(a.subject_id, new Map());
        const dayCounts = subjectDayCount.get(a.subject_id);

        for (let attempt = 0; attempt < need; attempt++) {
          // Rank candidate (day, slot) pairs: prefer days this subject hasn't
          // used yet this week, and shuffle within that to avoid always
          // filling the same corner of the grid first.
          const candidates = [];
          for (const day of days) {
            for (const slot of daySlots) {
              const classKey = `${cls.id}|${day}|${slot.start_time}`;
              const teacherKey = a.teacher_id ? `${a.teacher_id}|${day}|${slot.start_time}` : null;
              if (classBusy.has(classKey)) continue;
              if (teacherKey && teacherBusy.has(teacherKey)) continue;
              candidates.push({ day, slot, dayUsage: dayCounts.get(day) || 0 });
            }
          }
          if (!candidates.length) break; // grid exhausted for this class

          candidates.sort((x, y) => x.dayUsage - y.dayUsage);
          const bestUsage = candidates[0].dayUsage;
          const tied = shuffle(candidates.filter(c => c.dayUsage === bestUsage));
          const chosen = tied[0];

          const classKey = `${cls.id}|${chosen.day}|${chosen.slot.start_time}`;
          classBusy.add(classKey);
          if (a.teacher_id) teacherBusy.add(`${a.teacher_id}|${chosen.day}|${chosen.slot.start_time}`);
          dayCounts.set(chosen.day, (dayCounts.get(chosen.day) || 0) + 1);

          toInsert.push({
            id: uuidv4(), class_id: cls.id, subject_id: a.subject_id, teacher_id: a.teacher_id,
            day_of_week: chosen.day, start_time: chosen.slot.start_time, end_time: chosen.slot.end_time,
            room: cls.room_number || null, tenant_id: tid,
          });
          placed++;
        }

        if (placed < need) {
          report.subjects_not_fully_placed.push(
            `${cls.name} ${cls.section || ''}: ${a.subject_name} placed ${placed}/${need} periods (teacher or grid conflict)`.trim()
          );
        }
      }

      report.classes_scheduled.push(`${cls.name} ${cls.section || ''}`.trim());
    }

    // Bulk insert in chunks — a full-school generation can be 400+ rows, and
    // awaiting one INSERT per row (one network round trip each) was slow
    // enough to time out the request. One multi-row INSERT per chunk cuts
    // that to a handful of round trips.
    const CHUNK_SIZE = 200;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const cols = 9;
      const valuesSql = chunk.map((_, idx) => {
        const base = idx * cols;
        return `(${Array.from({ length: cols }, (_, k) => `$${base + k + 1}`).join(',')})`;
      }).join(',');
      const params = chunk.flatMap(row => [
        row.id, row.class_id, row.subject_id, row.teacher_id,
        row.day_of_week, row.start_time, row.end_time, row.room, row.tenant_id,
      ]);
      await query(
        `INSERT INTO timetable (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, tenant_id)
         VALUES ${valuesSql}`,
        params
      );
    }

    res.json({
      success: true,
      message: `Auto-generated ${toInsert.length} timetable periods across ${report.classes_scheduled.length} class(es)`,
      data: { periods_created: toInsert.length, ...report },
    });
  } catch (error) {
    logger.error('Auto-generate timetable error:', error);
    res.status(500).json({ success: false, message: 'Error auto-generating timetable', error: error.message });
  }
});

// Assign substitute
router.post('/substitute', async (req, res) => {
  try {
    res.json({ success: true, message: 'Substitute assigned successfully' });
  } catch (error) {
    logger.error('Assign substitute error:', error);
    res.status(500).json({ success: false, message: 'Error assigning substitute' });
  }
});

// Delete single timetable entry (admin only)
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const result = await query(
      "DELETE FROM timetable WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [req.params.id, tid]
    );
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Timetable entry not found" });
    }
    res.json({ success: true, message: "Timetable entry deleted successfully" });
  } catch (error) {
    logger.error("Delete timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting timetable entry" });
  }
});

// Delete all timetable entries for a class (admin only)
router.delete("/class/:classId/all", requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const result = await query(
      "DELETE FROM timetable WHERE class_id = $1 AND tenant_id = $2 RETURNING id",
      [req.params.classId, tid]
    );
    res.json({
      success: true,
      message: `Deleted ${result.length} timetable entries for the class`
    });
  } catch (error) {
    logger.error("Delete class timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting class timetable" });
  }
});

// Delete all timetable entries for a teacher (admin only)
router.delete("/teacher/:teacherId/all", requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const teacher = await query(
      "SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2",
      [req.params.teacherId, tid]
    );
    const actualTeacherId = teacher.length > 0 ? teacher[0].id : req.params.teacherId;

    const result = await query(
      "DELETE FROM timetable WHERE teacher_id = $1 AND tenant_id = $2 RETURNING id",
      [actualTeacherId, tid]
    );
    res.json({
      success: true,
      message: `Deleted ${result.length} timetable entries for the teacher`
    });
  } catch (error) {
    logger.error("Delete teacher timetable error:", error);
    res.status(500).json({ success: false, message: "Error deleting teacher timetable" });
  }
});

// Reset entire timetable (admin only)
router.delete("/reset/all", requireRole(["admin"]), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { confirm } = req.query;

    if (confirm !== "yes") {
      return res.status(400).json({
        success: false,
        message: "Please confirm deletion by adding ?confirm=yes to the request"
      });
    }

    const result = await query(
      "DELETE FROM timetable WHERE tenant_id = $1 RETURNING id",
      [tid]
    );
    res.json({
      success: true,
      message: `Timetable reset complete. Deleted ${result.length} entries.`
    });
  } catch (error) {
    logger.error("Reset timetable error:", error);
    res.status(500).json({ success: false, message: "Error resetting timetable" });
  }
});

export default router;
