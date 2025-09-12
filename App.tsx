// FIX: Implemented the main App component to resolve module errors and provide application structure.
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
import StockHistory from './components/StockHistory';
import PurchaseRequisitionPage from './components/PurchaseRequisition';
import TechnicianManagement from './components/TechnicianManagement';
import TechnicianPerformance from './components/TechnicianPerformance';
import Estimation from './components/Estimation';
import MaintenancePlanner from './components/MaintenancePlanner';
import VehicleManagement from './components/VehicleManagement';
import Reports from './components/Reports';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import type { Tab, Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, UsedPart, Notification, PurchaseRequisition, Vehicle } from './types';
import { TABS } from './constants';
import { useFirebase } from './hooks/useFirebase';
import { getDefaultRepairs, getDefaultTechnicians, getDefaultStock, getDefaultReports, getDefaultMaintenancePlans, getDefaultStockTransactions, getDefaultPurchaseRequisitions, getDefaultVehicles } from './data/defaultData';
import { getLegacyRepairs } from './data/legacyData';

const App: React.FC = () => {
    // State management
    const [activeTab, setActiveTab] = useFirebase<Tab>('activeTab', 'dashboard');
    const [isSidebarCollapsed, setSidebarCollapsed] = useFirebase<boolean>('sidebarCollapsed', false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Data from Firebase
    const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', () => {
        const legacy = getLegacyRepairs();
        const defaults = getDefaultRepairs();
        // A simple merge, assuming no duplicates. For a real scenario, a more robust merge/migration would be needed.
        return [...legacy, ...defaults];
    });
    const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
    const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
    const [transactions, setTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);
    const [reports, setReports] = useFirebase<Report[]>('reports', getDefaultReports);
    const [maintenancePlans, setMaintenancePlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
    const [usedParts, setUsedParts] = useFirebase<UsedPart[]>('usedParts', []);
    const [notifications, setNotifications] = useFirebase<Notification[]>('notifications', []);
    const [purchaseRequisitions, setPurchaseRequisitions] = useFirebase<PurchaseRequisition[]>('purchaseRequisitions', getDefaultPurchaseRequisitions);
    const [vehicles, setVehicles] = useFirebase<Vehicle[]>('vehicles', getDefaultVehicles);

    // Memoized stats for badges
    const stats = useMemo(() => ({
        pendingRepairs: repairs.filter(r => ['รอซ่อม', 'รออะไหล่', 'กำลังซ่อม'].includes(r.status)).length,
        lowStock: stock.filter(s => s.status === 'สต๊อกต่ำ' || s.status === 'หมดสต๊อก').length,
        dueMaintenance: 0 // This can be calculated from maintenancePlans if needed
    }), [repairs, stock]);

    const unreadNotifications = useMemo(() => (Array.isArray(notifications) ? notifications : []).filter(n => !n.isRead).length, [notifications]);

    // Handlers for adding new data
    const addRepair = (repairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
        const now = new Date();
        const year = now.getFullYear();
        const repairsThisYear = (Array.isArray(repairs) ? repairs : []).filter(r => new Date(r.createdAt).getFullYear() === year);
        const newRepairNumber = repairsThisYear.length + 1;
        const repairOrderNo = `RO-${year}-${String(newRepairNumber).padStart(5, '0')}`;

        const newRepair: Repair = {
            ...repairData,
            id: `R${Date.now()}`,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            status: 'รอซ่อม',
            repairOrderNo: repairOrderNo,
            approvalDate: null,
            repairStartDate: null,
            repairEndDate: null,
            requisitionNumber: '',
            invoiceNumber: '',
        };
        setRepairs(prev => [...(Array.isArray(prev) ? prev : []), newRepair]);
        setActiveTab('list');
    };

    const addUsedParts = (partsToAdd: Omit<UsedPart, 'id'>[]) => {
        const newUsedParts: UsedPart[] = partsToAdd.map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}` }));
        setUsedParts(prev => [...(Array.isArray(prev) ? prev : []), ...newUsedParts]);
    };
    
    const updateUsedPart = (partToUpdate: UsedPart) => {
        setUsedParts(prev => (Array.isArray(prev) ? prev : []).map(p => p.id === partToUpdate.id ? partToUpdate : p));
    };

    const deleteUsedPart = (partId: string) => {
        setUsedParts(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== partId));
    };

    const deleteMaintenancePlan = (planId: string) => {
        setMaintenancePlans(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== planId));
    };
    
    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
            case 'form': return <RepairForm technicians={technicians} stock={stock} addRepair={addRepair} repairs={repairs} setActiveTab={setActiveTab} />;
            case 'list': return <RepairList repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} addUsedParts={addUsedParts} />;
            case 'history': return <RepairHistory repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} />;
            case 'stock': return <StockManagement stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} usedParts={usedParts} updateUsedPart={updateUsedPart} deleteUsedPart={deleteUsedPart} setPurchaseRequisitions={setPurchaseRequisitions} purchaseRequisitions={purchaseRequisitions} />;
            case 'stock-history': return <StockHistory transactions={transactions} />;
            case 'requisitions': return <PurchaseRequisitionPage purchaseRequisitions={purchaseRequisitions} setPurchaseRequisitions={setPurchaseRequisitions} stock={stock} setStock={setStock} setTransactions={setTransactions} />;
            case 'technicians': return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
            case 'technicianPerformance': return <TechnicianPerformance repairs={repairs} technicians={technicians} />;
            case 'estimation': return <Estimation repairs={repairs} />;
            case 'maintenance': return <MaintenancePlanner plans={maintenancePlans} setPlans={setMaintenancePlans} repairs={repairs} deletePlan={deleteMaintenancePlan} technicians={technicians}/>;
            case 'vehicles': return <VehicleManagement vehicles={vehicles} setVehicles={setVehicles} />;
            case 'reports': return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
            default: return <div>Page not found</div>;
        }
    };
    
    return (
        <ToastProvider>
            <div className="flex h-screen bg-gray-100 font-sans">
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
                        toggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
                        notifications={notifications}
                        setNotifications={setNotifications}
                        unreadCount={unreadNotifications}
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
};

export default App;
