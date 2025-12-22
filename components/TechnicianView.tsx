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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
                            รายการงานของ: {technician.name}
                        </h3>
                        <p className="text-gray-500 mt-1 ml-4">จัดการและอัปเดตสถานะงานที่ได้รับมอบหมาย</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm" title="ปิดหน้าต่าง">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
                    {jobs.length > 0 ? jobs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                            {job.repairOrderNo}
                                        </span>
                                        <span className="text-lg font-bold text-gray-800">{job.licensePlate}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-50">
                                        {job.problemDescription}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${job.status === 'ซ่อมเสร็จ' ? 'bg-green-100 text-green-700' :
                                        job.status === 'กำลังซ่อม' ? 'bg-yellow-100 text-yellow-700' :
                                            job.status === 'รออะไหล่' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {job.status}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                {job.status === 'รอซ่อม' && (
                                    <button onClick={() => onStatusUpdate(job.id, 'กำลังซ่อม')} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                        <span className="text-lg">🛠️</span> เริ่มเข้าซ่อม
                                    </button>
                                )}
                                {job.status === 'กำลังซ่อม' && (
                                    <>
                                        <button onClick={() => onStatusUpdate(job.id, 'รออะไหล่')} className="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                            <span className="text-lg">📦</span> รออะไหล่
                                        </button>
                                        <button onClick={() => onStatusUpdate(job.id, 'ซ่อมเสร็จ')} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                            <span className="text-lg">✅</span> ซ่อมเสร็จ
                                        </button>
                                    </>
                                )}
                                {job.status === 'รออะไหล่' && (
                                    <button onClick={() => onStatusUpdate(job.id, 'กำลังซ่อม')} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                        <span className="text-lg">⚙️</span> กลับมาซ่อมต่อ
                                    </button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg font-medium">ไม่มีงานที่ต้องดำเนินการในขณะนี้</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-8 py-2.5 text-base font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">ปิด</button>
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

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortOption, setSortOption] = useState<string>('rating_desc');
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null);


    const techStats = useMemo(() => {
        const activeRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status));

        const data = technicians.map(tech => {
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
        });

        // Apply Filters
        let filtered = data.filter(t => {
            if (statusFilter !== 'all' && t.derivedStatus !== statusFilter) return false;
            if (selectedSkill && !(t.skills || []).includes(selectedSkill)) return false;
            return true;
        });

        // Apply Sort
        return filtered.sort((a, b) => {
            if (sortOption === 'rating_desc') return b.rating - a.rating;
            if (sortOption === 'rating_asc') return a.rating - b.rating;
            if (sortOption === 'jobs_desc') return b.completedJobs - a.completedJobs;
            if (sortOption === 'jobs_asc') return a.completedJobs - b.completedJobs;
            // Default: Status Priority
            const statusOrder = { 'ไม่ว่าง': 0, 'ว่าง': 1, 'ลา': 2 };
            return (statusOrder[a.derivedStatus] ?? 3) - (statusOrder[b.derivedStatus] ?? 3);
        });

    }, [repairs, technicians, statusFilter, sortOption, selectedSkill]);

    const allSkills = useMemo(() => {
        const skills = new Set<string>();
        technicians.forEach(t => (t.skills || []).forEach(s => skills.add(s)));
        return Array.from(skills);
    }, [technicians]);


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
            if (partsToWithdraw.length > 0) {
                const existingWithdrawalPartIds = new Set(
                    (Array.isArray(transactions) ? transactions : [])
                        .filter(t => t.relatedRepairOrder === updatedRepair.repairOrderNo && t.type === 'เบิกใช้')
                        .map(t => t.stockItemId)
                );

                const newPartsToProcess = partsToWithdraw.filter(part => !existingWithdrawalPartIds.has(part.partId));

                if (newPartsToProcess.length > 0) {
                    const technicianNames = technicians
                        .filter(t => updatedRepair.assignedTechnicianId === t.id || (updatedRepair.assistantTechnicianIds || []).includes(t.id))
                        .map(t => t.name)
                        .join(', ') || 'ไม่ระบุ';
                    const now = new Date().toISOString();
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
        }

        // Refresh modal jobs if needed or close if empty
        const updatedTech = techStats.find(t => t.id === selectedTechnician?.id);
        if (updatedTech) {
            const updatedTechActiveJobs = updatedTech.jobs.filter(j => j.id !== repairId || newStatus !== 'ซ่อมเสร็จ'); // Naive check, actually logic in techStats handles 'ซ่อมเสร็จ' exclusion from active
            // If we strictly follow techStats logic, 'ซ่อมเสร็จ' is not active.
            // We should just re-select based on the new prop state which will propagate.
            // For smoother UX, we update the local selectedTech state if possible, but it depends on 'repairs' prop.
            // Since 'repairs' is updated, 'techStats' will update. We just need useEffect or similar to keep selectedTech in sync?
            // Or just close if no active jobs.

            // Simple check:
            if (newStatus === 'ซ่อมเสร็จ' && updatedTech.jobs.length <= 1) {
                setIsModalOpen(false);
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                        จัดการช่าง
                    </h2>
                    <p className="text-gray-500 mt-1">จัดการข้อมูลช่างและการมอบหมายงาน</p>
                </div>

                {/* Filters Section */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex flex-col xl:flex-row justify-between gap-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-600">สถานะ:</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    aria-label="กรองตามสถานะช่าง"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    <option value="ว่าง">ว่าง</option>
                                    <option value="ไม่ว่าง">ไม่ว่าง</option>
                                    <option value="ลา">ลา</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-600">เรียงตาม:</span>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    aria-label="เรียงลำดับข้อมูล"
                                >
                                    <option value="rating_desc">เรตติ้ง (สูง-ต่ำ)</option>
                                    <option value="rating_asc">เรตติ้ง (ต่ำ-สูง)</option>
                                    <option value="jobs_desc">งานเสร็จ (มาก-น้อย)</option>
                                    <option value="jobs_asc">งานเสร็จ (น้อย-มาก)</option>
                                </select>
                            </div>
                        </div>
                        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            เพิ่มช่างใหม่
                        </button>
                    </div>

                    {/* Skill Tags */}
                    <div className="mt-6 flex items-start gap-4">
                        <span className="text-sm font-bold text-slate-600 mt-2 whitespace-nowrap">ทักษะ:</span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedSkill(null)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedSkill === null
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                ทั้งหมด
                            </button>
                            {allSkills.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => setSelectedSkill(skill === selectedSkill ? null : skill)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedSkill === skill
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {techStats.map(tech => (
                    <div
                        key={tech.id}
                        className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors" title={tech.name}>{tech.name}</h3>
                                    <p className="text-slate-500 text-sm font-medium">{tech.role}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap shadow-sm ${tech.derivedStatus === 'ว่าง' ? 'bg-[#dcfce7] text-[#15803d]' :
                                    tech.derivedStatus === 'ไม่ว่าง' ? 'bg-[#fef9c3] text-[#a16207]' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {tech.derivedStatus}
                                </span>
                            </div>

                            <p className="text-slate-400 text-xs mb-4 font-mono mt-1">ID: {tech.id} <span className="mx-1">|</span> ประสบการณ์ {tech.experience} ปี</p>

                            <div className="flex flex-wrap gap-2 mb-6 min-h-[50px] content-start">
                                {(tech.skills || []).slice(0, 4).map(skill => (
                                    <span key={skill} className="bg-slate-50 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-100">
                                        {skill}
                                    </span>
                                ))}
                                {(tech.skills || []).length > 4 && (
                                    <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1 rounde-lg">
                                        +{(tech.skills || []).length - 4}
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-between items-end border-t border-slate-50 pt-4 px-2">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-slate-800 leading-none">{tech.completedJobs}</p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">งานเสร็จ</p>
                                </div>
                                <div className="text-center">
                                    <p className={`text-2xl font-black leading-none ${tech.currentJobsCount > 0 ? 'text-amber-500' : 'text-slate-200'}`}>
                                        {tech.currentJobsCount}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">กำลังทำ</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-0.5 text-emerald-500">
                                        <p className="text-2xl font-black leading-none">{tech.rating}</p>
                                        <svg className="w-3.5 h-3.5 mb-1 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">เรตติ้ง</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 pt-0">
                            <button
                                onClick={() => handleOpenModal(tech)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg"
                            >
                                ดูรายละเอียด
                            </button>
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
        </div>
    );
};

export default TechnicianView;