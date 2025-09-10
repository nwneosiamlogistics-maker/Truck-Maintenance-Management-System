export type Tab = 'dashboard' | 'form' | 'list' | 'stock' | 'reports' | 'technicians' | 'estimation' | 'maintenance' | 'history';

export interface FileAttachment {
  name: string;
  size: number;
}

export interface PartRequisitionItem {
  partId: string; // from stock, or 'new' for external
  name: string;
  code: string;
  quantity: number;
  unit: string; // Added from PDF analysis
  unitPrice: number;
  source: 'สต๊อกอู่' | 'ร้านค้า';
  supplierName?: string; // For external purchases
  purchaseDate?: string; // Added for external parts
}

export interface Repair {
  id: string; // Auto-generated unique ID
  repairOrderNo: string; // User-facing ID
  requisitionNumber?: string; // Added from PDF: ใบเบิกสินค้า
  invoiceNumber?: string; // Added from PDF: Invoice
  licensePlate: string;
  vehicleType: string;
  vehicleMake: string; // Added from PDF: ยี่ห้อ
  vehicleModel: string; // Was combination, now just model (รุ่น)
  currentMileage: string;
  reportedBy: string; 
  repairCategory: string; // 'เปลี่ยนอะไหล่', 'ซ่อมทั่วไป', 'ตรวจเช็ก'
  problemDescription: string;
  notes?: string;
  
  priority: 'ปกติ' | 'เร่งด่วน' | 'ฉุกเฉิน';
  status: 'รอซ่อม' | 'กำลังซ่อม' | 'รออะไหล่' | 'ซ่อมเสร็จ';
  createdAt: string; // Report date
  updatedAt: string;
  
  // Assignment & Timeline
  approvalDate?: string; // Added for repair approval date
  assignedTechnician: string;
  repairStartDate?: string;
  repairEndDate?: string;
  
  // Dispatch Info (optional section)
  dispatchType: 'ภายใน' | 'ภายนอก';
  repairLocation?: string; // Name of garage
  coordinator?: string;
  returnDate?: string;
  repairResult?: string;
  
  // Costs
  repairCost?: number; // Labor/external cost
  partsVat?: number; // VAT for externally purchased parts

  // Parts & Files
  parts: PartRequisitionItem[];
  attachments: FileAttachment[];
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
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock?: number;
  price: number; // Cost price
  sellingPrice?: number;
  storageLocation?: string;
  supplier: string;
  status: 'ปกติ' | 'สต๊อกต่ำ' | 'สต๊อกเกิน' | 'หมดสต๊อก';
  notes?: string;
}

export interface StockTransaction {
  id: string;
  stockItemId: string;
  stockItemName: string; 
  type: 'in' | 'out';
  quantityChange: number;
  newQuantity: number;
  date: string; // ISO string
  requisitionNumber?: string;
  invoiceNumber?: string;
  pricePerUnit?: number;
  notes?: string;
  // For 'out' transactions
  technicianId?: string; 
  repairOrderNo?: string; 
}


export interface Report {
  id: string;
  name: string;
  type: string;
  filename: string;
  createdAt: string;
  status: 'พร้อมใช้' | 'กำลังสร้าง';
  size: string;
}

export interface MaintenancePlan {
  id: string;
  vehicleLicensePlate: string;
  planName: string;
  // Time-based tracking
  lastServiceDate: string; // 'YYYY-MM-DD'
  frequencyValue: number;
  frequencyUnit: 'days' | 'weeks' | 'months';
  // Mileage-based tracking
  lastServiceMileage: number;
  mileageFrequency: number; // e.g., service every 10000 km
}