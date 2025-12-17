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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const StockHistory: React.FC<StockHistoryProps> = ({ transactions, stock, repairs, technicians }) => {
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15); // Reduced slightly for better view

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
            acc[cat] = (acc[cat] || 0) + (item.quantity * item.price);
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(stockValueByCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 2. Usage Trend (Last 6 Months) - Internal vs External Costs
        // Aggregate flattenedParts for external, and internal transactions for internal
        // This is simplified; accurate calculation requires iterating months.
        const internalUsage = (Array.isArray(transactions) ? transactions : [])
            .filter(t => t.type === 'เบิกใช้' || t.type === 'ปรับสต็อก') // Including adjust down? Just usage usually.
            .reduce((acc, t) => {
                const month = new Date(t.transactionDate).toLocaleString('th-TH', { month: 'short' });
                const val = Math.abs(t.quantity * (t.pricePerUnit || 0));
                acc[month] = (acc[month] || 0) + val;
                return acc;
            }, {} as Record<string, number>);

        // Ensure chart data structure...
        const chartData = Object.entries(internalUsage).map(([name, value]) => ({ name, value })).slice(0, 6); // Just rough slice

        return { pieData, chartData };
    }, [stock, transactions]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setCategoryFilter('all');
        setCurrentPage(1);
    };

    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return '-';
        return ids.map(id => technicians.find(t => t.id === id)?.name || id.substring(0, 5)).join(', ');
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">Inventory Intelligence</h2>
                            <p className="opacity-90">ติดตามการเคลื่อนไหวและการเบิกจ่ายอะไหล่</p>
                        </div>
                        <div className="flex gap-8 mt-6">
                            <div>
                                <p className="text-sm opacity-70 uppercase tracking-wide">มูลค่าสต็อกปัจจุบัน</p>
                                <p className="text-4xl font-bold mt-1">
                                    {formatCurrency((Array.isArray(stock) ? stock : []).reduce((sum, s) => sum + (s.quantity * s.price), 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm opacity-70 uppercase tracking-wide">รายการต่ำกว่าเกณฑ์</p>
                                <p className="text-4xl font-bold mt-1 text-yellow-300">
                                    {(Array.isArray(stock) ? stock : []).filter(s => s.quantity <= s.minStock).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Circle */}
                    <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">มูลค่าสต็อกแยกตามหมวดหมู่</h3>
                    <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analytics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('internal')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'internal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Internal Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('external')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'external' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        External Purchase
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm">
                        <option value="all">All Categories</option>
                        {STOCK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Search parts, ID, plate..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg text-sm w-full md:w-48"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Cost</th>
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
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-800">{name}</div>
                                            <div className="text-xs text-gray-500">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                            {ref || '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-right text-sm font-bold ${qty < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {qty > 0 ? '+' : ''}{qty} {isInternal ? stockMap.get(item.stockItemId)?.unit : item.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                            {formatCurrency(Math.abs(price))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {paginatedData.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                            No data found matching your filters.
                        </div>
                    )}
                </div>
                {/* Pagination (Simplified) */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">Page {currentPage} of {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockHistory;
