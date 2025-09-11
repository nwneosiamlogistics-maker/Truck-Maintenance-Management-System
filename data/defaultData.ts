import type { Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, PurchaseRequisition } from '../types';

export const getDefaultTechnicians = (): Technician[] => [];

export const getDefaultStock = (): StockItem[] => [];

export const getDefaultStockTransactions = (): StockTransaction[] => [];

export const getDefaultRepairs = (): Repair[] => {
    return [];
};

export const getDefaultReports = (): Report[] => [];

export const getDefaultMaintenancePlans = (): MaintenancePlan[] => [];

export const getDefaultPurchaseRequisitions = (): PurchaseRequisition[] => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    return [
        {
            id: 'PR-2025-00001',
            prNumber: 'PR-2025-00001',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
            requesterName: 'สมชาย คลังสินค้า',
            department: 'แผนกคลังสินค้า',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: 'ร้านศรีสมบูรณ์อะไหล่ยนต์',
            status: 'รออนุมัติ',
            items: [
                { stockId: 'STK-001', stockCode: 'FL-001', name: 'ไส้กรองน้ำมันเครื่อง', quantity: 10, unit: 'ชิ้น', unitPrice: 150, deliveryOrServiceDate: new Date().toISOString().split('T')[0] },
                { stockId: 'STK-002', stockCode: 'BP-001', name: 'ผ้าเบรค', quantity: 4, unit: 'ชุด', unitPrice: 800, deliveryOrServiceDate: new Date().toISOString().split('T')[0] },
            ],
            totalAmount: 4700,
            notes: 'ของด่วนสำหรับซ่อมรถหัวลาก',
            approverName: '',
            approvalDate: null,
            requestType: 'Product',
            budgetStatus: 'Have Budget',
        },
        {
            id: 'PR-2025-00002',
            prNumber: 'PR-2025-00002',
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
            requesterName: 'สมหญิง จัดซื้อ',
            department: 'แผนกจัดซื้อ',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: 'บริษัท มั่งคั่งเซอร์วิส จำกัด',
            status: 'อนุมัติแล้ว',
            items: [
                 { stockId: '', stockCode: '', name: 'บริการซ่อมแอร์รถบัส', quantity: 1, unit: 'ครั้ง', unitPrice: 2500, deliveryOrServiceDate: new Date().toISOString().split('T')[0] },
            ],
            totalAmount: 2500,
            notes: 'แอร์ไม่เย็น',
            approverName: 'ผู้จัดการ',
            approvalDate: yesterday.toISOString(),
            requestType: 'Service',
            budgetStatus: 'Have Budget',
        },
        {
            id: 'PR-2025-00003',
            prNumber: 'PR-2025-00003',
            createdAt: yesterday.toISOString(),
            updatedAt: now.toISOString(),
            requesterName: 'สมชาย คลังสินค้า',
            department: 'แผนกคลังสินค้า',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: 'ร้านรุ่งเรืองการยาง',
            status: 'รอสินค้า',
            items: [
                 { stockId: 'STK-003', stockCode: 'TR-001', name: 'ยางรถบรรทุก 10 ล้อ', quantity: 2, unit: 'เส้น', unitPrice: 7500, deliveryOrServiceDate: new Date().toISOString().split('T')[0] },
            ],
            totalAmount: 15000,
            notes: '',
            approverName: 'ผู้จัดการ',
            approvalDate: yesterday.toISOString(),
            requestType: 'Product',
            budgetStatus: 'Have Budget',
        },
    ];
};