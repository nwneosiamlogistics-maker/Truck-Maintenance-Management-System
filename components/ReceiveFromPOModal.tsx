import React, { useState, useMemo } from 'react';
import type { PurchaseRequisition, StockItem, StockTransaction } from '../types';
import { useToast } from '../context/ToastContext';
import { calculateStockStatus } from '../utils';
import { uploadToNAS } from '../utils/nasUpload';
import { uploadFileToStorage } from '../utils/fileUpload';

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
    const [photos, setPhotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { addToast } = useToast();

    const receivablePrs = useMemo(() => {
        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : []).filter(
            pr => pr.status === 'รอสินค้า' && pr.requestType === 'Product'
        );
    }, [purchaseRequisitions]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        const uploaded: string[] = [];
        let failCount = 0;
        for (const file of Array.from(files)) {
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                const prNum = receivablePrs.find(pr => pr.id === selectedPrId)?.prNumber || selectedPrId;
                const path = `truck-maintenance/receive-stock/${prNum}/${Date.now()}_${safeName}`;
                const url = ext === 'pdf'
                    ? await uploadToNAS(file, path)
                    : await uploadFileToStorage(file, path);
                uploaded.push(url);
            } catch (err) {
                console.error('Upload error:', err);
                failCount++;
            }
        }
        setIsUploading(false);
        e.target.value = '';
        if (uploaded.length > 0) {
            setPhotos(prev => [...prev, ...uploaded]);
            addToast(`อัปโหลดสำเร็จ ${uploaded.length} ไฟล์${failCount > 0 ? ` (ล้มเหลว ${failCount})` : ''}`, 'success');
        } else {
            addToast('อัปโหลดไม่สำเร็จ กรุณาลองใหม่', 'error');
        }
    };

    const handleRemoveFile = (url: string) => {
        setPhotos(prev => prev.filter(f => f !== url));
    };

    const handleReceive = () => {
        const prToReceive = receivablePrs.find(pr => pr.id === selectedPrId);
        if (!prToReceive) {
            addToast('กรุณาเลือกใบขอซื้อที่ต้องการรับของ', 'warning');
            return;
        }
        if (photos.length === 0) {
            addToast('กรุณาแนบหลักฐานการรับของอย่างน้อย 1 ไฟล์', 'warning');
            return;
        }

        const safePhotos = Array.isArray(photos) ? photos : [];

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
                ? { ...pr, status: 'รับของแล้ว', updatedAt: new Date().toISOString(), photos: safePhotos }
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
                    <button onClick={onClose} aria-label="ปิด" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label htmlFor="pr-select" className="block text-base font-medium text-gray-700 mb-1">เลือกใบขอซื้อ *</label>
                        <select
                            id="pr-select"
                            value={selectedPrId}
                            onChange={e => { setSelectedPrId(e.target.value); setPhotos([]); }}
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
                    {selectedPrDetails && (
                        <div className="border-2 border-dashed border-red-300 rounded-xl p-4 bg-red-50">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-semibold text-red-700 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        หลักฐานการรับของ <span className="text-red-500">*</span>
                                    </h4>
                                    <p className="text-xs text-red-500 mt-0.5">บังคับแนบอย่างน้อย 1 ไฟล์ (รูปภาพหรือ PDF) ก่อนยืนยัน</p>
                                </div>
                                <div className="flex gap-2">
                                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        ถ่ายรูป
                                        <input type="file" accept="image/*" capture="environment" disabled={isUploading} onChange={handleFileUpload} className="hidden" aria-label="ถ่ายรูปด้วยกล้อง" />
                                    </label>
                                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                        {isUploading ? (
                                            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>อัปโหลด...</>
                                        ) : (
                                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>แนบไฟล์</>
                                        )}
                                        <input type="file" accept="image/*,.pdf,image/heic,image/heif" multiple disabled={isUploading} onChange={handleFileUpload} className="hidden" aria-label="แนบหลักฐานการรับของ" />
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">รองรับ: รูปภาพ (JPG, PNG, HEIC) และ PDF — อัปโหลดไปยัง NAS</p>

                            {photos.length === 0 ? (
                                <div className="text-center py-6 text-red-400">
                                    <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-sm font-medium">ยังไม่มีไฟล์ — กรุณาแนบหลักฐานการรับของ</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {photos.map((url, idx) => {
                                        const isPdf = url.toLowerCase().includes('.pdf');
                                        const fileName = decodeURIComponent(url.split('/').pop()?.split('?').shift() || `ไฟล์ ${idx + 1}`);
                                        return (
                                            <div key={url} className="relative group">
                                                {isPdf ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
                                                        <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                                                        <span className="text-xs text-gray-600 max-w-[100px] truncate">{fileName}</span>
                                                    </a>
                                                ) : (
                                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                                        className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                                                        <img src={url} alt={`หลักฐาน ${idx + 1}`} className="w-full h-full object-cover" />
                                                    </a>
                                                )}
                                                <button type="button" onClick={() => handleRemoveFile(url)}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="ลบไฟล์นี้" aria-label="ลบไฟล์">×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button
                        type="button"
                        onClick={handleReceive}
                        disabled={!selectedPrId || photos.length === 0 || isUploading}
                        title={!selectedPrId ? 'กรุณาเลือกใบขอซื้อ' : photos.length === 0 ? 'กรุณาแนบหลักฐานการรับของก่อน' : ''}
                        className={`px-8 py-2 text-base font-medium text-white rounded-lg transition-colors ${(!selectedPrId || photos.length === 0 || isUploading) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการรับของ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveFromPOModal;