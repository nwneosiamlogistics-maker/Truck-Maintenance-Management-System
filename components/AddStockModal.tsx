import React, { useState, useMemo } from 'react';
import type { StockItem } from '../types';

interface AddStockModalProps {
    stock: StockItem[];
    onSave: (data: {
      stockItem: StockItem;
      quantityAdded: number;
      pricePerUnit?: number;
      requisitionNumber?: string;
      invoiceNumber?: string;
      notes?: string;
      sourceRepairOrderNo?: string;
    }) => void;
    onClose: () => void;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ stock, onSave, onClose }) => {
    const [selectedStockId, setSelectedStockId] = useState('');
    const [quantityAdded, setQuantityAdded] = useState(1);
    const [pricePerUnit, setPricePerUnit] = useState(0);
    const [requisitionNumber, setRequisitionNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [sourceRepairOrderNo, setSourceRepairOrderNo] = useState('');
    const [notes, setNotes] = useState('');
    
    const selectedStockItem = useMemo(() => {
        const item = stock.find(s => s.id === selectedStockId);
        if (item && pricePerUnit === 0) {
            setPricePerUnit(item.price);
        }
        return item;
    }, [stock, selectedStockId, pricePerUnit]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStockItem) {
            alert('กรุณาเลือกรายการอะไหล่');
            return;
        }
        if (quantityAdded <= 0) {
            alert('กรุณากรอกจำนวนที่ต้องการเพิ่มให้ถูกต้อง');
            return;
        }
        onSave({
            stockItem: selectedStockItem,
            quantityAdded,
            pricePerUnit,
            requisitionNumber,
            invoiceNumber,
            sourceRepairOrderNo,
            notes,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                         <h3 className="text-2xl font-bold text-gray-800">เพิ่มสต็อกสินค้า</h3>
                         <p className="text-base text-gray-500">เลือกรายการและกรอกจำนวนที่รับเข้า</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="add-stock-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เลือกอะไหล่ *</label>
                        <select
                            value={selectedStockId}
                            onChange={(e) => setSelectedStockId(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="" disabled>-- กรุณาเลือก --</option>
                            {stock.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">จำนวนที่เพิ่ม *</label>
                            <input 
                                type="number" 
                                value={quantityAdded} 
                                onChange={(e) => setQuantityAdded(Number(e.target.value))} 
                                min="1"
                                required 
                                disabled={!selectedStockId}
                                className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </div>
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ราคาต่อหน่วย (ทุน)</label>
                            <input 
                                type="number" 
                                value={pricePerUnit} 
                                onChange={(e) => setPricePerUnit(Number(e.target.value))} 
                                min="0"
                                disabled={!selectedStockId}
                                className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">เลขที่ใบเบิกสินค้า</label>
                            <input 
                                type="text" 
                                value={requisitionNumber} 
                                onChange={(e) => setRequisitionNumber(e.target.value)} 
                                disabled={!selectedStockId}
                                className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </div>
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">เลขที่ Invoice</label>
                            <input 
                                type="text" 
                                value={invoiceNumber} 
                                onChange={(e) => setInvoiceNumber(e.target.value)} 
                                disabled={!selectedStockId}
                                className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ที่มาจากใบซ่อม (ถ้ามี)</label>
                        <input 
                            type="text" 
                            value={sourceRepairOrderNo} 
                            onChange={(e) => setSourceRepairOrderNo(e.target.value)} 
                            placeholder="เช่น RO-2024-00123"
                            disabled={!selectedStockId}
                            className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                        />
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            disabled={!selectedStockId}
                            className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                        ></textarea>
                    </div>

                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="add-stock-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700" disabled={!selectedStockId}>บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default AddStockModal;