import React, { useState, useEffect, useMemo } from 'react';
import type { Repair, Technician, StockItem, PartRequisitionItem, RepairStatus, StockStatus, Priority, EstimationAttempt, Supplier, StockTransaction } from '../types';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';
import TechnicianMultiSelect from './TechnicianMultiSelect';
import { useToast } from '../context/ToastContext';

interface RepairEditModalProps {
    repair: Repair;
    onSave: (updatedRepair: Repair) => void;
    onClose: () => void;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    suppliers: Supplier[];
}

// FIX: Destructure `setStock` from props to resolve "Cannot find name 'setStock'" errors.
const RepairEditModal: React.FC<RepairEditModalProps> = ({ repair, onSave, onClose, technicians, stock, setStock, transactions, setTransactions, suppliers }) => {
    const getInitialState = (repairData: Repair) => {
        const repairCopy = JSON.parse(JSON.stringify(repairData));
        if (!Array.isArray(repairCopy.estimations) || repairCopy.estimations.length === 0) {
            repairCopy.estimations = [{
                sequence: 1,
                createdAt: repairCopy.createdAt || new Date().toISOString(),
                estimatedStartDate: new Date().toISOString(),
                estimatedEndDate: new Date().toISOString(),
                estimatedLaborHours: 0,
                status: 'Active',
                failureReason: null,
                aiReasoning: null
            }];
        }
        return repairCopy;
    };
    
    const [formData, setFormData] = useState<Repair>(getInitialState(repair));
    const [partsBeforeEdit] = useState(repair.parts || []);
    
    const [openSections, setOpenSections] = useState({
        status: true,
        basic: false,
        estimation: true,
        dispatch: false,
        parts: true,
        result: true,
    });
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isExternalPartModalOpen, setExternalPartModalOpen] = useState(false);
    
    const [estimationMode, setEstimationMode] = useState<'duration' | 'date'>('date');
    const [durationValue, setDurationValue] = useState<number>(8);
    const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
    
    const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>(
        repair.externalTechnicianName ? 'external' : 'internal'
    );

    const { addToast } = useToast();

    useEffect(() => {
        setFormData(getInitialState(repair));
        setAssignmentType(repair.externalTechnicianName ? 'external' : 'internal');
    }, [repair]);

    const toLocalISOString = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            return localISOTime;
        } catch {
            return '';
        }
    };

    const activeEstimation = useMemo(() => {
        return formData.estimations.find(e => e.status === 'Active') || formData.estimations[formData.estimations.length - 1];
    }, [formData.estimations]);
    
    useEffect(() => {
        if (estimationMode === 'duration' && activeEstimation) {
            const startDate = new Date(activeEstimation.estimatedStartDate || Date.now());
            if (isNaN(startDate.getTime())) return;

            const multiplier = durationUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            const endDate = new Date(startDate.getTime() + (durationValue * multiplier));
            
            const newEstimations = formData.estimations.map(e => 
                e.sequence === activeEstimation.sequence ? { ...e, estimatedEndDate: new Date(endDate.getTime() + (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 16) } : e
            );
            
            setFormData(prev => ({ ...prev, estimations: newEstimations }));
        }
    }, [estimationMode, durationValue, durationUnit, activeEstimation?.estimatedStartDate]);


    const handleEstimationChange = (field: keyof EstimationAttempt, value: any) => {
        const newEstimations = formData.estimations.map(e => 
            e.sequence === activeEstimation.sequence ? { ...e, [field]: value } : e
        );
        setFormData(prev => ({ ...prev, estimations: newEstimations }));

        if (field === 'estimatedEndDate') {
            setEstimationMode('date');
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // FIX: Ensure numeric inputs are stored as numbers, not strings.
        const finalValue = (name === 'repairCost' || name === 'partsVat')
            ? parseFloat(value) || 0
            : value;

        let newFormData = { ...formData, [name]: finalValue };

        if (name === 'status') {
            const newStatus = value as RepairStatus; // Use original string value for status check
            const now = new Date().toISOString();
            if (newStatus === 'กำลังซ่อม' && !newFormData.repairStartDate) newFormData.repairStartDate = now;
            if (newStatus === 'ซ่อมเสร็จ' && !newFormData.repairEndDate) newFormData.repairEndDate = now;
        }
        setFormData(newFormData);
    };
    
    const handleDateChange = (field: 'approvalDate' | 'repairStartDate' | 'repairEndDate', value: string) => {
        setFormData(prev => ({...prev, [field]: value ? new Date(value).toISOString() : null }));
    };

    const handleCreatedAtChange = (value: string) => {
        if (value) {
            setFormData(prev => ({...prev, createdAt: new Date(value).toISOString()}));
        }
    };

    const removePart = (partId: string) => {
        const partToRemove = (formData.parts || []).find(p => p.partId === partId);
        if (!partToRemove) return;

        if (partToRemove.source === 'สต็อกอู่') {
            // Revert stock reservation
            setStock(prevStock => prevStock.map(s => 
                s.id === partToRemove.partId ? { ...s, quantityReserved: (s.quantityReserved || 0) - partToRemove.quantity } : s
            ));
            // Create cancellation transaction
            const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}`, stockItemId: partToRemove.partId, stockItemName: partToRemove.name, type: 'ยกเลิกจอง',
                quantity: partToRemove.quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ', notes: `ยกเลิกจองสำหรับใบซ่อม ${formData.repairOrderNo}`
            };
            setTransactions(prev => [newTransaction, ...prev]);
        }
        
        setFormData(prev => ({ ...prev, parts: (prev.parts || []).filter(p => p.partId !== partId) }));
    };

    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        setFormData(prev => ({ ...prev, parts: [...(prev.parts || []), ...newParts] }));
        
        newParts.forEach(part => {
             // Update stock reservation
            setStock(prevStock => prevStock.map(s => 
                s.id === part.partId ? { ...s, quantityReserved: (s.quantityReserved || 0) + part.quantity } : s
            ));
            // Create reservation transaction
            const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}-${part.partId}`, stockItemId: part.partId, stockItemName: part.name, type: 'จอง',
                quantity: -part.quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ', notes: `จองสำหรับใบซ่อม ${formData.repairOrderNo}`,
                relatedRepairOrder: formData.repairOrderNo, pricePerUnit: part.unitPrice
            };
            setTransactions(prev => [newTransaction, ...prev]);
        });
        
        addToast(`จองอะไหล่ ${newParts.length} รายการ`, 'info');
        setStockModalOpen(false);
    };

    const handleAddExternalParts = (data: { parts: PartRequisitionItem[], vat: number }) => {
        const currentParts = formData.parts || [];
        const existingPartNames = new Set(currentParts.map(p => p.name.trim().toLowerCase()));
        const newParts = data.parts.filter(p => !existingPartNames.has(p.name.trim().toLowerCase()));
        
        if (newParts.length < data.parts.length) {
            addToast('มีบางรายการซ้ำซ้อนและถูกข้ามไป', 'info');
        }

        setFormData(prev => ({ ...prev, parts: [...currentParts, ...newParts], partsVat: (prev.partsVat || 0) + data.vat }));
        setExternalPartModalOpen(false);
    };

    const handleSave = () => {
        let finalFormData = { ...formData };
    
        // 1. Update Estimation Status if repair is completed
        if (finalFormData.status === 'ซ่อมเสร็จ' && Array.isArray(finalFormData.estimations) && finalFormData.estimations.length > 0) {
            const updatedEstimations = JSON.parse(JSON.stringify(finalFormData.estimations));
            let estimationToCompleteIndex = updatedEstimations.findIndex((e: EstimationAttempt) => e.status === 'Active');
            if (estimationToCompleteIndex === -1) {
                let maxSequence = -1;
                updatedEstimations.forEach((e: EstimationAttempt, index: number) => {
                    if (e.sequence > maxSequence) {
                        maxSequence = e.sequence;
                        estimationToCompleteIndex = index;
                    }
                });
            }
            if (estimationToCompleteIndex > -1) {
                for (let i = 0; i < updatedEstimations.length; i++) {
                    if (i !== estimationToCompleteIndex && updatedEstimations[i].status !== 'Completed') {
                        updatedEstimations[i].status = 'Failed';
                    }
                }
                updatedEstimations[estimationToCompleteIndex].status = 'Completed';
                finalFormData.estimations = updatedEstimations;
            }
        }
    
        const partsAfterEdit = finalFormData.parts || [];
    
        // 2. Un-reserve parts that were removed
        partsBeforeEdit.forEach(oldPart => {
            if (oldPart.source === 'สต็อกอู่' && !partsAfterEdit.some(newPart => newPart.partId === oldPart.partId)) {
                setStock(prevStock => prevStock.map(s => 
                    s.id === oldPart.partId ? { ...s, quantityReserved: Math.max(0, (s.quantityReserved || 0) - oldPart.quantity) } : s
                ));
                const newTransaction: StockTransaction = {
                    id: `TXN-${Date.now()}-cancel-${oldPart.partId}`, stockItemId: oldPart.partId, stockItemName: oldPart.name, type: 'ยกเลิกจอง',
                    quantity: oldPart.quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ', notes: `ยกเลิกจองสำหรับใบซ่อม ${finalFormData.repairOrderNo}`
                };
                setTransactions(prev => [newTransaction, ...prev]);
            }
        });
    
        // 3. Create 'เบิกใช้' transactions and finalize stock if repair is completed
        if (finalFormData.status === 'ซ่อมเสร็จ') {
            const technicianNames = technicians.filter(t => (finalFormData.assignedTechnicians || []).includes(t.id)).map(t => t.name).join(', ') || finalFormData.reportedBy || 'ไม่ระบุ';
            const now = new Date().toISOString();
    
            const existingWithdrawalPartIds = new Set(
                (Array.isArray(transactions) ? transactions : [])
                    .filter(t => t.relatedRepairOrder === finalFormData.repairOrderNo && t.type === 'เบิกใช้')
                    .map(t => t.stockItemId)
            );
    
            const stockToUpdate: Record<string, { quantityChange: number, reservedChange: number }> = {};
            const transactionsToAdd: StockTransaction[] = [];

            partsAfterEdit.forEach(part => {
                if (part.source === 'สต็อกอู่') {
                    // This part's reservation is now fulfilled.
                    stockToUpdate[part.partId] = { 
                        quantityChange: (stockToUpdate[part.partId]?.quantityChange || 0) + part.quantity,
                        reservedChange: (stockToUpdate[part.partId]?.reservedChange || 0) + part.quantity,
                    };
                    
                    // Only create a new withdrawal transaction if one doesn't already exist for this part in this repair order
                    if (!existingWithdrawalPartIds.has(part.partId)) {
                        transactionsToAdd.push({
                            id: `TXN-${now}-${part.partId}`,
                            stockItemId: part.partId,
                            stockItemName: part.name,
                            type: 'เบิกใช้',
                            quantity: -part.quantity,
                            transactionDate: now,
                            actor: technicianNames,
                            notes: `ใช้สำหรับใบแจ้งซ่อม ${finalFormData.repairOrderNo}`,
                            relatedRepairOrder: finalFormData.repairOrderNo,
                            pricePerUnit: part.unitPrice
                        });
                    }
                }
            });
    
            if (Object.keys(stockToUpdate).length > 0) {
                setStock(prevStock => prevStock.map(s => {
                    if (stockToUpdate[s.id]) {
                        const { quantityChange, reservedChange } = stockToUpdate[s.id];
                        const newQuantity = s.quantity - quantityChange;
                        const newReserved = Math.max(0, (s.quantityReserved || 0) - reservedChange);
                        
                        let newStatus: StockStatus = 'ปกติ';
                        // FIX: Corrected Thai spelling for StockStatus enum values ('หมดสต็อก', 'สต๊อกต่ำ', 'สต๊อกเกิน') to match the type definition.
                        if (newQuantity <= 0) newStatus = 'หมดสต็อก';
                        else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                        else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                        
                        return { ...s, quantity: newQuantity, quantityReserved: newReserved, status: newStatus };
                    }
                    return s;
                }));
                 addToast(`หักสต็อกและเคลียร์ยอดจอง ${Object.keys(stockToUpdate).length} รายการ`, 'info');
            }
            if (transactionsToAdd.length > 0) {
                setTransactions(prev => [...transactionsToAdd, ...prev]);
                addToast(`สร้างประวัติการเบิกจ่ายใหม่ ${transactionsToAdd.length} รายการ`, 'info');
            }
        } else if (finalFormData.status === 'ยกเลิก') {
            const partsToUnreserve = (finalFormData.parts || []).filter(p => p.source === 'สต็อกอู่');
            if (partsToUnreserve.length > 0) {
                const stockToUpdate: Record<string, { reservedChange: number }> = {};
                const transactionsToAdd: StockTransaction[] = [];
                const now = new Date().toISOString();
                partsToUnreserve.forEach(part => {
                    stockToUpdate[part.partId] = {
                        reservedChange: (stockToUpdate[part.partId]?.reservedChange || 0) + part.quantity
                    };
                    transactionsToAdd.push({
                        id: `TXN-cancel-${now}-${part.partId}`,
                        stockItemId: part.partId,
                        stockItemName: part.name,
                        type: 'ยกเลิกจอง',
                        quantity: part.quantity,
                        transactionDate: now,
                        actor: 'ระบบ (ยกเลิกใบซ่อม)',
                        notes: `จากใบซ่อม ${finalFormData.repairOrderNo}`,
                        relatedRepairOrder: finalFormData.repairOrderNo,
                        pricePerUnit: part.unitPrice
                    });
                });
                setStock(prevStock => prevStock.map(s => {
                    if (stockToUpdate[s.id]) {
                        const { reservedChange } = stockToUpdate[s.id];
                        const newReserved = Math.max(0, (s.quantityReserved || 0) - reservedChange);
                        return { ...s, quantityReserved: newReserved };
                    }
                    return s;
                }));
                setTransactions(prev => [...transactionsToAdd, ...prev]);
                addToast(`ยกเลิกการจองอะไหล่ ${partsToUnreserve.length} รายการ`, 'info');
            }
        }
        
        onSave(finalFormData);
    };
    
    const SectionHeader: React.FC<{ title: string; sectionId: keyof typeof openSections }> = ({ title, sectionId }) => (
        <button type="button" onClick={() => setOpenSections(p => ({...p, [sectionId]: !p[sectionId]}))} className="w-full flex justify-between items-center text-left bg-gray-100 p-4 rounded-t-lg border-b">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <span className={`transform transition-transform duration-200 ${openSections[sectionId] ? 'rotate-180' : ''}`}>▼</span>
        </button>
    );

    const { totalPartsCost, grandTotal } = useMemo(() => {
        const partsCost = (formData.parts || []).reduce((total, part) => total + (part.quantity * part.unitPrice), 0);
        const total = partsCost + (Number(formData.partsVat) || 0) + (Number(formData.repairCost) || 0);
        return { totalPartsCost: partsCost, grandTotal: total };
    }, [formData.parts, formData.repairCost, formData.partsVat]);

    const getPriorityClass = (priority: Priority) => {
        switch (priority) {
            case 'ด่วน': return 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold';
            case 'ด่วนที่สุด': return 'bg-red-50 border-red-400 text-red-800 font-semibold';
            default: return 'bg-white border-gray-300';
        }
    };
    
    const handleAssignmentTypeChange = (type: 'internal' | 'external') => {
        setAssignmentType(type);
        if (type === 'internal') {
            setFormData(prev => ({
                ...prev,
                externalTechnicianName: '',
                dispatchType: 'ภายใน'
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                assignedTechnicians: [],
                dispatchType: 'ภายนอก'
            }));
        }
    };
    
    return (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">แก้ไขใบแจ้งซ่อม</h3>
                        <p className="text-base text-gray-500">{formData.repairOrderNo} - {formData.licensePlate}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Status & Dates section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title="สถานะและวันที่" sectionId="status" />
                        {openSections.status && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">สถานะ</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                        <option value="รอซ่อม">รอซ่อม</option>
                                        <option value="กำลังซ่อม">กำลังซ่อม</option>
                                        <option value="รออะไหล่">รออะไหล่</option>
                                        <option value="ซ่อมเสร็จ">ซ่อมเสร็จ</option>
                                        <option value="ยกเลิก">ยกเลิก</option>
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium">วันที่อนุมัติ</label>
                                    <input type="datetime-local" value={toLocalISOString(formData.approvalDate)} onChange={(e) => handleDateChange('approvalDate', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium">วันที่เริ่มซ่อม</label>
                                    <input type="datetime-local" value={toLocalISOString(formData.repairStartDate)} onChange={(e) => handleDateChange('repairStartDate', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">วันที่ซ่อมเสร็จ</label>
                                    <input type="datetime-local" value={toLocalISOString(formData.repairEndDate)} onChange={(e) => handleDateChange('repairEndDate', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Estimation Section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title={`2. การประมาณการณ์ (ครั้งที่ ${activeEstimation.sequence})`} sectionId="estimation" />
                        {openSections.estimation && (
                             <div className="p-6 space-y-4">
                                <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="estimationMode" value="duration" checked={estimationMode === 'duration'} onChange={() => setEstimationMode('duration')} className="mr-2 h-4 w-4"/>
                                            <span className="font-semibold text-gray-700">ระบุระยะเวลา</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="estimationMode" value="date" checked={estimationMode === 'date'} onChange={() => setEstimationMode('date')} className="mr-2 h-4 w-4"/>
                                            <span className="font-semibold text-gray-700">กำหนดวันเสร็จ</span>
                                        </label>
                                    </div>
                                    {estimationMode === 'duration' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ระยะเวลา</label>
                                            <input type="number" value={durationValue} onChange={(e) => setDurationValue(Number(e.target.value) || 1)} min="1" className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">หน่วย</label>
                                            <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as 'hours' | 'days')} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                                <option value="hours">ชั่วโมง</option>
                                                <option value="days">วัน</option>
                                            </select>
                                        </div>
                                    </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะเริ่มซ่อม</label>
                                            <input type="datetime-local" value={toLocalISOString(activeEstimation.estimatedStartDate) || ''} onChange={(e) => handleEstimationChange('estimatedStartDate', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะซ่อมเสร็จ *</label>
                                            <input 
                                                type="datetime-local" 
                                                value={toLocalISOString(activeEstimation.estimatedEndDate) || ''} 
                                                onChange={(e) => handleEstimationChange('estimatedEndDate', e.target.value)} 
                                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                                readOnly={estimationMode === 'duration'}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Basic Info Section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title="ข้อมูลพื้นฐาน" sectionId="basic" />
                        {openSections.basic && (
                            <div className="p-6 space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ทะเบียนรถ</label>
                                        <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required />
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                                        <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                                        <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ประเภทรถ</label>
                                        <input type="text" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ประเภทการซ่อม</label>
                                        <select name="repairCategory" value={formData.repairCategory} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                            <option>ซ่อมทั่วไป</option>
                                            <option>เปลี่ยนอะไหล่</option>
                                            <option>ตรวจเช็ก</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">เลขไมล์</label>
                                        <input type="number" name="currentMileage" value={formData.currentMileage} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ความสำคัญ</label>
                                        <select name="priority" value={formData.priority} onChange={handleInputChange} className={`mt-1 w-full p-2 border rounded-lg transition-colors ${getPriorityClass(formData.priority)}`}>
                                            <option value="ปกติ">ปกติ</option>
                                            <option value="ด่วน">ด่วน</option>
                                            <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">วันที่แจ้งซ่อม</label>
                                        <input 
                                            type="datetime-local" 
                                            value={toLocalISOString(formData.createdAt)} 
                                            onChange={(e) => handleCreatedAtChange(e.target.value)} 
                                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้งซ่อม</label>
                                        <input type="text" name="reportedBy" value={formData.reportedBy} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">อาการเสีย</label>
                                    <textarea name="problemDescription" value={formData.problemDescription} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required></textarea>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dispatch Section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title="ข้อมูลการส่งซ่อม" sectionId="dispatch" />
                        {openSections.dispatch && (
                             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการส่งซ่อม</label>
                                    <div className="flex items-center gap-6 mb-3">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="assignmentType" value="internal" checked={assignmentType === 'internal'} onChange={() => handleAssignmentTypeChange('internal')} className="mr-2 h-4 w-4"/>
                                            <span className="font-semibold text-gray-700">ซ่อมภายใน</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="assignmentType" value="external" checked={assignmentType === 'external'} onChange={() => handleAssignmentTypeChange('external')} className="mr-2 h-4 w-4"/>
                                            <span className="font-semibold text-gray-700">ซ่อมภายนอก</span>
                                        </label>
                                    </div>
                                    {assignmentType === 'internal' ? (
                                       <TechnicianMultiSelect
                                            allTechnicians={technicians}
                                            selectedTechnicianIds={formData.assignedTechnicians}
                                            onChange={(ids) => setFormData(prev => ({...prev, assignedTechnicians: ids}))}
                                       />
                                    ) : (
                                        <input 
                                            type="text" 
                                            name="externalTechnicianName"
                                            value={formData.externalTechnicianName || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="กรอกชื่อช่าง หรือ อู่ภายนอก"
                                            className="w-full p-2 border border-gray-300 rounded-lg" 
                                        />
                                    )}
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">ค่าใช้จ่ายในการซ่อม (ไม่รวมอะไหล่)</label>
                                    <input type="number" name="repairCost" value={formData.repairCost} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">VAT (7%)</label>
                                    <input type="number" name="partsVat" value={formData.partsVat} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                </div>
                             </div>
                        )}
                    </div>
                    
                    {/* Parts section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title="รายการเบิกอะไหล่" sectionId="parts" />
                        {openSections.parts && (
                            <div className="p-6 space-y-4">
                                <div className="space-y-3">
                                    {(formData.parts && formData.parts.length > 0) && (
                                         <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b font-medium text-sm text-gray-600">
                                            <div className="col-span-1">ที่มา</div>
                                            <div className="col-span-4">ชื่ออะไหล่</div>
                                            <div className="col-span-2 text-right">จำนวน</div>
                                            <div className="col-span-1 text-center">หน่วย</div>
                                            <div className="col-span-2 text-right">ราคา/หน่วย</div>
                                            <div className="col-span-2 text-right">ราคารวม</div>
                                        </div>
                                    )}
                                    {(formData.parts || []).map((part) => (
                                        <div key={part.partId} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50">
                                            <div className="col-span-1 text-xl">{part.source === 'สต็อกอู่' ? '📦' : '🏪'}</div>
                                            <div className="col-span-4"><p className="font-medium">{part.name}</p></div>
                                            <div className="col-span-2 text-right font-semibold">
                                                {part.quantity}
                                            </div>
                                            <div className="col-span-1 text-center">{part.unit}</div>
                                            <div className="col-span-2 text-right">
                                                 {part.unitPrice.toLocaleString()}
                                            </div>
                                            <div className="col-span-1 font-semibold text-right">
                                                {(part.quantity * part.unitPrice).toLocaleString()}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <button type="button" onClick={() => removePart(part.partId)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                 {(formData.parts && formData.parts.length > 0) && (
                                    <div className="text-right space-y-2 border-t pt-3 mt-3">
                                        <div className="text-lg">
                                            <span>ราคารวมอะไหล่: </span>
                                            <span className="font-semibold">{totalPartsCost.toLocaleString()} บาท</span>
                                        </div>
                                         <div className="text-lg">
                                            <span>VAT (7%): </span>
                                            <span className="font-semibold">{(formData.partsVat || 0).toLocaleString()} บาท</span>
                                        </div>
                                        <div className="text-xl font-bold">
                                            <span>ค่าใช้จ่ายรวม (อะไหล่+ค่าแรง): </span>
                                            <span className="text-blue-600">{grandTotal.toLocaleString()} บาท</span>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button type="button" onClick={() => setStockModalOpen(true)} className="w-full text-blue-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2">
                                       📦 + เลือกจากสต็อกอู่
                                    </button>
                                     <button type="button" onClick={() => setExternalPartModalOpen(true)} className="w-full text-green-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-green-500 hover:bg-green-50 flex items-center justify-center gap-2">
                                       🏪 + เพิ่มรายการจากร้านค้า
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Repair Result Section */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <SectionHeader title="ผลการซ่อม" sectionId="result" />
                        {openSections.result && (
                            <div className="p-6">
                                 <label className="block text-sm font-medium text-gray-700">บันทึกผลการซ่อม</label>
                                <textarea name="repairResult" value={formData.repairResult} onChange={handleInputChange} rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"></textarea>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="button" onClick={handleSave} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึกการเปลี่ยนแปลง</button>
                </div>
            </div>
        </div>

        {isStockModalOpen && (
            <StockSelectionModal
                stock={stock}
                onClose={() => setStockModalOpen(false)}
                onAddParts={handleAddPartsFromStock}
                existingParts={formData.parts || []}
            />
        )}
        {isExternalPartModalOpen && (
            <ExternalPartModal
                onClose={() => setExternalPartModalOpen(false)}
                onAddExternalParts={handleAddExternalParts}
                suppliers={suppliers}
            />
        )}
    </>
    );
};

export default RepairEditModal;