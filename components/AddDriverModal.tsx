import React, { useState } from 'react';
import type { Driver, LicenseClass, DriverStatus } from '../types';
import PhotoUpload from './PhotoUpload';
import { confirmAction } from '../utils';

// Thai National ID utilities
const formatThaiId = (raw: string): string => {
    const d = raw.replace(/\D/g, '').slice(0, 13);
    if (!d) return '';
    const p = [d.slice(0,1), d.slice(1,5), d.slice(5,10), d.slice(10,12), d.slice(12,13)].filter(Boolean);
    return p.join('-');
};

const validateThaiId = (raw: string): boolean => {
    const d = raw.replace(/\D/g, '');
    if (d.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(d[i]) * (13 - i);
    return (11 - (sum % 11)) % 10 === parseInt(d[12]);
};

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
        photos: driver?.photos || [] as string[],
        idCard: (driver as any)?.idCard || '',
        certificate: {
            certificateNo: driver?.certificate?.certificateNo || '',
            issuedDate: driver?.certificate?.issuedDate || '',
        },
    });

    const [certificationInput, setCertificationInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleMatrixNestedChange = <K extends 'criminalCheck' | 'drugTests' | 'safetyInduction' | 'defensiveDriving' | 'incabCoaching' | 'certificate'>(
        key: K,
        field: string,
        value: string | number | boolean
    ) => {
        setFormData(prev => ({
            ...prev,
            [key]: { ...(prev as any)[key], [field]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        const isEdit = !!driver;
        const ok = await confirmAction(
            isEdit ? 'ยืนยันการแก้ไขข้อมูลพนักงาน' : 'ยืนยันการเพิ่มพนักงานขับรถ',
            isEdit
                ? `ต้องการบันทึกการแก้ไขข้อมูลของ ${driver?.name} ใช่หรือไม่?`
                : `ต้องการเพิ่มพนักงานขับรถ “${formData.name}” ใช่หรือไม่?`,
            'บันทึก'
        );
        if (!ok) return;

        setIsSubmitting(true);
        const safePhotos = Array.isArray(formData.photos) ? formData.photos : [];
        try {
            if (driver) {
                // Editing existing driver
                await onSave({
                    ...driver,
                    ...formData,
                    photos: safePhotos,
                    updatedAt: new Date().toISOString()
                } as Driver);
            } else {
                // Adding new driver
                const newDriver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> = {
                    ...formData,
                    photos: safePhotos
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4" onClick={onClose}>
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

                    {/* Certifications — เชื่อมกับ Certificate ใน DriverMatrix */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">6</span>
                            ใบรับรองและการอบรม
                            <span className="text-xs font-normal text-slate-400 ml-1">(Certificate)</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Certificate No. <span className="text-xs font-normal text-slate-400">(หมายเลขใบรับรอง)</span></label>
                                <input
                                    type="text"
                                    value={(formData as any).certificate?.certificateNo || ''}
                                    onChange={e => handleMatrixNestedChange('certificate', 'certificateNo', e.target.value)}
                                    placeholder="หมายเลขใบรับรอง"
                                    title="Certificate Number"
                                    className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Issued Date <span className="text-xs font-normal text-slate-400">(วันที่ออกใบรับรอง)</span></label>
                                <input
                                    type="date"
                                    value={(formData as any).certificate?.issuedDate || ''}
                                    onChange={e => handleMatrixNestedChange('certificate', 'issuedDate', e.target.value)}
                                    title="Certificate Issued Date"
                                    className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Driver Matrix Fields */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">7</span>
                            ข้อมูล Driver Matrix
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* บัตรประชาชน */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    หมายเลขบัตรประชาชน
                                </label>
                                {(() => {
                                    const raw = ((formData as any).idCard || '').replace(/\D/g, '');
                                    const isValid = raw.length === 13 && validateThaiId(raw);
                                    const isInvalid = raw.length === 13 && !isValid;
                                    return (
                                        <>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                name="idCard"
                                                value={raw}
                                                onChange={e => {
                                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                                                    setFormData(prev => ({ ...prev, idCard: digits } as any));
                                                }}
                                                placeholder="1234567890123"
                                                maxLength={13}
                                                title="หมายเลขบัตรประชาชน 13 หลัก"
                                                aria-label="หมายเลขบัตรประชาชน"
                                                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 outline-none font-mono ${
                                                    isInvalid ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
                                                    : isValid ? 'border-emerald-400 focus:ring-emerald-100 focus:border-emerald-500'
                                                    : 'border-slate-200 focus:ring-cyan-100 focus:border-cyan-500'
                                                }`}
                                            />
                                            {raw.length > 0 && (
                                                <div className="mt-1 font-mono text-slate-500 text-sm tracking-wider">
                                                    {formatThaiId(raw)}
                                                </div>
                                            )}
                                            {isValid && <p className="text-emerald-600 text-xs mt-1 font-medium">✓ หมายเลขถูกต้อง (Checksum ผ่าน)</p>}
                                            {isInvalid && <p className="text-red-500 text-xs mt-1 font-medium">✗ Checksum ไม่ถูกต้อง — กรุณาตรวจสอบอีกครั้ง</p>}
                                            {raw.length > 0 && raw.length < 13 && <p className="text-amber-500 text-xs mt-1">กรอกให้ครบ 13 หลัก ({raw.length}/13)</p>}
                                        </>
                                    );
                                })()}
                            </div>
                            {/* วันเกิด */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">วัน/เดือน/ปีเกิด</label>
                                <input type="date" name="dateOfBirth" value={(formData as any).dateOfBirth || ''}
                                    onChange={handleInputChange} title="วันเดือนปีเกิด"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none" />
                            </div>
                            {/* ผลตรวจอาชญากรรม */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ผลตรวจประวัติอาชญากรรม</label>
                                <select value={(formData as any).criminalCheck?.result || ''}
                                    onChange={e => handleMatrixNestedChange('criminalCheck', 'result', e.target.value)}
                                    title="ผลตรวจประวัติอาชญากรรม" aria-label="ผลตรวจประวัติอาชญากรรม"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none">
                                    <option value="">- เลือก -</option>
                                    <option value="ผ่าน">ผ่าน</option>
                                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                                    <option value="รอผล">รอผล</option>
                                </select>
                            </div>
                            {/* คดีที่พบ */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">คดีที่พบในประวัติอาชญากรรม</label>
                                <input type="text" value={(formData as any).criminalCheck?.remark || ''}
                                    onChange={e => handleMatrixNestedChange('criminalCheck', 'remark', e.target.value)}
                                    placeholder="ระบุถ้ามี" title="คดีที่พบ"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none" />
                            </div>
                            {/* GPS Provider */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">GPS Provider</label>
                                <input type="text" name="gpsProvider" value={(formData as any).gpsProvider || ''}
                                    onChange={handleInputChange} placeholder="ชื่อผู้ให้บริการ GPS"
                                    title="GPS Provider"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none" />
                            </div>
                            {/* Facing Camera */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Facing Camera Provider</label>
                                <input type="text" name="facingCamera" value={(formData as any).facingCamera || ''}
                                    onChange={handleInputChange} placeholder="ชื่อผู้ให้บริการกล้อง"
                                    title="Facing Camera Provider"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none" />
                            </div>
                        </div>

                        {/* ตรวจสารเสพติด */}
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <h5 className="text-sm font-bold text-orange-700 mb-3">ตรวจสารเสพติด (Drug Test) — DD-MMM-YY</h5>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">สูตร (Formula)</label>
                                    <input type="text" value={(formData as any).drugTests?.formula || ''}
                                        onChange={e => handleMatrixNestedChange('drugTests', 'formula', e.target.value)}
                                        placeholder="สูตร" title="สูตรตรวจสารเสพติด"
                                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                                </div>
                                {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                                    <div key={q}>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{q.toUpperCase()}</label>
                                        <input type="date" value={(formData as any).drugTests?.[q] || ''}
                                            onChange={e => handleMatrixNestedChange('drugTests', q, e.target.value)}
                                            title={`ตรวจสารเสพติด ${q.toUpperCase()}`}
                                            className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Defensive Driving */}
                        <div className="mt-4 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                            <h5 className="text-sm font-bold text-cyan-700 mb-3">Defensive Driving Program & Refresh Training</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Plan</label>
                                    <input type="text" value={(formData as any).defensiveDriving?.plan || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'plan', e.target.value)}
                                        placeholder="Plan" title="Defensive Driving Plan"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Booking Date</label>
                                    <input type="date" value={(formData as any).defensiveDriving?.bookingDate || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'bookingDate', e.target.value)}
                                        title="Booking Date"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">วันเริ่มอบรม (Start)</label>
                                    <input type="date" value={(formData as any).defensiveDriving?.startDate || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'startDate', e.target.value)}
                                        title="Start Training Date"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">วันสิ้นสุด (Finished)</label>
                                    <input type="date" value={(formData as any).defensiveDriving?.endDate || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'endDate', e.target.value)}
                                        title="Finished Training Date"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Pre Test</label>
                                    <input type="number" value={(formData as any).defensiveDriving?.preTest ?? ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'preTest', Number(e.target.value))}
                                        placeholder="0-100" title="Pre Test Score"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Post Test</label>
                                    <input type="number" value={(formData as any).defensiveDriving?.postTest ?? ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'postTest', Number(e.target.value))}
                                        placeholder="0-100" title="Post Test Score"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Trainer</label>
                                    <input type="text" value={(formData as any).defensiveDriving?.trainer || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'trainer', e.target.value)}
                                        placeholder="ชื่อผู้ฝึกสอน" title="Trainer"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Next Refresh Date</label>
                                    <input type="date" value={(formData as any).defensiveDriving?.nextRefreshDate || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'nextRefreshDate', e.target.value)}
                                        title="Next Training Refresh Date"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Record 2022</label>
                                    <input type="text" value={(formData as any).defensiveDriving?.record2022 || ''}
                                        onChange={e => handleMatrixNestedChange('defensiveDriving', 'record2022', e.target.value)}
                                        placeholder="ประวัติ 2022" title="Record Training 2022"
                                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Incab Coaching */}
                        <div className="mt-4">
                            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                                <h5 className="text-sm font-bold text-violet-700 mb-3">Incab Coaching</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Score</label>
                                        <input type="number" value={(formData as any).incabCoaching?.score ?? ''}
                                            onChange={e => handleMatrixNestedChange('incabCoaching', 'score', Number(e.target.value))}
                                            placeholder="0-100" title="Incab Coaching Score"
                                            className="w-full px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                                        <input type="date" value={(formData as any).incabCoaching?.date || ''}
                                            onChange={e => handleMatrixNestedChange('incabCoaching', 'date', e.target.value)}
                                            title="Incab Coaching Date"
                                            className="w-full px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm focus:outline-none" />
                                    </div>
                                </div>
                            </div>
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
