import React, { useState, FormEvent, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Repair, Technician, StockItem, PartRequisitionItem, FileAttachment, Tab, Priority, EstimationAttempt, Vehicle, Supplier, RepairFormSeed, RepairKPI, Holiday, Driver } from '../types';
import { MousePointer2, Settings, Truck, Package, Disc, Shield, Maximize2, AlertCircle, Clock, CheckCircle2, User, Wrench, CreditCard, ChevronRight, Edit3 } from 'lucide-react';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';
import { useToast } from '../context/ToastContext';
import TechnicianMultiSelect from './TechnicianMultiSelect';
import { formatDateTime24h, formatHoursDescriptive, calculateFinishTime, formatCurrency, confirmAction } from '../utils';
import KPIPickerModal from './KPIPickerModal';
import TruckModel3D from './TruckModel3D';

interface StepperProps {
    steps: string[];
    currentStep: number;
    onStepClick: (stepIndex: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
    return (
        <div className="flex items-center justify-between w-full mb-16 px-2">
            {steps.map((step, index) => {
                const isCompleted = currentStep > index;
                const isCurrent = currentStep === index;

                return (
                    <React.Fragment key={index}>
                        <div
                            className="flex items-center flex-col cursor-pointer group relative"
                            onClick={() => onStepClick(index)}
                        >
                            {/* Step Circle */}
                            <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-500 transform
                                    ${isCompleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-100' : ''}
                                    ${isCurrent ? 'bg-white text-blue-600 shadow-2xl shadow-blue-500/20 scale-110 border-2 border-blue-500' : ''}
                                    ${!isCompleted && !isCurrent ? 'bg-slate-100 text-slate-400 scale-95 opacity-60' : ''}
                                    group-hover:scale-110 group-active:scale-95
                                `}
                            >
                                {isCompleted ? (
                                    <span className="animate-scale-in">✓</span>
                                ) : (
                                    <span className={isCurrent ? 'animate-pulse' : ''}>{index + 1}</span>
                                )}
                            </div>

                            {/* Label */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isCurrent ? 'text-blue-600 translate-y-0 opacity-100' :
                                    isCompleted ? 'text-slate-500 translate-y-0 opacity-80' :
                                        'text-slate-400 translate-y-1 opacity-40'
                                    }`}>
                                    {step}
                                </p>
                            </div>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div className="flex-1 px-4 relative">
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-blue-600 transition-all duration-700 ease-out ${isCompleted ? 'w-full' : 'w-0'}`}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

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
    kpiData: RepairKPI[];
    holidays: Holiday[];
    drivers: Driver[];
}

const RepairForm: React.FC<RepairFormProps> = ({ technicians, stock, addRepair, repairs, setActiveTab, vehicles, suppliers, initialData, clearInitialData, kpiData, holidays, drivers }) => {

    const getInitialState = () => {
        const getRoundedStartDate = () => {
            const now = new Date();
            // If we are not exactly at the top of an hour, round up.
            if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
                now.setHours(now.getHours() + 1);
            }
            now.setMinutes(0, 0, 0); // Set minutes and seconds to zero.
            return now.toISOString();
        };

        return {
            repairOrderNo: 'จะถูกสร้างอัตโนมัติ',
            vehicleId: '',
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
            isLaborVatEnabled: false,
            laborVatRate: 7,
            laborVat: 0,
            parts: [] as PartRequisitionItem[],
            attachments: [] as FileAttachment[],
            estimations: [{
                sequence: 1,
                createdAt: new Date().toISOString(),
                estimatedStartDate: getRoundedStartDate(),
                estimatedEndDate: '',
                estimatedLaborHours: 0,
                status: 'Active' as const,
                failureReason: null,
                aiReasoning: null,
            }] as EstimationAttempt[],
            checklists: {
                preRepair: [],
                postRepair: [],
            },
            kpiTaskIds: [],
            driverId: '',
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [otherVehicleType, setOtherVehicleType] = useState('');
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isRevolvingStockModalOpen, setRevolvingStockModalOpen] = useState(false);
    const [isExternalPartModalOpen, setExternalPartModalOpen] = useState(false);
    const [isKPIModalOpen, setKPIModalOpen] = useState(false);


    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['ข้อมูลรถและปัญหา', 'การประเมินและมอบหมาย', 'อะไหล่และค่าใช้จ่าย', 'สรุปและยืนยัน'];

    const [suggestions, setSuggestions] = useState<Vehicle[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);

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

    const mainStock = useMemo(() => stock.filter(s => !s.isRevolvingPart && !s.isFungibleUsedItem && s.quantity > 0), [stock]);
    const revolvingStock = useMemo(() => stock.filter(s => s.isRevolvingPart && s.quantity > 0), [stock]);

    const uniqueVehicleTypes = useMemo(() => {
        const types = new Set(vehicles.map(v => v.vehicleType).filter(Boolean));
        const defaultTypes = ['รถกระบะ 4 ล้อ', 'รถ 6 ล้อ', 'รถ 10 ล้อ', 'รถหัวลาก', 'หางพ่วง'];
        defaultTypes.forEach(t => types.add(t));
        return Array.from(types).sort();
    }, [vehicles]);

    const activeEstimation = formData.estimations[formData.estimations.length - 1];

    const kpiMap = useMemo(() => new Map(kpiData.map(k => [k.id, k])), [kpiData]);

    const holidayDates = useMemo(() => (Array.isArray(holidays) ? holidays : []).map(h => h.date), [holidays]);

    const selectedKpis = useMemo(() => {
        return (formData.kpiTaskIds || []).map(id => kpiMap.get(id)).filter((k): k is RepairKPI => k !== undefined);
    }, [formData.kpiTaskIds, kpiMap]);

    const totalKpiHours = useMemo(() => {
        return selectedKpis.reduce((sum, kpi) => sum + kpi.standardHours, 0);
    }, [selectedKpis]);

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
            if (vehicle) {
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

    // Auto-calculate finish time
    useEffect(() => {
        if (totalKpiHours > 0 && activeEstimation?.estimatedStartDate) {
            try {
                const startDate = new Date(activeEstimation.estimatedStartDate);
                if (!isNaN(startDate.getTime())) {
                    const finishDate = calculateFinishTime(startDate, totalKpiHours, holidayDates);
                    const newEstimations = formData.estimations.map(e =>
                        e.sequence === activeEstimation.sequence
                            ? { ...e, estimatedEndDate: finishDate.toISOString() }
                            : e
                    );
                    setFormData(prev => ({ ...prev, estimations: newEstimations }));
                }
            } catch (e) {
                console.error("Error calculating finish time:", e);
            }
        }
    }, [totalKpiHours, activeEstimation?.estimatedStartDate, activeEstimation?.sequence, holidayDates]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setIsSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const getPriorityClass = (priority: Priority) => {
        switch (priority) {
            case 'ด่วน': return 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold';
            case 'ด่วนที่สุด': return 'bg-red-50 border-red-400 text-red-800 font-semibold';
            default: return 'bg-white border-gray-300';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const finalValue = (['repairCost', 'partsVat', 'laborVat', 'laborVatRate', 'currentMileage'].includes(name))
            ? parseFloat(value) || 0
            : value;

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        if (name === 'licensePlate') {
            // Reset vehicleId when manually typing to ensure validity required picking from suggestion or saving as new unbound text
            setFormData(prev => ({ ...prev, vehicleId: '' }));

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
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            vehicleMake: vehicle.make || '',
            vehicleModel: vehicle.model || '',
            vehicleType: newVehicleTypeState,
        }));

        setOtherVehicleType(newOtherVehicleTypeState);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
    };

    const handlePartSelect = (part: string) => {
        setFormData(prev => ({
            ...prev,
            problemDescription: prev.problemDescription
                ? `${prev.problemDescription}\n- ตรวจเช็ค: ${part}`
                : `- ตรวจเช็ค: ${part}`
        }));
        addToast(`เลือกส่วน "${part}" เรียบร้อย`, 'info');
    };

    const resetForm = () => {
        setFormData(getInitialState());
        setOtherVehicleType('');
        setCurrentStep(0);
        setAssignmentType('internal');
        setIsConfirmed(false);
    };

    const updateEstimationFromKPIs = useCallback((kpiIds: string[]) => {
        const kpis = kpiIds.map(id => kpiMap.get(id)).filter(Boolean) as RepairKPI[];
        const totalHours = kpis.reduce((sum, kpi) => sum + kpi.standardHours, 0);

        const newDescription = kpis.map(k => `- ${k.item}`).join('\n');
        const newCategory = kpis.length > 0 ? kpis[0].category : 'ซ่อมทั่วไป';

        setFormData(prev => {
            const activeEst = prev.estimations[prev.estimations.length - 1];
            const startDate = new Date(activeEst.estimatedStartDate || Date.now());
            const endDate = calculateFinishTime(startDate, totalHours, holidayDates);

            const updatedEstimations = prev.estimations.map(e =>
                e.sequence === activeEst.sequence
                    ? { ...e, estimatedLaborHours: totalHours, estimatedEndDate: endDate.toISOString(), aiReasoning: 'คำนวณจาก KPI มาตรฐานและเวลาทำงาน' }
                    : e
            );

            return {
                ...prev,
                kpiTaskIds: kpiIds,
                problemDescription: newDescription,
                repairCategory: newCategory,
                estimations: updatedEstimations
            };
        });
    }, [kpiMap, holidayDates]);

    const handleAddKPIs = (newKpis: RepairKPI[]) => {
        const newIds = newKpis.map(k => k.id);
        const currentIds = new Set(formData.kpiTaskIds || []);
        newIds.forEach(id => currentIds.add(id));

        updateEstimationFromKPIs(Array.from(currentIds));

        addToast(`เพิ่ม ${newKpis.length} รายการ KPI สำเร็จ`, 'success');
        setKPIModalOpen(false);
    };

    const handleRemoveKpi = (kpiId: string) => {
        const newIds = (formData.kpiTaskIds || []).filter(id => id !== kpiId);
        updateEstimationFromKPIs(newIds);
    };

    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        setFormData(prev => ({ ...prev, parts: [...prev.parts, ...newParts] }));
        setStockModalOpen(false);
        setRevolvingStockModalOpen(false);
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
        setFormData(prev => ({ ...prev, parts: prev.parts.map(p => p.partId === partId ? { ...p, [field]: value } : p) }));
    };

    const removePart = (partId: string) => {
        setFormData(prev => ({ ...prev, parts: prev.parts.filter(p => p.partId !== partId) }));
    };

    const { totalPartsCost, grandTotal } = useMemo(() => {
        const safeParts = Array.isArray(formData.parts) ? formData.parts : [];
        const partsCost = safeParts.reduce((total, part) => {
            return total + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
        }, 0);
        const total = partsCost + (Number(formData.partsVat) || 0) + (Number(formData.repairCost) || 0) + (Number(formData.laborVat) || 0);
        return { totalPartsCost: partsCost, grandTotal: total };
    }, [formData.parts, formData.repairCost, formData.partsVat, formData.laborVat]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true); // Set submitting early to prevent double clicks

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const normalizedProblem = formData.problemDescription.trim().toLowerCase();
        const potentialDuplicate = (Array.isArray(repairs) ? repairs : []).find(r =>
            new Date(r.createdAt) > twentyFourHoursAgo &&
            r.licensePlate.trim().toLowerCase() === formData.licensePlate.trim().toLowerCase() &&
            r.problemDescription.trim().toLowerCase() === normalizedProblem
        );

        if (potentialDuplicate) {
            const confirmed = await confirmAction(
                'ยืนยันใบแจ้งซ่อมซ้ำ',
                `มีความเป็นไปได้ว่ารถทะเบียน ${formData.licensePlate} มีใบซ่อมที่กำลังดำเนินการอยู่แล้ว คุณต้องการสร้างใบแจ้งซ่อมใหม่หรือไม่?`,
                'ยืนยันสร้างใหม่'
            );

            if (!confirmed) {
                setIsSubmitting(false);
                return;
            }
        }

        const { repairOrderNo, ...repairData } = formData;

        if (repairData.vehicleType === 'อื่นๆ') {
            if (!otherVehicleType.trim()) {
                addToast('กรุณาระบุประเภทรถ', 'warning');
                setIsSubmitting(false); // Reset submitting state if validation fails
                return;
            }
            repairData.vehicleType = otherVehicleType.trim();
        }

        try {
            await addRepair(repairData as Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>);
            addToast('สร้างใบแจ้งซ่อมสำเร็จ', 'success');
            resetForm();
        } catch (error) {
            console.error(error);
            addToast('เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม', 'error');
        } finally {
            setIsSubmitting(false); // Always reset submitting state
        }
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
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div ref={suggestionsRef} className="relative group animate-fade-in-up delay-100">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ทะเบียนรถ (License Plate) *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="licensePlate"
                                        value={formData.licensePlate}
                                        onChange={handleInputChange}
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold placeholder:text-slate-300 shadow-sm"
                                        required
                                        autoComplete="off"
                                        placeholder="ป้อนเลขทะเบียนรถ..."
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                        <Truck size={20} />
                                    </div>
                                </div>
                                {isSuggestionsOpen && suggestions.length > 0 && (
                                    <ul className="absolute z-30 w-full glass-light border border-white/60 rounded-3xl mt-2 max-h-64 overflow-y-auto shadow-2xl backdrop-blur-3xl animate-scale-in">
                                        {suggestions.map(vehicle => (
                                            <li key={vehicle.id} onClick={() => handleSuggestionClick(vehicle)} className="p-4 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b last:border-0 border-slate-100 transition-colors">
                                                <span className="font-black text-slate-800">{vehicle.licensePlate}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 py-1 bg-white border rounded-full">{vehicle.vehicleType}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="animate-fade-in-up delay-200">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ชื่อผู้แจ้งซ่อม (Reported By)</label>
                                <input type="text" name="reportedBy" value={formData.reportedBy} onChange={handleInputChange} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold placeholder:text-slate-300 shadow-sm" placeholder="ชื่อผู้แจ้งอาการเสีย" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="animate-fade-in-up delay-300">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">พนักงานขับรถ (Driver)</label>
                                <select
                                    name="driverId"
                                    value={formData.driverId || ''}
                                    onChange={(e) => {
                                        const selectedDriver = drivers.find(d => d.id === e.target.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            driverId: e.target.value,
                                            reportedBy: selectedDriver ? selectedDriver.name : prev.reportedBy
                                        }));
                                    }}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold appearance-none shadow-sm cursor-pointer"
                                    aria-label="Select Driver"
                                >
                                    <option value="">-- เลือกพนักงานขับรถ --</option>
                                    {drivers && drivers.map(driver => (
                                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="animate-fade-in-up delay-400">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">เลขไมล์ปัจจุบัน (กม.) (Current Mileage)</label>
                                <input
                                    type="number"
                                    name="currentMileage"
                                    value={formData.currentMileage}
                                    onChange={handleInputChange}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold placeholder:text-slate-300 shadow-sm"
                                    placeholder="เช่น 120500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="animate-fade-in-up delay-500">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ประเภทรถ (Vehicle Type)</label>
                                <select
                                    name="vehicleType"
                                    value={formData.vehicleType}
                                    onChange={handleInputChange}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-sm cursor-pointer"
                                    aria-label="Select Vehicle Type"
                                >
                                    <option value="" disabled>-- เลือกประเภท --</option>
                                    {uniqueVehicleTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                                    <option value="อื่นๆ">อื่นๆ...</option>
                                </select>
                                {formData.vehicleType === 'อื่นๆ' && (
                                    <input type="text" name="otherVehicleType" value={otherVehicleType} onChange={(e) => setOtherVehicleType(e.target.value)} placeholder="ระบุประเภท" className="mt-4 w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-sm" required />
                                )}
                            </div>
                            <div className="animate-fade-in-up delay-600">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ยี่ห้อ (Make)</label>
                                <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-sm" placeholder="ยี่ห้อรถ" />
                            </div>
                            <div className="animate-fade-in-up delay-700">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">รุ่น (Model)</label>
                                <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-sm" placeholder="รุ่นรถ" />
                            </div>
                        </div>

                        {/* 3D Model Section */}
                        <div className="animate-scale-in delay-700 pt-10">
                            <TruckModel3D onPartSelect={handlePartSelect} />
                        </div>

                        <div className="animate-fade-in-up delay-[800ms] shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">อาการเสียโดยละเอียด (Problem Description) *</label>
                            <textarea
                                name="problemDescription"
                                value={formData.problemDescription}
                                onChange={handleInputChange}
                                rows={6}
                                className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold placeholder:text-slate-300 shadow-sm leading-relaxed"
                                required
                                placeholder="ระบุอาการเสียโดยละเอียด หรือเลือกจากรูปด้านบน..."
                            ></textarea>
                        </div>
                    </div>
                );
            case 1: // การประเมินและมอบหมาย
                return (
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="animate-fade-in-up delay-100">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ความสำคัญ (Priority)</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    className={`w-full p-5 border-2 rounded-[1.5rem] transition-all duration-300 font-bold shadow-sm cursor-pointer appearance-none ${formData.priority === 'ปกติ' ? 'bg-slate-50 border-slate-100 text-slate-700' :
                                        formData.priority === 'ด่วน' ? 'bg-orange-50 border-orange-200 text-orange-700 focus:ring-orange-500/10' :
                                            'bg-red-50 border-red-200 text-red-700 focus:ring-red-500/10'
                                        }`}
                                    aria-label="Select Priority"
                                >
                                    <option value="ปกติ">ปกติ (Normal)</option>
                                    <option value="ด่วน">ด่วน (Urgent)</option>
                                    <option value="ด่วนที่สุด">ด่วนที่สุด (Emergency)</option>
                                </select>
                            </div>
                            <div className="animate-fade-in-up delay-200">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ประเภทการซ่อม (Category)</label>
                                <select
                                    name="repairCategory"
                                    value={formData.repairCategory}
                                    onChange={handleInputChange}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-sm cursor-pointer appearance-none"
                                    aria-label="Select Repair Category"
                                >
                                    <option>ซ่อมทั่วไป</option>
                                    <option>เปลี่ยนอะไหล่</option>
                                    <option>ตรวจเช็ก</option>
                                </select>
                            </div>
                        </div>

                        <div className="animate-fade-in-up delay-300">
                            <div className="flex justify-between items-center mb-6">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 ml-1">การประมาณการณ์เวลาซ่อม (Repair Estimation) *</label>
                                <button
                                    type="button"
                                    onClick={() => setKPIModalOpen(true)}
                                    className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/20 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Settings size={14} /> + เพิ่มงาน KPI
                                </button>
                            </div>

                            <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] space-y-8">
                                {selectedKpis.length > 0 ? (
                                    <div className="space-y-4 animate-scale-in">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-slate-500 flex items-center gap-2">
                                                <AlertCircle size={14} className="text-blue-500" /> รายการ KPI ที่เลือก:
                                            </span>
                                            <div className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30 animate-pulse">
                                                เวลามาตรฐานรวม: {formatHoursDescriptive(totalKpiHours, 8)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedKpis.map(kpi => (
                                                <span key={kpi.id} className="group flex items-center gap-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-5 pr-2 py-2 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                                                    {kpi.item}
                                                    <button type="button" onClick={() => handleRemoveKpi(kpi.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">&times;</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                                        <p className="text-xs font-bold text-slate-400">กรุณาเลือกงาน KPI เพื่อประมาณการณ์เวลาซ่อม</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="group">
                                        <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 ml-1">เวลาที่คาดว่าจะเริ่มซ่อม</label>
                                        <div className="relative">
                                            <input type="datetime-local" value={toLocalISOString(activeEstimation.estimatedStartDate) || ''} onChange={(e) => handleDateChange('estimatedStartDate', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all duration-300 text-slate-800 font-bold shadow-sm" aria-label="Estimated Start Date" />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"><Clock size={16} /></div>
                                        </div>
                                    </div>
                                    <div className="group opacity-80">
                                        <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 ml-1">เวลาที่คาดว่าจะซ่อมเสร็จ (คำนวณอัตโนมัติ)</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                value={toLocalISOString(activeEstimation.estimatedEndDate) || ''}
                                                onChange={(e) => handleDateChange('estimatedEndDate', e.target.value)}
                                                className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-slate-500 font-bold shadow-sm cursor-not-allowed"
                                                readOnly
                                                required
                                                aria-label="Estimated End Date"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"><CheckCircle2 size={16} /></div>
                                        </div>
                                    </div>
                                </div>

                                {totalKpiHours > 0 &&
                                    <div className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl text-[11px] text-blue-700 leading-relaxed font-bold animate-fade-in-up">
                                        ✨ AI Insights: "{activeEstimation.aiReasoning || `คำนวณจากเวลามาตรฐานรวม ${formatHoursDescriptive(totalKpiHours, 8)} โดยพิจารณาเวลาทำงาน (08:00-17:00), พักเที่ยง, และวันหยุด`}"
                                    </div>
                                }
                            </div>
                        </div>

                        <div className="animate-fade-in-up delay-400">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-6 ml-1">ประเภทการมอบหมาย (Assignment Type) *</label>
                            <div className="grid grid-cols-2 gap-10">
                                <label className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer group flex items-center gap-6 overflow-hidden ${assignmentType === 'internal' ? 'bg-blue-600 border-blue-600 shadow-2xl shadow-blue-500/30' : 'bg-slate-50 border-slate-100'}`}>
                                    <input type="radio" name="assignmentType" value="internal" checked={assignmentType === 'internal'} onChange={() => handleAssignmentTypeChange('internal')} className="sr-only" />
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${assignmentType === 'internal' ? 'bg-white/20 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-black uppercase tracking-widest ${assignmentType === 'internal' ? 'text-white' : 'text-slate-800'}`}>ซ่อมภายใน</p>
                                        <p className={`text-[10px] ${assignmentType === 'internal' ? 'text-white/60' : 'text-slate-400'} font-bold`}>ใช้ทีมสไลด์ช่างบริษัท</p>
                                    </div>
                                    {assignmentType === 'internal' && <div className="absolute top-4 right-4 text-white animate-scale-in"><CheckCircle2 size={24} /></div>}
                                </label>

                                <label className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer group flex items-center gap-6 overflow-hidden ${assignmentType === 'external' ? 'bg-emerald-600 border-emerald-600 shadow-2xl shadow-emerald-500/30' : 'bg-slate-50 border-slate-100'}`}>
                                    <input type="radio" name="assignmentType" value="external" checked={assignmentType === 'external'} onChange={() => handleAssignmentTypeChange('external')} className="sr-only" />
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${assignmentType === 'external' ? 'bg-white/20 text-white' : 'bg-white text-emerald-600 shadow-sm'}`}>
                                        <Wrench size={24} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-black uppercase tracking-widest ${assignmentType === 'external' ? 'text-white' : 'text-slate-800'}`}>ซ่อมภายนอก</p>
                                        <p className={`text-[10px] ${assignmentType === 'external' ? 'text-white/60' : 'text-slate-400'} font-bold`}>จ้างอู่หรือบริษัทภายนอก</p>
                                    </div>
                                    {assignmentType === 'external' && <div className="absolute top-4 right-4 text-white animate-scale-in"><CheckCircle2 size={24} /></div>}
                                </label>
                            </div>

                            <div className="mt-8 animate-fade-in-up">
                                {assignmentType === 'internal' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-blue-50/30 border-2 border-blue-100/50 rounded-[2.5rem]">
                                        <div className="animate-fade-in-up delay-100">
                                            <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mb-3 ml-1">ช่างหลัก (Main Technician) *</label>
                                            <select
                                                name="assignedTechnicianId"
                                                value={formData.assignedTechnicianId || ''}
                                                onChange={handleInputChange}
                                                className="w-full p-5 bg-white border-2 border-blue-100 rounded-[1.5rem] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-bold shadow-md cursor-pointer appearance-none"
                                                required
                                                aria-label="Select Technician"
                                            >
                                                <option value="" disabled>-- เลือกช่างหลัก --</option>
                                                {mainTechnicians.map(tech => (
                                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="animate-fade-in-up delay-200">
                                            <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mb-3 ml-1">ผู้ช่วยช่าง (Assistants)</label>
                                            <TechnicianMultiSelect
                                                allTechnicians={assistantTechnicians}
                                                selectedTechnicianIds={formData.assistantTechnicianIds}
                                                onChange={(ids) => setFormData(prev => ({ ...prev, assistantTechnicianIds: ids }))}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 bg-emerald-50/30 border-2 border-emerald-100/50 rounded-[2.5rem] animate-fade-in-up">
                                        <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-3 ml-1">ชื่ออู่หรือหน่วยงานภายนอก (External Contractor) *</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                name="externalTechnicianName"
                                                value={formData.externalTechnicianName || ''}
                                                onChange={handleInputChange}
                                                placeholder="กรอกชื่อช่าง หรือ อู่ภายนอก..."
                                                className="w-full p-5 bg-white border-2 border-emerald-100 rounded-[1.5rem] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-slate-800 font-bold shadow-md"
                                                required
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:animate-bounce"><Wrench size={20} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 2: // อะไหล่และค่าใช้จ่าย
                return (
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="space-y-6">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 ml-1">รายการอะไหล่และอุปกรณ์ (Parts Requisition)</label>

                            <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                                {formData.parts.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-12 gap-5 p-8 border-b-2 border-slate-100 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 bg-white/50">
                                            <div className="col-span-1 text-center">คลัง</div>
                                            <div className="col-span-4">ชื่ออะไหล่ (Part Name)</div>
                                            <div className="col-span-2 text-right">จำนวน</div>
                                            <div className="col-span-2 text-right">ราคา/หน่วย</div>
                                            <div className="col-span-3 text-right pr-4">ราคารวม</div>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {formData.parts.map((part) => (
                                                <div key={part.partId} className="grid grid-cols-12 gap-5 items-center p-8 hover:bg-white transition-colors border-b border-slate-100 last:border-0 group animate-fade-in-up">
                                                    <div className="col-span-1 flex justify-center">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${part.source === 'สต็อกอู่' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {part.source === 'สต็อกอู่' ? <Package size={18} /> : <CreditCard size={18} />}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 pr-4">
                                                        <p className="font-bold text-slate-800 text-sm truncate">{part.name}</p>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{part.source}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input type="number" value={part.quantity} min="1" onChange={(e) => updatePart(part.partId, 'quantity', parseInt(e.target.value))} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-right font-black text-slate-800 hover:border-blue-400 focus:border-blue-500 transition-all shadow-sm" aria-label="Quantity" />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input type="number" value={part.unitPrice} onChange={(e) => updatePart(part.partId, 'unitPrice', parseFloat(e.target.value))} disabled={part.source === 'สต็อกอู่'} className={`w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-right font-black text-slate-800 hover:border-blue-400 focus:border-blue-500 transition-all shadow-sm ${part.source === 'สต็อกอู่' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} aria-label="Unit Price" />
                                                    </div>
                                                    <div className="col-span-3 flex items-center justify-end gap-5">
                                                        <p className="font-black text-slate-800 text-base">{formatCurrency(part.quantity * part.unitPrice)}</p>
                                                        <button type="button" onClick={() => removePart(part.partId)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all font-black text-xl">&times;</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-6"><Package size={40} /></div>
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-loose">ยังไม่มีการเพิ่มอะไหล่ในรายการ<br /><span className="text-[10px] font-bold text-slate-300">กรุณาเลือกปุ่มด้านล่างเพื่อเพิ่มข้อมูล</span></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <button type="button" onClick={() => setStockModalOpen(true)} className="group relative p-6 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-3xl hover:bg-blue-600 hover:border-blue-600 transition-all duration-500 overflow-hidden transform hover:-translate-y-1">
                                <span className="relative z-10 flex flex-col items-center gap-3">
                                    <Package size={24} className="text-blue-500 group-hover:text-white transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 group-hover:text-white transition-colors">เลือกจากคลัง (Main Stock)</span>
                                </span>
                            </button>
                            <button type="button" onClick={() => setRevolvingStockModalOpen(true)} className="group relative p-6 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-3xl hover:bg-indigo-600 hover:border-indigo-600 transition-all duration-500 overflow-hidden transform hover:-translate-y-1">
                                <span className="relative z-10 flex flex-col items-center gap-3">
                                    <Settings size={24} className="text-indigo-500 group-hover:text-white transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 group-hover:text-white transition-colors">อะไหล่หมุนเวียน (Revolving)</span>
                                </span>
                            </button>
                            <button type="button" onClick={() => setExternalPartModalOpen(true)} className="group relative p-6 bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-3xl hover:bg-emerald-600 hover:border-emerald-600 transition-all duration-500 overflow-hidden transform hover:-translate-y-1">
                                <span className="relative z-10 flex flex-col items-center gap-3">
                                    <CreditCard size={24} className="text-emerald-500 group-hover:text-white transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 group-hover:text-white transition-colors">ซื้อจากร้านภายนอก (Purchased)</span>
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t-2 border-slate-100">
                            <div className="space-y-8">
                                <div className="animate-fade-in-up">
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 mb-3 ml-1">ค่าใช้จ่ายในการซ่อม / ค่าแรง (Service Fee) *</label>
                                    <div className="relative">
                                        <input type="number" name="repairCost" value={formData.repairCost} onChange={handleInputChange} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-800 font-black text-xl shadow-sm" aria-label="Repair Cost" />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest text-xs">บาท (THB)</div>
                                    </div>
                                </div>
                                <div className="animate-fade-in-up delay-100 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem]">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                            <Shield size={14} className="text-blue-500" /> การจัดการ VAT (VAT Settings)
                                        </label>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="isLaborVatEnabled"
                                                checked={formData.isLaborVatEnabled}
                                                onChange={e => setFormData(prev => ({ ...prev, isLaborVatEnabled: e.target.checked }))}
                                                className="sr-only peer"
                                                title="Enable Labor VAT"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-600">{formData.isLaborVatEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                                        </div>
                                    </div>
                                    <div className={`transition-all duration-500 flex items-center gap-4 ${formData.isLaborVatEnabled ? 'opacity-100 translate-y-0 h-14' : 'opacity-0 -translate-y-4 h-0 overflow-hidden'}`}>
                                        <span className="text-xs font-bold text-slate-500">อัตราภาษีมูลค่าเพิ่ม:</span>
                                        <input
                                            type="number"
                                            name="laborVatRate"
                                            value={formData.laborVatRate}
                                            onChange={handleInputChange}
                                            placeholder="7"
                                            className="w-20 p-3 bg-white border-2 border-blue-100 rounded-xl text-center font-black text-blue-600 shadow-sm"
                                        />
                                        <span className="text-xs font-black text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -ml-10 -mb-10"></div>

                                <div className="relative z-10 space-y-8">
                                    <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ค่าอะไหล่สุทธิ (Net Parts)</span>
                                        <span className="text-sm font-bold">{formatCurrency((totalPartsCost || 0) + (formData.partsVat || 0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform delay-75">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ค่าแรงสุทธิ (Net Service)</span>
                                        <span className="text-sm font-bold">{formatCurrency((formData.repairCost || 0) + (formData.laborVat || 0))}</span>
                                    </div>
                                    <div className="pt-8 border-t border-white/10 mt-8">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">ยอดรวมสุทธิทั้งสิ้น (Grand Total)</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">{formatCurrency(grandTotal).replace(/[^0-9.,]/g, '')}</span>
                                            <span className="text-xl font-black text-blue-400">บาท</span>
                                        </div>
                                    </div>
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
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto mb-6 animate-bounce shadow-xl shadow-emerald-500/10">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">ตรวจสอบข้อมูลครั้งสุดท้าย</h2>
                            <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">Final Review & Confirmation</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-light p-10 rounded-[3rem] border border-white/60 shadow-xl group hover:shadow-2xl transition-all duration-500 animate-fade-in-up delay-100">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Truck size={20} /></div>
                                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Vehicle Info</h3>
                                    </div>
                                    <button onClick={() => handleEditClick(0)} type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all border border-blue-100 shadow-sm" title="แก้ไขข้อมูลรถและปัญหา"><Edit3 size={16} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">ทะเบียนรถ</p>
                                        <p className="text-xl font-black text-slate-800">{formData.licensePlate}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">ประเภทระ</p>
                                        <p className="text-sm font-bold text-slate-700">{formData.vehicleType === 'อื่นๆ' ? otherVehicleType : formData.vehicleType}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">อาการเสียที่แจ้ง</p>
                                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 leading-relaxed italic">
                                            "{formData.problemDescription}"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-light p-10 rounded-[3rem] border border-white/60 shadow-xl group hover:shadow-2xl transition-all duration-500 animate-fade-in-up delay-200">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><User size={20} /></div>
                                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Assignment</h3>
                                    </div>
                                    <button onClick={() => handleEditClick(1)} type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all border border-indigo-100 shadow-sm" title="แก้ไขการประเมินและมอบหมาย"><Edit3 size={16} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">ความสำคัญ</p>
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${formData.priority === 'ปกติ' ? 'bg-slate-100 text-slate-600' :
                                                formData.priority === 'ด่วน' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-red-100 text-red-600'
                                                }`}>{formData.priority}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">กำหนดการเสร็จ</p>
                                            <p className="text-sm font-bold text-slate-700">{formatDateTime24h(activeEstimation.estimatedEndDate)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">ความรับผิดชอบ</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm"><Wrench size={16} /></div>
                                            <p className="text-sm font-black text-slate-800">
                                                {formData.dispatchType === 'ภายนอก' ? `ซ่อมภายนอก: ${formData.externalTechnicianName}` : `ช่างหลัก: ${mainTechName}`}
                                            </p>
                                        </div>
                                    </div>
                                    {assignmentType === 'internal' && assistantTechNames && (
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">ทีมสนับสนุน</p>
                                            <p className="text-xs font-bold text-slate-500 leading-normal">{assistantTechNames}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="glass-light p-12 rounded-[3.5rem] border border-white/60 shadow-xl group hover:shadow-2xl transition-all duration-500 animate-fade-in-up delay-300">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><CreditCard size={24} /></div>
                                    <div>
                                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-600 mb-1">Financial Summary</h3>
                                        <p className="text-xs font-black text-slate-800">{formData.parts.length} Items Listed</p>
                                    </div>
                                </div>
                                <button onClick={() => handleEditClick(2)} type="button" className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-all border border-emerald-100 shadow-sm" title="แก้ไขอะไหล่และค่าใช้จ่าย"><Edit3 size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 bg-white/50 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-10 shadow-inner">
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-700">Total Parts</p>
                                    <p className="text-2xl font-black text-slate-800">{formatCurrency(totalPartsCost + (formData.partsVat || 0)).replace(/[^0-9.,]/g, '')} <span className="text-[10px]">บาท</span></p>
                                    <p className="text-[9px] font-bold text-slate-400">Includes Multi-Source VAT</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-700">Service Fee</p>
                                    <p className="text-2xl font-black text-slate-800">{formatCurrency((formData.repairCost || 0) + (formData.laborVat || 0)).replace(/[^0-9.,]/g, '')} <span className="text-[10px]">บาท</span></p>
                                    <p className="text-[9px] font-bold text-slate-400">{formData.isLaborVatEnabled ? `Standard VAT ${formData.laborVatRate}% Applied` : 'VAT Free Service'}</p>
                                </div>
                                <div className="space-y-2 bg-slate-900 rounded-[2rem] p-6 text-white text-right relative overflow-hidden group/total">
                                    <div className="absolute top-0 left-0 w-full h-full bg-blue-500/10 opacity-0 group-hover/total:opacity-100 transition-opacity"></div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 relative z-10">Grand Total Amount</p>
                                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 relative z-10">{formatCurrency(grandTotal)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 p-10 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] animate-fade-in-up delay-400">
                            <label className="flex items-center gap-6 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={isConfirmed}
                                        onChange={handleConfirmationChange}
                                        className="sr-only peer"
                                        title="ขอยืนยันความถูกต้องของข้อมูล (Confirm Data Accuracy)"
                                    />
                                    <div className="w-10 h-10 border-4 border-slate-200 rounded-2xl flex items-center justify-center transition-all duration-300 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-sm group-hover:scale-110 active:scale-95">
                                        <div className={`text-white transition-transform duration-300 ${isConfirmed ? 'scale-100' : 'scale-0'}`}><CheckCircle2 size={24} /></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">ข้าพเจ้าขอยืนยันความถูกต้องของข้อมูลทั้งหมด</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">I certify that all information provided is accurate and complete.</p>
                                </div>
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
            <div className="pb-20 animate-fade-in-up">
                <form onSubmit={handleSubmit} className="space-y-10 max-w-5xl mx-auto mt-6">
                    <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

                    <div className="glass-light p-10 sm:p-14 rounded-[3.5rem] border border-white/60 shadow-2xl relative overflow-hidden backdrop-blur-3xl transition-all duration-500">
                        <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 blur-3xl rounded-full -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/30 blur-3xl rounded-full -ml-20 -mb-20"></div>

                        <div className="relative z-10">
                            {renderStepContent()}
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-10">
                        <div>
                            {currentStep > 0 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-10 py-5 text-xs font-black uppercase tracking-[0.3em] text-slate-500 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-300 transform hover:-translate-x-1 active:scale-95 flex items-center gap-3"
                                >
                                    <span className="text-lg">←</span> กลับ (Back)
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            {currentStep < steps.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-12 py-5 text-xs font-black uppercase tracking-[0.3em] text-white bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500 transform hover:-translate-y-1 active:scale-95 flex items-center gap-3 hover:pr-14"
                                >
                                    ถัดไป (Next) <span className="text-lg">→</span>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!isConfirmed || !isFormGloballyValid || isSubmitting}
                                    className="px-12 py-5 text-xs font-black uppercase tracking-[0.3em] text-white bg-gradient-to-r from-emerald-500 to-teal-700 rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-500 transform hover:-translate-y-1 active:scale-95 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>✓ ยืนยันสร้างใบแจ้งซ่อม</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {isStockModalOpen && <StockSelectionModal stock={mainStock} onClose={() => setStockModalOpen(false)} onAddParts={handleAddPartsFromStock} existingParts={formData.parts} />}
            {isRevolvingStockModalOpen && <StockSelectionModal stock={revolvingStock} onClose={() => setRevolvingStockModalOpen(false)} onAddParts={handleAddPartsFromStock} existingParts={formData.parts} />}
            {isExternalPartModalOpen && <ExternalPartModal onClose={() => setExternalPartModalOpen(false)} onAddExternalParts={handleAddExternalParts} suppliers={suppliers} />}
            {isKPIModalOpen && <KPIPickerModal isOpen={isKPIModalOpen} kpiData={kpiData} onClose={() => setKPIModalOpen(false)} onAddMultipleKPIs={handleAddKPIs} initialSelectedIds={formData.kpiTaskIds || []} />}
        </>
    );
};

export default RepairForm;