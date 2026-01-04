import fs from 'fs';

let content = fs.readFileSync('Transactions.tsx', 'utf8');

// Add style tag in the return statement, right after the opening div
content = content.replace(
  /return \(\s*<div className="space-y-6">/,
  `return (
    <>
      <style>
        {\`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px;
              background: white;
            }
            .print\\:hidden {
              display: none !important;
            }
            @page {
              margin: 20mm;
            }
          }
        \`}
      </style>
      <div className="space-y-6">`
);

// Close the fragment at the end (before the last closing tag)
content = content.replace(
  /    <\/div>\s*\);\s*}\s*$/,
  `    </div>
    </>
  );
}`
);

fs.writeFileSync('Transactions.tsx', content);
console.log('✅ Added print styles!');
