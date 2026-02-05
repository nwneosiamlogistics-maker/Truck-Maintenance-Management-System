import React, { useState, useMemo, useCallback, memo } from 'react';
import type { DailyChecklist, Vehicle, ChecklistItemResult, Technician } from '../types';
import { checklistDefinitions, trailerWarnings } from '../data/checklist-definitions';
import { useToast } from '../context/ToastContext';
import { CheckCircle2 } from 'lucide-react';

// Memoized checklist item component for performance
interface ChecklistItemProps {
    item: {
        id: string;
        label: string;
        options: Array<{
            label: string;
            hasNotes: boolean;
            notesLabel?: string;
        }>;
    };
    result: ChecklistItemResult;
    onChange: (itemId: string, field: 'status' | 'notes', value: string) => void;
    index: number;
}

const ChecklistItem = memo(({ item, result, onChange, index }: ChecklistItemProps) => {
    const handleStatusChange = useCallback((value: string) => {
        onChange(item.id, 'status', value);
    }, [item.id, onChange]);

    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, 'notes', e.target.value);
    }, [item.id, onChange]);

    const selectedOption = item.options.find(opt => opt.label === result.status);
    const hasNotesField = selectedOption?.hasNotes;

    return (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {index + 1}
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-gray-800 mb-3">{item.label}</p>
                    <div className="space-y-2">
                        {item.options.map(option => {
                            const isSelected = result.status === option.label;
                            return (
                                <label
                                    key={option.label}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[44px] ${
                                        isSelected
                                            ? 'bg-blue-50 border-2 border-blue-500'
                                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="relative flex items-center">
                                        <input
                                            type="radio"
                                            name={item.id}
                                            value={option.label}
                                            checked={isSelected}
                                            onChange={() => handleStatusChange(option.label)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        {isSelected && (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 absolute -right-1 -top-1 bg-white rounded-full" />
                                        )}
                                    </div>
                                    <span className={`flex-1 ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                                        {option.label || (option.hasNotes ? 'ระบุ' : '-')}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {hasNotesField && result.status === selectedOption?.label && (
                        <div className="mt-3 animate-fade-in">
                            <input
                                type="text"
                                value={result.notes || ''}
                                onChange={handleNotesChange}
                                placeholder={selectedOption.notesLabel || 'ระบุรายละเอียด...'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

interface TrailerChecklistFormProps {
    onSave: (checklist: Omit<DailyChecklist, 'id'>) => void;
    vehicles: Vehicle[];
    technicians: Technician[];
    initialVehiclePlate?: string;
    initialReporterName?: string;
}

const TrailerChecklistForm: React.FC<TrailerChecklistFormProps> = ({ onSave, vehicles, technicians, initialVehiclePlate, initialReporterName }) => {
    const { addToast } = useToast();
    const definition = checklistDefinitions['FM-MN-TRAILER'];

    const getInitialState = useCallback(() => {
        const initialItems: Record<string, ChecklistItemResult> = {};
        definition.sections.flatMap(s => s.items).forEach(item => {
            initialItems[item.id] = { status: item.options[0].label, notes: '' };
        });
        const plate = initialVehiclePlate || '';
        const vehicle = vehicles.find(v => v.licensePlate === plate);

        return {
            checklistId: 'FM-MN-TRAILER',
            vehicleLicensePlate: plate,
            vehicleType: vehicle?.vehicleType || '',
            inspectionDate: new Date().toISOString().split('T')[0],
            reporterName: initialReporterName || '',
            items: initialItems,
        };
    }, [initialVehiclePlate, initialReporterName, vehicles, definition]);

    const [formData, setFormData] = useState(getInitialState);

    // Searchable Dropdown State
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState(initialVehiclePlate || '');
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);

    // Calculate progress
    const progress = useMemo(() => {
        const allItems = definition.sections.flatMap(s => s.items);
        const completedItems = allItems.filter(item => {
            const result = formData.items[item.id];
            const selectedOption = item.options.find(opt => opt.label === result.status);
            // Consider complete if status is not default and if hasNotes, notes should be filled
            if (result.status === item.options[0].label) return false;
            if (selectedOption?.hasNotes && !result.notes) return false;
            return true;
        }).length;
        return {
            completed: completedItems,
            total: allItems.length,
            percentage: Math.round((completedItems / allItems.length) * 100)
        };
    }, [formData.items, definition]);

    const filteredVehicles = useMemo(() => {
        if (!vehicleSearchTerm) return vehicles;
        return vehicles.filter(v =>
            v.licensePlate.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
            v.vehicleType.toLowerCase().includes(vehicleSearchTerm.toLowerCase())
        );
    }, [vehicles, vehicleSearchTerm]);

    const handleItemChange = useCallback((itemId: string, field: 'status' | 'notes', value: string) => {
        setFormData(prev => ({
            ...prev,
            items: {
                ...prev.items,
                [itemId]: {
                    ...prev.items[itemId],
                    [field]: value,
                },
            },
        }));
    }, []);

    const handleVehicleSelectCustom = useCallback((vehicle: Vehicle) => {
        setFormData(prev => ({
            ...prev,
            vehicleLicensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
        }));
        setVehicleSearchTerm(vehicle.licensePlate);
        setIsVehicleDropdownOpen(false);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleLicensePlate || !formData.reporterName) {
            addToast('กรุณากรอกทะเบียนรถและชื่อผู้ตรวจ', 'warning');
            return;
        }

        const dataToSave = {
            ...formData,
            inspectionDate: new Date(formData.inspectionDate).toISOString(),
        };

        onSave(dataToSave as Omit<DailyChecklist, 'id'>);
        addToast('บันทึกใบตรวจเช็คหางสำเร็จ', 'success');
        setFormData(getInitialState());
        setVehicleSearchTerm(initialVehiclePlate || '');
    }, [formData, onSave, addToast, getInitialState, initialVehiclePlate]);

    const allItems = definition.sections.flatMap(s => s.items);
    // Split items evenly between columns (no special logic for 8 items as trailer doesn't start engine)
    const midPoint = Math.ceil(allItems.length / 2);
    const column1Items = allItems.slice(0, midPoint);
    const column2Items = allItems.slice(midPoint);

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg space-y-4 max-w-5xl mx-auto border font-sans">
            {/* Progress Bar */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{progress.percentage === 100 ? '✅' : progress.percentage > 50 ? '🔄' : '📝'}</span>
                        <span className="font-semibold text-gray-700">ความคืบหน้า</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                        {progress.completed} / {progress.total} ({progress.percentage}%)
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            progress.percentage === 100 
                                ? 'bg-green-500 w-full' 
                                : progress.percentage > 50 
                                    ? 'bg-blue-500' 
                                    : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                {progress.percentage === 100 && (
                    <p className="text-green-600 text-sm mt-2 font-medium">✓ ตรวจเช็คครบทุกข้อแล้ว พร้อมบันทึก!</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                    <label htmlFor="vehicleLicensePlate" className="block text-sm font-medium text-gray-700 mb-1">ทะเบียนหาง *</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหาหรือเลือกทะเบียนหาง..."
                            value={vehicleSearchTerm}
                            onChange={(e) => {
                                setVehicleSearchTerm(e.target.value);
                                setIsVehicleDropdownOpen(true);
                            }}
                            onFocus={() => setIsVehicleDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsVehicleDropdownOpen(false), 200)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                    {isVehicleDropdownOpen && (
                        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in-up">
                            {filteredVehicles.length > 0 ? (
                                filteredVehicles.map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => handleVehicleSelectCustom(v)}
                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none transition-colors"
                                    >
                                        <div className="font-bold text-gray-800">{v.licensePlate}</div>
                                        <div className="text-xs text-gray-500">{v.vehicleType}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-gray-400 text-center text-sm">ไม่พบทะเบียนหางที่ค้นหา</div>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">ประเภทหาง</label>
                    <input id="vehicleType" type="text" name="vehicleType" value={formData.vehicleType} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" readOnly />
                </div>
                <div>
                    <label htmlFor="reporterName" className="block text-sm font-medium text-gray-700">ผู้ตรวจเช็ค *</label>
                    <select id="reporterName" name="reporterName" value={formData.reporterName} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">-- เลือกผู้ตรวจ --</option>
                        <optgroup label="เจ้าหน้าที่ตรวจเช็ค">
                            <option value="เจ้าหน้าที่ตรวจเช็ค">เจ้าหน้าที่ตรวจเช็ค</option>
                        </optgroup>
                        <optgroup label="ช่างซ่อมบำรุง">
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.name}>{tech.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label htmlFor="inspectionDate" className="block text-sm font-medium text-gray-700">วันที่ตรวจ</label>
                    <input id="inspectionDate" type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-900">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🚛</span>
                    <h3 className="text-lg font-bold">เกี่ยวกับการตรวจเช็คหางลาก/หางพ่วง</h3>
                </div>
                <div className="mt-2 pl-10 text-base space-y-1">
                    <p>ใบตรวจเช็คนี้สำหรับหางลากและหางพ่วงที่ไม่มีเครื่องยนต์ เน้นการตรวจสอบ:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>ระบบเบรกลม:</strong> ถังลม สายลม วาล์วควบคุม</li>
                        <li><strong>ข้อต่อและโครงสร้าง:</strong> Kingpin Fifth Wheel ขาตั้งหาง</li>
                        <li><strong>อุปกรณ์ความปลอดภัย:</strong> ไฟสัญญาณ ป้ายสะท้อนแสง</li>
                    </ul>
                </div>
            </div>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* Column 1 */}
                <div className="space-y-2">
                    {column1Items.map((item, index) => (
                        <ChecklistItem
                            key={item.id}
                            item={item}
                            result={formData.items[item.id]}
                            onChange={handleItemChange}
                            index={index}
                        />
                    ))}
                </div>
                {/* Column 2 */}
                <div className="space-y-2">
                    {column2Items.map((item, index) => (
                        <ChecklistItem
                            key={item.id}
                            item={item}
                            result={formData.items[item.id]}
                            onChange={handleItemChange}
                            index={index + midPoint}
                        />
                    ))}
                </div>
            </main>

            {/* Warning Box - Full Width at bottom */}
            <div className="border-2 border-amber-300 bg-amber-50 p-4 rounded-lg text-amber-900 space-y-3 text-base">
                <p className="text-center font-bold text-lg border-b border-amber-200 pb-2 mb-2">
                    ⚠️ ข้อเตือนใจสำหรับหางลาก/หางพ่วง
                </p>
                <div>
                    <ol className="list-decimal list-inside space-y-2 text-sm pl-2">
                        {trailerWarnings.map((warning, i) =>
                            <li key={i}>{warning.substring(3)}</li>
                        )}
                    </ol>
                </div>
            </div>

            <div className="flex justify-end border-t pt-4">
                <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    บันทึกใบตรวจเช็คหาง
                </button>
            </div>
        </form>
    );
};

export default TrailerChecklistForm;
