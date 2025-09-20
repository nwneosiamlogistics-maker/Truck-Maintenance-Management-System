import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, Repair, Vehicle, AnnualPMPlan, PMHistory, Technician, Tab } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';
import LogMaintenanceModal from './LogMaintenanceModal';
import StatCard from './StatCard';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView';
import AnnualPMPlanComponent from './AnnualPMPlan';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';
import PMHistoryView from './PMHistoryView';

interface PreventiveMaintenanceProps {
    plans: MaintenancePlan[];
    setPlans: React.Dispatch<React.SetStateAction<MaintenancePlan[]>>;
    annualPlans: AnnualPMPlan[];
    setAnnualPlans: React.Dispatch<React.SetStateAction<AnnualPMPlan[]>>;
    repairs: Repair[];
    deletePlan: (planId: string) => void;
    vehicles: Vehicle[];
    addPmHistory: (historyData: Omit<PMHistory, 'id'>) => void;
    pmHistory: PMHistory[];
    technicians: Technician[];
    deletePmHistory: (historyId: string) => void;
    setActiveTab: (tab: Tab) => void;
}

export type PlanStatus = 'ok' | 'due' | 'overdue';
type PMViewMode = 'list' | 'annual' | 'calendar' | 'timeline' | 'history';

export interface EnrichedPlan extends MaintenancePlan {
    vehicleType: string;
    vehicleMake: string;
    nextServiceDate: Date;
    daysUntilNextService: number;
    nextServiceMileage: number;
    kmUntilNextService: number | null;
    status: PlanStatus;
}


const PreventiveMaintenance: React.FC<PreventiveMaintenanceProps> = ({ 
    plans, setPlans, annualPlans, setAnnualPlans, repairs, deletePlan, vehicles,
    addPmHistory, pmHistory, technicians, deletePmHistory, setActiveTab
}) => {
    const [viewMode, setViewMode] = useState<PMViewMode>('annual');
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
    const [loggingPlan, setLoggingPlan] = useState<EnrichedPlan | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
    const [calendarSubView, setCalendarSubView] = useState<'month' | 'year'>('month');
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
                const isOverdueByDate = daysUntilNextService < -7;
                const isOverdueByMileage = kmUntilNextService !== null && kmUntilNextService < 0;
                const isDueByDate = daysUntilNextService <= 15;
                const isDueByMileage = kmUntilNextService !== null && kmUntilNextService <= 1000;

                if (isOverdueByDate || isOverdueByMileage) {
                    status = 'overdue';
                } else if (isDueByDate || isDueByMileage) {
                    status = 'due';
                }

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
        return {
            overdue: planDetails.filter(p => p.status === 'overdue').length,
            due: planDetails.filter(p => p.status === 'due').length,
            ok: planDetails.filter(p => p.status === 'ok').length,
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
    
    const handleLogMaintenance = (logData: { serviceDate: string; mileage: number; technicianId: string | null; notes: string; }) => {
        if (!loggingPlan) return;
        
        // 1. Update the recurring plan with the new service date/mileage
        setPlans(prev => prev.map(p => 
            p.id === loggingPlan.id 
                ? { ...p, lastServiceDate: logData.serviceDate, lastServiceMileage: logData.mileage }
                : p
        ));
        
        // 2. Create a new history record
        addPmHistory({
            maintenancePlanId: loggingPlan.id,
            vehicleLicensePlate: loggingPlan.vehicleLicensePlate,
            planName: loggingPlan.planName,
            serviceDate: logData.serviceDate,
            mileage: logData.mileage,
            technicianId: logData.technicianId,
            notes: logData.notes,
        });

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

    const ViewButton: React.FC<{ viewId: PMViewMode, label: string }> = ({ viewId, label }) => (
        <button
            onClick={() => setViewMode(viewId)}
            className={`px-4 py-2 rounded-md font-semibold transition-colors text-sm ${
                viewMode === viewId ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-white/80'
            }`}
        >
            {label}
        </button>
    );

    const renderContent = () => {
        switch (viewMode) {
            case 'annual':
                return <AnnualPMPlanComponent 
                    annualPlans={annualPlans} 
                    setAnnualPlans={setAnnualPlans} 
                    enrichedPlans={planDetails} 
                    vehicles={vehicles}
                    searchTerm={searchTerm}
                    statusFilter={statusFilter}
                />;
            case 'calendar':
                return <CalendarView plans={planDetails} onPlanClick={(plan) => { setLoggingPlan(plan); setIsLogModalOpen(true); }} viewMode={calendarSubView} />;
            case 'timeline':
                return <TimelineView plans={planDetails} />;
            case 'history':
                return <PMHistoryView history={pmHistory} technicians={technicians} onDelete={deletePmHistory} />;
            case 'list':
            default:
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
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="เกินกำหนด" value={kpiStats.overdue} theme="red" />
                <StatCard title="ใกล้ถึงกำหนด" value={kpiStats.due} theme="yellow" />
                <StatCard title="แผน PM ทั้งหมด" value={plans.length} theme="gray" />
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">{kpiStats.ok}</div>
                        <div className="text-base text-gray-600">แผนปกติ</div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <input type="text" placeholder="ค้นหา (ทะเบียน, ชื่อแผน)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-64 p-2 border rounded-lg" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border rounded-lg">
                        <option value="all">ทุกสถานะ</option>
                        <option value="ok">ปกติ</option>
                        <option value="due">ใกล้ถึงกำหนด</option>
                        <option value="overdue">เกินกำหนด</option>
                    </select>
                </div>
                <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg">
                    <ViewButton viewId="list" label="รายการ" />
                    <ViewButton viewId="annual" label="แผนประจำปี" />
                    <ViewButton viewId="calendar" label="ปฏิทิน" />
                    <ViewButton viewId="timeline" label="ไทม์ไลน์" />
                    <ViewButton viewId="history" label="ประวัติ" />
                </div>
                {viewMode === 'calendar' && (
                    <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg">
                        <button onClick={() => setCalendarSubView('month')} className={`px-3 py-1 text-sm rounded ${calendarSubView === 'month' ? 'bg-white shadow' : ''}`}>เดือน</button>
                        <button onClick={() => setCalendarSubView('year')} className={`px-3 py-1 text-sm rounded ${calendarSubView === 'year' ? 'bg-white shadow' : ''}`}>ปี</button>
                    </div>
                )}
                {viewMode === 'list' && (
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + เพิ่มแผนใหม่
                    </button>
                )}
            </div>

            {renderContent()}
            
            {isPlanModalOpen && <MaintenancePlanModal plan={editingPlan} onSave={handleSavePlan} onClose={() => setIsPlanModalOpen(false)} allRepairs={repairs} />}
            {isLogModalOpen && loggingPlan && <LogMaintenanceModal plan={loggingPlan} technicians={technicians} onSave={handleLogMaintenance} onClose={() => setIsLogModalOpen(false)} />}
        </div>
    );
};

export default PreventiveMaintenance;
