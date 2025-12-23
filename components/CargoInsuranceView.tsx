import React, { useState } from 'react';
import type { CargoInsurancePolicy, CargoInsuranceClaim } from '../types';
import { formatCurrency } from '../utils';
import { useToast } from '../context/ToastContext';

interface CargoInsuranceViewProps {
    policies: CargoInsurancePolicy[];
    claims: CargoInsuranceClaim[];
    onAddPolicy: () => void;
    onAddClaim: () => void;
    onRenew: (policy: CargoInsurancePolicy) => void;
    onEdit: (policy: CargoInsurancePolicy) => void;
}

const CargoInsuranceView: React.FC<CargoInsuranceViewProps> = ({ policies, claims, onAddPolicy, onAddClaim, onRenew, onEdit }) => {
    const { addToast } = useToast();
    const activePolicies = policies.filter(p => p.status === 'Active');

    // Gap Warning Logic
    const chubbPolicy = activePolicies.find(p => p.insurer.includes('Chubb'));
    const aigPolicy = activePolicies.find(p => p.insurer.includes('AIG'));

    const showGapWarning = chubbPolicy && aigPolicy &&
        new Date(chubbPolicy.expiryDate) < new Date(aigPolicy.expiryDate);

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-xs text-indigo-100 font-black uppercase tracking-[0.2em]">กรมธรรม์ที่คุ้มครอง</p>
                        <h3 className="text-4xl font-black mt-3 tracking-tighter">{activePolicies.length}</h3>
                        <p className="text-xs text-indigo-100/60 mt-2 font-bold uppercase">Active Policies</p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-xs text-rose-100 font-black uppercase tracking-[0.2em]">ยอดเคลมสะสม</p>
                        <h3 className="text-4xl font-black mt-3 tracking-tighter">{claims.length}</h3>
                        <p className="text-xs text-rose-100/60 mt-2 font-bold uppercase">Total Claims</p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-xs text-emerald-100 font-black uppercase tracking-[0.2em]">มูลค่าความเสียหาย</p>
                        <h3 className="text-4xl font-black mt-3 tracking-tighter">
                            {formatCurrency(claims.reduce((acc, c) => acc + c.claimedAmount, 0)).replace('฿', '')}
                        </h3>
                        <p className="text-xs text-emerald-100/60 mt-2 font-bold uppercase">Total Loss (THB)</p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
                    </div>
                </div>
            </div>

            {/* Gap Warning Alert */}
            {showGapWarning && (
                <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2rem] flex items-center justify-between shadow-lg shadow-amber-200/20 animate-pulse-subtle">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-200">⚠️</div>
                        <div>
                            <h4 className="text-xl font-black text-amber-900">ระวัง: ช่วงรอยต่อการสิ้นสุดความคุ้มครอง (Policy Expiry Gap)</h4>
                            <p className="text-sm font-bold text-amber-700 mt-1">
                                กรมธรรม์ Chubb (รถใหญ่) จะหมดอายุวันที่ <span className="underline">{new Date(chubbPolicy.expiryDate).toLocaleDateString('th-TH')}</span>
                                ก่อนกรมธรรม์ AIG (รถเล็ก) ประมาณ 1.5 เดือน กรุณาวางแผนต่ออายุล่วงหน้า
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onRenew(chubbPolicy)}
                        className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                    >
                        ดำเนินการต่ออายุ (Chubb)
                    </button>
                </div>
            )}

            {/* Active Policies Cards */}
            <div className="grid grid-cols-1 gap-10">
                {activePolicies.map(policy => (
                    <div key={policy.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-indigo-500/5 overflow-hidden animate-scale-in">
                        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Policy Rules & Limits */}
                            <div className="lg:col-span-8 space-y-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-20 h-20 ${policy.insurer.includes('AIG') ? 'bg-blue-50' : 'bg-indigo-50'} rounded-3xl flex items-center justify-center shrink-0`}>
                                            <span className="text-4xl">{policy.insurer.includes('AIG') ? '🦅' : '🦁'}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{policy.insurer}</h4>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full tracking-wider">Active</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 mt-1">
                                                เลขที่กรมธรรม์: <span className="text-indigo-600">{policy.policyNumber}</span> |
                                                รายการรถ: <span className="text-slate-600">{policy.coveredVehicles?.length || 0} คัน</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Sum Insured</p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-2xl font-black text-slate-800">{formatCurrency(policy.totalAnnualLimit || 0).replace('฿', '')}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">THB</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50/50 rounded-3xl border-2 border-slate-50">
                                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                            วงเงินคุ้มครองตามประเภทรถ
                                        </h5>
                                        <div className="space-y-3">
                                            {policy.coverageRules?.map((rule, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-bold text-slate-600">
                                                        {Array.isArray(rule.vehicleType) ? rule.vehicleType.join(' / ') : rule.vehicleType}
                                                    </span>
                                                    <span className="text-sm font-black text-slate-800">{formatCurrency(rule.limitPerAccident).replace('฿', '')} บาท</span>
                                                </div>
                                            ))}
                                            {policy.insurer.includes('AIG') && (
                                                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Special Extensions</p>
                                                    <div className="flex justify-between text-xs font-bold text-blue-700">
                                                        <span>ตู้คอนเทนเนอร์</span>
                                                        <span>300,000 บาท</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-bold text-blue-700 mt-1">
                                                        <span>ข้ามพรมแดน (Cross Border)</span>
                                                        <span>50 กม.</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-rose-50/30 rounded-3xl border-2 border-rose-50">
                                        <h5 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                                            เงื่อนไขค่าเสียหายส่วนแรก (Deductible)
                                        </h5>
                                        <div className="space-y-3">
                                            {policy.deductibleRules?.type === 'percentage_with_min' ? (
                                                <div className="bg-rose-500 p-5 rounded-xl shadow-lg shadow-rose-200">
                                                    <p className="text-xs font-black text-rose-100 uppercase tracking-wider mb-1">Standard Calculation</p>
                                                    <p className="text-2xl font-black text-white">{policy.deductibleRules.percentage}% <span className="text-xs opacity-75 font-bold">ของมูลค่าความเสียหาย</span></p>
                                                    <p className="text-[10px] text-rose-100 font-bold mt-1">ขั้นต่ำ (Minimum) {formatCurrency(policy.deductibleRules.minAmount || 5000)} บาท</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-white p-4 rounded-xl border border-rose-100">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">กลุ่มสินค้าทั่วไป (Fixed)</p>
                                                        <p className="text-xl font-black text-slate-800">{formatCurrency(policy.deductibleRules?.standard || 5000).replace('฿', '')} <span className="text-sm font-bold text-slate-400">บาท / อุบัติเหตุ</span></p>
                                                    </div>
                                                    <div className="bg-rose-500 p-4 rounded-xl shadow-lg shadow-rose-200">
                                                        <p className="text-xs font-black text-rose-100 uppercase tracking-wider mb-1">กลุ่มสินค้าเสี่ยงสูง</p>
                                                        <p className="text-lg font-black text-white">10% <span className="text-xs opacity-75">ของมูลค่าความเสียหาย</span></p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {policy.insurer.includes('AIG') && (
                                    <div className="p-6 bg-amber-50/50 rounded-3xl border-2 border-amber-100">
                                        <h5 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                            AIG Special Exclusions (ข้อยกเว้นสำคัญ)
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-start gap-3">
                                                <span className="text-amber-500 mt-0.5">🏎️</span>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                                    <span className="text-amber-700">High Value Cars:</span> Super Car, รถแข่ง, รถนำเข้าอิสระ
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <span className="text-blue-500 mt-0.5">📱</span>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                                    <span className="text-blue-700">Electronics:</span> มือถือ, พีซี, อุปกรณ์ไอที (อยู่ในเงื่อนไขยกเว้น)
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <span className="text-orange-500 mt-0.5">⚙️</span>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                                    <span className="text-orange-700">Machinery:</span> เครื่องจักรที่หนักเกิน 1,000 กก. (ต้องใส่ตู้ทึบ)
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <span className="text-emerald-500 mt-0.5">💰</span>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                                    <span className="text-emerald-700">Special Asset:</span> ศิลปวัตถุ, วัตถุราคาแพง, โบราณวัตถุ
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contact & Meta */}
                            <div className="lg:col-span-4 bg-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Contact & Timeline</h5>

                                <div className="space-y-8 relative z-10 flex-1">
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📞</div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Center</p>
                                                <p className="font-black text-lg">{policy.contactInfo?.center}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📧</div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Service</p>
                                                <p className="font-bold text-sm truncate text-indigo-300">{policy.contactInfo?.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันเริ่มคุ้มครอง</p>
                                                <p className="font-black text-white">{new Date(policy.startDate).toLocaleDateString('th-TH')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันสิ้นสุด</p>
                                                <p className="font-black text-rose-400">{new Date(policy.expiryDate).toLocaleDateString('th-TH')}</p>
                                            </div>
                                        </div>
                                        {/* Progress Bar (Sample logic) */}
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 w-[45%]"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button
                                        onClick={() => onRenew(policy)}
                                        className="relative z-10 py-4 bg-indigo-500 hover:bg-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-indigo-400 shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        ต่ออายุกรมธรรม์ (Renew)
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="relative z-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase- tracking-[0.2em] transition-all border border-white/5 active:scale-95">
                                            PDF
                                        </button>
                                        <button
                                            onClick={() => onEdit(policy)}
                                            className="relative z-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 active:scale-95 text-amber-300 hover:text-amber-200"
                                        >
                                            แก้ไข
                                        </button>
                                    </div>
                                </div>

                                {/* Decorative Background for Contact Card */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">ประวัติกรมธรรม์และการเคลม (Historical Data)</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest font-mono">Archive & Records</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={onAddPolicy}
                        className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-xs shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        ต่ออายุ/เพิ่มกรมธรรม์
                    </button>
                    <button
                        onClick={onAddClaim}
                        className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-xs shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        แจ้งเหตุสินค้าเสียหาย
                    </button>
                </div>
            </div>

            {/* Policies Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-50">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่กรมธรรม์</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">บริษัทประกัน</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภท</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">วงเงินต่อครั้ง</th>
                                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {policies.length > 0 ? (
                                policies.map(policy => (
                                    <tr key={policy.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-black text-slate-800">{policy.policyNumber}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{new Date(policy.startDate).getFullYear()} - {new Date(policy.expiryDate).getFullYear()}</p>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-600">{policy.insurer}</td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{policy.coverageType}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className="text-sm font-black text-slate-700">{formatCurrency(policy.coverageLimit)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 capitalize">THB per accident</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full tracking-wider shadow-sm ${policy.status === 'Active' ? 'bg-green-500 text-white shadow-green-100' :
                                                    policy.status === 'Expired' ? 'bg-rose-500 text-white shadow-rose-100' : 'bg-slate-300 text-white shadow-slate-100'
                                                    }`}>
                                                    {policy.status === 'Active' ? 'In Force' : policy.status === 'Expired' ? 'Expired' : 'Void'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 text-slate-300">
                                            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="font-black uppercase tracking-widest text-xs">No historical records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CargoInsuranceView;
