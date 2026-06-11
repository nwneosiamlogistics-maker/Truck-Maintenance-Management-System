
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import type { PurchaseOrder, PurchaseRequisition, StockItem, StockTransaction, Supplier, Tab } from '../types';
import CreatePOModal from './CreatePOModal';
import PurchaseOrderPrint from './PurchaseOrderPrint';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, calculateStockStatus, formatCurrency, formatTotalCurrency } from '../utils';
import { sendNewPOTelegramNotification } from '../utils/telegramService';

interface PurchaseOrderManagementProps {
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    purchaseRequisitions: PurchaseRequisition[];
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    suppliers: Supplier[];
    setActiveTab: (tab: Tab) => void;
}

// --- Helper Component for Tracking View ---
const TrackingView: React.FC<{
    purchaseRequisitions: PurchaseRequisition[];
    purchaseOrders: PurchaseOrder[];
    onResetPrStatus?: (pr: PurchaseRequisition) => void;
}> = ({ purchaseRequisitions, purchaseOrders, onResetPrStatus }) => {
    if (!purchaseRequisitions || !purchaseOrders) return null;
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Extract unique departments
    const departments = useMemo(() => {
        const depts = new Set(purchaseRequisitions.map(pr => pr.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [purchaseRequisitions]);

    // Helper to calculate days between two dates
    const calcDays = (start: Date | null, end: Date | null) => {
        if (!start || !end) return null;
        const diff = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))); // Ensure non-negative
    };

    // Merge Data Logic
    const trackingData = useMemo(() => {
        return purchaseRequisitions.map(pr => {
            const po = pr.relatedPoNumber
                ? purchaseOrders.find(p => p.poNumber === pr.relatedPoNumber)
                : null;

            // Determine Cancellation
            const status = pr.status ? pr.status.trim() : '';
            const isCancelled = status === 'ยกเลิก' || status === 'Cancelled' || (po?.status === 'Cancelled');

            // Determine Steps Completion
            const isCreated = true;
            const isApproved = !isCancelled && ['อนุมัติแล้ว', 'ออก PO แล้ว', 'รอสินค้า', 'รับของแล้ว'].includes(pr.status);
            const isOrdered = !isCancelled && (['ออก PO แล้ว', 'รอสินค้า', 'รับของแล้ว'].includes(pr.status) || !!po);
            const isReceived = !isCancelled && (pr.status === 'รับของแล้ว' || (po?.status === 'Received'));

            // Timestamps
            const createdDate = new Date(pr.createdAt);
            const approvedDate = pr.approvalDate ? new Date(pr.approvalDate) : null;
            const orderedDate = po ? new Date(po.orderDate) : null;
            const receivedDate = (isReceived && pr.updatedAt) ? new Date(pr.updatedAt) : null;

            // Calculate Durations (Lead Times)
            const durationApprove = calcDays(createdDate, approvedDate);
            const durationPO = calcDays(approvedDate, orderedDate);
            const durationReceive = calcDays(orderedDate, receivedDate);
            const totalDuration = isReceived ? calcDays(createdDate, receivedDate) : null;

            // Calculate Current Wait Duration (Aging)
            const now = new Date();
            let lastActionDate = createdDate;
            let currentStage = 'รออนุมัติ';

            if (isCancelled) {
                currentStage = 'ยกเลิก';
                lastActionDate = pr.updatedAt ? new Date(pr.updatedAt) : createdDate;
            } else if (isReceived) {
                currentStage = 'เสร็จสิ้น';
                lastActionDate = receivedDate || now;
            } else if (isOrdered) {
                currentStage = 'รอรับของ';
                lastActionDate = orderedDate || now;
            } else if (isApproved) {
                currentStage = 'รอสั่งซื้อ (PO)';
                lastActionDate = approvedDate || now;
            }

            const diffTime = Math.abs(now.getTime() - lastActionDate.getTime());
            const daysWaiting = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                pr,
                po,
                status: { isCreated, isApproved, isOrdered, isReceived, isCancelled },
                dates: { createdDate, approvedDate, orderedDate, receivedDate },
                durations: { durationApprove, durationPO, durationReceive, totalDuration },
                currentStage,
                daysWaiting: (isReceived || isCancelled) ? 0 : daysWaiting
            };
        })
            .filter(item => departmentFilter === 'all' || item.pr.department === departmentFilter)
            .filter(item =>
                searchTerm === '' ||
                item.pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.po?.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.pr.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => b.dates.createdDate.getTime() - a.dates.createdDate.getTime());
    }, [purchaseRequisitions, purchaseOrders, departmentFilter, searchTerm]);

    // Pagination Logic for Tracking
    const totalPages = Math.ceil(trackingData.length / itemsPerPage);
    const paginatedTrackingData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return trackingData.slice(startIndex, startIndex + itemsPerPage);
    }, [trackingData, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [departmentFilter, searchTerm, itemsPerPage]);


    // Helper for Timeline Step
    const Step = ({ active, label, date, icon, isCancelled }: { active: boolean, label: string, date: Date | null, icon: string, isCancelled?: boolean }) => (
        <div className={`flex flex-col items-center relative z-10 w-24`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors duration-300 ${isCancelled ? 'bg-red-100 border-red-500 text-red-600' :
                active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                {isCancelled ? 'X' : (active ? icon : '•')}
            </div>
            <div className={`text-xs font-medium mt-1 text-center ${isCancelled ? 'text-red-600' : ''}`}>{label}</div>
            {date && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                    {date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            )}
        </div>
    );

    const Connector = ({ active, duration }: { active: boolean, duration: number | null }) => (
        <div className="flex-1 flex flex-col items-center justify-center mx-[-10px] mb-6 relative">
            {/* Duration Label above line */}
            {duration !== null && (
                <div className="text-[10px] text-gray-500 bg-gray-50 px-1 rounded mb-1 -mt-3 z-20 border border-gray-200 shadow-sm">
                    {duration} วัน
                </div>
            )}
            <div className={`w-full h-1 transition-colors duration-300 ${active ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา (PR, PO, สินค้า)</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        placeholder="พิมพ์เพื่อค้นหา..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">แผนก/สาขา</label>
                    <select
                        aria-label="Filter by Department"
                        className="w-full p-2 border rounded-lg"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                    >
                        <option value="all">ทั้งหมด</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto max-h-[65vh] border relative">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64 bg-gray-50">รายละเอียดคำขอ (PR)</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">ไทม์ไลน์การดำเนินการ</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 bg-gray-50">สถานะปัจจุบัน</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 bg-gray-50">ระยะเวลารวม</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTrackingData.map((item) => (
                            <tr key={item.pr.id} className={`hover:bg-gray-50 ${item.status.isCancelled ? 'bg-red-50' : ''}`}>
                                <td className="px-4 py-4 align-top">
                                    <div className={`font-bold ${item.status.isCancelled ? 'text-red-600 line-through' : 'text-blue-700'}`}>{item.pr.prNumber}</div>
                                    <div className="text-sm text-gray-600 font-medium">{item.pr.department}</div>
                                    <div className="text-xs text-gray-500 mt-1">ขอโดย: {item.pr.requesterName}</div>
                                    <div className="mt-2 border-t pt-2">
                                        <p className="text-xs font-semibold text-gray-700">รายการ:</p>
                                        <ul className="text-xs text-gray-600 list-disc list-inside">
                                            {item.pr.items.slice(0, 2).map((i, idx) => (
                                                <li key={idx} className="truncate">{i.name} (x{i.quantity})</li>
                                            ))}
                                            {item.pr.items.length > 2 && <li>...และอีก {item.pr.items.length - 2} รายการ</li>}
                                        </ul>
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-middle">
                                    <div className="flex items-center justify-center px-4">
                                        <Step active={item.status.isCreated} label="แจ้งขอซื้อ" date={item.dates.createdDate} icon="📝" />

                                        <Connector active={item.status.isApproved} duration={item.durations.durationApprove} />

                                        <Step active={item.status.isApproved} label="อนุมัติ" date={item.dates.approvedDate} icon="✅" />

                                        <Connector active={item.status.isOrdered} duration={item.durations.durationPO} />

                                        <Step active={item.status.isOrdered} label="สั่งซื้อ (PO)" date={item.dates.orderedDate} icon="🛒" />

                                        <Connector active={item.status.isReceived} duration={item.durations.durationReceive} />

                                        <Step active={item.status.isReceived} label="รับของ" date={item.dates.receivedDate} icon="📦" />
                                    </div>
                                    {item.po ? (
                                        <div className={`text-center mt-2 text-xs text-gray-500 rounded py-1 inline-block px-2 mx-auto w-full ${item.po.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-gray-100'}`}>
                                            PO: <strong>{item.po.poNumber}</strong> ({item.po.supplierName}) {item.po.status === 'Cancelled' && '(ยกเลิก)'}
                                        </div>
                                    ) : item.pr.relatedPoNumber ? (
                                        <div className="flex flex-col items-center mt-2 bg-red-50 rounded p-1 border border-red-200">
                                            <span className="text-xs text-red-600 font-bold mb-1">ไม่พบข้อมูล PO: {item.pr.relatedPoNumber}</span>
                                            <button
                                                onClick={() => onResetPrStatus && onResetPrStatus(item.pr)}
                                                className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 transition-colors"
                                            >
                                                คืนสถานะ PR เพื่อสร้างใหม่
                                            </button>
                                        </div>
                                    ) : null}
                                </td>
                                <td className="px-4 py-4 align-middle text-center">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${item.status.isCancelled ? 'bg-red-100 text-red-800' :
                                            item.status.isReceived ? 'bg-green-100 text-green-800' :
                                                item.status.isOrdered ? 'bg-purple-100 text-purple-800' :
                                                    item.status.isApproved ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                        {item.currentStage}
                                    </span>
                                </td>
                                <td className="px-4 py-4 align-middle text-center">
                                    {item.status.isCancelled ? (
                                        <span className="text-red-600 font-bold text-sm">ยกเลิก</span>
                                    ) : item.status.isReceived ? (
                                        <div className="flex flex-col items-center text-green-700">
                                            <span className="text-sm font-semibold">รวมทั้งหมด</span>
                                            <span className="text-xl font-bold">{item.durations.totalDuration}</span>
                                            <span className="text-xs">วัน</span>
                                        </div>
                                    ) : (
                                        <div className={`flex flex-col items-center ${item.daysWaiting > 7 ? 'text-red-600' : item.daysWaiting > 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                            <span className="text-xs text-gray-500">รอมาแล้ว</span>
                                            <span className="text-xl font-bold">{item.daysWaiting}</span>
                                            <span className="text-xs">วัน</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {trackingData.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">ไม่พบข้อมูลการสั่งซื้อ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-4 rounded-b-lg shadow-sm flex justify-between items-center flex-wrap gap-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">แสดง:</label>
                    <select
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
                        จาก {trackingData.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                </div>
            </div>
        </div>
    );
};


const PurchaseOrderManagement: React.FC<PurchaseOrderManagementProps> = ({
    purchaseOrders, setPurchaseOrders, purchaseRequisitions, setPurchaseRequisitions, setStock, setTransactions, suppliers, setActiveTab
}) => {
    const [activeTab, setActiveLocalTab] = useState<'pending-pr' | 'po-list' | 'tracking'>('pending-pr');
    const [selectedPRIds, setSelectedPRIds] = useState<Set<string>>(new Set());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedPOIds, setExpandedPOIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    // Pagination states
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingItemsPerPage, setPendingItemsPerPage] = useState(20);
    const [poPage, setPoPage] = useState(1);
    const [poItemsPerPage, setPoItemsPerPage] = useState(20);

    // --- Data Filtering ---
    const pendingPRs = useMemo(() => {
        return (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => pr.status === 'อนุมัติแล้ว')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseRequisitions]);

    const paginatedPendingPRs = useMemo(() => {
        const startIndex = (pendingPage - 1) * pendingItemsPerPage;
        return pendingPRs.slice(startIndex, startIndex + pendingItemsPerPage);
    }, [pendingPRs, pendingPage, pendingItemsPerPage]);

    const pendingTotalPages = Math.ceil(pendingPRs.length / pendingItemsPerPage) || 1;

    const sortedPOs = useMemo(() => {
        return (Array.isArray(purchaseOrders) ? purchaseOrders : [])
            .filter(po => {
                const searchLower = searchTerm.toLowerCase();
                // 1. Check PO Number & Supplier
                if (po.poNumber.toLowerCase().includes(searchLower) || po.supplierName.toLowerCase().includes(searchLower)) {
                    return true;
                }

                // 2. Check cached linkedPrNumbers (if available)
                if (po.linkedPrNumbers?.some(prNum => prNum.toLowerCase().includes(searchLower))) {
                    return true;
                }

                // 3. Fallback: Check linkedPrIds by looking up in purchaseRequisitions
                // This handles cases where linkedPrNumbers might be missing or out of sync
                if (po.linkedPrIds && po.linkedPrIds.length > 0) {
                    const linkedPRs = purchaseRequisitions.filter(pr => po.linkedPrIds.includes(pr.id));
                    return linkedPRs.some(pr => pr.prNumber.toLowerCase().includes(searchLower));
                }

                return false;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseOrders, purchaseRequisitions, searchTerm]);

    const paginatedPOs = useMemo(() => {
        const startIndex = (poPage - 1) * poItemsPerPage;
        return sortedPOs.slice(startIndex, startIndex + poItemsPerPage);
    }, [sortedPOs, poPage, poItemsPerPage]);

    const poTotalPages = Math.ceil(sortedPOs.length / poItemsPerPage) || 1;

    // --- Handlers ---

    useEffect(() => {
        setPendingPage(1);
    }, [purchaseRequisitions]);

    useEffect(() => {
        setPoPage(1);
    }, [searchTerm, purchaseOrders]);


    const handleTogglePRSelection = (id: string) => {
        setSelectedPRIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleCreatePOClick = async () => {
        if (selectedPRIds.size === 0) {
            addToast('กรุณาเลือกใบขอซื้อ (PR) อย่างน้อย 1 รายการ', 'warning');
            return;
        }
        // Check if multiple suppliers are selected (Warning)
        const selectedPRs = pendingPRs.filter(pr => selectedPRIds.has(pr.id));
        const uniqueSuppliers = new Set(selectedPRs.map(pr => pr.supplier));
        if (uniqueSuppliers.size > 1) {
            const confirmed = await confirmAction(
                'ข้อมูลผู้จำหน่ายไม่ตรงกัน',
                `คุณเลือก PR จากผู้จำหน่าย ${uniqueSuppliers.size} รายที่แตกต่างกัน ระบบจะใช้ชื่อผู้จำหน่ายจาก PR แรกเป็นหลัก ต้องการดำเนินการต่อหรือไม่?`
            );
            if (!confirmed) {
                return;
            }
        }
        setIsCreateModalOpen(true);
    };

    const handleSavePO = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => {
        const now = new Date();
        const year = now.getFullYear();

        // Generate PO Number
        const currentYearPOs = (Array.isArray(purchaseOrders) ? purchaseOrders : [])
            .filter(po => new Date(po.createdAt).getFullYear() === year);

        // Extract numeric part from PO number
        const lastNumber = currentYearPOs
            .map(po => {
                const parts = po.poNumber.split('-');
                return parts.length === 3 ? parseInt(parts[2], 10) : 0;
            })
            .reduce((max, num) => Math.max(max, num), 0);

        const newSequence = lastNumber + 1;
        const newPoNumber = `PO-${year}-${String(newSequence).padStart(5, '0')}`;

        const newPO: PurchaseOrder = {
            ...poData,
            id: `PO-${Date.now()}`,
            poNumber: newPoNumber,
            createdAt: now.toISOString(),
        };

        // 1. Save PO
        setPurchaseOrders(prev => [newPO, ...prev]);

        // 2. Update linked PRs status AND relatedPoNumber
        setPurchaseRequisitions(prev => prev.map(pr => {
            if (poData.linkedPrIds.includes(pr.id)) {
                return {
                    ...pr,
                    status: 'ออก PO แล้ว',
                    relatedPoNumber: newPoNumber, // Link PR to PO
                    updatedAt: now.toISOString()
                };
            }
            return pr;
        }));

        addToast(`สร้างใบสั่งซื้อ ${newPoNumber} สำเร็จ`, 'success');
        sendNewPOTelegramNotification(newPO);
        setIsCreateModalOpen(false);
        setSelectedPRIds(new Set());
        setActiveLocalTab('po-list');
    };

    const handleReceivePO = async (po: PurchaseOrder) => {
        const confirmed = await confirmAction(
            'ยืนยันการรับของ',
            `ยืนยันการรับของสำหรับ PO: ${po.poNumber}? การกระทำนี้จะเพิ่มสต็อกสินค้าและปิด PR ที่เกี่ยวข้อง`
        );
        if (!confirmed) return;

        const now = new Date().toISOString();

        // 1. Update Stock & Transactions
        const newTransactions: StockTransaction[] = [];
        const stockUpdates = new Map<string, number>(); // stockId -> quantity to add

        po.items.forEach(item => {
            if (item.stockId) {
                stockUpdates.set(item.stockId, (stockUpdates.get(item.stockId) || 0) + item.quantity);

                newTransactions.push({
                    id: `TXN-IN-${Date.now()}-${item.stockId}-${Math.random()}`,
                    stockItemId: item.stockId,
                    stockItemName: item.name,
                    type: 'รับเข้า',
                    quantity: item.quantity,
                    transactionDate: now,
                    actor: 'ระบบ (รับจาก PO)',
                    notes: `รับของจากใบสั่งซื้อ ${po.poNumber}`,
                    documentNumber: po.poNumber,
                    pricePerUnit: item.unitPrice,
                });
            }
        });

        setStock(prevStock => prevStock.map(s => {
            if (stockUpdates.has(s.id)) {
                const addedQty = stockUpdates.get(s.id)!;
                const newQty = s.quantity + addedQty;
                const newStatus = calculateStockStatus(newQty, s.minStock, s.maxStock);
                return { ...s, quantity: newQty, status: newStatus };
            }
            return s;
        }));

        if (newTransactions.length > 0) {
            setTransactions(prev => [...newTransactions, ...prev]);
        }

        // 2. Update PO Status
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received' } : p));

        // 3. Update Linked PRs to 'รับของแล้ว'
        setPurchaseRequisitions(prev => prev.map(pr => {
            if (po.linkedPrIds.includes(pr.id)) {
                return { ...pr, status: 'รับของแล้ว', updatedAt: now };
            }
            return pr;
        }));

        addToast(`บันทึกการรับของจาก ${po.poNumber} เรียบร้อย`, 'success');
    };

    const handleCancelPO = async (poId: string) => {
        if (await promptForPasswordAsync('ยกเลิกใบสั่งซื้อ')) {
            // Update PO status
            setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'Cancelled' } : p));

            // Revert linked PRs back to 'อนุมัติแล้ว' so they can be ordered again or cancelled separately
            const po = purchaseOrders.find(p => p.id === poId);
            if (po) {
                setPurchaseRequisitions(prev => prev.map(pr => {
                    if (po.linkedPrIds.includes(pr.id)) {
                        // Clear the link and reset status
                        const { relatedPoNumber, ...rest } = pr;
                        return { ...rest, status: 'อนุมัติแล้ว', updatedAt: new Date().toISOString() };
                    }
                    return pr;
                }));
            }

            addToast('ยกเลิกใบสั่งซื้อสำเร็จ สถานะ PR ที่เกี่ยวข้องถูกคืนค่าเป็น "อนุมัติแล้ว"', 'info');
        }
    };

    const handlePrintPO = (po: PurchaseOrder) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = ReactDOMServer.renderToString(<PurchaseOrderPrint po={po} />);
            printWindow.document.write(`
                <html>
                    <head>
                        <title>ใบสั่งซื้อ ${po.poNumber}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Sarabun', sans-serif; }
                            @media print {
                                @page { size: A4; margin: 0.5cm; }
                            }
                        </style>
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    window.close();
                                }, 800);
                            }
                        </script>
                    </head>
                    <body>${printContent}</body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const toggleExpandPO = (id: string) => {
        setExpandedPOIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const getStatusBadge = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Draft': return 'bg-gray-200 text-gray-800';
            case 'Ordered': return 'bg-blue-100 text-blue-800';
            case 'Received': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-t-2xl shadow-sm border-b">
                <div className="flex overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveLocalTab('pending-pr')}
                        className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors whitespace-nowrap ${activeTab === 'pending-pr' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        PR ที่รอสั่งซื้อ ({pendingPRs.length})
                    </button>
                    <button
                        onClick={() => setActiveLocalTab('po-list')}
                        className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors whitespace-nowrap ${activeTab === 'po-list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        รายการใบสั่งซื้อ (PO)
                    </button>
                    <button
                        onClick={() => setActiveLocalTab('tracking')}
                        className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors whitespace-nowrap ${activeTab === 'tracking' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📍 ติดตามสถานะ (Tracking)
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'pending-pr' && (
                <div className="bg-white rounded-b-2xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-gray-600">เลือกใบขอซื้อที่ต้องการเพื่อสร้างใบสั่งซื้อ (ควรเลือกผู้จำหน่ายรายเดียวกัน)</p>
                        <button
                            onClick={handleCreatePOClick}
                            disabled={selectedPRIds.size === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            สร้างใบสั่งซื้อ (PO)
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-[65vh] border rounded-lg mb-4">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-12 bg-gray-50">
                                        {/* Select All Logic could be added here */}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">เลขที่ PR</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">วันที่ขอซื้อ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">ผู้จำหน่าย</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 bg-gray-50">ยอดรวม</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">ผู้ขอซื้อ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedPendingPRs.map(pr => (
                                    <tr key={pr.id} className={selectedPRIds.has(pr.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                aria-label={`Select PR ${pr.prNumber}`}
                                                checked={selectedPRIds.has(pr.id)}
                                                onChange={() => handleTogglePRSelection(pr.id)}
                                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{pr.prNumber}</td>
                                        <td className="px-4 py-3 text-sm">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3">{pr.supplier}</td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(pr.totalAmount)}</td>
                                        <td className="px-4 py-3 text-sm">{pr.requesterName}</td>
                                    </tr>
                                ))}
                                {paginatedPendingPRs.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">ไม่มีใบขอซื้อที่รออนุมัติ</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">แสดง:</label>
                            <select
                                aria-label="Items per page for Pending PRs"
                                value={pendingItemsPerPage}
                                onChange={e => setPendingItemsPerPage(Number(e.target.value))}
                                className="p-1 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-700">
                                จาก {pendingPRs.length} รายการ
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1} aria-label="หน้าก่อนหน้า" className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                            <span className="text-sm font-semibold">หน้า {pendingPage} / {pendingTotalPages}</span>
                            <button onClick={() => setPendingPage(p => Math.min(pendingTotalPages, p + 1))} disabled={pendingPage === pendingTotalPages} aria-label="หน้าถัดไป" className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'po-list' && (
                <div className="bg-white rounded-b-2xl shadow-sm p-4 space-y-4">
                    <input
                        type="text"
                        placeholder="ค้นหา PO, ผู้จำหน่าย..."
                        aria-label="ค้นหาใบสั่งซื้อ"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border rounded-lg w-full md:w-80"
                    />
                    <div className="overflow-x-auto max-h-[65vh] border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="w-10 bg-gray-50"></th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">เลขที่ PO</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">วันที่สั่งซื้อ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">ผู้จำหน่าย</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">ผู้ขอซื้อ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">แผนก/สาขา</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">อ้างอิง PR</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 bg-gray-50">ยอดสุทธิ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 bg-gray-50">สถานะ</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 bg-gray-50">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedPOs.map(po => (
                                    <React.Fragment key={po.id}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-2 text-center">
                                                <button onClick={() => toggleExpandPO(po.id)} aria-label={expandedPOIds.has(po.id) ? 'ย่อรายการ' : 'ขยายรายการ'} className="text-gray-500 hover:text-blue-600">
                                                    {expandedPOIds.has(po.id) ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-blue-600">{po.poNumber}</td>
                                            <td className="px-4 py-3 text-sm">{new Date(po.orderDate).toLocaleDateString('th-TH')}</td>
                                            <td className="px-4 py-3">{po.supplierName}</td>
                                            <td className="px-4 py-3 text-sm">{po.requesterName || '-'}</td>
                                            <td className="px-4 py-3 text-sm">{po.department || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => setActiveTab('requisitions')} title="ไปที่หน้า PR">
                                                {(po.linkedPrNumbers && po.linkedPrNumbers.length > 0)
                                                    ? po.linkedPrNumbers.join(', ')
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">{formatTotalCurrency(po.totalAmount)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadge(po.status)}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center space-x-2">
                                                {po.status === 'Ordered' && (
                                                    <button onClick={() => handleReceivePO(po)} className="text-green-600 hover:text-green-800 text-sm font-medium">รับของ</button>
                                                )}
                                                <button onClick={() => handlePrintPO(po)} className="text-gray-600 hover:text-gray-800 text-sm font-medium">พิมพ์</button>
                                                {po.status === 'Ordered' && (
                                                    <button onClick={() => handleCancelPO(po.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">ยกเลิก</button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedPOIds.has(po.id) && (
                                            <tr>
                                                <td colSpan={10} className="bg-gray-50 p-4">
                                                    <div className="pl-8">
                                                        <h4 className="font-bold text-sm mb-2 text-gray-700">รายการสินค้า:</h4>
                                                        <table className="min-w-full bg-white rounded border">
                                                            <thead>
                                                                <tr className="bg-gray-100 text-xs text-gray-500">
                                                                    <th className="p-2 text-left">รายการ</th>
                                                                    <th className="p-2 text-right">จำนวน</th>
                                                                    <th className="p-2 text-right">ราคา/หน่วย</th>
                                                                    <th className="p-2 text-right">รวม</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {po.items.map((item, idx) => (
                                                                    <tr key={idx} className="border-t text-sm">
                                                                        <td className="p-2">{item.name}</td>
                                                                        <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                                                                        <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                                                        <td className="p-2 text-right">{formatCurrency(item.totalPrice)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <p><strong>หมายเหตุ:</strong> {po.notes || '-'}</p>
                                                            <p><strong>กำหนดส่ง:</strong> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {sortedPOs.length === 0 && (
                                    <tr><td colSpan={10} className="text-center py-10 text-gray-500">ไม่พบรายการใบสั่งซื้อ</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Card View for Purchase Orders */}
                        <div className="md:hidden space-y-4 p-4">
                            {paginatedPOs.map(po => (
                                <div key={po.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-blue-600 text-lg">{po.poNumber}</div>
                                            <div className="text-xs text-gray-500">{new Date(po.orderDate).toLocaleDateString('th-TH')}</div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadge(po.status)}`}>
                                            {po.status}
                                        </span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <p className="text-gray-700 font-medium">{po.supplierName}</p>
                                        <div className="flex justify-between text-gray-600 text-xs">
                                            <span>ผู้ขอ: {po.requesterName || '-'}</span>
                                            <span>แผนก: {po.department || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded mt-2">
                                            <span className="text-xs text-gray-500">ยอดสุทธิ</span>
                                            <span className="font-bold text-gray-800">{formatTotalCurrency(po.totalAmount)}</span>
                                        </div>
                                    </div>

                                    {/* Expandable Items Section for Mobile */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => toggleExpandPO(po.id)}
                                            className="w-full text-left text-xs font-semibold text-gray-500 flex justify-between items-center py-1"
                                        >
                                            รายการสินค้า ({po.items.length})
                                            <span>{expandedPOIds.has(po.id) ? '▲' : '▼'}</span>
                                        </button>
                                        {expandedPOIds.has(po.id) && (
                                            <div className="bg-gray-50 rounded p-2 mt-1 space-y-2 text-xs">
                                                {po.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                                                        <span className="truncate flex-1 pr-2">{item.name}</span>
                                                        <span className="text-gray-600 whitespace-nowrap">x{item.quantity} {item.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex gap-2 justify-end flex-wrap">
                                        {po.status === 'Ordered' && (
                                            <button onClick={() => handleReceivePO(po)} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200 flex-1 text-center">
                                                รับของ
                                            </button>
                                        )}
                                        <button onClick={() => handlePrintPO(po)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 flex-1 text-center">
                                            พิมพ์
                                        </button>
                                        {po.status === 'Ordered' && (
                                            <button onClick={() => handleCancelPO(po.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200 flex-1 text-center">
                                                ยกเลิก
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sortedPOs.length === 0 && (
                                <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
                                    ไม่พบรายการใบสั่งซื้อ
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">แสดง:</label>
                            <select
                                aria-label="Items per page for PO List"
                                value={poItemsPerPage}
                                onChange={e => setPoItemsPerPage(Number(e.target.value))}
                                className="p-1 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-700">
                                จาก {sortedPOs.length} รายการ
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPoPage(p => Math.max(1, p - 1))} disabled={poPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                            <span className="text-sm font-semibold">หน้า {poPage} / {poTotalPages}</span>
                            <button onClick={() => setPoPage(p => Math.min(poTotalPages, p + 1))} disabled={poPage === poTotalPages} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tracking' && (
                <TrackingView
                    purchaseRequisitions={purchaseRequisitions}
                    purchaseOrders={purchaseOrders}
                    onResetPrStatus={async (pr) => {
                        const confirmed = await confirmAction(
                            'ยืนยันการคืนสถานะ',
                            `ยืนยันการคืนสถานะ PR ${pr.prNumber} เป็น "อนุมัติแล้ว" เพื่อสร้าง PO ใหม่?`,
                            'ยืนยัน'
                        );
                        if (confirmed) {
                            setPurchaseRequisitions(prev => prev.map(p => {
                                if (p.id === pr.id) {
                                    // Remove relatedPoNumber key safely (Firebase crash fix)
                                    const { relatedPoNumber, ...rest } = p;
                                    return { ...rest, status: 'อนุมัติแล้ว', updatedAt: new Date().toISOString() };
                                }
                                return p;
                            }));
                            addToast(`คืนสถานะ PR ${pr.prNumber} เรียบร้อยแล้ว คุณสามารถสร้างใบสั่งซื้อใหม่ได้ทันที`, 'success');
                        }
                    }}
                />
            )}

            {/* Create PO Modal */}
            {isCreateModalOpen && (
                <CreatePOModal
                    selectedPRs={pendingPRs.filter(pr => selectedPRIds.has(pr.id))}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleSavePO}
                    suppliers={suppliers}
                />
            )}
        </div>
    );
};

export default PurchaseOrderManagement;
