import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class ExamService {
  async createExam(data) {
    const { name, description, examType, academicYear, term, startDate, endDate } = data;
    
    const id = uuidv4();
    await query(
      `INSERT INTO exams (id, name, description, exam_type, academic_year, term, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [id, name, description || null, examType || null, academicYear || null, term || null, startDate || null, endDate || null]
    );
    
    logger.info(`Exam created: ${name}`);
    return await this.getExamById(id);
  }

  async getExams(filters = {}) {
    let sql = 'SELECT * FROM exams WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.academicYear) {
      sql += ` AND academic_year = $${paramIndex}`;
      params.push(filters.academicYear);
      paramIndex++;
    }

    if (filters.term) {
      sql += ` AND term = $${paramIndex}`;
      params.push(filters.term);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    sql += ' ORDER BY start_date DESC';
    
    return await query(sql, params);
  }

  async getExamById(id) {
    const results = await query('SELECT * FROM exams WHERE id = $1', [id]);
    
    if (results.length === 0) {
      throw new ApiError(404, 'Exam not found');
    }
    
    return results[0];
  }

  async updateExam(id, data) {
    await this.getExamById(id);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      name: 'name',
      description: 'description',
      examType: 'exam_type',
      academicYear: 'academic_year',
      term: 'term',
      startDate: 'start_date',
      endDate: 'end_date',
      isActive: 'is_active'
    };

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE exams SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return await this.getExamById(id);
  }

  async deleteExam(id) {
    await this.getExamById(id);
    await query('DELETE FROM exams WHERE id = $1', [id]);
    return { message: 'Exam deleted successfully' };
  }
}

export default new ExamService();
