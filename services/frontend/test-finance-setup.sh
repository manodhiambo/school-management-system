#!/bin/bash

echo "=== FINANCE MODULE FRONTEND SETUP CHECK ==="
echo ""

echo "✓ Checking Finance Pages..."
ls -1 ~/school-management-system/services/frontend/src/pages/finance/

echo ""
echo "✓ Checking Finance Service..."
if [ -f ~/school-management-system/services/frontend/src/services/financeService.ts ]; then
    echo "  financeService.ts exists"
else
    echo "  ❌ financeService.ts missing"
fi

echo ""
echo "✓ Checking Updated Sidebar..."
if grep -q "finance_officer" ~/school-management-system/services/frontend/src/components/layout/Sidebar.tsx; then
    echo "  Sidebar includes finance_officer role"
else
    echo "  ❌ Sidebar missing finance_officer"
fi

if grep -q "Finance" ~/school-management-system/services/frontend/src/components/layout/Sidebar.tsx; then
    echo "  Sidebar includes Finance menu items"
else
    echo "  ❌ Sidebar missing Finance items"
fi

echo ""
echo "✓ Checking App Routes..."
if grep -q "finance" ~/school-management-system/services/frontend/src/App.tsx; then
    echo "  App.tsx includes finance routes"
else
    echo "  ❌ App.tsx missing finance routes"
fi

echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Start the frontend: cd ~/school-management-system/services/frontend && npm run dev"
echo "2. Login as admin or finance_officer"
echo "3. Navigate to Finance module from sidebar"
echo ""
