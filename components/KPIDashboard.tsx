import React, { useMemo } from 'react';
import type { Repair, Vehicle } from '../types';
import { formatHoursToHHMM, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell, ComposedChart, Line, Area, AreaChart
} from 'recharts';

interface KPIDashboardProps {
    repairs: Repair[];
    vehicles: Vehicle[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

// --- Styled Components ---

const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Money
            break;
        case 'orange':
            gradient = 'from-orange-500 to-red-500';
            iconPath = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'; // Alert
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

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white rounded-3xl shadow-sm p-6 border border-slate-100 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full inline-block shadow-sm"></span>
            {title}
        </h3>
        {children}
    </div>
);

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

const KPIDashboard: React.FC<KPIDashboardProps> = ({ repairs, vehicles }) => {
    const kpiData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : []).filter(
            r => r.status === 'ซ่อมเสร็จ' && r.repairStartDate && r.repairEndDate && r.createdAt
        );

        // --- Core KPI Calculations ---
        const totalRepairTime = completedRepairs.reduce((acc, r) => acc + (new Date(r.repairEndDate!).getTime() - new Date(r.repairStartDate!).getTime()), 0);
        const mttrHours = completedRepairs.length > 0 ? totalRepairTime / completedRepairs.length / (1000 * 60 * 60) : 0;

        const totalDowntime = completedRepairs.reduce((acc, r) => acc + (new Date(r.repairEndDate!).getTime() - new Date(r.createdAt).getTime()), 0);
        const avgDowntimeHours = completedRepairs.length > 0 ? totalDowntime / completedRepairs.length / (1000 * 60 * 60) : 0;

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
                const downtime = Number(new Date(r.repairEndDate).getTime()) - Number(new Date(r.createdAt).getTime());
                downtimeByVehicle[r.licensePlate] = (downtimeByVehicle[r.licensePlate] || 0) + downtime;
            }
        });
        const vehicleDowntime = Object.entries(downtimeByVehicle)
            .map(([plate, totalMillis]: [string, number]) => ({ name: plate, value: Number((totalMillis / (1000 * 60 * 60)).toFixed(1)) }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const repairsByVehicle = allRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const mostRepairedVehicles = Object.entries(repairsByVehicle)
            .map(([plate, count]: [string, number]) => ({ name: plate, value: count }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

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
            .map(([plate, totalCost]: [string, number]) => ({ name: plate, value: totalCost }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        return {
            mttr: mttrHours, avgDowntime: avgDowntimeHours, avgCost,
            vehicleDowntime, mostRepairedVehicles, mostExpensiveVehicles,
        };
    }, [repairs, vehicles]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600">
                        ภาพรวม KPI การซ่อม (Repair KPI Overview)
                    </h2>
                    <p className="text-gray-500 mt-1">ตัวชี้วัดประสิทธิภาพงานซ่อมบำรุง</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ModernStatCard
                    title="MTTR (เวลาซ่อมเฉลี่ย)"
                    value={formatHoursToHHMM(kpiData.mttr)}
                    theme="blue"
                    subtext="เป้าหมาย: < 24:00"
                />
                <ModernStatCard
                    title="Downtime เฉลี่ย"
                    value={formatHoursToHHMM(kpiData.avgDowntime)}
                    theme="orange"
                    subtext="เวลาที่รถจอดรอซ่อม"
                />
                <ModernStatCard
                    title="ค่าซ่อมเฉลี่ย"
                    value={`${kpiData.avgCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
                    theme="green"
                    subtext="บาท ต่อใบแจ้งซ่อม"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="5 อันดับรถที่เข้าซ่อมบ่อยที่สุด">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kpiData.mostRepairedVehicles} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="ครั้ง" />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" name="จำนวนครั้ง" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                                    {kpiData.mostRepairedVehicles.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="5 อันดับรถที่มีค่าใช้จ่ายซ่อมสูงสุด">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kpiData.mostExpensiveVehicles} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" name="ค่าใช้จ่าย" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20}>
                                    {kpiData.mostExpensiveVehicles.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="5 อันดับรถที่ใช้เวลาจอดซ่อม (Downtime) นานที่สุด">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kpiData.vehicleDowntime} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="ชม." />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" name="ชม." fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20}>
                                    {kpiData.vehicleDowntime.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default KPIDashboard;
