import React, { useState } from 'react';
import type { PartWarranty, WarrantyClaim, WarrantyClaimStatus } from '../types';
import { formatCurrency } from '../utils';

interface AddWarrantyClaimModalProps {
    onClose: () => void;
    onSave: (warrantyId: string, claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'warrantyId'>) => void;
    warranty: PartWarranty;
}

const AddWarrantyClaimModal: React.FC<AddWarrantyClaimModalProps> = ({ onClose, onSave, warranty }) => {
    const [formData, setFormData] = useState({
        claimDate: new Date().toISOString().split('T')[0],
        repairOrderNo: warranty.repairOrderNo || '',
        issue: '',
        issueDetails: '',
        replacementCost: 0,
        supplierCredit: 0,
        laborCost: 0,
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.issue) {
            alert('กรุณาระบุปัญหาที่พบ');
            return;
        }

        const claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'warrantyId'> = {
            ...formData,
            claimStatus: 'pending' as WarrantyClaimStatus
        };

        onSave(warranty.id, claim);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['replacementCost', 'supplierCredit', 'laborCost'].includes(name) ? Number(value) : value
        }));
    };

    // Check if warranty is still active
    const isExpired = new Date(warranty.warrantyExpiry) < new Date();
    const daysRemaining = Math.ceil((new Date(warranty.warrantyExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">เคลมการรับประกัน</h3>
                            <p className="text-sm text-slate-500 mt-1">ยื่นการเคลมสำหรับอะไหล่ที่เสียในระยะรับประกัน</p>
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

                <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    {/* Warranty Info (Read-only) */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wide">ข้อมูลการรับประกัน</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">ชื่ออะไหล่</p>
                                <p className="text-sm font-bold text-slate-800">{warranty.partName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">ผู้จำหน่าย</p>
                                <p className="text-sm font-bold text-slate-800">{warranty.supplier}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">วันที่ติดตั้ง</p>
                                <p className="text-sm font-bold text-slate-800">
                                    {new Date(warranty.installDate).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">วันหมดอายุ</p>
                                <p className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                    {new Date(warranty.warrantyExpiry).toLocaleDateString('th-TH')}
                                    {!isExpired && <span className="text-xs ml-2">({daysRemaining} วันคงเหลือ)</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">มูลค่าอะไหล่</p>
                                <p className="text-sm font-bold text-slate-800">{formatCurrency(warranty.purchaseCost)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">เงื่อนไขรับประกัน</p>
                                <p className="text-xs text-slate-600">{warranty.warrantyTerms}</p>
                            </div>
                        </div>

                        {isExpired && (
                            <div className="mt-4 bg-red-100 border border-red-200 rounded-xl p-3">
                                <p className="text-sm font-bold text-red-700">
                                    ⚠️ หมายเหตุ: การรับประกันหมดอายุแล้ว การเคลมอาจไม่ได้รับการพิจารณา
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Claim Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Claim Date */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ยื่นเคลม *</label>
                                <input
                                    type="date"
                                    name="claimDate"
                                    value={formData.claimDate}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>

                            {/* Repair Order No */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">เลขที่ใบแจ้งซ่อม (ถ้ามี)</label>
                                <input
                                    type="text"
                                    name="repairOrderNo"
                                    value={formData.repairOrderNo}
                                    onChange={handleInputChange}
                                    placeholder="เช่น R-2024-001"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>

                            {/* Issue */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">ปัญหาที่พบ *</label>
                                <input
                                    type="text"
                                    name="issue"
                                    value={formData.issue}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="เช่น อะไหล่ชำรุด, ทำงานผิดปกติ, เสียหาย"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>

                            {/* Issue Details */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">รายละเอียดปัญหา</label>
                                <textarea
                                    name="issueDetails"
                                    value={formData.issueDetails}
                                    onChange={handleInputChange}
                                    rows={4}
                                    placeholder="อธิบายรายละเอียดปัญหาที่พบ, อาการ, และสภาพการใช้งาน"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none resize-none"
                                />
                            </div>

                            {/* Cost Details */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ค่าอะไหล์ทดแทน (บาท)</label>
                                <input
                                    type="number"
                                    name="replacementCost"
                                    value={formData.replacementCost}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ค่าแรงติดตั้ง (บาท)</label>
                                <input
                                    type="number"
                                    name="laborCost"
                                    value={formData.laborCost}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนที่คาดว่าจะได้รับคืน (บาท)</label>
                                <input
                                    type="number"
                                    name="supplierCredit"
                                    value={formData.supplierCredit}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">จำนวนเงินที่ผู้จำหน่ายจะรับผิดชอบ</p>
                            </div>

                            {/* Total Cost Summary */}
                            <div className="md:col-span-2 bg-amber-50 rounded-xl p-4 border border-amber-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-amber-600 font-medium mb-1">ค่าใช้จ่ายรวม</p>
                                        <p className="text-xl font-extrabold text-slate-800">
                                            {formatCurrency(formData.replacementCost + formData.laborCost)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-amber-600 font-medium mb-1">คาดว่าจะได้รับคืน</p>
                                        <p className="text-xl font-extrabold text-green-600">
                                            {formatCurrency(formData.supplierCredit)}
                                        </p>
                                    </div>
                                </div>
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
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

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
                        className="px-8 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        ยื่นการเคลม
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWarrantyClaimModal;
