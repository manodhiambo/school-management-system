const fs = require('fs');

const appContent = fs.readFileSync('App.tsx', 'utf8');

// Update imports
let updated = appContent.replace(
  /import\s+Budgets\s+from\s+['"]\.\/pages\/finance\/Budgets['"];?/g,
  "import BudgetManagement from './pages/finance/BudgetManagement';"
);

updated = updated.replace(
  /import\s+Vendors\s+from\s+['"]\.\/pages\/finance\/Vendors['"];?/g,
  "import VendorsPurchaseOrders from './pages/finance/VendorsPurchaseOrders';"
);

// Update route components
updated = updated.replace(
  /<Route\s+path=["']\/finance\/budgets["']\s+element={<Budgets\s*\/>}\s*\/>/g,
  '<Route path="/finance/budgets" element={<BudgetManagement />} />'
);

updated = updated.replace(
  /<Route\s+path=["']\/finance\/vendors["']\s+element={<Vendors\s*\/>}\s*\/>/g,
  '<Route path="/finance/vendors" element={<VendorsPurchaseOrders />} />'
);

fs.writeFileSync('App.tsx', updated);
console.log('Updated App.tsx successfully');
