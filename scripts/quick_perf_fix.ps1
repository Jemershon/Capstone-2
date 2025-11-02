#!/usr/bin/env pwsh
# Quick Performance Fix Script
# Run this to apply the fastest optimizations

Write-Host "🚀 Starting Quick Performance Optimization..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Add indexes
Write-Host "Step 1/3: Adding database indexes..." -ForegroundColor Yellow
Set-Location "backend"
node scripts/add_indexes.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Index creation failed. Check your MongoDB connection." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Indexes created successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Install compression
Write-Host "Step 2/3: Installing compression package..." -ForegroundColor Yellow
npm install compression --save

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install compression" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compression installed" -ForegroundColor Green
Write-Host ""

# Step 3: Check if compression is already imported
Write-Host "Step 3/3: Checking server.js for compression..." -ForegroundColor Yellow
$serverFile = Get-Content "server.js" -Raw

if ($serverFile -match "import compression") {
    Write-Host "✅ Compression already imported in server.js" -ForegroundColor Green
} else {
    Write-Host "⚠️  You need to manually add compression to server.js:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Add these lines after the imports (around line 40):" -ForegroundColor Cyan
    Write-Host "  import compression from 'compression';" -ForegroundColor White
    Write-Host "  app.use(compression());" -ForegroundColor White
    Write-Host ""
}

Set-Location ..

Write-Host ""
Write-Host "🎉 Quick optimization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Expected improvements:" -ForegroundColor Cyan
Write-Host "  • Database queries: 50-95% faster" -ForegroundColor White
Write-Host "  • Response sizes: 70-90% smaller" -ForegroundColor White
Write-Host "  • Overall page load: 3-5x faster" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add compression to server.js (if not already done)" -ForegroundColor White
Write-Host "  2. Test locally: npm start" -ForegroundColor White
Write-Host "  3. Deploy: git add . && git commit -m 'perf: add indexes and compression' && git push" -ForegroundColor White
Write-Host ""
