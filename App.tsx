import React, { useState, useMemo } from 'react';
import type { Tab } from './types';
import { TABS } from './constants';
import { useRepairs } from './hooks/useRepairs';
import { useInventory } from './hooks/useInventory';
import { useFleet } from './hooks/useFleet';
import { useAdmin } from './hooks/useAdmin';
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
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PurchaseOrderManagement from './components/PurchaseOrderManagement';
import BudgetManagement from './components/BudgetManagement';
import FuelManagement from './components/FuelManagement';
import DriverManagement from './components/DriverManagement';
import WarrantyInsuranceManagement from './components/WarrantyInsuranceManagement';
import Login from './components/Login';


interface AppContentProps {
    activeTab: Tab;
    setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

const AppContent: React.FC<AppContentProps> = ({ activeTab, setActiveTab }) => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Using refactored hooks
    const {
        repairs, setRepairs, kpiData, setKpiData, holidays, setHolidays,
        repairFormSeed, setRepairFormSeed, addRepair: addRepairLogic, pendingRepairsCount
    } = useRepairs();

    const {
        stock, setStock, transactions, setTransactions, usedParts, setUsedParts,
        usedPartBuyers, setUsedPartBuyers, suppliers, setSuppliers,
        purchaseRequisitions, setPurchaseRequisitions, purchaseOrders, setPurchaseOrders,
        addUsedParts, updateFungibleStock, updateUsedPart, deleteUsedPart,
        deleteUsedPartDisposition, processUsedPartBatch, lowStockCount
    } = useInventory();

    const {
        vehicles, setVehicles, maintenancePlans, setMaintenancePlans, annualPlans, setAnnualPlans,
        pmHistory, setPmHistory, checklists, setChecklists, tireInspections, setTireInspections,
        dueMaintenanceCount
    } = useFleet();

    const {
        technicians, setTechnicians, drivers, setDrivers, drivingIncidents, setDrivingIncidents,
        budgets, setBudgets, fuelRecords, setFuelRecords, partWarranties, setPartWarranties,
        insuranceClaims, setInsuranceClaims, reports, setReports, notifications, setNotifications,
        tools, setTools, toolTransactions, setToolTransactions, unreadNotificationCount
    } = useAdmin();

    const addRepair = (newRepairData: Parameters<typeof addRepairLogic>[0]) => {
        addRepairLogic(newRepairData);
        setActiveTab('list');
    };

    const stats = useMemo(() => ({
        pendingRepairs: pendingRepairsCount,
        lowStock: lowStockCount,
        dueMaintenance: dueMaintenanceCount
    }), [pendingRepairsCount, lowStockCount, dueMaintenanceCount]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard repairs={repairs} stock={stock} maintenancePlans={maintenancePlans} vehicles={vehicles} setActiveTab={setActiveTab} />;
            case 'analytics':
                return <AnalyticsDashboard
                    repairs={repairs}
                    maintenancePlans={maintenancePlans}
                    vehicles={vehicles}
                    pmHistory={pmHistory}
                    stock={stock}
                    technicians={technicians}
                    annualPlans={annualPlans}
                    purchaseOrders={purchaseOrders}
                    suppliers={suppliers}
                    transactions={transactions}
                    usedParts={usedParts}
                    deleteUsedPartDisposition={deleteUsedPartDisposition}
                    drivers={drivers}
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
                    drivers={drivers}
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
                    setActiveTab={setActiveTab}
                />;
            case 'purchase-orders':
                return <PurchaseOrderManagement
                    purchaseOrders={purchaseOrders}
                    setPurchaseOrders={setPurchaseOrders}
                    purchaseRequisitions={purchaseRequisitions}
                    setPurchaseRequisitions={setPurchaseRequisitions}
                    setStock={setStock}
                    setTransactions={setTransactions}
                    suppliers={suppliers}
                    setActiveTab={setActiveTab}
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
                return <TireCheckPage inspections={tireInspections} setInspections={setTireInspections} vehicles={vehicles} repairs={repairs} technicians={technicians} />;
            case 'tool-management':
                return <ToolManagement
                    tools={tools}
                    setTools={setTools}
                    transactions={toolTransactions}
                    setTransactions={setToolTransactions}
                    technicians={technicians}
                />;
            case 'budget-management':
                return <BudgetManagement budgets={budgets} setBudgets={setBudgets} repairs={repairs} purchaseOrders={purchaseOrders} fuelRecords={fuelRecords} vehicles={vehicles} />;
            case 'fuel-management':
                return <FuelManagement fuelRecords={fuelRecords} setFuelRecords={setFuelRecords} vehicles={vehicles} />;
            case 'driver-management':
                return <DriverManagement drivers={drivers} setDrivers={setDrivers} vehicles={vehicles} fuelRecords={fuelRecords} incidents={drivingIncidents} repairs={repairs} setIncidents={setDrivingIncidents} />;
            case 'warranty-insurance':
                return <WarrantyInsuranceManagement
                    partWarranties={partWarranties}
                    setPartWarranties={setPartWarranties}
                    insuranceClaims={insuranceClaims}
                    setInsuranceClaims={setInsuranceClaims}
                    vehicles={vehicles}
                    stock={stock}
                    suppliers={suppliers}
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
                    repairs={repairs}
                    stock={stock}
                    vehicles={vehicles}
                    technicians={technicians}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // Determine initial login state (e.g., check localStorage in a real app)
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    const handleLogin = (role: string) => {
        setUserRole(role);
        setIsLoggedIn(true);
        if (role === 'technician') {
            setActiveTab('technician-view');
        } else if (role === 'driver') {
            setActiveTab('form');
        } else {
            setActiveTab('dashboard');
        }
    };

    return (
        <ToastProvider>
            {isLoggedIn ? (
                <div role-key={userRole}>
                    <AppContent activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
            ) : (
                <Login onLogin={handleLogin} />
            )}
            <ToastContainer />
        </ToastProvider>
    );
};

export default App;
