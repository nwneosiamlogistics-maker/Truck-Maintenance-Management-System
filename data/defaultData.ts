import type { Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction } from '../types';
import { getLegacyRepairs } from './legacyData';

export const getDefaultTechnicians = (): Technician[] => [
    { id: 'T001', name: 'สมชาย เก่งมาก', skills: ['เครื่องยนต์', 'เบรก', 'ไฟฟ้า'], experience: 10, status: 'ว่าง', rating: 4.8, completedJobs: 120, currentJobs: 0 },
    { id: 'T002', name: 'วิชัย ดีเลิศ', skills: ['ช่วงล่าง', 'แอร์', 'ไฟฟ้า'], experience: 8, status: 'ไม่ว่าง', rating: 4.5, completedJobs: 95, currentJobs: 1 },
    { id: 'T003', name: 'ประเสริฐ ช่างทอง', skills: ['เครื่องยนต์', 'เกียร์'], experience: 15, status: 'ว่าง', rating: 4.9, completedJobs: 210, currentJobs: 0 },
    { id: 'T004', name: 'มานะ อดทน', skills: ['ทั่วไป', 'เปลี่ยนถ่ายน้ำมัน'], experience: 5, status: 'ลา', rating: 4.2, completedJobs: 80, currentJobs: 0 },
];

export const getDefaultStock = (): StockItem[] => [
    { id: 'P001', name: 'น้ำมันเครื่องดีเซล 15W-40', category: 'น้ำมัน', quantity: 50, unit: 'ลิตร', minStock: 20, maxStock: 100, price: 180, sellingPrice: 250, storageLocation: 'A1-01', supplier: 'บจก. สยามออยล์', status: 'ปกติ', notes: 'สำหรับรถบรรทุกหนัก' },
    { id: 'P002', name: 'ไส้กรองน้ำมันเครื่อง', category: 'เครื่องยนต์', quantity: 15, unit: 'ชิ้น', minStock: 10, maxStock: 50, price: 250, sellingPrice: 350, storageLocation: 'A1-02', supplier: 'บจก. ออโต้พาร์ท', status: 'สต๊อกต่ำ' },
    { id: 'P003', name: 'ผ้าเบรกหน้า', category: 'เบรก', quantity: 5, unit: 'ชุด', minStock: 5, maxStock: 20, price: 1200, sellingPrice: 1800, storageLocation: 'B2-05', supplier: 'บจก. เบรกดี', status: 'สต๊อกต่ำ' },
    { id: 'P004', name: 'หลอดไฟหน้า H4', category: 'ไฟฟ้า', quantity: 100, unit: 'หลอด', minStock: 50, maxStock: 200, price: 80, sellingPrice: 150, storageLocation: 'C1-11', supplier: 'บจก. ไลท์ติ้ง', status: 'ปกติ' },
    { id: 'P005', name: 'แบตเตอรี่ 12V 100Ah', category: 'ไฟฟ้า', quantity: 8, unit: 'ลูก', minStock: 5, maxStock: 15, price: 2500, sellingPrice: 3200, storageLocation: 'C1-12', supplier: 'บจก. พลังงานไฟฟ้า', status: 'ปกติ' },
    { id: 'P006', name: 'ยางรถบรรทุก 11R22.5', category: 'ยาง', quantity: 2, unit: 'เส้น', minStock: 4, maxStock: 10, price: 8500, sellingPrice: 10000, storageLocation: 'D3-01', supplier: 'บจก. กู๊ดไทร์', status: 'หมดสต๊อก' },
];

export const getDefaultStockTransactions = (): StockTransaction[] => [];

export const getDefaultRepairs = (): Repair[] => {
    const legacyRepairs = getLegacyRepairs();

    const sampleRepairs: Repair[] = [
        {
            id: 'MR-1678886400000',
            repairOrderNo: 'RO-2024-00001',
            licensePlate: 'กข-1234',
            vehicleType: 'รถบรรทุก 10 ล้อ',
            vehicleMake: 'Isuzu',
            vehicleModel: 'Deca',
            currentMileage: '350000',
            reportedBy: 'นายสมศักดิ์',
            repairCategory: 'เปลี่ยนอะไหล่',
            problemDescription: 'เบรกเสียงดัง, เบรกไม่ค่อยอยู่',
            priority: 'เร่งด่วน',
            status: 'ซ่อมเสร็จ',
            createdAt: '2024-07-15T10:00:00Z',
            updatedAt: '2024-07-16T15:30:00Z',
            approvalDate: '2024-07-15T11:00:00Z',
            assignedTechnician: 'T001',
            repairStartDate: '2024-07-15T11:00:00Z',
            repairEndDate: '2024-07-16T15:00:00Z',
            dispatchType: 'ภายใน',
            repairCost: 1500,
            parts: [
                { partId: 'P003', name: 'ผ้าเบรกหน้า', code: 'P003', quantity: 1, unit: 'ชุด', unitPrice: 1200, source: 'สต๊อกอู่' }
            ],
            attachments: [],
        },
        {
            id: 'MR-1678972800000',
            repairOrderNo: 'RO-2024-00002',
            licensePlate: 'คง-5678',
            vehicleType: 'รถหัวลาก',
            vehicleMake: 'Hino',
            vehicleModel: '700 Splendor',
            currentMileage: '520000',
            reportedBy: 'นายวิรัตน์',
            repairCategory: 'ซ่อมทั่วไป',
            problemDescription: 'เครื่องยนต์เร่งไม่ขึ้น, มีควันดำ',
            priority: 'ฉุกเฉิน',
            status: 'กำลังซ่อม',
            createdAt: '2024-07-18T09:00:00Z',
            updatedAt: '2024-07-18T14:00:00Z',
            approvalDate: '2024-07-18T09:15:00Z',
            assignedTechnician: 'T003',
            repairStartDate: '2024-07-18T09:30:00Z',
            dispatchType: 'ภายใน',
            repairCost: 500,
            parts: [],
            attachments: [],
        },
        {
            id: 'MR-1679059200000',
            repairOrderNo: 'RO-2024-00003',
            licensePlate: 'ฆฆ-9101',
            vehicleType: 'รถกระบะ 4 ล้อ',
            vehicleMake: 'Toyota',
            vehicleModel: 'Revo',
            currentMileage: '120000',
            reportedBy: 'ฝ่ายขนส่ง',
            repairCategory: 'ตรวจเช็ก',
            problemDescription: 'เช็กระยะ 120,000 กม. เปลี่ยนถ่ายน้ำมันเครื่อง',
            priority: 'ปกติ',
            status: 'รอซ่อม',
            createdAt: '2024-07-20T11:00:00Z',
            updatedAt: '2024-07-20T11:00:00Z',
            approvalDate: undefined,
            assignedTechnician: '',
            dispatchType: 'ภายใน',
            parts: [
                { partId: 'P001', name: 'น้ำมันเครื่องดีเซล 15W-40', code: 'P001', quantity: 7, unit: 'ลิตร', unitPrice: 180, source: 'สต๊อกอู่' },
                { partId: 'P002', name: 'ไส้กรองน้ำมันเครื่อง', code: 'P002', quantity: 1, unit: 'ชิ้น', unitPrice: 250, source: 'สต๊อกอู่' }
            ],
            attachments: [],
        },
         {
            id: 'MR-1679145600000',
            repairOrderNo: 'RO-2024-00004',
            licensePlate: 'บห-2468',
            vehicleType: 'รถบรรทุก 6 ล้อ',
            vehicleMake: 'Mitsubishi',
            vehicleModel: 'Fuso',
            currentMileage: '280000',
            reportedBy: 'นายอำนาจ',
            repairCategory: 'ซ่อมทั่วไป',
            problemDescription: 'แอร์ไม่เย็น มีแต่ลม',
            priority: 'ปกติ',
            status: 'รออะไหล่',
            createdAt: '2024-07-21T16:00:00Z',
            updatedAt: '2024-07-22T10:00:00Z',
            approvalDate: '2024-07-21T16:30:00Z',
            assignedTechnician: 'T002',
            dispatchType: 'ภายนอก',
            repairLocation: 'ร้านสมเกียรติแอร์',
            parts: [
                 { partId: 'ext-12345', name: 'คอมเพรสเซอร์แอร์', code: '', quantity: 1, unit: 'ลูก', unitPrice: 4500, source: 'ร้านค้า', supplierName: 'ร้านสมเกียรติแอร์', purchaseDate: '2024-07-22' }
            ],
            attachments: [],
            repairCost: 800
        },
    ];

    return [...sampleRepairs, ...legacyRepairs];
};


export const getDefaultReports = (): Report[] => [
    { id: 'RPT-001', name: 'สรุปค่าใช้จ่ายซ่อมบำรุงรายเดือน', type: 'PDF', filename: 'summary_costs_jun_2024.pdf', createdAt: '2024-07-01T08:00:00Z', status: 'พร้อมใช้', size: '1.2 MB' },
    { id: 'RPT-002', name: 'รายงานสต๊อกอะไหล่คงเหลือ', type: 'Excel', filename: 'stock_balance_jul_2024.xlsx', createdAt: '2024-07-15T17:00:00Z', status: 'พร้อมใช้', size: '350 KB' },
    { id: 'RPT-003', name: 'สถิติการซ่อมตามประเภท', type: 'PDF', filename: 'repair_by_category_q2_2024.pdf', createdAt: '2024-07-05T10:00:00Z', status: 'พร้อมใช้', size: '800 KB' },
];

export const getDefaultMaintenancePlans = (): MaintenancePlan[] => [
    {
        id: 'MP-001',
        vehicleLicensePlate: 'กข-1234',
        planName: 'เปลี่ยนถ่ายน้ำมันเครื่อง',
        lastServiceDate: '2024-05-10',
        frequencyValue: 3,
        frequencyUnit: 'months',
        lastServiceMileage: 340000,
        mileageFrequency: 10000,
    },
    {
        id: 'MP-002',
        vehicleLicensePlate: 'คง-5678',
        planName: 'ตรวจเช็คระบบเบรก',
        lastServiceDate: '2024-02-20',
        frequencyValue: 6,
        frequencyUnit: 'months',
        lastServiceMileage: 500000,
        mileageFrequency: 20000,
    },
    {
        id: 'MP-003',
        vehicleLicensePlate: 'ฆฆ-9101',
        planName: 'สลับยาง',
        lastServiceDate: '2024-06-01',
        frequencyValue: 4,
        frequencyUnit: 'months',
        lastServiceMileage: 110000,
        mileageFrequency: 15000,
    }
];