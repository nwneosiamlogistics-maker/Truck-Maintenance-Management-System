import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { StockItem, StockStatus, StockTransaction, UsedPart, PurchaseRequisition, Supplier, UsedPartBuyer, PurchaseRequisitionItem, UsedPartBatchStatus, Repair, PurchaseRequisitionStatus } from '../types';
import StockModal from './StockModal';
import ReceiveFromPOModal from './ReceiveFromPOModal';
import StockWithdrawalModal from './StockWithdrawalModal';
import ReturnStockModal from './ReturnStockModal';
import PrintLabelModal from './PrintLabelModal';
import EditUsedPartBatchModal from './EditUsedPartBatchModal';
import UpdateUsedPartStatusModal from './UpdateUsedPartStatusModal';
import CreatePRFromStockModal from './CreatePRFromStockModal';
import SellFungibleItemModal, { GradedSaleData } from './SellFungibleItemModal';
import CashBillPrintModal from './CashBillPrintModal';
import { useToast } from '../context/ToastContext';
import { STOCK_CATEGORIES } from '../data/categories';
import { promptForPasswordAsync, confirmAction, calculateStockStatus, formatCurrency } from '../utils';
import ProcessUsedPartModal from './ProcessUsedPartModal';
import StockHistory from './StockHistory';


interface StockManagementProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    usedParts: UsedPart[];
    updateUsedPart: (partToUpdate: UsedPart) => void;
    deleteUsedPart: (partId: string) => void;
    setPurchaseRequisitions: React.Dispatch<React.SetStateAction<PurchaseRequisition[]>>;
    purchaseRequisitions: PurchaseRequisition[];
    suppliers: Supplier[];
    usedPartBuyers: UsedPartBuyer[];
    setUsedParts: React.Dispatch<React.SetStateAction<UsedPart[]>>;
    repairs: Repair[];
    processUsedPartBatch: (partId: string, decision: { type: 'to_fungible' | 'to_revolving_stock' | 'dispose', fungibleStockId?: string, quantity?: number, notes?: string }) => void;
}

import { Download, TrendingDown } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';

