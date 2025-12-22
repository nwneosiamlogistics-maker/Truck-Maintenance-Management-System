import https from 'https';

// --- ตั้งค่าข้อมูล ---
const TOKEN = 'ych1JeDMCl7S+l4PLKRvC9t+z0sywxVn4kqtCxz8Ap/odCT5P9in5qe1B6PyaBWw+JvbVHLBYc/oJUPYrFBRbUzskvKCbhpqeiH04alojn+P3F6jGVLexAsMBdNRduDIS4fZXMRyXryBPjLh4GACWgdB04t89/1O/w1cDnyilFU=';

const repair = {
    licensePlate: '70-1234',
    repairOrderNo: 'RO-2024-001'
};
const newStatus = 'กำลังซ่อม';
const statusColor = '#3b82f6';

const flexMessage = {
    type: "flex",
    altText: `ทดสอบระบบ: ${repair.licensePlate}`,
    contents: {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": "ทดสอบระบบ (TEST)", "weight": "bold", "color": "#1DB446", "size": "sm" },
                { "type": "text", "text": `${repair.licensePlate}`, "weight": "bold", "size": "xxl", "margin": "md" }
            ]
        },
        "hero": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": newStatus, "size": "3xl", "weight": "bold", "color": "#ffffff", "align": "center" }
            ],
            "backgroundColor": statusColor,
            "paddingAll": "xl"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": "เลขที่ใบซ่อม", "size": "sm", "color": "#555555" },
                { "type": "text", "text": `${repair.repairOrderNo}`, "size": "md", "weight": "bold" }
            ]
        }
    }
};

const data = JSON.stringify({ messages: [flexMessage] });

const options = {
    hostname: 'api.line.me',
    port: 443,
    path: '/v2/bot/message/broadcast',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(data)
    },
    timeout: 10000 // เพิ่ม Timeout 10 วินาที ถ้าเกินนี้ให้ตัดการทำงาน
};

console.log('🚀 กำลังเริ่มส่ง request...');

const req = https.request(options, (res) => {
    console.log(`📡 รับการตอบกลับจาก LINE: ${res.statusCode}`);

    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ สำเร็จ: ข้อความถูกส่งแล้ว!');
        } else {
            console.error('❌ ล้มเหลว:', responseBody);
        }
        process.exit(); // บังคับปิดโปรเซสเมื่อทำงานเสร็จ
    });
});

// ตรวจสอบ Error ระหว่างการส่ง
req.on('error', (e) => {
    console.error(`🚨 เกิดข้อผิดพลาด (Network Error): ${e.message}`);
    process.exit(1);
});

// ตรวจสอบถ้าหมดเวลาเชื่อมต่อ
req.on('timeout', () => {
    console.error('🚨 ผิดพลาด: การเชื่อมต่อใช้เวลานานเกินไป (Timeout)');
    req.destroy();
    process.exit(1);
});

req.write(data);
req.end();
