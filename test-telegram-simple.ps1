
$token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4"
$chatId = "-5251676030"
$message = "Test System Online"
$payload = @{
    chat_id = $chatId
    text    = $message
} | ConvertTo-Json

Write-Host "Testing ID: $chatId"
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload
    Write-Host "Success!"
}
catch {
    Write-Host "Failed with $chatId. Error: $($_.Exception.Message)"
    
    # Try with -100 prefix
    $chatId2 = "-100" + "5251676030"
    Write-Host "Retrying with ID: $chatId2"
    $payload2 = @{
        chat_id = $chatId2
        text    = $message
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload2
        Write-Host "Success with $chatId2!"
    }
    catch {
        Write-Host "Failed with $chatId2. Error: $($_.Exception.Message)"
        Write-Host "Response: $($_.ErrorDetails.Message)"
    }
}
