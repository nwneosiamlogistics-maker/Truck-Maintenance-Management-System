import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseRequisition, StockItem, StockTransaction } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus } from '../utils';

interface ReceiveFromPOModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseRequisitions: PurchaseRequisition[];
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
}

const ReceiveFromPOModal: React.FC<ReceiveFromPOModalProps> = ({
    isOpen,
    onClose,
    purchaseRequisitions,
    setPurchaseRequisitions,
    setStock,
    setTransactions,
}) => {
    const [selectedPrId, setSelectedPrId] = useState('');
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
    const { addToast } = useToast();

    const prsToReceive = useMemo(() => {
        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : []).filter(
            pr => pr.status === 'รอสินค้า' && pr.requestType === 'Product'
        );
    }, [purchaseRequisitions]);

    const selectedPr = useMemo(() => {
        return prsToReceive.find(pr => pr.id === selectedPrId);
    }, [prsToReceive, selectedPrId]);

    useEffect(() => {
        if (selectedPr) {
            const initialQuantities: Record<string, number> = {};
            (selectedPr.items || []).forEach(item => {
                initialQuantities[item.stockId] = item.quantity;
            });
            setReceivedQuantities(initialQuantities);
        } else {
            setReceivedQuantities({});
        }
    }, [selectedPr]);

    const handleQuantityChange = (stockId: string, value: string, max: number) => {
        let numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            numValue = 0;
        }
        if (numValue > max) {
            numValue = max;
        }
        setReceivedQuantities(prev => ({ ...prev, [stockId]: numValue }));
    };

    const handleSubmit = () => {
        if (!selectedPr) {
            addToast('กรุณาเลือกใบขอซื้อ', 'warning');
            return;
        }

        // 1. Update stock quantities and status
        setStock(prevStock => {
            const newStock = [...prevStock];
            (selectedPr.items || []).forEach(item => {
                const receivedQty = receivedQuantities[item.stockId] || 0;
                if (receivedQty > 0) {
                    const stockIndex = newStock.findIndex(s => s.id === item.stockId);
                    if (stockIndex > -1) {
                        const stockItem = newStock[stockIndex];
                        const newQuantity = Number(stockItem.quantity) + receivedQty;
                        
                        const newStatus = calculateStockStatus(newQuantity, stockItem.minStock, stockItem.maxStock);
                        
                        newStock[stockIndex] = { ...stockItem, quantity: newQuantity, status: newStatus };
                    }
                }
            });
            return newStock;
        });

        // 2. Create transactions
        const newTransactions: StockTransaction[] = (selectedPr.items || [])
            .map((item): StockTransaction | null => {
                const receivedQty = receivedQuantities[item.stockId] || 0;
                if (receivedQty > 0) {
                    return {
                        id: `TXN-${Date.now()}-${item.stockId}`,
                        stockItemId: item.stockId,
                        stockItemName: item.name,
                        type: 'รับเข้า',
                        quantity: receivedQty,
                        transactionDate: new Date().toISOString(),
                        actor: 'ระบบ (จากใบขอซื้อ)',
                        notes: `รับของตามใบขอซื้อ ${selectedPr.prNumber}`,
                        relatedRepairOrder: '',
                        pricePerUnit: item.unitPrice,
                    };
                }
                return null;
            })
            .filter((t): t is StockTransaction => t !== null);
        
        if (newTransactions.length > 0) {
            setTransactions(prev => [...newTransactions, ...prev]);
        }

        // 3. Update PR status
        setPurchaseRequisitions(prevPrs => 
            prevPrs.map(pr => 
                pr.id === selectedPrId 
                    ? { ...pr, status: 'รับของแล้ว', updatedAt: new Date().toISOString() } 
                    : pr
            )
        );

        addToast(`รับของจาก ${selectedPr.prNumber} เข้าสต็อกเรียบร้อย`, 'success');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h4 className="font-bold text-lg">รับของเข้าสตอกจากใบขอซื้อ</h4>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">เลือกใบขอซื้อ (PR)</label>
                        <select
                            value={selectedPrId}
                            onChange={e => setSelectedPrId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">-- กรุณาเลือก --</option>
                            {prsToReceive.map(pr => (
                                <option key={pr.id} value={pr.id}>
                                    {pr.prNumber} - {pr.supplier} ({ (pr.items || []).map(item => `${item.name} (x${item.quantity})`).join(', ') })
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPr && (
                        <div>
                            <h5 className="font-semibold mb-2">รายการในใบขอซื้อ</h5>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ชื่อสินค้า</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวนสั่ง</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">จำนวนรับ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(selectedPr.items || []).map(item => (
                                        <tr key={item.stockId}>
                                            <td className="px-4 py-2">{item.name}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity} {item.unit}</td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={receivedQuantities[item.stockId] || ''}
                                                    onChange={e => handleQuantityChange(item.stockId, e.target.value, item.quantity)}
                                                    className="w-24 p-1 border rounded-md text-right"
                                                    max={item.quantity}
                                                    min="0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedPr}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
                    >
                        ยืนยันการรับของ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveFromPOModal;