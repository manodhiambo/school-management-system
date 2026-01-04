import fs from 'fs';

let content = fs.readFileSync('DashboardPage.tsx', 'utf8');

// Add finance_officer case before default
content = content.replace(
  /case 'parent':\s+return <ParentDashboard \/>;/,
  `case 'parent':
      return <ParentDashboard />;
    case 'finance_officer':
      return <AdminDashboard />;`
);

fs.writeFileSync('DashboardPage.tsx', content);
console.log('✅ Fixed finance officer dashboard routing!');
