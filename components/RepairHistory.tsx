
import React, { useState, useMemo } from 'react';
import type { Repair, Technician, StockItem } from '../types';
import VehicleDetailModal from './VehicleDetailModal';
import RepairEditModal from './RepairEditModal';
import { useToast } from '../context/ToastContext';

interface RepairHistoryProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
}

const RepairHistory: React.FC<RepairHistoryProps> = ({ repairs, setRepairs, technicians, stock, setStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
    const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const { addToast } = useToast();
    const [selectedRepairIds, setSelectedRepairIds] = useState<string[]>([]);

    const filteredRepairs = useMemo(() => {
        const completedRepairs = repairs
            .filter(repair => repair.status === 'ซ่อมเสร็จ')
            .sort((a, b) => new Date(b.repairEndDate || b.updatedAt).getTime() - new Date(a.repairEndDate || a.updatedAt).getTime());

        return completedRepairs.filter(repair => {
            const repairDate = new Date(repair.repairEndDate || repair.updatedAt);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if(start) start.setHours(0,0,0,0);
            if(end) end.setHours(23,59,59,999);

            const isDateInRange = (!start || repairDate >= start) && (!end || repairDate <= end);
            
            const isSearchMatch = searchTerm === '' ||
                repair.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.vehicleMake.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase());
            
            return isDateInRange && isSearchMatch;
        });
    }, [repairs, searchTerm, startDate, endDate]);

    const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);
    const paginatedRepairs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRepairs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRepairs, currentPage, itemsPerPage]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const openDetailModal = (repair: Repair) => {
        setSelectedRepair(repair);
        setDetailModalOpen(true);
    };

    const handleSaveRepair = (updatedRepair: Repair) => {
        setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? { ...updatedRepair, updatedAt: new Date().toISOString() } : r));
        setEditingRepair(null);
        addToast(`อัปเดตใบแจ้งซ่อม ${updatedRepair.repairOrderNo} สำเร็จ`, 'success');
    };

    const handleDeleteRepair = (repairId: string, repairOrderNo: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบซ่อม ${repairOrderNo}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            setRepairs(prev => prev.filter(r => r.id !== repairId));
            addToast(`ลบใบแจ้งซ่อม ${repairOrderNo} สำเร็จ`, 'info');
        }
    };

    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return 'N/A';
        return ids.map(id => technicians.find(t => t.id === id)?.name || id.substring(0, 5)).join(', ');
    }
    
    const calculateTotalCost = (repair: Repair) => {
        const repairParts = Array.isArray(repair.parts) ? repair.parts : [];
        const partsTotal = repairParts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0);
        return (repair.repairCost || 0) + partsTotal + (repair.partsVat || 0);
    };

    // New selection handlers
    const handleSelect = (repairId: string) => {
        setSelectedRepairIds(prev =>
            prev.includes(repairId)
                ? prev.filter(id => id !== repairId)
                : [...prev, repairId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const idsToSelect = paginatedRepairs.map(r => r.id);
            setSelectedRepairIds(idsToSelect);
        } else {
            setSelectedRepairIds([]);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedRepairIds.length === 0) return;

        const password = window.prompt("เพื่อยืนยันการลบ โปรดกรอกรหัส: 1234");
        
        if (password === null) { // User clicked cancel
            return;
        }

        if (password === "1234") {
            setRepairs(prev => prev.filter(r => !selectedRepairIds.includes(r.id)));
            addToast(`ลบประวัติการซ่อม ${selectedRepairIds.length} รายการสำเร็จ`, 'success');
            setSelectedRepairIds([]);
        } else {
            addToast("รหัสไม่ถูกต้อง การลบถูกยกเลิก", "error");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ทะเบียน, ยี่ห้อ, รุ่น, เลขที่)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                     <div>
                        <label className="text-sm text-gray-500">จากวันที่ซ่อมเสร็จ:</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-base"/>
                    </div>
                     <div>
                        <label className="text-sm text-gray-500">ถึงวันที่ซ่อมเสร็จ:</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-base"/>
                    </div>
                    <button onClick={handleResetFilters} className="self-end px-4 py-2 text-base font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700">ล้างตัวกรอง</button>
                </div>
            </div>

            {selectedRepairIds.length > 0 && (
                <div className="bg-blue-100 border border-blue-300 p-3 rounded-xl shadow-sm flex justify-between items-center transition-all duration-300">
                    <span className="font-semibold text-blue-800">
                        เลือกแล้ว {selectedRepairIds.length} รายการ
                    </span>
                    <button
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                        ลบทั้งหมด
                    </button>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 w-12">
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    onChange={handleSelectAll}
                                    checked={paginatedRepairs.length > 0 && selectedRepairIds.length === paginatedRepairs.length}
                                    ref={el => {
                                        if (el) {
                                            el.indeterminate = selectedRepairIds.length > 0 && selectedRepairIds.length < paginatedRepairs.length;
                                        }
                                    }}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่แจ้งซ่อม</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่อนุมัติ</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ซ่อมเสร็จ</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / ทะเบียน</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภทการซ่อม</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase">ค่าใช้จ่ายรวม (บาท)</th>
                            <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRepairs.map(repair => (
                            <tr key={repair.id} className={`hover:bg-gray-50 ${selectedRepairIds.includes(repair.id) ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-4">
                                     <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedRepairIds.includes(repair.id)}
                                        onChange={() => handleSelect(repair.id)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-base">{new Date(repair.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-6 py-4 text-base">{repair.approvalDate ? new Date(repair.approvalDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-6 py-4 text-base">{repair.repairEndDate ? new Date(repair.repairEndDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="text-base font-semibold">{repair.licensePlate}</div>
                                    <div className="text-sm text-gray-500">{repair.repairOrderNo}</div>
                                </td>
                                <td className="px-6 py-4 text-base">{repair.repairCategory}</td>
                                <td className="px-6 py-4 text-base">{getTechnicianNames(repair.assignedTechnicians)}</td>
                                <td className="px-6 py-4 text-right text-base font-bold">{calculateTotalCost(repair).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center whitespace-nowrap space-x-2">
                                    <button onClick={() => openDetailModal(repair)} className="text-blue-600 hover:text-blue-800 text-base font-medium">ดู</button>
                                    <button onClick={() => setEditingRepair(repair)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteRepair(repair.id, repair.repairOrderNo)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                         {paginatedRepairs.length === 0 && (
                            <tr>
                                <td colSpan={9} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div>
                    <span className="text-base text-gray-700">
                        แสดง {paginatedRepairs.length} จาก {filteredRepairs.length} รายการ
                    </span>
                </div>
                 <div className="flex items-center gap-4">
                     <span className="text-base text-gray-700">แสดงต่อหน้า:</span>
                     <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="p-2 border border-gray-300 rounded-lg">
                         <option value={20}>20</option>
                         <option value={50}>50</option>
                         <option value={100}>100</option>
                     </select>
                 </div>
                 <div className="flex items-center gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                     <span className="text-base font-semibold">หน้า {currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                 </div>
            </div>

            {isDetailModalOpen && selectedRepair && (
                <VehicleDetailModal 
                    repair={selectedRepair} 
                    allRepairs={repairs} 
                    technicians={technicians} 
                    onClose={() => setDetailModalOpen(false)} 
                />
            )}
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
        </div>
    );
};

export default RepairHistory;