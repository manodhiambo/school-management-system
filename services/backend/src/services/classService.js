import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class ClassService {
  async createClass(data) {
    const { name, section, academicYear, capacity, roomNumber, description } = data;
    
    const id = uuidv4();
    await query(
      `INSERT INTO classes (id, name, section, academic_year, capacity, room_number, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [id, name, section || null, academicYear || null, capacity || 40, roomNumber || null, description || null]
    );
    
    logger.info(`Class created: ${name}`);
    return await this.getClassById(id);
  }

  async getClasses(filters = {}) {
    let sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
      FROM classes c
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.academicYear) {
      sql += ` AND c.academic_year = $${paramIndex}`;
      params.push(filters.academicYear);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      sql += ` AND c.is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    sql += ' ORDER BY c.name ASC';
    
    return await query(sql, params);
  }

  async getClassById(id) {
    const results = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
       FROM classes c WHERE c.id = $1`,
      [id]
    );
    
    if (results.length === 0) {
      throw new ApiError(404, 'Class not found');
    }
    
    return results[0];
  }

  async updateClass(id, data) {
    await this.getClassById(id);
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      name: 'name',
      section: 'section',
      academicYear: 'academic_year',
      capacity: 'capacity',
      roomNumber: 'room_number',
      description: 'description',
      isActive: 'is_active'
    };

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return await this.getClassById(id);
    }

    values.push(id);
    await query(
      `UPDATE classes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );
    
    return await this.getClassById(id);
  }

  async deleteClass(id) {
    await this.getClassById(id);
    await query('DELETE FROM classes WHERE id = $1', [id]);
    return { message: 'Class deleted successfully' };
  }
}

export default new ClassService();
