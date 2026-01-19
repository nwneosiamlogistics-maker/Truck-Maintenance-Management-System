import React, { useState, useMemo } from 'react';
import type { StockItem } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus } from '../utils';

interface StockWithdrawalModalProps {
    stock: StockItem[];
    onSave: (data: {
        stockItemId: string;
        quantity: number;
        reason: string;
        withdrawnBy: string;
        notes: string;
    }) => void;
    onClose: () => void;
}

const REASON_OPTIONS = [
    'ใช้ในงานซ่อมบำรุงทั่วไป (ไม่ระบุใบซ่อม)',
    'ของชำรุด/เสียหาย',
    'อื่นๆ',
];

const StockWithdrawalModal: React.FC<StockWithdrawalModalProps> = ({ stock, onSave, onClose }) => {
    const [selectedStockId, setSelectedStockId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState(REASON_OPTIONS[0]);
    const [otherReason, setOtherReason] = useState('');
    const [withdrawnBy, setWithdrawnBy] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const selectedStockItem = useMemo(() => {
        return stock.find(item => item.id === selectedStockId);
    }, [stock, selectedStockId]);

    const handleStockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setSelectedStockId(newId);
        setQuantity(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 🛡️ Double-Submit Prevention
        if (isSubmitting) return;

        if (!selectedStockItem) {
            addToast('กรุณาเลือกอะไหล่', 'warning');
            return;
        }
        if (quantity <= 0 || quantity > selectedStockItem.quantity) {
            addToast('กรุณากรอกจำนวนให้ถูกต้อง', 'warning');
            return;
        }

        const finalReason = reason === 'อื่นๆ' ? otherReason : reason;
        if (reason === 'อื่นๆ' && !otherReason.trim()) {
            addToast('กรุณาระบุเหตุผลการเบิก', 'warning');
            return;
        }

        if (!withdrawnBy.trim()) {
            addToast('กรุณากรอกชื่อผู้เบิก', 'warning');
            return;
        }

        if (!notes.trim()) {
            addToast('กรุณากรอกหมายเหตุเพิ่มเติม', 'warning');
            return;
        }

        // 🛡️ Confirmation Dialog before withdrawal
        const confirmMessage = `ยืนยันการเบิก "${selectedStockItem.name}" จำนวน ${quantity} ${selectedStockItem.unit}?\n\nผู้เบิก: ${withdrawnBy}\nเหตุผล: ${finalReason}`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsSubmitting(true);
        try {
            onSave({
                stockItemId: selectedStockId,
                quantity,
                reason: finalReason,
                withdrawnBy,
                notes,
            });
        } catch (error) {
            console.error('Withdrawal error:', error);
            addToast('เกิดข้อผิดพลาดในการเบิกสต๊อก', 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">เบิกอะไหล่ (ใช้งานทั่วไป)</h3>
                        <p className="text-base text-gray-500">สำหรับเบิกของที่ไม่เกี่ยวข้องกับใบแจ้งซ่อม</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full" title="ปิดหน้าต่าง" aria-label="ปิดหน้าต่าง">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="withdraw-stock-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เลือกอะไหล่ *</label>
                        <select
                            value={selectedStockId}
                            onChange={handleStockChange}
                            required
                            title="เลือกอะไหล่ที่ต้องการเบิก"
                            aria-label="เลือกอะไหล่"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="" disabled>-- กรุณาเลือก --</option>
                            {stock.filter(s => s.quantity > 0).map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} (คงเหลือ: {item.quantity} {item.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">จำนวนที่เบิก *</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                min="1"
                                max={selectedStockItem?.quantity}
                                required
                                disabled={!selectedStockItem || isSubmitting}
                                title="จำนวนที่ต้องการเบิก"
                                placeholder="1"
                                className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ผู้เบิก *</label>
                            <input
                                type="text"
                                value={withdrawnBy}
                                onChange={(e) => setWithdrawnBy(e.target.value)}
                                placeholder="ชื่อ-สกุล"
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เหตุผลการเบิก *</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            title="เหตุผลการเบิก"
                            aria-label="เหตุผลการเบิก"
                            disabled={isSubmitting}
                            className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                        >
                            {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {reason === 'อื่นๆ' && (
                            <input
                                type="text"
                                value={otherReason}
                                onChange={(e) => setOtherReason(e.target.value)}
                                required
                                placeholder="โปรดระบุเหตุผล"
                                className="mt-2 w-full p-2 border border-gray-300 rounded-lg"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุเพิ่มเติม *</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            required
                            placeholder="เช่น เติมน้ำมันรถโฟล์คลิฟท์ (Forklift) เป็นต้น"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        ></textarea>
                    </div>

                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">ยกเลิก</button>
                    <button type="submit" form="withdraw-stock-form" className="px-8 py-2 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[140px]" disabled={!selectedStockItem || isSubmitting}>
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการเบิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockWithdrawalModal;