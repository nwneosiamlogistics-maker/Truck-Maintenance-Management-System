import React, { useState, useMemo } from 'react';
import type { UsedPart, UsedPartBatchStatus, UsedPartDisposition } from '../types';
import StatCard from './StatCard';
import UsedPartSaleReceiptModal from './UsedPartSaleReceiptModal';

interface UsedPartReportProps {
    usedParts: UsedPart[];
}

// Flatten dispositions for easier reporting
type ReportableDisposition = UsedPartDisposition & {
    parentPart: UsedPart;
};

const UsedPartReport: React.FC<UsedPartReportProps> = ({ usedParts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UsedPartBatchStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [receiptPart, setReceiptPart] = useState<UsedPart | null>(null);

    const safeUsedParts = useMemo(() => (Array.isArray(usedParts) ? usedParts : []), [usedParts]);

    const { stats, allDispositions } = useMemo(() => {
        const statusCounts: Record<UsedPartBatchStatus, number> = {
            'รอจัดการ': 0,
            'จัดการบางส่วน': 0,
            'จัดการครบแล้ว': 0,
        };
        let totalSaleValue = 0;
        let pendingQuantity = 0;
        const dispositions: ReportableDisposition[] = [];

        for (const part of safeUsedParts) {
            if (part.status in statusCounts) {
                statusCounts[part.status]++;
            }
            const initialQty = part.initialQuantity || 0;
            const disposedQty = (part.dispositions || []).reduce((sum, d) => sum + (d.quantity || 0), 0);
            pendingQuantity += (initialQty - disposedQty);

            for (const disposition of (part.dispositions || [])) {
                if (disposition.dispositionType === 'จำหน่าย') {
                    totalSaleValue += (disposition.salePricePerUnit || 0) * (disposition.quantity || 0);
                }
                dispositions.push({
                    ...disposition,
                    parentPart: part,
                });
            }
        }
        return { 
            stats: { ...statusCounts, totalSaleValue, pendingQuantity },
            allDispositions: dispositions 
        };
    }, [safeUsedParts]);

    const filteredDispositions = useMemo(() => {
        return allDispositions
            .filter(disp => {
                const part = disp.parentPart;
                const dispDate = new Date(disp.date);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                const isDateInRange = (!start || dispDate >= start) && (!end || dispDate <= end);
                const isStatusMatch = statusFilter === 'all' || part.status === statusFilter;
                const isSearchMatch = searchTerm === '' ||
                    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (disp.soldTo && disp.soldTo.toLowerCase().includes(searchTerm.toLowerCase()));
                
                return isDateInRange && isStatusMatch && isSearchMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allDispositions, searchTerm, statusFilter, startDate, endDate]);

    const getDispositionTypeBadge = (type: UsedPartDisposition['dispositionType']) => {
        switch (type) {
            case 'จำหน่าย': return 'bg-green-100 text-green-800';
            case 'ทำลาย': return 'bg-red-100 text-red-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100';
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="จำนวนรอจัดการ" value={stats.pendingQuantity} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="จัดการบางส่วน (ชุด)" value={stats['จัดการบางส่วน']} bgColor="bg-yellow-50" textColor="text-yellow-600" />
                <StatCard title="จัดการครบแล้ว (ชุด)" value={stats['จัดการครบแล้ว']} bgColor="bg-green-50" textColor="text-green-600" />
                <StatCard title="มูลค่าที่ขายได้ทั้งหมด" value={`${stats.totalSaleValue.toLocaleString()} ฿`} bgColor="bg-emerald-50" textColor="text-emerald-600" />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่อ, เลขที่ซ่อม, ทะเบียน, ผู้ซื้อ)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg lg:col-span-2"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="all">ทุกสถานะ (ของชุดอะไหล่)</option>
                        {Object.keys(stats).filter(key => !['totalSaleValue', 'pendingQuantity'].includes(key)).map(status => (
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
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่จัดการ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">การดำเนินการ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้ซื้อ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">มูลค่า (บาท)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDispositions.length > 0 ? filteredDispositions.map(disp => (
                                <tr key={disp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{new Date(disp.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3 font-semibold">{disp.parentPart.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDispositionTypeBadge(disp.dispositionType)}`}>
                                            {disp.dispositionType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{disp.quantity} {disp.parentPart.unit}</td>
                                    <td className="px-4 py-3 text-sm">{disp.soldTo || '-'}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold">
                                        {disp.dispositionType === 'จำหน่าย' ? ((disp.salePricePerUnit || 0) * disp.quantity).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{disp.parentPart.fromRepairOrderNo}</td>
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