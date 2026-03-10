import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onValueWritten } from 'firebase-functions/v2/database';
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

// ==================== Status-Based Deduplication ====================
// แก้ปัญหาแจ้งเตือนซ้ำจาก:
// 1. useFirebase เขียนทั้ง array → deepNormalizeFirebase ทำให้ข้อมูลดู "เปลี่ยน" → trigger ซ้ำ
// 2. Time-based dedup (5 นาที) หมดอายุ → ส่งซ้ำได้
// 3. setTimeout ใน Cloud Function ไม่น่าเชื่อถือ
//
// วิธีใหม่: จำ "สถานะล่าสุดที่แจ้งเตือนไปแล้ว" ของแต่ละรายการ (ไม่มีหมดอายุ)
// ส่งแจ้งเตือนเฉพาะเมื่อสถานะเปลี่ยนจริงจากครั้งล่าสุดที่แจ้งไป

interface DedupRecord {
    status: string;   // สถานะล่าสุดที่แจ้งเตือน
    ts: number;       // timestamp ที่แจ้ง
}

/**
 * ตรวจสอบว่าสถานะปัจจุบันเคยแจ้งเตือนไปแล้วหรือยัง
 * ถ้ายัง (สถานะใหม่จริง) → บันทึกแล้ว return true (ส่งได้)
 * ถ้าเคยแจ้งสถานะนี้แล้ว → return false (block)
 */
async function checkAndSetDedup(dedupKey: string, currentStatus: string): Promise<boolean> {
    const db = getDatabase();
    const dedupRef = db.ref(`_telegram_dedup/${dedupKey}`);
    const snapshot = await dedupRef.once('value');
    const record: DedupRecord | null = snapshot.val();

    // เคยแจ้งสถานะนี้ไปแล้ว → block
    if (record && record.status === currentStatus) {
        console.log(`[Dedup] BLOCKED — already notified ${dedupKey} with status "${currentStatus}" at ${new Date(record.ts).toISOString()}`);
        return false;
    }

    // สถานะใหม่ → บันทึกและอนุญาตส่ง
    await dedupRef.set({ status: currentStatus, ts: Date.now() } as DedupRecord);
    console.log(`[Dedup] ALLOWED — ${dedupKey} status changed to "${currentStatus}"`);
    return true;
}


// Helper: look up technician name from RTDB by ID
// Returns name if found, falls back to the raw ID so the message still makes sense
async function getTechnicianName(id: string | null | undefined): Promise<string | null> {
    if (!id) return null;
    try {
        const snapshot = await getDatabase().ref('technicians').once('value');
        if (!snapshot.exists()) return id;
        const data = snapshot.val();
        const list: any[] = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
        const found = list.find((t: any) => t.id === id || t.technicianId === id);
        return found?.name || found?.fullName || id;
    } catch {
        return id; // fallback to raw ID on error
    }
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

// ==================== Helper: Send Telegram with Photos ====================

async function sendTelegramWithPhotos(
    token: string,
    chatId: string,
    text: string,
    photos: string[]
): Promise<void> {
    const validPhotos = (photos || []).filter(p => typeof p === 'string' && p.startsWith('http'));

    if (validPhotos.length === 0) {
        // 0 รูป → sendMessage ล้วน
        await sendTelegram(token, chatId, text);
    } else if (validPhotos.length === 1) {
        // 1 รูป → sendPhoto + caption
        try {
            const url = `https://api.telegram.org/bot${token}/sendPhoto`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: validPhotos[0],
                    caption: text,
                    parse_mode: 'HTML',
                }),
            });
            if (!res.ok) {
                console.error('[Telegram] sendPhoto error:', await res.text());
                await sendTelegram(token, chatId, text);
            }
        } catch (e) {
            console.error('[Telegram] sendPhoto exception:', e);
            await sendTelegram(token, chatId, text);
        }
    } else {
        // 2+ รูป → sendMediaGroup (album) + caption บนรูปแรก
        try {
            const media = validPhotos.slice(0, 10).map((url, i) => ({
                type: 'photo',
                media: url,
                ...(i === 0 ? { caption: text, parse_mode: 'HTML' } : {}),
            }));
            const url = `https://api.telegram.org/bot${token}/sendMediaGroup`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, media }),
            });
            if (!res.ok) {
                console.error('[Telegram] sendMediaGroup error:', await res.text());
                await sendTelegram(token, chatId, text);
            }
        } catch (e) {
            console.error('[Telegram] sendMediaGroup exception:', e);
            await sendTelegram(token, chatId, text);
        }
    }
}

