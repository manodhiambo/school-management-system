import pool from '../config/database.js';
import logger from '../utils/logger.js';

// Get all books with filters
export const getBooks = async (req, res) => {
  try {
    const {
      search, category, author, available,
      page = 1, limit = 20
    } = req.query;

    let query = `
      SELECT * FROM library_books
      WHERE is_active = TRUE
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (
        title ILIKE $${paramCount} OR
        author ILIKE $${paramCount} OR
        isbn ILIKE $${paramCount} OR
        keywords ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (author) {
      query += ` AND author ILIKE $${paramCount}`;
      params.push(`%${author}%`);
      paramCount++;
    }

    if (available === 'true') {
      query += ` AND available_copies > 0`;
    }

    query += ` ORDER BY title ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM library_books WHERE is_active = TRUE`
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    logger.error('Get books error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single book
export const getBook = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM library_books WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new book
export const addBook = async (req, res) => {
  try {
    const {
      isbn, title, subtitle, author, co_authors, publisher,
      edition, publication_year, language, pages, category,
      sub_category, description, cover_image_url, location,
      total_copies, price, condition, is_reference_only
    } = req.body;

    const result = await pool.query(
      `INSERT INTO library_books (
        isbn, title, subtitle, author, co_authors, publisher,
        edition, publication_year, language, pages, category,
        sub_category, description, cover_image_url, location,
        total_copies, available_copies, price, condition, is_reference_only
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, $18, $19)
      RETURNING *`,
      [
        isbn, title, subtitle, author, co_authors, publisher,
        edition, publication_year, language, pages, category,
        sub_category, description, cover_image_url, location,
        total_copies, price, condition, is_reference_only
      ]
    );

    logger.info(`Book added: ${title} by ${author}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Add book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const setClause = Object.keys(fields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(fields)];

    const result = await pool.query(
      `UPDATE library_books SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Update book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete book
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE library_books SET is_active = FALSE WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    logger.error('Delete book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get library member
export const getMember = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT lm.*, u.email, u.role,
        COALESCE(s.first_name, t.first_name) as first_name,
        COALESCE(s.last_name, t.last_name) as last_name
       FROM library_members lm
       JOIN users u ON lm.user_id = u.id
       LEFT JOIN students s ON lm.student_id = s.id
       LEFT JOIN teachers t ON lm.teacher_id = t.id
       WHERE lm.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return await createMemberAuto(req, res);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-create library member
export const createMemberAuto = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let studentId = null, teacherId = null, memberType = 'staff';
    let maxBooks = 3, maxDays = 14;

    if (userRole === 'student') {
      const student = await pool.query(
        'SELECT id FROM students WHERE user_id = $1',
        [userId]
      );
      if (student.rows.length > 0) {
        studentId = student.rows[0].id;
        memberType = 'student';
      }
    } else if (userRole === 'teacher') {
      const teacher = await pool.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [userId]
      );
      if (teacher.rows.length > 0) {
        teacherId = teacher.rows[0].id;
        memberType = 'teacher';
        maxBooks = 5;
        maxDays = 30;
      }
    }

    const memberNumber = `LIB${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO library_members (
        user_id, student_id, teacher_id, member_type,
        membership_number, max_books_allowed, max_days_allowed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, studentId, teacherId, memberType, memberNumber, maxBooks, maxDays]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Create member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Issue book
export const issueBook = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { book_id, member_id, due_date } = req.body;
    const userId = req.user.id;

    const book = await client.query(
      'SELECT * FROM library_books WHERE id = $1 AND available_copies > 0',
      [book_id]
    );

    if (book.rows.length === 0) throw new Error('Book not available');
    if (book.rows[0].is_reference_only) throw new Error('This is a reference book and cannot be borrowed');

    const member = await client.query(
      'SELECT * FROM library_members WHERE id = $1 AND status = $2',
      [member_id, 'active']
    );

    if (member.rows.length === 0) throw new Error('Member not found or inactive');
    if (member.rows[0].is_blocked) throw new Error('Member is blocked');

    const currentBorrowings = await client.query(
      'SELECT COUNT(*) FROM library_borrowings WHERE member_id = $1 AND status = $2',
      [member_id, 'issued']
    );

    if (parseInt(currentBorrowings.rows[0].count) >= member.rows[0].max_books_allowed) {
      throw new Error('Member has reached maximum borrowing limit');
    }

    const borrowing = await client.query(
      `INSERT INTO library_borrowings (
        book_id, member_id, due_date, issued_by
      ) VALUES ($1, $2, $3, $4) RETURNING *`,
      [book_id, member_id, due_date, userId]
    );

    await client.query(
      'UPDATE library_books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    await client.query('COMMIT');
    logger.info(`Book issued: ${book_id} to member ${member_id}`);
    res.status(201).json({ success: true, data: borrowing.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Issue book error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// Return book
export const returnBook = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { condition_on_return, remarks } = req.body;
    const userId = req.user.id;

    const borrowing = await client.query(
      'SELECT * FROM library_borrowings WHERE id = $1 AND status = $2',
      [id, 'issued']
    );

    if (borrowing.rows.length === 0) throw new Error('Borrowing record not found');

    const bookId = borrowing.rows[0].book_id;
    const dueDate = new Date(borrowing.rows[0].due_date);
    const today = new Date();

    let fineAmount = 0;

    if (today > dueDate) {
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * 10;
    }

    await client.query(
      `UPDATE library_borrowings SET
        return_date = CURRENT_DATE,
        status = 'returned',
        condition_on_return = $1,
        fine_amount = $2,
        remarks = $3,
        returned_to = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [condition_on_return, fineAmount, remarks, userId, id]
    );

    await client.query(
      'UPDATE library_books SET available_copies = available_copies + 1 WHERE id = $1',
      [bookId]
    );

    if (fineAmount > 0) {
      await client.query(
        `INSERT INTO library_fines (
          borrowing_id, member_id, fine_type, amount, balance
        ) VALUES ($1, $2, $3, $4, $4)`,
        [id, borrowing.rows[0].member_id, 'overdue', fineAmount]
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

// Get my borrowings
export const getMyBorrowings = async (req, res) => {
  try {
    const userId = req.user.id;

    const member = await pool.query(
      'SELECT id FROM library_members WHERE user_id = $1',
      [userId]
    );

    if (member.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.query(
      `SELECT lb.*, lbk.title, lbk.author, lbk.isbn, lbk.cover_image_url
       FROM library_borrowings lb
       JOIN library_books lbk ON lb.book_id = lbk.id
       WHERE lb.member_id = $1
       ORDER BY lb.issue_date DESC`,
      [member.rows[0].id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Get my borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all borrowings (admin)
export const getAllBorrowings = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    let query = `
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
    let paramCount = 1;

    if (status) {
      query += ` AND lb.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY lb.issue_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Get all borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM library_books WHERE is_active = TRUE) as total_books,
        (SELECT SUM(total_copies) FROM library_books WHERE is_active = TRUE) as total_copies,
        (SELECT SUM(available_copies) FROM library_books WHERE is_active = TRUE) as available_copies,
        (SELECT COUNT(*) FROM library_members WHERE status = 'active') as active_members,
        (SELECT COUNT(*) FROM library_borrowings WHERE status = 'issued') as books_issued,
        (SELECT COUNT(*) FROM library_borrowings WHERE status = 'overdue') as overdue_books,
        (SELECT COALESCE(SUM(balance), 0) FROM library_fines WHERE status != 'paid') as pending_fines
    `);

    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get book categories
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM library_books
      WHERE is_active = TRUE AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
