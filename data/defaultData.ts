

import type { Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, PurchaseRequisition, Vehicle, Supplier, UsedPartBuyer, AnnualPMPlan, RepairKPI, MaintenanceBudget, FuelRecord, Driver } from '../types';

export const getDefaultTechnicians = (): Technician[] => [
    {
        id: 'T001',
        name: 'นายสมชาติ แซ่เอี้ยว',
        role: 'ช่าง',
        skills: ['เครื่องยนต์ดีเซล', 'ระบบเบรก', 'ช่วงล่าง'],
        experience: 15,
        status: 'ว่าง',
        rating: 4.8,
        completedJobs: 152,
        currentJobs: 0,
    },
    {
        id: 'T002',
        name: 'นายสมพร เกิดศรี',
        role: 'ช่าง',
        skills: ['ระบบไฟฟ้า', 'แอร์', 'ระบบส่งกำลัง'],
        experience: 12,
        status: 'ว่าง',
        rating: 4.7,
        completedJobs: 135,
        currentJobs: 0,
    },
    {
        id: 'T003',
        name: 'นายอนุชิต พิมพา',
        role: 'ช่าง',
        skills: ['ตัวถัง', 'งานเชื่อม', 'ช่วงล่าง'],
        experience: 8,
        status: 'ว่าง',
        rating: 4.5,
        completedJobs: 98,
        currentJobs: 0,
    },
    {
        id: 'T004',
        name: 'นายมิน',
        role: 'ผู้ช่วยช่าง',
        skills: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'ตรวจเช็คทั่วไป'],
        experience: 2,
        status: 'ว่าง',
        rating: 4.2,
        completedJobs: 210,
        currentJobs: 0,
    },
    {
        id: 'T005',
        name: 'นายนุโรม ศรีมหรรณ์',
        role: 'ผู้ช่วยช่าง',
        skills: ['ล้างอัดฉีด', 'ช่วยงานทั่วไป'],
        experience: 1,
        status: 'ว่าง',
        rating: 4.0,
        completedJobs: 180,
        currentJobs: 0,
    },
];

export const getDefaultStock = (): StockItem[] => [];

export const getDefaultStockTransactions = (): StockTransaction[] => [];

export const getDefaultRepairs = (): Repair[] => {
    return [];
};

export const getDefaultReports = (): Report[] => [];

export const getDefaultMaintenancePlans = (): MaintenancePlan[] => [
    {
        id: 'MP-6937-1',
        vehicleLicensePlate: '70-6937',
        planName: 'เช็กช่วงล่างทั้งระบบ',
        lastServiceDate: '2024-02-15T10:00:00.000Z',
        frequencyValue: 6,
        frequencyUnit: 'months',
        lastServiceMileage: 120000,
        mileageFrequency: 30000,
    },
    {
        id: 'MP-6937-2',
        vehicleLicensePlate: '70-6937',
        planName: 'ถ่ายน้ำมันเครื่อง ตรวจเช็กช่วงล่าง ระบบเบรค ยาง',
        lastServiceDate: '2024-04-01T10:00:00.000Z',
        frequencyValue: 3,
        frequencyUnit: 'months',
        lastServiceMileage: 135000,
        mileageFrequency: 15000,
    },
    {
        id: 'MP-0141-1',
        vehicleLicensePlate: '71-0141',
        planName: 'ตรวจเช็คระบบทั่วไป',
        lastServiceDate: '2024-04-20T10:00:00.000Z',
        frequencyValue: 2,
        frequencyUnit: 'months',
        lastServiceMileage: 85000,
        mileageFrequency: 10000,
    },
];

export const getDefaultAnnualPMPlans = (): AnnualPMPlan[] => {
    const year = 2024;
    return [
        {
            id: `71-0141-MP-0141-1-${year}`,
            vehicleLicensePlate: '71-0141',
            maintenancePlanId: 'MP-0141-1',
            year: year,
            months: { 4: 'completed' } // Manual override example
        },
    ];
};


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
            vatAmount: 329,
            totalAmount: 5029,
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
            vatAmount: 0,
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
            vatAmount: 1050,
            totalAmount: 16050,
            notes: '',
            approverName: 'ผู้จัดการ',
            approvalDate: yesterday.toISOString(),
            requestType: 'Product',
            budgetStatus: 'Have Budget',
        },
    ];
};

const rawSupplierData = `
P301-1	ไพศาลนครสวรรค์	น้ำมัน
P401-1	เกียรติสถาพรโลหะกิจ	อะไหล่รถยนต์
P401-2	บจก.พี.เอส.เจ้าพระยาคาร์คลีนิค	ซ่อม อะไหล่รถยนต์
P401-3	ห้างหุ้นส่วนจำกัด ยนต์เนรมิตปากน้ำโพ	โรงกลึง ซ่อมเครื่องจักรกล
P401-4	จินตนาผ้าใบ	ผ้าใบ+ปะผ้าใบ
P401-5	เอี้ยเส็งหลี	เชือก+ผ้าลาย
P401-6	เซียงกงอะไหล่ยนต์	อะไหล่รถยนต์ มือสอง
P401-7	ส.ศิริยนต์	อะไหล่รถยนต์
P401-8	ชุนอะไหล่ยนต์	อะไหล่รถยนต์ มือสอง
P401-9	สังคมหม้อน้ำ	ซ่อม หม้อน้ำ
P401-10	ยนต์ตระการ	โรงกลึง ซ่อมเครื่องจักรกล
P401-11	J & D การช่าง	ซ่อมรถยนต์
P401-12	ไทยโลหะ	อะไหล่รถยนต์
P401-13	เอ็กเฮง	อะไหล่รถยนต์
P401-14	เพชรออโต้แอร์	อะไหล่รถยนต์
P401-16	พิษณุโลกมอเตอร์เซลส์	ซ่อม อะไหล่รถยนต์
P401-17	ร้านวัฒนาการ	อะไหล่รถยนต์ แบตเตอรี่ อุปกรณ์ไฟรถ
P401-18	ร้านน๊อต (ณรงค์การช่าง)	อะไหล่รถยนต์ เครื่องมือช่าง โรงกลึง ซ่อมเครื่องจักรกล
P401-19	เปียท่อไอเสีย	อะไหล่ ซ่อมท่อไอเสีย
P401-20	หนิงดีเซล	ซ่อมรถยนต์ หัวฉีด
P401-21	อู่ ส.ฟ้าสดใส	ซ่อม อะไหล่รถยนต์
P401-22	แสงพิทักษ์การไฟฟ้า	อุปกรณ์ไฟฟ้า
P402-1	เอี้ยฮั่วฮง	ยางรถยนต์
P402-2	ปึงเม่งเฮง	ยางรถยนต์
P403-1	นครสวรรค์เต็กเซ่งฮง	อุปกรณ์ก่อสร้าง
-	บจ.ไทยวัธนา เมทัลชีท	อุปกรณ์ก่อสร้าง แผ่นเมทัลชีท
-	บจ.เอส.เค. เซอร์วิส	ซ่อมเครื่องถ่ายเอกสาร
-	วิคตอรี่แอร์เทค	อะไหล่รถยนต์ แอร์รถยนต์
-	บริษัท รักษาความปลอดภัย เจ้าพระยาป้องกันภัย จำกัด	รปภ.
-	ช่างแดง อู่พี.เอส.	อู่ซ่อมรถยนต์
-	บริษัท เสียงไพศาล จำกัด	ศูนย์บริการซ่อมรถและอะไหล่
-	บริษัท อีซูซุเสนียนต์นครสวรรค์ จำกัด	ศูนย์บริการซ่อมรถและอะไหล่
-	ยูเคเมด	ร้านป้าย สติ๊กเกอร์
`;

export const getDefaultSuppliers = (): Supplier[] => {
    let tempIdCounter = 1;
    return rawSupplierData
        .trim()
        .split('\n')
        .map((line, index) => {
            const parts = line.split('\t');
            if (parts.length < 2 || !parts[1]?.trim()) {
                return null;
            }
            const code = parts[0]?.trim() || '';
            const name = parts[1]?.trim() || '';
            const services = parts[2]?.trim() || '';

            const finalCode = (code === '-') ? `SUP-TEMP-${tempIdCounter++}` : code;
            return {
                id: `SUP-init-${index}`,
                code: finalCode,
                name: name,
                services: services,
                address: null,
                phone: null,
                email: null,
                otherContacts: null,
            };
        })
        .filter((s): s is Supplier => s !== null);
};

const rawUsedPartBuyerData = `
	ขาวการยาง	ยางรถยนต์		087-7351770
	คุณโจการยาง	ยางรถยนต์ น้ำมันเครื่องเก่า แบตเตอรี่ 		098-4908234
	คุณเปิ้ล(ขนดิน)	ยางรถยนต์		080-6857252
	คุณภิทักษ์	ยางรถยนต์		086-2133731
	คุณสมจิตร	ยางรถยนต์		088-1666705
	คุณสมชาย	ยางรถยนต์		087-5772263 , 088-1614822
	คุณอาราม	ยางรถยนต์		084-0505747
	คุณอุดม	ยางรถยนต์		095-4127791
	ลุงเชน	น้ำมันเครื่องเก่า		089-4609085
`;

export const getDefaultUsedPartBuyers = (): UsedPartBuyer[] => {
    return rawUsedPartBuyerData
        .trim()
        .split('\n')
        .map((line, index) => {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length < 2 || !parts[1]) {
                return null;
            }

            // The first part (code) might be empty, so we skip it (index 0).
            const name = parts[1];
            const products = parts[2] || '';
            const phone = parts[4] || null; // Phone is at a different index due to empty columns

            return {
                id: `UPB-init-${index}`,
                code: `B-${String(index + 1).padStart(3, '0')}`,
                name: name,
                products: products,
                address: null,
                phone: phone,
                email: null,
                otherContacts: null,
            };
        })
        .filter((b): b is UsedPartBuyer => b !== null);
};


const thaiMonthMap: { [key: string]: number } = {
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
    'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
};

const parseThaiShortDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '(ไม่ต่อ)') return null;
    const parts = dateStr.split(' ');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = thaiMonthMap[parts[1]];
    let year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) return null;

    // Assuming '25' means year 2025, '26' means 2026
    if (year < 100) {
        year += 2000;
    }

    try {
        const date = new Date(Date.UTC(year, month, day));
        return date.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

const parseRegistrationDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '-') return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null; // e.g., 26/08/2013

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    try {
        const date = new Date(Date.UTC(year, month, day));
        return date.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

const rawVehicleData = `ทะเบียน	ประเภท	ยี่ห้อ	รุ่น	วันจดทะเบียนรถ	ชื่อบริษัท ประกันภัย	วันที่ต่อประกัน	ปรเภทประกัน	ชื่อบริษัท พรบ.	วันที่ต่อ พรบ.	ชื่อบริษัท ประกันสินค้า
82-8360	6 ล้อ ตู้	-	-	-	LMG	27 ต.ค. 25	ป.3	เออร์โก	30 ก.ย. 25	CHUBB
71-0141	6 ล้อ ตู้	ISUZU	FTR34QZL	26/08/2013	VIB	27 ก.พ. 26	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
71-0139	หัวพ่วง 6 ล้อ ตู้	ISUZU	GXZ77NXXFV	10/06/2019	VIB	14 พ.ค. 26	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
71-7009	10 ล้อ ตู้	HINO	-	-	VIB	26 ก.ย. 25	ป.1	BKI	31 มี.ค. 26	CHUBB
70-9500	10 ล้อ ตู้	ISUZU	FVM34TNXXS	05/09/2016	VIB	31 ม.ค. 26	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
70-0340	10 ล้อ เดี่ยว	MISUBISHI	FUSO	12/04/1983	VIB	31 มี.ค. 26	ป.3	เออร์โก	31 มี.ค. 26	CHUBB
71-0591	10 ล้อ เดี่ยว	ISUZU	-	-	VIB	27 ก.ย. 25	ป.3	เออร์โก	31 ธ.ค. 25	CHUBB
70-7897	10 ล้อ เดี่ยว	HINO	FL3HNKA	17/06/1994	LMG	24 ม.ค. 26	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
70-9459	10 ล้อ เดี่ยว	ISUZU	-	24/10/2001	VIB	15 มิ.ย. 26	ป.3	เออร์โก	31 มี.ค. 26	CHUBB
70-7893	10 ล้อ เดี่ยว	ISUZU	JCZ530Y	12/05/1995	LMG	10 ต.ค. 25	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
70-7898	10 ล้อ เดี่ยว	-	-	24/01/1973	LMG	31 ธ.ค. 25	ป.3	เออร์โก	31 ธ.ค. 25	CHUBB
71-1208	10 ล้อ เดี่ยว	HINO	-	-	VIB	3 ก.พ. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
71-1209	12 ล้อ เดี่ยว	HINO	FL8JT1A-SGT	-	VIB	3 ก.พ. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
70-8900	หัวพ่วง 10 ล้อ	HINO	FM1AN1D-SHT	26/10/2016	LMG	20 ต.ค. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-8901	หัวพ่วง 10 ล้อ	HINO	FM1AN1D-SHT	26/10/2016	LMG	20 ต.ค. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
71-0259	หัวพ่วง 10 ล้อ	HINO	FM1ANKD	19/10/2009	VIB	1 ก.พ. 26	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-6937	หัวพ่วง 10 ล้อ	HINO	FM1ANLD	07/06/2011	LMG	26 ก.ย. 25	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
70-7015	หัวพ่วง 10 ล้อ	HINO	FM1ANLD	09/09/2011	LMG	26 ก.ย. 25	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-7950	หัวพ่วง 10 ล้อ	HINO	FM1ANLD	02/09/2013	LMG	28 ก.ย. 25	ป.1	เออร์โก	30 มิ.ย. 26	-
70-8157	หัวพ่วง 10 ล้อ	HINO	FM1ANLD	16/01/2014	LMG	26 ก.ย. 25	ป.1	เออร์โก	31 ธ.ค. 25	-
71-0842	หัวพ่วง 10 ล้อ	ISUZU	-	-	VIB	11 พ.ย. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-8879	หัวพ่วง 10 ล้อ	HINO	FM1AN1D-SHT	28/09/2016	LMG	25 ก.ย. 25	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-9413	หัวพ่วง 10 ล้อ	HINO	FM1AN1D-SHT	21/02/2018	VIB	17 ม.ค. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
70-9414	หัวพ่วง 10 ล้อ	HINO	FM1AN1D-SHT	21/02/2018	VIB	17 ม.ค. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
71-0048	หัวพ่วง 10 ล้อ	ISUZU	FXZ77QXDFV	21/02/2018	VIB	21 ม.ค. 26	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
71-1115	หัวพ่วง 10 ล้อ	ISUZU	-	-	BKI	6 พ.ย. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-6375	หัวพ่วง 10 ล้อ บรรทุกเฉพาะกิจ (ผ้าใบปิดข้าง)	HINO	FG1JPKA	26/10/2009	LMG	16 ก.ย. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
71-1124	หัวพ่วง 10 ล้อ ตู้	ISUZU	-	-	VIB	18 พ.ย. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-8211	หัวพ่วง 10 ล้อ NGV	HINO	FM2PNMD	21/02/2014	VIB	7 ก.พ. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
70-5455	หัวลาก 10 ล้อ	HINO	FM1JKNA	22/08/2002	LMG	22 ธ.ค. 25	ป.1	เออร์โก	31 ธ.ค. 25	-
70-7529	หัวลาก 10 ล้อ	ISUZU	GXZ23KZH2E	29/04/2008	LMG	26 ก.ย. 25	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-9271	หัวลาก 10 ล้อ	HINO	FM1AK1B-SHT	17/10/2017	LMG	20 ต.ค. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-9870	หัวลาก 10 ล้อ	ISUZU	GXZ77NXXFV	05/02/2019	VIB	21 ม.ค. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
70-9871	หัวลาก 10 ล้อ	ISUZU	GXZ77NXXFV	05/02/2019	LMG	21 ม.ค. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
71-0716	หัวลาก 10 ล้อ	ISUZU	GXZ77NXXFV	07/02/2020	VIB	21 ม.ค. 26	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
71-1123	หัวลาก 10 ล้อ	HINO	-	-	LMG	22 พ.ย. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-6842	หัวลาก 10 ล้อ	HINO	FM1JKKA	09/03/2011	LMG	31 ธ.ค. 25	ป.1	เออร์โก	31 ธ.ค. 25	CHUBB
71-1272	หัวลาก 10 ล้อ	HINO	FM1AK1B-SHT	-	BKI	8 ก.ย. 25	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
71-1273	หัวลาก 10 ล้อ	HINO	FM1AK1B-SHT	-	BKI	8 ก.ย. 25	ป.1	เออร์โก	31 มี.ค. 26	CHUBB
71-1588	หัวลาก 10 ล้อ	HINO	-	-	LMG	2 ธ.ค. 25	ป.1	เออร์โก	30 ก.ย. 25	CHUBB
70-7569	หัวลาก 10 ล้อ	HINO	FM1JKKA	07/08/2012	LMG	6 ส.ค. 25	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-9429	หัวลาก 10 ล้อ	HINO	FM1JKKA	24/03/2011	LMG	26 ก.ย. 25	ป.1	เออร์โก	30 มิ.ย. 26	CHUBB
70-9440	หัวลาก 10 ล้อ NGV	HINO	FM1JKKA	23/03/2011	VIB	15 ส.ค. 25	ป.1	เออร์โก	30 มิ.ย. 26	-
70-0390	หางพ่วง 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	CHUBB
70-7567	หางพ่วง 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	CHUBB
70-6376	หางพ่วง 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
71-0140	หางพ่วง 8 ล้อ ตู้	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	CHUBB
71-1125	หางพ่วง 12 ล้อ ตู้	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	CHUBB
70-6482	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	CHUBB
70-6053	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
70-6436	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
70-6938	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	CHUBB
70-7016	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	CHUBB
70-7951	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	CHUBB
70-8158	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	CHUBB
71-0263	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	CHUBB
71-0843	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	CHUBB
70-9501	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	CHUBB
71-1116	หางพ่วง 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	CHUBB
70-8212	หางพ่วง NGV 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	CHUBB
70-6677	หางเทรลเลอร์คอก 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
70-7531	หางเทรลเลอร์คอก 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
70-9467	หางเทรลเลอร์คอก 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
70-7530	หางเทรลเลอร์คอก 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
71-1192	หางเทรลเลอร์คอก 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
71-1193	หางเทรลเลอร์คอก 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
70-6374	หางเปลือย 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
71-0841	หางเปลือย 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
71-0832	หางเปลือย 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
71-0789	หางเปลือย 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
71-0790	หางเปลือย 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
70-7911	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
70-6494	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
71-1161	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
70-7964	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
70-9490	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
70-9493	หางตู้ คอนเทนเนอร์ 40 ฟุต 8 ล้อ	-	-	-	-	-	-	เออร์โก	30 มิ.ย. 26	-
70-9494	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
70-9491	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
71-1160	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
71-1106	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
71-1117	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	30 ก.ย. 25	-
71-1319	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 มี.ค. 26	-
71-1637	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-
`;
export const getDefaultVehicles = (): Vehicle[] => {
    const lines = rawVehicleData.trim().split('\n');
    lines.shift(); // Remove header

    return lines
        .map((line, index) => {
            const parts = line.split('\t').map(p => p.trim());
            // A valid line must have at least the license plate
            if (!parts[0] || parts[0] === '-') {
                return null;
            }

            return {
                id: `VEH-init-${index}`,
                licensePlate: parts[0],
                vehicleType: (parts[1] && parts[1] !== '-') ? parts[1] : '',
                make: (parts[2] && parts[2] !== '-') ? parts[2] : '',
                model: (parts[3] && parts[3] !== '-') ? parts[3] : '',
                chassisNumber: null,
                engineNumber: null,
                registrationDate: parseRegistrationDate(parts[4]),
                taxExpiryDate: null,
                province: null,
                fuelType: null,
                yearOfManufacture: null,
                insuranceCompany: (parts[5] && parts[5] !== '-') ? parts[5] : null,
                insuranceExpiryDate: parseThaiShortDate(parts[6]),
                insuranceType: (parts[7] && parts[7] !== '-') ? parts[7] : null,
                actCompany: (parts[8] && parts[8] !== '-') ? parts[8] : null,
                actExpiryDate: parseThaiShortDate(parts[9]),
                cargoInsuranceCompany: (parts[10] && parts[10] !== '-') ? parts[10] : null,
                status: 'Active',
            };
        })
        .filter((v): v is Vehicle => v !== null);
};

export const getDefaultKpiData = (): RepairKPI[] => [
    { id: 'kpi-1', category: 'หมวดเครื่องยนต์', item: 'โอเวอร์ฮอลเครื่องยนต์รถหัวลาก', standardHours: 65 },
    { id: 'kpi-2', category: 'หมวดเครื่องยนต์', item: 'โอเวอร์ฮอลเครื่องยนต์รถปิคอัพ', standardHours: 11 },
    { id: 'kpi-3', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบฝาสูบรถหัวลาก', standardHours: 25 },
    { id: 'kpi-4', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบฝาสูบรถปิคอัพ', standardHours: 4 },
    { id: 'kpi-5', category: 'หมวดเครื่องยนต์', item: 'ปรับตั้งวาล์ว', standardHours: 3.5 },
    { id: 'kpi-6', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบหัวฉีด', standardHours: 2.5 },
    { id: 'kpi-7', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนสายท่อยางปั๊มน้ำ', standardHours: 1.5 },
    { id: 'kpi-8', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนสายท่อยางน้ำ', standardHours: 0.75 },
    { id: 'kpi-9', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนท่อบายพาสน้ำ', standardHours: 2.5 },
    { id: 'kpi-10', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนท่อราวน้ำ', standardHours: 5 },
    { id: 'kpi-11', category: 'หมวดเครื่องยนต์', item: 'ถอดเปลี่ยนสายพานปั๊มน้ำ,ไดชาร์ท', standardHours: 1.5 },
    { id: 'kpi-12', category: 'หมวดเครื่องยนต์', item: 'ถอดเปลี่ยนสายพานแอร์', standardHours: 1.5 },
    { id: 'kpi-13', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบเทอร์โบชาร์จเจอร์', standardHours: 5.1 },
    { id: 'kpi-14', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบปั๊มเชื้อเพลิง ( รถใช้ดีเซล ยูโร 2 )', standardHours: 6 },
    { id: 'kpi-15', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบฟีดปั๊ม', standardHours: 2 },
    { id: 'kpi-16', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนซีลหน้าเครื่อง', standardHours: 4 },
    { id: 'kpi-17', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนซีลท้ายเครื่อง', standardHours: 8 },
    { id: 'kpi-18', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนปะเก็นอ่างน้ำมันเครื่องเครื่อง', standardHours: 6 },
    { id: 'kpi-19', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบชุดเสื้อกรองน้ำมันเครื่อง', standardHours: 6 },
    { id: 'kpi-20', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนปะเก็นฝาข้างเครื่องฝา 1 ฝา', standardHours: 2.25 },
    { id: 'kpi-21', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนปะเก็นฝาครอบวาล์ว 1 ฝา', standardHours: 2 },
    { id: 'kpi-22', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนน็อตสตัทไอดี,ไอเสีย', standardHours: 5 },
    { id: 'kpi-23', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนยางแท่นเครื่อง,เกียร์ 1 จุด', standardHours: 2.25 },
    { id: 'kpi-24', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยน,ซ่อมคานรองรับเครื่องยนต์', standardHours: 8 },
    { id: 'kpi-25', category: 'หมวดเครื่องยนต์', item: 'ซ่อมปั๊มลมทั่วไป', standardHours: 2.5 },
    { id: 'kpi-26', category: 'หมวดเครื่องยนต์', item: 'overhaulปั๊มลม', standardHours: 5 },
    { id: 'kpi-27', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยน,ปรับตั้งกาวนาลม', standardHours: 1 },
    { id: 'kpi-28', category: 'หมวดเครื่องยนต์', item: 'บริการวาล์วกันกลับ', standardHours: 1 },
    { id: 'kpi-29', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบหม้อน้ำ', standardHours: 4 },
    { id: 'kpi-30', category: 'หมวดเครื่องยนต์', item: 'ถ่ายน้ำ-เติมน้ำยาหม้อน้ำ', standardHours: 1.25 },
    { id: 'kpi-31', category: 'หมวดเครื่องยนต์', item: 'ถอดประกอบหม้อพักน้ำ', standardHours: 1 },
    { id: 'kpi-32', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนใบพัด-ยอยพัดลมหม้อน้ำ', standardHours: 2 },
    { id: 'kpi-33', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนยางกันกระชากหน้าเครื่อง', standardHours: 3.5 },
    { id: 'kpi-34', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบชุดออยล์คูลเลอร์', standardHours: 5 },
    { id: 'kpi-35', category: 'หมวดเครื่องยนต์', item: 'ถอดเปลี่ยนท่อยางหม้อน้ำบน-ล่าง พร้อมถ่ายน้ำหม้อน้ำ', standardHours: 1.5 },
    { id: 'kpi-36', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนปลั๊กเดรนน้ำ', standardHours: 0.2 },
    { id: 'kpi-37', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนชุดซ่อมปั๊มน้ำ', standardHours: 4 },
    { id: 'kpi-38', category: 'หมวดเครื่องยนต์', item: 'ถอดใส่ น็อต ท่อไอเสีย ต่อ 1 จุด', standardHours: 0.2 },
    { id: 'kpi-39', category: 'หมวดเครื่องยนต์', item: 'ซ่อมน้ำมันเครื่องรั่ว 1 จุด', standardHours: 1 },
    { id: 'kpi-40', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนสายพานเครื่อง', standardHours: 0.7 },
    { id: 'kpi-41', category: 'หมวดเครื่องยนต์', item: 'ปรับตั้งสายพาน', standardHours: 0.3 },
    { id: 'kpi-42', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนปั๊ม(ฟีดปั๊ม)โซล่า ไล่ระบบน้ำมันโซล่า', standardHours: 2.75 },
    { id: 'kpi-43', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนสายอ่อนปั๊มลม', standardHours: 0.5 },
    { id: 'kpi-44', category: 'หมวดเครื่องยนต์', item: 'เชื่อมแป๊ปสายน้ำมันเครื่อง ต่อ 1 จุด', standardHours: 1 },
    { id: 'kpi-45', category: 'หมวดเครื่องยนต์', item: 'เชื่อมสวิทช์ความร้อน', standardHours: 0.5 },
    { id: 'kpi-46', category: 'หมวดเครื่องยนต์', item: 'เชื่อมปลั๊กเกลียวสวิทย์แรงดัน', standardHours: 1.5 },
    { id: 'kpi-47', category: 'หมวดเครื่องยนต์', item: 'ซ่อมแป๊บน้ำมันเครื่อง', standardHours: 2.5 },
    { id: 'kpi-48', category: 'หมวดเครื่องยนต์', item: 'เชื่อมแป๊ปน้ำมันไหลกลับ ต่อ 1 จุด', standardHours: 2 },
    { id: 'kpi-49', category: 'หมวดเครื่องยนต์', item: 'เปลี่ยนสตรัทยึดหัวฉีด เชื่อมรูรั่วหัวฉีด', standardHours: 2.5 },
    { id: 'kpi-50', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบหัวฉีด', standardHours: 3.5 },
    { id: 'kpi-51', category: 'หมวดเครื่องยนต์', item: 'ถอด-ประกอบจานจ่ายไฟ', standardHours: 2.5 },
    { id: 'kpi-52', category: 'หมวดเครื่องยนต์', item: 'ปรับตั้งองศาจุดระเบิดปั๊ม,จานจ่าย', standardHours: 2 },
    { id: 'kpi-53', category: 'หมวดเครื่องยนต์', item: 'ซ่อมท่อไอเสีย', standardHours: 2.5 },
    { id: 'kpi-54', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ซ่อมปั๊มไฮโดรลิคพวงมาลัย', standardHours: 6.75 },
    { id: 'kpi-55', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ซ่อมกระปุกพวงมาลัย', standardHours: 9 },
    { id: 'kpi-56', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอด-ประกอบ เกียร์ (ยกเกียร์ขึ้น-ลง)', standardHours: 5.5 },
    { id: 'kpi-57', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'โอเวอร์ฮอลเกียร์', standardHours: 10 },
    { id: 'kpi-58', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ตรวจเช็คเกียร์', standardHours: 2 },
    { id: 'kpi-59', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ซ่อมชุดฝาเกียร์(ชุดเลือกเกียร์)', standardHours: 4 },
    { id: 'kpi-60', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนซีลหน้าเกียร์', standardHours: 8 },
    { id: 'kpi-61', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนซีลท้ายเกียร์', standardHours: 3.45 },
    { id: 'kpi-62', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ปรับตั้งชุดขาคันเกียร์', standardHours: 0.5 },
    { id: 'kpi-63', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เช็ค,ซ่อมระบบเข้าเกียร์ Lo-Hi', standardHours: 4 },
    { id: 'kpi-64', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เช็ค,ซ่อมระบบเข้าเกียร์Powershift', standardHours: 5 },
    { id: 'kpi-65', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ซ่อม,ติดตั้งชุดฐานเข้าเกียร์', standardHours: 5 },
    { id: 'kpi-66', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนยางครอบคันเข้าเกียร์', standardHours: 1 },
    { id: 'kpi-67', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนบุ๊ชคันเข้าเกียร์ ต่อ 1 จุด', standardHours: 1 },
    { id: 'kpi-68', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนสายเกียร์ ประเก็นคอนโทลเกียร์ บูชหัวคันเกียร์ ต่อ 1', standardHours: 2 },
    { id: 'kpi-69', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ประเก็นคอนโทลเกียร์ ต่อ 1 เส้น', standardHours: 2 },
    { id: 'kpi-70', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'บูชหัวคันเกียร์ ต่อ 1 เส้น', standardHours: 0.5 },
    { id: 'kpi-71', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนลูกหมากคันเกียร์ ต่อ 1 จุด', standardHours: 0.5 },
    { id: 'kpi-72', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอดประกอบซ่อมเกียร์ฝาก', standardHours: 4.5 },
    { id: 'kpi-73', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'โอเวอร์ฮอลเฟืองท้าย 1 ลูก', standardHours: 10 },
    { id: 'kpi-74', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนซีลเดือยหมูเฟืองท้าย', standardHours: 2.85 },
    { id: 'kpi-75', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนแผ่นคลัทช์ ลูกปืนกดคลัทช์ ลูกปืนฟลายวีล', standardHours: 8 },
    { id: 'kpi-76', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'รื้อ-ประกอบเปลี่ยนอะไหล่จานกดคลัทช์', standardHours: 2.5 },
    { id: 'kpi-77', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนท่อยาง,แป๊บน้ำมันคลัทช์ 1 จุด', standardHours: 1.25 },
    { id: 'kpi-78', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนชุดซ่อมปั๊มคลัทช์ บน', standardHours: 2.5 },
    { id: 'kpi-79', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนชุดซ่อมปั๊มคลัทช์ ล่าง', standardHours: 3.5 },
    { id: 'kpi-80', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนน้ำมันคลัทช์,ไล่ลมน้ำมันคลัทช์', standardHours: 1.5 },
    { id: 'kpi-81', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ปรับตั้งคลัทช์', standardHours: 0.3 },
    { id: 'kpi-82', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ซ่อมแขนก้ามปูกดคลัทช์', standardHours: 1 },
    { id: 'kpi-83', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนสปริงขาเหยียบคลัช', standardHours: 0.3 },
    { id: 'kpi-84', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนสายลมปั๊มครัช', standardHours: 1 },
    { id: 'kpi-85', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนกากบาทเพลากลาง ต่อ 1 จุด', standardHours: 2.85 },
    { id: 'kpi-86', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนน้อตเพลากลาง', standardHours: 1 },
    { id: 'kpi-87', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอด-ประกอบกระปุกพวงมาลัย', standardHours: 6 },
    { id: 'kpi-88', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอด-ประกอบท่อน้ำมันเพาเวอร์พวงมาลัย', standardHours: 2.25 },
    { id: 'kpi-89', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอด-ประกอบกากบาทพวงมาลัย', standardHours: 2.25 },
    { id: 'kpi-90', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอดเปลี่ยนท่อน้ำมันไฮดรอลิคพวงมาลัย', standardHours: 1.5 },
    { id: 'kpi-91', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ถอดเปลี่ยนชุดซ่อมปั๊มไฮดรอลิคพวงมาลัย', standardHours: 6 },
    { id: 'kpi-92', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'เปลี่ยนซีลแกนฝาบน พวงมาลัย', standardHours: 4 },
    { id: 'kpi-93', category: 'หมวดการส่งกำลังและระบบบังคับเลี้ยว', item: 'ตั้งศูนย์พวงมาลัย', standardHours: 1 },
    { id: 'kpi-94', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนน้ำมันเบรค, ไล่ลมน้ำมันเบรค', standardHours: 2 },
    { id: 'kpi-95', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนสายลมสปริง', standardHours: 1 },
    { id: 'kpi-96', category: 'หมวดช่วงล่างและเบรก', item: 'ปรับตั้งเบรค ต่อ 1 คัน', standardHours: 4 },
    { id: 'kpi-97', category: 'หมวดช่วงล่างและเบรก', item: 'ปรับตั้งเบรคมือ', standardHours: 1 },
    { id: 'kpi-98', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยน-ซ่อมชุดผ้าเบรคมือ', standardHours: 4 },
    { id: 'kpi-99', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยน-ซ่อมชุดมือดึงเบรคมือ', standardHours: 2.25 },
    { id: 'kpi-100', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยน,ซ่อมแป๊บเบรค ต่อ 1 จุด', standardHours: 1.5 },
    { id: 'kpi-101', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนลูกยางเบรคล้อหลัง ต่อ 1 จุด', standardHours: 2 },
    { id: 'kpi-102', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนผ้าเบรคหน้า ต่อ 1 ข้าง', standardHours: 3 },
    { id: 'kpi-103', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนผ้าเบรคหลัง ต่อ 1 ข้าง', standardHours: 3.5 },
    { id: 'kpi-104', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนชุดซ่อมวาล์วเบรคเท้า ต่อ 1 ลูก', standardHours: 3 },
    { id: 'kpi-105', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนชุดซ่อมปั๊มเบรค บน', standardHours: 2.5 },
    { id: 'kpi-106', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนชุดซ่อมหม้อลมเบรค ต่อ 1 ลูก', standardHours: 4.5 },
    { id: 'kpi-107', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนชุดซ่อมวาล์วเบรคหาง(สมอบก)', standardHours: 2.25 },
    { id: 'kpi-108', category: 'หมวดช่วงล่างและเบรก', item: 'ปรับ เปลี่ยนสาย เบรคมือ', standardHours: 1 },
    { id: 'kpi-109', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนไดอะแฟรมเบรค ต่อ 1 ข้าง', standardHours: 0.5 },
    { id: 'kpi-110', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนชุดซ่อมสลักคอม้า ต่อ 1 ข้าง', standardHours: 5 },
    { id: 'kpi-111', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนบู๊ซและสลักหูแหนบหน้า ต่อ 1 ข้าง', standardHours: 5 },
    { id: 'kpi-112', category: 'หมวดช่วงล่างและเบรก', item: 'บริการแหนบหน้า ต่อ 1 ข้าง', standardHours: 3 },
    { id: 'kpi-113', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนช็อคอัพ', standardHours: 1 },
    { id: 'kpi-114', category: 'หมวดช่วงล่างและเบรก', item: 'บริการแหนบหลัง ต่อ 1 ข้าง', standardHours: 4 },
    { id: 'kpi-115', category: 'หมวดช่วงล่างและเบรก', item: 'บริการเพลาโบกี้ ต่อ 1 ข้าง', standardHours: 3 },
    { id: 'kpi-116', category: 'หมวดช่วงล่างและเบรก', item: 'บริการจารบีลูกปืนล้อ, สตัทล้อ', standardHours: 1.5 },
    { id: 'kpi-117', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนสลับยาง ต่อ 1 เส้น', standardHours: 0.2 },
    { id: 'kpi-118', category: 'หมวดช่วงล่างและเบรก', item: 'ซ่อมปะยาง ต่อ 1 เส้น', standardHours: 0.4 },
    { id: 'kpi-119', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนโช็ค', standardHours: 3 },
    { id: 'kpi-120', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนซีลดุมล้อ ต่อ 1 ล้อ', standardHours: 0.3 },
    { id: 'kpi-121', category: 'หมวดช่วงล่างและเบรก', item: 'ถอด ประกอบล้อ ต่อ 1 ล้อ', standardHours: 1.5 },
    { id: 'kpi-122', category: 'หมวดช่วงล่างและเบรก', item: 'โอริง กระทะล้อ ต่อ 1 ข้าง', standardHours: 0.5 },
    { id: 'kpi-123', category: 'หมวดช่วงล่างและเบรก', item: 'ปะเก็นดุม', standardHours: 0.5 },
    { id: 'kpi-124', category: 'หมวดช่วงล่างและเบรก', item: 'น็อตดุมล้อ ต่อ 1 ข้าง', standardHours: 2 },
    { id: 'kpi-125', category: 'หมวดช่วงล่างและเบรก', item: 'ถอดเปลี่ยนสตัทน้อทล้อ ต่อ 1 ข้าง', standardHours: 3 },
    { id: 'kpi-126', category: 'หมวดช่วงล่างและเบรก', item: 'ตรวจสภาพช่วงล่าง', standardHours: 1.5 },
    { id: 'kpi-127', category: 'หมวดช่วงล่างและเบรก', item: 'เปลี่ยนลูกหมากแขนดึง ต่อ 1 ลูก', standardHours: 0.25 },
    { id: 'kpi-128', category: 'หมวดช่วงล่างและเบรก', item: 'ปรับตั้ง,เปลี่ยนลูกหมากคันชัก คันส่ง', standardHours: 2 },
    { id: 'kpi-129', category: 'หมวดช่วงล่างและเบรก', item: 'ตั้งศูนย์ล้อ', standardHours: 2 },
    { id: 'kpi-130', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'แวคคั่ม และ เติมน้ำยาแอร์', standardHours: 1.6 },
    { id: 'kpi-131', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เติมน้ำยาแอร์', standardHours: 1 },
    { id: 'kpi-132', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ล้างระบบท่อ,แวคคั่ม,เติมน้ำยาแอร์', standardHours: 4 },
    { id: 'kpi-133', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ประกอบ คอมเพรสเซอร์แอร์ฯ และเติมน้ำยาแอร์', standardHours: 4 },
    { id: 'kpi-134', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เปลี่ยนท่อแอร์,เติมน้ำยา', standardHours: 4 },
    { id: 'kpi-135', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนสายพานแอร์ฯ', standardHours: 0.5 },
    { id: 'kpi-136', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ประกอบ ล้างตู้คอล์ยเย็น', standardHours: 4 },
    { id: 'kpi-137', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนพัดลมโบลวเวอร์', standardHours: 2 },
    { id: 'kpi-138', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ประกอบ ล้างแผงคอนเดนเซอร์ แวคคั่ม และ เตินน้ำยาแอร์', standardHours: 4 },
    { id: 'kpi-139', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนพัดลมระบายอากาศแผงคอนเดนเซอร์', standardHours: 1 },
    { id: 'kpi-140', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ขายึดแผงคอนเดนเซอร์', standardHours: 1.75 },
    { id: 'kpi-141', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เปลี่ยนรอก,ลูกปืนรอกแอร์ฯ', standardHours: 0.5 },
    { id: 'kpi-142', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เปลี่ยนโซลินอยด์ 1 จุด', standardHours: 1 },
    { id: 'kpi-143', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เปลี่ยนรีเลย์แอร์ เปลี่ยนเทอร์โมสตาร์ทแอร์', standardHours: 0.8 },
    { id: 'kpi-144', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ระบบไฟควบคุมแอร์ฯ', standardHours: 2.25 },
    { id: 'kpi-145', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เปลี่ยนพัดลมคอล์ยร้อน', standardHours: 1 },
    { id: 'kpi-146', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนรีเลย์ไฟหาง', standardHours: 0.5 },
    { id: 'kpi-147', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนดรายเออร์รีซีฟเวอร์ แวคคั่ม และ เติมน้ำยาแอร์', standardHours: 3 },
    { id: 'kpi-148', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนหลอดไฟหน้า ต่อ 1 จุด', standardHours: 0.2 },
    { id: 'kpi-149', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนโคมไฟหน้า ต่อ 1 จุด', standardHours: 1 },
    { id: 'kpi-150', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนหลอดไฟหรี่,เลี้ยว, เบรก ต่อ 1 จุด', standardHours: 0.1 },
    { id: 'kpi-151', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดไฟหรี่,เลี้ยว,เบรก ต่อ 1 จุด', standardHours: 1 },
    { id: 'kpi-152', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดไฟถอยหลัง ต่อ 1 จุด', standardHours: 0.7 },
    { id: 'kpi-153', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดสัญญานเสียงถอยหลัง ต่อ 1 จุด', standardHours: 0.2 },
    { id: 'kpi-154', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดสวิทช์ถอยหลัง ต่อ 1 จุด', standardHours: 1 },
    { id: 'kpi-155', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดสวิทช์คอพวงมาลัย', standardHours: 3 },
    { id: 'kpi-156', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดสวิทช์เบรค', standardHours: 2 },
    { id: 'kpi-157', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนแฟรชเชอร์ไฟเลี้ยว', standardHours: 0.375 },
    { id: 'kpi-158', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดไฟในเก๋ง,ไฟส่องป้าย', standardHours: 1 },
    { id: 'kpi-159', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เดินสายไฟใหม่ เช็คระบบไฟ', standardHours: 3 },
    { id: 'kpi-160', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เช็คระบบไฟ สภาพทั่วไป', standardHours: 1 },
    { id: 'kpi-161', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เช็คระบบไฟหางเปลี่ยนปลั๊กไฟ', standardHours: 1 },
    { id: 'kpi-162', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เช็คและเปลี่ยนฟิวส์ ต่อ 1 จุด', standardHours: 0.3 },
    { id: 'kpi-163', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ซ่อมโคมไฟ ล้าง ซีล', standardHours: 4 },
    { id: 'kpi-164', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนแตร ต่อ 1 จุด', standardHours: 0.5 },
    { id: 'kpi-165', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนชุดกุญแจสตาร์ท', standardHours: 2.5 },
    { id: 'kpi-166', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ซ่อม ประกอบมอเตอร์สตาร์ท', standardHours: 5.25 },
    { id: 'kpi-167', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ซ่อมไดชาร์จ', standardHours: 5 },
    { id: 'kpi-168', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ซ่อมมอเตอร์สตาร์ท', standardHours: 5 },
    { id: 'kpi-169', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนรีเลย์สตาร์ท', standardHours: 1 },
    { id: 'kpi-170', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอด-ประกอบอัลเตอร์เนเตอร์', standardHours: 3 },
    { id: 'kpi-171', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนแบตเตอรี่(รถเล็ก)', standardHours: 0.25 },
    { id: 'kpi-172', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'ถอดเปลี่ยนแบตเตอรี่(รถใหญ่)', standardHours: 0.5 },
    { id: 'kpi-173', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'เชื่อมเหล็กรัดแบตเตอรี่', standardHours: 0.5 },
    { id: 'kpi-174', category: 'หมวดไฟฟ้าคอนโทรลและระบบปรับอากาศ', item: 'พ่วงแบตฯ', standardHours: 0.3 },
];

// ==================== NEW MODULE DEFAULT DATA ====================

export const getDefaultBudgets = (): MaintenanceBudget[] => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return [
        {
            id: 'BDG-001',
            year: currentYear,
            month: currentMonth,
            department: 'ฝ่ายซ่อมบำรุง',
            category: 'ซ่อมบำรุงรถ',
            allocatedAmount: 500000,
            spentAmount: 325000,
            committedAmount: 75000,
            availableAmount: 100000,
            status: 'ใกล้เกิน',
            notes: 'งบประมาณประจำเดือน',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'BDG-002',
            year: currentYear,
            month: currentMonth,
            department: 'ฝ่ายจัดซื้อ',
            category: 'อะไหล่',
            allocatedAmount: 800000,
            spentAmount: 450000,
            committedAmount: 150000,
            availableAmount: 200000,
            status: 'ปกติ',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'BDG-003',
            year: currentYear,
            month: currentMonth,
            department: 'ฝ่ายปฏิบัติการ',
            category: 'น้ำมันเชื้อเฟลิง',
            allocatedAmount: 1200000,
            spentAmount: 950000,
            committedAmount: 200000,
            availableAmount: 50000,
            status: 'ใกล้เกิน',
            notes: 'ราคาน้ำมันปรับขึ้น',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
};

export const getDefaultFuelRecords = (): FuelRecord[] => {
    const now = new Date();
    const records: FuelRecord[] = [];

    for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 3);

        records.push({
            id: `FUEL-${String(i + 1).padStart(4, '0')}`,
            vehicleId: i < 3 ? 'VEH-init-0' : i < 6 ? 'VEH-init-1' : 'VEH-init-2',
            licensePlate: i < 3 ? '70-6937' : i < 6 ? '71-0141' : '70-9500',
            driverName: i % 3 === 0 ? 'นายสมชาย ใจดี' : i % 3 === 1 ? 'นายประเสริฐ วิ่งไว' : 'นายวิชัย ขับเก่ง',
            date: date.toISOString().split('T')[0],
            station: i % 2 === 0 ? 'PTT' : 'Shell',
            stationLocation: 'กม.' + (100 + i * 10) + ' ทางหลวง 1',
            fuelType: 'ดีเซล',
            liters: 200 + i * 10,
            pricePerLiter: 33.50 + (i * 0.1),
            totalCost: (200 + i * 10) * (33.50 + (i * 0.1)),
            odometerBefore: 150000 + (i * 500),
            odometerAfter: 150400 + (i * 500),
            distanceTraveled: 400,
            fuelEfficiency: 400 / (200 + i * 10),
            paymentMethod: i % 2 === 0 ? 'บัตรน้ำมัน' : 'เงินสด',
            notes: '',
            createdAt: date.toISOString(),
            createdBy: 'System'
        });
    }

    return records;
};

export const getDefaultDrivers = (): Driver[] => {
    return [
        {
            id: 'DRV-001',
            employeeId: 'EMP-D001',
            name: 'นายสมชาย ใจดี',
            nickname: 'ชาย',
            phone: '08-1234-5678',
            email: 'somchai@example.com',
            address: '123 ถ.พหลโยธิน กรุงเทพฯ 10400',
            emergencyContact: {
                name: 'นางสาวสมหญิง ใจดี',
                phone: '08-9876-5432',
                relationship: 'ภรรยา'
            },
            licenseNumber: 'DL-12345678',
            licenseClass: 'ใบขับขี่บรรทุก',
            licenseIssueDate: '2020-01-15',
            licenseExpiry: '2027-01-14',
            hireDate: '2020-03-01',
            experience: 15,
            previousEmployer: 'บริษัท ขนส่งภูมิภาค จำกัด',
            assignedVehicles: ['VEH-init-0'],
            primaryVehicle: 'VEH-init-0',
            totalDistanceDriven: 450000,
            totalTrips: 1250,
            accidentCount: 1,
            violationCount: 2,
            onTimeDeliveryRate: 98,
            lastSafetyTraining: '2024-06-15',
            certifications: ['อบรมการขับขี่ปลอดภัย', 'ใบรับรองการขนส่งสินค้าอันตราย'],
            safetyScore: 95,
            monthlySalary: 25000,
            leaveQuota: { sick: 30, personal: 6, vacation: 6 },
            usedLeave: { sick: 2, personal: 1, vacation: 0 },
            leaves: [
                {
                    id: 'L-001',
                    driverId: 'DRV-001',
                    type: 'sick',
                    startDate: '2024-01-10',
                    endDate: '2024-01-11',
                    totalDays: 2,
                    reason: 'ไข้หวัดใหญ่',
                    status: 'approved'
                }
            ],
            status: 'active',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'DRV-002',
            employeeId: 'EMP-D002',
            name: 'นายประเสริฐ วิ่งไว',
            nickname: 'เสริฐ',
            phone: '09-2345-6789',
            email: '',
            address: '456 ถ.วิภาวดี กรุงเทพฯ 10900',
            licenseNumber: 'DL-23456789',
            licenseClass: 'ใบขับขี่บรรทุก',
            licenseIssueDate: '2018-05-20',
            licenseExpiry: '2026-05-19',
            hireDate: '2019-07-01',
            experience: 12,
            assignedVehicles: ['VEH-init-1'],
            primaryVehicle: 'VEH-init-1',
            totalDistanceDriven: 380000,
            totalTrips: 980,
            accidentCount: 0,
            violationCount: 1,
            onTimeDeliveryRate: 99,
            lastSafetyTraining: '2024-06-15',
            certifications: ['อบรมการขับขี่ปลอดภัย'],
            safetyScore: 98,
            monthlySalary: 24000,
            leaveQuota: { sick: 30, personal: 6, vacation: 6 },
            usedLeave: { sick: 0, personal: 0, vacation: 0 },
            leaves: [],
            status: 'active',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'DRV-003',
            employeeId: 'EMP-D003',
            name: 'นายวิชัย ขับเก่ง',
            nickname: 'วิชัย',
            phone: '08-3456-7890',
            email: 'wichai@example.com',
            address: '789 ถ.รามอินทรา กรุงเทพฯ 10230',
            emergencyContact: {
                name: 'นายสมศักดิ์ ขับเก่ง',
                phone: '08-7654-3210',
                relationship: 'บิดา'
            },
            licenseNumber: 'DL-34567890',
            licenseClass: 'ใบขับขี่บรรทุก',
            licenseIssueDate: '2022-03-10',
            licenseExpiry: '2029-03-09',
            hireDate: '2022-04-15',
            experience: 8,
            assignedVehicles: ['VEH-init-2'],
            primaryVehicle: 'VEH-init-2',
            totalDistanceDriven: 180000,
            totalTrips: 520,
            accidentCount: 0,
            violationCount: 0,
            onTimeDeliveryRate: 97,
            lastSafetyTraining: '2024-06-15',
            certifications: ['อบรมการขับขี่ปลอดภัย', 'การปฐมพยาบาลเบื้องต้น'],
            safetyScore: 100,
            monthlySalary: 23000,
            leaveQuota: { sick: 30, personal: 6, vacation: 6 },
            usedLeave: { sick: 0, personal: 0, vacation: 0 },
            leaves: [],
            status: 'active',
            notes: 'พนักงานดีเด่นประจำเดือน',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
};

