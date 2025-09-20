
import React, { useState, useMemo, useEffect } from 'react';
import type { Tab, Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction, PurchaseRequisition, Vehicle, Notification, Supplier, UsedPartBuyer, UsedPart, AnnualPMPlan, PMHistory, RepairFormSeed } from './types';
import { TABS } from './constants';
import { getDefaultTechnicians, getDefaultRepairs, getDefaultStock, getDefaultReports, getDefaultMaintenancePlans, getDefaultStockTransactions, getDefaultPurchaseRequisitions, getDefaultVehicles, getDefaultSuppliers, getDefaultUsedPartBuyers, getDefaultAnnualPMPlans } from './data/defaultData';
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
// FIX: Import KPIDashboard to resolve 'Cannot find name' error.
import KPIDashboard from './components/KPIDashboard';

const App: React.FC = () => {
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

    const updateUsedPart = (partToUpdate: UsedPart) => {
        setUsedParts(prev => prev.map(p => p.id === partToUpdate.id ? partToUpdate : p));
    };

    const deleteUsedPart = (partId: string) => {
        setUsedParts(prev => prev.filter(p => p.id !== partId));
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
            return daysUntil <= 7;
        }).length;

        return { pendingRepairs, lowStock, dueMaintenance };
    }, [repairs, stock, maintenancePlans]);
    
    const unreadNotificationCount = useMemo(() => (Array.isArray(notifications) ? notifications : []).filter(n => !n.isRead).length, [notifications]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
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
                return <UsedPartReport usedParts={usedParts} />;
            case 'technicians':
                return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
            case 'technicianPerformance':
                return <TechnicianPerformance repairs={repairs} technicians={technicians} />;
            case 'technicianWorkLog':
                return <TechnicianWorkLog repairs={repairs} technicians={technicians} />;
            case 'technician-view':
                return <TechnicianView repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} />;
            case 'reports':
                return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
            case 'estimation':
                return <Estimation repairs={repairs} />;
            case 'maintenance':
                return <MaintenancePlanner 
                    plans={maintenancePlans} 
                    setPlans={setMaintenancePlans} 
                    repairs={repairs}
                    technicians={technicians}
                    history={pmHistory}
                    setHistory={setPmHistory}
                />;
            case 'kpi-dashboard':
                return <KPIDashboard repairs={repairs} plans={maintenancePlans} vehicles={vehicles} />;
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
            default:
                return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
        }
    };
    
    return (
        <ToastProvider>
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
                <ToastContainer />
            </div>
        </ToastProvider>
    );
};

export default App;
