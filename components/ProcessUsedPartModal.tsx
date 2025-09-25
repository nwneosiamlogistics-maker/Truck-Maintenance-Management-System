import React, { useState, useMemo, useEffect } from 'react';
import type { UsedPart, StockItem } from '../types';

// The disposition decision type
type DispositionDecision = 'keep' | 'to_revolving_stock' | 'to_fungible' | 'dispose';

interface ProcessUsedPartModalProps {
    part: UsedPart;
    stock: StockItem[];
    onProcess: (partId: string, decision: { type: 'to_fungible' | 'to_revolving_stock' | 'dispose', fungibleStockId?: string, quantity?: number, notes?: string }) => void;
    onClose: () => void;
}

const ProcessUsedPartModal: React.FC<ProcessUsedPartModalProps> = ({ part, stock, onProcess, onClose }) => {
    // Default decision is 'keep' which corresponds to "ยังไม่ดำเนินการ"
    const [decision, setDecision] = useState<DispositionDecision>('keep');
    
    const fungibleStockItems = useMemo(() => {
        return (Array.isArray(stock) ? stock : [])
            .filter(s => s.isFungibleUsedItem);
    }, [stock]);
    
    // Check if the original part still exists in the main stock (for the 'return to main stock' option)
    const originalStockItem = useMemo(() => {
        return (Array.isArray(stock) ? stock : []).find(s => s.id === part.originalPartId && !s.isFungibleUsedItem);
    }, [stock, part.originalPartId]);
    
    const [fungibleStockId, setFungibleStockId] = useState('');
    const [conversionQuantity, setConversionQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');

    const remainingQty = useMemo(() => {
        const disposed = (part.dispositions || []).reduce((sum, d) => sum + d.quantity, 0);
        return part.initialQuantity - disposed;
    }, [part]);

    useEffect(() => {
        if (fungibleStockItems.length > 0) {
            setFungibleStockId(fungibleStockItems[0].id);
        } else {
            setFungibleStockId('');
        }
    }, [fungibleStockItems]);

    useEffect(() => {
        if (decision === 'to_fungible') {
            setConversionQuantity(remainingQty);
        }
    }, [decision, remainingQty]);

    // Handler to confirm the chosen action
    const handleConfirm = () => {
        switch (decision) {
            case 'to_fungible':
                if (fungibleStockId) {
                    onProcess(part.id, { type: 'to_fungible', fungibleStockId, quantity: conversionQuantity, notes });
                }
                break;
            case 'to_revolving_stock':
                // The check is removed from here as the backend will handle creation
                onProcess(part.id, { type: 'to_revolving_stock', notes });
                break;
            case 'dispose':
                onProcess(part.id, { type: 'dispose', notes });
                break;
            case 'keep':
            default:
                // 'keep' does nothing but close the modal, allowing for later management
                break;
        }
        onClose();
    };
    
    // A helper component to render each radio button option consistently
    const renderOptionLabel = (
        value: DispositionDecision, 
        title: string, 
        description: string, 
        disabled: boolean = false, 
        children?: React.ReactNode
    ) => (
        <label className={`flex items-start p-3 border rounded-lg transition-all ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${decision === value && !disabled ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
            <input 
                type="radio" 
                name="decision" 
                value={value} 
                checked={decision === value} 
                onChange={() => !disabled && setDecision(value)} 
                disabled={disabled}
                className="h-5 w-5 mt-1 disabled:cursor-not-allowed"
            />
            <div className="ml-3 flex-1">
                <p className={`font-bold ${disabled ? 'text-gray-500' : ''}`}>{title}</p>
                <p className="text-sm text-gray-600">{description}</p>
                {decision === value && !disabled && children}
            </div>
        </label>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">จัดการอะไหล่เก่า: {part.name}</h3>
                    <p className="text-base text-gray-500">
                        จำนวนคงเหลือ: <span className="font-bold">{remainingQty} {part.unit}</span>
                    </p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <p className="font-semibold">เลือกวิธีจัดการสำหรับอะไหล่ {remainingQty} {part.unit} ที่เหลือ:</p>
                    <div className="space-y-3">
                         {renderOptionLabel('keep', 'ยังไม่ดำเนินการ (จัดการรายชิ้น)', 'เก็บอะไหล่ไว้ในคลัง (รายชิ้น) ตามเดิม เพื่อแบ่งขาย/เก็บ/ใช้ภายหลัง')}
                         
                         {renderOptionLabel(
                            'to_revolving_stock', 
                            'เก็บไว้ใช้ภายใน (อะไหล่หมุนเวียน)', 
                            originalStockItem
                                ? `นำอะไหล่ทั้งหมดไปไว้ใน "คลังอะไหล่หมุนเวียน" (${originalStockItem.name}) เพื่อใช้กับรถคันอื่นต่อไป`
                                : 'สร้างรายการใหม่ใน "คลังอะไหล่หมุนเวียน" จากอะไหล่ชิ้นนี้ (เนื่องจากเป็นของที่ซื้อจากภายนอก)',
                         )}

                         {renderOptionLabel(
                            'to_fungible', 
                            'เพิ่มในสต็อกของเก่าแบบรวม', 
                            fungibleStockItems.length > 0 
                                ? `ย้ายไปรวมกับสต็อกของเก่าเพื่อรอขาย/รีไซเคิล` 
                                : `ไม่พบ "สต็อกของเก่าแบบรวม" ในระบบ`,
                            fungibleStockItems.length === 0,
                            <div className="mt-2 space-y-2">
                                <select value={fungibleStockId} onChange={e => setFungibleStockId(e.target.value)} className="w-full p-2 border rounded-md">
                                    {fungibleStockItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block mb-1">
                                        จำนวนที่จะเพิ่ม (หน่วย: {fungibleStockItems.find(s => s.id === fungibleStockId)?.unit || ''})*
                                    </label>
                                    <input
                                        type="number"
                                        value={conversionQuantity}
                                        onChange={e => setConversionQuantity(Number(e.target.value))}
                                        min="0.01"
                                        step="any"
                                        className="w-full p-2 border rounded-md"
                                        required
                                    />
                                </div>
                            </div>
                         )}

                         {renderOptionLabel('dispose', 'ทิ้ง (ไม่มีมูลค่า)', 'ลบอะไหล่ทั้งหมดออกจากระบบอย่างถาวร')}
                    </div>
                     {(decision !== 'keep') && (
                         <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">หมายเหตุ (ถ้ามี)</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                        ยกเลิก
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm}
                        className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        ยืนยันการจัดการ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProcessUsedPartModal;