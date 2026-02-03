import React, { useState, useMemo } from 'react';
import type { DailyChecklist, RepairFormSeed } from '../types';
import ChecklistDetailModal from './ChecklistDetailModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';

interface DailyChecklistHistoryProps {
    checklists: DailyChecklist[];
    setChecklists: React.Dispatch<React.SetStateAction<DailyChecklist[]>>;
    onNavigateAndCreateRepair: (seedData: RepairFormSeed) => void;
    userRole: string;
}

const DailyChecklistHistory: React.FC<DailyChecklistHistoryProps> = ({ checklists, setChecklists, onNavigateAndCreateRepair, userRole }) => {
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
            .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.inspectionDate).getTime();
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.inspectionDate).getTime();
                return timeB - timeA;
            });
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
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-6 animate-scale-in">
            <div className="flex flex-wrap items-end gap-6">
                <div className="flex-1 min-w-[300px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">ค้นหาประวัติการตรวจเช็ค</label>
                    <div className="relative group">
                        <input
                            type="text"
                            aria-label="Search Checklists"
                            placeholder="พิมพ์ทะเบียนรถ หรือชื่อพนักงาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-6 pr-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-3xl focus:bg-white focus:border-blue-500/50 focus:ring-[12px] focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-700 shadow-inner"
                        />
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="w-44">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">ตั้งแต่วันที่</label>
                        <input
                            type="date"
                            aria-label="Start Date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-3xl outline-none font-black text-xs text-slate-700 focus:bg-white focus:border-blue-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <div className="w-44">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">ถึงวันที่</label>
                        <input
                            type="date"
                            aria-label="End Date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-3xl outline-none font-black text-xs text-slate-700 focus:bg-white focus:border-blue-500/50 transition-all shadow-inner"
                        />
                    </div>
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
                                        {userRole !== 'inspector' && userRole !== 'driver' && (
                                            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                        )}
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
                    userRole={userRole}
                />
            )}
        </div>
    );
};

export default DailyChecklistHistory;
