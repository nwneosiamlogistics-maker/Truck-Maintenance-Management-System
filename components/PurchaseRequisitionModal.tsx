import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { PurchaseRequisition, PurchaseRequisitionItem, PurchaseRequisitionStatus, StockItem, PurchaseRequestType, PurchaseBudgetType } from '../types';

// NOTE: Print functionality was removed due to persistent import errors with the 'react-to-print' library.

// Define temporary item type with a unique rowId for UI management
type PRItemWithRowId = PurchaseRequisitionItem & { rowId: string };

// FIX: Update PRDataWithRowIdItems to allow optional id, prNumber, createdAt, and updatedAt.
// This correctly models the state for both new (no id) and existing (with id) requisitions.
type PRDataWithRowIdItems = Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt' | 'items'> & {
    id?: string;
    prNumber?: string;
    createdAt?: string;
    updatedAt?: string;
    items: PRItemWithRowId[];
};

// --- START: Memoized ItemRow Component for Performance ---
interface ItemRowProps {
    item: PRItemWithRowId;
    isEditable: boolean;
    onItemChange: (rowId: string, field: keyof PurchaseRequisitionItem, value: any) => void;
    onRemoveItem: (rowId: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, isEditable, onItemChange, onRemoveItem }) => {
    // An item is considered a non-editable product if it has a stockId from being selected from stock.
    const isProductFromStock = !!item.stockId;

    return (
        <tr>
            <td className="px-2 py-1">
                <input 
                    type="text" 
                    value={item.name} 
                    onChange={e => onItemChange(item.rowId, 'name', e.target.value)} 
                    disabled={!isEditable || isProductFromStock} 
                    className="w-full p-1 border rounded disabled:bg-gray-100 disabled:border-transparent"
                    placeholder="ชื่อรายการ"
                />
            </td>
            <td className="px-2 py-1">
                <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={e => onItemChange(item.rowId, 'quantity', Number(e.target.value))} 
                    disabled={!isEditable} 
                    className="w-24 p-1 border rounded text-right disabled:bg-gray-100 disabled:border-transparent"
                    min="1"
                />
            </td>
            <td className="px-2 py-1">
                <input 
                    type="text" 
                    value={item.unit} 
                    onChange={e => onItemChange(item.rowId, 'unit', e.target.value)} 
                    disabled={!isEditable || isProductFromStock} 
                    className="w-24 p-1 border rounded text-center disabled:bg-gray-100 disabled:border-transparent"
                />
            </td>
            <td className="px-2 py-1">
                <input 
                    type="number" 
                    value={item.unitPrice} 
                    onChange={e => onItemChange(item.rowId, 'unitPrice', Number(e.target.value))} 
                    disabled={!isEditable || isProductFromStock} 
                    className="w-24 p-1 border rounded text-right disabled:bg-gray-100 disabled:border-transparent"
                    min="0"
                />
            </td>
            <td className="px-2 py-1">
                <input 
                    type="date" 
                    value={item.deliveryOrServiceDate} 
                    onChange={e => onItemChange(item.rowId, 'deliveryOrServiceDate', e.target.value)} 
                    disabled={!isEditable} 
                    className="w-full p-1 border rounded disabled:bg-gray-100 disabled:border-transparent"
                />
            </td>
            <td className="px-4 py-2 text-right font-semibold">
                {(item.quantity * item.unitPrice).toLocaleString()}
            </td>
            {isEditable && (
                <td className="px-4 py-2 text-center">
                    <button onClick={() => onRemoveItem(item.rowId)} className="text-red-500 font-bold text-xl hover:text-red-700">×</button>
                </td>
            )}
        </tr>
    );
};

const MemoizedItemRow = React.memo(ItemRow);
// --- END: Memoized ItemRow Component ---


interface PurchaseRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (requisition: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'> | PurchaseRequisition) => void;
    stockItems: StockItem[];
    initialRequisition?: PurchaseRequisition | null;
    initialItem?: PurchaseRequisitionItem | null; // For creating PR from stock page
}


