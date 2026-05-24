# test_as_frank_fixed.ps1
$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Voting as Frank Egbeobawaye" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Login as Frank
Write-Host "Logging in as Frank Egbeobawaye..." -ForegroundColor Yellow
$frankLogin = @{
    email = "bevbaruese@gmail.com"
    password = "Ican1234"
} | ConvertTo-Json

try {
    $frankResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $frankLogin -ContentType "application/json"
    $token = $frankResponse.access_token
    Write-Host "✅ Login successful!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed. Check Frank's password." -ForegroundColor Red
    exit 1
}

$headers = @{"Authorization" = "Bearer $token"}

# Get active elections
Write-Host "Getting active elections for voting..." -ForegroundColor Yellow
try {
    $elections = Invoke-RestMethod -Uri "$baseUrl/api/voting/elections/active" -Method Get -Headers $headers
    
    if ($elections.success -and $elections.count -gt 0) {
        Write-Host "✅ Found $($elections.count) active election(s)!`n" -ForegroundColor Green
        
        foreach ($election in $elections.data) {
            Write-Host "📋 Election Details:" -ForegroundColor Cyan
            Write-Host "   Title: $($election.title)" -ForegroundColor White
            Write-Host "   Status: $($election.status)" -ForegroundColor Green
            Write-Host "   Has Voted: $($election.has_voted)" -ForegroundColor Yellow
            
            if ($election.time_remaining) {
                Write-Host "   Time Remaining: $($election.time_remaining.days) days, $($election.time_remaining.hours) hours" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        Write-Host "✅ Frank can now vote through the web interface!" -ForegroundColor Green
        Write-Host "   Go to: http://localhost:3000/voting" -ForegroundColor White
    } else {
        Write-Host "⚠️ No active elections found for Frank." -ForegroundColor Yellow
        Write-Host "`nPossible reasons:" -ForegroundColor Red
        Write-Host "1. No election exists with status = 'ACTIVE'" -ForegroundColor Gray
        Write-Host "2. Election dates don't include today" -ForegroundColor Gray
        Write-Host "3. No positions assigned to the election" -ForegroundColor Gray
        Write-Host "4. No approved candidates for the election" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan