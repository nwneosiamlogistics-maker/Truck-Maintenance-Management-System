import React, { useState, useEffect } from 'react';
import type { Tool, ToolStatus } from '../types';
import { useToast } from '../context/ToastContext';

interface ToolModalProps {
    tool: Tool | null;
    onSave: (tool: Tool) => void;
    onClose: () => void;
    existingTools: Tool[];
}

const TOOL_STATUSES: ToolStatus[] = ['ปกติ', 'ชำรุด', 'สูญหาย', 'ส่งซ่อม'];

const TOOL_CATEGORIES = [
    '1️⃣ เครื่องมือวัดและตรวจสอบ (Measuring & Inspection Tools)',
    '2️⃣ เครื่องมือช่างมือ (Hand Tools)',
    '3️⃣ เครื่องมือไฟฟ้าและลม (Power & Air Tools)',
    '4️⃣ เครื่องมือเฉพาะงานซ่อมรถบรรทุก (Specialty Tools)',
];


const ToolModal: React.FC<ToolModalProps> = ({ tool, onSave, onClose, existingTools }) => {
    const { addToast } = useToast();

    const getInitialState = (): Omit<Tool, 'id' | 'quantityCheckedOut'> => {
        if (tool) {
            return {
                ...tool,
                importDate: tool.importDate ? new Date(tool.importDate).toISOString().split('T')[0] : '',
            };
        }
        return {
            code: '',
            name: '',
            assetNumber: null,
            model: null,
            category: TOOL_CATEGORIES[0],
            brand: null,
            serialNumber: null,
            totalQuantity: 1,
            storageLocation: null,
            status: 'ปกติ',
            lowStockThreshold: 0,
            importDate: new Date().toISOString().split('T')[0],
            distributorName: null,
            distributorAddress: null,
            distributorContact: null,
            manualRefNumber: null,
            usageDetails: null,
            mechanicalProperties: null,
            electricalData: null,
            recordedBy: null,
            notes: null,
        };
    };

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        setFormData(getInitialState());
    }, [tool]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = (type === 'number')
            ? (value === '' ? null : Number(value))
            : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.name.trim()) {
            addToast('กรุณากรอกรหัสและชื่อเครื่องมือ', 'warning');
            return;
        }

        if (!tool) { // Check for duplicates only when creating
            const isDuplicate = existingTools.some(t =>
                t.code.trim().toLowerCase() === formData.code.trim().toLowerCase() ||
                t.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
            );
            if (isDuplicate) {
                addToast('รหัสหรือชื่อเครื่องมือนี้มีอยู่แล้ว', 'error');
                return;
            }
        }
        
        onSave({ 
            ...formData, 
            id: tool?.id || '', 
            quantityCheckedOut: tool?.quantityCheckedOut || 0 
        } as Tool);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form id="tool-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-2xl font-bold">{tool ? 'แก้ไขข้อมูลเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}</h3>
                         <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <h4 className="font-semibold text-lg border-b pb-2">ข้อมูลหลัก</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">รหัสเครื่องมือ *</label>
                                <input type="text" name="code" value={formData.code} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อเครื่องมือ *</label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมายเลขทรัพย์สิน</label>
                                <input type="text" name="assetNumber" value={formData.assetNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg bg-white">
                                    {TOOL_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                                <input type="text" name="brand" value={formData.brand || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                                <input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมายเลขเครื่อง</label>
                                <input type="text" name="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                         <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลสต็อก</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">จำนวนทั้งหมด *</label>
                                <input type="number" name="totalQuantity" value={formData.totalQuantity ?? ''} onChange={handleInputChange} min="1" required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">จุดสั่งซื้อขั้นต่ำ</label>
                                <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold ?? ''} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                                <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg">
                                    {TOOL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">ที่เก็บ</label>
                                <input type="text" name="storageLocation" value={formData.storageLocation || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลการจัดซื้อและคู่มือ</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">วันที่ซื้อ / นำเข้า</label>
                                <input type="date" name="importDate" value={formData.importDate} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">เลขที่อ้างอิงคู่มือ</label>
                                <input type="text" name="manualRefNumber" value={formData.manualRefNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ผู้ขาย / ตัวแทนจำหน่าย</label>
                                <input type="text" name="distributorName" value={formData.distributorName || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ข้อมูลติดต่อ (โทรศัพท์, อีเมล)</label>
                                <input type="text" name="distributorContact" value={formData.distributorContact || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">ที่อยู่ผู้ขาย</label>
                            <textarea name="distributorAddress" value={formData.distributorAddress || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        
                         <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลทางเทคนิค</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">รายละเอียดการใช้งาน</label>
                            <textarea name="usageDetails" value={formData.usageDetails || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">ข้อมูลทางกล (แรงดึง, แรงกด)</label>
                            <textarea name="mechanicalProperties" value={formData.mechanicalProperties || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">ข้อมูลทางไฟฟ้า (โวลต์, แอมป์, วัตต์)</label>
                            <textarea name="electricalData" value={formData.electricalData || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        
                         <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลเพิ่มเติม</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ผู้บันทึก</label>
                                <input type="text" name="recordedBy" value={formData.recordedBy || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                         </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                    
                    <div className="p-6 border-t flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ToolModal;