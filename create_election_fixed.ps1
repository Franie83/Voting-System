# create_election_fixed.ps1
$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Active Election" -ForegroundColor Cyan
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
    $adminLogin = @{
        email = "admin@ican.gov.ng"
        password = "Admin@123456"
    } | ConvertTo-Json
    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json"
    $token = $adminResponse.access_token
    Write-Host "✅ Admin login successful`n" -ForegroundColor Green
}

$headers = @{"Authorization" = "Bearer $token"}

# Get current date (start yesterday, end in 30 days)
$startDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss")
$endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss")

# Create election
Write-Host "Creating election..." -ForegroundColor Yellow
$electionBody = @{
    title = "ICAN National Election 2024"
    description = "Annual election for ICAN leadership positions - Vote for your preferred candidates"
    start_date = $startDate
    end_date = $endDate
    election_type = "NATIONAL"
    status = "ACTIVE"
} | ConvertTo-Json

try {
    $election = Invoke-RestMethod -Uri "$baseUrl/api/admin/elections" -Method Post -Headers $headers -Body $electionBody -ContentType "application/json"
    Write-Host "✅ Election created successfully!" -ForegroundColor Green
    Write-Host "   ID: $($election.data.id)" -ForegroundColor White
    Write-Host "   Title: $($election.data.title)" -ForegroundColor White
    Write-Host "   Status: ACTIVE" -ForegroundColor Green
    Write-Host "   Start: $startDate" -ForegroundColor Gray
    Write-Host "   End: $endDate" -ForegroundColor Gray
    
    $electionId = $election.data.id
    Write-Host "`n📝 Save this Election ID: $electionId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create election: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan