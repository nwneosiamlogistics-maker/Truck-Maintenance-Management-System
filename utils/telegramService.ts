
import { MaintenancePlan, Repair, Vehicle, PartWarranty, CargoInsurancePolicy, PurchaseOrder, StockItem, MaintenanceBudget } from "../types";
import { database } from "../firebase/firebase";
import { ref, get, set } from "firebase/database";

// Telegram Configuration — ค่าจาก .env (VITE_TELEGRAM_BOT_TOKEN, VITE_TELEGRAM_CHAT_ID)
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

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

    const lastSentDate = await getLastSentDate('lastMaintenanceNotificationDate');
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
        await setLastSentDate('lastMaintenanceNotificationDate', todayStr);
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
        await setLastSentDate('lastMaintenanceNotificationDate', todayStr);
    }
};

// --- Daily Repair Status Summary Logic (18:30) ---
export const checkAndSendDailyRepairStatus = async (repairs: Repair[], technicians: any[]) => {
    const NOW = new Date();
    // 18:30 PM
    if (NOW.getHours() < 18 || (NOW.getHours() === 18 && NOW.getMinutes() < 30)) return;

    const lastSentDate = await getLastSentDate('lastRepairStatusNotificationDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    if (!repairs || repairs.length === 0) {
        console.log('[Telegram-Status] Repairs array is empty or not loaded yet.');
        return;
    }

    // Filter relevant statuses
    const activeRepairs = repairs.filter(r => ['กำลังซ่อม', 'รออะไหล่', 'รอซ่อม'].includes(r.status));

    if (activeRepairs.length === 0) {
        await setLastSentDate('lastRepairStatusNotificationDate', todayStr);
        return;
    }

    console.log('[Telegram-Status] Preparing intensive daily repair status summary...');

    const getTechName = (id: string) => technicians.find(t => t.id === id)?.name || 'ไม่ระบุ';

    let message = `🚧 <b>สรุปสถานะงานซ่อมค้างประจำวัน</b>\n(${new Date().toLocaleDateString('th-TH')} เวลา 18:30 น.)\n`;
    message += `\n<b>📊 ภาพรวมงานค้าง: ${activeRepairs.length} รายการ</b>\n`;

    // Grouping for clarity
    const repairing = activeRepairs.filter(r => r.status === 'กำลังซ่อม');
    const waitingPart = activeRepairs.filter(r => r.status === 'รออะไหล่');
    const waitingRepair = activeRepairs.filter(r => r.status === 'รอซ่อม');

    if (repairing.length > 0) {
        message += `\n🔧 <b>กำลังซ่อม (${repairing.length}):</b>\n`;
        repairing.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription} (ช่าง: ${getTechName(r.assignedTechnicianId)})\n`);
    }

    if (waitingPart.length > 0) {
        message += `\n📦 <b>รออะไหล่ (${waitingPart.length}):</b>\n`;
        waitingPart.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription}\n`);
    }

    if (waitingRepair.length > 0) {
        message += `\n⏳ <b>รอซ่อม (${waitingRepair.length}):</b>\n`;
        waitingRepair.forEach(r => message += `- ${r.licensePlate}: ${r.problemDescription}\n`);
    }

    message += `\n✅ ตรวจสอบรายละเอียดเพิ่มเติมในระบบ`;

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        await setLastSentDate('lastRepairStatusNotificationDate', todayStr);
        console.log('Daily repair status summary sent.');
    }
};


const sendToTelegram = async (payload: TelegramMessage, maxRetries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = '/telegram-api/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
            if (attempt === 1) console.log(`[Telegram] Sending message to: ${url}`);
            else console.log(`[Telegram] Retry attempt ${attempt}/${maxRetries}...`);

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
                if (attempt === maxRetries) return false;
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }

            console.log('[Telegram] Message sent successfully');
            return true;
        } catch (error) {
            console.error(`Telegram Network/CORS/Proxy Error (attempt ${attempt}):`, error);
            if (attempt === maxRetries) return false;
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    return false;
};

// --- Firebase-based lastSentDate (replaces localStorage) ---
const getLastSentDate = async (key: string): Promise<string | null> => {
    try {
        const snapshot = await get(ref(database, `_telegramMeta/${key}`));
        return snapshot.exists() ? snapshot.val() : null;
    } catch { return localStorage.getItem(key); }
};

