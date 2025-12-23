import React, { useState, useMemo } from 'react';
import type { Repair, Technician, EstimationAttempt } from '../types';
import { formatHoursToHHMM, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';
import { Users, Zap, CheckCircle, DollarSign, Award, Target, TrendingUp, Clock } from 'lucide-react';

interface TechnicianPerformanceProps {
    repairs: Repair[];
    technicians: Technician[];
}

type SortKey = 'name' | 'jobs' | 'avgTime' | 'onTimeRate' | 'value';
type SortOrder = 'asc' | 'desc';
type DateRange = 'all' | '7d' | '30d' | 'this_month' | 'last_month';

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

const TechnicianPerformance: React.FC<TechnicianPerformanceProps> = ({ repairs, technicians }) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [sortBy, setSortBy] = useState<SortKey>('jobs');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const performanceData = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const filteredRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => {
            if (r.status !== 'ซ่อมเสร็จ' || !r.repairEndDate) return false;
            const endDate = new Date(r.repairEndDate);
            switch (dateRange) {
                case '7d': return endDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                case '30d': return endDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                case 'this_month': return endDate >= startOfMonth;
                case 'last_month': return endDate >= startOfLastMonth && endDate <= endOfLastMonth;
                case 'all': default: return true;
            }
        });

        const techStats = (Array.isArray(technicians) ? technicians : []).map(tech => {
            const techRepairs = filteredRepairs.filter(r => r.assignedTechnicianId === tech.id || (r.assistantTechnicianIds || []).includes(tech.id));
            if (techRepairs.length === 0) return null;

            let totalRepairMillis = 0;
            let onTimeJobs = 0;
            let estimatedJobsCount = 0;

            techRepairs.forEach(r => {
                if (r.repairStartDate && r.repairEndDate) {
                    totalRepairMillis += new Date(r.repairEndDate).getTime() - new Date(r.repairStartDate).getTime();
                }

                let finalEstimation = (r.estimations || []).find(e => e.status === 'Completed');
                if (!finalEstimation && r.estimations && r.estimations.length > 0) {
                    finalEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
                }

                if (finalEstimation && r.repairEndDate) {
                    estimatedJobsCount++;
                    if (new Date(r.repairEndDate) <= new Date(finalEstimation.estimatedEndDate)) {
                        onTimeJobs++;
                    }
                }
            });

            const totalValue = techRepairs.reduce((sum, r) => {
                const partsCost = (r.parts || []).reduce((ps, p) => ps + (Number(p.quantity) * Number(p.unitPrice)), 0);
                return sum + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
            }, 0);

            return {
                id: tech.id,
                name: tech.name,
                jobs: techRepairs.length,
                avgTime: techRepairs.length > 0 ? (totalRepairMillis / techRepairs.length) / (1000 * 60 * 60) : 0,
                onTimeRate: estimatedJobsCount > 0 ? (onTimeJobs / estimatedJobsCount) * 100 : 0,
                value: totalValue
            };
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        techStats.sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        const totalJobs = techStats.reduce((sum, t) => sum + t.jobs, 0);
        const totalValue = filteredRepairs.reduce((sum, r) => {
            const partsCost = (r.parts || []).reduce((p, item) => p + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
            return sum + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        }, 0);
        const avgOnTime = techStats.length > 0 ? techStats.reduce((sum, t) => sum + t.onTimeRate, 0) / techStats.length : 0;

        return { stats: techStats, kpis: { totalJobs, totalValue, avgOnTime } };
    }, [repairs, technicians, dateRange, sortBy, sortOrder]);

    const handleSort = (key: SortKey) => {
        if (sortBy === key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortOrder('desc'); }
    };

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 leading-none">
                        Technician Intel
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-glow"></span>
                        ประสิทธิภาพและประสิทธิผลรายบุคคล (Personnel Performance Hub)
                    </p>
                </div>
                <div className="flex items-center gap-6 mt-12 lg:mt-0 relative z-10">
                    <div className="bg-white/60 backdrop-blur-xl px-8 py-4 rounded-[2.5rem] border border-white shadow-2xl flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-center">วิเคราะห์ช่วงเวลา (Timeline)</span>
                        <select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value as any)}
                            title="เลือกช่วงเวลา"
                            className="bg-transparent text-xs font-black text-slate-700 outline-none hover:text-blue-600 transition-colors"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bento-grid h-auto lg:h-auto gap-10">
                <ModernStatCard delay="delay-100" theme="blue" title="งานเสร็จสิ้นรวม" value={`${performanceData.kpis.totalJobs} งาน`} subtext="Completed Tasks" icon={<CheckCircle size={150} />} />
                <ModernStatCard delay="delay-200" theme="green" title="อัตราตรงเวลา" value={`${performanceData.kpis.avgOnTime.toFixed(1)}%`} subtext="On-Time Delivery" icon={<Zap size={150} />} />
                <ModernStatCard delay="delay-300" theme="purple" title="มูลค่าผลงานรวม" value={`${formatCurrency(performanceData.kpis.totalValue)}`} subtext="Economic Value (฿)" icon={<DollarSign size={150} />} />

                {/* Individual Progress AI Insight */}
                <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-3xl animate-scale-in delay-400 border border-white/5 col-span-1">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <span className="p-1 px-5 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-lg shadow-blue-500/40 border border-blue-400/30">Personnel Analysis</span>
                            </div>
                            <h4 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-3">บุคลากรที่แอคทีฟ</h4>
                            <h3 className="text-4xl font-black mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
                                {performanceData.stats.length} ท่าน
                            </h3>
                        </div>
                        <p className="mt-12 text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60 text-right">
                            Core Human Capital Metrics
                        </p>
                    </div>
                </div>

                {/* Performance Charts */}
                <Card title="อันดับปริมาณงาน (Volume Leaders)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData.stats.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: '900', fill: '#475569' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="งาน" />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="jobs" name="จำนวนงาน" radius={[0, 10, 10, 0]} barSize={25}>
                                {performanceData.stats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="ดัชนีคุณค่าผลงาน (Economic Impact)" className="col-span-1 min-h-[500px]" delay="delay-600">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={performanceData.stats.slice(0, 5)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value" nameKey="name">
                                {performanceData.stats.slice(0, 5).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip unit="บาท" />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                {/* Detailed Leaderboard Table */}
                <Card title="สมุดพกประสิทธิภาพ (Strategic Scoreboard)" className="col-span-1 lg:col-span-3 min-h-[600px]" delay="delay-700">
                    <div className="overflow-x-auto custom-scrollbar h-full">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="py-6 px-4 cursor-pointer hover:text-blue-600 group" onClick={() => handleSort('name')}>
                                        ชื่อช่าง {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="py-6 px-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('jobs')}>
                                        จำนวนงาน {sortBy === 'jobs' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="py-6 px-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('avgTime')}>
                                        เวลาเฉลี่ย {sortBy === 'avgTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="py-6 px-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('onTimeRate')}>
                                        ตรงเวลา {sortBy === 'onTimeRate' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="py-6 px-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('value')}>
                                        มูลค่าผลงาน {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {performanceData.stats.map((tech) => (
                                    <tr key={tech.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                    {tech.name.substring(0, 1)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-sm">{tech.name}</span>
                                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Specialist</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-center">
                                            <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-xs border border-blue-100 shadow-sm">
                                                {tech.jobs} งาน
                                            </span>
                                        </td>
                                        <td className="py-6 px-4 text-center text-[11px] font-black text-slate-600">
                                            {formatHoursToHHMM(tech.avgTime)}
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <svg width="100%" height="100%" className="block">
                                                        <rect
                                                            className={`transition-all duration-1000 ${tech.onTimeRate >= 80 ? 'fill-emerald-500' : tech.onTimeRate >= 50 ? 'fill-amber-500' : 'fill-rose-500'}`}
                                                            width={`${tech.onTimeRate}%`}
                                                            height="100%"
                                                            rx="999"
                                                        />
                                                    </svg>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500">{tech.onTimeRate.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-right">
                                            <span className="font-black text-slate-800 text-sm">{formatCurrency(tech.value)} บาท</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TechnicianPerformance;
