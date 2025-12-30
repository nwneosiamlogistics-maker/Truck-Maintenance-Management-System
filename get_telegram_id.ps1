
$token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4"
Write-Host "Fetching updates..."
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates" -Method Get
    if ($response.ok) {
        $count = $response.result.Count
        Write-Host "Found $count updates."
        $response.result | ForEach-Object {
            $chat = $_.message.chat
            $my_chat_member = $_.my_chat_member.chat
            
            if ($chat) {
                Write-Host "Message from: Type=$($chat.type), Title='$($chat.title)', ID=$($chat.id)"
            }
            if ($my_chat_member) {
                Write-Host "Member Status Update: Type=$($my_chat_member.type), Title='$($my_chat_member.title)', ID=$($my_chat_member.id)"
            }
        }
    }
    else {
        Write-Host "Error: $($response.description)"
    }
}
catch {
    Write-Host "Request Failed: $($_.Exception.Message)"
}
