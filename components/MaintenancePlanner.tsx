import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, Repair } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';
import LogMaintenanceModal from './LogMaintenanceModal';
import { useToast } from '../context/ToastContext';

interface MaintenancePlannerProps {
    plans: MaintenancePlan[];
    setPlans: React.Dispatch<React.SetStateAction<MaintenancePlan[]>>;
    repairs: Repair[];
    deletePlan: (planId: string) => void;
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ plans, setPlans, repairs, deletePlan }) => {
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [loggingPlan, setLoggingPlan] = useState<MaintenancePlan | null>(null);
    const { addToast } = useToast();

    const addPlan = (planData: Omit<MaintenancePlan, 'id'>) => {
        const newPlan: MaintenancePlan = {
            ...planData,
            id: `MP-${Date.now()}`
        };
        setPlans(prev => [newPlan, ...prev]);
        addToast(`เพิ่มแผนสำหรับ ${planData.vehicleLicensePlate} สำเร็จ`, 'success');
    };

    const logMaintenance = (planId: string, logData: { serviceDate: string; mileage: number }) => {
        setPlans(prev => prev.map(p => 
            p.id === planId
            ? { ...p, lastServiceDate: logData.serviceDate, lastServiceMileage: logData.mileage }
            : p
        ));
        addToast(`บันทึกการซ่อมบำรุงสำเร็จ`, 'success');
        setLoggingPlan(null);
    };

    const handleDelete = (plan: MaintenancePlan) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผน "${plan.planName}" สำหรับรถ ${plan.vehicleLicensePlate}?`)) {
            deletePlan(plan.id);
            addToast('ลบแผนสำเร็จ', 'info');
        }
    };

    const plansWithNextService = useMemo(() => {
        return plans.map(plan => {
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') {
                nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            } else if (plan.frequencyUnit === 'weeks') {
                nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            } else { // months
                nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);
            }

            const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
            
            // Get current mileage from latest repair record
            const latestRepair = repairs
                .filter(r => r.licensePlate === plan.vehicleLicensePlate)
                .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;

            const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

            let status: 'due' | 'overdue' | 'ok' = 'ok';
            if (daysUntilNextService <= 7 || (kmUntilNextService !== null && kmUntilNextService <= 1000)) {
                status = 'due';
            }
            if (daysUntilNextService < 0 || (kmUntilNextService !== null && kmUntilNextService < 0)) {
                status = 'overdue';
            }

            return { ...plan, nextServiceDate, nextServiceMileage, currentMileage, daysUntilNextService, kmUntilNextService, status };
        }).sort((a, b) => a.daysUntilNextService - b.daysUntilNextService);
    }, [plans, repairs]);

    const getStatusBadge = (status: 'due' | 'overdue' | 'ok') => {
        if (status === 'overdue') return 'bg-red-100 text-red-800';
        if (status === 'due') return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">แผนการบำรุงรักษาเชิงป้องกัน</h2>
                <button onClick={() => setAddModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มแผนใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">แผนบำรุงรักษา</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ครั้งล่าสุด</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ครั้งถัดไป</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {plansWithNextService.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-semibold">{p.vehicleLicensePlate}</td>
                                <td className="px-4 py-3">{p.planName}</td>
                                <td className="px-4 py-3">
                                    <div>{new Date(p.lastServiceDate).toLocaleDateString('th-TH')}</div>
                                    <div className="text-sm text-gray-500">{p.lastServiceMileage.toLocaleString()} กม.</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium">{p.nextServiceDate.toLocaleDateString('th-TH')}</div>
                                    <div className="text-sm text-gray-500">{p.nextServiceMileage.toLocaleString()} กม.</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(p.status)}`}>
                                        {p.status === 'overdue' ? 'เกินกำหนด' : p.status === 'due' ? 'ใกล้ถึงกำหนด' : 'ปกติ'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button onClick={() => setLoggingPlan(p)} className="text-blue-600 hover:text-blue-800 font-medium">บันทึก</button>
                                    <button onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <MaintenancePlanModal onClose={() => setAddModalOpen(false)} onAddPlan={addPlan} />
            )}
            {loggingPlan && (
                <LogMaintenanceModal plan={loggingPlan} onSave={logMaintenance} onClose={() => setLoggingPlan(null)} />
            )}
        </div>
    );
};

export default MaintenancePlanner;