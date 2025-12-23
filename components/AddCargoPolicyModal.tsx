import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { CargoInsurancePolicy, CargoCoverageType } from '../types';

interface AddCargoPolicyModalProps {
    onClose: () => void;
    onSave: (policy: Omit<CargoInsurancePolicy, 'id'>) => void;
    initialData?: CargoInsurancePolicy;
    isEditMode?: boolean;
}

const AddCargoPolicyModal: React.FC<AddCargoPolicyModalProps> = ({ onClose, onSave, initialData, isEditMode = false }) => {
    // Shared State
    const [template, setTemplate] = useState<'chubb' | 'aig' | 'custom'>(initialData ? 'custom' : 'chubb');
    const [policyNumber, setPolicyNumber] = useState(
        initialData
            ? (isEditMode ? initialData.policyNumber : `RENEW-${initialData.policyNumber}`)
            : '402-25-11-CAL-00061'
    );
    const [insurer, setInsurer] = useState(initialData?.insurer || 'บมจ. ชับบ์สามัคคีประกันภัย (Chubb Samaggi Insurance)');
    const [insuredName, setInsuredName] = useState(initialData?.insuredName || 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด');
    const [coverageType, setCoverageType] = useState<CargoCoverageType>(initialData?.coverageType || 'All Risks');
    const [coverageLimit, setCoverageLimit] = useState<string>(initialData?.coverageLimit?.toString() || '1600000');
    const [totalAnnualLimit, setTotalAnnualLimit] = useState<string>(initialData?.totalAnnualLimit?.toString() || '30000000');

    // Renewal Date Logic: 
    // If Edit Mode: Use existing dates
    // If Renewal: New Start = Old Expiry, New Expiry = New Start + 1 Year
    // If New: Default to today and +1 year
    const defaultStart = initialData
        ? (isEditMode ? initialData.startDate : initialData.expiryDate)
        : new Date().toISOString().split('T')[0];

    const defaultExpiry = initialData
        ? (isEditMode ? initialData.expiryDate : new Date(new Date(initialData.expiryDate).setFullYear(new Date(initialData.expiryDate).getFullYear() + 1)).toISOString().split('T')[0])
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [expiryDate, setExpiryDate] = useState(defaultExpiry);

    const [centerPhone, setCenterPhone] = useState(initialData?.contactInfo?.center || '0 2611 4000');
    const [centerEmail, setCenterEmail] = useState(initialData?.contactInfo?.email || 'customerservice.th@chubb.com');
    const [premium, setPremium] = useState<string>(initialData?.premium?.toString() || '417894.92');
    const [termsAndConditions, setTermsAndConditions] = useState(initialData?.termsAndConditions || 'วงเงินตามประเภทรถ: ปิคอัพ 200k, 6-10ล้อ/พ่วง 800k, หัวลาก 1.6M. สินค้าเสี่ยงสูง Deductible 10% (min 5k)');
    const [notes, setNotes] = useState(initialData?.notes || '');

    // Deductible Logic
    const [deductibleType, setDeductibleType] = useState<'fixed' | 'percentage_with_min'>(initialData?.deductibleRules?.type || 'fixed');
    const [deductibleAmount, setDeductibleAmount] = useState<string>(initialData?.deductibleRules?.standard?.toString() || '5000');
    const [deductiblePercentage, setDeductiblePercentage] = useState<string>(initialData?.deductibleRules?.percentage?.toString() || '10');
    const [deductibleMin, setDeductibleMin] = useState<string>(initialData?.deductibleRules?.minAmount?.toString() || '5000');

    // Covered Vehicles (comma separated)
    const [coveredVehiclesText, setCoveredVehiclesText] = useState(initialData?.coveredVehicles?.join(', ') || '');

    const applyTemplate = (type: 'chubb' | 'aig' | 'custom') => {
        setTemplate(type);
        if (type === 'chubb') {
            setPolicyNumber('402-25-11-CAL-00061');
            setInsurer('บมจ. ชับบ์สามัคคีประกันภัย (Chubb Samaggi Insurance)');
            setCoverageLimit('1600000');
            setTotalAnnualLimit('30000000');
            setStartDate(new Date().toISOString().split('T')[0]);
            setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setCenterPhone('0 2611 4000');
            setCenterEmail('customerservice.th@chubb.com');
            setPremium('417894.92');
            setDeductibleType('fixed');
            setDeductibleAmount('5000');
            setTermsAndConditions('วงเงินตามประเภทรถ: ปิคอัพ 200k, 6-10ล้อ/พ่วง 800k, หัวลาก 1.6M. สินค้าเสี่ยงสูง Deductible 10% (min 5k)');
            setCoveredVehiclesText('');
        } else if (type === 'aig') {
            setPolicyNumber('41CLU04375');
            setInsurer('บมจ. เอไอจี ประกันภัย (ประเทศไทย) (AIG Insurance)');
            setCoverageLimit('200000');
            setTotalAnnualLimit('18000000');
            setStartDate(new Date().toISOString().split('T')[0]);
            setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setCenterPhone('0 2649 1000');
            setCenterEmail('thailand.service@aig.com');
            setPremium('0');
            setDeductibleType('percentage_with_min');
            setDeductiblePercentage('10');
            setDeductibleMin('5000');
            setTermsAndConditions('คุ้มครอง Flat Rate 200k ทุกคัน. ค่าเสียหายส่วนแรก 10% (min 5k). ขยายความคุ้มครองตู้คอนเทนเนอร์ 300k, Cross Border 50km.');
            setCoveredVehiclesText('');
        } else {
            // Custom / Manual
            setPolicyNumber('');
            setInsurer('');
            setInsuredName('บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด');
            setCoverageLimit('');
            setTotalAnnualLimit('');
            setStartDate(new Date().toISOString().split('T')[0]);
            setExpiryDate('');
            setCenterPhone('');
            setCenterEmail('');
            setPremium('');
            setDeductibleType('fixed');
            setDeductibleAmount('');
            setDeductiblePercentage('');
            setDeductibleMin('');
            setTermsAndConditions('');
            setCoveredVehiclesText('');
            setNotes('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const coveredVehicles = coveredVehiclesText
            .split(',')
            .map(v => v.trim())
            .filter(v => v !== '');

        onSave({
            policyNumber,
            insurer,
            insuredName,
            coverageType,
            coverageLimit: Number(coverageLimit),
            totalAnnualLimit: Number(totalAnnualLimit),
            deductible: deductibleType === 'fixed' ? Number(deductibleAmount) : Number(deductibleMin),
            premium: Number(premium),
            startDate,
            expiryDate,
            contactInfo: {
                center: centerPhone,
                email: centerEmail
            },
            coverageRules: template === 'chubb' ? [
                { vehicleType: 'pickup', limitPerAccident: 200000 },
                { vehicleType: ['6-wheel', '10-wheel', 'trailer'], limitPerAccident: 800000 },
                { vehicleType: 'tractor_head', limitPerAccident: 1600000 }
            ] : template === 'aig' ? [
                {
                    vehicleType: ['pickup', '4-wheel', 'small-truck'],
                    limitPerAccident: 200000,
                    limitPerVehicle: 200000,
                    extensions: {
                        containerCoverage: 300000,
                        crossBorderRangeKm: 50
                    }
                }
            ] : [
                { vehicleType: 'all', limitPerAccident: Number(coverageLimit) }
            ],
            deductibleRules: {
                type: deductibleType,
                standard: Number(deductibleAmount),
                percentage: Number(deductiblePercentage),
                minAmount: Number(deductibleMin),
                highRisk: {
                    rate: 0.10,
                    minAmount: 5000,
                    categories: ["agriculture", "fragile", "glass", "ceramics"]
                }
            },
            coveredVehicles,
            termsAndConditions,
            status: 'Active',
            notes
        });
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center p-4 z-[9999] animate-fade-in overflow-y-auto items-start pt-8 pb-8">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col relative">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black tracking-tight">เพิ่มกรมธรรม์ประกันภัยสินค้า</h2>
                        <p className="text-indigo-100 font-bold text-sm mt-1 uppercase tracking-widest">Inland Cargo Insurance Policy</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-95 relative z-10" aria-label="Close modal">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                </div>

                <div className="overflow-y-auto p-10 flex-1 custom-scrollbar space-y-10">
                    {/* Template Selector */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Templates (เลือกแผนประกันแนะนำ)</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => applyTemplate('chubb')}
                                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center gap-3 ${template === 'chubb' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                            >
                                <span className="text-2xl">🦁</span>
                                <div className="text-left">
                                    <p className="text-sm">Chubb Samaggi</p>
                                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">รถใหญ่ / รถพ่วง</p>
                                </div>
                            </button>
                            <button
                                onClick={() => applyTemplate('aig')}
                                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center gap-3 ${template === 'aig' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                            >
                                <span className="text-2xl">🦅</span>
                                <div className="text-left">
                                    <p className="text-sm">AIG Insurance</p>
                                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">รถเล็ก / ปิคอัพ</p>
                                </div>
                            </button>
                            <button
                                onClick={() => applyTemplate('custom')}
                                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center gap-3 ${template === 'custom' ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                            >
                                <span className="text-2xl">📝</span>
                                <div className="text-left">
                                    <p className="text-sm">Manual Entry</p>
                                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">ระบุเองทั้งหมด</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <form id="cargo-policy-form" onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="policy-number" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">เลขที่กรมธรรม์ <span className="text-rose-500">*</span></label>
                                <input
                                    id="policy-number"
                                    title="เลขที่กรมธรรม์"
                                    required
                                    type="text"
                                    value={policyNumber}
                                    onChange={e => setPolicyNumber(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                                    placeholder="402-XX-XX-..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="insurer-name" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">บริษัทประกันภัย <span className="text-rose-500">*</span></label>
                                <input
                                    id="insurer-name"
                                    title="บริษัทประกันภัย"
                                    placeholder="ระบุบริษัทประกันภัย"
                                    required
                                    type="text"
                                    value={insurer}
                                    onChange={e => setInsurer(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="insured-name" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">ผู้เอาประกันภัย</label>
                            <input
                                id="insured-name"
                                title="ผู้เอาประกันภัย"
                                placeholder="ระบุชื่อผู้เอาประกันภัย"
                                type="text"
                                value={insuredName}
                                onChange={e => setInsuredName(e.target.value)}
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="coverage-limit" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">วงเงินต่อครั้ง (Limit)</label>
                                <input
                                    id="coverage-limit"
                                    title="วงเงินคุ้มครองต่อครั้ง"
                                    placeholder="0"
                                    required
                                    type="number"
                                    value={coverageLimit}
                                    onChange={e => setCoverageLimit(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xl text-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="annual-limit" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">วงเงินต่อปี (Annual)</label>
                                <input
                                    id="annual-limit"
                                    title="วงเงินคุ้มครองสูงสุดต่อปี"
                                    placeholder="0"
                                    type="number"
                                    value={totalAnnualLimit}
                                    onChange={e => setTotalAnnualLimit(e.target.value)}
                                    className="w-full p-5 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xl text-indigo-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="premium-amount" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">เบี้ยประกันภัย (Premium)</label>
                                <input
                                    id="premium-amount"
                                    title="จำนวนเบี้ยประกันภัย"
                                    placeholder="0.00"
                                    type="number"
                                    value={premium}
                                    onChange={e => setPremium(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xl text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Advanced Deductible Logic */}
                        <div className="p-8 bg-rose-50/30 border-2 border-rose-100 rounded-[2rem] space-y-6">
                            <h4 className="flex items-center gap-3 text-sm font-black text-rose-700 uppercase tracking-widest">
                                <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs">💸</span>
                                เงื่อนไขค่าเสียหายส่วนแรก (Deductible Logic)
                            </h4>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setDeductibleType('fixed')}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-black text-xs transition-all ${deductibleType === 'fixed' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-100 text-rose-400'}`}
                                >
                                    FIXED AMOUNT (แบบคงที่)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeductibleType('percentage_with_min')}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-black text-xs transition-all ${deductibleType === 'percentage_with_min' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-100 text-rose-400'}`}
                                >
                                    PERCENTAGE + MIN (แบบ % และขั้นต่ำ)
                                </button>
                            </div>

                            {deductibleType === 'fixed' ? (
                                <div className="space-y-2">
                                    <label htmlFor="deductible-fixed" className="text-[10px] font-black text-slate-400 uppercase">จำนวนเงินคงที่ (THB)</label>
                                    <input
                                        id="deductible-fixed"
                                        title="ค่าเสียหายส่วนแรกแบบคงที่"
                                        placeholder="5000"
                                        type="number"
                                        value={deductibleAmount}
                                        onChange={e => setDeductibleAmount(e.target.value)}
                                        className="w-full p-4 bg-white border-2 border-rose-100 rounded-xl focus:border-rose-500 outline-none font-black text-lg text-slate-700"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="deductible-percent" className="text-[10px] font-black text-slate-400 uppercase">ร้อยละ (%)</label>
                                        <input
                                            id="deductible-percent"
                                            title="ร้อยละค่าเสียหายส่วนแรก"
                                            placeholder="10"
                                            type="number"
                                            value={deductiblePercentage}
                                            onChange={e => setDeductiblePercentage(e.target.value)}
                                            className="w-full p-4 bg-white border-2 border-rose-100 rounded-xl focus:border-rose-500 outline-none font-black text-lg text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="deductible-min" className="text-[10px] font-black text-slate-400 uppercase">ขั้นต่ำ (Minimum THB)</label>
                                        <input
                                            id="deductible-min"
                                            title="ค่าเสียหายส่วนแรกขั้นต่ำ"
                                            placeholder="5000"
                                            type="number"
                                            value={deductibleMin}
                                            onChange={e => setDeductibleMin(e.target.value)}
                                            className="w-full p-4 bg-white border-2 border-rose-100 rounded-xl focus:border-rose-500 outline-none font-black text-lg text-slate-700"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label htmlFor="start-date" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">วันเริ่มคุ้มครอง</label>
                                <input
                                    id="start-date"
                                    title="วันที่เริ่มคุ้มครอง"
                                    required
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="expiry-date" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">วันสิ้นสุดคุ้มครอง</label>
                                <input
                                    id="expiry-date"
                                    title="วันที่สิ้นสุดคุ้มครอง"
                                    required
                                    type="date"
                                    value={expiryDate}
                                    onChange={e => setExpiryDate(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Covered Vehicles List */}
                        <div className="space-y-2">
                            <label htmlFor="covered-vehicles" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">รายการทะเบียนรถที่คุ้มครอง (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                            <textarea
                                id="covered-vehicles"
                                title="รายการทะเบียนรถที่คุ้มครอง"
                                rows={4}
                                value={coveredVehiclesText}
                                onChange={e => setCoveredVehiclesText(e.target.value)}
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-green-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                placeholder="เช่น 82-8360 นว, 71-0141 นว, ..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] space-y-6">
                                <h4 className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase tracking-widest">
                                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">📞</span>
                                    ข้อมูลติดต่อประกันภัย
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="center-phone" className="text-[10px] font-black text-slate-400 uppercase">เบอร์ติดต่อศูนย์</label>
                                        <input
                                            id="center-phone"
                                            title="เบอร์โทรศัพท์ศูนย์บริการ"
                                            placeholder="02-XXX-XXXX"
                                            type="text"
                                            value={centerPhone}
                                            onChange={e => setCenterPhone(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-slate-200 py-2 focus:border-indigo-500 outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="center-email" className="text-[10px] font-black text-slate-400 uppercase">อีเมล</label>
                                        <input
                                            id="center-email"
                                            title="อีเมลติดต่อ"
                                            placeholder="service@example.com"
                                            type="email"
                                            value={centerEmail}
                                            onChange={e => setCenterEmail(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-slate-200 py-2 focus:border-indigo-500 outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <label htmlFor="terms-conditions" className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">เงื่อนไข / ความคุ้มครองเพิ่มเติม</label>
                                <textarea
                                    id="terms-conditions"
                                    title="เงื่อนไขและความคุ้มครองเพิ่มเติม"
                                    placeholder="ระบุเงื่อนไขเพิ่มเติม..."
                                    rows={6}
                                    value={termsAndConditions}
                                    onChange={e => setTermsAndConditions(e.target.value)}
                                    className="flex-1 w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 text-sm leading-relaxed"
                                />
                            </div>
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
                        form="cargo-policy-form"
                        className="flex-1 py-5 px-8 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                    >
                        บันทึกกรมธรรม์
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddCargoPolicyModal;
