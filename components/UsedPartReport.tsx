import React, { useState, useMemo, useEffect } from 'react';
import type { UsedPart, UsedPartDisposition, UsedPartBatchStatus } from '../types';
import StatCard from './StatCard';
import { promptForPassword, formatCurrency } from '../utils';

interface UsedPartReportProps {
    usedParts: UsedPart[];
    deleteUsedPartDisposition: (usedPartId: string, dispositionId: string) => void;
}

// Create a flattened structure for the table
interface FlattenedDisposition extends UsedPartDisposition {
    parentPart: UsedPart;
}

const UsedPartReport: React.FC<UsedPartReportProps> = ({ usedParts, deleteUsedPartDisposition }) => {
    // State for filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UsedPartBatchStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const safeUsedParts = useMemo(() => Array.isArray(usedParts) ? usedParts : [], [usedParts]);

    // Calculate statistics for the StatCards
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

        return { partial: partialBatches, completed: completedBatches, totalSoldValue, totalItemsAwaiting };
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

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, startDate, endDate, itemsPerPage]);

    const handleDelete = (disposition: FlattenedDisposition) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการจัดการนี้?\n\n- ${disposition.dispositionType}: ${disposition.parentPart.name} (จำนวน ${disposition.quantity})`)) {
            deleteUsedPartDisposition(disposition.parentPart.id, disposition.id);
        }
    };

    // Helper function for badge styling
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
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="จำนวนรอจัดการ" value={stats.totalItemsAwaiting} theme="blue" />
                <StatCard title="จัดการบางส่วน (ชุด)" value={stats.partial} theme="yellow" />
                <StatCard title="จัดการครบแล้ว (ชุด)" value={stats.completed} theme="green" />
                <StatCard title="มูลค่าที่ขายได้ทั้งหมด" value={`${formatCurrency(stats.totalSoldValue)} ฿`} theme="green" />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">ค้นหา (ชื่อ, เลขที่ซ่อม, ทะเบียน, ผู้ซื้อ)...</label>
                    <input
                        type="text"
                        placeholder="ค้นหา..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">สถานะ (ของชุดอะไหล่)</label>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="รอจัดการ">รอจัดการ</option>
                        <option value="จัดการบางส่วน">จัดการบางส่วน</option>
                        <option value="จัดการครบแล้ว">จัดการครบแล้ว</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">จากวันที่</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <span>-</span>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">ถึงวันที่</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่จัดการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">การดำเนินการ</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายละเอียด (ผู้ซื้อ/ที่เก็บ/หมายเหตุ)</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">มูลค่า (บาท)</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม)</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedDispositions.map(disp => (
                            <tr key={disp.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(disp.date).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-3 font-semibold">{disp.parentPart.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDispositionBadge(disp.dispositionType)}`}>
                                        {disp.dispositionType}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">{disp.quantity} {disp.parentPart.unit}</td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate" title={getDispositionDetails(disp)}>{getDispositionDetails(disp)}</td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    {disp.dispositionType === 'ขาย' ? formatCurrency((disp.salePricePerUnit || 0) * disp.quantity) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">{disp.parentPart.fromRepairOrderNo}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleDelete(disp)}
                                        className="text-red-500 hover:text-red-700 font-medium text-sm"
                                    >
                                        ลบ
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {paginatedDispositions.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="items-per-page" className="text-sm font-medium">แสดง:</label>
                    <select
                        id="items-per-page"
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        className="p-1 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-700">
                        จาก {filteredDispositions.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
            </div>
        </div>
    );
};

export default UsedPartReport;