const setLastSentDate = async (key: string, value: string): Promise<void> => {
    try {
        await set(ref(database, `_telegramMeta/${key}`), value);
    } catch { /* fallback */ }
    localStorage.setItem(key, value);
};

// --- Daily Warranty & Insurance Expiry Alert (09:00) ---
export const checkAndSendWarrantyInsuranceAlerts = async (
    partWarranties: PartWarranty[],
    vehicles: Vehicle[],
    cargoPolicies: CargoInsurancePolicy[]
) => {
    const NOW = new Date();
    if (NOW.getHours() < 9) return;

    const lastSentDate = await getLastSentDate('lastWarrantyInsuranceAlertDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    if ((!partWarranties || partWarranties.length === 0) && (!vehicles || vehicles.length === 0) && (!cargoPolicies || cargoPolicies.length === 0)) {
        console.log('[Telegram-WarrantyInsurance] No data loaded yet. Skipping.');
        return;
    }

    console.log('[Telegram-WarrantyInsurance] Checking warranty & insurance expiry...');

    const calcDays = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - NOW.getTime()) / (1000 * 60 * 60 * 24));

    // === 1. Part Warranty (การรับประกันอะไหล่) ===
    const warrantyExpired: { name: string; plate: string; days: number; supplier: string }[] = [];
    const warrantyExpiring: { name: string; plate: string; days: number; supplier: string }[] = [];

    (partWarranties || []).forEach(w => {
        if (!w.isActive) return;
        const days = calcDays(w.warrantyExpiry);
        const item = { name: w.partName, plate: w.vehicleLicensePlate || '-', days, supplier: w.supplier };
        if (days < 0) warrantyExpired.push(item);
        else if (days <= 30) warrantyExpiring.push(item);
    });

    // === 2. Vehicle Insurance (ประกันภัยรถ + พ.ร.บ.) ===
    const insuranceExpired: { plate: string; type: string; company: string; days: number }[] = [];
    const insuranceExpiring: { plate: string; type: string; company: string; days: number }[] = [];

    (vehicles || []).filter(v => v.status === 'Active').forEach(v => {
        // ประกันภัยรถ
        if (v.insuranceExpiryDate) {
            const days = calcDays(v.insuranceExpiryDate);
            const item = { plate: v.licensePlate, type: 'ประกันภัย', company: v.insuranceCompany || '-', days };
            if (days < 0) insuranceExpired.push(item);
            else if (days <= 30) insuranceExpiring.push(item);
        }
        // พ.ร.บ.
        if (v.actExpiryDate) {
            const days = calcDays(v.actExpiryDate);
            const item = { plate: v.licensePlate, type: 'พ.ร.บ.', company: v.actCompany || '-', days };
            if (days < 0) insuranceExpired.push(item);
            else if (days <= 30) insuranceExpiring.push(item);
        }
    });

    // === 3. Cargo Insurance Policy (ประกันสินค้า) ===
    const cargoExpired: { policy: string; insurer: string; days: number }[] = [];
    const cargoExpiring: { policy: string; insurer: string; days: number }[] = [];

    (cargoPolicies || []).filter(p => p.status === 'Active').forEach(p => {
        const days = calcDays(p.expiryDate);
        const item = { policy: p.policyNumber, insurer: p.insurer, days };
        if (days < 0) cargoExpired.push(item);
        else if (days <= 30) cargoExpiring.push(item);
    });

    // === Build Message ===
    const totalExpired = warrantyExpired.length + insuranceExpired.length + cargoExpired.length;
    const totalExpiring = warrantyExpiring.length + insuranceExpiring.length + cargoExpiring.length;

    if (totalExpired === 0 && totalExpiring === 0) {
        console.log('[Telegram-WarrantyInsurance] Nothing to notify today.');
        await setLastSentDate('lastWarrantyInsuranceAlertDate', todayStr);
        return;
    }

    let message = `🛡 <b>แจ้งเตือนการรับประกัน & ประกันภัย</b>\n(${NOW.toLocaleDateString('th-TH')})\n`;

    // --- หมดอายุแล้ว ---
    if (totalExpired > 0) {
        message += `\n🔴 <b>หมดอายุแล้ว (${totalExpired} รายการ):</b>\n`;

        if (warrantyExpired.length > 0) {
            message += `\n<b>📦 การรับประกันอะไหล่:</b>\n`;
            warrantyExpired.slice(0, 5).forEach(w =>
                message += `- ${w.name} [${w.plate}] (หมด ${Math.abs(w.days)} วัน | ${w.supplier})\n`
            );
            if (warrantyExpired.length > 5) message += `  ...และอีก ${warrantyExpired.length - 5} รายการ\n`;
        }

        if (insuranceExpired.length > 0) {
            message += `\n<b>🚗 ประกันภัยรถ/พ.ร.บ.:</b>\n`;
            insuranceExpired.slice(0, 5).forEach(i =>
                message += `- ${i.plate}: ${i.type} (หมด ${Math.abs(i.days)} วัน | ${i.company})\n`
            );
            if (insuranceExpired.length > 5) message += `  ...และอีก ${insuranceExpired.length - 5} รายการ\n`;
        }

        if (cargoExpired.length > 0) {
            message += `\n<b>📋 ประกันสินค้า:</b>\n`;
            cargoExpired.slice(0, 3).forEach(c =>
                message += `- กรมธรรม์ ${c.policy} (หมด ${Math.abs(c.days)} วัน | ${c.insurer})\n`
            );
            if (cargoExpired.length > 3) message += `  ...และอีก ${cargoExpired.length - 3} รายการ\n`;
        }
    }

    // --- ใกล้หมดอายุ ---
    if (totalExpiring > 0) {
        message += `\n🟡 <b>ใกล้หมดอายุ ≤ 30 วัน (${totalExpiring} รายการ):</b>\n`;

        if (warrantyExpiring.length > 0) {
            message += `\n<b>📦 การรับประกันอะไหล่:</b>\n`;
            warrantyExpiring.slice(0, 5).forEach(w =>
                message += `- ${w.name} [${w.plate}] (เหลือ ${w.days} วัน | ${w.supplier})\n`
            );
            if (warrantyExpiring.length > 5) message += `  ...และอีก ${warrantyExpiring.length - 5} รายการ\n`;
        }

        if (insuranceExpiring.length > 0) {
            message += `\n<b>🚗 ประกันภัยรถ/พ.ร.บ.:</b>\n`;
            insuranceExpiring.slice(0, 5).forEach(i =>
                message += `- ${i.plate}: ${i.type} (เหลือ ${i.days} วัน | ${i.company})\n`
            );
            if (insuranceExpiring.length > 5) message += `  ...และอีก ${insuranceExpiring.length - 5} รายการ\n`;
        }

        if (cargoExpiring.length > 0) {
            message += `\n<b>📋 ประกันสินค้า:</b>\n`;
            cargoExpiring.slice(0, 3).forEach(c =>
                message += `- กรมธรรม์ ${c.policy} (เหลือ ${c.days} วัน | ${c.insurer})\n`
            );
            if (cargoExpiring.length > 3) message += `  ...และอีก ${cargoExpiring.length - 3} รายการ\n`;
        }
    }

    message += `\n📋 กรุณาตรวจสอบในระบบจัดการการรับประกันและประกันภัย`;

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        await setLastSentDate('lastWarrantyInsuranceAlertDate', todayStr);
        console.log('[Telegram-WarrantyInsurance] Alert sent successfully.');
    }
};

