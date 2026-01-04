import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Find and replace the createPettyCash method
const oldMethod = /async createPettyCash\(req, res\) \{[\s\S]*?catch \(error\) \{[\s\S]*?'Failed to create petty cash transaction'\s*\}\);[\s\S]*?\}/;

const newMethod = `async createPettyCash(req, res) {
    try {
      const {
        transaction_date,
        transaction_type,
        amount,
        description,
        custodian,
        receipt_number,
        category,
      } = req.body;

      // Get current balance
      const balanceResult = await pool.query(\`
        SELECT COALESCE(SUM(CASE 
          WHEN transaction_type = 'replenishment' THEN amount 
          ELSE -amount 
        END), 0) as current_balance
        FROM petty_cash
      \`);
      
      const balance_before = parseFloat(balanceResult.rows[0].current_balance);
      const balance_after = transaction_type === 'replenishment' 
        ? balance_before + parseFloat(amount)
        : balance_before - parseFloat(amount);

      // Generate transaction number
      const transactionNumber = await generateNumber('PC-', 'petty_cash', 'transaction_number');

      const result = await pool.query(\`
        INSERT INTO petty_cash (
          transaction_number, transaction_date, transaction_type, amount, 
          balance_before, balance_after, description,
          payee_name, receipt_number, category, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      \`, [
        transactionNumber,
        transaction_date,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        custodian,
        receipt_number,
        category,
        req.user.id,
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating petty cash transaction:', error);
      res.status(500).json({ error: 'Failed to create petty cash transaction' });
    }
  }`;

content = content.replace(oldMethod, newMethod);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed petty cash!');
