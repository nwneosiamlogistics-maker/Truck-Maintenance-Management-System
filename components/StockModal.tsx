import React, { useState, useEffect } from 'react';
import type { StockItem } from '../types';
import { useToast } from '../context/ToastContext';
import { STOCK_CATEGORIES } from '../data/categories';
import { calculateStockStatus } from '../utils';

interface StockModalProps {
    item: StockItem | null;
    onSave: (item: StockItem, extras: { sourceRepairOrderNo?: string }) => void;
    onClose: () => void;
    existingStock: StockItem[];
    defaults?: Partial<StockItem>;
}

const initialFormState: Omit<StockItem, 'quantityReserved'> = {
    id: '',
    code: '',
    name: '',
    category: STOCK_CATEGORIES[0],
    quantity: 0,
    unit: 'ลิตร',
    minStock: 0,
    maxStock: 0,
    price: 0,
    sellingPrice: 0,
    storageLocation: '',
    supplier: '',
    status: 'ปกติ',
    isFungibleUsedItem: false,
    isRevolvingPart: false,
};

const StockModal: React.FC<StockModalProps> = ({ item, onSave, onClose, existingStock, defaults }) => {
    // State Isolation: Initialize with a blank state.
    const [formData, setFormData] = useState<StockItem>(initialFormState as StockItem);
    const [sourceRepairOrderNo, setSourceRepairOrderNo] = useState('');
    const { addToast } = useToast();

    // State Isolation: Populate state from props using useEffect, ensuring a new copy is created.
    useEffect(() => {
        if (item) {
            // Create a copy with defaults and item data to prevent prop mutation.
            setFormData({ ...initialFormState, ...defaults, ...item } as StockItem);
        } else {
            setFormData({ ...initialFormState, ...defaults } as StockItem);
        }
        setSourceRepairOrderNo('');
    }, [item, defaults]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }

        const parsedValue = ['quantity', 'minStock', 'maxStock', 'price', 'sellingPrice'].includes(name) ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // --- Duplicate Check Logic (only for new items) ---
        if (!item) {
            const codeToCheck = formData.code.trim().toLowerCase();
            const nameToCheck = formData.name.trim().toLowerCase();

            if (!codeToCheck || !nameToCheck) {
                addToast('กรุณากรอกรหัสและชื่ออะไหล่', 'warning');
                return;
            }

            const isDuplicate = existingStock.some(s => 
                s.code.trim().toLowerCase() === codeToCheck || 
                s.name.trim().toLowerCase() === nameToCheck
            );

            if (isDuplicate) {
                addToast('รหัสหรือชื่ออะไหล่นี้มีอยู่แล้ว', 'error');
                return; // Stop submission
            }
        }
        
        const newStatus = calculateStockStatus(formData.quantity, formData.minStock, formData.maxStock);
        
        onSave({ ...formData, status: newStatus }, { sourceRepairOrderNo });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{item ? 'แก้ไข' : 'เพิ่ม'}รายการอะไหล่</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="stock-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">รหัสสินค้า *</label>
                            <input type="text" name="code" value={formData.code} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ชื่ออะไหล่ *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">หมวดหมู่</label>
                            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                {STOCK_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">
                                {item ? 'จำนวนปัจจุบันในสต็อก' : 'จำนวนเริ่มต้น'}
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            {item && <p className="text-xs text-gray-500 mt-1">การแก้ไขจำนวนที่นี่จะสร้างรายการ "ปรับสต็อก" ในประวัติ</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">หน่วยนับ</label>
                            <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">สต๊อกขั้นต่ำ (Min)</label>
                            <input type="number" name="minStock" value={formData.minStock} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">สต๊อกสูงสุด (Max)</label>
                            <input type="number" name="maxStock" value={formData.maxStock || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ราคาทุนต่อหน่วย</label>
                            <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ราคาขายต่อหน่วย</label>
                            <input type="number" name="sellingPrice" value={formData.sellingPrice || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        {!item && (
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ที่มาจากใบซ่อม (ถ้ามี)</label>
                            <input type="text" name="sourceRepairOrderNo" value={sourceRepairOrderNo} onChange={(e) => setSourceRepairOrderNo(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น RO-2024-00123" />
                        </div>
                        )}
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ตำแหน่งจัดเก็บ</label>
                        <input type="text" name="storageLocation" value={formData.storageLocation || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ผู้จัดจำหน่าย</label>
                        <input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isRevolvingPart"
                                checked={!!formData.isRevolvingPart}
                                onChange={handleInputChange}
                                disabled={!!defaults?.isRevolvingPart}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-base font-medium text-gray-800">เป็นอะไหล่หมุนเวียน (สภาพดี ใช้ซ้ำได้)</span>
                        </label>
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isFungibleUsedItem"
                                checked={!!formData.isFungibleUsedItem}
                                onChange={handleInputChange}
                                disabled={!!defaults?.isFungibleUsedItem}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-base font-medium text-gray-800">เป็นสต็อกของเก่าแบบรวม (สำหรับขาย/ทิ้ง)</span>
                        </label>
                         <p className="text-xs text-gray-500 ml-8">ติ๊กช่องนี้สำหรับไอเท็มที่รับคืนของเก่ามารวมกันเพื่อขาย เช่น น้ำมันเครื่องใช้แล้ว, เศษเหล็ก, แบตเตอรี่เก่า</p>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="stock-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default StockModal;
