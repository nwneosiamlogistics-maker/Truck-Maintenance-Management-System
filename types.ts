// types.ts

// FIX: Export ChatMessage type to be used by the Chatbot component.
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export type Tab =
    | 'dashboard'
    | 'kpi-dashboard'
    | 'fleet-kpi'
    | 'kpi-management'
    | 'form'
    | 'list'
    | 'technician-view'
    | 'history'
    | 'vehicle-repair-history'
    | 'stock'
    | 'stock-history'
    | 'requisitions'
    | 'suppliers'
    | 'used-part-buyers'
    | 'used-part-report'
    | 'reports'
    | 'technicians'
    | 'technicianPerformance'
    | 'technicianWorkLog'
    | 'estimation'
    | 'maintenance'
    | 'preventive-maintenance'
    | 'pm-history'
    | 'vehicles'
    | 'daily-checklist'
    | 'tire-check'
    | 'tool-management'
    | 'settings';

export type Priority = 'ปกติ' | 'ด่วน' | 'ด่วนที่สุด';
export type RepairStatus = 'รอซ่อม' | 'กำลังซ่อม' | 'รออะไหล่' | 'ซ่อมเสร็จ' | 'ยกเลิก';

export interface FileAttachment {
  name: string;
  url: string;
  type: string;
}

export interface EstimationAttempt {
  sequence: number;
  createdAt: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  estimatedLaborHours: number;
  status: 'Active' | 'Completed' | 'Failed';
  failureReason: string | null;
  aiReasoning: string | null;
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
    assignedTechnicianId: string | null;
    assistantTechnicianIds: string[];
    externalTechnicianName?: string;
    status: RepairStatus;
    createdAt: string;
    updatedAt: string;
    approvalDate: string | null;
    repairStartDate: string | null;
    repairEndDate: string | null;
    notes?: string;
    parts?: PartRequisitionItem[];
    attachments?: FileAttachment[];
    repairCost: number;
    partsVat?: number;
    isLaborVatEnabled?: boolean;
    laborVatRate?: number;
    laborVat?: number; // The calculated amount
    requisitionNumber?: string;
    invoiceNumber?: string;
    dispatchType: 'ภายใน' | 'ภายนอก';
    estimations: EstimationAttempt[];
    repairResult: string;
    repairLocation: string;
    coordinator: string;
    returnDate: string;
    checklists: {
        preRepair: any[];
        postRepair: any[];
    };
    kpiTaskIds?: string[];
}

export type TechnicianRole = 'ช่าง' | 'ผู้ช่วยช่าง';

export interface Technician {
    id: string;
    name: string;
    role: TechnicianRole;
    skills: string[];
    experience: number;
    status: 'ว่าง' | 'ไม่ว่าง' | 'ลา';
    rating: number;
    completedJobs: number;
    currentJobs: number;
}

export type StockStatus = 'ปกติ' | 'สต็อกต่ำ' | 'หมดสต็อก' | 'สต๊อกเกิน';

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
    isFungibleUsedItem?: boolean;
    isRevolvingPart?: boolean;
}

export type StockTransactionType = 'รับเข้า' | 'เบิกใช้' | 'คืนร้านค้า' | 'ปรับสต็อก' | 'ขายของเก่า' | 'ย้ายสต็อก' | 'คืนของใช้ได้';

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
    pricePerUnit: number;
    documentNumber?: string;
}

export interface Report {
    id: string;
    name: string;
    type: 'monthly_summary' | 'technician_performance' | 'part_usage';
    generatedAt: string;
    data: any;
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

export type UsedPartDispositionType = 'ขาย' | 'ทิ้ง' | 'เก็บไว้ใช้ต่อ' | 'นำไปใช้แล้ว' | 'ย้ายไปคลังหมุนเวียน' | 'ย้ายไปสต็อกของเก่ารวม';
export type UsedPartCondition = 'ดีมาก' | 'ดี' | 'พอใช้' | 'ต้องซ่อม' | 'ชำรุด';
export type UsedPartBatchStatus = 'รอจัดการ' | 'จัดการบางส่วน' | 'จัดการครบแล้ว';

export interface UsedPartDisposition {
    id: string;
    quantity: number;
    dispositionType: UsedPartDispositionType;
    condition: UsedPartCondition;
    date: string;
    soldTo: string | null;
    salePricePerUnit: number | null;
    storageLocation: string | null;
    notes: string | null;
}

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
    notes: string | null;
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
    notes: string;
    approverName?: string;
    approvalDate: string | null;
    requestType: PurchaseRequestType;
    otherRequestTypeDetail?: string;
    budgetStatus: PurchaseBudgetType;
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

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    isRead: boolean;
    createdAt: string;
    linkTo?: Tab;
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

export type MonthStatus = 'planned' | 'completed' | 'none' | 'completed_unplanned';

export interface AnnualPMPlan {
    id: string;
    vehicleLicensePlate: string;
    maintenancePlanId: string;
    year: number;
    months: { [monthIndex: number]: MonthStatus };
}

export interface PMHistory {
    id: string;
    maintenancePlanId: string;
    vehicleLicensePlate: string;
    planName: string;
    serviceDate: string;
    mileage: number;
    technicianId: string | null;
    notes: string;
}

export type VehicleLayout = 
    | 'รถพ่วง 22 ล้อ'
    | 'รถ 12 ล้อ'
    | 'รถ 10 ล้อ'
    | 'รถ 6 ล้อ'
    | 'รถกระบะ 4 ล้อ'
    | 'หาง 3 เพลา'
    | 'หาง 2 เพลา'
    | 'หางแม่ลูก 3 เพลา'
    | 'หางแม่ลูก 2 เพลา';

export type TireType = 'เรเดียล' | 'ไบแอส' | 'อื่นๆ';
export type TireAction = 'ปกติ' | 'ถอด' | 'สลับยาง' | 'เปลี่ยน';

export interface TireData {
    positionId: string;
    isFilled: boolean;
    treadDepth: number | null;
    psi: number | null;
    brand: string;
    model: string;
    serialNumber: string;
    productionDate: string; // WW/YY format
    tireType: TireType;
    action: TireAction;
    changeDate: string; // YYYY-MM-DD
    notes: string;
}

export interface TireInspection {
    id: string;
    licensePlate: string;
    trailerLicensePlate?: string;
    vehicleLayout: VehicleLayout;
    inspectionDate: string;
    inspectorName: string;
    tires: Record<string, TireData>;
}

export type ToolStatus = 'ปกติ' | 'ชำรุด' | 'สูญหาย' | 'ส่งซ่อม';
export type ToolTransactionType = 'ยืม' | 'คืน' | 'เพิ่ม' | 'ปรับปรุง' | 'จำหน่าย';

export interface Tool {
    id: string;
    // Main Info
    code: string; // รหัสเครื่องมือ
    name: string; // ชื่อเครื่องมือ
    assetNumber: string | null; // หมายเลขทรัพย์สิน
    model: string | null; // รุ่น
    category: string; // หมวดหมู่
    brand: string | null; // ยี่ห้อ
    serialNumber: string | null; // หมายเลขเครื่อง
    
    // Stock Info
    totalQuantity: number;
    quantityCheckedOut: number;
    storageLocation: string | null;
    status: ToolStatus;
    lowStockThreshold: number;

    // Purchase & Manual Info
    importDate: string; // วันที่ซื้อ / นำเข้า
    distributorName: string | null; // ชื่อผู้ขาย
    distributorAddress: string | null; // ที่อยู่ผู้ขาย
    distributorContact: string | null; // ติดต่อผู้ขาย
    manualRefNumber: string | null; // เลขที่อ้างอิงคู่มือ
    
    // Technical Info
    usageDetails: string | null; // รายละเอียดการใช้งาน
    mechanicalProperties: string | null; // ข้อมูลทางกล
    electricalData: string | null; // ข้อมูลทางไฟฟ้า

    // Meta
    recordedBy: string | null; // ผู้บันทึก
    notes: string | null; // หมายเหตุ
}

export interface ToolTransaction {
    id: string;
    toolId: string;
    toolName: string;
    type: ToolTransactionType;
    quantity: number;
    technicianId: string;
    technicianName: string;
    transactionDate: string;
    notes: string | null;
}

export interface ChecklistItemResult {
  status: string;
  notes: string;
}

export interface DailyChecklist {
    id: string;
    checklistId: string;
    vehicleLicensePlate: string;
    vehicleType: string;
    inspectionDate: string;
    reporterName: string;
    receiverName?: string;
    items: Record<string, ChecklistItemResult>;
}

export interface RepairFormSeed {
    licensePlate: string;
    vehicleType: string;
    reportedBy: string;
    problemDescription: string;
}

export interface RepairKPI {
    id: string;
    category: string;
    item: string;
    standardHours: number;
}

export interface Holiday {
    id: string;
    date: string; // YYYY-MM-DD format
    name: string;
}