const PurchaseRequisitionModal: React.FC<PurchaseRequisitionModalProps> = ({ isOpen, onClose, onSave, stockItems, initialRequisition, initialItem }) => {
    
    const getInitialState = useCallback((): PRDataWithRowIdItems => {
        const base = initialRequisition || {
            requesterName: 'ผู้จัดการคลัง',
            department: 'แผนกคลังสินค้า',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: '',
            status: 'ฉบับร่าง' as PurchaseRequisitionStatus,
            items: [],
            totalAmount: 0,
            notes: '',
            approverName: '',
            approvalDate: null,
            requestType: 'Product' as PurchaseRequestType,
            otherRequestTypeDetail: '',
            budgetStatus: 'Have Budget' as PurchaseBudgetType,
        };
        
        if (!initialRequisition && initialItem) {
            const stockItem = stockItems.find(s => s.id === initialItem.stockId);
            base.supplier = stockItem?.supplier || '';
            base.items = [initialItem];
        }

        const itemsWithId = (Array.isArray(base.items) ? base.items : []).map(item => ({
            ...item,
            deliveryOrServiceDate: item.deliveryOrServiceDate || new Date().toISOString().split('T')[0],
            rowId: `item-${Date.now()}-${Math.random()}`
        }));

        return { ...base, items: itemsWithId };
    }, [initialRequisition, initialItem, stockItems]);

    const [prData, setPrData] = useState(getInitialState());
    const [selectedStockId, setSelectedStockId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPrData(getInitialState());
        }
    }, [isOpen, getInitialState]);

    const totalAmount = useMemo(() => {
        const items = Array.isArray(prData.items) ? prData.items : [];
        return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    }, [prData.items]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPrData(prev => {
            switch (name) {
                case 'requestType':
                    return { ...prev, requestType: value as PurchaseRequestType };
                case 'budgetStatus':
                    return { ...prev, budgetStatus: value as PurchaseBudgetType };
                default:
                    return { ...prev, [name]: value };
            }
        });
    };

    const handleItemChange = useCallback((rowId: string, field: keyof PurchaseRequisitionItem, value: any) => {
        setPrData(prev => {
            // FIX: Explicitly type `newItems` to `PRItemWithRowId[]` to prevent TypeScript
            // from losing the `rowId` property during type inference, which caused
            // a type conflict in the `setPrData` call.
            const newItems: PRItemWithRowId[] = prev.items.map(item => {
                if (item.rowId === rowId) {
                    return { ...item, [field]: value };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    }, []);

    const handleAddItemFromStock = () => {
        const stockItem = stockItems.find(s => s.id === selectedStockId);
        if (!stockItem || (Array.isArray(prData.items) ? prData.items : []).some(i => i.stockId === selectedStockId)) return;

        const newItem: PRItemWithRowId = {
            rowId: `item-${Date.now()}-${Math.random()}`,
            stockId: stockItem.id,
            stockCode: stockItem.code,
            name: stockItem.name,
            quantity: 1,
            unit: stockItem.unit,
            unitPrice: stockItem.price,
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };
        setPrData(prev => ({ ...prev, items: [...(Array.isArray(prev.items) ? prev.items : []), newItem] }));
        setSelectedStockId('');
    };

    const handleAddCustomItem = () => {
         const newItem: PRItemWithRowId = {
            rowId: `item-${Date.now()}-${Math.random()}`,
            stockId: '',
            stockCode: '',
            name: '',
            quantity: 1,
            unit: 'หน่วย',
            unitPrice: 0,
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };
        setPrData(prev => ({ ...prev, items: [...(Array.isArray(prev.items) ? prev.items : []), newItem] }));
    }

    const handleRemoveItem = useCallback((rowId: string) => {
        setPrData(prev => ({ ...prev, items: (Array.isArray(prev.items) ? prev.items : []).filter(i => i.rowId !== rowId) }));
    }, []);

    const handleStatusChange = (newStatus: PurchaseRequisitionStatus) => {
        // FIX: Changed the type of `updates` to match the state type `PRDataWithRowIdItems`.
        // This resolves the type error when spreading `updates` into the state,
        // ensuring compatibility of all properties, including the nested `items` array.
        let updates: Partial<PRDataWithRowIdItems> = { status: newStatus };
        if (newStatus === 'อนุมัติแล้ว' && !prData.approvalDate) {
            updates.approverName = 'ผู้จัดการ'; // Placeholder for user system
            updates.approvalDate = new Date().toISOString();
        }
        setPrData(prev => ({ ...prev, ...updates }));
    };
    
    const handleSave = () => {
        const safeItems = Array.isArray(prData.items) ? prData.items : [];
        const itemsToSave = safeItems.map(({ rowId, ...rest }) => rest);
        const finalData = { ...prData, items: itemsToSave, totalAmount };

        if ('id' in finalData) {
             onSave(finalData as PurchaseRequisition);
        } else {
            onSave(finalData as Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>);
        }
    };

    const isFormHeaderEditable = prData.status === 'ฉบับร่าง';
    const isItemsEditable = prData.status !== 'รับของแล้ว' && prData.status !== 'ยกเลิก';


    const renderWorkflowButtons = () => {
        switch(prData.status) {
            case 'ฉบับร่าง':
                return <button onClick={() => handleStatusChange('รออนุมัติ')} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">ส่งเพื่อขออนุมัติ</button>;
            case 'รออนุมัติ':
                return (
                    <div className="space-x-2">
                        <button onClick={() => handleStatusChange('ยกเลิก')} className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600">ปฏิเสธ</button>
                        <button onClick={() => handleStatusChange('อนุมัติแล้ว')} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">อนุมัติ</button>
                    </div>
                );
            case 'อนุมัติแล้ว':
                 return <button onClick={() => handleStatusChange('รอสินค้า')} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">ยืนยันการสั่งซื้อ</button>;
            case 'รอสินค้า':
                 return <button onClick={() => handleStatusChange('รับของแล้ว')} className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">รับของเข้าสต็อก</button>;
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    const requestTypeLabels: Record<PurchaseRequestType, string> = { Product: 'สินค้า', Service: 'บริการ', Equipment: 'วัสดุ/อุปกรณ์', Asset: 'สินทรัพย์', Others: 'อื่นๆ' };
    const budgetTypeLabels: Record<PurchaseBudgetType, string> = { 'Have Budget': 'มีงบประมาณ', 'No Budget': 'ไม่มีงบประมาณ' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{initialRequisition ? `ใบขอซื้อ ${initialRequisition.prNumber}` : 'สร้างใบขอซื้อใหม่'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 border rounded-lg bg-gray-50">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-2">ประเภทการขอซื้อ</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {Object.entries(requestTypeLabels).map(([key, label]) => (
                                    <label key={key} className="flex items-center space-x-2">
                                        <input type="radio" name="requestType" value={key} checked={prData.requestType === key} onChange={handleInputChange} disabled={!isFormHeaderEditable} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                            {prData.requestType === 'Others' && (
                                <input type="text" name="otherRequestTypeDetail" value={prData.otherRequestTypeDetail || ''} onChange={handleInputChange} placeholder="ระบุประเภท..." disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-2 disabled:bg-gray-100"/>
                            )}
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-2">งบประมาณ</label>
                             <div className="flex flex-wrap gap-x-4 gap-y-2">
                                 {Object.entries(budgetTypeLabels).map(([key, label]) => (
                                    <label key={key} className="flex items-center space-x-2">
                                        <input type="radio" name="budgetStatus" value={key} checked={prData.budgetStatus === key} onChange={handleInputChange} disabled={!isFormHeaderEditable} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-sm font-medium">ผู้ขอซื้อ</label><input type="text" name="requesterName" value={prData.requesterName} onChange={handleInputChange} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div><label className="block text-sm font-medium">ฝ่าย/แผนก</label><input type="text" name="department" value={prData.department} onChange={handleInputChange} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div><label className="block text-sm font-medium">วันที่ต้องการใช้</label><input type="date" name="dateNeeded" value={prData.dateNeeded} onChange={handleInputChange} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div><label className="block text-sm font-medium">ผู้จำหน่าย</label><input type="text" name="supplier" value={prData.supplier} onChange={handleInputChange} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                    </div>
                    
                    {isItemsEditable && (
                    <div className="border-t pt-4">
                         <h4 className="text-lg font-semibold mb-2">เพิ่มรายการ</h4>
                         {prData.requestType === 'Product' ? (
                            <div className="flex items-center gap-2">
                                <select value={selectedStockId} onChange={e => setSelectedStockId(e.target.value)} className="flex-1 p-2 border rounded-lg">
                                    <option value="">-- เลือกอะไหล่จากสต็อก --</option>
                                    {(Array.isArray(stockItems) ? stockItems : []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                </select>
                                <button onClick={handleAddItemFromStock} disabled={!selectedStockId} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400">เพิ่ม</button>
                            </div>
                         ) : (
                            <button onClick={handleAddCustomItem} className="w-full text-green-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-green-500 hover:bg-green-50">
                                + เพิ่มรายการ (บริการ/อุปกรณ์/อื่นๆ)
                            </button>
                         )}
                    </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                         <table className="min-w-full divide-y">
                             <thead className="bg-gray-50">
                                 <tr>
                                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                                     <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                                     <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">หน่วย</th>
                                     <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">กำหนดส่ง/ให้บริการ</th>
                                     <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">รวม</th>
                                     {isItemsEditable && <th className="w-12"></th>}
                                 </tr>
                             </thead>
                             <tbody className="bg-white divide-y">
                                 {(Array.isArray(prData.items) ? prData.items : []).map((item) => (
                                    <MemoizedItemRow
                                        key={item.rowId}
                                        item={item}
                                        isEditable={isItemsEditable}
                                        onItemChange={handleItemChange}
                                        onRemoveItem={handleRemoveItem}
                                    />
                                 ))}
                             </tbody>
                         </table>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">หมายเหตุ / เงื่อนไขเพิ่มเติม</label>
                        <textarea name="notes" value={prData.notes || ''} onChange={handleInputChange} rows={2} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100" placeholder="อาจมีอะไหล่บางตัวที่ต้องซื้อใหม่มาเพิ่มสต๊อก"></textarea>
                    </div>
                    <div className="text-right text-xl font-bold">
                        ยอดรวม: <span className="text-blue-600">{totalAmount.toLocaleString()} บาท</span>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-between items-center bg-gray-50">
                    <div>
                       {renderWorkflowButtons()}
                    </div>
                    <div className="space-x-4 flex items-center">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button onClick={handleSave} className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">บันทึก</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseRequisitionModal;