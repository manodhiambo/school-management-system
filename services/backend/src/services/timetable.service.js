const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class TimetableService {
  static async createPeriod(periodData) {
    try {
      const period = await prisma.periods.create({
        data: periodData
      });
      logger.info(`Period created: ${period.id}`);
      return period;
    } catch (error) {
      logger.error('Error creating period:', error);
      throw error;
    }
  }

  static async getPeriods() {
    try {
      const periods = await prisma.periods.findMany({
        orderBy: {
          start_time: 'asc'
        }
      });
      return periods;
    } catch (error) {
      logger.error('Error fetching periods:', error);
      throw error;
    }
  }

  static async createTimetableEntry(entryData) {
    try {
      // Check for conflicts
      const conflicts = await this.checkTimetableConflicts(
        entryData.day_of_week,
        entryData.period_id,
        entryData.class_id,
        entryData.teacher_id
      );

      if (conflicts.length > 0) {
        throw new Error('Timetable conflict detected');
      }

      const entry = await prisma.timetable.create({
        data: entryData,
        include: {
          subject: true,
          teacher: true,
          period: true,
          class: true
        }
      });

      logger.info(`Timetable entry created: ${entry.id}`);
      return entry;
    } catch (error) {
      logger.error('Error creating timetable entry:', error);
      throw error;
    }
  }

  static async getClassTimetable(classId) {
    try {
      const timetable = await prisma.timetable.findMany({
        where: { class_id: classId },
        include: {
          subject: true,
          teacher: true,
          period: true
        },
        orderBy: [
          { day_of_week: 'asc' },
          { period: { start_time: 'asc' } }
        ]
      });

      // Group by day
      const grouped = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      days.forEach(day => {
        grouped[day] = timetable.filter(entry => entry.day_of_week === day);
      });

      return grouped;
    } catch (error) {
      logger.error('Error fetching class timetable:', error);
      throw error;
    }
  }

  static async getTeacherTimetable(teacherId) {
    try {
      const timetable = await prisma.timetable.findMany({
        where: { teacher_id: teacherId },
        include: {
          subject: true,
          class: true,
          period: true
        },
        orderBy: [
          { day_of_week: 'asc' },
          { period: { start_time: 'asc' } }
        ]
      });

      // Group by day
      const grouped = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      days.forEach(day => {
        grouped[day] = timetable.filter(entry => entry.day_of_week === day);
      });

      return grouped;
    } catch (error) {
      logger.error('Error fetching teacher timetable:', error);
      throw error;
    }
  }

  static async getRoomTimetable(roomNumber) {
    try {
      const timetable = await prisma.timetable.findMany({
        where: { room_number: roomNumber },
        include: {
          subject: true,
          class: true,
          teacher: true,
          period: true
        },
        orderBy: [
          { day_of_week: 'asc' },
          { period: { start_time: 'asc' } }
        ]
      });

      // Group by day
      const grouped = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      days.forEach(day => {
        grouped[day] = timetable.filter(entry => entry.day_of_week === day);
      });

      return grouped;
    } catch (error) {
      logger.error('Error fetching room timetable:', error);
      throw error;
    }
  }

  static async checkTimetableConflicts(dayOfWeek, periodId, classId, teacherId) {
    const conflicts = await prisma.timetable.findMany({
      where: {
        OR: [
          {
            day_of_week: dayOfWeek,
            period_id: periodId,
            class_id: classId
          },
          {
            day_of_week: dayOfWeek,
            period_id: periodId,
            teacher_id: teacherId
          }
        ]
      },
      include: {
        subject: true,
        teacher: true,
        class: true
      }
    });
    return conflicts;
  }

  static async generateClassTimetable(classId, session) {
    try {
      // Get class details
      const classData = await prisma.classes.findUnique({
        where: { id: classId },
        include: {
          class_subjects: {
            include: {
              subject: true,
              teacher: true
            }
          }
        }
      });

      if (!classData) {
        throw new Error('Class not found');
      }

      // Get available periods (excluding breaks)
      const periods = await prisma.periods.findMany({
        where: { is_break: false },
        orderBy: { start_time: 'asc' }
      });

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const generatedSlots = [];

      // Simple algorithm: assign subjects to slots ensuring teacher availability
      for (const day of days) {
        for (const period of periods) {
          // Skip if slot is already filled
          const existing = await prisma.timetable.findFirst({
            where: {
              class_id: classId,
              day_of_week: day,
              period_id: period.id
            }
          });
          
          if (existing) continue;

          // Find available teacher for this slot
          const availableTeacher = await this.findAvailableTeacher(
            day,
            period.id,
            classData.class_subjects.map(cs => cs.teacher_id)
          );

          if (availableTeacher) {
            const subject = classData.class_subjects.find(
              cs => cs.teacher_id === availableTeacher
            );

            if (subject) {
              const entry = await prisma.timetable.create({
                data: {
                  class_id: classId,
                  subject_id: subject.subject_id,
                  teacher_id: availableTeacher,
                  period_id: period.id,
                  day_of_week: day,
                  room_number: classData.room_number
                }
              });
              generatedSlots.push(entry);
            }
          }
        }
      }

      logger.info(`Generated timetable for class ${classId}: ${generatedSlots.length} slots`);
      return generatedSlots;
    } catch (error) {
      logger.error('Error generating class timetable:', error);
      throw error;
    }
  }

  static async generateAllTimetables(session) {
    try {
      const classes = await prisma.classes.findMany();
      const results = [];

      for (const classData of classes) {
        const result = await this.generateClassTimetable(classData.id, session);
        results.push({
          class_id: classData.id,
          slots_generated: result.length
        });
      }

      logger.info(`Generated timetables for all classes: ${results.length}`);
      return results;
    } catch (error) {
      logger.error('Error generating all timetables:', error);
      throw error;
    }
  }

  static async findAvailableTeacher(dayOfWeek, periodId, teacherIds) {
    // Find teachers who are not already assigned to another class at this slot
    const busyTeachers = await prisma.timetable.findMany({
      where: {
        day_of_week: dayOfWeek,
        period_id: periodId,
        teacher_id: { in: teacherIds }
      },
      select: { teacher_id: true }
    });

    const busyTeacherIds = busyTeachers.map(t => t.teacher_id);
    const availableTeachers = teacherIds.filter(id => !busyTeacherIds.includes(id));

    // Return first available teacher (can be enhanced with load balancing)
    return availableTeachers[0] || null;
  }

  static async scheduleExam(examData) {
    try {
      // Check for conflicts
      const conflict = await prisma.timetable.findFirst({
        where: {
          day_of_week: new Date(examData.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          period_id: examData.period_id,
          OR: [
            { class_id: examData.class_id },
            { room_number: examData.room_number }
          ]
        }
      });

      if (conflict) {
        throw new Error('Exam scheduling conflict detected');
      }

      const examSlot = await prisma.exam_schedule.create({
        data: examData,
        include: {
          exam: true,
          subject: true,
          teacher: true,
          class: true
        }
      });

      logger.info(`Exam scheduled: ${examSlot.id}`);
      return examSlot;
    } catch (error) {
      logger.error('Error scheduling exam:', error);
      throw error;
    }
  }

  static async createSubstitution(substitutionData) {
    try {
      // Check if substitute teacher is available
      const teacherBusy = await prisma.timetable.findFirst({
        where: {
          day_of_week: new Date(substitutionData.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          period_id: substitutionData.period_id,
          teacher_id: substitutionData.substitute_teacher_id
        }
      });

      if (teacherBusy) {
        throw new Error('Substitute teacher not available at this slot');
      }

      const substitution = await prisma.substitutions.create({
        data: {
          ...substitutionData,
          notified_at: new Date()
        },
        include: {
          original_teacher: true,
          substitute_teacher: true,
          class: true,
          subject: true
        }
      });

      logger.info(`Substitution created: ${substitution.id}`);
      return substitution;
    } catch (error) {
      logger.error('Error creating substitution:', error);
      throw error;
    }
  }

  static async detectConflicts(date, periodId) {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const conflicts = await prisma.timetable.findMany({
      where: {
        day_of_week: dayOfWeek,
        period_id: periodId
      },
      include: {
        teacher: true,
        class: true,
        subject: true
      }
    });

    // Find teachers assigned to multiple classes at same slot
    const teacherConflicts = [];
    const teacherMap = new Map();

    for (const entry of conflicts) {
      if (teacherMap.has(entry.teacher_id)) {
        teacherConflicts.push({
          type: 'TEACHER_CONFLICT',
          teacher: entry.teacher,
          classes: [teacherMap.get(entry.teacher_id).class, entry.class],
          period: entry.period_id
        });
      } else {
        teacherMap.set(entry.teacher_id, entry);
      }
    }

    return teacherConflicts;
  }
}

module.exports = TimetableService;
