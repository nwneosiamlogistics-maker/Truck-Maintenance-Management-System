
import { Notification, StockItem, MaintenancePlan, Repair, Tab } from '../types';

/**
 * กำหนดเงื่อนไขและสร้างการแจ้งเตือนอัตโนมัติ
 * พยายามตรวจสอบเพื่อไม่ให้เกิดการแจ้งเตือนซ้ำซ้อน
 */
export const checkAndGenerateSystemNotifications = (
    currentNotifications: Notification[],
    stock: StockItem[],
    plans: MaintenancePlan[],
    repairs: Repair[]
): Notification[] => {
    const newNotifications: Notification[] = [...currentNotifications];
    let hasChanges = false;
    const now = new Date().toISOString();

    // Helper checking if an auto-notification already exists (and is unread)
    const exists = (id: string) => newNotifications.some(n => n.id === id && !n.isRead);

    // 1. ตรวจสอบสต็อกสินค้า (Critical Stock)
    stock.forEach(item => {
        if (!item.isFungibleUsedItem) {
            const autoId = `AUTO-STOCK-${item.id}`;
            if (item.quantity <= item.minStock) {
                if (!exists(autoId)) {
                    const type = item.quantity <= 0 ? 'danger' : 'warning';
                    const message = item.quantity <= 0
                        ? `อะไหล่หมดสต็อก: ${item.name} (${item.code})`
                        : `อะไหล่ใกล้หมด: ${item.name} เหลือเพียง ${item.quantity} ${item.unit}`;

                    newNotifications.unshift({
                        id: autoId,
                        message,
                        type,
                        isRead: false,
                        createdAt: now,
                        linkTo: 'stock'
                    });
                    hasChanges = true;
                }
            }
        }
    });

    // 2. ตรวจสอบแผน PM (Overdue & Upcoming)
    plans.forEach(plan => {
        const autoIdPM = `AUTO-PM-${plan.id}`;

        const lastDate = new Date(plan.lastServiceDate);
        let nextServiceDate = new Date(lastDate);
        if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
        else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
        else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

        const diffDays = (nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);

        if (diffDays < 0) {
            // Overdue
            if (!exists(autoIdPM + '-overdue')) {
                newNotifications.unshift({
                    id: autoIdPM + '-overdue',
                    message: `แผน PM เกินกำหนด: ${plan.vehicleLicensePlate} (${plan.planName}) เกินมาแล้ว ${Math.floor(Math.abs(diffDays))} วัน`,
                    type: 'danger',
                    isRead: false,
                    createdAt: now,
                    linkTo: 'preventive-maintenance'
                });
                hasChanges = true;
            }
        } else if (diffDays <= 7) {
            // Due soon (within 7 days)
            if (!exists(autoIdPM + '-upcoming')) {
                newNotifications.unshift({
                    id: autoIdPM + '-upcoming',
                    message: `ใกล้ถึงกำหนด PM: ${plan.vehicleLicensePlate} (${plan.planName}) ในอีก ${Math.ceil(diffDays)} วัน`,
                    type: 'warning',
                    isRead: false,
                    createdAt: now,
                    linkTo: 'preventive-maintenance'
                });
                hasChanges = true;
            }
        }
    });

    // 3. ตรวจสอบงานซ่อมนานผิดปกติ (Overdue Repairs)
    repairs.forEach(repair => {
        if (repair.status === 'กำลังซ่อม' && repair.repairStartDate) {
            const autoIdRepair = `AUTO-REPAIR-DELAY-${repair.id}`;
            const start = new Date(repair.repairStartDate);
            const diffDays = (new Date().getTime() - start.getTime()) / (1000 * 3600 * 24);

            if (diffDays > 2) { // ซ่อมนานเกิน 2 วัน
                if (!exists(autoIdRepair)) {
                    newNotifications.unshift({
                        id: autoIdRepair,
                        message: `งานซ่อมอืดจาง: ${repair.licensePlate} (${repair.repairOrderNo}) ใช้เวลาซ่อมนานกว่า 2 วันแล้ว`,
                        type: 'info',
                        isRead: false,
                        createdAt: now,
                        linkTo: 'list'
                    });
                    hasChanges = true;
                }
            }
        }
    });

    // จำกัดจำนวนแจ้งเตือนเพื่อไม่ให้ Firebase บวม (เก็บไว้ล่าสุด 50 รายการ)
    if (newNotifications.length > 50) {
        return newNotifications.slice(0, 50);
    }

    return hasChanges ? newNotifications : currentNotifications;
};
