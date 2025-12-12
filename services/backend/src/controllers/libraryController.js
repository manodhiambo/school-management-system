import { query, getClient } from '../config/database.js';
import logger from '../utils/logger.js';

// Get all books with filters
export const getBooks = async (req, res) => {
  try {
    const { 
      search, category, author, available, 
      page = 1, limit = 20 
    } = req.query;

    let sql = `SELECT * FROM library_books WHERE is_active = TRUE`;
    const params = [];

    if (search) {
      sql += ` AND (title ILIKE ? OR author ILIKE ? OR isbn ILIKE ? OR keywords ILIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (author) {
      sql += ` AND author ILIKE ?`;
      params.push(`%${author}%`);
    }

    if (available === 'true') {
      sql += ` AND available_copies > 0`;
    }

    sql += ` ORDER BY title ASC`;

    // Get all books first
    const allBooks = await query(sql, params);
    
    // Manual pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    const paginatedBooks = allBooks.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedBooks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allBooks.length
      }
    });
  } catch (error) {
    logger.error('Get books error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBook = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM library_books WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Get book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addBook = async (req, res) => {
  try {
    const {
      isbn, title, subtitle, author, co_authors, publisher,
      edition, publication_year, language, pages, category,
      sub_category, description, cover_image_url, location,
      total_copies, price, condition, is_reference_only
    } = req.body;

    const result = await query(
      `INSERT INTO library_books (
        isbn, title, subtitle, author, co_authors, publisher,
        edition, publication_year, language, pages, category,
        sub_category, description, cover_image_url, location,
        total_copies, available_copies, price, condition, is_reference_only
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
      [
        isbn || null, title, subtitle || null, author, co_authors || null, publisher || null,
        edition || null, publication_year || null, language || 'English', pages || null, category || null,
        sub_category || null, description || null, cover_image_url || null, location || null,
        total_copies || 1, total_copies || 1, price || null, condition || 'good', is_reference_only || false
      ]
    );

    logger.info(`Book added: ${title} by ${author}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Add book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(fields), id];
    
    const result = await query(
      `UPDATE library_books SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
      values
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Update book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE library_books SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    logger.error('Delete book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMember = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      `SELECT lm.*, u.email, u.role,
        COALESCE(s.first_name, t.first_name) as first_name,
        COALESCE(s.last_name, t.last_name) as last_name
       FROM library_members lm
       JOIN users u ON lm.user_id = u.id
       LEFT JOIN students s ON lm.student_id = s.id
       LEFT JOIN teachers t ON lm.teacher_id = t.id
       WHERE lm.user_id = ?`,
      [userId]
    );

    if (result.length === 0) {
      return await createMemberAuto(req, res);
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Get member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMemberAuto = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let studentId = null, teacherId = null, memberType = 'staff';
    let maxBooks = 3, maxDays = 14;

    if (userRole === 'student') {
      const student = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
      if (student.length > 0) {
        studentId = student[0].id;
        memberType = 'student';
      }
    } else if (userRole === 'teacher') {
      const teacher = await query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
      if (teacher.length > 0) {
        teacherId = teacher[0].id;
        memberType = 'teacher';
        maxBooks = 5;
        maxDays = 30;
      }
    }

    const memberNumber = `LIB${Date.now()}`;
    
    const result = await query(
      `INSERT INTO library_members (
        user_id, student_id, teacher_id, member_type, 
        membership_number, max_books_allowed, max_days_allowed
      ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [userId, studentId, teacherId, memberType, memberNumber, maxBooks, maxDays]
    );

    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Create member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const issueBook = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { book_id, member_id, due_date } = req.body;
    const userId = req.user.id;

    const bookResult = await client.query(
      'SELECT * FROM library_books WHERE id = $1 AND available_copies > 0',
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      throw new Error('Book not available');
    }

    if (bookResult.rows[0].is_reference_only) {
      throw new Error('This is a reference book and cannot be borrowed');
    }

    const memberResult = await client.query(
      'SELECT * FROM library_members WHERE id = $1 AND status = $2',
      [member_id, 'active']
    );

    if (memberResult.rows.length === 0) {
      throw new Error('Member not found or inactive');
    }

    if (memberResult.rows[0].is_blocked) {
      throw new Error('Member is blocked');
    }

    const borrowingsResult = await client.query(
      'SELECT COUNT(*) FROM library_borrowings WHERE member_id = $1 AND status = $2',
      [member_id, 'issued']
    );

    if (parseInt(borrowingsResult.rows[0].count) >= memberResult.rows[0].max_books_allowed) {
      throw new Error('Member has reached maximum borrowing limit');
    }

    const borrowingResult = await client.query(
      `INSERT INTO library_borrowings (book_id, member_id, due_date, issued_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [book_id, member_id, due_date, userId]
    );

    await client.query(
      'UPDATE library_books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    await client.query('COMMIT');
    logger.info(`Book issued: ${book_id} to member ${member_id}`);
    res.status(201).json({ success: true, data: borrowingResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Issue book error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

export const returnBook = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition_on_return, remarks } = req.body;
    const userId = req.user.id;

    const borrowingResult = await client.query(
      'SELECT * FROM library_borrowings WHERE id = $1 AND status = $2',
      [id, 'issued']
    );

    if (borrowingResult.rows.length === 0) {
      throw new Error('Borrowing record not found');
    }

    const borrowing = borrowingResult.rows[0];
    const dueDate = new Date(borrowing.due_date);
    const today = new Date();
    
    let fineAmount = 0;

    if (today > dueDate) {
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * 10;
    }

    await client.query(
      `UPDATE library_borrowings SET 
        return_date = CURRENT_DATE, status = $1, condition_on_return = $2,
        fine_amount = $3, remarks = $4, returned_to = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      ['returned', condition_on_return, fineAmount, remarks, userId, id]
    );

    await client.query(
      'UPDATE library_books SET available_copies = available_copies + 1 WHERE id = $1',
      [borrowing.book_id]
    );

    if (fineAmount > 0) {
      await client.query(
        `INSERT INTO library_fines (borrowing_id, member_id, fine_type, amount, balance) 
         VALUES ($1, $2, $3, $4, $4)`,
        [id, borrowing.member_id, 'overdue', fineAmount]
      );
    }

    await client.query('COMMIT');
    logger.info(`Book returned: ${id}`);
    res.json({ success: true, message: 'Book returned successfully', fine_amount: fineAmount });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Return book error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

export const getMyBorrowings = async (req, res) => {
  try {
    const userId = req.user.id;

    const member = await query('SELECT id FROM library_members WHERE user_id = ?', [userId]);

    if (member.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const result = await query(
      `SELECT lb.*, lbk.title, lbk.author, lbk.isbn, lbk.cover_image_url
       FROM library_borrowings lb
       JOIN library_books lbk ON lb.book_id = lbk.id
       WHERE lb.member_id = ?
       ORDER BY lb.issue_date DESC`,
      [member[0].id]
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get my borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBorrowings = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT lb.*, lbk.title, lbk.author, lbk.isbn,
        lm.membership_number,
        COALESCE(s.first_name, t.first_name) as first_name,
        COALESCE(s.last_name, t.last_name) as last_name
      FROM library_borrowings lb
      JOIN library_books lbk ON lb.book_id = lbk.id
      JOIN library_members lm ON lb.member_id = lm.id
      LEFT JOIN students s ON lm.student_id = s.id
      LEFT JOIN teachers t ON lm.teacher_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ` AND lb.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY lb.issue_date DESC`;

    const result = await query(sql, params);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get all borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStatistics = async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM library_books WHERE is_active = TRUE) as total_books,
        (SELECT COALESCE(SUM(total_copies), 0) FROM library_books WHERE is_active = TRUE) as total_copies,
        (SELECT COALESCE(SUM(available_copies), 0) FROM library_books WHERE is_active = TRUE) as available_copies,
        (SELECT COUNT(*) FROM library_members WHERE status = 'active') as active_members,
        (SELECT COUNT(*) FROM library_borrowings WHERE status = 'issued') as books_issued,
        (SELECT COUNT(*) FROM library_borrowings WHERE status = 'overdue') as overdue_books,
        (SELECT COALESCE(SUM(balance), 0) FROM library_fines WHERE status != 'paid') as pending_fines
    `);

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) as count
      FROM library_books
      WHERE is_active = TRUE AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
