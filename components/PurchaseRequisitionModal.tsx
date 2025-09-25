import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { PurchaseRequisition, PurchaseRequisitionItem, PurchaseRequisitionStatus, StockItem, PurchaseRequestType, PurchaseBudgetType, Supplier } from '../types';
import PurchaseRequisitionPrint from './PurchaseRequisitionPrint';
import { useToast } from '../context/ToastContext';
import ReactDOMServer from 'react-dom/server';
import { promptForPassword } from '../utils';


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
    areFinancialsEditable: boolean;
    onItemChange: (rowId: string, field: keyof PurchaseRequisitionItem, value: any) => void;
    onRemoveItem: (rowId: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, isEditable, areFinancialsEditable, onItemChange, onRemoveItem }) => {
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
                    disabled={!areFinancialsEditable} 
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
                    disabled={!areFinancialsEditable} 
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
    suppliers: Supplier[];
    initialRequisition?: PurchaseRequisition | null;
    initialItem?: PurchaseRequisitionItem | null; // For creating PR from stock page
}


const PurchaseRequisitionModal: React.FC<PurchaseRequisitionModalProps> = ({ isOpen, onClose, onSave, stockItems, suppliers, initialRequisition, initialItem }) => {
    
    const getInitialState = useCallback((): PRDataWithRowIdItems => {
        const base = initialRequisition || {
            requesterName: 'เจ้าหน้าที่ธุรการซ่อมบำรุง',
            department: 'แผนกซ่อมบำรุง',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: '',
            status: 'ฉบับร่าง' as PurchaseRequisitionStatus,
            items: [],
            totalAmount: 0,
            vatAmount: 0,
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
    const [isVatEnabled, setIsVatEnabled] = useState(false);
    const [vatRate, setVatRate] = useState(7);
    const { addToast } = useToast();


    useEffect(() => {
        if (isOpen) {
            const initialState = getInitialState();
            setPrData(initialState);
            if (initialRequisition) {
                const sub = (initialRequisition.items || []).reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
                if (initialRequisition.vatAmount && initialRequisition.vatAmount > 0 && sub > 0) {
                    setIsVatEnabled(true);
                    const rate = (initialRequisition.vatAmount / sub) * 100;
                    setVatRate(Math.round(rate * 100) / 100);
                } else {
                    setIsVatEnabled(false);
                    setVatRate(7);
                }
            } else {
                 setIsVatEnabled(false);
                 setVatRate(7);
            }
        }
    }, [isOpen, getInitialState, initialRequisition]);

    const { subtotal, vatAmount, grandTotal } = useMemo(() => {
        const items = Array.isArray(prData.items) ? prData.items : [];
        const sub = items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
        const vat = isVatEnabled ? sub * (vatRate / 100) : 0;
        const grand = sub + vat;
        return { subtotal: sub, vatAmount: vat, grandTotal: grand };
    }, [prData.items, isVatEnabled, vatRate]);
    
    const handlePrint = () => {
        if (!initialRequisition) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            addToast('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ โปรดตรวจสอบการตั้งค่า Pop-up Blocker', 'error');
            return;
        }

        const printContent = ReactDOMServer.renderToString(
            <PurchaseRequisitionPrint requisition={initialRequisition} />
        );

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8" />
                <title>ใบขอซื้อ ${initialRequisition.prNumber}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  body { 
                    font-family: 'Sarabun', sans-serif; 
                    background-color: #f8fafc;
                  }
                  @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: #fff;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                  }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500); // Delay to ensure content is fully rendered and styled
    };


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
        if (!prData.requesterName.trim() || !prData.department.trim() || !prData.supplier.trim()) {
            addToast('กรุณากรอกข้อมูลผู้ขอซื้อ, แผนก, และผู้จำหน่ายให้ครบถ้วน', 'warning');
            return;
        }

        const safeItems = Array.isArray(prData.items) ? prData.items : [];
        if (safeItems.length === 0) {
            addToast('กรุณาเพิ่มรายการในใบขอซื้ออย่างน้อย 1 รายการ', 'warning');
            return;
        }

        const itemsToSave = safeItems.map(({ rowId, ...rest }) => rest);
        const finalData = { ...prData, items: itemsToSave, totalAmount: grandTotal, vatAmount: vatAmount };

        if ('id' in finalData) {
             onSave(finalData as PurchaseRequisition);
        } else {
            onSave(finalData as Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>);
        }
    };

    const handleCancelAndSave = () => {
        if (promptForPassword('ยกเลิกใบขอซื้อ')) {
            const itemsToSave = (Array.isArray(prData.items) ? prData.items : []).map(({ rowId, ...rest }) => rest);
            const finalData = {
                ...prData,
                status: 'ยกเลิก' as PurchaseRequisitionStatus,
                items: itemsToSave,
                totalAmount: grandTotal,
                vatAmount: vatAmount
            };

            if ('id' in finalData) {
                onSave(finalData as PurchaseRequisition);
            } else {
                onSave(finalData as Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>);
            }
        }
    };

    const isDraft = prData.status === 'ฉบับร่าง';
    const areFinancialsEditable = ['ฉบับร่าง', 'รออนุมัติ', 'อนุมัติแล้ว', 'รอสินค้า'].includes(prData.status);
    const isFormHeaderEditable = isDraft;
    const isItemsEditable = isDraft;
    const isSupplierEditable = isDraft;
    const canSaveChanges = isDraft || areFinancialsEditable;


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
    const canBeCancelled = initialRequisition && ['ฉบับร่าง', 'รออนุมัติ', 'อนุมัติแล้ว', 'รอสินค้า'].includes(prData.status);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-gray-800">{initialRequisition ? `ใบขอซื้อ ${initialRequisition.prNumber}` : 'สร้างใบขอซื้อใหม่'}</h3>
                        {initialRequisition && (
                            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-gray-500 rounded-lg hover:bg-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                                พิมพ์
                            </button>
                        )}
                    </div>
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
                        <div><label className="block text-sm font-medium">ผู้ขอซื้อ *</label><input type="text" name="requesterName" value={prData.requesterName} onChange={handleInputChange} disabled={!isFormHeaderEditable} required className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div><label className="block text-sm font-medium">ฝ่าย/แผนก *</label><input type="text" name="department" value={prData.department} onChange={handleInputChange} disabled={!isFormHeaderEditable} required className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div><label className="block text-sm font-medium">วันที่ต้องการใช้</label><input type="date" name="dateNeeded" value={prData.dateNeeded} onChange={handleInputChange} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"/></div>
                        <div>
                            <label className="block text-sm font-medium">ผู้จำหน่าย *</label>
                            <input 
                                list="supplier-list"
                                type="text" 
                                name="supplier" 
                                value={prData.supplier} 
                                onChange={handleInputChange} 
                                disabled={!isSupplierEditable} 
                                required 
                                className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100"
                            />
                            <datalist id="supplier-list">
                                {suppliers.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
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
                                        areFinancialsEditable={areFinancialsEditable}
                                        onItemChange={handleItemChange}
                                        onRemoveItem={handleRemoveItem}
                                    />
                                 ))}
                             </tbody>
                         </table>
                    </div>
                     <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between items-center text-md">
                            <span>ราคารวมอะไหล่ (Subtotal)</span>
                            <span className="font-semibold">{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                        <div className="flex justify-between items-center text-md">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="vat-checkbox" 
                                    checked={isVatEnabled} 
                                    onChange={e => setIsVatEnabled(e.target.checked)} 
                                    disabled={!areFinancialsEditable}
                                    className="h-4 w-4 rounded"
                                />
                                <label htmlFor="vat-checkbox" className="text-gray-700">ภาษีมูลค่าเพิ่ม (VAT)</label>
                                <input 
                                    type="number"
                                    value={vatRate}
                                    onChange={e => setVatRate(Number(e.target.value))}
                                    disabled={!isVatEnabled || !areFinancialsEditable}
                                    className="w-20 p-1 border rounded text-right disabled:bg-gray-100"
                                    step="0.01"
                                />
                                <span className="text-gray-700">%</span>
                            </div>
                            <span className="font-semibold">{vatAmount.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2">
                            <span>ยอดรวมสุทธิ (Grand Total)</span>
                            <span className="text-blue-600">{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">หมายเหตุ / เงื่อนไขเพิ่มเติม</label>
                        <textarea name="notes" value={prData.notes || ''} onChange={handleInputChange} rows={2} disabled={!isFormHeaderEditable} className="w-full p-2 border rounded-lg mt-1 disabled:bg-gray-100" placeholder="อาจมีอะไหล่บางตัวที่ต้องซื้อใหม่มาเพิ่มสต๊อก"></textarea>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                       {renderWorkflowButtons()}
                       {canBeCancelled && (
                           <button type="button" onClick={handleCancelAndSave} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">ยกเลิกใบขอซื้อ</button>
                       )}
                    </div>
                    <div className="space-x-4 flex items-center">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
                        {canSaveChanges && (
                           <button onClick={handleSave} className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">บันทึก</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseRequisitionModal;