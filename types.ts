

export type Tab = 'dashboard' | 'analytics' | 'kpi-management' | 'form' | 'list' | 'technician-view' | 'history' | 'vehicle-repair-history' | 'stock' | 'stock-history' | 'requisitions' | 'purchase-orders' | 'suppliers' | 'used-part-buyers' | 'used-part-report' | 'technicians' | 'technicianPerformance' | 'technicianWorkLog' | 'estimation' | 'maintenance' | 'preventive-maintenance' | 'pm-history' | 'daily-checklist' | 'tire-check' | 'tool-management' | 'settings' | 'budget-management' | 'fuel-management' | 'driver-management' | 'warranty-insurance' | 'vehicles';


export type Priority = 'ปกติ' | 'ด่วน' | 'ด่วนที่สุด';
export type RepairStatus = 'รอซ่อม' | 'กำลังซ่อม' | 'รออะไหล่' | 'ซ่อมเสร็จ' | 'ยกเลิก';
export type StockStatus = 'ปกติ' | 'สต็อกต่ำ' | 'หมดสต็อก' | 'สต๊อกเกิน';
export type TechnicianRole = 'ช่าง' | 'ผู้ช่วยช่าง';
export type PurchaseRequisitionStatus = 'ฉบับร่าง' | 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ออก PO แล้ว' | 'รอสินค้า' | 'รับของแล้ว' | 'ยกเลิก';
export type PurchaseRequestType = 'Product' | 'Service' | 'Equipment' | 'Asset' | 'Others';
export type PurchaseBudgetType = 'Have Budget' | 'No Budget';
export type UsedPartBatchStatus = 'รอจัดการ' | 'จัดการบางส่วน' | 'จัดการครบแล้ว';
export type MonthStatus = 'none' | 'planned' | 'completed' | 'completed_unplanned';
export type StockTransactionType = 'รับเข้า' | 'เบิกใช้' | 'ปรับสต็อก' | 'คืนร้านค้า' | 'คืนของใช้ได้' | 'ย้ายสต็อก' | 'ขายของเก่า';

export interface PartRequisitionItem {
    partId: string;
    name: string;
    code?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    source: 'สต็อกอู่' | 'ร้านค้า';
    supplierName?: string;
    purchaseDate?: string;
}

export interface FileAttachment {
    id: string;
    name: string;
    url: string;
    type: string;
}

export interface EstimationAttempt {
    sequence: number;
    createdAt: string;
    estimatedStartDate: string | null;
    estimatedEndDate: string | null;
    estimatedLaborHours: number;
    status: 'Active' | 'Completed' | 'Failed';
    failureReason: string | null;
    aiReasoning: string | null;
}

export interface Repair {
    id: string;
    repairOrderNo: string;
    vehicleId?: string; // ID ของรถ (เพื่อการเชื่อมโยงที่แม่นยำ)
    licensePlate: string;
    vehicleType: string;
    vehicleMake?: string;
    vehicleModel?: string;
    currentMileage?: number | string;
    reportedBy: string;
    driverId?: string;       // ID ของคนขับที่แจ้งหรือรับผิดชอบ
    driverName?: string;     // ชื่อคนขับ
    repairCategory: string;
    priority: Priority;
    problemDescription: string;
    assignedTechnicianId: string | null;
    assistantTechnicianIds: string[];
    externalTechnicianName?: string;
    notes?: string;
    dispatchType: 'ภายใน' | 'ภายนอก';
    repairLocation?: string;
    coordinator?: string;
    returnDate?: string;
    repairResult?: string;
    repairCost?: number;
    partsVat?: number;
    isLaborVatEnabled?: boolean;
    laborVatRate?: number;
    laborVat?: number;
    parts: PartRequisitionItem[];
    attachments?: FileAttachment[];
    estimations: EstimationAttempt[];
    checklists?: any;
    kpiTaskIds?: string[];
    status: RepairStatus;
    createdAt: string;
    updatedAt: string;
    approvalDate?: string | null;
    repairStartDate?: string | null;
    repairEndDate?: string | null;
    requisitionNumber?: string;
    invoiceNumber?: string;
}

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
    sellingPrice?: number | null;
    storageLocation?: string;
    supplier?: string;
    status: StockStatus;
    isRevolvingPart?: boolean;
    isFungibleUsedItem?: boolean;
    quantityReserved?: number;
}

