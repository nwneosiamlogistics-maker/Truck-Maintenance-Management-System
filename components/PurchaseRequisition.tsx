
import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseRequisition, PurchaseRequisitionStatus, StockItem, StockTransaction, Supplier } from '../types';
import PurchaseRequisitionModal from './PurchaseRequisitionModal';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, calculateStockStatus, formatCurrency } from '../utils';
import { uploadToNAS } from '../utils/nasUpload';
import { uploadFileToStorage } from '../utils/fileUpload';

interface PurchaseRequisitionProps {
    purchaseRequisitions: PurchaseRequisition[];
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    suppliers: Supplier[];
}

const STATUS_FILTER_ORDER: { value: PurchaseRequisitionStatus | 'all', label: string }[] = [
    { value: 'all', label: 'สถานะทั้งหมด' },
    { value: 'ฉบับร่าง', label: 'ฉบับร่าง' },
    { value: 'รออนุมัติ', label: 'รออนุมัติ' },
    { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
    { value: 'ออก PO แล้ว', label: 'ออก PO แล้ว' },
    { value: 'รอสินค้า', label: 'รอสินค้า' },
    { value: 'รับของแล้ว', label: 'รับของแล้ว' },
    { value: 'ยกเลิก', label: 'ยกเลิก' },
];


const PurchaseRequisitionComponent: React.FC<PurchaseRequisitionProps> = ({ purchaseRequisitions, setPurchaseRequisitions, stock, setStock, setTransactions, suppliers }) => {
    const [statusFilter, setStatusFilter] = useState<PurchaseRequisitionStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequisition, setEditingRequisition] = useState<PurchaseRequisition | null>(null);
    const { addToast } = useToast();
    const [expandedPrIds, setExpandedPrIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [receivingPr, setReceivingPr] = useState<PurchaseRequisition | null>(null);
    const [receiveFiles, setReceiveFiles] = useState<string[]>([]);
    const [isReceiveUploading, setIsReceiveUploading] = useState(false);

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
        // Define the desired sort order for statuses to bring active items to the top
        const statusOrder: Record<PurchaseRequisitionStatus, number> = {
            'รออนุมัติ': 1,
            'อนุมัติแล้ว': 2,
            'ออก PO แล้ว': 2.5,
            'รอสินค้า': 3,
            'ฉบับร่าง': 4,
            'รับของแล้ว': 5,
            'ยกเลิก': 6,
        };

        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => statusFilter === 'all' || pr.status === statusFilter)
            .filter(pr => searchTerm === '' || pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) || pr.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                // When viewing 'all', sort by status order first, then by date
                if (statusFilter === 'all') {
                    const orderA = statusOrder[a.status];
                    const orderB = statusOrder[b.status];
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                }
                // For specific status filters or as a secondary sort, use creation date
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [purchaseRequisitions, statusFilter, searchTerm]);

    const totalPages = useMemo(() => Math.ceil(filteredRequisitions.length / itemsPerPage), [filteredRequisitions.length, itemsPerPage]);
    const paginatedRequisitions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRequisitions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRequisitions, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, itemsPerPage]);

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

    const handleDeleteRequisition = async (prId: string, prNumber: string) => {
        if (await promptForPasswordAsync('ลบใบขอซื้อ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบใบขอซื้อ ${prNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบ');
            if (confirmed) {
                setPurchaseRequisitions(prev => prev.filter(pr => pr.id !== prId));
                addToast(`ลบใบขอซื้อ ${prNumber} สำเร็จ`, 'info');
            }
        }
    };

    const handleCancelRequisition = async (prId: string, prNumber: string) => {
        if (await promptForPasswordAsync('ยกเลิกใบขอซื้อ')) {
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

    const handleReceiveFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !receivingPr) return;
        setIsReceiveUploading(true);
        const uploaded: string[] = [];
        let failCount = 0;
        for (const file of Array.from(files)) {
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                const path = `truck-maintenance/receive-pr/${receivingPr.prNumber}/${Date.now()}_${safeName}`;
                const url = ext === 'pdf'
                    ? await uploadToNAS(file, path)
                    : await uploadFileToStorage(file, path);
                uploaded.push(url);
            } catch (err) {
                console.error('Upload error:', err);
                failCount++;
            }
        }
        setIsReceiveUploading(false);
        e.target.value = '';
        if (uploaded.length > 0) {
            setReceiveFiles(prev => [...prev, ...uploaded]);
            addToast(`อัปโหลดสำเร็จ ${uploaded.length} ไฟล์${failCount > 0 ? ` (ล้มเหลว ${failCount})` : ''}`, 'success');
        } else {
            addToast('อัปโหลดไม่สำเร็จ กรุณาลองใหม่', 'error');
        }
    };

    const handleConfirmReceivePr = () => {
        if (!receivingPr) return;
        const updatedRequisition: PurchaseRequisition = {
            ...receivingPr,
            status: 'รับของแล้ว',
            updatedAt: new Date().toISOString(),
            photos: receiveFiles,
        };
        setPurchaseRequisitions(prev => prev.map(p => p.id === updatedRequisition.id ? updatedRequisition : p));
        handleReceiveStock(updatedRequisition);
        setReceivingPr(null);
        setReceiveFiles([]);
    };

    const handleQuickStatusUpdate = async (pr: PurchaseRequisition, newStatus: PurchaseRequisitionStatus) => {
        if (newStatus === 'รับของแล้ว') {
            setReceivingPr(pr);
            setReceiveFiles([]);
            return;
        }
        const prompts: Partial<Record<PurchaseRequisitionStatus, string>> = {
            'อนุมัติแล้ว': `คุณต้องการอนุมัติใบขอซื้อ ${pr.prNumber} ใช่หรือไม่?`,
            'รอสินค้า': `ยืนยันการสั่งซื้อสำหรับ ${pr.prNumber} ใช่หรือไม่?`,
        };
        const promptMessage = prompts[newStatus];
        if (promptMessage) {
            const confirmed = await confirmAction('ยืนยันสถานะ', promptMessage, 'ยืนยัน');
            if (!confirmed) return;
        }
        let updatedRequisition: PurchaseRequisition = { ...pr, status: newStatus, updatedAt: new Date().toISOString() };
        if (newStatus === 'อนุมัติแล้ว' && !pr.approvalDate) {
            updatedRequisition.approverName = 'ผู้จัดการ';
            updatedRequisition.approvalDate = new Date().toISOString();
        }
        setPurchaseRequisitions(prev => prev.map(p => p.id === updatedRequisition.id ? updatedRequisition : p));
        addToast(`อัปเดตสถานะ ${pr.prNumber} เป็น "${newStatus}" เรียบร้อย`, 'success');
    };

    const getStatusBadge = (status: PurchaseRequisitionStatus) => {
        switch (status) {
            case 'ฉบับร่าง': return 'bg-gray-200 text-gray-800';
            case 'รออนุมัติ': return 'bg-yellow-100 text-yellow-800';
            case 'อนุมัติแล้ว': return 'bg-green-100 text-green-800';
            case 'ออก PO แล้ว': return 'bg-indigo-100 text-indigo-800';
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
            case 'ออก PO แล้ว':
                return (
                    <>
                        <button onClick={() => handleQuickStatusUpdate(pr, 'รับของแล้ว')} className="text-white bg-purple-500 hover:bg-purple-600 font-medium px-3 py-1 rounded-md text-sm">รับของ</button>
                        <button onClick={() => handleOpenModal(pr)} className="text-gray-600 hover:text-gray-800 font-medium">ดู</button>
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
                        aria-label="ค้นหาใบขอซื้อ"
                        placeholder="ค้นหา (เลขที่, ผู้จำหน่าย)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                    />
                    <select aria-label="กรองสถานะ" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-base">
                        {STATUS_FILTER_ORDER.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + สร้างใบขอซื้อใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50 sticky top-0 z-10">
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
                        {paginatedRequisitions.map(pr => (
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
                                    <td className="px-4 py-3 text-right text-base font-bold">{formatCurrency(pr.totalAmount)} บาท</td>
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
                                                                <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                                                                <td className="px-3 py-2 text-sm">{new Date(item.deliveryOrServiceDate).toLocaleDateString('th-TH')}</td>
                                                                <td className="px-3 py-2 text-sm text-right font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</td>
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
                        {paginatedRequisitions.length === 0 && (<tr><td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูลใบขอซื้อ</td></tr>)}
                    </tbody>

                </table>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {paginatedRequisitions.map(pr => (
                        <div key={pr.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-lg text-blue-800">{pr.prNumber}</div>
                                    <div className="text-xs text-gray-500">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusBadge(pr.status)}`}>
                                    {pr.status}
                                </span>
                            </div>

                            <div className="text-sm space-y-1">
                                <p className="text-gray-700"><span className="font-semibold text-gray-500">ผู้จำหน่าย:</span> {pr.supplier}</p>
                                <p className="text-gray-700"><span className="font-semibold text-gray-500">ผู้ขอซื้อ:</span> {pr.requesterName}</p>
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg mt-2">
                                    <span className="text-xs text-gray-500">ราคารวม</span>
                                    <span className="font-bold text-blue-600 text-lg">{formatCurrency(pr.totalAmount)} บาท</span>
                                </div>
                            </div>

                            {/* Expandable Items Section for Mobile */}
                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => toggleExpand(pr.id)}
                                    className="w-full text-left text-xs font-semibold text-gray-500 flex justify-between items-center py-1"
                                >
                                    รายการในใบขอซื้อ ({pr.items?.length || 0})
                                    <span>{expandedPrIds.has(pr.id) ? '▲' : '▼'}</span>
                                </button>
                                {expandedPrIds.has(pr.id) && (
                                    <div className="bg-gray-50 rounded p-2 mt-1 space-y-2 text-xs">
                                        {pr.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                                                <span className="truncate flex-1 pr-2">{item.name}</span>
                                                <span className="text-gray-600 whitespace-nowrap">x{item.quantity} {item.unit}</span>
                                                <span className="text-gray-600 font-medium ml-2">{formatCurrency(item.quantity * item.unitPrice)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex gap-2 justify-end flex-wrap">
                                {renderActions(pr)}
                            </div>
                        </div>
                    ))}
                    {paginatedRequisitions.length === 0 && (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
                            ไม่พบข้อมูลใบขอซื้อ
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="items-per-page" className="text-sm font-medium">แสดง:</label>
                    <select
                        id="items-per-page"
                        aria-label="Items per page"
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        className="p-1 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-700">
                        จาก {filteredRequisitions.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
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

            {/* Receive PR Modal — บังคับแนบไฟล์ */}
            {receivingPr && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[102] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">รับของ — {receivingPr.prNumber}</h3>
                            <button onClick={() => { setReceivingPr(null); setReceiveFiles([]); }} aria-label="ปิด" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                                <p><strong>ผู้จำหน่าย:</strong> {receivingPr.supplier}</p>
                                <p><strong>ยอดรวม:</strong> {formatCurrency(receivingPr.totalAmount)} บาท</p>
                            </div>
                            <div className="border-2 border-dashed border-red-300 rounded-xl p-4 bg-red-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-red-700">หลักฐานการรับของ <span className="text-red-500">*</span></h4>
                                        <p className="text-xs text-red-500 mt-0.5">บังคับแนบอย่างน้อย 1 ไฟล์ก่อนยืนยัน</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* ถ่ายรูปด้วยกล้อง */}
                                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isReceiveUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            ถ่ายรูป
                                            <input type="file" accept="image/*" capture="environment" disabled={isReceiveUploading} onChange={handleReceiveFileUpload} className="hidden" aria-label="ถ่ายรูปด้วยกล้อง" />
                                        </label>
                                        {/* เลือกไฟล์จากเครื่อง */}
                                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isReceiveUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                            {isReceiveUploading ? (
                                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>อัปโหลด...</>
                                            ) : (
                                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>แนบไฟล์</>
                                            )}
                                            <input type="file" accept="image/*,.pdf,image/heic,image/heif" multiple disabled={isReceiveUploading} onChange={handleReceiveFileUpload} className="hidden" aria-label="แนบหลักฐานการรับของ" />
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">รองรับ: รูปภาพ (JPG, PNG, HEIC) และ PDF — อัปโหลดไปยัง NAS</p>
                                {receiveFiles.length === 0 ? (
                                    <div className="text-center py-5 text-red-400">
                                        <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <p className="text-sm font-medium">ยังไม่มีไฟล์ — กรุณาแนบหลักฐานการรับของ</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {receiveFiles.map((url, idx) => {
                                            const isPdf = url.toLowerCase().includes('.pdf');
                                            const fileName = decodeURIComponent(url.split('/').pop()?.split('?').shift() || `ไฟล์ ${idx + 1}`);
                                            return (
                                                <div key={url} className="relative group">
                                                    {isPdf ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
                                                            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                                                            <span className="text-xs text-gray-600 max-w-[100px] truncate">{fileName}</span>
                                                        </a>
                                                    ) : (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                            <img src={url} alt={`หลักฐาน ${idx + 1}`} className="w-full h-full object-cover" />
                                                        </a>
                                                    )}
                                                    <button type="button" onClick={() => setReceiveFiles(prev => prev.filter(f => f !== url))}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="ลบไฟล์นี้" aria-label="ลบไฟล์">×</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
                            <button type="button" onClick={() => { setReceivingPr(null); setReceiveFiles([]); }}
                                className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                            <button type="button" onClick={handleConfirmReceivePr}
                                disabled={receiveFiles.length === 0 || isReceiveUploading}
                                title={receiveFiles.length === 0 ? 'กรุณาแนบหลักฐานการรับของก่อน' : ''}
                                className={`px-8 py-2 text-base font-medium text-white rounded-lg transition-colors ${receiveFiles.length === 0 || isReceiveUploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                                {isReceiveUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการรับของ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequisitionComponent;
