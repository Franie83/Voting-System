$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================"
Write-Host "Debugging ICAN Voting System"
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
    Write-Host "Trying with different admin..." -ForegroundColor Yellow
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

Write-Host ""
Write-Host "1. Checking elections..." -ForegroundColor Yellow
try {
    $elections = Invoke-RestMethod -Uri "$baseUrl/api/admin/elections" -Method Get -Headers $headers
    Write-Host "Total elections: $($elections.total)" -ForegroundColor White
    foreach ($e in $elections.data) {
        Write-Host "  - $($e.title) [Status: $($e.status)]" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error getting elections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Checking positions..." -ForegroundColor Yellow
try {
    $positions = Invoke-RestMethod -Uri "$baseUrl/api/admin/positions" -Method Get -Headers $headers
    Write-Host "Total positions: $($positions.total)" -ForegroundColor White
    foreach ($p in $positions.data) {
        Write-Host "  - $($p.title)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error getting positions: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Checking candidates..." -ForegroundColor Yellow
try {
    $candidates = Invoke-RestMethod -Uri "$baseUrl/api/admin/candidates" -Method Get -Headers $headers
    Write-Host "Total candidates: $($candidates.total)" -ForegroundColor White
} catch {
    Write-Host "Error getting candidates: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================"
Write-Host "Debug Complete!"
Write-Host "========================================"