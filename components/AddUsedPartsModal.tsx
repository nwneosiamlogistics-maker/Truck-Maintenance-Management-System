import React, { useState } from 'react';
import type { Repair, UsedPart } from '../types';

interface UsedPartFormData {
    isSelected: boolean;
    quantity: number;
    unit: string;
    notes: string;
}

interface AddUsedPartsModalProps {
    repair: Repair;
    onSave: (parts: Omit<UsedPart, 'id'>[]) => void;
    onClose: () => void;
}

const AddUsedPartsModal: React.FC<AddUsedPartsModalProps> = ({ repair, onSave, onClose }) => {
    
    const getInitialFormState = () => {
        const state: Record<string, UsedPartFormData> = {};
        const partsSource = repair?.parts;

        if (Array.isArray(partsSource)) {
            for (const part of partsSource) {
                if (part && part.partId) {
                    const quantityFromRepair = Number(part.quantity) || 1;
                    state[part.partId] = {
                        isSelected: true,
                        quantity: quantityFromRepair,
                        unit: part.unit,
                        notes: '',
                    };
                }
            }
        }
        return state;
    };

    const [formData, setFormData] = useState(getInitialFormState());

    const handleFormChange = (partId: string, field: keyof UsedPartFormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [partId]: {
                ...prev[partId],
                [field]: value,
            },
        }));
    };

    const handleSubmit = () => {
        const partsToSave: Omit<UsedPart, 'id'>[] = (Array.isArray(repair?.parts) ? repair.parts : [])
            .filter(part => part && formData[part.partId]?.isSelected && formData[part.partId]?.quantity > 0)
            .map(part => {
                const partData = formData[part.partId];
                return {
                    originalPartId: part.partId,
                    name: part.name,
                    fromRepairId: repair.id,
                    fromRepairOrderNo: repair.repairOrderNo,
                    fromLicensePlate: repair.licensePlate,
                    dateRemoved: new Date().toISOString(),
                    initialQuantity: partData.quantity || part.quantity || 1,
                    unit: partData.unit,
                    status: 'รอจัดการ', // Always starts with this status
                    dispositions: [], // Starts with no dispositions
                    notes: partData.notes,
                };
            });
        
        onSave(partsToSave);
    };
    
    const partsArrayForRender = Array.isArray(repair?.parts) ? repair.parts : [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">บันทึกอะไหล่เก่าจากการซ่อม</h3>
                    <p className="text-base text-gray-500">
                        ใบซ่อมเลขที่ {repair.repairOrderNo} (ทะเบียน: {repair.licensePlate})
                    </p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <p className="text-base">เลือกอะไหล่ที่ถูกเปลี่ยนและต้องการบันทึกเก็บไว้ในคลังของเก่า</p>
                    <div className="space-y-3">
                        {partsArrayForRender.map(part => {
                            if (!part) return null; // Defensive check
                            const partFormData = formData[part.partId];
                            if (!partFormData) return null; // Ensure data exists

                            return (
                            <div key={part.partId} className={`p-4 border rounded-lg transition-colors ${partFormData.isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start gap-4">
                                    <input 
                                        type="checkbox"
                                        checked={partFormData.isSelected}
                                        onChange={e => handleFormChange(part.partId, 'isSelected', e.target.checked)}
                                        className="mt-1.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg">{part.name}</h4>
                                        <p className="text-sm text-gray-500">จำนวนที่เบิกจากใบซ่อม: {part.quantity} {part.unit}</p>
                                        
                                        {partFormData.isSelected && (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-medium text-gray-600">จำนวนที่บันทึกเป็นของเก่า</label>
                                                <input type="number" value={partFormData.quantity} onChange={e => handleFormChange(part.partId, 'quantity', Number(e.target.value))} min="1" max={part.quantity} className="w-full p-1.5 border rounded-md mt-1 text-sm"/>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-600">หน่วย</label>
                                                <input type="text" value={partFormData.unit} onChange={e => handleFormChange(part.partId, 'unit', e.target.value)} className="w-full p-1.5 border rounded-md mt-1 text-sm"/>
                                            </div>
                                            <div className="md:col-span-3">
                                                 <label className="text-xs font-medium text-gray-600">หมายเหตุ</label>
                                                 <input type="text" value={partFormData.notes} onChange={e => handleFormChange(part.partId, 'notes', e.target.value)} placeholder="เช่น ยางเหลือดอก 50%" className="w-full p-1.5 border rounded-md mt-1 text-sm"/>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                        ข้าม / ไม่มีอะไหล่เก่า
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSubmit}
                        className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        บันทึกข้อมูลอะไหล่เก่า
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddUsedPartsModal;