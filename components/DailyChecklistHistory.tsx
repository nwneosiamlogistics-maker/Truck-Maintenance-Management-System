import React, { useState, useMemo } from 'react';
import type { DailyChecklist, RepairFormSeed } from '../types';
import ChecklistDetailModal from './ChecklistDetailModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';

interface DailyChecklistHistoryProps {
    checklists: DailyChecklist[];
    setChecklists: React.Dispatch<React.SetStateAction<DailyChecklist[]>>;
    onNavigateAndCreateRepair: (seedData: RepairFormSeed) => void;
}

const DailyChecklistHistory: React.FC<DailyChecklistHistoryProps> = ({ checklists, setChecklists, onNavigateAndCreateRepair }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [viewingChecklist, setViewingChecklist] = useState<DailyChecklist | null>(null);
    const { addToast } = useToast();

    const filteredChecklists = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return (Array.isArray(checklists) ? checklists : [])
            .filter(c => {
                const inspectionDate = new Date(c.inspectionDate);
                const isDateInRange = (!start || inspectionDate >= start) && (!end || inspectionDate <= end);
                const isSearchMatch = searchTerm === '' ||
                    c.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.reporterName.toLowerCase().includes(searchTerm.toLowerCase());

                return isDateInRange && isSearchMatch;
            })
            .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
    }, [checklists, searchTerm, startDate, endDate]);

    const getOverallStatus = (checklist: DailyChecklist) => {
        const hasAbnormal = Object.values(checklist.items).some(item =>
            item.status.includes('ไม่ปกติ') || item.status.includes('ชำรุด') || item.status.includes('ไม่ดัง') || item.status.includes('ไม่ติด') || item.status.includes('มีรอยบุบ') || item.status.includes('มีเสียที่')
        );
        return hasAbnormal
            ? { text: 'พบข้อบกพร่อง', className: 'bg-red-100 text-red-800' }
            : { text: 'ปกติทั้งหมด', className: 'bg-green-100 text-green-800' };
    };

    const handleDelete = async (id: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยัน', 'คุณแน่ใจหรือไม่ว่าต้องการลบใบตรวจเช็คนี้?', 'ลบ');
            if (confirmed) {
                setChecklists(prev => prev.filter(c => c.id !== id));
                addToast('ลบใบตรวจเช็คสำเร็จ', 'info');
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    aria-label="Search Checklists"
                    placeholder="ค้นหา (ทะเบียน, ผู้ตรวจ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-lg md:col-span-1"
                />
                <div className="flex items-center gap-2 md:col-span-2">
                    <label className="text-sm font-medium">วันที่ตรวจ:</label>
                    <input type="date" aria-label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                    <span>-</span>
                    <input type="date" aria-label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">วันที่ตรวจ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ทะเบียนรถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ผู้รายงาน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">สรุปผล</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                        {filteredChecklists.map(c => {
                            const status = getOverallStatus(c);
                            return (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{new Date(c.inspectionDate).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3 font-semibold">{c.vehicleLicensePlate}</td>
                                    <td className="px-4 py-3 text-sm">{c.reporterName}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.className}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <button onClick={() => setViewingChecklist(c)} className="text-blue-600 hover:text-blue-800 font-medium">ดูรายละเอียด</button>
                                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filteredChecklists.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-500">ไม่พบประวัติการตรวจเช็ค</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {viewingChecklist && (
                <ChecklistDetailModal
                    checklist={viewingChecklist}
                    onClose={() => setViewingChecklist(null)}
                    onNavigateAndCreateRepair={onNavigateAndCreateRepair}
                />
            )}
        </div>
    );
};

export default DailyChecklistHistory;
