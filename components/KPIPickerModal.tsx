import React, { useState, useMemo } from 'react';
import type { RepairKPI } from '../types';
import { formatHoursDescriptive } from '../utils';

interface KPIPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddMultipleKPIs: (kpis: RepairKPI[]) => void;
    kpiData: RepairKPI[];
    initialSelectedIds: string[];
}

const KPIPickerModal: React.FC<KPIPickerModalProps> = ({ isOpen, onClose, onAddMultipleKPIs, kpiData, initialSelectedIds }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
    
    const filteredAndGroupedKPIs = useMemo(() => {
        const filtered = (Array.isArray(kpiData) ? kpiData : []).filter(kpi => 
            kpi.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
            kpi.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const grouped = filtered.reduce((acc, kpi) => {
            const category = kpi.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(kpi);
            return acc;
        }, {} as Record<string, RepairKPI[]>);
        
        return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

    }, [searchTerm, kpiData]);

    const handleToggleSelection = (kpiId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiId)) {
                newSet.delete(kpiId);
            } else {
                newSet.add(kpiId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        const selectedKpis = kpiData.filter(kpi => selectedIds.has(kpi.id));
        onAddMultipleKPIs(selectedKpis);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[110] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">เลือกรายการซ่อมมาตรฐาน (KPI)</h3>
                        <input
                            type="text"
                            placeholder="ค้นหารายการซ่อม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-1/2 p-2 border border-gray-300 rounded-lg text-base"
                        />
                    </div>
                </div>

                <div className="p-2 overflow-y-auto flex-1 bg-gray-50">
                    {filteredAndGroupedKPIs.length > 0 ? (
                        filteredAndGroupedKPIs.map(([category, kpis]) => (
                            <div key={category} className="mb-4">
                                <h4 className="font-bold text-lg text-gray-700 bg-gray-200 p-2 rounded-t-lg sticky top-0">{category}</h4>
                                <ul className="bg-white divide-y border-x border-b rounded-b-lg">
                                    {kpis.map(kpi => {
                                        const isSelected = selectedIds.has(kpi.id);
                                        return (
                                        <li 
                                            key={kpi.id} 
                                            onClick={() => handleToggleSelection(kpi.id)}
                                            className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                        >
                                            <div className="flex items-center flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-4"
                                                />
                                                <span className="flex-1">{kpi.item}</span>
                                            </div>
                                            <span className="font-semibold text-blue-600 w-32 text-right">{formatHoursDescriptive(kpi.standardHours)}</span>
                                        </li>
                                    )}
                                    )}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-center p-8 text-gray-500">ไม่พบรายการที่ตรงกับคำค้นหา</p>
                    )}
                </div>

                <div className="p-6 border-t flex justify-between items-center bg-gray-50">
                     <p className="text-base font-semibold text-gray-700">
                        {selectedIds.size} รายการที่เลือก
                    </p>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                            ยกเลิก
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            disabled={selectedIds.size === 0}
                            className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            เพิ่มรายการที่เลือก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPIPickerModal;