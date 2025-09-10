import React, { useState, useMemo } from 'react';
import type { Repair, Technician } from '../types';
import VehicleDetailModal from './VehicleDetailModal';
import RepairEditModal from './RepairEditModal';

interface RepairListProps {
    repairs: Repair[];
    technicians: Technician[];
    updateRepair: (repair: Repair) => void;
    deleteRepair: (repairId: string) => void;
}

const RepairList: React.FC<RepairListProps> = ({ repairs, technicians, updateRepair, deleteRepair }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);

    const filteredRepairs = useMemo(() => {
        return repairs
            .filter(repair => statusFilter === 'all' || repair.status === statusFilter)
            .filter(repair => priorityFilter === 'all' || repair.priority === priorityFilter)
            .filter(repair =>
                repair.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.vehicleMake.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [repairs, searchTerm, statusFilter, priorityFilter]);

    const getStatusBadge = (status: Repair['status']) => {
        switch (status) {
            case 'รอซ่อม': return 'bg-gray-200 text-gray-800';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-800';
            case 'รออะไหล่': return 'bg-yellow-100 text-yellow-800';
            case 'ซ่อมเสร็จ': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const getPriorityBadge = (priority: Repair['priority']) => {
        switch (priority) {
            case 'ฉุกเฉิน': return 'border-red-500 text-red-600';
            case 'เร่งด่วน': return 'border-yellow-500 text-yellow-600';
            case 'ปกติ': return 'border-green-500 text-green-600';
            default: return 'border-gray-400 text-gray-500';
        }
    };

    const openDetailModal = (repair: Repair) => {
        setSelectedRepair(repair);
        setDetailModalOpen(true);
    };

    const openEditModal = (repair: Repair) => {
        setSelectedRepair(repair);
        setEditModalOpen(true);
    };

    const handleUpdateRepair = (updatedRepair: Repair) => {
        updateRepair(updatedRepair);
        setEditModalOpen(false);
        setSelectedRepair(null);
    };

    const getTechnicianName = (id: string) => technicians.find(t => t.id === id)?.name || 'N/A';
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ทะเบียน, ยี่ห้อ, รุ่น, เลขที่)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base">
                        <option value="all">สถานะทั้งหมด</option>
                        <option value="รอซ่อม">รอซ่อม</option>
                        <option value="กำลังซ่อม">กำลังซ่อม</option>
                        <option value="รออะไหล่">รออะไหล่</option>
                        <option value="ซ่อมเสร็จ">ซ่อมเสร็จ</option>
                    </select>
                     <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base">
                        <option value="all">ความสำคัญทั้งหมด</option>
                        <option value="ปกติ">ปกติ</option>
                        <option value="เร่งด่วน">เร่งด่วน</option>
                        <option value="ฉุกเฉิน">ฉุกเฉิน</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / ทะเบียน</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ยี่ห้อ / รุ่น</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                             <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ความสำคัญ</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRepairs.map(repair => (
                            <tr key={repair.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="text-base font-semibold text-blue-600 cursor-pointer" onClick={() => openDetailModal(repair)}>{repair.licensePlate}</div>
                                    <div className="text-sm text-gray-500">{repair.repairOrderNo}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-base">{repair.vehicleMake} {repair.vehicleModel}</div>
                                    <div className="text-sm text-gray-500">{repair.vehicleType}</div>
                                </td>
                                <td className="px-6 py-4 text-base max-w-xs truncate">{repair.problemDescription}</td>
                                <td className="px-6 py-4"><span className={`px-3 py-1 text-sm font-semibold rounded-full border-2 ${getPriorityBadge(repair.priority)}`}>{repair.priority}</span></td>
                                <td className="px-6 py-4"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(repair.status)}`}>{repair.status}</span></td>
                                <td className="px-6 py-4 text-base">{getTechnicianName(repair.assignedTechnician)}</td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => openEditModal(repair)} className="text-blue-600 hover:text-blue-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => deleteRepair(repair.id)} className="text-red-600 hover:text-red-800 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isDetailModalOpen && selectedRepair && (
                <VehicleDetailModal 
                    repair={selectedRepair} 
                    allRepairs={repairs} 
                    technicians={technicians} 
                    onClose={() => setDetailModalOpen(false)} 
                />
            )}

            {isEditModalOpen && selectedRepair && (
                <RepairEditModal 
                    repair={selectedRepair} 
                    technicians={technicians} 
                    onSave={handleUpdateRepair} 
                    onClose={() => setEditModalOpen(false)} 
                />
            )}

        </div>
    );
};

export default RepairList;