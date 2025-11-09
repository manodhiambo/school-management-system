const express = require('express');
const router = express.Router();
const ParentController = require('../controllers/parent.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const requireAdmin = requireRole(['admin']);

// All routes require authentication
router.use(authMiddleware);

router.post('/', requireAdmin, ParentController.createParent);
router.get('/:id', ParentController.getParentById);
router.get('/:id/children', ParentController.getParentChildren);
router.post('/:id/link-student', requireAdmin, ParentController.linkStudent);
router.get('/:id/payments', requireAdmin, ParentController.getParentPayments);

module.exports = router;
