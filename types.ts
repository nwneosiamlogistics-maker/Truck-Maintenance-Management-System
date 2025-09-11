export type Tab = 'dashboard' | 'form' | 'list' | 'history' | 'stock' | 'reports' | 'technicians' | 'estimation' | 'maintenance';

export type RepairStatus = 'รอซ่อม' | 'กำลังซ่อม' | 'รออะไหล่' | 'ซ่อมเสร็จ' | 'ยกเลิก';
export type StockStatus = 'ปกติ' | 'สต๊อกต่ำ' | 'หมดสต๊อก' | 'สต๊อกเกิน';
export type UsedPartCondition = 'ดี' | 'พอใช้' | 'ชำรุด';
export type UsedPartStatus = 'รอจำหน่าย' | 'รอทำลาย' | 'เก็บไว้ใช้ต่อ' | 'จำหน่ายแล้ว' | 'ทำลายแล้ว';

export interface FileAttachment {
    name: string;
    size: number;
}

export interface PartRequisitionItem {
    partId: string;
    name: string;
    code: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    source: 'สต๊อกอู่' | 'ร้านค้า';
    supplierName?: string;
    purchaseDate?: string;
}

export interface Repair {
    id: string;
    repairOrderNo: string;
    licensePlate: string;
    vehicleType: string;
    vehicleMake: string;
    vehicleModel: string;
    currentMileage: string;
    reportedBy: string;
    repairCategory: string;
    problemDescription: string;
    priority: 'ปกติ' | 'เร่งด่วน' | 'ฉุกเฉิน';
    status: RepairStatus;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    approvalDate?: string;
    assignedTechnician: string;
    repairStartDate?: string;
    repairEndDate?: string;
    dispatchType: 'ภายใน' | 'ภายนอก';
    repairLocation?: string;
    repairCost?: number;
    partsVat?: number;
    parts: PartRequisitionItem[];
    attachments: FileAttachment[];
    notes?: string;
    coordinator?: string;
    returnDate?: string;
    repairResult?: string;
    requisitionNumber?: string;
    invoiceNumber?: string;
}

export interface Technician {
    id: string;
    name: string;
    skills: string[];
    experience: number;
    status: 'ว่าง' | 'ไม่ว่าง' | 'ลา';
    rating: number;
    completedJobs: number;
    currentJobs: number;
}

export interface StockItem {
    id: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock?: number;
    price: number;
    sellingPrice?: number;
    storageLocation: string;
    supplier: string;
    status: StockStatus;
    notes?: string;
}

export interface StockTransaction {
    id: string;
    stockItemId: string;
    stockItemName: string;
    type: 'รับเข้า' | 'เบิกใช้' | 'คืนร้านค้า';
    quantity: number; // positive for additions, negative for subtractions
    transactionDate: string; // ISO string
    actor: string;
    notes?: string;
    relatedRepairOrder?: string;
    pricePerUnit?: number;
}

export interface Report {
    id: string;
    name: string;
    type: 'PDF' | 'Excel' | 'CSV';
    filename: string;
    createdAt: string; // ISO string
    status: 'พร้อมใช้' | 'กำลังสร้าง';
    size: string;
}

export interface MaintenancePlan {
    id: string;
    vehicleLicensePlate: string;
    planName: string;
    lastServiceDate: string; // YYYY-MM-DD
    frequencyValue: number;
    frequencyUnit: 'days' | 'weeks' | 'months';
    lastServiceMileage: number;
    mileageFrequency: number;
}

export interface UsedPart {
    id: string;
    originalPartId: string;
    name: string;
    fromRepairId: string;
    fromRepairOrderNo: string;
    fromLicensePlate: string;
    dateRemoved: string; // ISO String
    condition: UsedPartCondition;
    status: UsedPartStatus;
    notes?: string;
}
