import React, { useState } from 'react';
import type { CargoInsurancePolicy, CargoInsuranceClaim } from '../types';
import { formatCurrency } from '../utils';
import { useToast } from '../context/ToastContext';

interface CargoInsuranceViewProps {
    policies: CargoInsurancePolicy[];
    claims: CargoInsuranceClaim[];
    onAddPolicy: () => void;
    onAddClaim: () => void;
}

const CargoInsuranceView: React.FC<CargoInsuranceViewProps> = ({ policies, claims, onAddPolicy, onAddClaim }) => {
    const { addToast } = useToast();

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg">
                    <p className="text-sm text-indigo-100 font-bold uppercase tracking-wider">กรมธรรม์ที่คุ้มครอง</p>
                    <h3 className="text-3xl font-extrabold mt-2">{policies.filter(p => p.status === 'Active').length}</h3>
                    <p className="text-xs text-indigo-100 mt-1">กรมธรรม์</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2rem] p-6 text-white shadow-lg">
                    <p className="text-sm text-rose-100 font-bold uppercase tracking-wider">ยอดเคลมปีนี้</p>
                    <h3 className="text-3xl font-extrabold mt-2">{claims.length}</h3>
                    <p className="text-xs text-rose-100 mt-1">รายการ</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-[2rem] p-6 text-white shadow-lg">
                    <p className="text-sm text-cyan-100 font-bold uppercase tracking-wider">มูลค่าความเสียหายรวม</p>
                    <h3 className="text-3xl font-extrabold mt-2">
                        {formatCurrency(claims.reduce((acc, c) => acc + c.claimedAmount, 0))}
                    </h3>
                    <p className="text-xs text-cyan-100 mt-1">บาท</p>
                </div>
            </div>

            <div className="flex justify-between items-center mt-8">
                <h3 className="text-xl font-bold text-slate-800">กรมธรรม์ประกันภัยสินค้า (Inland Cargo Policies)</h3>
                <button
                    onClick={onAddPolicy}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    เพิ่มกรมธรรม์
                </button>
            </div>

            {/* Policies Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">เลขที่กรมธรรม์</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">บริษัทประกัน</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">ประเภทความคุ้มครอง</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">วงเงินคุ้มครอง</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {policies.length > 0 ? (
                                policies.map(policy => (
                                    <tr key={policy.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{policy.policyNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{policy.insurer}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{policy.coverageType}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">{formatCurrency(policy.coverageLimit)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${policy.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                    policy.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {policy.status === 'Active' ? 'คุ้มครอง' : policy.status === 'Expired' ? 'หมดอายุ' : 'ยกเลิก'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่พบกรมธรรม์</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-center mt-8">
                <h3 className="text-xl font-bold text-slate-800">ประวัติการเคลมสินค้าเสียหาย (Cargo Claims History)</h3>
                <button
                    onClick={onAddClaim}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    แจ้งเคลมสินค้า
                </button>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">วันที่เกิดเหตุ</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">สินค้า / รายละเอียด</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">สถานที่</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">มูลค่าความเสียหาย</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {claims.length > 0 ? (
                                claims.map(claim => (
                                    <tr key={claim.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(claim.incidentDate).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{claim.cargoDescription}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{claim.damageDescription}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{claim.incidentLocation}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">{formatCurrency(claim.claimedAmount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${claim.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    claim.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                        claim.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่มีประวัติการเคลม</td>
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
