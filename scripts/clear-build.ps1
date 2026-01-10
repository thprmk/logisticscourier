# PowerShell script to clear Next.js build cache and rebuild
# Usage: .\scripts\clear-build.ps1

Write-Host "🧹 Clearing Next.js build cache..." -ForegroundColor Cyan

# Remove .next directory
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next directory not found" -ForegroundColor Yellow
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "✅ Removed node_modules\.cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔨 Rebuilding project..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green

