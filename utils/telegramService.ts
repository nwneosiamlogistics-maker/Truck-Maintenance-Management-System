
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

    const lastSentDate = localStorage.getItem('lastMaintenanceNotificationDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    // Use IDENTICAL logic to MaintenancePlanner.tsx
    const vehicleMap = new Map(vehicles.map(v => [v.licensePlate, v]));
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
        const latestRepair = repairs
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
        const response = await fetch('/telegram-api/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('Telegram Error:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Telegram Network Error:', error);
        return false;
    }
};
