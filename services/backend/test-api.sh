#!/bin/bash

echo "🧪 Testing School Management System API..."
echo ""

# Get fresh token
echo "1. Getting fresh token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@school.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Token obtained"
echo ""

# Test dashboard
echo "2. Testing /admin/dashboard..."
curl -s http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test students
echo "3. Testing /students..."
curl -s http://localhost:5000/api/v1/students \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test teachers
echo "4. Testing /teachers..."
curl -s http://localhost:5000/api/v1/teachers \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test settings
echo "5. Testing /admin/settings..."
curl -s http://localhost:5000/api/v1/admin/settings \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test attendance statistics
echo "6. Testing /attendance/statistics..."
curl -s http://localhost:5000/api/v1/attendance/statistics \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test fee statistics
echo "7. Testing /fee/statistics..."
curl -s http://localhost:5000/api/v1/fee/statistics \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "✅ All API tests complete!"
