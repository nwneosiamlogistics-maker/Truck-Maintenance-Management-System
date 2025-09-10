import React, { useState } from 'react';
import type { MaintenancePlan } from '../types';

type PlanFormData = Omit<MaintenancePlan, 'id'>;

interface MaintenancePlanModalProps {
    onClose: () => void;
    onAddPlan: (plan: PlanFormData) => void;
}

const MaintenancePlanModal: React.FC<MaintenancePlanModalProps> = ({ onClose, onAddPlan }) => {
    const [formData, setFormData] = useState<PlanFormData>({
        vehicleLicensePlate: '',
        planName: '',
        lastServiceDate: new Date().toISOString().split('T')[0],
        frequencyValue: 1,
        frequencyUnit: 'months',
        lastServiceMileage: 0,
        mileageFrequency: 10000,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parsedValue = ['frequencyValue', 'lastServiceMileage', 'mileageFrequency'].includes(name) ? parseInt(value) || 0 : value;
        setFormData(prev => ({...prev, [name]: parsedValue as any}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleLicensePlate || !formData.planName || !formData.lastServiceDate) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        onAddPlan(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">เพิ่มแผนการบำรุงรักษาใหม่</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="maintenance-plan-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ทะเบียนรถ *</label>
                            <input type="text" name="vehicleLicensePlate" value={formData.vehicleLicensePlate} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น กข-1234"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">แผนการบำรุงรักษา *</label>
                            <input type="text" name="planName" value={formData.planName} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น เปลี่ยนถ่ายน้ำมันเครื่อง"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">วันที่เข้ารับบริการครั้งล่าสุด *</label>
                        <input type="date" name="lastServiceDate" value={formData.lastServiceDate} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                    
                    <div className="border-t pt-4">
                         <label className="block text-base font-bold text-gray-800 mb-2">กำหนดตามระยะเวลา</label>
                         <div className="flex items-center gap-2">
                            <span className="text-gray-700">ทุกๆ</span>
                            <input type="number" name="frequencyValue" min="1" value={formData.frequencyValue} onChange={handleInputChange} required className="w-24 p-2 border border-gray-300 rounded-lg text-center"/>
                            <select name="frequencyUnit" value={formData.frequencyUnit} onChange={handleInputChange} className="flex-1 p-2 border border-gray-300 rounded-lg">
                                <option value="days">วัน</option>
                                <option value="weeks">สัปดาห์</option>
                                <option value="months">เดือน</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-base font-bold text-gray-800 mb-2">กำหนดตามระยะทาง (กม.)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เลขไมล์ ณ วันที่เข้ารับบริการล่าสุด</label>
                                <input type="number" name="lastServiceMileage" value={formData.lastServiceMileage} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น 150000"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดเช็คระยะทุกๆ (กม.)</label>
                                <input type="number" name="mileageFrequency" min="1" value={formData.mileageFrequency} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น 10000"/>
                            </div>
                        </div>
                    </div>

                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="maintenance-plan-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึกแผน</button>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePlanModal;