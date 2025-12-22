import React, { useState, useMemo } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, AnnualPMPlan } from '../types';
import { calculateDurationHours, formatHoursToHHMM, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';

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

// --- Styled Components (Infographic Style) ---

const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'; // Dashboard/Availability
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // Check/Compliance
            break;
        case 'orange':
            gradient = 'from-orange-500 to-red-500';
            iconPath = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'; // Alert/Rework
            break;
        case 'purple':
            gradient = 'from-purple-500 to-pink-500';
            iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Money
            break;
        default:
            gradient = 'from-slate-700 to-slate-800';
            iconPath = 'M4 6h16M4 10h16M4 14h16M4 18h16';
    }

    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg hover:transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center`}>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d={iconPath} /></svg>
            </div>
            <p className="text-white/90 font-medium mb-1 relative z-10">{title}</p>
            <h3 className="text-4xl font-extrabold relative z-10">{value}</h3>
            {subtext && <p className="text-sm mt-2 opacity-80 relative z-10">{subtext}</p>}
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; headerAction?: React.ReactNode }> = ({ title, children, className = '', headerAction }) => (
    <div className={`bg-white rounded-3xl shadow-sm p-6 border border-slate-100 ${className}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full inline-block shadow-sm"></span>
                {title}
            </h3>
            {headerAction}
        </div>
        {children}
    </div>
);

