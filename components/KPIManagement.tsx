import React, { useState, useMemo } from 'react';
import type { RepairKPI } from '../types';
import KPIModal from './KPIModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword, formatHoursDescriptive } from '../utils';

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

    const handleOpenModal = (kpi: RepairKPI | null = null) => {
        if (kpi && !promptForPassword('แก้ไข')) {
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

    const handleDeleteKPI = (kpi: RepairKPI) => {
        if (promptForPassword('ลบ')) {
            setKpiData(prev => prev.filter(item => item.id !== kpi.id));
            addToast(`ลบ KPI '${kpi.item}' สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (รายการซ่อม, หมวดหมู่)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                    + เพิ่ม KPI ใหม่
                </button>
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
                                <td className="px-4 py-3 text-right font-bold">{formatHoursDescriptive(kpi.standardHours)}</td>
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