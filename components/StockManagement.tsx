import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { StockItem, StockStatus, StockTransaction, UsedPart, PurchaseRequisition, Supplier, UsedPartBuyer, PurchaseRequisitionItem, UsedPartBatchStatus, Repair, PurchaseRequisitionStatus } from '../types';
import StockModal from './StockModal';
import ReceiveFromPOModal from './ReceiveFromPOModal';
import StockWithdrawalModal from './StockWithdrawalModal';
import ReturnStockModal from './ReturnStockModal';
import PrintLabelModal from './PrintLabelModal';
import ManageUsedPartBatchModal from './ManageUsedPartBatchModal';
import EditUsedPartBatchModal from './EditUsedPartBatchModal';
import UpdateUsedPartStatusModal from './UpdateUsedPartStatusModal';
import CreatePRFromStockModal from './CreatePRFromStockModal';
import { useToast } from '../context/ToastContext';
import { STOCK_CATEGORIES } from '../data/categories';
import { promptForPassword } from '../utils';

type ReservationInfo = {
    repairOrderNo: string;
    licensePlate: string;
    quantity: number;
};

interface ReservationModalProps {
    reservations: ReservationInfo[];
    onClose: () => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ reservations, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
                <h4 className="font-bold text-lg">รายการที่จอง</h4>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <ul className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {reservations.map((res, index) => (
                    <li key={index} className="text-base p-2 bg-gray-50 rounded-md">
                        <div className="font-semibold text-blue-600">{res.repairOrderNo}</div>
                        <div className="text-sm text-gray-700">ทะเบียน: {res.licensePlate} - จำนวน: {res.quantity} ชิ้น</div>
                    </li>
                ))}
            </ul>
            <div className="p-4 border-t flex justify-end">
                <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">ปิด</button>
            </div>
        </div>
    </div>
);


interface StockManagementProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    usedParts: UsedPart[];
    updateUsedPart: (partToUpdate: UsedPart) => void;
    deleteUsedPart: (partId: string) => void;
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    purchaseRequisitions: PurchaseRequisition[];
    suppliers: Supplier[];
    usedPartBuyers: UsedPartBuyer[];
    setUsedParts: React.Dispatch<React.SetStateAction<UsedPart[]>>;
    repairs: Repair[];
}

const StockManagement: React.FC<StockManagementProps> = ({
    stock, setStock, transactions, setTransactions,
    usedParts, updateUsedPart, deleteUsedPart,
    setPurchaseRequisitions, purchaseRequisitions,
    suppliers, usedPartBuyers, setUsedParts,
    repairs
}) => {
    // General State
    const [activeTab, setActiveTab] = useState<'stock' | 'usedParts'>('stock');
    const { addToast } = useToast();

    // Modals State
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);

    const [isReceiveFromPOModalOpen, setReceiveFromPOModalOpen] = useState(false);
    
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [itemToPrint, setItemToPrint] = useState<StockItem | null>(null);
    
    const [isManageUsedPartModalOpen, setManageUsedPartModalOpen] = useState(false);
    const [partToManage, setPartToManage] = useState<UsedPart | null>(null);

    const [isEditUsedPartModalOpen, setEditUsedPartModalOpen] = useState(false);
    const [partToEdit, setPartToEdit] = useState<UsedPart | null>(null);

    const [isUpdateUsedPartStatusModalOpen, setUpdateUsedPartStatusModalOpen] = useState(false);
    const [partToUpdateStatus, setPartToUpdateStatus] = useState<UsedPart | null>(null);
    
    const [reservationsToShow, setReservationsToShow] = useState<ReservationInfo[] | null>(null);
    const [itemToRequest, setItemToRequest] = useState<StockItem | null>(null);


    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
    
    // Memoized Data
    const safeStock = useMemo(() => Array.isArray(stock) ? stock : [], [stock]);
    const safeUsedParts = useMemo(() => Array.isArray(usedParts) ? usedParts : [], [usedParts]);
    
    const activePRStockIds = useMemo(() => {
        const ids = new Set<string>();
        const activeStatuses: PurchaseRequisitionStatus[] = ['ฉบับร่าง', 'รออนุมัติ', 'อนุมัติแล้ว', 'รอสินค้า'];
        (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => activeStatuses.includes(pr.status))
            .forEach(pr => {
                (pr.items || []).forEach(item => {
                    if (item.stockId) {
                        ids.add(item.stockId);
                    }
                });
            });
        return ids;
    }, [purchaseRequisitions]);

    const filteredStock = useMemo(() => {
        return safeStock
            .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
            .filter(item => statusFilter === 'all' || item.status === statusFilter)
            .filter(item => searchTerm === '' ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [safeStock, searchTerm, categoryFilter, statusFilter]);
    
    const filteredUsedParts = useMemo(() => {
        return safeUsedParts
            .filter(part => searchTerm === '' ||
                part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.dateRemoved).getTime() - new Date(a.dateRemoved).getTime());
    }, [safeUsedParts, searchTerm]);
    
    // Handlers
    const handleOpenStockModal = (item: StockItem | null = null) => {
        setEditingItem(item);
        setStockModalOpen(true);
    };

    const handleSaveItem = (itemData: StockItem, extras: { sourceRepairOrderNo?: string }) => {
        const now = new Date().toISOString();
        if (itemData.id) { // Editing
            const originalItem = safeStock.find(s => s.id === itemData.id);
            if (originalItem && originalItem.quantity !== itemData.quantity) {
                const difference = itemData.quantity - originalItem.quantity;
                const newTransaction: StockTransaction = {
                    id: `TXN-ADJ-${Date.now()}`,
                    stockItemId: itemData.id,
                    stockItemName: itemData.name,
                    type: 'ปรับสต็อก',
                    quantity: difference,
                    transactionDate: now,
                    actor: 'ผู้ดูแลระบบ',
                    notes: `แก้ไขจากหน้าสต็อก: ปรับจาก ${originalItem.quantity} เป็น ${itemData.quantity}`,
                    pricePerUnit: itemData.price,
                };
                setTransactions(prev => [newTransaction, ...(Array.isArray(prev) ? prev : [])]);
                addToast(`ปรับสต็อก ${itemData.name} จำนวน ${difference > 0 ? '+' : ''}${difference} ${itemData.unit}`, 'info');
            }
    
            setStock(prev => prev.map(s => s.id === itemData.id ? itemData : s));
            addToast(`อัปเดต ${itemData.name} สำเร็จ`, 'success');
        } else { // Adding
            const newItem = { ...itemData, id: `STK-${Date.now()}` };
            setStock(prev => [newItem, ...prev]);
            
            // Create initial transaction if quantity > 0
            if (newItem.quantity > 0) {
                const newTransaction: StockTransaction = {
                    id: `TXN-${Date.now()}`,
                    stockItemId: newItem.id,
                    stockItemName: newItem.name,
                    type: 'รับเข้า',
                    quantity: newItem.quantity,
                    transactionDate: now,
                    actor: 'ระบบ (เพิ่มใหม่)',
                    notes: extras.sourceRepairOrderNo ? `จากใบซ่อม ${extras.sourceRepairOrderNo}` : 'เพิ่มรายการใหม่ในคลัง',
                    pricePerUnit: newItem.price,
                };
                setTransactions(prev => [newTransaction, ...prev]);
            }
            addToast(`เพิ่ม ${newItem.name} สำเร็จ`, 'success');
        }
        setStockModalOpen(false);
    };
    
    const handleDeleteItem = (itemId: string, itemName: string) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemName}" ออกจากสต็อก?`)) {
            setStock(prev => prev.filter(s => s.id !== itemId));
            addToast(`ลบ ${itemName} สำเร็จ`, 'info');
        }
    };
    
    const handleWithdrawStock = (data: { stockItemId: string, quantity: number, reason: string, withdrawnBy?: string }) => {
        setStock(prevStock => prevStock.map(s => {
            if (s.id === data.stockItemId) {
                const newQuantity = s.quantity - data.quantity;
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต็อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));
        
        const stockItem = safeStock.find(s => s.id === data.stockItemId);
        if (stockItem) {
             const year = new Date().getFullYear();
             const wdTransactionsThisYear = (Array.isArray(transactions) ? transactions : [])
                .filter(t => t.documentNumber && t.documentNumber.startsWith(`WD-${year}`));
             const lastNumber = wdTransactionsThisYear
                .map(t => parseInt(t.documentNumber!.split('-')[2], 10))
                .reduce((max, num) => Math.max(max, num), 0);
             const newDocumentNumber = `WD-${year}-${String(lastNumber + 1).padStart(5, '0')}`;

             const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}`,
                stockItemId: stockItem.id,
                stockItemName: stockItem.name,
                type: 'เบิกใช้',
                quantity: -data.quantity,
                transactionDate: new Date().toISOString(),
                actor: data.withdrawnBy || 'ไม่ระบุ',
                notes: `เหตุผล: ${data.reason}`,
                documentNumber: newDocumentNumber,
                pricePerUnit: stockItem.price,
            };
            setTransactions(prev => [newTransaction, ...prev]);
            addToast(`เบิก ${stockItem.name} สำเร็จ (เลขที่: ${newDocumentNumber})`, 'success');
        }
        setWithdrawModalOpen(false);
    };

    const handleReturnStock = (data: { stockItemId: string, quantity: number, reason?: string }) => {
        setStock(prevStock => prevStock.map(s => {
            if (s.id === data.stockItemId) {
                const newQuantity = s.quantity - data.quantity;
                let newStatus: StockStatus = 'ปกติ';
                if (newQuantity <= 0) newStatus = 'หมดสต็อก';
                else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const stockItem = safeStock.find(s => s.id === data.stockItemId);
        if (stockItem) {
            const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}`,
                stockItemId: stockItem.id,
                stockItemName: stockItem.name,
                type: 'คืนร้านค้า',
                quantity: -data.quantity,
                transactionDate: new Date().toISOString(),
                actor: 'เจ้าหน้าที่',
                notes: `เหตุผล: ${data.reason || 'ไม่ระบุ'}`,
                pricePerUnit: stockItem.price,
            };
            setTransactions(prev => [newTransaction, ...prev]);
            addToast(`คืน ${stockItem.name} จำนวน ${data.quantity} สำเร็จ`, 'success');
        }
        setReturnModalOpen(false);
    };
    
    const handleIconClick = (event: React.MouseEvent<HTMLDivElement>, itemId: string) => {
        event.stopPropagation();

        const activeRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status));
        const reservations: ReservationInfo[] = [];

        for (const repair of activeRepairs) {
            for (const part of (repair.parts || [])) {
                if (part.partId === itemId && part.source === 'สต็อกอู่') {
                    reservations.push({
                        repairOrderNo: repair.repairOrderNo,
                        licensePlate: repair.licensePlate,
                        quantity: part.quantity
                    });
                }
            }
        }
        
        if (reservations.length > 0) {
            setReservationsToShow(reservations);
        } else {
            addToast('ไม่พบข้อมูลการจองสำหรับรายการนี้', 'info');
        }
    };

    const handleSavePurchaseRequest = (data: { supplier: string; quantity: number; notes: string; }) => {
        if (!itemToRequest) return;

        const now = new Date();
        const year = now.getFullYear();

        const newPrItem: PurchaseRequisitionItem = {
            stockId: itemToRequest.id,
            stockCode: itemToRequest.code,
            name: itemToRequest.name,
            quantity: data.quantity,
            unit: itemToRequest.unit,
            unitPrice: itemToRequest.price,
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };

        const totalAmount = newPrItem.quantity * newPrItem.unitPrice;

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
            id: `PR-${Date.now()}`,
            prNumber: newPrNumber,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            requesterName: 'ระบบ (จากหน้าสต็อก)',
            department: 'แผนกซ่อมบำรุง',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: data.supplier,
            status: 'รออนุมัติ', // Go straight to pending approval
            items: [newPrItem],
            totalAmount: totalAmount,
            notes: data.notes,
            approvalDate: null,
            requestType: 'Product',
            budgetStatus: 'Have Budget',
        };

        setPurchaseRequisitions(prev => [newRequisition, ...(Array.isArray(prev) ? prev : [])]);
        addToast(`สร้างใบขอซื้อสำหรับ ${itemToRequest.name} สำเร็จ`, 'success');
        setItemToRequest(null);
    };

    
    const handleDeleteUsedPart = (partId: string) => {
        if (promptForPassword('ลบ')) {
            deleteUsedPart(partId);
        }
    };

    const getUsedPartRemaining = (part: UsedPart) => {
        const disposed = (part.dispositions || []).reduce((sum, d) => sum + d.quantity, 0);
        return (part.initialQuantity || 0) - disposed;
    };

    const getStatusBadge = (status: StockStatus) => {
        switch (status) {
            case 'สต๊อกต่ำ': return 'bg-yellow-100 text-yellow-800';
            case 'หมดสต็อก': return 'bg-red-100 text-red-800';
            case 'สต๊อกเกิน': return 'bg-purple-100 text-purple-800';
            default: return 'bg-green-100 text-green-800';
        }
    };
    
    const getUsedPartStatusBadge = (status: UsedPartBatchStatus) => {
        switch (status) {
            case 'รอจัดการ': return 'bg-gray-200 text-gray-800';
            case 'จัดการบางส่วน': return 'bg-blue-100 text-blue-800';
            case 'จัดการครบแล้ว': return 'bg-green-100 text-green-800';
        }
    };

    // Tab Button Component
    const TabButton: React.FC<{ tabId: 'stock' | 'usedParts', label: string, count: number }> = ({ tabId, label, count }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${
                activeTab === tabId
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {label} <span className="text-sm font-normal bg-gray-200 rounded-full px-2 py-0.5">{count}</span>
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-t-2xl shadow-sm">
                <div className="border-b">
                    <TabButton tabId="stock" label="คลังอะไหล่ใหม่" count={safeStock.length} />
                    <TabButton tabId="usedParts" label="คลังอะไหล่เก่า" count={safeUsedParts.length} />
                </div>
            </div>
            
            {activeTab === 'stock' ? (
                <>
                <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" placeholder="ค้นหา (รหัส, ชื่อ)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg lg:col-span-2" />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="all">ทุกหมวดหมู่</option>
                            {STOCK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="all">ทุกสถานะ</option>
                            <option value="ปกติ">ปกติ</option>
                            <option value="สต๊อกต่ำ">สต๊อกต่ำ</option>
                            <option value="หมดสต็อก">หมดสต็อก</option>
                            <option value="สต๊อกเกิน">สต๊อกเกิน</option>
                        </select>
                    </div>
                     <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleOpenStockModal()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"> + เพิ่มรายการใหม่</button>
                        <button onClick={() => setReceiveFromPOModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-400">รับเข้าสต็อก (จากใบขอซื้อ)</button>
                        <button onClick={() => setWithdrawModalOpen(true)} disabled={safeStock.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-gray-400">เบิกใช้ทั่วไป</button>
                        <button onClick={() => setReturnModalOpen(true)} disabled={safeStock.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:bg-gray-400">คืนร้านค้า</button>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh] relative">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">สต็อก (พร้อมใช้)</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ขั้นต่ำ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคาทุน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStock.map(item => {
                                const available = item.quantity - (item.quantityReserved || 0);
                                const needsPurchase = available <= item.minStock;
                                const isRequested = activePRStockIds.has(item.id);
                                return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><div className="font-semibold">{item.name}</div><div className="text-sm text-gray-500 font-mono">{item.code}</div></td>
                                    <td className="px-4 py-3 text-sm">{item.category}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className={`font-bold text-lg ${available <= item.minStock ? 'text-red-600' : ''}`}>{available} {item.unit}</span>
                                            {(item.quantityReserved || 0) > 0 && (
                                                <div 
                                                    className="inline-block" 
                                                    onClick={(e) => handleIconClick(e, item.id)}
                                                    title={`มีจองอยู่ ${item.quantityReserved || 0} ชิ้น`}
                                                >
                                                    <span className="cursor-pointer">🔍</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">{item.minStock}</td>
                                    <td className="px-4 py-3 text-right text-sm">{item.price.toLocaleString()}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap space-x-1">
                                        <button onClick={() => {
                                            if (promptForPassword('แก้ไข')) {
                                                handleOpenStockModal(item);
                                            }
                                        }} className="text-yellow-600 hover:text-yellow-800 p-1 text-xs font-semibold">แก้</button>
                                        {isRequested ? (
                                            <span className="text-blue-500 p-1 text-xs font-semibold italic">ขอซื้อแล้ว</span>
                                        ) : (
                                            <button 
                                                onClick={() => setItemToRequest(item)} 
                                                className="text-green-600 hover:text-green-800 p-1 text-xs font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
                                                disabled={!needsPurchase}
                                                title={needsPurchase ? "สร้างใบขอซื้อสำหรับรายการนี้" : "สต็อกยังไม่ถึงจุดสั่งซื้อ"}
                                            >
                                                ขอซื้อ
                                            </button>
                                        )}
                                        <button onClick={() => { setItemToPrint(item); setPrintModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1 text-xs font-semibold">พิมพ์</button>
                                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-red-500 hover:text-red-700 p-1 text-xs font-semibold">ลบ</button>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                </>
            ) : (
                <>
                <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6">
                    <input type="text" placeholder="ค้นหา (ชื่อ, เลขที่ซ่อม, ทะเบียน)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่ / วันที่ถอด</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม / ทะเบียน)</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน (เริ่มต้น / คงเหลือ)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsedParts.map(part => (
                                <tr key={part.id}>
                                    <td className="px-4 py-3"><div className="font-semibold">{part.name}</div><div className="text-sm text-gray-500">{new Date(part.dateRemoved).toLocaleDateString('th-TH')}</div></td>
                                    <td className="px-4 py-3"><div className="font-medium">{part.fromRepairOrderNo}</div><div className="text-sm text-gray-500">{part.fromLicensePlate}</div></td>
                                    <td className="px-4 py-3 text-right"><div className="font-bold text-lg">{part.initialQuantity}</div><div className="text-sm text-gray-500">เหลือ: {getUsedPartRemaining(part)}</div></td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUsedPartStatusBadge(part.status)}`}>{part.status}</span></td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap space-x-1">
                                        <button onClick={() => {
                                            if (promptForPassword('จัดการ')) {
                                                setPartToManage(part); setManageUsedPartModalOpen(true);
                                            }
                                        }} className="text-green-600 hover:text-green-800 p-1 text-xs font-semibold">จัดการ</button>
                                        <button onClick={() => {
                                            if (promptForPassword('อัปเดตสถานะ')) {
                                                setPartToUpdateStatus(part); setUpdateUsedPartStatusModalOpen(true);
                                            }
                                        }} className="text-blue-600 hover:text-blue-800 p-1 text-xs font-semibold">สถานะ</button>
                                        <button onClick={() => {
                                            if (promptForPassword('แก้ไข')) {
                                                setPartToEdit(part); setEditUsedPartModalOpen(true);
                                            }
                                        }} className="text-yellow-600 hover:text-yellow-800 p-1 text-xs font-semibold">แก้</button>
                                        <button onClick={() => handleDeleteUsedPart(part.id)} className="text-red-500 hover:text-red-700 p-1 text-xs font-semibold">ลบ</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {/* Modals */}
            {isStockModalOpen && <StockModal item={editingItem} onSave={handleSaveItem} onClose={() => setStockModalOpen(false)} existingStock={safeStock} />}
            {isReceiveFromPOModalOpen && (
                <ReceiveFromPOModal
                    isOpen={isReceiveFromPOModalOpen}
                    onClose={() => setReceiveFromPOModalOpen(false)}
                    purchaseRequisitions={purchaseRequisitions}
                    setPurchaseRequisitions={setPurchaseRequisitions}
                    setStock={setStock}
                    setTransactions={setTransactions}
                />
            )}
            {isWithdrawModalOpen && <StockWithdrawalModal stock={safeStock} onSave={handleWithdrawStock} onClose={() => setWithdrawModalOpen(false)} />}
            {isReturnModalOpen && <ReturnStockModal stock={safeStock} onSave={handleReturnStock} onClose={() => setReturnModalOpen(false)} />}
            {isPrintModalOpen && itemToPrint && <PrintLabelModal item={itemToPrint} onClose={() => setPrintModalOpen(false)} />}
            {isManageUsedPartModalOpen && partToManage && <ManageUsedPartBatchModal part={partToManage} onSave={updateUsedPart} onClose={() => setManageUsedPartModalOpen(false)} buyers={usedPartBuyers} />}
            {isEditUsedPartModalOpen && partToEdit && <EditUsedPartBatchModal part={partToEdit} onSave={updateUsedPart} onClose={() => setEditUsedPartModalOpen(false)} />}
            {isUpdateUsedPartStatusModalOpen && partToUpdateStatus && <UpdateUsedPartStatusModal usedPart={partToUpdateStatus} onSave={updateUsedPart} onClose={() => setUpdateUsedPartStatusModalOpen(false)} />}
            
            {itemToRequest && (
                <CreatePRFromStockModal
                    item={itemToRequest}
                    suppliers={suppliers}
                    onSave={handleSavePurchaseRequest}
                    onClose={() => setItemToRequest(null)}
                />
            )}

            {reservationsToShow && (
                <ReservationModal 
                    reservations={reservationsToShow} 
                    onClose={() => setReservationsToShow(null)} 
                />
            )}
        </div>
    );
};

export default StockManagement;