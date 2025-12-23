import React, { useMemo } from 'react';
import type { Repair, Vehicle } from '../types';
import { formatHoursToHHMM, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell
} from 'recharts';
import { TrendingUp, Clock, DollarSign, Activity, AlertCircle, Award } from 'lucide-react';

interface KPIDashboardProps {
    repairs: Repair[];
    vehicles: Vehicle[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'];

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
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-10 rounded-[3.5rem] text-white shadow-2xl animate-scale-in ${delay} group hover:scale-[1.02] transition-all duration-700`}>
            <div className="absolute -right-10 -bottom-10 opacity-20 transform group-hover:scale-110 transition-transform duration-700">
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70 mb-4">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-5xl font-black tracking-tighter">{value}</h3>
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

const KPIDashboard: React.FC<KPIDashboardProps> = ({ repairs, vehicles }) => {
    const kpiData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : []).filter(
            r => r.status === 'ซ่อมเสร็จ' && r.repairStartDate && r.repairEndDate && r.createdAt
        );

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
            return acc + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        }, 0);
        const avgCost = completedRepairs.length > 0 ? totalCost / completedRepairs.length : 0;

        const allRepairs = Array.isArray(repairs) ? repairs : [];
        const downtimeByVehicle: Record<string, number> = {};
        allRepairs.forEach(r => {
            if (r.repairEndDate && r.createdAt) {
                const downtime = Number(new Date(r.repairEndDate).getTime()) - Number(new Date(r.createdAt).getTime());
                downtimeByVehicle[r.licensePlate] = (downtimeByVehicle[r.licensePlate] || 0) + downtime;
            }
        });
        const vehicleDowntime = Object.entries(downtimeByVehicle)
            .map(([plate, totalMillis]) => ({ name: plate, value: Number((totalMillis / (1000 * 60 * 60)).toFixed(1)) }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const repairsByVehicle = allRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const mostRepairedVehicles = Object.entries(repairsByVehicle)
            .map(([plate, count]) => ({ name: plate, value: count }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const costByVehicle = allRepairs.reduce((acc: Record<string, number>, r) => {
            const partsCost = (r.parts || []).reduce((pAcc, p) => pAcc + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
            return acc;
        }, {} as Record<string, number>);
        const mostExpensiveVehicles = Object.entries(costByVehicle)
            .map(([plate, cost]) => ({ name: plate, value: cost }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        // --- Rework Logic ---
        const areProblemsSimilar = (desc1: string, desc2: string): boolean => {
            if (!desc1 || !desc2) return false;
            const normalize = (str: string) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, ' ').split(' ').filter(w => w.length > 2);
            const words1 = new Set(normalize(desc1));
            const words2 = new Set(normalize(desc2));
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            return union.size > 0 && (intersection.size / union.size) > 0.4;
        };

        const reworkList: { plate: string, clusters: { description: string, count: number }[] }[] = [];
        const repairsByVehicleForRework = allRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            if (!acc[r.licensePlate]) acc[r.licensePlate] = [];
            acc[r.licensePlate].push(r);
            return acc;
        }, {});

        Object.entries(repairsByVehicleForRework).forEach(([plate, vehicleRepairs]: [string, any]) => {
            if (vehicleRepairs.length > 1) {
                let remaining = [...vehicleRepairs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const clusters: any[] = [];
                while (remaining.length > 0) {
                    const current = remaining[0];
                    remaining = remaining.slice(1);
                    const group = [current];
                    const nextRemaining: any[] = [];
                    for (const r of remaining) {
                        if (areProblemsSimilar(current.problemDescription, r.problemDescription)) group.push(r);
                        else nextRemaining.push(r);
                    }
                    if (group.length > 1) clusters.push({ description: current.problemDescription, count: group.length });
                    remaining = nextRemaining;
                }
                if (clusters.length > 0) reworkList.push({ plate, clusters });
            }
        });

        return { mttr: mttrHours, avgDowntime: avgDowntimeHours, avgCost, vehicleDowntime, mostRepairedVehicles, mostExpensiveVehicles, reworkList };
    }, [repairs]);

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Premium Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 via-transparent to-emerald-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-teal-900 via-emerald-900 to-green-900 leading-none">
                        KPI Strategic Hub
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-glow"></span>
                        ดัชนีชี้วัดประสิทธิภาพงานซ่อมบำรุง (Maintenance KPI Overview)
                    </p>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="bento-grid h-auto lg:h-auto gap-10">
                <ModernStatCard delay="delay-100" theme="blue" title="MTTR (เวลาซ่อมเฉลี่ย)" value={formatHoursToHHMM(kpiData.mttr)} subtext="Mean Time To Repair" icon={<Clock size={150} />} />
                <ModernStatCard delay="delay-200" theme="orange" title="Downtime เฉลี่ย" value={formatHoursToHHMM(kpiData.avgDowntime)} subtext="Avg. Machine Stop" icon={<Activity size={150} />} />
                <ModernStatCard delay="delay-300" theme="green" title="ค่าซ่อมเฉลี่ย" value={`฿${formatCurrency(kpiData.avgCost)}`} subtext="Avg. Cost Per Order" icon={<DollarSign size={150} />} />

                {/* Rework AI Card */}
                <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-3xl animate-scale-in delay-400 border border-white/5 col-span-1">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <span className="p-1 px-5 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-lg shadow-red-500/40 border border-red-400/30">วิเคราะห์งานซ่อมซ้ำ</span>
                            </div>
                            <h4 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-3">จำนวนเคสที่พบการซ่อมซ้ำ</h4>
                            <h3 className="text-4xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
                                {kpiData.reworkList.length} เคส
                            </h3>
                        </div>
                        <p className="mt-12 text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
                            Maintenance Integrity Check
                        </p>
                    </div>
                </div>

                {/* Charts */}
                <Card title="ความถี่การซ่อมบ่อยที่สุด (Top 5 Repairs)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiData.mostRepairedVehicles} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="ครั้ง" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="จำนวนครั้ง" radius={[0, 10, 10, 0]} barSize={25}>
                                {kpiData.mostRepairedVehicles.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ต้นทุนการซ่อมรุนแรง (Repair Cost Exposure)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-600">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiData.mostExpensiveVehicles} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="ยอดใช้จ่าย" radius={[0, 10, 10, 0]} barSize={25}>
                                {kpiData.mostExpensiveVehicles.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="เวลาหยุดรถวิกฤต (Critical Downtime)" className="col-span-1 min-h-[500px]" delay="delay-700">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiData.vehicleDowntime} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="ชม." />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" name="จำนวนชั่วโมง" radius={[0, 10, 10, 0]} barSize={25}>
                                {kpiData.vehicleDowntime.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Rework Detailed Report */}
                <Card title="รายงานการซ่อมซ้ำ (Rework Logic Breakdown)" className="col-span-1 lg:col-span-3 min-h-[600px]" delay="delay-800">
                    {kpiData.reworkList.length > 0 ? (
                        <div className="overflow-x-auto custom-scrollbar h-full">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-6 px-4">ทะเบียนรถ (License Plate)</th>
                                        <th className="py-6 px-4">อาการที่พบปัญหาเดิม (Recurrent Problem)</th>
                                        <th className="py-6 px-4 text-center">ความถี่ (Freq)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {kpiData.reworkList.flatMap((item, i) =>
                                        item.clusters.map((cluster, ci) => (
                                            <tr key={`${i}-${ci}`} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 px-4 font-black text-slate-900 text-sm">{ci === 0 ? item.plate : ''}</td>
                                                <td className="py-6 px-4 text-slate-600 text-xs font-bold flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                                                    {cluster.description}
                                                </td>
                                                <td className="py-6 px-4 text-center">
                                                    <span className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-black text-xs shadow-sm border border-red-100">
                                                        {cluster.count} ครั้ง
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <Award size={60} className="mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-[11px]">ไม่พบข้อมูลการซ่อมซ้ำ (Excellent Integrity)</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default KPIDashboard;
