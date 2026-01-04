import fs from 'fs';

let content = fs.readFileSync('financeController.js', 'utf8');

// Fix createAsset to generate asset_code and use asset_category
const oldCreateAsset = /async createAsset\(req, res\) \{[\s\S]*?catch \(error\) \{[\s\S]*?'Failed to create asset'\s*\}\);[\s\S]*?\n  \}/;

const newCreateAsset = `async createAsset(req, res) {
    try {
      const data = req.body;
      
      // Generate asset code
      const asset_code = await generateNumber('AST-', 'assets', 'asset_code');
      
      const result = await pool.query(\`
        INSERT INTO assets (
          asset_code, asset_name, asset_category, purchase_date, purchase_cost,
          current_value, location, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      \`, [
        asset_code,
        data.asset_name,
        data.category || data.asset_category,
        data.purchase_date,
        data.purchase_cost,
        data.current_value || data.purchase_cost,
        data.location,
        data.status || 'active',
        req.user.id,
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }`;

content = content.replace(oldCreateAsset, newCreateAsset);

// Fix updateAsset to use asset_category
content = content.replace(
  /category = COALESCE\(\$2, category\)/g,
  'asset_category = COALESCE($2, asset_category)'
);

fs.writeFileSync('financeController.js', content);
console.log('✅ Fixed assets!');
