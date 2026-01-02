import financeService from '../services/financeService.js';

class FinanceController {

  async getChartOfAccounts(req, res) {
    try {
      const accounts = await financeService.getChartOfAccounts(req.query);
      res.json({ success: true, data: accounts });
    } catch (error) {
      console.error('Error getting chart of accounts:', error);
      res.status(500).json({ success: false, message: 'Failed to get accounts', error: error.message });
    }
  }

  async createAccount(req, res) {
    try {
      const account = await financeService.createAccount(req.body, req.user.id);
      res.status(201).json({ success: true, data: account, message: 'Account created successfully' });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ success: false, message: 'Failed to create account', error: error.message });
    }
  }

  async getFinancialYears(req, res) {
    try {
      const years = await financeService.getFinancialYears();
      res.json({ success: true, data: years });
    } catch (error) {
      console.error('Error getting financial years:', error);
      res.status(500).json({ success: false, message: 'Failed to get financial years', error: error.message });
    }
  }

  async createFinancialYear(req, res) {
    try {
      const year = await financeService.createFinancialYear(req.body);
      res.status(201).json({ success: true, data: year, message: 'Financial year created successfully' });
    } catch (error) {
      console.error('Error creating financial year:', error);
      res.status(500).json({ success: false, message: 'Failed to create financial year', error: error.message });
    }
  }

  async getIncomeRecords(req, res) {
    try {
      const income = await financeService.getIncomeRecords(req.query);
      res.json({ success: true, data: income.data, pagination: { total: income.total, limit: income.limit, offset: income.offset } });
    } catch (error) {
      console.error('Error getting income records:', error);
      res.status(500).json({ success: false, message: 'Failed to get income records', error: error.message });
    }
  }

  async createIncome(req, res) {
    try {
      const income = await financeService.createIncome(req.body, req.user.id);
      res.status(201).json({ success: true, data: income, message: 'Income record created successfully' });
    } catch (error) {
      console.error('Error creating income:', error);
      res.status(500).json({ success: false, message: 'Failed to create income record', error: error.message });
    }
  }

  async getExpenseRecords(req, res) {
    try {
      const expenses = await financeService.getExpenseRecords(req.query);
      res.json({ success: true, data: expenses.data, pagination: { total: expenses.total, limit: expenses.limit, offset: expenses.offset } });
    } catch (error) {
      console.error('Error getting expense records:', error);
      res.status(500).json({ success: false, message: 'Failed to get expense records', error: error.message });
    }
  }

  async createExpense(req, res) {
    try {
      const expense = await financeService.createExpense(req.body, req.user.id);
      res.status(201).json({ success: true, data: expense, message: 'Expense record created successfully' });
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ success: false, message: 'Failed to create expense record', error: error.message });
    }
  }

  async approveExpense(req, res) {
    try {
      const expense = await financeService.approveExpense(req.params.id, req.user.id);
      res.json({ success: true, data: expense, message: 'Expense approved successfully' });
    } catch (error) {
      console.error('Error approving expense:', error);
      res.status(500).json({ success: false, message: 'Failed to approve expense', error: error.message });
    }
  }

  async rejectExpense(req, res) {
    try {
      const expense = await financeService.rejectExpense(req.params.id, req.user.id);
      res.json({ success: true, data: expense, message: 'Expense rejected successfully' });
    } catch (error) {
      console.error('Error rejecting expense:', error);
      res.status(500).json({ success: false, message: 'Failed to reject expense', error: error.message });
    }
  }

  async payExpense(req, res) {
    try {
      const expense = await financeService.payExpense(req.params.id);
      res.json({ success: true, data: expense, message: 'Expense paid successfully' });
    } catch (error) {
      console.error('Error paying expense:', error);
      res.status(500).json({ success: false, message: 'Failed to pay expense', error: error.message });
    }
  }

  async getVendors(req, res) {
    try {
      const vendors = await financeService.getVendors(req.query);
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error('Error getting vendors:', error);
      res.status(500).json({ success: false, message: 'Failed to get vendors', error: error.message });
    }
  }

  async createVendor(req, res) {
    try {
      const vendor = await financeService.createVendor(req.body, req.user.id);
      res.status(201).json({ success: true, data: vendor, message: 'Vendor created successfully' });
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ success: false, message: 'Failed to create vendor', error: error.message });
    }
  }

  async getBankAccounts(req, res) {
    try {
      const accounts = await financeService.getBankAccounts();
      res.json({ success: true, data: accounts });
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      res.status(500).json({ success: false, message: 'Failed to get bank accounts', error: error.message });
    }
  }

  async createBankAccount(req, res) {
    try {
      const account = await financeService.createBankAccount(req.body, req.user.id);
      res.status(201).json({ success: true, data: account, message: 'Bank account created successfully' });
    } catch (error) {
      console.error('Error creating bank account:', error);
      res.status(500).json({ success: false, message: 'Failed to create bank account', error: error.message });
    }
  }

  async getDashboard(req, res) {
    try {
      const stats = await financeService.getDashboardStats(req.query);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ success: false, message: 'Failed to get dashboard stats', error: error.message });
    }
  }

  async getIncomeByCategory(req, res) {
    try {
      const data = await financeService.getIncomeByCategory();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting income by category:', error);
      res.status(500).json({ success: false, message: 'Failed to get income by category', error: error.message });
    }
  }

  async getExpensesByCategory(req, res) {
    try {
      const data = await financeService.getExpensesByCategory();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      res.status(500).json({ success: false, message: 'Failed to get expenses by category', error: error.message });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await financeService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ success: false, message: 'Failed to get settings', error: error.message });
    }
  }

  async updateSetting(req, res) {
    try {
      const setting = await financeService.updateSetting(req.params.key, req.body.value, req.user.id);
      res.json({ success: true, data: setting, message: 'Setting updated successfully' });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ success: false, message: 'Failed to update setting', error: error.message });
    }
  }
}

export default new FinanceController();
