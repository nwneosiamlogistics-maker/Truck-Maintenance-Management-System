import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { defineSecret } from 'firebase-functions/params';
import fetch from 'node-fetch';

// Initialize Firebase Admin
initializeApp();

// Secrets — ตั้งค่าผ่าน: firebase functions:secrets:set TELEGRAM_BOT_TOKEN
const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramChatId = defineSecret('TELEGRAM_CHAT_ID');

// ==================== Helper: Send Telegram ====================

async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Telegram] API Error:', errorText);
            return false;
        }
        console.log('[Telegram] Message sent successfully');
        return true;
    } catch (error) {
        console.error('[Telegram] Network Error:', error);
        return false;
    }
}

// Helper: read RTDB path and return as array
async function readArray(path: string): Promise<any[]> {
    const snapshot = await getDatabase().ref(path).once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === 'object') return Object.values(data);
    return [];
}

// Helper: format Thai date
function thaiDate(): string {
    return new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
}

// ==================== 1. Daily Maintenance Summary (08:30) ====================

export const dailyMaintenanceSummary = onSchedule(
    {
        schedule: '30 8 * * *',  // 08:30 ICT
        timeZone: 'Asia/Bangkok',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async () => {
        console.log('[CF] dailyMaintenanceSummary triggered');

        const [plans, repairs, vehicles] = await Promise.all([
            readArray('maintenancePlans'),
            readArray('repairs'),
            readArray('vehicles'),
        ]);

        if (plans.length === 0) {
            console.log('[CF] No maintenance plans found. Skipping.');
            return;
        }

        const vehicleMap = new Map(vehicles.map((v: any) => [v.licensePlate, v]));
        const overduePlans: any[] = [];
        const upcomingPlans: any[] = [];

        const normalizePlate = (p: string) => p ? p.trim().replace(/\s+/g, '') : '';

        plans.forEach((plan: any) => {
            const lastDate = new Date(plan.lastServiceDate);
            const nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

            const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - Date.now()) / (1000 * 3600 * 24));
            const targetPlate = normalizePlate(plan.vehicleLicensePlate);

            const latestRepair = repairs
                .filter((r: any) => r.currentMileage && normalizePlate(r.licensePlate) === targetPlate)
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            const vehicleObj: any = vehicleMap.get(plan.vehicleLicensePlate);
            const vehicleMileage = vehicleObj && 'currentMileage' in vehicleObj ? Number(vehicleObj.currentMileage) : 0;
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
            else if (isUpcoming) upcomingPlans.push(planInfo);
        });

        if (overduePlans.length === 0 && upcomingPlans.length === 0) {
            console.log('[CF] No overdue/upcoming maintenance. Skipping.');
            return;
        }

        let message = `📅 <b>แจ้งเตือนแผนซ่อมบำรุงประจำวัน</b>\n(${thaiDate()})\n`;

        if (overduePlans.length > 0) {
            message += `\n🔴 <b>เกินกำหนด (${overduePlans.length} รายการ):</b>\n`;
            overduePlans.slice(0, 10).forEach((p: any) =>
                message += `- ${p.vehicleLicensePlate}: ${p.planName} (เกิน ${Math.abs(p.daysUntil)} วัน)\n`
            );
            if (overduePlans.length > 10) message += `... และอีก ${overduePlans.length - 10} รายการ\n`;
        }

        if (upcomingPlans.length > 0) {
            message += `\n🟡 <b>ใกล้ถึงกำหนด (${upcomingPlans.length} รายการ):</b>\n`;
            upcomingPlans.slice(0, 10).forEach((p: any) =>
                message += `- ${p.vehicleLicensePlate}: ${p.planName} (อีก ${p.daysUntil} วัน)\n`
            );
            if (upcomingPlans.length > 10) message += `... และอีก ${upcomingPlans.length - 10} รายการ\n`;
        }

        message += `\n📋 กรุณาตรวจสอบในระบบวางแผนซ่อมบำรุง`;

        await sendTelegram(telegramBotToken.value(), telegramChatId.value(), message);
    }
);

// ==================== 2. Daily Warranty & Insurance Alert (09:00) ====================

export const dailyWarrantyInsuranceAlert = onSchedule(
    {
        schedule: '0 9 * * *',  // 09:00 ICT
        timeZone: 'Asia/Bangkok',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async () => {
        console.log('[CF] dailyWarrantyInsuranceAlert triggered');

        const [partWarranties, vehicles, cargoPolicies] = await Promise.all([
            readArray('partWarranties'),
            readArray('vehicles'),
            readArray('cargoPolicies'),
        ]);

        if (partWarranties.length === 0 && vehicles.length === 0 && cargoPolicies.length === 0) {
            console.log('[CF] No warranty/insurance data. Skipping.');
            return;
        }

        const NOW = Date.now();
        const calcDays = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - NOW) / (1000 * 60 * 60 * 24));

        // 1. Part Warranty
        const warrantyExpired: any[] = [];
        const warrantyExpiring: any[] = [];
        partWarranties.forEach((w: any) => {
            if (!w.isActive) return;
            const days = calcDays(w.warrantyExpiry);
            const item = { name: w.partName, plate: w.vehicleLicensePlate || '-', days, supplier: w.supplier };
            if (days < 0) warrantyExpired.push(item);
            else if (days <= 30) warrantyExpiring.push(item);
        });

        // 2. Vehicle Insurance
        const insuranceExpired: any[] = [];
        const insuranceExpiring: any[] = [];
        vehicles.filter((v: any) => v.status === 'Active').forEach((v: any) => {
            if (v.insuranceExpiryDate) {
                const days = calcDays(v.insuranceExpiryDate);
                const item = { plate: v.licensePlate, type: 'ประกันภัย', company: v.insuranceCompany || '-', days };
                if (days < 0) insuranceExpired.push(item);
                else if (days <= 30) insuranceExpiring.push(item);
            }
            if (v.actExpiryDate) {
                const days = calcDays(v.actExpiryDate);
                const item = { plate: v.licensePlate, type: 'พ.ร.บ.', company: v.actCompany || '-', days };
                if (days < 0) insuranceExpired.push(item);
                else if (days <= 30) insuranceExpiring.push(item);
            }
        });

        // 3. Cargo Insurance
        const cargoExpired: any[] = [];
        const cargoExpiring: any[] = [];
        cargoPolicies.filter((p: any) => p.status === 'Active').forEach((p: any) => {
            const days = calcDays(p.expiryDate);
            const item = { policy: p.policyNumber, insurer: p.insurer, days };
            if (days < 0) cargoExpired.push(item);
            else if (days <= 30) cargoExpiring.push(item);
        });

        const totalExpired = warrantyExpired.length + insuranceExpired.length + cargoExpired.length;
        const totalExpiring = warrantyExpiring.length + insuranceExpiring.length + cargoExpiring.length;

        if (totalExpired === 0 && totalExpiring === 0) {
            console.log('[CF] No warranty/insurance alerts. Skipping.');
            return;
        }

        let message = `🛡 <b>แจ้งเตือนการรับประกัน & ประกันภัย</b>\n(${thaiDate()})\n`;

        if (totalExpired > 0) {
            message += `\n🔴 <b>หมดอายุแล้ว (${totalExpired} รายการ):</b>\n`;
            if (warrantyExpired.length > 0) {
                message += `\n<b>📦 การรับประกันอะไหล่:</b>\n`;
                warrantyExpired.slice(0, 5).forEach((w: any) =>
                    message += `- ${w.name} [${w.plate}] (หมด ${Math.abs(w.days)} วัน | ${w.supplier})\n`
                );
                if (warrantyExpired.length > 5) message += `  ...และอีก ${warrantyExpired.length - 5} รายการ\n`;
            }
            if (insuranceExpired.length > 0) {
                message += `\n<b>🚗 ประกันภัยรถ/พ.ร.บ.:</b>\n`;
                insuranceExpired.slice(0, 5).forEach((i: any) =>
                    message += `- ${i.plate}: ${i.type} (หมด ${Math.abs(i.days)} วัน | ${i.company})\n`
                );
                if (insuranceExpired.length > 5) message += `  ...และอีก ${insuranceExpired.length - 5} รายการ\n`;
            }
            if (cargoExpired.length > 0) {
                message += `\n<b>📋 ประกันสินค้า:</b>\n`;
                cargoExpired.slice(0, 3).forEach((c: any) =>
                    message += `- กรมธรรม์ ${c.policy} (หมด ${Math.abs(c.days)} วัน | ${c.insurer})\n`
                );
                if (cargoExpired.length > 3) message += `  ...และอีก ${cargoExpired.length - 3} รายการ\n`;
            }
        }

        if (totalExpiring > 0) {
            message += `\n🟡 <b>ใกล้หมดอายุ ≤ 30 วัน (${totalExpiring} รายการ):</b>\n`;
            if (warrantyExpiring.length > 0) {
                message += `\n<b>📦 การรับประกันอะไหล่:</b>\n`;
                warrantyExpiring.slice(0, 5).forEach((w: any) =>
                    message += `- ${w.name} [${w.plate}] (เหลือ ${w.days} วัน | ${w.supplier})\n`
                );
                if (warrantyExpiring.length > 5) message += `  ...และอีก ${warrantyExpiring.length - 5} รายการ\n`;
            }
            if (insuranceExpiring.length > 0) {
                message += `\n<b>🚗 ประกันภัยรถ/พ.ร.บ.:</b>\n`;
                insuranceExpiring.slice(0, 5).forEach((i: any) =>
                    message += `- ${i.plate}: ${i.type} (เหลือ ${i.days} วัน | ${i.company})\n`
                );
                if (insuranceExpiring.length > 5) message += `  ...และอีก ${insuranceExpiring.length - 5} รายการ\n`;
            }
            if (cargoExpiring.length > 0) {
                message += `\n<b>📋 ประกันสินค้า:</b>\n`;
                cargoExpiring.slice(0, 3).forEach((c: any) =>
                    message += `- กรมธรรม์ ${c.policy} (เหลือ ${c.days} วัน | ${c.insurer})\n`
                );
                if (cargoExpiring.length > 3) message += `  ...และอีก ${cargoExpiring.length - 3} รายการ\n`;
            }
        }

        message += `\n📋 กรุณาตรวจสอบในระบบจัดการการรับประกันและประกันภัย`;

        await sendTelegram(telegramBotToken.value(), telegramChatId.value(), message);
    }
);

// ==================== 3. Daily Low Stock Alert (10:00) ====================

export const dailyLowStockAlert = onSchedule(
    {
        schedule: '0 10 * * *',  // 10:00 ICT
        timeZone: 'Asia/Bangkok',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async () => {
        console.log('[CF] dailyLowStockAlert triggered');

        const stock = await readArray('stock');

        if (stock.length === 0) {
            console.log('[CF] No stock data. Skipping.');
            return;
        }

        const lowStockItems = stock.filter((s: any) =>
            typeof s.quantity === 'number' &&
            typeof s.minStock === 'number' &&
            s.quantity <= s.minStock
        );

        if (lowStockItems.length === 0) {
            console.log('[CF] No low stock items. Skipping.');
            return;
        }

        let message = `📦 <b>แจ้งเตือนสต็อกอะไหล่ต่ำ</b>\n(${thaiDate()})\n`;
        message += `\n🔴 <b>ต่ำกว่าจุดสั่งซื้อ (${lowStockItems.length} รายการ):</b>\n`;

        lowStockItems.slice(0, 15).forEach((s: any) => {
            const icon = s.quantity === 0 ? '❌' : '⚠️';
            message += `${icon} ${s.name} [${s.code}]: คงเหลือ ${s.quantity}/${s.minStock} ${s.unit}\n`;
        });
        if (lowStockItems.length > 15) message += `... และอีก ${lowStockItems.length - 15} รายการ\n`;

        message += `\n📋 กรุณาดำเนินการสั่งซื้อในระบบ`;

        await sendTelegram(telegramBotToken.value(), telegramChatId.value(), message);
    }
);

// ==================== 4. Daily Repair Status Summary (18:30) ====================

export const dailyRepairStatusSummary = onSchedule(
    {
        schedule: '30 18 * * *',  // 18:30 ICT
        timeZone: 'Asia/Bangkok',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async () => {
        console.log('[CF] dailyRepairStatusSummary triggered');

        const [repairs, technicians] = await Promise.all([
            readArray('repairs'),
            readArray('technicians'),
        ]);

        if (repairs.length === 0) {
            console.log('[CF] No repairs found. Skipping.');
            return;
        }

        const activeRepairs = repairs.filter((r: any) =>
            ['กำลังซ่อม', 'รออะไหล่', 'รอซ่อม'].includes(r.status)
        );

        if (activeRepairs.length === 0) {
            console.log('[CF] No active repairs. Skipping.');
            return;
        }

        const getTechName = (id: string) => {
            const tech = technicians.find((t: any) => t.id === id);
            return tech ? tech.name : 'ไม่ระบุ';
        };

        let message = `🚧 <b>สรุปสถานะงานซ่อมค้างประจำวัน</b>\n(${thaiDate()} เวลา 18:30 น.)\n`;
        message += `\n<b>📊 ภาพรวมงานค้าง: ${activeRepairs.length} รายการ</b>\n`;

        const repairing = activeRepairs.filter((r: any) => r.status === 'กำลังซ่อม');
        const waitingPart = activeRepairs.filter((r: any) => r.status === 'รออะไหล่');
        const waitingRepair = activeRepairs.filter((r: any) => r.status === 'รอซ่อม');

        if (repairing.length > 0) {
            message += `\n🔧 <b>กำลังซ่อม (${repairing.length}):</b>\n`;
            repairing.forEach((r: any) =>
                message += `- ${r.licensePlate}: ${r.problemDescription} (ช่าง: ${getTechName(r.assignedTechnicianId)})\n`
            );
        }

        if (waitingPart.length > 0) {
            message += `\n📦 <b>รออะไหล่ (${waitingPart.length}):</b>\n`;
            waitingPart.forEach((r: any) =>
                message += `- ${r.licensePlate}: ${r.problemDescription}\n`
            );
        }

        if (waitingRepair.length > 0) {
            message += `\n⏳ <b>รอซ่อม (${waitingRepair.length}):</b>\n`;
            waitingRepair.forEach((r: any) =>
                message += `- ${r.licensePlate}: ${r.problemDescription}\n`
            );
        }

        message += `\n✅ ตรวจสอบรายละเอียดเพิ่มเติมในระบบ`;

        await sendTelegram(telegramBotToken.value(), telegramChatId.value(), message);
    }
);
