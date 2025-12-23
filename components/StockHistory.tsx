import React, { useState, useMemo } from 'react';
import type { StockTransaction, StockItem, Repair, Technician } from '../types';
import { STOCK_CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Package, Inbox, TrendingUp, AlertCircle, ShoppingCart, Activity, History } from 'lucide-react';

interface StockHistoryProps {
    transactions: StockTransaction[];
    stock: StockItem[];
    repairs: Repair[];
    technicians: Technician[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

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

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: React.ReactNode; delay?: string; headerAction?: React.ReactNode }> = ({ title, children, className = '', icon, delay = '', headerAction }) => (
    <div className={`glass p-10 rounded-[3.5rem] border border-white/50 shadow-2xl shadow-slate-200/40 hover:shadow-3xl transition-all duration-700 animate-scale-in ${delay} ${className}`}>
        <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                <div className="w-2.5 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                {title}
            </h3>
            <div className="flex items-center gap-4">
                {headerAction}
                {icon && <div className="p-3 bg-slate-50 rounded-[1.5rem] text-slate-400 border border-slate-100 shadow-sm">{icon}</div>}
            </div>
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
            '#6366f1': 'text-indigo-500',
            '#14b8a6': 'text-teal-500'
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
            '#6366f1': 'bg-indigo-500',
            '#14b8a6': 'bg-teal-500'
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
        'bg-violet-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return classes[index % classes.length];
};

const StockHistory: React.FC<StockHistoryProps> = ({ transactions, stock, repairs, technicians }) => {
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    const stockMap = useMemo(() => new Map((Array.isArray(stock) ? stock : []).map(item => [item.id, item])), [stock]);
    const repairMap = useMemo(() => new Map((Array.isArray(repairs) ? repairs : []).map(item => [item.repairOrderNo, item])), [repairs]);

    const repairPartSourceMap = useMemo(() => {
        const map = new Map<string, Map<string, 'สต็อกอู่' | 'ร้านค้า'>>();
        (Array.isArray(repairs) ? repairs : []).forEach(repair => {
            if (repair.repairOrderNo && Array.isArray(repair.parts)) {
                const partMap = new Map();
                repair.parts.forEach(part => partMap.set(part.partId, part.source));
                map.set(repair.repairOrderNo, partMap);
            }
        });
        return map;
    }, [repairs]);

    const flattenedParts = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate)
            .flatMap(r =>
                (Array.isArray(r.parts) ? r.parts : []).map(p => ({
                    id: `${r.id}-${p.partId}`,
                    partName: p.name,
                    partId: p.partId,
                    quantity: p.quantity,
                    unit: p.unit,
                    unitPrice: p.unitPrice,
                    source: p.source,
                    category: stockMap.get(p.partId)?.category || 'อื่นๆ',
                    dateUsed: r.repairEndDate!,
                    repairOrderNo: r.repairOrderNo,
                    licensePlate: r.licensePlate,
                }))
            );
    }, [repairs, stockMap]);

    const filteredData = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0); if (end) end.setHours(23, 59, 59, 999);

        if (activeTab === 'internal') {
            return (Array.isArray(transactions) ? transactions : [])
                .filter(t => t.type === 'เบิกใช้' && t.relatedRepairOrder ? repairPartSourceMap.get(t.relatedRepairOrder)?.get(t.stockItemId) !== 'ร้านค้า' : true)
                .map(t => ({ ...t, displayDate: (t.type === 'เบิกใช้' && t.relatedRepairOrder && repairMap.get(t.relatedRepairOrder)?.repairStartDate) || t.transactionDate, category: stockMap.get(t.stockItemId)?.category || 'อื่นๆ' }))
                .filter(t => {
                    const isDate = (!start || new Date(t.displayDate) >= start) && (!end || new Date(t.displayDate) <= end);
                    const isCat = categoryFilter === 'all' || t.category === categoryFilter;
                    const isSearch = searchTerm === '' || t.stockItemName.toLowerCase().includes(searchTerm.toLowerCase()) || (t.relatedRepairOrder && t.relatedRepairOrder.toLowerCase().includes(searchTerm.toLowerCase()));
                    return isDate && isCat && isSearch;
                }).sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
        } else {
            return flattenedParts.filter(p => p.source === 'ร้านค้า' && (!start || new Date(p.dateUsed) >= start) && (!end || new Date(p.dateUsed) <= end) && (categoryFilter === 'all' || p.category === categoryFilter) && (searchTerm === '' || p.partName.toLowerCase().includes(searchTerm.toLowerCase()) || p.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase())))
                .sort((a, b) => new Date(b.dateUsed).getTime() - new Date(a.dateUsed).getTime());
        }
    }, [transactions, flattenedParts, activeTab, searchTerm, startDate, endDate, categoryFilter, stockMap, repairMap, repairPartSourceMap]);

    const analytics = useMemo(() => {
        const stockVal = (Array.isArray(stock) ? stock : []).reduce((acc, item) => {
            acc[item.category || 'อื่นๆ'] = (acc[item.category || 'อื่นๆ'] || 0) + (Number(item.quantity) * Number(item.price));
            return acc;
        }, {} as Record<string, number>);
        const pieData = Object.entries(stockVal).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const intUse = (Array.isArray(transactions) ? transactions : []).filter(t => t.type === 'เบิกใช้').reduce((s, t) => s + (Number(t.quantity) * Number(t.pricePerUnit || 0)), 0);
        const extUse = (Array.isArray(repairs) ? repairs : []).flatMap(r => r.parts || []).filter(p => p.source === 'ร้านค้า').reduce((s, p) => s + (Number(p.quantity) * Number(p.unitPrice || 0)), 0);
        return { pieData, intUse, extUse };
    }, [stock, transactions, repairs]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredData, currentPage, itemsPerPage]);

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-blue-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 leading-none">
                        Inventory Log
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-glow"></span>
                        ประวัติการเบิกจ่ายและเคลื่อนไหวสต็อก (Stock Movement Intelligence)
                    </p>
                </div>
            </div>

            {/* Analytics Stats */}
            <div className="bento-grid h-auto lg:h-auto gap-10">
                <ModernStatCard delay="delay-100" theme="blue" title="มูลค่าสต็อกคงเหลือ" value={`฿${formatCurrency((Array.isArray(stock) ? stock : []).reduce((s, i) => s + (Number(i.quantity) * Number(i.price)), 0)).replace('฿', '')}`} subtext="Current Asset Value" icon={<Package size={150} />} />
                <ModernStatCard delay="delay-200" theme="orange" title="รายการต้องเติม" value={`${(Array.isArray(stock) ? stock : []).filter(s => s.quantity <= s.minStock).length} ชิ้น`} subtext="Under Min Stock Level" icon={<AlertCircle size={150} />} />
                <ModernStatCard delay="delay-300" theme="green" title="ยอดเบิกใช้สะสม" value={`฿${formatCurrency(analytics.intUse).replace('฿', '')}`} subtext="Internal Utilization" icon={<TrendingUp size={150} />} />
                <ModernStatCard delay="delay-400" theme="purple" title="ยอดจัดซื้อสะสม" value={`฿${formatCurrency(analytics.extUse).replace('฿', '')}`} subtext="External Procurement" icon={<ShoppingCart size={150} />} />

                {/* Categories Breakdown */}
                <Card title="การกระจายตัวของสต็อก (Category Map)" className="col-span-1 lg:col-span-1 min-h-[450px]" delay="delay-500">
                    <div className="h-full relative flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    {analytics.pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip unit="บาท" />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-6 space-y-3 overflow-y-auto max-h-[150px] custom-scrollbar px-4">
                            {analytics.pieData.map((entry, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getCategoryColorClass(idx)}`}></div>
                                        <span>{entry.name}</span>
                                    </div>
                                    <span className="text-slate-900">{((entry.value / (analytics.pieData.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Filters & Data Grid */}
                <Card title="บันทึกการทำรายการ (Transaction Feed)" className="col-span-1 lg:col-span-2 min-h-[500px]" delay="delay-600">
                    <div className="flex flex-col h-full">
                        <div className="flex flex-wrap gap-4 mb-8">
                            <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] w-fit">
                                <button onClick={() => setActiveTab('internal')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'internal' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>สต็อกอู่</button>
                                <button onClick={() => setActiveTab('external')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'external' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>ซื้อภายนอก</button>
                            </div>
                            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} title="กรองหมวดหมู่" className="bg-slate-50 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 outline-none">
                                <option value="all">ทุกหมวดหมู่</option>
                                {STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="ค้นหาข้อมูล..."
                                title="ค้นหาประวัติสต็อก"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-50 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 outline-none flex-1 min-w-[200px]"
                            />
                        </div>

                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-4 px-4 w-24">วันที่</th>
                                        <th className="py-4 px-4">รายการ</th>
                                        <th className="py-4 px-4 text-center">อ้างอิง RO</th>
                                        <th className="py-4 px-4 text-center">จำนวน</th>
                                        <th className="py-4 px-4 text-right">รวมสุทธิ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedData.map((item: any, idx) => {
                                        const isInt = activeTab === 'internal';
                                        const date = isInt ? item.displayDate : item.dateUsed;
                                        const name = isInt ? item.stockItemName : item.partName;
                                        const ref = isInt ? (item.documentNumber || item.relatedRepairOrder) : item.repairOrderNo;
                                        const qty = item.quantity;
                                        const total = Math.abs(qty * (isInt ? (item.pricePerUnit || 0) : (item.unitPrice || 0)));

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 group border-b border-slate-50 last:border-0">
                                                <td className="py-4 px-4 text-[11px] font-black text-slate-400">
                                                    {new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="text-[12px] font-black text-slate-800">{name}</div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.category}</div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 border border-slate-200">{ref || '-'}</span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`text-[12px] font-black ${qty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {qty > 0 ? '+' : ''}{qty}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right font-black text-slate-800 text-[12px]">
                                                    ฿{formatCurrency(total)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Area */}
                        <div className="mt-8 flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 px-6 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 disabled:opacity-30 shadow-sm transition-all active:scale-95">ย้อนกลับ</button>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">หน้า {currentPage} / {totalPages || 1}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 px-6 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 disabled:opacity-30 shadow-sm transition-all active:scale-95">ถัดไป</button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default StockHistory;
