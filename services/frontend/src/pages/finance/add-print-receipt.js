import fs from 'fs';

let content = fs.readFileSync('Transactions.tsx', 'utf8');

// Add print function after handleViewDetails
content = content.replace(
  /const handleViewDetails = \(record: any\) => \{[\s\S]*?\};/,
  `const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };`
);

// Add print button in the details modal (after the title)
content = content.replace(
  /<h2 className="text-2xl font-bold text-gray-900">\s*\{activeTab === "income" \? "Income" : "Expense"\} Details\s*<\/h2>/,
  `<h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "income" ? "Income" : "Expense"} Details
              </h2>
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 print:hidden"
              >
                Print Receipt
              </button>`
);

// Fix expense action button - it's missing onClick handler
content = content.replace(
  /<button className="text-gray-600 hover:text-gray-800">\s*<Eye className="h-5 w-5" \/>\s*<\/button>/g,
  `<button
                        onClick={() => handleViewDetails(record)}
                        className="text-gray-600 hover:text-gray-800"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>`
);

fs.writeFileSync('Transactions.tsx', content);
console.log('✅ Added print receipt and fixed expense actions!');
