



import React, { useMemo } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, EstimationAttempt } from '../types';
import StatCard from './StatCard';
import { formatHoursToHHMM, calculateDurationHours, formatHoursDescriptive } from '../utils';

type PlanStatus = 'ok' | 'due' | 'overdue';

interface KPIDashboardProps {
    repairs: Repair[];
    plans: MaintenancePlan[];
    vehicles: Vehicle[];
}

const BarChart: React.FC<{ title: string, data: { label: string, value: number, formattedValue: string }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.length > 0 ? data.map(item => (
                    <div key={item.label} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-semibold text-gray-600 truncate">{item.label}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                            <div
                                className="bg-blue-500 h-6 rounded-full flex items-center justify-end px-2"
                                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                            >
                                <span className="text-white text-xs font-bold">{item.formattedValue}</span>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลเพียงพอ</p>}
            </div>
        </div>
    );
};

const PMComplianceList: React.FC<{ data: { plate: string; onTimeRate: number; onTimeCount: number; totalPlans: number }[] }> = ({ data }) => {
    const getProgressBarColor = (rate: number) => {
        if (rate >= 90) return 'bg-green-500';
        if (rate >= 70) return 'bg-blue-500';
        if (rate >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-800 mb-4">10 อันดับรถที่เข้าบำรุงรักษาตามแผน (PM) ตรงเวลา</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map((item, index) => (
                    <div key={item.plate} className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full font-bold text-gray-700">{index + 1}</div>
                        <div className="w-32 font-semibold">{item.plate}</div>
                        <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-6">
                                <div
                                    className={`h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getProgressBarColor(item.onTimeRate)}`}
                                    style={{ width: `${item.onTimeRate}%` }}
                                >
                                    {item.onTimeRate.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                        <div className="w-48 text-sm text-gray-500 text-right">
                            ตรงเวลา {item.onTimeCount} จาก {item.totalPlans} แผน
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลแผน PM เพื่อจัดอันดับ</p>}
            </div>
        </div>
    );
};


const KPIDashboard: React.FC<KPIDashboardProps> = ({ repairs, plans, vehicles }) => {
    const kpiData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : []).filter(
            r => r.status === 'ซ่อมเสร็จ' && r.repairStartDate && r.repairEndDate && r.createdAt
        );

        // --- Core KPI Calculations ---
        const totalRepairTime = completedRepairs.reduce((acc, r) => acc + (new Date(r.repairEndDate!).getTime() - new Date(r.repairStartDate!).getTime()), 0);
        const mttrHours = completedRepairs.length > 0 ? totalRepairTime / completedRepairs.length / (1000 * 60 * 60) : 0;

        const totalDowntime = completedRepairs.reduce((acc, r) => acc + (new Date(r.repairEndDate!).getTime() - new Date(r.createdAt).getTime()), 0);
        const avgDowntimeHours = completedRepairs.length > 0 ? totalDowntime / completedRepairs.length / (1000 * 60 * 60) : 0;

        // FIX: Explicitly type the accumulators 'acc' and 'pAcc' to prevent type errors.
        const totalCost = completedRepairs.reduce((acc: number, r) => {
            const partsCost = (r.parts || []).reduce((pAcc: number, p) => {
                const quantity = Number(p.quantity) || 0;
                const unitPrice = Number(p.unitPrice) || 0;
                return pAcc + (quantity * unitPrice);
            }, 0);
            const repairCost = Number(r.repairCost) || 0;
            const partsVat = Number(r.partsVat) || 0;
            const laborVat = Number(r.laborVat) || 0;
            return acc + repairCost + partsCost + partsVat + laborVat;
        }, 0);
        const avgCost = completedRepairs.length > 0 ? totalCost / completedRepairs.length : 0;

        // --- Top 5 Chart Data Calculations ---
        const allRepairs = Array.isArray(repairs) ? repairs : [];
        const downtimeByVehicle: Record<string, number> = {};
        allRepairs.forEach(r => {
             if (r.repairEndDate && r.createdAt) {
                const downtime = new Date(r.repairEndDate).getTime() - new Date(r.createdAt).getTime();
                downtimeByVehicle[r.licensePlate] = (downtimeByVehicle[r.licensePlate] || 0) + downtime;
            }
        });
        const vehicleDowntime = Object.entries(downtimeByVehicle)
            .map(([plate, totalMillis]) => ({ plate, hours: totalMillis / (1000 * 60 * 60) }))
            .sort((a, b) => b.hours - a.hours).slice(0, 5);

        const repairsByVehicle = allRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const mostRepairedVehicles = Object.entries(repairsByVehicle)
            .map(([plate, count]) => ({ plate, count }))
            .sort((a, b) => b.count - a.count).slice(0, 5);
            
        // FIX: Explicitly type the accumulator in reduce to ensure correct type inference.
        const costByVehicle = allRepairs.reduce((acc: Record<string, number>, r) => {
            const partsCost = (r.parts || []).reduce((pAcc: number, p) => {
                const quantity = Number(p.quantity) || 0;
                const unitPrice = Number(p.unitPrice) || 0;
                return pAcc + (quantity * unitPrice);
            }, 0);
            const repairCost = Number(r.repairCost) || 0;
            const partsVat = Number(r.partsVat) || 0;
            const laborVat = Number(r.laborVat) || 0;
            const totalRepairCost = repairCost + partsCost + partsVat + laborVat;
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + totalRepairCost;
            return acc;
        }, {} as Record<string, number>);
        const mostExpensiveVehicles = Object.entries(costByVehicle)
            .map(([plate, totalCost]) => ({ plate, totalCost }))
            .sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

        // --- New PM Compliance Calculation (with 7-day grace period) ---
        const planDetails = (Array.isArray(plans) ? plans : []).map(plan => {
            // Date calculation
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);
            const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            
            // Mileage calculation
            const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
            const latestRepair = (Array.isArray(repairs) ? repairs : [])
                .filter(r => r.licensePlate === plan.vehicleLicensePlate && r.currentMileage)
                .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;
            const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

            // Determine status based on BOTH date and mileage with new grace period rules
            let status: PlanStatus = 'ok';
            const isOverdueByDate = daysUntilNextService < 0;
            const isOverdueByMileage = kmUntilNextService !== null && kmUntilNextService < 0; // Overdue immediately on mileage
            const isDueByDate = daysUntilNextService <= 30;
            const isDueByMileage = kmUntilNextService !== null && kmUntilNextService <= 1500;

            if (isOverdueByDate || isOverdueByMileage) {
                status = 'overdue';
            } else if (isDueByDate || isDueByMileage) {
                status = 'due';
            }

            return { ...plan, status };
        });


        // FIX: Explicitly type the accumulator for 'complianceByVehicle' to resolve 'unknown' type errors.
        const complianceByVehicle = planDetails.reduce((acc: Record<string, { onTimeCount: number; totalPlans: number }>, plan) => {
            const plate = plan.vehicleLicensePlate;
            if (!acc[plate]) acc[plate] = { onTimeCount: 0, totalPlans: 0 };
            acc[plate].totalPlans++;
            // A plan is compliant if it's not 'overdue'
            if (plan.status !== 'overdue') {
                acc[plate].onTimeCount++;
            }
            return acc;
        }, {} as Record<string, { onTimeCount: number; totalPlans: number }>);

        const pmComplianceRate = Object.entries(complianceByVehicle)
            .map(([plate, data]) => ({
                plate,
                onTimeRate: data.totalPlans > 0 ? (data.onTimeCount / data.totalPlans) * 100 : 0,
                ...data
            }))
            .sort((a, b) => {
                if (b.onTimeRate !== a.onTimeRate) return b.onTimeRate - a.onTimeRate;
                return b.totalPlans - a.totalPlans; // Prioritize vehicles with more plans if rates are equal
            })
            .slice(0, 10);

        return {
            mttr: mttrHours, avgDowntime: avgDowntimeHours, avgCost,
            vehicleDowntime, mostRepairedVehicles, mostExpensiveVehicles,
            pmComplianceRate,
        };
    }, [repairs, plans, vehicles]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <StatCard 
                    title="MTTR (เวลาซ่อมเฉลี่ย)" 
                    value={formatHoursToHHMM(kpiData.mttr)} 
                    theme="blue"
                    trend="เป้าหมาย: < 24:00" 
                />
                
                <StatCard 
                    title="Downtime เฉลี่ย" 
                    value={formatHoursToHHMM(kpiData.avgDowntime)} 
                    theme="yellow"
                    trend="เวลาที่รถจอดรอซ่อม" 
                />
                
                <StatCard 
                    title="ค่าซ่อมเฉลี่ย" 
                    value={`${kpiData.avgCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ฿`} 
                    theme="green"
                    trend="ต่อใบแจ้งซ่อม"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <BarChart
                    title="5 อันดับรถที่เข้าซ่อมบ่อยที่สุด"
                    data={kpiData.mostRepairedVehicles.map(v => ({
                        label: v.plate,
                        value: v.count,
                        formattedValue: `${v.count} ครั้ง`
                    }))}
                />
                 <BarChart
                    title="5 อันดับรถที่มีค่าใช้จ่ายซ่อมสูงสุด"
                    data={kpiData.mostExpensiveVehicles.map(v => ({
                        label: v.plate,
                        value: v.totalCost,
                        formattedValue: `${v.totalCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ฿`
                    }))}
                />
                <BarChart
                    title="5 อันดับรถที่ใช้เวลาจอดซ่อม (Downtime) นานที่สุด"
                    data={kpiData.vehicleDowntime.map(vehicle => ({
                        label: vehicle.plate,
                        value: vehicle.hours,
                        formattedValue: formatHoursToHHMM(vehicle.hours)
                    }))}
                />
                <PMComplianceList data={kpiData.pmComplianceRate} />
            </div>
        </div>
    );
};

export default KPIDashboard;