#!/bin/bash

echo "🔐 Setting up HTTPS certificates for Apple Pay development..."

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL not found. Please install OpenSSL first:"
    echo "   macOS: brew install openssl"
    echo "   Linux: sudo apt-get install openssl"
    exit 1
fi

# Generate self-signed certificate
echo "📋 Generating self-signed certificate..."
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

if [ $? -eq 0 ]; then
    echo "✅ Certificate generated successfully!"
    echo "📁 Files created:"
    echo "   - cert.pem (certificate)"
    echo "   - key.pem (private key)"
    echo ""
    echo "🚀 You can now run: npm start"
    echo "📱 Then open Safari and navigate to: https://localhost:8443"
    echo "⚠️  You'll need to accept the security warning for the self-signed certificate"
else
    echo "❌ Failed to generate certificate"
    exit 1
fi