// ==================== แจ้งเตือน PO ใหม่ (Real-time) ====================
export const sendNewPOTelegramNotification = async (po: PurchaseOrder) => {
    const itemSummary = po.items.slice(0, 5).map(i => `- ${i.name} x${i.quantity}`).join('\n');
    const moreItems = po.items.length > 5 ? `\n... และอีก ${po.items.length - 5} รายการ` : '';

    const messageText = `
📦 <b>ใบสั่งซื้อใหม่ (PO)</b>

🔢 <b>เลขที่:</b> ${po.poNumber}
🏢 <b>ผู้จำหน่าย:</b> ${po.supplierName}
💰 <b>มูลค่ารวม:</b> ฿${po.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
👤 <b>ผู้ขอ:</b> ${po.requesterName || '-'}

<b>📋 รายการ:</b>
${itemSummary}${moreItems}

📅 <b>เวลา:</b> ${new Date().toLocaleString('th-TH')}
`.trim();

    return sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: messageText, parse_mode: 'HTML' });
};

// ==================== แจ้งเตือนงบประมาณใกล้เกิน (เรียกจาก BudgetManagement) ====================
export const sendBudgetAlertTelegramNotification = async (
    budgets: MaintenanceBudget[],
    repairs: Repair[],
    fuelRecords: { totalCost?: number; date: string }[]
) => {
    const NOW = new Date();
    const lastSentDate = await getLastSentDate('lastBudgetAlertDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    const currentMonth = NOW.getMonth();
    const currentYear = NOW.getFullYear();

    const monthBudgets = budgets.filter(b => b.month === currentMonth + 1 && b.year === currentYear);

    if (monthBudgets.length === 0) return;

    const alerts: { category: string; allocated: number; spent: number; pct: number }[] = [];

    monthBudgets.forEach(b => {
        const allocated = b.allocatedAmount || 0;
        if (allocated <= 0) return;

        let spent = b.spentAmount || 0;
        // เพิ่มค่าใช้จ่ายจริงจาก repairs + fuel ของเดือนนี้
        if (b.category === 'ซ่อมบำรุงรถ' || b.category === 'ค่าแรงช่าง') {
            spent += repairs
                .filter(r => r.status === 'ซ่อมเสร็จ' && new Date(r.repairEndDate || r.updatedAt || r.createdAt).getMonth() === currentMonth)
                .reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
        }
        if (b.category === 'น้ำมันเชื้อเฟลิง') {
            spent += fuelRecords
                .filter(f => new Date(f.date).getMonth() === currentMonth)
                .reduce((s, f) => s + (Number(f.totalCost) || 0), 0);
        }

        const pct = Math.round((spent / allocated) * 100);
        if (pct >= 80) {
            alerts.push({ category: b.category, allocated, spent, pct });
        }
    });

    if (alerts.length === 0) {
        await setLastSentDate('lastBudgetAlertDate', todayStr);
        return;
    }

    let message = `⚠️ <b>แจ้งเตือนงบประมาณใกล้เกิน</b>\n(${NOW.toLocaleDateString('th-TH')})\n`;
    alerts.forEach(a => {
        const icon = a.pct >= 100 ? '🔴' : '🟡';
        message += `\n${icon} <b>${a.category}:</b> ใช้ไป ${a.pct}%\n`;
        message += `   งบ ฿${a.allocated.toLocaleString()} | ใช้จ่าย ฿${a.spent.toLocaleString()}\n`;
    });
    message += `\n📋 กรุณาตรวจสอบในระบบจัดการงบประมาณ`;

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        await setLastSentDate('lastBudgetAlertDate', todayStr);
    }
};

