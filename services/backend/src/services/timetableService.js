import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class TimetableService {
  // ==================== PERIODS ====================
  async createPeriod(periodData) {
    const { name, periodNumber, startTime, endTime, isBreak } = periodData;

    // Check if period number already exists
    const existing = await query(
      'SELECT * FROM periods WHERE period_number = ?',
      [periodNumber]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Period number already exists');
    }

    const periodId = uuidv4();
    await query(
      `INSERT INTO periods (id, name, period_number, start_time, end_time, is_break, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [periodId, name, periodNumber, startTime, endTime, isBreak]
    );

    logger.info(`Period created: ${name}`);

    return await query('SELECT * FROM periods WHERE id = ?', [periodId]);
  }

  async getPeriods() {
    const periods = await query(
      'SELECT * FROM periods WHERE is_active = TRUE ORDER BY period_number'
    );
    return periods;
  }

  async updatePeriod(id, updateData) {
    const { name, startTime, endTime, isBreak, isActive } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (startTime !== undefined) {
      updateFields.push('start_time = ?');
      updateValues.push(startTime);
    }
    if (endTime !== undefined) {
      updateFields.push('end_time = ?');
      updateValues.push(endTime);
    }
    if (isBreak !== undefined) {
      updateFields.push('is_break = ?');
      updateValues.push(isBreak);
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }

    updateValues.push(id);

    await query(
      `UPDATE periods SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Period updated: ${id}`);

    return await query('SELECT * FROM periods WHERE id = ?', [id]);
  }

  // ==================== ROOMS ====================
  async createRoom(roomData) {
    const { roomNumber, roomName, building, floor, capacity, roomType, facilities } = roomData;

    // Check if room number already exists
    const existing = await query(
      'SELECT * FROM rooms WHERE room_number = ?',
      [roomNumber]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Room number already exists');
    }

    const roomId = uuidv4();
    await query(
      `INSERT INTO rooms (id, room_number, room_name, building, floor, capacity, room_type, facilities, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [roomId, roomNumber, roomName, building, floor, capacity, roomType, JSON.stringify(facilities)]
    );

    logger.info(`Room created: ${roomNumber}`);

    return await query('SELECT * FROM rooms WHERE id = ?', [roomId]);
  }

  async getRooms(filters = {}) {
    const { roomType, isActive } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (roomType) {
      whereConditions.push('room_type = ?');
      queryParams.push(roomType);
    }

    if (isActive !== undefined) {
      whereConditions.push('is_active = ?');
      queryParams.push(isActive);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const rooms = await query(
      `SELECT * FROM rooms ${whereClause} ORDER BY room_number`,
      queryParams
    );

    return rooms;
  }

  // ==================== TIMETABLE ====================
  async createTimetableEntry(entryData) {
    const {
      classId,
      subjectId,
      teacherId,
      periodId,
      roomId,
      dayOfWeek,
      academicYear
    } = entryData;

    // Check for conflicts
    await this.checkConflicts(classId, teacherId, roomId, periodId, dayOfWeek, academicYear);

    const entryId = uuidv4();
    await query(
      `INSERT INTO timetable (
        id, class_id, subject_id, teacher_id, period_id, room_id,
        day_of_week, academic_year, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [entryId, classId, subjectId, teacherId, periodId, roomId, dayOfWeek, academicYear]
    );

    logger.info(`Timetable entry created for class ${classId}`);

    return await this.getTimetableEntryById(entryId);
  }

  async checkConflicts(classId, teacherId, roomId, periodId, dayOfWeek, academicYear, excludeId = null) {
    let excludeClause = excludeId ? 'AND id != ?' : '';
    let params = excludeId 
      ? [dayOfWeek, periodId, academicYear, classId, excludeId]
      : [dayOfWeek, periodId, academicYear, classId];

    // Check class conflict
    const classConflict = await query(
      `SELECT * FROM timetable 
       WHERE day_of_week = ? AND period_id = ? AND academic_year = ? AND class_id = ? AND is_active = TRUE ${excludeClause}`,
      params
    );

    if (classConflict.length > 0) {
      throw new ApiError(400, 'Class already has a period scheduled at this time');
    }

    // Check teacher conflict
    params = excludeId 
      ? [dayOfWeek, periodId, academicYear, teacherId, excludeId]
      : [dayOfWeek, periodId, academicYear, teacherId];

    const teacherConflict = await query(
      `SELECT * FROM timetable 
       WHERE day_of_week = ? AND period_id = ? AND academic_year = ? AND teacher_id = ? AND is_active = TRUE ${excludeClause}`,
      params
    );

    if (teacherConflict.length > 0) {
      throw new ApiError(400, 'Teacher already has a class scheduled at this time');
    }

    // Check room conflict
    if (roomId) {
      params = excludeId 
        ? [dayOfWeek, periodId, academicYear, roomId, excludeId]
        : [dayOfWeek, periodId, academicYear, roomId];

      const roomConflict = await query(
        `SELECT * FROM timetable 
         WHERE day_of_week = ? AND period_id = ? AND academic_year = ? AND room_id = ? AND is_active = TRUE ${excludeClause}`,
        params
      );

      if (roomConflict.length > 0) {
        throw new ApiError(400, 'Room already occupied at this time');
      }
    }
  }

  async getTimetableEntryById(id) {
    const results = await query(
      `SELECT 
        t.*,
        c.name as class_name,
        c.section as section_name,
        s.name as subject_name,
        s.code as subject_code,
        te.first_name as teacher_first_name,
        te.last_name as teacher_last_name,
        p.name as period_name,
        p.start_time,
        p.end_time,
        r.room_number,
        r.room_name
       FROM timetable t
       JOIN classes c ON t.class_id = c.id
       JOIN subjects s ON t.subject_id = s.id
       JOIN teachers te ON t.teacher_id = te.id
       JOIN periods p ON t.period_id = p.id
       LEFT JOIN rooms r ON t.room_id = r.id
       WHERE t.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Timetable entry not found');
    }

    return results[0];
  }

  async getTimetable(filters = {}) {
    const { classId, teacherId, roomId, dayOfWeek, academicYear } = filters;

    let whereConditions = ['t.is_active = TRUE'];
    let queryParams = [];

    if (classId) {
      whereConditions.push('t.class_id = ?');
      queryParams.push(classId);
    }

    if (teacherId) {
      whereConditions.push('t.teacher_id = ?');
      queryParams.push(teacherId);
    }

    if (roomId) {
      whereConditions.push('t.room_id = ?');
      queryParams.push(roomId);
    }

    if (dayOfWeek) {
      whereConditions.push('t.day_of_week = ?');
      queryParams.push(dayOfWeek);
    }

    if (academicYear) {
      whereConditions.push('t.academic_year = ?');
      queryParams.push(academicYear);
    }

    const whereClause = whereConditions.join(' AND ');

    const timetable = await query(
      `SELECT 
        t.*,
        c.name as class_name,
        c.section as section_name,
        s.name as subject_name,
        s.code as subject_code,
        te.first_name as teacher_first_name,
        te.last_name as teacher_last_name,
        p.name as period_name,
        p.period_number,
        p.start_time,
        p.end_time,
        p.is_break,
        r.room_number,
        r.room_name
       FROM timetable t
       JOIN classes c ON t.class_id = c.id
       JOIN subjects s ON t.subject_id = s.id
       JOIN teachers te ON t.teacher_id = te.id
       JOIN periods p ON t.period_id = p.id
       LEFT JOIN rooms r ON t.room_id = r.id
       WHERE ${whereClause}
       ORDER BY 
         FIELD(t.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
         p.period_number`,
      queryParams
    );

    return timetable;
  }

  async updateTimetableEntry(id, updateData) {
    const entry = await this.getTimetableEntryById(id);

    const {
      subjectId,
      teacherId,
      roomId,
      periodId,
      dayOfWeek
    } = updateData;

    // Check conflicts if changing time/teacher/room
    if (teacherId || roomId || periodId || dayOfWeek) {
      await this.checkConflicts(
        entry.class_id,
        teacherId || entry.teacher_id,
        roomId !== undefined ? roomId : entry.room_id,
        periodId || entry.period_id,
        dayOfWeek || entry.day_of_week,
        entry.academic_year,
        id
      );
    }

    const updateFields = [];
    const updateValues = [];

    if (subjectId !== undefined) {
      updateFields.push('subject_id = ?');
      updateValues.push(subjectId);
    }
    if (teacherId !== undefined) {
      updateFields.push('teacher_id = ?');
      updateValues.push(teacherId);
    }
    if (roomId !== undefined) {
      updateFields.push('room_id = ?');
      updateValues.push(roomId);
    }
    if (periodId !== undefined) {
      updateFields.push('period_id = ?');
      updateValues.push(periodId);
    }
    if (dayOfWeek !== undefined) {
      updateFields.push('day_of_week = ?');
      updateValues.push(dayOfWeek);
    }

    if (updateFields.length === 0) {
      return entry;
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE timetable SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Timetable entry updated: ${id}`);

    return await this.getTimetableEntryById(id);
  }

  async deleteTimetableEntry(id) {
    await query('UPDATE timetable SET is_active = FALSE WHERE id = ?', [id]);

    logger.info(`Timetable entry deleted: ${id}`);

    return { message: 'Timetable entry deleted successfully' };
  }

  // ==================== SUBSTITUTIONS ====================
  async createSubstitution(substitutionData) {
    const {
      timetableId,
      originalTeacherId,
      substituteTeacherId,
      classId,
      subjectId,
      date,
      periodId,
      reason
    } = substitutionData;

    // Check if substitute teacher is available
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const conflicts = await query(
      `SELECT * FROM timetable 
       WHERE teacher_id = ? AND day_of_week = ? AND period_id = ? AND is_active = TRUE`,
      [substituteTeacherId, dayOfWeek, periodId]
    );

    if (conflicts.length > 0) {
      throw new ApiError(400, 'Substitute teacher is not available at this time');
    }

    const substitutionId = uuidv4();
    await query(
      `INSERT INTO substitutions (
        id, timetable_id, original_teacher_id, substitute_teacher_id,
        class_id, subject_id, date, period_id, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        substitutionId, timetableId, originalTeacherId, substituteTeacherId,
        classId, subjectId, date, periodId, reason
      ]
    );

    logger.info(`Substitution created for teacher ${originalTeacherId}`);

    return await this.getSubstitutionById(substitutionId);
  }

  async getSubstitutionById(id) {
    const results = await query(
      `SELECT 
        sub.*,
        ot.first_name as original_teacher_first_name,
        ot.last_name as original_teacher_last_name,
        st.first_name as substitute_teacher_first_name,
        st.last_name as substitute_teacher_last_name,
        c.name as class_name,
        c.section as section_name,
        s.name as subject_name,
        p.name as period_name,
        p.start_time,
        p.end_time
       FROM substitutions sub
       JOIN teachers ot ON sub.original_teacher_id = ot.id
       JOIN teachers st ON sub.substitute_teacher_id = st.id
       JOIN classes c ON sub.class_id = c.id
       JOIN subjects s ON sub.subject_id = s.id
       JOIN periods p ON sub.period_id = p.id
       WHERE sub.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Substitution not found');
    }

    return results[0];
  }

  async getSubstitutions(filters = {}) {
    const { teacherId, date, status } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (teacherId) {
      whereConditions.push('(sub.original_teacher_id = ? OR sub.substitute_teacher_id = ?)');
      queryParams.push(teacherId, teacherId);
    }

    if (date) {
      whereConditions.push('sub.date = ?');
      queryParams.push(date);
    }

    if (status) {
      whereConditions.push('sub.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const substitutions = await query(
      `SELECT 
        sub.*,
        ot.first_name as original_teacher_first_name,
        ot.last_name as original_teacher_last_name,
        st.first_name as substitute_teacher_first_name,
        st.last_name as substitute_teacher_last_name,
        c.name as class_name,
        c.section as section_name,
        s.name as subject_name,
        p.name as period_name
       FROM substitutions sub
       JOIN teachers ot ON sub.original_teacher_id = ot.id
       JOIN teachers st ON sub.substitute_teacher_id = st.id
       JOIN classes c ON sub.class_id = c.id
       JOIN subjects s ON sub.subject_id = s.id
       JOIN periods p ON sub.period_id = p.id
       ${whereClause}
       ORDER BY sub.date DESC`,
      queryParams
    );

    return substitutions;
  }

  async updateSubstitutionStatus(id, status) {
    const validStatuses = ['pending', 'approved', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    await query(
      'UPDATE substitutions SET status = ? WHERE id = ?',
      [status, id]
    );

    logger.info(`Substitution ${id} status updated to ${status}`);

    return await this.getSubstitutionById(id);
  }

  // ==================== AUTO-GENERATE TIMETABLE ====================
  async autoGenerateTimetable(classId, academicYear) {
    // This is a simplified algorithm. Production version would be more sophisticated
    
    // Get class subjects
    const subjects = await query(
      `SELECT 
        cs.*,
        s.name as subject_name
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.class_id = ? AND cs.teacher_id IS NOT NULL`,
      [classId]
    );

    if (subjects.length === 0) {
      throw new ApiError(400, 'No subjects assigned to this class');
    }

    // Get available periods (excluding breaks)
    const periods = await query(
      'SELECT * FROM periods WHERE is_break = FALSE AND is_active = TRUE ORDER BY period_number'
    );

    if (periods.length === 0) {
      throw new ApiError(400, 'No periods configured');
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const generatedEntries = [];

    // Simple algorithm: distribute subjects evenly across days
    let subjectIndex = 0;
    
    for (const day of days) {
      for (const period of periods) {
        const subject = subjects[subjectIndex % subjects.length];
        
        try {
          const entry = await this.createTimetableEntry({
            classId,
            subjectId: subject.subject_id,
            teacherId: subject.teacher_id,
            periodId: period.id,
            roomId: null,
            dayOfWeek: day,
            academicYear
          });
          
          generatedEntries.push(entry);
          subjectIndex++;
        } catch (error) {
          // Skip if conflict
          logger.warn(`Could not schedule ${subject.subject_name} on ${day} period ${period.period_number}`);
        }
      }
    }

    logger.info(`Auto-generated timetable for class ${classId}: ${generatedEntries.length} entries`);

    return generatedEntries;
  }
}

export default new TimetableService();
