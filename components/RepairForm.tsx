import React, { useState, ChangeEvent, FormEvent, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Repair, Technician, StockItem, PartRequisitionItem, FileAttachment, Tab } from '../types';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';
import { useToast } from '../context/ToastContext';
import TechnicianMultiSelect from './TechnicianMultiSelect';

interface RepairFormProps {
    technicians: Technician[];
    stock: StockItem[];
    addRepair: (repair: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => void;
    repairs: Repair[];
    setActiveTab: (tab: Tab) => void;
}

interface EstimationResult {
    laborHours: number;
    reasoning: string;
}

const RepairForm: React.FC<RepairFormProps> = ({ technicians, stock, addRepair, repairs, setActiveTab }) => {
    
    const getInitialState = () => ({
        repairOrderNo: 'จะถูกสร้างอัตโนมัติ',
        licensePlate: '',
        vehicleType: 'รถกระบะ 4 ล้อ',
        vehicleMake: '',
        vehicleModel: '',
        currentMileage: '',
        reportedBy: '',
        repairCategory: 'ซ่อมทั่วไป',
        priority: 'ปกติ' as const,
        problemDescription: '',
        assignedTechnicians: [] as string[],
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
        estimatedStartDate: '',
        estimatedEndDate: '',
        estimatedLaborHours: 0,
    });

    const [formData, setFormData] = useState(getInitialState());
    const [otherVehicleType, setOtherVehicleType] = useState('');
    const [openSections, setOpenSections] = useState({
        basic: true,
        estimation: true,
        dispatch: true,
        parts: true,
        files: true,
    });
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isExternalPartModalOpen, setExternalPartModalOpen] = useState(false);
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimationResult, setEstimationResult] = useState<EstimationResult | null>(null);
    const [isManualEstimation, setIsManualEstimation] = useState(false);
    const { addToast } = useToast();

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const resetForm = () => {
        setFormData(getInitialState());
        setOtherVehicleType('');
        setEstimationResult(null);
        setIsManualEstimation(false);
    };

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // --- AI Estimation ---
    const handleEstimate = async () => {
        setIsEstimating(true);
        setEstimationResult(null);

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
            const result = JSON.parse(response.text);
            setEstimationResult(result);
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            addToast("ไม่สามารถประมาณการณ์ได้", "error");
        } finally {
            setIsEstimating(false);
        }
    };
    
    const applyEstimate = () => {
        if (!estimationResult) return;
        
        const now = new Date();
        const start = new Date(now);
        const end = new Date(start.getTime() + estimationResult.laborHours * 60 * 60 * 1000);

        const toLocalISOString = (date: Date) => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            return localISOTime;
        }

        setFormData(prev => ({
            ...prev,
            estimatedStartDate: toLocalISOString(start),
            estimatedEndDate: toLocalISOString(end),
            estimatedLaborHours: estimationResult.laborHours
        }));
        setIsManualEstimation(true); // show the fields
    };

    // --- Parts Management ---
    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, ...newParts]
        }));
        setStockModalOpen(false);
    };

    const handleAddExternalParts = (data: { parts: PartRequisitionItem[], vat: number }) => {
        const existingPartNames = new Set(formData.parts.map(p => p.name.trim().toLowerCase()));
        const newParts = data.parts.filter(p => !existingPartNames.has(p.name.trim().toLowerCase()));
        
        if (newParts.length < data.parts.length) {
            addToast('มีบางรายการซ้ำซ้อนและถูกข้ามไป', 'info');
        }

        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, ...newParts],
            partsVat: (prev.partsVat || 0) + data.vat
        }));
        setExternalPartModalOpen(false);
    };

    const updatePart = (index: number, field: keyof PartRequisitionItem, value: any) => {
        const newParts = [...formData.parts];
        (newParts[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, parts: newParts }));
    };
    
    const removePart = (index: number) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.filter((_, i) => i !== index)
        }));
    };

    const { totalPartsCost, grandTotal } = useMemo(() => {
        const safeParts = Array.isArray(formData.parts) ? formData.parts : [];
        const partsCost = safeParts.reduce((total, part) => total + (part.quantity * part.unitPrice), 0);
        const total = partsCost + (formData.partsVat || 0) + (formData.repairCost || 0);
        return { totalPartsCost: partsCost, grandTotal: total };
    }, [formData.parts, formData.repairCost, formData.partsVat]);
    
    // --- File Management ---
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({ name: file.name, size: file.size }));
            setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles]}));
        }
    };
    
    const removeAttachment = (index: number) => {
        setFormData(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== index)}));
    };

    // --- Form Submission ---
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData.licensePlate || !formData.problemDescription) {
            addToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ทะเบียนรถ, อาการเสีย)', 'warning');
            return;
        }

        // --- Duplicate Repair Order Check ---
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
            if (!proceed) {
                return; // Stop submission
            }
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

    const SectionHeader: React.FC<{ title: string; sectionId: keyof typeof openSections }> = ({ title, sectionId }) => (
        <button type="button" onClick={() => toggleSection(sectionId)} className="w-full flex justify-between items-center text-left bg-gray-100 p-4 rounded-t-lg border-b">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <span className={`transform transition-transform duration-200 ${openSections[sectionId] ? 'rotate-180' : ''}`}>▼</span>
        </button>
    );

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="1. ข้อมูลพื้นฐาน" sectionId="basic" />
                {openSections.basic && (
                <div className="p-6 space-y-4">
                    {/* ... (existing basic info fields) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">เลขที่ใบแจ้งซ่อม</label>
                            <input type="text" value={formData.repairOrderNo} className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" disabled />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่แจ้งซ่อม</label>
                            <input type="text" value={new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ทะเบียนรถ *</label>
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
                            <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                <option>รถกระบะ 4 ล้อ</option>
                                <option>รถบรรทุก 6 ล้อ</option>
                                <option>รถบรรทุก 10 ล้อ</option>
                                <option>รถหัวลาก</option>
                                <option>หางพ่วง</option>
                                <option value="อื่นๆ">อื่นๆ...</option>
                            </select>
                             {formData.vehicleType === 'อื่นๆ' && (
                                <input
                                    type="text"
                                    name="otherVehicleType"
                                    value={otherVehicleType}
                                    onChange={(e) => setOtherVehicleType(e.target.value)}
                                    placeholder="ระบุประเภท"
                                    className="mt-2 w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            )}
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
                         <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้งซ่อม</label>
                            <input type="text" name="reportedBy" value={formData.reportedBy} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">อาการเสีย *</label>
                        <textarea name="problemDescription" value={formData.problemDescription} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" required></textarea>
                    </div>
                </div>
                )}
            </div>

            {/* Estimation Section */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="2. การประมาณการณ์" sectionId="estimation" />
                {openSections.estimation && (
                    <div className="p-6 space-y-4">
                        <button
                            type="button"
                            onClick={handleEstimate}
                            disabled={!formData.licensePlate || !formData.problemDescription || isEstimating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            🤖 ประมาณการเวลาซ่อมด้วย AI
                        </button>

                        {isEstimating && (
                            <div className="text-center p-4 bg-gray-100 rounded-lg">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                <p className="mt-2 text-gray-600">กำลังวิเคราะห์ข้อมูลจาก AI...</p>
                            </div>
                        )}

                        {estimationResult && !isEstimating && (
                             <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center space-y-3">
                                <p className="text-lg">
                                    <span className="font-medium text-gray-700">เวลาทำงานของช่าง (โดยประมาณ):</span>
                                    <span className="ml-2 text-2xl font-bold text-blue-600">{estimationResult.laborHours} ชั่วโมง</span>
                                </p>
                                <p className="text-sm text-gray-600 italic">"{estimationResult.reasoning}"</p>
                                <div className="flex justify-center gap-4 pt-2">
                                    <button type="button" onClick={applyEstimate} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">ใช้เวลาประมาณการณ์นี้</button>
                                    <button type="button" onClick={() => setIsManualEstimation(true)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">แก้ไขด้วยตนเอง</button>
                                </div>
                            </div>
                        )}

                        {isManualEstimation && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะเริ่มซ่อม</label>
                                    <input type="datetime-local" name="estimatedStartDate" value={formData.estimatedStartDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">เวลาที่คาดว่าจะซ่อมเสร็จ</label>
                                    <input type="datetime-local" name="estimatedEndDate" value={formData.estimatedEndDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Dispatch Info */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="3. ข้อมูลการส่งซ่อม" sectionId="dispatch" />
                 {openSections.dispatch && (
                <div className="p-6 space-y-4">
                     {/* ... (existing dispatch fields) ... */}
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ประเภทการส่งซ่อม</label>
                        <div className="mt-2 flex space-x-4">
                            <label><input type="radio" name="dispatchType" value="ภายใน" checked={formData.dispatchType === 'ภายใน'} onChange={handleInputChange} className="mr-2"/>ภายใน</label>
                            <label><input type="radio" name="dispatchType" value="ภายนอก" checked={formData.dispatchType === 'ภายนอก'} onChange={handleInputChange} className="mr-2"/>ภายนอก</label>
                        </div>
                    </div>
                    {formData.dispatchType === 'ภายนอก' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">สถานที่ส่งซ่อม</label>
                                <input type="text" name="repairLocation" value={formData.repairLocation} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ผู้ประสานงาน</label>
                                <input type="text" name="coordinator" value={formData.coordinator} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">มอบหมายช่าง</label>
                                <button type="button" onClick={() => setActiveTab('technicians')} className="text-sm text-blue-600 hover:underline">จัดการช่าง</button>
                            </div>
                           <TechnicianMultiSelect
                                allTechnicians={technicians}
                                selectedTechnicianIds={formData.assignedTechnicians}
                                onChange={(ids) => setFormData(prev => ({...prev, assignedTechnicians: ids}))}
                           />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">ค่าใช้จ่ายในการซ่อม (ไม่รวมอะไหล่)</label>
                            <input type="number" name="repairCost" value={formData.repairCost} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                </div>
                 )}
            </div>

            {/* Parts Requisition */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="4. รายการเบิกอะไหล่" sectionId="parts" />
                 {openSections.parts && (
                <div className="p-6 space-y-4">
                    {/* ... (existing parts section) ... */}
                    <div className="space-y-3">
                        {formData.parts.length > 0 && (
                             <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b font-medium text-sm text-gray-600">
                                <div className="col-span-1">ที่มา</div>
                                <div className="col-span-4">ชื่ออะไหล่</div>
                                <div className="col-span-2 text-right">จำนวน</div>
                                <div className="col-span-1 text-center">หน่วย</div>
                                <div className="col-span-2 text-right">ราคา/หน่วย</div>
                                <div className="col-span-2 text-right">ราคารวม</div>
                            </div>
                        )}
                        {formData.parts.map((part, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50">
                                <div className="col-span-1 text-xl">{part.source === 'สต็อกอู่' ? '📦' : '🏪'}</div>
                                <div className="col-span-4">
                                    <p className="font-medium">{part.name}</p>
                                     {part.source === 'ร้านค้า' && part.supplierName && (
                                        <p className="text-xs text-gray-500">จาก: {part.supplierName}</p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <input type="number" value={part.quantity} min="1" onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value))} className="w-full p-1 border rounded text-right" />
                                </div>
                                <div className="col-span-1 text-center">{part.unit}</div>
                                <div className="col-span-2">
                                     <input type="number" value={part.unitPrice} onChange={(e) => updatePart(index, 'unitPrice', parseFloat(e.target.value))} disabled={part.source === 'สต็อกอู่'} className={`w-full p-1 border rounded text-right ${part.source === 'สต็อกอู่' ? 'bg-gray-100' : ''}`} />
                                </div>
                                <div className="col-span-1 font-semibold text-right">
                                    {(part.quantity * part.unitPrice).toLocaleString()}
                                </div>
                                <div className="col-span-1 text-center">
                                    <button type="button" onClick={() => removePart(index)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {formData.parts.length > 0 && (
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
            
            {/* File Attachments */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="5. ไฟล์แนบและรูปภาพ" sectionId="files" />
                {openSections.files && (
                <div className="p-6">
                     {/* ... (existing files section) ... */}
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 font-semibold">
                            เลือกไฟล์เพื่ออัปโหลด
                        </label>
                        <input id="file-upload" name="files" type="file" multiple className="sr-only" onChange={handleFileChange} />
                        <p className="text-xs text-gray-500 mt-1">แนบใบเสนอราคา, ใบเสร็จ, รูปถ่าย</p>
                    </div>
                    <div className="mt-4 space-y-2">
                        {formData.attachments.map((file, index) => (
                             <div key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                                <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                <button type="button" onClick={() => removeAttachment(index)} className="text-red-500 font-bold">×</button>
                            </div>
                        ))}
                    </div>
                </div>
                 )}
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={resetForm} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ล้างฟอร์ม</button>
                <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">สร้างใบแจ้งซ่อม</button>
            </div>
        </form>

        {isStockModalOpen && (
            <StockSelectionModal
                stock={stock}
                onClose={() => setStockModalOpen(false)}
                onAddParts={handleAddPartsFromStock}
                existingParts={formData.parts}
            />
        )}
        {isExternalPartModalOpen && (
            <ExternalPartModal
                onClose={() => setExternalPartModalOpen(false)}
                onAddExternalParts={handleAddExternalParts}
            />
        )}
        </>
    );
};

export default RepairForm;