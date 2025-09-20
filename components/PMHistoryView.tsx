import React, { useState, useMemo } from 'react';
import type { PMHistory, Technician } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface PMHistoryViewProps {
    history: PMHistory[];
    technicians: Technician[];
    onDelete: (historyId: string) => void;
}

const PMHistoryView: React.FC<PMHistoryViewProps> = ({ history, technicians, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { addToast } = useToast();

    const technicianMap = useMemo(() => new Map(technicians.map(t => [t.id, t.name])), [technicians]);

    const filteredHistory = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return (Array.isArray(history) ? history : [])
            .filter(h => {
                const serviceDate = new Date(h.serviceDate);
                const isDateInRange = (!start || serviceDate >= start) && (!end || serviceDate <= end);
                const isSearchMatch = searchTerm === '' ||
                    h.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    h.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (h.technicianId && technicianMap.get(h.technicianId)?.toLowerCase().includes(searchTerm.toLowerCase()));
                
                return isDateInRange && isSearchMatch;
            })
            .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    }, [history, searchTerm, startDate, endDate, technicianMap]);
    
    const handleDelete = (historyItem: PMHistory) => {
        if(promptForPassword('ลบประวัติ')) {
            onDelete(historyItem.id);
            addToast('ลบประวัติสำเร็จ', 'info');
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (ทะเบียน, แผน, ช่าง)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border rounded-lg"
                />
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">จากวันที่:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg"/>
                </div>
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">ถึงวันที่:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg"/>
                </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">วันที่ทำ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ทะเบียนรถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">แผน</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">เลขไมล์</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ช่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">หมายเหตุ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                        {filteredHistory.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(item.serviceDate).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-3 font-semibold">{item.vehicleLicensePlate}</td>
                                <td className="px-4 py-3">{item.planName}</td>
                                <td className="px-4 py-3 text-right">{item.mileage.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm">{item.technicianId ? technicianMap.get(item.technicianId) || 'N/A' : '-'}</td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate" title={item.notes}>{item.notes || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700">ลบ</button>
                                </td>
                            </tr>
                        ))}
                         {filteredHistory.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-8 text-gray-500">
                                    ไม่พบข้อมูลประวัติ
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PMHistoryView;