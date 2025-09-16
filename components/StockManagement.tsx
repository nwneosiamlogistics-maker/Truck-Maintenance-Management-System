import React, { useState, useMemo } from 'react';
import type { StockItem, StockTransaction, StockStatus, UsedPart, UsedPartBatchStatus, PurchaseRequisition, PurchaseRequisitionItem, PurchaseRequisitionStatus, Supplier, UsedPartBuyer, UsedPartDisposition } from '../types';
import StockModal from './StockModal';
import AddStockModal from './AddStockModal';
import StockWithdrawalModal from './StockWithdrawalModal';
import ReturnStockModal from './ReturnStockModal';
import PrintLabelModal from './PrintLabelModal';
import ManageUsedPartBatchModal from './ManageUsedPartBatchModal';
import PurchaseRequisitionModal from './PurchaseRequisitionModal';
import UsedPartSaleReceiptModal from './UsedPartSaleReceiptModal';
import { useToast } from '../context/ToastContext';
import EditUsedPartBatchModal from './EditUsedPartBatchModal';
import { STOCK_CATEGORIES } from '../data/categories';

interface StockAdjustmentModalProps {
    item: StockItem;
    onSave: (data: {
      stockItemId: string;
      newQuantity: number;
      reason: string;
    }) => void;
    onClose: () => void;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ item, onSave, onClose }) => {
    const [newQuantity, setNewQuantity] = useState(item.quantity);
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newQuantity < 0) {
            alert('จำนวนคงเหลือต้องไม่ติดลบ');
            return;
        }
        if (!reason.trim()) {
            alert('กรุณากรอกเหตุผลในการปรับสต็อก');
            return;
        }
        onSave({
            stockItemId: item.id,
            newQuantity,
            reason,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                         <h3 className="text-2xl font-bold text-gray-800">ปรับสต็อกสินค้า</h3>
                         <p className="text-base text-gray-500">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="adjust-stock-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">จำนวนคงเหลือปัจจุบัน</label>
                        <p className="text-lg font-bold p-2 bg-gray-100 rounded-lg">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">จำนวนคงเหลือใหม่ *</label>
                        <input 
                            type="number" 
                            value={newQuantity} 
                            onChange={(e) => setNewQuantity(Number(e.target.value))} 
                            min="0"
                            required 
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เหตุผลในการปรับสต็อก *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            required
                            placeholder="เช่น จากการนับสต็อก, สินค้าชำรุด, อื่นๆ"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        ></textarea>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="adjust-stock-form" className="px-8 py-2 text-base font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">ยืนยันการปรับสต็อก</button>
                </div>
            </div>
        </div>
    );
};

interface StockManagementProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    usedParts: UsedPart[];
    setUsedParts: React.Dispatch<React.SetStateAction<UsedPart[]>>;
    updateUsedPart: (part: UsedPart) => void;
    deleteUsedPart: (partId: string) => void;
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    purchaseRequisitions: PurchaseRequisition[];
    suppliers: Supplier[];
    usedPartBuyers: UsedPartBuyer[];
}

const StockManagement: React.FC<StockManagementProps> = ({ stock, setStock, transactions, setTransactions, usedParts, setUsedParts, updateUsedPart, deleteUsedPart, setPurchaseRequisitions, purchaseRequisitions, suppliers, usedPartBuyers }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'used'>('new');

    // New Stock States
    const [newStockSearchTerm, setNewStockSearchTerm] = useState('');
    const [newStockStatusFilter, setNewStockStatusFilter] = useState('all');
    const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [addingStockItem, setAddingStockItem] = useState<StockItem | null>(null);
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [printingLabelItem, setPrintingLabelItem] = useState<StockItem | null>(null);
    const [adjustingItem, setAdjustingItem] = useState<StockItem | null>(null);
    
    // Used Parts States
    const [usedPartSearchTerm, setUsedPartSearchTerm] = useState('');
    const [usedPartStatusFilter, setUsedPartStatusFilter] = useState<UsedPartBatchStatus | 'all'>('all');
    const [managingUsedPart, setManagingUsedPart] = useState<UsedPart | null>(null);
    const [editingUsedPart, setEditingUsedPart] = useState<UsedPart | null>(null);
    const [receiptPart, setReceiptPart] = useState<UsedPart | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());


    // Purchase Requisition States
    const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
    const [initialRequisitionItem, setInitialRequisitionItem] = useState<PurchaseRequisitionItem | null>(null);


    const { addToast } = useToast();
    
    const pendingPurchaseStockIds = useMemo(() => {
        const activeStatuses: PurchaseRequisitionStatus[] = ['รออนุมัติ', 'อนุมัติแล้ว', 'รอสินค้า'];
        const stockIds = (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => activeStatuses.includes(pr.status))
            .flatMap(pr => (Array.isArray(pr.items) ? pr.items : []))
            .map(item => item.stockId)
            .filter(id => id);
        return new Set(stockIds);
    }, [purchaseRequisitions]);

    const filteredStock = useMemo(() => {
        const getStatusPriority = (status: StockStatus): number => {
            switch (status) {
                case 'หมดสต๊อก': return 0;
                case 'สต๊อกต่ำ': return 1;
                case 'สต๊อกเกิน': return 2;
                case 'ปกติ': return 3;
                default: return 4;
            }
        };

        return stock
            .filter(item => activeCategory === 'ทั้งหมด' || item.category === activeCategory)
            .filter(item => newStockStatusFilter === 'all' || item.status === newStockStatusFilter)
            .filter(item => newStockSearchTerm === '' || item.name.toLowerCase().includes(newStockSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(newStockSearchTerm.toLowerCase()))
            .sort((a, b) => {
                const priorityA = getStatusPriority(a.status);
                const priorityB = getStatusPriority(b.status);
                if (priorityA !== priorityB) return priorityA - priorityB;
                return a.name.localeCompare(b.name);
            });
    }, [stock, activeCategory, newStockSearchTerm, newStockStatusFilter]);

    const filteredUsedParts = useMemo(() => {
        return usedParts
            .filter(part => usedPartStatusFilter === 'all' || part.status === usedPartStatusFilter)
            .filter(part => usedPartSearchTerm === '' || part.name.toLowerCase().includes(usedPartSearchTerm.toLowerCase()) || part.fromRepairOrderNo.toLowerCase().includes(usedPartSearchTerm.toLowerCase()) || part.fromLicensePlate.toLowerCase().includes(usedPartSearchTerm.toLowerCase()))
            .sort((a,b) => new Date(b.dateRemoved).getTime() - new Date(a.dateRemoved).getTime());
    }, [usedParts, usedPartSearchTerm, usedPartStatusFilter]);

    const handleSaveItem = (item: StockItem, extras: { sourceRepairOrderNo?: string }) => {
        const now = new Date().toISOString();
        if (item.id) {
            setStock(prev => prev.map(s => s.id === item.id ? { ...s, ...item } : s));
            addToast(`อัปเดต ${item.name} สำเร็จ`, 'success');
        } else {
            const newItem = { ...item, id: `P${Date.now()}` };
            setStock(prev => [newItem, ...prev]);
            if (newItem.quantity > 0) {
                const newTransaction: StockTransaction = {
                    id: `TXN-${Date.now()}`, stockItemId: newItem.id, stockItemName: newItem.name,
                    type: 'รับเข้า', quantity: newItem.quantity, transactionDate: now, actor: 'ระบบ',
                    notes: 'เพิ่มรายการใหม่เข้าสต๊อก', relatedRepairOrder: extras.sourceRepairOrderNo
                };
                setTransactions(prev => [newTransaction, ...prev]);
            }
            addToast(`เพิ่ม ${newItem.name} สำเร็จ`, 'success');
        }
        setEditModalOpen(false);
    };
    
    const handleAddStock = (data: { stockItem: StockItem; quantityAdded: number; pricePerUnit?: number; notes?: string; sourceRepairOrderNo?: string; requisitionNumber?: string; invoiceNumber?: string; }) => {
        const { stockItem, quantityAdded, pricePerUnit, notes, sourceRepairOrderNo } = data;
        setStock(prev => prev.map(s => {
            if (s.id === stockItem.id) {
                const newQuantity = s.quantity + quantityAdded;
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต๊อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                
                return { ...s, quantity: newQuantity, status: newStatus, price: pricePerUnit ?? s.price };
            }
            return s;
        }));
        
        const newTransaction: StockTransaction = {
            id: `TXN-${Date.now()}`, stockItemId: stockItem.id, stockItemName: stockItem.name, type: 'รับเข้า',
            quantity: quantityAdded, transactionDate: new Date().toISOString(), actor: 'ระบบ',
            notes: notes || `รับเข้าสต๊อก`, relatedRepairOrder: sourceRepairOrderNo, pricePerUnit,
        };
        setTransactions(prev => [newTransaction, ...prev]);
        addToast(`เพิ่มสต็อก ${stockItem.name} จำนวน ${quantityAdded} สำเร็จ`, 'success');
        setAddingStockItem(null);
    };

    const handleDeleteStockItem = (itemId: string, itemName: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ '${itemName}'? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            setStock(prev => prev.filter(s => s.id !== itemId));
            addToast(`ลบ '${itemName}' สำเร็จ`, 'success');
        }
    };

    const handleWithdraw = (data: { stockItemId: string; quantity: number; reason: string; withdrawnBy?: string; notes?: string; }) => {
        const { stockItemId, quantity, reason, withdrawnBy, notes } = data;
        const stockItem = stock.find(s => s.id === stockItemId);
        if (!stockItem) return;

        setStock(prev => prev.map(s => {
            if (s.id === stockItemId) {
                const newQuantity = s.quantity - quantity;
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต๊อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const newTransaction: StockTransaction = {
            id: `TXN-${Date.now()}`, stockItemId: stockItem.id, stockItemName: stockItem.name, type: 'เบิกใช้',
            quantity: -quantity, transactionDate: new Date().toISOString(), actor: withdrawnBy || 'ไม่ระบุ',
            notes: `${reason}${notes ? ` - ${notes}` : ''}`,
        };
        setTransactions(prev => [newTransaction, ...prev]);
        addToast(`เบิก ${stockItem.name} จำนวน ${quantity} สำเร็จ`, 'success');
        setWithdrawModalOpen(false);
    };
    
    const handleReturn = (data: { stockItemId: string; quantity: number; reason?: string; notes?: string; }) => {
        const { stockItemId, quantity, reason, notes } = data;
        const stockItem = stock.find(s => s.id === stockItemId);
        if (!stockItem) return;

        setStock(prev => prev.map(s => {
            if (s.id === stockItemId) {
                const newQuantity = s.quantity - quantity;
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต๊อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const newTransaction: StockTransaction = {
            id: `TXN-${Date.now()}`, stockItemId: stockItem.id, stockItemName: stockItem.name, type: 'คืนร้านค้า',
            quantity: -quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ',
            notes: `${reason}${notes ? ` - ${notes}` : ''}`,
        };
        setTransactions(prev => [newTransaction, ...prev]);
        addToast(`คืน ${stockItem.name} จำนวน ${quantity} สำเร็จ`, 'success');
        setReturnModalOpen(false);
    };

    const handleAdjustStock = (data: { stockItemId: string; newQuantity: number; reason: string; }) => {
        const { stockItemId, newQuantity, reason } = data;
        const stockItem = stock.find(s => s.id === stockItemId);
        if (!stockItem) return;

        const quantityChange = newQuantity - stockItem.quantity;

        setStock(prev => prev.map(s => {
            if (s.id === stockItemId) {
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต๊อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const newTransaction: StockTransaction = {
            id: `TXN-${Date.now()}`,
            stockItemId: stockItem.id,
            stockItemName: stockItem.name,
            type: 'ปรับสต็อก',
            quantity: quantityChange,
            transactionDate: new Date().toISOString(),
            actor: 'ระบบ',
            notes: reason,
        };
        setTransactions(prev => [newTransaction, ...prev]);
        addToast(`ปรับสต็อก ${stockItem.name} เป็น ${newQuantity} ${stockItem.unit} สำเร็จ`, 'success');
        setAdjustingItem(null);
    };

    const handleDeleteUsedPart = (partId: string, partName: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประวัติอะไหล่เก่า '${partName}'? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            deleteUsedPart(partId);
            addToast(`ลบอะไหล่เก่า '${partName}' สำเร็จ`, 'success');
        }
    };
    
    const handleCreateRequisition = (item: StockItem) => {
        const suggestedQuantity = item.maxStock ? item.maxStock - item.quantity : item.minStock;
        const initialItem: PurchaseRequisitionItem = {
            stockId: item.id,
            stockCode: item.code,
            name: item.name,
            quantity: Math.max(1, suggestedQuantity),
            unit: item.unit,
            unitPrice: item.price,
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };
        setInitialRequisitionItem(initialItem);
        setRequisitionModalOpen(true);
    };

    const handleSaveRequisition = (requisition: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date();
        const year = now.getFullYear();

        const currentYearPrs = (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => new Date(pr.createdAt).getFullYear() === year);
        const lastPrNumber = currentYearPrs
            .map(pr => {
                const parts = pr.prNumber.split('-');
                return parts.length === 3 ? parseInt(parts[2], 10) : 0;
            })
            .reduce((max, num) => Math.max(max, num), 0);
        const newSequence = lastPrNumber + 1;
        const newPrNumber = `PR-${year}-${String(newSequence).padStart(5, '0')}`;
        
        const newRequisition: PurchaseRequisition = {
            ...requisition,
            id: `PR-${Date.now()}`,
            prNumber: newPrNumber,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        setPurchaseRequisitions(prev => [newRequisition, ...prev]);
        setRequisitionModalOpen(false);
        setInitialRequisitionItem(null);
        addToast(`สร้างใบขอซื้อ ${newRequisition.prNumber} สำเร็จ`, 'success');
    };

    const handleSaveUsedPartFromModal = (updatedPart: UsedPart) => {
        updateUsedPart(updatedPart); // Update the main state via props
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            newSet.add(updatedPart.id);
            return newSet;
        });
    };
    
    const handleSaveEditedUsedPart = (updatedPart: UsedPart) => {
        updateUsedPart(updatedPart);
        addToast(`อัปเดตข้อมูล ${updatedPart.name} สำเร็จ`, 'success');
        setEditingUsedPart(null);
    };

    const toggleRowExpansion = (partId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(partId)) {
                newSet.delete(partId);
            } else {
                newSet.add(partId);
            }
            return newSet;
        });
    };

    const getNewStockStatusBadge = (status: StockItem['status']) => {
        switch (status) {
            case 'ปกติ': return 'bg-green-100 text-green-800';
            case 'สต๊อกต่ำ': return 'bg-yellow-100 text-yellow-800';
            case 'หมดสต๊อก': return 'bg-red-100 text-red-800';
            case 'สต๊อกเกิน': return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-gray-100';
        }
    };
    const getUsedPartStatusBadge = (status: UsedPartBatchStatus) => {
        switch (status) {
            case 'รอจัดการ': return 'bg-blue-100 text-blue-800';
            case 'จัดการบางส่วน': return 'bg-yellow-100 text-yellow-800';
            case 'จัดการครบแล้ว': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100';
        }
    };

    const getDispositionTypeBadge = (type: UsedPartDisposition['dispositionType']) => {
        switch (type) {
            case 'ขาย': return 'bg-green-100 text-green-800';
            case 'ทิ้ง': return 'bg-red-100 text-red-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            case 'นำไปใช้แล้ว': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100';
        }
    };

    const getDispositionDetails = (disp: UsedPartDisposition) => {
        switch (disp.dispositionType) {
            case 'ขาย': {
                const buyerInfo = disp.soldTo || '';
                const noteInfo = disp.notes ? `(${disp.notes})` : '';
                return [buyerInfo, noteInfo].filter(Boolean).join(' ').trim() || '-';
            }
            case 'เก็บไว้ใช้ต่อ':
                return `ที่เก็บ: ${disp.storageLocation || 'ไม่ได้ระบุ'}`;
            case 'ทิ้ง':
            case 'นำไปใช้แล้ว':
                return disp.notes || '-';
            default:
                return '-';
        }
    };

    const TabButton: React.FC<{ tabId: 'new' | 'used', label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${
                activeTab === tabId
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {label}
        </button>
    );
    
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-t-2xl shadow-sm">
                <div className="border-b">
                    <TabButton tabId="new" label="อะไหล่ใหม่" />
                    <TabButton tabId="used" label="อะไหล่เก่า / รอจัดการ" />
                </div>
            </div>

            {activeTab === 'new' && (
            <div className="bg-white rounded-b-2xl shadow-sm -mt-6">
                <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <div className="flex flex-wrap items-center gap-4">
                            <input
                                type="text" placeholder="ค้นหา (ชื่อ, รหัส)..." value={newStockSearchTerm}
                                onChange={(e) => setNewStockSearchTerm(e.target.value)} className="w-full sm:w-72 p-2 border border-gray-300 rounded-lg text-base"
                            />
                            <select value={newStockStatusFilter} onChange={e => setNewStockStatusFilter(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-base">
                                <option value="all">สถานะทั้งหมด</option>
                                <option value="ปกติ">ปกติ</option>
                                <option value="สต๊อกต่ำ">สต๊อกต่ำ</option>
                                <option value="หมดสต๊อก">หมดสต๊อก</option>
                                <option value="สต๊อกเกิน">สต๊อกเกิน</option>
                            </select>
                            <select value={activeCategory} onChange={e => setActiveCategory(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-base max-w-xs">
                                <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                                {STOCK_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => { setEditingItem(null); setEditModalOpen(true); }} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ เพิ่มอะไหล่ใหม่</button>
                            <button onClick={() => setWithdrawModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">- เบิก (ทั่วไป)</button>
                            <button onClick={() => setReturnModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">↩️ คืนร้านค้า</button>
                        </div>
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase bg-gray-50">รหัส / ชื่อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase bg-gray-50">หมวดหมู่</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase bg-gray-50">คงเหลือ</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase bg-gray-50">ราคา/หน่วย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase bg-gray-50">ตำแหน่ง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase bg-gray-50">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase bg-gray-50">จัดการ</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStock.map(item => {
                            const isPendingPurchase = pendingPurchaseStockIds.has(item.id);
                            const available = item.quantity - (item.quantityReserved || 0);
                            return (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><div className="font-semibold">{item.name}</div><div className="text-sm text-gray-500">{item.code}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="text-base font-bold">{available} {item.unit}</div>
                                    {(item.quantityReserved > 0) && <div className="text-xs text-blue-600"> (จอง {item.quantityReserved})</div>}
                                </td>
                                <td className="px-4 py-3 text-right text-base">{item.price.toLocaleString()}</td>
                                <td className="px-4 py-3 text-base">{item.storageLocation}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNewStockStatusBadge(item.status)}`}>{item.status}</span></td>
                                <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                    <button onClick={() => setAddingStockItem(item)} className="text-green-600 hover:text-green-800 font-medium">เพิ่ม</button>
                                    
                                    {(item.status === 'สต๊อกต่ำ' || item.status === 'หมดสต๊อก') && (
                                        isPendingPurchase ? (
                                            <button 
                                                disabled 
                                                className="text-gray-400 font-medium cursor-not-allowed flex items-center gap-1 italic"
                                                title="รายการนี้มีใบขอซื้อที่ยังไม่เสร็จสิ้นอยู่"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                อยู่ระหว่างขอซื้อ
                                            </button>
                                        ) : (
                                            <button onClick={() => handleCreateRequisition(item)} className="text-indigo-600 hover:text-indigo-800 font-medium">ขอซื้อ</button>
                                        )
                                    )}
                                    <button onClick={() => setAdjustingItem(item)} className="text-teal-600 hover:text-teal-800 font-medium">ปรับสต็อก</button>
                                    <button onClick={() => { setEditingItem(item); setEditModalOpen(true); }} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                    <button onClick={() => setPrintingLabelItem(item)} className="text-blue-600 hover:text-blue-800 font-medium">ฉลาก</button>
                                    <button onClick={() => handleDeleteStockItem(item.id, item.name)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                </td>
                            </tr>
                        )})}
                        {filteredStock.length === 0 && ( <tr><td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {activeTab === 'used' && (
            <>
                <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <input
                            type="text" placeholder="ค้นหา (ชื่อ, เลขที่ซ่อม, ทะเบียน)..." value={usedPartSearchTerm}
                            onChange={(e) => setUsedPartSearchTerm(e.target.value)} className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                        />
                        <select value={usedPartStatusFilter} onChange={e => setUsedPartStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="รอจัดการ">รอจัดการ</option>
                            <option value="จัดการบางส่วน">จัดการบางส่วน</option>
                            <option value="จัดการครบแล้ว">จัดการครบแล้ว</option>
                        </select>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 w-12"></th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ถอด</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม/ทะเบียน)</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวนเริ่มต้น</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">คงเหลือ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsedParts.map(part => {
                            const initialQty = part.initialQuantity ?? 0;
                            const disposedFromInitialBatchQty = (part.dispositions || [])
                                .filter(d => ['ขาย', 'ทิ้ง', 'เก็บไว้ใช้ต่อ'].includes(d.dispositionType))
                                .reduce((sum, d) => sum + (d.quantity || 0), 0);
                            const remainingQuantity = initialQty - disposedFromInitialBatchQty;
                            const isExpanded = expandedRows.has(part.id);

                            return (
                                <React.Fragment key={part.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-2 py-3 text-center">
                                            <button onClick={() => toggleRowExpansion(part.id)} className="p-1 rounded-full hover:bg-gray-200">
                                                <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-base">{new Date(part.dateRemoved).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3 font-semibold">{part.name}</td>
                                        <td className="px-4 py-3"><div className="font-medium">{part.fromRepairOrderNo}</div><div className="text-sm text-gray-500">{part.fromLicensePlate}</div></td>
                                        <td className="px-4 py-3 text-right text-base">{initialQty} {part.unit}</td>
                                        <td className="px-4 py-3 text-right text-base font-bold">{remainingQuantity} {part.unit}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUsedPartStatusBadge(part.status)}`}>{part.status}</span></td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                                            <button onClick={() => setManagingUsedPart(part)} className="text-blue-600 hover:text-blue-800 font-medium">จัดการ</button>
                                            <button onClick={() => setEditingUsedPart(part)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                            <button onClick={() => handleDeleteUsedPart(part.id, part.name)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={8} className="p-4">
                                                <h4 className="font-semibold text-gray-700 mb-2">ประวัติการจัดการ</h4>
                                                {(part.dispositions && part.dispositions.length > 0) ? (
                                                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
                                                        <thead className="bg-gray-200">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">วันที่</th>
                                                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">ดำเนินการ</th>
                                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 uppercase">จำนวน</th>
                                                                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 uppercase">ราคาขาย/หน่วย</th>
                                                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">ผู้ซื้อ / ที่เก็บ / หมายเหตุ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {part.dispositions.map(d => (
                                                                <tr key={d.id}>
                                                                    <td className="px-2 py-2 text-sm">{new Date(d.date).toLocaleDateString('th-TH')}</td>
                                                                    <td className="px-2 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${getDispositionTypeBadge(d.dispositionType)}`}>{d.dispositionType}</span></td>
                                                                    <td className="px-2 py-2 text-right text-sm">{d.quantity} {part.unit}</td>
                                                                    <td className="px-2 py-2 text-right text-sm">{d.salePricePerUnit?.toLocaleString() || '-'}</td>
                                                                    <td className="px-2 py-2 text-sm">
                                                                        {getDispositionDetails(d)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="text-center text-gray-500 py-4">ยังไม่มีประวัติการจัดการ</p>}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                         {filteredUsedParts.length === 0 && ( <tr><td colSpan={8} className="text-center py-10 text-gray-500">ไม่พบข้อมูลอะไหล่เก่า</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </>
            )}

            {isEditModalOpen && <StockModal item={editingItem} onSave={handleSaveItem} onClose={() => setEditModalOpen(false)} existingStock={stock} />}
            {addingStockItem && <AddStockModal item={addingStockItem} onSave={handleAddStock} onClose={() => setAddingStockItem(null)} />}
            {isWithdrawModalOpen && <StockWithdrawalModal stock={stock} onSave={handleWithdraw} onClose={() => setWithdrawModalOpen(false)} />}
            {isReturnModalOpen && <ReturnStockModal stock={stock} onSave={handleReturn} onClose={() => setReturnModalOpen(false)} />}
            {printingLabelItem && <PrintLabelModal item={printingLabelItem} onClose={() => setPrintingLabelItem(null)} />}
            {adjustingItem && <StockAdjustmentModal item={adjustingItem} onSave={handleAdjustStock} onClose={() => setAdjustingItem(null)} />}
            {managingUsedPart && <ManageUsedPartBatchModal part={managingUsedPart} buyers={usedPartBuyers} onSave={handleSaveUsedPartFromModal} onClose={() => setManagingUsedPart(null)} />}
            {editingUsedPart && <EditUsedPartBatchModal part={editingUsedPart} onSave={handleSaveEditedUsedPart} onClose={() => setEditingUsedPart(null)} />}
            {receiptPart && <UsedPartSaleReceiptModal part={receiptPart} onClose={() => setReceiptPart(null)} />}
            {requisitionModalOpen && (
                <PurchaseRequisitionModal
                    isOpen={requisitionModalOpen}
                    onClose={() => {
                        setRequisitionModalOpen(false);
                        setInitialRequisitionItem(null);
                    }}
                    onSave={handleSaveRequisition}
                    stockItems={stock}
                    initialItem={initialRequisitionItem}
                    suppliers={suppliers}
                />
            )}
        </div>
    );
};

export default StockManagement;