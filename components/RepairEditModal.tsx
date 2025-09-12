import React, { useState, useEffect } from 'react';
import type { Repair, Technician, StockItem, RepairStatus, PartRequisitionItem } from '../types';
import StockSelectionModal from './StockSelectionModal';
import { useToast } from '../context/ToastContext';
import TechnicianMultiSelect from './TechnicianMultiSelect';

interface RepairEditModalProps {
    repair: Repair;
    onSave: (repair: Repair) => void;
    onClose: () => void;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
}

const RepairEditModal: React.FC<RepairEditModalProps> = ({ repair, onSave, onClose, technicians, stock, setStock }) => {
    const [formData, setFormData] = useState<Repair>({
        ...repair,
        parts: repair.parts || [],
        attachments: repair.attachments || [],
        assignedTechnicians: repair.assignedTechnicians || [],
    });
    const { addToast } = useToast();
    const [isStockModalOpen, setStockModalOpen] = useState(false);

    useEffect(() => {
        setFormData({
            ...repair,
            parts: repair.parts || [],
            attachments: repair.attachments || [],
            assignedTechnicians: repair.assignedTechnicians || [],
        });
    }, [repair]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as RepairStatus;
        const now = new Date().toISOString();
        const updates: Partial<Repair> = { status: newStatus };

        if (newStatus === 'กำลังซ่อม' && !formData.repairStartDate) {
            updates.repairStartDate = now;
        }
        if (newStatus === 'ซ่อมเสร็จ' && !formData.repairEndDate) {
            updates.repairEndDate = now;
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleAddPartsFromStock = (newParts: PartRequisitionItem[]) => {
        const partsToAdd = newParts.filter(np => !(formData.parts || []).some(p => p.partId === np.partId));
        setFormData(prev => ({ ...prev, parts: [...(prev.parts || []), ...partsToAdd]}));
        setStockModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const originalStatus = repair.status;
        const newStatus = formData.status;
        
        // Stock adjustment logic on completion
        if (originalStatus !== 'ซ่อมเสร็จ' && newStatus === 'ซ่อมเสร็จ') {
            let canComplete = true;
            const stockUpdates = new Map<string, number>();

            (formData.parts || []).forEach(part => {
                if (part.source === 'สต็อกอู่') {
                    const stockItem = stock.find(s => s.id === part.partId);
                    if (!stockItem || stockItem.quantity < part.quantity) {
                        addToast(`สต็อกไม่พอสำหรับ ${part.name}`, 'error');
                        canComplete = false;
                    } else {
                        stockUpdates.set(part.partId, part.quantity);
                    }
                }
            });

            if (!canComplete) return;

            setStock(prevStock => {
                return prevStock.map(s => {
                    if (stockUpdates.has(s.id)) {
                        const newQuantity = s.quantity - (stockUpdates.get(s.id) || 0);
                        return { ...s, quantity: newQuantity };
                    }
                    return s;
                });
            });
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">แก้ไขใบแจ้งซ่อม: {repair.repairOrderNo}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="repair-edit-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Form fields for editing repair */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">สถานะ</label>
                            <select name="status" value={formData.status} onChange={handleStatusChange} className="w-full p-2 border rounded-lg mt-1">
                                <option value="รอซ่อม">รอซ่อม</option>
                                <option value="กำลังซ่อม">กำลังซ่อม</option>
                                <option value="รออะไหล่">รออะไหล่</option>
                                <option value="ซ่อมเสร็จ">ซ่อมเสร็จ</option>
                                <option value="ยกเลิก">ยกเลิก</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">มอบหมายช่าง</label>
                            <TechnicianMultiSelect
                                allTechnicians={technicians}
                                selectedTechnicianIds={formData.assignedTechnicians}
                                onChange={(ids) => setFormData(prev => ({...prev, assignedTechnicians: ids}))}
                           />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">รายละเอียดปัญหา</label>
                        <textarea name="problemDescription" value={formData.problemDescription} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-lg mt-1" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">ผลการซ่อม</label>
                        <textarea name="repairResult" value={formData.repairResult || ''} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-lg mt-1" />
                    </div>
                    <button type="button" onClick={() => setStockModalOpen(true)} className="w-full text-blue-600 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-blue-500 hover:bg-blue-50">
                           + เพิ่มอะไหล่จากสต็อก
                    </button>
                    {/* Display parts */}
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="repair-edit-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
                {isStockModalOpen && (
                    <StockSelectionModal stock={stock} onClose={() => setStockModalOpen(false)} onAddParts={handleAddPartsFromStock} existingParts={formData.parts} />
                )}
            </div>
        </div>
    );
};

export default RepairEditModal;