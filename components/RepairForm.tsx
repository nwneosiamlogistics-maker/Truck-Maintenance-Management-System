import React, { useState, ChangeEvent, FormEvent, useMemo } from 'react';
import type { Repair, Technician, StockItem, PartRequisitionItem, FileAttachment } from '../types';
import StockSelectionModal from './StockSelectionModal';
import ExternalPartModal from './ExternalPartModal';

interface RepairFormProps {
    technicians: Technician[];
    stock: StockItem[];
    addRepair: (repair: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => void;
}

const RepairForm: React.FC<RepairFormProps> = ({ technicians, stock, addRepair }) => {
    
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
        assignedTechnician: '',
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
    });

    const [formData, setFormData] = useState(getInitialState());
    const [otherVehicleType, setOtherVehicleType] = useState('');
    const [openSections, setOpenSections] = useState({
        basic: true,
        dispatch: true,
        parts: true,
        files: true,
    });
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isExternalPartModalOpen, setExternalPartModalOpen] = useState(false);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const resetForm = () => {
        setFormData(getInitialState());
        setOtherVehicleType('');
    };

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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
        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, ...data.parts],
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
        const partsCost = (formData.parts || []).reduce((total, part) => total + (part.quantity * part.unitPrice), 0);
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
            alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ทะเบียนรถ, อาการเสีย)');
            return;
        }

        const { repairOrderNo, ...repairData } = formData;
        
        if (repairData.vehicleType === 'อื่นๆ') {
             if (!otherVehicleType.trim()) {
                alert('กรุณาระบุประเภทรถ');
                return;
            }
            repairData.vehicleType = otherVehicleType.trim();
        }

        addRepair(repairData as Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>);
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

            {/* Dispatch Info */}
            <div className="bg-white rounded-lg shadow-sm">
                <SectionHeader title="2. ข้อมูลการส่งซ่อม" sectionId="dispatch" />
                 {openSections.dispatch && (
                <div className="p-6 space-y-4">
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">มอบหมายช่าง</label>
                            <select name="assignedTechnician" value={formData.assignedTechnician} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                <option value="">-- เลือกช่าง --</option>
                                {technicians.filter(t => t.status === 'ว่าง').map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
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
                <SectionHeader title="3. รายการเบิกอะไหล่" sectionId="parts" />
                 {openSections.parts && (
                <div className="p-6 space-y-4">
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
                                <div className="col-span-1 text-xl">{part.source === 'สต๊อกอู่' ? '📦' : '🏪'}</div>
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
                                     <input type="number" value={part.unitPrice} onChange={(e) => updatePart(index, 'unitPrice', parseFloat(e.target.value))} disabled={part.source === 'สต๊อกอู่'} className={`w-full p-1 border rounded text-right ${part.source === 'สต๊อกอู่' ? 'bg-gray-100' : ''}`} />
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
                           📦 + เลือกจากสต๊อกอู่
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
                <SectionHeader title="4. ไฟล์แนบและรูปภาพ" sectionId="files" />
                {openSections.files && (
                <div className="p-6">
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