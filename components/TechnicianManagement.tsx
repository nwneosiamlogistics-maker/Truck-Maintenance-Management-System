import React, { useState, useMemo, useEffect } from 'react';
import type { Technician, Repair, RepairStatus, TechnicianRole } from '../types';
import TechnicianModal from './TechnicianModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';
import PhotoUpload from './PhotoUpload';

interface TechnicianEditModalProps {
    technician: Technician | null;
    onSave: (technician: Technician) => void;
    onClose: () => void;
}

const TechnicianEditModal: React.FC<TechnicianEditModalProps> = ({ technician, onSave, onClose }) => {

    const getInitialState = () => {
        if (technician) return technician;
        return {
            id: '',
            name: '',
            role: 'ผู้ช่วยช่าง' as const,
            skills: [],
            experience: 0,
            status: 'ว่าง' as const,
            rating: 0,
            completedJobs: 0,
            currentJobs: 0,
        };
    };

    const [formData, setFormData] = useState<Technician>(getInitialState);
    const [skillsString, setSkillsString] = useState(technician?.skills.join(', ') || '');
    const [photos, setPhotos] = useState<string[]>(technician?.photos || []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
        setSkillsString(technician?.skills.join(', ') || '');
        setPhotos(technician?.photos || []);
    }, [technician]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parsedValue = ['experience', 'rating', 'completedJobs', 'currentJobs'].includes(name) ? parseInt(value, 10) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue as any }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const skillsArray = skillsString.split(',').map(s => s.trim()).filter(Boolean);
            await onSave({ ...formData, skills: skillsArray, photos });
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        } finally {
            setTimeout(() => setIsSubmitting(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{technician ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}</h3>
                        <p className="text-gray-500 text-sm mt-1">กรอกข้อมูลให้ครบถ้วนเพื่อบันทึกในระบบ</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" title="ปิดหน้าต่าง" className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form id="technician-form" onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อ-สกุล</label>
                            <input type="text" name="name" aria-label="Name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" title="ชื่อ-สกุล" placeholder="ระบุชื่อ-นามสกุล" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ตำแหน่ง</label>
                            <div className="relative">
                                <select name="role" aria-label="Role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none transition-all" title="ตำแหน่ง">
                                    <option value="ช่าง">ช่าง</option>
                                    <option value="ผู้ช่วยช่าง">ผู้ช่วยช่าง</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">ทักษะ (คั่นด้วย ,)</label>
                        <input type="text" name="skills" aria-label="Skills" value={skillsString} onChange={(e) => setSkillsString(e.target.value)} placeholder="เช่น เครื่องยนต์, เบรก, ไฟฟ้า" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" title="ทักษะ" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ประสบการณ์ (ปี)</label>
                            <input type="number" name="experience" aria-label="Experience" value={formData.experience} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" title="ประสบการณ์ (ปี)" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">สถานะเริ่มต้น</label>
                            <div className="relative">
                                <select name="status" aria-label="Status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none transition-all" title="สถานะ">
                                    <option value="ว่าง">ว่าง</option>
                                    <option value="ไม่ว่าง">ไม่ว่าง</option>
                                    <option value="ลา">ลา</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">เรตติ้ง</label>
                            <input type="number" step="0.1" name="rating" aria-label="Rating" value={formData.rating} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">งานที่เสร็จแล้ว</label>
                            <input type="number" name="completedJobs" aria-label="Completed Jobs" value={formData.completedJobs} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">งานปัจจุบัน</label>
                            <input type="number" name="currentJobs" aria-label="Current Jobs" value={formData.currentJobs} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">📷 รูปภาพประจำตัว</h4>
                        <PhotoUpload
                            photos={photos}
                            onChange={setPhotos}
                            entity="technicians"
                            entityId={technician?.id || 'new'}
                        />
                    </div>
                </form>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">ยกเลิก</button>
                    <button type="submit" form="technician-form" disabled={isSubmitting} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[120px]">
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TechnicianManagementProps {
    technicians: Technician[];
    setTechnicians: React.Dispatch<React.SetStateAction<Technician[]>>;
    repairs: Repair[];
}

const TechnicianManagement: React.FC<TechnicianManagementProps> = ({ technicians, setTechnicians, repairs }) => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [skillFilter, setSkillFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState('rating-desc');

    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
    const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

    const { addToast } = useToast();

    const safeTechnicians = useMemo(() => Array.isArray(technicians) ? technicians : [], [technicians]);

    const allSkills = useMemo(() => Array.from(new Set((Array.isArray(technicians) ? technicians : []).flatMap(t => t.skills || []))).sort(), [technicians]);

    const filteredAndSortedTechnicians = useMemo(() => {
        const safeRepairs = Array.isArray(repairs) ? repairs : [];
        const activeJobStatuses: RepairStatus[] = ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'];

        // 1. Enrich technicians with calculated status and job count
        const enrichedTechnicians = safeTechnicians.map(tech => {
            const activeJobs = safeRepairs.filter(r =>
                activeJobStatuses.includes(r.status) &&
                (r.assignedTechnicianId === tech.id || (r.assistantTechnicianIds || []).includes(tech.id))
            );

            let calculatedStatus: Technician['status'];
            // Prioritize manually set "On Leave" status
            if (tech.status === 'ลา') {
                calculatedStatus = 'ลา';
            } else {
                calculatedStatus = activeJobs.length > 0 ? 'ไม่ว่าง' : 'ว่าง';
            }

            return {
                ...tech,
                calculatedStatus: calculatedStatus,
                activeJobsCount: activeJobs.length,
            };
        });

        // 2. Filter based on UI controls
        const filtered = enrichedTechnicians
            .filter(tech => statusFilter === 'all' || tech.calculatedStatus === statusFilter)
            .filter(tech => skillFilter === 'all' || (tech.skills || []).includes(skillFilter));

        // 3. Sort
        return filtered.sort((a, b) => {
            // Primary sort: by calculated status
            const statusOrder: Record<Technician['status'], number> = { 'ไม่ว่าง': 0, 'ว่าง': 1, 'ลา': 2 };
            const statusA = statusOrder[a.calculatedStatus];
            const statusB = statusOrder[b.calculatedStatus];
            if (statusA !== statusB) {
                return statusA - statusB;
            }

            // Secondary sort: by user selection
            switch (sortBy) {
                case 'rating-desc': return b.rating - a.rating;
                case 'rating-asc': return a.rating - b.rating;
                case 'experience-desc': return b.experience - a.experience;
                case 'experience-asc': return a.experience - b.experience;
                default: return 0;
            }
        });

    }, [safeTechnicians, repairs, statusFilter, skillFilter, sortBy]);


    const getStatusBadge = (status: Technician['status']) => {
        switch (status) {
            case 'ว่าง': return 'bg-[#dcfce7] text-[#15803d]';
            case 'ไม่ว่าง': return 'bg-[#fef9c3] text-[#a16207]';
            case 'ลา': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const openDetailModal = (tech: Technician) => {
        setSelectedTechnician(tech);
        setDetailModalOpen(true);
    };

    const handleOpenEditModal = (tech: Technician | null) => {
        setEditingTechnician(tech);
        setEditModalOpen(true);
    };

    const handleSaveTechnician = (techToSave: Technician) => {
        if (techToSave.id) { // Editing
            setTechnicians(prev => prev.map(t => t.id === techToSave.id ? techToSave : t));
            addToast(`อัปเดตข้อมูล ${techToSave.name} สำเร็จ`, 'success');
        } else { // Adding
            const newTech = { ...techToSave, id: `T${Date.now()}` };
            setTechnicians(prev => [newTech, ...prev]);
            addToast(`เพิ่มช่างใหม่ ${newTech.name} สำเร็จ`, 'success');
        }
        setEditModalOpen(false);
    };

    const handleDeleteTechnician = async (techId: string, techName: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบ ${techName}?`, 'ลบ');
            if (confirmed) {
                setTechnicians(prev => prev.filter(t => t.id !== techId));
                addToast(`ลบช่าง ${techName} สำเร็จ`, 'info');
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
                                    aria-label="Filter by Status"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
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
                                    aria-label="Sort by"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                >
                                    <option value="rating-desc">เรตติ้ง (สูง-ต่ำ)</option>
                                    <option value="rating-asc">เรตติ้ง (ต่ำ-สูง)</option>
                                    <option value="experience-desc">ประสบการณ์ (สูง-ต่ำ)</option>
                                    <option value="experience-asc">ประสบการณ์ (ต่ำ-สูง)</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={() => handleOpenEditModal(null)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            เพิ่มช่างใหม่
                        </button>
                    </div>

                    {/* Skill Tags */}
                    <div className="mt-6 flex items-start gap-4">
                        <span className="text-sm font-bold text-slate-600 mt-2 whitespace-nowrap">ทักษะ:</span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSkillFilter('all')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${skillFilter === 'all'
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                ทั้งหมด
                            </button>
                            {allSkills.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => setSkillFilter(skill === skillFilter ? 'all' : skill)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${skillFilter === skill
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
                {filteredAndSortedTechnicians.map(tech => (
                    <div key={tech.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group">
                        <div className="p-6 pb-0">
                            {(() => {
                                const techPhotos = Array.isArray(tech.photos) ? tech.photos.filter(Boolean) : [];
                                return techPhotos.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setLightbox({ photos: techPhotos, index: 0 })}
                                        className="w-full h-32 mb-4 rounded-2xl overflow-hidden border border-slate-100 hover:border-blue-300 transition-colors"
                                        title={`ดูรูปภาพ (${techPhotos.length} รูป)`}
                                    >
                                        <img
                                            src={techPhotos[0]}
                                            alt={tech.name}
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </button>
                                ) : null;
                            })()}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors" title={tech.name}>{tech.name}</h3>
                                    <p className="text-slate-500 text-sm font-medium">{tech.role}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap shadow-sm ${getStatusBadge(tech.calculatedStatus)}`}>
                                    {tech.calculatedStatus}
                                </span>
                            </div>

                            <p className="text-slate-400 text-xs mb-4 font-mono mt-1">ID: {tech.id} <span className="mx-1">|</span> ประสบการณ์ {tech.experience} ปี</p>

                            <div className="flex flex-wrap gap-2 mb-6 min-h-[40px] content-start">
                                {(tech.skills || []).slice(0, 4).map(skill => (
                                    <span key={skill} className="bg-slate-50 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-100">
                                        {skill}
                                    </span>
                                ))}
                                {(tech.skills || []).length > 4 && (
                                    <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                                        +{(tech.skills || []).length - 4}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end border-t border-slate-50 pt-4 px-2 pb-4 mx-4">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-slate-800 leading-none">{tech.completedJobs}</p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wide">งานเสร็จ</p>
                                </div>
                                <div className="text-center">
                                    <p className={`text-2xl font-black leading-none ${tech.activeJobsCount > 0 ? 'text-amber-500' : 'text-slate-200'}`}>
                                        {tech.activeJobsCount}
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

                            <div className="p-4 pt-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                                <button onClick={() => openDetailModal(tech)} className="flex-1 bg-white hover:bg-blue-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-xs shadow-sm hover:shadow border border-slate-200 group-hover:border-blue-200 group-hover:text-blue-600">
                                    รายละเอียด
                                </button>
                                {(() => {
                                    const techPhotos = Array.isArray(tech.photos) ? tech.photos.filter(Boolean) : [];
                                    return techPhotos.length > 0 ? (
                                        <button
                                            onClick={() => setLightbox({ photos: techPhotos, index: 0 })}
                                            className="px-3 bg-white hover:bg-blue-50 text-blue-500 hover:text-blue-700 font-bold py-2.5 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow border border-slate-200 text-xs"
                                            title="ดูรูปภาพทั้งหมด"
                                        >
                                            📷 {techPhotos.length}
                                        </button>
                                    ) : null;
                                })()}
                                <button onClick={() => handleOpenEditModal(tech)} aria-label={`Edit ${tech.name}`} className="px-3 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow border border-slate-200">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteTechnician(tech.id, tech.name)} aria-label={`Delete ${tech.name}`} className="px-3 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow border border-slate-200">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isDetailModalOpen && selectedTechnician && (
                <TechnicianModal
                    technician={selectedTechnician}
                    repairs={repairs.filter(r => r.assignedTechnicianId === selectedTechnician.id || (r.assistantTechnicianIds || []).includes(selectedTechnician.id))}
                    onClose={() => setDetailModalOpen(false)}
                />
            )}
            {isEditModalOpen && (
                <TechnicianEditModal
                    technician={editingTechnician}
                    onSave={handleSaveTechnician}
                    onClose={() => setEditModalOpen(false)}
                />
            )}

            {lightbox && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex flex-col items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightbox(null)}
                            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 z-10"
                            aria-label="ปิด"
                        >
                            ✕
                        </button>
                        <img
                            src={lightbox.photos[lightbox.index]}
                            alt={`รูปที่ ${lightbox.index + 1}`}
                            className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null)}
                                disabled={lightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ‹ ก่อนหน้า
                            </button>
                            <span className="text-white text-sm">{lightbox.index + 1} / {lightbox.photos.length}</span>
                            <button
                                onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null)}
                                disabled={lightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ถัดไป ›
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 justify-center flex-wrap">
                            {lightbox.photos.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLightbox(prev => prev ? { ...prev, index: idx } : null)}
                                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                                        idx === lightbox.index ? 'border-blue-400' : 'border-transparent hover:border-gray-400'
                                    }`}
                                >
                                    <img src={url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicianManagement;