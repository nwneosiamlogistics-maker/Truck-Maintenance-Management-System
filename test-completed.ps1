
$token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4"
$chatId = "-5251676030"

# Mock Repair Data for 'Completed' status
$startDate = (Get-Date).AddDays(-2).AddHours(-4) # Started 2 days, 4 hours ago
$durationText = "2 วัน 4 ชม. 0 นาที"

$message = "✅ **TEST: Job Completed Notification** `n`n🚗 **ทะเบียน:** 70-9999 (Test)`n🔢 **ใบสั่งซ่อม:** RO-TEST-001`n📋 **อาการ:** เปลี่ยนถ่ายน้ำมันเครื่อง (ทดสอบระบบ)`n`n🔄 **สถานะเดิม:** กำลังซ่อม`n➡ **สถานะใหม่:** **ซ่อมเสร็จ**`n`n⏱ **ใช้เวลาทั้งสิ้น:** $durationText`n`n📅 **เวลา:** $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"

$payload = @{
    chat_id    = $chatId
    text       = $message
    parse_mode = "Markdown"
} | ConvertTo-Json

try {
    Write-Host "Sending 'Job Completed' test..."
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $payload
    Write-Host "Test Message Sent Successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}
