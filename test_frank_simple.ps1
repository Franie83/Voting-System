$baseUrl = "http://127.0.0.1:8080"

Write-Host "========================================"
Write-Host "Testing Voting as Frank"
Write-Host "========================================"
Write-Host ""

Write-Host "Logging in as Frank..." -ForegroundColor Yellow

$body = @{
    email = "bevbaruese@gmail.com"
    password = "Ican1234"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $token = $response.access_token
    Write-Host "Login successful!" -ForegroundColor Green
} catch {
    Write-Host "Login failed! Check Frank's credentials." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host ""
Write-Host "Getting active elections..." -ForegroundColor Yellow

try {
    $elections = Invoke-RestMethod -Uri "$baseUrl/api/voting/elections/active" -Method Get -Headers $headers
    
    if ($elections.count -gt 0) {
        Write-Host "Found $($elections.count) active election(s)!" -ForegroundColor Green
        Write-Host ""
        foreach ($e in $elections.data) {
            Write-Host "  Election: $($e.title)" -ForegroundColor Cyan
            Write-Host "    Status: $($e.status)" -ForegroundColor Green
            Write-Host "    Has Voted: $($e.has_voted)" -ForegroundColor Yellow
            Write-Host ""
        }
        Write-Host "Frank can vote through the web interface at http://localhost:3000/voting" -ForegroundColor Green
    } else {
        Write-Host "No active elections found for Frank." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Red
        Write-Host "  1. No election with status = ACTIVE" -ForegroundColor Gray
        Write-Host "  2. Election dates don't include today" -ForegroundColor Gray
        Write-Host "  3. No positions linked to the election" -ForegroundColor Gray
        Write-Host "  4. No approved candidates" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================"