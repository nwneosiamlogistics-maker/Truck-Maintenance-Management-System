import React, { useState } from 'react';
import type { InsuranceClaim, IncidentType, Vehicle } from '../types';
import { formatCurrency } from '../utils';

interface AddInsuranceClaimModalProps {
    onClose: () => void;
    onSave: (claim: Omit<InsuranceClaim, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
    vehicles: Vehicle[];
}

const INCIDENT_TYPES: { value: IncidentType; label: string; icon: string }[] = [
    { value: 'collision', label: 'ชน (รถคันอื่น/สิ่งของ)', icon: '🚗💥' },
    { value: 'theft', label: 'ขโมย (รถหาย/อุปกรณ์หาย)', icon: '🦹' },
    { value: 'fire', label: 'ไฟไหม้', icon: '🔥' },
    { value: 'flood', label: 'น้ำท่วม', icon: '🌊' },
    { value: 'other', label: 'อื่นๆ (แตกเกิน, ฟ้าผ่า)', icon: '⚡' }
];

const AddInsuranceClaimModal: React.FC<AddInsuranceClaimModalProps> = ({ onClose, onSave, vehicles }) => {
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState({
        claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        incidentDate: new Date().toISOString().split('T')[0],
        claimDate: new Date().toISOString().split('T')[0],
        reportedBy: '',
        incidentType: 'collision' as IncidentType,
        incidentLocation: '',
        description: '',
        policeReportNumber: '',
        damageAssessment: 0,
        deductible: 0,
        estimatedRepairCost: 0,
        adjusterName: '',
        adjusterContact: '',
        notes: ''
    });

    const claimAmount = formData.damageAssessment - formData.deductible;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedVehicle) {
            alert('กรุณาเลือกรถ');
            return;
        }

        if (!formData.description) {
            alert('กรุณาระบุรายละเอียดอุบัติเหตุ');
            return;
        }

        const claim: Omit<InsuranceClaim, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
            claimNumber: formData.claimNumber,
            vehicleId: selectedVehicle.id,
            vehicleLicensePlate: selectedVehicle.licensePlate,
            policyNumber: selectedVehicle.insuranceCompany || 'N/A',
            insuranceCompany: selectedVehicle.insuranceCompany || '',
            incidentDate: formData.incidentDate,
            claimDate: formData.claimDate,
            reportedBy: formData.reportedBy,
            incidentType: formData.incidentType,
            incidentLocation: formData.incidentLocation,
            description: formData.description,
            policeReportNumber: formData.policeReportNumber || undefined,
            damageAssessment: formData.damageAssessment,
            claimAmount: Math.max(0, claimAmount),
            deductible: formData.deductible,
            status: 'filed',
            statusHistory: [{
                status: 'filed',
                date: new Date().toISOString(),
                notes: 'ยื่นเคลมเบื้องต้น'
            }],
            relatedRepairs: [],
            estimatedRepairCost: formData.estimatedRepairCost,
            adjusterName: formData.adjusterName || undefined,
            adjusterContact: formData.adjusterContact || undefined,
            documents: [],
            notes: formData.notes || undefined
        };

        onSave(claim);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['damageAssessment', 'deductible', 'estimatedRepairCost'].includes(name) ? Number(value) : value
        }));
    };

    const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const vehicleId = e.target.value;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        setSelectedVehicle(vehicle || null);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-rose-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">เพิ่มการเคลมประกันรถ</h3>
                            <p className="text-sm text-slate-500 mt-1">บันทึกการเคลมประกันเมื่อเกิดอุบัติเหตุ</p>
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    {/* Claim Number */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium mb-1">เลขที่เคลม</p>
                        <p className="text-2xl font-extrabold text-blue-900">{formData.claimNumber}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vehicle Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลือกรถ *</label>
                            <select
                                onChange={handleVehicleSelect}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            >
                                <option value="">-- เลือกรถ --</option>
                                {vehicles.map(vehicle => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.licensePlate} - {vehicle.vehicleType || 'N/A'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Vehicle & Insurance Info (Read-only) */}
                        {selectedVehicle && (
                            <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">ข้อมูลประกันรถ</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">บริษัทประกัน</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedVehicle.insuranceCompany || 'ไม่ระบุ'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">ประเภทประกัน</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedVehicle.insuranceType || 'ไม่ระบุ'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">วันหมดอายุ</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {selectedVehicle.insuranceExpiryDate
                                                ? new Date(selectedVehicle.insuranceExpiryDate).toLocaleDateString('th-TH')
                                                : 'ไม่ระบุ'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">บริษัท พ.ร.บ.</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedVehicle.actCompany || 'ไม่ระบุ'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่เกิดเหตุ *</label>
                            <input
                                type="date"
                                name="incidentDate"
                                value={formData.incidentDate}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ยื่นเคลม *</label>
                            <input
                                type="date"
                                name="claimDate"
                                value={formData.claimDate}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Reporter */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ผู้รายงาน *</label>
                            <input
                                type="text"
                                name="reportedBy"
                                value={formData.reportedBy}
                                onChange={handleInputChange}
                                required
                                placeholder="ชื่อผู้รายงานอุบัติเหตุ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Incident Type */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-3">ประเภทอุบัติเหตุ *</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {INCIDENT_TYPES.map(type => (
                                    <label
                                        key={type.value}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.incidentType === type.value
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-slate-200 bg-white hover:border-red-200'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="incidentType"
                                            value={type.value}
                                            checked={formData.incidentType === type.value}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-red-600"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{type.icon}</span>
                                                <span className="text-sm font-bold text-slate-800">{type.label}</span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">สถานที่เกิดเหตุ</label>
                            <input
                                type="text"
                                name="incidentLocation"
                                value={formData.incidentLocation}
                                onChange={handleInputChange}
                                placeholder="เช่น กม.100 ทางหลวง 1, หน้าร้านสะดวกซื้อ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">รายละเอียดอุบัติเหตุ *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                rows={4}
                                placeholder="อธิบายรายละเอียดอุบัติเหตุ, ความเสียหาย, และสภาพแวดล้อมขณะเกิดเหตุ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none resize-none"
                            />
                        </div>

                        {/* Police Report */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลขที่รายงานตำรวจ (ถ้ามี)</label>
                            <input
                                type="text"
                                name="policeReportNumber"
                                value={formData.policeReportNumber}
                                onChange={handleInputChange}
                                placeholder="เช่น PR-2024-001"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Cost Assessment */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเมินความเสียหาย (บาท) *</label>
                            <input
                                type="number"
                                name="damageAssessment"
                                value={formData.damageAssessment}
                                onChange={handleInputChange}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ค่าเสียหายส่วนแรก (บาท)</label>
                            <input
                                type="number"
                                name="deductible"
                                value={formData.deductible}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">จำนวนที่เราต้องจ่ายเอง</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเมินค่าซ่อม (บาท)</label>
                            <input
                                type="number"
                                name="estimatedRepairCost"
                                value={formData.estimatedRepairCost}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Claim Amount Summary */}
                        <div className="md:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                            <div className="grid grid-cols-3 gap-6 text-center">
                                <div>
                                    <p className="text-xs text-green-600 font-medium mb-2">ความเสียหายรวม</p>
                                    <p className="text-2xl font-extrabold text-slate-800">
                                        {formatCurrency(formData.damageAssessment)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-orange-600 font-medium mb-2">ส่วนแรก (เราจ่าย)</p>
                                    <p className="text-2xl font-extrabold text-orange-600">
                                        {formatCurrency(formData.deductible)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-green-600 font-medium mb-2">ยื่นเคลม</p>
                                    <p className="text-3xl font-extrabold text-green-600">
                                        {formatCurrency(Math.max(0, claimAmount))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Adjuster Info */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ตรวจสอบ (Adjuster)</label>
                            <input
                                type="text"
                                name="adjusterName"
                                value={formData.adjusterName}
                                onChange={handleInputChange}
                                placeholder="ชื่อผู้ตรวจสอบจากบริษัทประกัน"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์ติดต่อผู้ตรวจสอบ</label>
                            <input
                                type="text"
                                name="adjusterContact"
                                value={formData.adjusterContact}
                                onChange={handleInputChange}
                                placeholder="เบอร์โทรศัพท์"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none"
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุเพิ่มเติม</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={2}
                                placeholder="ข้อมูลเพิ่มเติม..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none resize-none"
                            />
                        </div>
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
                        onClick={handleSubmit}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        ยื่นเคลมประกัน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddInsuranceClaimModal;
