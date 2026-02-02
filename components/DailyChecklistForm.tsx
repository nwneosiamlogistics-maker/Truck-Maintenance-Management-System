import React, { useState, useMemo } from 'react';
import type { DailyChecklist, Vehicle, ChecklistItemResult, Technician } from '../types';
import { checklistDefinitions, checklistWarnings } from '../data/checklist-definitions';
import { useToast } from '../context/ToastContext';

interface DailyChecklistFormProps {
    onSave: (checklist: Omit<DailyChecklist, 'id'>) => void;
    vehicles: Vehicle[];
    technicians: Technician[];
    initialVehiclePlate?: string;
    initialReporterName?: string;
}

const DailyChecklistForm: React.FC<DailyChecklistFormProps> = ({ onSave, vehicles, technicians, initialVehiclePlate, initialReporterName }) => {
    const { addToast } = useToast();
    const definition = checklistDefinitions['FM-MN-13'];

    const getInitialState = () => {
        const initialItems: Record<string, ChecklistItemResult> = {};
        definition.sections.flatMap(s => s.items).forEach(item => {
            initialItems[item.id] = { status: item.options[0].label, notes: '' };
        });
        const plate = initialVehiclePlate || '';
        const vehicle = vehicles.find(v => v.licensePlate === plate);

        return {
            checklistId: 'FM-MN-13',
            vehicleLicensePlate: plate,
            vehicleType: vehicle?.vehicleType || '',
            inspectionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for date input
            reporterName: initialReporterName || '',
            items: initialItems,
        };
    };

    const [formData, setFormData] = useState(getInitialState());

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (itemId: string, field: 'status' | 'notes', value: string) => {
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
    };

    const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const plate = e.target.value;
        const vehicle = vehicles.find(v => v.licensePlate === plate);
        setFormData(prev => ({
            ...prev,
            vehicleLicensePlate: plate,
            vehicleType: vehicle?.vehicleType || '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleLicensePlate || !formData.reporterName) {
            addToast('กรุณากรอกทะเบียนรถและชื่อช่าง', 'warning');
            return;
        }

        // Convert date back to full ISO string before saving
        const dataToSave = {
            ...formData,
            inspectionDate: new Date(formData.inspectionDate).toISOString(),
        };

        onSave(dataToSave as Omit<DailyChecklist, 'id'>);
        addToast('บันทึกใบตรวจเช็คสำเร็จ', 'success');
        setFormData(getInitialState()); // Reset form after saving
    };

    const allItems = definition.sections.flatMap(s => s.items);
    const column1Items = allItems.slice(0, 8);
    const column2Items = allItems.slice(8);

    const renderChecklistItem = (item: typeof allItems[0]) => {
        const result = formData.items[item.id];
        return (
            <div key={item.id} className="mb-3 text-sm">
                <p className="font-semibold text-gray-800 underline">{item.label}</p>
                <div className="pl-2 mt-1 space-y-1">
                    {item.options.map(option => {
                        const isSelected = result.status === option.label;
                        return (
                            <div key={option.label} className="flex items-start">
                                <input
                                    type="radio"
                                    id={`${item.id}-${option.label}`}
                                    name={item.id}
                                    value={option.label}
                                    checked={isSelected}
                                    onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}
                                    className="mt-1"
                                />
                                <label htmlFor={`${item.id}-${option.label}`} className="ml-2 flex-1 flex items-center">
                                    <span>{option.label}</span>
                                    {isSelected && option.hasNotes && (
                                        <input
                                            type="text"
                                            value={result.notes || ''}
                                            onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                                            placeholder={option.notesLabel || 'ระบุ...'}
                                            className="ml-2 px-1 border-b w-full bg-transparent focus:outline-none focus:border-blue-500"
                                        />
                                    )}
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg space-y-4 max-w-5xl mx-auto border font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="vehicleLicensePlate" className="block text-sm font-medium text-gray-700">ทะเบียน *</label>
                    <select id="vehicleLicensePlate" name="vehicleLicensePlate" value={formData.vehicleLicensePlate} onChange={handleVehicleSelect} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">-- เลือกทะเบียน --</option>
                        {vehicles.map(v => <option key={v.id} value={v.licensePlate}>{v.licensePlate}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">ประเภทรถยนต์</label>
                    <input id="vehicleType" type="text" name="vehicleType" value={formData.vehicleType} className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-100" readOnly />
                </div>
                <div>
                    <label htmlFor="reporterName" className="block text-sm font-medium text-gray-700">ช่าง *</label>
                    <select id="reporterName" name="reporterName" value={formData.reporterName} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">-- เลือกช่าง --</option>
                        {technicians.map(tech => (
                            <option key={tech.id} value={tech.name}>{tech.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="inspectionDate" className="block text-sm font-medium text-gray-700">วันที่ตรวจ</label>
                    <input id="inspectionDate" type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <h3 className="text-lg font-bold">เกี่ยวกับการตรวจเช็คประจำวัน</h3>
                </div>
                <div className="mt-2 pl-10 text-base space-y-1">
                    <p>ใบตรวจเช็คนี้ครอบคลุมการตรวจสอบที่สำคัญในหลายด้าน เพื่อความปลอดภัยและประสิทธิภาพสูงสุด:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>การตรวจสอบก่อนใช้งาน (Pre-trip Inspection):</strong> เช็คความพร้อมพื้นฐานก่อนออกเดินทาง</li>
                        <li><strong>การตรวจสอบประจำวัน/เดือน:</strong> การบำรุงรักษาตามรอบปกติ</li>
                        <li><strong>การตรวจสภาพเพื่อต่อภาษี:</strong> เตรียมความพร้อมสำหรับข้อบังคับทางกฎหมาย</li>
                    </ul>
                </div>
            </div>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* Column 1 */}
                <div className="space-y-2">
                    {column1Items.map(renderChecklistItem)}
                    <div className="border-2 border-amber-300 bg-amber-50 p-4 mt-4 rounded-lg text-amber-900 space-y-3 text-base">
                        <p className="text-center font-bold text-lg border-b border-amber-200 pb-2 mb-2">
                            เมื่อตรวจครบ 8 ข้อแล้ว จึงติดเครื่องยนต์
                        </p>
                        <div>
                            <h4 className="font-bold text-base underline mb-2">ข้อเตือนใจ</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm pl-2">
                                {checklistWarnings.map((warning, i) =>
                                    <li key={i}>{warning.substring(3)}</li>
                                )}
                            </ol>
                        </div>
                    </div>
                </div>
                {/* Column 2 */}
                <div className="space-y-2">
                    {column2Items.map(renderChecklistItem)}
                </div>
            </main>

            <div className="flex justify-end border-t pt-4">
                <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    บันทึกใบตรวจเช็ค
                </button>
            </div>
        </form>
    );
};

export default DailyChecklistForm;