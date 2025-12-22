import { useFirebase } from './useFirebase';
import { useToast } from '../context/ToastContext';
import type { StockItem, StockTransaction, UsedPart, UsedPartBuyer, Supplier, PurchaseRequisition, PurchaseOrder, UsedPartBatchStatus, UsedPartDisposition } from '../types';
import { getDefaultStock, getDefaultStockTransactions, getDefaultSuppliers, getDefaultUsedPartBuyers, getDefaultPurchaseRequisitions } from '../data/defaultData';

export const useInventory = () => {
    const { addToast } = useToast();
    const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
    const [transactions, setTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);
    const [usedParts, setUsedParts] = useFirebase<UsedPart[]>('usedParts', []);
    const [usedPartBuyers, setUsedPartBuyers] = useFirebase<UsedPartBuyer[]>('usedPartBuyers', getDefaultUsedPartBuyers);
    const [suppliers, setSuppliers] = useFirebase<Supplier[]>('suppliers', getDefaultSuppliers);
    const [purchaseRequisitions, setPurchaseRequisitions] = useFirebase<PurchaseRequisition[]>('purchaseRequisitions', getDefaultPurchaseRequisitions);
    const [purchaseOrders, setPurchaseOrders] = useFirebase<PurchaseOrder[]>('purchaseOrders', []);

    const addUsedParts = (newUsedParts: Omit<UsedPart, 'id'>[]) => {
        const fullUsedParts = newUsedParts.map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}` }));
        setUsedParts(prev => [...fullUsedParts, ...prev]);
    };

    const updateFungibleStock = (updates: { stockItemId: string, quantity: number, repairOrderNo: string }[]) => {
        let updatedStock = [...stock];
        const newTransactions: StockTransaction[] = [];

        updates.forEach(update => {
            const stockIndex = updatedStock.findIndex(s => s.id === update.stockItemId);
            if (stockIndex > -1) {
                const stockItem = updatedStock[stockIndex];
                stockItem.quantity += update.quantity;

                newTransactions.push({
                    id: `TXN-RETURN-${Date.now()}-${stockItem.id}`,
                    stockItemId: stockItem.id,
                    stockItemName: stockItem.name,
                    type: 'รับเข้า',
                    quantity: update.quantity,
                    transactionDate: new Date().toISOString(),
                    actor: 'ระบบ',
                    notes: `รับคืนของเก่าจากใบซ่อม ${update.repairOrderNo}`,
                    relatedRepairOrder: update.repairOrderNo,
                    pricePerUnit: 0,
                });
            }
        });

        setStock(updatedStock);
        if (newTransactions.length > 0) {
            setTransactions(prev => [...newTransactions, ...prev]);
        }
        addToast(`อัปเดตสต็อกของเก่า ${updates.length} รายการ`, 'success');
    };

    const updateUsedPart = (partToUpdate: UsedPart) => {
        setUsedParts(prev => prev.map(p => p.id === partToUpdate.id ? partToUpdate : p));
    };

    const deleteUsedPart = (partId: string) => {
        setUsedParts(prev => prev.filter(p => p.id !== partId));
    };

    const deleteUsedPartDisposition = (usedPartId: string, dispositionId: string) => {
        const currentUsedParts = Array.isArray(usedParts) ? usedParts : [];
        const partIndex = currentUsedParts.findIndex(p => p.id === usedPartId);
        if (partIndex === -1) {
            addToast('ไม่พบรายการอะไหล่เก่า', 'error');
            return;
        }

        const partToUpdate = { ...currentUsedParts[partIndex] };
        const dispositionToRemove = (partToUpdate.dispositions || []).find(d => d.id === dispositionId);

        if (!dispositionToRemove) {
            addToast('ไม่พบรายการจัดการ', 'error');
            return;
        }

        // --- Revert Logic ---
        let stockReverted = false;
        if (dispositionToRemove.dispositionType === 'ย้ายไปคลังหมุนเวียน') {
            const originalStockItem = stock.find(s => s.id === partToUpdate.originalPartId && !s.isFungibleUsedItem);
            let revolvingStockItemToUpdate: StockItem | undefined;

            if (originalStockItem) {
                const revolvingCode = `${originalStockItem.code}-R`;
                revolvingStockItemToUpdate = stock.find(s => s.code === revolvingCode && s.isRevolvingPart);
            } else {
                revolvingStockItemToUpdate = stock.find(s => s.name === partToUpdate.name && s.isRevolvingPart);
            }

            if (revolvingStockItemToUpdate) {
                setStock(prev => prev.map(s => s.id === revolvingStockItemToUpdate!.id ? { ...s, quantity: s.quantity - dispositionToRemove.quantity } : s));
                setTransactions(prev => [{
                    id: `TXN-REVERT-${Date.now()}`,
                    stockItemId: revolvingStockItemToUpdate!.id, stockItemName: revolvingStockItemToUpdate!.name, type: 'ปรับสต็อก',
                    quantity: -dispositionToRemove.quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ',
                    notes: `ย้อนกลับการย้ายจากอะไหล่เก่า: ${partToUpdate.name}`, pricePerUnit: 0
                }, ...prev]);
                stockReverted = true;
            }
        } else if (dispositionToRemove.dispositionType === 'ย้ายไปสต็อกของเก่ารวม') {
            const notes = dispositionToRemove.notes || '';
            const match = notes.match(/ย้ายไปยังสต็อกของเก่า: (.*?) \(/);
            if (match && match[1]) {
                const fungibleItemName = match[1];
                const fungibleItemToUpdate = stock.find(s => s.name === fungibleItemName && s.isFungibleUsedItem);
                if (fungibleItemToUpdate) {
                    setStock(prev => prev.map(s => s.id === fungibleItemToUpdate!.id ? { ...s, quantity: s.quantity - dispositionToRemove.quantity } : s));
                    setTransactions(prev => [{
                        id: `TXN-REVERT-${Date.now()}`,
                        stockItemId: fungibleItemToUpdate!.id, stockItemName: fungibleItemToUpdate!.name, type: 'ปรับสต็อก',
                        quantity: -dispositionToRemove.quantity, transactionDate: new Date().toISOString(), actor: 'ระบบ',
                        notes: `ย้อนกลับการย้ายจากอะไหล่เก่า: ${partToUpdate.name}`, pricePerUnit: 0
                    }, ...prev]);
                    stockReverted = true;
                }
            }
        }

        setUsedParts(prev => {
            const newUsedParts = [...prev];
            const updatedPart = { ...newUsedParts[partIndex] };
            updatedPart.dispositions = (updatedPart.dispositions || []).filter(d => d.id !== dispositionId);
            const totalDisposedQty = updatedPart.dispositions.reduce((sum, d) => sum + d.quantity, 0);
            let newStatus: UsedPartBatchStatus = 'รอจัดการ';
            if (totalDisposedQty >= updatedPart.initialQuantity) newStatus = 'จัดการครบแล้ว';
            else if (totalDisposedQty > 0) newStatus = 'จัดการบางส่วน';
            updatedPart.status = newStatus;
            newUsedParts[partIndex] = updatedPart;
            return newUsedParts;
        });

        addToast(`ย้อนกลับรายการ '${dispositionToRemove.dispositionType}' ของ '${partToUpdate.name}' ${stockReverted ? 'และคืนสต็อก' : ''}สำเร็จ`, 'success');
    };

    const processUsedPartBatch = (
        partId: string,
        decision: { type: 'to_fungible' | 'to_revolving_stock' | 'dispose', fungibleStockId?: string, quantity?: number, notes?: string }
    ) => {
        const partToProcess = usedParts.find(p => p.id === partId);
        if (!partToProcess) {
            addToast('ไม่พบรายการอะไหล่เก่าที่ต้องการจัดการ', 'error');
            return;
        }

        const remainingQty = partToProcess.initialQuantity - (partToProcess.dispositions || []).reduce((sum, d) => sum + d.quantity, 0);
        if (remainingQty <= 0) {
            addToast('อะไหล่ชิ้นนี้ถูกจัดการครบจำนวนแล้ว', 'warning');
            return;
        }

        const newDispositionBase: Omit<UsedPartDisposition, 'dispositionType'> = {
            id: `DISP-${Date.now()}`,
            quantity: remainingQty,
            condition: 'ดี' as const,
            date: new Date().toISOString(),
            soldTo: null, salePricePerUnit: null, storageLocation: null,
            notes: decision.notes || null,
        };

        switch (decision.type) {
            case 'to_fungible': {
                if (!decision.fungibleStockId || decision.quantity === undefined || decision.quantity <= 0) return;
                const quantityToAdd = decision.quantity;
                let fungibleItem: StockItem | undefined;

                setStock(prev => prev.map(s => {
                    if (s.id === decision.fungibleStockId) {
                        fungibleItem = s;
                        return { ...s, quantity: s.quantity + quantityToAdd };
                    }
                    return s;
                }));

                if (fungibleItem) {
                    setTransactions(prev => [{
                        id: `TXN-MOVE-${Date.now()}`,
                        stockItemId: fungibleItem!.id, stockItemName: fungibleItem!.name, type: 'ย้ายสต็อก',
                        quantity: quantityToAdd, transactionDate: new Date().toISOString(), actor: 'ระบบ',
                        notes: `ย้ายจากอะไหล่เก่า: ${partToProcess.name} (${remainingQty} ${partToProcess.unit})`, pricePerUnit: 0
                    }, ...prev]);

                    setUsedParts(prev => prev.map(p => p.id === partId ? {
                        ...p,
                        status: 'จัดการครบแล้ว',
                        dispositions: [...(p.dispositions || []), {
                            ...newDispositionBase,
                            dispositionType: 'ย้ายไปสต็อกของเก่ารวม',
                            notes: `ย้ายไปยังสต็อกของเก่า: ${fungibleItem!.name} (${quantityToAdd} ${fungibleItem!.unit})`
                        }]
                    } : p));
                    addToast(`ย้าย '${partToProcess.name}' ไปยังสต็อกของเก่ารวมสำเร็จ`, 'success');
                }
                break;
            }

            case 'to_revolving_stock': {
                const originalStockItem = stock.find(s => s.id === partToProcess.originalPartId && !s.isFungibleUsedItem);
                let newStockList = [...stock];
                let revolvingStockItem: StockItem | undefined;
                let isNewRevolvingItem = false;
                let originalPrice = 0;

                if (originalStockItem) {
                    originalPrice = originalStockItem.price;
                    const revolvingCode = `${originalStockItem.code}-R`;
                    revolvingStockItem = stock.find(s => s.code === revolvingCode && s.isRevolvingPart);

                    if (revolvingStockItem) {
                        newStockList = newStockList.map(s => s.id === revolvingStockItem!.id ? { ...s, quantity: s.quantity + remainingQty } : s);
                    } else {
                        isNewRevolvingItem = true;
                        revolvingStockItem = {
                            ...originalStockItem,
                            id: `STK-${Date.now()}`,
                            code: revolvingCode,
                            quantity: remainingQty,
                            isRevolvingPart: true,
                            isFungibleUsedItem: false,
                        };
                        newStockList.push(revolvingStockItem);
                    }
                } else {
                    isNewRevolvingItem = true;
                    let existingRevolvingByName = stock.find(s => s.name === partToProcess.name && s.isRevolvingPart);
                    if (existingRevolvingByName) {
                        revolvingStockItem = existingRevolvingByName;
                        isNewRevolvingItem = false;
                        newStockList = newStockList.map(s => s.id === revolvingStockItem!.id ? { ...s, quantity: s.quantity + remainingQty } : s);
                    } else {
                        const newCode = `${partToProcess.name.replace(/\s/g, '').substring(0, 10).toUpperCase()}-R`;
                        revolvingStockItem = {
                            id: `STK-${Date.now()}`,
                            code: newCode,
                            name: partToProcess.name,
                            category: '🔩 11. หมวดอื่นๆ (Miscellaneous)',
                            quantity: remainingQty,
                            unit: partToProcess.unit,
                            minStock: 0,
                            maxStock: null,
                            price: 0,
                            sellingPrice: null,
                            storageLocation: '',
                            supplier: '',
                            status: 'ปกติ',
                            isRevolvingPart: true,
                            isFungibleUsedItem: false,
                        };
                        newStockList.push(revolvingStockItem);
                    }
                }

                setStock(newStockList);
                setTransactions(prev => [{
                    id: `TXN-REVOLVE-${Date.now()}`,
                    stockItemId: revolvingStockItem!.id, stockItemName: revolvingStockItem!.name, type: 'คืนของใช้ได้',
                    quantity: remainingQty, transactionDate: new Date().toISOString(), actor: 'ระบบ',
                    notes: `รับคืนจากอะไหล่เก่า: ${partToProcess.name}${originalStockItem ? '' : ' (สร้างรายการใหม่)'}`,
                    pricePerUnit: originalPrice
                }, ...prev]);

                setUsedParts(prev => prev.map(p => p.id === partId ? {
                    ...p,
                    status: 'จัดการครบแล้ว',
                    dispositions: [...(p.dispositions || []), {
                        ...newDispositionBase,
                        dispositionType: 'ย้ายไปคลังหมุนเวียน',
                        storageLocation: revolvingStockItem!.storageLocation,
                        notes: `ย้ายไปยังคลังอะไหล่หมุนเวียน (${isNewRevolvingItem ? 'สร้างใหม่' : 'เพิ่ม'})`
                    }]
                } : p));
                addToast(`ย้าย '${partToProcess.name}' ไปยังคลังอะไหล่หมุนเวียนสำเร็จ`, 'success');
                break;
            }

            case 'dispose':
                setUsedParts(prev => prev.map(p => p.id === partId ? {
                    ...p,
                    status: 'จัดการครบแล้ว',
                    dispositions: [...(p.dispositions || []), {
                        ...newDispositionBase,
                        dispositionType: 'ทิ้ง',
                        condition: 'ชำรุด',
                    }]
                } : p));
                addToast(`ทิ้ง '${partToProcess.name}' และบันทึกในประวัติสำเร็จ`, 'info');
                break;
        }
    };

    const lowStockCount = (Array.isArray(stock) ? stock : []).filter(s => s.quantity <= s.minStock).length;

    return {
        stock,
        setStock,
        transactions,
        setTransactions,
        usedParts,
        setUsedParts,
        usedPartBuyers,
        setUsedPartBuyers,
        suppliers,
        setSuppliers,
        purchaseRequisitions,
        setPurchaseRequisitions,
        purchaseOrders,
        setPurchaseOrders,
        addUsedParts,
        updateFungibleStock,
        updateUsedPart,
        deleteUsedPart,
        deleteUsedPartDisposition,
        processUsedPartBatch,
        lowStockCount
    };
};
