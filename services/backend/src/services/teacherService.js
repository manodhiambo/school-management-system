import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import passwordService from './passwordService.js';

class TeacherService {
  async createTeacher(teacherData) {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      dateOfJoining,
      qualification,
      specialization,
      experienceYears,
      departmentId,
      designation,
      salaryGrade,
      basicSalary,
      accountNumber,
      ifscCode,
      panNumber,
      aadharNumber,
      address,
      city,
      state,
      pincode,
      phone,
      emergencyContact,
      isClassTeacher,
      classId,
      sectionId
    } = teacherData;

    // Check if email already exists
    const existingUsers = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ApiError(400, 'Email already exists');
    }

    // Create user account
    const userId = uuidv4();
    const hashedPassword = await passwordService.hashPassword(password);

    await query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'teacher', TRUE)`,
      [userId, email, hashedPassword]
    );

    // Generate employee ID
    const employeeId = await this.generateEmployeeId();

    // Create teacher record
    const teacherId = uuidv4();
    await query(
      `INSERT INTO teachers (
        id, user_id, employee_id, first_name, last_name, date_of_birth,
        gender, date_of_joining, qualification, specialization, experience_years,
        department_id, designation, salary_grade, basic_salary,
        account_number, ifsc_code, pan_number, aadhar_number,
        address, city, state, pincode, phone, emergency_contact,
        is_class_teacher, class_id, section_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        teacherId, userId, employeeId, firstName, lastName, dateOfBirth,
        gender, dateOfJoining, qualification, specialization, experienceYears,
        departmentId, designation, salaryGrade, basicSalary,
        accountNumber, ifscCode, panNumber, aadharNumber,
        address, city, state, pincode, phone, JSON.stringify(emergencyContact),
        isClassTeacher, classId, sectionId
      ]
    );

    // Update class teacher assignment
    if (isClassTeacher && classId) {
      await query(
        'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
        [teacherId, classId]
      );
    }

    logger.info(`Teacher created: ${employeeId}`);

    return await this.getTeacherById(teacherId);
  }

  async generateEmployeeId() {
    const year = new Date().getFullYear().toString().slice(-2);
    
    const results = await query(
      `SELECT employee_id FROM teachers 
       WHERE employee_id LIKE ? 
       ORDER BY employee_id DESC LIMIT 1`,
      [`TCH${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].employee_id;
      sequence = parseInt(lastNumber.slice(-4)) + 1;
    }

    return `TCH${year}${sequence.toString().padStart(4, '0')}`;
  }

  async getTeacherById(id) {
    const results = await query(
      `SELECT 
        t.*,
        u.email,
        u.last_login,
        d.name as department_name,
        d.code as department_code,
        c.name as class_name,
        c.section as section_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN classes c ON t.class_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Teacher not found');
    }

    const teacher = results[0];

    // Parse JSON fields
    if (teacher.emergency_contact) {
      teacher.emergency_contact = JSON.parse(teacher.emergency_contact);
    }

    // Get assigned subjects
    const subjects = await query(
      `SELECT 
        cs.*,
        s.name as subject_name,
        s.code as subject_code,
        c.name as class_name,
        c.section as section_name
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN classes c ON cs.class_id = c.id
       WHERE cs.teacher_id = ?`,
      [id]
    );

    teacher.assigned_subjects = subjects;

    return teacher;
  }

  async getTeachers(filters = {}, pagination = {}) {
    const {
      departmentId,
      status,
      search,
      designation,
      isClassTeacher
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (departmentId) {
      whereConditions.push('t.department_id = ?');
      queryParams.push(departmentId);
    }

    if (status) {
      whereConditions.push('t.status = ?');
      queryParams.push(status);
    }

    if (designation) {
      whereConditions.push('t.designation = ?');
      queryParams.push(designation);
    }

    if (isClassTeacher !== undefined) {
      whereConditions.push('t.is_class_teacher = ?');
      queryParams.push(isClassTeacher);
    }

    if (search) {
      whereConditions.push(
        '(t.first_name LIKE ? OR t.last_name LIKE ? OR t.employee_id LIKE ? OR u.email LIKE ?)'
      );
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
    `;

    const countResults = await query(countQuery, queryParams);
    const total = countResults[0].total;

    // Get teachers
    const teachersQuery = `
      SELECT 
        t.*,
        u.email,
        d.name as department_name
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const teachers = await query(teachersQuery, queryParams);

    return {
      teachers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateTeacher(id, updateData) {
    await this.getTeacherById(id);

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      qualification,
      specialization,
      experienceYears,
      departmentId,
      designation,
      salaryGrade,
      basicSalary,
      accountNumber,
      ifscCode,
      panNumber,
      aadharNumber,
      address,
      city,
      state,
      pincode,
      phone,
      emergencyContact,
      isClassTeacher,
      classId,
      sectionId,
      profilePhotoUrl
    } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }
    if (dateOfBirth !== undefined) {
      updateFields.push('date_of_birth = ?');
      updateValues.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender);
    }
    if (qualification !== undefined) {
      updateFields.push('qualification = ?');
      updateValues.push(qualification);
    }
    if (specialization !== undefined) {
      updateFields.push('specialization = ?');
      updateValues.push(specialization);
    }
    if (experienceYears !== undefined) {
      updateFields.push('experience_years = ?');
      updateValues.push(experienceYears);
    }
    if (departmentId !== undefined) {
      updateFields.push('department_id = ?');
      updateValues.push(departmentId);
    }
    if (designation !== undefined) {
      updateFields.push('designation = ?');
      updateValues.push(designation);
    }
    if (salaryGrade !== undefined) {
      updateFields.push('salary_grade = ?');
      updateValues.push(salaryGrade);
    }
    if (basicSalary !== undefined) {
      updateFields.push('basic_salary = ?');
      updateValues.push(basicSalary);
    }
    if (accountNumber !== undefined) {
      updateFields.push('account_number = ?');
      updateValues.push(accountNumber);
    }
    if (ifscCode !== undefined) {
      updateFields.push('ifsc_code = ?');
      updateValues.push(ifscCode);
    }
    if (panNumber !== undefined) {
      updateFields.push('pan_number = ?');
      updateValues.push(panNumber);
    }
    if (aadharNumber !== undefined) {
      updateFields.push('aadhar_number = ?');
      updateValues.push(aadharNumber);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(state);
    }
    if (pincode !== undefined) {
      updateFields.push('pincode = ?');
      updateValues.push(pincode);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (emergencyContact !== undefined) {
      updateFields.push('emergency_contact = ?');
      updateValues.push(JSON.stringify(emergencyContact));
    }
    if (isClassTeacher !== undefined) {
      updateFields.push('is_class_teacher = ?');
      updateValues.push(isClassTeacher);
    }
    if (classId !== undefined) {
      updateFields.push('class_id = ?');
      updateValues.push(classId);

      // Update class teacher assignment
      if (isClassTeacher) {
        await query(
          'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
          [id, classId]
        );
      }
    }
    if (sectionId !== undefined) {
      updateFields.push('section_id = ?');
      updateValues.push(sectionId);
    }
    if (profilePhotoUrl !== undefined) {
      updateFields.push('profile_photo_url = ?');
      updateValues.push(profilePhotoUrl);
    }

    if (updateFields.length === 0) {
      return await this.getTeacherById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE teachers SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Teacher updated: ${id}`);

    return await this.getTeacherById(id);
  }

  async assignClassToTeacher(teacherId, classId) {
    await query(
      `UPDATE teachers SET class_id = ?, is_class_teacher = TRUE WHERE id = ?`,
      [classId, teacherId]
    );

    await query(
      'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
      [teacherId, classId]
    );

    logger.info(`Class ${classId} assigned to teacher ${teacherId}`);

    return await this.getTeacherById(teacherId);
  }

  async assignSubjectToTeacher(teacherId, classId, subjectId, weeklyHours) {
    const assignmentId = uuidv4();

    // Check if assignment already exists
    const existing = await query(
      'SELECT * FROM class_subjects WHERE class_id = ? AND subject_id = ?',
      [classId, subjectId]
    );

    if (existing.length > 0) {
      // Update existing assignment
      await query(
        'UPDATE class_subjects SET teacher_id = ?, weekly_hours = ? WHERE class_id = ? AND subject_id = ?',
        [teacherId, weeklyHours, classId, subjectId]
      );
    } else {
      // Create new assignment
      await query(
        `INSERT INTO class_subjects (id, class_id, subject_id, teacher_id, weekly_hours)
         VALUES (?, ?, ?, ?, ?)`,
        [assignmentId, classId, subjectId, teacherId, weeklyHours]
      );
    }

    logger.info(`Subject ${subjectId} assigned to teacher ${teacherId} for class ${classId}`);

    return await this.getTeacherById(teacherId);
  }

  async getTeacherSchedule(id) {
    const schedule = await query(
      `SELECT 
        t.*,
        s.name as subject_name,
        s.code as subject_code,
        c.name as class_name,
        c.section as section_name,
        p.name as period_name,
        p.start_time,
        p.end_time,
        r.room_number,
        r.room_name
       FROM timetable t
       JOIN subjects s ON t.subject_id = s.id
       JOIN classes c ON t.class_id = c.id
       JOIN periods p ON t.period_id = p.id
       LEFT JOIN rooms r ON t.room_id = r.id
       WHERE t.teacher_id = ? AND t.is_active = TRUE
       ORDER BY 
         FIELD(t.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
         p.start_time`,
      [id]
    );

    // Group by day
    const groupedSchedule = schedule.reduce((acc, slot) => {
      if (!acc[slot.day_of_week]) {
        acc[slot.day_of_week] = [];
      }
      acc[slot.day_of_week].push(slot);
      return acc;
    }, {});

    return groupedSchedule;
  }

  async markAttendance(teacherId, date, status, checkInTime, checkOutTime, location, ipAddress, markedBy, remarks) {
    const attendanceId = uuidv4();

    // Check if attendance already exists
    const existing = await query(
      'SELECT * FROM teacher_attendance WHERE teacher_id = ? AND date = ?',
      [teacherId, date]
    );

    if (existing.length > 0) {
      // Update existing attendance
      await query(
        `UPDATE teacher_attendance 
         SET status = ?, check_in_time = ?, check_out_time = ?, location = ?, ip_address = ?, remarks = ?
         WHERE teacher_id = ? AND date = ?`,
        [status, checkInTime, checkOutTime, JSON.stringify(location), ipAddress, remarks, teacherId, date]
      );
    } else {
      // Create new attendance
      await query(
        `INSERT INTO teacher_attendance 
         (id, teacher_id, date, status, check_in_time, check_out_time, location, ip_address, marked_by, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attendanceId, teacherId, date, status, checkInTime, checkOutTime, JSON.stringify(location), ipAddress, markedBy, remarks]
      );
    }

    logger.info(`Attendance marked for teacher ${teacherId} on ${date}`);

    return await query(
      'SELECT * FROM teacher_attendance WHERE teacher_id = ? AND date = ?',
      [teacherId, date]
    );
  }

  async getTeacherAttendance(id, filters = {}) {
    const { startDate, endDate, month, status } = filters;

    let whereConditions = ['teacher_id = ?'];
    let queryParams = [id];

    if (startDate && endDate) {
      whereConditions.push('date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    } else if (month) {
      whereConditions.push('DATE_FORMAT(date, "%Y-%m") = ?');
      queryParams.push(month);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    const attendance = await query(
      `SELECT * FROM teacher_attendance 
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY date DESC`,
      queryParams
    );

    // Get summary
    const summary = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_days,
        ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
       FROM teacher_attendance
       WHERE ${whereConditions.join(' AND ')}`,
      queryParams
    );

    return {
      attendance,
      summary: summary[0]
    };
  }

  async applyLeave(teacherId, leaveData) {
    const { leaveType, startDate, endDate, reason } = leaveData;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leaveId = uuidv4();
    await query(
      `INSERT INTO teacher_leaves 
       (id, teacher_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [leaveId, teacherId, leaveType, startDate, endDate, totalDays, reason]
    );

    logger.info(`Leave applied by teacher ${teacherId}`);

    return await query('SELECT * FROM teacher_leaves WHERE id = ?', [leaveId]);
  }

  async getTeacherLeaves(id, filters = {}) {
    const { status, leaveType, year } = filters;

    let whereConditions = ['teacher_id = ?'];
    let queryParams = [id];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (leaveType) {
      whereConditions.push('leave_type = ?');
      queryParams.push(leaveType);
    }

    if (year) {
      whereConditions.push('YEAR(start_date) = ?');
      queryParams.push(year);
    }

    const leaves = await query(
      `SELECT 
        tl.*,
        u.email as approved_by_email
       FROM teacher_leaves tl
       LEFT JOIN users u ON tl.approved_by = u.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY tl.applied_at DESC`,
      queryParams
    );

    // Get leave balance
    const balance = await query(
      `SELECT 
        leave_type,
        COUNT(*) as taken,
        SUM(total_days) as total_days_taken
       FROM teacher_leaves
       WHERE teacher_id = ? AND status = 'approved' AND YEAR(start_date) = YEAR(CURDATE())
       GROUP BY leave_type`,
      [id]
    );

    return {
      leaves,
      balance
    };
  }

  async approveLeave(leaveId, approvedBy, status, rejectionReason = null) {
    if (!['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    await query(
      `UPDATE teacher_leaves 
       SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectionReason, leaveId]
    );

    logger.info(`Leave ${leaveId} ${status} by ${approvedBy}`);

    return await query('SELECT * FROM teacher_leaves WHERE id = ?', [leaveId]);
  }

  async getTeacherSalary(id, filters = {}) {
    const teacher = await this.getTeacherById(id);

    const { month, year } = filters;

    // For now, return basic salary structure
    // In production, this would integrate with a payroll system
    const salary = {
      basicSalary: teacher.basic_salary,
      allowances: {
        houseRent: teacher.basic_salary * 0.4,
        transport: 2000,
        medical: 1500,
        other: 1000
      },
      deductions: {
        tax: teacher.basic_salary * 0.1,
        providentFund: teacher.basic_salary * 0.12,
        insurance: 500
      }
    };

    salary.grossSalary = salary.basicSalary + 
      Object.values(salary.allowances).reduce((sum, val) => sum + val, 0);

    salary.totalDeductions = 
      Object.values(salary.deductions).reduce((sum, val) => sum + val, 0);

    salary.netSalary = salary.grossSalary - salary.totalDeductions;

    return salary;
  }

  async getAvailableTeachers(date, periodId) {
    // Get teachers who don't have a class during this period on this day
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const available = await query(
      `SELECT 
        t.id,
        t.employee_id,
        t.first_name,
        t.last_name,
        d.name as department_name
       FROM teachers t
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.status = 'active'
       AND t.id NOT IN (
         SELECT teacher_id FROM timetable
         WHERE day_of_week = ? AND period_id = ? AND is_active = TRUE
       )
       AND t.id NOT IN (
         SELECT teacher_id FROM teacher_leaves
         WHERE ? BETWEEN start_date AND end_date AND status = 'approved'
       )
       ORDER BY t.first_name, t.last_name`,
      [dayOfWeek, periodId, date]
    );

    return available;
  }

  async getTeacherStatistics(filters = {}) {
    const { departmentId } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (departmentId) {
      whereConditions.push('department_id = ?');
      queryParams.push(departmentId);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const stats = await query(
      `SELECT 
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_teachers,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as teachers_on_leave,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_teachers,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_teachers,
        SUM(CASE WHEN is_class_teacher = TRUE THEN 1 ELSE 0 END) as class_teachers,
        AVG(experience_years) as avg_experience
       FROM teachers
       ${whereClause}`,
      queryParams
    );

    // Department-wise distribution
    const departmentDistribution = await query(
      `SELECT 
        d.name as department_name,
        COUNT(t.id) as teacher_count
       FROM departments d
       LEFT JOIN teachers t ON d.id = t.department_id AND t.status = 'active'
       GROUP BY d.id
       ORDER BY teacher_count DESC`
    );

    return {
      statistics: stats[0],
      departmentDistribution
    };
  }

  async deleteTeacher(id) {
    const teacher = await this.getTeacherById(id);

    // Soft delete
    await query(
      'UPDATE teachers SET status = ?, updated_at = NOW() WHERE id = ?',
      ['inactive', id]
    );

    // Deactivate user account
    await query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [teacher.user_id]
    );

    // Remove class teacher assignment
    if (teacher.is_class_teacher && teacher.class_id) {
      await query(
        'UPDATE classes SET class_teacher_id = NULL WHERE id = ?',
        [teacher.class_id]
      );
    }

    logger.info(`Teacher deleted (soft): ${id}`);

    return { message: 'Teacher deleted successfully' };
  }
}

export default new TeacherService();
