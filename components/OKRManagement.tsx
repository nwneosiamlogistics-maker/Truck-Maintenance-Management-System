
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { OKRObjective, OKRMetric, OKRStatus, OKRCategory, Tab } from '../types';
import {
    Target,
    Zap,
    ShieldAlert,
    Star,
    CircleDollarSign,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    BarChart3,
    Calendar,
    LayoutDashboard,
    ShieldCheck,
    TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

const OKRProgressBar: React.FC<{ progress: number; barColorClass: string }> = ({ progress, barColorClass }) => {
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = `${progress}%`;
        }
    }, [progress]);

    return (
        <div className="w-full bg-slate-100 h-2.5 rounded-full mb-10 overflow-hidden shadow-inner">
            <div
                ref={barRef}
                className={`h-full rounded-full transition-all duration-1000 ${barColorClass}`}
            />
        </div>
    );
};

interface OKRManagementProps {
    setActiveTab?: (tab: Tab) => void;
}

const OKRManagement: React.FC<OKRManagementProps> = ({ setActiveTab }) => {
    const [viewMode, setViewMode] = useState<'current' | 'monthly'>('current');

    // Mapped tabs for each metric
    const tabMapping: Record<string, Tab> = {
        'HS3': 'daily-checklist',
        'HS4': 'preventive-maintenance',
        'HS6': 'vehicle-repair-history',
        'HS2': 'incident-log'
    };

    // --- Data Definition based on USER'S OKR 2025 (Perfect Fit only) ---
    const okrData: OKRObjective[] = useMemo(() => [
        {
            id: 'obj-4',
            title: 'พัฒนาศักยภาพบุคลากรและความปลอดภัย (Human / Safety)',
            category: 'Human/Safety',
            progress: 96,
            metrics: [
                {
                    id: 'hs3',
                    code: 'HS3',
                    objective: 'ความพร้อมของรถ (BEWAGON)',
                    detail: 'การสุ่มตรวจหลักฐานภาพถ่าย/คลิปผ่านระบบ Daily Checklist ป้องกันการแจ้งเท็จ 100%',
                    target2025: '100%',
                    targetValue: 100,
                    currentValue: 100,
                    unit: '%',
                    status: 'Completed',
                    category: 'Human/Safety',
                    source: 'Daily Checklist System',
                    lastUpdated: new Date().toISOString(),
                    trend: 'stable',
                    monthlyProgress: [
                        { month: 'ม.ค.', value: 92 },
                        { month: 'ก.พ.', value: 95 },
                        { month: 'มี.ค.', value: 98 },
                        { month: 'เม.ย.', value: 100 },
                        { month: 'พ.ค.', value: 100 }
                    ]
                },
                {
                    id: 'hs4',
                    code: 'HS4',
                    objective: 'ซ่อมบำรุงตามระยะ (PM)',
                    detail: 'ควบคุมเกณฑ์ +/- 2,000 กม. ด้วยระบบแจ้งเตือนอัตโนมัติจากเลขไมล์จริง',
                    target2025: '100%',
                    targetValue: 100,
                    currentValue: 98.4,
                    unit: '%',
                    status: 'On Track',
                    category: 'Human/Safety',
                    source: 'Maintenance Planner',
                    lastUpdated: new Date().toISOString(),
                    trend: 'up',
                    monthlyProgress: [
                        { month: 'ม.ค.', value: 85 },
                        { month: 'ก.พ.', value: 88 },
                        { month: 'มี.ค.', value: 92 },
                        { month: 'เม.ย.', value: 96 },
                        { month: 'พ.ค.', value: 98.4 }
                    ]
                },
                {
                    id: 'hs6',
                    code: 'HS6',
                    objective: 'การซ่อมซ้ำอาการเดิม (Repeated Repairs)',
                    detail: 'วิเคราะห์คุณภาพงานช่างจากประวัติประวัติการซ่อมแยกตามหมวดหมู่',
                    target2025: '< 10 ครั้ง/ปี',
                    targetValue: 10,
                    currentValue: 2,
                    unit: 'ครั้ง',
                    status: 'On Track',
                    category: 'Human/Safety',
                    source: 'Repair History',
                    lastUpdated: new Date().toISOString(),
                    trend: 'stable',
                    monthlyProgress: [
                        { month: 'ม.ค.', value: 4 },
                        { month: 'ก.พ.', value: 3 },
                        { month: 'มี.ค.', value: 5 },
                        { month: 'เม.ย.', value: 2 },
                        { month: 'พ.ค.', value: 2 }
                    ]
                },
                {
                    id: 'hs2',
                    code: 'HS2',
                    objective: 'อุบัติเหตุหยุดงาน (Sever Incident Access)',
                    detail: 'บันทึกสถิติ ความรุนแรง และผลกระทบต่อการทำงานผ่าน Incident Log',
                    target2025: '< 2 ครั้ง/ปี',
                    targetValue: 2,
                    currentValue: 0,
                    unit: 'ครั้ง',
                    status: 'On Track',
                    category: 'Human/Safety',
                    source: 'Incident Log',
                    lastUpdated: new Date().toISOString(),
                    trend: 'stable',
                    monthlyProgress: [
                        { month: 'ม.ค.', value: 0 },
                        { month: 'ก.พ.', value: 1 },
                        { month: 'มี.ค.', value: 0 },
                        { month: 'เม.ย.', value: 0 },
                        { month: 'พ.ค.', value: 0 }
                    ]
                }
            ]
        }
    ], []);

    const stats = useMemo(() => {
        const allMetrics = okrData.flatMap(o => o.metrics);
        return {
            total: allMetrics.length,
            onTrack: allMetrics.filter(m => m.status === 'On Track' || m.status === 'Completed').length,
            atRisk: allMetrics.filter(m => m.status === 'At Risk').length,
            behind: allMetrics.filter(m => m.status === 'Behind').length,
            avgProgress: Math.round(okrData.reduce((acc, obj) => acc + obj.progress, 0) / okrData.length)
        };
    }, [okrData]);

    const getStatusColor = (status: OKRStatus) => {
        switch (status) {
            case 'On Track': return 'bg-emerald-500';
            case 'At Risk': return 'bg-amber-500';
            case 'Behind': return 'bg-rose-500';
            case 'Completed': return 'bg-indigo-500';
            default: return 'bg-slate-500';
        }
    };

    const getCategoryIcon = (category: OKRCategory) => {
        switch (category) {
            case 'Performance': return <Zap className="w-5 h-5" />;
            case 'Satisfaction': return <Star className="w-5 h-5" />;
            case 'Business': return <CircleDollarSign className="w-5 h-5" />;
            case 'Human/Safety': return <ShieldAlert className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* --- Premium Header Section --- */}
            <div className="flex flex-wrap items-center justify-between gap-6 p-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-200">
                        <Target className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">OKR Strategy</h1>
                        <p className="text-slate-500 font-bold mt-1">Truck Maintenance & Operational Excellence Hub</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-2xl flex gap-1 border border-slate-100">
                    <button
                        onClick={() => setViewMode('current')}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${viewMode === 'current' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> สถานะปัจจุบัน
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Calendar className="w-4 h-4" /> สรุปผลรายเดือน
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100 min-w-[140px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total KPIs</span>
                        <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                    </div>
                    <div className="bg-emerald-50 px-6 py-4 rounded-[2rem] border border-emerald-100 min-w-[140px]">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">On Track</span>
                        <span className="text-2xl font-black text-emerald-700">{stats.onTrack}</span>
                    </div>
                    <div className="bg-rose-50 px-6 py-4 rounded-[2rem] border border-rose-100 min-w-[140px]">
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Improvement Need</span>
                        <span className="text-2xl font-black text-rose-700">{stats.atRisk + stats.behind}</span>
                    </div>
                    <div className="bg-blue-600 px-6 py-4 rounded-[2rem] shadow-lg shadow-blue-200 min-w-[140px]">
                        <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest block mb-1">Avg Progress</span>
                        <span className="text-2xl font-black text-white">{stats.avgProgress}%</span>
                    </div>
                </div>
            </div>

            {/* --- Main Objectives Grid --- */}
            <div className="grid grid-cols-1 gap-8">
                {okrData.map((obj, index) => (
                    <div
                        key={obj.id}
                        className={`bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden delay-${(index * 100) % 1100}`}
                    >
                        {/* Background subtle accent */}
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full ${getStatusColor('On Track')}`}></div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-lg ${obj.category === 'Performance' ? 'bg-blue-500' :
                                    obj.category === 'Satisfaction' ? 'bg-amber-500' :
                                        obj.category === 'Business' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}>
                                    {getCategoryIcon(obj.category)}
                                </div>
                                <div>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Core Objective</span>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight mt-1">{obj.title}</h2>
                                </div>
                            </div>
                            <div className="text-left md:text-right bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">SLA Achievement</span>
                                <span className="text-4xl font-black text-slate-900">{obj.progress}%</span>
                            </div>
                        </div>

                        <OKRProgressBar
                            progress={obj.progress}
                            barColorClass={obj.progress > 80 ? 'bg-emerald-500' : obj.progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}
                        />

                        {/* Metrics Table / Charts Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {obj.metrics.map(metric => (
                                <div key={metric.id} className="bg-slate-50/50 hover:bg-white border border-slate-100/50 hover:border-blue-100 rounded-[2.5rem] p-8 transition-all duration-500 group/metric flex flex-col">
                                    <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                                        <div className="flex items-center gap-5 flex-1 min-w-[200px]">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-900 shadow-sm group-hover/metric:border-blue-200 transition-all group-hover/metric:scale-110">
                                                {metric.code}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-[15px] leading-tight">{metric.objective}</h4>
                                                <p className="text-[12px] text-slate-500 mt-1 line-clamp-2 italic font-medium">{metric.detail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-6 bg-white/50 rounded-2xl p-4 border border-slate-100/30">
                                        <div className="flex gap-8">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Target 2025</span>
                                                <span className="text-sm font-black text-blue-600">{metric.target2025}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Actual</span>
                                                <span className="text-sm font-black text-slate-900">{metric.currentValue} {metric.unit}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Status</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-sm ${getStatusColor(metric.status)}`}>
                                                    {metric.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'monthly' && metric.monthlyProgress && (
                                        <div className="h-[200px] w-full mt-auto bg-white rounded-3xl p-6 border border-slate-50 shadow-inner overflow-hidden">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <TrendingUp className="w-3 h-3 text-blue-500" /> Monthly Trend
                                                </span>
                                                <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1">
                                                    <ArrowUpRight className="w-3 h-3" /> +12% from Jan
                                                </span>
                                            </div>
                                            <ResponsiveContainer width="100%" height="80%">
                                                <AreaChart data={metric.monthlyProgress}>
                                                    <defs>
                                                        <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="month"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                                    />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <ChartTooltip
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'black', fontSize: '12px' }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke="#3b82f6"
                                                        strokeWidth={4}
                                                        fillOpacity={1}
                                                        fill={`url(#grad-${metric.id})`}
                                                        dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 7, strokeWidth: 0 }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {viewMode === 'current' && (
                                        <div className="mt-auto space-y-4">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-4">
                                                <span>Data Source: {metric.source}</span>
                                                <span>Last Sync: {new Date(metric.lastUpdated).toLocaleDateString('th-TH')}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const targetTab = tabMapping[metric.code];
                                                    if (targetTab && setActiveTab) {
                                                        setActiveTab(targetTab);
                                                        window.scrollTo(0, 0);
                                                    }
                                                }}
                                                className="w-full py-4 bg-slate-50 group-hover/metric:bg-blue-600 group-hover/metric:text-white rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2"
                                            >
                                                ดูบันทึกและหลักฐานอ้างอิง <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Data Source Integrity Card --- */}
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 opacity-20 blur-[100px] -mr-48 -mt-48"></div>
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="max-w-2xl text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                            <ShieldCheck className="w-10 h-10 text-blue-400" />
                            <h3 className="text-2xl font-black italic uppercase tracking-wider">Data Integrity Assurance</h3>
                        </div>
                        <p className="text-blue-100 font-medium text-lg leading-relaxed">
                            ระบบ OKR Management เชื่อมโยงข้อมูลโดยตรงจาก <span className="text-white font-black underline decoration-blue-500 decoration-4">TMS</span>, <span className="text-white font-black underline decoration-emerald-500 decoration-4">Accounting</span> และ <span className="text-white font-black underline decoration-amber-500 decoration-4">Audit Validation</span> เพื่อประกันความถูกต้องของ Dashboard 100% ตาม SOP ที่กำหนดไว้
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-md p-8 rounded-[3rem] border border-white/20">
                        <BarChart3 className="w-16 h-16 text-blue-400 mb-2" />
                        <div className="text-center">
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">Status Check</span>
                            <span className="text-2xl font-black">Audit Verified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRManagement;

export function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
