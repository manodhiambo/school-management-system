const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (authenticated users)
router.use(authenticate);

// Books catalog
router.get('/books', libraryController.getBooks);
router.get('/books/:id', libraryController.getBook);
router.get('/categories', libraryController.getCategories);

// Member routes
router.get('/member', libraryController.getMember);
router.get('/my-borrowings', libraryController.getMyBorrowings);

// Admin/Librarian only routes
router.post('/books', authorize(['admin']), libraryController.addBook);
router.put('/books/:id', authorize(['admin']), libraryController.updateBook);
router.delete('/books/:id', authorize(['admin']), libraryController.deleteBook);

router.post('/issue', authorize(['admin', 'teacher']), libraryController.issueBook);
router.put('/return/:id', authorize(['admin', 'teacher']), libraryController.returnBook);
router.get('/borrowings', authorize(['admin', 'teacher']), libraryController.getAllBorrowings);
router.get('/statistics', authorize(['admin', 'teacher']), libraryController.getStatistics);

module.exports = router;
