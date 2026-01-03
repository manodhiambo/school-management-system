import fs from 'fs';

const content = fs.readFileSync('financeController.js', 'utf8');

// Replace is_active with is_current (the correct column name)
const fixed = content.replace(
  /WHERE is_active = true/g,
  'WHERE is_current = true'
);

fs.writeFileSync('financeController.js', fixed);
console.log('Fixed dashboard query!');
