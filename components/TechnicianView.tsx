import React, { useState, useMemo } from 'react';
import type { Repair, Technician, RepairStatus, StockItem, StockTransaction } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus } from '../utils';

interface TechnicianViewProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
}

// --- Job Management Modal ---
interface JobModalProps {
    technician: Technician;
    jobs: Repair[];
    onClose: () => void;
    onStatusUpdate: (repairId: string, newStatus: RepairStatus) => void;
}

const JobModal: React.FC<JobModalProps> = ({ technician, jobs, onClose, onStatusUpdate }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">รายการงานของ: {technician.name}</h3>
                    <p className="text-gray-500">จัดการและอัปเดตสถานะงานที่ได้รับมอบหมาย</p>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50">
                    {jobs.length > 0 ? jobs.map(job => (
                        <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{job.licensePlate} <span className="font-normal text-sm text-gray-500">({job.repairOrderNo})</span></p>
                                    <p className="text-gray-700 mt-1">{job.problemDescription}</p>
                                </div>
                                <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{job.status}</span>
                            </div>
                            <div className="mt-3 border-t pt-3 flex justify-end gap-2">
                                {job.status === 'รอซ่อม' && (
                                    <button onClick={() => onStatusUpdate(job.id, 'กำลังซ่อม')} className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">เริ่มซ่อม</button>
                                )}
                                {job.status === 'กำลังซ่อม' && (
                                    <>
                                        <button onClick={() => onStatusUpdate(job.id, 'รออะไหล่')} className="px-3 py-1.5 text-sm font-semibold text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">รออะไหล่</button>
                                        <button onClick={() => onStatusUpdate(job.id, 'ซ่อมเสร็จ')} className="px-3 py-1.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">ซ่อมเสร็จ</button>
                                    </>
                                )}
                                {job.status === 'รออะไหล่' && (
                                    <button onClick={() => onStatusUpdate(job.id, 'กำลังซ่อม')} className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">กลับมาซ่อมต่อ</button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-500">
                            <p className="text-lg">ไม่มีงานที่ต้องดำเนินการในขณะนี้</p>
                        </div>
                    )}
                </div>
                 <div className="p-4 border-t flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
type EnrichedTechnician = Technician & {
    jobs: Repair[];
    currentJobsCount: number;
    derivedStatus: Technician['status'];
};

const TechnicianView: React.FC<TechnicianViewProps> = ({ repairs, setRepairs, technicians, stock, setStock, transactions, setTransactions }) => {
    const [selectedTechnician, setSelectedTechnician] = useState<EnrichedTechnician | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const techStats = useMemo(() => {
        const activeRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status));
        
        return technicians.map(tech => {
            const currentJobs = activeRepairs.filter(r => r.assignedTechnicianId === tech.id || (r.assistantTechnicianIds || []).includes(tech.id));
            
            // Respect the manually set status first (e.g., 'ลา'), then calculate based on jobs.
            let derivedStatus: Technician['status'];
            if (tech.status === 'ลา') {
                derivedStatus = 'ลา';
            } else {
                derivedStatus = currentJobs.length > 0 ? 'ไม่ว่าง' : 'ว่าง';
            }
            
            return {
                ...tech,
                derivedStatus: derivedStatus,
                currentJobsCount: currentJobs.length,
                jobs: currentJobs,
            };
        }).sort((a,b) => {
            // Sort by Busy > Available > On Leave
            const statusOrder = { 'ไม่ว่าง': 0, 'ว่าง': 1, 'ลา': 2 };
            const statusA = statusOrder[a.derivedStatus] ?? 3;
            const statusB = statusOrder[b.derivedStatus] ?? 3;
            if (statusA !== statusB) {
                return statusA - statusB;
            }
             return a.name.localeCompare(b.name, 'th');
        });
    }, [repairs, technicians]);
    
    const handleOpenModal = (tech: EnrichedTechnician) => {
        setSelectedTechnician(tech);
        setIsModalOpen(true);
    };

    const handleStatusUpdate = (repairId: string, newStatus: RepairStatus) => {
        const repairToUpdate = repairs.find(r => r.id === repairId);
        if (!repairToUpdate) return;

        const updatedRepair = { ...repairToUpdate, status: newStatus, updatedAt: new Date().toISOString() };
        if (newStatus === 'กำลังซ่อม' && !repairToUpdate.repairStartDate) {
            updatedRepair.repairStartDate = new Date().toISOString();
        }
        if (newStatus === 'ซ่อมเสร็จ' && !repairToUpdate.repairEndDate) {
            updatedRepair.repairEndDate = new Date().toISOString();
        }
        setRepairs(prev => prev.map(r => r.id === repairId ? updatedRepair : r));
        addToast(`อัปเดตสถานะใบซ่อม ${updatedRepair.repairOrderNo} เป็น "${newStatus}"`, 'success');

        if (newStatus === 'ซ่อมเสร็จ') {
            const partsToWithdraw = (updatedRepair.parts || []).filter(p => p.source === 'สต็อกอู่');
            if (partsToWithdraw.length === 0) {
                setIsModalOpen(false); // Close modal even if no parts to withdraw
                return;
            };

            const technicianNames = technicians
                .filter(t => updatedRepair.assignedTechnicianId === t.id || (updatedRepair.assistantTechnicianIds || []).includes(t.id))
                .map(t => t.name)
                .join(', ') || 'ไม่ระบุ';
            
            const now = new Date().toISOString();

            const existingWithdrawalPartIds = new Set(
                (Array.isArray(transactions) ? transactions : [])
                    .filter(t => t.relatedRepairOrder === updatedRepair.repairOrderNo && t.type === 'เบิกใช้')
                    .map(t => t.stockItemId)
            );

            const newPartsToProcess = partsToWithdraw.filter(part => !existingWithdrawalPartIds.has(part.partId));

            if (newPartsToProcess.length > 0) {
                const stockUpdates: Record<string, number> = {};
                const transactionsToAdd: StockTransaction[] = [];

                newPartsToProcess.forEach(part => {
                    stockUpdates[part.partId] = (stockUpdates[part.partId] || 0) + part.quantity;
                    transactionsToAdd.push({
                        id: `TXN-${now}-${part.partId}`,
                        stockItemId: part.partId,
                        stockItemName: part.name,
                        type: 'เบิกใช้',
                        quantity: -part.quantity,
                        transactionDate: now,
                        actor: technicianNames,
                        notes: `ใช้สำหรับใบแจ้งซ่อม ${updatedRepair.repairOrderNo}`,
                        relatedRepairOrder: updatedRepair.repairOrderNo,
                        pricePerUnit: part.unitPrice
                    });
                });

                setStock(prevStock => prevStock.map(s => {
                    if (stockUpdates[s.id]) {
                        const change = stockUpdates[s.id];
                        const newQuantity = Number(s.quantity) - Number(change);
                        const newStatus = calculateStockStatus(newQuantity, s.minStock, s.maxStock);
                        return { ...s, quantity: newQuantity, status: newStatus };
                    }
                    return s;
                }));

                setTransactions(prev => [...transactionsToAdd, ...prev]);
                addToast(`หักสต็อกและบันทึกการเบิกจ่าย ${newPartsToProcess.length} รายการ`, 'info');
            }
        }
        // Refresh modal jobs
        const updatedTech = techStats.find(t => t.id === selectedTechnician?.id);
        if (updatedTech) {
            setSelectedTechnician(updatedTech);
        }
         // Close modal if there are no more active jobs for the technician
        const techHasMoreJobs = techStats.find(t => t.id === selectedTechnician?.id)?.jobs.some(j => j.id !== repairId)

        if (!techHasMoreJobs) {
            setIsModalOpen(false);
        }
    };
    
    const getStatusBadge = (status: Technician['status']) => {
        switch (status) {
            case 'ว่าง': return 'bg-green-100 text-green-800';
            case 'ไม่ว่าง': return 'bg-yellow-100 text-yellow-800';
            case 'ลา': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100';
        }
    };
    
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {techStats.map(tech => (
                    <div 
                        key={tech.id} 
                        onClick={() => handleOpenModal(tech)}
                        className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                    >
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-gray-800">{tech.name}</h3>
                                <span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(tech.derivedStatus)}`}>{tech.derivedStatus}</span>
                            </div>
                            <p className="text-gray-500 text-sm font-semibold">{tech.role}</p>
                            <p className="text-gray-500 text-sm">ID: {tech.id} | ประสบการณ์ {tech.experience} ปี</p>
                            <div className="mt-4 flex flex-wrap gap-2 h-12 overflow-y-auto">
                                {(tech.skills || []).map(skill => (
                                    <span key={skill} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4">
                             <div className="flex justify-around text-center">
                                <div><p className="text-lg font-bold text-gray-800">{tech.completedJobs}</p><p className="text-sm text-gray-500">งานเสร็จทั้งหมด</p></div>
                                <div><p className="text-lg font-bold text-yellow-600">{tech.currentJobsCount}</p><p className="text-sm text-gray-500">กำลังทำ</p></div>
                                <div><p className="text-lg font-bold text-green-600">{tech.rating} ★</p><p className="text-sm text-gray-500">เรตติ้ง</p></div>
                            </div>
                            <div className="mt-4">
                                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                    ดูและจัดการงาน
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {isModalOpen && selectedTechnician && (
                <JobModal 
                    technician={selectedTechnician} 
                    jobs={selectedTechnician.jobs} 
                    onClose={() => setIsModalOpen(false)} 
                    onStatusUpdate={handleStatusUpdate}
                />
            )}
        </>
    );
};

export default TechnicianView;