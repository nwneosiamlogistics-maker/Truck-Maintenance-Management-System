import React, { useState, useMemo, useEffect } from 'react';
import type { Tab, Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, PurchaseRequisition, Vehicle, Notification, Supplier, UsedPartBuyer, UsedPart, AnnualPMPlan, PMHistory, RepairFormSeed, RepairKPI, Holiday, UsedPartDisposition, UsedPartBatchStatus } from './types';
import { TABS } from './constants';
import { getDefaultTechnicians, getDefaultRepairs, getDefaultStock, getDefaultReports, getDefaultMaintenancePlans, getDefaultStockTransactions, getDefaultPurchaseRequisitions, getDefaultVehicles, getDefaultSuppliers, getDefaultUsedPartBuyers, getDefaultAnnualPMPlans, getDefaultKpiData } from './data/defaultData';
import { useFirebase } from './hooks/useFirebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
import TechnicianManagement from './components/TechnicianManagement';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import Reports from './components/Reports';
import MaintenancePlanner from './components/MaintenancePlanner';
import Estimation from './components/Estimation';
import TechnicianPerformance from './components/TechnicianPerformance';
import TechnicianWorkLog from './components/TechnicianWorkLog';
import VehicleRepairHistory from './components/VehicleRepairHistory';
import StockHistory from './components/StockHistory';
import PurchaseRequisitionComponent from './components/PurchaseRequisition';
import VehicleManagement from './components/VehicleManagement';
import SupplierManagement from './components/SupplierManagement';
import UsedPartBuyerManagement from './components/UsedPartBuyerManagement';
import UsedPartReport from './components/UsedPartReport';
import TechnicianView from './components/TechnicianView';
import PreventiveMaintenance from './components/PreventiveMaintenance';
import DailyChecklistPage from './components/DailyChecklistPage';
import TireCheckPage from './components/TireCheckPage';
import ToolManagement from './components/ToolManagement';
import KPIDashboard from './components/KPIDashboard';
import KPIManagement from './components/KPIManagement';
import Settings from './components/Settings';
import FleetKPIDashboard from './components/FleetKPIDashboard';
import { useToast } from './context/ToastContext';
import AnalyticsDashboard from './components/AnalyticsDashboard';


const AppContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    // Data Management using Firebase Realtime Database
    const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', getDefaultRepairs);
    const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
    const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
    const [transactions, setTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);
    const [reports, setReports] = useFirebase<Report[]>('reports', getDefaultReports);
    const [maintenancePlans, setMaintenancePlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
    const [purchaseRequisitions, setPurchaseRequisitions] = useFirebase<PurchaseRequisition[]>('purchaseRequisitions', getDefaultPurchaseRequisitions);
    const [vehicles, setVehicles] = useFirebase<Vehicle[]>('vehicles', getDefaultVehicles);
    const [suppliers, setSuppliers] = useFirebase<Supplier[]>('suppliers', getDefaultSuppliers);
    const [usedPartBuyers, setUsedPartBuyers] = useFirebase<UsedPartBuyer[]>('usedPartBuyers', getDefaultUsedPartBuyers);
    const [usedParts, setUsedParts] = useFirebase<UsedPart[]>('usedParts', []);
    const [annualPlans, setAnnualPlans] = useFirebase<AnnualPMPlan[]>('annualPlans', getDefaultAnnualPMPlans);
    const [pmHistory, setPmHistory] = useFirebase<PMHistory[]>('pmHistory', []);
    const [notifications, setNotifications] = useFirebase<Notification[]>('notifications', []);
    const [repairFormSeed, setRepairFormSeed] = useState<RepairFormSeed | null>(null);
    const [checklists, setChecklists] = useFirebase('dailyChecklists', []);
    const [tireInspections, setTireInspections] = useFirebase('tireInspections', []);
    const [tools, setTools] = useFirebase('tools', []);
    const [toolTransactions, setToolTransactions] = useFirebase('toolTransactions', []);
    const [kpiData, setKpiData] = useFirebase<RepairKPI[]>('kpiData', getDefaultKpiData);
    const [holidays, setHolidays] = useFirebase<Holiday[]>('companyHolidays', []);
    
    const { addToast } = useToast();


    const addRepair = (newRepairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
        const now = new Date();
        const year = now.getFullYear();
        const repairsThisYear = repairs.filter(r => new Date(r.createdAt).getFullYear() === year);
        const nextId = repairsThisYear.length + 1;
        const newRepairOrderNo = `RO-${year}-${String(nextId).padStart(5, '0')}`;
        
        const newRepair: Repair = {
            ...newRepairData,
            id: `R-${Date.now()}`,
            repairOrderNo: newRepairOrderNo,
            status: 'รอซ่อม',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            approvalDate: null,
            repairStartDate: null,
            repairEndDate: null,
        };
        setRepairs(prev => [newRepair, ...prev]);
        setActiveTab('list');
    };
    
    const addUsedParts = (newUsedParts: Omit<UsedPart, 'id'>[]) => {
        const fullUsedParts = newUsedParts.map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}`}));
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
                    pricePerUnit: 0, // No cost value for used parts return
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
        
        // --- Update UsedPart state ---
        setUsedParts(prev => {
            const newUsedParts = [...(Array.isArray(prev) ? prev : [])];
            const updatedPart = { ...newUsedParts[partIndex] };
            updatedPart.dispositions = (updatedPart.dispositions || []).filter(d => d.id !== dispositionId);
    
            const totalDisposedQty = updatedPart.dispositions.reduce((sum, d) => sum + d.quantity, 0);
            let newStatus: UsedPartBatchStatus = 'รอจัดการ';
            if (totalDisposedQty >= updatedPart.initialQuantity) {
                newStatus = 'จัดการครบแล้ว';
            } else if (totalDisposedQty > 0) {
                newStatus = 'จัดการบางส่วน';
            }
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
            case 'to_fungible':
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
            
            case 'to_revolving_stock': {
                const originalStockItem = stock.find(s => s.id === partToProcess.originalPartId && !s.isFungibleUsedItem);
                let newStockList = [...stock];
                let revolvingStockItem: StockItem | undefined;
                let isNewRevolvingItem = false;
                let originalPrice = 0; // Default price

                if (originalStockItem) {
                    // Path for parts that were originally in stock
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
                    // New Path: For externally purchased parts becoming revolving stock
                    isNewRevolvingItem = true;
                    // First, check if a revolving part with the same name already exists
                    let existingRevolvingByName = stock.find(s => s.name === partToProcess.name && s.isRevolvingPart);
                    if (existingRevolvingByName) {
                        revolvingStockItem = existingRevolvingByName;
                        isNewRevolvingItem = false;
                        newStockList = newStockList.map(s => s.id === revolvingStockItem!.id ? { ...s, quantity: s.quantity + remainingQty } : s);
                    } else {
                        // Create a brand new stock item from scratch
                        const newCode = `${partToProcess.name.replace(/\s/g, '').substring(0, 10).toUpperCase()}-R`;
                        revolvingStockItem = {
                            id: `STK-${Date.now()}`,
                            code: newCode,
                            name: partToProcess.name,
                            category: '🔩 11. หมวดอื่นๆ (Miscellaneous)', // Default category
                            quantity: remainingQty,
                            unit: partToProcess.unit,
                            minStock: 0,
                            maxStock: null,
                            price: 0, // Price is unknown, default to 0, user can edit
                            sellingPrice: null,
                            storageLocation: '',
                            supplier: '', // Supplier is unknown
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
                    pricePerUnit: originalPrice // Will be 0 for new items
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

    const stats = useMemo(() => {
        const pendingRepairs = (Array.isArray(repairs) ? repairs : []).filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status)).length;
        const lowStock = (Array.isArray(stock) ? stock : []).filter(s => s.quantity <= s.minStock).length;
        
        const dueMaintenance = (Array.isArray(maintenancePlans) ? maintenancePlans : []).filter(plan => {
            const nextServiceDate = new Date(plan.lastServiceDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
            const daysUntil = (nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            return daysUntil <= 30;
        }).length;

        return { pendingRepairs, lowStock, dueMaintenance };
    }, [repairs, stock, maintenancePlans]);
    
    const unreadNotificationCount = useMemo(() => (Array.isArray(notifications) ? notifications : []).filter(n => !n.isRead).length, [notifications]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
            case 'analytics':
                return <AnalyticsDashboard
                    repairs={repairs}
                    maintenancePlans={maintenancePlans}
                    vehicles={vehicles}
                    pmHistory={pmHistory}
                    stock={stock}
                    technicians={technicians}
                />;
            case 'form':
                return <RepairForm 
                    technicians={technicians} 
                    stock={stock} 
                    addRepair={addRepair} 
                    repairs={repairs}
                    setActiveTab={setActiveTab}
                    vehicles={vehicles}
                    suppliers={suppliers}
                    initialData={repairFormSeed}
                    clearInitialData={() => setRepairFormSeed(null)}
                    kpiData={kpiData}
                    holidays={holidays}
                />;
            case 'list':
                return <RepairList 
                    repairs={repairs} 
                    setRepairs={setRepairs} 
                    technicians={technicians} 
                    stock={stock} 
                    setStock={setStock}
                    transactions={transactions}
                    setTransactions={setTransactions}
                    addUsedParts={addUsedParts}
                    updateFungibleStock={updateFungibleStock}
                    usedParts={usedParts}
                    suppliers={suppliers}
                />;
            case 'history':
                return <RepairHistory 
                    repairs={repairs}
                    setRepairs={setRepairs}
                    technicians={technicians} 
                    stock={stock}
                    setStock={setStock}
                    transactions={transactions}
                    setTransactions={setTransactions}
                    addUsedParts={addUsedParts}
                    updateFungibleStock={updateFungibleStock}
                    usedParts={usedParts}
                    suppliers={suppliers}
                />;
            case 'vehicle-repair-history':
                return <VehicleRepairHistory repairs={repairs} vehicles={vehicles} />;
            case 'stock':
                return <StockManagement 
                    stock={stock} 
                    setStock={setStock} 
                    transactions={transactions} 
                    setTransactions={setTransactions}
                    usedParts={usedParts}
                    updateUsedPart={updateUsedPart}
                    deleteUsedPart={deleteUsedPart}
                    setPurchaseRequisitions={setPurchaseRequisitions}
                    purchaseRequisitions={purchaseRequisitions}
                    suppliers={suppliers}
                    usedPartBuyers={usedPartBuyers}
                    setUsedParts={setUsedParts}
                    repairs={repairs}
                    processUsedPartBatch={processUsedPartBatch}
                />;
            case 'stock-history':
                 return <StockHistory transactions={transactions} stock={stock} repairs={repairs} technicians={technicians} />;
            case 'requisitions':
                return <PurchaseRequisitionComponent 
                    purchaseRequisitions={purchaseRequisitions} 
                    setPurchaseRequisitions={setPurchaseRequisitions} 
                    stock={stock} 
                    setStock={setStock}
                    setTransactions={setTransactions}
                    suppliers={suppliers}
                />;
            case 'suppliers':
                return <SupplierManagement suppliers={suppliers} setSuppliers={setSuppliers} />;
            case 'used-part-buyers':
                return <UsedPartBuyerManagement buyers={usedPartBuyers} setBuyers={setUsedPartBuyers} />;
            case 'used-part-report':
                return <UsedPartReport usedParts={usedParts} deleteUsedPartDisposition={deleteUsedPartDisposition} />;
            case 'technicians':
                return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
            case 'technicianPerformance':
                return <TechnicianPerformance repairs={repairs} technicians={technicians} />;
            case 'technicianWorkLog':
                return <TechnicianWorkLog repairs={repairs} technicians={technicians} />;
            case 'technician-view':
                return <TechnicianView repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} />;
            case 'estimation':
                return <Estimation repairs={repairs} kpiData={kpiData} />;
            case 'maintenance':
                return <MaintenancePlanner 
                    plans={maintenancePlans} 
                    setPlans={setMaintenancePlans} 
                    repairs={repairs}
                    technicians={technicians}
                    history={pmHistory}
                    setHistory={setPmHistory}
                    setRepairFormSeed={setRepairFormSeed}
                    setActiveTab={setActiveTab}
                    vehicles={vehicles}
                />;
             case 'kpi-management':
                return <KPIManagement kpiData={kpiData} setKpiData={setKpiData} />;
            case 'vehicles':
                return <VehicleManagement vehicles={vehicles} setVehicles={setVehicles} />;
            case 'preventive-maintenance':
                return <PreventiveMaintenance 
                    plans={maintenancePlans}
                    annualPlans={annualPlans}
                    setAnnualPlans={setAnnualPlans}
                    history={pmHistory}
                    setHistory={setPmHistory}
                    repairs={repairs}
                    vehicles={vehicles}
                    technicians={technicians}
                />;
            case 'daily-checklist':
                return <DailyChecklistPage 
                    checklists={checklists} 
                    setChecklists={setChecklists} 
                    vehicles={vehicles}
                    technicians={technicians}
                    setRepairFormSeed={setRepairFormSeed}
                    setActiveTab={setActiveTab}
                />;
            case 'tire-check':
                return <TireCheckPage inspections={tireInspections} setInspections={setTireInspections} vehicles={vehicles} />;
            case 'tool-management':
                return <ToolManagement 
                    tools={tools} 
                    setTools={setTools}
                    transactions={toolTransactions}
                    setTransactions={setToolTransactions}
                    technicians={technicians}
                />;
            case 'settings':
                return <Settings holidays={holidays} setHolidays={setHolidays} />;
            default:
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
        }
    };
    
    return (
        <div className="flex h-screen bg-slate-100">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isSidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
                stats={stats}
            />
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-72'}`}>
                <Header
                    pageTitle={TABS[activeTab].title}
                    pageSubtitle={TABS[activeTab].subtitle}
                    toggleMobileSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
                    notifications={notifications}
                    setNotifications={setNotifications}
                    unreadCount={unreadNotificationCount}
                    setActiveTab={setActiveTab}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
            <ToastContainer />
        </ToastProvider>
    );
};

export default App;