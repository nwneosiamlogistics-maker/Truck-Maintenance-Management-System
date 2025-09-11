
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
// FIX: Renamed component import to avoid type name collision
import PurchaseRequisitionPage from './components/PurchaseRequisition';
import Reports from './components/Reports';
import TechnicianManagement from './components/TechnicianManagement';
// FIX: Import the missing TechnicianPerformance component.
import TechnicianPerformance from './components/TechnicianPerformance';
import Estimation from './components/Estimation';
import MaintenancePlanner from './components/MaintenancePlanner';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import { useFirebase } from './hooks/useFirebase';

// FIX: Importing all necessary types from the newly defined types.ts
import type { Tab, Repair, Technician, StockItem, StockTransaction, MaintenancePlan, UsedPart, Notification, PurchaseRequisition } from './types';
import { TABS } from './constants';
import { getDefaultRepairs, getDefaultTechnicians, getDefaultStock, getDefaultStockTransactions, getDefaultMaintenancePlans, getDefaultPurchaseRequisitions } from './data/defaultData';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data management using Firebase hook
  const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', getDefaultRepairs);
  const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
  const [stock, setStock] = useFirebase<StockItem[]>('stock', getDefaultStock);
  const [transactions, setTransactions] = useFirebase<StockTransaction[]>('stockTransactions', getDefaultStockTransactions);
  const [maintenancePlans, setMaintenancePlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
  const [usedParts, setUsedParts] = useFirebase<UsedPart[]>('usedParts', () => []);
  const [notifications, setNotifications] = useFirebase<Notification[]>('notifications', () => []);
  const [purchaseRequisitions, setPurchaseRequisitions] = useFirebase<PurchaseRequisition[]>('purchaseRequisitions', getDefaultPurchaseRequisitions);
  
  const stats = useMemo(() => {
    // Calculate due maintenance plans
    const dueMaintenancePlans = (Array.isArray(maintenancePlans) ? maintenancePlans : []).filter(plan => {
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

        const nextServiceMileage = plan.lastServiceMileage + plan.mileageFrequency;
        const latestRepair = (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.licensePlate === plan.vehicleLicensePlate)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const currentMileage = latestRepair ? Number(latestRepair.currentMileage) : null;
        const kmUntilNextService = currentMileage ? nextServiceMileage - currentMileage : null;

        const isDue = daysUntilNextService <= 7 || (kmUntilNextService !== null && kmUntilNextService <= 1000);
        const isOverdue = daysUntilNextService < 0 || (kmUntilNextService !== null && kmUntilNextService < 0);

        return isDue || isOverdue;
    }).length;

    return {
      pendingRepairs: (Array.isArray(repairs) ? repairs : []).filter(r => r.status === 'รอซ่อม' || r.status === 'รออะไหล่').length,
      lowStock: (Array.isArray(stock) ? stock : []).filter(s => s.status === 'สต๊อกต่ำ' || s.status === 'หมดสต๊อก').length,
      dueMaintenance: dueMaintenancePlans,
    };
}, [repairs, stock, maintenancePlans]);

 const addNotification = useCallback((newNotification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const notificationToAdd: Notification = {
        ...newNotification,
        id: `NOTIF-${Date.now()}-${Math.random()}`,
        createdAt: new Date().toISOString(),
        isRead: false,
    };

    setNotifications(prevNotifications => {
        const existing = prevNotifications.find(n => 
            !n.isRead && 
            n.relatedId === notificationToAdd.relatedId &&
            n.type === notificationToAdd.type
        );
        if (existing) {
            return prevNotifications;
        }
        const updatedNotifications = [notificationToAdd, ...prevNotifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return updatedNotifications.slice(0, 50);
    });
}, [setNotifications]);

useEffect(() => {
    (Array.isArray(stock) ? stock : []).forEach(item => {
        if (item.status === 'สต๊อกต่ำ' || item.status === 'หมดสต๊อก') {
            addNotification({
                message: `อะไหล่ "${item.name}" อยู่ในสถานะ${item.status}`,
                type: 'danger',
                linkTo: 'stock',
                relatedId: `stock-${item.id}`
            });
        }
    });

    (Array.isArray(maintenancePlans) ? maintenancePlans : []).forEach(plan => {
        const lastDate = new Date(plan.lastServiceDate);
        let nextServiceDate = new Date(lastDate);
        if (plan.frequencyUnit === 'days') {
            nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
        } else if (plan.frequencyUnit === 'weeks') {
            nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
        } else {
            nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);
        }
        const daysUntilNextService = Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (daysUntilNextService <= 7 && daysUntilNextService >= 0) {
             addNotification({
                message: `แผน "${plan.planName}" สำหรับรถ ${plan.vehicleLicensePlate} ใกล้ถึงกำหนด`,
                type: 'warning',
                linkTo: 'maintenance',
                relatedId: `maint-due-${plan.id}`
            });
        } else if (daysUntilNextService < 0) {
            addNotification({
                message: `แผน "${plan.planName}" สำหรับรถ ${plan.vehicleLicensePlate} เกินกำหนดแล้ว!`,
                type: 'danger',
                linkTo: 'maintenance',
                relatedId: `maint-overdue-${plan.id}`
            });
        }
    });

}, [stock, maintenancePlans, addNotification]);

  const generateRepairOrderNo = useCallback(() => {
      const now = new Date();
      const year = now.getFullYear();
      const count = (Array.isArray(repairs) ? repairs : []).filter(r => new Date(r.createdAt).getFullYear() === year).length + 1;
      return `RO-${year}-${String(count).padStart(5, '0')}`;
  }, [repairs]);

  const addRepair = useCallback((newRepairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
      const now = new Date().toISOString();
      const newRepair: Repair = {
          approvalDate: null,
          repairStartDate: null,
          repairEndDate: null,
          requisitionNumber: '',
          invoiceNumber: '',
          estimatedStartDate: null,
          estimatedEndDate: null,
          estimatedLaborHours: null,
          ...newRepairData,
          id: `MR-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          status: 'รอซ่อม',
          repairOrderNo: generateRepairOrderNo(),
      };
      setRepairs(prev => [newRepair, ...prev]);
      addNotification({
        message: `มีใบแจ้งซ่อมใหม่สำหรับรถ ${newRepair.licensePlate}`,
        type: 'info',
        linkTo: 'list',
        relatedId: `repair-${newRepair.id}`
      });
  }, [setRepairs, generateRepairOrderNo, addNotification]);
  
  const addUsedParts = useCallback((parts: Omit<UsedPart, 'id'>[]) => {
      const newUsedParts: UsedPart[] = (Array.isArray(parts) ? parts : []).map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}` }));
      setUsedParts(prev => [...newUsedParts, ...prev]);
  }, [setUsedParts]);
  
  const updateUsedPart = useCallback((partToUpdate: UsedPart) => {
      setUsedParts(prev => prev.map(p => p.id === partToUpdate.id ? partToUpdate : p));
  }, [setUsedParts]);

  const deleteMaintenancePlan = useCallback((planId: string) => {
    setMaintenancePlans(prev => prev.filter(p => p.id !== planId));
  }, [setMaintenancePlans]);

  const unreadNotificationsCount = useMemo(() => (Array.isArray(notifications) ? notifications : []).filter(n => !n.isRead).length, [notifications]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard repairs={repairs} stock={stock} setActiveTab={setActiveTab} />;
      case 'form':
        return <RepairForm technicians={technicians} stock={stock} addRepair={addRepair} />;
      case 'list':
        return <RepairList repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} addUsedParts={addUsedParts} />;
      case 'history':
        return <RepairHistory repairs={repairs} setRepairs={setRepairs} technicians={technicians} stock={stock} setStock={setStock} />;
      case 'stock':
        return <StockManagement stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} usedParts={usedParts} updateUsedPart={updateUsedPart} setPurchaseRequisitions={setPurchaseRequisitions} purchaseRequisitions={purchaseRequisitions} />;
      case 'requisitions':
        // FIX: Use renamed component to avoid naming conflict
        return <PurchaseRequisitionPage purchaseRequisitions={purchaseRequisitions} setPurchaseRequisitions={setPurchaseRequisitions} stock={stock} setStock={setStock} setTransactions={setTransactions} />;
      case 'reports':
        return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
      case 'technicians':
        return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
      case 'technicianPerformance':
        return <TechnicianPerformance technicians={technicians} repairs={repairs} />;
      case 'estimation':
        return <Estimation repairs={repairs} />;
      case 'maintenance':
        return <MaintenancePlanner plans={maintenancePlans} setPlans={setMaintenancePlans} repairs={repairs} deletePlan={deleteMaintenancePlan} />;
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
            unreadCount={unreadNotificationsCount}
            setActiveTab={setActiveTab}
          />
          <main className="flex-1 p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
        <ToastContainer />
      </div>
    </ToastProvider>
  );
};

export default App;