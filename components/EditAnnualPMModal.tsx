import React, { useState } from 'react';
import type { AnnualPMPlan, Vehicle, MonthStatus } from '../types';

export interface EditModalData {
    plan: any; // The enriched display plan object
    monthIndex: number;
    currentStatus: MonthStatus;
}

interface EditAnnualPMModalProps {
    planData: EditModalData;
    vehicle?: Vehicle;
    onClose: () => void;
    onSave: (planId: string, monthIndex: number, status: MonthStatus) => void;
}

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export const EditAnnualPMModal: React.FC<EditAnnualPMModalProps> = ({ planData, vehicle, onClose, onSave }) => {
    const { plan, monthIndex, currentStatus } = planData;
    const [status, setStatus] = useState<MonthStatus>(currentStatus);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(plan.id, monthIndex, status);
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
            label: "ดำเนินการแล้ว",
            icon: (
                <div className="flex flex-col items-center justify-center -space-y-2.5 mr-2">
                    <span className="text-2xl text-lime-700">●</span>
                    <span className="text-2xl text-sky-600">●</span>
                </div>
            ),
        },
        completed_unplanned: {
            label: "ดำเนินการไม่ตรงตามแผน",
            icon: (
                <div className="flex flex-col items-center justify-center -space-y-2.5 mr-2">
                    <span className="text-2xl text-transparent">●</span>
                    <span className="text-2xl text-sky-600">●</span>
                </div>
            ),
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-2xl font-bold text-gray-800">อัปเดตสถานะแผน PM</h3>
                        <p className="text-gray-600">
                            {plan.vehicleLicensePlate} ({vehicle?.vehicleType || '-'}) ({plan.planName}) - เดือน{MONTH_NAMES[monthIndex]} {plan.year}
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
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