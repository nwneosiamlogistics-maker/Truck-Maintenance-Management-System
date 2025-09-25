import React, { useState, useMemo } from 'react';
import type { AnnualPMPlan, Vehicle, MonthStatus } from '../types';
import type { EnrichedPlan, PlanStatus } from './PreventiveMaintenance';

interface AnnualPMPlanProps {
    annualPlans: AnnualPMPlan[];
    enrichedPlans: EnrichedPlan[];
    vehicles: Vehicle[];
    searchTerm: string;
    statusFilter: PlanStatus | 'all';
    onOpenEditModal: (plan: any, monthIndex: number) => void;
}

const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const AnnualPMPlanComponent: React.FC<AnnualPMPlanProps> = ({ annualPlans, enrichedPlans, vehicles, searchTerm, statusFilter, onOpenEditModal }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.licensePlate, v])), [vehicles]);

    const displayPlans = useMemo(() => {
        const manualPlansMap = new Map<string, AnnualPMPlan>(
            (Array.isArray(annualPlans) ? annualPlans : [])
                .filter(p => p.year === selectedYear)
                .map(p => [`${p.vehicleLicensePlate}-${p.maintenancePlanId}`, p])
        );

        const filteredEnrichedPlans = enrichedPlans
            .filter(p => statusFilter === 'all' || p.status === statusFilter)
            .filter(p => searchTerm === '' || p.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) || p.planName.toLowerCase().includes(searchTerm.toLowerCase()));

        return filteredEnrichedPlans
            .map(plan => {
                const calculatedMonths: { [monthIndex: number]: 'planned' } = {};
                let nextServiceDate = new Date(plan.lastServiceDate);
                while (nextServiceDate.getFullYear() <= selectedYear) {
                    if (nextServiceDate > new Date(plan.lastServiceDate)) {
                        if (nextServiceDate.getFullYear() === selectedYear) {
                            const monthIndex = nextServiceDate.getMonth();
                            calculatedMonths[monthIndex] = 'planned';
                        }
                    }

                    const currentYear = nextServiceDate.getFullYear();
                    const currentMonth = nextServiceDate.getMonth();
                    
                    if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
                    else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
                    else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
                    
                    if (nextServiceDate.getFullYear() < currentYear || (nextServiceDate.getFullYear() === currentYear && nextServiceDate.getMonth() <= currentMonth)) {
                        break; 
                    }
                }

                const manualPlan = manualPlansMap.get(`${plan.vehicleLicensePlate}-${plan.id}`);
                const manualMonths = manualPlan?.months || {};

                return {
                    ...plan,
                    maintenancePlanId: plan.id,
                    id: manualPlan?.id || `${plan.vehicleLicensePlate}-${plan.id}-${selectedYear}`,
                    year: selectedYear,
                    calculatedMonths,
                    manualMonths,
                };
            })
            .sort((a, b) => {
                const statusOrder: Record<PlanStatus, number> = { 'overdue': 0, 'due': 1, 'ok': 2 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return a.vehicleLicensePlate.localeCompare(b.vehicleLicensePlate) || a.planName.localeCompare(b.planName);
            });
    }, [enrichedPlans, annualPlans, selectedYear, searchTerm, statusFilter]);

    
    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto max-h-[65vh]">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                            <th className="sticky left-0 bg-gray-50 z-30 p-2 border text-sm font-medium text-gray-500 w-56">ทะเบียน / ประเภทรถ</th>
                            <th className="sticky left-[14rem] bg-gray-50 z-20 p-2 border text-sm font-medium text-gray-500 w-56">แผน</th>
                            {MONTH_NAMES.map(month => <th key={month} className="p-2 border text-sm font-medium text-gray-500 w-24">{month}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {displayPlans.map(plan => (
                            <tr key={plan.maintenancePlanId} className="group hover:bg-gray-50">
                                <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 p-2 border font-semibold">
                                    <div className="truncate" title={plan.vehicleLicensePlate}>{plan.vehicleLicensePlate}</div>
                                    <div className="text-xs text-gray-500 font-normal truncate" title={vehicleMap.get(plan.vehicleLicensePlate)?.vehicleType || '-'}>
                                        {vehicleMap.get(plan.vehicleLicensePlate)?.vehicleType || '-'}
                                    </div>
                                </td>
                                <td className="sticky left-[14rem] bg-white group-hover:bg-gray-50 z-10 p-2 border text-sm truncate" title={plan.planName}>
                                    {plan.planName}
                                </td>
                                {MONTH_NAMES.map((_, index) => {
                                   const manualStatus = plan.manualMonths[index];
                                   const isCalculatedPlan = !!plan.calculatedMonths[index];
                                   
                                   const showPlanDot = manualStatus === 'planned' || manualStatus === 'completed' || (manualStatus !== 'none' && manualStatus !== 'completed_unplanned' && isCalculatedPlan);
                                   const showCompletedDot = manualStatus === 'completed' || manualStatus === 'completed_unplanned';

                                   return (
                                       <td key={index} className="p-0 border text-center cursor-pointer hover:bg-blue-50 h-16 align-middle" onClick={() => onOpenEditModal(plan, index)}>
                                           <div className="flex flex-col items-center justify-center h-full -space-y-2.5">
                                               {/* Slot 1: Plan */}
                                               <span className={`text-2xl ${showPlanDot ? 'text-lime-700' : 'text-transparent'}`}>●</span>
                                               {/* Slot 2: Completion */}
                                               <span className={`text-2xl ${showCompletedDot ? 'text-sky-600' : 'text-transparent'}`}>●</span>
                                           </div>
                                       </td>
                                   );
                               })}
                            </tr>
                        ))}
                         {displayPlans.length === 0 && (
                            <tr>
                                <td colSpan={14} className="text-center p-8 text-gray-500">
                                    ไม่พบแผนสำหรับปี {selectedYear}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </>
    );
};

export default AnnualPMPlanComponent;