export interface StockTransaction {
    id: string;
    stockItemId: string;
    stockItemName: string;
    type: StockTransactionType | string;
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
    title: string;
    date: string;
    type: string;
    content?: any;
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

export interface PurchaseRequisitionItem {
    partId?: string;
    stockId?: string;
    stockCode?: string;
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
    vatAmount?: number;
    notes?: string;
    approverName?: string;
    approvalDate?: string | null;
    requestType: PurchaseRequestType;
    otherRequestTypeDetail?: string;
    budgetStatus: PurchaseBudgetType;
    relatedPoNumber?: string;
}

export interface PurchaseOrderItem {
    stockId?: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    prId?: string;
    discount?: number;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    createdAt: string;
    supplierName: string;
    supplierAddress?: string;
    supplierTaxId?: string;
    orderDate: string;
    deliveryDate?: string;
    paymentTerms?: string;
    notes?: string;
    contactPerson?: string;
    requesterName?: string;
    department?: string;
    deliveryLocation?: string;
    project?: string;
    contactAccount?: string;
    contactReceiver?: string;
    status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
    items: PurchaseOrderItem[];
    subtotal: number;
    vatAmount: number;
    whtAmount?: number;
    whtRate?: number;
    whtType?: string;
    totalAmount: number;
    linkedPrIds: string[];
    linkedPrNumbers?: string[];
    createdBy?: string;
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
    type: 'success' | 'error' | 'info' | 'warning' | 'danger';
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

export interface UsedPartDisposition {
    id: string;
    dispositionType: 'ขาย' | 'ทิ้ง' | 'เก็บไว้ใช้ต่อ' | 'ย้ายไปคลังหมุนเวียน' | 'ย้ายไปสต็อกของเก่ารวม' | 'นำไปใช้แล้ว';
    quantity: number;
    condition: string;
    date: string;
    soldTo?: string | null;
    salePricePerUnit?: number | null;
    storageLocation?: string | null;
    notes?: string | null;
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
    notes?: string;
}

export interface AnnualPMPlan {
    id: string;
    vehicleLicensePlate: string;
    maintenancePlanId: string;
    year: number;
    months: { [monthIndex: number]: MonthStatus };
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
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
    targetServiceDate?: string;
    targetMileage?: number;
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
    mileageInstalled: number | null;
    notes: string;
}

export interface TireInspection {
    id: string;
    licensePlate: string;
    trailerLicensePlate?: string;
    vehicleLayout: VehicleLayout;
    inspectionDate: string;
    inspectorName: string;
    mileage: number;
    tires: Record<string, TireData>;
}

export type ToolStatus = 'ปกติ' | 'ชำรุด' | 'สูญหาย' | 'ส่งซ่อม';
export type ToolTransactionType = 'ยืม' | 'คืน' | 'เพิ่ม' | 'ปรับปรุง' | 'จำหน่าย';

export interface Tool {
    id: string;
    code: string; // รหัสเครื่องมือ
    name: string; // ชื่อเครื่องมือ
    assetNumber: string | null; // หมายเลขทรัพย์สิน
    model: string | null; // รุ่น
    category: string; // หมวดหมู่
    brand: string | null; // ยี่ห้อ
    serialNumber: string | null; // หมายเลขเครื่อง

    totalQuantity: number;
    quantityCheckedOut: number;
    storageLocation: string | null;
    status: ToolStatus;
    lowStockThreshold: number;

    importDate: string; // วันที่ซื้อ / นำเข้า
    distributorName: string | null; // ชื่อผู้ขาย
    distributorAddress: string | null; // ที่อยู่ผู้ขาย
    distributorContact: string | null; // ติดต่อผู้ขาย
    manualRefNumber: string | null; // เลขที่อ้างอิงคู่มือ