const TooltipEntry: React.FC<{ color: string; name: string; value: any; unit?: string }> = ({ color, name, value, unit = '' }) => {
    const pRef = React.useRef<HTMLParagraphElement>(null);
    React.useLayoutEffect(() => {
        if (pRef.current) pRef.current.style.color = color;
    }, [color]);

    return (
        <p ref={pRef} className="text-xs font-semibold mt-1">
            {name}: {typeof value === 'number' ? value.toLocaleString() : value} {unit}
        </p>
    );
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl z-50">
                <p className="font-bold text-slate-700 mb-1 text-sm border-b border-gray-100 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <TooltipEntry
                        key={index}
                        color={entry.color}
                        name={entry.name}
                        value={entry.value}
                        unit={unit}
                    />
                ))}
            </div>
        );
    }
    return null;
};

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
        const totalDowntimeHours = completedPeriodRepairs.reduce((sum: number, r) => sum + calculateDurationHours(r.createdAt, r.repairEndDate ?? null), 0);

        const fleetAvailability = totalPossibleHours > 0 ? ((totalPossibleHours - totalDowntimeHours) / totalPossibleHours) * 100 : 100;

        const periodHistory = safeHistory.filter(h => {
            const serviceDate = new Date(h.serviceDate);
            return serviceDate >= startDate && serviceDate <= endDate;
        });

        // Corrected Logic for PM Completion Rate
        const duePlansInPeriod = safePlans.filter(plan => {
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

            return nextServiceDate >= startDate && nextServiceDate <= endDate;
        });

        const duePlansInPeriodCount = duePlansInPeriod.length;
        const completedDuePlansCount = duePlansInPeriod.filter(plan =>
            periodHistory.some(h => h.maintenancePlanId === plan.id)
        ).length;

        const pmCompletionRate = duePlansInPeriodCount > 0
            ? (completedDuePlansCount / duePlansInPeriodCount) * 100
            : 100;

        // --- REWORK CALCULATION ---
        const repairsByVehicleForRework = periodRepairs.reduce((acc: Record<string, { description: string, date: string }[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push({ description: r.problemDescription, date: r.createdAt });
            return acc;
        }, {} as Record<string, { description: string, date: string }[]>);

        const uniqueVehicleRepairCount = Object.keys(repairsByVehicleForRework).length;

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
            return jaccardSimilarity > 0.4;
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

        const annualPlansMap = new Map<string, AnnualPMPlan>(
            safeAnnualPlans.map(p => [`${p.vehicleLicensePlate}-${p.maintenancePlanId}-${p.year}`, p] as [string, AnnualPMPlan])
        );
        const unplannedPmItems: { vehicle: string, planName: string, date: string }[] = [];

        completedPmsInPeriod.forEach(historyItem => {
            const serviceDate = new Date(historyItem.serviceDate);
            const year = serviceDate.getFullYear();
            const month = serviceDate.getMonth();
            const key = `${historyItem.vehicleLicensePlate}-${historyItem.maintenancePlanId}-${year}`;

            const annualPlan = annualPlansMap.get(key);
            if (annualPlan && annualPlan.months[month] === 'completed_unplanned') {
                unplannedCompletionsCount++;

                const planInfo = safePlans.find(p => p.id === historyItem.maintenancePlanId);
                const planName = planInfo ? planInfo.planName : 'Unknown Plan';

                unplannedPmItems.push({
                    vehicle: historyItem.vehicleLicensePlate,
                    planName: planName,
                    date: historyItem.serviceDate
                });
            }
        });

        const unplannedPmRate = completedPmsInPeriod.length > 0 ? (unplannedCompletionsCount / completedPmsInPeriod.length) * 100 : 0;

        // --- Chart Data Preparation ---
        const timelineDataMap = new Map<string, { date: string, downtime: number, cost: number }>();

        completedPeriodRepairs.forEach(r => {
            const dateKey = new Date(r.repairEndDate!).toLocaleDateString('en-CA');
            if (!timelineDataMap.has(dateKey)) timelineDataMap.set(dateKey, { date: dateKey, downtime: 0, cost: 0 });

            const downtime = calculateDurationHours(r.createdAt, r.repairEndDate ?? null);

            const partsCost = (r.parts || []).reduce((pSum, p) => pSum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0);
            const cost = (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);

            const entry = timelineDataMap.get(dateKey)!;
            entry.downtime += downtime;
            entry.cost += cost;
        });

        const trendData = Array.from(timelineDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) }));


        const pmComplianceChartData = [
            { name: 'สำเร็จตามแผน', value: completedDuePlansCount },
            { name: 'ค้าง/พลาดเป้า', value: Math.max(0, duePlansInPeriodCount - completedDuePlansCount) }
        ];

        const downtimeByVehicle = completedPeriodRepairs.reduce((acc, r) => {
            const downtime = calculateDurationHours(r.createdAt, r.repairEndDate ?? null);
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + downtime;
            return acc;
        }, {} as Record<string, number>);

        const topDowntimeVehicles = Object.entries(downtimeByVehicle)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 5);


        // --- Alerts ---
        const alerts: AlertItem[] = [];
        Object.entries(periodRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push(r);
            return acc;
        }, {} as Record<string, Repair[]>)).forEach(([plate, vehicleRepairs]: [string, Repair[]]) => {
            const count = vehicleRepairs.length;
            const vehicleDowntime = vehicleRepairs.reduce((sum, r) => sum + (r.repairEndDate ? calculateDurationHours(r.createdAt, r.repairEndDate ?? null) : 0), 0);
            if (vehicleDowntime > 48) alerts.push({ type: 'Downtime', vehicle: plate, details: `Downtime ${formatHoursToHHMM(vehicleDowntime)}`, value: vehicleDowntime, priority: 'high' });
            if (count > 2) alerts.push({ type: 'Breakdown', vehicle: plate, details: `ซ่อม ${count} ครั้ง`, value: count, priority: 'medium' });
        });

        safePlans.forEach(plan => {
            let nextServiceDate = new Date(plan.lastServiceDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
            const daysOverdue = Math.floor((new Date().getTime() - nextServiceDate.getTime()) / (1000 * 3600 * 24));
            if (daysOverdue > 0) alerts.push({ type: 'PM', vehicle: plan.vehicleLicensePlate, details: `${plan.planName} (เกิน ${daysOverdue} วัน)`, value: daysOverdue, priority: 'high' });
        });

        reworkedVehicles.forEach(rework => alerts.push({ type: 'Rework', vehicle: rework.plate, details: `ซ่อมซ้ำ (${rework.descriptions.length} ครั้ง)`, value: rework.descriptions.length, priority: 'high' }));
        unplannedPmItems.forEach(item => alerts.push({ type: 'Unplanned PM', vehicle: item.vehicle, details: `PM นอกแผน: ${item.planName}`, value: 1, priority: 'medium' }));

        return {
            kpis: {
                fleetAvailability,
                pmCompletionRate,
                reworkRate,
                avgDowntime,
                totalCost,
                unplannedPmRate,
            },
            charts: {
                trendData,
                pmComplianceChartData,
                topDowntimeVehicles
            },
            alerts: alerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)),
        };

    }, [dateRange, safeRepairs, safePlans, safeVehicles, safeHistory, safeAnnualPlans]);


    const handleExport = () => {
        const headers = ["Type", "Vehicle", "Details", "Value", "Priority"];
        const rows = memoizedData.alerts.map(a => [a.type, a.vehicle, `"${a.details.replace(/"/g, '""')}"`, a.value, a.priority].join(','));
        const csvString = [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "fleet_kpi_alerts.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        Fleet Performance & KPI
                    </h2>
                    <p className="text-gray-500 mt-1">วิเคราะห์ประสิทธิภาพกลุ่มรถและงานซ่อมบำรุง</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <span className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">PERIOD:</span>
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as DateRange)}
                        title="เลือกช่วงเวลาการวิเคราะห์"
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                </div>
            </div>

            {/* Top KPI Cards (Infographic Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard
                    title="ความพร้อมใช้งาน"
                    value={`${memoizedData.kpis.fleetAvailability.toFixed(1)}%`}
                    theme="blue"
                    subtext="Availability"
                />
                <ModernStatCard
                    title="PM Compliance"
                    value={`${memoizedData.kpis.pmCompletionRate.toFixed(1)}%`}
                    theme="green"
                    subtext="แผนบำรุงรักษาสำเร็จ"
                />
                <ModernStatCard
                    title="Rework Rate"
                    value={`${memoizedData.kpis.reworkRate.toFixed(1)}%`}
                    theme="orange"
                    subtext="อัตราการซ่อมซ้ำ"
                />
                <ModernStatCard
                    title="ค่าซ่อมรวม"
                    value={`${formatCurrency(memoizedData.kpis.totalCost)}`}
                    theme="purple"
                    subtext="บาท"
                />
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Downtime & Cost Trend (Area Chart) */}
                <div className="lg:col-span-2">
                    <Card title="📉 แนวโน้ม Downtime และค่าใช้จ่าย">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={memoizedData.charts.trendData}>
                                    <defs>
                                        <linearGradient id="colorDowntime" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'ชม.', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'บาท', angle: 90, position: 'insideRight', style: { fill: '#94a3b8' } }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="downtime" name="Downtime (ชม.)" stroke="#8884d8" fillOpacity={1} fill="url(#colorDowntime)" />
                                    <Line yAxisId="right" type="monotone" dataKey="cost" name="ค่าใช้จ่าย (บาท)" stroke="#ff7300" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Right: Top Downtime Vehicles */}
                <Card title="🚗 5 อันดับรถเสียบ่อยที่สุด">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={memoizedData.charts.topDowntimeVehicles}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="ชม." />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" name="Downtime (ชม.)" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: PM Stats & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PM Compliance Circular Chart */}
                <Card title="✅ สัดส่วนสถานะแผน PM">
                    <div className="h-64 w-full relative">
                        {memoizedData.charts.pmComplianceChartData.every(d => d.value === 0) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <span className="text-4xl mb-2">📊</span>
                                <p className="text-sm font-medium">ไม่มีข้อมูล PM ในช่วงเวลานี้</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={memoizedData.charts.pmComplianceChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {memoizedData.charts.pmComplianceChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="bottom" height={36} />
                                    <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle">
                                        <tspan x="50%" dy="-5" fontSize="18" fontWeight="bold" fill="#334155">
                                            {memoizedData.charts.pmComplianceChartData.reduce((sum, d) => sum + d.value, 0)}
                                        </tspan>
                                        <tspan x="50%" dy="18" fontSize="10" fill="#94a3b8" fontWeight="bold">TOTAL</tspan>
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                {/* Alerts Table */}
                <div className="lg:col-span-2">
                    <Card
                        title="🚨 การแจ้งเตือนและการวิเคราะห์"
                        headerAction={
                            <button onClick={handleExport} className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                ดาวน์โหลด CSV
                            </button>
                        }
                    >
                        <div className="overflow-auto max-h-64 pr-2 custom-scrollbar">
                            {memoizedData.alerts.length > 0 ? (
                                <table className="w-full">
                                    <tbody className="divide-y divide-gray-100">
                                        {memoizedData.alerts.map((alert, index) => (
                                            <tr key={index} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                        alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                        {alert.priority.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 font-semibold text-slate-700">{alert.vehicle}</td>
                                                <td className="py-3 px-2 text-slate-600 text-sm">{alert.details}</td>
                                                <td className="py-3 px-2 text-right text-xs text-slate-400">{alert.type}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p>No active alerts. Good job! 👍</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FleetKPIDashboard;
