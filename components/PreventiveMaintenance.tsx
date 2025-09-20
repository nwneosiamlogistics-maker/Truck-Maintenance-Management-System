import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, AnnualPMPlan, PMHistory, Repair, Vehicle, Technician, MonthStatus } from '../types';
import AnnualPMPlanComponent from './AnnualPMPlan';
import PMHistoryView from './PMHistoryView';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView';
import { useToast } from '../context/ToastContext';
import { EditAnnualPMModal, EditModalData } from './EditAnnualPMModal';


export type PlanStatus = 'ok' | 'due' | 'overdue';

export interface EnrichedPlan extends MaintenancePlan {
    status: PlanStatus;
    nextServiceDate: Date;
    daysUntilNextService: number;
    currentMileage: number | null;
    nextServiceMileage: number;
    kmUntilNextService: number | null;
    vehicleType?: string;
    vehicleMake?: string;
}

interface PreventiveMaintenanceProps {
    plans: MaintenancePlan[];
    annualPlans: AnnualPMPlan[];
    setAnnualPlans: React.Dispatch<React.SetStateAction<AnnualPMPlan[]>>;
    history: PMHistory[];
    setHistory: React.Dispatch<React.SetStateAction<PMHistory[]>>;
    repairs: Repair[];
    vehicles: Vehicle[];
    technicians: Technician[];
}

const PreventiveMaintenance: React.FC<PreventiveMaintenanceProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'plan' | 'calendar' | 'timeline' | 'history'>('plan');
    const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPlanData, setEditingPlanData] = useState<EditModalData | null>(null);

    const vehicleMap = useMemo(() => new Map(props.vehicles.map(v => [v.licensePlate, v])), [props.vehicles]);

    const enrichedPlans = useMemo<EnrichedPlan[]>(() => {
        return (Array.isArray(props.plans) ? props.plans : [])
            .map(plan => {
                const lastDate = new Date(plan.lastServiceDate);
                let nextServiceDate = new Date(lastDate);
                if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
                else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
                else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

                const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                
                const latestRepair = (Array.isArray(props.repairs) ? props.repairs : [])
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
                
                const vehicle = vehicleMap.get(plan.vehicleLicensePlate);

                return { 
                    ...plan, 
                    status, 
                    nextServiceDate, 
                    daysUntilNextService, 
                    currentMileage, 
                    nextServiceMileage, 
                    kmUntilNextService,
                    vehicleType: vehicle?.vehicleType,
                    vehicleMake: vehicle?.make,
                };
            });
    }, [props.plans, props.repairs, vehicleMap]);
    
    const handleOpenEditModal = (plan: any, monthIndex: number) => {
        const effectiveStatus = (): MonthStatus => {
            const manual = plan.manualMonths[monthIndex];
            const calculated = !!plan.calculatedMonths[monthIndex];

            if (manual === 'completed') return 'completed';
            if (manual === 'completed_unplanned') return 'completed_unplanned';
            if (manual === 'planned') return 'planned';
            if (manual === 'none') return 'none';
            // manual is undefined
            if (calculated) return 'planned';
            return 'none';
        };

        setEditingPlanData({ 
            plan: plan,
            monthIndex: monthIndex, 
            currentStatus: effectiveStatus()
        });
        setIsEditModalOpen(true);
    };

    const handleSaveMonthStatus = (planId: string, monthIndex: number, status: MonthStatus, historyLog?: Omit<PMHistory, 'id'>) => {
        const planInfo = editingPlanData?.plan;
        if (!planInfo) {
            addToast('ไม่พบข้อมูลแผนที่ต้องการอัปเดต', 'error');
            return;
        }

        props.setAnnualPlans(prev => {
            const plans = Array.isArray(prev) ? prev : [];
            const existingPlanIndex = plans.findIndex(p =>
                p.vehicleLicensePlate === planInfo.vehicleLicensePlate &&
                p.year === planInfo.year &&
                p.maintenancePlanId === planInfo.maintenancePlanId
            );
            
            if (existingPlanIndex > -1) {
                const newPlans = [...plans];
                const updatedMonths = { ...newPlans[existingPlanIndex].months };
                 if (status === 'none' && !planInfo.calculatedMonths[monthIndex]) {
                    delete updatedMonths[monthIndex];
                } else {
                    updatedMonths[monthIndex] = status;
                }
                newPlans[existingPlanIndex] = { ...newPlans[existingPlanIndex], months: updatedMonths };
                return newPlans;
            } else {
                if (status === 'none' && !planInfo.calculatedMonths[monthIndex]) {
                    return plans;
                }
                const newPlan: AnnualPMPlan = {
                    id: planInfo.id,
                    vehicleLicensePlate: planInfo.vehicleLicensePlate,
                    maintenancePlanId: planInfo.maintenancePlanId,
                    year: planInfo.year,
                    months: { [monthIndex]: status },
                };
                return [...plans, newPlan];
            }
        });

        if (historyLog) {
            const newHistoryItem: PMHistory = {
                ...historyLog,
                id: `PMH-${Date.now()}`,
            };
            props.setHistory(prev => [newHistoryItem, ...(Array.isArray(prev) ? prev : [])]);
            addToast('บันทึกประวัติการทำ PM สำเร็จ', 'success');
        }

        setIsEditModalOpen(false);
    };

    const handleDeleteHistory = (historyId: string) => {
        props.setHistory(prev => (Array.isArray(prev) ? prev : []).filter(h => h.id !== historyId));
    };
    
    const TabButton: React.FC<{ tabId: typeof activeTab, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                     <div className="flex items-center gap-2">
                        <TabButton tabId="plan" label="แผนประจำปี" />
                        <TabButton tabId="calendar" label="ปฏิทิน" />
                        <TabButton tabId="timeline" label="ไทม์ไลน์" />
                        <TabButton tabId="history" label="ประวัติ" />
                    </div>
                    {activeTab === 'plan' && (
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                placeholder="ค้นหา (ทะเบียน, แผน)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 p-2 border border-gray-300 rounded-lg"
                            />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg">
                                <option value="all">สถานะทั้งหมด</option>
                                <option value="ok">ปกติ</option>
                                <option value="due">ใกล้ถึงกำหนด</option>
                                <option value="overdue">เกินกำหนด</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'plan' && (
                <AnnualPMPlanComponent 
                    annualPlans={props.annualPlans}
                    enrichedPlans={enrichedPlans}
                    vehicles={props.vehicles}
                    searchTerm={searchTerm}
                    statusFilter={statusFilter}
                    onOpenEditModal={handleOpenEditModal}
                />
            )}
            {activeTab === 'calendar' && (
                <CalendarView
                    plans={enrichedPlans}
                    onPlanClick={() => addToast('ฟีเจอร์นี้กำลังพัฒนา', 'info')}
                    viewMode="month"
                />
            )}
             {activeTab === 'timeline' && (
                <TimelineView plans={enrichedPlans} />
            )}
            {activeTab === 'history' && (
                <PMHistoryView 
                    history={props.history}
                    technicians={props.technicians}
                    onDelete={handleDeleteHistory}
                />
            )}

            {isEditModalOpen && editingPlanData && (
                <EditAnnualPMModal
                    planData={editingPlanData}
                    vehicle={vehicleMap.get(editingPlanData.plan.vehicleLicensePlate)}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveMonthStatus}
                    technicians={props.technicians}
                />
            )}
        </div>
    );
};

export default PreventiveMaintenance;