    usageDetails: string | null; // รายละเอียดการใช้งาน
    mechanicalProperties: string | null; // ข้อมูลทางกล
    electricalData: string | null; // ข้อมูลทางไฟฟ้า

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

// ==================== COST MANAGEMENT & BUDGET TRACKING ====================

export type BudgetCategory = 'ซ่อมบำรุงรถ' | 'อะไหล่' | 'น้ำมันเชื้อเฟลิง' | 'ค่าแรงช่าง' | 'ค่าภาษีและประกันภัย' | 'อื่นๆ';
export type BudgetStatus = 'ปกติ' | 'ใกล้เกิน' | 'เกินงบ';
export type CostTrend = 'increasing' | 'stable' | 'decreasing';

export interface MaintenanceBudget {
    id: string;
    year: number;
    month: number;
    department: string;
    category: BudgetCategory;
    allocatedAmount: number;    // งบที่ได้รับจัดสรร
    spentAmount: number;         // ใช้จ่ายไปแล้ว
    committedAmount: number;     // จองไว้ (PO ที่ยังไม่จ่าย)
    availableAmount: number;     // เหลือใช้
    status: BudgetStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CostAnalysis {
    id: string;
    vehicleId: string;
    licensePlate: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;

    totalCost: number;
    totalDistance: number;
    costPerKm: number;

    costBreakdown: {
        labor: number;
        parts: number;
        fuel: number;
        external: number;
        insurance: number;
        tax: number;
        other: number;
    };

    trend: CostTrend;
    trendPercentage: number;

    comparisonToAvg: number;  // +20% = แพงกว่าค่าเฉลี่ย 20%
    ranking?: number;          // อันดับที่แพงที่สุด
}

export interface CostForecast {
    id: string;
    vehicleId: string;
    forecastPeriod: string;
    predictedCost: number;
    confidence: number;        // 0-100%
    basedOn: 'historical' | 'ai' | 'manual';
    assumptions?: string;
    createdAt: string;
}

// ==================== FUEL MANAGEMENT SYSTEM ====================

export type FuelType = 'ดีเซล' | 'เบนซิน 91' | 'เบนซิน 95' | 'แก๊สโซฮอล์ E20' | 'แก๊สโซฮอล์ E85' | 'NGV';
export type FuelAlertType = 'low_efficiency' | 'suspicious_refill' | 'fuel_theft' | 'excessive_consumption';

export interface FuelRecord {
    id: string;
    vehicleId: string;
    licensePlate: string;
    driverName: string;
    date: string;

    // ข้อมูลสถานี
    station: string;
    stationLocation?: string;
    fuelType: FuelType;

    // ข้อมูลการเติม
    liters: number;
    pricePerLiter: number;
    totalCost: number;

    // ข้อมูลรถ ณ เวลาเติม
    odometerBefore: number;
    odometerAfter: number;

    // การคำนวณ
    distanceTraveled: number;
    fuelEfficiency: number;     // km/liter

    // หลักฐาน
    receiptImage?: string;
    fuelCardNumber?: string;
    paymentMethod: 'เงินสด' | 'บัตรเครดิต' | 'บัตรน้ำมัน' | 'โอน';

    // Notes
    notes?: string;

    createdAt: string;
    createdBy: string;
}

export interface FuelAnalytics {
    vehicleId: string;
    licensePlate: string;
    period: string;

    // Statistics
    totalLiters: number;
    totalCost: number;
    totalDistance: number;
    avgEfficiency: number;      // km/liter เฉลี่ย

    // Trends
    efficiencyTrend: number;    // +5% means improving
    costTrend: number;

    // Comparisons
    vsFleetAvg: number;         // เทียบกับค่าเฉลี่ยของฝูงรถ
    vsLastPeriod: number;       // เทียบกับช่วงก่อนหน้า

    // Alerts
    alerts: FuelAlert[];
}

export interface FuelAlert {
    id: string;
    type: FuelAlertType;
    severity: 'low' | 'medium' | 'high';
    vehicleId: string;
    date: string;
    message: string;
    details?: string;
    relatedRecordId?: string;
    isResolved: boolean;
}

// ==================== DRIVER MANAGEMENT ====================

export type DriverStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';
export type LicenseClass = 'ใบขับขี่ส่วนบุคคล' | 'ใบขับขี่สาธารณะ' | 'ใบขับขี่บรรทุก';

export interface Driver {
    id: string;
    employeeId: string;
    name: string;
    nickname?: string;

    // ข้อมูลติดต่อ
    phone: string;
    email?: string;
    address?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };

