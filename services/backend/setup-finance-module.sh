#!/bin/bash

echo "=========================================="
echo "FINANCE MODULE SETUP"
echo "=========================================="
echo ""

echo "Step 1: Adding finance routes to server.js..."
node add-finance-routes.js

echo ""
echo "Step 2: Running database migrations..."
node run-finance-migrations.js

echo ""
echo "=========================================="
echo "FINANCE MODULE SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Finance Officer Login:"
echo "Email: finance@school.com"
echo "Password: Finance@123"
echo ""
echo "Available Routes:"
echo "- GET    /api/v1/finance/dashboard"
echo "- GET    /api/v1/finance/chart-of-accounts"
echo "- GET    /api/v1/finance/income"
echo "- POST   /api/v1/finance/income"
echo "- GET    /api/v1/finance/expenses"
echo "- POST   /api/v1/finance/expenses"
echo "- PUT    /api/v1/finance/expenses/:id/approve"
echo "- GET    /api/v1/finance/vendors"
echo "- GET    /api/v1/finance/bank-accounts"
echo "- GET    /api/v1/finance/reports/balance-sheet"
echo "- GET    /api/v1/finance/reports/profit-and-loss"
echo "- GET    /api/v1/finance/reports/trial-balance"
echo ""

