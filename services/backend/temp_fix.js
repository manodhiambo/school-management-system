// In getStudents, replace:
const [countResult] = await query(countSql, params);
const total = countResult[0].total;

// With:
const countResults = await query(countSql, params);
const total = countResults && countResults.length > 0 ? countResults[0].total : 0;