    // ใบขับขี่
    licenseNumber: string;
    licenseClass: LicenseClass;
    licenseIssueDate: string;
    licenseExpiry: string;

    // ประวัติการทำงาน
    hireDate: string;
    experience: number;         // ปี
    previousEmployer?: string;

    // การมอบหมายรถ
    assignedVehicles: string[];
    primaryVehicle?: string;

    // Performance Metrics
    totalDistanceDriven: number;
    totalTrips: number;
    accidentCount: number;
    violationCount: number;
    onTimeDeliveryRate: number; // 0-100%

    // Safety & Training
    lastSafetyTraining?: string;
    certifications: string[];
    safetyScore: number;        // 0-100

    // Financial
    monthlySalary?: number;
    bonus?: number;

    // Leave Management
    leaveQuota: {
        sick: number;      // ลาป่วย
        personal: number;  // ลากิจ
        vacation: number;  // ลาพักร้อน
    };
    usedLeave: {
        sick: number;
        personal: number;
        vacation: number;
    };
    leaves: LeaveRecord[];

    status: DriverStatus;

    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export type LeaveType = 'sick' | 'personal' | 'vacation' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
    id: string;
    driverId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: LeaveStatus;
    documentUrl?: string;
    note?: string;
}

export interface DriverPerformance {
    id: string;
    driverId: string;
    driverName: string;
    period: string;
    startDate: string;
    endDate: string;

    // การขับขี่
    totalKm: number;
    totalTrips: number;
    avgTripDistance: number;
    workingDays: number;

    // Fuel Efficiency
    avgFuelEfficiency: number;
    fuelCost: number;

    // Safety Metrics
    harshBrakingCount: number;
    harshAccelerationCount: number;
    speedingIncidents: number;
    accidentCount: number;

    // ผลกระทบต่อรถ
    maintenanceCost: number;
    repairFrequency: number;
    vehicleDowntime: number;    // ชั่วโมง

    // Rankings (1 = ดีที่สุด)
    safetyRank?: number;
    efficiencyRank?: number;
    overallRank?: number;

    // Score (0-100)
    overallScore: number;
}

export interface DrivingIncident {
    id: string;
    driverId: string;
    vehicleId: string;
    date: string;
    time: string;
    location: string;

    type: 'อุบัติเหตุ' | 'ฝ่าฝืนกฎจราจร' | 'การขับขี่เสี่ยง' | 'อื่นๆ';
    severity: 'low' | 'medium' | 'high' | 'critical';

    description: string;

    // Consequences
    damageToVehicle?: number;
    damageToProperty?: number;
    injuries?: string;
    fineAmount?: number;

    // Insurance
    insuranceClaim?: boolean;
    claimAmount?: number;

    // Actions Taken
    actionsTaken?: string;
    disciplinaryAction?: string;

    // Evidence
    photos?: FileAttachment[];
    policeReport?: FileAttachment;


    createdAt: string;
    createdBy: string;
}

// ==================== WARRANTY & INSURANCE MANAGEMENT ====================

export type WarrantyType = 'manufacturer' | 'supplier' | 'extended';
export type WarrantyClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type IncidentType = 'collision' | 'theft' | 'fire' | 'flood' | 'other';
export type InsuranceClaimStatus = 'filed' | 'under_review' | 'approved' | 'paid' | 'denied';

export interface PartWarranty {
    id: string;
    partId: string;
    partName: string;
    partCode?: string;

    purchaseDate: string;
    installDate: string;
    vehicleId?: string;
    vehicleLicensePlate?: string;
    repairOrderNo?: string;

    warrantyType: WarrantyType;
    warrantyDuration: number;  // เดือน
    warrantyExpiry: string;

    supplier: string;
    supplierContact?: string;
    warrantyTerms: string;

    purchaseCost: number;

    claims: WarrantyClaim[];

    isActive: boolean;
    notes?: string;

    createdAt: string;
    updatedAt: string;
}

export interface WarrantyClaim {
    id: string;
    warrantyId: string;

    claimDate: string;
    repairOrderNo?: string;
    issue: string;
    issueDetails?: string;

    claimStatus: WarrantyClaimStatus;
    approvalDate?: string;
    completionDate?: string;

