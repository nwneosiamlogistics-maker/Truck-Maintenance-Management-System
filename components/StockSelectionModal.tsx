import React, { useState, useMemo } from 'react';
import type { StockItem, PartRequisitionItem } from '../types';

interface StockSelectionModalProps {
    stock: StockItem[];
    onClose: () => void;
    onAddParts: (parts: PartRequisitionItem[]) => void;
    existingParts: PartRequisitionItem[];
}

const StockSelectionModal: React.FC<StockSelectionModalProps> = ({ stock, onClose, onAddParts, existingParts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});

    const existingPartIds = useMemo(() => {
        return new Set((Array.isArray(existingParts) ? existingParts : []).map(p => p.partId));
    }, [existingParts]);

    const filteredStock = useMemo(() => {
        return stock.filter(item =>
            item.quantity > 0 && (
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [stock, searchTerm]);

    const handleToggleSelection = (partId: string) => {
        setSelectedParts(prev => {
            const newSelection = { ...prev };
            if (newSelection[partId]) {
                delete newSelection[partId];
            } else {
                newSelection[partId] = 1; // Default to 1 when selected
            }
            return newSelection;
        });
    };

    const handleQuantityChange = (partId: string, quantity: number, maxQuantity: number) => {
        if (quantity > maxQuantity) {
            quantity = maxQuantity;
        }
        if (quantity < 1) {
            quantity = 1;
        }
        setSelectedParts(prev => ({ ...prev, [partId]: quantity }));
    };

    const handleAdd = () => {
        const partsToAdd: PartRequisitionItem[] = Object.entries(selectedParts)
            .map(([partId, quantity]) => {
                const stockItem = stock.find(s => s.id === partId);
                if (!stockItem) return null;
                return {
                    partId: stockItem.id,
                    name: stockItem.name,
                    code: stockItem.code,
                    quantity: quantity,
                    unit: stockItem.unit,
                    unitPrice: stockItem.price,
                    source: 'สต็อกอู่',
                };
            })
            .filter((p): p is PartRequisitionItem => p !== null);
            
        onAddParts(partsToAdd);
    };

    const selectionCount = Object.keys(selectedParts).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[110] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">เลือกอะไหล่จากสต็อก</h3>
                         <input
                            type="text"
                            placeholder="ค้นหาชื่อ หรือ รหัสอะไหล่..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-1/2 p-2 border border-gray-300 rounded-lg text-base"
                        />
                    </div>
                </div>

                <div className="p-2 overflow-y-auto flex-1">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 w-12"></th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคา</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">คงเหลือ</th>
                                <th className="px-4 py-3 w-32 text-center text-sm font-medium text-gray-500 uppercase">จำนวนเบิก</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStock.map(item => {
                                const isSelected = !!selectedParts[item.id];
                                const isAlreadyAdded = existingPartIds.has(item.id);
                                return (
                                    <tr key={item.id} className={`transition-colors ${isAlreadyAdded ? 'bg-gray-200 opacity-60' : (isSelected ? 'bg-blue-100' : 'hover:bg-blue-50')}`}>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelection(item.id)}
                                                disabled={isAlreadyAdded}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="text-base font-semibold">{item.name}</div>
                                            <div className="text-sm text-gray-500">{item.code}{isAlreadyAdded && <span className="text-red-500 font-semibold ml-2">(มีในรายการแล้ว)</span>}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-base">{item.price.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-base font-bold">{item.quantity} {item.unit}</td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.quantity}
                                                value={selectedParts[item.id] || ''}
                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value), item.quantity)}
                                                disabled={!isSelected || isAlreadyAdded}
                                                className="w-full p-1 border border-gray-300 rounded-md text-center disabled:bg-gray-100"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t flex justify-between items-center bg-gray-50">
                     <p className="text-base font-semibold">
                        {selectionCount > 0 ? `เลือกแล้ว ${selectionCount} รายการ` : 'ยังไม่ได้เลือกรายการ'}
                    </p>
                    <div className="space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button 
                            type="button" 
                            onClick={handleAdd}
                            disabled={selectionCount === 0}
                            className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            เพิ่มอะไหล่
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockSelectionModal;
