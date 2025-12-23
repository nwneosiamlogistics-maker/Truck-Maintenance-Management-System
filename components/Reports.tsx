import React, { useState, useMemo } from 'react';
import type { Repair, StockItem, Technician, AnnualPMPlan } from '../types';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Line, ComposedChart
} from 'recharts';
import { Download, TrendingUp, DollarSign, Activity, Award } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';

// --- Premium Styled Components ---

const ModernStatCard = ({ title, value, subtext, theme, icon, delay }: any) => {
    let gradient = '';
    let iconColor = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-600 to-indigo-700 shadow-blue-500/20';
            iconColor = 'text-blue-200';
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-700 shadow-emerald-500/20';
            iconColor = 'text-emerald-200';
            break;
        case 'purple':
            gradient = 'from-indigo-500 to-purple-800 shadow-indigo-500/20';
            iconColor = 'text-purple-200';
            break;
        case 'orange':
            gradient = 'from-orange-500 to-rose-700 shadow-orange-500/20';
            iconColor = 'text-orange-200';
            break;
        default:
            gradient = 'from-slate-700 to-slate-900 shadow-slate-500/20';
            iconColor = 'text-slate-300';
    }

    return (
        <div className={`bg-gradient-to-br ${gradient} p-8 rounded-[3rem] text-white shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group animate-scale-in ${delay}`}>
            <div className={`absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 ${iconColor}`}>
                {icon || (
                    <Activity size={180} strokeWidth={1} />
                )}
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <h3 className="text-white/60 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{title}</h3>
                    <div className="text-4xl font-black tabular-nums">{value}</div>
                </div>
                {subtext && <div className="mt-6 inline-flex items-center gap-1.5 bg-white/10 w-fit px-4 py-1.5 rounded-full text-[10px] font-black border border-white/10 backdrop-blur-md uppercase tracking-widest">{subtext}</div>}
            </div>
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: React.ReactNode; delay?: string }> = ({ title, children, className = '', icon, delay = '' }) => (
    <div className={`glass p-10 rounded-[3.5rem] border border-white/50 shadow-2xl shadow-slate-200/40 hover:shadow-3xl transition-all duration-700 animate-scale-in ${delay} ${className}`}>
        <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                <div className="w-2.5 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                {title}
            </h3>
            {icon && <div className="p-3 bg-slate-50 rounded-[1.5rem] text-slate-400 border border-slate-100 shadow-sm">{icon}</div>}
        </div>
        <div className="h-[calc(100%-100px)]">
            {children}
        </div>
    </div>
);

// --- Custom Recharts Components ---

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

// --- Helper Functions ---

const calculateTotalCost = (repair: Repair): number => {
    const partsCost = (repair.parts || []).reduce((sum: number, part) => {
        return sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
    }, 0);
    return (Number(repair.repairCost) || 0) + partsCost + (Number(repair.partsVat) || 0) + (Number(repair.laborVat) || 0);
};

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

const Reports: React.FC<{ repairs: Repair[], stock: StockItem[], technicians: Technician[], purchaseOrders?: any[], suppliers?: any[], annualPlans?: AnnualPMPlan[] }> = ({ repairs, stock, technicians, purchaseOrders = [], suppliers = [], annualPlans = [] }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supplierViewMode, setSupplierViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

    const handleExport = () => {
        const exportData = repairs.map(r => ({
            'ใบแจ้งซ่อม': r.repairOrderNo,
            'ทะเบียนรถ': r.licensePlate,
            'ค่าแรง': r.repairCost,
            'ค่าอะไหล่': (r.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0),
            'รวมสุทธิ': calculateTotalCost(r)
        }));
        exportToCSV('Maintenance_Intelligence_Export', exportData);
    };

    const data = useMemo(() => {
        const safeAllRepairs = Array.isArray(repairs) ? repairs : [];
        const safePOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];
        const safeAnnualPlans = Array.isArray(annualPlans) ? annualPlans : [];

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        const dateFilteredCreatedRepairs = safeAllRepairs.filter(r => {
            const repairDate = new Date(r.createdAt);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        const dateFilteredCompletedRepairs = safeAllRepairs.filter(r => {
            if (r.status !== 'ซ่อมเสร็จ' || !r.repairEndDate) return false;
            const repairDate = new Date(r.repairEndDate);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        const dateFilteredPOs = safePOs.filter(po => {
            if (po.status === 'Cancelled' || po.status === 'Draft') return false;
            const poDate = new Date(po.orderDate);
            return (!start || poDate >= start) && (!end || poDate <= end);
        });

        // --- Supplier Analysis ---
        const supplierPurchaseOverTime: Record<string, number> = {};
        dateFilteredPOs.forEach(po => {
            const date = new Date(po.orderDate);
            let key = '';
            if (supplierViewMode === 'daily') key = date.toISOString().split('T')[0];
            else if (supplierViewMode === 'weekly') key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
            else if (supplierViewMode === 'monthly') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            else if (supplierViewMode === 'yearly') key = `${date.getFullYear()}`;
            supplierPurchaseOverTime[key] = (supplierPurchaseOverTime[key] || 0) + (po.totalAmount || 0);
        });

        const formattedSupplierTrendData = Object.entries(supplierPurchaseOverTime)
            .map(([key, value]) => ({ name: key, value }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // --- PM Analysis ---
        const pmStatusCounts = { planned: 0, completed: 0, completed_unplanned: 0 };
        safeAnnualPlans.forEach(plan => {
            Object.entries(plan.months || {}).forEach(([monthIndex, status]) => {
                const planDate = new Date(plan.year, parseInt(monthIndex), 1);
                if ((!start || planDate >= start) && (!end || planDate <= end)) {
                    if (status === 'planned') pmStatusCounts.planned++;
                    else if (status === 'completed') pmStatusCounts.completed++;
                    else if (status === 'completed_unplanned') pmStatusCounts.completed_unplanned++;
                }
            });
        });
        const pmPlanStatusData = [
            { name: 'ตามแผน (Planned)', value: pmStatusCounts.planned },
            { name: 'เสร็จสิ้น (Completed)', value: pmStatusCounts.completed },
            { name: 'นอกแผน (Unplanned)', value: pmStatusCounts.completed_unplanned },
        ].filter(d => d.value > 0);

        // --- Cost Forecasting ---
        const monthlyExpenses: Record<string, number> = {};
        dateFilteredCompletedRepairs.forEach(r => {
            const date = new Date(r.repairEndDate!);
            const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            monthlyExpenses[key] = (monthlyExpenses[key] || 0) + calculateTotalCost(r);
        });
        const lastSixMonthsExpenses = Object.keys(monthlyExpenses).sort().map(k => ({ name: k, value: monthlyExpenses[k] }));

        const totalCost = dateFilteredCompletedRepairs.reduce((sum, r) => sum + calculateTotalCost(r), 0);
        const avgCost = dateFilteredCompletedRepairs.length > 0 ? totalCost / dateFilteredCompletedRepairs.length : 0;
        const forecastedNextMonthCost = avgCost * 1.05; // Simple heuristic

        // --- Repair Trend ---
        const repairsByDay = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            const date = new Date(r.repairEndDate!).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const repairTrendData = Object.entries(repairsByDay)
            .map(([date, count]) => ({ date: date.split('-').slice(1).join('/'), count }))
            .sort((a, b) => a.date.localeCompare(b.date)).slice(-15);

        // --- Vehicle Type Analysis ---
        const repairsByVehicleType = dateFilteredCompletedRepairs.reduce((acc: Record<string, { count: number; totalCost: number }>, r) => {
            const type = r.vehicleType || 'Unknown';
            if (!acc[type]) acc[type] = { count: 0, totalCost: 0 };
            acc[type].count += 1;
            acc[type].totalCost += calculateTotalCost(r);
            return acc;
        }, {} as Record<string, { count: number; totalCost: number }>);
        const vehicleTypeAnalysisData = Object.entries(repairsByVehicleType)
            .map(([name, d]) => ({ name, count: d.count, avgCost: d.totalCost / d.count }))
            .sort((a, b) => b.count - a.count);

        const repairCategories = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRepairCategories = Object.entries(repairCategories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        return {
            stats: { totalRepairs: dateFilteredCreatedRepairs.length, totalCompleted: dateFilteredCompletedRepairs.length, totalCost, avgCost, forecastedNextMonthCost },
            charts: { repairTrendData, lastSixMonthsExpenses, formattedSupplierTrendData, pmPlanStatusData, vehicleTypeAnalysisData, topRepairCategories }
        };
    }, [repairs, startDate, endDate, purchaseOrders, supplierViewMode, annualPlans]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    const PM_COLORS = ['#fbbf24', '#10b981', '#3b82f6'];

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Intelligent Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 leading-none">
                        Analytics Hub
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-glow"></span>
                        ระบบวิเคราะห์ข้อมูลกองรถเชิงกลยุทธ์ (Strategic Fleet Intelligence)
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 mt-12 lg:mt-0 relative z-10 w-full lg:w-auto">
                    <div className="flex items-center gap-5 bg-white/60 backdrop-blur-xl px-8 py-4 rounded-[2.5rem] border border-white shadow-2xl">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ช่วงเวลาที่ตรวจสอบ (Observation Window)</span>
                            <div className="flex items-center gap-4">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} title="Start Date" className="bg-transparent text-xs font-black text-slate-700 outline-none hover:text-blue-600 transition-colors" />
                                <span className="text-slate-300 font-black">→</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} title="End Date" className="bg-transparent text-xs font-black text-slate-700 outline-none hover:text-blue-600 transition-colors" />
                            </div>
                        </div>
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-4 px-12 py-6 bg-slate-950 text-white font-black rounded-[2.5rem] shadow-3xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:scale-95 group relative overflow-hidden">
                        <Download size={24} className="group-hover:animate-bounce" />
                        <span className="tracking-[0.2em] text-[11px]">ส่งออกข้อมูลวิเคราะห์ (EXPORT INTEL)</span>
                    </button>
                </div>
            </div>

            {/* Master Intelligence Grid */}
            <div className="bento-grid h-auto lg:h-auto gap-10">
                {/* Executive Indicators */}
                <ModernStatCard delay="delay-100" theme="blue" title="จำนวนงานซ่อมรวม" value={data.stats.totalRepairs.toLocaleString()} subtext="Active Throughput" icon={<TrendingUp size={150} />} />
                <ModernStatCard delay="delay-150" theme="green" title="ดัชนีประสิทธิภาพ" value={`${((data.stats.totalCompleted / data.stats.totalRepairs) * 100 || 0).toFixed(1)}%`} subtext="Efficiency Index" icon={<Award size={150} />} />
                <ModernStatCard delay="delay-200" theme="orange" title="ยอดใช้จ่ายสะสม" value={`฿${formatCurrency(data.stats.totalCost)}`} subtext="Financial Burn" icon={<DollarSign size={150} />} />
                <ModernStatCard delay="delay-250" theme="purple" title="ต้นทุนเฉลี่ยต่องาน" value={`฿${formatCurrency(data.stats.avgCost)}`} subtext="Cycle Efficiency" icon={<Activity size={150} />} />

                {/* AI Predictive Insight */}
                <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-3xl relative overflow-hidden group animate-scale-in delay-300 border border-white/5 col-span-1">
                    <div className="absolute -right-16 -top-16 opacity-40 transform group-hover:scale-125 transition-transform duration-1000 rotate-12">
                        <div className="w-64 h-64 bg-blue-600 rounded-full blur-[110px]"></div>
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <span className="p-1 px-5 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-lg shadow-blue-500/40 border border-blue-400/30">AI พยากรณ์</span>
                            </div>
                            <h4 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-3">ประมาณการณ์ค่าใช้จ่าย 30 วัน</h4>
                            <h3 className="text-4xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
                                ฿{formatCurrency(data.stats.forecastedNextMonthCost)}
                            </h3>
                        </div>
                        <p className="mt-12 text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
                            Neural-Backtested Projection (พยากรณ์ล่วงหน้า)
                        </p>
                    </div>
                </div>

                {/* Performance Visualizations */}
                <Card title="แนวโน้มจำนวนงานซ่อม (Traffic Dynamics)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-400">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.repairTrendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" fontSize={10} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip unit="งาน" />} />
                            <Area type="monotone" dataKey="count" name="งานเสร็จ" stroke="#8b5cf6" strokeWidth={6} fill="url(#colorTrend)" animationDuration={3000} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ดัชนีค่าใช้จ่ายสะสม (Financial Indices)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.lastSixMonthsExpenses} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} />
                            <Tooltip content={<CustomTooltip unit="บาท" />} />
                            <Bar dataKey="value" name="ยอดใช้จ่าย" fill="#3b82f6" radius={[15, 15, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Tactical Procurement */}
                <Card title="วิเคราะห์การสั่งซื้อผู้จำหน่าย (Supplier Intel)" className="col-span-1 lg:col-span-2 min-h-[600px]" delay="delay-600">
                    <div className="flex justify-start mb-12 gap-3 bg-slate-50 p-2 rounded-[2rem] w-fit border border-slate-100 shadow-inner">
                        {[
                            { id: 'daily', label: 'รายวัน' },
                            { id: 'weekly', label: 'สัปดาห์' },
                            { id: 'monthly', label: 'รายเดือน' },
                            { id: 'yearly', label: 'รายปี' }
                        ].map(mode => (
                            <button key={mode.id} onClick={() => setSupplierViewMode(mode.id as any)} className={`px-6 py-3 text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] transition-all ${supplierViewMode === mode.id ? 'bg-white text-blue-600 shadow-2xl scale-110 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <ResponsiveContainer width="100%" height="75%">
                        <ComposedChart data={data.charts.formattedSupplierTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={9} fontWeight="900" stroke="#94a3b8" axisLine={false} tickLine={false} />
                            <YAxis fontSize={9} fontWeight="900" stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} />
                            <Tooltip content={<CustomTooltip unit="บาท" />} />
                            <Bar dataKey="value" name="ยอดซื้อ" fill="#3b82f6" radius={10} barSize={30} />
                            <Line type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={4} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="กลุ่มงานซ่อมยอดนิยม (High-Volume)" className="min-h-[500px]" delay="delay-700">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.charts.topRepairCategories} margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" fontSize={10} fontStyle="bold" fontWeight="900" stroke="#64748b" axisLine={false} tickLine={false} width={100} />
                            <Tooltip content={<CustomTooltip unit="งาน" />} />
                            <Bar dataKey="value" name="งาน" fill="#10b981" radius={[0, 8, 8, 0]} barSize={25} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ความสมบูรณ์แผน PM (Compliance)" className="min-h-[500px]" delay="delay-800">
                    <div className="h-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 10 }}>
                                <Pie
                                    data={data.charts.pmPlanStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={12}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.charts.pmPlanStatusData.map((_, i) => <Cell key={i} fill={PM_COLORS[i % PM_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip unit="รายการ" />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={40}
                                    iconType="circle"
                                    formatter={(value, entry: any) => (
                                        <span className="text-slate-600 font-bold">
                                            {value}: <span className="text-slate-900 font-black ml-1">{entry.payload.value}</span>
                                        </span>
                                    )}
                                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }}
                                />
                                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize="36" fontWeight="900" fill="#0f172a">
                                    {data.charts.pmPlanStatusData.reduce((s, d) => s + d.value, 0)}
                                </text>
                                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="900" fill="#94a3b8" className="uppercase tracking-[0.2em]">
                                    รายการรวม (Total)
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="วิเคราะห์ประสิทธิภาพรายกลุ่ม (Segment Grid)" className="col-span-1 lg:col-span-3 min-h-[500px]" delay="delay-900">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.charts.vehicleTypeAnalysisData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="black" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" fontSize={10} fontWeight="bold" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" fontSize={10} fontWeight="bold" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar yAxisId="left" dataKey="count" name="Freq." fill="#6366f1" radius={[10, 10, 0, 0]} barSize={45} />
                            <Line yAxisId="right" type="stepAfter" dataKey="avgCost" name="Avg Cost" stroke="#f43f5e" strokeWidth={5} dot={{ r: 8, fill: '#f43f5e', stroke: '#fff', strokeWidth: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
