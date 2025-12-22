import React, { useState, useMemo, useEffect } from 'react';
import type { Repair, Technician, PartRequisitionItem } from '../types';

interface TechnicianWorkLogProps {
    repairs: Repair[];
    technicians: Technician[];
}

const PartsListModal: React.FC<{ parts: PartRequisitionItem[], onClose: () => void }> = ({ parts, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">รายการอะไหล่ที่ใช้</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
                <ul className="list-disc list-inside space-y-1">
                    {parts.map(part => (
                        <li key={part.partId}>{part.name} ({part.quantity} {part.unit})</li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);

const TechnicianWorkLog: React.FC<TechnicianWorkLogProps> = ({ repairs, technicians }) => {
    const [selectedTechId, setSelectedTechId] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingParts, setViewingParts] = useState<PartRequisitionItem[] | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const filteredRepairs = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.status === 'ซ่อมเสร็จ')
            .filter(r => {
                if (selectedTechId === 'all') return true;
                return r.assignedTechnicianId === selectedTechId || (r.assistantTechnicianIds || []).includes(selectedTechId);
            })
            .filter(r => {
                if (!startDate && !endDate) return true;
                const repairDate = new Date(r.repairEndDate || r.createdAt);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                return (!start || repairDate >= start) && (!end || repairDate <= end);
            })
            .filter(r =>
                searchTerm === '' ||
                r.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.problemDescription.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.repairEndDate || b.createdAt).getTime() - new Date(a.repairEndDate || a.createdAt).getTime());
    }, [repairs, selectedTechId, startDate, endDate, searchTerm]);

    const totalPages = useMemo(() => Math.ceil(filteredRepairs.length / itemsPerPage), [filteredRepairs.length, itemsPerPage]);
    const paginatedRepairs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRepairs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRepairs, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTechId, startDate, endDate, searchTerm, itemsPerPage]);

    const getTechnicianDisplay = (repair: Repair) => {
        if (repair.dispatchType === 'ภายนอก' && repair.externalTechnicianName) {
            return `ซ่อมภายนอก: ${repair.externalTechnicianName}`;
        }

        const mainTechnician = technicians.find(t => t.id === repair.assignedTechnicianId);
        const assistants = technicians.filter(t => (repair.assistantTechnicianIds || []).includes(t.id));

        let display: string[] = [];
        if (mainTechnician) {
            display.push(`ช่าง: ${mainTechnician.name}`);
        }
        if (assistants.length > 0) {
            display.push(`ผู้ช่วย: ${assistants.map(a => a.name).join(', ')}`);
        }

        return display.length > 0 ? display.join(' | ') : 'N/A';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const handleExport = () => {
        const headers = [
            "วันที่ซ่อม", "วันที่ซ่อมเสร็จ", "เลขที่ใบแจ้งซ่อม", "ทะเบียนรถ",
            "ประเภทการซ่อม", "อาการเสีย", "รายการอะไหล่ที่ใช้", "มอบหมายช่าง", "ประเภทการส่งซ่อม"
        ];

        const rows = filteredRepairs.map(r => {
            const partsString = (r.parts || []).map(p => `${p.name} (x${p.quantity})`).join('; ');
            const row = [
                formatDate(r.repairStartDate),
                formatDate(r.repairEndDate),
                `"${r.repairOrderNo}"`,
                `"${r.licensePlate}"`,
                `"${r.repairCategory}"`,
                `"${r.problemDescription.replace(/"/g, '""')}"`,
                `"${partsString.replace(/"/g, '""')}"`,
                `"${getTechnicianDisplay(r)}"`,
                `"${r.dispatchType}"`
            ];
            return row.join(",");
        });

        const csvString = [headers.join(','), ...rows].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "technician_work_log.csv");
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">ค้นหา</label>
                        <input
                            type="text"
                            placeholder="เลขที่ใบซ่อม, ทะเบียนรถ, อาการเสีย..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ช่าง</label>
                        <select
                            value={selectedTechId}
                            onChange={e => setSelectedTechId(e.target.value)}
                            aria-label="เลือกช่าง"
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="all">ช่างทั้งหมด</option>
                            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จากวันที่</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                aria-label="จากวันที่"
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ถึงวันที่</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                aria-label="ถึงวันที่"
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                        ส่งออกเป็น CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ซ่อม / เสร็จ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใบแจ้งซ่อม / ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ / ประเภท</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายการอะไหล่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง / ประเภทส่งซ่อม</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRepairs.map(r => (
                            <tr key={r.id}>
                                <td className="px-4 py-3 align-top">
                                    <div className="text-sm">เริ่ม: {formatDate(r.repairStartDate)}</div>
                                    <div className="text-sm">เสร็จ: {formatDate(r.repairEndDate)}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="font-semibold">{r.repairOrderNo}</div>
                                    <div className="text-sm text-gray-600">{r.licensePlate}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="font-medium text-sm max-w-xs truncate" title={r.problemDescription}>{r.problemDescription}</div>
                                    <div className="text-sm text-gray-600">{r.repairCategory}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    {(r.parts && r.parts.length > 0) ? (
                                        <button onClick={() => setViewingParts(r.parts)} className="text-blue-600 hover:underline text-sm">
                                            ดูรายการ ({r.parts.length})
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-sm">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="text-sm">{getTechnicianDisplay(r)}</div>
                                    <div className="text-sm text-gray-600">{r.dispatchType}</div>
                                </td>
                            </tr>
                        ))}
                        {filteredRepairs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="items-per-page" className="text-sm font-medium">แสดง:</label>
                    <select
                        id="items-per-page"
                        aria-label="จำนวนรายการต่อหน้า"
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        className="p-1 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-700">
                        จาก {filteredRepairs.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="หน้าก่อนหน้า" className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} aria-label="หน้าถัดไป" className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
            </div>

            {viewingParts && <PartsListModal parts={viewingParts} onClose={() => setViewingParts(null)} />}
        </div>
    );
};

export default TechnicianWorkLog;