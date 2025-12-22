
import React, { useState, useEffect, useMemo } from 'react';
import type { Repair, Technician, StockItem, PartRequisitionItem, RepairStatus, StockStatus, Priority, EstimationAttempt, Supplier, StockTransaction } from '../types';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';
import TechnicianMultiSelect from './TechnicianMultiSelect';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus, formatCurrency } from '../utils';

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
        if (!Array.isArray(repairCopy.assistantTechnicianIds)) {
            repairCopy.assistantTechnicianIds = [];
        }
        return repairCopy;
    };

    const [formData, setFormData] = useState<Repair>(getInitialState(repair));

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { addToast } = useToast();

    const { mainTechnicians, assistantTechnicians } = useMemo(() => {
        const safeTechnicians = Array.isArray(technicians) ? technicians : [];
        return {
            mainTechnicians: safeTechnicians.filter(t => t.role === 'ช่าง'),
            assistantTechnicians: safeTechnicians.filter(t => t.role === 'ผู้ช่วยช่าง'),
        };
    }, [technicians]);


    useEffect(() => {
        const initialState = getInitialState(repair);
        initialState.isLaborVatEnabled = repair.isLaborVatEnabled ?? (repair.laborVat !== undefined && repair.laborVat > 0);
        initialState.laborVatRate = repair.laborVatRate ?? 7;

        // For old data that didn't store the rate
        if (repair.isLaborVatEnabled === undefined && repair.laborVat && repair.repairCost) {
            initialState.laborVatRate = parseFloat(((repair.laborVat / repair.repairCost) * 100).toFixed(2));
        }

        setFormData(initialState);
        setAssignmentType(repair.externalTechnicianName ? 'external' : 'internal');
    }, [repair]);

    useEffect(() => {
        const laborCost = Number(formData.repairCost) || 0;
        if (formData.isLaborVatEnabled) {
            const rate = Number(formData.laborVatRate) || 0;
            const calculatedVat = laborCost * (rate / 100);
            setFormData(prev => ({ ...prev, laborVat: calculatedVat }));
        } else {
            setFormData(prev => ({ ...prev, laborVat: 0 }));
        }
    }, [formData.isLaborVatEnabled, formData.laborVatRate, formData.repairCost]);


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

    const isAssigned = !!(formData.assignedTechnicianId || formData.externalTechnicianName);
    const hasStarted = !!formData.repairStartDate;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const finalValue = (['repairCost', 'partsVat', 'laborVat', 'laborVatRate'].includes(name))
            ? parseFloat(value) || 0
            : value;

        let newFormData = { ...formData, [name]: finalValue };

        if (name === 'status') {
            const newStatus = value as RepairStatus;

            // Sequential Gate Logic
            if (newStatus === 'กำลังซ่อม' && !isAssigned) {
                addToast('กรุณามอบหมายช่างก่อนเริ่มดำเนินการ (ขั้นตอนที่ 2)', 'warning');
                return;
            }
            if (newStatus === 'ซ่อมเสร็จ' && !hasStarted && !newFormData.repairStartDate) {
                addToast('กรุณาบันทึกปุ่มเริ่มซ่อมก่อนจบงาน (ขั้นตอนที่ 3)', 'warning');
                return;
            }

            const now = new Date().toISOString();
            if (newStatus === 'กำลังซ่อม' && !newFormData.repairStartDate) newFormData.repairStartDate = now;
            if (newStatus === 'ซ่อมเสร็จ' && !newFormData.repairEndDate) newFormData.repairEndDate = now;
        }
        setFormData(newFormData);
    };

    const handleDateChange = (field: 'approvalDate' | 'repairStartDate' | 'repairEndDate', value: string) => {
        setFormData(prev => ({ ...prev, [field]: value ? new Date(value).toISOString() : null }));
    };

    const handleCreatedAtChange = (value: string) => {
        if (value) {
            setFormData(prev => ({ ...prev, createdAt: new Date(value).toISOString() }));
        }
    };

    const removePart = (partId: string) => {
        setFormData(prev => ({ ...prev, parts: (prev.parts || []).filter(p => p.partId !== partId) }));
    };

    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        setFormData(prev => ({ ...prev, parts: [...(prev.parts || []), ...newParts] }));
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

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
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

            // 2. Create 'เบิกใช้' transactions and finalize stock if repair is completed
            if (finalFormData.status === 'ซ่อมเสร็จ') {
                const allTechIds = [finalFormData.assignedTechnicianId, ...(finalFormData.assistantTechnicianIds || [])].filter(Boolean);
                const technicianNames = technicians.filter(t => allTechIds.includes(t.id)).map(t => t.name).join(', ') || finalFormData.reportedBy || 'ไม่ระบุ';
                const now = new Date().toISOString();

                const existingWithdrawalPartIds = new Set(
                    (Array.isArray(transactions) ? transactions : [])
                        .filter(t => t.relatedRepairOrder === finalFormData.repairOrderNo && t.type === 'เบิกใช้')
                        .map(t => t.stockItemId)
                );

                const stockToUpdate: Record<string, number> = {};
                const transactionsToAdd: StockTransaction[] = [];

                partsAfterEdit.forEach(part => {
                    if (part.source === 'สต็อกอู่') {
                        // Only create a new withdrawal transaction if one doesn't already exist for this part in this repair order
                        if (!existingWithdrawalPartIds.has(part.partId)) {
                            stockToUpdate[part.partId] = (stockToUpdate[part.partId] || 0) + part.quantity;

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
                            const quantityChange = stockToUpdate[s.id];
                            const newQuantity = Number(s.quantity) - Number(quantityChange);
                            const newStatus = calculateStockStatus(newQuantity, s.minStock, s.maxStock);
                            return { ...s, quantity: newQuantity, status: newStatus };
                        }
                        return s;
                    }));
                    addToast(`หักสต็อก ${Object.keys(stockToUpdate).length} รายการ`, 'info');
                }
                if (transactionsToAdd.length > 0) {
                    setTransactions(prev => [...transactionsToAdd, ...prev]);
                    addToast(`สร้างประวัติการเบิกจ่ายใหม่ ${transactionsToAdd.length} รายการ`, 'info');
                }
            }

            onSave(finalFormData);
        } catch (error) {
            console.error(error);
            addToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const SectionHeader: React.FC<{ title: string; sectionId: keyof typeof openSections }> = ({ title, sectionId }) => (
        <button type="button" onClick={() => setOpenSections(p => ({ ...p, [sectionId]: !p[sectionId] }))} className="w-full flex justify-between items-center text-left bg-gray-100 p-4 rounded-t-lg border-b">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <span className={`transform transition-transform duration-200 ${openSections[sectionId] ? 'rotate-180' : ''}`}>▼</span>
        </button>
    );

    const { totalPartsCost, grandTotal } = useMemo(() => {
        const partsCost = (formData.parts || []).reduce((total, part) => {
            return total + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
        }, 0);
        const total = partsCost + (Number(formData.partsVat) || 0) + (Number(formData.repairCost) || 0) + (Number(formData.laborVat) || 0);
        return { totalPartsCost: partsCost, grandTotal: total };
    }, [formData.parts, formData.repairCost, formData.partsVat, formData.laborVat]);

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
                assignedTechnicianId: null,
                assistantTechnicianIds: [],
                dispatchType: 'ภายนอก'
            }));
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-0 sm:p-4">
                <div className="bg-white shadow-xl w-full max-w-full h-full sm:max-w-4xl sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="p-6 border-b flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">แก้ไขใบแจ้งซ่อม</h3>
                            <p className="text-base text-gray-500">{formData.repairOrderNo} - {formData.licensePlate}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full" title="ปิดหน้าต่าง">
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
                                        <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="สถานะการซ่อม">
                                            <option value="รอซ่อม">รอซ่อม</option>
                                            <option value="กำลังซ่อม" disabled={!isAssigned}>
                                                กำลังซ่อม {!isAssigned && '(ระบุช่างก่อน)'}
                                            </option>
                                            <option value="รออะไหล่" disabled={!hasStarted}>
                                                รออะไหล่ {!hasStarted && '(ต้องเริ่มซ่อมก่อน)'}
                                            </option>
                                            <option value="ซ่อมเสร็จ" disabled={!hasStarted}>
                                                ซ่อมเสร็จ {!hasStarted && '(ต้องเริ่มซ่อมก่อน)'}
                                            </option>
                                            <option value="ยกเลิก">ยกเลิก</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">วันที่อนุมัติ</label>
                                        <input type="datetime-local" value={toLocalISOString(formData.approvalDate)} onChange={(e) => handleDateChange('approvalDate', e.target.value)} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="วันที่อนุมัติ" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">วันที่เริ่มซ่อม</label>
                                        <input type="datetime-local" value={toLocalISOString(formData.repairStartDate)} onChange={(e) => handleDateChange('repairStartDate', e.target.value)} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="วันที่เริ่มซ่อม" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">วันที่ซ่อมเสร็จ</label>
                                        <input type="datetime-local" value={toLocalISOString(formData.repairEndDate)} onChange={(e) => handleDateChange('repairEndDate', e.target.value)} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="วันที่ซ่อมเสร็จ" />
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
                                                <input type="radio" name="estimationMode" value="duration" checked={estimationMode === 'duration'} onChange={() => setEstimationMode('duration')} className="mr-2 h-4 w-4" />
                                                <span className="font-semibold text-gray-700">ระบุระยะเวลา</span>
                                            </label>
                                            <label className="flex items-center cursor-pointer">
                                                <input type="radio" name="estimationMode" value="date" checked={estimationMode === 'date'} onChange={() => setEstimationMode('date')} className="mr-2 h-4 w-4" />
                                                <span className="font-semibold text-gray-700">กำหนดวันเสร็จ</span>
                                            </label>
                                        </div>
                                        {estimationMode === 'duration' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">ระยะเวลา</label>
                                                    <input type="number" value={durationValue} onChange={(e) => setDurationValue(Number(e.target.value) || 1)} min="1" className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ระยะเวลาประมาณการณ์" placeholder="ตัวเลข" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">หน่วย</label>
                                                    <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as 'hours' | 'days')} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="หน่วยเวลาประมาณการณ์">
                                                        <option value="hours">ชั่วโมง</option>
                                                        <option value="days">วัน</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะเริ่มซ่อม</label>
                                                <input type="datetime-local" value={toLocalISOString(activeEstimation.estimatedStartDate) || ''} onChange={(e) => handleEstimationChange('estimatedStartDate', e.target.value)} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="เวลาที่คาดว่าจะเริ่มซ่อม" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะซ่อมเสร็จ *</label>
                                                <input
                                                    type="datetime-local"
                                                    value={toLocalISOString(activeEstimation.estimatedEndDate) || ''}
                                                    onChange={(e) => handleEstimationChange('estimatedEndDate', e.target.value)}
                                                    className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
                                                    readOnly={estimationMode === 'duration'}
                                                    required
                                                    aria-label="เวลาที่คาดว่าจะซ่อมเสร็จ"
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
                                            <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" required aria-label="ทะเบียนรถ" placeholder="ทะเบียนรถ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                                            <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ยี่ห้อรถ" placeholder="ยี่ห้อรถ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                                            <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="รุ่นรถ" placeholder="รุ่นรถ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ประเภทรถ</label>
                                            <input type="text" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ประเภทรถ" placeholder="ประเภทรถ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ประเภทการซ่อม</label>
                                            <select name="repairCategory" value={formData.repairCategory} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ประเภทการซ่อม">
                                                <option>ซ่อมทั่วไป</option>
                                                <option>เปลี่ยนอะไหล่</option>
                                                <option>ตรวจเช็ก</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">เลขไมล์</label>
                                            <input type="number" name="currentMileage" value={formData.currentMileage} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="เลขไมล์" placeholder="เลขไมล์" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ความสำคัญ</label>
                                            <select name="priority" value={formData.priority} onChange={handleInputChange} className={`mt-1 w-full p-3 border rounded-lg transition-colors ${getPriorityClass(formData.priority)}`} aria-label="ความสำคัญ">
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
                                                className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
                                                aria-label="วันที่แจ้งซ่อม"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้งซ่อม</label>
                                            <input type="text" name="reportedBy" value={formData.reportedBy} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ชื่อผู้แจ้งซ่อม" placeholder="ชื่อผู้แจ้งซ่อม" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">อาการเสีย</label>
                                        <textarea name="problemDescription" value={formData.problemDescription} onChange={handleInputChange} rows={3} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" required aria-label="อาการเสีย" placeholder="ระบุอาการเสียที่ตรวจพบ"></textarea>
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
                                                <input type="radio" name="assignmentType" value="internal" checked={assignmentType === 'internal'} onChange={() => handleAssignmentTypeChange('internal')} className="mr-2 h-4 w-4" />
                                                <span className="font-semibold text-gray-700">ซ่อมภายใน</span>
                                            </label>
                                            <label className="flex items-center cursor-pointer">
                                                <input type="radio" name="assignmentType" value="external" checked={assignmentType === 'external'} onChange={() => handleAssignmentTypeChange('external')} className="mr-2 h-4 w-4" />
                                                <span className="font-semibold text-gray-700">ซ่อมภายนอก</span>
                                            </label>
                                        </div>
                                        {assignmentType === 'internal' ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">ช่างหลัก</label>
                                                    <select
                                                        name="assignedTechnicianId"
                                                        value={formData.assignedTechnicianId || ''}
                                                        onChange={handleInputChange}
                                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
                                                        aria-label="ระบุช่างหลัก"
                                                    >
                                                        <option value="">-- ไม่ระบุช่างหลัก --</option>
                                                        {mainTechnicians.map(tech => (
                                                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">ผู้ช่วยช่าง</label>
                                                    <TechnicianMultiSelect
                                                        allTechnicians={assistantTechnicians}
                                                        selectedTechnicianIds={formData.assistantTechnicianIds}
                                                        onChange={(ids) => setFormData(prev => ({ ...prev, assistantTechnicianIds: ids }))}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                name="externalTechnicianName"
                                                value={formData.externalTechnicianName || ''}
                                                onChange={handleInputChange}
                                                placeholder="กรอกชื่อช่าง หรือ อู่ภายนอก"
                                                className="w-full p-3 border border-gray-300 rounded-lg"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ค่าใช้จ่ายในการซ่อม (ค่าแรง)</label>
                                        <input type="number" name="repairCost" value={formData.repairCost} onChange={handleInputChange} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="ค่าใช้จ่ายค่าแรง" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">VAT ค่าแรง</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="isLaborVatEnabled-edit"
                                                name="isLaborVatEnabled"
                                                checked={!!formData.isLaborVatEnabled}
                                                onChange={e => setFormData(prev => ({ ...prev, isLaborVatEnabled: e.target.checked }))}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="isLaborVatEnabled-edit" className="text-sm font-medium text-gray-700">VAT</label>
                                            <input
                                                type="number"
                                                name="laborVatRate"
                                                value={formData.laborVatRate}
                                                onChange={handleInputChange}
                                                placeholder="7"
                                                disabled={!formData.isLaborVatEnabled}
                                                className="w-24 p-2 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                                                aria-label="อัตราภาษี VAT ค่าแรง"
                                            />
                                            <span className="text-sm font-medium text-gray-700">%</span>
                                        </div>
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
                                                    {formatCurrency(part.unitPrice)}
                                                </div>
                                                <div className="col-span-1 font-semibold text-right">
                                                    {formatCurrency(part.quantity * part.unitPrice)}
                                                </div>
                                                <div className="col-span-1 text-center">
                                                    <button type="button" onClick={() => removePart(part.partId)} className="text-red-500 hover:text-red-700 font-bold" title="ลบรายการอะไหล่">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {(formData.parts && formData.parts.length > 0) && (
                                        <div className="text-right space-y-2 border-t pt-3 mt-3">
                                            <div className="text-lg">
                                                <span>ราคารวมอะไหล่ (+VAT ร้านค้า): </span>
                                                <span className="font-semibold">{formatCurrency((totalPartsCost || 0) + (formData.partsVat || 0))} บาท</span>
                                            </div>
                                            <div className="text-lg">
                                                <span>ราคารวมค่าแรง {formData.isLaborVatEnabled ? `(+VAT ${formData.laborVatRate}%)` : ''}: </span>
                                                <span className="font-semibold">{formatCurrency((formData.repairCost || 0) + (formData.laborVat || 0))} บาท</span>
                                            </div>
                                            <div className="text-xl font-bold">
                                                <span>ยอดรวมสุทธิ: </span>
                                                <span className="text-blue-600">{formatCurrency(grandTotal)} บาท</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button type="button" onClick={() => setStockModalOpen(true)} className="w-full text-blue-600 font-semibold py-3 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2">
                                            📦 + เลือกจากสต็อกอู่
                                        </button>
                                        <button type="button" onClick={() => setExternalPartModalOpen(true)} className="w-full text-green-600 font-semibold py-3 px-4 rounded-lg border-2 border-dashed border-green-500 hover:bg-green-50 flex items-center justify-center gap-2">
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
                                    <textarea name="repairResult" value={formData.repairResult} onChange={handleInputChange} rows={4} className="mt-1 w-full p-3 border border-gray-300 rounded-lg" aria-label="บันทึกผลการซ่อม" placeholder="ระบุรายละเอียดหลังการซ่อมเสร็จสิ้น"></textarea>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">ยกเลิก</button>
                        <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[160px]">
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
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
