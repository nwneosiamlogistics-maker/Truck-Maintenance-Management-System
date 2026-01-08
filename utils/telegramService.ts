
import { MaintenancePlan, Repair, Vehicle } from "../types";

// Telegram Configuration
// ในการใช้งานจริง ควรย้ายไปเก็บใน .env
const TELEGRAM_BOT_TOKEN = '8239268406:AAFEWkq1OIsp9SoCPs2jySZoXsvyPkqg0X4';
const TELEGRAM_CHAT_ID = '-5251676030';

interface TelegramMessage {
    chat_id: string;
    text: string;
    parse_mode?: 'Markdown' | 'HTML';
}

export const sendRepairStatusTelegramNotification = async (repair: Repair, oldStatus: string, newStatus: string) => {
    console.log(`[Telegram] Sending status update for ${repair.repairOrderNo}: ${oldStatus} -> ${newStatus}`);

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

    return sendToTelegram({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
    });
};

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

// --- Daily Maintenance Summary Logic (08:30) ---
export const checkAndSendDailyMaintenanceSummary = async (plans: MaintenancePlan[], repairs: Repair[], vehicles: Vehicle[]) => {
    const NOW = new Date();
    // 08:30 AM
    if (NOW.getHours() < 8 || (NOW.getHours() === 8 && NOW.getMinutes() < 30)) return;

    // Check if data is actually loaded (Wait until we have plans or we are sure it's not empty)
    if (!plans || plans.length === 0) {
        console.log('[Telegram-Summary] Plans array is empty or not loaded yet. Skipping check.');
        return;
    }

    const lastSentDate = localStorage.getItem('lastMaintenanceNotificationDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    console.log('[Telegram-Summary] Checking for daily maintenance overdue/upcoming...');

    // Use IDENTICAL logic to MaintenancePlanner.tsx
    const vehicleMap = new Map((vehicles || []).map(v => [v.licensePlate, v]));
    const overduePlans: any[] = [];
    const upcomingPlans: any[] = [];

    plans.forEach(plan => {
        const lastDate = new Date(plan.lastServiceDate);
        let nextServiceDate = new Date(lastDate);
        if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
        else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
        else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

        const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

        const normalizePlate = (p: string) => p ? p.trim().replace(/\s+/g, '') : '';
        const targetPlate = normalizePlate(plan.vehicleLicensePlate);

        // Copy logic from MaintenancePlanner.tsx
        const latestRepair = (repairs || [])
            .filter(r => r.currentMileage && normalizePlate(r.licensePlate) === targetPlate)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        const vehicleObj = vehicleMap.get(plan.vehicleLicensePlate);
        const vehicleMileage = vehicleObj && 'currentMileage' in vehicleObj ? Number(vehicleObj.currentMileage) : 0;

        // Priority: Latest Repair > Vehicle Obj > Null (Fixes logic being slightly different)
        const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : (vehicleMileage > 0 ? vehicleMileage : null);

        const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
        const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

        let isOverdue = false;
        let isUpcoming = false;

        if ((daysUntilNextService < 0) || (kmUntilNextService !== null && kmUntilNextService < 0)) {
            isOverdue = true;
        } else if ((daysUntilNextService <= 30) || (kmUntilNextService !== null && kmUntilNextService <= 1500)) {
            isUpcoming = true;
        }

        const planInfo = { ...plan, daysUntil: daysUntilNextService };
        if (isOverdue) overduePlans.push(planInfo);
        else if (isUpcoming) upcomingPlans.push(planInfo); // Else if to match
    });

    if (overduePlans.length === 0 && upcomingPlans.length === 0) {
        console.log('[Telegram-Summary] Nothing to notify today.');
        // Still mark as sent so we don't keep checking every state update
        localStorage.setItem('lastMaintenanceNotificationDate', todayStr);
        return;
    }

    let message = `📅 <b>แจ้งเตือนแผนซ่อมบำรุงประจำวัน</b>\n(${new Date().toLocaleDateString('th-TH')})\n`;
    if (overduePlans.length > 0) {
        message += `\n🔴 <b>เกินกำหนด (${overduePlans.length} รายการ):</b>\n`;
        overduePlans.slice(0, 10).forEach(p => message += `- ${p.vehicleLicensePlate}: ${p.planName} (เกิน ${Math.abs(p.daysUntil)} วัน)\n`);
        if (overduePlans.length > 10) message += `... และอีก ${overduePlans.length - 10} รายการ\n`;
    }
    if (upcomingPlans.length > 0) {
        message += `\n🟡 <b>ใกล้ถึงกำหนด (${upcomingPlans.length} รายการ):</b>\n`;
        upcomingPlans.slice(0, 10).forEach(p => message += `- ${p.vehicleLicensePlate}: ${p.planName} (อีก ${p.daysUntil} วัน)\n`);
        if (upcomingPlans.length > 10) message += `... และอีก ${upcomingPlans.length - 10} รายการ\n`;
    }
    message += `\n📋 กรุณาตรวจสอบในระบบวางแผนซ่อมบำรุง`;

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        localStorage.setItem('lastMaintenanceNotificationDate', todayStr);
    }
};

// --- Daily Repair Status Summary Logic (18:30) ---
export const checkAndSendDailyRepairStatus = async (repairs: Repair[]) => {
    const NOW = new Date();
    // 18:30 PM
    if (NOW.getHours() < 18 || (NOW.getHours() === 18 && NOW.getMinutes() < 30)) return;

    const lastSentDate = localStorage.getItem('lastRepairStatusNotificationDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    if (!repairs || repairs.length === 0) {
        console.log('[Telegram-Status] Repairs array is empty or not loaded yet.');
        return;
    }

    console.log('[Telegram-Status] Preparing daily repair status summary...');

    // Filter relevant statuses
    const activeRepairs = repairs.filter(r => ['กำลังซ่อม', 'รออะไหล่', 'รอซ่อม'].includes(r.status));

    // Group by status
    const repairing = activeRepairs.filter(r => r.status === 'กำลังซ่อม');
    const waitingPart = activeRepairs.filter(r => r.status === 'รออะไหล่');
    const waitingRepair = activeRepairs.filter(r => r.status === 'รอซ่อม');

    if (activeRepairs.length === 0) {
        // Optional: Send "No active repairs" or just skip
        localStorage.setItem('lastRepairStatusNotificationDate', todayStr);
        return;
    }

    let message = `🚧 <b>สรุปสถานะงานซ่อมประจำวัน</b>\n(${new Date().toLocaleDateString('th-TH')} เวลา 18:30 น.)\n`;
    message += `\n<b>📊 ภาพรวมงานค้าง: ${activeRepairs.length} คัน</b>\n`;

    if (repairing.length > 0) {
        message += `\n🔧 <b>กำลังซ่อม (${repairing.length} คัน):</b>\n`;
        repairing.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription}\n`);
    }

    if (waitingPart.length > 0) {
        message += `\n📦 <b>รออะไหล่ (${waitingPart.length} คัน):</b>\n`;
        waitingPart.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription}\n`);
    }

    if (waitingRepair.length > 0) {
        message += `\n⏳ <b>รอซ่อม (${waitingRepair.length} คัน):</b>\n`;
        waitingRepair.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription}\n`);
    }

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        localStorage.setItem('lastRepairStatusNotificationDate', todayStr);
        console.log('Daily repair status summary sent.');
    }
};


const sendToTelegram = async (payload: TelegramMessage): Promise<boolean> => {
    try {
        const url = '/telegram-api/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
        console.log(`[Telegram] Sending message to: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Telegram API Error Response:', errorText);
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.description) {
                    console.error(`Telegram Error Details: ${errorJson.description} (Code: ${errorJson.error_code})`);
                }
            } catch (e) { }
            return false;
        }

        console.log('[Telegram] Message sent successfully');
        return true;
    } catch (error) {
        console.error('Telegram Network/CORS/Proxy Error:', error);
        return false;
    }
};

/**
 * ฟังก์ชันตรวจสอบสถานะของ Bot และ Chat ID
 * ช่วยในการ Debug ว่า Token หรือ Chat ID ถูกต้องหรือไม่
 */
export const checkBotStatus = async (): Promise<{ ok: boolean; message: string }> => {
    try {
        // 1. ตรวจสอบ Bot Token (getMe)
        const getMeUrl = '/telegram-api/bot' + TELEGRAM_BOT_TOKEN + '/getMe';
        console.log('[Telegram-Check] Checking Bot Token with getMe...');

        const botResponse = await fetch(getMeUrl);
        const botRawText = await botResponse.text();

        let botData;
        try {
            botData = JSON.parse(botRawText);
        } catch (e) {
            console.error('[Telegram-Check] Failed to parse getMe JSON. Raw content:', botRawText.substring(0, 500));
            return { ok: false, message: `Server ตอบกลับมาไม่ใช่ JSON (คาดว่าเป็นหน้าเว็บ Error): ${botRawText.substring(0, 50).replace(/[<]/g, '')}...` };
        }

        if (!botResponse.ok) {
            return { ok: false, message: `Bot Token ไม่ถูกต้อง หรือหมดอายุ: ${botData.description || 'Unknown Error'}` };
        }

        console.log(`[Telegram-Check] Bot is active: @${botData.result.username}`);

        // 2. ตรวจสอบ Chat ID (getChat)
        const getChatUrl = '/telegram-api/bot' + TELEGRAM_BOT_TOKEN + `/getChat?chat_id=${TELEGRAM_CHAT_ID}`;
        console.log('[Telegram-Check] Checking Chat ID with getChat...');

        const chatResponse = await fetch(getChatUrl);
        const chatRawText = await chatResponse.text();

        let chatData;
        try {
            chatData = JSON.parse(chatRawText);
        } catch (e) {
            console.error('[Telegram-Check] Failed to parse getChat JSON. Raw content:', chatRawText.substring(0, 500));
            return { ok: false, message: `Server ตอบกลับมาไม่ใช่ JSON ในช่วงตรวจ Chat ID` };
        }

        if (!chatResponse.ok) {
            return { ok: false, message: `Chat ID (${TELEGRAM_CHAT_ID}) ไม่ถูกต้อง หรือ Bot ไม่ได้อยู่ในกลุ่มนี้: ${chatData.description || 'Unknown Error'}` };
        }

        const chatTitle = chatData.result.title || chatData.result.first_name || 'Private Chat';

        return {
            ok: true,
            message: `Bot [@${botData.result.username}] พร้อมใช้งาน! และสามารถส่งข้อความไปยัง [${chatTitle}] (ID: ${TELEGRAM_CHAT_ID}) ได้ปกติ`
        };

    } catch (error) {
        console.error('[Telegram-Check] Connection Error:', error);
        return { ok: false, message: `ไม่สามารถเชื่อมต่อกับ Proxy Server ได้: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
};
