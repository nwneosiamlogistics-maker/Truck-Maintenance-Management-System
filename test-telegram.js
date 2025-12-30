
const https = require('https');

const token = "8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4";
const chatId = "-5251676030";

// Mock Data
const durationText = "2 วัน 4 ชม. 0 นาที";
const message = `✅ <b>TEST: Job Completed Notification</b>\n
🚗 <b>ทะเบียน:</b> 70-9999 (Test)
🔢 <b>ใบสั่งซ่อม:</b> RO-TEST-001
📋 <b>อาการ:</b> เปลี่ยนถ่ายน้ำมันเครื่อง (ทดสอบระบบ)\n
🔄 <b>สถานะเดิม:</b> กำลังซ่อม
➡ <b>สถานะใหม่:</b> <b>ซ่อมเสร็จ</b>\n
⏱ <b>ใช้เวลาทั้งสิ้น:</b> ${durationText}\n
📅 <b>เวลา:</b> ${new Date().toLocaleString('th-TH')}`;

const payload = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
});

const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ Success! Message sent.');
        } else {
            console.error(`❌ Failed: ${res.statusCode} ${data}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
});

req.write(payload);
req.end();
