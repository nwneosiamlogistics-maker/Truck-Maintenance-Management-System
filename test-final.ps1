
$token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4"
$chatId = "-1005251676030"
$message = "Test with prefix -100: System Online"

$payload = @{
    chat_id = $chatId
    text    = $message
} | ConvertTo-Json

try {
    Write-Host "Sending to $chatId..."
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload
    Write-Host "Success!"
}
catch {
    Write-Host "Failed: $($_.Exception.Message)"
    Write-Host "Details: $($_.ErrorDetails.Message)"
}
