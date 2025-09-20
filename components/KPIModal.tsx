import React, { useState, useEffect, useMemo } from 'react';
import type { RepairKPI } from '../types';
import { useToast } from '../context/ToastContext';

interface KPIModalProps {
    kpi: RepairKPI | null;
    onSave: (kpi: RepairKPI) => void;
    onClose: () => void;
    existingKpiData: RepairKPI[];
}

const KPIModal: React.FC<KPIModalProps> = ({ kpi, onSave, onClose, existingKpiData }) => {
    const getInitialState = (): Omit<RepairKPI, 'id'> => {
        return kpi || {
            category: '',
            item: '',
            standardHours: 0,
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('0');
    const { addToast } = useToast();

    useEffect(() => {
        if (kpi) {
            setFormData(kpi);
            const h = Math.floor(kpi.standardHours);
            const m = Math.round((kpi.standardHours % 1) * 60);
            setHours(String(h));
            setMinutes(String(m));
        } else {
            setFormData(getInitialState());
            setHours('0');
            setMinutes('0');
        }
    }, [kpi]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category.trim() || !formData.item.trim()) {
            addToast('กรุณากรอกข้อมูลหมวดหมู่และรายการซ่อม', 'warning');
            return;
        }

        const h = parseInt(hours, 10) || 0;
        const m = parseInt(minutes, 10) || 0;
        const totalStandardHours = h + (m / 60);

        if (totalStandardHours <= 0) {
            addToast('เวลามาตรฐานต้องมากกว่า 0', 'warning');
            return;
        }
        if (m >= 60) {
            addToast('นาทีต้องไม่เกิน 59', 'warning');
            return;
        }

        const isDuplicate = existingKpiData.some(
            item => item.id !== kpi?.id && item.item.trim().toLowerCase() === formData.item.trim().toLowerCase()
        );
        if (isDuplicate) {
            addToast('มีรายการซ่อมนี้อยู่ในระบบแล้ว', 'error');
            return;
        }

        onSave({ ...formData, standardHours: totalStandardHours, id: kpi?.id || '' });
    };

    const allCategories = useMemo(() => {
        return Array.from(new Set(existingKpiData.map(item => item.category))).sort();
    }, [existingKpiData]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <form id="kpi-form" onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{kpi ? 'แก้ไข' : 'เพิ่ม'} KPI ใหม่</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium">หมวดหมู่ *</label>
                            <input
                                list="kpi-categories"
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <datalist id="kpi-categories">
                                {allCategories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">รายการซ่อม *</label>
                            <input
                                type="text"
                                name="item"
                                value={formData.item}
                                onChange={handleInputChange}
                                required
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">เวลามาตรฐาน *</label>
                             <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    min="0"
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                                <span>ชั่วโมง</span>
                                <input
                                    type="number"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    min="0"
                                    max="59"
                                    step="1"
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                                <span>นาที</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default KPIModal;