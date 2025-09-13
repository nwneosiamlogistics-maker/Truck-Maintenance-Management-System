import React, { useState } from 'react';
import type { UsedPart, UsedPartBuyer } from '../types';

interface SellUsedPartModalProps {
    part: UsedPart;
    buyers: UsedPartBuyer[];
    onSave: (partId: string, saleData: {
        buyerName: string;
        salePrice: number;
        saleDate: string;
        notes: string;
    }) => void;
    onClose: () => void;
}

const SellUsedPartModal: React.FC<SellUsedPartModalProps> = ({ part, buyers, onSave, onClose }) => {
    const [buyerName, setBuyerName] = useState('');
    const [salePrice, setSalePrice] = useState(0);
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(part.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerName.trim() || salePrice <= 0) {
            alert('กรุณากรอกชื่อผู้รับซื้อและราคาขายให้ถูกต้อง');
            return;
        }
        onSave(part.id, { buyerName, salePrice, saleDate, notes });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">บันทึกการขายอะไหล่เก่า</h3>
                        <p className="text-base text-gray-500">{part.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="sell-part-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">ผู้รับซื้อ *</label>
                        <input
                            list="buyer-list"
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            required
                        />
                        <datalist id="buyer-list">
                            {buyers.map(b => <option key={b.id} value={b.name} />)}
                        </datalist>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">ราคาขาย (บาท) *</label>
                            <input
                                type="number"
                                value={salePrice}
                                onChange={(e) => setSalePrice(Number(e.target.value))}
                                min="0"
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">วันที่ขาย *</label>
                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        ></textarea>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="sell-part-form" className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                        ยืนยันการขาย
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SellUsedPartModal;