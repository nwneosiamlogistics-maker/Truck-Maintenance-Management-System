import React, { useState, useMemo } from 'react';
import type { PartRequisitionItem, Supplier } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateThaiTax, calculateVat, formatCurrency } from '../utils';

type ExternalPart = Omit<PartRequisitionItem, 'partId' | 'source' | 'supplierName' | 'code' | 'purchaseDate'> & { tempId: number };

interface ExternalPartModalProps {
    onClose: () => void;
    onAddExternalParts: (data: { parts: PartRequisitionItem[], vat: number }) => void;
    suppliers: Supplier[];
}

const ExternalPartModal: React.FC<ExternalPartModalProps> = ({ onClose, onAddExternalParts, suppliers }) => {
    const [supplierName, setSupplierName] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [parts, setParts] = useState<ExternalPart[]>([
        { tempId: 1, name: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0 }
    ]);
    const [isVatEnabled, setIsVatEnabled] = useState(false);
    const [vatRate, setVatRate] = useState<number>(7);
    const { addToast } = useToast();

    const handleAddPartRow = () => {
        setParts(prev => [...prev, { tempId: Date.now(), name: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0 }]);
    };

    const handlePartChange = (index: number, field: keyof ExternalPart, value: string | number) => {
        const newParts = [...parts];
        if (typeof newParts[index][field] === 'number') {
            value = Number(value) || 0;
        }
        (newParts[index] as any)[field] = value;
        setParts(newParts);
    };

    const handleRemovePart = (tempId: number) => {
        setParts(prev => prev.filter(p => p.tempId !== tempId));
    };

    const { subtotal, vatAmount, grandTotal } = useMemo(() => {
        // Round each row total to ensure subtotal matches what user sees
        const sub = parts.reduce((total, part) => {
            const rowTotal = calculateThaiTax(part.quantity * part.unitPrice);
            return total + rowTotal;
        }, 0);

        const roundedSub = calculateThaiTax(sub);
        const vat = isVatEnabled ? calculateVat(roundedSub, vatRate) : 0;
        const total = calculateThaiTax(roundedSub + vat);

        return { subtotal: roundedSub, vatAmount: vat, grandTotal: total };
    }, [parts, isVatEnabled, vatRate]);

    const handleSubmit = () => {
        if (!supplierName.trim() || !purchaseDate) {
            addToast('กรุณากรอกชื่อร้านค้าและวันที่ซื้อ', 'warning');
            return;
        }
        const validParts = parts.filter(p => p.name.trim() && p.quantity > 0 && p.unitPrice >= 0);
        if (validParts.length === 0) {
            addToast('กรุณาเพิ่มรายการอะไหล่อย่างน้อย 1 รายการ', 'warning');
            return;
        }

        const partsToAdd: PartRequisitionItem[] = validParts.map(p => ({
            partId: `ext-${Date.now()}-${p.tempId}`,
            name: p.name,
            code: '',
            quantity: p.quantity,
            unit: p.unit,
            unitPrice: p.unitPrice,
            source: 'ร้านค้า',
            supplierName: supplierName,
            purchaseDate: purchaseDate,
        }));

        onAddExternalParts({ parts: partsToAdd, vat: vatAmount });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[110] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">เพิ่มรายการเบิกอะไหล่จากร้านค้า</h3>
                    <p className="text-gray-500">กรอกข้อมูลการซื้อจากใบเสร็จหรือใบเสนอราคา</p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ชื่อร้านค้า / ผู้จำหน่าย *</label>
                            <input
                                list="supplier-list"
                                type="text"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="เช่น ร้านศรีสมบูรณ์อะไหล่ยนต์"
                                aria-label="ชื่อร้านค้า / ผู้จำหน่าย"
                                required
                            />
                            <datalist id="supplier-list">
                                {suppliers.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่ซื้ออะไหล่ *</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                aria-label="วันที่ซื้ออะไหล่"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-base font-medium text-gray-700">รายการอะไหล่</label>
                        {parts.map((part, index) => (
                            <div key={part.tempId} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="ชื่ออะไหล่"
                                    value={part.name}
                                    onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                                    aria-label="ชื่ออะไหล่"
                                    className="col-span-4 p-2 border rounded-lg"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    value={part.quantity}
                                    onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                                    aria-label="จำนวน"
                                    className="col-span-2 p-2 border rounded-lg text-right"
                                />
                                <input
                                    type="text"
                                    placeholder="หน่วย"
                                    value={part.unit}
                                    onChange={(e) => handlePartChange(index, 'unit', e.target.value)}
                                    aria-label="หน่วย"
                                    className="col-span-2 p-2 border rounded-lg text-center"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={part.unitPrice}
                                    onChange={(e) => handlePartChange(index, 'unitPrice', e.target.value)}
                                    aria-label="ราคาต่อหน่วย"
                                    className="col-span-2 p-2 border rounded-lg text-right"
                                />
                                <div className="col-span-1 text-right font-semibold">
                                    {formatCurrency(part.quantity * part.unitPrice)}
                                </div>
                                <button onClick={() => handleRemovePart(part.tempId)} aria-label="ลบรายการ" className="col-span-1 text-red-500 text-2xl font-bold hover:text-red-700 text-center">×</button>
                            </div>
                        ))}
                        <button onClick={handleAddPartRow} className="w-full text-blue-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50">
                            + เพิ่มรายการ
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center text-lg">
                        <span>ราคารวมอะไหล่</span>
                        <span className="font-semibold">{formatCurrency(subtotal)} บาท</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={isVatEnabled} onChange={(e) => setIsVatEnabled(e.target.checked)} aria-label="เปิดใช้งาน VAT" className="h-5 w-5" />
                            <label>VAT</label>
                            <input
                                type="number"
                                value={vatRate}
                                onChange={(e) => setVatRate(Number(e.target.value))}
                                disabled={!isVatEnabled}
                                aria-label="อัตราภาษีมูลค่าเพิ่ม"
                                className="w-20 p-1 border rounded-md text-right disabled:bg-gray-200"
                            />
                            <span>%</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(vatAmount)} บาท</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold border-t pt-3">
                        <span>ยอดรวมสุทธิ</span>
                        <span className="text-blue-600">{formatCurrency(grandTotal)} บาท</span>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end items-center bg-white">
                    <div className="space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                            เพิ่มเข้ารายการ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExternalPartModal;
