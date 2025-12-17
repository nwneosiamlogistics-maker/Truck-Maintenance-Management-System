
import React, { useState, useMemo } from 'react';
import type { Repair, StockItem, Technician } from '../types';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Line, ComposedChart
} from 'recharts';

// --- Styled Components ---

const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
            break;
        case 'purple':
            gradient = 'from-purple-500 to-pink-500';
            iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
            break;
        case 'orange':
            gradient = 'from-orange-500 to-red-500';
            iconPath = 'M13 10V3L4 14h7v7l9-11h-7z';
            break;
        default: // gray/indigo default
            gradient = 'from-slate-700 to-slate-800';
            iconPath = 'M4 6h16M4 10h16M4 14h16M4 18h16';
    }

    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg hover:transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center`}>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d={iconPath} /></svg>
            </div>
            <p className="text-white/90 font-medium mb-1 relative z-10">{title}</p>
            <h3 className="text-3xl font-extrabold relative z-10">{value}</h3>
            {subtext && <p className="text-sm mt-2 opacity-80 relative z-10">{subtext}</p>}
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: React.ReactNode }> = ({ title, children, className = '', icon }) => (
    <div className={`bg-white rounded-3xl shadow-sm p-6 border border-slate-100 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full inline-block shadow-sm"></span>
            {icon && <span className="text-blue-500">{icon}</span>}
            {title}
        </h3>
        {children}
    </div>
);

// --- Custom Recharts Components ---

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl z-50">
                <p className="font-bold text-slate-700 mb-1 text-sm border-b border-gray-100 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }} className="text-xs font-semibold mt-1">
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

const Reports: React.FC<{ repairs: Repair[], stock: StockItem[], technicians: Technician[], purchaseOrders?: import('../types').PurchaseOrder[], suppliers?: import('../types').Supplier[] }> = ({ repairs, stock, technicians, purchaseOrders = [], suppliers = [] }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supplierViewMode, setSupplierViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

    const data = useMemo(() => {
        const safeAllRepairs = Array.isArray(repairs) ? repairs : [];
        const safeStock = Array.isArray(stock) ? stock : [];
        const safePOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        // Filter Repairs
        const dateFilteredCreatedRepairs = safeAllRepairs.filter(r => {
            const repairDate = new Date(r.createdAt);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        const dateFilteredCompletedRepairs = safeAllRepairs.filter(r => {
            if (r.status !== 'ซ่อมเสร็จ' || !r.repairEndDate) return false;
            const repairDate = new Date(r.repairEndDate);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        // Filter Purchase Orders
        const dateFilteredPOs = safePOs.filter(po => {
            if (po.status === 'Cancelled' || po.status === 'Draft') return false;
            const poDate = new Date(po.orderDate);
            return (!start || poDate >= start) && (!end || poDate <= end);
        });


        // --- Supplier Stats Logic ---
        const supplierPurchaseOverTime: Record<string, number> = {};
        dateFilteredPOs.forEach(po => {
            const date = new Date(po.orderDate);
            let key = '';
            if (supplierViewMode === 'daily') key = date.toISOString().split('T')[0];
            else if (supplierViewMode === 'weekly') key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
            else if (supplierViewMode === 'monthly') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            else if (supplierViewMode === 'yearly') key = `${date.getFullYear()}`;
            supplierPurchaseOverTime[key] = (supplierPurchaseOverTime[key] || 0) + po.totalAmount;
        });

        const supplierTrendData = Object.entries(supplierPurchaseOverTime)
            .map(([key, value]) => ({ label: key, value }))
            .sort((a, b) => a.label.localeCompare(b.label));

        const formattedSupplierTrendData = supplierTrendData.map(d => {
            let label = d.label;
            if (supplierViewMode === 'monthly') {
                const [y, m] = d.label.split('-');
                const date = new Date(Number(y), Number(m) - 1);
                label = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            } else if (supplierViewMode === 'daily') {
                const date = new Date(d.label);
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }
            return { name: label, value: d.value };
        });

        const supplierStats = dateFilteredPOs.reduce((acc: Record<string, number>, po) => {
            acc[po.supplierName] = (acc[po.supplierName] || 0) + po.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        const topSuppliers = Object.entries(supplierStats)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        // --- Stat Cards ---
        const totalRepairs = dateFilteredCreatedRepairs.length;
        const totalCompleted = dateFilteredCompletedRepairs.length;
        const totalCost = dateFilteredCompletedRepairs.reduce((sum, r) => sum + calculateTotalCost(r), 0);
        const avgCost = totalCompleted > 0 ? totalCost / totalCompleted : 0;

        // --- Charts ---
        const commonCategories = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRepairCategories = Object.entries(commonCategories)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const repairedVehicles = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRepairedVehicles = Object.entries(repairedVehicles)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const dispatchStats = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.dispatchType] = (acc[r.dispatchType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const dispatchData = Object.entries(dispatchStats).map(([name, value]) => ({ name, value: value as number }));

        const repairsByDay = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            const date = new Date(r.repairEndDate!).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const repairTrendData = Object.entries(repairsByDay)
            .map(([date, count]) => ({
                date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                count: count as number,
                timestamp: new Date(date).getTime()
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const partUsage = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            (r.parts || []).forEach(p => {
                const category = stock.find(s => s.id === p.partId)?.category || 'อื่นๆ';
                acc[category] = (acc[category] || 0) + p.quantity;
            });
            return acc;
        }, {} as Record<string, number>);
        const partUsageData = Object.entries(partUsage)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const monthlyExpenses: Record<string, { value: number, label: string }> = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        safeAllRepairs.filter(r => new Date(r.createdAt) >= sixMonthsAgo && r.status === 'ซ่อมเสร็จ').forEach(r => {
            const date = new Date(r.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            const label = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            if (!monthlyExpenses[key]) monthlyExpenses[key] = { value: 0, label: label };
            monthlyExpenses[key].value = (monthlyExpenses[key].value || 0) + calculateTotalCost(r);
        });
        const lastSixMonthsExpenses = Object.keys(monthlyExpenses).sort().map(key => ({ name: monthlyExpenses[key].label, value: monthlyExpenses[key].value }));

        const repairsByVehicleType = dateFilteredCompletedRepairs.reduce((acc: Record<string, { count: number; totalCost: number }>, r) => {
            const type = r.vehicleType || 'ไม่ระบุ';
            if (!acc[type]) acc[type] = { count: 0, totalCost: 0 };
            acc[type].count += 1;
            acc[type].totalCost += calculateTotalCost(r);
            return acc;
        }, {} as Record<string, { count: number; totalCost: number }>);

        const vehicleTypeAnalysisData = Object.entries(repairsByVehicleType)
            .map(([label, data]: [string, { count: number; totalCost: number }]) => ({
                name: label,
                count: data.count,
                avgCost: data.count > 0 ? data.totalCost / data.count : 0,
            }))
            .sort((a, b) => b.count - a.count).slice(0, 7);

        return {
            stats: { totalRepairs, totalCompleted, totalCost, avgCost },
            charts: {
                topRepairCategories,
                topRepairedVehicles,
                dispatchData,
                repairTrendData,
                partUsageData,
                lastSixMonthsExpenses,
                vehicleTypeAnalysisData,
                formattedSupplierTrendData,
                topSuppliers,
            }
        };
    }, [repairs, stock, startDate, endDate, purchaseOrders, supplierViewMode]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        รายงานและสถิติ (Reports & Statistics)
                    </h2>
                    <p className="text-gray-500 mt-1">ภาพรวมสถิติการซ่อมบำรุงและค่าใช้จ่ายแบบเจาะลึก</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0 bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-inner">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Range:</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard theme="blue" title="งานซ่อมทั้งหมด" value={data.stats.totalRepairs.toLocaleString()} subtext="งาน" />
                <ModernStatCard theme="green" title="งานซ่อมที่เสร็จสิ้น" value={data.stats.totalCompleted.toLocaleString()} subtext="งาน" />
                <ModernStatCard theme="orange" title="ค่าใช้จ่ายรวม" value={`${formatCurrency(data.stats.totalCost)}`} subtext="บาท" />
                <ModernStatCard theme="purple" title="ค่าซ่อมเฉลี่ย" value={`${formatCurrency(data.stats.avgCost)}`} subtext="บาท/งาน" />
            </div>

            {/* Supplier Purchase Analysis Section */}
            <Card title="วิเคราะห์ยอดการสั่งซื้อ (ผู้จำหน่าย)" className="border-t-4 border-t-blue-500 h-[500px]">
                <div className="flex justify-end mb-4 gap-2">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setSupplierViewMode(mode)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${supplierViewMode === mode
                                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            {mode === 'daily' ? 'รายวัน' : mode === 'weekly' ? 'รายสัปดาห์' : mode === 'monthly' ? 'รายเดือน' : 'รายปี'}
                        </button>
                    ))}
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.charts.formattedSupplierTrendData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()} />
                        <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" name="ยอดซื้อ" fill="url(#colorValue)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="5 อันดับผู้จำหน่ายที่มียอดซื้อสูงสุด (บาท)" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.charts.topSuppliers} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="ยอดซื้อ" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.charts.topSuppliers.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][index % 5]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ประเภทการซ่อมที่พบบ่อย" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.charts.topRepairCategories} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="งาน" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="จำนวนงาน" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="5 อันดับรถที่ซ่อมบ่อยที่สุด" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.charts.topRepairedVehicles} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="ครั้ง" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="จำนวนครั้ง" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="สถิติการส่งซ่อม (ภายใน/ภายนอก)" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.charts.dispatchData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.charts.dispatchData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip unit="งาน" />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-10" fontSize="24" fontWeight="bold" fill="#334155">{data.stats.totalCompleted}</tspan>
                                <tspan x="50%" dy="25" fontSize="14" fill="#94a3b8">งานเสร็จสิ้น</tspan>
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="สัดส่วนการใช้อะไหล่ (5 อันดับแรก)" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.charts.partUsageData}
                                cx="50%"
                                cy="40%"
                                innerRadius={60}
                                outerRadius={90}
                                fill="#8884d8"
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.charts.partUsageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip unit="ชิ้น" />} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ประสิทธิภาพการซ่อม (แนวโน้มงานซ่อมที่เสร็จสิ้น)" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.repairTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip unit="งาน" />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            <Area type="monotone" dataKey="count" name="งานเสร็จสิ้น" stroke="#10b981" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="สรุปค่าใช้จ่ายรายเดือน (6 เดือนล่าสุด)" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.lastSixMonthsExpenses}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()} />
                            <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="ค่าใช้จ่าย" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="วิเคราะห์การซ่อมตามประเภทรถ" className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.charts.vehicleTypeAnalysisData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} label={{ value: 'ครั้ง', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
                            <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} label={{ value: 'บาท', angle: 90, position: 'insideRight', style: { fill: '#94a3b8' } }} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar yAxisId="left" dataKey="count" name="จำนวนครั้ง" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            <Line yAxisId="right" type="monotone" dataKey="avgCost" name="ค่าซ่อมเฉลี่ย" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
