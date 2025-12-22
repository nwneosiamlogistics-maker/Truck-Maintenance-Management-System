import React, { useState } from 'react';
import type { PartWarranty, WarrantyType, StockItem, Supplier } from '../types';
import { useToast } from '../context/ToastContext';

interface AddPartWarrantyModalProps {
    onClose: () => void;
    onSave: (warranty: Omit<PartWarranty, 'id' | 'createdAt' | 'updatedAt'>) => void;
    stock: StockItem[];
    suppliers: Supplier[];
}

const WARRANTY_TYPES: { value: WarrantyType; label: string }[] = [
    { value: 'manufacturer', label: 'รับประกันจากผู้ผลิต' },
    { value: 'supplier', label: 'รับประกันจากผู้จำหน่าย' },
    { value: 'extended', label: 'ขยายเวลารับประกัน' }
];

const AddPartWarrantyModal: React.FC<AddPartWarrantyModalProps> = ({ onClose, onSave, stock, suppliers }) => {
    const [formData, setFormData] = useState({
        partId: '',
        partName: '',
        partCode: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        installDate: new Date().toISOString().split('T')[0],
        vehicleLicensePlate: '',
        repairOrderNo: '',
        warrantyType: 'manufacturer' as WarrantyType,
        warrantyDuration: 12,
        supplier: '',
        supplierContact: '',
        warrantyTerms: '',
        purchaseCost: 0,
        notes: ''
    });
    const { addToast } = useToast();

    // Calculate warranty expiry date based on install date and duration
    const calculateExpiryDate = (installDate: string, durationMonths: number): string => {
        const date = new Date(installDate);
        date.setMonth(date.getMonth() + durationMonths);
        return date.toISOString().split('T')[0];
    };

    const warrantyExpiry = calculateExpiryDate(formData.installDate, formData.warrantyDuration);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.partName || !formData.supplier) {
            addToast('กรุณากรอกชื่ออะไหล่และผู้จำหน่าย', 'warning');
            return;
        }

        const warranty: Omit<PartWarranty, 'id' | 'createdAt' | 'updatedAt'> = {
            ...formData,
            warrantyExpiry,
            claims: [],
            isActive: true
        };

        onSave(warranty);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['warrantyDuration', 'purchaseCost'].includes(name) ? Number(value) : value
        }));
    };

    const handlePartSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const partId = e.target.value;
        const selectedPart = stock.find(s => s.id === partId);

        if (selectedPart) {
            setFormData(prev => ({
                ...prev,
                partId,
                partName: selectedPart.name,
                partCode: selectedPart.code || '',
                purchaseCost: selectedPart.unitPrice || 0
            }));
        }
    };

    const handleSupplierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const supplierName = e.target.value;
        const selectedSupplier = suppliers.find(s => s.name === supplierName);

        setFormData(prev => ({
            ...prev,
            supplier: supplierName,
            supplierContact: selectedSupplier?.phone || ''
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">เพิ่มการรับประกันอะไหล่</h3>
                            <p className="text-sm text-slate-500 mt-1">ลงทะเบียนการรับประกันสำหรับอะไหล่</p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="ปิดหน้าต่าง"
                            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Part Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลือกอะไหล่ *</label>
                            <select
                                onChange={handlePartSelect}
                                required
                                aria-label="เลือกอะไหล่"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                <option value="">-- เลือกอะไหล่ --</option>
                                {stock.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.code ? `[${item.code}] ` : ''}{item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Part Name (Manual entry if not from stock) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่ออะไหล่ *</label>
                            <input
                                type="text"
                                name="partName"
                                value={formData.partName}
                                onChange={handleInputChange}
                                required
                                placeholder="ระบุชื่ออะไหล่"
                                aria-label="ชื่ออะไหล่"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Dates */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ซื้อ *</label>
                            <input
                                type="date"
                                name="purchaseDate"
                                value={formData.purchaseDate}
                                onChange={handleInputChange}
                                required
                                aria-label="วันที่ซื้อ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ติดตั้ง *</label>
                            <input
                                type="date"
                                name="installDate"
                                value={formData.installDate}
                                onChange={handleInputChange}
                                required
                                aria-label="วันที่ติดตั้ง"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Vehicle & Repair Order */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ทะเบียนรถ (ถ้ามี)</label>
                            <input
                                type="text"
                                name="vehicleLicensePlate"
                                value={formData.vehicleLicensePlate}
                                onChange={handleInputChange}
                                placeholder="เช่น 70-6937"
                                aria-label="ทะเบียนรถ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลขที่ใบแจ้งซ่อม (ถ้ามี)</label>
                            <input
                                type="text"
                                name="repairOrderNo"
                                value={formData.repairOrderNo}
                                onChange={handleInputChange}
                                placeholder="เช่น R-2024-001"
                                aria-label="เลขที่ใบแจ้งซ่อม"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Warranty Details */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทการรับประกัน *</label>
                            <select
                                name="warrantyType"
                                value={formData.warrantyType}
                                onChange={handleInputChange}
                                required
                                aria-label="ประเภทการรับประกัน"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                {WARRANTY_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ระยะเวลารับประกัน (เดือน) *</label>
                            <input
                                type="number"
                                name="warrantyDuration"
                                value={formData.warrantyDuration}
                                onChange={handleInputChange}
                                required
                                min="1"
                                aria-label="ระยะเวลารับประกัน"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Auto-calculated Expiry */}
                        <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <p className="text-sm font-bold text-blue-900 mb-1">วันหมดอายุการรับประกัน</p>
                            <p className="text-2xl font-extrabold text-blue-600">
                                {new Date(warrantyExpiry).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Supplier */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ผู้จำหน่าย *</label>
                            <select
                                onChange={handleSupplierSelect}
                                required
                                aria-label="เลือกผู้จำหน่าย"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                <option value="">-- เลือกผู้จำหน่าย --</option>
                                {suppliers.map(sup => (
                                    <option key={sup.id} value={sup.name}>
                                        {sup.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Purchase Cost */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">มูลค่าอะไหล่ (บาท) *</label>
                            <input
                                type="number"
                                name="purchaseCost"
                                value={formData.purchaseCost}
                                onChange={handleInputChange}
                                required
                                min="0"
                                step="0.01"
                                aria-label="มูลค่าอะไหล่"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์ติดต่อผู้จำหน่าย</label>
                            <input
                                type="text"
                                name="supplierContact"
                                value={formData.supplierContact}
                                onChange={handleInputChange}
                                placeholder="เบอร์โทรศัพท์"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Warranty Terms */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">เงื่อนไขการรับประกัน *</label>
                            <textarea
                                name="warrantyTerms"
                                value={formData.warrantyTerms}
                                onChange={handleInputChange}
                                required
                                rows={3}
                                placeholder="เช่น รับประกัน 12 เดือน หรือ 100,000 กม. แล้วแต่อย่างใดอย่างหนึ่งถึงก่อน"
                                aria-label="เงื่อนไขการรับประกัน"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none"
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={2}
                                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none"
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
                        className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        บันทึกการรับประกัน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPartWarrantyModal;
