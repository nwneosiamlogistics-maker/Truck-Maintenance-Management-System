import React, { useState } from 'react';
import type { MaintenancePlan, Technician } from '../types';

interface LogMaintenanceModalProps {
    plan: MaintenancePlan;
    technicians: Technician[];
    onSave: (logData: { serviceDate: string; mileage: number; technicianId: string | null; notes: string; }) => void;
    onClose: () => void;
}

const LogMaintenanceModal: React.FC<LogMaintenanceModalProps> = ({ plan, technicians, onSave, onClose }) => {
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [mileage, setMileage] = useState(plan.lastServiceMileage + plan.mileageFrequency);
    const [technicianId, setTechnicianId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceDate || mileage <= plan.lastServiceMileage) {
            alert('กรุณากรอกข้อมูลให้ถูกต้อง (เลขไมล์ต้องมากกว่าครั้งล่าสุด)');
            return;
        }
        onSave({ serviceDate, mileage, technicianId, notes });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">บันทึกการบำรุงรักษา</h3>
                        <p className="text-base text-gray-500">{plan.planName} - {plan.vehicleLicensePlate}</p>
                    </div>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="log-maintenance-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">วันที่เข้ารับบริการ *</label>
                        <input
                            type="date"
                            value={serviceDate}
                            onChange={e => setServiceDate(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เลขไมล์ปัจจุบัน *</label>
                        <input
                            type="number"
                            value={mileage}
                            onChange={e => setMileage(Number(e.target.value))}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder={`เลขไมล์ล่าสุด: ${plan.lastServiceMileage.toLocaleString()}`}
                        />
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ช่างที่รับผิดชอบ</label>
                         <select value={technicianId || ''} onChange={e => setTechnicianId(e.target.value || null)} className="w-full p-2 border border-gray-300 rounded-lg">
                             <option value="">-- ไม่ระบุ --</option>
                             {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                         </select>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                         <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น เปลี่ยนกรองอากาศ, สลับยาง" />
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="log-maintenance-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default LogMaintenanceModal;