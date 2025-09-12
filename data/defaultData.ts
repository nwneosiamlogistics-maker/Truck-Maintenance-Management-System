import type { Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, PurchaseRequisition, Vehicle } from '../types';

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

const thaiMonthMap: { [key: string]: number } = {
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
    'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
};

const parseThaiShortDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '-') return null;
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
71-1637	หางตู้ คอนเทนเนอร์ 40 ฟุต 12 ล้อ	-	-	-	-	-	-	เออร์โก	31 ธ.ค. 25	-
71-3667	หัวลาก 10 ล้อ	HINO	-	-	BKI	28 ก.พ. 26	ป.1	BKI	31 ธ.ค. 25	CHUBB
71-9429	หางเปลือย 12 ล้อ	-	-	-	-	-	-	BKI	31 ธ.ค. 25	-`;

const parseVehicles = (): Vehicle[] => {
    const lines = rawVehicleData.split('\n').slice(1).filter(line => line.trim() !== '');
    return lines.map((line, index) => {
        const cols = line.split('\t');
        const vehicle: Vehicle = {
            id: `VEH-${Date.now()}-${index}`,
            licensePlate: cols[0]?.trim() || '',
            vehicleType: cols[1]?.trim() === '-' ? '' : cols[1]?.trim() || '',
            make: cols[2]?.trim() === '-' ? '' : cols[2]?.trim() || '',
            model: cols[3]?.trim() === '-' ? '' : cols[3]?.trim() || '',
            registrationDate: parseRegistrationDate(cols[4]?.trim()),
            insuranceCompany: cols[5]?.trim() === '-' ? null : cols[5]?.trim() || null,
            insuranceExpiryDate: parseThaiShortDate(cols[6]?.trim()),
            insuranceType: cols[7]?.trim() === '-' ? null : cols[7]?.trim() || null,
            actCompany: cols[8]?.trim() === '-' ? null : cols[8]?.trim() || null,
            actExpiryDate: parseThaiShortDate(cols[9]?.trim()),
            cargoInsuranceCompany: cols[10]?.trim() === '-' ? null : cols[10]?.trim() || null,
        };
        return vehicle;
    });
}

export const getDefaultVehicles = (): Vehicle[] => parseVehicles();
