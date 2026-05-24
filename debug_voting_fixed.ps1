# debug_voting_fixed.ps1
$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Debugging ICAN Voting System" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Login as admin
Write-Host "Logging in as admin..." -ForegroundColor Yellow
$adminLogin = @{
    email = "admin@ican.org.ng"
    password = "08000000000"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json"
    $token = $adminResponse.access_token
    Write-Host "✅ Admin login successful`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Trying System Administrator..." -ForegroundColor Yellow
    $adminLogin = @{
        email = "admin@ican.gov.ng"
        password = "Admin@123456"
    } | ConvertTo-Json
    
    try {
        $adminResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json"
        $token = $adminResponse.access_token
        Write-Host "✅ Login successful`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Cannot login. Please check admin credentials." -ForegroundColor Red
        exit 1
    }
}

$headers = @{"Authorization" = "Bearer $token"}

# 1. Check all elections
Write-Host "1. Checking all elections:" -ForegroundColor Yellow
try {
    $elections = Invoke-RestMethod -Uri "$baseUrl/api/admin/elections" -Method Get -Headers $headers
    Write-Host "Total elections: $($elections.total)" -ForegroundColor White
    
    if ($elections.data.Count -gt 0) {
        foreach ($election in $elections.data) {
            Write-Host "   - ID: $($election.id)" -ForegroundColor Gray
            Write-Host "     Title: $($election.title)" -ForegroundColor Gray
            Write-Host "     Status: $($election.status)" -ForegroundColor Gray
            Write-Host "     Start: $($election.start_date)" -ForegroundColor Gray
            Write-Host "     End: $($election.end_date)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "No elections found. Please create an election first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get elections: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check positions
Write-Host "2. Checking positions in database:" -ForegroundColor Yellow
try {
    $positions = Invoke-RestMethod -Uri "$baseUrl/api/admin/positions" -Method Get -Headers $headers
    Write-Host "Total positions: $($positions.total)" -ForegroundColor White
    
    if ($positions.data.Count -gt 0) {
        foreach ($position in $positions.data) {
            Write-Host "   - $($position.title) (ID: $($position.id))" -ForegroundColor Gray
        }
    } else {
        Write-Host "No positions found. Please create positions first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Positions endpoint not found or error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Check candidates
Write-Host "`n3. Checking candidates:" -ForegroundColor Yellow
try {
    $candidates = Invoke-RestMethod -Uri "$baseUrl/api/admin/candidates" -Method Get -Headers $headers
    Write-Host "Total candidates: $($candidates.total)" -ForegroundColor White
    
    if ($candidates.data.Count -gt 0) {
        foreach ($candidate in $candidates.data) {
            $userName = if ($candidate.user) { $candidate.user.full_name } else { "Unknown" }
            Write-Host "   - Candidate: $userName" -ForegroundColor Gray
            Write-Host "     Position: $($candidate.position)" -ForegroundColor Gray
            Write-Host "     Status: $($candidate.status)" -ForegroundColor Gray
            Write-Host "     Election: $($candidate.election_title)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "No candidates found. Please add candidates to your election." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get candidates: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Debug Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan