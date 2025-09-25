import React, { useState, useEffect } from 'react';
import type { UsedPartBuyer } from '../types';
import { useToast } from '../context/ToastContext';

interface UsedPartBuyerModalProps {
    buyer: UsedPartBuyer | null;
    onSave: (buyer: UsedPartBuyer) => void;
    onClose: () => void;
    existingBuyers: UsedPartBuyer[];
}

const UsedPartBuyerModal: React.FC<UsedPartBuyerModalProps> = ({ buyer, onSave, onClose, existingBuyers }) => {
    const getInitialState = (): Omit<UsedPartBuyer, 'id'> => {
        return buyer || {
            code: '',
            name: '',
            products: '',
            address: null,
            phone: null,
            email: null,
            otherContacts: null,
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(getInitialState());
    }, [buyer]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            addToast('กรุณากรอกรหัสและชื่อผู้รับซื้อ', 'warning');
            return;
        }

        const isDuplicate = existingBuyers.some(b =>
            b.id !== buyer?.id && (
                b.code.trim().toLowerCase() === formData.code.trim().toLowerCase() ||
                b.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
            )
        );

        if (isDuplicate) {
            addToast('รหัสหรือชื่อผู้รับซื้อนี้มีอยู่แล้ว', 'error');
            return;
        }
        
        onSave({ ...formData, id: buyer?.id || '' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{buyer ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลผู้รับซื้อ</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="buyer-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium">รหัส *</label>
                            <input type="text" name="code" value={formData.code || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">ชื่อผู้รับซื้อ *</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">สินค้าที่รับซื้อ (คั่นด้วย ,)</label>
                        <input type="text" name="products" value={formData.products || ''} onChange={handleInputChange} placeholder="เช่น ยางรถยนต์, น้ำมันเครื่องเก่า" className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">ที่อยู่</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">เบอร์โทรศัพท์</label>
                            <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">อีเมล</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">ช่องทางติดต่ออื่นๆ (Line, Facebook)</label>
                        <input type="text" name="otherContacts" value={formData.otherContacts || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="buyer-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default UsedPartBuyerModal;