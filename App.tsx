import React, { useState, useMemo, lazy, Suspense, useCallback, useRef } from 'react';
import type { Tab } from './types';
import { TABS } from './constants';
import { useRepairs } from './hooks/useRepairs';
import { useInventory } from './hooks/useInventory';
import { useFleet } from './hooks/useFleet';
import { useAdmin } from './hooks/useAdmin';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import Login from './components/Login';
import { sendRepairStatusTelegramNotification, checkAndSendDailyMaintenanceSummary, checkAndSendDailyRepairStatus, checkAndSendWarrantyInsuranceAlerts, checkAndSendLowStockAlert, sendBudgetAlertTelegramNotification } from './utils/telegramService';
import { checkAndGenerateSystemNotifications } from './utils/notificationEngine';

// Lazy Load Pages
const Dashboard = lazy(() => import('./components/Dashboard'));
const RepairForm = lazy(() => import('./components/RepairForm'));
const RepairList = lazy(() => import('./components/RepairList'));
const RepairHistory = lazy(() => import('./components/RepairHistory'));
const StockManagement = lazy(() => import('./components/StockManagement'));
const TechnicianManagement = lazy(() => import('./components/TechnicianManagement'));
const Reports = lazy(() => import('./components/Reports'));
const MaintenancePlanner = lazy(() => import('./components/MaintenancePlanner'));
const Estimation = lazy(() => import('./components/Estimation'));
const TechnicianPerformance = lazy(() => import('./components/TechnicianPerformance'));
const TechnicianWorkLog = lazy(() => import('./components/TechnicianWorkLog'));
const VehicleRepairHistory = lazy(() => import('./components/VehicleRepairHistory'));
const StockHistory = lazy(() => import('./components/StockHistory'));
const PurchaseRequisitionComponent = lazy(() => import('./components/PurchaseRequisition'));
const VehicleManagement = lazy(() => import('./components/VehicleManagement'));
const SupplierManagement = lazy(() => import('./components/SupplierManagement'));
const UsedPartBuyerManagement = lazy(() => import('./components/UsedPartBuyerManagement'));
const UsedPartReport = lazy(() => import('./components/UsedPartReport'));
const TechnicianView = lazy(() => import('./components/TechnicianView'));
const PreventiveMaintenance = lazy(() => import('./components/PreventiveMaintenance'));
const DailyChecklistPage = lazy(() => import('./components/DailyChecklistPage'));
const TrailerChecklistPage = lazy(() => import('./components/TrailerChecklistPage'));
const TireCheckPage = lazy(() => import('./components/TireCheckPage'));
const ToolManagement = lazy(() => import('./components/ToolManagement'));
const KPIDashboard = lazy(() => import('./components/KPIDashboard'));
const KPIManagement = lazy(() => import('./components/KPIManagement'));
const Settings = lazy(() => import('./components/Settings'));
const FleetKPIDashboard = lazy(() => import('./components/FleetKPIDashboard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const PurchaseOrderManagement = lazy(() => import('./components/PurchaseOrderManagement'));
const BudgetManagement = lazy(() => import('./components/BudgetManagement'));
const FuelManagement = lazy(() => import('./components/FuelManagement'));
const DriverManagement = lazy(() => import('./components/DriverManagement'));
const WarrantyInsuranceManagement = lazy(() => import('./components/WarrantyInsuranceManagement'));
const IncidentLogPage = lazy(() => import('./components/IncidentLogPage'));
const OKRManagement = lazy(() => import('./components/OKRManagement'));
const RepairCategoryManagement = lazy(() => import('./components/RepairCategoryManagement'));



const Home = lazy(() => import('./components/Home'));

interface AppContentProps {
    activeTab: Tab;
    setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
    isLoggedIn: boolean;
    setIsLoggedIn: (val: boolean) => void;
    userRole: string;
    setUserRole: (val: string) => void;
}

const AppContent: React.FC<AppContentProps> = ({
    activeTab, setActiveTab, isLoggedIn, setIsLoggedIn, userRole, setUserRole
}) => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);

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
        tools, setTools, toolTransactions, setToolTransactions, cargoPolicies, setCargoPolicies,
        cargoClaims, setCargoClaims, repairCategories, setRepairCategories, unreadNotificationCount
    } = useAdmin();

    // Daily Maintenance, Repair Status & Warranty/Insurance Check
    React.useEffect(() => {
        const timer = setTimeout(() => {
            checkAndSendDailyMaintenanceSummary(maintenancePlans, repairs, vehicles);
            checkAndSendDailyRepairStatus(repairs, technicians);
            checkAndSendWarrantyInsuranceAlerts(partWarranties, vehicles, cargoPolicies);
            checkAndSendLowStockAlert(stock);
            sendBudgetAlertTelegramNotification(budgets, repairs, fuelRecords);
        }, 5000);

        return () => clearTimeout(timer);
    }, [maintenancePlans, repairs, vehicles, technicians, partWarranties, cargoPolicies, stock, budgets, fuelRecords]);

    // System Auto-Notifications Engine - use refs to avoid stale closures
    const stockRef = useRef(stock);
    const plansRef = useRef(maintenancePlans);
    const repairsRef = useRef(repairs);
    const notificationsRef = useRef(notifications);
    
    // Keep refs updated
    React.useEffect(() => {
        stockRef.current = stock;
        plansRef.current = maintenancePlans;
        repairsRef.current = repairs;
        notificationsRef.current = notifications;
    }, [stock, maintenancePlans, repairs, notifications]);

    React.useEffect(() => {
        const checkNotifications = () => {
            const updated = checkAndGenerateSystemNotifications(
                notificationsRef.current, 
                stockRef.current, 
                plansRef.current, 
                repairsRef.current
            );
            if (updated !== notificationsRef.current) {
                setNotifications(updated);
            }
        };

        const timer = setTimeout(checkNotifications, 3000);
        const interval = setInterval(checkNotifications, 30000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []); // Empty deps - uses refs for latest values

    const handleLogin = (role: string) => {
        setUserRole(role);
        setIsLoggedIn(true);
        setLoginModalOpen(false);
        if (role === 'technician') {
            setActiveTab('technician-view');
        } else if (role === 'inspector') {
            setActiveTab('trailer-checklist');
        } else if (role === 'driver') {
            setActiveTab('form');
        } else {
            setActiveTab('dashboard');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUserRole('');
        setActiveTab('home');
    };

    const addRepair = (newRepairData: Parameters<typeof addRepairLogic>[0]) => {
        const newRepair = addRepairLogic(newRepairData);
        if (newRepair) {
            sendRepairStatusTelegramNotification(newRepair, 'สร้างใบแจ้งซ่อม', newRepair.status);
        }
        setActiveTab('list');
    };

    const stats = useMemo(() => ({
        pendingRepairs: pendingRepairsCount,
        lowStock: lowStockCount,
        dueMaintenance: dueMaintenanceCount
    }), [pendingRepairsCount, lowStockCount, dueMaintenanceCount]);

    const renderContent = () => {
        // Layer 1: Public-First Priority
        if (activeTab === 'home') {
            return <Home user={isLoggedIn ? { role: userRole } : null} onLoginClick={() => setLoginModalOpen(true)} onNavigate={setActiveTab} />;
        }

        // Layer 2: Routing Hierarchy (Auth Guard)
        if (!isLoggedIn) {
            // If trying to access protected content while guest, redirect or stay on home
            return <Home user={null} onLoginClick={() => setLoginModalOpen(true)} onNavigate={setActiveTab} />;
        }

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
                    checklists={checklists}
                    setChecklists={setChecklists}
                    repairCategories={repairCategories}
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
                    repairCategories={repairCategories}
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
                    repairCategories={repairCategories}
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
                return <StockHistory transactions={transactions} stock={stock} repairs={repairs} />;
            case 'requisitions':
                return <PurchaseRequisitionComponent
                    purchaseRequisitions={purchaseRequisitions}
                    setPurchaseRequisitions={setPurchaseRequisitions}
                    stock={stock}
                    setStock={setStock}
                    setTransactions={setTransactions}
                    suppliers={suppliers}
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
                return <KPIManagement kpiData={kpiData} setKpiData={setKpiData} repairCategories={repairCategories} />;
            case 'okr-management':
                return <OKRManagement
                    setActiveTab={setActiveTab}
                    repairs={repairs}
                    pmHistory={pmHistory}
                    maintenancePlans={maintenancePlans}
                    fuelRecords={fuelRecords}
                    checklists={checklists}
                    incidents={drivingIncidents}
                    vehicles={vehicles}
                />;
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
            case 'trailer-checklist':
                return <TrailerChecklistPage
                    checklists={checklists}
                    setChecklists={setChecklists}
                    vehicles={vehicles}
                    technicians={technicians}
                    setRepairFormSeed={setRepairFormSeed}
                    setActiveTab={setActiveTab}
                    userRole={userRole}
                />;
            case 'daily-checklist':
                return <DailyChecklistPage
                    checklists={checklists}
                    setChecklists={setChecklists}
                    vehicles={vehicles}
                    technicians={technicians}
                    setRepairFormSeed={setRepairFormSeed}
                    setActiveTab={setActiveTab}
                    userRole={userRole}
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
                return <FuelManagement fuelRecords={fuelRecords} setFuelRecords={setFuelRecords} vehicles={vehicles} drivers={drivers} />;
            case 'driver-management':
                return <DriverManagement drivers={drivers} setDrivers={setDrivers} vehicles={vehicles} fuelRecords={fuelRecords} incidents={drivingIncidents} repairs={repairs} setIncidents={setDrivingIncidents} />;
            case 'warranty-insurance':
                return <WarrantyInsuranceManagement
                    partWarranties={partWarranties}
                    setPartWarranties={setPartWarranties}
                    insuranceClaims={insuranceClaims}
                    setInsuranceClaims={setInsuranceClaims}
                    vehicles={vehicles}
                    setVehicles={setVehicles}
                    stock={stock}
                    suppliers={suppliers}
                    cargoPolicies={cargoPolicies}
                    setCargoPolicies={setCargoPolicies}
                    cargoClaims={cargoClaims}
                    setCargoClaims={setCargoClaims}
                    drivers={drivers}
                    repairs={repairs}
                />;
            case 'incident-log':
                return <IncidentLogPage incidents={drivingIncidents} drivers={drivers} vehicles={vehicles} />;
            case 'repair-categories':
                return <RepairCategoryManagement repairCategories={repairCategories} setRepairCategories={setRepairCategories} />;
            case 'settings':
                return <Settings holidays={holidays} setHolidays={setHolidays} />;
            default:
                return <Dashboard repairs={repairs} stock={stock} maintenancePlans={maintenancePlans} vehicles={vehicles} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Layer 5: UI Restrictive - Hide Sidebar for Guests or on Home Page */}
            {isLoggedIn && activeTab !== 'home' && (
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isSidebarCollapsed}
                    setCollapsed={setSidebarCollapsed}
                    isMobileOpen={isMobileSidebarOpen}
                    setMobileOpen={setMobileSidebarOpen}
                    stats={stats}
                    userRole={userRole}
                />
            )}
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isLoggedIn && activeTab !== 'home' ? (isSidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-72') : 'ml-0'}`}>
                <Header
                    pageTitle={activeTab === 'home' ? 'Smart Truck Maintenance' : TABS[activeTab].title}
                    pageSubtitle={activeTab === 'home' ? 'ยินดีต้อนรับสู่ระบบจัดการซ่อมบำรุง' : TABS[activeTab].subtitle}
                    toggleMobileSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
                    notifications={notifications}
                    setNotifications={setNotifications}
                    unreadCount={unreadNotificationCount}
                    setActiveTab={setActiveTab}
                    repairs={repairs}
                    stock={stock}
                    vehicles={vehicles}
                    technicians={technicians}
                    isLoggedIn={isLoggedIn}
                    onLoginClick={() => setLoginModalOpen(true)}
                    onLogout={handleLogout}
                />
                <main className={`flex-1 overflow-y-auto print:p-0 ${activeTab === 'home' ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
                    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Layer 4: Seamless Entry (Login Modal) */}
            {isLoginModalOpen && (
                <Login
                    onLogin={handleLogin}
                    onClose={() => setLoginModalOpen(false)}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem('isLoggedIn') === 'true';
    });
    const [userRole, setUserRole] = useState<string>(() => {
        return localStorage.getItem('userRole') || '';
    });
    const [activeTab, setActiveTab] = useState<Tab>('home');

    const handleSetIsLoggedIn = (val: boolean) => {
        setIsLoggedIn(val);
        localStorage.setItem('isLoggedIn', val.toString());
    };

    const handleSetUserRole = (val: string) => {
        setUserRole(val);
        localStorage.setItem('userRole', val);
    };

    return (
        <ToastProvider>
            <AppContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={handleSetIsLoggedIn}
                userRole={userRole}
                setUserRole={handleSetUserRole}
            />
            <ToastContainer />
        </ToastProvider>
    );
};

export default App;
