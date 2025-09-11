import React, { useState, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import RepairHistory from './components/RepairHistory';
import StockManagement from './components/StockManagement';
import Reports from './components/Reports';
import TechnicianManagement from './components/TechnicianManagement';
import Estimation from './components/Estimation';
import MaintenancePlanner from './components/MaintenancePlanner';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import { useFirebase } from './hooks/useFirebase';

import type { Tab, Repair, Technician, StockItem, StockTransaction, MaintenancePlan, UsedPart } from './types';
import { TABS } from './constants';
import { getDefaultRepairs, getDefaultTechnicians, getDefaultStock, getDefaultStockTransactions, getDefaultMaintenancePlans } from './data/defaultData';

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
  
  const stats = useMemo(() => ({
    pendingRepairs: repairs.filter(r => r.status === 'รอซ่อม' || r.status === 'รออะไหล่').length,
    lowStock: stock.filter(s => s.status === 'สต๊อกต่ำ' || s.status === 'หมดสต๊อก').length,
  }), [repairs, stock]);

  const generateRepairOrderNo = useCallback(() => {
      const now = new Date();
      const year = now.getFullYear();
      const count = repairs.filter(r => new Date(r.createdAt).getFullYear() === year).length + 1;
      return `RO-${year}-${String(count).padStart(5, '0')}`;
  }, [repairs]);

  const addRepair = useCallback((newRepairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
      const now = new Date().toISOString();
      const newRepair: Repair = {
          ...newRepairData,
          id: `MR-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          status: 'รอซ่อม',
          repairOrderNo: generateRepairOrderNo(),
      };
      setRepairs(prev => [newRepair, ...prev]);
  }, [setRepairs, generateRepairOrderNo]);
  
  const addUsedParts = useCallback((parts: Omit<UsedPart, 'id'>[]) => {
      const newUsedParts: UsedPart[] = parts.map(p => ({ ...p, id: `UP-${Date.now()}-${Math.random()}` }));
      setUsedParts(prev => [...newUsedParts, ...prev]);
  }, [setUsedParts]);
  
  const updateUsedPart = useCallback((partToUpdate: UsedPart) => {
      setUsedParts(prev => prev.map(p => p.id === partToUpdate.id ? partToUpdate : p));
  }, [setUsedParts]);

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
        return <StockManagement stock={stock} setStock={setStock} transactions={transactions} setTransactions={setTransactions} usedParts={usedParts} updateUsedPart={updateUsedPart} />;
      case 'reports':
        return <Reports repairs={repairs} stock={stock} technicians={technicians} />;
      case 'technicians':
        return <TechnicianManagement technicians={technicians} setTechnicians={setTechnicians} repairs={repairs} />;
      case 'estimation':
        return <Estimation />;
      case 'maintenance':
        return <MaintenancePlanner plans={maintenancePlans} setPlans={setMaintenancePlans} repairs={repairs} />;
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