import React, { useState } from 'react';
import type { UsedPart, UsedPartBatchStatus } from '../types';

interface UpdateUsedPartStatusModalProps {
    usedPart: UsedPart;
    onSave: (updatedPart: UsedPart) => void;
    onClose: () => void;
}

const UpdateUsedPartStatusModal: React.FC<UpdateUsedPartStatusModalProps> = ({ usedPart, onSave, onClose }) => {
    const [newStatus, setNewStatus] = useState<UsedPartBatchStatus>(usedPart.status);
    const [notes, setNotes] = useState(usedPart.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...usedPart, status: newStatus, notes: notes });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">อัปเดตสถานะอะไหล่เก่า</h3>
                        <p className="text-base text-gray-500">{usedPart.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="update-used-part-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เปลี่ยนสถานะเป็น *</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as UsedPartBatchStatus)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="รอจัดการ">รอจัดการ</option>
                            <option value="จัดการบางส่วน">จัดการบางส่วน</option>
                            <option value="จัดการครบแล้ว">จัดการครบแล้ว</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        ></textarea>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="update-used-part-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateUsedPartStatusModal;