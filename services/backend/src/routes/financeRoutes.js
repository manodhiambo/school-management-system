import express from 'express';
import financeController from '../controllers/financeController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All finance routes require authentication and finance role
router.use(authenticate);
router.use(authorize(['admin', 'finance_officer']));

// Dashboard
router.get('/dashboard', financeController.getDashboard);

// Chart of Accounts
router.get('/chart-of-accounts', financeController.getChartOfAccounts);
router.post('/chart-of-accounts', financeController.createAccount);

// Financial Years
router.get('/financial-years', financeController.getFinancialYears);
router.post('/financial-years', financeController.createFinancialYear);

// Income
router.get('/income', financeController.getIncomeRecords);
router.post('/income', financeController.createIncome);

// Expenses
router.get('/expenses', financeController.getExpenseRecords);
router.post('/expenses', financeController.createExpense);
router.put('/expenses/:id/approve', financeController.approveExpense);
router.put('/expenses/:id/reject', financeController.rejectExpense);
router.put('/expenses/:id/pay', financeController.payExpense);

// Vendors
router.get('/vendors', financeController.getVendors);
router.post('/vendors', financeController.createVendor);

// Bank Accounts
router.get('/bank-accounts', financeController.getBankAccounts);
router.post('/bank-accounts', financeController.createBankAccount);

// Reports
router.get('/reports/income-by-category', financeController.getIncomeByCategory);
router.get('/reports/expenses-by-category', financeController.getExpensesByCategory);

// Settings
router.get('/settings', financeController.getSettings);
router.put('/settings/:key', financeController.updateSetting);

export default router;
