import React, { useState, useMemo, useEffect } from 'react';
import type { UsedPart, UsedPartDisposition, UsedPartBatchStatus } from '../types';
import { promptForPasswordAsync, confirmAction, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Archive, Trash2, ShoppingCart, TrendingUp, RefreshCcw, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface UsedPartReportProps {
    usedParts: UsedPart[];
    deleteUsedPartDisposition: (usedPartId: string, dispositionId: string) => void;
}

interface FlattenedDisposition extends UsedPartDisposition {
    parentPart: UsedPart;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

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
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-8 rounded-[3rem] text-white shadow-2xl animate-scale-in ${delay} group hover:scale-[1.02] transition-all duration-700`}>
            <div className="absolute -right-10 -bottom-10 opacity-20 transform group-hover:scale-110 transition-transform duration-700">
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-3">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tighter">{value}</h3>
                </div>
                {subtext && <div className="mt-4 inline-flex items-center gap-1.5 bg-white/10 w-fit px-3 py-1.5 rounded-full text-[9px] font-black border border-white/10 backdrop-blur-md uppercase tracking-widest">{subtext}</div>}
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
            '#10b981': 'text-emerald-500',
            '#f59e0b': 'text-amber-500',
            '#ef4444': 'text-red-500',
            '#8b5cf6': 'text-violet-500',
            '#ec4899': 'text-pink-500',
            '#6366f1': 'text-indigo-500'
        };
        return mapping[color.toLowerCase()] || 'text-slate-500';
    };

    const getBgClass = (color: string) => {
        if (!color) return 'bg-slate-500';
        const mapping: Record<string, string> = {
            '#3b82f6': 'bg-blue-500',
            '#10b981': 'bg-emerald-500',
            '#f59e0b': 'bg-amber-500',
            '#ef4444': 'bg-red-500',
            '#8b5cf6': 'bg-violet-500',
            '#ec4899': 'bg-pink-500',
            '#6366f1': 'bg-indigo-500'
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

const getCategoryColorClass = (index: number) => {
    const classes = [
        'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500',
        'bg-violet-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    return classes[index % classes.length];
};

const UsedPartReport: React.FC<UsedPartReportProps> = ({ usedParts, deleteUsedPartDisposition }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UsedPartBatchStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const safeUsedParts = useMemo(() => Array.isArray(usedParts) ? usedParts : [], [usedParts]);

    const stats = useMemo(() => {
        const partial = safeUsedParts.filter(p => p.status === 'จัดการบางส่วน').length;
        const completed = safeUsedParts.filter(p => p.status === 'จัดการครบแล้ว').length;
        const awaiting = safeUsedParts.reduce((s, p) => s + Math.max(0, p.initialQuantity - (p.dispositions || []).reduce((ds, d) => ds + d.quantity, 0)), 0);
        const soldVal = safeUsedParts.reduce((t, p) => t + (p.dispositions || []).filter(d => d.dispositionType === 'ขาย').reduce((st, d) => st + (d.salePricePerUnit || 0) * d.quantity, 0), 0);
        const typeCounts: Record<string, number> = {};
        safeUsedParts.forEach(p => (p.dispositions || []).forEach(d => typeCounts[d.dispositionType] = (typeCounts[d.dispositionType] || 0) + d.quantity));
        const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const topSold = safeUsedParts.reduce((acc: any, p) => {
            const s = (p.dispositions || []).filter(d => d.dispositionType === 'ขาย').reduce((st, d) => st + (d.salePricePerUnit || 0) * d.quantity, 0);
            if (s > 0) acc[p.name] = (acc[p.name] || 0) + s;
            return acc;
        }, {});
        return { awaiting, partial, completed, soldVal, typeData, topSold: Object.entries(topSold).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5) };
    }, [safeUsedParts]);

    const filteredDispositions = useMemo(() => {
        const flat: FlattenedDisposition[] = [];
        safeUsedParts.forEach(p => (p.dispositions || []).forEach(d => flat.push({ ...d, parentPart: p })));
        const start = startDate ? new Date(startDate) : null; if (start) start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : null; if (end) end.setHours(23, 59, 59, 999);
        return flat.filter(d => {
            const p = d.parentPart; const dDate = new Date(d.date);
            const isStat = statusFilter === 'all' || p.status === statusFilter;
            const isDate = (!start || dDate >= start) && (!end || dDate <= end);
            const isSearch = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) || p.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase());
            return isStat && isDate && isSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [safeUsedParts, statusFilter, startDate, endDate, searchTerm]);

    const totalPages = Math.ceil(filteredDispositions.length / itemsPerPage);
    const paginated = filteredDispositions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDelete = async (disp: FlattenedDisposition) => {
        if (await promptForPasswordAsync('ลบ')) {
            const ok = await confirmAction('ยืนยันการลบ', `ยืนยันการลบรายการ: ${disp.parentPart.name} (${disp.quantity} ${disp.parentPart.unit})`, 'ลบ');
            if (ok) deleteUsedPartDisposition(disp.parentPart.id, disp.id);
        }
    };

    const getBg = (type: string) => {
        switch (type) {
            case 'ขาย': return 'bg-emerald-100 text-emerald-700';
            case 'ทิ้ง': return 'bg-rose-100 text-rose-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-blue-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 leading-none">
                        Parts Lifecycle
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-glow"></span>
                        การจัดการและบันทึกวงจรอะไหล่เก่า (Used Parts Intelligence)
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bento-grid h-auto lg:h-auto gap-10">
                <ModernStatCard delay="delay-100" theme="blue" title="รอจัดการจัดการ" value={`${stats.awaiting} ชิ้น`} subtext="Awaiting Disposition" icon={<Archive size={150} />} />
                <ModernStatCard delay="delay-200" theme="orange" title="จัดการบางส่วน" value={`${stats.partial} ชุด`} subtext="Partial Managed" icon={<RefreshCcw size={150} />} />
                <ModernStatCard delay="delay-300" theme="green" title="จัดการครบแล้ว" value={`${stats.completed} ชุด`} subtext="Fully Recovered" icon={<TrendingUp size={150} />} />
                <ModernStatCard delay="delay-400" theme="purple" title="มูลค่าที่ได้คืน" value={`฿${formatCurrency(stats.soldVal).replace('฿', '')}`} subtext="Scrap Revenue" icon={<ShoppingCart size={150} />} />

                {/* Charts */}
                <Card title="วิธีการจัดการอะไหล่ (Disposition Split)" className="col-span-1 lg:col-span-1 min-h-[450px]" delay="delay-500">
                    <div className="h-full flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={stats.typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    {stats.typeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip unit="ชิ้น" />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-6 space-y-3 overflow-y-auto max-h-[150px] custom-scrollbar px-4">
                            {stats.typeData.map((e, i) => (
                                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getCategoryColorClass(i)}`}></div>
                                        <span>{e.name}</span>
                                    </div>
                                    <span className="text-slate-900">{e.value} ชิ้น</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Filter & Data Grid */}
                <Card title="ประวัติการจัดการ (Management Logs)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-600">
                    <div className="flex flex-col h-full">
                        <div className="flex flex-wrap gap-4 mb-8">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="ค้นหาอะไหล่, ทะเบียน, RO..." title="ค้นหาประวัติอะไหล่" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 pl-12 pr-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 outline-none" />
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} title="กรองสถานะ" className="bg-slate-50 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 outline-none">
                                <option value="all">ทุกสถานะ</option>
                                <option value="รอจัดการ">รอจัดการ</option>
                                <option value="จัดการบางส่วน">จัดการบางส่วน</option>
                                <option value="จัดการครบแล้ว">จัดการครบแล้ว</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-4 px-4">วันที่</th>
                                        <th className="py-4 px-4">รายการอะไหล่</th>
                                        <th className="py-4 px-4">ประเภท</th>
                                        <th className="py-4 px-4 text-center">จำนวน</th>
                                        <th className="py-4 px-4 text-right">มูลค่าขาย</th>
                                        <th className="py-4 px-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginated.map((d, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-4 px-4 text-[11px] font-black text-slate-400 italic">{new Date(d.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</td>
                                            <td className="py-4 px-4">
                                                <div className="text-[12px] font-black text-slate-800">{d.parentPart.name}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{d.parentPart.fromLicensePlate} / {d.parentPart.fromRepairOrderNo}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getBg(d.dispositionType)}`}>{d.dispositionType}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center font-black text-slate-600 text-[11px]">{d.quantity} {d.parentPart.unit}</td>
                                            <td className="py-4 px-4 text-right font-black text-slate-900 text-[12px]">{d.dispositionType === 'ขาย' ? `฿${formatCurrency((d.salePricePerUnit || 0) * d.quantity)}` : '-'}</td>
                                            <td className="py-4 px-4 text-center">
                                                <button onClick={() => handleDelete(d)} title="ลบรายการ" className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 px-6 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 disabled:opacity-30 shadow-sm transition-all active:scale-95 flex items-center gap-2"><ChevronLeft size={14} />ย้อนกลับ</button>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">หน้า {currentPage} / {totalPages || 1}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 px-6 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 disabled:opacity-30 shadow-sm transition-all active:scale-95 flex items-center gap-2">ถัดไป<ChevronRight size={14} /></button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UsedPartReport;