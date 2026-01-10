#!/bin/bash
# Script to clear Next.js build cache and rebuild
# Usage: ./scripts/clear-build.sh

echo "🧹 Clearing Next.js build cache..."

# Remove .next directory
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ Removed .next directory"
else
  echo "ℹ️  .next directory not found"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ Removed node_modules/.cache"
fi

echo ""
echo "🔨 Rebuilding project..."
npm run build

echo ""
echo "✅ Build complete!"

