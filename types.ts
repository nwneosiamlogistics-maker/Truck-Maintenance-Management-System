
// FIX: Removed self-referencing import of 'Tab' which caused a declaration conflict.
export type Tab =
  | 'dashboard'
  | 'form'
  | 'list'
  | 'history'
  | 'stock'
  | 'stock-history'
  | 'requisitions'
  | 'reports'
  | 'technicians'
  | 'technicianPerformance'
  | 'estimation'
  | 'maintenance'
  | 'vehicles';

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
    estimations: EstimationAttempt[]; // Replaced single estimation fields
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

export type StockStatus = 'ปกติ' | 'สต๊อกต่ำ' | 'หมดสต๊อก' | 'สต๊อกเกิน';

export interface StockItem {
    id: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minStock: number;
    maxStock: number | null;
    price: number;
    sellingPrice: number | null;
    storageLocation: string;
    supplier: string;
    status: StockStatus;
}

export type StockTransactionType = 'รับเข้า' | 'เบิกใช้' | 'คืนร้านค้า';

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

export type UsedPartCondition = 'ดี' | 'พอใช้' | 'ชำรุด';
export type UsedPartStatus = 'รอจำหน่าย' | 'รอทำลาย' | 'เก็บไว้ใช้ต่อ' | 'จำหน่ายแล้ว' | 'ทำลายแล้ว';

export interface UsedPart {
    id: string;
    originalPartId: string;
    name: string;
    fromRepairId: string;
    fromRepairOrderNo: string;
    fromLicensePlate: string;
    dateRemoved: string;
    condition: UsedPartCondition;
    status: UsedPartStatus;
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
