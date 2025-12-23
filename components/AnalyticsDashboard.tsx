import React, { useState } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, StockItem, Technician, AnnualPMPlan, PurchaseOrder, Supplier, StockTransaction, UsedPart, Driver } from '../types';

import FleetKPIDashboard from './FleetKPIDashboard';
import Reports from './Reports';
import KPIDashboard from './KPIDashboard';
import TechnicianPerformance from './TechnicianPerformance';
import StockHistory from './StockHistory';
import UsedPartReport from './UsedPartReport';
import DriverLeaveReport from './DriverLeaveReport';

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

type AnalyticsTab = 'fleet' | 'reports' | 'kpi' | 'stock-history' | 'used-parts' | 'technician-kpi' | 'driver-leave';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('fleet');

    const renderContent = () => {
        switch (activeTab) {
            case 'fleet': return <FleetKPIDashboard {...props} />;
            case 'reports': return <Reports {...props} />;
            case 'kpi': return <KPIDashboard {...props} />;
            case 'stock-history': return <StockHistory {...props} />;
            case 'used-parts': return <UsedPartReport usedParts={props.usedParts} deleteUsedPartDisposition={props.deleteUsedPartDisposition} />;
            case 'technician-kpi': return <TechnicianPerformance {...props} />;
            case 'driver-leave': return <DriverLeaveReport drivers={props.drivers} />;
            default: return <FleetKPIDashboard {...props} />;
        }
    };

    const tabs: { id: AnalyticsTab, label: string, sub: string }[] = [
        { id: 'fleet', label: 'Fleet Performance', sub: 'ประสิทธิภาพกลุ่มรถ' },
        { id: 'reports', label: 'Analysis Hub', sub: 'รายงานและสถิติ' },
        { id: 'kpi', label: 'Repair KPI', sub: 'ภาพรวมดัชนีการซ่อม' },
        { id: 'technician-kpi', label: 'Technician Hub', sub: 'ประสิทธิภาพงานช่าง' },
        { id: 'stock-history', label: 'Inventory Log', sub: 'ประวัติเบิกจ่าย' },
        { id: 'used-parts', label: 'Parts Lifecycle', sub: 'รายงานอะไหล่เก่า' },
        { id: 'driver-leave', label: 'HR Analytics', sub: 'ประวัติการลา' },
    ];

    return (
        <div className="space-y-10">
            {/* Premium Tab Navigation */}
            <div className="glass p-2 rounded-[2.5rem] border border-white/50 shadow-2xl overflow-x-auto no-scrollbar backdrop-blur-3xl">
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