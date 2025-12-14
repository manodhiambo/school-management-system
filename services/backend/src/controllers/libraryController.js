import { query } from '../config/database.js';
import logger from '../utils/logger.js';

// Get all library members (for admin)
export const getAllMembers = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        lm.*,
        u.first_name,
        u.last_name,
        u.email,
        u.student_id,
        u.staff_id
      FROM library_members lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.is_active = TRUE
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
    const result = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.student_id,
        u.staff_id,
        u.role
      FROM users u
      LEFT JOIN library_members lm ON u.id = lm.user_id AND lm.is_active = TRUE
      WHERE lm.id IS NULL
      AND u.is_active = TRUE
      ORDER BY u.first_name, u.last_name
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get users without membership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create library member
export const createMember = async (req, res) => {
  try {
    const { user_id, membership_type, membership_fee, payment_status, payment_method, notes } = req.body;

    // Check if user already has active membership
    const existing = await query(
      'SELECT id FROM library_members WHERE user_id = ? AND is_active = TRUE',
      [user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has an active library membership' 
      });
    }

    // Calculate expiry date based on membership type
    let expiry_date = new Date();
    switch(membership_type) {
      case 'student':
        expiry_date.setFullYear(expiry_date.getFullYear() + 1);
        break;
      case 'teacher':
        expiry_date.setFullYear(expiry_date.getFullYear() + 1);
        break;
      case 'staff':
        expiry_date.setFullYear(expiry_date.getFullYear() + 1);
        break;
      default:
        expiry_date.setMonth(expiry_date.getMonth() + 6);
    }

    const result = await query(
      `INSERT INTO library_members 
      (user_id, membership_type, membership_fee, payment_status, payment_method, 
       expiry_date, notes, registered_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, membership_type, membership_fee, payment_status, payment_method, 
       expiry_date, notes, req.user.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Library member created successfully',
      data: { id: result.insertId }
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

    // Build dynamic update query
    const fields = Object.keys(updates)
      .filter(key => !['id', 'user_id', 'created_at'].includes(key))
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => !['id', 'user_id', 'created_at'].includes(key))
      .map(key => updates[key]);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await query(
      `UPDATE library_members SET ${fields} WHERE id = ?`,
      [...values, id]
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

    // Check for active rentals
    const activeRentals = await query(
      'SELECT COUNT(*) as count FROM library_rentals WHERE member_id = ? AND status = ?',
      [id, 'borrowed']
    );

    if (activeRentals[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot deactivate member with active rentals' 
      });
    }

    await query(
      'UPDATE library_members SET is_active = FALSE WHERE id = ?',
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
        u.first_name,
        u.last_name,
        u.email
      FROM library_members lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.user_id = ? AND lm.is_active = TRUE
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
      'SELECT id FROM library_members WHERE user_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (member.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const result = await query(`
      SELECT 
        lr.*,
        lb.title,
        lb.author,
        lb.isbn,
        lb.cover_image,
        CASE 
          WHEN lr.status = 'borrowed' AND lr.due_date < NOW() THEN TRUE
          ELSE FALSE
        END as is_overdue,
        DATEDIFF(NOW(), lr.due_date) as days_overdue
      FROM library_rentals lr
      JOIN library_books lb ON lr.book_id = lb.id
      WHERE lr.member_id = ?
      ORDER BY lr.created_at DESC
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

// Barcode/QR code search
export const searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await query(
      `SELECT * FROM library_books
       WHERE is_active = TRUE
       AND (isbn = ? OR keywords LIKE ?)
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
        (lb.total_copies - COALESCE(COUNT(lr.id), 0)) as available_copies
      FROM library_books lb
      LEFT JOIN library_rentals lr ON lb.id = lr.book_id AND lr.status = 'borrowed'
      WHERE lb.is_active = TRUE
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (lb.title LIKE ? OR lb.author LIKE ? OR lb.isbn LIKE ? OR lb.keywords LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category) {
      sql += ` AND lb.category = ?`;
      params.push(category);
    }

    sql += ` GROUP BY lb.id`;

    if (availability === 'available') {
      sql += ` HAVING available_copies > 0`;
    } else if (availability === 'unavailable') {
      sql += ` HAVING available_copies = 0`;
    }

    sql += ` ORDER BY lb.created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const books = await query(sql, params);

    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT lb.id) as total FROM library_books lb WHERE lb.is_active = TRUE`;
    const countParams = [];
    
    if (search) {
      countSql += ` AND (lb.title LIKE ? OR lb.author LIKE ? OR lb.isbn LIKE ? OR lb.keywords LIKE ?)`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    if (category) {
      countSql += ` AND lb.category = ?`;
      countParams.push(category);
    }

    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

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
      SELECT 
        lb.*,
        (lb.total_copies - COALESCE(COUNT(lr.id), 0)) as available_copies
      FROM library_books lb
      LEFT JOIN library_rentals lr ON lb.id = lr.book_id AND lr.status = 'borrowed'
      WHERE lb.id = ? AND lb.is_active = TRUE
      GROUP BY lb.id
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
      author,
      isbn,
      publisher,
      publication_year,
      category,
      total_copies,
      shelf_location,
      description,
      keywords,
      cover_image
    } = req.body;

    // Check if ISBN already exists
    if (isbn) {
      const existing = await query(
        'SELECT id FROM library_books WHERE isbn = ? AND is_active = TRUE',
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
      (title, author, isbn, publisher, publication_year, category, 
       total_copies, shelf_location, description, keywords, cover_image, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, author, isbn, publisher, publication_year, category, 
       total_copies, shelf_location, description, keywords, cover_image, req.user.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Book added successfully',
      data: { id: result.insertId }
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

    // Build dynamic update query
    const fields = Object.keys(updates)
      .filter(key => !['id', 'added_by', 'created_at'].includes(key))
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => !['id', 'added_by', 'created_at'].includes(key))
      .map(key => updates[key]);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await query(
      `UPDATE library_books SET ${fields} WHERE id = ?`,
      [...values, id]
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

    // Check for active rentals
    const activeRentals = await query(
      'SELECT COUNT(*) as count FROM library_rentals WHERE book_id = ? AND status = ?',
      [id, 'borrowed']
    );

    if (activeRentals[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete book with active rentals' 
      });
    }

    await query(
      'UPDATE library_books SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    logger.error('Delete book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== RENTAL MANAGEMENT ====================

// Issue/Borrow a book
export const issueBook = async (req, res) => {
  try {
    const { member_id, book_id, due_date, notes } = req.body;

    // Check if member exists and is active
    const member = await query(
      'SELECT * FROM library_members WHERE id = ? AND is_active = TRUE',
      [member_id]
    );

    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found or inactive' });
    }

    // Check if membership is expired
    if (new Date(member[0].expiry_date) < new Date()) {
      return res.status(400).json({ success: false, message: 'Membership has expired' });
    }

    // Check if book is available
    const bookAvailability = await query(`
      SELECT 
        lb.total_copies,
        COUNT(lr.id) as borrowed_count
      FROM library_books lb
      LEFT JOIN library_rentals lr ON lb.id = lr.book_id AND lr.status = 'borrowed'
      WHERE lb.id = ? AND lb.is_active = TRUE
      GROUP BY lb.id
    `, [book_id]);

    if (bookAvailability.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const available = bookAvailability[0].total_copies - bookAvailability[0].borrowed_count;
    if (available <= 0) {
      return res.status(400).json({ success: false, message: 'Book is not available' });
    }

    // Check if member already borrowed this book
    const existingRental = await query(
      'SELECT id FROM library_rentals WHERE member_id = ? AND book_id = ? AND status = ?',
      [member_id, book_id, 'borrowed']
    );

    if (existingRental.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member has already borrowed this book' 
      });
    }

    // Create rental record
    const result = await query(
      `INSERT INTO library_rentals 
      (member_id, book_id, borrowed_date, due_date, notes, issued_by)
      VALUES (?, ?, NOW(), ?, ?, ?)`,
      [member_id, book_id, due_date, notes, req.user.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Book issued successfully',
      data: { id: result.insertId }
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
    const { condition, fine_amount, notes } = req.body;

    // Get rental details
    const rental = await query(
      'SELECT * FROM library_rentals WHERE id = ? AND status = ?',
      [id, 'borrowed']
    );

    if (rental.length === 0) {
      return res.status(404).json({ success: false, message: 'Active rental not found' });
    }

    // Update rental record
    await query(
      `UPDATE library_rentals 
      SET status = 'returned', 
          returned_date = NOW(), 
          return_condition = ?,
          fine_amount = ?,
          notes = CONCAT(COALESCE(notes, ''), '\nReturn: ', ?)
      WHERE id = ?`,
      [condition, fine_amount || 0, notes || '', id]
    );

    res.json({ success: true, message: 'Book returned successfully' });
  } catch (error) {
    logger.error('Return book error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all borrowings/rentals (admin view)
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
        lr.*,
        lb.title as book_title,
        lb.author as book_author,
        lb.isbn,
        u.first_name,
        u.last_name,
        u.email,
        lm.membership_type,
        CASE 
          WHEN lr.status = 'borrowed' AND lr.due_date < NOW() THEN TRUE
          ELSE FALSE
        END as is_overdue,
        DATEDIFF(NOW(), lr.due_date) as days_overdue
      FROM library_rentals lr
      JOIN library_books lb ON lr.book_id = lb.id
      JOIN library_members lm ON lr.member_id = lm.id
      JOIN users u ON lm.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ` AND lr.status = ?`;
      params.push(status);
    }

    if (member_id) {
      sql += ` AND lr.member_id = ?`;
      params.push(member_id);
    }

    if (book_id) {
      sql += ` AND lr.book_id = ?`;
      params.push(book_id);
    }

    if (overdue === 'true') {
      sql += ` AND lr.status = 'borrowed' AND lr.due_date < NOW()`;
    }

    sql += ` ORDER BY lr.created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const rentals = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM library_rentals lr WHERE 1=1`;
    const countParams = [];
    
    if (status) {
      countSql += ` AND lr.status = ?`;
      countParams.push(status);
    }
    if (member_id) {
      countSql += ` AND lr.member_id = ?`;
      countParams.push(member_id);
    }
    if (book_id) {
      countSql += ` AND lr.book_id = ?`;
      countParams.push(book_id);
    }
    if (overdue === 'true') {
      countSql += ` AND lr.status = 'borrowed' AND lr.due_date < NOW()`;
    }

    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

    res.json({ 
      success: true, 
      data: rentals,
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
    const stats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_rentals,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as total_returns,
        COUNT(CASE WHEN status = 'borrowed' AND due_date < NOW() THEN 1 END) as overdue_books,
        SUM(CASE WHEN status = 'returned' THEN fine_amount ELSE 0 END) as total_fines_collected
      FROM library_rentals
    `);

    const bookStats = await query(`
      SELECT 
        COUNT(*) as total_books,
        SUM(total_copies) as total_copies,
        COUNT(DISTINCT category) as total_categories
      FROM library_books
      WHERE is_active = TRUE
    `);

    const memberStats = await query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN expiry_date > NOW() THEN 1 END) as active_members,
        COUNT(CASE WHEN expiry_date <= NOW() THEN 1 END) as expired_members
      FROM library_members
      WHERE is_active = TRUE
    `);

    const topBooks = await query(`
      SELECT 
        lb.title,
        lb.author,
        COUNT(lr.id) as rental_count
      FROM library_rentals lr
      JOIN library_books lb ON lr.book_id = lb.id
      GROUP BY lr.book_id
      ORDER BY rental_count DESC
      LIMIT 10
    `);

    res.json({ 
      success: true, 
      data: {
        rentals: stats[0],
        books: bookStats[0],
        members: memberStats[0],
        topBooks: topBooks
      }
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
