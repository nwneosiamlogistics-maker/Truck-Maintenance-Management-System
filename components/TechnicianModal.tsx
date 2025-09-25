

import React from 'react';
import type { Technician, Repair } from '../types';

interface TechnicianModalProps {
    technician: Technician;
    repairs: Repair[];
    onClose: () => void;
}

const TechnicianModal: React.FC<TechnicianModalProps> = ({ technician, repairs, onClose }) => {
    
    const getStatusBadge = (status: Repair['status']) => {
        switch (status) {
            case 'รอซ่อม': return 'bg-gray-200 text-gray-800';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-800';
            case 'รออะไหล่': return 'bg-yellow-100 text-yellow-800';
            case 'ซ่อมเสร็จ': return 'bg-green-100 text-green-800';
            case 'ยกเลิก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const safeRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => 
        r.assignedTechnicianId === technician.id || (r.assistantTechnicianIds || []).includes(technician.id)
    );
    const safeSkills = Array.isArray(technician.skills) ? technician.skills : [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{technician.name}</h3>
                        <p className="text-base text-gray-500">ID: {technician.id} | ตำแหน่ง: {technician.role}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">ข้อมูลทั่วไป</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-base">
                            <p><strong>สถานะ:</strong> {technician.status}</p>
                            <p><strong>ประสบการณ์:</strong> {technician.experience} ปี</p>
                            <p><strong>เรตติ้ง:</strong> {technician.rating} ★</p>
                            <p><strong>งานที่เสร็จแล้ว:</strong> {technician.completedJobs}</p>
                            <p><strong>งานปัจจุบัน:</strong> {technician.currentJobs}</p>
                        </div>
                         <div className="mt-3">
                            <p><strong>ทักษะ:</strong> {safeSkills.join(', ')}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">ประวัติงานซ่อม</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภทงานซ่อม</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {safeRepairs.length > 0 ? (
                                        safeRepairs.slice(0, 5).map(job => (
                                            <tr key={job.id}>
                                                <td className="px-4 py-3 text-base">{new Date(job.createdAt).toLocaleDateString('th-TH')}</td>
                                                <td className="px-4 py-3 text-base font-semibold">{job.licensePlate}</td>
                                                <td className="px-4 py-3 text-base">{job.repairCategory}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(job.status)}`}>{job.status}</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-500 text-base">
                                                ไม่พบประวัติงานซ่อม
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end">
                     <button onClick={onClose} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">ปิด</button>
                </div>
            </div>
        </div>
    );
};

export default TechnicianModal;