    replacementCost: number;
    supplierCredit: number;
    laborCost: number;

    rejectionReason?: string;

    attachments?: FileAttachment[];
    notes?: string;

    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface InsuranceClaim {
    id: string;
    claimNumber: string;

    vehicleId: string;
    vehicleLicensePlate: string;
    policyNumber: string;
    insuranceCompany: string;

    incidentDate: string;
    claimDate: string;
    reportedBy: string;

    incidentType: IncidentType;
    incidentLocation?: string;
    description: string;
    policeReportNumber?: string;

    damageAssessment: number;
    claimAmount: number;
    deductible: number;
    approvedAmount?: number;
    paidAmount?: number;

    status: InsuranceClaimStatus;
    statusHistory: {
        status: InsuranceClaimStatus;
        date: string;
        notes?: string;
    }[];

    relatedRepairs: string[];
    estimatedRepairCost: number;
    actualRepairCost?: number;

    adjusterName?: string;
    adjusterContact?: string;
    inspectionDate?: string;

    paymentDate?: string;
    denialReason?: string;

    documents: FileAttachment[];
    photos?: FileAttachment[];

    notes?: string;

    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface WarrantyAlert {
    id: string;
    type: 'warranty_expiring' | 'warranty_expired' | 'claim_pending';
    warrantyId?: string;
    partName: string;
    expiryDate?: string;
    daysRemaining?: number;
    severity: 'low' | 'medium' | 'high';
    message: string;
}

export interface InsuranceAlert {
    id: string;
    type: 'policy_expiring' | 'policy_expired' | 'claim_pending';
    vehicleId: string;
    vehicleLicensePlate: string;
    insuranceType: 'vehicle' | 'cargo' | 'act';
    expiryDate?: string;
    daysRemaining?: number;
    severity: 'low' | 'medium' | 'high';
    message: string;
}

export type CargoCoverageType = 'All Risks' | 'Named Perils' | 'Total Loss Only';

export interface CargoInsurancePolicy {
    id: string;
    policyNumber: string;
    insurer: string;
    coverageType: CargoCoverageType;
    coverageLimit: number;
    deductible: number;
    premium: number;
    startDate: string;
    expiryDate: string;
    termsAndConditions?: string;
    status: 'Active' | 'Expired' | 'Cancelled';
    notes?: string;
}

export interface CargoInsuranceClaim {
    id: string;
    policyId: string;
    claimNumber: string;
    jobId?: string; // Link to a transport job/trip
    vehicleId?: string;
    vehicleLicensePlate?: string;
    incidentDate: string;
    incidentLocation: string;
    cargoDescription: string;
    damageDescription: string;
    packagingType?: string;

    claimedAmount: number;
    approvedAmount?: number;
    deductible?: number;

    status: InsuranceClaimStatus;

    photos: FileAttachment[];
    documents: FileAttachment[];

    notes?: string;

    createdAt: string;
    updatedAt: string;
}

export interface IncidentInvestigationReport {
    id: string;
    reportNo: string;

    // 1. General Information
    incidentDate: string;
    incidentTime: string;
    incidentShift: '02:01-06:00' | '06:01-12:00' | '12:01-18:00' | '18:01-02:00';
    incidentTitle: string;
    reportType: 'Near Miss' | 'Accident';
    accidentType?: 'Company Premise' | 'Client Premise' | 'In Transit';

    // 2. Incident Type Details
    incidentType: {
        injuryFatality: boolean;
        employeeInjuredCount?: number;
        employeeDeadCount?: number;
        thirdPartyInjuredCount?: number;
        thirdPartyDeadCount?: number;

        fireExplosion: boolean;
        spill: boolean;
        spillDetails?: string;
        propertyDamage: boolean;
        propertyDamageDetails?: string;
        envImpact: boolean;
        vehicleIncident: boolean;
        vehicleIncidentTankNo?: string;
        vehicleIncidentThirdPartyNo?: string;
        reputationImpact: boolean;
        other: boolean;
        otherDetails?: string;
    };

    // 3. Person Involved (Driver)
    driverId?: string;
    driverName: string;
    driverAge?: number;
    driverExperienceYears?: number;
    driverTrainingHistory?: string; // Multi-line text

    // 4. Location
    location: string;
    locationIsCompanyPremise: boolean;
    vehicleId?: string;
    vehicleLicensePlate: string;

    // 5. Description
    description: string;

    // 6. Immediate Actions
    immediateCorrectiveActions: string;
    restorationDetails: string;

    // 6.1 Notifications
    notifications: {
        lineManager?: string;
        carrier?: string;
        insurance?: string;
        relatives?: string;
        authorities?: string;
        others?: string;
    };

    // 7. Tests (Alcohol & Drug)
    drugAlcoholTest: {
        alcoholDate?: string;
        alcoholTime?: string;
        alcoholResult: 'Found' | 'Not Found' | 'Not Tested';
        alcoholValueMg?: string;

        drugDate?: string;
        drugTime?: string;
        drugResult: 'Found' | 'Not Found' | 'Not Tested';

        medicationCheck: 'Yes' | 'No' | 'Unknown';
    };

    // 8. Injured Persons List
    injuredEmployees: { name: string; age?: number; jobTitle?: string; injuryNature?: string; absence?: boolean }[];
    injuredThirdParties: { name: string; age?: number; jobTitle?: string; injuryNature?: string; absence?: boolean }[];

    // 9. Damaged Product
    damagedProducts: { name: string; quantity: number; estimatedLoss: number }[];

    // 10. Env Impact
    envProximityDetails?: string;
    envEstimatedLoss?: number;

    // 11. Property Damage List
    damagedProperties: { description: string; owner: 'Company' | '3rd Party'; estimatedLoss: number }[];

    // 12-13. Authorities & Medai
    authoritiesInvolved?: string;
    mediaCoverage: 'None' | 'Radio' | 'TV' | 'Newspaper' | 'Other';
    mediaDetails?: string;

    // 14. Effect on Equipment/Product
    effectOnEquipment?: string;
    effectOnProductQuality?: string;

    // 15. Analysis (Root Causes)
    rootCauseAnalysis: {
        personalFactors: string[];
        routeHazardous: string[];
        truckCondition: string[];
        environment: string[];
        companyPolicy: string[];
        otherCheck?: string[];
        remarks: string; // explanation for "Other" in each category
    };

    whyWhyAnalysis?: {
        problem: string;
        roots: {
            id: string;
            text: string;
            children: any[]; // Using any[] for recursive type simplicity in this context
        }[];
    };

    scatAnalysis?: {
        lackOfControl: string; // ขาดการควบคุมดูแล
        basicCauses: string;   // สาเหตุพื้นฐาน
        immediateCauses: string; // สาเหตุขณะนั้น
        incident: string;      // อุบัติการณ์
        accident: string;      // อุบัติเหตุ
    };

    // 16. Preventive Actions
    preventiveActions: { action: string; responsiblePerson: string; dueDate: string; completedDate?: string }[];

    // 17. Recommendations
    recommendations: { recommendation: string; responsiblePerson: string }[];

    // 18. Team
    investigationTeam: { name: string; position: string; company: string }[];

    // 19. Management Review
    managementReview: {
        requireMoreInvestigation: boolean;
        reviewerName: string;
        reviewerPosition?: string;
        reviewerCompany?: string;
        reviewedDate: string;
    };

    topManagementAcknowledge?: {
        name: string;
        position: string;
        company: string;
        date: string;
    };

    // Checklist Conditions
    siteConditions: {
        roadSurface?: 'Smooth' | 'Rough';
        lighting?: 'Night (Street Lights)' | 'Night (No Lights)' | 'Day';
        visibility?: 'Clear' | 'Fog/Dust' | 'Glare' | 'Rain' | 'Obstacle';
        locationType?: string; // 1-16
        locationTypeOther?: string;
    };

    // Linked Claims
    relatedVehicleClaimId?: string;
    relatedCargoClaimId?: string;

    status: 'Open' | 'Investigating' | 'Closed';
    investigatorName: string; // Usually prepared by
    investigationDate: string;

    // 5.2 Evidence
    evidence: {
        accidentPhotos?: FileAttachment[];
        skidMarkPhotos?: FileAttachment[];
        transportManifest?: FileAttachment[];
        gpsData?: FileAttachment[];
    };

    createdAt: string;
    updatedAt: string;
    createdBy: string;
}
