import React, { useState } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, StockItem, Technician, AnnualPMPlan, PurchaseOrder, Supplier, StockTransaction, UsedPart, Driver } from '../types';
import { BarChart2, TrendingUp, Truck, Target, Wrench, Package, RotateCcw, Users } from 'lucide-react';

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

    const tabs: { id: AnalyticsTab, label: string, short: string, sub: string, icon: React.ReactNode }[] = [
        { id: 'fleet', label: 'Fleet Performance', short: 'Fleet', sub: 'ประสิทธิภาพกลุ่มรถ', icon: <Truck size={16} /> },
        { id: 'reports', label: 'Analysis Hub', short: 'Analysis', sub: 'รายงานและสถิติ', icon: <BarChart2 size={16} /> },
        { id: 'vehicle-expense', label: 'Vehicle Expense', short: 'Expense', sub: 'ค่าใช้จ่ายเกี่ยวกับรถ', icon: <TrendingUp size={16} /> },
        { id: 'kpi', label: 'Repair KPI', short: 'KPI', sub: 'ภาพรวมดัชนีการซ่อม', icon: <Target size={16} /> },
        { id: 'technician-kpi', label: 'Technician Hub', short: 'Tech', sub: 'ประสิทธิภาพงานช่าง', icon: <Wrench size={16} /> },
        { id: 'stock-history', label: 'Inventory Log', short: 'Stock', sub: 'ประวัติเบิกจ่าย', icon: <Package size={16} /> },
        { id: 'used-parts', label: 'Parts Lifecycle', short: 'Parts', sub: 'รายงานอะไหล่เก่า', icon: <RotateCcw size={16} /> },
        { id: 'driver-leave', label: 'HR Analytics', short: 'HR', sub: 'ประวัติการลา', icon: <Users size={16} /> },
    ];

    return (
        <div className="space-y-6 sm:space-y-10">
            {/* Mobile: 4×2 Flex-wrap Tab Nav */}
            <div className="sm:hidden w-full glass p-1.5 rounded-2xl border border-white/50 shadow-xl backdrop-blur-3xl">
                <div className="flex flex-wrap">
                    {tabs.map((tab) => (
                        <div key={tab.id} className="w-1/4 p-0.5">
                            <button
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-300 active:scale-95 relative overflow-hidden ${activeTab === tab.id
                                        ? 'bg-slate-950 text-white shadow-md'
                                        : 'text-slate-400 bg-white/30 hover:bg-white/60 hover:text-slate-600'
                                    }`}
                            >
                                <span className={`flex-shrink-0 leading-none ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>
                                    {tab.icon}
                                </span>
                                <span className="text-[8px] font-black uppercase leading-none text-center w-full truncate">
                                    {tab.short}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tablet / Desktop: Horizontal Scroll Tab Nav */}
            <div className="hidden sm:block glass p-2 rounded-[2.5rem] border border-white/50 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-3xl">
                <div className="flex items-center gap-2 p-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center px-5 py-3.5 lg:px-8 lg:py-4 rounded-2xl lg:rounded-[2rem] transition-all duration-500 relative flex-none ${activeTab === tab.id
                                    ? 'bg-slate-950 text-white shadow-2xl'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                }`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                                {tab.label}
                            </span>
                            <span className={`text-[9px] font-black mt-0.5 whitespace-nowrap ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-400 opacity-60'}`}>
                                {tab.sub}
                            </span>
                            {activeTab === tab.id && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="analytics-content min-h-[400px] sm:min-h-[600px] lg:min-h-[800px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;