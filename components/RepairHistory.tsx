import React, { useState, useMemo, useEffect } from 'react';
import type { Repair, Technician, StockItem, RepairStatus, UsedPart, Supplier, StockTransaction, PartRequisitionItem, RepairCategoryMaster } from '../types';
import RepairEditModal from './RepairEditModal';
import VehicleDetailModal from './VehicleDetailModal';
import AddUsedPartsModal from './AddUsedPartsModal';
import RepairTimelineModal from './RepairTimelineModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, formatCurrency } from '../utils';

interface RepairHistoryProps {
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
    repairCategories: RepairCategoryMaster[];
}

const RepairHistory: React.FC<RepairHistoryProps> = ({ repairs, setRepairs, technicians, stock, setStock, transactions, setTransactions, addUsedParts, updateFungibleStock, suppliers, usedParts, repairCategories }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
    const [addUsedPartsRepair, setAddUsedPartsRepair] = useState<Repair | null>(null);
    const [viewingRepair, setViewingRepair] = useState<Repair | null>(null);
    const [viewingTimelineRepair, setViewingTimelineRepair] = useState<Repair | null>(null);
    const { addToast } = useToast();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRepairIds, setExpandedRepairIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const toggleExpand = (repairId: string) => {
        setExpandedRepairIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(repairId)) {
                newSet.delete(repairId);
            } else {
                newSet.add(repairId);
            }
            return newSet;
        });
    };

    const filteredRepairs = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => ['ซ่อมเสร็จ', 'ยกเลิก'].includes(r.status))
            .filter(r => {
                const repairDate = new Date(r.repairEndDate || r.createdAt);
                return (!start || repairDate >= start) && (!end || repairDate <= end);
            })
            .filter(r =>
                searchTerm === '' ||
                r.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.problemDescription.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.repairEndDate || b.createdAt).getTime() - new Date(a.repairEndDate || a.createdAt).getTime());
    }, [repairs, searchTerm, startDate, endDate]);

    const totalPages = useMemo(() => Math.ceil(filteredRepairs.length / itemsPerPage), [filteredRepairs.length, itemsPerPage]);
    const paginatedRepairs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRepairs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRepairs, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, itemsPerPage]);

    const handleSaveRepair = (updatedRepair: Repair) => {
        setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? { ...updatedRepair, updatedAt: new Date().toISOString() } : r));
        setEditingRepair(null);
        addToast(`อัปเดตใบแจ้งซ่อม ${updatedRepair.repairOrderNo} สำเร็จ`, 'success');

        if (updatedRepair.status === 'ซ่อมเสร็จ' && updatedRepair.parts && updatedRepair.parts.length > 0) {

            const existingUsedPartOriginalIds = new Set(
                (Array.isArray(usedParts) ? usedParts : [])
                    .filter(up => up.fromRepairId === updatedRepair.id)
                    .map(up => up.originalPartId)
            );

            const newPartsToLog = updatedRepair.parts.filter(
                part => !existingUsedPartOriginalIds.has(part.partId)
            );

            if (newPartsToLog.length > 0) {
                setAddUsedPartsRepair(updatedRepair);
            }
        }
    };

    const handleDeleteRepair = async (repairId: string, repairOrderNo: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งซ่อม ${repairOrderNo}? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบ');
            if (confirmed) {
                setRepairs(prev => prev.filter(r => r.id !== repairId));
                addToast(`ลบใบแจ้งซ่อม ${repairOrderNo} สำเร็จ`, 'info');
            }
        }
    };

    const getStatusBadge = (status: RepairStatus) => {
        switch (status) {
            case 'ซ่อมเสร็จ': return 'bg-green-100 text-green-800';
            case 'ยกเลิก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

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

    const calculateTotalCost = (repair: Repair) => {
        const partsCost = (repair.parts || []).reduce((sum, part) => {
            return sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
        }, 0);
        const laborCost = Number(repair.repairCost) || 0;
        const vat = Number(repair.partsVat) || 0;
        return partsCost + laborCost + vat;
    };


    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                <input
                    type="text"
                    aria-label="ค้นหาประวัติการซ่อม"
                    placeholder="ค้นหา (ทะเบียน, เลขที่, อาการ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-80 p-2 border border-gray-300 rounded-lg text-base"
                />
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">วันที่ซ่อมเสร็จ:</label>
                    <input type="date" aria-label="จากวันที่" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg" />
                    <span>-</span>
                    <input type="date" aria-label="ถึงวันที่" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg" />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center"></th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่เสร็จสิ้น</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRepairs.map(repair => (
                            <React.Fragment key={repair.id}>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleExpand(repair.id)} className="text-blue-500 hover:text-blue-700 font-bold text-lg w-6 h-6 rounded-full flex items-center justify-center">
                                            {expandedRepairIds.has(repair.id) ? '−' : '+'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3"><div className="font-semibold">{repair.repairOrderNo}</div><div className="text-sm text-gray-500">{repair.licensePlate}</div></td>
                                    <td className="px-4 py-3 text-sm max-w-xs truncate">{repair.problemDescription}</td>
                                    <td className="px-4 py-3 text-sm">{getTechnicianDisplay(repair)}</td>
                                    <td className="px-4 py-3 text-base">{new Date(repair.repairEndDate || repair.createdAt).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(repair.status)}`}>{repair.status}</span></td>
                                    <td className="px-4 py-3 text-center space-x-2 flex justify-center items-center">
                                        <button onClick={() => setViewingTimelineRepair(repair)} className="text-purple-600 hover:text-purple-800 transition-transform hover:scale-110 p-1" title="ดู Timeline">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </button>
                                        <button onClick={async () => {
                                            if (await promptForPasswordAsync('แก้ไข')) {
                                                setEditingRepair(repair);
                                            }
                                        }} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                        <button onClick={() => setViewingRepair(repair)} className="text-blue-600 hover:text-blue-800 text-base font-medium">ดู</button>
                                        <button onClick={() => handleDeleteRepair(repair.id, repair.repairOrderNo)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                    </td>
                                </tr>
                                {expandedRepairIds.has(repair.id) && (
                                    <tr>
                                        <td colSpan={7} className="p-0 bg-gray-50">
                                            <div className="p-4 mx-4 my-2 border-l-4 border-blue-400 bg-blue-50 rounded-r-lg">
                                                <h4 className="font-semibold mb-2 text-gray-700 text-base">รายละเอียดการซ่อม:</h4>
                                                <table className="min-w-full bg-white rounded-lg shadow-inner">
                                                    <thead className="bg-gray-200">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">ชื่ออะไหล่</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">จำนวน</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">ที่มา</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">ผู้จำหน่าย</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">รวม (บาท)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {(repair.parts && repair.parts.length > 0) ? repair.parts.map((part, index) => (
                                                            <tr key={index}>
                                                                <td className="px-3 py-2 text-sm font-medium">{part.name}</td>
                                                                <td className="px-3 py-2 text-sm text-right">{part.quantity} {part.unit}</td>
                                                                <td className="px-3 py-2 text-sm">
                                                                    <span className="mr-1">{part.source === 'สต็อกอู่' ? '📦' : '🏪'}</span>
                                                                    {part.source}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm">{part.source === 'ร้านค้า' ? part.supplierName || 'ไม่ระบุ' : '-'}</td>
                                                                <td className="px-3 py-2 text-sm text-right font-semibold">{formatCurrency(part.quantity * part.unitPrice)}</td>
                                                            </tr>
                                                        )) : (
                                                            <tr>
                                                                <td colSpan={5} className="text-center py-4 text-gray-500">ไม่มีรายการอะไหล่</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                <div className="text-right mt-2 space-y-1 text-sm">
                                                    <p>ค่าอะไหล่: <span className="font-semibold">{formatCurrency(calculateTotalCost(repair) - (repair.repairCost || 0) - (repair.partsVat || 0))}</span> บาท</p>
                                                    <p>ค่าแรง: <span className="font-semibold">{formatCurrency(repair.repairCost || 0)}</span> บาท</p>
                                                    <p>VAT: <span className="font-semibold">{formatCurrency(repair.partsVat || 0)}</span> บาท</p>
                                                    <p className="text-base font-bold">ยอดรวม: <span className="text-blue-600">{formatCurrency(calculateTotalCost(repair))}</span> บาท</p>
                                                </div>
                                                {Array.isArray(repair.photos) && repair.photos.length > 0 && (
                                                    <div className="mt-4">
                                                        <h5 className="text-sm font-semibold text-gray-600 mb-2">📷 รูปภาพประกอบ ({repair.photos.length} รูป)</h5>
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                                            {repair.photos.map((url, idx) => (
                                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                                                    <img
                                                                        src={url}
                                                                        alt={`รูปที่ ${idx + 1}`}
                                                                        className="w-full h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer shadow-sm"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredRepairs.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
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
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-700">
                        จาก {filteredRepairs.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
            </div>

            {editingRepair && (
                <RepairEditModal
                    repair={editingRepair}
                    onSave={handleSaveRepair}
                    onClose={() => setEditingRepair(null)}
                    technicians={technicians}
                    stock={stock}
                    setStock={setStock}
                    transactions={transactions}
                    setTransactions={setTransactions}
                    suppliers={suppliers}
                    repairCategories={repairCategories}
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
            {viewingTimelineRepair && (
                <RepairTimelineModal
                    repair={viewingTimelineRepair}
                    onClose={() => setViewingTimelineRepair(null)}
                />
            )}
            {addUsedPartsRepair && <AddUsedPartsModal repair={addUsedPartsRepair} onSaveIndividual={addUsedParts} onSaveFungible={updateFungibleStock} stock={stock} onClose={() => setAddUsedPartsRepair(null)} />}
        </div>
    );
};

export default RepairHistory;