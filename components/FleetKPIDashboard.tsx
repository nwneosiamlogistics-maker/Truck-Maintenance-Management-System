
import React, { useState, useMemo, useEffect } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, AnnualPMPlan } from '../types';
import { KPICard, BarChart, PieChart } from './Charts';
import { calculateDurationHours, formatHoursToHHMM } from '../utils';

type DateRange = '7d' | '30d' | 'this_month' | 'last_month';
type AlertItem = {
    type: 'Downtime' | 'PM' | 'Breakdown' | 'Rework' | 'Unplanned PM';
    vehicle: string;
    details: string;
    value: number | string;
    priority: 'high' | 'medium' | 'low';
};

interface FleetKPIDashboardProps {
    repairs: Repair[];
    maintenancePlans: MaintenancePlan[];
    vehicles: Vehicle[];
    pmHistory: PMHistory[];
    annualPlans: AnnualPMPlan[];
}

const FleetKPIDashboard: React.FC<FleetKPIDashboardProps> = ({ repairs, maintenancePlans, vehicles, pmHistory, annualPlans }) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    const safeRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);
    const safePlans = useMemo(() => Array.isArray(maintenancePlans) ? maintenancePlans : [], [maintenancePlans]);
    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);
    const safeHistory = useMemo(() => Array.isArray(pmHistory) ? pmHistory : [], [pmHistory]);
    const safeAnnualPlans = useMemo(() => Array.isArray(annualPlans) ? annualPlans : [], [annualPlans]);

    const memoizedData = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        const endDate = new Date(now);

        switch (dateRange) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate.setDate(0); // End of last month
                break;
        }
        startDate.setHours(0, 0, 0, 0);

        const periodRepairs = safeRepairs.filter(r => {
            const repairDate = new Date(r.createdAt);
            return repairDate >= startDate && repairDate <= endDate;
        });

        const completedPeriodRepairs = periodRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate && r.createdAt);

        // --- KPI Calculations ---
        const totalVehicles = safeVehicles.length;
        const periodHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const totalPossibleHours = totalVehicles * periodHours;
        const totalDowntimeHours = completedPeriodRepairs.reduce((sum: number, r) => sum + calculateDurationHours(r.createdAt, r.repairEndDate), 0);

        const fleetAvailability = totalPossibleHours > 0 ? ((totalPossibleHours - totalDowntimeHours) / totalPossibleHours) * 100 : 100;

        const periodHistory = safeHistory.filter(h => {
            const serviceDate = new Date(h.serviceDate);
            return serviceDate >= startDate && serviceDate <= endDate;
        });
        
        // Corrected Logic for PM Completion Rate (Compliance Rate)
        // 1. Identify plans that were DUE in this period
        const duePlansInPeriod = safePlans.filter(plan => {
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

            return nextServiceDate >= startDate && nextServiceDate <= endDate;
        });

        const duePlansInPeriodCount = duePlansInPeriod.length;

        // 2. Count how many of these specific DUE plans were actually completed (found in history)
        // We check if any history record in the period matches the plan ID
        const completedDuePlansCount = duePlansInPeriod.filter(plan => 
            periodHistory.some(h => h.maintenancePlanId === plan.id)
        ).length;

        // 3. Calculate rate: (Completed Due Plans / Total Due Plans) * 100
        const pmCompletionRate = duePlansInPeriodCount > 0
            ? (completedDuePlansCount / duePlansInPeriodCount) * 100
            : 100; // If nothing was due, we are 100% compliant (nothing missed).

        // --- REWORK CALCULATION (replaces recurring breakdown) ---
        const repairsByVehicleForRework = periodRepairs.reduce((acc: Record<string, { description: string, date: string }[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            // Store description and date to better identify reworks
            acc[r.licensePlate].push({ description: r.problemDescription, date: r.createdAt });
            return acc;
        }, {} as Record<string, { description: string, date: string }[]>);

        const uniqueVehicleRepairCount = Object.keys(repairsByVehicleForRework).length;

        // Helper function for simple text similarity
        const areProblemsSimilar = (desc1: string, desc2: string): boolean => {
            if (!desc1 || !desc2) return false;
            const normalize = (str: string) => {
                const thaiStopwords = ['ที่', 'มี', 'ตอน', 'แล้ว', 'ครับ', 'ค่ะ', 'ผิดปกติ', 'ระบบ', 'และ', 'กับ', 'ของ', 'ใน'];
                return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, ' ').split(' ').filter(word => !thaiStopwords.includes(word) && word.length > 2).map(word => word.replace(/ๆ/g, ''));
            };
            const words1 = new Set(normalize(desc1));
            const words2 = new Set(normalize(desc2));
            if (words1.size === 0 || words2.size === 0) return false;
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            if (union.size === 0) return false;
            const jaccardSimilarity = intersection.size / union.size;
            return jaccardSimilarity > 0.4; // Threshold for similarity
        };

        let reworkVehicleCount = 0;
        const reworkedVehicles: { plate: string, descriptions: string[] }[] = [];

        Object.entries(repairsByVehicleForRework).forEach(([plate, vehicleRepairs]: [string, { description: string; date: string }[]]) => {
            if (vehicleRepairs.length > 1) {
                const sortedRepairs = vehicleRepairs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                let foundRework = false;
                for (let i = 0; i < sortedRepairs.length; i++) {
                    for (let j = i + 1; j < sortedRepairs.length; j++) {
                        const daysBetween = (new Date(sortedRepairs[j].date).getTime() - new Date(sortedRepairs[i].date).getTime()) / (1000 * 3600 * 24);
                        if (daysBetween <= 30 && areProblemsSimilar(sortedRepairs[i].description, sortedRepairs[j].description)) {
                            foundRework = true;
                            break;
                        }
                    }
                    if (foundRework) break;
                }
                if (foundRework) {
                    reworkVehicleCount++;
                    reworkedVehicles.push({ plate, descriptions: vehicleRepairs.map(r => r.description) });
                }
            }
        });

        const reworkRate = uniqueVehicleRepairCount > 0 ? (reworkVehicleCount / uniqueVehicleRepairCount) * 100 : 0;
        
        const avgDowntime = completedPeriodRepairs.length > 0 ? totalDowntimeHours / completedPeriodRepairs.length : 0;
        
        const totalCost = completedPeriodRepairs.reduce((sum: number, r) => {
            const partsCost = (r.parts || []).reduce((pSum: number, p) => {
                const quantity = Number(p.quantity) || 0;
                const unitPrice = Number(p.unitPrice) || 0;
                return pSum + (quantity * unitPrice);
            }, 0);
            const repairCost = Number(r.repairCost) || 0;
            const partsVat = Number(r.partsVat) || 0;
            const laborVat = Number(r.laborVat) || 0;
            return sum + repairCost + partsCost + partsVat + laborVat;
        }, 0);

        // --- NEW Unplanned PM Calculation ---
        const completedPmsInPeriod = periodHistory;
        let unplannedCompletionsCount = 0;
        const annualPlansMap = new Map<string, AnnualPMPlan>(safeAnnualPlans.map(p => [`${p.vehicleLicensePlate}-${p.maintenancePlanId}-${p.year}`, p]));
        const unplannedPmItems: { vehicle: string, planName: string, date: string }[] = [];

        completedPmsInPeriod.forEach(historyItem => {
            const serviceDate = new Date(historyItem.serviceDate);
            const year = serviceDate.getFullYear();
            const month = serviceDate.getMonth(); // 0-11
            const key = `${historyItem.vehicleLicensePlate}-${historyItem.maintenancePlanId}-${year}`;
            
            const annualPlan = annualPlansMap.get(key);
            if (annualPlan && annualPlan.months[month] === 'completed_unplanned') {
                unplannedCompletionsCount++;
                unplannedPmItems.push({
                    vehicle: historyItem.vehicleLicensePlate,
                    planName: historyItem.planName,
                    date: historyItem.serviceDate
                });
            }
        });

        const unplannedPmRate = completedPmsInPeriod.length > 0 ? (unplannedCompletionsCount / completedPmsInPeriod.length) * 100 : 0;

        // --- Chart Data ---
        const downtimeByMonth = periodRepairs.reduce((acc: Record<string, number>, r) => {
            if (!r.createdAt || !r.repairEndDate) return acc;
            const month = new Date(r.createdAt).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            const downtime = calculateDurationHours(r.createdAt, r.repairEndDate);
            acc[month] = (acc[month] || 0) + downtime;
            return acc;
        }, {} as Record<string, number>);
        const downtimeChartData = Object.entries(downtimeByMonth).map(([label, value]) => ({ label, value }));
        
        // Update Chart Data for PM Compliance
        // Show "Completed Due Plans" vs "Missed/Pending Due Plans"
        const pmComplianceChartData = [
            { name: 'สำเร็จตามแผน', value: completedDuePlansCount }, 
            { name: 'ค้าง/พลาดเป้า', value: Math.max(0, duePlansInPeriodCount - completedDuePlansCount) }
        ];

        // --- Alerts Table ---
        const alerts: AlertItem[] = [];
        // High downtime vehicles
        Object.entries(periodRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push(r);
            return acc;
        }, {} as Record<string, Repair[]>)).forEach(([plate, vehicleRepairs]: [string, Repair[]]) => {
            const count = vehicleRepairs.length;
            const vehicleDowntime = vehicleRepairs
                .filter(r => r.createdAt && r.repairEndDate)
                .reduce((sum: number, r) => sum + calculateDurationHours(r.createdAt, r.repairEndDate), 0);
            if (vehicleDowntime > 48) { // Example threshold: 48 hours
                alerts.push({ type: 'Downtime', vehicle: plate, details: `Downtime รวม ${formatHoursToHHMM(vehicleDowntime)}`, value: vehicleDowntime, priority: 'high' });
            }
            if (count > 2) {
                alerts.push({ type: 'Breakdown', vehicle: plate, details: `เกิดการซ่อม ${count} ครั้ง`, value: count, priority: 'medium' });
            }
        });
        // Overdue PMs
        safePlans.forEach(plan => {
             let nextServiceDate = new Date(plan.lastServiceDate);
             if (plan.frequencyUnit === 'days') {
                nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
             } else if (plan.frequencyUnit === 'weeks') {
                nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
             } else {
                nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
             }
             const daysOverdue = Math.floor((new Date().getTime() - nextServiceDate.getTime()) / (1000 * 3600 * 24));
             if (daysOverdue > 0) {
                 alerts.push({ type: 'PM', vehicle: plan.vehicleLicensePlate, details: `${plan.planName} (เกินกำหนด ${daysOverdue} วัน)`, value: daysOverdue, priority: 'high' });
             }
        });
        
        // Add Rework alerts
        reworkedVehicles.forEach(rework => {
            alerts.push({
                type: 'Rework',
                vehicle: rework.plate,
                details: `ซ่อมซ้ำอาการเดิม (${rework.descriptions.length} ครั้ง)`,
                value: rework.descriptions.length,
                priority: 'high',
            });
        });

        // Add Unplanned PM alerts
        unplannedPmItems.forEach(item => {
            alerts.push({
                type: 'Unplanned PM',
                vehicle: item.vehicle,
                details: `PM นอกแผน: ${item.planName}`,
                value: 1,
                priority: 'medium',
            });
        });


        return {
            kpis: {
                fleetAvailability,
                pmCompletionRate,
                reworkRate,
                avgDowntime,
                totalCost,
                unplannedCompletionsCount,
                unplannedPmRate,
            },
            charts: {
                downtimeChartData,
                pmComplianceChartData,
            },
            alerts: alerts.sort((a,b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return (b.value as number) - (a.value as number)
            }),
        };

    }, [dateRange, safeRepairs, safePlans, safeVehicles, safeHistory, safeAnnualPlans]);
    
    const handleExport = () => {
        const headers = ["Type", "Vehicle", "Details", "Value", "Priority"];
        const rows = memoizedData.alerts.map(a => 
            [a.type, a.vehicle, `"${a.details.replace(/"/g, '""')}"`, a.value, a.priority].join(',')
        );
        const csvString = [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "fleet_kpi_alerts.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">ประสิทธิภาพและ KPI กลุ่มรถ</h2>
                <div className="flex items-center gap-2">
                    <label className="font-medium text-gray-700 text-base">ช่วงเวลา:</label>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="p-2 border border-gray-300 rounded-lg text-base">
                        <option value="7d">7 วันล่าสุด</option>
                        <option value="30d">30 วันล่าสุด</option>
                        <option value="this_month">เดือนนี้</option>
                        <option value="last_month">เดือนที่แล้ว</option>
                    </select>
                </div>
            </div>

            {/* Section 1: Fleet Health */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">ภาพรวมความพร้อมของกลุ่มรถ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KPICard title="ความพร้อมใช้งาน" value={`${memoizedData.kpis.fleetAvailability.toFixed(1)}%`} target={95} lowerIsBetter={false} />
                    <KPICard title="Downtime เฉลี่ย" value={formatHoursToHHMM(memoizedData.kpis.avgDowntime)} target={24} lowerIsBetter={true} />
                </div>
            </div>

            {/* Section 2: Maintenance Quality */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">คุณภาพการซ่อมบำรุง</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KPICard title="อัตราการซ่อมซ้ำอาการเดิม" value={`${memoizedData.kpis.reworkRate.toFixed(1)}%`} target={5} lowerIsBetter={true} />
                    <KPICard title="ค่าใช้จ่ายซ่อมบำรุงรวม" value={Math.round(memoizedData.kpis.totalCost).toLocaleString()} target={500000} lowerIsBetter={true} unit="บาท" />
                </div>
            </div>
            
            {/* Section 3: Graphs */}
            <div className="grid grid-cols-1 gap-6">
                <BarChart title="Downtime ต่อเดือน (ชั่วโมง)" data={memoizedData.charts.downtimeChartData.map(d => ({ label: d.label, value: d.value, formattedValue: formatHoursToHHMM(d.value) }))} />
            </div>
            
            {/* Section 4: Alerts */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">รายการแจ้งเตือนและปัญหาหลัก</h3>
                    <button onClick={handleExport} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Export CSV</button>
                </div>
                <div className="overflow-auto max-h-72">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">ประเภท</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">ทะเบียนรถ</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {memoizedData.alerts.map((alert, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2"><span className={`px-2 py-1 text-xs rounded-full font-semibold ${alert.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{alert.type}</span></td>
                                    <td className="px-4 py-2 font-mono font-semibold">{alert.vehicle}</td>
                                    <td className="px-4 py-2">{alert.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default FleetKPIDashboard;
