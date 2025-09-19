import React, { useState, useMemo } from 'react';
import type { PurchaseRequisition, PurchaseRequisitionStatus, StockItem, StockTransaction, Supplier } from '../types';
import PurchaseRequisitionModal from './PurchaseRequisitionModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword, calculateStockStatus } from '../utils';

interface PurchaseRequisitionProps {
    purchaseRequisitions: PurchaseRequisition[];
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    suppliers: Supplier[];
}

const PurchaseRequisitionPage: React.FC<PurchaseRequisitionProps> = ({ purchaseRequisitions, setPurchaseRequisitions, stock, setStock, setTransactions, suppliers }) => {
    const [statusFilter, setStatusFilter] = useState<PurchaseRequisitionStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequisition, setEditingRequisition] = useState<PurchaseRequisition | null>(null);
    const { addToast } = useToast();
    const [expandedPrIds, setExpandedPrIds] = useState<Set<string>>(new Set());

    const toggleExpand = (prId: string) => {
        setExpandedPrIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(prId)) {
                newSet.delete(prId);
            } else {
                newSet.add(prId);
            }
            return newSet;
        });
    };

    const filteredRequisitions = useMemo(() => {
        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => statusFilter === 'all' || pr.status === statusFilter)
            .filter(pr => searchTerm === '' || pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) || pr.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseRequisitions, statusFilter, searchTerm]);

    const handleOpenModal = (requisition: PurchaseRequisition | null = null) => {
        setEditingRequisition(requisition);
        setIsModalOpen(true);
    };

    const handleReceiveStock = (pr: PurchaseRequisition) => {
        if (pr.requestType === 'Product') {
            const safeItems = Array.isArray(pr.items) ? pr.items : [];
            setStock(prevStock => {
                const newStock = [...prevStock];
                safeItems.forEach(item => {
                    const stockIndex = newStock.findIndex(s => s.id === item.stockId);
                    if (stockIndex > -1) {
                        const stockItem = newStock[stockIndex];
                        const newQuantity = stockItem.quantity + item.quantity;
                        const newStatus = calculateStockStatus(newQuantity, stockItem.minStock, stockItem.maxStock);
                        newStock[stockIndex] = { ...stockItem, quantity: newQuantity, status: newStatus };
                    }
                });
                return newStock;
            });

            const newTransactions: StockTransaction[] = safeItems.map(item => ({
                id: `TXN-${Date.now()}-${item.stockId}`,
                stockItemId: item.stockId,
                stockItemName: item.name,
                type: 'รับเข้า',
                quantity: item.quantity,
                transactionDate: new Date().toISOString(),
                actor: 'ระบบ (จากใบขอซื้อ)',
                notes: `รับของตามใบขอซื้อ ${pr.prNumber}`,
                relatedRepairOrder: '',
                pricePerUnit: item.unitPrice,
            }));

            setTransactions(prev => [...newTransactions, ...prev]);
            addToast(`รับของจาก ${pr.prNumber} เข้าสต็อกเรียบร้อย`, 'info');
        } else {
             addToast(`ปิดงานใบขอซื้อ ${pr.prNumber} (${pr.requestType}) เรียบร้อย`, 'info');
        }
    };

    const handleSaveRequisition = (requisitionData: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt'> | PurchaseRequisition) => {
        const now = new Date();
        const year = now.getFullYear();

        if ('id' in requisitionData) { // Editing existing one
            const updatedRequisition = { ...requisitionData, updatedAt: now.toISOString() };
            setPurchaseRequisitions(prev => prev.map(pr => pr.id === updatedRequisition.id ? updatedRequisition : pr));
            addToast(`อัปเดตใบขอซื้อ ${updatedRequisition.prNumber} สำเร็จ`, 'success');

            const originalRequisition = purchaseRequisitions.find(pr => pr.id === updatedRequisition.id);
            if (originalRequisition?.status !== 'รับของแล้ว' && updatedRequisition.status === 'รับของแล้ว') {
                handleReceiveStock(updatedRequisition);
            }

        } else { // Creating new one
            const currentYearPrs = (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
                .filter(pr => new Date(pr.createdAt).getFullYear() === year);
            const lastPrNumber = currentYearPrs
                .map(pr => {
                    const parts = pr.prNumber.split('-');
                    return parts.length === 3 ? parseInt(parts[2], 10) : 0;
                })
                .reduce((max, num) => Math.max(max, num), 0);
            const newSequence = lastPrNumber + 1;
            const newPrNumber = `PR-${year}-${String(newSequence).padStart(5, '0')}`;
            
            const newRequisition: PurchaseRequisition = {
                ...requisitionData,
                id: `PR-${Date.now()}`,
                prNumber: newPrNumber,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            setPurchaseRequisitions(prev => [newRequisition, ...prev]);
            addToast(`สร้างใบขอซื้อ ${newRequisition.prNumber} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequisition = (prId: string, prNumber: string) => {
        if (promptForPassword('ลบใบขอซื้อ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบขอซื้อ ${prNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            setPurchaseRequisitions(prev => prev.filter(pr => pr.id !== prId));
            addToast(`ลบใบขอซื้อ ${prNumber} สำเร็จ`, 'info');
        }
    };

    const handleCancelRequisition = (prId: string, prNumber: string) => {
        if (promptForPassword('ยกเลิกใบขอซื้อ')) {
            setPurchaseRequisitions(prev =>
                prev.map(pr =>
                    pr.id === prId
                        ? { ...pr, status: 'ยกเลิก', updatedAt: new Date().toISOString() }
                        : pr
                )
            );
            addToast(`ยกเลิกใบขอซื้อ ${prNumber} สำเร็จ`, 'info');
        }
    };

    const handleQuickStatusUpdate = (pr: PurchaseRequisition, newStatus: PurchaseRequisitionStatus) => {
        const prompts = {
            'อนุมัติแล้ว': `คุณต้องการอนุมัติใบขอซื้อ ${pr.prNumber} ใช่หรือไม่?`,
            'รอสินค้า': `ยืนยันการสั่งซื้อสำหรับ ${pr.prNumber} ใช่หรือไม่?`,
            'รับของแล้ว': `ยืนยันการรับของสำหรับ ${pr.prNumber} ใช่หรือไม่?`
        };
        const promptMessage = prompts[newStatus];
        if (promptMessage && !window.confirm(promptMessage)) return;

        let updatedRequisition: PurchaseRequisition = { ...pr, status: newStatus, updatedAt: new Date().toISOString() };

        if (newStatus === 'อนุมัติแล้ว' && !pr.approvalDate) {
            updatedRequisition.approverName = 'ผู้จัดการ'; // Placeholder for user system
            updatedRequisition.approvalDate = new Date().toISOString();
        }
        
        setPurchaseRequisitions(prev => prev.map(p => p.id === updatedRequisition.id ? updatedRequisition : p));
        
        if (newStatus === 'รับของแล้ว') {
            handleReceiveStock(updatedRequisition);
        } else {
            addToast(`อัปเดตสถานะ ${pr.prNumber} เป็น "${newStatus}" เรียบร้อย`, 'success');
        }
    };
    
    const getStatusBadge = (status: PurchaseRequisitionStatus) => {
        switch (status) {
            case 'ฉบับร่าง': return 'bg-gray-200 text-gray-800';
            case 'รออนุมัติ': return 'bg-yellow-100 text-yellow-800';
            case 'อนุมัติแล้ว': return 'bg-green-100 text-green-800';
            case 'รอสินค้า': return 'bg-blue-100 text-blue-800';
            case 'รับของแล้ว': return 'bg-purple-100 text-purple-800';
            case 'ยกเลิก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };

    const renderActions = (pr: PurchaseRequisition) => {
        switch (pr.status) {
            case 'ฉบับร่าง':
                return (
                    <>
                        <button onClick={() => handleOpenModal(pr)} className="text-blue-600 hover:text-blue-800 font-medium">ดู/แก้ไข</button>
                        <button onClick={() => handleDeleteRequisition(pr.id, pr.prNumber)} className="text-gray-500 hover:text-gray-700 font-medium">ลบ</button>
                        <button onClick={() => handleCancelRequisition(pr.id, pr.prNumber)} className="text-red-500 hover:text-red-700 font-medium">ยกเลิก</button>
                    </>
                );
            case 'รออนุมัติ':
                return (
                    <>
                        <button onClick={() => handleQuickStatusUpdate(pr, 'อนุมัติแล้ว')} className="text-white bg-green-500 hover:bg-green-600 font-medium px-3 py-1 rounded-md text-sm">อนุมัติ</button>
                        <button onClick={() => handleOpenModal(pr)} className="text-gray-600 hover:text-gray-800 font-medium">ดู</button>
                        <button onClick={() => handleCancelRequisition(pr.id, pr.prNumber)} className="text-red-500 hover:text-red-700 font-medium ml-2">ยกเลิก</button>
                    </>
                );
            case 'อนุมัติแล้ว':
                return (
                     <>
                        <button onClick={() => handleQuickStatusUpdate(pr, 'รอสินค้า')} className="text-white bg-blue-500 hover:bg-blue-600 font-medium px-3 py-1 rounded-md text-sm">ยืนยันสั่งซื้อ</button>
                        <button onClick={() => handleOpenModal(pr)} className="text-gray-600 hover:text-gray-800 font-medium">ดู</button>
                        <button onClick={() => handleCancelRequisition(pr.id, pr.prNumber)} className="text-red-500 hover:text-red-700 font-medium ml-2">ยกเลิก</button>
                    </>
                );
            case 'รอสินค้า':
                 return (
                     <>
                        <button onClick={() => handleQuickStatusUpdate(pr, 'รับของแล้ว')} className="text-white bg-purple-500 hover:bg-purple-600 font-medium px-3 py-1 rounded-md text-sm">รับของ</button>
                        <button onClick={() => handleOpenModal(pr)} className="text-gray-600 hover:text-gray-800 font-medium">ดู</button>
                        <button onClick={() => handleCancelRequisition(pr.id, pr.prNumber)} className="text-red-500 hover:text-red-700 font-medium ml-2">ยกเลิก</button>
                    </>
                );
            case 'รับของแล้ว':
            case 'ยกเลิก':
                 return <button onClick={() => handleOpenModal(pr)} className="text-blue-600 hover:text-blue-800 font-medium">ดู</button>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (เลขที่, ผู้จำหน่าย)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                        <option value="all">สถานะทั้งหมด</option>
                        <option value="ฉบับร่าง">ฉบับร่าง</option>
                        <option value="รออนุมัติ">รออนุมัติ</option>
                        <option value="อนุมัติแล้ว">อนุมัติแล้ว</option>
                        <option value="รอสินค้า">รอสินค้า</option>
                        <option value="รับของแล้ว">รับของแล้ว</option>
                        <option value="ยกเลิก">ยกเลิก</option>
                    </select>
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + สร้างใบขอซื้อใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center"></th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ / วันที่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้จำหน่าย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้ขอซื้อ</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ยอดรวม</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequisitions.map(pr => (
                             <React.Fragment key={pr.id}>
                                <tr className="hover:bg-gray-50">
                                     <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleExpand(pr.id)} className="text-blue-500 hover:text-blue-700 font-bold text-lg w-6 h-6 rounded-full flex items-center justify-center">
                                            {expandedPrIds.has(pr.id) ? '−' : '+'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3"><div className="font-semibold">{pr.prNumber}</div><div className="text-sm text-gray-500">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</div></td>
                                    <td className="px-4 py-3 text-base">{pr.supplier}</td>
                                    <td className="px-4 py-3 text-base">{pr.requesterName}</td>
                                    <td className="px-4 py-3 text-right text-base font-bold">{pr.totalAmount.toLocaleString()} บาท</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(pr.status)}`}>{pr.status}</span></td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                                        {renderActions(pr)}
                                    </td>
                                </tr>
                                 {expandedPrIds.has(pr.id) && (
                                    <tr>
                                        <td colSpan={7} className="p-0 bg-gray-50">
                                            <div className="p-4 mx-4 my-2 border-l-4 border-blue-400 bg-blue-50 rounded-r-lg">
                                                <h4 className="font-semibold mb-2 text-gray-700 text-base">รายการในใบขอซื้อ:</h4>
                                                <table className="min-w-full bg-white rounded-lg shadow-inner">
                                                    <thead className="bg-gray-200">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">รายการ</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">จำนวน</th>
                                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase">หน่วย</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">ราคา/หน่วย</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">กำหนดส่ง</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">รวม (บาท)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {(Array.isArray(pr.items) && pr.items.length > 0) ? pr.items.map((item, index) => (
                                                            <tr key={index}>
                                                                <td className="px-3 py-2 text-sm font-medium">{item.name}</td>
                                                                <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                                                                <td className="px-3 py-2 text-sm text-center">{item.unit}</td>
                                                                <td className="px-3 py-2 text-sm text-right">{item.unitPrice.toLocaleString()}</td>
                                                                <td className="px-3 py-2 text-sm">{new Date(item.deliveryOrServiceDate).toLocaleDateString('th-TH')}</td>
                                                                <td className="px-3 py-2 text-sm text-right font-semibold">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                            </tr>
                                                        )) : (
                                                            <tr>
                                                                <td colSpan={6} className="text-center py-4 text-gray-500">ไม่มีรายการ</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredRequisitions.length === 0 && ( <tr><td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูลใบขอซื้อ</td></tr> )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <PurchaseRequisitionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRequisition}
                    stockItems={stock}
                    initialRequisition={editingRequisition}
                    suppliers={suppliers}
                />
            )}
        </div>
    );
};

export default PurchaseRequisitionPage;