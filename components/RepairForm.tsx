import React, { useState, FormEvent, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Repair, Technician, StockItem, PartRequisitionItem, FileAttachment, Tab, Priority, EstimationAttempt, Vehicle, Supplier, RepairFormSeed } from '../types';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';
import { useToast } from '../context/ToastContext';
import TechnicianMultiSelect from './TechnicianMultiSelect';
import Stepper from './Stepper';
import { formatDateTime24h } from '../utils';

interface RepairFormProps {
    technicians: Technician[];
    stock: StockItem[];
    addRepair: (repair: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => void;
    repairs: Repair[];
    setActiveTab: (tab: Tab) => void;
    vehicles: Vehicle[];
    suppliers: Supplier[];
    initialData?: RepairFormSeed | null;
    clearInitialData: () => void;
}

interface EstimationResult {
    laborHours: number;
    reasoning: string;
}

const RepairForm: React.FC<RepairFormProps> = ({ technicians, stock, addRepair, repairs, setActiveTab, vehicles, suppliers, initialData, clearInitialData }) => {
    
    const getInitialState = () => ({
        repairOrderNo: 'จะถูกสร้างอัตโนมัติ',
        licensePlate: '',
        vehicleType: '',
        vehicleMake: '',
        vehicleModel: '',
        currentMileage: '',
        reportedBy: '',
        repairCategory: 'ซ่อมทั่วไป',
        priority: 'ปกติ' as const,
        problemDescription: '',
        assignedTechnicianId: null,
        assistantTechnicianIds: [] as string[],
        externalTechnicianName: '',
        notes: '',
        dispatchType: 'ภายใน' as 'ภายใน' | 'ภายนอก',
        repairLocation: '',
        coordinator: '',
        returnDate: '',
        repairResult: '',
        repairCost: 0,
        partsVat: 0,
        parts: [] as PartRequisitionItem[],
        attachments: [] as FileAttachment[],
        estimations: [{
            sequence: 1,
            createdAt: new Date().toISOString(),
            estimatedStartDate: new Date().toISOString(),
            estimatedEndDate: '',
            estimatedLaborHours: 0,
            status: 'Active' as const,
            failureReason: null,
            aiReasoning: null,
        }] as EstimationAttempt[],
        checklists: {
            preRepair: [],
            postRepair: [],
        }
    });

    const [formData, setFormData] = useState(getInitialState());
    const [otherVehicleType, setOtherVehicleType] = useState('');
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isExternalPartModalOpen, setExternalPartModalOpen] = useState(false);
    const [isEstimating, setIsEstimating] = useState(false);
    
    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['ข้อมูลรถและปัญหา', 'การประเมินและมอบหมาย', 'อะไหล่และค่าใช้จ่าย', 'สรุปและยืนยัน'];

    const [suggestions, setSuggestions] = useState<Vehicle[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    
    const [estimationMode, setEstimationMode] = useState<'duration' | 'date'>('duration');
    const [durationValue, setDurationValue] = useState<number>(8);
    const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
    
    const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>('internal');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isFormGloballyValid, setIsFormGloballyValid] = useState(false);


    const { addToast } = useToast();
    
    const { mainTechnicians, assistantTechnicians } = useMemo(() => {
        const safeTechnicians = Array.isArray(technicians) ? technicians : [];
        return {
            mainTechnicians: safeTechnicians.filter(t => t.role === 'ช่าง'),
            assistantTechnicians: safeTechnicians.filter(t => t.role === 'ผู้ช่วยช่าง'),
        };
    }, [technicians]);

    const uniqueVehicleTypes = useMemo(() => {
        const types = new Set(vehicles.map(v => v.vehicleType).filter(Boolean));
        const defaultTypes = ['รถกระบะ 4 ล้อ', 'รถ 6 ล้อ', 'รถ 10 ล้อ', 'รถหัวลาก', 'หางพ่วง'];
        defaultTypes.forEach(t => types.add(t));
        return Array.from(types).sort();
    }, [vehicles]);
    
