
import { Repair } from "../types";

// Telegram Configuration
// ในการใช้งานจริง ควรย้ายไปเก็บใน .env
const TELEGRAM_BOT_TOKEN = '8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4';
const TELEGRAM_CHAT_ID = '-5251676030'; // แทนที่ด้วย Chat ID ที่ผู้ใช้ให้มา

// Interface สำหรับส่งข้อความ
interface TelegramMessage {
    chat_id: string;
    text: string;
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: {
        inline_keyboard: Array<Array<{
            text: string;
            url?: string;
            callback_data?: string;
        }>>;
    };
}

/**
 * Sends a notification via Telegram Bot.
 * แจ้งเตือนไปยังกลุ่ม Telegram
 */
export const sendRepairStatusTelegramNotification = async (repair: Repair, oldStatus: string, newStatus: string) => {
    // 1. สร้างข้อความที่จะส่ง (รองรับ HTML Formatting)
    const statusEmoji = getStatusEmoji(newStatus);
    // 2. คำนวณระยะเวลาดำเนินการ (กรณีงานเสร็จ)
    let durationInfo = "";
    if (newStatus === 'ซ่อมเสร็จ' && repair.createdAt) {
        const startDate = new Date(repair.createdAt);
        const endDate = new Date();
        const diffMs = endDate.getTime() - startDate.getTime();

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let durationText = "";
        if (days > 0) durationText += `${days} วัน `;
        if (hours > 0) durationText += `${hours} ชม. `;
        if (minutes > 0 || durationText === "") durationText += `${minutes} นาที`;

        durationInfo = `\n⏱ <b>ใช้เวลาทั้งสิ้น:</b> ${durationText}`;
    }

    const messageText = `
<b>${statusEmoji} อัปเดตสถานะงานซ่อม</b>

🚗 <b>ทะเบียน:</b> ${repair.licensePlate}
🔢 <b>เลขที่ใบสั่งซ่อม:</b> ${repair.repairOrderNo}
📋 <b>อาการ/งาน:</b> ${repair.problemDescription}

🔄 <b>สถานะเดิม:</b> ${oldStatus}
➡ <b>สถานะใหม่:</b> <b>${newStatus}</b>${durationInfo}

📅 <b>เวลา:</b> ${new Date().toLocaleString('th-TH')}
`.trim();

    // 2. สร้าง Payload สำหรับส่ง
    const payload: TelegramMessage = {
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
        // (Optional) เพิ่มปุ่มกดได้ เช่น ลิงก์ไปยังหน้าเว็บ
        // reply_markup: {
        //     inline_keyboard: [
        //         [{ text: "🔍 ดูรายละเอียด", url: "https://your-app-url.com/repair/" + repair.id }]
        //     ]
        // }
    };

    try {
        // 3. ส่ง Request ไปยัง Telegram API
        // ใช้ fetch โดยตรงไปยัง API ของ Telegram (เพราะ Telegram รองรับ CORS ได้ดีกว่า หรืออาจต้องผ่าน Proxy เหมือน LINE ถ้าติดปัญหา)
        // เพื่อความชัวร์และง่าย เรามักยิงตรงไปที่ https://api.telegram.org หาก Client อนุญาต
        // แต่ถ้าติด CORS ใน Browser เราอาจต้องใช้ Proxy แบบเดียวกับ LINE

        // ลองยิงผ่าน Proxy ที่เรามีหรือสร้างใหม่สำหรับ Telegram
        // แต่เบื้องต้นลองยิงตรงดูก่อน เพราะบางครั้ง Telegram ยืดหยุ่นกว่า
        // เพื่อความชัวร์ ผมจะใช้ Proxy '/telegram-api' ที่จะไปเพิ่มใน vite.config.ts

        const response = await fetch('/telegram-api/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send Telegram notification:', errorData);
            return false;
        }

        console.log('Telegram notification sent successfully');
        return true;

    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
    }
};

// Helper function to get emoji based on status
const getStatusEmoji = (status: string): string => {
    switch (status) {
        case 'รอซ่อม': return '⏳';
        case 'กำลังซ่อม': return '🔧';
        case 'รออะไหล่': return '📦';
        case 'ซ่อมเสร็จ': return '✅';
        case 'ยกเลิก': return '❌';
        case 'สร้างใบแจ้งซ่อม': return '🆕';
        default: return '📢';
    }
};
