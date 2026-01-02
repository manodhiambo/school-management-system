const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src', 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const financeRouteImport = "const financeRoutes = require('./routes/financeRoutes');";
const financeRouteUse = "app.use('/api/v1/finance', financeRoutes);";

if (!serverContent.includes(financeRouteImport)) {
  const lastImportIndex = serverContent.lastIndexOf("const");
  const endOfLineIndex = serverContent.indexOf('\n', lastImportIndex);
  serverContent = serverContent.slice(0, endOfLineIndex + 1) + financeRouteImport + '\n' + serverContent.slice(endOfLineIndex + 1);
  console.log('Added finance route import');
}

if (!serverContent.includes(financeRouteUse)) {
  const appUseIndex = serverContent.indexOf("app.use('/api/v1");
  const endOfLineIndex = serverContent.indexOf('\n', appUseIndex);
  serverContent = serverContent.slice(0, endOfLineIndex + 1) + financeRouteUse + '\n' + serverContent.slice(endOfLineIndex + 1);
  console.log('Added finance route usage');
}

fs.writeFileSync(serverPath, serverContent);
console.log('Server.js updated successfully with finance routes!');
