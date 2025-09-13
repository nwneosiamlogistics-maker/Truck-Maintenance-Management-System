import React, { useState, useMemo } from 'react';
import type { UsedPart, UsedPartStatus } from '../types';
import StatCard from './StatCard';
import UsedPartSaleReceiptModal from './UsedPartSaleReceiptModal';

interface UsedPartReportProps {
    usedParts: UsedPart[];
}

const UsedPartReport: React.FC<UsedPartReportProps> = ({ usedParts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UsedPartStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [receiptPart, setReceiptPart] = useState<UsedPart | null>(null);

    const safeUsedParts = useMemo(() => (Array.isArray(usedParts) ? usedParts : []), [usedParts]);

    const stats = useMemo(() => {
        const statusCounts: Record<UsedPartStatus, number> = {
            'รอจำหน่าย': 0,
            'รอทำลาย': 0,
            'เก็บไว้ใช้ต่อ': 0,
            'จำหน่ายแล้ว': 0,
            'ทำลายแล้ว': 0,
        };
        let totalSaleValue = 0;

        for (const part of safeUsedParts) {
            if (part.status in statusCounts) {
                statusCounts[part.status]++;
            }
            if (part.status === 'จำหน่ายแล้ว' && typeof part.salePrice === 'number') {
                totalSaleValue += part.salePrice;
            }
        }
        return { statusCounts, totalSaleValue };
    }, [safeUsedParts]);

    const filteredParts = useMemo(() => {
        return safeUsedParts
            .filter(part => {
                const partDate = new Date(part.dateRemoved);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                const isDateInRange = (!start || partDate >= start) && (!end || partDate <= end);
                const isStatusMatch = statusFilter === 'all' || part.status === statusFilter;
                const isSearchMatch = searchTerm === '' ||
                    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase());
                
                return isDateInRange && isStatusMatch && isSearchMatch;
            })
            .sort((a, b) => new Date(b.dateRemoved).getTime() - new Date(a.dateRemoved).getTime());
    }, [safeUsedParts, searchTerm, statusFilter, startDate, endDate]);

    const getStatusBadge = (status: UsedPartStatus) => {
        switch (status) {
            case 'รอจำหน่าย': return 'bg-blue-100 text-blue-800';
            case 'รอทำลาย': return 'bg-orange-100 text-orange-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            case 'จำหน่ายแล้ว': return 'bg-green-100 text-green-800';
            case 'ทำลายแล้ว': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100';
        }
    };
    
    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard title="รอจำหน่าย" value={stats.statusCounts['รอจำหน่าย']} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="รอทำลาย" value={stats.statusCounts['รอทำลาย']} bgColor="bg-orange-50" textColor="text-orange-600" />
                <StatCard title="เก็บไว้ใช้ต่อ" value={stats.statusCounts['เก็บไว้ใช้ต่อ']} bgColor="bg-purple-50" textColor="text-purple-600" />
                <StatCard title="จำหน่ายแล้ว" value={stats.statusCounts['จำหน่ายแล้ว']} bgColor="bg-green-50" textColor="text-green-600" />
                <StatCard title="ทำลายแล้ว" value={stats.statusCounts['ทำลายแล้ว']} bgColor="bg-gray-200" textColor="text-gray-700" />
                <StatCard title="มูลค่าที่ขายได้" value={`${stats.totalSaleValue.toLocaleString()} ฿`} bgColor="bg-emerald-50" textColor="text-emerald-600" />
            </div>

            {/* Filters and Table */}
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่อ, เลขที่ซ่อม, ทะเบียน)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg lg:col-span-2"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="all">ทุกสถานะ</option>
                        {Object.keys(stats.statusCounts).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                     <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        <span>-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ถอด</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม/ทะเบียน)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้ซื้อ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคาขาย (บาท)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredParts.length > 0 ? filteredParts.map(part => (
                                <tr key={part.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{new Date(part.dateRemoved).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3 font-semibold">{part.name}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{part.fromRepairOrderNo}</div>
                                        <div className="text-sm text-gray-500">{part.fromLicensePlate}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(part.status)}`}>
                                            {part.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{part.soldTo || '-'}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold">{part.salePrice?.toLocaleString() || '-'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {part.status === 'จำหน่ายแล้ว' && (
                                            <button 
                                                onClick={() => setReceiptPart(part)} 
                                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                พิมพ์ใบขาย
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500">
                                        ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {receiptPart && <UsedPartSaleReceiptModal part={receiptPart} onClose={() => setReceiptPart(null)} />}
        </div>
    );
};

export default UsedPartReport;