import { query } from '../config/database.js';
import logger from '../utils/logger.js';

// Get all library members (for admin)
export const getAllMembers = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        lm.*,
        COALESCE(s.first_name || ' ' || s.last_name, t.first_name || ' ' || t.last_name) as member_name,
        COALESCE(s.admission_number, t.employee_id) as member_id_number,
        u.email,
        u.role
      FROM library_members lm
      LEFT JOIN students s ON lm.student_id = s.id
      LEFT JOIN teachers t ON lm.teacher_id = t.id
      LEFT JOIN users u ON lm.user_id = u.id
      WHERE lm.status = 'active'
      ORDER BY lm.created_at DESC
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get all members error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get users without library membership
export const getUsersWithoutMembership = async (req, res) => {
  try {
    // Get students without membership
    const students = await query(`
      SELECT 
        s.id,
        s.user_id,
        s.first_name || ' ' || s.last_name as name,
        s.admission_number as id_number,
        u.email,
        'student' as member_type
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN library_members lm ON s.id = lm.student_id AND lm.status = 'active'
      WHERE lm.id IS NULL
      AND s.status = 'active'
    `);

    // Get teachers without membership
    const teachers = await query(`
      SELECT 
        t.id,
        t.user_id,
        t.first_name || ' ' || t.last_name as name,
        t.employee_id as id_number,
        u.email,
        'teacher' as member_type
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN library_members lm ON t.id = lm.teacher_id AND lm.status = 'active'
      WHERE lm.id IS NULL
      AND t.status = 'active'
    `);

    const combined = [...students, ...teachers];
    res.json({ success: true, data: combined });
  } catch (error) {
    logger.error('Get users without membership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create library member
export const createMember = async (req, res) => {
  try {
    const { 
      user_id, 
      student_id, 
      teacher_id, 
      member_type, 
      max_books_allowed = 3,
      max_days_allowed = 14,
      notes 
    } = req.body;

    // Check if user already has active membership
    const existing = await query(
      'SELECT id FROM library_members WHERE (student_id = $1 OR teacher_id = $2) AND status = $3',
      [student_id || null, teacher_id || null, 'active']
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has an active library membership' 
      });
    }

    // Generate membership number
    const memberCount = await query('SELECT COUNT(*) as count FROM library_members');
    const membershipNumber = `LIB${String(parseInt(memberCount[0].count) + 1).padStart(6, '0')}`;

    // Calculate dates
    const start_date = new Date();
    const end_date = new Date();
    end_date.setFullYear(end_date.getFullYear() + 1);

    const result = await query(
      `INSERT INTO library_members 
      (user_id, student_id, teacher_id, member_type, membership_number, 
       membership_start_date, membership_end_date, max_books_allowed, 
       max_days_allowed, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      RETURNING id`,
      [user_id, student_id || null, teacher_id || null, member_type, membershipNumber,
       start_date, end_date, max_books_allowed, max_days_allowed]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Library member created successfully',
      data: { id: result[0].id, membership_number: membershipNumber }
    });
  } catch (error) {
    logger.error('Create member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update library member
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['max_books_allowed', 'max_days_allowed', 'membership_end_date', 
                          'is_blocked', 'block_reason', 'status'];
    
    const fields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key]);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    values.push(id);
    await query(
      `UPDATE library_members SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    );

    res.json({ success: true, message: 'Member updated successfully' });
  } catch (error) {
    logger.error('Update member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete (deactivate) library member
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for active borrowings
    const activeBorrowings = await query(
      "SELECT COUNT(*) as count FROM library_borrowings WHERE member_id = $1 AND status = 'issued'",
      [id]
    );

    if (activeBorrowings[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot deactivate member with active borrowings' 
      });
    }

    await query(
      "UPDATE library_members SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({ success: true, message: 'Member deactivated successfully' });
  } catch (error) {
    logger.error('Delete member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user's membership info
export const getMember = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        lm.*,
        COALESCE(s.first_name || ' ' || s.last_name, t.first_name || ' ' || t.last_name) as member_name,
        u.email
      FROM library_members lm
      LEFT JOIN students s ON lm.student_id = s.id
      LEFT JOIN teachers t ON lm.teacher_id = t.id
      JOIN users u ON lm.user_id = u.id
      WHERE lm.user_id = $1 AND lm.status = 'active'
    `, [req.user.id]);

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'No active membership found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Get member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user's borrowings
export const getMyBorrowings = async (req, res) => {
  try {
    const member = await query(
      'SELECT id FROM library_members WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (member.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const result = await query(`
      SELECT 
        lb.*,
        book.title,
        book.author,
        book.isbn,
        book.cover_image_url,
        CASE 
          WHEN lb.status = 'issued' AND lb.due_date < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue,
        CASE 
          WHEN lb.status = 'issued' AND lb.due_date < CURRENT_DATE 
          THEN CURRENT_DATE - lb.due_date
          ELSE 0
        END as days_overdue
      FROM library_borrowings lb
      JOIN library_books book ON lb.book_id = book.id
      WHERE lb.member_id = $1
      ORDER BY lb.created_at DESC
    `, [member[0].id]);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get my borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) as count
      FROM library_books
      WHERE is_active = true AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Barcode/QR code search
export const searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await query(
      `SELECT * FROM library_books
       WHERE is_active = true
       AND (isbn = $1 OR keywords LIKE $2)
       LIMIT 1`,
      [barcode, `%${barcode}%`]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Search by barcode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== BOOK MANAGEMENT ====================

// Get all books with filters
export const getBooks = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      availability, 
      page = 1, 
      limit = 20 
    } = req.query;

    let sql = `
      SELECT 
        lb.*,
        lb.available_copies
      FROM library_books lb
      WHERE lb.is_active = true
    `;
    
    const params = [];
    let paramCount = 1;

    if (search) {
      sql += ` AND (lb.title ILIKE $${paramCount} OR lb.author ILIKE $${paramCount + 1} OR lb.isbn ILIKE $${paramCount + 2} OR lb.keywords ILIKE $${paramCount + 3})`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      paramCount += 4;
    }

    if (category) {
      sql += ` AND lb.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (availability === 'available') {
      sql += ` AND lb.available_copies > 0`;
    } else if (availability === 'unavailable') {
      sql += ` AND lb.available_copies = 0`;
    }

    sql += ` ORDER BY lb.created_at DESC`;
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const books = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM library_books lb WHERE lb.is_active = true`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (search) {
      countSql += ` AND (lb.title ILIKE $${countParamIndex} OR lb.author ILIKE $${countParamIndex + 1} OR lb.isbn ILIKE $${countParamIndex + 2} OR lb.keywords ILIKE $${countParamIndex + 3})`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      countParamIndex += 4;
    }
    
    if (category) {
      countSql += ` AND lb.category = $${countParamIndex}`;
      countParams.push(category);
    }

    const totalResult = await query(countSql, countParams);
    const total = parseInt(totalResult[0].total);

    res.json({ 
      success: true, 
      data: books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get books error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single book by ID
export const getBook = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT * FROM library_books
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Get book by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new book
export const addBook = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      author,
      co_authors,
      isbn,
      publisher,
      edition,
      publication_year,
      language,
      pages,
      category,
      sub_category,
      total_copies,
      location,
      description,
      keywords,
      cover_image_url,
      price,
      condition = 'good',
      is_reference_only = false
    } = req.body;

    // Check if ISBN already exists
    if (isbn) {
      const existing = await query(
        'SELECT id FROM library_books WHERE isbn = $1 AND is_active = true',
        [isbn]
      );

      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Book with this ISBN already exists' 
        });
      }
    }

    const result = await query(
      `INSERT INTO library_books 
      (title, subtitle, author, co_authors, isbn, publisher, edition, publication_year, 
       language, pages, category, sub_category, total_copies, available_copies, location, 
       description, keywords, cover_image_url, price, condition, is_reference_only, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14, $15, $16, $17, $18, $19, $20, true)
      RETURNING id`,
      [title, subtitle, author, co_authors, isbn, publisher, edition, publication_year, 
       language, pages, category, sub_category, total_copies, location, 
       description, keywords, cover_image_url, price, condition, is_reference_only]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Book added successfully',
      data: { id: result[0].id }
    });
  } catch (error) {
    logger.error('Add book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['title', 'subtitle', 'author', 'co_authors', 'isbn', 'publisher', 
                          'edition', 'publication_year', 'language', 'pages', 'category', 
                          'sub_category', 'total_copies', 'available_copies', 'location', 
                          'description', 'keywords', 'cover_image_url', 'price', 'condition', 
                          'is_reference_only'];

    const fields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key]);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    values.push(id);
    await query(
      `UPDATE library_books SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    );

    res.json({ success: true, message: 'Book updated successfully' });
  } catch (error) {
    logger.error('Update book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete (deactivate) book
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for active borrowings
    const activeBorrowings = await query(
      "SELECT COUNT(*) as count FROM library_borrowings WHERE book_id = $1 AND status = 'issued'",
      [id]
    );

    if (activeBorrowings[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete book with active borrowings' 
      });
    }

    await query(
      'UPDATE library_books SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    logger.error('Delete book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== RENTAL/BORROWING MANAGEMENT ====================

// Issue/Borrow a book
export const issueBook = async (req, res) => {
  try {
    const { member_id, book_id, due_date, condition_on_issue = 'good', remarks } = req.body;

    // Check if member exists and is active
    const member = await query(
      'SELECT * FROM library_members WHERE id = $1 AND status = $2',
      [member_id, 'active']
    );

    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found or inactive' });
    }

    const memberData = member[0];

    // Check if membership is expired
    if (new Date(memberData.membership_end_date) < new Date()) {
      return res.status(400).json({ success: false, message: 'Membership has expired' });
    }

    // Check if member is blocked
    if (memberData.is_blocked) {
      return res.status(400).json({ success: false, message: `Member is blocked: ${memberData.block_reason}` });
    }

    // Check current borrowings count
    const currentBorrowings = await query(
      "SELECT COUNT(*) as count FROM library_borrowings WHERE member_id = $1 AND status = 'issued'",
      [member_id]
    );

    if (currentBorrowings[0].count >= memberData.max_books_allowed) {
      return res.status(400).json({ 
        success: false, 
        message: `Member has reached maximum borrowing limit of ${memberData.max_books_allowed} books` 
      });
    }

    // Check if book is available
    const book = await query(
      'SELECT * FROM library_books WHERE id = $1 AND is_active = true',
      [book_id]
    );

    if (book.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (book[0].available_copies <= 0) {
      return res.status(400).json({ success: false, message: 'Book is not available' });
    }

    if (book[0].is_reference_only) {
      return res.status(400).json({ success: false, message: 'This book is reference only and cannot be borrowed' });
    }

    // Check if member already borrowed this book
    const existingBorrowing = await query(
      "SELECT id FROM library_borrowings WHERE member_id = $1 AND book_id = $2 AND status = 'issued'",
      [member_id, book_id]
    );

    if (existingBorrowing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member has already borrowed this book' 
      });
    }

    // Calculate due date if not provided
    let calculatedDueDate = due_date;
    if (!calculatedDueDate) {
      const issueDate = new Date();
      issueDate.setDate(issueDate.getDate() + memberData.max_days_allowed);
      calculatedDueDate = issueDate.toISOString().split('T')[0];
    }

    // Create borrowing record
    const result = await query(
      `INSERT INTO library_borrowings 
      (book_id, member_id, issue_date, due_date, status, condition_on_issue, remarks, issued_by)
      VALUES ($1, $2, CURRENT_DATE, $3, 'issued', $4, $5, $6)
      RETURNING id`,
      [book_id, member_id, calculatedDueDate, condition_on_issue, remarks, req.user.id]
    );

    // Update available copies
    await query(
      'UPDATE library_books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Book issued successfully',
      data: { id: result[0].id }
    });
  } catch (error) {
    logger.error('Issue book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Return a book
export const returnBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_on_return = 'good', fine_paid = 0, fine_waived = 0, remarks } = req.body;

    // Get borrowing details
    const borrowing = await query(
      "SELECT * FROM library_borrowings WHERE id = $1 AND status = 'issued'",
      [id]
    );

    if (borrowing.length === 0) {
      return res.status(404).json({ success: false, message: 'Active borrowing not found' });
    }

    const borrowData = borrowing[0];

    // Calculate fine if overdue
    let fine_amount = 0;
    const today = new Date();
    const dueDate = new Date(borrowData.due_date);
    
    if (today > dueDate) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      fine_amount = daysOverdue * 5; // ₹5 per day fine
    }

    // Update borrowing record
    await query(
      `UPDATE library_borrowings 
      SET status = 'returned', 
          return_date = CURRENT_DATE,
          condition_on_return = $1,
          fine_amount = $2,
          fine_paid = $3,
          fine_waived = $4,
          remarks = COALESCE(remarks, '') || ' | Return: ' || COALESCE($5, ''),
          returned_to = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7`,
      [condition_on_return, fine_amount, fine_paid, fine_waived, remarks, req.user.id, id]
    );

    // Update available copies
    await query(
      'UPDATE library_books SET available_copies = available_copies + 1 WHERE id = $1',
      [borrowData.book_id]
    );

    res.json({ 
      success: true, 
      message: 'Book returned successfully',
      data: { fine_amount, fine_paid, fine_waived, fine_remaining: Math.max(0, fine_amount - fine_paid - fine_waived) }
    });
  } catch (error) {
    logger.error('Return book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all borrowings (admin view)
export const getAllBorrowings = async (req, res) => {
  try {
    const { 
      status, 
      member_id, 
      book_id, 
      overdue,
      page = 1, 
      limit = 20 
    } = req.query;

    let sql = `
      SELECT 
        lb.*,
        book.title as book_title,
        book.author as book_author,
        book.isbn,
        COALESCE(s.first_name || ' ' || s.last_name, t.first_name || ' ' || t.last_name) as member_name,
        COALESCE(s.admission_number, t.employee_id) as member_id_number,
        lm.membership_number,
        lm.member_type,
        CASE 
          WHEN lb.status = 'issued' AND lb.due_date < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue,
        CASE 
          WHEN lb.status = 'issued' AND lb.due_date < CURRENT_DATE 
          THEN CURRENT_DATE - lb.due_date
          ELSE 0
        END as days_overdue
      FROM library_borrowings lb
      JOIN library_books book ON lb.book_id = book.id
      JOIN library_members lm ON lb.member_id = lm.id
      LEFT JOIN students s ON lm.student_id = s.id
      LEFT JOIN teachers t ON lm.teacher_id = t.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (status) {
      sql += ` AND lb.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (member_id) {
      sql += ` AND lb.member_id = $${paramCount}`;
      params.push(member_id);
      paramCount++;
    }

    if (book_id) {
      sql += ` AND lb.book_id = $${paramCount}`;
      params.push(book_id);
      paramCount++;
    }

    if (overdue === 'true') {
      sql += ` AND lb.status = 'issued' AND lb.due_date < CURRENT_DATE`;
    }

    sql += ` ORDER BY lb.created_at DESC`;
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const borrowings = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM library_borrowings lb WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countSql += ` AND lb.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    if (member_id) {
      countSql += ` AND lb.member_id = $${countParamIndex}`;
      countParams.push(member_id);
      countParamIndex++;
    }
    if (book_id) {
      countSql += ` AND lb.book_id = $${countParamIndex}`;
      countParams.push(book_id);
      countParamIndex++;
    }
    if (overdue === 'true') {
      countSql += ` AND lb.status = 'issued' AND lb.due_date < CURRENT_DATE`;
    }

    const totalResult = await query(countSql, countParams);
    const total = parseInt(totalResult[0].total);

    res.json({ 
      success: true, 
      data: borrowings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get all borrowings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get library statistics
export const getStatistics = async (req, res) => {
  try {
    const borrowingStats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as active_borrowings,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as total_returns,
        COUNT(CASE WHEN status = 'issued' AND due_date < CURRENT_DATE THEN 1 END) as overdue_books,
        SUM(CASE WHEN status = 'returned' THEN fine_paid ELSE 0 END) as total_fines_collected,
SUM(
  CASE
    WHEN status = 'issued'
      AND due_date < CURRENT_DATE
    THEN (CURRENT_DATE - due_date) * 5
    ELSE 0
  END
) as pending_fines
FROM library_borrowings
`);

const bookStats = await query(`
  SELECT 
    COUNT(*) as total_books,
    SUM(total_copies) as total_copies,
    SUM(available_copies) as available_copies,
    COUNT(DISTINCT category) as total_categories
  FROM library_books
  WHERE is_active = true
`);

const memberStats = await query(`
  SELECT 
    COUNT(*) as total_members,
    COUNT(
      CASE
        WHEN membership_end_date > CURRENT_DATE THEN 1
      END
    ) as active_members,
    COUNT(
      CASE
        WHEN membership_end_date <= CURRENT_DATE THEN 1
      END
    ) as expired_members,
    COUNT(
      CASE
        WHEN is_blocked = true THEN 1
      END
    ) as blocked_members
  FROM library_members
  WHERE status = 'active'
`);

const topBooks = await query(`
  SELECT 
    book.title,
    book.author,
    COUNT(lb.id) as borrow_count
  FROM library_borrowings lb
  JOIN library_books book
    ON lb.book_id = book.id
  GROUP BY
    book.id,
    book.title,
    book.author
  ORDER BY borrow_count DESC
  LIMIT 10
`);

res.json({
  success: true,
  data: {
    borrowings: borrowingStats[0],
    books: bookStats[0],
    members: memberStats[0],
    topBooks: topBooks
  }
});
} catch (error) {
  logger.error('Get statistics error:', error);
  res.status(500).json({
    success: false,
    message: error.message
  });
}
};
