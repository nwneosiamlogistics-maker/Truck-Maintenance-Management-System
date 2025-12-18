import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { CargoInsurancePolicy, CargoCoverageType } from '../types';

interface AddCargoPolicyModalProps {
    onClose: () => void;
    onSave: (policy: Omit<CargoInsurancePolicy, 'id'>) => void;
}

const AddCargoPolicyModal: React.FC<AddCargoPolicyModalProps> = ({ onClose, onSave }) => {
    const [policyNumber, setPolicyNumber] = useState('');
    const [insurer, setInsurer] = useState('');
    const [coverageType, setCoverageType] = useState<CargoCoverageType>('All Risks');
    const [coverageLimit, setCoverageLimit] = useState<string>('');
    const [deductible, setDeductible] = useState<string>('');
    const [premium, setPremium] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            policyNumber,
            insurer,
            coverageType,
            coverageLimit: Number(coverageLimit),
            deductible: Number(deductible),
            premium: Number(premium),
            startDate,
            expiryDate,
            termsAndConditions,
            status: 'Active',
            notes
        });
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                    <div>
                        <h2 className="text-2xl font-bold">เพิ่มกรมธรรม์ประกันภัยสินค้า</h2>
                        <p className="text-indigo-100 text-sm mt-1">Inland Cargo Insurance Policy</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">เลขที่กรมธรรม์ <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={policyNumber}
                                    onChange={e => setPolicyNumber(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="เช่น C-2024-XXXX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">บริษัทประกันภัย <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={insurer}
                                    onChange={e => setInsurer(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="ระบุชื่อบริษัทประกัน"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ประเภทความคุ้มครอง</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {['All Risks', 'Named Perils', 'Total Loss Only'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setCoverageType(type as CargoCoverageType)}
                                        className={`p-3 rounded-xl border font-medium transition-all ${coverageType === type
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">วงเงินคุ้มครอง (บาท)</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={coverageLimit}
                                    onChange={e => setCoverageLimit(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ค่าเสียหายส่วนแรก (Deductible)</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={deductible}
                                    onChange={e => setDeductible(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">เบี้ยประกันสุทธิ (Premium)</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={premium}
                                    onChange={e => setPremium(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">วันคุ้มครอง</label>
                                <input
                                    required
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">วันสิ้นสุดความคุ้มครอง</label>
                                <input
                                    required
                                    type="date"
                                    value={expiryDate}
                                    onChange={e => setExpiryDate(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">เงื่อนไข / ความคุ้มครองเพิ่มเติม</label>
                            <textarea
                                rows={3}
                                value={termsAndConditions}
                                onChange={e => setTermsAndConditions(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="รายละเอียดเงื่อนไขเพิ่มเติม..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
                                className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                            >
                                บันทึกกรมธรรม์
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddCargoPolicyModal;