const StockManagement: React.FC<StockManagementProps> = ({
    stock, setStock, transactions, setTransactions,
    usedParts, updateUsedPart, deleteUsedPart,
    setPurchaseRequisitions, purchaseRequisitions,
    suppliers, usedPartBuyers, setUsedParts,
    repairs,
    processUsedPartBatch
}) => {
    // General State
    const [activeTab, setActiveTab] = useState<'new' | 'revolving' | 'usedFungible' | 'usedItemized' | 'history'>('new');
    const { addToast } = useToast();

    const handleExportStock = () => {
        const exportData = safeStock.map(s => ({
            'รหัสอะไหล่': s.code,
            'ชื่ออะไหล่': s.name,
            'หมวดหมู่': s.category,
            'จำนวนคงเหลือ': s.quantity,
            'หน่วย': s.unit,
            'ราคาทุน': s.price,
            'มูลค่ารวม': s.quantity * s.price,
            'จุดสั่งซื้อ': s.minStock,
            'สถานะเบื้องต้น': calculateStockStatus(s.quantity, s.minStock, s.maxStock)
        }));
        exportToCSV('Inventory_Stock', exportData);
    };

    // Modals State
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [stockModalDefaults, setStockModalDefaults] = useState<Partial<StockItem>>({});

    const [isReceiveFromPOModalOpen, setReceiveFromPOModalOpen] = useState(false);

    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [itemToPrint, setItemToPrint] = useState<StockItem | null>(null);

    const [isProcessUsedPartModalOpen, setProcessUsedPartModalOpen] = useState(false);
    const [partToProcess, setPartToProcess] = useState<UsedPart | null>(null);


    const [isEditUsedPartModalOpen, setEditUsedPartModalOpen] = useState(false);
    const [partToEdit, setPartToEdit] = useState<UsedPart | null>(null);

    const [isUpdateUsedPartStatusModalOpen, setUpdateUsedPartStatusModalOpen] = useState(false);
    const [partToUpdateStatus, setPartToUpdateStatus] = useState<UsedPart | null>(null);

    const [itemToRequest, setItemToRequest] = useState<StockItem | null>(null);
    const [itemToSell, setItemToSell] = useState<StockItem | null>(null);
    const [saleToPrint, setSaleToPrint] = useState<{ item: StockItem, saleData: GradedSaleData, billNumber: string } | null>(null);


    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');

    const [hideZeroRevolving, setHideZeroRevolving] = useState(true);

    // Pagination for Used Itemized Parts
    const [usedPartsCurrentPage, setUsedPartsCurrentPage] = useState(1);
    const [usedPartsItemsPerPage, setUsedPartsItemsPerPage] = useState(20);

    // Memoized Data
    const safeStock = useMemo(() => Array.isArray(stock) ? stock : [], [stock]);
    const safeUsedParts = useMemo(() => Array.isArray(usedParts) ? usedParts : [], [usedParts]);

    const activePRStockIds = useMemo(() => {
        const ids = new Set<string>();
        const activeStatuses: PurchaseRequisitionStatus[] = ['ฉบับร่าง', 'รออนุมัติ', 'อนุมัติแล้ว', 'รอสินค้า'];
        (Array.isArray(purchaseRequisitions) ? purchaseRequisitions : [])
            .filter(pr => activeStatuses.includes(pr.status))
            .forEach(pr => {
                (pr.items || []).forEach(item => {
                    if (item.stockId) {
                        ids.add(item.stockId);
                    }
                });
            });
        return ids;
    }, [purchaseRequisitions]);

    const filteredStock = useMemo(() => {
        return safeStock
            .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
            .filter(item => {
                // Always calculate status on-the-fly for filtering to ensure accuracy
                const currentStatus = calculateStockStatus(item.quantity, item.minStock, item.maxStock);
                return statusFilter === 'all' || currentStatus === statusFilter;
            })
            .filter(item => searchTerm === '' ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [safeStock, searchTerm, categoryFilter, statusFilter]);

    const newStockItems = useMemo(() => filteredStock.filter(item => !item.isFungibleUsedItem && !item.isRevolvingPart), [filteredStock]);
    const revolvingStockItems = useMemo(() => filteredStock.filter(item => item.isRevolvingPart && (!hideZeroRevolving || item.quantity > 0)), [filteredStock, hideZeroRevolving]);
    const fungibleUsedItems = useMemo(() => filteredStock.filter(item => item.isFungibleUsedItem), [filteredStock]);

    const filteredUsedParts = useMemo(() => {
        return safeUsedParts
            .filter(part => part.status !== 'จัดการครบแล้ว')
            .filter(part => searchTerm === '' ||
                part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.fromRepairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.fromLicensePlate.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.dateRemoved).getTime() - new Date(a.dateRemoved).getTime());
    }, [safeUsedParts, searchTerm]);

    const { paginatedUsedParts, usedPartsTotalPages } = useMemo(() => {
        const totalPages = Math.ceil(filteredUsedParts.length / usedPartsItemsPerPage);
        const startIndex = (usedPartsCurrentPage - 1) * usedPartsItemsPerPage;
        const paginated = filteredUsedParts.slice(startIndex, startIndex + usedPartsItemsPerPage);
        return { paginatedUsedParts: paginated, usedPartsTotalPages: totalPages };
    }, [filteredUsedParts, usedPartsCurrentPage, usedPartsItemsPerPage]);



    // Forecasting Logic (Inventory Insights)
    const stockInsights = useMemo(() => {
        const safeTxns = Array.isArray(transactions) ? transactions : [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Map to store consumption rate per item
        const usageRate: Record<string, number> = {};

        // Calculate total withdrawn quantity in last 30 days
        safeTxns
            .filter(t => t.type === 'เบิกใช้' && new Date(t.transactionDate) >= thirtyDaysAgo)
            .forEach(t => {
                const qty = Math.abs(t.quantity);
                usageRate[t.stockItemId] = (usageRate[t.stockItemId] || 0) + qty;
            });

        return safeStock.map(item => {
            const monthlyUsage = usageRate[item.id] || 0;
            const avgDailyUsage = monthlyUsage / 30;
            const daysRemaining = avgDailyUsage > 0 ? Math.floor(item.quantity / avgDailyUsage) : Infinity;

            return {
                ...item,
                avgDailyUsage,
                daysRemaining,
                isUrgent: daysRemaining <= 7 && item.quantity > 0
            };
        }).filter(item => item.avgDailyUsage > 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [safeStock, transactions]);

    useEffect(() => {
        setUsedPartsCurrentPage(1);
    }, [searchTerm, usedPartsItemsPerPage]);

    // Handlers
    const handleOpenStockModal = (item: StockItem | null = null, defaults: Partial<StockItem> = {}) => {
        setEditingItem(item);
        setStockModalDefaults(defaults);
        setStockModalOpen(true);
    };

    const handleSaveItem = (itemData: StockItem, extras: { sourceRepairOrderNo?: string }) => {
        const now = new Date().toISOString();
        if (itemData.id) { // Editing
            const originalItem = safeStock.find(s => s.id === itemData.id);
            if (originalItem && originalItem.quantity !== itemData.quantity) {
                const difference = itemData.quantity - originalItem.quantity;
                const newTransaction: StockTransaction = {
                    id: `TXN-ADJ-${Date.now()}`,
                    stockItemId: itemData.id,
                    stockItemName: itemData.name,
                    type: 'ปรับสต็อก',
                    quantity: difference,
                    transactionDate: now,
                    actor: 'ผู้ดูแลระบบ',
                    notes: `แก้ไขจากหน้าสต็อก: ปรับจาก ${originalItem.quantity} เป็น ${itemData.quantity}`,
                    pricePerUnit: itemData.price,
                };
                setTransactions(prev => [newTransaction, ...(Array.isArray(prev) ? prev : [])]);
                addToast(`ปรับสต็อก ${itemData.name} จำนวน ${difference > 0 ? '+' : ''}${difference} ${itemData.unit}`, 'info');
            }

            setStock(prev => prev.map(s => s.id === itemData.id ? itemData : s));
            addToast(`อัปเดต ${itemData.name} สำเร็จ`, 'success');
        } else { // Adding
            const newItem = { ...itemData, id: `STK-${Date.now()}` };
            setStock(prev => [newItem, ...prev]);

            // Create initial transaction if quantity > 0
            if (newItem.quantity > 0) {
                const newTransaction: StockTransaction = {
                    id: `TXN-${Date.now()}`,
                    stockItemId: newItem.id,
                    stockItemName: newItem.name,
                    type: 'รับเข้า',
                    quantity: newItem.quantity,
                    transactionDate: now,
                    actor: 'ระบบ (เพิ่มใหม่)',
                    notes: extras.sourceRepairOrderNo ? `จากใบซ่อม ${extras.sourceRepairOrderNo}` : 'เพิ่มรายการใหม่ในคลัง',
                    pricePerUnit: newItem.price,
                };
                setTransactions(prev => [newTransaction, ...prev]);
            }
            addToast(`เพิ่ม ${newItem.name} สำเร็จ`, 'success');
        }
        setStockModalOpen(false);
    };

    const handleDeleteItem = async (itemId: string, itemName: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemName}" ออกจากสต็อก?`, 'ลบ');
            if (confirmed) {
                setStock(prev => prev.filter(s => s.id !== itemId));
                addToast(`ลบ ${itemName} สำเร็จ`, 'info');
            }
        }
    };

    const handleWithdrawStock = (data: { stockItemId: string, quantity: number, reason: string, withdrawnBy: string, notes: string }) => {
        setStock(prevStock => prevStock.map(s => {
            if (s.id === data.stockItemId) {
                const newQuantity = Number(s.quantity) - Number(data.quantity);
                const newStatus = calculateStockStatus(newQuantity, s.minStock, s.maxStock);
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const stockItem = safeStock.find(s => s.id === data.stockItemId);
        if (stockItem) {
            const year = new Date().getFullYear();
            const wdTransactionsThisYear = (Array.isArray(transactions) ? transactions : [])
                .filter(t => t.documentNumber && t.documentNumber.startsWith(`WD-${year}`));
            const lastNumber = wdTransactionsThisYear
                .map(t => parseInt(t.documentNumber!.split('-')[2], 10))
                .reduce((max, num) => Math.max(max, num), 0);
            const newDocumentNumber = `WD-${year}-${String(lastNumber + 1).padStart(5, '0')}`;

            const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}`,
                stockItemId: stockItem.id,
                stockItemName: stockItem.name,
                type: 'เบิกใช้',
                quantity: -data.quantity,
                transactionDate: new Date().toISOString(),
                actor: data.withdrawnBy,
                notes: `${data.reason}${data.notes ? ` - ${data.notes}` : ''}`,
                documentNumber: newDocumentNumber,
                pricePerUnit: stockItem.price,
            };
            setTransactions(prev => [newTransaction, ...prev]);
            addToast(`เบิก ${stockItem.name} สำเร็จ (เลขที่: ${newDocumentNumber})`, 'success');
        }
        setWithdrawModalOpen(false);
    };

    const handleReturnStock = (data: { stockItemId: string, quantity: number, reason?: string }) => {
        setStock(prevStock => prevStock.map(s => {
            if (s.id === data.stockItemId) {
                const newQuantity = Number(s.quantity) - Number(data.quantity);
                const newStatus = calculateStockStatus(newQuantity, s.minStock, s.maxStock);
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        const stockItem = safeStock.find(s => s.id === data.stockItemId);
        if (stockItem) {
            const newTransaction: StockTransaction = {
                id: `TXN-${Date.now()}`,
                stockItemId: stockItem.id,
                stockItemName: stockItem.name,
                type: 'คืนร้านค้า',
                quantity: -data.quantity,
                transactionDate: new Date().toISOString(),
                actor: 'เจ้าหน้าที่',
                notes: `เหตุผล: ${data.reason || 'ไม่ระบุ'}`,
                pricePerUnit: stockItem.price,
            };
            setTransactions(prev => [newTransaction, ...prev]);
            addToast(`คืน ${stockItem.name} จำนวน ${data.quantity} สำเร็จ`, 'success');
        }
        setReturnModalOpen(false);
    };

    const handleSavePurchaseRequest = (data: { supplier: string; quantity: number; notes: string; }) => {
        if (!itemToRequest) return;

        const now = new Date();
        const year = now.getFullYear();

        const newPrItem: PurchaseRequisitionItem = {
            stockId: itemToRequest.id,
            stockCode: itemToRequest.code,
            name: itemToRequest.name,
            quantity: data.quantity,
            unit: itemToRequest.unit,
            unitPrice: itemToRequest.price,
            deliveryOrServiceDate: new Date().toISOString().split('T')[0],
        };

        const totalAmount = newPrItem.quantity * newPrItem.unitPrice;

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
            id: `PR-${Date.now()}`,
            prNumber: newPrNumber,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            requesterName: 'ระบบ (จากหน้าสต็อก)',
            department: 'แผนกซ่อมบำรุง',
            dateNeeded: new Date().toISOString().split('T')[0],
            supplier: data.supplier,
            status: 'รออนุมัติ', // Go straight to pending approval
            items: [newPrItem],
            totalAmount: totalAmount,
            notes: data.notes,
            approvalDate: null,
            requestType: 'Product',
            budgetStatus: 'Have Budget',
        };

        setPurchaseRequisitions(prev => [newRequisition, ...(Array.isArray(prev) ? prev : [])]);
        addToast(`สร้างใบขอซื้อสำหรับ ${itemToRequest.name} สำเร็จ`, 'success');
        setItemToRequest(null);
    };

    const handleGradedSale = (data: GradedSaleData) => {
        if (!itemToSell) return;

        const totalQuantity = data.grades.reduce((sum, g) => sum + g.quantity, 0);
        const totalValue = data.grades.reduce((sum, g) => sum + (g.quantity * g.price), 0);
        const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

        // 1. Update stock quantity
        setStock(prevStock => prevStock.map(s => {
            if (s.id === itemToSell!.id) {
                const newQuantity = Number(s.quantity) - totalQuantity;
                const newStatus = calculateStockStatus(newQuantity, s.minStock, s.maxStock);
                return { ...s, quantity: newQuantity, status: newStatus };
            }
            return s;
        }));

        // 2. Create a detailed transaction note
        const gradeDetails = data.grades.map(g => `${g.condition}: ${g.quantity} ${itemToSell.unit} x ${formatCurrency(g.price)} บาท`).join('; ');
        const detailedNotes = `ขายให้ ${data.buyer}. รายละเอียด: ${gradeDetails}. ${data.notes || ''}`.trim();

        // Generate new bill number
        const now = new Date();
        const year = now.getFullYear();
        const cbTransactionsThisYear = (Array.isArray(transactions) ? transactions : [])
            .filter(t => t.documentNumber && t.documentNumber.startsWith(`CB-${year}`));
        const lastNumber = cbTransactionsThisYear
            .map(t => {
                const parts = t.documentNumber!.split('-');
                return parts.length === 3 ? parseInt(parts[2], 10) : 0;
            })
            .reduce((max, num) => Math.max(max, num), 0);
        const newDocumentNumber = `CB-${year}-${String(lastNumber + 1).padStart(4, '0')}`;

        // 3. Create a transaction
        const newTransaction: StockTransaction = {
            id: `TXN-SALE-${Date.now()}`,
            stockItemId: itemToSell.id,
            stockItemName: itemToSell.name,
            type: 'ขายของเก่า',
            quantity: -totalQuantity,
            transactionDate: new Date().toISOString(),
            actor: data.buyer,
            notes: detailedNotes,
            pricePerUnit: averagePrice, // Using weighted average price
            documentNumber: newDocumentNumber,
        };
        setTransactions(prev => [newTransaction, ...prev]);

        addToast(`บันทึกการขาย ${itemToSell.name} จำนวน ${totalQuantity} ${itemToSell.unit} สำเร็จ`, 'success');

        // Set data for printing modal
        setSaleToPrint({ item: itemToSell, saleData: data, billNumber: newDocumentNumber });

        setItemToSell(null); // Close the sale modal
    };

    const handleDeleteUsedPart = async (partId: string) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?', 'ลบ');
            if (confirmed) {
                deleteUsedPart(partId);
            }
        }
    };

    const getUsedPartRemaining = (part: UsedPart) => {
        const disposed = (part.dispositions || []).reduce((sum, d) => sum + d.quantity, 0);
        return (part.initialQuantity || 0) - disposed;
    };

    const getStatusBadge = (status: StockStatus) => {
        switch (status) {
            case 'สต็อกต่ำ': return 'bg-yellow-100 text-yellow-800';
            case 'หมดสต็อก': return 'bg-red-100 text-red-800';
            case 'สต๊อกเกิน': return 'bg-purple-100 text-purple-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    const getUsedPartStatusBadge = (status: UsedPartBatchStatus) => {
        switch (status) {
            case 'รอจัดการ': return 'bg-gray-200 text-gray-800';
            case 'จัดการบางส่วน': return 'bg-blue-100 text-blue-800';
            case 'จัดการครบแล้ว': return 'bg-green-100 text-green-800';
        }
    };

    const TabButton: React.FC<{ tabId: typeof activeTab, label: string, count: number }> = ({ tabId, label, count }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${activeTab === tabId
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            {label} <span className="text-sm font-normal bg-gray-200 rounded-full px-2 py-0.5">{count}</span>
        </button>
    );

    const renderStockTable = (items: StockItem[]) => (
        <div className="bg-white rounded-2xl shadow-sm lg:overflow-auto max-h-[65vh] relative">
            <table className="min-w-full responsive-table">
                <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อ</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">สต็อก (พร้อมใช้)</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ขั้นต่ำ</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคาทุน</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {items.map(item => {
                        const needsPurchase = item.quantity <= item.minStock;
                        const isRequested = activePRStockIds.has(item.id);
                        const displayStatus = calculateStockStatus(item.quantity, item.minStock, item.maxStock);
                        return (
                            <tr key={item.id}>
                                <td data-label="รหัส / ชื่อ" className="px-4 py-3"><div className="font-semibold">{item.name}</div><div className="text-sm text-gray-500 font-mono">{item.code}</div></td>
                                <td data-label="หมวดหมู่" className="px-4 py-3 text-sm">{item.category}</td>
                                <td data-label="สต็อก" className="px-4 py-3 text-right">
                                    <span className={`font-bold text-lg ${item.quantity <= item.minStock ? 'text-red-600' : ''}`}>{item.quantity} {item.unit}</span>
                                </td>
                                <td data-label="ขั้นต่ำ" className="px-4 py-3 text-right text-sm">{item.minStock}</td>
                                <td data-label="ราคาทุน" className="px-4 py-3 text-right text-sm">{formatCurrency(item.price)}</td>
                                <td data-label="สถานะ" className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(displayStatus)}`}>{displayStatus}</span></td>
                                <td data-label="จัดการ" className="px-4 py-3 text-center lg:text-right whitespace-nowrap space-x-1">
                                    {item.isFungibleUsedItem && (
                                        <button onClick={() => setItemToSell(item)} className="text-green-600 hover:text-green-800 p-1 text-xs font-semibold">คัดแยก/ขาย</button>
                                    )}
                                    <button onClick={async () => {
                                        if (await promptForPasswordAsync('แก้ไข')) {
                                            handleOpenStockModal(item);
                                        }
                                    }} className="text-yellow-600 hover:text-yellow-800 p-1 text-xs font-semibold">แก้</button>
                                    {isRequested ? (
                                        <span className="text-blue-500 p-1 text-xs font-semibold italic">ขอซื้อแล้ว</span>
                                    ) : (
                                        <button
                                            onClick={() => setItemToRequest(item)}
                                            className="text-green-600 hover:text-green-800 p-1 text-xs font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={!needsPurchase || item.isFungibleUsedItem}
                                            title={needsPurchase ? "สร้างใบขอซื้อสำหรับรายการนี้" : "สต็อกยังไม่ถึงจุดสั่งซื้อ"}
                                        >
                                            ขอซื้อ
                                        </button>
                                    )}
                                    <button onClick={() => { setItemToPrint(item); setPrintModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1 text-xs font-semibold">พิมพ์</button>
                                    <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-red-500 hover:text-red-700 p-1 text-xs font-semibold">ลบ</button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'new':
                return (
                    <>
                        <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => handleOpenStockModal()} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center gap-2"> <span>+</span> เพิ่มรายการใหม่</button>
                                    <button onClick={() => setReceiveFromPOModalOpen(true)} className="px-4 py-2 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-md transition-all active:scale-95">รับเข้าสต็อก (จาก PO)</button>
                                    <button onClick={() => setWithdrawModalOpen(true)} disabled={safeStock.length === 0} className="px-4 py-2 text-sm font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 shadow-md transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none">เบิกใช้ทั่วไป</button>
                                    <button onClick={() => setReturnModalOpen(true)} disabled={safeStock.length === 0} className="px-4 py-2 text-sm font-bold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 shadow-md transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none">คืนร้านค้า</button>
                                </div>
                                <button
                                    onClick={handleExportStock}
                                    className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
                                >
                                    <Download size={16} />
                                    ส่งออก CSV
                                </button>
                            </div>

                            {/* Inventory Insights (Forecasting) */}
                            {activeTab === 'new' && stockInsights.length > 0 && (
                                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                                        <TrendingDown size={18} />
                                        พยากรณ์คลังสินค้า: รายการที่คาดว่าจะหมดเร็วๆ นี้ (Inventory Forecasting)
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {stockInsights.slice(0, 4).map(item => (
                                            <div key={item.id} className={`flex-1 min-w-[200px] p-3 rounded-lg border bg-white ${item.isUrgent ? 'border-red-200 bg-red-50' : 'border-amber-200'}`}>
                                                <div className="text-xs font-bold text-slate-500 truncate">{item.name}</div>
                                                <div className="flex justify-between items-end mt-1">
                                                    <div className="text-sm font-extrabold text-slate-800">{item.quantity} {item.unit}</div>
                                                    <div className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${item.isUrgent ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                                        ~ {item.daysRemaining === Infinity ? '∞' : item.daysRemaining} วันจะหมด
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {renderStockTable(newStockItems)}
                    </>
                );
            case 'revolving':
                return (
                    <>
                        <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <button onClick={() => handleOpenStockModal(null, { isRevolvingPart: true })} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"> + เพิ่มอะไหล่หมุนเวียน</button>

                                <label className="flex items-center gap-2 text-sm text-gray-700 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={hideZeroRevolving}
                                        onChange={(e) => setHideZeroRevolving(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    ซ่อนรายการที่หมด (0)
                                </label>
                            </div>
                        </div>
                        {renderStockTable(revolvingStockItems)}
                    </>
                );
            case 'usedFungible':
                return (
                    <>
                        <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleOpenStockModal(null, { isFungibleUsedItem: true })} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"> + เพิ่มรายการของเก่ารวม</button>
                            </div>
                        </div>
                        {renderStockTable(fungibleUsedItems)}
                    </>
                );
            case 'usedItemized':
                return (
                    <>
                        <div className="bg-white rounded-2xl shadow-sm lg:overflow-auto max-h-[65vh]">
                            <table className="min-w-full responsive-table">
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่ / วันที่ถอด</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่มา (ใบซ่อม / ทะเบียน)</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน (เริ่มต้น / คงเหลือ)</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {paginatedUsedParts.map(part => (
                                        <tr key={part.id}>
                                            <td data-label="ชื่ออะไหล่" className="px-4 py-3"><div className="font-semibold">{part.name}</div><div className="text-sm text-gray-500">{new Date(part.dateRemoved).toLocaleDateString('th-TH')}</div></td>
                                            <td data-label="ที่มา" className="px-4 py-3"><div className="font-medium">{part.fromRepairOrderNo}</div><div className="text-sm text-gray-500">{part.fromLicensePlate}</div></td>
                                            <td data-label="จำนวน" className="px-4 py-3 text-right"><div className="font-bold text-lg">{part.initialQuantity}</div><div className="text-sm text-gray-500">เหลือ: {getUsedPartRemaining(part)}</div></td>
                                            <td data-label="สถานะ" className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUsedPartStatusBadge(part.status)}`}>{part.status}</span></td>
                                            <td data-label="จัดการ" className="px-4 py-3 text-center lg:text-right whitespace-nowrap space-x-1">
                                                <button onClick={() => { setPartToProcess(part); setProcessUsedPartModalOpen(true); }} className="text-green-600 hover:text-green-800 p-1 text-xs font-semibold">จัดการ</button>
                                                <button onClick={async () => { if (await promptForPasswordAsync('แก้ไข')) { setPartToEdit(part); setEditUsedPartModalOpen(true); } }} className="text-yellow-600 hover:text-yellow-800 p-1 text-xs font-semibold">แก้</button>
                                                <button onClick={() => handleDeleteUsedPart(part.id)} className="text-red-500 hover:text-red-700 p-1 text-xs font-semibold">ลบ</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedUsedParts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-10 text-gray-500">
                                                ไม่พบรายการอะไหล่เก่า
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <label htmlFor="used-items-per-page" className="text-sm font-medium">แสดง:</label>
                                <select
                                    id="used-items-per-page"
                                    value={usedPartsItemsPerPage}
                                    onChange={e => setUsedPartsItemsPerPage(Number(e.target.value))}
                                    className="p-1 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm text-gray-700">
                                    จาก {filteredUsedParts.length} รายการ
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setUsedPartsCurrentPage(p => Math.max(1, p - 1))} disabled={usedPartsCurrentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                                <span className="text-sm font-semibold">หน้า {usedPartsCurrentPage} / {usedPartsTotalPages || 1}</span>
                                <button onClick={() => setUsedPartsCurrentPage(p => Math.min(usedPartsTotalPages, p + 1))} disabled={usedPartsCurrentPage === usedPartsTotalPages || usedPartsTotalPages === 0} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                            </div>
                        </div>
                    </>
                );
            case 'history':
                return (
                    <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6">
                        <StockHistory
                            transactions={transactions}
                            stock={stock}
                            repairs={repairs}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-t-2xl shadow-sm">
                <div className="border-b">
                    <TabButton tabId="new" label="คลังอะไหล่ใหม่" count={newStockItems.length} />
                    <TabButton tabId="revolving" label="คลังอะไหล่หมุนเวียน" count={revolvingStockItems.length} />
                    <TabButton tabId="usedFungible" label="คลังของเก่าแบบรวม" count={fungibleUsedItems.length} />
                    <TabButton tabId="usedItemized" label="คลังอะไหล่เก่า (รายชิ้น)" count={filteredUsedParts.length} />
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${activeTab === 'history'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🕒 ประวัติสต็อก
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg lg:col-span-2" />
                    {activeTab !== 'usedItemized' && activeTab !== 'history' && (
                        <>
                            <select
                                aria-label="Filter by category"
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg"
                            >
                                <option value="all">ทุกหมวดหมู่</option>
                                {STOCK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <select
                                aria-label="Filter by status"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="w-full p-3 border border-gray-300 rounded-lg"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="ปกติ">ปกติ</option>
                                <option value="สต็อกต่ำ">สต็อกต่ำ</option>
                                <option value="หมดสต็อก">หมดสต็อก</option>
                                <option value="สต๊อกเกิน">สต๊อกเกิน</option>
                            </select>
                        </>
                    )}
                </div>
            </div>

            {renderContent()}

            {/* Modals */}
            {isStockModalOpen && <StockModal item={editingItem} defaults={stockModalDefaults} onSave={handleSaveItem} onClose={() => setStockModalOpen(false)} existingStock={safeStock} />}
            {isReceiveFromPOModalOpen && (
                <ReceiveFromPOModal
                    isOpen={isReceiveFromPOModalOpen}
                    onClose={() => setReceiveFromPOModalOpen(false)}
                    purchaseRequisitions={purchaseRequisitions}
                    setPurchaseRequisitions={setPurchaseRequisitions}
                    setStock={setStock}
                    setTransactions={setTransactions}
                />
            )}
            {isWithdrawModalOpen && <StockWithdrawalModal stock={safeStock} onSave={handleWithdrawStock} onClose={() => setWithdrawModalOpen(false)} />}
            {isReturnModalOpen && <ReturnStockModal stock={safeStock} onSave={handleReturnStock} onClose={() => setReturnModalOpen(false)} />}
            {isPrintModalOpen && itemToPrint && <PrintLabelModal item={itemToPrint} onClose={() => setPrintModalOpen(false)} />}
            {isProcessUsedPartModalOpen && partToProcess && <ProcessUsedPartModal part={partToProcess} stock={stock} onProcess={processUsedPartBatch} onClose={() => setProcessUsedPartModalOpen(false)} />}
            {isEditUsedPartModalOpen && partToEdit && <EditUsedPartBatchModal part={partToEdit} onSave={updateUsedPart} onClose={() => setEditUsedPartModalOpen(false)} />}
            {isUpdateUsedPartStatusModalOpen && partToUpdateStatus && <UpdateUsedPartStatusModal usedPart={partToUpdateStatus} onSave={updateUsedPart} onClose={() => setUpdateUsedPartStatusModalOpen(false)} />}

            {itemToRequest && (
                <CreatePRFromStockModal
                    item={itemToRequest}
                    suppliers={suppliers}
                    onSave={handleSavePurchaseRequest}
                    onClose={() => setItemToRequest(null)}
                />
            )}
            {itemToSell && (
                <SellFungibleItemModal
                    item={itemToSell}
                    buyers={usedPartBuyers}
                    onSave={handleGradedSale}
                    onClose={() => setItemToSell(null)}
                />
            )}
            {saleToPrint && (
                <CashBillPrintModal
                    item={saleToPrint.item}
                    saleData={saleToPrint.saleData}
                    billNumber={saleToPrint.billNumber}
                    onClose={() => setSaleToPrint(null)}
                />
            )}
        </div>
    );
};

export default StockManagement;