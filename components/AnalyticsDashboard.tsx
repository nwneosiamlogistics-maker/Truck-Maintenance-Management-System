import React, { useState } from 'react';
import type { Repair, MaintenancePlan, Vehicle, PMHistory, StockItem, Technician, AnnualPMPlan } from '../types';

import FleetKPIDashboard from './FleetKPIDashboard';
import Reports from './Reports';
import KPIDashboard from './KPIDashboard';

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
}

type AnalyticsTab = 'fleet' | 'reports' | 'kpi';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('fleet');

    const renderContent = () => {
        switch (activeTab) {
            case 'fleet':
                return <FleetKPIDashboard {...props} />;
            case 'reports':
                return <Reports {...props} />;
            case 'kpi':
                return <KPIDashboard {...props} />;
            default:
                return <FleetKPIDashboard {...props} />;
        }
    };

    const TabButton: React.FC<{ tabId: AnalyticsTab, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${activeTab === tabId
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm">
                <div className="border-b flex items-center gap-2">
                    <TabButton tabId="fleet" label="ประสิทธิภาพกลุ่มรถ" />
                    <TabButton tabId="reports" label="รายงานและสถิติ" />
                    <TabButton tabId="kpi" label="ภาพรวม KPI การซ่อม" />
                </div>
            </div>
            <div className="analytics-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;