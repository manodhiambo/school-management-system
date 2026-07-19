import cron from 'node-cron';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { sendSMSViaProvider, normalisePhone } from '../routes/smsRoutes.js';

const REMINDER_MINUTES_AHEAD = 5;

// JS getDay() (0=Sunday) → the timetable's day_of_week convention (1=Monday..7=Sunday),
// same mapping the frontend dashboard already uses (TeacherDashboard.tsx getTodayClasses).
function schoolDayOfWeek(date) {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

// Reminds a teacher by SMS a few minutes before each timetable period starts —
// there was previously no mechanism at all telling a teacher "go teach class X
// now". Runs every minute and matches on the exact minute a period starts
// REMINDER_MINUTES_AHEAD from now, so each period fires exactly one SMS.
export async function sendUpcomingPeriodReminders() {
  try {
    const now = new Date();
    const target = new Date(now.getTime() + REMINDER_MINUTES_AHEAD * 60000);
    const targetHHMM = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = schoolDayOfWeek(target);

    const periods = await query(
      `SELECT tt.id, tt.room, tt.start_time,
              c.name AS class_name, c.section AS class_section,
              s.name AS subject_name,
              t.phone_primary, t.phone_secondary, t.first_name, t.last_name
       FROM timetable tt
       JOIN teachers t ON t.id = tt.teacher_id
       LEFT JOIN classes c ON c.id = tt.class_id
       LEFT JOIN subjects s ON s.id = tt.subject_id
       WHERE tt.is_active = true
         AND tt.day_of_week = $1
         AND to_char(tt.start_time, 'HH24:MI') = $2`,
      [dayOfWeek, targetHHMM]
    );

    let sent = 0;
    for (const p of periods) {
      const phone = normalisePhone(p.phone_primary || p.phone_secondary);
      if (!phone) continue;

      const className = [p.class_name, p.class_section].filter(Boolean).join(' ');
      const message = `SkulManager reminder: ${p.subject_name || 'your class'} with ${className || 'your class'} starts in ${REMINDER_MINUTES_AHEAD} min${p.room ? ` (Room ${p.room})` : ''}.`;

      const result = await sendSMSViaProvider(phone, message);
      if (result.success) sent++;
      else logger.warn(`Period reminder SMS failed for timetable ${p.id}: ${result.error}`);
    }

    if (periods.length) logger.info(`Period reminders: ${sent}/${periods.length} sent for ${targetHHMM}`);
    return sent;
  } catch (err) {
    logger.error('sendUpcomingPeriodReminders job failed:', err.message);
    return 0;
  }
}

export function startPeriodReminderJob() {
  cron.schedule('* * * * *', () => {
    sendUpcomingPeriodReminders();
  });
  logger.info(`Period reminder job scheduled (SMS ${REMINDER_MINUTES_AHEAD} min before each period, every minute)`);
}
