
import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency, calculateThaiTax, calculateVat } from '../utils';
import type { PurchaseRequisition, PurchaseOrder, PurchaseOrderItem, Supplier } from '../types';
import { useToast } from '../context/ToastContext';

interface CreatePOModalProps {
    selectedPRs: PurchaseRequisition[];
    onClose: () => void;
    onSave: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => void;
    suppliers: Supplier[];
}

const TAX_TYPES = [
    { label: 'ค่าบริการ (3%)', value: 3 },
    { label: 'ค่าขนส่ง (1%)', value: 1 },
    { label: 'ค่าโฆษณา (2%)', value: 2 },
    { label: 'ค่าจ้างทำของ (3%)', value: 3 },
    { label: 'ค่าเช่า (5%)', value: 5 },
];

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
                    totalPrice: calculateThaiTax(item.quantity * item.unitPrice),
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

    // WHT State
    const [isWhtEnabled, setIsWhtEnabled] = useState(false);
    const [whtRate, setWhtRate] = useState(3);
    const [whtType, setWhtType] = useState('custom');
    const [customWhtLabel, setCustomWhtLabel] = useState('');
    const [manualVatAdjustment, setManualVatAdjustment] = useState(0);
    const [isPriceIncVat, setIsPriceIncVat] = useState(false);
    const [editingCell, setEditingCell] = useState<{ index: number, field: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            item.totalPrice = calculateThaiTax((qty * price) - discount);
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

    const { netBeforeVat, vatAmount, subtotal, whtAmount, totalAmount } = useMemo(() => {
        let itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        let roundedItemsTotal = calculateThaiTax(itemsTotal);

        let net: number, vat: number, sub: number;

        if (isPriceIncVat) {
            // Price already includes VAT — back-calculate net
            sub = roundedItemsTotal;  // displayed subtotal = price given
            net = calculateThaiTax(sub / (1 + vatRate / 100));
            vat = calculateThaiTax(sub - net);
        } else {
            // Normal: items are priced excluding VAT
            net = roundedItemsTotal;  // ยอดก่อน VAT
            vat = isVatEnabled ? calculateVat(net, vatRate) : 0;
            vat = calculateThaiTax(vat + manualVatAdjustment);
            sub = calculateThaiTax(net + vat);  // Subtotal = net + VAT
        }

        // WHT คำนวณจากยอดก่อน VAT (net) เสมอ
        const wht = isWhtEnabled ? calculateVat(net, whtRate) : 0;
        const grandTotal = calculateThaiTax(sub - wht);

        return {
            netBeforeVat: net,
            vatAmount: vat,
            subtotal: sub,
            whtAmount: wht,
            totalAmount: grandTotal,
        };
    }, [items, isVatEnabled, vatRate, isWhtEnabled, whtRate, manualVatAdjustment, isPriceIncVat]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.supplierName) {
            addToast('กรุณากรอกชื่อผู้จำหน่าย', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const poData: any = {
                ...formData,
                status: 'Ordered',
                items,
                netBeforeVat,
                subtotal,
                vatAmount,
                vatRate: isVatEnabled || isPriceIncVat ? vatRate : 0,
                whtAmount,
                totalAmount,
                linkedPrIds: selectedPRs.map(pr => pr.id),
                linkedPrNumbers: selectedPRs.map(pr => pr.prNumber),
                createdBy: 'Admin', // In a real app, get from auth context
            };

            if (isWhtEnabled) {
                poData.whtRate = whtRate;
                poData.whtType = whtType === 'custom' && customWhtLabel ? customWhtLabel : whtType;
            }

            await onSave(poData);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        } finally {
            setTimeout(() => setIsSubmitting(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">สร้างใบสั่งซื้อ (Purchase Order)</h3>
                    <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
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
                                    <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} required placeholder="ชื่อผู้จำหน่าย" className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">ที่อยู่</label>
                                    <textarea name="supplierAddress" value={formData.supplierAddress} onChange={handleInputChange} rows={2} placeholder="ที่อยู่ผู้จำหน่าย" className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">ผู้ติดต่อ (ฝั่งผู้ขาย)</label>
                                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} placeholder="ชื่อผู้ติดต่อ" className="w-full p-2 border rounded mt-1" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-2">ข้อมูลการสั่งซื้อ</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">วันที่สั่งซื้อ</label>
                                        <input type="date" name="orderDate" value={formData.orderDate} onChange={handleInputChange} title="Order Date" className="w-full p-2 border rounded mt-1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">กำหนดส่งของ</label>
                                        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} title="Delivery Date" className="w-full p-2 border rounded mt-1" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">ผู้ขอซื้อ</label>
                                        <input type="text" name="requesterName" value={formData.requesterName} onChange={handleInputChange} placeholder="ชื่อผู้ขอซื้อ" className="w-full p-2 border rounded mt-1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">แผนก/สาขา</label>
                                        <input type="text" name="department" value={formData.department} onChange={handleInputChange} placeholder="แผนก/สาขา" className="w-full p-2 border rounded mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">เงื่อนไขการชำระเงิน</label>
                                    <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleInputChange} placeholder="เช่น เครดิต 30 วัน" className="w-full p-2 border rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">หมายเหตุ</label>
                                    <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="หมายเหตุเพิ่มเติม" className="w-full p-2 border rounded mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                            <div>
                                <label className="block text-sm font-medium">สถานที่ส่งสินค้า</label>
                                <input type="text" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleInputChange} placeholder="สถานที่ส่งสินค้า" className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">สำหรับโครงการ</label>
                                <input type="text" name="project" value={formData.project} onChange={handleInputChange} placeholder="โครงการ" className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ติดต่อบัญชี</label>
                                <input type="text" name="contactAccount" value={formData.contactAccount} onChange={handleInputChange} placeholder="ข้อมูลติดต่อบัญชี" className="w-full p-2 border rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ติดต่อผู้รับสินค้า</label>
                                <input type="text" name="contactReceiver" value={formData.contactReceiver} onChange={handleInputChange} placeholder="ข้อมูลผู้รับสินค้า" className="w-full p-2 border rounded mt-1" />
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
                                                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full text-right border rounded p-1" min="1" aria-label="Quantity" />
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center">{item.unit}</td>
                                                <td className="px-3 py-2">
                                                    {editingCell?.index === index && editingCell?.field === 'unitPrice' ? (
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                                            onBlur={() => setEditingCell(null)}
                                                            className="w-full text-right border rounded p-1"
                                                            min="0"
                                                            step="0.01"
                                                            autoFocus
                                                            aria-label="Unit Price"
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => setEditingCell({ index, field: 'unitPrice' })}
                                                            className="w-full text-right border border-gray-300 rounded p-1 cursor-text bg-white min-h-[32px] flex items-center justify-end"
                                                        >
                                                            {formatCurrency(item.unitPrice)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={item.discount || 0} onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))} className="w-full text-right border rounded p-1" min="0" aria-label="Discount" />
                                                </td>
                                                <td className="px-3 py-2 text-right text-sm font-semibold">
                                                    {formatCurrency(item.totalPrice)}
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

                        {/* Totals Section - Redesigned for Premium Look */}
                        <div className="flex justify-between items-start pt-4">
                            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPriceIncVat}
                                        onChange={e => setIsPriceIncVat(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-blue-800">ราคารวมภาษีแล้ว</span>
                                        <span className="text-[10px] text-blue-600">(Price Includes VAT)</span>
                                    </div>
                                </label>
                                {isPriceIncVat && (
                                    <div className="flex items-center gap-1 bg-white border border-blue-200 rounded px-2 py-1">
                                        <span className="text-[10px] text-blue-500">VAT</span>
                                        <input
                                            type="number"
                                            value={vatRate}
                                            onChange={e => setVatRate(Number(e.target.value))}
                                            className="w-10 bg-transparent text-center focus:outline-none font-bold text-blue-700 text-sm"
                                            min="0" max="100" step="0.01"
                                            aria-label="VAT Rate for Price Includes VAT"
                                        />
                                        <span className="text-[10px] font-bold text-blue-400">%</span>
                                    </div>
                                )}
                            </div>

                            <div className="w-80 space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 relative">
                                {/* Net Before VAT — แสดงเสมอ */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">ก่อน VAT (Net)</span>
                                    <span className="font-medium text-gray-700">{formatCurrency(netBeforeVat)}</span>
                                </div>

                                {/* Standard VAT */}
                                <div className="flex justify-between items-center text-sm pt-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isVatEnabled}
                                            onChange={(e) => setIsVatEnabled(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            aria-label="Toggle VAT"
                                        />
                                        <span className="text-gray-600">+ ภาษีมูลค่าเพิ่ม (VAT)</span>
                                        {isVatEnabled && (
                                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-0.5 ml-1">
                                                <input
                                                    type="number"
                                                    value={vatRate}
                                                    onChange={(e) => setVatRate(Number(e.target.value))}
                                                    className="w-8 bg-transparent text-center focus:outline-none font-bold text-blue-600"
                                                    aria-label="VAT Rate"
                                                />
                                                <span className="text-[10px] font-bold text-gray-400">%</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="font-bold text-gray-800">{isVatEnabled ? formatCurrency(vatAmount) : '0.00'}</span>
                                        {isVatEnabled && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-[10px] text-gray-400">ปรับปรุง:</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={manualVatAdjustment}
                                                    onChange={(e) => setManualVatAdjustment(parseFloat(e.target.value) || 0)}
                                                    className="w-12 text-[10px] border border-gray-200 rounded text-right px-1 bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                    title="Adjustment (+/-)"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Subtotal (Net + VAT) */}
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                                    <span className="text-gray-600 font-medium">รวมเป็นเงิน (Subtotal)</span>
                                    <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
                                </div>

                                {/* Withholding Tax (WHT) — คำนวณจากยอดก่อน VAT */}
                                <div className="space-y-2 pt-2 border-t border-dashed border-gray-300">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isWhtEnabled}
                                                onChange={(e) => setIsWhtEnabled(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                aria-label="Toggle WHT"
                                            />
                                            <div>
                                                <span className="text-gray-600">หัก ณ ที่จ่าย (WHT)</span>
                                                {isWhtEnabled && (
                                                    <div className="text-[10px] text-gray-400 leading-tight">
                                                        คำนวณจากยอดก่อน VAT ({formatCurrency(netBeforeVat)})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isWhtEnabled && (
                                            <span className="font-bold text-red-600">-{formatCurrency(whtAmount)}</span>
                                        )}
                                    </div>

                                    {isWhtEnabled && (
                                        <div className="pl-6 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={whtType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setWhtType(val);
                                                        if (val !== 'custom') {
                                                            setWhtRate(Number(val));
                                                        }
                                                    }}
                                                    className="text-xs border border-gray-200 rounded p-1.5 flex-1 bg-white"
                                                    aria-label="Select WHT Type"
                                                >
                                                    <option value="custom">กำหนดเอง</option>
                                                    {TAX_TYPES.map(t => (
                                                        <option key={t.label} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                                                    <input
                                                        type="number"
                                                        value={whtRate}
                                                        onChange={(e) => {
                                                            setWhtRate(Number(e.target.value));
                                                            setWhtType('custom');
                                                        }}
                                                        className="w-10 bg-transparent text-center focus:outline-none font-bold text-red-600"
                                                        step="0.01"
                                                        aria-label="WHT Rate"
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-400">%</span>
                                                </div>
                                            </div>
                                            {whtType === 'custom' && (
                                                <input
                                                    type="text"
                                                    placeholder="ระบุชื่อรายการหัก ณ ที่จ่าย"
                                                    value={customWhtLabel}
                                                    onChange={e => setCustomWhtLabel(e.target.value)}
                                                    className="text-xs border border-gray-200 rounded p-1.5 w-full bg-white ml-2"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200 mt-2">
                                    <span className="text-base font-black text-gray-900">ยอดรวมทั้งสิ้น</span>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-blue-600 tracking-tight leading-none">
                                            {formatCurrency(totalAmount)}
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Baht (บาท)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-end space-x-3 bg-gray-50">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed">
                            {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันสร้างใบสั่งซื้อ'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};

export default CreatePOModal;
