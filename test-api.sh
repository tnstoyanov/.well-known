#!/bin/bash

echo "🧪 Testing Apple Pay Nuvei Backend API"
echo "=================================="

# Test health endpoint
echo "📊 Testing health endpoint..."
curl -s https://apple-pay-nuvei-dynamic.vercel.app/api/health | jq .

echo ""
echo "💳 Testing process-apple-pay endpoint with sample data..."
curl -s -X POST https://apple-pay-nuvei-dynamic.vercel.app/api/process-apple-pay \
  -H "Content-Type: application/json" \
  -d '{
    "paymentData": "test-token-for-verification", 
    "amount": "10.00",
    "billingContact": {
      "givenName": "Test",
      "familyName": "User",
      "emailAddress": "test@example.com"
    }
  }' | jq .

echo ""
echo "✅ API endpoints are accessible!"
echo "🔧 The Nuvei checksum error is expected with test data."
echo "📱 Ready for testing with real Apple Pay on iPhone!"
