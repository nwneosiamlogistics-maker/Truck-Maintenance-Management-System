Write-Host "Testing LINE Notification..." -ForegroundColor Cyan

$headers = @{
    'Content-Type'  = 'application/json'
    'Authorization' = 'Bearer ych1JeDMCl7S+l4PLKRvC9t+z0sywxVn4kqtCxz8Ap/odCT5P9in5qe1B6PyaBWw+JvbVHLBYc/oJUPYrFBRbUzskvKCbhpqeiH04alojn+P3F6jGVLexAsMBdNRduDIS4fZXMRyXryBPjLh4GACWgdB04t89/1O/w1cDnyilFU='
}

$currentTime = Get-Date -Format "HH:mm"
$messageText = "Test from Truck Maintenance System`nTime: $currentTime`nSystem is ready!"

$body = @{
    messages = @(
        @{
            type = "text"
            text = $messageText
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Sending message..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/line-api/v2/bot/message/broadcast' -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "SUCCESS! Message sent to LINE" -ForegroundColor Green
    Write-Host "Please check your LINE app now!" -ForegroundColor Green
    Write-Host ""
    
}
catch {
    Write-Host ""
    Write-Host "ERROR occurred!" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}
