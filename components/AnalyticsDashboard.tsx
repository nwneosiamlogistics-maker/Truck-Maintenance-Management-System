import React, { useState } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, StockItem, Technician, AnnualPMPlan, PurchaseOrder, Supplier, StockTransaction, UsedPart, Driver } from '../types';

import FleetKPIDashboard from './FleetKPIDashboard';
import Reports from './Reports';
import KPIDashboard from './KPIDashboard';
import TechnicianPerformance from './TechnicianPerformance';
import StockHistory from './StockHistory';
import UsedPartReport from './UsedPartReport';
import DriverLeaveReport from './DriverLeaveReport';
import VehicleExpenseReport from './VehicleExpenseReport';

interface AnalyticsDashboardProps {
    repairs: Repair[];
    maintenancePlans: MaintenancePlan[];
    vehicles: Vehicle[];
    pmHistory: PMHistory[];
    stock: StockItem[];
    technicians: Technician[];
    annualPlans: AnnualPMPlan[];
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    transactions: StockTransaction[];
    usedParts: UsedPart[];
    deleteUsedPartDisposition: (usedPartId: string, dispositionId: string) => void;
    drivers: Driver[];
}

type AnalyticsTab = 'fleet' | 'reports' | 'vehicle-expense' | 'kpi' | 'stock-history' | 'used-parts' | 'technician-kpi' | 'driver-leave';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('fleet');

    const renderContent = () => {
        switch (activeTab) {
            case 'fleet': return <FleetKPIDashboard {...props} />;
            case 'reports': return <Reports {...props} />;
            case 'vehicle-expense': return <VehicleExpenseReport repairs={props.repairs} vehicles={props.vehicles} />;
            case 'kpi': return <KPIDashboard {...props} />;
            case 'stock-history': return <StockHistory {...props} />;
            case 'used-parts': return <UsedPartReport usedParts={props.usedParts} deleteUsedPartDisposition={props.deleteUsedPartDisposition} />;
            case 'technician-kpi': return <TechnicianPerformance {...props} />;
            case 'driver-leave': return <DriverLeaveReport drivers={props.drivers} />;
            default: return <FleetKPIDashboard {...props} />;
        }
    };

    const tabs: { id: AnalyticsTab, label: string, sub: string, short: string }[] = [
        { id: 'fleet', label: 'Fleet Performance', sub: 'ประสิทธิภาพกลุ่มรถ', short: 'Fleet' },
        { id: 'reports', label: 'Analysis Hub', sub: 'รายงานและสถิติ', short: 'Analytics' },
        { id: 'vehicle-expense', label: 'Vehicle Expense', sub: 'ค่าใช้จ่ายรถ', short: 'Expense' },
        { id: 'kpi', label: 'Repair KPI', sub: 'ดัชนีการซ่อม', short: 'KPI' },
        { id: 'technician-kpi', label: 'Technician Hub', sub: 'ประสิทธิภาพช่าง', short: 'Technician' },
        { id: 'stock-history', label: 'Inventory Log', sub: 'ประวัติเบิกจ่าย', short: 'Inventory' },
        { id: 'used-parts', label: 'Parts Lifecycle', sub: 'รายงานอะไหล่เก่า', short: 'Parts' },
        { id: 'driver-leave', label: 'HR Analytics', sub: 'ประวัติการลา', short: 'HR' },
    ];

    return (
        <div className="space-y-10">
            {/* Mobile Tab Navigation (< lg): 4×2 flex-wrap grid */}
            <div className="lg:hidden glass p-2 rounded-[2rem] border border-white/50 shadow-2xl backdrop-blur-3xl">
                <div className="flex flex-wrap p-1">
                    {tabs.map((tab) => (
                        <div key={tab.id} className="w-1/4 p-0.5">
                            <button
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-[1.25rem] transition-all duration-300 relative ${activeTab === tab.id
                                    ? 'bg-slate-950 text-white shadow-xl'
                                    : 'text-slate-500 hover:bg-white/50'
                                    }`}
                            >
                                <span className="text-[8px] font-black uppercase tracking-wide text-center leading-tight">{tab.short}</span>
                                <span className={`text-[7px] font-bold mt-0.5 text-center leading-tight ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-400 opacity-60'}`}>
                                    {tab.sub.length > 8 ? tab.sub.substring(0, 7) + '…' : tab.sub}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Tab Navigation (>= lg): horizontal scroll */}
            <div className="hidden lg:block glass p-2 rounded-[2.5rem] border border-white/50 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-3xl">
                <div className="flex items-center gap-2 min-w-max p-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center px-8 py-4 rounded-[2rem] transition-all duration-500 relative group ${activeTab === tab.id
                                ? 'bg-slate-950 text-white shadow-2xl scale-105'
                                : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                }`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1">{tab.label}</span>
                            <span className={`text-[9px] font-black ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-400 opacity-60'}`}>
                                {tab.sub}
                            </span>
                            {activeTab === tab.id && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-glow"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="analytics-content min-h-[800px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;