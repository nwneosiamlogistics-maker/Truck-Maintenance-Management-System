
import React, { useState, useEffect } from 'react';
import type { Technician, TechnicianRole } from '../types';

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

export default TechnicianEditModal;