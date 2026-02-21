import React, { useState } from 'react';
import type { Driver, LicenseClass, DriverStatus } from '../types';
import PhotoUpload from './PhotoUpload';

interface AddDriverModalProps {
    driver?: Driver | null;
    onClose: () => void;
    onSave: (driver: Driver | Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const LICENSE_GROUPS = [
    {
        label: '1. ใบขับขี่ส่วนบุคคล (ป้ายขาว ตัวอักษรดำ)',
        options: [
            { value: 'บ.1', label: 'บ.1: รถยนต์, รถกระบะ, รถตู้ น้ำหนักรวมไม่เกิน 3,500 กก. (อายุ 18 ปีขึ้นไป)' },
            { value: 'บ.2', label: 'บ.2: รถบรรทุกส่วนบุคคล น้ำหนักรวมเกิน 3,500 กก. (อายุ 20 ปีขึ้นไป)' },
            { value: 'บ.3', label: 'บ.3: รถพ่วง, รถเทรลเลอร์ (ส่วนบุคคล) (อายุ 20 ปีขึ้นไป)' },
            { value: 'บ.4', label: 'บ.4: รถบรรทุกวัตถุอันตราย (ส่วนบุคคล) (อายุ 25 ปีขึ้นไป)' }
        ]
    },
    {
        label: '2. ใบขับขี่ทุกประเภท/สาธารณะ (ป้ายเหลือง ตัวอักษรดำ)',
        options: [
            { value: 'ท.1', label: 'ท.1: รถแท็กซี่, รถตู้สาธารณะ, รถส่งของ (อายุ 22 ปีขึ้นไป)' },
            { value: 'ท.2', label: 'ท.2: รถบัส, รถเมล์, รถบรรทุกขนาดใหญ่ (เกิน 3,500 กก. หรือเกิน 20 คน)' },
            { value: 'ท.3', label: 'ท.3: รถพ่วง, รถเทรลเลอร์ (สาธารณะ) (อายุ 22 ปีขึ้นไป)' },
            { value: 'ท.4', label: 'ท.4: รถขนส่งวัตถุอันตราย (สาธารณะ) (อายุ 25 ปีขึ้นไป)' }
        ]
    }
];


const AddDriverModal: React.FC<AddDriverModalProps> = ({ driver, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        employeeId: driver?.employeeId || '',
        name: driver?.name || '',
        nickname: driver?.nickname || '',
        phone: driver?.phone || '',
        email: driver?.email || '',
        address: driver?.address || '',
        emergencyContact: {
            name: driver?.emergencyContact?.name || '',
            phone: driver?.emergencyContact?.phone || '',
            relationship: driver?.emergencyContact?.relationship || ''
        },
        licenseNumber: driver?.licenseNumber || '',
        licenseClass: (driver?.licenseClass || 'ท.2') as LicenseClass,
        licenseIssueDate: driver?.licenseIssueDate || '',
        licenseExpiry: driver?.licenseExpiry || '',
        hireDate: driver?.hireDate || new Date().toISOString().split('T')[0],
        experience: driver?.experience || 0,
        previousEmployer: driver?.previousEmployer || '',
        assignedVehicles: driver?.assignedVehicles || [] as string[],
        primaryVehicle: driver?.primaryVehicle || '',
        totalDistanceDriven: driver?.totalDistanceDriven || 0,
        totalTrips: driver?.totalTrips || 0,
        accidentCount: driver?.accidentCount || 0,
        violationCount: driver?.violationCount || 0,
        onTimeDeliveryRate: driver?.onTimeDeliveryRate || 100,
        lastSafetyTraining: driver?.lastSafetyTraining || '',
        certifications: driver?.certifications || [] as string[],
        safetyScore: driver?.safetyScore || 100,
        monthlySalary: driver?.monthlySalary || 0,
        bonus: driver?.bonus || 0,
        leaveQuota: driver?.leaveQuota || { sick: 30, personal: 6, vacation: 6 },
        usedLeave: driver?.usedLeave || { sick: 0, personal: 0, vacation: 0 },
        leaves: driver?.leaves || [],
        status: (driver?.status || 'active') as DriverStatus,
        notes: driver?.notes || '',
        photos: driver?.photos || [] as string[]
    });

    const [certificationInput, setCertificationInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (driver) {
                // Editing existing driver
                await onSave({
                    ...driver,
                    ...formData,
                    updatedAt: new Date().toISOString()
                } as Driver);
            } else {
                // Adding new driver
                const newDriver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> = {
                    ...formData
                };
                await onSave(newDriver);
            }
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        } finally {
            setTimeout(() => setIsSubmitting(false), 2000);
        }
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
                            <h3 className="text-2xl font-bold text-slate-800">{driver ? 'แก้ไขข้อมูลพนักงานขับรถ' : 'เพิ่มพนักงานขับรถ'}</h3>
                            <p className="text-sm text-slate-500 mt-1">{driver ? 'แก้ไขความต้องการข้อมูลคนขับ' : 'กรอกข้อมูลคนขับให้ครบถ้วน'}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
                            title="ปิดหน้าต่าง"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form id="add-driver-form" onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    {/* Basic Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">1</span>
                            ข้อมูลพื้นฐาน
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-id">รหัสพนักงาน *</label>
                                <input
                                    id="driver-id"
                                    type="text"
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="เช่น D001"
                                    title="รหัสพนักงาน"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-name">ชื่อ-นามสกุล *</label>
                                <input
                                    id="driver-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="ระบุชื่อเต็ม"
                                    title="ชื่อ-นามสกุล"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-nickname">ชื่อเล่น</label>
                                <input
                                    id="driver-nickname"
                                    type="text"
                                    name="nickname"
                                    value={formData.nickname}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อเล่น"
                                    title="ชื่อเล่น"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-phone">เบอร์โทรศัพท์ *</label>
                                <input
                                    id="driver-phone"
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="0xx-xxx-xxxx"
                                    title="เบอร์โทรศัพท์"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-email">อีเมล</label>
                                <input
                                    id="driver-email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="example@email.com"
                                    title="อีเมล"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-address">ที่อยู่</label>
                                <input
                                    id="driver-address"
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="ที่อยู่ปัจจุบัน"
                                    title="ที่อยู่"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Photos - ย้ายขึ้นมาด้านบนเพื่อความสะดวก */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">2</span>
                            รูปภาพพนักงาน / เอกสาร
                        </h4>
                        <PhotoUpload
                            photos={formData.photos}
                            onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                            entity="driver"
                            entityId={driver?.id || 'new'}
                        />
                    </div>

                    {/* License Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">3</span>
                            ข้อมูลใบขับขี่
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="license-number">หมายเลขใบขับขี่ *</label>
                                <input
                                    id="license-number"
                                    type="text"
                                    name="licenseNumber"
                                    value={formData.licenseNumber}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="ระบุหมายเลข"
                                    title="หมายเลขใบขับขี่"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="license-class">ประเภทใบขับขี่ *</label>
                                <select
                                    id="license-class"
                                    name="licenseClass"
                                    value={formData.licenseClass}
                                    onChange={handleInputChange}
                                    required
                                    title="ประเภทใบขับขี่"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                >
                                    {LICENSE_GROUPS.map(group => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.options.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="license-issue">วันออกใบขับขี่ *</label>
                                <input
                                    id="license-issue"
                                    type="date"
                                    name="licenseIssueDate"
                                    value={formData.licenseIssueDate}
                                    onChange={handleInputChange}
                                    required
                                    title="วันออกใบขับขี่"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="license-expiry">วันหมดอายุ *</label>
                                <input
                                    id="license-expiry"
                                    type="date"
                                    name="licenseExpiry"
                                    value={formData.licenseExpiry}
                                    onChange={handleInputChange}
                                    required
                                    title="วันหมดอายุ"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Employment Information */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">4</span>
                            ข้อมูลการทำงาน
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="hire-date">วันที่เริ่มงาน *</label>
                                <input
                                    id="hire-date"
                                    type="date"
                                    name="hireDate"
                                    value={formData.hireDate}
                                    onChange={handleInputChange}
                                    required
                                    title="วันที่เริ่มงาน"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-experience">ประสบการณ์ (ปี) *</label>
                                <input
                                    id="driver-experience"
                                    type="number"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    title="ประสบการณ์"
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-status">สถานะ *</label>
                                <select
                                    id="driver-status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                    title="สถานะ"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                >
                                    <option value="active">ปฏิบัติงาน</option>
                                    <option value="on_leave">ลา</option>
                                    <option value="suspended">พักงาน</option>
                                    <option value="terminated">ออกจากงาน</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="prev-employer">นายจ้างก่อนหน้า</label>
                                <input
                                    id="prev-employer"
                                    type="text"
                                    name="previousEmployer"
                                    value={formData.previousEmployer}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อบริษัทเดิม"
                                    title="นายจ้างก่อนหน้า"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">5</span>
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
                            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">6</span>
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
                        <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="driver-notes">หมายเหตุ</label>
                        <textarea
                            id="driver-notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            title="หมายเหตุ"
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none"
                        />
                    </div>


                </form>

                <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="add-driver-form"
                        disabled={isSubmitting}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:bg-purple-400 disabled:cursor-not-allowed min-w-[160px]"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : driver ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูลคนขับ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDriverModal;
