
import React, { useState, useMemo } from 'react';
import type { Repair, Technician, StockItem, RepairStatus, UsedPart, Priority } from '../types';
import RepairEditModal from './RepairEditModal';
import VehicleDetailModal from './VehicleDetailModal';
import AddUsedPartsModal from './AddUsedPartsModal';
import { useToast } from '../context/ToastContext';

interface RepairListProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    addUsedParts: (parts: Omit<UsedPart, 'id'>[]) => void;
}

const getPriorityValue = (priority: Priority) => {
    switch (priority) {
        case 'ด่วนที่สุด': return 0;
        case 'ด่วน': return 1;
        case 'ปกติ': return 2;
        default: return 3;
    }
};

const RepairList: React.FC<RepairListProps> = ({ repairs, setRepairs, technicians, stock, setStock, addUsedParts }) => {
    const [statusFilter, setStatusFilter] = useState<RepairStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
    const [viewingRepair, setViewingRepair] = useState<Repair | null>(null);
    const [repairForUsedParts, setRepairForUsedParts] = useState<Repair | null>(null);
    const { addToast } = useToast();

    const filteredRepairs = useMemo(() => {
        return repairs
            .filter(r => statusFilter === 'all' || r.status === statusFilter)
            .filter(r => 
                searchTerm === '' ||
                r.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.vehicleMake.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const priorityA = getPriorityValue(a.priority);
                const priorityB = getPriorityValue(b.priority);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // If priorities are the same, sort by newest first
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [repairs, statusFilter, searchTerm]);

    const handleSaveRepair = (updatedRepair: Repair) => {
        const originalStatus = repairs.find(r => r.id === updatedRepair.id)?.status;
        const statusChangedToCompleted = originalStatus !== 'ซ่อมเสร็จ' && updatedRepair.status === 'ซ่อมเสร็จ';

        setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? { ...updatedRepair, updatedAt: new Date().toISOString() } : r));
        setEditingRepair(null);
        addToast(`อัปเดตใบแจ้งซ่อม ${updatedRepair.repairOrderNo} สำเร็จ`, 'success');

        if (statusChangedToCompleted && updatedRepair.parts && updatedRepair.parts.length > 0) {
            setRepairForUsedParts(updatedRepair);
        }
    };
    
    const handleDeleteRepair = (repairId: string, repairOrderNo: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งซ่อม ${repairOrderNo}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            setRepairs(prev => prev.filter(r => r.id !== repairId));
            addToast(`ลบใบแจ้งซ่อม ${repairOrderNo} สำเร็จ`, 'info');
        }
    };

    const handleAddUsedParts = (parts: Omit<UsedPart, 'id'>[]) => {
        addUsedParts(parts);
        setRepairForUsedParts(null);
    };

    const getStatusBadge = (status: RepairStatus) => {
        switch (status) {
            case 'รอซ่อม': return 'bg-gray-200 text-gray-800';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-800';
            case 'รออะไหล่': return 'bg-yellow-100 text-yellow-800';
            case 'ซ่อมเสร็จ': return 'bg-green-100 text-green-800';
            case 'ยกเลิก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return 'N/A';
        return ids.map(id => technicians.find(t => t.id === id)?.name || id.substring(0, 5)).join(', ');
    }
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                     <input
                        type="text"
                        placeholder="ค้นหา (ทะเบียน, เลขที่)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                    />
                    <div>
                        <label className="font-medium text-gray-700 mr-2 text-base">สถานะ:</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                            <option value="all">ทั้งหมด</option>
                            <option value="รอซ่อม">รอซ่อม</option>
                            <option value="กำลังซ่อม">กำลังซ่อม</option>
                            <option value="รออะไหล่">รออะไหล่</option>
                            <option value="ซ่อมเสร็จ">ซ่อมเสร็จ</option>
                            <option value="ยกเลิก">ยกเลิก</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่แจ้ง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRepairs.map(repair => (
                            <tr key={repair.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><div className="font-semibold">{repair.repairOrderNo}</div><div className="text-sm text-gray-500">{repair.licensePlate}</div></td>
                                <td className="px-4 py-3"><div className="font-medium">{repair.vehicleMake} {repair.vehicleModel}</div><div className="text-sm text-gray-500">{repair.vehicleType}</div></td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate">{repair.problemDescription}</td>
                                <td className="px-4 py-3 text-base">{getTechnicianNames(repair.assignedTechnicians)}</td>
                                <td className="px-4 py-3 text-base">{new Date(repair.createdAt).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-3"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(repair.status)}`}>{repair.status}</span></td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button onClick={() => setEditingRepair(repair)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => setViewingRepair(repair)} className="text-blue-600 hover:text-blue-800 text-base font-medium">ดู</button>
                                    <button onClick={() => handleDeleteRepair(repair.id, repair.repairOrderNo)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                         {filteredRepairs.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
            
            {editingRepair && (
                <RepairEditModal 
                    repair={editingRepair}
                    onSave={handleSaveRepair}
                    onClose={() => setEditingRepair(null)}
                    technicians={technicians}
                    stock={stock}
                    setStock={setStock}
                />
            )}
            {viewingRepair && (
                <VehicleDetailModal
                    repair={viewingRepair}
                    allRepairs={repairs}
                    technicians={technicians}
                    onClose={() => setViewingRepair(null)}
                />
            )}
            {repairForUsedParts && (
                <AddUsedPartsModal
                    repair={repairForUsedParts}
                    onSave={handleAddUsedParts}
                    onClose={() => setRepairForUsedParts(null)}
                />
            )}
        </div>
    );
};

export default RepairList;
