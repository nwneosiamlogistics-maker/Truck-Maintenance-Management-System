import React, { useState, useMemo } from 'react';
// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
import StockHistory from './components/StockHistory';
import TechnicianManagement from './components/TechnicianManagement';
import TechnicianPerformance from './components/TechnicianPerformance';
import Reports from './components/Reports';
import Estimation from './components/Estimation';
import MaintenancePlanner from './components/MaintenancePlanner';
import PurchaseRequisitionPage from './components/PurchaseRequisition';
import VehicleManagement from './components/VehicleManagement';
import ToastContainer from './components/ToastContainer';
import { ToastProvider } from './context/ToastContext';

// Types and Constants
import type { Tab, Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, UsedPart, PurchaseRequisition, Vehicle, Notification } from './types';
import { TABS } from './constants';

// Hooks
import { useFirebase } from './hooks/useFirebase';

// Default Data
import {
    getDefaultRepairs,
    getDefaultTechnicians,
    getDefaultStock,
    getDefaultStockTransactions,
    getDefaultReports,
    getDefaultMaintenancePlans,
    getDefaultPurchaseRequisitions,
    getDefaultVehicles,
} from './data/defaultData';

function App() {
    // State Management
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    
    // Data states using useFirebase
    const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', getDefaultRepairs);
    const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
    const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
    const [transactions, setTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);
    const [reports, setReports] = useFirebase<Report[]>('reports', getDefaultReports);
    const [plans, setPlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
    const [usedParts, setUsedParts] = useFirebase<UsedPart[]>('usedParts', () => []);
    const [purchaseRequisitions, setPurchaseRequisitions] = useFirebase<PurchaseRequisition[]>('purchaseRequisitions', getDefaultPurchaseRequisitions);
    const [vehicles, setVehicles] = useFirebase<Vehicle[]>('vehicles', getDefaultVehicles);
    
    const [notifications, setNotifications] = useFirebase<Notification[]>('notifications', () => []);

    // UI State
    const [isCollapsed, setCollapsed] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);

    // Derived state for badges and stats
    const stats = useMemo(() => {
        const safeRepairs = Array.isArray(repairs) ? repairs : [];
        const safeStock = Array.isArray(stock) ? stock : [];
        const safePlans = Array.isArray(plans) ? plans : [];

        const pendingRepairs = safeRepairs.filter(r => ['รอซ่อม', 'รออะไหล่'].includes(r.status)).length;
        const lowStock = safeStock.filter(s => s.status === 'สต๊อกต่ำ' || s.status === 'หมดสต๊อก').length;
        
        const dueMaintenance = safePlans.filter(plan => {
             const lastDate = new Date(plan.lastServiceDate);
             let nextServiceDate = new Date(lastDate);

             if (plan.frequencyUnit === 'days') {
                 nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
             } else if (plan.frequencyUnit === 'weeks') {
                 nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
             } else { // months
                 nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);
             }

             const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
             return daysUntilNextService <= 7;
        }).length;
        
        return { pendingRepairs, lowStock, dueMaintenance };
    }, [repairs, stock, plans]);

    const unreadCount = useMemo(() => {
        const safeNotifications = Array.isArray(notifications) ? notifications : [];
        return safeNotifications.filter(n => !n.isRead).length;
    }, [notifications]);
    
    // Functions to modify state
    const addRepair = (repairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
        const now = new Date();
        const year = now.getFullYear();
        
        const lastRepairNumberForYear = (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.repairOrderNo && r.repairOrderNo.startsWith(`RO-${year}`))
            .map(r => parseInt(r.repairOrderNo.split('-')[2], 10))
            .reduce((max, num) => Math.max(max, num), 0);

        const newRepair: Repair = {
            id: `R${Date.now()}`,
            repairOrderNo: `RO-${year}-${String(lastRepairNumberForYear + 1).padStart(5, '0')}`,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            status: 'รอซ่อม',
            approvalDate: null,
            repairStartDate: null,
            repairEndDate: null,
            requisitionNumber: '',
            invoiceNumber: '',
            ...repairData
        };
        setRepairs(prev => [newRepair, ...(Array.isArray(prev) ? prev : [])]);
        setActiveTab('list');
    };
    
    const addUsedParts = (newUsedParts: Omit<UsedPart, 'id'>[]) => {
        const fullUsedParts = newUsedParts.map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}` }));
        setUsedParts(prev => [...fullUsedParts, ...(Array.isArray(prev) ? prev : [])]);
    };
    
    const updateUsedPart = (partToUpdate: UsedPart) => {
        setUsedParts(prev => (Array.isArray(prev) ? prev : []).map(p => p.id === partToUpdate.id ? partToUpdate : p));
    };

    const deleteUsedPart = (partId: string) => {
        setUsedParts(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== partId));
    };
    
    const deletePlan = (planId: string) => {
        setPlans(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== planId));
    };

    // Main content renderer
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
            case 'form':
                return <RepairForm technicians={technicians} stock={stock} addRepair={addRepair} repairs={repairs} setActiveTab={setActiveTab} vehicles={vehicles} />;
            case 'list':
                return <RepairList repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} addUsedParts={addUsedParts} />;
            case 'history':
                return <RepairHistory repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} />;
            case 'stock':
                return <StockManagement stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} usedParts={usedParts} updateUsedPart={updateUsedPart} deleteUsedPart={deleteUsedPart} setPurchaseRequisitions={setPurchaseRequisitions} purchaseRequisitions={purchaseRequisitions} />;
            case 'stock-history':
                return <StockHistory transactions={transactions} />;
            case 'requisitions':
                return <PurchaseRequisitionPage purchaseRequisitions={purchaseRequisitions} setPurchaseRequisitions={setPurchaseRequisitions} stock={stock} setStock={setStock} setTransactions={setTransactions} />;
            case 'technicians':
                return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
            case 'technicianPerformance':
                return <TechnicianPerformance repairs={repairs} technicians={technicians} />;
            case 'reports':
                return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
            case 'estimation':
                return <Estimation repairs={repairs} />;
            case 'maintenance':
                return <MaintenancePlanner plans={plans} setPlans={setPlans} repairs={repairs} deletePlan={deletePlan} technicians={technicians} />;
            case 'vehicles':
                return <VehicleManagement vehicles={vehicles} setVehicles={setVehicles} />;
            default:
                return <div>Page not found</div>;
        }
    };
    
    return (
        <ToastProvider>
            <div className="flex h-screen bg-gray-100 font-sans">
                <Sidebar 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                    isCollapsed={isCollapsed} 
                    setCollapsed={setCollapsed} 
                    isMobileOpen={isMobileOpen} 
                    setMobileOpen={setMobileOpen}
                    stats={stats}
                />
                <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-[70px]' : 'lg:ml-72'}`}>
                    <Header
                        pageTitle={TABS[activeTab].title}
                        pageSubtitle={TABS[activeTab].subtitle}
                        toggleMobileSidebar={() => setMobileOpen(!isMobileOpen)}
                        notifications={notifications}
                        setNotifications={setNotifications}
                        unreadCount={unreadCount}
                        setActiveTab={setActiveTab}
                    />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
                <ToastContainer />
            </div>
        </ToastProvider>
    );
}

export default App;