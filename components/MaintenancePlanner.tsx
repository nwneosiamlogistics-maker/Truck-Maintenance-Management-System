import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, Repair, Technician } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';
import LogMaintenanceModal from './LogMaintenanceModal';
import { useToast } from '../context/ToastContext';
import { formatDateTime24h } from '../utils';

interface MaintenancePlannerProps {
    plans: MaintenancePlan[];
    setPlans: React.Dispatch<React.SetStateAction<MaintenancePlan[]>>;
    repairs: Repair[];
    deletePlan: (planId: string) => void;
    technicians: Technician[];
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ plans, setPlans, repairs, deletePlan, technicians }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
    const [loggingPlan, setLoggingPlan] = useState<MaintenancePlan | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const handleOpenModal = (plan: MaintenancePlan | null = null) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleSavePlan = (planData: Omit<MaintenancePlan, 'id'>) => {
        if (editingPlan) {
            setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...editingPlan, ...planData } : p));
            addToast('อัปเดตแผนสำเร็จ', 'success');
        } else {
            const newPlan: MaintenancePlan = { ...planData, id: `MP-${Date.now()}` };
            setPlans(prev => [newPlan, ...prev]);
            addToast('เพิ่มแผนใหม่สำเร็จ', 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeletePlan = (planId: string, planName: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผน "${planName}"?`)) {
            deletePlan(planId);
            addToast(`ลบแผน "${planName}" สำเร็จ`, 'info');
        }
    };

    const handleLogMaintenance = (planId: string, logData: { serviceDate: string; mileage: number }) => {
        setPlans(prev => prev.map(p => 
            p.id === planId 
                ? { ...p, lastServiceDate: logData.serviceDate, lastServiceMileage: logData.mileage }
                : p
        ));
        addToast('บันทึกการบำรุงรักษาสำเร็จ', 'success');
        setLoggingPlan(null);
    };

    const planDetails = useMemo(() => {
        return (Array.isArray(plans) ? plans : [])
            .map(plan => {
                const lastDate = new Date(plan.lastServiceDate);
                let nextServiceDate = new Date(lastDate);

                if (plan.frequencyUnit === 'days') {
                    nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
                } else if (plan.frequencyUnit === 'weeks') {
                    nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
                } else { // months
                    nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);
                }

                const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
                const latestRepair = (Array.isArray(repairs) ? repairs : [])
                    .filter(r => r.licensePlate === plan.vehicleLicensePlate)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                
                const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;
                const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

                let status: 'ok' | 'due' | 'overdue' = 'ok';
                let statusText = '';
                
                const isDue = daysUntilNextService <= 7 || (kmUntilNextService !== null && kmUntilNextService <= 1000);
                const isOverdue = daysUntilNextService < 0 || (kmUntilNextService !== null && kmUntilNextService < 0);

                if (isOverdue) {
                    status = 'overdue';
                    statusText = 'เกินกำหนด';
                } else if (isDue) {
                    status = 'due';
                    statusText = 'ใกล้ถึงกำหนด';
                } else {
                    status = 'ok';
                    statusText = 'ปกติ';
                }

                return {
                    ...plan,
                    nextServiceDate,
                    daysUntilNextService,
                    nextServiceMileage,
                    currentMileage,
                    kmUntilNextService,
                    status,
                    statusText
                };
            })
            .filter(p => searchTerm === '' || p.planName.toLowerCase().includes(searchTerm.toLowerCase()) || p.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.daysUntilNextService - b.daysUntilNextService);
    }, [plans, repairs, searchTerm]);
    
    const scheduledRepairs = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .map(r => {
                const activeEstimation = (r.estimations || []).find(e => e.status === 'Active');
                return { ...r, activeEstimation };
            })
            .filter(r => r.activeEstimation && !['ซ่อมเสร็จ', 'ยกเลิก'].includes(r.status))
            .sort((a, b) => new Date(a.activeEstimation!.estimatedEndDate).getTime() - new Date(b.activeEstimation!.estimatedEndDate).getTime());
    }, [repairs]);
    
    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return 'ยังไม่มอบหมาย';
        return ids.map(id => technicians.find(t => t.id === id)?.name || id.substring(0, 5)).join(', ');
    };

    const getStatusBadge = (status: 'ok' | 'due' | 'overdue') => {
        switch (status) {
            case 'ok': return 'bg-green-100 text-green-800';
            case 'due': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (ชื่อแผน, ทะเบียนรถ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มแผนบำรุงรักษาใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm">
                <div className="p-4 border-b">
                     <h2 className="text-xl font-bold text-gray-800">🗓️ งานซ่อมที่กำหนดเวลาแล้ว (จากใบแจ้งซ่อม)</h2>
                </div>
                {scheduledRepairs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่คาดว่าจะซ่อมเสร็จ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่างที่รับผิดชอบ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {scheduledRepairs.map(repair => (
                                    <tr key={repair.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-semibold">{formatDateTime24h(repair.activeEstimation!.estimatedEndDate)}</td>
                                        <td className="px-4 py-3 font-medium">{repair.licensePlate}</td>
                                        <td className="px-4 py-3 text-sm max-w-xs truncate">{repair.problemDescription}</td>
                                        <td className="px-4 py-3 text-sm">{getTechnicianNames(repair.assignedTechnicians)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-6 text-center text-gray-500">ไม่มีงานซ่อมที่กำหนดเวลาไว้ในขณะนี้</p>
                )}
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">🔁 แผนบำรุงรักษาตามรอบ</h2>
                </div>
                <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ / ชื่อแผน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">กำหนดครั้งถัดไป (ตามเวลา)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">กำหนดครั้งถัดไป (ตามระยะ)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {planDetails.map(plan => (
                                <tr key={plan.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><div className="font-semibold">{plan.vehicleLicensePlate}</div><div className="text-sm text-gray-500">{plan.planName}</div></td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{plan.nextServiceDate.toLocaleDateString('th-TH')}</div>
                                        <div className="text-sm text-gray-500">{plan.daysUntilNextService >= 0 ? `(อีก ${plan.daysUntilNextService} วัน)` : `(เลยมา ${Math.abs(plan.daysUntilNextService)} วัน)`}</div>
                                    </td>
                                     <td className="px-4 py-3">
                                         <div className="font-medium">{plan.nextServiceMileage.toLocaleString()} กม.</div>
                                         <div className="text-sm text-gray-500">
                                             {plan.kmUntilNextService !== null ? 
                                                plan.kmUntilNextService >= 0 ? `(อีก ${plan.kmUntilNextService.toLocaleString()} กม.)` : `(เลยมา ${Math.abs(plan.kmUntilNextService).toLocaleString()} กม.)`
                                                : '(ไม่มีข้อมูลไมล์ปัจจุบัน)'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(plan.status)}`}>{plan.statusText}</span></td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                                        <button onClick={() => setLoggingPlan(plan)} className="text-green-600 hover:text-green-800 font-medium">บันทึก</button>
                                        <button onClick={() => handleOpenModal(plan)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                        <button onClick={() => handleDeletePlan(plan.id, plan.planName)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                    </td>
                                </tr>
                            ))}
                             {planDetails.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูลแผนบำรุงรักษา</td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                </div>
            </div>
            
            {isModalOpen && (
                <MaintenancePlanModal 
                    plan={editingPlan}
                    onSave={handleSavePlan}
                    onClose={() => setIsModalOpen(false)}
                    allRepairs={repairs}
                />
            )}
            {loggingPlan && (
                <LogMaintenanceModal
                    plan={loggingPlan}
                    onSave={handleLogMaintenance}
                    onClose={() => setLoggingPlan(null)}
                />
            )}
        </div>
    );
};

export default MaintenancePlanner;