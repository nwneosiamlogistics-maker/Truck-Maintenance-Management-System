import React, { useState, useMemo } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, AnnualPMPlan } from '../types';
import { calculateDurationHours, formatCurrency } from '../utils';

// แปลงชั่วโมงเป็นรูปแบบอ่านง่าย เช่น "5 วัน 13 ชม. 15 นาที"
const formatDowntime = (hours: number): string => {
    if (!hours || hours <= 0) return '-';
    const totalMinutes = Math.round(hours * 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const h = Math.floor((totalMinutes % (24 * 60)) / 60);
    const m = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (h > 0) parts.push(`${h} ชม.`);
    if (m > 0) parts.push(`${m} นาที`);
    return parts.length > 0 ? parts.join(' ') : '0 นาที';
};
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { ShieldCheck, Truck, AlertTriangle, DollarSign, Download, Calendar, Activity, TrendingUp } from 'lucide-react';

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

// --- Premium Styled Components ---

const ModernStatCard = ({ title, value, subtext, theme, icon, delay = '' }: any) => {
    let gradient = '';
    switch (theme) {
        case 'blue': gradient = 'from-blue-600 to-indigo-700'; break;
        case 'green': gradient = 'from-emerald-500 to-teal-700'; break;
        case 'orange': gradient = 'from-orange-500 to-red-700'; break;
        case 'purple': gradient = 'from-purple-500 to-pink-700'; break;
        default: gradient = 'from-slate-700 to-slate-900';
    }

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-5 sm:p-7 lg:p-10 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3.5rem] text-white shadow-2xl animate-scale-in ${delay} group hover:scale-[1.02] transition-all duration-700`}>
            <div className="absolute -right-10 -bottom-10 opacity-20 transform group-hover:scale-110 transition-transform duration-700 hidden sm:block">
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/70 mb-2 sm:mb-4">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter">{value}</h3>
                </div>
                {subtext && <div className="mt-3 sm:mt-6 inline-flex items-center gap-1.5 bg-white/10 w-fit px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black border border-white/10 backdrop-blur-md uppercase tracking-widest">{subtext}</div>}
            </div>
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: React.ReactNode; delay?: string; headerAction?: React.ReactNode }> = ({ title, children, className = '', icon, delay = '', headerAction }) => (
    <div className={`glass p-4 sm:p-6 lg:p-10 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/50 shadow-2xl shadow-slate-200/40 hover:shadow-3xl transition-all duration-700 animate-scale-in ${delay} ${className}`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-10">
            <h3 className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-2 sm:gap-4">
                <div className="w-1.5 sm:w-2.5 h-6 sm:h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                {title}
            </h3>
            <div className="flex items-center gap-2 sm:gap-4">
                {headerAction}
                {icon && <div className="p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-[1.5rem] text-slate-400 border border-slate-100 shadow-sm">{icon}</div>}
            </div>
        </div>
        <div className="h-[calc(100%-60px)] sm:h-[calc(100%-80px)] lg:h-[calc(100%-100px)]">
            {children}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    const getColorClass = (color: string) => {
        if (!color) return 'text-slate-500';
        const mapping: Record<string, string> = {
            '#3b82f6': 'text-blue-500',
            '#8b5cf6': 'text-violet-500',
            '#10b981': 'text-emerald-500',
            '#f59e0b': 'text-amber-500',
            '#ec4899': 'text-pink-500',
            '#fbbf24': 'text-yellow-400',
            '#6366f1': 'text-indigo-500',
            '#f43f5e': 'text-rose-500'
        };
        return mapping[color.toLowerCase()] || 'text-slate-500';
    };

    const getBgClass = (color: string) => {
        if (!color) return 'bg-slate-500';
        const mapping: Record<string, string> = {
            '#3b82f6': 'bg-blue-500',
            '#8b5cf6': 'bg-violet-500',
            '#10b981': 'bg-emerald-500',
            '#f59e0b': 'bg-amber-500',
            '#ec4899': 'bg-pink-500',
            '#fbbf24': 'bg-yellow-400',
            '#6366f1': 'bg-indigo-500',
            '#f43f5e': 'bg-rose-500'
        };
        return mapping[color.toLowerCase()] || 'bg-slate-500';
    };

    if (active && payload && payload.length) {
        return (
            <div className="glass p-5 border border-white shadow-2xl rounded-3xl z-50 backdrop-blur-xl">
                <p className="font-black text-slate-800 mb-3 text-xs border-b border-slate-100/50 pb-2 uppercase tracking-widest">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className={`text-[11px] font-black mt-1.5 flex items-center gap-2 ${getColorClass(entry.color)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getBgClass(entry.color)}`}></span>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value} {unit}
                    </p>
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
            case '7d': startDate.setDate(now.getDate() - 7); break;
            case '30d': startDate.setDate(now.getDate() - 30); break;
            case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); endDate.setDate(0); break;
        }
        startDate.setHours(0, 0, 0, 0);

        const periodRepairs = safeRepairs.filter(r => {
            const repairDate = new Date(r.createdAt);
            return repairDate >= startDate && repairDate <= endDate;
        });

        const completedPeriodRepairs = periodRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate && r.createdAt);

        const totalVehicles = safeVehicles.length;
        const periodHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const totalPossibleHours = totalVehicles * periodHours;
        const totalDowntimeHours = completedPeriodRepairs.reduce((sum: number, r) => sum + calculateDurationHours(r.createdAt, r.repairEndDate ?? null), 0);

        const fleetAvailability = totalPossibleHours > 0 ? ((totalPossibleHours - totalDowntimeHours) / totalPossibleHours) * 100 : 100;

        // PM Compliance จากสถานะจริงใน annualPlans (planned / completed / completed_unplanned)
        // เดิมคำนวณจาก lastServiceDate + รอบ ซึ่งพอทำ PM เสร็จแล้วแผนจะหลุดออกจากช่วง ทำให้ "สำเร็จ" เกือบ 0 เสมอ
        const pmStatus = { planned: 0, completed: 0 };
        safeAnnualPlans.forEach(plan => {
            Object.entries(plan.months || {}).forEach(([mi, status]) => {
                const monthStart = new Date(plan.year, parseInt(mi), 1);
                const monthEnd = new Date(plan.year, parseInt(mi) + 1, 0, 23, 59, 59);
                // นับเดือนที่ทับซ้อนกับช่วงเวลาที่เลือก
                if (monthEnd >= startDate && monthStart <= endDate) {
                    if (status === 'planned') pmStatus.planned++;
                    else if (status === 'completed' || status === 'completed_unplanned') pmStatus.completed++;
                }
            });
        });
        const totalDuePM = pmStatus.planned + pmStatus.completed;
        const completedDuePlansCount = pmStatus.completed;
        const pmCompletionRate = totalDuePM > 0 ? (pmStatus.completed / totalDuePM) * 100 : 100;

        // Rework Rate
        const repairsByVehicleForRework = periodRepairs.reduce((acc: Record<string, { desc: string, date: string }[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push({ desc: r.problemDescription, date: r.createdAt });
            return acc;
        }, {});

        const areProblemsSimilar = (desc1: string, desc2: string): boolean => {
            if (!desc1 || !desc2) return false;
            const normalize = (str: string) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, ' ').split(' ').filter(w => w.length > 2);
            const words1 = new Set(normalize(desc1));
            const words2 = new Set(normalize(desc2));
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            return union.size > 0 && (intersection.size / union.size) > 0.4;
        };

        let reworkVehicleCount = 0;
        const reworkedVehicles: any[] = [];
        Object.entries(repairsByVehicleForRework).forEach(([plate, vehicleRepairs]: [string, any]) => {
            if (vehicleRepairs.length > 1) {
                const sorted = vehicleRepairs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const problems = new Set<string>();
                for (let i = 0; i < sorted.length; i++) {
                    for (let j = i + 1; j < sorted.length; j++) {
                        const days = (new Date(sorted[j].date).getTime() - new Date(sorted[i].date).getTime()) / (1000 * 3600 * 24);
                        if (days <= 365 && areProblemsSimilar(sorted[i].desc, sorted[j].desc)) {
                            problems.add(sorted[i].desc);
                            problems.add(sorted[j].desc);
                        }
                    }
                }
                if (problems.size > 0) { reworkVehicleCount++; reworkedVehicles.push({ plate, descriptions: Array.from(problems) }); }
            }
        });

        const reworkRate = Object.keys(repairsByVehicleForRework).length > 0 ? (reworkVehicleCount / Object.keys(repairsByVehicleForRework).length) * 100 : 0;
        const totalCost = completedPeriodRepairs.reduce((sum, r) => {
            const partsCost = (r.parts || []).reduce((pSum, p) => pSum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0);
            return sum + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        }, 0);

        // Chart Data
        const timelineMap = new Map();
        completedPeriodRepairs.forEach(r => {
            const date = new Date(r.repairEndDate!).toLocaleDateString('en-CA');
            if (!timelineMap.has(date)) timelineMap.set(date, { date, downtime: 0, cost: 0 });
            const entry = timelineMap.get(date);
            entry.downtime += calculateDurationHours(r.createdAt, r.repairEndDate!);
            const pCost = (r.parts || []).reduce((ps, p) => ps + (Number(p.quantity) * Number(p.unitPrice)), 0);
            entry.cost += (Number(r.repairCost) || 0) + pCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        });

        const trendData = Array.from(timelineMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) }));

        const pmChartData = [
            { name: 'สำเร็จตามแผน', value: completedDuePlansCount },
            { name: 'ค้าง/พลาดเป้า', value: pmStatus.planned }
        ];

        const topDowntime = Object.entries(completedPeriodRepairs.reduce((acc: any, r) => {
            const dt = calculateDurationHours(r.createdAt, r.repairEndDate!);
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + dt;
            return acc;
        }, {})).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

        // Alerts
        const alerts: AlertItem[] = [];
        // แจ้งเตือน PM ค้างดำเนินการ
        if (pmStatus.planned > 0) {
            alerts.push({ type: 'PM', vehicle: `${pmStatus.planned} แผน`, details: `มีแผนซ่อมบำรุง (PM) ค้างดำเนินการในช่วงนี้`, value: pmStatus.planned, priority: 'high' });
        }
        // แจ้งเตือนรถจอดซ่อมนาน (Downtime สูง) — Top 3 ที่เกิน 24 ชม.
        topDowntime.slice(0, 3).forEach((d: any) => {
            const hrs = Number(d.value) || 0;
            if (hrs >= 24) {
                alerts.push({ type: 'Downtime', vehicle: String(d.name), details: `จอดซ่อมสะสมนาน ${formatDowntime(hrs)}`, value: hrs, priority: hrs >= 72 ? 'high' : 'medium' });
            }
        });
        // แจ้งเตือนรถซ่อมซ้ำ
        reworkedVehicles.forEach(rw => alerts.push({ type: 'Rework', vehicle: rw.plate, details: `ซ่อมซ้ำ: ${rw.descriptions.join(', ')}`, value: rw.descriptions.length, priority: 'high' }));

        return {
            kpis: { fleetAvailability, pmCompletionRate, reworkRate, totalCost },
            charts: { trendData, pmChartData, topDowntime },
            alerts: alerts.sort((a, b) => (a.priority === 'high' ? -1 : 1))
        };
    }, [dateRange, safeRepairs, safePlans, safeVehicles, safeHistory, safeAnnualPlans]);

    const handleExport = () => {
        const headers = ["Type", "Vehicle", "Details", "Value", "Priority"];
        const rows = memoizedData.alerts.map(a => [a.type, a.vehicle, `"${a.details.replace(/"/g, '""')}"`, a.value, a.priority].join(','));
        const csvString = [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "fleet_kpi.csv";
        link.click();
    };

    return (
        <div className="space-y-6 sm:space-y-8 lg:space-y-12 animate-fade-in-up pb-8 sm:pb-12">
            {/* Header */}
            <div className="glass p-4 sm:p-7 lg:p-10 rounded-2xl sm:rounded-[3rem] lg:rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none"></div>
                <div className="flex items-start justify-between gap-4 relative z-10">
                    <div>
                        <h2 className="text-xl sm:text-4xl lg:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 leading-none">
                            Fleet Intel Hub
                        </h2>
                        <p className="text-slate-400 font-black mt-1.5 sm:mt-4 uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[9px] sm:text-[10px] flex items-center gap-2 sm:gap-3">
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-pulse shrink-0"></span>
                            <span className="hidden sm:inline">วิเคราะห์ประสิทธิภาพกลุ่มรถ (Fleet Performance Intelligence)</span>
                            <span className="sm:hidden">Fleet Performance</span>
                        </p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-xl px-3 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-[2.5rem] border border-white shadow-xl flex flex-col shrink-0">
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">ช่วงเวลา</span>
                        <select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value as any)}
                            title="เลือกช่วงเวลา"
                            className="bg-transparent text-[10px] sm:text-xs font-black text-slate-700 outline-none hover:text-blue-600 transition-colors"
                        >
                            <option value="7d">7 วัน</option>
                            <option value="30d">30 วัน</option>
                            <option value="this_month">เดือนนี้</option>
                            <option value="last_month">เดือนก่อน</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="bento-grid h-auto lg:h-auto gap-4 sm:gap-6 lg:gap-10">
                <ModernStatCard delay="delay-100" theme="blue" title="ความพร้อมใช้งาน" value={`${memoizedData.kpis.fleetAvailability.toFixed(1)}%`} subtext="Fleet Availability" icon={<Truck size={150} />} />
                <ModernStatCard delay="delay-200" theme="green" title="PM Compliance" value={`${memoizedData.kpis.pmCompletionRate.toFixed(1)}%`} subtext="Preventive Success" icon={<ShieldCheck size={150} />} />
                <ModernStatCard delay="delay-300" theme="orange" title="อัตราซ่อมซ้ำ" value={`${memoizedData.kpis.reworkRate.toFixed(1)}%`} subtext="Rework Rate" icon={<AlertTriangle size={150} />} />
                <ModernStatCard delay="delay-400" theme="purple" title="ค่าซ่อมรวม" value={`${formatCurrency(memoizedData.kpis.totalCost)}`} subtext="Total Spend (฿)" icon={<DollarSign size={150} />} />

                {/* Main Trend Chart */}
                <Card title="แนวโน้ม Downtime และค่าใช้จ่าย" className="col-span-1 lg:col-span-3 min-h-[280px] sm:min-h-[400px] lg:min-h-[500px]" delay="delay-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={memoizedData.charts.trendData}>
                            <defs>
                                <linearGradient id="colorDT" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Area yAxisId="left" type="monotone" dataKey="downtime" name="Downtime (ชม.)" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorDT)" />
                            <Line yAxisId="right" type="monotone" dataKey="cost" name="ค่าใช้จ่าย (บาท)" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>

                {/* Secondary Charts */}
                <Card title="5 อันดับรถจอดซ่อมนาน" className="col-span-1 min-h-[280px] sm:min-h-[350px] lg:min-h-[450px]" delay="delay-600">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={memoizedData.charts.topDowntime} margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="ชม." />} />
                            <Bar dataKey="value" name="Downtime" fill="#f43f5e" radius={[0, 10, 10, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="สัดส่วน PM" className="col-span-1 min-h-[280px] sm:min-h-[350px] lg:min-h-[450px]" delay="delay-700">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={memoizedData.charts.pmChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                                <Cell fill="#10b981" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                {/* Alerts Section */}
                <Card
                    title="แจ้งเตือนวิเคราะห์"
                    className="col-span-1 min-h-[280px] sm:min-h-[350px] lg:min-h-[450px]"
                    delay="delay-800"
                    headerAction={
                        <button onClick={handleExport} title="ส่งออกข้อมูล" className="p-3 bg-slate-950 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group">
                            <Download size={18} className="group-hover:animate-bounce" />
                        </button>
                    }
                >
                    <div className="overflow-auto h-[300px] custom-scrollbar pr-2">
                        {memoizedData.alerts.length > 0 ? (
                            <div className="space-y-4">
                                {memoizedData.alerts.map((alert, idx) => (
                                    <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{alert.type}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${alert.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {alert.priority}
                                            </span>
                                        </div>
                                        <p className="font-black text-slate-800 text-sm mb-1">{alert.vehicle}</p>
                                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{alert.details}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <ShieldCheck size={60} className="mb-4 opacity-10" />
                                <p className="font-black uppercase tracking-widest text-[10px]">No Strategic Alerts</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FleetKPIDashboard;
