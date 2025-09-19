export type Tab =
  | 'dashboard'
  | 'form'
  | 'list'
  | 'history'
  | 'stock'
  | 'stock-history'
  | 'requisitions'
  | 'suppliers'
  | 'reports'
  | 'technicians'
  | 'technicianPerformance'
  | 'technicianWorkLog'
  | 'estimation'
  | 'maintenance'
  | 'preventive-maintenance' // New Tab for PM
  | 'vehicles'
  | 'used-part-buyers'
  | 'used-part-report'
  | 'technician-view' // New Tab for technicians
  | 'kpi-dashboard' // New Tab for KPIs
  | 'vehicle-repair-history' // New Tab for vehicle-specific repair history
  | 'tire-check'; // New Tab for Tire Inspection

export type RepairStatus = 'รอซ่อม' | 'กำลังซ่อม' | 'รออะไหล่' | 'ซ่อมเสร็จ' | 'ยกเลิก';
export type Priority = 'ปกติ' | 'ด่วน' | 'ด่วนที่สุด';
export type DispatchType = 'ภายใน' | 'ภายนอก';

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
    source: 'สต็อกอู่' | 'ร้านค้า';
    supplierName?: string;
    purchaseDate?: string;
}

export type EstimationStatus = 'Active' | 'Completed' | 'Failed';

export interface EstimationAttempt {
    sequence: number;
    createdAt: string;
    estimatedStartDate: string;
    estimatedEndDate: string;
    estimatedLaborHours: number;
    status: EstimationStatus;
    failureReason: string | null;
    aiReasoning: string | null;
}

export interface ChecklistItem {
    text: string;
    checked: boolean;
}

export interface RepairChecklists {
    preRepair: ChecklistItem[];
    postRepair: ChecklistItem[];
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
    priority: Priority;
    problemDescription: string;
    assignedTechnicians: string[];
    externalTechnicianName?: string;
    notes: string;
    dispatchType: DispatchType;
    repairLocation: string;
    coordinator: string;
    returnDate: string;
    repairResult: string;
    repairCost: number;
    partsVat: number;
    parts: PartRequisitionItem[];
    attachments: FileAttachment[];
    estimations: EstimationAttempt[]; 
    checklists: RepairChecklists; // New field for checklists
    createdAt: string;
    updatedAt: string;
    status: RepairStatus;
    approvalDate: string | null;
    repairStartDate: string | null;
    repairEndDate: string | null;
    requisitionNumber: string;
    invoiceNumber: string;
}

export type TechnicianStatus = 'ว่าง' | 'ไม่ว่าง' | 'ลา';

export interface Technician {
    id: string;
    name: string;
    skills: string[];
    experience: number;
    status: TechnicianStatus;
    rating: number;
    completedJobs: number;
    currentJobs: number;
}

export type StockStatus = 'ปกติ' | 'สต๊อกต่ำ' | 'หมดสต็อก' | 'สต๊อกเกิน';

export interface StockItem {
    id: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    quantityReserved: number;
    unit: string;
    minStock: number;
    maxStock: number | null;
    price: number;
    sellingPrice: number | null;
    storageLocation: string;
    supplier: string;
    status: StockStatus;
}

export type StockTransactionType = 'รับเข้า' | 'เบิกใช้' | 'คืนร้านค้า' | 'ปรับสต็อก' | 'จอง' | 'ยกเลิกจอง';

export interface StockTransaction {
    id: string;
    stockItemId: string;
    stockItemName: string;
    type: StockTransactionType;
    quantity: number;
    transactionDate: string;
    actor: string;
    notes?: string;
    relatedRepairOrder?: string;
    documentNumber?: string;
    pricePerUnit?: number;
}

export interface MaintenancePlan {
    id: string;
    vehicleLicensePlate: string;
    planName: string;
    lastServiceDate: string;
    frequencyValue: number;
    frequencyUnit: 'days' | 'weeks' | 'months';
    lastServiceMileage: number;
    mileageFrequency: number;
}

export type UsedPartCondition = 'ดีมาก' | 'ดี' | 'พอใช้' | 'ต้องซ่อม' | 'ชำรุด';
export type UsedPartDispositionType = 'ขาย' | 'ทิ้ง' | 'เก็บไว้ใช้ต่อ' | 'นำไปใช้แล้ว';

export interface UsedPartDisposition {
    id: string;
    quantity: number;
    dispositionType: UsedPartDispositionType;
    condition: UsedPartCondition;
    date: string;
    soldTo?: string | null;
    salePricePerUnit?: number | null;
    storageLocation?: string | null; // New field for reusable parts
    notes?: string;
}

export type UsedPartBatchStatus = 'รอจัดการ' | 'จัดการบางส่วน' | 'จัดการครบแล้ว';

export interface UsedPart {
    id: string;
    originalPartId: string;
    name: string;
    fromRepairId: string;
    fromRepairOrderNo: string;
    fromLicensePlate: string;
    dateRemoved: string;
    initialQuantity: number;
    unit: string;
    status: UsedPartBatchStatus;
    dispositions: UsedPartDisposition[];
    notes: string;
}


export interface Notification {
    id: string;
    createdAt: string;
    isRead: boolean;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    linkTo?: Tab;
    relatedId: string;
}

export type PurchaseRequisitionStatus = 'ฉบับร่าง' | 'รออนุมัติ' | 'อนุมัติแล้ว' | 'รอสินค้า' | 'รับของแล้ว' | 'ยกเลิก';
export type PurchaseRequestType = 'Product' | 'Service' | 'Equipment' | 'Asset' | 'Others';
export type PurchaseBudgetType = 'Have Budget' | 'No Budget';


export interface PurchaseRequisitionItem {
    stockId: string; 
    stockCode: string; 
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    deliveryOrServiceDate: string;
}

export interface PurchaseRequisition {
    id: string;
    prNumber: string;
    createdAt: string;
    updatedAt: string;
    requesterName: string;
    department: string;
    dateNeeded: string;
    supplier: string;
    status: PurchaseRequisitionStatus;
    items: PurchaseRequisitionItem[];
    vatAmount?: number;
    totalAmount: number;
    notes?: string;
    approverName?: string;
    approvalDate: string | null;
    requestType: PurchaseRequestType;
    otherRequestTypeDetail?: string;
    budgetStatus: PurchaseBudgetType;
}

export interface Report {
    id: string;
    title: string;
    data: any;
    createdAt: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  make: string;
  model: string;
  registrationDate: string | null;
  insuranceCompany: string | null;
  insuranceExpiryDate: string | null;
  insuranceType: string | null;
  actCompany: string | null;
  actExpiryDate: string | null;
  cargoInsuranceCompany: string | null;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  services: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  otherContacts: string | null;
}

export interface UsedPartBuyer {
  id: string;
  code: string;
  name: string;
  products: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  otherContacts: string | null;
}

// --- Tire Inspection Types ---
export type TireType = 'เรเดียล' | 'ไบแอส' | 'อื่นๆ';
export type TireAction = 'ปกติ' | 'ถอด' | 'สลับยาง' | 'เปลี่ยน';
export type VehicleLayout = 
    'รถพ่วง 22 ล้อ' | 
    'รถ 12 ล้อ' | 
    'รถ 10 ล้อ' | 
    'รถ 6 ล้อ' | 
    'รถกระบะ 4 ล้อ' |
    'หาง 3 เพลา' |
    'หาง 2 เพลา' |
    'หางแม่ลูก 3 เพลา' |
    'หางแม่ลูก 2 เพลา';

export interface TireData {
    positionId: string; // e.g., 'F-L', 'RR1-I' (Rear Right 1 Inner)
    isFilled: boolean;
    treadDepth: number | null;
    productionDate: string; // "ww/yy" format
    serialNumber: string;
    tireType: TireType;
    psi: number | null;
    action: TireAction;
    notes: string;
    changeDate: string;
    brand: string;
    model: string;
}

export interface TireInspection {
    id: string;
    licensePlate: string;
    trailerLicensePlate?: string;
    vehicleLayout: VehicleLayout;
    inspectionDate: string; // ISO string
    inspectorName: string;
    tires: Record<string, TireData>;
}