// ==================== แจ้งเตือนสต็อกต่ำ (Daily 10:00 — เรียกจาก App.tsx) ====================
export const checkAndSendLowStockAlert = async (stock: StockItem[]) => {
    const NOW = new Date();
    if (NOW.getHours() < 10) return;

    const lastSentDate = await getLastSentDate('lastLowStockAlertDate');
    const todayStr = NOW.toDateString();
    if (lastSentDate === todayStr) return;

    if (!stock || stock.length === 0) return;

    const lowStockItems = stock.filter(s => s.quantity <= s.minStock);

    if (lowStockItems.length === 0) {
        await setLastSentDate('lastLowStockAlertDate', todayStr);
        return;
    }

    let message = `📦 <b>แจ้งเตือนสต็อกอะไหล่ต่ำ</b>\n(${NOW.toLocaleDateString('th-TH')})\n`;
    message += `\n🔴 <b>ต่ำกว่าจุดสั่งซื้อ (${lowStockItems.length} รายการ):</b>\n`;

    lowStockItems.slice(0, 15).forEach(s => {
        const icon = s.quantity === 0 ? '❌' : '⚠️';
        message += `${icon} ${s.name} [${s.code}]: คงเหลือ ${s.quantity}/${s.minStock} ${s.unit}\n`;
    });
    if (lowStockItems.length > 15) message += `... และอีก ${lowStockItems.length - 15} รายการ\n`;

    message += `\n📋 กรุณาดำเนินการสั่งซื้อในระบบ`;

    if (await sendToTelegram({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })) {
        await setLastSentDate('lastLowStockAlertDate', todayStr);
        console.log('[Telegram-LowStock] Alert sent successfully.');
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
