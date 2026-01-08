import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import type { Repair, Technician, RepairStatus, StockItem, UsedPart, Supplier, StockTransaction } from '../types';
import RepairEditModal from './RepairEditModal';
import VehicleDetailModal from './VehicleDetailModal';
import AddUsedPartsModal from './AddUsedPartsModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, formatDateTime24h } from '../utils';
import { Download } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';
// // import { sendRepairStatusLineNotification } from '../utils/lineService';
import { sendRepairStatusTelegramNotification } from '../utils/telegramService';

interface RepairListProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    addUsedParts: (parts: Omit<UsedPart, 'id'>[]) => void;
    updateFungibleStock: (updates: { stockItemId: string, quantity: number, repairOrderNo: string }[]) => void;
    usedParts: UsedPart[];
    suppliers: Supplier[];
}

const RepairList: React.FC<RepairListProps> = ({ repairs, setRepairs, technicians, stock, setStock, transactions, setTransactions, addUsedParts, updateFungibleStock, usedParts, suppliers }) => {
    const [statusFilter, setStatusFilter] = useState<RepairStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
    const [viewingRepair, setViewingRepair] = useState<Repair | null>(null);
    const [addUsedPartsRepair, setAddUsedPartsRepair] = useState<Repair | null>(null);
    const { addToast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const handleExport = () => {
        const exportData = activeRepairs.map(r => ({
            'เลขที่ใบสั่งซ่อม': r.repairOrderNo,
            'ทะเบียนรถ': r.licensePlate,
            'ประเภทรถ': r.vehicleType,
            'สถานะ': r.status,
            'ความเร่งด่วน': r.priority,
            'อาการเสีย': r.problemDescription,
            'หมวดหมู่': r.repairCategory,
            'ช่างที่รับผิดชอบ': technicians.find(t => t.id === r.assignedTechnicianId)?.name || r.externalTechnicianName || '-',
            'วันที่แจ้ง': r.createdAt,
            'วันที่เริ่มซ่อม': r.repairStartDate || '-',
            'วันที่เสร็จ': r.repairEndDate || '-'
        }));
        exportToCSV('Maintenance_Repairs_List', exportData);
    };

    const activeRepairs = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.status !== 'ซ่อมเสร็จ' && r.status !== 'ยกเลิก')
            .filter(r => statusFilter === 'all' || r.status === statusFilter)
            .filter(r =>
                searchTerm === '' ||
                r.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.problemDescription.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const priorityOrder = { 'ด่วนที่สุด': 0, 'ด่วน': 1, 'ปกติ': 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            });
    }, [repairs, statusFilter, searchTerm]);

    const totalPages = useMemo(() => Math.ceil(activeRepairs.length / itemsPerPage), [activeRepairs.length, itemsPerPage]);
    const paginatedRepairs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return activeRepairs.slice(startIndex, startIndex + itemsPerPage);
    }, [activeRepairs, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, itemsPerPage]);

    const handleSaveRepair = (updatedRepair: Repair) => {
        const originalRepair = repairs.find(r => r.id === updatedRepair.id);

        setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? { ...updatedRepair, updatedAt: new Date().toISOString() } : r));
        setEditingRepair(null);
        addToast(`อัปเดตใบแจ้งซ่อม ${updatedRepair.repairOrderNo} สำเร็จ`, 'success');

        // 🔥 Intensive Update: Send Telegram if status changed via Modal
        if (originalRepair && originalRepair.status !== updatedRepair.status) {
            sendRepairStatusTelegramNotification(originalRepair, originalRepair.status, updatedRepair.status);
        }

        if (originalRepair?.status !== 'ซ่อมเสร็จ' && updatedRepair.status === 'ซ่อมเสร็จ') {
            const hasParts = updatedRepair.parts && updatedRepair.parts.length > 0;
            const hasLoggedUsedParts = (Array.isArray(usedParts) ? usedParts : []).some(up => up.fromRepairId === updatedRepair.id);
            if (hasParts && !hasLoggedUsedParts) {
                setAddUsedPartsRepair(updatedRepair);
            }
        }
    };

    const handleDeleteRepair = async (repairId: string, repairOrderNo: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งซ่อม ${repairOrderNo}?`, 'ลบ');
            if (confirmed) {
                setRepairs(prev => prev.filter(r => r.id !== repairId));
                addToast(`ลบใบแจ้งซ่อม ${repairOrderNo} สำเร็จ`, 'info');
            }
        }
    };

    const handleQuickStatusUpdate = async (repair: Repair, newStatus: RepairStatus) => {
        const now = new Date();
        const nowDate = now.toISOString().split('T')[0];
        const nowTime = now.toTimeString().slice(0, 5);

        const { value: selectedDateTime } = await Swal.fire({
            title: `<div class="text-2xl font-bold mb-2">ยืนยันสถานะ: ${newStatus}</div>`,
            html: `
                <div class="text-left space-y-4 font-sans">
                    <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <p class="text-sm text-blue-800 font-medium flex justify-between">
                            <span>เลขที่ใบแจ้งซ่อม:</span>
                            <span class="font-bold font-mono">${repair.repairOrderNo}</span>
                        </p>
                        <p class="text-sm text-blue-800 font-medium flex justify-between mt-1">
                            <span>ทะเบียนรถ:</span>
                            <span class="font-bold">${repair.licensePlate}</span>
                        </p>
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex-1 space-y-2">
                            <label class="block text-sm font-bold text-gray-700">วันที่:</label>
                            <input id="swal-input-date" type="date" class="swal2-input !m-0 !w-full !rounded-xl !border-gray-200 !text-sm" value="${nowDate}">
                        </div>
                        <div class="w-36 space-y-2">
                            <label class="block text-sm font-bold text-gray-700">เวลา:</label>
                            <input id="swal-input-time" type="time" class="swal2-input !m-0 !w-full !rounded-xl !border-gray-200 !text-sm" value="${nowTime}">
                        </div>
                    </div>
                    <p class="text-xs text-gray-400 mt-2 italic text-center">* คุณสามารถแก้ไขวันย้อนหลังหากบันทึกล่าช้า</p>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันบันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                const dateInput = document.getElementById('swal-input-date') as HTMLInputElement;
                const timeInput = document.getElementById('swal-input-time') as HTMLInputElement;
                if (!dateInput.value || !timeInput.value) {
                    Swal.showValidationMessage('กรุณาระบุทั้งวันที่และเวลา');
                    return false;
                }
                return `${dateInput.value}T${timeInput.value}`;
            },
            customClass: {
                popup: 'rounded-[2rem]',
                confirmButton: 'rounded-xl font-bold px-8 py-3',
                cancelButton: 'rounded-xl font-bold px-8 py-3'
            }
        });

        if (selectedDateTime) {
            const timestamp = new Date(selectedDateTime).toISOString();
            const updatedRepair = { ...repair, status: newStatus, updatedAt: new Date().toISOString() };

            if (newStatus === 'กำลังซ่อม') {
                updatedRepair.repairStartDate = timestamp;
            } else if (newStatus === 'ซ่อมเสร็จ') {
                updatedRepair.repairEndDate = timestamp;
            }

            setRepairs(prev => prev.map(r => r.id === repair.id ? updatedRepair : r));
            addToast(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');

            const hasParts = updatedRepair.parts && updatedRepair.parts.length > 0;
            const hasLoggedUsedParts = (Array.isArray(usedParts) ? usedParts : []).some(up => up.fromRepairId === updatedRepair.id);

            if (hasParts && !hasLoggedUsedParts) {
                setAddUsedPartsRepair(updatedRepair);
            }
        }

        // Send Telegram Notification
        sendRepairStatusTelegramNotification(repair, repair.status, newStatus);
    }

    const getStatusBadge = (status: RepairStatus) => {
        switch (status) {
            case 'รอซ่อม': return 'bg-gray-200 text-gray-800';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-800';
            case 'รออะไหล่': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100';
        }
    };

    const getTechnicianDisplay = (repair: Repair, technicians: Technician[]) => {
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

        return display.length > 0 ? display.join(' | ') : 'ยังไม่มอบหมาย';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <input
                        type="text"
                        aria-label="ค้นหาใบแจ้งซ่อม"
                        placeholder="ค้นหา (ทะเบียน, เลขที่, อาการ)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 p-2 border border-gray-300 rounded-lg text-base"
                    />
                    <select aria-label="กรองสถานะ" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                        <option value="all">สถานะทั้งหมด</option>
                        <option value="รอซ่อม">รอซ่อม</option>
                        <option value="กำลังซ่อม">กำลังซ่อม</option>
                        <option value="รออะไหล่">รออะไหล่</option>
                    </select>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
                >
                    <Download size={18} />
                    ส่งออก CSV (Export)
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่แจ้ง / คาดว่าจะเสร็จ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRepairs.map(repair => (
                            <tr key={repair.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><div className="font-semibold">{repair.repairOrderNo}</div><div className="text-sm text-gray-500">{repair.licensePlate}</div></td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate" title={repair.problemDescription}>{repair.problemDescription}</td>
                                <td className="px-4 py-3 text-sm">{getTechnicianDisplay(repair, technicians)}</td>
                                <td className="px-4 py-3 text-sm"><div>แจ้ง: {formatDateTime24h(repair.createdAt)}</div><div>เสร็จ: {formatDateTime24h(repair.estimations[repair.estimations.length - 1]?.estimatedEndDate)}</div></td>
                                <td className="px-4 py-3"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(repair.status)}`}>{repair.status}</span></td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <div className="flex flex-col gap-1 items-center">
                                        <div className="flex gap-2">
                                            {repair.status === 'รอซ่อม' && (
                                                !(repair.assignedTechnicianId || repair.externalTechnicianName) ? (
                                                    <button onClick={() => setEditingRepair(repair)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 border border-gray-300">
                                                        👤 มอบหมายช่าง
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleQuickStatusUpdate(repair, 'กำลังซ่อม')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                                                        🛠️ เริ่มเข้าซ่อม
                                                    </button>
                                                )
                                            )}
                                            {repair.status === 'กำลังซ่อม' && (
                                                <>
                                                    <button onClick={() => handleQuickStatusUpdate(repair, 'รออะไหล่')} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm transition-all active:scale-95">
                                                        📦 รออะไหล่
                                                    </button>
                                                    <button onClick={() => handleQuickStatusUpdate(repair, 'ซ่อมเสร็จ')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all active:scale-95">
                                                        ✅ ซ่อมเสร็จ
                                                    </button>
                                                </>
                                            )}
                                            {repair.status === 'รออะไหล่' && (
                                                <button onClick={() => handleQuickStatusUpdate(repair, 'กำลังซ่อม')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                                                    ⚙️ กลับมาซ่อมต่อ
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-3 mt-1 items-center">
                                            <button onClick={() => setEditingRepair(repair)} className="text-gray-500 hover:text-yellow-600 text-xs font-medium underline">แก้ไข</button>
                                            <button onClick={() => setViewingRepair(repair)} className="text-gray-500 hover:text-blue-600 text-xs font-medium underline">ดู</button>
                                            <button onClick={() => handleDeleteRepair(repair.id, repair.repairOrderNo)} className="text-gray-400 hover:text-red-500 text-xs font-medium underline">ลบ</button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedRepairs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">ไม่พบใบแจ้งซ่อม</td>
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
                        aria-label="Items per page"
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        className="p-1 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-gray-700">
                        จาก {activeRepairs.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
            </div>

            {editingRepair && <RepairEditModal repair={editingRepair} onSave={handleSaveRepair} onClose={() => setEditingRepair(null)} technicians={technicians} stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} suppliers={suppliers} />}
            {viewingRepair && <VehicleDetailModal repair={viewingRepair} allRepairs={repairs} technicians={technicians} onClose={() => setViewingRepair(null)} />}
            {addUsedPartsRepair && <AddUsedPartsModal repair={addUsedPartsRepair} onSaveIndividual={addUsedParts} onSaveFungible={updateFungibleStock} stock={stock} onClose={() => setAddUsedPartsRepair(null)} />}
        </div>
    );
};

export default RepairList;