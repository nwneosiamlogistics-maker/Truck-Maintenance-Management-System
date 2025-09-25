
import React, { useState, useEffect, useMemo } from 'react';
import type { MaintenancePlan, Repair } from '../types';

interface MaintenancePlanModalProps {
    plan: MaintenancePlan | null;
    onSave: (planData: Omit<MaintenancePlan, 'id'>) => void;
    onClose: () => void;
    allRepairs: Repair[];
}

const MaintenancePlanModal: React.FC<MaintenancePlanModalProps> = ({ plan, onSave, onClose, allRepairs }) => {
    
    const getInitialState = (): Omit<MaintenancePlan, 'id'> => {
        if (plan) return {
            vehicleLicensePlate: plan.vehicleLicensePlate,
            planName: plan.planName,
            lastServiceDate: plan.lastServiceDate,
            frequencyValue: plan.frequencyValue,
            frequencyUnit: plan.frequencyUnit,
            lastServiceMileage: plan.lastServiceMileage,
            mileageFrequency: plan.mileageFrequency,
        };
        return {
            vehicleLicensePlate: '',
            planName: '',
            lastServiceDate: new Date().toISOString().split('T')[0],
            frequencyValue: 3,
            frequencyUnit: 'months',
            lastServiceMileage: 0,
            mileageFrequency: 10000,
        };
    };

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        setFormData(getInitialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan]);

    const uniqueLicensePlates = useMemo(() => {
        const plates = new Set((Array.isArray(allRepairs) ? allRepairs : []).map(r => r.licensePlate));
        return Array.from(plates).sort();
    }, [allRepairs]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parsedValue = ['frequencyValue', 'lastServiceMileage', 'mileageFrequency'].includes(name) 
            ? parseInt(value, 10) || 0 
            : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue as any }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleLicensePlate || !formData.planName) {
            alert('กรุณากรอกทะเบียนรถและชื่อแผน');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{plan ? 'แก้ไข' : 'เพิ่ม'}แผนบำรุงรักษา</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="maintenance-plan-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ทะเบียนรถ *</label>
                            <input
                                list="license-plates"
                                name="vehicleLicensePlate"
                                value={formData.vehicleLicensePlate}
                                onChange={handleInputChange}
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <datalist id="license-plates">
                                {uniqueLicensePlates.map(plate => <option key={plate} value={plate} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ชื่อแผน *</label>
                            <input type="text" name="planName" value={formData.planName} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น เปลี่ยนน้ำมันเครื่อง"/>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">เงื่อนไขตามเวลา</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เข้ารับบริการครั้งล่าสุด</label>
                                <input type="date" name="lastServiceDate" value={formData.lastServiceDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ความถี่</label>
                                <div className="flex gap-2">
                                    <input type="number" name="frequencyValue" value={formData.frequencyValue} onChange={handleInputChange} className="w-1/2 p-2 border border-gray-300 rounded-lg"/>
                                    <select name="frequencyUnit" value={formData.frequencyUnit} onChange={handleInputChange} className="w-1/2 p-2 border border-gray-300 rounded-lg">
                                        <option value="days">วัน</option>
                                        <option value="weeks">สัปดาห์</option>
                                        <option value="months">เดือน</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                     <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">เงื่อนไขตามระยะทาง (กม.)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เลขไมล์ที่เข้ารับบริการล่าสุด</label>
                                <input type="number" name="lastServiceMileage" value={formData.lastServiceMileage} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ระยะทางสำหรับครั้งถัดไป</label>
                                <input type="number" name="mileageFrequency" value={formData.mileageFrequency} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น 10000"/>
                            </div>
                        </div>
                    </div>
                    
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="maintenance-plan-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePlanModal;
