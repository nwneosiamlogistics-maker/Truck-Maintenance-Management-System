
import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, Repair, Technician, PMHistory, RepairFormSeed, Tab, Vehicle } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';
import LogMaintenanceModal from './LogMaintenanceModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

type PlanStatus = 'ok' | 'due' | 'overdue';

interface EnrichedPlan extends MaintenancePlan {
  status: PlanStatus;
  nextServiceDate: Date;
  daysUntilNextService: number;
  currentMileage: number | null;
  nextServiceMileage: number;
  kmUntilNextService: number | null;
}

interface MaintenancePlannerProps {
    plans: MaintenancePlan[];
    setPlans: React.Dispatch<React.SetStateAction<MaintenancePlan[]>>;
    repairs: Repair[];
    technicians: Technician[];
    history: PMHistory[];
    setHistory: React.Dispatch<React.SetStateAction<PMHistory[]>>;
    setRepairFormSeed: (seed: RepairFormSeed | null) => void;
    setActiveTab: (tab: Tab) => void;
    vehicles: Vehicle[];
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ plans, setPlans, repairs, technicians, history, setHistory, setRepairFormSeed, setActiveTab, vehicles }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [isLogModalOpen, setLogModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
    // Use EnrichedPlan here to access calculated targets
    const [loggingPlan, setLoggingPlan] = useState<EnrichedPlan | null>(null); 
    const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.licensePlate, v])), [vehicles]);

    const enrichedPlans = useMemo<EnrichedPlan[]>(() => {
        return (Array.isArray(plans) ? plans : [])
            .map(plan => {
                const lastDate = new Date(plan.lastServiceDate);
                let nextServiceDate = new Date(lastDate);
                if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
                else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
                else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

                const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                
                const latestRepair = (Array.isArray(repairs) ? repairs : [])
                    .filter(r => r.licensePlate === plan.vehicleLicensePlate && r.currentMileage)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;
                const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
                const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

                let status: PlanStatus = 'ok';
                if ((daysUntilNextService < 0) || (kmUntilNextService !== null && kmUntilNextService < 0)) {
                    status = 'overdue';
                } else if ((daysUntilNextService <= 30) || (kmUntilNextService !== null && kmUntilNextService <= 1500)) {
                    status = 'due';
                }

                return { ...plan, nextServiceDate, daysUntilNextService, currentMileage, nextServiceMileage, kmUntilNextService, status };
            })
            .filter(plan => statusFilter === 'all' || plan.status === statusFilter)
            .filter(plan => searchTerm === '' || plan.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) || plan.planName.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.daysUntilNextService - b.daysUntilNextService);
    }, [plans, repairs, statusFilter, searchTerm]);

    const handleOpenModal = (plan: MaintenancePlan | null = null) => {
        setEditingPlan(plan);
        setModalOpen(true);
    };

    const handleSavePlan = (planData: Omit<MaintenancePlan, 'id'>) => {
        if (editingPlan) {
            setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...planData } : p));
            addToast(`อัปเดตแผน "${planData.planName}" สำเร็จ`, 'success');
        } else {
            const newPlan: MaintenancePlan = { ...planData, id: `MP-${Date.now()}` };
            setPlans(prev => [newPlan, ...prev]);
            addToast(`เพิ่มแผน "${newPlan.planName}" สำเร็จ`, 'success');
        }
        setModalOpen(false);
    };
    
    const handleDeletePlan = (plan: MaintenancePlan) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผน "${plan.planName}" สำหรับรถทะเบียน ${plan.vehicleLicensePlate}?`)) {
            setPlans(prev => prev.filter(p => p.id !== plan.id));
            addToast(`ลบแผน "${plan.planName}" สำเร็จ`, 'info');
        }
    };
    
    const handleLogService = (logData: { serviceDate: string; mileage: number; technicianId: string | null; notes: string; targetDate?: string; targetMileage?: number }) => {
        if (!loggingPlan) return;
        
        const newHistoryItem: PMHistory = {
            id: `PMH-${Date.now()}`,
            maintenancePlanId: loggingPlan.id,
            vehicleLicensePlate: loggingPlan.vehicleLicensePlate,
            planName: loggingPlan.planName,
            serviceDate: new Date(logData.serviceDate).toISOString(),
            mileage: logData.mileage,
            technicianId: logData.technicianId,
            notes: logData.notes,
            targetServiceDate: logData.targetDate,
            targetMileage: logData.targetMileage,
        };
        setHistory(prev => [newHistoryItem, ...(Array.isArray(prev) ? prev : [])]);

        setPlans(prev => prev.map(p => p.id === loggingPlan.id ? {
            ...p,
            lastServiceDate: new Date(logData.serviceDate).toISOString(),
            lastServiceMileage: logData.mileage,
        } : p));

        addToast(`บันทึกการบำรุงรักษาสำหรับ "${loggingPlan.planName}" สำเร็จ`, 'success');
        setLogModalOpen(false);
    };

    const handleCreateRepair = (plan: EnrichedPlan) => {
        const vehicle = vehicleMap.get(plan.vehicleLicensePlate);
        const seedData: RepairFormSeed = {
            licensePlate: plan.vehicleLicensePlate,
            vehicleType: vehicle?.vehicleType || '',
            reportedBy: 'ระบบแผนซ่อมบำรุง',
            problemDescription: `ซ่อมบำรุงตามแผน: ${plan.planName}`,
        };
        setRepairFormSeed(seedData);
        setActiveTab('form');
        addToast(`กำลังสร้างใบแจ้งซ่อมสำหรับ ${plan.vehicleLicensePlate}`, 'info');
    };

    const getStatusBadge = (status: PlanStatus) => {
        switch (status) {
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'due': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ทะเบียน, ชื่อแผน)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-72 p-2 border border-gray-300 rounded-lg text-base"
                    />
                     <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                        <option value="all">สถานะทั้งหมด</option>
                        <option value="ok">ปกติ</option>
                        <option value="due">ใกล้ถึงกำหนด</option>
                        <option value="overdue">เกินกำหนด</option>
                    </select>
                </div>
                 <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มแผนใหม่
                </button>
            </div>

             <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียน / ชื่อแผน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ครั้งล่าสุด</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ครั้งถัดไป</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {enrichedPlans.map(plan => (
                            <tr key={plan.id}>
                                <td className="px-4 py-3"><div className="font-semibold">{plan.vehicleLicensePlate}</div><div className="text-sm text-gray-600">{plan.planName}</div></td>
                                <td className="px-4 py-3 text-sm"><div>{new Date(plan.lastServiceDate).toLocaleDateString('th-TH')}</div><div>{plan.lastServiceMileage.toLocaleString()} กม.</div></td>
                                <td className="px-4 py-3 text-sm"><div>{plan.nextServiceDate.toLocaleDateString('th-TH')}</div><div>{plan.nextServiceMileage.toLocaleString()} กม.</div></td>
                                <td className="px-4 py-3">
                                    <div className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${getStatusBadge(plan.status)}`}>
                                        {plan.status === 'overdue' ? `เกินกำหนด` : (plan.status === 'due' ? `อีก ${plan.daysUntilNextService} วัน` : 'ปกติ')}
                                    </div>
                                    {plan.kmUntilNextService !== null && 
                                        <div className="text-xs mt-1">({plan.kmUntilNextService > 0 ? `อีก ${plan.kmUntilNextService.toLocaleString()} กม.` : 'เกินระยะ'})</div>
                                    }
                                </td>
                                <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                     {['due', 'overdue'].includes(plan.status) && (
                                        <button onClick={() => handleCreateRepair(plan)} className="text-purple-600 hover:text-purple-800 text-base font-medium">สร้างงานซ่อม</button>
                                     )}
                                     <button onClick={() => { setLoggingPlan(plan); setLogModalOpen(true); }} className="text-green-600 hover:text-green-800 text-base font-medium">บันทึก</button>
                                     <button onClick={() => handleOpenModal(plan)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้</button>
                                     <button onClick={() => handleDeletePlan(plan)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                         {enrichedPlans.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบแผนซ่อมบำรุง</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && <MaintenancePlanModal plan={editingPlan} onSave={handleSavePlan} onClose={() => setModalOpen(false)} allRepairs={repairs} />}
            {isLogModalOpen && loggingPlan && (
                <LogMaintenanceModal 
                    plan={loggingPlan} 
                    targets={{ date: loggingPlan.nextServiceDate, mileage: loggingPlan.nextServiceMileage }}
                    technicians={technicians} 
                    onSave={handleLogService} 
                    onClose={() => setLogModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default MaintenancePlanner;
