import React, { useState, useMemo } from 'react';
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

    const [actionType, setActionType] = useState<UsedPartDispositionType>('จำหน่าย');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState<UsedPartCondition>('พอใช้');
    const [salePricePerUnit, setSalePricePerUnit] = useState(0);
    const [soldTo, setSoldTo] = useState('');
    const [notes, setNotes] = useState('');
    
    const remainingQuantity = useMemo(() => {
        const initialQty = part.initialQuantity || 0;
        const disposedQty = (dispositions || []).reduce((sum, d) => sum + (d.quantity || 0), 0);
        return initialQty - disposedQty;
    }, [part.initialQuantity, dispositions]);

    const handleAddDisposition = () => {
        if (quantity <= 0) {
            addToast('จำนวนต้องมากกว่า 0', 'warning');
            return;
        }
        if (quantity > remainingQuantity) {
            addToast(`จำนวนต้องไม่เกินที่เหลือ (${remainingQuantity})`, 'warning');
            return;
        }
        if (actionType === 'จำหน่าย' && (!soldTo.trim() || salePricePerUnit < 0)) {
            addToast('กรุณากรอกผู้ซื้อและราคาขาย', 'warning');
            return;
        }

        const newDisposition: UsedPartDisposition = {
            id: `DISP-${Date.now()}`,
            quantity,
            dispositionType: actionType,
            condition,
            date: new Date().toISOString(),
            soldTo: actionType === 'จำหน่าย' ? soldTo : undefined,
            salePricePerUnit: actionType === 'จำหน่าย' ? salePricePerUnit : undefined,
            notes,
        };
        
        setDispositions(prev => [...prev, newDisposition]);

        // Reset form
        setQuantity(1);
        setSalePricePerUnit(0);
        setSoldTo('');
        setNotes('');
    };

    const handleRemoveDisposition = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
            setDispositions(prev => prev.filter(d => d.id !== id));
        }
    };
    
    const handleSave = () => {
        const newDisposedQty = dispositions.reduce((sum, d) => sum + d.quantity, 0);
        let newStatus: UsedPartBatchStatus = 'รอจัดการ';
        if (newDisposedQty >= part.initialQuantity) {
            newStatus = 'จัดการครบแล้ว';
        } else if (newDisposedQty > 0) {
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
            case 'จำหน่าย': return 'bg-green-100 text-green-800';
            case 'ทำลาย': return 'bg-red-100 text-red-800';
            case 'เก็บไว้ใช้ต่อ': return 'bg-purple-100 text-purple-800';
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
                        <span className="font-bold">คงเหลือ: {remainingQuantity} {part.unit}</span>
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
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ซื้อ/หมายเหตุ</th>
                                        <th className="px-2 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y">
                                    {dispositions.map(d => (
                                        <tr key={d.id}>
                                            <td className="px-2 py-2 text-sm">{new Date(d.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-2 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${getDispositionTypeBadge(d.dispositionType)}`}>{d.dispositionType}</span></td>
                                            <td className="px-2 py-2 text-right text-sm">{d.quantity} {part.unit}</td>
                                            <td className="px-2 py-2 text-right text-sm">{d.salePricePerUnit?.toLocaleString() || '-'}</td>
                                            <td className="px-2 py-2 text-sm">{d.soldTo || d.notes || '-'}</td>
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
                    {remainingQuantity > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">เพิ่มรายการจัดการใหม่</h4>
                        <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium">การดำเนินการ</label>
                                <select value={actionType} onChange={e => setActionType(e.target.value as any)} className="w-full p-2 border rounded-lg mt-1">
                                    <option value="จำหน่าย">จำหน่าย</option>
                                    <option value="ทำลาย">ทำลาย</option>
                                    <option value="เก็บไว้ใช้ต่อ">เก็บไว้ใช้ต่อ</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">จำนวน</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" max={remainingQuantity} className="w-full p-2 border rounded-lg mt-1"/>
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
                             
                             {actionType === 'จำหน่าย' && (
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