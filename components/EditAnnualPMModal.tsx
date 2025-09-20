import React, { useState } from 'react';
import type { AnnualPMPlan, Vehicle, MonthStatus, Technician, PMHistory } from '../types';

export interface EditModalData {
    plan: any; // The enriched display plan object
    monthIndex: number;
    currentStatus: MonthStatus;
}

interface EditAnnualPMModalProps {
    planData: EditModalData;
    vehicle?: Vehicle;
    onClose: () => void;
    onSave: (planId: string, monthIndex: number, status: MonthStatus, historyLog?: Omit<PMHistory, 'id'>) => void;
    technicians: Technician[];
}

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export const EditAnnualPMModal: React.FC<EditAnnualPMModalProps> = ({ planData, vehicle, onClose, onSave, technicians }) => {
    const { plan, monthIndex, currentStatus } = planData;
    const [status, setStatus] = useState<MonthStatus>(currentStatus);
    
    // State for history log
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [mileage, setMileage] = useState(plan.currentMileage || plan.nextServiceMileage || '');
    const [technicianId, setTechnicianId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let historyLog: Omit<PMHistory, 'id'> | undefined = undefined;

        if (status === 'completed' || status === 'completed_unplanned') {
            if (!serviceDate || !mileage) {
                alert('กรุณากรอกวันที่และเลขไมล์ที่เข้ารับบริการ');
                return;
            }
            historyLog = {
                maintenancePlanId: plan.maintenancePlanId,
                vehicleLicensePlate: plan.vehicleLicensePlate,
                planName: plan.planName,
                serviceDate: new Date(serviceDate).toISOString(),
                mileage: Number(mileage),
                technicianId,
                notes,
            };
        }

        onSave(plan.id, monthIndex, status, historyLog);
    };

    const statusConfig = {
        none: {
            label: "ไม่มีแผน",
            icon: null,
        },
        planned: {
            label: "วางแผนแล้ว",
            icon: (
                <div className="flex flex-col items-center justify-center -space-y-2.5 mr-2">
                    <span className="text-2xl text-lime-700">●</span>
                    <span className="text-2xl text-transparent">●</span>
                </div>
            ),
        },
        completed: {
            label: "ดำเนินการแล้ว (ตามแผน)",
            icon: (
                <div className="flex flex-col items-center justify-center -space-y-2.5 mr-2">
                    <span className="text-2xl text-lime-700">●</span>
                    <span className="text-2xl text-sky-600">●</span>
                </div>
            ),
        },
        completed_unplanned: {
            label: "ดำเนินการ (ไม่ตรงตามแผน)",
            icon: (
                <div className="flex flex-col items-center justify-center -space-y-2.5 mr-2">
                    <span className="text-2xl text-transparent">●</span>
                    <span className="text-2xl text-sky-600">●</span>
                </div>
            ),
        }
    };

    const showHistoryForm = status === 'completed' || status === 'completed_unplanned';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b">
                        <h3 className="text-2xl font-bold text-gray-800">อัปเดตสถานะแผน PM</h3>
                        <p className="text-gray-600">
                            {plan.vehicleLicensePlate} ({vehicle?.vehicleType || '-'}) ({plan.planName}) - เดือน{MONTH_NAMES[monthIndex]} {plan.year}
                        </p>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <p className="font-semibold text-gray-800">เลือกสถานะ:</p>
                        <div className="flex flex-col gap-3">
                            {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map((statusKey) => {
                                const config = statusConfig[statusKey];
                                const isChecked = status === statusKey;
                                
                                const checkedClasses = {
                                    none: "bg-gray-100 border-gray-400 ring-2 ring-gray-200",
                                    planned: "bg-lime-50 border-lime-400 ring-2 ring-lime-200",
                                    completed: "bg-sky-50 border-sky-400 ring-2 ring-sky-200",
                                    completed_unplanned: "bg-sky-50 border-sky-400 ring-2 ring-sky-200"
                                };
                                const uncheckedClasses = "bg-white border-gray-300 hover:bg-gray-50";

                                return (
                                    <label key={statusKey} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${isChecked ? checkedClasses[statusKey] : uncheckedClasses}`}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value={statusKey}
                                            checked={isChecked}
                                            onChange={() => setStatus(statusKey as MonthStatus)}
                                            className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <div className="ml-4 flex items-center">
                                            {config.icon}
                                            <span className="text-base font-medium text-gray-800">{config.label}</span>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                        
                        {showHistoryForm && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                                <h4 className="font-semibold text-gray-800">บันทึกรายละเอียดการดำเนินการ</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">วันที่เข้ารับบริการ *</label>
                                        <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-lg"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700">เลขไมล์ *</label>
                                        <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} required className="mt-1 w-full p-2 border rounded-lg"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ช่างที่รับผิดชอบ</label>
                                    <select value={technicianId || ''} onChange={e => setTechnicianId(e.target.value || null)} className="mt-1 w-full p-2 border rounded-lg">
                                        <option value="">-- ไม่ระบุ --</option>
                                        {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full p-2 border rounded-lg"/>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="p-6 border-t flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                            ยกเลิก
                        </button>
                        <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};