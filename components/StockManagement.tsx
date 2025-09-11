import React, { useState, useMemo } from 'react';
import type { StockItem, StockTransaction, StockStatus, UsedPart, UsedPartStatus, PurchaseRequisition, PurchaseRequisitionItem } from '../types';
import StockModal from './StockModal';
import AddStockModal from './AddStockModal';
import StockWithdrawalModal from './StockWithdrawalModal';
import ReturnStockModal from './ReturnStockModal';
import PrintLabelModal from './PrintLabelModal';
import UpdateUsedPartStatusModal from './UpdateUsedPartStatusModal';
import PurchaseRequisitionModal from './PurchaseRequisitionModal';
import { useToast } from '../context/ToastContext';

interface StockManagementProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    usedParts: UsedPart[];
    updateUsedPart: (part: UsedPart) => void;
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    purchaseRequisitions: PurchaseRequisition[];
}

const StockManagement: React.FC<StockManagementProps> = ({ stock, setStock, transactions, setTransactions, usedParts, updateUsedPart, setPurchaseRequisitions, purchaseRequisitions }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'used'>('new');

    // New Stock States
    const [newStockSearchTerm, setNewStockSearchTerm] = useState('');
    const [newStockStatusFilter, setNewStockStatusFilter] = useState('all');
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [addingStockItem, setAddingStockItem] = useState<StockItem | null>(null);
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [printingLabelItem, setPrintingLabelItem] = useState<StockItem | null>(null);
    
    // Used Parts States
    const [usedPartSearchTerm, setUsedPartSearchTerm] = useState('');
    const [usedPartStatusFilter, setUsedPartStatusFilter] = useState<UsedPartStatus | 'all'>('all');
    const [editingUsedPart, setEditingUsedPart] = useState<UsedPart | null>(null);

    // Purchase Requisition States
    const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
    const [initialRequisitionItem, setInitialRequisitionItem] = useState<PurchaseRequisitionItem | null>(null);


    const { addToast } = useToast();

    // Memoized Filters
    const filteredStock = useMemo(() => {
        return stock
            .filter(item => newStockStatusFilter === 'all' || item.status === newStockStatusFilter)
            .filter(item => newStockSearchTerm === '' || item.name.toLowerCase().includes(newStockSearchTerm.toLowerCase()) || item.code.toLowerCase().includes(newStockSearchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [stock, newStockSearchTerm, newStockStatusFilter]);

    const filteredUsedParts = useMemo(() => {
        return usedParts
            .filter(part => usedPartStatusFilter === 'all' || part.status === usedPartStatusFilter)
            .filter(part => usedPartSearchTerm === '' || part.name.toLowerCase().includes(usedPartSearchTerm.toLowerCase()) || part.fromRepairOrderNo.toLowerCase().includes(usedPartSearchTerm.toLowerCase()) || part.fromLicensePlate.toLowerCase().includes(usedPartSearchTerm.toLowerCase()))
            .sort((a,b) => new Date(b.dateRemoved).getTime() - new Date(a.dateRemoved).getTime());
    }, [usedParts, usedPartSearchTerm, usedPartStatusFilter]);


    // Handlers for New Stock
    const handleSaveItem = (item: StockItem, extras: { sourceRepairOrderNo?: string }) => {
        const now = new Date().toISOString();
        if (item.id) { // Edit
            setStock(prev => prev.map(s => s.id === item.id ? item : s));
            addToast(`อัปเดต ${item.name} สำเร็จ`, 'success');
        } else { // Add
            const newItem = { ...item, id: `P${Date.now()}` };
            setStock(prev => [newItem, ...prev]);
            if (newItem.quantity > 0) {
                const newTransaction: StockTransaction = {
                    id: `TXN-${Date.now()}`, stockItemId: newItem.id, stockItemName: newItem.name,
                    type: 'รับเข้า', quantity: newItem.quantity, transactionDate: now, actor: 'ระบบ',
                    notes: 'เพิ่มรายการใหม่เข้าสต็อก', relatedRepairOrder: extras.sourceRepairOrderNo
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
            notes: notes || `รับเข้าสต็อก`, relatedRepairOrder: sourceRepairOrderNo, pricePerUnit,
        };
        setTransactions(prev => [newTransaction, ...prev]);

        addToast(`เพิ่มสต็อก ${stockItem.name} จำนวน ${quantityAdded} สำเร็จ`, 'success');
        setAddingStockItem(null);
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

    // Handler for Used Parts
    const handleUpdateUsedPart = (part: UsedPart) => {
        updateUsedPart(part);
        setEditingUsedPart(null);
    }

    // Handler for Purchase Requisition
    const handleCreateRequisition = (item: StockItem) => {
        const suggestedQuantity = item.maxStock ? item.maxStock - item.quantity : item.minStock;
        const initialItem: PurchaseRequisitionItem = {
            stockId: item.id,
            stockCode: item.code,
            name: item.name,
            quantity: Math.max(1, suggestedQuantity),
            unit: item.unit,
            unitPrice: item.price,
            // FIX: Property 'deliveryOrServiceDate' is missing in type 'PurchaseRequisitionItem'.
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };
        setInitialRequisitionItem(initialItem);
        setRequisitionModalOpen(true);
    };

    const handleSaveRequisition = (requisition: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date();
        const year = now.getFullYear();

        // New PR numbering logic
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
        addToast(`สร้างใบขอซื้อ ${newRequisition.prNumber} สำเร็จ`, 'success');
    };

    // Badge Styles
    const getNewStockStatusBadge = (status: StockItem['status']) => {
        switch (status) {
            case 'ปกติ': return 'bg-green-100 text-green-800';
            case 'สต๊อกต่ำ': return 'bg-yellow-100 text-yellow-800';
            case 'หมดสต๊อก': return 'bg-red-100 text-red-800';
            case 'สต๊อกเกิน': return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-gray-100';
        }
    };
    const getUsedPartStatusBadge = (status: UsedPartStatus) => {
        switch (status) {
            case 'รอจำหน่าย': return 'bg-blue-100 text-blue-800';
            case 'รอทำลาย': return 'bg-orange-100 text-orange-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            case 'จำหน่ายแล้ว': return 'bg-green-100 text-green-800';
            case 'ทำลายแล้ว': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100';
        }
    }
    const getUsedPartConditionBadge = (condition: UsedPart['condition']) => {
        switch (condition) {
            case 'ดี': return 'text-green-600';
            case 'พอใช้': return 'text-yellow-600';
            case 'ชำรุด': return 'text-red-600';
            default: return 'text-gray-600';
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
            <>
                <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <input
                            type="text" placeholder="ค้นหา (ชื่อ, รหัส)..." value={newStockSearchTerm}
                            onChange={(e) => setNewStockSearchTerm(e.target.value)} className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                        />
                        <select value={newStockStatusFilter} onChange={e => setNewStockStatusFilter(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-base">
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="ปกติ">ปกติ</option>
                            <option value="สต๊อกต่ำ">สต๊อกต่ำ</option>
                            <option value="หมดสต๊อก">หมดสต๊อก</option>
                            <option value="สต๊อกเกิน">สต๊อกเกิน</option>
                        </select>
                    </div>
                    <div className="space-x-2">
                        <button onClick={() => { setEditingItem(null); setEditModalOpen(true); }} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ เพิ่มอะไหล่ใหม่</button>
                        <button onClick={() => setWithdrawModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">- เบิก (ทั่วไป)</button>
                        <button onClick={() => setReturnModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">↩️ คืนร้านค้า</button>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">คงเหลือ</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ตำแหน่ง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStock.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><div className="font-semibold">{item.name}</div><div className="text-sm text-gray-500">{item.code}</div></td>
                                <td className="px-4 py-3 text-base">{item.category}</td>
                                <td className="px-4 py-3 text-right text-base font-bold">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-3 text-right text-base">{item.price.toLocaleString()}</td>
                                <td className="px-4 py-3 text-base">{item.storageLocation}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNewStockStatusBadge(item.status)}`}>{item.status}</span></td>
                                <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                    <button onClick={() => setAddingStockItem(item)} className="text-green-600 hover:text-green-800 font-medium">เพิ่ม</button>
                                    {(item.status === 'สต๊อกต่ำ' || item.status === 'หมดสต๊อก') && 
                                        <button onClick={() => handleCreateRequisition(item)} className="text-indigo-600 hover:text-indigo-800 font-medium">ขอซื้อ</button>
                                    }
                                    <button onClick={() => { setEditingItem(item); setEditModalOpen(true); }} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                    <button onClick={() => setPrintingLabelItem(item)} className="text-blue-600 hover:text-blue-800 font-medium">ฉลาก</button>
                                </td>
                            </tr>
                        ))}
                        {filteredStock.length === 0 && ( <tr><td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </>
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
                            <option value="รอจำหน่าย">รอจำหน่าย</option>
                            <option value="รอทำลาย">รอทำลาย</option>
                            <option value="เก็บไว้ใช้ต่อ">เก็บไว้ใช้ต่อ</option>
                            <option value="จำหน่ายแล้ว">จำหน่ายแล้ว</option>
                            <option value="ทำลายแล้ว">ทำลายแล้ว</option>
                        </select>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ถอด</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม/ทะเบียน)</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สภาพ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะจัดการ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsedParts.map(part => (
                            <tr key={part.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-base">{new Date(part.dateRemoved).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-3"><div className="font-semibold">{part.name}</div><div className="text-sm text-gray-500">{part.notes}</div></td>
                                <td className="px-4 py-3"><div className="font-medium">{part.fromRepairOrderNo}</div><div className="text-sm text-gray-500">{part.fromLicensePlate}</div></td>
                                <td className={`px-4 py-3 text-base font-semibold ${getUsedPartConditionBadge(part.condition)}`}>{part.condition}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUsedPartStatusBadge(part.status)}`}>{part.status}</span></td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => setEditingUsedPart(part)} className="text-yellow-600 hover:text-yellow-800 font-medium">อัปเดตสถานะ</button>
                                </td>
                            </tr>
                        ))}
                         {filteredUsedParts.length === 0 && ( <tr><td colSpan={6} className="text-center py-10 text-gray-500">ไม่พบข้อมูลอะไหล่เก่า</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </>
            )}

            {isEditModalOpen && <StockModal item={editingItem} onSave={handleSaveItem} onClose={() => setEditModalOpen(false)} />}
            {addingStockItem && <AddStockModal item={addingStockItem} onSave={handleAddStock} onClose={() => setAddingStockItem(null)} />}
            {isWithdrawModalOpen && <StockWithdrawalModal stock={stock} onSave={handleWithdraw} onClose={() => setWithdrawModalOpen(false)} />}
            {isReturnModalOpen && <ReturnStockModal stock={stock} onSave={handleReturn} onClose={() => setReturnModalOpen(false)} />}
            {printingLabelItem && <PrintLabelModal item={printingLabelItem} onClose={() => setPrintingLabelItem(null)} />}
            {editingUsedPart && <UpdateUsedPartStatusModal usedPart={editingUsedPart} onSave={handleUpdateUsedPart} onClose={() => setEditingUsedPart(null)} />}
            {requisitionModalOpen && (
                <PurchaseRequisitionModal
                    isOpen={requisitionModalOpen}
                    onClose={() => setRequisitionModalOpen(false)}
                    onSave={handleSaveRequisition}
                    stockItems={stock}
                    initialItem={initialRequisitionItem}
                />
            )}
        </div>
    );
};

export default StockManagement;
