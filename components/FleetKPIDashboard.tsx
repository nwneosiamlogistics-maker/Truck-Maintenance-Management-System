import React, { useState, useMemo, useEffect } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory } from '../types';
import { GoogleGenAI } from "@google/genai";
import { KPICard, BarChart, PieChart } from './Charts';
import { calculateDurationHours, formatHoursToHHMM } from '../utils';

type DateRange = '7d' | '30d' | 'this_month' | 'last_month';
type AlertItem = {
    type: 'Downtime' | 'PM' | 'Breakdown';
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
}

const FleetKPIDashboard: React.FC<FleetKPIDashboardProps> = ({ repairs, maintenancePlans, vehicles, pmHistory }) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [recommendations, setRecommendations] = useState<string>('');
    const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);

    const safeRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);
    const safePlans = useMemo(() => Array.isArray(maintenancePlans) ? maintenancePlans : [], [maintenancePlans]);
    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);
    const safeHistory = useMemo(() => Array.isArray(pmHistory) ? pmHistory : [], [pmHistory]);

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
        const totalDowntimeHours = completedPeriodRepairs.reduce((sum, r) => sum + calculateDurationHours(r.createdAt, r.repairEndDate), 0);

        const fleetAvailability = totalPossibleHours > 0 ? ((totalPossibleHours - totalDowntimeHours) / totalPossibleHours) * 100 : 100;

        const periodHistory = safeHistory.filter(h => {
            const serviceDate = new Date(h.serviceDate);
            return serviceDate >= startDate && serviceDate <= endDate;
        });

        // **NEW ACCURATE CALCULATION**
        // Calculate how many plans were actually due in the selected period.
        const duePlansInPeriodCount = safePlans.filter(plan => {
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

            return nextServiceDate >= startDate && nextServiceDate <= endDate;
        }).length;

        // Compare completed PMs against those that were due.
        const pmCompletionRate = duePlansInPeriodCount > 0
            ? (periodHistory.length / duePlansInPeriodCount) * 100
            : 100; // If nothing was due, we are 100% compliant.

        const repairsByVehicle = periodRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const recurringBreakdownVehicles = Object.values(repairsByVehicle).filter(count => count > 1).length;
        const uniqueVehicleRepairCount = Object.keys(repairsByVehicle).length;
        const recurringBreakdownRate = uniqueVehicleRepairCount > 0 ? (recurringBreakdownVehicles / uniqueVehicleRepairCount) * 100 : 0;
        
        const avgDowntime = completedPeriodRepairs.length > 0 ? totalDowntimeHours / completedPeriodRepairs.length : 0;
        
        const totalCost = completedPeriodRepairs.reduce((sum, r) => {
            const partsCost = (r.parts || []).reduce((pSum, p) => {
                const quantity = Number(p.quantity) || 0;
                const unitPrice = Number(p.unitPrice) || 0;
                return pSum + (quantity * unitPrice);
            }, 0);
            const repairCost = Number(r.repairCost) || 0;
            const partsVat = Number(r.partsVat) || 0;
            const laborVat = Number(r.laborVat) || 0;
            return sum + repairCost + partsCost + partsVat + laborVat;
        }, 0);

        // --- Chart Data ---
        const downtimeByMonth = periodRepairs.reduce((acc, r) => {
            if (!r.createdAt || !r.repairEndDate) return acc;
            const month = new Date(r.createdAt).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            const downtime = calculateDurationHours(r.createdAt, r.repairEndDate);
            acc[month] = (acc[month] || 0) + downtime;
            return acc;
        }, {} as Record<string, number>);
        const downtimeChartData = Object.entries(downtimeByMonth).map(([label, value]) => ({ label, value }));
        
        const onTimePMs = periodHistory.length;
        const totalPMsInPeriod = duePlansInPeriodCount;
        const pmComplianceChartData = [{ name: 'ตรงเวลา', value: onTimePMs }, { name: 'ค้าง', value: Math.max(0, totalPMsInPeriod - onTimePMs) }];

        // --- Alerts Table ---
        const alerts: AlertItem[] = [];
        // High downtime vehicles
