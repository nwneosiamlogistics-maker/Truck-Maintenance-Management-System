import React, { useState, useMemo } from 'react';
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

const ReceiveFromPOModal: React.FC<ReceiveFromPOModalProps> = ({ isOpen, onClose, purchaseRequisitions, setPurchaseRequisitions, setStock, setTransactions }) => {
    const [selectedPrId, setSelectedPrId] = useState<string>('');
    const { addToast } = useToast();

    const receivablePrs = useMemo(() => {
        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : []).filter(
            pr => pr.status === 'รอสินค้า' && pr.requestType === 'Product'
        );
    }, [purchaseRequisitions]);

    const handleReceive = () => {
        const prToReceive = receivablePrs.find(pr => pr.id === selectedPrId);
        if (!prToReceive) {
            addToast('กรุณาเลือกใบขอซื้อที่ต้องการรับของ', 'warning');
            return;
        }

        // 1. Update stock
        setStock(prevStock => {
            const newStock = [...prevStock];
            (prToReceive.items || []).forEach(item => {
                if (item.stockId) { // Only update items that are part of the stock
                    const stockIndex = newStock.findIndex(s => s.id === item.stockId);
                    if (stockIndex > -1) {
                        const stockItem = newStock[stockIndex];
                        const newQuantity = stockItem.quantity + item.quantity;
                        stockItem.quantity = newQuantity;
                        stockItem.status = calculateStockStatus(newQuantity, stockItem.minStock, stockItem.maxStock);
                    }
                }
            });
            return newStock;
        });

        // 2. Create transactions
        const newTransactions: StockTransaction[] = (prToReceive.items || [])
            .filter(item => item.stockId) // Only create transactions for stock items
            .map(item => ({
                id: `TXN-IN-${Date.now()}-${item.stockId}`,
                stockItemId: item.stockId,
                stockItemName: item.name,
                type: 'รับเข้า',
                quantity: item.quantity,
                transactionDate: new Date().toISOString(),
                actor: 'ระบบ (รับจากใบขอซื้อ)',
                notes: `จากใบขอซื้อเลขที่ ${prToReceive.prNumber}`,
                documentNumber: prToReceive.prNumber,
                pricePerUnit: item.unitPrice,
            }));
        if (newTransactions.length > 0) {
            setTransactions(prev => [...newTransactions, ...prev]);
        }
        
        // 3. Update PR status
        setPurchaseRequisitions(prev => prev.map(pr =>
            pr.id === selectedPrId
                ? { ...pr, status: 'รับของแล้ว', updatedAt: new Date().toISOString() }
                : pr
        ));

        addToast(`รับของสำหรับใบขอซื้อ ${prToReceive.prNumber} สำเร็จ`, 'success');
        onClose();
    };

    if (!isOpen) return null;

    const selectedPrDetails = receivablePrs.find(pr => pr.id === selectedPrId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">รับของเข้าสต็อก (จากใบขอซื้อ)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">เลือกใบขอซื้อ *</label>
                        <select
                            value={selectedPrId}
                            onChange={e => setSelectedPrId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="" disabled>-- เลือกใบขอซื้อ --</option>
                            {receivablePrs.map(pr => (
                                <option key={pr.id} value={pr.id}>
                                    {pr.prNumber} - {pr.supplier} (สถานะ: {pr.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPrDetails && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-semibold mb-2">รายการที่จะรับเข้า:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {(selectedPrDetails.items || []).map((item, index) => (
                                    <li key={`${item.stockId}-${index}`}>
                                        {item.name} ({item.stockCode || 'N/A'}) - จำนวน: {item.quantity} {item.unit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {receivablePrs.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            <p>ไม่มีใบขอซื้อที่รอรับสินค้า</p>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button
                        type="button"
                        onClick={handleReceive}
                        disabled={!selectedPrId}
                        className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                        ยืนยันการรับของ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveFromPOModal;