import React, { useState } from 'react';
import type { Driver, LicenseClass, DriverStatus } from '../types';

interface AddDriverModalProps {
    onClose: () => void;
    onSave: (driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const LICENSE_CLASSES: LicenseClass[] = ['ใบขับขี่ส่วนบุคคล', 'ใบขับขี่สาธารณะ', 'ใบขับขี่บรรทุก'];

const AddDriverModal: React.FC<AddDriverModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        nickname: '',
        phone: '',
        email: '',
        address: '',
        emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
        },
        licenseNumber: '',
        licenseClass: 'ใบขับขี่บรรทุก' as LicenseClass,
        licenseIssueDate: '',
        licenseExpiry: '',
        hireDate: new Date().toISOString().split('T')[0],
        experience: 0,
        previousEmployer: '',
        assignedVehicles: [] as string[],
        primaryVehicle: '',
        totalDistanceDriven: 0,
        totalTrips: 0,
        accidentCount: 0,
        violationCount: 0,
        onTimeDeliveryRate: 100,
        lastSafetyTraining: '',
        certifications: [] as string[],
        safetyScore: 100,
        monthlySalary: 0,
        bonus: 0,
        leaveQuota: { sick: 30, personal: 6, vacation: 6 },
        usedLeave: { sick: 0, personal: 0, vacation: 0 },
        leaves: [],
        status: 'active' as DriverStatus,
        notes: ''
    });

    const [certificationInput, setCertificationInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> = {
            ...formData
        };

        onSave(driver);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name.startsWith('emergencyContact.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: ['experience', 'totalDistanceDriven', 'totalTrips', 'accidentCount', 'violationCount', 'onTimeDeliveryRate', 'safetyScore', 'monthlySalary', 'bonus'].includes(name)
                    ? Number(value)
                    : value
            }));
        }
    };

    const addCertification = () => {
        if (certificationInput.trim()) {
            setFormData(prev => ({
                ...prev,
                certifications: [...prev.certifications, certificationInput.trim()]
            }));
            setCertificationInput('');
        }
    };

    const removeCertification = (index: number) => {
        setFormData(prev => ({
            ...prev,
            certifications: prev.certifications.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">เพิ่มพนักงานขับรถ</h3>
                            <p className="text-sm text-slate-500 mt-1">กรอกข้อมูลคนขับให้ครบถ้วน</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    {/* Basic Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">1</span>
                            ข้อมูลพื้นฐาน
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">รหัสพนักงาน *</label>
                                <input
                                    type="text"
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="เช่น D001"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อ-นามสกุล *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="ระบุชื่อเต็ม"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อเล่น</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={formData.nickname}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อเล่น"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์โทรศัพท์ *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="0xx-xxx-xxxx"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">อีเมล</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="example@email.com"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ที่อยู่</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="ที่อยู่ปัจจุบัน"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* License Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">2</span>
                            ข้อมูลใบขับขี่
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">หมายเลขใบขับขี่ *</label>
                                <input
                                    type="text"
                                    name="licenseNumber"
                                    value={formData.licenseNumber}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="ระบุหมายเลข"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทใบขับขี่ *</label>
                                <select
                                    name="licenseClass"
                                    value={formData.licenseClass}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                >
                                    {LICENSE_CLASSES.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">วันออกใบขับขี่ *</label>
                                <input
                                    type="date"
                                    name="licenseIssueDate"
                                    value={formData.licenseIssueDate}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">วันหมดอายุ *</label>
                                <input
                                    type="date"
                                    name="licenseExpiry"
                                    value={formData.licenseExpiry}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Employment Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">3</span>
                            ข้อมูลการทำงาน
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">วันที่เริ่มงาน *</label>
                                <input
                                    type="date"
                                    name="hireDate"
                                    value={formData.hireDate}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ประสบการณ์ (ปี) *</label>
                                <input
                                    type="number"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">สถานะ *</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                >
                                    <option value="active">ปฏิบัติงาน</option>
                                    <option value="on_leave">ลา</option>
                                    <option value="suspended">พักงาน</option>
                                    <option value="terminated">ออกจากงาน</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">นายจ้างก่อนหน้า</label>
                                <input
                                    type="text"
                                    name="previousEmployer"
                                    value={formData.previousEmployer}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อบริษัทเดิม"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">4</span>
                            ผู้ติดต่อฉุกเฉิน
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    name="emergencyContact.name"
                                    value={formData.emergencyContact?.name || ''}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อ-นามสกุล"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    name="emergencyContact.phone"
                                    value={formData.emergencyContact?.phone || ''}
                                    onChange={handleInputChange}
                                    placeholder="0xx-xxx-xxxx"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ความสัมพันธ์</label>
                                <input
                                    type="text"
                                    name="emergencyContact.relationship"
                                    value={formData.emergencyContact?.relationship || ''}
                                    onChange={handleInputChange}
                                    placeholder="เช่น พ่อ/แม่/พี่/น้อง"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Certifications */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">5</span>
                            ใบรับรองและการอบรม
                        </h4>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={certificationInput}
                                onChange={(e) => setCertificationInput(e.target.value)}
                                placeholder="เพิ่มใบรับรอง/การอบรม"
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={addCertification}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm"
                            >
                                เพิ่ม
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.certifications.map((cert, index) => (
                                <div key={index} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                                    {cert}
                                    <button
                                        type="button"
                                        onClick={() => removeCertification(index)}
                                        className="text-indigo-400 hover:text-indigo-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none"
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="px-8 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        บันทึกข้อมูลคนขับ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDriverModal;
