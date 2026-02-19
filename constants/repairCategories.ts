import type { RepairCategoryMaster } from '../types';

export const DEFAULT_REPAIR_CATEGORIES: RepairCategoryMaster[] = [
    {
        id: 'CAT-ENG', code: 'ENG', nameTh: 'เครื่องยนต์', nameEn: 'Engine', icon: '🔧', isActive: true, sortOrder: 1,
        subCategories: [
            { id: 'ENG-OIL', code: 'ENG-OIL', nameTh: 'เปลี่ยนน้ำมันเครื่อง', nameEn: 'Oil Change', parentCode: 'ENG', suggestedParts: ['น้ำมันเครื่อง', 'ไส้กรองน้ำมัน'], isActive: true },
            { id: 'ENG-BLT', code: 'ENG-BLT', nameTh: 'สายพาน', nameEn: 'Belt', parentCode: 'ENG', suggestedParts: ['สายพานราวลิ้น', 'สายพานไดชาร์จ'], isActive: true },
            { id: 'ENG-FLT', code: 'ENG-FLT', nameTh: 'ไส้กรอง', nameEn: 'Filter', parentCode: 'ENG', suggestedParts: ['ไส้กรองอากาศ', 'ไส้กรองน้ำมันเชื้อเพลิง'], isActive: true },
            { id: 'ENG-TBO', code: 'ENG-TBO', nameTh: 'เทอร์โบ', nameEn: 'Turbo', parentCode: 'ENG', suggestedParts: ['เทอร์โบชาร์จเจอร์'], isActive: true },
            { id: 'ENG-GEN', code: 'ENG-GEN', nameTh: 'ซ่อมเครื่องยนต์ทั่วไป', nameEn: 'General Engine', parentCode: 'ENG', isActive: true },
        ]
    },
    {
        id: 'CAT-TRA', code: 'TRA', nameTh: 'ระบบส่งกำลัง', nameEn: 'Transmission', icon: '⚙️', isActive: true, sortOrder: 2,
        subCategories: [
            { id: 'TRA-GBX', code: 'TRA-GBX', nameTh: 'ซ่อมเกียร์', nameEn: 'Gearbox', parentCode: 'TRA', suggestedParts: ['น้ำมันเกียร์', 'ซิงโครไนเซอร์'], isActive: true },
            { id: 'TRA-CLT', code: 'TRA-CLT', nameTh: 'เปลี่ยนคลัตช์', nameEn: 'Clutch', parentCode: 'TRA', suggestedParts: ['ชุดคลัตช์', 'ลูกปืนคลัตช์'], isActive: true },
            { id: 'TRA-AXL', code: 'TRA-AXL', nameTh: 'เพลา/เฟืองท้าย', nameEn: 'Axle/Differential', parentCode: 'TRA', suggestedParts: ['น้ำมันเฟืองท้าย', 'ซีลเพลา'], isActive: true },
            { id: 'TRA-PTO', code: 'TRA-PTO', nameTh: 'PTO/เพาเวอร์เทคออฟ', nameEn: 'PTO', parentCode: 'TRA', isActive: true },
        ]
    },
    {
        id: 'CAT-SUS', code: 'SUS', nameTh: 'ช่วงล่าง', nameEn: 'Suspension', icon: '🔩', isActive: true, sortOrder: 3,
        subCategories: [
            { id: 'SUS-SHK', code: 'SUS-SHK', nameTh: 'เปลี่ยนโช้คอัพ', nameEn: 'Shock Absorber', parentCode: 'SUS', suggestedParts: ['โช้คอัพ'], isActive: true },
            { id: 'SUS-BJT', code: 'SUS-BJT', nameTh: 'ลูกหมาก', nameEn: 'Ball Joint', parentCode: 'SUS', suggestedParts: ['ลูกหมากปีกนก', 'ลูกหมากคันชัก'], isActive: true },
            { id: 'SUS-SPR', code: 'SUS-SPR', nameTh: 'แหนบ/สปริง', nameEn: 'Leaf Spring', parentCode: 'SUS', suggestedParts: ['แหนบ', 'ยูโบลท์'], isActive: true },
            { id: 'SUS-BSH', code: 'SUS-BSH', nameTh: 'บุชยาง', nameEn: 'Bushing', parentCode: 'SUS', suggestedParts: ['บุชยางแหนบ', 'บุชยางเหล็กกันโคลง'], isActive: true },
        ]
    },
    {
        id: 'CAT-BRK', code: 'BRK', nameTh: 'ระบบเบรก', nameEn: 'Braking', icon: '🛑', isActive: true, sortOrder: 4,
        subCategories: [
            { id: 'BRK-PAD', code: 'BRK-PAD', nameTh: 'เปลี่ยนผ้าเบรก', nameEn: 'Brake Pad', parentCode: 'BRK', suggestedParts: ['ผ้าเบรก'], isActive: true },
            { id: 'BRK-DSC', code: 'BRK-DSC', nameTh: 'เจียรจานเบรก', nameEn: 'Brake Disc', parentCode: 'BRK', suggestedParts: ['จานเบรก'], isActive: true },
            { id: 'BRK-AIR', code: 'BRK-AIR', nameTh: 'ระบบเบรกลม', nameEn: 'Air Brake', parentCode: 'BRK', suggestedParts: ['วาล์วเบรก', 'ถังลม'], isActive: true },
            { id: 'BRK-CYL', code: 'BRK-CYL', nameTh: 'ลูกสูบเบรก', nameEn: 'Brake Cylinder', parentCode: 'BRK', suggestedParts: ['ลูกสูบเบรก', 'ชุดซ่อมลูกสูบ'], isActive: true },
        ]
    },
    {
        id: 'CAT-ELE', code: 'ELE', nameTh: 'ระบบไฟฟ้า', nameEn: 'Electrical', icon: '⚡', isActive: true, sortOrder: 5,
        subCategories: [
            { id: 'ELE-ALT', code: 'ELE-ALT', nameTh: 'ไดชาร์จ', nameEn: 'Alternator', parentCode: 'ELE', suggestedParts: ['ไดชาร์จ'], isActive: true },
            { id: 'ELE-BAT', code: 'ELE-BAT', nameTh: 'แบตเตอรี่', nameEn: 'Battery', parentCode: 'ELE', suggestedParts: ['แบตเตอรี่'], isActive: true },
            { id: 'ELE-LGT', code: 'ELE-LGT', nameTh: 'ไฟส่องสว่าง', nameEn: 'Lighting', parentCode: 'ELE', suggestedParts: ['หลอดไฟหน้า', 'หลอดไฟท้าย'], isActive: true },
            { id: 'ELE-STR', code: 'ELE-STR', nameTh: 'ไดสตาร์ท', nameEn: 'Starter', parentCode: 'ELE', suggestedParts: ['ไดสตาร์ท'], isActive: true },
            { id: 'ELE-WIR', code: 'ELE-WIR', nameTh: 'สายไฟ/ระบบไฟ', nameEn: 'Wiring', parentCode: 'ELE', isActive: true },
        ]
    },
    {
        id: 'CAT-AC', code: 'AC', nameTh: 'ระบบปรับอากาศ', nameEn: 'Air Conditioning', icon: '❄️', isActive: true, sortOrder: 6,
        subCategories: [
            { id: 'AC-REF', code: 'AC-REF', nameTh: 'เติมน้ำยาแอร์', nameEn: 'Refrigerant', parentCode: 'AC', suggestedParts: ['น้ำยาแอร์ R134a'], isActive: true },
            { id: 'AC-CMP', code: 'AC-CMP', nameTh: 'ซ่อมคอมเพรสเซอร์', nameEn: 'Compressor', parentCode: 'AC', suggestedParts: ['คอมเพรสเซอร์แอร์'], isActive: true },
            { id: 'AC-CON', code: 'AC-CON', nameTh: 'คอนเดนเซอร์/แผงร้อน', nameEn: 'Condenser', parentCode: 'AC', suggestedParts: ['คอนเดนเซอร์'], isActive: true },
            { id: 'AC-EVP', code: 'AC-EVP', nameTh: 'ตู้แอร์/แผงเย็น', nameEn: 'Evaporator', parentCode: 'AC', suggestedParts: ['ตู้แอร์'], isActive: true },
        ]
    },
    {
        id: 'CAT-TIR', code: 'TIR', nameTh: 'ยางและล้อ', nameEn: 'Tires & Wheels', icon: '🛞', isActive: true, sortOrder: 7,
        subCategories: [
            { id: 'TIR-REP', code: 'TIR-REP', nameTh: 'เปลี่ยนยาง', nameEn: 'Tire Replacement', parentCode: 'TIR', suggestedParts: ['ยางรถบรรทุก'], isActive: true },
            { id: 'TIR-ALN', code: 'TIR-ALN', nameTh: 'ตั้งศูนย์ล้อ', nameEn: 'Wheel Alignment', parentCode: 'TIR', isActive: true },
            { id: 'TIR-BAL', code: 'TIR-BAL', nameTh: 'ถ่วงล้อ', nameEn: 'Wheel Balancing', parentCode: 'TIR', suggestedParts: ['ตะกั่วถ่วงล้อ'], isActive: true },
            { id: 'TIR-RET', code: 'TIR-RET', nameTh: 'หล่อดอกยาง', nameEn: 'Retread', parentCode: 'TIR', isActive: true },
        ]
    },
    {
        id: 'CAT-BOD', code: 'BOD', nameTh: 'ตัวถังและสี', nameEn: 'Body & Paint', icon: '🎨', isActive: true, sortOrder: 8,
        subCategories: [
            { id: 'BOD-PNT', code: 'BOD-PNT', nameTh: 'พ่นสี', nameEn: 'Paint', parentCode: 'BOD', isActive: true },
            { id: 'BOD-DEN', code: 'BOD-DEN', nameTh: 'ซ่อมตัวถัง/เคาะ', nameEn: 'Dent Repair', parentCode: 'BOD', isActive: true },
            { id: 'BOD-GLS', code: 'BOD-GLS', nameTh: 'กระจก', nameEn: 'Glass', parentCode: 'BOD', suggestedParts: ['กระจกหน้า', 'กระจกข้าง'], isActive: true },
            { id: 'BOD-MIR', code: 'BOD-MIR', nameTh: 'กระจกมองข้าง', nameEn: 'Mirror', parentCode: 'BOD', suggestedParts: ['กระจกมองข้าง'], isActive: true },
        ]
    },
    {
        id: 'CAT-HYD', code: 'HYD', nameTh: 'ระบบไฮดรอลิก', nameEn: 'Hydraulic', icon: '💧', isActive: true, sortOrder: 9,
        subCategories: [
            { id: 'HYD-PMP', code: 'HYD-PMP', nameTh: 'ปั๊มไฮดรอลิก', nameEn: 'Hydraulic Pump', parentCode: 'HYD', suggestedParts: ['ปั๊มไฮดรอลิก'], isActive: true },
            { id: 'HYD-HSE', code: 'HYD-HSE', nameTh: 'สายไฮดรอลิก', nameEn: 'Hydraulic Hose', parentCode: 'HYD', suggestedParts: ['สายไฮดรอลิก'], isActive: true },
            { id: 'HYD-CYL', code: 'HYD-CYL', nameTh: 'กระบอกสูบไฮดรอลิก', nameEn: 'Hydraulic Cylinder', parentCode: 'HYD', suggestedParts: ['กระบอกสูบ', 'ซีลไฮดรอลิก'], isActive: true },
        ]
    },
    {
        id: 'CAT-COO', code: 'COO', nameTh: 'ระบบหล่อเย็น', nameEn: 'Cooling', icon: '🌡️', isActive: true, sortOrder: 10,
        subCategories: [
            { id: 'COO-RAD', code: 'COO-RAD', nameTh: 'หม้อน้ำ', nameEn: 'Radiator', parentCode: 'COO', suggestedParts: ['หม้อน้ำ', 'น้ำยาหล่อเย็น'], isActive: true },
            { id: 'COO-THR', code: 'COO-THR', nameTh: 'เทอร์โมสตัท', nameEn: 'Thermostat', parentCode: 'COO', suggestedParts: ['เทอร์โมสตัท'], isActive: true },
            { id: 'COO-FAN', code: 'COO-FAN', nameTh: 'พัดลมหม้อน้ำ', nameEn: 'Cooling Fan', parentCode: 'COO', suggestedParts: ['พัดลม', 'คลัตช์พัดลม'], isActive: true },
            { id: 'COO-WPM', code: 'COO-WPM', nameTh: 'ปั๊มน้ำ', nameEn: 'Water Pump', parentCode: 'COO', suggestedParts: ['ปั๊มน้ำ'], isActive: true },
        ]
    },
    {
        id: 'CAT-FUE', code: 'FUE', nameTh: 'ระบบเชื้อเพลิง', nameEn: 'Fuel System', icon: '⛽', isActive: true, sortOrder: 11,
        subCategories: [
            { id: 'FUE-PMP', code: 'FUE-PMP', nameTh: 'ปั๊มน้ำมันเชื้อเพลิง', nameEn: 'Fuel Pump', parentCode: 'FUE', suggestedParts: ['ปั๊มน้ำมัน'], isActive: true },
            { id: 'FUE-INJ', code: 'FUE-INJ', nameTh: 'หัวฉีด', nameEn: 'Injector', parentCode: 'FUE', suggestedParts: ['หัวฉีด'], isActive: true },
            { id: 'FUE-FLT', code: 'FUE-FLT', nameTh: 'กรองเชื้อเพลิง', nameEn: 'Fuel Filter', parentCode: 'FUE', suggestedParts: ['ไส้กรองเชื้อเพลิง'], isActive: true },
            { id: 'FUE-TNK', code: 'FUE-TNK', nameTh: 'ถังน้ำมัน', nameEn: 'Fuel Tank', parentCode: 'FUE', suggestedParts: ['ถังน้ำมัน'], isActive: true },
        ]
    },
    {
        id: 'CAT-PM', code: 'PM', nameTh: 'ซ่อมบำรุงตามระยะ', nameEn: 'Preventive Maintenance', icon: '📋', isActive: true, sortOrder: 12,
        subCategories: [
            { id: 'PM-SVC', code: 'PM-SVC', nameTh: 'เช็กระยะ', nameEn: 'Service Interval', parentCode: 'PM', isActive: true },
            { id: 'PM-GRO', code: 'PM-GRO', nameTh: 'อัดจาระบี', nameEn: 'Greasing', parentCode: 'PM', suggestedParts: ['จาระบี'], isActive: true },
            { id: 'PM-INS', code: 'PM-INS', nameTh: 'ตรวจสภาพทั่วไป', nameEn: 'General Inspection', parentCode: 'PM', isActive: true },
        ]
    },
    {
        id: 'CAT-OTH', code: 'OTH', nameTh: 'อื่นๆ', nameEn: 'Others', icon: '📦', isActive: true, sortOrder: 13,
        subCategories: [
            { id: 'OTH-ACC', code: 'OTH-ACC', nameTh: 'ติดตั้งอุปกรณ์เสริม', nameEn: 'Accessories', parentCode: 'OTH', isActive: true },
            { id: 'OTH-GEN', code: 'OTH-GEN', nameTh: 'งานทั่วไป', nameEn: 'General', parentCode: 'OTH', isActive: true },
        ]
    },
];
