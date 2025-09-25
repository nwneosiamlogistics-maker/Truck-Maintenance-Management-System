import React, { useState, useMemo, useEffect } from 'react';
import type { Technician, Repair, RepairStatus, TechnicianRole } from '../types';
import TechnicianModal from './TechnicianModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

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

    useEffect(() => {
        setFormData(getInitialState());
        setSkillsString(technician?.skills.join(', ') || '');
    }, [technician]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parsedValue = ['experience', 'rating', 'completedJobs', 'currentJobs'].includes(name) ? parseInt(value, 10) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue as any }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const skillsArray = skillsString.split(',').map(s => s.trim()).filter(Boolean);
        onSave({ ...formData, skills: skillsArray });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{technician ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="technician-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-base font-medium text-gray-700 mb-1">ชื่อ-สกุล</label>
                           <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                           <label className="block text-base font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                           <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                               <option value="ช่าง">ช่าง</option>
                               <option value="ผู้ช่วยช่าง">ผู้ช่วยช่าง</option>
                           </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ทักษะ (คั่นด้วย ,)</label>
                        <input type="text" name="skills" value={skillsString} onChange={(e) => setSkillsString(e.target.value)} placeholder="เช่น เครื่องยนต์, เบรก, ไฟฟ้า" className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ประสบการณ์ (ปี)</label>
                            <input type="number" name="experience" value={formData.experience} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">สถานะ</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="ว่าง">ว่าง</option>
                                <option value="ไม่ว่าง">ไม่ว่าง</option>
                                <option value="ลา">ลา</option>
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">เรตติ้ง</label>
                            <input type="number" step="0.1" name="rating" value={formData.rating} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">งานที่เสร็จแล้ว</label>
                            <input type="number" name="completedJobs" value={formData.completedJobs} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">งานปัจจุบัน</label>
                            <input type="number" name="currentJobs" value={formData.currentJobs} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="technician-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
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
    const [skillFilter, setSkillFilter] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('rating-desc');
    
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
    const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);

    const { addToast } = useToast();

    const safeTechnicians = useMemo(() => Array.isArray(technicians) ? technicians : [], [technicians]);

    const allSkills = useMemo(() => Array.from(new Set(safeTechnicians.flatMap(t => t.skills || []))).sort(), [safeTechnicians]);

    const handleSkillToggle = (skill: string) => {
        setSkillFilter(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

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
            .filter(tech => skillFilter.length === 0 || skillFilter.every(skill => (tech.skills || []).includes(skill)));
        
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
            case 'ว่าง': return 'bg-green-100 text-green-800';
            case 'ไม่ว่าง': return 'bg-yellow-100 text-yellow-800';
            case 'ลา': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
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

    const handleDeleteTechnician = (techId: string, techName: string) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${techName}?`)) {
            setTechnicians(prev => prev.filter(t => t.id !== techId));
            addToast(`ลบช่าง ${techName} สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <label htmlFor="status-filter" className="font-medium text-gray-700 mr-2 text-base">สถานะ:</label>
                            <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base">
                                <option value="all">ทั้งหมด</option>
                                <option value="ว่าง">ว่าง</option>
                                <option value="ไม่ว่าง">ไม่ว่าง</option>
                                <option value="ลา">ลา</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sort-by" className="font-medium text-gray-700 mr-2 text-base">เรียงตาม:</label>
                            <select id="sort-by" value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base">
                                <option value="rating-desc">เรตติ้ง (สูง-ต่ำ)</option>
                                <option value="rating-asc">เรตติ้ง (ต่ำ-สูง)</option>
                                <option value="experience-desc">ประสบการณ์ (สูง-ต่ำ)</option>
                                <option value="experience-asc">ประสบการณ์ (ต่ำ-สูง)</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={() => handleOpenEditModal(null)} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + เพิ่มช่างใหม่
                    </button>
                </div>
                <div className="border-t pt-4">
                    <label className="font-medium text-gray-700 mb-2 block text-base">ทักษะ:</label>
                    <div className="flex flex-wrap gap-2">
                        {allSkills.map(skill => (
                            <button
                                key={skill}
                                onClick={() => handleSkillToggle(skill)}
                                className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${
                                    skillFilter.includes(skill)
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {skill}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedTechnicians.map(tech => (
                    <div key={tech.id} className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-gray-800">{tech.name}</h3>
                                <span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(tech.calculatedStatus)}`}>{tech.calculatedStatus}</span>
                            </div>
                            <p className="text-gray-500 text-sm font-semibold">{tech.role}</p>
                            <p className="text-gray-500 text-sm">ID: {tech.id} | ประสบการณ์ {tech.experience} ปี</p>
                            <div className="mt-4 flex flex-wrap gap-2 h-12 overflow-y-auto">
                                {(Array.isArray(tech.skills) ? tech.skills : []).map(skill => (
                                    <span key={skill} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4">
                             <div className="flex justify-around text-center">
                                <div><p className="text-lg font-bold text-gray-800">{tech.completedJobs}</p><p className="text-sm text-gray-500">งานเสร็จ</p></div>
                                <div><p className="text-lg font-bold text-yellow-600">{tech.activeJobsCount}</p><p className="text-sm text-gray-500">กำลังทำ</p></div>
                                <div><p className="text-lg font-bold text-green-600">{tech.rating} ★</p><p className="text-sm text-gray-500">เรตติ้ง</p></div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <button onClick={() => openDetailModal(tech)} className="col-span-3 text-base w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors">ดูรายละเอียด</button>
                                <button onClick={() => handleOpenEditModal(tech)} className="text-base text-white bg-yellow-500 hover:bg-yellow-600 font-semibold py-2 px-4 rounded-lg transition-colors">แก้ไข</button>
                                <button onClick={() => handleDeleteTechnician(tech.id, tech.name)} className="col-span-2 text-base text-white bg-red-500 hover:bg-red-600 font-semibold py-2 px-4 rounded-lg transition-colors">ลบ</button>
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
        </div>
    );
};

export default TechnicianManagement;