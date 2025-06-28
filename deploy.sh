#!/bin/bash

echo "🚀 Deploying Apple Pay Nuvei to Production"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building production files..."

# Copy production HTML as main index
cp index-production.html index.html

echo "📤 Deploying backend to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel (you may need to login)..."
vercel --prod

echo "✅ Deployment commands completed!"
echo ""
echo "📋 Next steps:"
echo "1. Note your Vercel URL from the output above"
echo "2. Update the BACKEND_URL in index-production.html"
echo "3. Push your code to GitHub for GitHub Pages"
echo "4. Enable GitHub Pages in your repo settings"
echo "5. Test on your iPhone using the GitHub Pages URL"
echo ""
echo "🔗 GitHub Pages will be at: https://yourusername.github.io/yourreponame"
