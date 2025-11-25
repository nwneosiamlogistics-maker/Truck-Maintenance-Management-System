
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

    // Helper to analyze compliance
    const analyzeCompliance = (item: PMHistory) => {
        if (!item.targetServiceDate && !item.targetMileage) return null;

        const DATE_TOLERANCE_DAYS = 7;
        const MILEAGE_TOLERANCE_KM = 2000;

        let dateDiff = 0;
        let mileageDiff = 0;
        let isDateCompliant = true;
        let isMileageCompliant = true;

        const actualDate = new Date(item.serviceDate);
        
        if (item.targetServiceDate) {
            const targetDate = new Date(item.targetServiceDate);
            const diffTime = actualDate.getTime() - targetDate.getTime();
            dateDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isDateCompliant = Math.abs(dateDiff) <= DATE_TOLERANCE_DAYS;
        }

        if (item.targetMileage) {
            mileageDiff = item.mileage - item.targetMileage;
            isMileageCompliant = Math.abs(mileageDiff) <= MILEAGE_TOLERANCE_KM;
        }

        // Logic: If either condition is met (or only one exists and is met), we consider it compliant/on-track.
        // We prioritize the one that triggered the service usually, but for simple visualization:
        // Green if ANY criteria is met within tolerance.
        // Red/Yellow if ALL available targets are missed.
        
        const hasTargetDate = !!item.targetServiceDate;
        const hasTargetMileage = !!item.targetMileage;
        
        let status: 'on-track' | 'deviated' = 'deviated';
        
        if (hasTargetDate && hasTargetMileage) {
            if (isDateCompliant || isMileageCompliant) status = 'on-track';
        } else if (hasTargetDate) {
            if (isDateCompliant) status = 'on-track';
        } else if (hasTargetMileage) {
            if (isMileageCompliant) status = 'on-track';
        }

        return {
            status,
            dateDiff,
            mileageDiff,
            hasTargetDate,
            hasTargetMileage
        };
    };

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
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">ผลการประเมิน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ช่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">หมายเหตุ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                        {filteredHistory.map(item => {
                            const compliance = analyzeCompliance(item);
                            return (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(item.serviceDate).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-3 font-semibold">{item.vehicleLicensePlate}</td>
                                <td className="px-4 py-3">{item.planName}</td>
                                <td className="px-4 py-3 text-right">{item.mileage.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                    {compliance ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${compliance.status === 'on-track' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {compliance.status === 'on-track' ? 'ตรงตามแผน' : 'คลาดเคลื่อน'}
                                            </span>
                                            <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                                                {compliance.hasTargetDate && (
                                                    <div title="ส่วนต่างวัน (เกณฑ์ +/- 7 วัน)">
                                                        {compliance.dateDiff > 0 ? `+${compliance.dateDiff}` : compliance.dateDiff} วัน
                                                    </div>
                                                )}
                                                {compliance.hasTargetMileage && (
                                                    <div title="ส่วนต่างกิโลเมตร (เกณฑ์ +/- 2000 กม.)">
                                                        {compliance.mileageDiff > 0 ? `+${compliance.mileageDiff.toLocaleString()}` : compliance.mileageDiff.toLocaleString()} กม.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm">{item.technicianId ? technicianMap.get(item.technicianId) || 'N/A' : '-'}</td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate" title={item.notes}>{item.notes || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700">ลบ</button>
                                </td>
                            </tr>
                        )})}
                         {filteredHistory.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center p-8 text-gray-500">
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
