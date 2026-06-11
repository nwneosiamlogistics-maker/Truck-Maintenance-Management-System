import { useCallback } from 'react';
import type { StockItem, StockTransaction, PurchaseOrderItem, PurchaseRequisitionItem } from '../types';
import { calculateStockStatus } from '../utils';
import { useToast } from '../context/ToastContext';

/**
 * Item ที่สามารถรับเข้าสต๊อกได้ (จาก PR หรือ PO) — ต้องมี stockId เพื่อ link กับคลัง
 */
export type ReceivableItem = {
    stockId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
};

export interface ReceiveOptions {
    documentNumber: string;          // PR-2026-XXXXX หรือ PO-2026-XXXXX
    documentType: 'PR' | 'PO';
    actor?: string;                   // override actor (default: ดึงจาก localStorage userRole)
    useMovingAverage?: boolean;       // E: คำนวณราคาทุนถัวเฉลี่ยถ่วงน้ำหนัก (default: true)
}

export interface ReceiveResult {
    receivedCount: number;
    unlinkedCount: number;
    success: boolean;
}

/**
 * Hook กลางสำหรับรับของเข้าสต๊อก ใช้ใน:
 *   1. PurchaseRequisitionComponent (รับจาก PR)
 *   2. ReceiveFromPOModal (รับจาก PR หน้า Stock)
 *   3. PurchaseOrderManagement (รับจาก PO)
 *
 * ฟีเจอร์:
 *   - กรอง stockId ก่อนอัพเดทสต๊อก (เตือนถ้ามี unlinked)
 *   - คำนวณราคาทุนถัวเฉลี่ยถ่วงน้ำหนัก (Moving Average) — option E
 *   - บันทึก actor จริงจาก localStorage — option D
 *   - สร้าง StockTransaction ครบถ้วน
 */
export function useReceiveStock(
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>,
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>,
) {
    const { addToast } = useToast();

    const receiveItems = useCallback((items: ReceivableItem[], options: ReceiveOptions): ReceiveResult => {
        const safeItems = Array.isArray(items) ? items : [];
        const linked = safeItems.filter(i => !!i.stockId);
        const unlinked = safeItems.filter(i => !i.stockId);

        // เตือนรายการที่ไม่ผูกกับสต๊อก
        if (unlinked.length > 0) {
            addToast(
                `⚠️ ${unlinked.length} รายการไม่ผูกกับสต็อก จะไม่อัพเดทยอดสต็อก: ${unlinked.map(i => i.name).join(', ')}`,
                'warning'
            );
        }
        if (linked.length === 0) {
            addToast('❌ ไม่มีรายการใดผูกกับสต็อก — ยอดสต็อกจะไม่เปลี่ยนแปลง กรุณาตรวจสอบ', 'error');
            return { receivedCount: 0, unlinkedCount: unlinked.length, success: false };
        }

        const now = new Date().toISOString();
        const role = (typeof localStorage !== 'undefined' ? localStorage.getItem('userRole') : '') || 'ผู้ใช้';
        const actor = options.actor ?? `${role} (รับจาก ${options.documentType})`;
        const useMA = options.useMovingAverage !== false; // default true

        // 1. อัพเดทสต๊อก (qty + moving average price + status)
        setStock(prevStock => prevStock.map(s => {
            const matching = linked.find(i => i.stockId === s.id);
            if (!matching) return s;

            const addedQty = Number(matching.quantity) || 0;
            const incomingPrice = Number(matching.unitPrice) || 0;
            const oldQty = Number(s.quantity) || 0;
            const oldPrice = Number(s.price) || 0;
            const newQty = oldQty + addedQty;

            // E: Moving Average ถ้ามีของเดิม — weighted average; ถ้าไม่มีของเดิม ใช้ราคาที่รับ
            let newPrice = oldPrice;
            if (useMA && incomingPrice > 0) {
                if (oldQty <= 0) {
                    newPrice = incomingPrice;
                } else {
                    newPrice = ((oldQty * oldPrice) + (addedQty * incomingPrice)) / newQty;
                    newPrice = Math.round(newPrice * 100) / 100;
                }
            }

            return {
                ...s,
                quantity: newQty,
                price: newPrice,
                status: calculateStockStatus(newQty, s.minStock, s.maxStock),
            };
        }));

        // 2. สร้าง StockTransaction
        const docLabel = options.documentType === 'PO' ? 'ใบสั่งซื้อ' : 'ใบขอซื้อ';
        const txns: StockTransaction[] = linked.map((item, idx) => ({
            id: `TXN-IN-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
            stockItemId: item.stockId!,
            stockItemName: item.name,
            type: 'รับเข้า',
            quantity: Number(item.quantity) || 0,
            transactionDate: now,
            actor,
            notes: `รับของจาก${docLabel} ${options.documentNumber}`,
            documentNumber: options.documentNumber,
            pricePerUnit: Number(item.unitPrice) || 0,
        }));
        setTransactions(prev => [...txns, ...(Array.isArray(prev) ? prev : [])]);

        return { receivedCount: linked.length, unlinkedCount: unlinked.length, success: true };
    }, [setStock, setTransactions, addToast]);

    return { receiveItems };
}
