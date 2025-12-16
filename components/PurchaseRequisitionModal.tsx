
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { PurchaseRequisition, PurchaseRequisitionItem, PurchaseRequisitionStatus, StockItem, PurchaseRequestType, PurchaseBudgetType, Supplier } from '../types';
import PurchaseRequisitionPrint from './PurchaseRequisitionPrint';
import { useToast } from '../context/ToastContext';
import ReactDOMServer from 'react-dom/server';
import { promptForPassword, formatCurrency } from '../utils';


// Define temporary item type with a unique rowId for UI management
type PRItemWithRowId = PurchaseRequisitionItem & { rowId: string };

type PRDataWithRowIdItems = Omit<PurchaseRequisition, 'items'> & {
    items: PRItemWithRowId[];
};

const PREDEFINED_DEPARTMENTS = [
    'แผนกซ่อมบำรุง',
    'สาขานครสวรรค์',
    'สาขาพิษณุโลก',
    'สาขากำแพงเพชร',
    'สาขาแม่สอด',
    'สาขาเชียงใหม่',
    'สาขาสาย3'
];

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
                {areFinancialsEditable ? (
                    <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => onItemChange(item.rowId, 'unitPrice', Number(e.target.value))}
                        className="w-24 p-1 border rounded text-right"
                        min="0"
                    />
                ) : (
                    <input
                        type="text"
                        value={formatCurrency(item.unitPrice)}
                        disabled
                        className="w-24 p-1 border rounded text-right bg-gray-100 border-transparent"
                    />
                )}
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
                {formatCurrency(item.quantity * item.unitPrice)}
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
            id: undefined,
            prNumber: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            requesterName: 'เจ้าหน้าที่ธุรการซ่อมบำรุง',
            department: 'แผนกซ่อมบำรุง',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: '',
            status: 'รออนุมัติ' as PurchaseRequisitionStatus, // Default status is now 'Pending Approval'
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

        return { ...base, items: itemsWithId } as PRDataWithRowIdItems;
    }, [initialRequisition, initialItem, stockItems]);

    const [prData, setPrData] = useState(getInitialState());
    const [selectedStockId, setSelectedStockId] = useState('');
    const [isVatEnabled, setIsVatEnabled] = useState(false);
    const [vatRate, setVatRate] = useState(7);
    const [departmentSelection, setDepartmentSelection] = useState('แผนกซ่อมบำรุง');
    const { addToast } = useToast();


    useEffect(() => {
        if (isOpen) {
            const initialState = getInitialState();
            setPrData(initialState);

            // Initialize department selection
            if (PREDEFINED_DEPARTMENTS.includes(initialState.department)) {
                setDepartmentSelection(initialState.department);
            } else {
                setDepartmentSelection('others');
            }

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
        const sub = items.reduce((total: number, item) => total + (item.quantity * item.unitPrice), 0);
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
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 800);
                    }
                </script>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
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

    const handleDepartmentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setDepartmentSelection(val);
        if (val !== 'others') {
            setPrData(prev => ({ ...prev, department: val }));
        } else {
            setPrData(prev => ({ ...prev, department: '' }));
        }
    };

    const handleItemChange = useCallback((rowId: string, field: keyof PurchaseRequisitionItem, value: any) => {
        setPrData(prev => {
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

        // Ensure status is 'Pending Approval' if current status is 'Draft' or undefined
        // This auto-updates existing 'Draft' items to 'Pending Approval' upon save
        if (finalData.status === 'ฉบับร่าง' || !finalData.status) {
            finalData.status = 'รออนุมัติ';
        }

        if ('id' in finalData && finalData.id) {
            onSave(finalData as PurchaseRequisition);
        } else {
            const { id, prNumber, createdAt, updatedAt, ...newData } = finalData;
            onSave(newData as Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'>);
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
                vatAmount: vatAmount,
            };
            if ('id' in finalData && finalData.id) {
                onSave(finalData as PurchaseRequisition);
            }
        }
    };


    // Determine if the form is editable based on its status
    const isEditable = useMemo(() => {
        // Allow editing for 'Draft' and 'Pending Approval'
        return ['ฉบับร่าง', 'รออนุมัติ'].includes(prData.status);
    }, [prData.status]);

    const areFinancialsEditable = useMemo(() => {
        return ['ฉบับร่าง', 'รออนุมัติ'].includes(prData.status);
    }, [prData.status]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-0 sm:p-4">
            <div className="bg-white shadow-xl w-full max-w-full h-full sm:max-w-6xl sm:max-h-[95vh] flex flex-col rounded-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{initialRequisition ? `แก้ไขใบขอซื้อ: ${prData.prNumber}` : 'สร้างใบขอซื้อใหม่'}</h3>
                        <p className="text-base text-gray-500">สถานะปัจจุบัน: {prData.status}</p>
                    </div>
                    <div>
                        {initialRequisition && (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 mr-4"
                            >
                                พิมพ์
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Main Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium">ผู้ขอซื้อ *</label>
                            <input type="text" name="requesterName" value={prData.requesterName} onChange={handleInputChange} disabled={!isEditable} className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">แผนก/สาขา *</label>
                            <select
                                value={departmentSelection}
                                onChange={handleDepartmentSelectChange}
                                disabled={!isEditable}
                                className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100 mb-2"
                            >
                                {PREDEFINED_DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                                <option value="others">อื่นๆ..</option>
                            </select>
                            {departmentSelection === 'others' && (
                                <input
                                    type="text"
                                    name="department"
                                    value={prData.department}
                                    onChange={handleInputChange}
                                    disabled={!isEditable}
                                    placeholder="ระบุแผนก/สาขา"
                                    className="w-full p-2 border rounded-lg disabled:bg-gray-100"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">วันที่ต้องการใช้ *</label>
                            <input type="date" name="dateNeeded" value={prData.dateNeeded} onChange={handleInputChange} disabled={!isEditable} className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">ผู้จำหน่าย *</label>
                            <input
                                list="supplier-list-modal"
                                type="text"
                                name="supplier"
                                value={prData.supplier}
                                onChange={handleInputChange}
                                disabled={!isEditable}
                                className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100"
                            />
                            <datalist id="supplier-list-modal">
                                {suppliers.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">ประเภทการขอซื้อ</label>
                            <select name="requestType" value={prData.requestType} onChange={handleInputChange} disabled={!isEditable} className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100 mb-2">
                                <option value="Product">สินค้า</option>
                                <option value="Service">บริการ</option>
                                <option value="Equipment">อุปกรณ์</option>
                                <option value="Asset">ทรัพย์สิน</option>
                                <option value="Others">อื่นๆ</option>
                            </select>
                            {prData.requestType === 'Others' && (
                                <input
                                    type="text"
                                    name="otherRequestTypeDetail"
                                    value={prData.otherRequestTypeDetail || ''}
                                    onChange={handleInputChange}
                                    disabled={!isEditable}
                                    placeholder="ระบุประเภทอื่นๆ"
                                    className="w-full p-2 border rounded-lg disabled:bg-gray-100"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">สถานะงบประมาณ</label>
                            <select name="budgetStatus" value={prData.budgetStatus} onChange={handleInputChange} disabled={!isEditable} className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100">
                                <option value="Have Budget">มีงบประมาณ</option>
                                <option value="No Budget">ไม่มีงบประมาณ</option>
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium">หมายเหตุ</label>
                            <input type="text" name="notes" value={prData.notes} onChange={handleInputChange} disabled={!isEditable} className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100" />
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <h4 className="font-semibold text-lg border-b pb-2 mb-3">รายการ</h4>
                        {isEditable && (
                            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                <select value={selectedStockId} onChange={e => setSelectedStockId(e.target.value)} className="w-full lg:w-1/3 p-2 border rounded-lg">
                                    <option value="" disabled>-- เลือกจากสต็อก --</option>
                                    {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                </select>
                                <button type="button" onClick={handleAddItemFromStock} disabled={!selectedStockId} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
                                    + เพิ่มจากสต็อก
                                </button>
                                <span className="text-gray-500 mx-2">หรือ</span>
                                <button type="button" onClick={handleAddCustomItem} className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600">
                                    + เพิ่มรายการเอง
                                </button>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">หน่วย</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">กำหนดส่ง</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">รวม</th>
                                        {isEditable && <th className="px-2 py-2"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(Array.isArray(prData.items) ? prData.items : []).map(item => (
                                        <MemoizedItemRow
                                            key={item.rowId}
                                            item={item}
                                            isEditable={isEditable}
                                            areFinancialsEditable={areFinancialsEditable}
                                            onItemChange={handleItemChange}
                                            onRemoveItem={handleRemoveItem}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end pt-4">
                        <div className="w-full md:w-1/3 space-y-2">
                            <div className="flex justify-between"><span>ราคารวม</span><span>{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between items-center">
                                <span>
                                    <input type="checkbox" checked={isVatEnabled} onChange={e => setIsVatEnabled(e.target.checked)} className="mr-2" disabled={!areFinancialsEditable} />
                                    VAT
                                    <input type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="w-16 ml-2 p-1 border rounded text-right" disabled={!isVatEnabled || !areFinancialsEditable} /> %
                                </span>
                                <span>{formatCurrency(vatAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>ยอดรวมสุทธิ</span><span>{formatCurrency(grandTotal)}</span></div>
                        </div>
                    </div>

                    {/* Status Update Section */}
                    {initialRequisition && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-lg mb-3">อัปเดตสถานะ</h4>
                            <div className="flex flex-wrap items-center gap-2">
                                {prData.status === 'ฉบับร่าง' && <button type="button" onClick={() => handleStatusChange('รออนุมัติ')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">ส่งขออนุมัติ</button>}
                                {prData.status === 'รออนุมัติ' && <button type="button" onClick={() => handleStatusChange('อนุมัติแล้ว')} className="px-4 py-2 bg-green-500 text-white rounded-lg">อนุมัติ</button>}
                                {prData.status === 'อนุมัติแล้ว' && <button type="button" onClick={() => handleStatusChange('รอสินค้า')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">ยืนยันสั่งซื้อ</button>}
                                {prData.status === 'รอสินค้า' && <button type="button" onClick={() => handleStatusChange('รับของแล้ว')} className="px-4 py-2 bg-purple-500 text-white rounded-lg">รับของแล้ว</button>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-between items-center bg-gray-50">
                    <div>
                        {isEditable && (
                            <button
                                type="button"
                                onClick={handleCancelAndSave}
                                className="px-6 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                ยกเลิกใบขอซื้อ
                            </button>
                        )}
                    </div>
                    <div className="space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
                        {isEditable && (
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                บันทึก
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseRequisitionModal;
