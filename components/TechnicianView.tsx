import React, { useState, useMemo } from 'react';
import type { Repair, Technician, RepairStatus, StockItem, StockTransaction, FileAttachment } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus } from '../utils';
import { Camera, CheckCircle2, Clock, Package, PlayCircle, FileText, Image as ImageIcon, X } from 'lucide-react';
import { sendRepairStatusLineNotification } from '../utils/lineService';

interface TechnicianViewProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
}

// --- Job Card for Mobile ---
interface JobCardProps {
    job: Repair;
    onUpdate: (repairId: string, updates: Partial<Repair>) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onUpdate }) => {
    const [note, setNote] = useState(job.notes || '');
    const [showPhotoOverlay, setShowPhotoOverlay] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('capture', 'environment');
        }
    }, []);

    const handleStatusClick = (newStatus: RepairStatus) => {
        const updates: Partial<Repair> = { status: newStatus };
        if (newStatus === 'กำลังซ่อม' && !job.repairStartDate) {
            updates.repairStartDate = new Date().toISOString();
        }
        if (newStatus === 'ซ่อมเสร็จ' && !job.repairEndDate) {
            updates.repairEndDate = new Date().toISOString();
        }
        onUpdate(job.id, updates);
    };

    const handleSaveNote = () => {
        onUpdate(job.id, { notes: note });
    };

    const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // In a real app, we'd upload to a server. Here we'll simulate.
            const reader = new FileReader();
            reader.onloadend = () => {
                const newAttachment: FileAttachment = {
                    id: `ATT-${Date.now()}`,
                    name: file.name,
                    url: reader.result as string,
                    type: file.type
                };
                onUpdate(job.id, {
                    attachments: [...(job.attachments || []), newAttachment]
                });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6 animate-fade-in-up">
            {/* Header Area */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg">
                        <PlayCircle size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{job.repairOrderNo}</span>
                        <h4 className="text-xl font-black text-slate-800 leading-none mt-0.5">{job.licensePlate}</h4>
                    </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-sm ${job.status === 'ซ่อมเสร็จ' ? 'bg-green-100 text-green-700' :
                    job.status === 'กำลังซ่อม' ? 'bg-amber-100 text-amber-700' :
                        job.status === 'รออะไหล่' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                    }`}>
                    {job.status}
                </span>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">อาการเสีย / รายละเอียดงาน</label>
                    <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                        {job.problemDescription}
                    </p>
                </div>

                {/* Notes Section - Large for Mobile */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">หมายเหตุช่าง / รายงานผล</label>
                    <div className="relative">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onBlur={handleSaveNote}
                            placeholder="ระบุรายละเอียดการตรวจสอบหรือปัญหาที่พบ..."
                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none min-h-[100px] text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Photos Section */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">รูปภาพประกอบ ({job.attachments?.length || 0})</label>
                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 active:scale-95 transition-all">
                            <Camera size={14} />
                            ถ่ายรูป / แนบไฟล์
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCapturePhoto}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {job.attachments && job.attachments.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                            {job.attachments.map(att => (
                                <div key={att.id} className="relative group flex-shrink-0">
                                    <img src={att.url} alt={att.name} className="w-20 h-20 object-cover rounded-2xl border border-slate-100" />
                                    <button
                                        onClick={() => onUpdate(job.id, { attachments: job.attachments?.filter(a => a.id !== att.id) })}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                        title="ลบรูปภาพ"
                                        aria-label="ลบรูปภาพ"
                                    >
                                        <X size={10} strokeWidth={4} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                            <ImageIcon size={32} className="mx-auto opacity-20 mb-1" />
                            <p className="text-[10px] font-bold uppercase tracking-wider">ยังไม่มีรูปภาพ</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons - Massive for Mobile */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3">
                {job.status === 'รอซ่อม' && (
                    <button
                        onClick={() => handleStatusClick('กำลังซ่อม')}
                        className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        <PlayCircle size={24} />
                        <span className="text-lg">เริ่มงานทันที</span>
                    </button>
                )}
                {job.status === 'กำลังซ่อม' && (
                    <>
                        <button
                            onClick={() => handleStatusClick('รออะไหล่')}
                            className="flex-1 min-w-[140px] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                        >
                            <Package size={20} />
                            รออะไหล่
                        </button>
                        <button
                            onClick={() => handleStatusClick('ซ่อมเสร็จ')}
                            className="flex-[2] min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            <CheckCircle2 size={24} />
                            <span className="text-lg">ซ่อมเสร็จแล้ว</span>
                        </button>
                    </>
                )}
                {job.status === 'รออะไหล่' && (
                    <button
                        onClick={() => handleStatusClick('กำลังซ่อม')}
                        className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        <Clock size={24} />
                        <span className="text-lg">กลับมาทำต่อ</span>
                    </button>
                )}
            </div>
        </div>
    );
};


// --- Job Management Modal ---
interface JobModalProps {
    technician: Technician;
    jobs: Repair[];
    onClose: () => void;
    onUpdateJob: (repairId: string, updates: Partial<Repair>) => void;
}

const JobModal: React.FC<JobModalProps> = ({ technician, jobs, onClose, onUpdateJob }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex justify-center items-end md:items-center p-0 md:p-4 transition-all" onClick={onClose}>
            <div className="bg-slate-50 w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in-up" onClick={e => e.stopPropagation()}>
                {/* Mobile Drag Handle */}
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                </div>

                <div className="px-6 py-4 md:p-8 flex justify-between items-center bg-white border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <FileText size={24} className="md:hidden" />
                            <FileText size={32} className="hidden md:block" />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-800">งานของ: {technician.name}</h3>
                            <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest">{technician.role} | สังกัดอู่หลัก</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-90" title="ปิดหน้าต่าง">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 md:p-8 space-y-4 overflow-y-auto flex-1 custom-scrollbar no-scrollbar">
                    {jobs.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {jobs.map(job => (
                                <JobCard key={job.id} job={job} onUpdate={onUpdateJob} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Clock size={40} className="text-slate-200" />
                            </div>
                            <p className="text-xl font-black text-slate-400">ยังไม่มีงานที่ต้องทำ</p>
                            <p className="text-sm font-medium text-slate-300 mt-1">ใบสั่งซ่อมใหม่จะแสดงที่นี่เมื่อได้รับมอบหมาย</p>
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-12 py-4 text-lg font-black text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                        ปิดหน้าต่างนี้
                    </button>
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

    const handleUpdateJob = (repairId: string, updates: Partial<Repair>) => {
        const repairToUpdate = repairs.find(r => r.id === repairId);
        if (!repairToUpdate) return;

        const updatedRepair = { ...repairToUpdate, ...updates, updatedAt: new Date().toISOString() };

        // Handle logic when status changes
        if (updates.status && updates.status !== repairToUpdate.status) {
            const newStatus = updates.status;
            if (newStatus === 'กำลังซ่อม' && !repairToUpdate.repairStartDate) {
                updatedRepair.repairStartDate = new Date().toISOString();
            }
            if (newStatus === 'ซ่อมเสร็จ' && !repairToUpdate.repairEndDate) {
                updatedRepair.repairEndDate = new Date().toISOString();
            }

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

            addToast(`อัปเดตสถานะใบซ่อม ${updatedRepair.repairOrderNo} เป็น "${newStatus}"`, 'success');

            // Send LINE Notification
            sendRepairStatusLineNotification(repairToUpdate, repairToUpdate.status, newStatus);
        } else if (updates.notes !== undefined) {
            addToast(`บันทึกหมายเหตุสำหรับ ${updatedRepair.repairOrderNo} แล้ว`, 'success');
        } else if (updates.attachments !== undefined) {
            addToast(`แนบไฟล์/รูปภาพสำหรับ ${updatedRepair.repairOrderNo} แล้ว`, 'info');
        }

        setRepairs(prev => prev.map(r => r.id === repairId ? updatedRepair : r));

        // Auto close logic if finishing the last job
        if (updates.status === 'ซ่อมเสร็จ') {
            const currentTech = techStats.find(t => t.id === selectedTechnician?.id);
            if (currentTech && currentTech.jobs.length <= 1) {
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
                        onUpdateJob={handleUpdateJob}
                    />
                )}
            </div>
        );
    };

    export default TechnicianView;