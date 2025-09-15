import React, { useState, useEffect, useMemo } from 'react';
import type { UsedPart } from '../types';
import { useToast } from '../context/ToastContext';

interface EditUsedPartBatchModalProps {
    part: UsedPart;
    onSave: (updatedPart: UsedPart) => void;
    onClose: () => void;
}

const EditUsedPartBatchModal: React.FC<EditUsedPartBatchModalProps> = ({ part, onSave, onClose }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<UsedPart>(JSON.parse(JSON.stringify(part)));

    useEffect(() => {
        // Ensure date is in YYYY-MM-DD format for the input
        const localDate = new Date(part.dateRemoved).toLocaleDateString('en-CA');
        setFormData({ ...JSON.parse(JSON.stringify(part)), dateRemoved: localDate });
    }, [part]);

    const disposedQuantity = useMemo(() => {
        return (part.dispositions || []).reduce((sum, d) => sum + (d.quantity || 0), 0);
    }, [part.dispositions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const initialQuantity = Number(formData.initialQuantity);
        if (isNaN(initialQuantity) || initialQuantity < disposedQuantity) {
            addToast(`จำนวนเริ่มต้นต้องไม่น้อยกว่าจำนวนที่จัดการไปแล้ว (${disposedQuantity})`, 'error');
            return;
        }

        // Convert date back to ISO string before saving
        const finalData = {
            ...formData,
            initialQuantity: initialQuantity,
            dateRemoved: new Date(formData.dateRemoved).toISOString(),
        };

        onSave(finalData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">แก้ไขข้อมูลอะไหล่เก่า</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="edit-used-part-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ชื่ออะไหล่ *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่ถอด *</label>
                            <input type="date" name="dateRemoved" value={formData.dateRemoved} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">จำนวนเริ่มต้น *</label>
                            <input type="number" name="initialQuantity" value={formData.initialQuantity} onChange={handleInputChange} required min={disposedQuantity} className="w-full p-2 border border-gray-300 rounded-lg"/>
                            {disposedQuantity > 0 && <p className="text-xs text-gray-500 mt-1">จัดการไปแล้ว {disposedQuantity} ชิ้น</p>}
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">หน่วยนับ *</label>
                            <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ที่มาจากใบซ่อม</label>
                            <input type="text" name="fromRepairOrderNo" value={formData.fromRepairOrderNo} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ทะเบียนรถ</label>
                            <input type="text" name="fromLicensePlate" value={formData.fromLicensePlate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="edit-used-part-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึกการเปลี่ยนแปลง</button>
                </div>
            </div>
        </div>
    );
};

export default EditUsedPartBatchModal;