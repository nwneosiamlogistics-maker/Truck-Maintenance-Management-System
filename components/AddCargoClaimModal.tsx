import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { CargoInsuranceClaim, CargoInsurancePolicy, Driver } from '../types';
import PhotoUpload from './PhotoUpload';

interface AddCargoClaimModalProps {
    onClose: () => void;
    onSave: (claim: Omit<CargoInsuranceClaim, 'id'>) => void;
    policies: CargoInsurancePolicy[];
    drivers: Driver[];
}

const AddCargoClaimModal: React.FC<AddCargoClaimModalProps> = ({ onClose, onSave, policies, drivers }) => {
    const [policyId, setPolicyId] = useState('');
    const [jobId, setJobId] = useState('');
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
    const [incidentLocation, setIncidentLocation] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [driverName, setDriverName] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [cargoDescription, setCargoDescription] = useState('');
    const [cargoCategory, setCargoCategory] = useState<string>('general');
    const [damageDescription, setDamageDescription] = useState('');
    const [estimatedDamage, setEstimatedDamage] = useState<string>('');
    const [claimedAmount, setClaimedAmount] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isDriverSuggestionsOpen, setIsDriverSuggestionsOpen] = useState(false);
    const [driverSuggestions, setDriverSuggestions] = useState<Driver[]>([]);
    const driverSuggestionsRef = React.useRef<HTMLDivElement>(null);

    const selectedPolicy = policies.find(p => p.id === policyId);

    // Deductible Logic
    const calculateDeductible = () => {
        if (!selectedPolicy) return 0;
        const amount = Number(claimedAmount) || 0;

        if (selectedPolicy.deductibleRules?.type === 'percentage_with_min') {
            const percentage = selectedPolicy.deductibleRules.percentage || 10;
            const min = selectedPolicy.deductibleRules.minAmount || 5000;
            return Math.max(amount * (percentage / 100), min);
        }

        // Default Chubb logic or fallback
        const highRiskCategories = selectedPolicy.deductibleRules?.highRisk?.categories || ['agriculture', 'fragile', 'glass', 'ceramics'];
        if (highRiskCategories.includes(cargoCategory)) {
            const rate = selectedPolicy.deductibleRules?.highRisk?.rate || 0.10;
            const min = selectedPolicy.deductibleRules?.highRisk?.minAmount || 5000;
            return Math.max(amount * rate, min);
        }

        return selectedPolicy.deductibleRules?.standard || selectedPolicy.deductible || 5000;
    };

    const isVehicleCovered = () => {
        if (!selectedPolicy || !licensePlate) return true; // Don't block if not selected or empty
        if (!selectedPolicy.coveredVehicles) return true;
        return selectedPolicy.coveredVehicles.some(v => licensePlate.includes(v.trim()) || v.trim().includes(licensePlate));
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (driverSuggestionsRef.current && !driverSuggestionsRef.current.contains(event.target as Node)) {
                setIsDriverSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDriverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDriverName(value);

        if (value) {
            const filtered = drivers.filter(d =>
                d.name.toLowerCase().includes(value.toLowerCase()) ||
                d.employeeId.toLowerCase().includes(value.toLowerCase())
            );
            setDriverSuggestions(filtered);
            setIsDriverSuggestionsOpen(true);
        } else {
            setDriverSuggestions(drivers);
            setIsDriverSuggestionsOpen(true);
        }
    };

    const handleDriverSuggestionClick = (driver: Driver) => {
        setDriverName(driver.name);
        if (driver.primaryVehicle) {
            setLicensePlate(driver.primaryVehicle);
        }
        setIsDriverSuggestionsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            policyId,
            claimNumber: `CLM-CARGO-${Date.now()}`,
            jobId,
            vehicleLicensePlate: licensePlate,
            driverName,
            incidentDate,
            incidentLocation,
            incidentDescription,
            cargoDescription,
            cargoCategory,
            damageDescription,
            estimatedDamage: Number(estimatedDamage),
            claimedAmount: Number(claimedAmount),
            deductible: calculateDeductible(),
            status: 'filed',
            photos,
            documents: [],
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center p-4 z-[9999] animate-fade-in overflow-y-auto items-start pt-8 pb-8">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col relative">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black tracking-tight">แจ้งเคลมประกันภัยสินค้า</h2>
                        <p className="text-rose-100 font-bold text-sm mt-1 uppercase tracking-widest">Cargo Insurance Claim Submission</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-95 relative z-10" aria-label="Close modal">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                </div>

                <div className="overflow-y-auto p-10 flex-1 custom-scrollbar space-y-8">
                    <form id="cargo-claim-form" onSubmit={handleSubmit} className="space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="policy-selector" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">เลือกกรมธรรม์ที่คุ้มครอง <span className="text-rose-500">*</span></label>
                                <select
                                    id="policy-selector"
                                    title="เลือกกรมธรรม์"
                                    required
                                    value={policyId}
                                    onChange={e => setPolicyId(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                                >
                                    <option value="">-- เลือกกรมธรรม์ --</option>
                                    {policies.filter(p => p.status === 'Active').map(policy => (
                                        <option key={policy.id} value={policy.id}>
                                            {policy.policyNumber} | {policy.insurer}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="incident-date" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">วันที่เกิดเหตุ <span className="text-rose-500">*</span></label>
                                <input
                                    id="incident-date"
                                    title="วันที่เกิดเหตุ"
                                    required
                                    type="date"
                                    value={incidentDate}
                                    onChange={e => setIncidentDate(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-500 outline-none transition-all font-bold text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="incident-location" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">สถานที่เกิดเหตุ <span className="text-rose-500">*</span></label>
                            <input
                                id="incident-location"
                                title="สถานที่เกิดเหตุ"
                                required
                                type="text"
                                value={incidentLocation}
                                onChange={e => setIncidentLocation(e.target.value)}
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-500 outline-none transition-all font-bold text-slate-800"
                                placeholder="เช่น ถ.พหลโยธิน กม. 42 จ.ปทุมธานี"
                            />
                        </div>

                        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-6">
                            <h4 className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase tracking-widest">
                                <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs">📦</span>
                                ข้อมูลสินค้าและความเสียหาย
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="cargo-category" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทกลุ่มสินค้า (Risk Category)</label>
                                    <select
                                        id="cargo-category"
                                        title="ประเภทกลุ่มสินค้า"
                                        value={cargoCategory}
                                        onChange={e => setCargoCategory(e.target.value)}
                                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                    >
                                        <option value="general">สินค้าทั่วไป (Standard)</option>
                                        <option value="agriculture">สินค้าเกษตร / แป้งมัน / น้ำตาล</option>
                                        <option value="fragile">สินค้าแตกหักง่าย (Fragile)</option>
                                        <option value="glass">กระจก / กระเบื้อง (Glass)</option>
                                        <option value="ceramics">เซรามิค (Ceramics)</option>
                                        <option value="machinery">เครื่องจักร (Machinery)</option>
                                        <option value="luxury">รถยนต์ / สินค้ามูลค่าสูง</option>
                                        <option value="other">อื่นๆ (Other)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="cargo-description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายการสินค้า</label>
                                    <input
                                        id="cargo-description"
                                        required
                                        type="text"
                                        value={cargoDescription}
                                        onChange={e => setCargoDescription(e.target.value)}
                                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                        placeholder="เช่น อะไหล่รถยนต์ / แป้งมันถุง 50kg"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Warnings */}
                            {selectedPolicy?.insurer.includes('AIG') && (
                                <div className="space-y-4">
                                    {cargoCategory === 'luxury' && (
                                        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex items-start gap-4 animate-pulse">
                                            <span className="text-3xl">🚫</span>
                                            <div>
                                                <p className="text-red-800 font-black text-sm uppercase tracking-tight">ข้อยกเว้น: รถยนต์มูลค่าสูง (AIG Restriction)</p>
                                                <p className="text-red-700 text-xs font-bold mt-1 leading-relaxed">
                                                    กรมธรรม์ AIG <span className="underline">ไม่คุ้มครอง</span> รถยนต์ Super Car, รถแข่ง, และรถนำเข้าอิสระ กรุณาตรวจสอบเอกสารแนบก่อนดำเนินการ
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {cargoCategory === 'machinery' && (
                                        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl flex items-start gap-4">
                                            <span className="text-3xl">⚙️</span>
                                            <div>
                                                <p className="text-amber-800 font-black text-sm uppercase tracking-tight">เงื่อนไข: เครื่องจักรน้ำหนักมาก</p>
                                                <p className="text-amber-700 text-xs font-bold mt-1 leading-relaxed">
                                                    เครื่องจักรที่มีน้ำหนักเกิน 1,000 กิโลกรัม จะคุ้มครองเฉพาะกรณีบรรจุในตู้ทึบเท่านั้น
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">🗳️</span>
                                    <div>
                                        <p className="text-blue-900 font-black text-xs uppercase tracking-tight">Deductible Estimate</p>
                                        <p className="text-blue-700 text-lg font-black">{calculateDeductible().toLocaleString()} บาท</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-blue-400 text-right uppercase tracking-widest leading-relaxed">
                                    {selectedPolicy?.deductibleRules?.type === 'percentage_with_min' ? '10% of loss\nmin 5,000 THB' : 'based on\npolicy rules'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="damage-description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ลักษณะความเสียหาย</label>
                                <textarea
                                    id="damage-description"
                                    title="ลักษณะความเสียหาย"
                                    required
                                    rows={2}
                                    value={damageDescription}
                                    onChange={e => setDamageDescription(e.target.value)}
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-rose-500 outline-none transition-all font-medium text-slate-700"
                                    placeholder="เช่น ถุงแตกจากแรงกระแทก / เปียกน้ำฝน"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="estimated-damage" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">มูลค่าความเสียหายประเมิน</label>
                                <div className="relative">
                                    <input
                                        id="estimated-damage"
                                        title="มูลค่าความเสียหายประเมิน"
                                        type="number"
                                        value={estimatedDamage}
                                        onChange={e => setEstimatedDamage(e.target.value)}
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xl text-slate-800 pr-16"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">THB</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="claimed-amount" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">จำนวนเงินที่เรียกร้อง <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <input
                                        id="claimed-amount"
                                        title="จำนวนเงินที่เรียกร้อง"
                                        required
                                        type="number"
                                        value={claimedAmount}
                                        onChange={e => setClaimedAmount(e.target.value)}
                                        className="w-full p-5 bg-rose-50/30 border-2 border-rose-100 rounded-2xl focus:bg-white focus:border-rose-500 outline-none transition-all font-black text-xl text-rose-700 pr-16"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-rose-200">THB</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-indigo-50/50 rounded-[2rem] border-2 border-indigo-100 space-y-6">
                            <h4 className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase tracking-widest">
                                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">🚛</span>
                                ข้อมูลการขนส่ง (Trip Details)
                            </h4>
                            {!isVehicleCovered() && licensePlate && (
                                <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-center gap-3 animate-shake">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-rose-700 text-xs font-black">แจ้งเตือน: ทะเบียนรถนี้ไม่อยู่ในรายชื่อรถที่คุ้มครองของกรมธรรม์ที่เลือก</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label htmlFor="job-id" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job ID / เอกสารอ้างอิง</label>
                                    <input id="job-id" title="Job ID" type="text" value={jobId} onChange={e => setJobId(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-2 focus:border-indigo-500 outline-none font-bold text-slate-700 uppercase" placeholder="J-XXXXX" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="license-plate" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ทะเบียนรถ</label>
                                    <input id="license-plate" title="ทะเบียนรถ" type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-2 focus:border-indigo-500 outline-none font-bold text-slate-700" placeholder="70-XXXX" />
                                </div>
                                <div ref={driverSuggestionsRef} className="space-y-1 relative">
                                    <label htmlFor="driver-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อพนักงานขับรถ</label>
                                    <input
                                        id="driver-name"
                                        title="ชื่อพนักงานขับรถ"
                                        type="text"
                                        value={driverName}
                                        onChange={handleDriverInputChange}
                                        onFocus={() => {
                                            setDriverSuggestions(drivers.filter(d =>
                                                d.name.toLowerCase().includes(driverName.toLowerCase()) ||
                                                d.employeeId.toLowerCase().includes(driverName.toLowerCase())
                                            ));
                                            setIsDriverSuggestionsOpen(true);
                                        }}
                                        autoComplete="off"
                                        className="w-full bg-transparent border-b-2 border-slate-200 py-2 focus:border-indigo-500 outline-none font-bold text-slate-700"
                                        placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                                    />
                                    {isDriverSuggestionsOpen && (
                                        <ul className="absolute z-[10000] w-full bg-white border border-slate-200 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-2xl animate-scale-in">
                                            {driverSuggestions.length > 0 ? (
                                                driverSuggestions.map(d => (
                                                    <li
                                                        key={d.id}
                                                        onClick={() => handleDriverSuggestionClick(d)}
                                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-50 transition-colors"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-xs">{d.name}</p>
                                                            <p className="text-[9px] text-slate-400">{d.employeeId}</p>
                                                        </div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="px-4 py-3 text-center text-slate-400 text-[10px] font-medium">ไม่พบข้อมูล</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Photos Section */}
                        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-6">
                            <h4 className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase tracking-widest">
                                <span className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center text-xs">📸</span>
                                รูปภาพประกอบการเคลม
                            </h4>
                            <PhotoUpload
                                photos={photos}
                                onChange={setPhotos}
                                entity="cargoClaim"
                                entityId="new"
                            />
                        </div>
                    </form>
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 px-8 rounded-2xl border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="cargo-claim-form"
                        className="flex-1 py-5 px-8 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-95"
                    >
                        ยื่นใบเคลมสินค้า
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddCargoClaimModal;
