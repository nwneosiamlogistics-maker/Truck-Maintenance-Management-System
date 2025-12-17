import React, { useState, useMemo } from 'react';
import type { StockTransaction, StockItem, Repair, Technician } from '../types';
import { STOCK_CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface StockHistoryProps {
    transactions: StockTransaction[];
    stock: StockItem[];
    repairs: Repair[];
    technicians: Technician[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

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

    // Optimize Part Source Lookup
    const repairPartSourceMap = useMemo(() => {
        const map = new Map<string, Map<string, 'สต็อกอู่' | 'ร้านค้า'>>();
        (Array.isArray(repairs) ? repairs : []).forEach(repair => {
            if (repair.repairOrderNo && Array.isArray(repair.parts)) {
                const partMap = new Map<string, 'สต็อกอู่' | 'ร้านค้า'>();
                repair.parts.forEach(part => {
                    partMap.set(part.partId, part.source);
                });
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
                    category: stockMap.get(p.partId)?.category || 'ไม่พบหมวดหมู่',
                    dateUsed: r.repairEndDate!,
                    repairOrderNo: r.repairOrderNo,
                    licensePlate: r.licensePlate,
                    allTechnicianIds: [r.assignedTechnicianId, ...(r.assistantTechnicianIds || [])].filter(Boolean) as string[],
                }))
            );
    }, [repairs, stockMap]);

    const filteredData = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (activeTab === 'internal') {
            return (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    if (t.type === 'เบิกใช้' && t.relatedRepairOrder) {
                        const partSource = repairPartSourceMap.get(t.relatedRepairOrder)?.get(t.stockItemId);
                        if (partSource === 'ร้านค้า') return false;
                    }
                    return true;
                })
                .map(t => {
                    let displayDate = t.transactionDate;
                    if (t.type === 'เบิกใช้' && t.relatedRepairOrder) {
                        const repair = repairMap.get(t.relatedRepairOrder);
                        if (repair && repair.repairStartDate) displayDate = repair.repairStartDate;
                    }
                    return { ...t, displayDate, category: stockMap.get(t.stockItemId)?.category || 'ไม่พบหมวดหมู่' };
                })
                .filter(t => {
                    const transactionDate = new Date(t.displayDate);
                    const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                    const isCategoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
                    const isSearchMatch = searchTerm === '' ||
                        t.stockItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.relatedRepairOrder && t.relatedRepairOrder.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        t.actor.toLowerCase().includes(searchTerm.toLowerCase());
                    return isDateInRange && isCategoryMatch && isSearchMatch;
                })
                .sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
        } else { // External
            return flattenedParts
                .filter(p => p.source === 'ร้านค้า')
                .filter(p => {
                    const transactionDate = new Date(p.dateUsed);
                    const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                    const isCategoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
                    const isSearchMatch = searchTerm === '' ||
                        p.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase());
                    return isDateInRange && isCategoryMatch && isSearchMatch;
                })
                .sort((a, b) => new Date(b.dateUsed).getTime() - new Date(a.dateUsed).getTime());
        }
    }, [transactions, flattenedParts, activeTab, searchTerm, startDate, endDate, categoryFilter, stockMap, repairMap, repairPartSourceMap]);

    // Analytics Calculation
    const analytics = useMemo(() => {
        // 1. Stock Value Distribution (Current Stock)
        const stockValueByCategory = (Array.isArray(stock) ? stock : []).reduce((acc, item) => {
            const cat = item.category || 'อื่นๆ';
            acc[cat] = (acc[cat] || 0) + (Number(item.quantity) * Number(item.price));
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(stockValueByCategory)
            .map(([name, value]: [string, number]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 2. Grand Total Usage (All Time)
        const totalInternalUsage = (Array.isArray(transactions) ? transactions : [])
            .filter(t => t.type === 'เบิกใช้')
            .reduce((sum, t) => sum + (Number(t.quantity) * Number(t.pricePerUnit || 0)), 0);

        const totalExternalUsage = (Array.isArray(repairs) ? repairs : [])
            .flatMap(r => r.parts || [])
            .filter(p => p.source === 'ร้านค้า')
            .reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice || 0)), 0);

        return { pieData, totalInternalUsage, totalExternalUsage };
    }, [stock, transactions, repairs]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                        ประวัติการเบิกจ่าย
                    </h2>
                    <p className="text-gray-500 mt-1">ตรวจสอบการเคลื่อนไหวของสต็อกอะไหล่ทั้งหมด</p>
                </div>
            </div>

            {/* Header & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Card: Inventory Intelligence */}
                <div className="lg:col-span-2 bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[450px]">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Inventory Intelligence</h2>
                            <p className="text-lg opacity-80 font-medium">ติดตามการเคลื่อนไหวและการเบิกจ่ายอะไหล่</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="relative z-10 grid grid-cols-2 gap-y-10 gap-x-12 mt-auto">
                        <div>
                            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">มูลค่าสต็อกปัจจุบัน (Asset)</p>
                            <p className="text-4xl font-extrabold tracking-tight">
                                {formatCurrency((Array.isArray(stock) ? stock : []).reduce((sum, s) => sum + (Number(s.quantity) * Number(s.price)), 0)).replace('฿', '')}
                                <span className="text-lg font-medium opacity-60 ml-2">THB</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">รายการต่ำกว่าเกณฑ์ (Alert)</p>
                            <p className="text-4xl font-extrabold text-yellow-300 tracking-tight">
                                {(Array.isArray(stock) ? stock : []).filter(s => s.quantity <= s.minStock).length}
                                <span className="text-lg font-medium opacity-60 ml-2 text-white">Items</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">ยอดเบิกใช้สะสม (Internal Usage)</p>
                            <p className="text-4xl font-extrabold tracking-tight">
                                {formatCurrency(analytics.totalInternalUsage).replace('฿', '')}
                                <span className="text-lg font-medium opacity-60 ml-2">THB</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider mb-1">ยอดซื้อภายนอกสะสม (External Buy)</p>
                            <p className="text-4xl font-extrabold tracking-tight">
                                {formatCurrency(analytics.totalExternalUsage).replace('฿', '')}
                                <span className="text-lg font-medium opacity-60 ml-2">THB</span>
                            </p>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 right-10 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl"></div>
                </div>

                {/* Right Card: Category Distribution */}
                <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-slate-100 flex flex-col h-[450px]">
                    <h3 className="text-lg font-bold text-slate-600 mb-6">มูลค่าสต็อกแยกตามหมวดหมู่</h3>

                    <div className="relative flex-1 flex items-center justify-center">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Total</span>
                            <span className="text-3xl font-extrabold text-slate-800">
                                {((Array.isArray(stock) ? stock : []).filter(i => Number(i.quantity) > 0 && Number(i.price) > 0).length)}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">Items</span>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={analytics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {analytics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatCurrency(value as number)}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                                    itemStyle={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Simplified Legend List */}
                    <div className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 max-h-[140px]">
                        {analytics.pieData.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between text-sm group cursor-default">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></div>
                                    <span className="text-slate-600 font-medium truncate group-hover:text-slate-900 transition-colors" title={entry.name}>
                                        {entry.name}
                                    </span>
                                </div>
                                <span className="font-bold text-slate-700 ml-2 bg-slate-50 px-2 py-0.5 rounded-md min-w-[3rem] text-center">
                                    {((entry.value / (analytics.pieData.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    <button
                        onClick={() => setActiveTab('internal')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'internal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Internal Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('external')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'external' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        External Purchase
                    </button>
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none">
                        <option value="all">All Categories</option>
                        {STOCK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reference</th>
                                <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</th>
                                <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginatedData.map((item: any, idx: number) => {
                                const isInternal = activeTab === 'internal';
                                const date = isInternal ? item.displayDate : item.dateUsed;
                                const name = isInternal ? item.stockItemName : item.partName;
                                const ref = isInternal ? (item.documentNumber || item.relatedRepairOrder) : `${item.repairOrderNo} (${item.licensePlate})`;
                                const qty = item.quantity;
                                const price = isInternal ? (item.pricePerUnit * qty) : (item.unitPrice * qty);

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5 text-sm font-semibold text-slate-600">
                                            {new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{name}</div>
                                            <div className="text-xs font-medium text-slate-400 mt-0.5">{item.category}</div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500 bg-slate-50/50 rounded-lg w-fit">
                                            {ref || '-'}
                                        </td>
                                        <td className={`px-8 py-5 text-right text-sm font-bold ${qty < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                            {qty > 0 ? '+' : ''}{qty} <span className="text-xs font-normal text-slate-400 ml-1">{isInternal ? stockMap.get(item.stockItemId)?.unit : item.unit}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right text-sm font-bold text-slate-700">
                                            {formatCurrency(Math.abs(price))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {paginatedData.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="font-medium">No results found.</p>
                        </div>
                    )}
                </div>
                {/* Pagination */}
                <div className="px-8 py-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-md rounded-xl transition-all disabled:opacity-50 disabled:hover:shadow-none"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-md rounded-xl transition-all disabled:opacity-50 disabled:hover:shadow-none"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockHistory;
