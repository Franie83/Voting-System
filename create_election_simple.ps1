$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================"
Write-Host "Creating Active Election"
Write-Host "========================================"
Write-Host ""

Write-Host "Logging in as admin..." -ForegroundColor Yellow

$body = @{
    email = "admin@ican.org.ng"
    password = "08000000000"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $token = $response.access_token
    Write-Host "Login successful!" -ForegroundColor Green
} catch {
    $body2 = @{
        email = "admin@ican.gov.ng"
        password = "Admin@123456"
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body2 -ContentType "application/json"
    $token = $response.access_token
    Write-Host "Login successful!" -ForegroundColor Green
}

$headers = @{
    "Authorization" = "Bearer $token"
}

$startDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss")
$endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss")

$electionBody = @{
    title = "ICAN National Election 2024"
    description = "Vote for your preferred candidates"
    start_date = $startDate
    end_date = $endDate
    election_type = "NATIONAL"
    status = "ACTIVE"
} | ConvertTo-Json

Write-Host ""
Write-Host "Creating election..." -ForegroundColor Yellow

try {
    $election = Invoke-RestMethod -Uri "$baseUrl/api/admin/elections" -Method Post -Headers $headers -Body $electionBody -ContentType "application/json"
    Write-Host "SUCCESS! Election created." -ForegroundColor Green
    Write-Host "  ID: $($election.data.id)" -ForegroundColor White
    Write-Host "  Title: $($election.data.title)" -ForegroundColor White
    Write-Host "  Status: ACTIVE" -ForegroundColor Green
} catch {
    Write-Host "Failed to create election: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================"