// FIX: Corrected undefined variable 'tech' to 't' inside reduce callback.
        Object.entries(periodRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push(r);
            return acc;
        }, {} as Record<string, Repair[]>)).forEach(([plate, vehicleRepairs]) => {
            const count = vehicleRepairs.length;
// FIX: Add explicit number type to accumulator to prevent type errors.
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


        return {
            kpis: {
                fleetAvailability,
                pmCompletionRate,
                recurringBreakdownRate,
                avgDowntime,
                totalCost,
            },
            charts: {
                downtimeChartData,
                pmComplianceChartData,
            },
            alerts: alerts.sort((a,b) => (b.value as number) - (a.value as number)),
        };

    }, [dateRange, safeRepairs, safePlans, safeVehicles, safeHistory]);
    
    const generateRecommendations = async () => {
        setIsLoadingRecs(true);
        setRecommendations('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const kpiSummary = `
- Fleet Availability: ${memoizedData.kpis.fleetAvailability.toFixed(1)}%
- PM Completion Rate: ${memoizedData.kpis.pmCompletionRate.toFixed(1)}%
- Recurring Breakdown Rate: ${memoizedData.kpis.recurringBreakdownRate.toFixed(1)}%
- Average Downtime: ${formatHoursToHHMM(memoizedData.kpis.avgDowntime)}
- Total Maintenance Cost: ${memoizedData.kpis.totalCost.toLocaleString()} บาท
            `;
            
            const alertSummary = memoizedData.alerts.slice(0, 5).map(a => `- ${a.type} alert for ${a.vehicle}: ${a.details}`).join('\n');

            const prompt = `
คุณคือผู้เชี่ยวชาญด้านการจัดการกลุ่มรถบรรทุก (Fleet Management Expert) โปรดวิเคราะห์ข้อมูล KPI และรายการแจ้งเตือนต่อไปนี้ และให้คำแนะนำที่เป็นรูปธรรมเพื่อปรับปรุงประสิทธิภาพ ลดค่าใช้จ่าย และเพิ่มความปลอดภัย ตอบเป็นภาษาไทยในรูปแบบมาร์กดาวน์ โดยแบ่งเป็นหัวข้อชัดเจน

**ข้อมูล KPI สรุป:**
${kpiSummary}

**รายการแจ้งเตือนสำคัญ:**
${alertSummary || 'ไม่มีการแจ้งเตือนสำคัญ'}

**คำแนะนำของคุณ (แบ่งเป็น 3 หัวข้อ):**
1.  **การซ่อมบำรุงเชิงป้องกัน (Preventive Maintenance):**
2.  **การลด Downtime และปรับปรุง Response Time:**
3.  **การจัดการค่าใช้จ่ายและอะไหล่:**
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setRecommendations(response.text);

        } catch (error) {
            console.error("Gemini API error:", error);
            setRecommendations("เกิดข้อผิดพลาดในการสร้างคำแนะนำจาก AI");
        } finally {
            setIsLoadingRecs(false);
        }
    };
    
    useEffect(() => {
        generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memoizedData]);
    
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
        <div className="space-y-6">
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

            {/* Section 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <KPICard title="ความพร้อมใช้งาน" value={`${memoizedData.kpis.fleetAvailability.toFixed(1)}%`} target={95} lowerIsBetter={false} />
                <KPICard title="อัตราการทำ PM สำเร็จ" value={`${memoizedData.kpis.pmCompletionRate.toFixed(1)}%`} target={90} lowerIsBetter={false} />
                <KPICard title="อัตราการเสียซ้ำ" value={`${memoizedData.kpis.recurringBreakdownRate.toFixed(1)}%`} target={5} lowerIsBetter={true} />
                <KPICard title="Downtime เฉลี่ย" value={formatHoursToHHMM(memoizedData.kpis.avgDowntime)} target={24} lowerIsBetter={true} />
                <KPICard title="ค่าใช้จ่ายซ่อมบำรุงรวม" value={Math.round(memoizedData.kpis.totalCost).toLocaleString()} target={500000} lowerIsBetter={true} unit="บาท" />
            </div>

            {/* Section 2: Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart title="Downtime ต่อเดือน (ชั่วโมง)" data={memoizedData.charts.downtimeChartData.map(d => ({ label: d.label, value: d.value, formattedValue: formatHoursToHHMM(d.value) }))} />
                <PieChart title="สัดส่วนการทำ PM" data={memoizedData.charts.pmComplianceChartData} />
            </div>
            
            {/* Section 3: Alerts */}
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

            {/* Section 4: Recommendations */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">💡 แผนปฏิบัติการและคำแนะนำจาก AI</h3>
                {isLoadingRecs ? (
                    <div className="flex justify-center items-center h-40">
                         <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                        {recommendations}
                    </div>
                )}
            </div>

        </div>
    );
};

export default FleetKPIDashboard;