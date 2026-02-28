

export type Tab = 'home' | 'dashboard' | 'analytics' | 'kpi-management' | 'okr-management' | 'form' | 'list' | 'technician-view' | 'history' | 'vehicle-repair-history' | 'stock' | 'stock-history' | 'requisitions' | 'purchase-orders' | 'suppliers' | 'used-part-buyers' | 'used-part-report' | 'technicians' | 'technicianPerformance' | 'technicianWorkLog' | 'estimation' | 'maintenance' | 'preventive-maintenance' | 'pm-history' | 'daily-checklist' | 'trailer-checklist' | 'tire-check' | 'tool-management' | 'settings' | 'budget-management' | 'fuel-management' | 'driver-management' | 'driver-matrix' | 'warranty-insurance' | 'vehicles' | 'incident-log' | 'repair-categories' | 'safety-plan' | 'safety-check' | 'incab-assessment';

export type RepairCategoryCode = 'ENG' | 'TRA' | 'SUS' | 'BRK' | 'ELE' | 'AC' | 'TIR' | 'BOD' | 'HYD' | 'COO' | 'FUE' | 'PM' | 'OTH';

export interface RepairSubCategory {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    parentCode: RepairCategoryCode;
    suggestedParts?: string[];
    suggestedSymptoms?: string[];
    isActive: boolean;
}

export interface RepairCategoryMaster {
    id: string;
    code: RepairCategoryCode;
    nameTh: string;
    nameEn: string;
    icon: string;
    isActive: boolean;
    sortOrder: number;
    subCategories: RepairSubCategory[];
}

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
    photos?: string[];
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
    photos?: string[];
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
    photos?: string[];
    quotationFiles?: string[];
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
    photos?: string[];
}

export interface Vehicle {
    id: string;
    licensePlate: string;
    vehicleType: string;
    make: string;
    model: string;
    chassisNumber: string | null;
    engineNumber: string | null;
    registrationDate: string | null;
    taxExpiryDate: string | null;
    province: string | null;
    fuelType: string | null;
    yearOfManufacture: number | null;
    insuranceCompany: string | null;
    insuranceExpiryDate: string | null;
    insuranceType: string | null;
    actCompany: string | null;
    actExpiryDate: string | null;
    cargoInsuranceCompany: string | null;
    status: 'Active' | 'Inactive';
    photos?: string[];
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
    photos?: string[]; // รูปภาพประกอบ
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
    createdAt: string;
}

export interface RepairFormSeed {
    licensePlate: string;
    vehicleType: string;
    reportedBy: string;
    problemDescription: string;
}

export interface RepairKPI {
    id: string;
    categoryCode?: RepairCategoryCode;
    subCategoryCode?: string;
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
export type LicenseClass =
    | 'ใบขับขี่ส่วนบุคคล'
    | 'ใบขับขี่สาธารณะ'
    | 'ใบขับขี่บรรทุก'
    | 'บ.1' | 'บ.2' | 'บ.3' | 'บ.4'
    | 'ท.1' | 'ท.2' | 'ท.3' | 'ท.4';


export interface Driver {
    id: string;
    employeeId: string;
    name: string;
    nickname?: string;
    age?: number;

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

    // ===== Driver Matrix Fields =====
    idCard?: string;                // หมายเลขบัตรประชาชน
    dateOfBirth?: string;           // วัน/เดือน/ปีเกิด

    // ตรวจประวัติอาชญากรรม
    criminalCheck?: {
        result?: 'ผ่าน' | 'ไม่ผ่าน' | 'รอผล';
        remark?: string;
        checkedDate?: string;
        files?: string[];
    };

    // อบรมความปลอดภัย (Safety Induction) รายไตรมาส
    safetyInduction?: {
        q1?: string;
        q2?: string;
        q3?: string;
        q4?: string;
    };

    // ตรวจสารเสพติด รายไตรมาส (DD-MMM-YY)
    drugTests?: {
        formula?: string;
        q1?: string;
        q2?: string;
        q3?: string;
        q4?: string;
    };

    // GPS & Facing Camera
    gpsProvider?: string;
    facingCamera?: string;

    // รูปภาพรถ/อุปกรณ์
    vehicleFrontPhoto?: string;
    safetyBeltPhoto?: string;
    vehicleLeftPhoto?: string;
    vehicleRightPhoto?: string;
    vehicleBackPhoto?: string;
    driverAppearanceOk?: boolean;   // แต่งกายสวมเสื้อบริษัท / สะท้อนแสง / Safety
    firstAidBoxPhoto?: string;      // รูปถ่ายกล่องปฐมพยาบาล
    flashlightPhoto?: string;       // รูปถ่ายไฟฉาย

    // Defensive Driving Program & Refresh Training
    defensiveDriving?: {
        plan?: string;
        bookingDate?: string;
        startDate?: string;
        endDate?: string;
        trainingDate?: string; // วันที่อบรมจริง
        status?: 'pending' | 'near_due' | 'due_today' | 'overdue' | 'completed' | 'waived';
        dueDate120?: string; // hireDate + 120 days (cache)
        evidence?: {
            id: string;
            name: string;
            url: string;
            type: 'image' | 'pdf';
            uploadedAt: string;
        }[];
        trainer?: string;
        provider?: string;
        note?: string;
        nextRefreshDate?: string;
        preTest?: number;
        postTest?: number;
        record2022?: string;
        record2023?: string;
    };

    // Incab Coaching
    incabCoaching?: {
        score?: number;
        date?: string;
    };

    // Certificate
    certificate?: {
        certificateNo?: string;
        issuedDate?: string;
    };
    // ===== End Driver Matrix Fields =====

    notes?: string;
    photos?: string[];
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
    lostWorkDays?: number;

    // Insurance
    insuranceClaim?: boolean;
    claimAmount?: number;
    insuranceProvider?: string;

    // Actions Taken
    actionsTaken?: string;
    disciplinaryAction?: string;

    // Evidence
    photos?: FileAttachment[] | string[];
    policeReport?: FileAttachment;


    pointsDeducted?: number;

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
    photos?: FileAttachment[] | string[];

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
    insuredName?: string;
    coverageType: CargoCoverageType;
    coverageLimit: number; // Single accident limit
    totalAnnualLimit?: number;
    deductible: number;
    premium: number;
    startDate: string;
    expiryDate: string;
    contactInfo?: {
        center: string;
        email: string;
    };
    coverageRules?: {
        vehicleType: string | string[];
        limitPerAccident: number;
        limitPerVehicle?: number;
        extensions?: {
            containerCoverage?: number;
            crossBorderRangeKm?: number;
        };
    }[];
    deductibleRules?: {
        type?: 'fixed' | 'percentage_with_min';
        standard: number;
        percentage?: number;
        minAmount?: number;
        highRisk?: {
            rate: number;
            minAmount: number;
            categories: string[];
        };
    };
    coveredVehicles?: string[]; // List of license plates
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
    driverName?: string;
    incidentDate: string;
    incidentLocation: string;
    incidentDescription?: string;
    cargoDescription: string;
    damageDescription: string;
    cargoCategory?: string;
    packagingType?: string;

    claimedAmount: number;
    approvedAmount?: number;
    deductible?: number;
    estimatedDamage?: number;

    status: InsuranceClaimStatus;

    photos: FileAttachment[] | string[];
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

// ==================== OKR MANAGEMENT SYSTEM ====================

export type OKRStatus = 'On Track' | 'At Risk' | 'Behind' | 'Completed' | 'Not Started';
export type OKRCategory = 'Performance' | 'Satisfaction' | 'Business' | 'Human/Safety';

export interface OKRMetric {
    id: string;
    code: string; // e.g., P1, S1, B1
    objective: string;
    detail: string;
    target2025: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    status: OKRStatus;
    category: OKRCategory;
    source: string; // e.g., TMS, Accounting, Manual
    lastUpdated: string;
    trend: 'up' | 'down' | 'stable';
    monthlyProgress?: { month: string; value: number }[];
}

export interface OKRObjective {
    id: string;
    title: string;
    category: OKRCategory;
    progress: number; // 0-100
    metrics: OKRMetric[];
}

// ==================== SAFETY PLAN SYSTEM ====================

export type SafetyTopicCode =
    | 'induction_q1'
    | 'induction_q2'
    | 'induction_q3'
    | 'induction_q4'
    | 'defensive'
    | 'defensive_refresh'
    | string; // allow custom topics

export type TrainingPlanStatus = 'planned' | 'booked' | 'done' | 'overdue';

export type SafetyTopicTarget = 'all' | 'new_employee' | 'existing_employee';

export interface SafetyTopic {
    id: string;
    year: number;
    code: SafetyTopicCode;
    name: string;
    description?: string;
    target: SafetyTopicTarget;
    inCharge?: string;           // ผู้รับผิดชอบ
    byLegal?: string;            // By Legal
    budget?: number;
    windowStart: string;         // ISO date — ช่วงเริ่มต้นที่อนุญาต
    windowEnd: string;           // ISO date — ช่วงสิ้นสุด / dueDate
    isMandatory: boolean;
    sortOrder: number;
    remark?: string;
    isActive: boolean;
    createdAt: string;
}

export interface TrainingSession {
    id: string;
    year: number;
    topicId: string;
    topicCode: SafetyTopicCode;
    startDate: string;           // ISO date
    endDate: string;             // ISO date
    trainer: string;
    location?: string;
    capacity?: number;
    attendeeIds: string[];       // driverId[]
    evidencePhotos: string[];    // NAS URLs
    certificateUrl?: string;
    note?: string;
    createdAt: string;
    createdBy?: string;
}

export interface TrainingPlan {
    id: string;
    year: number;
    driverId: string;
    topicId: string;
    topicCode: SafetyTopicCode;
    dueDate: string;             // ISO date
    status: TrainingPlanStatus;
    bookingDate?: string;
    actualDate?: string;
    sessionId?: string;          // ผูกกับ TrainingSession
    trainer?: string;
    preTest?: number;
    postTest?: number;
    evidencePhotos: string[];    // NAS URLs
    certificateUrl?: string;
    nextDueDate?: string;        // คำนวณอัตโนมัติหลัง done
    note?: string;
    createdAt: string;
    updatedAt: string;
}

// ==================== SAFETY CHECK SYSTEM ====================

export type SafetyCheckType = 'alcohol' | 'substance';
export type SafetyCheckMethod = 'breathalyzer' | 'urine' | 'blood';
export type SafetyCheckResult = 'pass' | 'fail' | 'pending';

export interface SafetyCheckAttendee {
    driverId: string;
    employeeId: string;
    name: string;
    position: string;
    company: string;
    alcoholLevel?: number;       // mg% — alcohol only
    result: SafetyCheckResult;
    remark?: string;
}

export interface SafetyCheck {
    id: string;
    date: string;                // ISO date
    location: string;
    auditor: string;             // ผู้ตรวจ/ลายเซ็น
    type: SafetyCheckType;
    method: SafetyCheckMethod;
    attendees: SafetyCheckAttendee[];
    evidenceFiles: string[];     // NAS URLs (ภาพ/PDF)
    remark?: string;
    createdAt: string;
    createdBy?: string;
}

// ==================== INCAB ASSESSMENT ====================

export type IncabAssessmentResult = 'pass' | 'fail';
export type IncabApprovalStatus = 'approved' | 'rejected' | 'pending';

export interface IncabVisionTest {
    eyeSight: 'short' | 'long' | 'normal' | '';      // 1.1 สายตา
    colorVision: 'normal' | 'deficient' | '';          // 1.2 การมองเห็นที่
    hearing: 'normal' | 'deficient' | '';              // 1.3 การได้ยิน
}

export interface IncabDrivingChecklist {
    parking: 'pass' | 'fail' | '';          // การจอด
    reversing: 'pass' | 'fail' | '';        // การกลับรถ
    speedControl: 'pass' | 'fail' | '';     // ความเร็วในเขต
    mirrorUsage: 'pass' | 'fail' | '';      // การใช้กระจก
    signalUsage: 'pass' | 'fail' | '';      // การให้สัญญาณ
    laneKeeping: 'pass' | 'fail' | '';      // การรักษาช่องทาง
}

export interface IncabAssessment {
    id: string;
    year: number;
    driverId: string;
    driverName: string;
    employeeId: string;
    date: string;                           // ISO date
    assessor: string;                       // ผู้ประเมิน
    approvedBy?: string;                    // ผู้บังคับบัญชา
    approvalStatus: IncabApprovalStatus;
    nextTestDate?: string;                  // วันทดสอบครั้งถัดไป

    // ส่วนที่ 1: การทดสอบร่างกาย (30 คะแนน)
    visionTest: IncabVisionTest;
    visionScore: number;                    // 0-30

    // ส่วนที่ 2: สภาพจิตใจ/แก้ปัญหา (30 คะแนน)
    situationQ1: string;                    // 2.1 ส่งสินค้าเร่งด่วน
    situationQ1Score: number;               // 0-5
    situationQ2: string;                    // 2.2 รถขับปาดหน้า
    situationQ2Score: number;               // 0-5
    situationQ3: string;                    // 2.3 ท่าทีการโต้เถียง/ความเครียด
    situationQ3Score: number;               // 0-5
    situationScore: number;                 // 0-30

    // ส่วนที่ 3: การทดการขับขี่ (40 คะแนน)
    drivingChecklist: IncabDrivingChecklist;
    drivingScore: number;                   // 0-40

    totalScore: number;                     // 0-100
    result: IncabAssessmentResult;          // pass ≥ 70
    remark?: string;

    evidenceFiles: string[];                // NAS URLs
    createdAt: string;
    createdBy?: string;
}
