import React, { useState, useMemo, useEffect } from 'react';
import type { RepairKPI } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, formatHoursDescriptive } from '../utils';
import * as XLSX from 'xlsx';

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
                        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
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
                                aria-label="หมวดหมู่"
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
                                aria-label="รายการซ่อม"
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
                                    aria-label="ชั่วโมง"
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                                <span>ชั่วโมง</span>
                                <input
                                    type="number"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    min="0"
                                    max="59"
                                    aria-label="นาที"
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

interface KPIManagementProps {
    kpiData: RepairKPI[];
    setKpiData: React.Dispatch<React.SetStateAction<RepairKPI[]>>;
}

const KPIManagement: React.FC<KPIManagementProps> = ({ kpiData, setKpiData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingKPI, setEditingKPI] = useState<RepairKPI | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeKpiData = useMemo(() => Array.isArray(kpiData) ? kpiData : [], [kpiData]);

    const filteredKpiData = useMemo(() => {
        return safeKpiData
            .filter(kpi =>
                searchTerm === '' ||
                kpi.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kpi.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.category.localeCompare(b.category) || a.item.localeCompare(b.item));
    }, [safeKpiData, searchTerm]);

    const handleOpenModal = async (kpi: RepairKPI | null = null) => {
        if (kpi && !(await promptForPasswordAsync('แก้ไข'))) {
            return;
        }
        setEditingKPI(kpi);
        setIsModalOpen(true);
    };

    const handleSaveKPI = (kpi: RepairKPI) => {
        if (kpi.id) { // Editing
            setKpiData(prev => prev.map(item => item.id === kpi.id ? kpi : item));
            addToast(`อัปเดต KPI '${kpi.item}' สำเร็จ`, 'success');
        } else { // Adding
            const newKPI = { ...kpi, id: `kpi-${Date.now()}` };
            setKpiData(prev => [newKPI, ...prev]);
            addToast(`เพิ่ม KPI '${newKPI.item}' สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteKPI = async (kpi: RepairKPI) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `ยืนยันการลบ KPI '${kpi.item}'?`, 'ลบ');
            if (confirmed) {
                setKpiData(prev => prev.filter(item => item.id !== kpi.id));
                addToast(`ลบ KPI '${kpi.item}' สำเร็จ`, 'info');
            }
        }
    };

    const handleExportExcel = () => {
        if (filteredKpiData.length === 0) {
            addToast('ไม่มีข้อมูล KPI สำหรับ Export', 'warning');
            return;
        }
        const data = filteredKpiData.map((kpi, idx) => ({
            'ลำดับ': idx + 1,
            'หมวดหมู่': kpi.category,
            'รายการซ่อม': kpi.item,
            'เวลามาตรฐาน (ชม.)': Number(kpi.standardHours.toFixed(2)),
            'เวลามาตรฐาน (แสดง)': formatHoursDescriptive(kpi.standardHours, 8),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 40 }, { wch: 18 }, { wch: 22 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KPI Data');
        XLSX.writeFile(wb, `KPI_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
        addToast(`Export KPI ${filteredKpiData.length} รายการ สำเร็จ`, 'success');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-3">
                <input
                    type="text"
                    aria-label="ค้นหา KPI"
                    placeholder="ค้นหา (รายการซ่อม, หมวดหมู่)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <div className="flex items-center gap-2">
                    <button onClick={handleExportExcel} className="px-4 py-2 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 whitespace-nowrap flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Excel
                    </button>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        + เพิ่ม KPI ใหม่
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายการซ่อม</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">เวลามาตรฐาน</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredKpiData.map(kpi => (
                            <tr key={kpi.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{kpi.category}</td>
                                <td className="px-4 py-3 font-semibold">{kpi.item}</td>
                                <td className="px-4 py-3 text-right font-bold">{formatHoursDescriptive(kpi.standardHours, 8)}</td>
                                <td className="px-4 py-3 text-center space-x-4">
                                    <button onClick={() => handleOpenModal(kpi)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteKPI(kpi)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                        {filteredKpiData.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">ไม่พบข้อมูล KPI</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <KPIModal
                    kpi={editingKPI}
                    onSave={handleSaveKPI}
                    onClose={() => setIsModalOpen(false)}
                    existingKpiData={safeKpiData}
                />
            )}
        </div>
    );
};

export default KPIManagement;