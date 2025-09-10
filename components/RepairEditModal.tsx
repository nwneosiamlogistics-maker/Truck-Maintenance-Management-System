import React, { useState, useEffect } from 'react';
import type { Repair, Technician } from '../types';

interface RepairEditModalProps {
    repair: Repair;
    technicians: Technician[];
    onSave: (repair: Repair) => void;
    onClose: () => void;
}

const RepairEditModal: React.FC<RepairEditModalProps> = ({ repair, technicians, onSave, onClose }) => {
    const [formData, setFormData] = useState<Repair>(repair);

    useEffect(() => {
        setFormData(repair);
    }, [repair]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">แก้ไขใบแจ้งซ่อม: {repair.repairOrderNo}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="edit-repair-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ทะเบียนรถ</label>
                            <input type="text" value={formData.licensePlate} disabled className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" />
                        </div>
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ยี่ห้อ</label>
                            <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">รุ่น</label>
                            <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">เลขที่ใบเบิก</label>
                            <input type="text" name="requisitionNumber" value={formData.requisitionNumber || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">เลขที่ Invoice</label>
                            <input type="text" name="invoiceNumber" value={formData.invoiceNumber || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">สถานะ</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="รอซ่อม">รอซ่อม</option>
                                <option value="กำลังซ่อม">กำลังซ่อม</option>
                                <option value="รออะไหล่">รออะไหล่</option>
                                <option value="ซ่อมเสร็จ">ซ่อมเสร็จ</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่อนุมัติซ่อม</label>
                            <input type="date" name="approvalDate" value={formData.approvalDate ? formData.approvalDate.split('T')[0] : ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ความสำคัญ</label>
                             <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="ปกติ">ปกติ</option>
                                <option value="เร่งด่วน">เร่งด่วน</option>
                                <option value="ฉุกเฉิน">ฉุกเฉิน</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่เริ่มซ่อม</label>
                            <input type="date" name="repairStartDate" value={formData.repairStartDate ? formData.repairStartDate.split('T')[0] : ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่ซ่อมเสร็จ</label>
                            <input type="date" name="repairEndDate" value={formData.repairEndDate ? formData.repairEndDate.split('T')[0] : ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">มอบหมายช่าง</label>
                            <select name="assignedTechnician" value={formData.assignedTechnician} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="">-- ไม่ระบุ --</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name} ({tech.status})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ค่าใช้จ่ายซ่อม (บาท)</label>
                            <input type="number" name="repairCost" value={formData.repairCost || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>

                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
                    </div>

                </form>
                 <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="edit-repair-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default RepairEditModal;