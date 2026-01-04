import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Add new methods before the closing brace of the class
const newMethods = `
  // Bank Account Management
  async updateBankAccount(req, res) {
    try {
      const { id } = req.params;
      const { account_name, account_number, bank_name, branch, account_type, currency, current_balance } = req.body;

      const result = await pool.query(\`
        UPDATE bank_accounts
        SET
          account_name = COALESCE($1, account_name),
          account_number = COALESCE($2, account_number),
          bank_name = COALESCE($3, bank_name),
          branch = COALESCE($4, branch),
          account_type = COALESCE($5, account_type),
          currency = COALESCE($6, currency),
          current_balance = COALESCE($7, current_balance),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      \`, [account_name, account_number, bank_name, branch, account_type, currency, current_balance, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bank account not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating bank account:', error);
      res.status(500).json({ error: 'Failed to update bank account' });
    }
  }

  async deleteBankAccount(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(\`
        DELETE FROM bank_accounts
        WHERE id = $1
        RETURNING *
      \`, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bank account not found' });
      }

      res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      res.status(500).json({ error: 'Failed to delete bank account' });
    }
  }

  async createBankTransaction(req, res) {
    try {
      const {
        account_id,
        to_account_id,
        transaction_type,
        amount,
        description,
        transaction_date,
        reference_number,
      } = req.body;

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Generate transaction number
        const transactionNumber = await generateNumber('BTX-', 'bank_transactions', 'transaction_number');

        // Create transaction record
        const transaction = await client.query(\`
          INSERT INTO bank_transactions (
            transaction_number, account_id, to_account_id, transaction_type,
            amount, description, transaction_date, reference_number,
            created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        \`, [
          transactionNumber,
          account_id,
          to_account_id || null,
          transaction_type,
          amount,
          description,
          transaction_date,
          reference_number,
          req.user.id,
        ]);

        // Update account balances
        if (transaction_type === 'deposit') {
          await client.query(\`
            UPDATE bank_accounts
            SET current_balance = current_balance + $1
            WHERE id = $2
          \`, [amount, account_id]);
        } else if (transaction_type === 'withdrawal') {
          await client.query(\`
            UPDATE bank_accounts
            SET current_balance = current_balance - $1
            WHERE id = $2
          \`, [amount, account_id]);
        } else if (transaction_type === 'transfer') {
          // Deduct from source account
          await client.query(\`
            UPDATE bank_accounts
            SET current_balance = current_balance - $1
            WHERE id = $2
          \`, [amount, account_id]);

          // Add to destination account
          await client.query(\`
            UPDATE bank_accounts
            SET current_balance = current_balance + $1
            WHERE id = $2
          \`, [amount, to_account_id]);
        }

        await client.query('COMMIT');
        res.status(201).json(transaction.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating bank transaction:', error);
      res.status(500).json({ error: 'Failed to create bank transaction' });
    }
  }

  async getBankTransactions(req, res) {
    try {
      const { accountId } = req.query;

      let query = \`
        SELECT
          bt.*,
          ba1.account_name as from_account_name,
          ba1.bank_name as from_bank_name,
          ba2.account_name as to_account_name,
          ba2.bank_name as to_bank_name,
          u.email as created_by_email
        FROM bank_transactions bt
        LEFT JOIN bank_accounts ba1 ON bt.account_id = ba1.id
        LEFT JOIN bank_accounts ba2 ON bt.to_account_id = ba2.id
        LEFT JOIN users u ON bt.created_by = u.id
        WHERE 1=1
      \`;

      const params = [];
      if (accountId) {
        query += \` AND (bt.account_id = $1 OR bt.to_account_id = $1)\`;
        params.push(accountId);
      }

      query += \` ORDER BY bt.transaction_date DESC, bt.created_at DESC\`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
  }
`;

// Insert before the last closing brace
content = content.replace(/}\s*export default new FinanceController/, newMethods + '\n}\n\nexport default new FinanceController');

fs.writeFileSync('financeController.js', content);
console.log('✅ Added bank management methods!');
