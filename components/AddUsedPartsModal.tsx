import React, { useState, useMemo } from 'react';
import type { Repair, UsedPart, StockItem, PartRequisitionItem } from '../types';

// Decision for each part from the repair
type Disposition = 'track_individual' | 'add_to_fungible' | 'return_to_main_stock' | 'dispose';

interface PartDecision {
    disposition: Disposition;
    quantity: number;
    notes: string;
    fungibleStockId: string; // Used when disposition is 'add_to_fungible'
}

interface AddUsedPartsModalProps {
    repair: Repair;
    onSaveIndividual: (parts: Omit<UsedPart, 'id'>[]) => void;
    onSaveFungible: (updates: { stockItemId: string, quantity: number, repairOrderNo: string }[]) => void;
    stock: StockItem[]; // The complete stock list
    onClose: () => void;
}

const AddUsedPartsModal: React.FC<AddUsedPartsModalProps> = ({ repair, onSaveIndividual, onSaveFungible, stock, onClose }) => {

    const fungibleStockItems = useMemo(() => {
        return (Array.isArray(stock) ? stock : []).filter(s => s.isFungibleUsedItem);
    }, [stock]);

    // Consolidate parts from the repair order by name to prevent duplicates.
    const consolidatedParts = useMemo(() => {
        const partsSource = repair?.parts;
        if (!Array.isArray(partsSource)) return [];

        const groupedParts = new Map<string, PartRequisitionItem>();

        partsSource.forEach(part => {
            if (!part) return;
            // Group by name, assuming parts with the same name are identical for this purpose.
            const key = part.name;
            
            if (groupedParts.has(key)) {
                const existing = groupedParts.get(key)!;
                // Add quantity
                existing.quantity += part.quantity;
            } else {
                // Create a copy to avoid mutating props
                groupedParts.set(key, { ...part });
            }
        });

        return Array.from(groupedParts.values());
    }, [repair?.parts]);

    const [decisions, setDecisions] = useState<Record<string, PartDecision>>(() => {
        const state: Record<string, PartDecision> = {};
        consolidatedParts.forEach(part => {
            state[part.name] = {
                disposition: 'track_individual',
                quantity: part.quantity,
                notes: '',
                fungibleStockId: fungibleStockItems.length > 0 ? fungibleStockItems[0].id : '',
            };
        });
        return state;
    });

    const handleDecisionChange = (partName: string, field: keyof PartDecision, value: any) => {
        setDecisions(prev => {
            const newDecisions = { ...prev };
            newDecisions[partName] = {
                ...newDecisions[partName],
                [field]: value,
            };
            // If disposition is changed to add_to_fungible, ensure a default is selected if available
            if (field === 'disposition' && value === 'add_to_fungible' && !newDecisions[partName].fungibleStockId && fungibleStockItems.length > 0) {
                 newDecisions[partName].fungibleStockId = fungibleStockItems[0].id;
            }
            return newDecisions;
        });
    };

    const handleSubmit = () => {
        const partsForIndividualTracking: Omit<UsedPart, 'id'>[] = [];
        const stockUpdates: { stockItemId: string, quantity: number, repairOrderNo: string }[] = [];

        consolidatedParts.forEach(part => {
            if (!part || !part.partId) return;
            const decision = decisions[part.name];
            if (!decision || decision.disposition === 'dispose' || decision.quantity <= 0) {
                return;
            }

            switch (decision.disposition) {
                case 'track_individual':
                    partsForIndividualTracking.push({
                        originalPartId: part.partId,
                        name: part.name,
                        fromRepairId: repair.id,
                        fromRepairOrderNo: repair.repairOrderNo,
                        fromLicensePlate: repair.licensePlate,
                        dateRemoved: new Date().toISOString(),
                        initialQuantity: decision.quantity,
                        unit: part.unit,
                        status: 'รอจัดการ',
                        dispositions: [],
                        notes: decision.notes,
                    });
                    break;
                case 'add_to_fungible':
                    if (decision.fungibleStockId) {
                        stockUpdates.push({
                            stockItemId: decision.fungibleStockId,
                            quantity: decision.quantity,
                            repairOrderNo: repair.repairOrderNo,
                        });
                    }
                    break;
                case 'return_to_main_stock':
                    stockUpdates.push({
                        stockItemId: part.partId,
                        quantity: decision.quantity,
                        repairOrderNo: repair.repairOrderNo,
                    });
                    break;
                // 'dispose' is handled by the initial check
            }
        });

        if (partsForIndividualTracking.length > 0) {
            onSaveIndividual(partsForIndividualTracking);
        }
        if (stockUpdates.length > 0) {
            onSaveFungible(stockUpdates);
        }
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">ศูนย์กลางตัดสินใจ: อะไหล่เก่าจากการซ่อม</h3>
                    <p className="text-base text-gray-500">
                        ใบซ่อมเลขที่ {repair.repairOrderNo} (ทะเบียน: {repair.licensePlate})
                    </p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <p className="text-base">สำหรับอะไหล่แต่ละชิ้น โปรดระบุวิธีจัดการของเก่าที่ถูกเปลี่ยนออกมา</p>
                    <div className="space-y-3">
                        {consolidatedParts.map(part => {
                            if (!part || !part.partId) return null;
                            const decision = decisions[part.name];
                            if (!decision) return null;
                            
                            const originalPartInStock = stock.find(s => s.id === part.partId && !s.isFungibleUsedItem);

                            return (
                            <div key={part.name} className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                                <h4 className="font-bold text-lg">{part.name} <span className="text-sm font-normal text-gray-500">(เบิก: {part.quantity} {part.unit})</span></h4>
                                        
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                    <div className="lg:col-span-1">
                                        <label className="text-sm font-medium text-gray-600 block mb-1">ตัวเลือกการจัดการ</label>
                                        <select
                                            value={decision.disposition}
                                            onChange={e => handleDecisionChange(part.name, 'disposition', e.target.value)}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="track_individual">เก็บเป็นชิ้นในคลังอะไหล่เก่า</option>
                                             {originalPartInStock && <option value="return_to_main_stock">เก็บไว้ใช้ภายใน (อะไหล่หมุนเวียน)</option>}
                                            {fungibleStockItems.length > 0 && <option value="add_to_fungible">เพิ่มในสต็อกของเก่าแบบรวม</option>}
                                            <option value="dispose">ทิ้ง (ไม่มีมูลค่า)</option>
                                        </select>
                                    </div>

                                    {decision.disposition === 'add_to_fungible' && (
                                        <div className="lg:col-span-1">
                                            <label className="text-sm font-medium text-gray-600 block mb-1">เลือกสต็อกของเก่า</label>
                                            <select
                                                value={decision.fungibleStockId}
                                                onChange={e => handleDecisionChange(part.name, 'fungibleStockId', e.target.value)}
                                                className="w-full p-2 border rounded-md"
                                            >
                                                 {fungibleStockItems.map(item => (
                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {decision.disposition !== 'dispose' ? (
                                        <div className="lg:col-span-1">
                                            <label className="text-sm font-medium text-gray-600 block mb-1">จำนวน</label>
                                            <input
                                                type="number"
                                                value={decision.quantity}
                                                onChange={e => handleDecisionChange(part.name, 'quantity', Number(e.target.value))}
                                                min="0"
                                                step="any"
                                                max={['track_individual', 'return_to_main_stock'].includes(decision.disposition) ? part.quantity : undefined}
                                                className="w-full p-2 border rounded-md"
                                            />
                                        </div>
                                    ) : (
                                        <div className="lg:col-span-2 flex items-center justify-center bg-gray-100 p-2 rounded-md text-gray-500 italic h-10">
                                            จะไม่มีการบันทึกข้อมูล
                                        </div>
                                    )}
                                </div>
                                {(decision.disposition === 'track_individual' || decision.disposition === 'return_to_main_stock') && (
                                    <div className="mt-2">
                                        <label className="text-sm font-medium text-gray-600 block mb-1">หมายเหตุ</label>
                                        <input
                                            type="text"
                                            value={decision.notes}
                                            onChange={e => handleDecisionChange(part.name, 'notes', e.target.value)}
                                            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                            className="w-full p-2 border rounded-md"
                                        />
                                    </div>
                                )}
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
                        บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddUsedPartsModal;
