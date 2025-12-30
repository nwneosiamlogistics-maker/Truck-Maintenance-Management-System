
$token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4"
# Chat ID from the user (I will try the one I put in the file first, if that fails, we can discuss)
$chatId = "-1002256795856" 
# Alternately try the raw one if the above fails in your own testing:
# $chatId = "-5251676030"

$message = "🤖 *Antigravity Bot Test*`n`nHello! This is a test message from your Truck Maintenance System.`n`n✅ System is Online`n🕒 Time: $(Get-Date -Format 'HH:mm:ss')"

$payload = @{
    chat_id    = $chatId
    text       = $message
    parse_mode = "Markdown"
} | ConvertTo-Json

Write-Host "Sending test message to Telegram..." -ForegroundColor Cyan

try {
    # Using the local vite proxy to bypass CORS/SSL issues if any, or just hit api directly if environment allows
    # Since we are in terminal, we can hit api.telegram.org directly.
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Message ID: $($response.result.message_id)"
    Write-Host "Check your Telegram group!" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed to send message." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    
    # Attempt with the other ID format if the first one fails
    if ($chatId -match "^-100") {
        Write-Host "Retrying with original ID format..." -ForegroundColor Yellow
        $chatId = "-5251676030"
        $payload = @{
            chat_id    = $chatId
            text       = $message
            parse_mode = "Markdown"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload
            Write-Host "Success with ID $chatId!" -ForegroundColor Green
        }
        catch {
            Write-Host "Failed with both IDs." -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)"
            $_.ErrorDetails | Select-Object -ExpandProperty Message
        }
    }
}
