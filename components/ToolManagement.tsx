import React, { useState, useMemo, useEffect } from 'react';
import type { Tool, ToolTransaction, Technician, ToolStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';
import PhotoUpload from './PhotoUpload';

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
            photos: [],
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
        setPhotos(tool?.photos || []);
    }, [tool]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = (type === 'number')
            ? (value === '' ? null : Number(value))
            : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

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

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                id: tool?.id || '',
                quantityCheckedOut: tool?.quantityCheckedOut || 0,
                photos,
            } as Tool);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        } finally {
            setTimeout(() => setIsSubmitting(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form id="tool-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-2xl font-bold">{tool ? 'แก้ไขข้อมูลเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}</h3>
                        <button type="button" aria-label="Close modal" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <h4 className="font-semibold text-lg border-b pb-2">ข้อมูลหลัก</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">รหัสเครื่องมือ *</label>
                                <input type="text" name="code" aria-label="รหัสเครื่องมือ" value={formData.code} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อเครื่องมือ *</label>
                                <input type="text" name="name" aria-label="ชื่อเครื่องมือ" value={formData.name} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมายเลขทรัพย์สิน</label>
                                <input type="text" name="assetNumber" aria-label="หมายเลขทรัพย์สิน" value={formData.assetNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                                <select name="category" aria-label="หมวดหมู่" value={formData.category} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg bg-white">
                                    {TOOL_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                                <input type="text" name="brand" aria-label="ยี่ห้อ" value={formData.brand || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                                <input type="text" name="model" aria-label="รุ่น" value={formData.model || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมายเลขเครื่อง</label>
                                <input type="text" name="serialNumber" aria-label="หมายเลขเครื่อง" value={formData.serialNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลสต็อก</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">จำนวนทั้งหมด *</label>
                                <input type="number" name="totalQuantity" aria-label="จำนวนทั้งหมด" value={formData.totalQuantity ?? ''} onChange={handleInputChange} min="1" required className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">จุดสั่งซื้อขั้นต่ำ</label>
                                <input type="number" name="lowStockThreshold" aria-label="จุดสั่งซื้อขั้นต่ำ" value={formData.lowStockThreshold ?? ''} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                                <select name="status" aria-label="สถานะ" value={formData.status} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg">
                                    {TOOL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ที่เก็บ</label>
                                <input type="text" name="storageLocation" aria-label="ที่เก็บ" value={formData.storageLocation || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลการจัดซื้อและคู่มือ</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">วันที่ซื้อ / นำเข้า</label>
                                <input type="date" name="importDate" aria-label="วันที่ซื้อ" value={formData.importDate} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">เลขที่อ้างอิงคู่มือ</label>
                                <input type="text" name="manualRefNumber" aria-label="เลขที่อ้างอิงคู่มือ" value={formData.manualRefNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ผู้ขาย / ตัวแทนจำหน่าย</label>
                                <input type="text" name="distributorName" aria-label="ผู้ขาย" value={formData.distributorName || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ข้อมูลติดต่อ (โทรศัพท์, อีเมล)</label>
                                <input type="text" name="distributorContact" aria-label="ข้อมูลติดต่อ" value={formData.distributorContact || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ที่อยู่ผู้ขาย</label>
                            <textarea name="distributorAddress" aria-label="ที่อยู่ผู้ขาย" value={formData.distributorAddress || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลทางเทคนิค</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">รายละเอียดการใช้งาน</label>
                            <textarea name="usageDetails" aria-label="รายละเอียดการใช้งาน" value={formData.usageDetails || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ข้อมูลทางกล (แรงดึง, แรงกด)</label>
                            <textarea name="mechanicalProperties" aria-label="ข้อมูลทางกล" value={formData.mechanicalProperties || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ข้อมูลทางไฟฟ้า (โวลต์, แอมป์, วัตต์)</label>
                            <textarea name="electricalData" aria-label="ข้อมูลทางไฟฟ้า" value={formData.electricalData || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">ข้อมูลเพิ่มเติม</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ผู้บันทึก</label>
                                <input type="text" name="recordedBy" aria-label="ผู้บันทึก" value={formData.recordedBy || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                            <textarea name="notes" aria-label="หมายเหตุ" value={formData.notes || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>

                        <h4 className="font-semibold text-lg border-b pb-2 mt-6">📷 รูปภาพประกอบ</h4>
                        <PhotoUpload
                            photos={photos}
                            onChange={setPhotos}
                            entity="tools"
                            entityId={tool?.id || 'new'}
                        />
                    </div>

                    <div className="p-6 border-t flex justify-end gap-4">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ยกเลิก</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[100px]">
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface ToolManagementProps {
    tools: Tool[];
    setTools: React.Dispatch<React.SetStateAction<Tool[]>>;
    transactions: ToolTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<ToolTransaction[]>>;
    technicians: Technician[];
}

const ToolManagement: React.FC<ToolManagementProps> = ({ tools, setTools, transactions, setTransactions, technicians }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

    const handleCheckout = () => addToast('ฟังก์ชันยืมเครื่องมือยังไม่เปิดใช้งาน', 'info');
    const handleCheckIn = () => addToast('ฟังก์ชันคืนเครื่องมือยังไม่เปิดใช้งาน', 'info');

    const safeTools = useMemo(() => Array.isArray(tools) ? tools : [], [tools]);
    const safeTransactions = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions]);

    const handleOpenModal = (tool: Tool | null = null) => {
        setEditingTool(tool);
        setIsModalOpen(true);
    };

    const handleSaveTool = (toolData: Tool) => {
        if (toolData.id) { // Editing
            setTools(prev => prev.map(t => t.id === toolData.id ? toolData : t));
            addToast(`อัปเดตข้อมูลเครื่องมือ '${toolData.name}' สำเร็จ`, 'success');
        } else { // Adding
            const newTool: Tool = {
                ...toolData,
                id: `TOOL-${Date.now()}`,
                quantityCheckedOut: 0,
            };
            setTools(prev => [newTool, ...prev]);
            addToast(`เพิ่มเครื่องมือใหม่ '${newTool.name}' สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteTool = async (tool: Tool) => {
        if (tool.quantityCheckedOut > 0) {
            addToast(`ไม่สามารถลบ '${tool.name}' ได้เนื่องจากมีผู้ยืมอยู่`, 'error');
            return;
        }
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบ '${tool.name}'?`, 'ลบ');
            if (confirmed) {
                setTools(prev => prev.filter(t => t.id !== tool.id));
                addToast(`ลบเครื่องมือ '${tool.name}' สำเร็จ`, 'info');
            }
        }
    };

    const TabButton: React.FC<{ tabId: 'inventory' | 'history', label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <TabButton tabId="inventory" label="คลังเครื่องมือ" />
                    <TabButton tabId="history" label="ประวัติยืม-คืน" />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCheckout} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">ยืม</button>
                    <button onClick={handleCheckIn} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600">คืน</button>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-600">+ เพิ่มเครื่องมือใหม่</button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อเครื่องมือ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ยี่ห้อ / รุ่น</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน (ทั้งหมด / ยืม)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่เก็บ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {safeTools.map(tool => {
                                const toolPhotos = Array.isArray(tool.photos) ? tool.photos.filter(Boolean) : [];
                                return (
                                    <tr key={tool.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {toolPhotos.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLightbox({ photos: toolPhotos, index: 0 })}
                                                        className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                                                        title={`ดูรูปภาพ (${toolPhotos.length} รูป)`}
                                                    >
                                                        <img
                                                            src={toolPhotos[0]}
                                                            alt={tool.name}
                                                            className="w-full h-full object-cover"
                                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    </button>
                                                ) : (
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs border border-gray-200">
                                                        📷
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold">{tool.name}</div>
                                                    <div className="text-sm text-gray-500">{tool.code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><div className="font-semibold">{tool.brand || '-'}</div><div className="text-sm text-gray-500">{tool.model || '-'}</div></td>
                                        <td className="px-4 py-3">{tool.category}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-bold text-lg">{tool.totalQuantity}</span> / <span className="text-orange-600">{tool.quantityCheckedOut}</span>
                                        </td>
                                        <td className="px-4 py-3">{tool.status}</td>
                                        <td className="px-4 py-3">{tool.storageLocation}</td>
                                        <td className="px-4 py-3 text-center space-x-2">
                                            {toolPhotos.length > 0 && (
                                                <button onClick={() => setLightbox({ photos: toolPhotos, index: 0 })} className="text-blue-500 hover:text-blue-700 font-medium" title="ดูรูปภาพทั้งหมด">
                                                    📷 {toolPhotos.length}
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenModal(tool)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                            <button onClick={() => handleDeleteTool(tool)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภท</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เครื่องมือ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {safeTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3">{new Date(tx.transactionDate).toLocaleString('th-TH')}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${tx.type === 'ยืม' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{tx.type}</span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{tx.toolName}</td>
                                    <td className="px-4 py-3 text-right">{tx.quantity}</td>
                                    <td className="px-4 py-3">{tx.technicianName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <ToolModal
                    tool={editingTool}
                    onSave={handleSaveTool}
                    onClose={() => setIsModalOpen(false)}
                    existingTools={safeTools}
                />
            )}

            {lightbox && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex flex-col items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightbox(null)}
                            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 z-10"
                            aria-label="ปิด"
                        >
                            ✕
                        </button>
                        <img
                            src={lightbox.photos[lightbox.index]}
                            alt={`รูปที่ ${lightbox.index + 1}`}
                            className="w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                        />
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null)}
                                disabled={lightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ‹ ก่อนหน้า
                            </button>
                            <span className="text-white text-sm">{lightbox.index + 1} / {lightbox.photos.length}</span>
                            <button
                                onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null)}
                                disabled={lightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ถัดไป ›
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 justify-center flex-wrap">
                            {lightbox.photos.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLightbox(prev => prev ? { ...prev, index: idx } : null)}
                                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === lightbox.index ? 'border-blue-400' : 'border-transparent hover:border-gray-400'}`}
                                >
                                    <img src={url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolManagement;