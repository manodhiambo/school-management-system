#!/bin/bash

echo "=========================================="
echo "UPDATING ALL REMAINING ROUTES"
echo "=========================================="

# List of routes that need updating
ROUTES=(
  "classes.routes.js"
  "subjects.routes.js"
  "attendanceRoutes.js"
  "feeRoutes.js"
  "exams.routes.js"
  "timetableRoutes.js"
  "assignmentRoutes.js"
  "gradebookRoutes.js"
  "notificationRoutes.js"
  "settingsRoutes.js"
  "userRoutes.js"
  "libraryRoutes.js"
  "financeRoutes.js"
  "budgetRoutes.js"
  "purchaseOrderRoutes.js"
  "academicRoutes.js"
  "communicationRoutes.js"
  "passwordRoutes.js"
)

for route in "${ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "Processing $route..."
    
    # Add comprehensive tenant_id filters using Python
    python3 << PYTHON
import re

with open('$route', 'r') as f:
    content = f.read()

# Skip if already has comprehensive tenant filters
if 'WHERE tenant_id = \$1' in content or 'WHERE t.tenant_id' in content:
    print('  ✓ Already updated')
    exit(0)

# Add tenant_id to WHERE clauses
# Pattern 1: Simple FROM table WHERE
content = re.sub(
    r'FROM (\w+)\s+WHERE\s+(?!.*tenant_id)',
    r'FROM \1 WHERE tenant_id = \$1 AND',
    content
)

# Pattern 2: FROM table with alias WHERE
content = re.sub(
    r'FROM (\w+)\s+(\w+)\s+WHERE\s+(?!.*tenant_id)',
    r'FROM \1 \2 WHERE \2.tenant_id = \$1 AND',
    content
)

# Pattern 3: Add tenant_id to INSERT
content = re.sub(
    r'INSERT INTO (\w+)\s*\((?!.*tenant_id)([^)]+)\)',
    r'INSERT INTO \1 (tenant_id, \2)',
    content
)

# Pattern 4: Add req.user.tenantId to VALUES
content = re.sub(
    r'VALUES\s*\(\s*\$1',
    r'VALUES (\$1, \$2',
    content
)

# Update parameter arrays to include tenantId first
content = re.sub(
    r'\[([^\]]+)\]\s*\);',
    lambda m: f'[req.user.tenantId, {m.group(1)}]);' if 'tenantId' not in m.group(0) else m.group(0),
    content
)

with open('$route', 'w') as f:
    f.write(content)

print('  ✓ Updated')
PYTHON
    
  fi
done

echo ""
echo "=========================================="
echo "✓ ALL ROUTES PROCESSED"
echo "=========================================="
