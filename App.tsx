import React, { useState, useMemo, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
import TechnicianManagement from './components/TechnicianManagement';
import Reports from './components/Reports';
import Estimation from './components/Estimation';
import MaintenancePlanner from './components/MaintenancePlanner';

import { useLocalStorage } from './hooks/useLocalStorage';
import { useFirebase } from './hooks/useFirebase';
import { getDefaultRepairs, getDefaultTechnicians, getDefaultStock, getDefaultReports, getDefaultMaintenancePlans, getDefaultStockTransactions } from './data/defaultData';
import type { Tab, Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction } from './types';
import { TABS } from './constants';

const AppContent: React.FC = () => {
    const [activeTab, setActiveTab] = useLocalStorage<Tab>('activeTab', 'dashboard');
    const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', getDefaultRepairs);
    const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
    const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
    const [reports, setReports] = useFirebase<Report[]>('reports', getDefaultReports);
    const [maintenancePlans, setMaintenancePlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
    const [stockTransactions, setStockTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);


    const [isSidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    const { addToast } = useToast();
    
    // One-time check to ensure legacy data is imported, even if Firebase was initialized before
    const [legacyDataImported, setLegacyDataImported] = useLocalStorage('legacyDataImported_v1', false);

    useEffect(() => {
        // Wait for repairs to be loaded from Firebase before checking
        if (repairs.length > 0 && !legacyDataImported) {
            const hasLegacyData = repairs.some(r => r.id.startsWith('LEGACY-'));
            
            if (!hasLegacyData) {
                console.log("Legacy data not found in Firebase. Forcing a re-seed.");
                const fullData = getDefaultRepairs();
                setRepairs(fullData); // This will overwrite the data in Firebase via the hook
                addToast('นำเข้าข้อมูลประวัติการซ่อมย้อนหลังสำเร็จ', 'info');
            }
            
            // Mark as checked/imported so this logic doesn't run again
            setLegacyDataImported(true);
        }
    }, [repairs, legacyDataImported, setRepairs, setLegacyDataImported, addToast]);


    const addRepair = (newRepairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
        // Deduct stock for parts from 'สต๊อกอู่'
        let stockUpdated = false;
        const newStock = [...stock];
        newRepairData.parts.forEach(part => {
            if (part.source === 'สต๊อกอู่') {
                const stockIndex = newStock.findIndex(item => item.id === part.partId);
                if (stockIndex !== -1 && newStock[stockIndex].quantity >= part.quantity) {
                    newStock[stockIndex].quantity -= part.quantity;
                    stockUpdated = true;
                } else {
                    addToast(`อะไหล่ ${part.name} ไม่เพียงพอในสต๊อก!`, 'error');
                    // In a real app, you might want to stop the process here
                }
            }
        });

        if (stockUpdated) {
            setStock(newStock);
            addToast('ตัดสต๊อกอะไหล่เรียบร้อย', 'info');
        }

        const generateNewRepairOrderNo = (): string => {
            const currentYear = new Date().getFullYear();
            const prefix = `RO-${currentYear}-`;
            
            const repairsThisYear = repairs.filter(r => r.repairOrderNo.startsWith(prefix));

            if (repairsThisYear.length === 0) {
                return `${prefix}00001`;
            }

            const maxNum = repairsThisYear.reduce((max, r) => {
                const numPart = parseInt(r.repairOrderNo.substring(prefix.length), 10);
                return numPart > max ? numPart : max;
            }, 0);

            const nextNum = maxNum + 1;
            const nextNumPadded = String(nextNum).padStart(5, '0');
            
            return `${prefix}${nextNumPadded}`;
        };

        const newRepair: Repair = {
            ...newRepairData,
            id: `MR-${Date.now()}`,
            repairOrderNo: generateNewRepairOrderNo(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'รอซ่อม',
        };
        setRepairs(prev => [newRepair, ...prev]);
        addToast(`สร้างใบแจ้งซ่อม ${newRepair.repairOrderNo} สำเร็จ`, 'success');
        setActiveTab('list');
    };

    const updateRepair = (updatedRepair: Repair) => {
        setRepairs(prev => prev.map(r => r.id === updatedRepair.id ? { ...updatedRepair, updatedAt: new Date().toISOString() } : r));
        addToast(`อัปเดตใบแจ้งซ่อม ${updatedRepair.repairOrderNo} สำเร็จ`, 'success');
    };

    const deleteRepair = (repairId: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งซ่อมนี้?')) {
            setRepairs(prev => prev.filter(r => r.id !== repairId));
            addToast('ลบใบแจ้งซ่อมสำเร็จ', 'info');
        }
    };
    
    const updateStockItem = (updatedItem: StockItem) => {
        setStock(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        addToast(`อัปเดตสต็อก ${updatedItem.name} สำเร็จ`, 'info');
    };

    const deleteStockItem = (itemId: string) => {
         if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบอะไหล่นี้?')) {
            setStock(prev => prev.filter(item => item.id !== itemId));
            addToast('ลบอะไหล่สำเร็จ', 'info');
         }
    };
    
    const getNewStockStatus = (quantity: number, minStock: number, maxStock?: number): StockItem['status'] => {
        if (quantity <= 0) return 'หมดสต๊อก';
        if (quantity <= minStock) return 'สต๊อกต่ำ';
        if (maxStock && quantity > maxStock) return 'สต๊อกเกิน';
        return 'ปกติ';
    };

    const addStock = (data: {
      stockItem: StockItem;
      quantityAdded: number;
      pricePerUnit?: number;
      requisitionNumber?: string;
      invoiceNumber?: string;
      notes?: string;
    }) => {
        const { stockItem, quantityAdded, pricePerUnit, requisitionNumber, invoiceNumber, notes } = data;

        const newQuantity = stockItem.quantity + quantityAdded;
        const newStatus = getNewStockStatus(newQuantity, stockItem.minStock, stockItem.maxStock);

        const updatedStockItem: StockItem = {
            ...stockItem,
            quantity: newQuantity,
            status: newStatus,
            price: pricePerUnit !== undefined ? pricePerUnit : stockItem.price,
        };
        updateStockItem(updatedStockItem);

        const newTransaction: StockTransaction = {
            id: `TXN-${Date.now()}`,
            stockItemId: stockItem.id,
            stockItemName: stockItem.name,
            type: 'in',
            quantityChange: quantityAdded,
            newQuantity: newQuantity,
            date: new Date().toISOString(),
            requisitionNumber: requisitionNumber,
            invoiceNumber: invoiceNumber,
            pricePerUnit: pricePerUnit,
            notes: notes,
        };
        setStockTransactions(prev => [newTransaction, ...prev]);

        addToast(`เพิ่มสต๊อก ${stockItem.name} จำนวน ${quantityAdded} ${stockItem.unit} สำเร็จ`, 'success');
    };


    const addMaintenancePlan = (newPlanData: Omit<MaintenancePlan, 'id'>) => {
        const newPlan: MaintenancePlan = {
            ...newPlanData,
            id: `MP-${Date.now()}`,
        };
        setMaintenancePlans(prev => [newPlan, ...prev]);
        addToast('เพิ่มแผนบำรุงรักษาใหม่สำเร็จ', 'success');
    };

    const stats = useMemo(() => {
        const lowStockCount = stock.filter(s => s.status === 'สต๊อกต่ำ' || s.status === 'หมดสต๊อก').length;
        const pendingRepairsCount = repairs.filter(r => r.status === 'รอซ่อม' || r.status === 'กำลังซ่อม' || r.status === 'รออะไหล่').length;
        return {
            pendingRepairs: pendingRepairsCount,
            lowStock: lowStockCount,
        };
    }, [repairs, stock]);
    
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
            case 'form':
                return <RepairForm technicians={technicians} stock={stock} addRepair={addRepair} />;
            case 'list':
                return <RepairList repairs={repairs} technicians={technicians} updateRepair={updateRepair} deleteRepair={deleteRepair} />;
            case 'history':
                return <RepairHistory repairs={repairs} technicians={technicians} />;
            case 'stock':
                return <StockManagement stock={stock} setStock={setStock} updateStockItem={updateStockItem} deleteStockItem={deleteStockItem} addStock={addStock} />;
            case 'technicians':
                return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
            case 'reports':
                return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
            case 'estimation':
                return <Estimation />;
            case 'maintenance':
                return <MaintenancePlanner plans={maintenancePlans} addPlan={addMaintenancePlan} />;
            default:
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
        }
    };

    const { title, subtitle } = TABS[activeTab];

    return (
        <div className="flex h-screen bg-gray-100">
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
                    pageTitle={title} 
                    pageSubtitle={subtitle}
                    toggleMobileSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
                />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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