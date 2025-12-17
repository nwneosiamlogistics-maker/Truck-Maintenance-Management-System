import React, { useState } from 'react';
import type { MaintenanceBudget, BudgetCategory, BudgetStatus } from '../types';

interface AddBudgetModalProps {
    onClose: () => void;
    onSave: (budget: Omit<MaintenanceBudget, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const BUDGET_CATEGORIES: BudgetCategory[] = [
    'ซ่อมบำรุงรถ',
    'อะไหล่',
    'น้ำมันเชื้อเฟลิง',
    'ค่าแรงช่าง',
    'ค่าภาษีและประกันภัย',
    'อื่นๆ'
];

const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ onClose, onSave }) => {
    const currentDate = new Date();
    const [formData, setFormData] = useState({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        department: '',
        category: 'ซ่อมบำรุงรถ' as BudgetCategory,
        allocatedAmount: 0,
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const budget: Omit<MaintenanceBudget, 'id' | 'createdAt' | 'updatedAt'> = {
            ...formData,
            spentAmount: 0,
            committedAmount: 0,
            availableAmount: formData.allocatedAmount,
            status: 'ปกติ' as BudgetStatus
        };

        onSave(budget);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'allocatedAmount' || name === 'year' || name === 'month'
                ? Number(value)
                : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">เพิ่มงบประมาณ</h3>
                            <p className="text-sm text-slate-500 mt-1">กรอกข้อมูลงบประมาณสำหรับรอบบัญชี</p>
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Year & Month */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ปีงบประมาณ</label>
                            <select
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(year => (
                                    <option key={year} value={year}>{year + 543}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เดือน</label>
                            <select
                                name="month"
                                value={formData.month}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>
                                        {new Date(2024, month - 1).toLocaleDateString('th-TH', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">แผนก</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                required
                                placeholder="เช่น ฝ่ายซ่อมบำรุง"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            >
                                {BUDGET_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Allocated Amount */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">งบประมาณที่ได้รับ (บาท)</label>
                            <input
                                type="number"
                                name="allocatedAmount"
                                value={formData.allocatedAmount}
                                onChange={handleInputChange}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-lg font-semibold"
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ (ถ้ามี)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={3}
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
                        form="budget-form"
                        onClick={handleSubmit}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        บันทึกงบประมาณ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBudgetModal;
