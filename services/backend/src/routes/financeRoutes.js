import express from 'express';
import financeController from '../controllers/financeController.js';
import { authenticate, authorize, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// All finance routes require authentication
router.use(authenticate);
router.use(requireModule('finance'));
router.use(tenantContext);
router.use(requireActiveTenant);
router.use(authorize(['admin', 'finance_officer', 'superadmin']));

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
router.delete('/income/:id', financeController.deleteIncome);

// Expenses - specific routes MUST come before general routes
router.put('/expenses/:id/approve', financeController.approveExpense);
router.put('/expenses/:id/reject', financeController.rejectExpense);
router.put('/expenses/:id/pay', financeController.payExpense);
router.delete('/expenses/:id', financeController.deleteExpense);
router.get('/expenses', financeController.getExpenseRecords);
router.post('/expenses', financeController.createExpense);

console.log("Finance routes loaded with approve/reject/pay endpoints");
// Vendors
router.get('/vendors', financeController.getVendors);
router.post('/vendors', financeController.createVendor);
router.delete('/vendors/:id', financeController.deleteVendor);

// Bank Accounts
router.get('/bank-accounts', financeController.getBankAccounts);
router.post('/bank-accounts', financeController.createBankAccount);

// Petty Cash
router.get('/petty-cash', financeController.getPettyCash);
router.post('/petty-cash', financeController.createPettyCash);
router.get('/petty-cash/summary', financeController.getPettyCashSummary);
router.delete('/petty-cash/:id', financeController.deletePettyCash);

// Assets
router.get('/assets', financeController.getAssets);
router.post('/assets', financeController.createAsset);
router.put('/assets/:id', financeController.updateAsset);
router.delete('/assets/:id', financeController.deleteAsset);
router.get('/assets/summary', financeController.getAssetsSummary);

// Reports
router.get('/reports/income-by-category', financeController.getIncomeByCategory);
router.get('/reports/expenses-by-category', financeController.getExpensesByCategory);

// Settings
router.get('/settings', financeController.getSettings);
router.put('/settings/:key', financeController.updateSetting);

// Fee Collection Integration
router.get('/fee-collection/summary', financeController.getFeeCollectionSummary);
router.get('/fee-collection/by-month', financeController.getFeeCollectionByMonth);
router.get('/fee-collection/by-class', financeController.getFeeCollectionByClass);
router.get('/fee-collection/defaulters', financeController.getFeeDefaulters);


// Bank Account Management
router.put('/bank-accounts/:id', financeController.updateBankAccount);
router.delete('/bank-accounts/:id', financeController.deleteBankAccount);
router.post('/bank-transactions', financeController.createBankTransaction);
router.get('/bank-transactions', financeController.getBankTransactions);
router.delete('/bank-transactions/:id', financeController.deleteBankTransaction);

// ── Advanced Accounting Reports ────────────────────────────────────────────
import { query } from '../config/database.js';

// GET /api/v1/finance/reports/trial-balance?dateFrom=&dateTo=
router.get('/reports/trial-balance', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom || '2000-01-01';
    const to   = dateTo   || new Date().toISOString().split('T')[0];

    // Income accounts (credit balances)
    const incomeRows = await query(`
      SELECT
        COALESCE(coa.account_code, 'INCOME') AS account_code,
        COALESCE(coa.account_name, ir.income_category) AS account_name,
        'income' AS account_type,
        0 AS debit_total,
        COALESCE(SUM(ir.total_amount), 0) AS credit_total
      FROM income_records ir
      LEFT JOIN chart_of_accounts coa ON coa.id = ir.account_id
      WHERE ir.tenant_id = $1 AND ir.status = 'completed'
        AND ir.income_date BETWEEN $2 AND $3
      GROUP BY coa.account_code, coa.account_name, ir.income_category
      ORDER BY account_name
    `, [tid, from, to]);

    // Expense accounts (debit balances)
    const expenseRows = await query(`
      SELECT
        COALESCE(coa.account_code, 'EXP') AS account_code,
        COALESCE(coa.account_name, er.expense_category) AS account_name,
        'expense' AS account_type,
        COALESCE(SUM(er.total_amount), 0) AS debit_total,
        0 AS credit_total
      FROM expense_records er
      LEFT JOIN chart_of_accounts coa ON coa.id = er.account_id
      WHERE er.tenant_id = $1
        AND er.expense_date BETWEEN $2 AND $3
      GROUP BY coa.account_code, coa.account_name, er.expense_category
      ORDER BY account_name
    `, [tid, from, to]);

    // Asset accounts — bank balances
    const assetRows = await query(`
      SELECT
        'BANK-' || id AS account_code,
        account_name,
        'asset' AS account_type,
        COALESCE(current_balance, 0) AS debit_total,
        0 AS credit_total
      FROM bank_accounts
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY account_name
    `, [tid]);

    // Petty cash
    const pcRows = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type IN ('replenishment','refund') THEN amount ELSE -amount END), 0) AS balance
      FROM petty_cash
      WHERE tenant_id = $1
        AND transaction_date BETWEEN $2 AND $3
    `, [tid, from, to]);
    const pcBalance = Number(pcRows[0]?.balance || 0);

    const accounts = [
      ...assetRows.map(r => ({ ...r, debit_total: Number(r.debit_total), credit_total: 0 })),
      ...(pcBalance !== 0 ? [{ account_code: 'PETTY-CASH', account_name: 'Petty Cash', account_type: 'asset', debit_total: Math.max(pcBalance, 0), credit_total: Math.max(-pcBalance, 0) }] : []),
      ...incomeRows.map(r => ({ ...r, debit_total: 0, credit_total: Number(r.credit_total) })),
      ...expenseRows.map(r => ({ ...r, debit_total: Number(r.debit_total), credit_total: 0 })),
    ];

    const totalDebit  = accounts.reduce((s, r) => s + r.debit_total, 0);
    const totalCredit = accounts.reduce((s, r) => s + r.credit_total, 0);

    res.json({ success: true, data: { accounts, totalDebit, totalCredit, dateFrom: from, dateTo: to } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/finance/reports/balance-sheet?date=
router.get('/reports/balance-sheet', async (req, res) => {
  try {
    const tid = req.tenantId;
    const asOf = req.query.date || new Date().toISOString().split('T')[0];

    // Assets: bank accounts
    const banks = await query(`
      SELECT account_name, COALESCE(current_balance,0) AS value, account_type AS bank_type
      FROM bank_accounts
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY account_name
    `, [tid]);

    // Assets: fixed assets
    const fixedAssets = await query(`
      SELECT asset_name, COALESCE(current_value, purchase_cost, 0) AS value, asset_category
      FROM assets
      WHERE tenant_id = $1 AND status != 'disposed'
      ORDER BY asset_name
    `, [tid]);

    // Assets: petty cash balance
    const pcRes = await query(`
      SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('replenishment','refund') THEN amount ELSE -amount END), 0) AS balance
      FROM petty_cash WHERE tenant_id = $1 AND transaction_date <= $2
    `, [tid, asOf]);
    const pettyCash = Math.max(Number(pcRes[0]?.balance || 0), 0);

    // Assets: fee receivables (outstanding invoices)
    const recRes = await query(`
      SELECT COALESCE(SUM(GREATEST(total_amount - paid_amount, 0)), 0) AS value
      FROM fee_invoices WHERE tenant_id = $1 AND status != 'cancelled'
    `, [tid]);
    const feeReceivables = Number(recRes[0]?.value || 0);

    // Liabilities: accounts payable (unpaid expenses)
    const apRes = await query(`
      SELECT COALESCE(SUM(total_amount), 0) AS value, expense_category AS category
      FROM expense_records
      WHERE tenant_id = $1 AND status = 'pending' AND expense_date <= $2
      GROUP BY expense_category
      ORDER BY expense_category
    `, [tid, asOf]);

    // Income: total income earned
    const incRes = await query(`
      SELECT COALESCE(SUM(total_amount), 0) AS value
      FROM income_records WHERE tenant_id = $1 AND status='completed' AND income_date <= $2
    `, [tid, asOf]);

    // Expenses: total expenses paid
    const expRes = await query(`
      SELECT COALESCE(SUM(total_amount), 0) AS value
      FROM expense_records WHERE tenant_id = $1 AND status='paid' AND expense_date <= $2
    `, [tid, asOf]);

    const totalBankBalance   = banks.reduce((s, r) => s + Number(r.value), 0);
    const totalFixedAssets   = fixedAssets.reduce((s, r) => s + Number(r.value), 0);
    const totalCurrentAssets = totalBankBalance + pettyCash + feeReceivables;
    const totalAssets        = totalCurrentAssets + totalFixedAssets;

    const totalLiabilities = apRes.reduce((s, r) => s + Number(r.value), 0);

    const retainedEarnings = Number(incRes[0]?.value || 0) - Number(expRes[0]?.value || 0);
    const totalEquity      = totalAssets - totalLiabilities;

    res.json({
      success: true,
      data: {
        asOf,
        assets: {
          currentAssets: [
            ...banks.map(b => ({ name: b.account_name + ' (' + b.bank_type + ')', value: Number(b.value) })),
            { name: 'Petty Cash', value: pettyCash },
            { name: 'Fee Receivables (Outstanding)', value: feeReceivables },
          ],
          fixedAssets: fixedAssets.map(a => ({ name: a.asset_name, category: a.asset_category, value: Number(a.value) })),
          totalCurrentAssets,
          totalFixedAssets,
          totalAssets,
        },
        liabilities: {
          items: apRes.map(r => ({ name: r.category + ' (Payable)', value: Number(r.value) })),
          totalLiabilities,
        },
        equity: {
          retainedEarnings,
          totalEquity,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/finance/reports/general-ledger?accountId=&dateFrom=&dateTo=
router.get('/reports/general-ledger', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { accountId, dateFrom, dateTo } = req.query;
    const from = dateFrom || '2000-01-01';
    const to   = dateTo   || new Date().toISOString().split('T')[0];

    // Get all accounts for the selector
    const accounts = await query(`
      SELECT id, account_code, account_name, account_type
      FROM chart_of_accounts WHERE (tenant_id = $1 OR tenant_id IS NULL) AND is_active = true ORDER BY account_code
    `, [tid]);

    if (!accountId) {
      return res.json({ success: true, data: { accounts, entries: [], openingBalance: 0, closingBalance: 0 } });
    }

    // Income entries for this account
    const incEntries = await query(`
      SELECT income_date AS txn_date, income_number AS ref, description,
             'income' AS txn_type, 0 AS debit, total_amount AS credit, status
      FROM income_records
      WHERE tenant_id = $1 AND account_id = $2 AND income_date BETWEEN $3 AND $4
      ORDER BY income_date
    `, [tid, accountId, from, to]);

    // Expense entries for this account
    const expEntries = await query(`
      SELECT expense_date AS txn_date, expense_number AS ref, description,
             'expense' AS txn_type, total_amount AS debit, 0 AS credit, status
      FROM expense_records
      WHERE tenant_id = $1 AND account_id = $2 AND expense_date BETWEEN $3 AND $4
      ORDER BY expense_date
    `, [tid, accountId, from, to]);

    // Journal line entries for this account
    const jlEntries = await query(`
      SELECT je.entry_date AS txn_date, je.entry_number AS ref, jel.description,
             'journal' AS txn_type, jel.debit_amount AS debit, jel.credit_amount AS credit, je.status
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = $1 AND je.entry_date BETWEEN $2 AND $3
      ORDER BY je.entry_date
    `, [accountId, from, to]);

    const allEntries = [...incEntries, ...expEntries, ...jlEntries]
      .sort((a, b) => new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime());

    let runningBalance = 0;
    const entriesWithBalance = allEntries.map(e => {
      runningBalance += Number(e.credit) - Number(e.debit);
      return { ...e, debit: Number(e.debit), credit: Number(e.credit), balance: runningBalance };
    });

    const selectedAccount = accounts.find(a => String(a.id) === String(accountId));

    res.json({
      success: true,
      data: {
        accounts,
        account: selectedAccount,
        entries: entriesWithBalance,
        openingBalance: 0,
        closingBalance: runningBalance,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/finance/journals?dateFrom=&dateTo=&status=
router.get('/journals', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { dateFrom, dateTo, status } = req.query;
    const from = dateFrom || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const to   = dateTo   || new Date().toISOString().split('T')[0];

    const conditions = ['je.entry_date BETWEEN $2 AND $3'];
    const params     = [tid, from, to];

    if (status) {
      params.push(status);
      conditions.push(`je.status = $${params.length}`);
    }

    // For multi-tenant journals we filter by created_by user's tenant
    const rows = await query(`
      SELECT je.*,
             u.first_name || ' ' || u.last_name AS created_by_name,
             COUNT(jel.id) AS line_count
      FROM journal_entries je
      LEFT JOIN users u ON u.id = je.created_by AND u.tenant_id = $1
      LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY je.id, u.first_name, u.last_name
      ORDER BY je.entry_date DESC
      LIMIT 200
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/finance/journals/:id — journal entry detail with lines
router.get('/journals/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT je.*,
             u.first_name || ' ' || u.last_name AS created_by_name
      FROM journal_entries je
      LEFT JOIN users u ON u.id = je.created_by
      WHERE je.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Journal entry not found' });

    const lines = await query(`
      SELECT jel.*, coa.account_code, coa.account_name, coa.account_type
      FROM journal_entry_lines jel
      LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
      WHERE jel.journal_entry_id = $1
      ORDER BY jel.id
    `, [req.params.id]);

    res.json({ success: true, data: { ...rows[0], lines } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/finance/journals — create a manual journal entry
router.post('/journals', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { entry_date, description, lines } = req.body;
    if (!entry_date || !description || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, message: 'entry_date, description, and at least 2 lines required' });
    }

    const totalDebit  = lines.reduce((s, l) => s + Number(l.debit_amount  || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ success: false, message: `Journal entry must balance: debits (${totalDebit}) ≠ credits (${totalCredit})` });
    }

    // Generate entry number
    const countRes = await query(`SELECT COUNT(*) AS cnt FROM journal_entries`, []);
    const entryNumber = `JNL-${String(Number(countRes[0].cnt) + 1).padStart(5, '0')}`;

    const jeRows = await query(`
      INSERT INTO journal_entries (entry_number, entry_date, description, total_debit, total_credit, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'posted', $6)
      RETURNING *
    `, [entryNumber, entry_date, description, totalDebit, totalCredit, req.user?.id]);

    const je = jeRows[0];
    for (const l of lines) {
      await query(`
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [je.id, l.account_id, l.debit_amount || 0, l.credit_amount || 0, l.description || '']);
    }

    res.status(201).json({ success: true, data: je });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
