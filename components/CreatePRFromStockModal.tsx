import React, { useState, useEffect } from 'react';
import type { StockItem, Supplier } from '../types';
import { useToast } from '../context/ToastContext';

interface CreatePRFromStockModalProps {
    item: StockItem;
    suppliers: Supplier[];
    onSave: (data: {
        supplier: string;
        quantity: number;
        notes: string;
    }) => void;
    onClose: () => void;
}

const CreatePRFromStockModal: React.FC<CreatePRFromStockModalProps> = ({ item, suppliers, onSave, onClose }) => {
    const suggestedQuantity = Math.max(1, (item.maxStock || item.minStock * 2) - item.quantity);
    
    const [quantity, setQuantity] = useState<number>(suggestedQuantity);
    const [supplier, setSupplier] = useState<string>(item.supplier || '');
    const [notes, setNotes] = useState<string>('');
    const { addToast } = useToast();
    
    useEffect(() => {
        // Pre-select supplier if the item has one and it exists in the list
        if (item.supplier && suppliers.some(s => s.name === item.supplier)) {
            setSupplier(item.supplier);
        } else if (suppliers.length > 0) {
            setSupplier(suppliers[0].name); // Default to the first supplier if item's default is not found
        }
    }, [item.supplier, suppliers]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplier.trim()) {
            addToast('กรุณาเลือกผู้จำหน่าย', 'warning');
            return;
        }
        if (quantity <= 0) {
            addToast('จำนวนต้องมากกว่า 0', 'warning');
            return;
        }
        onSave({ supplier, quantity, notes });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h4 className="font-bold text-lg">ขอซื้อ: {item.name}</h4>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <form id="create-pr-form" onSubmit={handleSubmit} className="p-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        สร้างใบขอซื้อสำหรับ <span className="font-semibold">{item.name} ({item.code})</span>
                        <br />
                        ปัจจุบันมี <span className="font-bold">{item.quantity}</span> ชิ้น (ขั้นต่ำ: {item.minStock})
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">จำนวนที่ต้องการสั่งซื้อ *</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(Number(e.target.value))}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            min="1"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้จำหน่าย *</label>
                        <select
                            value={supplier}
                            onChange={e => setSupplier(e.target.value)}
                            required
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="" disabled>-- เลือกผู้จำหน่าย --</option>
                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="เช่น ของด่วน, ต้องการยี่ห้อ..."
                        />
                    </div>
                </form>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="create-pr-form"
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        สร้างใบขอซื้อ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePRFromStockModal;
