import React, { useState, useMemo } from 'react';
import type { StockItem, UsedPartBuyer } from '../types';
import { useToast } from '../context/ToastContext';
import CashBillPrintModal from './CashBillPrintModal';

// Interface for a single sales grade
export interface SaleGrade {
    id: number;
    condition: string;
    price: number;
    quantity: number;
}

// Data structure passed to onSave
export interface GradedSaleData {
    grades: Omit<SaleGrade, 'id'>[];
    buyer: string;
    notes: string;
}

interface GradedSaleModalProps {
    item: StockItem;
    buyers: UsedPartBuyer[];
    onSave: (data: GradedSaleData) => void;
    onClose: () => void;
}

const SellFungibleItemModal: React.FC<GradedSaleModalProps> = ({ item, buyers, onSave, onClose }) => {
    const { addToast } = useToast();
    
    // State for the list of sale grades
    const [grades, setGrades] = useState<SaleGrade[]>([
        { id: Date.now(), condition: '', price: 0, quantity: 1 }
    ]);
    
    const [buyer, setBuyer] = useState('');
    const [notes, setNotes] = useState('');
    const [previewData, setPreviewData] = useState<{ item: StockItem, saleData: GradedSaleData, billNumber: string } | null>(null);

    const { totalQuantity, totalValue } = useMemo(() => {
        const tq = grades.reduce((sum, grade) => sum + (Number(grade.quantity) || 0), 0);
        const tv = grades.reduce((sum, grade) => sum + (Number(grade.quantity) || 0) * (Number(grade.price) || 0), 0);
        return { totalQuantity: tq, totalValue: tv };
    }, [grades]);

    const handleGradeChange = (id: number, field: keyof Omit<SaleGrade, 'id'>, value: string | number) => {
        setGrades(currentGrades => 
            currentGrades.map(grade => 
                grade.id === id ? { ...grade, [field]: value } : grade
            )
        );
    };

    const addGrade = () => {
        setGrades(prev => [...prev, { id: Date.now(), condition: '', price: 0, quantity: 1 }]);
    };
    
    const removeGrade = (id: number) => {
        setGrades(prev => prev.filter(grade => grade.id !== id));
    };

    const handlePreview = () => {
        if (!buyer.trim()) {
            addToast('กรุณากรอกชื่อผู้รับซื้อเพื่อดูตัวอย่าง', 'warning');
            return;
        }

        if (totalQuantity <= 0) {
            addToast('กรุณากรอกจำนวนเพื่อดูตัวอย่าง', 'warning');
            return;
        }

        const validGrades = grades.filter(g => g.quantity > 0 && g.condition.trim() !== '');
        if (validGrades.length === 0) {
             addToast('กรุณากรอกข้อมูลเกรดการขายอย่างน้อย 1 รายการเพื่อดูตัวอย่าง', 'warning');
             return;
        }
        
        const saleDataForPreview: GradedSaleData = {
            grades: validGrades.map(({ id, ...rest }) => rest),
            buyer,
            notes
        };

        const now = new Date();
        const tempBillNumber = `PREVIEW-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
        
        setPreviewData({
            item: item,
            saleData: saleDataForPreview,
            billNumber: tempBillNumber,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!buyer.trim()) {
            addToast('กรุณากรอกชื่อผู้รับซื้อ', 'warning');
            return;
        }

        if (totalQuantity <= 0) {
            addToast('กรุณากรอกจำนวนที่ต้องการขาย', 'warning');
            return;
        }
        
        if (totalQuantity > item.quantity) {
            addToast(`จำนวนที่ขาย (${totalQuantity}) เกินจำนวนคงเหลือในสต็อก (${item.quantity})`, 'error');
            return;
        }

        const validGrades = grades.filter(g => g.quantity > 0 && g.condition.trim() !== '');
        if (validGrades.length === 0) {
             addToast('กรุณากรอกข้อมูลเกรดการขายอย่างน้อย 1 รายการ', 'warning');
             return;
        }
        
        onSave({
            grades: validGrades.map(({ id, ...rest }) => rest),
            buyer,
            notes
        });
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b">
                        <h3 className="text-2xl font-bold text-gray-800">คัดแยกและขาย: {item.name}</h3>
                        <p className="text-base text-gray-500">คงเหลือในสต็อก: {item.quantity} {item.unit}</p>
                    </div>

                    <form id="graded-sale-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                        {/* Grades section */}
                        <div className="space-y-3">
                            <label className="block text-base font-medium text-gray-700">รายการคัดแยกเพื่อขาย</label>
                            {grades.map((grade, index) => (
                                <div key={grade.id} className="grid grid-cols-12 gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="สภาพ (เช่น เกรด A, พอใช้)"
                                        value={grade.condition}
                                        onChange={e => handleGradeChange(grade.id, 'condition', e.target.value)}
                                        className="col-span-4 p-2 border rounded-lg"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="ราคา/หน่วย"
                                        value={grade.price}
                                        onChange={e => handleGradeChange(grade.id, 'price', Number(e.target.value))}
                                        className="col-span-3 p-2 border rounded-lg text-right"
                                        min="0"
                                        step="any"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="จำนวน"
                                        value={grade.quantity}
                                        onChange={e => handleGradeChange(grade.id, 'quantity', Number(e.target.value))}
                                        className="col-span-3 p-2 border rounded-lg text-right"
                                        min="1"
                                        step="any"
                                        required
                                    />
                                    <div className="col-span-2 flex justify-end">
                                        {grades.length > 1 && (
                                            <button type="button" onClick={() => removeGrade(grade.id)} className="text-red-500 font-bold text-2xl hover:text-red-700">×</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addGrade} className="w-full text-blue-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50">
                                + เพิ่มเกรดการขาย
                            </button>
                        </div>

                        {/* Buyer and Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">ผู้รับซื้อ *</label>
                                <input
                                    list="buyer-list"
                                    type="text"
                                    value={buyer}
                                    onChange={(e) => setBuyer(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                />
                                <datalist id="buyer-list">
                                    {buyers.map(b => <option key={b.id} value={b.name} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        
                        {/* Summary */}
                        <div className="text-right font-bold text-xl pt-4 border-t">
                            <p>จำนวนรวม: <span className={totalQuantity > item.quantity ? 'text-red-600' : ''}>{totalQuantity.toLocaleString()}</span> / {item.quantity.toLocaleString()} {item.unit}</p>
                            <p>ยอดรวมทั้งหมด: {totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</p>
                        </div>
                    </form>

                    <div className="p-6 border-t flex justify-between items-center">
                        <button
                            type="button"
                            onClick={handlePreview}
                            className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                            ตัวอย่างบิลเงินสด
                        </button>
                        <div className="space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                            <button type="submit" form="graded-sale-form" className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                                ยืนยันการขาย
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {previewData && (
                <CashBillPrintModal
                    item={previewData.item}
                    saleData={previewData.saleData}
                    billNumber={previewData.billNumber}
                    onClose={() => setPreviewData(null)}
                />
            )}
        </>
    );
};

export default SellFungibleItemModal;