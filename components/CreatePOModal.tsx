
import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseRequisition, PurchaseOrder, PurchaseOrderItem, Supplier } from '../types';
import { useToast } from '../context/ToastContext';

interface CreatePOModalProps {
    selectedPRs: PurchaseRequisition[];
    onClose: () => void;
    onSave: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => void;
    suppliers: Supplier[];
}

const CreatePOModal: React.FC<CreatePOModalProps> = ({ selectedPRs, onClose, onSave, suppliers }) => {
    const { addToast } = useToast();
    
    // Aggregate items from all selected PRs
    const initialItems = useMemo(() => {
        const items: PurchaseOrderItem[] = [];
        selectedPRs.forEach(pr => {
            (pr.items || []).forEach(item => {
                items.push({
                    stockId: item.stockId,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                    prId: pr.id,
                    discount: 0
                });
            });
        });
        return items;
    }, [selectedPRs]);

    const [formData, setFormData] = useState({
        supplierName: '',
        supplierAddress: '',
        supplierTaxId: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        paymentTerms: '',
        notes: '',
        contactPerson: '',
        requesterName: '',
        department: '',
        deliveryLocation: '',
        project: '',
        contactAccount: '',
        contactReceiver: '',
    });

    const [items, setItems] = useState<PurchaseOrderItem[]>(initialItems);
    const [isVatEnabled, setIsVatEnabled] = useState(true);
    const [vatRate, setVatRate] = useState(7);

    // Auto-fill supplier info from the first PR if available
    useEffect(() => {
        if (selectedPRs.length > 0) {
            const firstPR = selectedPRs[0];
            setFormData(prev => ({
                ...prev,
                supplierName: firstPR.supplier || '',
                requesterName: firstPR.requesterName || '',
                department: firstPR.department || '',
            }));
            
            const matchedSupplier = suppliers.find(s => s.name === firstPR.supplier);
            if (matchedSupplier) {
                setFormData(prev => ({
                    ...prev,
                    supplierAddress: matchedSupplier.address || '',
                }));
            }
        }
    }, [selectedPRs, suppliers]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: number) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        
        // Recalculate total price for the item
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
            const qty = field === 'quantity' ? value : item.quantity;
            const price = field === 'unitPrice' ? value : item.unitPrice;
            const discount = field === 'discount' ? value : (item.discount || 0);
            item.totalPrice = (qty * price) - discount;
        }
        
        newItems[index] = item;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) {
            addToast('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ', 'warning');
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const { subtotal, vatAmount, totalAmount } = useMemo(() => {
        const sub = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const vat = isVatEnabled ? sub * (vatRate / 100) : 0;
        const total = sub + vat;
        return { subtotal: sub, vatAmount: vat, totalAmount: total };
    }, [items, isVatEnabled, vatRate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierName) {
            addToast('กรุณากรอกชื่อผู้จำหน่าย', 'warning');
            return;
        }
        
        onSave({
            ...formData,
            status: 'Ordered',
            items,
            subtotal,
            vatAmount,
            totalAmount,
            linkedPrIds: selectedPRs.map(pr => pr.id),
            linkedPrNumbers: selectedPRs.map(pr => pr.prNumber),
            createdBy: 'Admin', // In a real app, get from auth context
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">สร้างใบสั่งซื้อ (Purchase Order)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* Supplier & Order Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-2">ข้อมูลผู้จำหน่าย</h4>
                                <div>
                                    <label className="block text-sm font-medium">ชื่อผู้จำหน่าย *</label>
                                    <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} required className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">ที่อยู่</label>
                                    <textarea name="supplierAddress" value={formData.supplierAddress} onChange={handleInputChange} rows={2} className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">ผู้ติดต่อ (ฝั่งผู้ขาย)</label>
                                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-2">ข้อมูลการสั่งซื้อ</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">วันที่สั่งซื้อ</label>
                                        <input type="date" name="orderDate" value={formData.orderDate} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">กำหนดส่งของ</label>
                                        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">ผู้ขอซื้อ</label>
                                        <input type="text" name="requesterName" value={formData.requesterName} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">แผนก/สาขา</label>
                                        <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">เงื่อนไขการชำระเงิน</label>
                                    <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleInputChange} placeholder="เช่น เครดิต 30 วัน" className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">หมายเหตุ</label>
                                    <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                            <div>
                                <label className="block text-sm font-medium">สถานที่ส่งสินค้า</label>
                                <input type="text" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">สำหรับโครงการ</label>
                                <input type="text" name="project" value={formData.project} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ติดต่อบัญชี</label>
                                <input type="text" name="contactAccount" value={formData.contactAccount} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ติดต่อผู้รับสินค้า</label>
                                <input type="text" name="contactReceiver" value={formData.contactReceiver} onChange={handleInputChange} className="w-full p-2 border rounded mt-1" />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <h4 className="font-bold text-lg mb-3">รายการสินค้า</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">จำนวน</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">หน่วย</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">ราคา/หน่วย</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">ส่วนลด</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">รวมเป็นเงิน</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2 text-sm">{item.name}</td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full text-right border rounded p-1" min="1" />
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center">{item.unit}</td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))} className="w-full text-right border rounded p-1" min="0" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={item.discount || 0} onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))} className="w-full text-right border rounded p-1" min="0" />
                                                </td>
                                                <td className="px-3 py-2 text-right text-sm font-semibold">
                                                    {item.totalPrice.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>รวมเป็นเงิน</span>
                                    <span>{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <label className="flex items-center">
                                        <input type="checkbox" checked={isVatEnabled} onChange={(e) => setIsVatEnabled(e.target.checked)} className="mr-2" />
                                        VAT {isVatEnabled && <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="w-12 mx-1 border rounded text-center" />} %
                                    </label>
                                    <span>{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>ยอดรวมทั้งสิ้น</span>
                                    <span className="text-blue-600">{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-end space-x-3 bg-gray-50">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">ยืนยันสร้างใบสั่งซื้อ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePOModal;
