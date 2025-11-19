#!/bin/bash

echo "=========================================="
echo "School Management System - Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please update it with your database credentials."
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Create logs directory
mkdir -p logs
echo "✓ Logs directory created"
echo ""

# Create uploads directory
mkdir -p uploads
echo "✓ Uploads directory created"
echo ""

echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Run migrations: npm run migrate"
echo "3. Seed database: npm run seed"
echo "4. Start development server: npm run dev"
echo ""
