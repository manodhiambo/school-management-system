import fs from 'fs';

let content = fs.readFileSync('Transactions.tsx', 'utf8');

// Fix formatDate - the field should be income_date or expense_date, not transaction_date
content = content.replace(
  /formatDate\(record\.transaction_date\)/g,
  `formatDate(activeTab === 'income' ? record.income_date : record.expense_date)`
);

// Add View Details modal state
content = content.replace(
  /const \[showModal, setShowModal\] = useState\(false\);/,
  `const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);`
);

// Add handleViewDetails function before handleSubmit
content = content.replace(
  /const handleSubmit = async/,
  `const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleSubmit = async`
);

// Update the Eye button to call handleViewDetails
content = content.replace(
  /<button className="text-blue-600 hover:text-blue-800">\s*<Eye className="h-5 w-5" \/>\s*<\/button>/g,
  `<button 
                        onClick={() => handleViewDetails(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>`
);

fs.writeFileSync('Transactions.tsx', content);
console.log('✅ Fixed Transactions!');