    const activeEstimation = formData.estimations[formData.estimations.length - 1];

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                licensePlate: initialData.licensePlate,
                vehicleType: initialData.vehicleType,
                reportedBy: initialData.reportedBy,
                problemDescription: initialData.problemDescription,
            }));
            const vehicle = vehicles.find(v => v.licensePlate === initialData.licensePlate);
            if(vehicle) {
                 setFormData(prev => ({ ...prev, vehicleMake: vehicle.make, vehicleModel: vehicle.model }));
            }
            clearInitialData();
        }
    }, [initialData, clearInitialData, vehicles]);

    useEffect(() => {
        const validateAll = () => {
            // Step 0: Vehicle and Problem Info
            if (!formData.licensePlate.trim() || !formData.problemDescription.trim()) {
                return false;
            }
            if (formData.vehicleType === 'อื่นๆ' && !otherVehicleType.trim()) {
                return false;
            }

            // Step 1: Estimation and Assignment
            const isInternalAssigned = assignmentType === 'internal' && formData.assignedTechnicianId;
            const isExternalAssigned = assignmentType === 'external' && !!formData.externalTechnicianName?.trim();
            if (!isInternalAssigned && !isExternalAssigned) {
                return false;
            }
            
            const activeEst = formData.estimations[formData.estimations.length - 1];
            if (!activeEst || !activeEst.estimatedEndDate) {
                return false;
            }
            
            return true;
        };
        
        setIsFormGloballyValid(validateAll());
    }, [formData, otherVehicleType, assignmentType]);
    
    useEffect(() => {
        if (estimationMode === 'duration' && activeEstimation) {
            const startDate = new Date(activeEstimation.estimatedStartDate || Date.now());
            if (isNaN(startDate.getTime())) return;

            const multiplier = durationUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            const endDate = new Date(startDate.getTime() + (durationValue * multiplier));
            
            const newEstimations = formData.estimations.map(e => 
                e.sequence === activeEstimation.sequence ? { ...e, estimatedEndDate: endDate.toISOString() } : e
            );
            
            setFormData(prev => ({ ...prev, estimations: newEstimations }));
        }
    }, [estimationMode, durationValue, durationUnit, activeEstimation?.estimatedStartDate, activeEstimation?.sequence]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setIsSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const getPriorityClass = (priority: Priority) => {
        switch (priority) {
            case 'ด่วน': return 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold';
            case 'ด่วนที่สุด': return 'bg-red-50 border-red-400 text-red-800 font-semibold';
            default: return 'bg-white border-gray-300';
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const finalValue = (name === 'repairCost' || name === 'partsVat')
            ? parseFloat(value) || 0
            : value;
    
        setFormData(prev => ({ ...prev, [name]: finalValue }));

        if (name === 'licensePlate') {
            if (value) {
                const filteredSuggestions = vehicles.filter(v =>
                    v.licensePlate.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(filteredSuggestions);
                setIsSuggestionsOpen(true);
            } else {
                setSuggestions([]);
                setIsSuggestionsOpen(false);
            }
        }
    };
    
    const handleDateChange = (field: keyof EstimationAttempt, value: string) => {
        const newEstimations = formData.estimations.map(e => 
            e.sequence === activeEstimation.sequence 
                ? { ...e, [field]: value ? new Date(value).toISOString() : null }
                : e
        );
        setFormData(prev => ({ ...prev, estimations: newEstimations }));
        
        if (field === 'estimatedEndDate') {
            setEstimationMode('date');
        }
    };

    const handleSuggestionClick = (vehicle: Vehicle) => {
        const selectedType = vehicle.vehicleType || '';
        let newVehicleTypeState = '';
        let newOtherVehicleTypeState = '';
    
        if (uniqueVehicleTypes.includes(selectedType)) {
            newVehicleTypeState = selectedType;
        } else if (selectedType) {
            newVehicleTypeState = 'อื่นๆ';
            newOtherVehicleTypeState = selectedType;
        } else {
            newVehicleTypeState = '';
        }
    
        setFormData(prev => ({
            ...prev,
            licensePlate: vehicle.licensePlate,
            vehicleMake: vehicle.make || '',
            vehicleModel: vehicle.model || '',
            vehicleType: newVehicleTypeState,
        }));
    
        setOtherVehicleType(newOtherVehicleTypeState);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
    };
    
    const resetForm = () => {
        setFormData(getInitialState());
        setOtherVehicleType('');
        setCurrentStep(0);
        setAssignmentType('internal');
        setIsConfirmed(false);
    };

    const handleEstimate = async () => {
        setIsEstimating(true);
        
        const newEstimations = [...formData.estimations];
        newEstimations[newEstimations.length - 1].aiReasoning = null;
        setFormData(prev => ({ ...prev, estimations: newEstimations}));

        const prompt = `
            Vehicle Type: ${formData.vehicleType === 'อื่นๆ' ? otherVehicleType : formData.vehicleType}
            Make: ${formData.vehicleMake}
            Model: ${formData.vehicleModel}
            Repair Category: ${formData.repairCategory}
            Problem Description: ${formData.problemDescription}
            Based on the information above, estimate the labor hours required for the repair.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            laborHours: { type: Type.NUMBER, description: "Estimated labor hours" },
                            reasoning: { type: Type.STRING, description: "Brief reason for the estimation" }
                        },
                        required: ["laborHours", "reasoning"]
                    }
                }
            });
            const result: EstimationResult = JSON.parse(response.text);
            
            const laborHours = Math.round(result.laborHours) || 1;
            
            setEstimationMode('duration');
            setDurationUnit('hours');
            setDurationValue(laborHours);
            
            const updatedEstimations = formData.estimations.map(e => 
                e.sequence === activeEstimation.sequence 
                    ? { ...e, estimatedLaborHours: laborHours, aiReasoning: result.reasoning }
                    : e
            );
            setFormData(prev => ({...prev, estimations: updatedEstimations}));
            addToast('AI ประมาณการณ์สำเร็จ', 'success');

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            addToast("ไม่สามารถประมาณการณ์ได้", "error");
        } finally {
            setIsEstimating(false);
        }
    };
    
    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        setFormData(prev => ({ ...prev, parts: [...prev.parts, ...newParts] }));
        setStockModalOpen(false);
    };

    const handleAddExternalParts = (data: { parts: PartRequisitionItem[], vat: number }) => {
        const existingPartNames = new Set(formData.parts.map(p => p.name.trim().toLowerCase()));
        const newParts = data.parts.filter(p => !existingPartNames.has(p.name.trim().toLowerCase()));
        
        if (newParts.length < data.parts.length) {
            addToast('มีบางรายการซ้ำซ้อนและถูกข้ามไป', 'info');
        }

        setFormData(prev => ({ ...prev, parts: [...prev.parts, ...newParts], partsVat: (prev.partsVat || 0) + data.vat }));
        setExternalPartModalOpen(false);
    };

    const updatePart = (partId: string, field: keyof PartRequisitionItem, value: any) => {
        setFormData(prev => ({ ...prev, parts: prev.parts.map(p => p.partId === partId ? { ...p, [field]: value } : p)}));
    };
    
    const removePart = (partId: string) => {
        setFormData(prev => ({ ...prev, parts: prev.parts.filter(p => p.partId !== partId) }));
    };

    const { totalPartsCost, grandTotal } = useMemo(() => {
        const safeParts = Array.isArray(formData.parts) ? formData.parts : [];
        const partsCost = safeParts.reduce((total, part) => {
            return total + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
        }, 0);
        const total = partsCost + (Number(formData.partsVat) || 0) + (Number(formData.repairCost) || 0);
        return { totalPartsCost: partsCost, grandTotal: total };
    }, [formData.parts, formData.repairCost, formData.partsVat]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const normalizedProblem = formData.problemDescription.trim().toLowerCase();
        const potentialDuplicate = (Array.isArray(repairs) ? repairs : []).find(r => 
            new Date(r.createdAt) > twentyFourHoursAgo &&
            r.licensePlate.trim().toLowerCase() === formData.licensePlate.trim().toLowerCase() &&
            r.problemDescription.trim().toLowerCase() === normalizedProblem
        );

        if (potentialDuplicate) {
            const proceed = window.confirm(
`ตรวจพบใบแจ้งซ่อมที่คล้ายกันสำหรับรถคันนี้ (${potentialDuplicate.repairOrderNo}) ที่สร้างขึ้นเมื่อไม่นานมานี้ 
คุณแน่ใจหรือไม่ว่าต้องการสร้างใบแจ้งซ่อมใบใหม่?`
            );
            if (!proceed) return;
        }

        const { repairOrderNo, ...repairData } = formData;
        
        if (repairData.vehicleType === 'อื่นๆ') {
             if (!otherVehicleType.trim()) {
                addToast('กรุณาระบุประเภทรถ', 'warning');
                return;
            }
            repairData.vehicleType = otherVehicleType.trim();
        }

        addRepair(repairData as Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>);
        addToast('สร้างใบแจ้งซ่อมสำเร็จ', 'success');
        resetForm();
    };
    
    const validateStep = (step: number) => {
        switch (step) {
            case 0:
                if (!formData.licensePlate.trim() || !formData.problemDescription.trim()) {
                    addToast('กรุณากรอกทะเบียนรถและอาการเสีย', 'warning');
                    return false;
                }
                if (formData.vehicleType === 'อื่นๆ' && !otherVehicleType.trim()) {
                    addToast('กรุณาระบุประเภทรถ', 'warning');
                    return false;
                }
                break;
            case 1:
                const isInternalAssigned = assignmentType === 'internal' && formData.assignedTechnicianId;
                const isExternalAssigned = assignmentType === 'external' && !!formData.externalTechnicianName?.trim();
                if (!isInternalAssigned && !isExternalAssigned) {
                    addToast('กรุณามอบหมายช่างหลัก หรือระบุชื่อช่างภายนอก', 'warning');
                    return false;
                }
                 if (!activeEstimation.estimatedEndDate) {
                    addToast('กรุณาระบุเวลาที่คาดว่าจะซ่อมเสร็จ', 'warning');
                    return false;
                }
                break;
            case 2:
                // No strict validation for parts, can be empty
                break;
            default:
                break;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const handleBack = () => {
        setIsConfirmed(false);
        setCurrentStep(prev => Math.max(prev - 1, 0));
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

    const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIsConfirmed(isChecked);

        if (isChecked && !isFormGloballyValid) {
            if (!formData.licensePlate.trim() || !formData.problemDescription.trim() || (formData.vehicleType === 'อื่นๆ' && !otherVehicleType.trim())) {
                addToast('กรุณากรอกข้อมูลในขั้นตอน "ข้อมูลรถและปัญหา" ให้ครบถ้วน', 'warning');
                setCurrentStep(0);
                return;
            }

            const isInternalAssigned = assignmentType === 'internal' && formData.assignedTechnicianId;
            const isExternalAssigned = assignmentType === 'external' && !!formData.externalTechnicianName?.trim();
            const activeEst = formData.estimations[formData.estimations.length - 1];
            if (!isInternalAssigned && !isExternalAssigned || !activeEst || !activeEst.estimatedEndDate) {
                addToast('กรุณากรอกข้อมูลในขั้นตอน "การประเมินและมอบหมาย" ให้ครบถ้วน', 'warning');
                setCurrentStep(1);
                return;
            }
        }
    };
    
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // ข้อมูลรถและปัญหา
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div ref={suggestionsRef} className="relative">
                                <label className="block text-sm font-medium text-gray-700">ทะเบียนรถ *</label>
                                <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required autoComplete="off" />
                                {isSuggestionsOpen && suggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        {suggestions.map(vehicle => (
                                            <li key={vehicle.id} onClick={() => handleSuggestionClick(vehicle)} className="p-2 hover:bg-gray-100 cursor-pointer">{vehicle.licensePlate}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้งซ่อม</label>
                                <input type="text" name="reportedBy" value={formData.reportedBy} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">ประเภทรถ</label>
                                <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="" disabled>-- เลือกประเภท --</option>
                                    {uniqueVehicleTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                                    <option value="อื่นๆ">อื่นๆ...</option>
                                </select>
                                {formData.vehicleType === 'อื่นๆ' && (
                                    <input type="text" name="otherVehicleType" value={otherVehicleType} onChange={(e) => setOtherVehicleType(e.target.value)} placeholder="ระบุประเภท" className="mt-2 w-full p-2 border border-gray-300 rounded-lg" required />
                                )}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                                <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                                <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">อาการเสีย *</label>
                            <textarea name="problemDescription" value={formData.problemDescription} onChange={handleInputChange} rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required></textarea>
                        </div>
                    </div>
                );
            case 1: // การประเมินและมอบหมาย
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ความสำคัญ</label>
                                <select name="priority" value={formData.priority} onChange={handleInputChange} className={`mt-1 w-full p-2 border rounded-lg transition-colors ${getPriorityClass(formData.priority)}`}>
                                    <option value="ปกติ">ปกติ</option>
                                    <option value="ด่วน">ด่วน</option>
                                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ประเภทการซ่อม</label>
                                <select name="repairCategory" value={formData.repairCategory} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                    <option>ซ่อมทั่วไป</option>
                                    <option>เปลี่ยนอะไหล่</option>
                                    <option>ตรวจเช็ก</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">การประมาณการณ์เวลาซ่อม *</label>
                            <div className="p-4 border rounded-lg bg-gray-50 mt-1 space-y-4">
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="estimationMode" value="duration" checked={estimationMode === 'duration'} onChange={() => setEstimationMode('duration')} className="mr-2 h-4 w-4"/>
                                        <span className="font-semibold text-gray-700">ระบุระยะเวลา</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="estimationMode" value="date" checked={estimationMode === 'date'} onChange={() => setEstimationMode('date')} className="mr-2 h-4 w-4"/>
                                        <span className="font-semibold text-gray-700">กำหนดวันเสร็จ</span>
                                    </label>
                                    <div className="flex-1 flex justify-end">
                                        <button type="button" onClick={handleEstimate} disabled={isEstimating} className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50">
                                            {isEstimating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "🤖"}
                                            <span>AI ช่วยประมาณการณ์</span>
                                        </button>
                                    </div>
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
                                        <input type="datetime-local" value={toLocalISOString(activeEstimation.estimatedStartDate) || ''} onChange={(e) => handleDateChange('estimatedStartDate', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะซ่อมเสร็จ</label>
                                        <input 
                                            type="datetime-local" 
                                            value={toLocalISOString(activeEstimation.estimatedEndDate) || ''} 
                                            onChange={(e) => handleDateChange('estimatedEndDate', e.target.value)} 
                                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                            readOnly={estimationMode === 'duration'}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {activeEstimation.aiReasoning && <p className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 italic">"{activeEstimation.aiReasoning}"</p>}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการส่งซ่อม *</label>
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
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ช่างหลัก (เลือก 1 คน) *</label>
                                        <select
                                            name="assignedTechnicianId"
                                            value={formData.assignedTechnicianId || ''}
                                            onChange={handleInputChange}
                                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                            required
                                        >
                                            <option value="" disabled>-- เลือกช่างหลัก --</option>
                                            {mainTechnicians.map(tech => (
                                                <option key={tech.id} value={tech.id}>{tech.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ผู้ช่วยช่าง (เลือกได้หลายคน)</label>
                                        <TechnicianMultiSelect
                                            allTechnicians={assistantTechnicians}
                                            selectedTechnicianIds={formData.assistantTechnicianIds}
                                            onChange={(ids) => setFormData(prev => ({...prev, assistantTechnicianIds: ids}))}
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
                                    className="w-full p-2 border border-gray-300 rounded-lg" 
                                />
                            )}
                        </div>
                    </div>
                );
            case 2: // อะไหล่และค่าใช้จ่าย
                return (
                     <div className="space-y-4">
                        <div className="space-y-3">
                            {(formData.parts.length > 0) && (
                                <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b font-medium text-sm text-gray-600">
                                    <div className="col-span-1">ที่มา</div>
                                    <div className="col-span-4">ชื่ออะไหล่</div>
                                    <div className="col-span-2 text-right">จำนวน</div>
                                    <div className="col-span-2 text-right">ราคา/หน่วย</div>
                                    <div className="col-span-2 text-right">ราคารวม</div>
                                </div>
                            )}
                            {formData.parts.map((part) => (
                                <div key={part.partId} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50">
                                    <div className="col-span-1 text-xl">{part.source === 'สต็อกอู่' ? '📦' : '🏪'}</div>
                                    <div className="col-span-4"><p className="font-medium">{part.name}</p></div>
                                    <div className="col-span-2"><input type="number" value={part.quantity} min="1" onChange={(e) => updatePart(part.partId, 'quantity', parseInt(e.target.value))} className="w-full p-1 border rounded text-right" /></div>
                                    <div className="col-span-2"><input type="number" value={part.unitPrice} onChange={(e) => updatePart(part.partId, 'unitPrice', parseFloat(e.target.value))} disabled={part.source === 'สต็อกอู่'} className={`w-full p-1 border rounded text-right ${part.source === 'สต็อกอู่' ? 'bg-gray-100' : ''}`} /></div>
                                    <div className="col-span-2 font-semibold text-right">{(part.quantity * part.unitPrice).toLocaleString()}</div>
                                    <div className="col-span-1 text-center"><button type="button" onClick={() => removePart(part.partId)} className="text-red-500 hover:text-red-700 font-bold">×</button></div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button type="button" onClick={() => setStockModalOpen(true)} className="w-full text-blue-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2">📦 + เลือกจากสต็อกอู่</button>
                            <button type="button" onClick={() => setExternalPartModalOpen(true)} className="w-full text-green-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-green-500 hover:bg-green-50 flex items-center justify-center gap-2">🏪 + เพิ่มรายการจากร้านค้า</button>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">ค่าใช้จ่ายในการซ่อม (ไม่รวมอะไหล่)</label>
                                <input type="number" name="repairCost" value={formData.repairCost} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div className="text-right space-y-2 pt-4">
                                <div className="text-xl font-bold">
                                    <span>ค่าใช้จ่ายรวม: </span>
                                    <span className="text-blue-600">{grandTotal.toLocaleString()} บาท</span>
                                </div>
                            </div>
                         </div>
                    </div>
                );
            case 3: // สรุปและยืนยัน
                 const handleEditClick = (step: number) => {
                     setIsConfirmed(false); // Reset confirmation when going back to edit
                     setCurrentStep(step);
                 };
                 const mainTechName = technicians.find(t => t.id === formData.assignedTechnicianId)?.name || 'N/A';
                 const assistantTechNames = technicians.filter(t => formData.assistantTechnicianIds.includes(t.id)).map(t => t.name).join(', ');

                 return (
                     <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-gray-700">✅ 1. ข้อมูลรถและปัญหา</h3>
                                <button onClick={() => handleEditClick(0)} type="button" className="text-sm text-blue-600 hover:underline">แก้ไข</button>
                            </div>
                            <p><strong>ทะเบียนรถ:</strong> {formData.licensePlate}</p>
                            <p><strong>ประเภทรถ:</strong> {formData.vehicleType === 'อื่นๆ' ? otherVehicleType : formData.vehicleType}</p>
                            <p><strong>อาการเสีย:</strong> {formData.problemDescription}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-gray-50">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-gray-700">✅ 2. การประเมินและมอบหมาย</h3>
                                <button onClick={() => handleEditClick(1)} type="button" className="text-sm text-blue-600 hover:underline">แก้ไข</button>
                            </div>
                            <p><strong>ความสำคัญ:</strong> {formData.priority}</p>
                            <p><strong>คาดว่าจะเสร็จ:</strong> {formatDateTime24h(activeEstimation.estimatedEndDate)}</p>
                            <p><strong>ช่าง:</strong> {formData.dispatchType === 'ภายนอก' ? `ซ่อมภายนอก: ${formData.externalTechnicianName}` : `ช่างหลัก: ${mainTechName}`}</p>
                            {assignmentType === 'internal' && assistantTechNames && <p><strong>ผู้ช่วยช่าง:</strong> {assistantTechNames}</p>}
                        </div>
                         <div className="p-4 border rounded-lg bg-gray-50">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-gray-700">✅ 3. อะไหล่และค่าใช้จ่าย</h3>
                                <button onClick={() => handleEditClick(2)} type="button" className="text-sm text-blue-600 hover:underline">แก้ไข</button>
                            </div>
                            <p><strong>จำนวนรายการอะไหล่:</strong> {formData.parts.length} รายการ</p>
                            <p className="mt-2 font-bold text-xl text-right">ยอดรวมค่าใช้จ่ายทั้งหมด: {grandTotal.toLocaleString()} บาท</p>
                        </div>
                        <div className="mt-6 p-4 border-t border-dashed">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={isConfirmed}
                                    onChange={handleConfirmationChange}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-base font-medium text-gray-800">ข้าพเจ้าได้ตรวจสอบข้อมูลทั้งหมดแล้ว และยืนยันความถูกต้อง</span>
                            </label>
                        </div>
                     </div>
                );
            default:
                return null;
        }
    }

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                {renderStepContent()}
            </div>
            
            <div className="flex justify-between items-center pt-4">
                 <div>
                     {currentStep > 0 && (
                        <button type="button" onClick={handleBack} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ย้อนกลับ</button>
                    )}
                </div>
                <div>
                    {currentStep < steps.length - 1 ? (
                        <button type="button" onClick={handleNext} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">ถัดไป</button>
                    ) : (
                        <button 
                            type="submit" 
                            disabled={!isConfirmed || !isFormGloballyValid}
                            className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            ยืนยันสร้างใบแจ้งซ่อม
                        </button>
                    )}
                </div>
            </div>
        </form>

        {isStockModalOpen && <StockSelectionModal stock={stock} onClose={() => setStockModalOpen(false)} onAddParts={handleAddPartsFromStock} existingParts={formData.parts} />}
        {isExternalPartModalOpen && <ExternalPartModal onClose={() => setExternalPartModalOpen(false)} onAddExternalParts={handleAddExternalParts} suppliers={suppliers} />}
        </>
    );
};

export default RepairForm;