// ==================== 5. Repair Created/Status Changed ====================

export const onRepairWrite = onValueWritten(
    {
        ref: '/repairs/{repairId}',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async (event) => {
        const before = event.data.before.val();
        const after = event.data.after.val();
        if (!after) return;

        // 🚨 Array Shift Protection:
        // useFirebase เก็บ repairs เป็น array — เมื่อเพิ่ม/ลบรายการ index จะเลื่อน
        // ทำให้ before กับ after เป็นคนละใบซ่อม → ต้องตรวจ ID จริง
        if (before && after && before.id && after.id && before.id !== after.id) {
            console.log(`[CF] onRepairWrite — SKIP array shift (before.id=${before.id}, after.id=${after.id})`);
            return;
        }

        const isNew = !before;
        const statusChanged = before && before.status !== after.status;

        if (!isNew && !statusChanged) return;

        // Deduplication: ใช้ ID จริงของใบซ่อม + status-based (ไม่หมดอายุ)
        const actualId = after.id || after.repairOrderNo || event.params.repairId;
        const dedupStatus = isNew ? 'new' : after.status;
        const dedupKey = `repair_${actualId}`;
        if (!await checkAndSetDedup(dedupKey, dedupStatus)) return;

        console.log('[CF] onRepairWrite — id:', actualId, 'isNew:', isNew, 'status:', after.status);

        const priorityIcon: Record<string, string> = { 'สูง': '🔴', 'กลาง': '🟡', 'ต่ำ': '🟢' };
        const icon = priorityIcon[after.priority] || '🔔';
        const photos: string[] = Array.isArray(after.photos) ? after.photos : [];
        const dateStr = after.createdAt
            ? new Date(after.createdAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
            : thaiDate();

        let message = '';
        let sendPhotos: string[] = [];

        if (isNew) {
            // สร้างใบแจ้งซ่อมใหม่ — ส่งรูป
            sendPhotos = photos;
            const photoNote = photos.length === 0 ? '\n⚠️ <i>ไม่มีรูปหลักฐาน</i>' : '';

            // Lookup ชื่อช่างที่อาจถูกมอบหมายตั้งแต่สร้างใบ
            let techDisplay = '';
            if (after.externalTechnicianName) {
                techDisplay = after.externalTechnicianName;
            } else if (after.assignedTechnicianId) {
                techDisplay = await getTechnicianName(after.assignedTechnicianId) || after.assignedTechnicianId;
            }

            message = `🔔 <b>แจ้งซ่อมใหม่</b>\n`;
            message += `เลขที่: <b>${after.repairOrderNo || '-'}</b>\n`;
            message += `ทะเบียน: <b>${after.licensePlate || '-'}</b>`;
            if (after.vehicleType) message += ` | ${after.vehicleType}`;
            message += `\nปัญหา: ${after.problemDescription || '-'}\n`;
            message += `ความเร่งด่วน: ${icon} ${after.priority || '-'}\n`;
            message += `ผู้แจ้ง: ${after.reportedBy || '-'} | วันที่: ${dateStr}`;
            if (after.repairLocation) message += `\nสถานที่: ${after.repairLocation}`;
            if (techDisplay) message += `\nมอบหมายช่าง: ${techDisplay}`;
            message += photoNote;
        } else {
            // สถานะเปลี่ยน
            const header = `เลขที่: <b>${after.repairOrderNo || '-'}</b> | ทะเบียน: <b>${after.licensePlate || '-'}</b>\n`;
            const footer = `ปัญหา: ${after.problemDescription || '-'}`;

            if (after.status === 'กำลังซ่อม') {
                // Lookup ชื่อช่างจาก RTDB แทนการใช้ ID โดยตรง
                let techDisplay = '';
                if (after.externalTechnicianName) {
                    techDisplay = after.externalTechnicianName;
                } else if (after.assignedTechnicianId) {
                    techDisplay = await getTechnicianName(after.assignedTechnicianId) || after.assignedTechnicianId;
                }

                // รวมช่างผู้ช่วยด้วย (ถ้ามี)
                if (Array.isArray(after.assistantTechnicianIds) && after.assistantTechnicianIds.length > 0) {
                    const assistantNames = await Promise.all(
                        after.assistantTechnicianIds.map((aid: string) => getTechnicianName(aid))
                    );
                    const validNames = assistantNames.filter(Boolean);
                    if (validNames.length > 0) {
                        techDisplay += ` (ผู้ช่วย: ${validNames.join(', ')})`;
                    }
                }

                message = `🔧 <b>เริ่มซ่อมแล้ว</b>\n` + header;
                if (techDisplay) {
                    message += `ช่าง: ${techDisplay}\n`;
                }
                message += footer;
            } else if (after.status === 'รออะไหล่') {
                message = `⏳ <b>รออะไหล่</b>\n` + header + footer;
            } else if (after.status === 'ซ่อมเสร็จ') {
                // ซ่อมเสร็จ — ส่งรูป
                sendPhotos = photos;
                const photoNote = photos.length === 0 ? '\n⚠️ <i>ไม่มีรูปหลักฐาน</i>' : '';
                message = `✅ <b>ซ่อมเสร็จแล้ว</b>\n` + header;
                if (after.repairEndDate) {
                    const endStr = new Date(after.repairEndDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' });
                    message += `วันที่เสร็จ: ${endStr}\n`;
                }
                if (after.repairCost) message += `ค่าใช้จ่าย: ฿${after.repairCost.toLocaleString()}\n`;
                message += footer + photoNote;
            } else if (after.status === 'ยกเลิก') {
                message = `❌ <b>ยกเลิกงานซ่อม</b>\n` + header + footer;
            } else {
                return;
            }
        }

        await sendTelegramWithPhotos(telegramBotToken.value(), telegramChatId.value(), message, sendPhotos);
    }

);

// ==================== 6. PO Created/Status Changed ====================

export const onPurchaseOrderWrite = onValueWritten(
    {
        ref: '/purchaseOrders/{poId}',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async (event) => {
        const before = event.data.before.val();
        const after = event.data.after.val();
        if (!after) return;

        // 🚨 Array Shift Protection
        if (before && after && before.id && after.id && before.id !== after.id) {
            console.log(`[CF] onPurchaseOrderWrite — SKIP array shift (before.id=${before.id}, after.id=${after.id})`);
            return;
        }

        const isNew = !before;
        const statusChanged = before && before.status !== after.status;
        if (!isNew && !statusChanged) return;

        // Deduplication: ใช้ ID จริง + status-based (ไม่หมดอายุ)
        const actualId = after.id || after.poNumber || event.params.poId;
        const dedupStatus = isNew ? 'new' : after.status;
        const dedupKey = `po_${actualId}`;
        if (!await checkAndSetDedup(dedupKey, dedupStatus)) return;

        console.log('[CF] onPurchaseOrderWrite — id:', actualId, 'isNew:', isNew, 'status:', after.status);

        const photos: string[] = Array.isArray(after.photos) ? after.photos : [];
        const deliveryStr = after.deliveryDate
            ? new Date(after.deliveryDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
            : '-';
        const header = `เลขที่: <b>${after.poNumber || '-'}</b>\nSupplier: ${after.supplierName || '-'}\nยอดรวม: ฿${(after.totalAmount || 0).toLocaleString()}`;

        let message = '';
        let sendPhotos: string[] = [];

        if (isNew || after.status === 'Draft') {
            message = `🛒 <b>สร้าง PO ใหม่</b>\n` + header;
            if (after.requesterName) message += `\nผู้ขอ: ${after.requesterName}`;
            message += `\nกำหนดส่ง: ${deliveryStr}`;
        } else if (after.status === 'Ordered') {
            message = `📦 <b>สั่งซื้อแล้ว</b>\n` + header;
            message += `\nกำหนดส่ง: ${deliveryStr}`;
        } else if (after.status === 'Received') {
            // รับสินค้า — ส่งรูป
            sendPhotos = photos;
            const photoNote = photos.length === 0 ? '\n⚠️ <i>ไม่มีรูปหลักฐานการรับสินค้า</i>' : '';
            const dateStr = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' });
            message = `✅ <b>รับสินค้าเรียบร้อยแล้ว</b>\n` + header;
            message += `\nกำหนดส่ง: ${deliveryStr} | รับจริง: ${dateStr}`;
            if (after.contactReceiver) message += `\nผู้รับ: ${after.contactReceiver}`;
            if (after.deliveryLocation) message += `\nสถานที่รับ: ${after.deliveryLocation}`;
            message += photoNote;
        } else if (after.status === 'Cancelled') {
            message = `❌ <b>ยกเลิก PO</b>\n` + header;
            if (after.notes) message += `\nหมายเหตุ: ${after.notes}`;
        } else {
            return;
        }

        await sendTelegramWithPhotos(telegramBotToken.value(), telegramChatId.value(), message, sendPhotos);
    }
);

// ==================== 7. PR Created/Status Changed ====================

export const onPurchaseRequisitionWrite = onValueWritten(
    {
        ref: '/purchaseRequisitions/{prId}',
        region: 'asia-southeast1',
        secrets: [telegramBotToken, telegramChatId],
    },
    async (event) => {
        const before = event.data.before.val();
        const after = event.data.after.val();
        if (!after) return;

        // 🚨 Array Shift Protection
        if (before && after && before.id && after.id && before.id !== after.id) {
            console.log(`[CF] onPurchaseRequisitionWrite — SKIP array shift (before.id=${before.id}, after.id=${after.id})`);
            return;
        }

        const isNew = !before;
        const statusChanged = before && before.status !== after.status;
        if (!isNew && !statusChanged) return;

        // Deduplication: ใช้ ID จริง + status-based (ไม่หมดอายุ)
        const actualId = after.id || after.prNumber || event.params.prId;
        const dedupStatus = isNew ? 'new' : after.status;
        const dedupKey = `pr_${actualId}`;
        if (!await checkAndSetDedup(dedupKey, dedupStatus)) return;

        console.log('[CF] onPurchaseRequisitionWrite — id:', actualId, 'isNew:', isNew, 'status:', after.status);

        const photos: string[] = Array.isArray(after.photos) ? after.photos : [];
        const header = `เลขที่: <b>${after.prNumber || '-'}</b>\nSupplier: ${after.supplier || '-'}\nยอดรวม: ฿${(after.totalAmount || 0).toLocaleString()}`;

        let message = '';
        let sendPhotos: string[] = [];

        if (isNew) {
            // สร้าง PR ใหม่ — ส่งรูป
            sendPhotos = photos;
            const photoNote = photos.length === 0 ? '\n⚠️ <i>ไม่มีรูปหลักฐาน</i>' : '';
            message = `📋 <b>สร้าง PR ใหม่</b>\n` + header;
            if (after.requesterName) message += `\nผู้ขอ: ${after.requesterName}`;
            if (after.department) message += ` | แผนก: ${after.department}`;
            message += photoNote;
        } else {
            switch (after.status) {
                case 'รออนุมัติ':
                    message = `📤 <b>ส่งอนุมัติแล้ว</b>\n` + header;
                    if (after.requesterName) message += `\nผู้ขอ: ${after.requesterName}`;
                    break;
                case 'อนุมัติแล้ว':
                    message = `✅ <b>PR อนุมัติแล้ว</b>\n` + header;
                    if (after.approverName) message += `\nผู้อนุมัติ: ${after.approverName}`;
                    break;
                case 'ออก PO แล้ว':
                    message = `🛒 <b>ออก PO แล้ว</b>\n` + header;
                    if (after.relatedPoNumber) message += `\nเลข PO: ${after.relatedPoNumber}`;
                    break;
                case 'ยกเลิก':
                    message = `❌ <b>ยกเลิก PR</b>\n` + header;
                    if (after.notes) message += `\nหมายเหตุ: ${after.notes}`;
                    break;
                default:
                    return;
            }
        }

        await sendTelegramWithPhotos(telegramBotToken.value(), telegramChatId.value(), message, sendPhotos);
    }
);
