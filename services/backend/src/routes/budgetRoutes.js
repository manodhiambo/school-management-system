import express from 'express';
import budgetController from '../controllers/budgetController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All budget routes require authentication and finance role
router.use(authenticate);
router.use(authorize(['admin', 'finance_officer']));

// Budget CRUD
router.get('/', budgetController.getBudgets);
router.get('/:id', budgetController.getBudget);
router.post('/', budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

// Budget Actions
router.put('/:id/approve', budgetController.approveBudget);
router.put('/:id/close', budgetController.closeBudget);

// Budget Items
router.get('/:budgetId/items', budgetController.getBudgetItems);
router.post('/:budgetId/items', budgetController.addBudgetItem);
router.put('/items/:id', budgetController.updateBudgetItem);
router.delete('/items/:id', budgetController.deleteBudgetItem);

// Budget Analytics
router.get('/:id/summary', budgetController.getBudgetSummary);
router.get('/:id/variance', budgetController.getBudgetVariance);

export default router;
