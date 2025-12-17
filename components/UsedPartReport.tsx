import React, { useState, useMemo, useEffect } from 'react';
import type { UsedPart, UsedPartDisposition, UsedPartBatchStatus } from '../types';
import { promptForPassword, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';

interface UsedPartReportProps {
    usedParts: UsedPart[];
    deleteUsedPartDisposition: (usedPartId: string, dispositionId: string) => void;
}

// Create a flattened structure for the table
interface FlattenedDisposition extends UsedPartDisposition {
    parentPart: UsedPart;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

// --- Styled Components (Infographic Style) ---

const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v6l-8 4-8-4V7'; // Box
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
            break;
        case 'yellow':
            gradient = 'from-amber-400 to-orange-500';
            iconPath = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'; // Refresh/Cycle
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

const UsedPartReport: React.FC<UsedPartReportProps> = ({ usedParts, deleteUsedPartDisposition }) => {
    // State for filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UsedPartBatchStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const safeUsedParts = useMemo(() => Array.isArray(usedParts) ? usedParts : [], [usedParts]);

    // Calculate statistics
    const stats = useMemo(() => {
        const partialBatches = safeUsedParts.filter(p => p.status === 'จัดการบางส่วน').length;
        const completedBatches = safeUsedParts.filter(p => p.status === 'จัดการครบแล้ว').length;

        const totalItemsAwaiting = safeUsedParts.reduce((sum, part) => {
            const disposedQty = (part.dispositions || []).reduce((dSum, d) => dSum + d.quantity, 0);
            const remaining = part.initialQuantity - disposedQty;
            return sum + (remaining > 0 ? remaining : 0);
        }, 0);

        const totalSoldValue = safeUsedParts.reduce((total, part) => {
            const partSales = (part.dispositions || []).reduce((subTotal, disp) => {
                if (disp.dispositionType === 'ขาย') {
                    return subTotal + (disp.salePricePerUnit || 0) * disp.quantity;
                }
                return subTotal;
            }, 0);
            return total + partSales;
        }, 0);

        // Chart Data Preparation
        const dispositionCounts: Record<string, number> = {};
        safeUsedParts.forEach(part => {
            (part.dispositions || []).forEach(disp => {
                dispositionCounts[disp.dispositionType] = (dispositionCounts[disp.dispositionType] || 0) + disp.quantity;
            });
        });
        const dispositionData = Object.entries(dispositionCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const soldItems = safeUsedParts.reduce((acc: Record<string, number>, part) => {
            const sales = (part.dispositions || []).filter(d => d.dispositionType === 'ขาย').reduce((sum, d) => sum + ((d.salePricePerUnit || 0) * d.quantity), 0);
            if (sales > 0) {
                acc[part.name] = (acc[part.name] || 0) + sales;
            }
            return acc;
        }, {});
        const topSoldItems = Object.entries(soldItems).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);


        return { partial: partialBatches, completed: completedBatches, totalSoldValue, totalItemsAwaiting, dispositionData, topSoldItems };
    }, [safeUsedParts]);

    // Flatten dispositions and filter them
    const filteredDispositions = useMemo(() => {
        const flattened: FlattenedDisposition[] = [];
        safeUsedParts.forEach(part => {
            (part.dispositions || []).forEach(disp => {
                flattened.push({ ...disp, parentPart: part });
            });
        });

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return flattened
            .filter(disp => {
                const part = disp.parentPart;
                const dispDate = new Date(disp.date);

                const isStatusMatch = statusFilter === 'all' || part.status === statusFilter;
                const isDateMatch = (!start || dispDate >= start) && (!end || dispDate <= end);
                const isSearchMatch = searchTerm === '' ||
                    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (disp.soldTo && disp.soldTo.toLowerCase().includes(searchTerm.toLowerCase()));

                return isStatusMatch && isDateMatch && isSearchMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [safeUsedParts, statusFilter, startDate, endDate, searchTerm]);

    // Pagination logic
    const totalPages = useMemo(() => Math.ceil(filteredDispositions.length / itemsPerPage), [filteredDispositions.length, itemsPerPage]);
    const paginatedDispositions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDispositions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDispositions, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, startDate, endDate, itemsPerPage]);

    const handleDelete = (disposition: FlattenedDisposition) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการจัดการนี้?\n\n- ${disposition.dispositionType}: ${disposition.parentPart.name} (จำนวน ${disposition.quantity})`)) {
            deleteUsedPartDisposition(disposition.parentPart.id, disposition.id);
        }
    };

    const getDispositionBadge = (type: UsedPartDisposition['dispositionType']) => {
        switch (type) {
            case 'ขาย': return 'bg-green-100 text-green-800';
            case 'ทิ้ง': return 'bg-red-100 text-red-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            case 'ย้ายไปคลังหมุนเวียน': return 'bg-blue-100 text-blue-800';
            case 'ย้ายไปสต็อกของเก่ารวม': return 'bg-indigo-100 text-indigo-800';
            case 'นำไปใช้แล้ว': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDispositionDetails = (disp: FlattenedDisposition) => {
        switch (disp.dispositionType) {
            case 'ขาย': return disp.soldTo || '-';
            case 'เก็บไว้ใช้ต่อ': return `ที่เก็บ: ${disp.storageLocation || 'N/A'}`;
            case 'ย้ายไปคลังหมุนเวียน': return disp.notes || 'ย้ายเข้าคลังอะไหล่หมุนเวียน';
            case 'ย้ายไปสต็อกของเก่ารวม': return disp.notes || 'ย้ายเข้าสต็อกของเก่ารวม';
            case 'นำไปใช้แล้ว':
            case 'ทิ้ง':
                return disp.notes || '-';
            default: return '-';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        รายงานอะไหล่เก่า (Used Parts Report)
                    </h2>
                    <p className="text-gray-500 mt-1">ติดตามสถานะและการจัดการอะไหล่ที่ถอดออกจากรถ</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard title="จำนวนรอจัดการ" value={stats.totalItemsAwaiting.toLocaleString()} subtext="ชิ้น" theme="blue" />
                <ModernStatCard title="จัดการบางส่วน" value={stats.partial.toLocaleString()} subtext="ชุดรายการ" theme="yellow" />
                <ModernStatCard title="จัดการครบแล้ว" value={stats.completed.toLocaleString()} subtext="ชุดรายการ" theme="green" />
                <ModernStatCard title="มูลค่าที่ขายได้" value={`${formatCurrency(stats.totalSoldValue)}`} subtext="บาท" theme="purple" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="สัดส่วนการจัดการอะไหล่ (แยกตามประเภท)">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.dispositionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                    {stats.dispositionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip unit="ชิ้น" />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="5 อันดับอะไหล่ที่ขายได้มูลค่าสูงสุด">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={stats.topSoldItems} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="บาท" />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" name="มูลค่าขาย" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>


            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end border border-slate-100">
                <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">ค้นหา</label>
                    <input
                        type="text"
                        placeholder="ชื่อ, เลขที่ซ่อม, ทะเบียน, ผู้ซื้อ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">สถานะ (ของชุดอะไหล่)</label>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="รอจัดการ">รอจัดการ</option>
                        <option value="จัดการบางส่วน">จัดการบางส่วน</option>
                        <option value="จัดการครบแล้ว">จัดการครบแล้ว</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">จากวันที่</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                    <span className="text-gray-400 mb-4">-</span>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">ถึงวันที่</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">รายการประวัติการจัดการ</h3>
                    <span className="text-sm text-gray-500">ทั้งหมด {filteredDispositions.length} รายการ</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่ออะไหล่</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">การดำเนินเนินการ</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จำนวน</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">มูลค่า</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ใบซ่อม</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginatedDispositions.map(disp => (
                                <tr key={disp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(disp.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{disp.parentPart.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getDispositionBadge(disp.dispositionType)}`}>
                                            {disp.dispositionType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{disp.quantity} <span className="text-gray-400 text-xs">{disp.parentPart.unit}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={getDispositionDetails(disp)}>{getDispositionDetails(disp)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-800">
                                        {disp.dispositionType === 'ขาย' ? formatCurrency((disp.salePricePerUnit || 0) * disp.quantity) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{disp.parentPart.fromRepairOrderNo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleDelete(disp)}
                                            className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                                        >
                                            ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedDispositions.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-gray-400">ไม่พบข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                <div className="bg-white p-4 flex justify-between items-center flex-wrap gap-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">แสดง</span>
                        <select
                            value={itemsPerPage}
                            onChange={e => setItemsPerPage(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600">รายการต่อหน้า</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50">
                            ก่อนหน้า
                        </button>
                        <span className="text-sm font-medium text-gray-700">หน้า {currentPage} จาก {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50">
                            ถัดไป
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsedPartReport;