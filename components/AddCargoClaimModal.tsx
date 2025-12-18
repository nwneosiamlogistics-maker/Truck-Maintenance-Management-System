import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { CargoInsuranceClaim, CargoInsurancePolicy } from '../types';

interface AddCargoClaimModalProps {
    onClose: () => void;
    onSave: (claim: Omit<CargoInsuranceClaim, 'id'>) => void;
    policies: CargoInsurancePolicy[];
}

const AddCargoClaimModal: React.FC<AddCargoClaimModalProps> = ({ onClose, onSave, policies }) => {
    const [policyId, setPolicyId] = useState('');
    const [jobId, setJobId] = useState('');
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
    const [incidentLocation, setIncidentLocation] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [driverName, setDriverName] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [cargoDescription, setCargoDescription] = useState('');
    const [damageDescription, setDamageDescription] = useState('');
    const [estimatedDamage, setEstimatedDamage] = useState<string>('');
    const [claimedAmount, setClaimedAmount] = useState<string>('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            policyId,
            jobId,
            incidentDate,
            incidentLocation,
            incidentDescription,
            driverName,
            licensePlate,
            cargoDescription,
            damageDescription,
            estimatedDamage: Number(estimatedDamage),
            claimedAmount: Number(claimedAmount),
            status: 'Reported',
            documents: [], // Handle documents separately if needed
            notes
        });
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-600 to-orange-600 text-white">
                    <div>
                        <h2 className="text-2xl font-bold">แจ้งเคลมประกันภัยสินค้า</h2>
                        <p className="text-red-100 text-sm mt-1">File Cargo Insurance Claim</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Policy Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">เลือกกรมธรรม์ <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={policyId}
                                onChange={e => setPolicyId(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">-- เลือกกรมธรรม์ --</option>
                                {policies.filter(p => p.status === 'Active').map(policy => (
                                    <option key={policy.id} value={policy.id}>
                                        {policy.policyNumber} ({policy.insurer}) - {policy.coverageType}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Incident Details */}
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                ข้อมูลอุบัติเหตุ / ความเสียหาย
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">วันที่เกิดเหตุ <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="date"
                                        value={incidentDate}
                                        onChange={e => setIncidentDate(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">สถานที่เกิดเหตุ <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        value={incidentLocation}
                                        onChange={e => setIncidentLocation(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                        placeholder="ระบุสถานที่"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">ลักษณะเหตุการณ์ <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={incidentDescription}
                                        onChange={e => setIncidentDescription(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                        placeholder="อธิบายเหตุการณ์โดยย่อ..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Job & Transport Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">เลขที่ใบงาน / Job ID</label>
                                <input
                                    type="text"
                                    value={jobId}
                                    onChange={e => setJobId(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    placeholder="เช่น J-2024-XXXX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ทะเบียนรถที่ขนส่ง</label>
                                <input
                                    type="text"
                                    value={licensePlate}
                                    onChange={e => setLicensePlate(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    placeholder="เช่น 70-XXXX"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อพนักงานขับรถ</label>
                                <input
                                    type="text"
                                    value={driverName}
                                    onChange={e => setDriverName(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    placeholder="ชื่อ-นามสกุล"
                                />
                            </div>
                        </div>

                        {/* Cargo & Damage */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">รายการสินค้าที่เสียหาย <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={cargoDescription}
                                onChange={e => setCargoDescription(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                placeholder="ระบุประเภท/ชื่อสินค้า"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">รายละเอียดความเสียหาย <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                rows={2}
                                value={damageDescription}
                                onChange={e => setDamageDescription(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                placeholder="สภาพความเสียหายของสินค้า..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">มูลค่าความเสียหายประเมิน (บาท)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={estimatedDamage}
                                    onChange={e => setEstimatedDamage(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนเงินที่เรียกร้อง (บาท) <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={claimedAmount}
                                    onChange={e => setClaimedAmount(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                placeholder="บันทึกเพิ่มเติม..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-6 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 px-6 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                            >
                                ยืนยันการแจ้งเคลม
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddCargoClaimModal;
