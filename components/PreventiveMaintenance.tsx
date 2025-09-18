import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, Repair, Vehicle } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';
import LogMaintenanceModal from './LogMaintenanceModal';
import StatCard from './StatCard';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView'; // Import the new TimelineView component
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface PreventiveMaintenanceProps {
    plans: MaintenancePlan[];
    setPlans: React.Dispatch<React.SetStateAction<MaintenancePlan[]>>;
    repairs: Repair[];
    deletePlan: (planId: string) => void;
    vehicles: Vehicle[];
}

export type PlanStatus = 'ok' | 'due' | 'overdue';

export interface EnrichedPlan extends MaintenancePlan {
    vehicleType: string;
    vehicleMake: string;
    nextServiceDate: Date;
    daysUntilNextService: number;
    nextServiceMileage: number;
    kmUntilNextService: number | null;
    status: PlanStatus;
}


const PreventiveMaintenance: React.FC<PreventiveMaintenanceProps> = ({ plans, setPlans, repairs, deletePlan, vehicles }) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('list');
    const [calendarView, setCalendarView] = useState<'month' | 'year'>('month');
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
    const [loggingPlan, setLoggingPlan] = useState<MaintenancePlan | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
    const { addToast } = useToast();

    const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.licensePlate, v])), [vehicles]);

    const planDetails: EnrichedPlan[] = useMemo(() => {
        return (Array.isArray(plans) ? plans : [])
            .map(plan => {
                const lastDate = new Date(plan.lastServiceDate);
                let nextServiceDate = new Date(lastDate);

                if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
                else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
                else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

                const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;

                const latestRepair = (Array.isArray(repairs) ? repairs : [])
                    .filter(r => r.licensePlate === plan.vehicleLicensePlate && r.currentMileage)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                
                const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;
                const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

                let status: PlanStatus = 'ok';
                const isDue = daysUntilNextService <= 30 || (kmUntilNextService !== null && kmUntilNextService <= 1000);
                const isOverdue = daysUntilNextService < 0 || (kmUntilNextService !== null && kmUntilNextService < 0);

                if (isOverdue) status = 'overdue';
                else if (isDue) status = 'due';

                const vehicleInfo = vehicleMap.get(plan.vehicleLicensePlate);

                return {
                    ...plan,
                    vehicleType: vehicleInfo?.vehicleType || '-',
                    vehicleMake: vehicleInfo?.make || '-',
                    nextServiceDate,
                    daysUntilNextService,
                    nextServiceMileage,
                    kmUntilNextService,
                    status,
                };
            });
    }, [plans, repairs, vehicleMap]);

    const filteredPlans = useMemo(() => {
        return planDetails
            .filter(p => statusFilter === 'all' || p.status === statusFilter)
            .filter(p => searchTerm === '' || p.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) || p.planName.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.daysUntilNextService - b.daysUntilNextService);
    }, [planDetails, statusFilter, searchTerm]);

    const kpiStats = useMemo(() => {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        return {
            dueThisMonth: planDetails.filter(p => p.nextServiceDate <= nextMonth && p.nextServiceDate >= now).length,
            overdue: planDetails.filter(p => p.status === 'overdue').length,
            totalPlans: planDetails.length,
            statusCounts: {
                ok: planDetails.filter(p => p.status === 'ok').length,
                due: planDetails.filter(p => p.status === 'due').length,
                overdue: planDetails.filter(p => p.status === 'overdue').length,
            }
        };
    }, [planDetails]);

    const handleOpenModal = (plan: MaintenancePlan | null = null) => {
        setEditingPlan(plan);
        setIsPlanModalOpen(true);
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
        setIsPlanModalOpen(false);
    };

    const handleDeletePlan = (planId: string, planName: string) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผน "${planName}"?`)) {
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
        setIsLogModalOpen(false);
        setLoggingPlan(null);
    };

    const getStatusBadge = (status: PlanStatus) => {
        switch (status) {
            case 'ok': return 'bg-green-100 text-green-800';
            case 'due': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
        }
    };
    
    const getStatusText = (status: PlanStatus) => {
        switch (status) {
            case 'ok': return 'ปกติ';
            case 'due': return 'ใกล้ถึงกำหนด';
            case 'overdue': return 'เกินกำหนด';
        }
    };

    const renderContent = () => {
        if (viewMode === 'list') {
            return (
                 <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ทะเบียน / ประเภท</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">แผน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">บริการล่าสุด (วันที่/ไมล์)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">กำหนดครั้งถัดไป (วันที่/ไมล์)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">สถานะ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {filteredPlans.map(p => (
                                <tr key={p.id}>
                                    <td className="px-4 py-3"><div className="font-semibold">{p.vehicleLicensePlate}</div><div className="text-sm text-gray-500">{p.vehicleType}</div></td>
                                    <td className="px-4 py-3">{p.planName}</td>
                                    <td className="px-4 py-3"><div className="text-sm">{new Date(p.lastServiceDate).toLocaleDateString('th-TH')}</div><div className="text-xs text-gray-500">{p.lastServiceMileage.toLocaleString()} กม.</div></td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-semibold">{p.nextServiceDate.toLocaleDateString('th-TH')}</div>
                                        <div className="text-xs text-gray-500">{p.daysUntilNextService >= 0 ? `(อีก ${p.daysUntilNextService} วัน)` : `(เลย ${Math.abs(p.daysUntilNextService)} วัน)`}</div>
                                        <div className="text-sm font-semibold mt-1">{p.nextServiceMileage.toLocaleString()} กม.</div>
                                        {p.kmUntilNextService !== null && <div className="text-xs text-gray-500">{p.kmUntilNextService >= 0 ? `(อีก ${p.kmUntilNextService.toLocaleString()} กม.)` : `(เลย ${Math.abs(p.kmUntilNextService).toLocaleString()} กม.)`}</div>}
                                    </td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(p.status)}`}>{getStatusText(p.status)}</span></td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <button onClick={() => { setLoggingPlan(p); setIsLogModalOpen(true); }} className="text-green-600 hover:text-green-800">บันทึก</button>
                                        <button onClick={() => handleOpenModal(p)} className="text-yellow-600 hover:text-yellow-800">แก้</button>
                                        <button onClick={() => handleDeletePlan(p.id, p.planName)} className="text-red-500 hover:text-red-700">ลบ</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        if (viewMode === 'calendar') {
             return <CalendarView plans={planDetails} onPlanClick={(plan) => { setLoggingPlan(plan); setIsLogModalOpen(true); }} viewMode={calendarView} />
        }
        if (viewMode === 'timeline') {
            return <TimelineView plans={filteredPlans} />
        }
        return null;
    }


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="ถึงกำหนดใน 30 วัน" value={kpiStats.dueThisMonth} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="เกินกำหนดซ่อม" value={kpiStats.overdue} bgColor="bg-red-50" textColor="text-red-600" />
                <StatCard title="แผน PM ทั้งหมด" value={kpiStats.totalPlans} bgColor="bg-gray-100" textColor="text-gray-800" />
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h3 className="text-base font-medium text-gray-600 mb-2">ภาพรวมสถานะ</h3>
                    <div className="flex justify-around items-center">
                        <div className="text-center"><p className="text-2xl font-bold text-green-600">{kpiStats.statusCounts.ok}</p><p className="text-sm text-gray-500">ปกติ</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-yellow-600">{kpiStats.statusCounts.due}</p><p className="text-sm text-gray-500">ใกล้ถึงกำหนด</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-red-600">{kpiStats.statusCounts.overdue}</p><p className="text-sm text-gray-500">เกินกำหนด</p></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <input type="text" placeholder="ค้นหา (ทะเบียน, ชื่อแผน)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 p-2 border rounded-lg" />
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border rounded-lg">
                            <option value="all">ทุกสถานะ</option>
                            <option value="overdue">เกินกำหนด</option>
                            <option value="due">ใกล้ถึงกำหนด</option>
                            <option value="ok">ปกติ</option>
                        </select>
                        <div className="bg-gray-200 p-1 rounded-lg flex">
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-white shadow' : 'bg-transparent'}`}>รายการ</button>
                            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm rounded ${viewMode === 'calendar' ? 'bg-white shadow' : 'bg-transparent'}`}>ปฏิทิน</button>
                            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-white shadow' : 'bg-transparent'}`}>ไทม์ไลน์</button>
                        </div>
                         {viewMode === 'calendar' && (
                            <div className="bg-gray-200 p-1 rounded-lg flex">
                                <button onClick={() => setCalendarView('month')} className={`px-3 py-1 text-sm rounded ${calendarView === 'month' ? 'bg-white shadow' : 'bg-transparent'}`}>มุมมองเดือน</button>
                                <button onClick={() => setCalendarView('year')} className={`px-3 py-1 text-sm rounded ${calendarView === 'year' ? 'bg-white shadow' : 'bg-transparent'}`}>มุมมองปี</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ เพิ่มแผนใหม่</button>
                </div>
            </div>
            
            {renderContent()}

            {isPlanModalOpen && <MaintenancePlanModal plan={editingPlan} onSave={handleSavePlan} onClose={() => setIsPlanModalOpen(false)} allRepairs={repairs} />}
            {isLogModalOpen && loggingPlan && <LogMaintenanceModal plan={loggingPlan} onSave={handleLogMaintenance} onClose={() => setIsLogModalOpen(false)} />}
        </div>
    );
};

export default PreventiveMaintenance;