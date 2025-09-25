import React, { useState, useMemo, useEffect } from 'react';
import type { UsedPart, UsedPartDisposition, UsedPartDispositionType, UsedPartCondition, UsedPartBatchStatus, UsedPartBuyer } from '../types';
import { useToast } from '../context/ToastContext';

interface ManageUsedPartBatchModalProps {
    part: UsedPart;
    onSave: (updatedPart: UsedPart) => void;
    onClose: () => void;
    buyers: UsedPartBuyer[];
}

const ManageUsedPartBatchModal: React.FC<ManageUsedPartBatchModalProps> = ({ part, onSave, onClose, buyers }) => {
    const { addToast } = useToast();
    
    const [dispositions, setDispositions] = useState<UsedPartDisposition[]>(part.dispositions || []);
    const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

    const { availableForManagement, isManagingKeptStock, remainingFromInitialBatch } = useMemo(() => {
        const initialQty = part.initialQuantity || 0;
        
        const keptQty = dispositions
            .filter(d => d.dispositionType === 'เก็บไว้ใช้ต่อ')
            .reduce((sum, d) => sum + d.quantity, 0);

        const usedFromKeptQty = dispositions
            .filter(d => d.dispositionType === 'นำไปใช้แล้ว')
            .reduce((sum, d) => sum + d.quantity, 0);
            
        const soldOrDisposedQty = dispositions
            .filter(d => ['ขาย', 'ทิ้ง'].includes(d.dispositionType))
            .reduce((sum, d) => sum + d.quantity, 0);
        
        const totalDisposedFromInitial = soldOrDisposedQty + keptQty;
        const remainingFromInitialBatch = Math.max(0, initialQty - totalDisposedFromInitial);

        const availableFromKept = Math.max(0, keptQty - usedFromKeptQty);

        const availableForManagement = remainingFromInitialBatch + availableFromKept;
        
        const isManagingKeptStock = remainingFromInitialBatch <= 0 && availableFromKept > 0;

        return { availableForManagement, isManagingKeptStock, remainingFromInitialBatch };
    }, [part.initialQuantity, dispositions]);

    const [actionType, setActionType] = useState<UsedPartDispositionType>('ขาย');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState<UsedPartCondition>('พอใช้');
    const [salePricePerUnit, setSalePricePerUnit] = useState(0);
    const [soldTo, setSoldTo] = useState('');
    const [storageLocation, setStorageLocation] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        setActionType(isManagingKeptStock ? 'นำไปใช้แล้ว' : 'ขาย');
    }, [isManagingKeptStock]);

    const handleAddDisposition = () => {
        if (quantity <= 0) {
            addToast('จำนวนต้องมากกว่า 0', 'warning');
            return;
        }
        if (quantity > availableForManagement) {
            addToast(`จำนวนต้องไม่เกินที่เหลือ (${availableForManagement})`, 'warning');
            return;
        }
        if (actionType === 'ขาย' && (!soldTo.trim() || salePricePerUnit < 0)) {
            addToast('กรุณากรอกผู้ซื้อและราคาขาย', 'warning');
            return;
        }
         if (actionType === 'เก็บไว้ใช้ต่อ' && !storageLocation.trim()) {
            addToast('กรุณาระบุตำแหน่งจัดเก็บ', 'warning');
            return;
        }

        const newDisposition: UsedPartDisposition = {
            id: `DISP-${Date.now()}`,
            quantity,
            dispositionType: actionType,
            condition,
            date: new Date().toISOString(),
            soldTo: actionType === 'ขาย' ? soldTo : null,
            salePricePerUnit: actionType === 'ขาย' ? salePricePerUnit : null,
            storageLocation: actionType === 'เก็บไว้ใช้ต่อ' ? storageLocation : null,
            notes,
        };
        
        setDispositions(prev => [...prev, newDisposition]);
        setNewlyAddedId(newDisposition.id);
        setTimeout(() => setNewlyAddedId(null), 2000); // Highlight for 2 seconds

        // Reset form
        setQuantity(1);
        setSalePricePerUnit(0);
        setSoldTo('');
        setStorageLocation('');
        setNotes('');
    };

    const handleRemoveDisposition = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
            setDispositions(prev => prev.filter(d => d.id !== id));
        }
    };
    
    const handleSave = () => {
        const totalDisposedQty = dispositions.reduce((sum, d) => sum + d.quantity, 0);
        let newStatus: UsedPartBatchStatus = 'รอจัดการ';

        if (totalDisposedQty >= part.initialQuantity) {
            newStatus = 'จัดการครบแล้ว';
        } else if (totalDisposedQty > 0) {
            newStatus = 'จัดการบางส่วน';
        }
        
        const updatedPart: UsedPart = {
            ...part,
            dispositions,
            status: newStatus,
        };
        onSave(updatedPart);
        addToast(`อัปเดตข้อมูล ${part.name} สำเร็จ`, 'success');
        onClose();
    };

    const getDispositionTypeBadge = (type: UsedPartDispositionType) => {
        switch (type) {
            case 'ขาย': return 'bg-green-100 text-green-800';
            case 'ทิ้ง': return 'bg-red-100 text-red-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
            case 'ย้ายไปคลังหมุนเวียน': return 'bg-blue-100 text-blue-800';
            case 'ย้ายไปสต็อกของเก่ารวม': return 'bg-indigo-100 text-indigo-800';
            case 'นำไปใช้แล้ว': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDispositionDetails = (disp: UsedPartDisposition) => {
        switch (disp.dispositionType) {
            case 'ขาย': {
                const buyerInfo = disp.soldTo || '';
                const noteInfo = disp.notes ? `(${disp.notes})` : '';
                return [buyerInfo, noteInfo].filter(Boolean).join(' ').trim() || '-';
            }
            case 'เก็บไว้ใช้ต่อ':
                return `ที่เก็บ: ${disp.storageLocation || 'ไม่ได้ระบุ'}`;
            case 'ทิ้ง':
            case 'นำไปใช้แล้ว':
            case 'ย้ายไปคลังหมุนเวียน':
            case 'ย้ายไปสต็อกของเก่ารวม':
                return disp.notes || '-';
            default:
                return '-';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-2xl font-bold text-gray-800">จัดการชุดอะไหล่เก่า: {part.name}</h3>
                    <div className="flex gap-4 text-base text-gray-600">
                        <span>ที่มา: {part.fromRepairOrderNo}</span>
                        <span>จำนวนเริ่มต้น: {part.initialQuantity || 0} {part.unit}</span>
                        <span className="font-bold">คงเหลือให้จัดการ: {availableForManagement} {part.unit}</span>
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Dispositions History */}
                    <div>
                        <h4 className="font-semibold mb-2">ประวัติการจัดการ</h4>
                        <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                             <table className="min-w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">การดำเนินการ</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ซื้อ / ที่เก็บ / หมายเหตุ</th>
                                        <th className="px-2 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y">
                                    {dispositions.map(d => (
                                        <tr key={d.id} className={`${newlyAddedId === d.id ? 'bg-blue-100' : ''} transition-colors duration-1000`}>
                                            <td className="px-2 py-2 text-sm">{new Date(d.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-2 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${getDispositionTypeBadge(d.dispositionType)}`}>{d.dispositionType}</span></td>
                                            <td className="px-2 py-2 text-right text-sm">{d.quantity} {part.unit}</td>
                                            <td className="px-2 py-2 text-right text-sm">{d.salePricePerUnit?.toLocaleString() || '-'}</td>
                                            <td className="px-2 py-2 text-sm">{getDispositionDetails(d)}</td>
                                            <td className="px-2 py-2 text-center">
                                                <button onClick={() => handleRemoveDisposition(d.id)} className="text-red-500 hover:text-red-700">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>

                    {/* Add Action Form */}
                    {availableForManagement > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">
                           {isManagingKeptStock ? "บันทึกการนำของเก่าไปใช้/ทิ้ง/ขาย" : "บันทึกการจัดการ"}
                        </h4>
                         {isManagingKeptStock && <p className="text-sm text-gray-600 mb-2">สำหรับบันทึกการนำอะไหล่ที่ท่านเคย "เก็บไว้ใช้ต่อ" ออกไปจัดการในขั้นตอนสุดท้าย</p>}
                        <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium">การดำเนินการ</label>
                                <select value={actionType} onChange={e => setActionType(e.target.value as any)} className="w-full p-2 border rounded-lg mt-1">
                                    {isManagingKeptStock ? (
                                        <>
                                            <option value="นำไปใช้แล้ว">นำไปใช้แล้ว</option>
                                            <option value="ทิ้ง">ทิ้ง</option>
                                            <option value="ขาย">ขาย</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="ขาย">ขาย</option>
                                            <option value="ทิ้ง">ทิ้ง</option>
                                            <option value="เก็บไว้ใช้ต่อ">เก็บไว้ใช้ต่อ</option>
                                            <option value="นำไปใช้แล้ว">นำไปใช้แล้ว</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">จำนวน</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" max={availableForManagement} className="w-full p-2 border rounded-lg mt-1"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">สภาพ</label>
                                <select value={condition} onChange={e => setCondition(e.target.value as any)} className="w-full p-2 border rounded-lg mt-1">
                                    <option value="ดีมาก">ดีมาก</option>
                                    <option value="ดี">ดี</option>
                                    <option value="พอใช้">พอใช้</option>
                                    <option value="ต้องซ่อม">ต้องซ่อม</option>
                                    <option value="ชำรุด">ชำรุด</option>
                                </select>
                            </div>
                             <button onClick={handleAddDisposition} className="px-4 py-2 bg-blue-500 text-white rounded-lg h-10">เพิ่มรายการ</button>
                             
                             {actionType === 'ขาย' && (
                                <>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium">ผู้รับซื้อ</label>
                                    <input list="buyer-list" type="text" value={soldTo} onChange={e => setSoldTo(e.target.value)} className="w-full p-2 border rounded-lg mt-1"/>
                                    <datalist id="buyer-list">
                                        {buyers.map(b => <option key={b.id} value={b.name} />)}
                                    </datalist>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium">ราคาขาย/หน่วย (บาท)</label>
                                    <input type="number" value={salePricePerUnit} onChange={e => setSalePricePerUnit(Number(e.target.value))} min="0" className="w-full p-2 border rounded-lg mt-1"/>
                                </div>
                                </>
                             )}

                            {actionType === 'เก็บไว้ใช้ต่อ' && (
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-medium">ตำแหน่งจัดเก็บ</label>
                                    <input type="text" value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="เช่น ชั้น A-1, โกดัง B" className="w-full p-2 border rounded-lg mt-1"/>
                                </div>
                            )}
                              <div className="md:col-span-4">
                                <label className="block text-sm font-medium">หมายเหตุ</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded-lg mt-1"/>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                        ยกเลิก
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave}
                        className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                        บันทึกการเปลี่ยนแปลง
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageUsedPartBatchModal;