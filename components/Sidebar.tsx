
import React from 'react';
import type { Tab } from '../types';
import {
    Home, BarChart2, FileText, ClipboardList, Smartphone, History, Truck,
    Shield, Calendar, Clock, ClipboardCheck, Disc, Box, ShoppingCart,
    File, Store, Users, PenTool, UserCog, BookOpen, Wallet, Fuel,
    Settings, ChevronLeft, ChevronRight, AlertTriangle, User
} from 'lucide-react';

interface NavItemProps {
    id: Tab;
    icon: React.ReactNode;
    label: string;
    activeTab: Tab;
    onClick: (tab: Tab) => void;
    isCollapsed: boolean;
    badgeCount?: number;
    badgeColor?: 'red' | 'yellow';
}

const NavItem: React.FC<NavItemProps> = ({ id, icon, label, activeTab, onClick, isCollapsed, badgeCount, badgeColor }) => {
    const isActive = activeTab === id;
    const badgeBg = badgeColor === 'red' ? 'bg-red-500' : 'bg-yellow-500';

    return (
        <li>
            <button
                className={`w-full flex items-center p-3 my-1 transition-all duration-200 ease-in-out text-white rounded-lg ${isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg' : 'hover:bg-slate-700'
                    }`}
                onClick={() => onClick(id)}
            >
                <span className="text-2xl w-6 flex justify-center items-center">{icon}</span>
                {!isCollapsed && <span className="ml-4 font-medium text-base flex-1 text-left">{label}</span>}
                {!isCollapsed && badgeCount && badgeCount > 0 ? (
                    <span className={`text-sm font-bold text-white ${badgeBg} rounded-full px-2 py-0.5`}>
                        {badgeCount}
                    </span>
                ) : null}
            </button>
        </li>
    );
};

interface SidebarProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isCollapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    isMobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    stats: { pendingRepairs: number, lowStock: number, dueMaintenance: number };
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setCollapsed, isMobileOpen, setMobileOpen, stats }) => {
    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
        setMobileOpen(false);
    };

    const navItems = [
        {
            section: 'ภาพรวม', items: [
                { id: 'dashboard', icon: <Home size={20} />, label: 'แดชบอร์ด' },
                { id: 'analytics', icon: <BarChart2 size={20} />, label: 'รายงานและวิเคราะห์' },
            ]
        },
        {
            section: 'งานซ่อมบำรุง', items: [
                { id: 'form', icon: <FileText size={20} />, label: 'เพิ่มใบแจ้งซ่อม' },
                { id: 'list', icon: <ClipboardList size={20} />, label: 'รายการใบแจ้งซ่อม', badge: stats.pendingRepairs, badgeColor: 'red' },
                { id: 'technician-view', icon: <Smartphone size={20} />, label: 'สำหรับช่าง' },
                { id: 'history', icon: <History size={20} />, label: 'ประวัติการซ่อม' },
                { id: 'vehicle-repair-history', icon: <Truck size={20} />, label: 'ประวัติซ่อมรายคัน' },
            ]
        },
        {
            section: 'การวางแผน', items: [
                { id: 'preventive-maintenance', icon: <AlertTriangle size={20} />, label: 'แผนซ่อมบำรุง PM', badge: stats.dueMaintenance, badgeColor: 'yellow' },
                { id: 'maintenance', icon: <Calendar size={20} />, label: 'วางแผนซ่อมบำรุง' },
                { id: 'estimation', icon: <Clock size={20} />, label: 'ระบบประมาณการณ์' },
            ]
        },
        {
            section: 'การจัดการยานพาหนะ', items: [
                { id: 'vehicles', icon: <Truck size={20} />, label: 'ข้อมูลรถและประกันภัย' },
                { id: 'daily-checklist', icon: <ClipboardCheck size={20} />, label: 'รายการตรวจเช็ค' },
                { id: 'tire-check', icon: <Disc size={20} />, label: 'ตรวจเช็คยาง' },
            ]
        },
        {
            section: 'คลังสินค้าและจัดซื้อ', items: [
                { id: 'stock', icon: <Box size={20} />, label: 'จัดการสต๊อกอะไหล่', badge: stats.lowStock, badgeColor: 'yellow' },
                { id: 'requisitions', icon: <ShoppingCart size={20} />, label: 'ใบขอซื้อ (PR)' },
                { id: 'purchase-orders', icon: <File size={20} />, label: 'ใบสั่งซื้อ (PO)' },
                { id: 'suppliers', icon: <Store size={20} />, label: 'จัดการผู้จำหน่าย' },
                { id: 'used-part-buyers', icon: <Users size={20} />, label: 'จัดการผู้รับซื้อ' },
            ]
        },
        {
            section: 'เครื่องมือและอุปกรณ์', items: [
                { id: 'tool-management', icon: <PenTool size={20} />, label: 'จัดการเครื่องมือ' },
            ]
        },
        {
            section: 'บุคลากร', items: [
                { id: 'technicians', icon: <UserCog size={20} />, label: 'จัดการช่าง' },
                { id: 'technicianWorkLog', icon: <BookOpen size={20} />, label: 'ประวัติงานซ่อมช่าง' },
                { id: 'driver-management', icon: <User size={20} />, label: 'จัดการพนักงานขับรถ' },
            ]
        },
        {
            section: 'การเงินและทรัพยากร', items: [
                { id: 'budget-management', icon: <Wallet size={20} />, label: 'จัดการงบประมาณ' },
                { id: 'fuel-management', icon: <Fuel size={20} />, label: 'บริหารจัดการน้ำมัน' },
            ]
        },
        {
            section: 'การจัดการความเสี่ยง', items: [
                { id: 'warranty-insurance', icon: <Shield size={20} />, label: 'การรับประกันและประกันภัย' },
            ]
        },
        {
            section: 'รายงานและการตั้งค่า', items: [
                { id: 'kpi-management', icon: <BarChart2 size={20} />, label: 'จัดการ KPI' },
                { id: 'settings', icon: <Settings size={20} />, label: 'ตั้งค่าระบบ' },
            ]
        },
    ];

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileOpen(false)}
            ></div>
            <aside className={`fixed top-0 left-0 h-full bg-slate-800 text-slate-100 flex flex-col z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[70px]' : 'w-72'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className={`flex items-center p-4 border-b border-slate-700 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <span className="text-3xl">🚛</span>
                        {!isCollapsed && (
                            <div>
                                <h1 className="font-bold text-lg leading-tight">ระบบซ่อมบำรุง</h1>
                                <p className="text-sm text-slate-400">NEOSIAM LOGISTICS & TRANSPORT</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
                    {navItems.map(section => (
                        <div key={section.section}>
                            {!isCollapsed && <h2 className="px-3 pt-2 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">{section.section}</h2>}
                            <ul>
                                {section.items.map(item => (
                                    <NavItem
                                        key={item.id}
                                        id={item.id as Tab}
                                        icon={item.icon}
                                        label={item.label}
                                        activeTab={activeTab}
                                        onClick={handleTabClick}
                                        isCollapsed={isCollapsed}
                                        badgeCount={item.badge}
                                        badgeColor={item.badgeColor as 'red' | 'yellow' | undefined}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-700">
                    <button
                        onClick={() => setCollapsed(!isCollapsed)}
                        className="w-full hidden lg:flex items-center p-3 hover:bg-slate-700 rounded-lg"
                    >
                        <span className="text-xl w-6 text-center transform transition-transform duration-300">{isCollapsed ? '➡️' : '⬅️'}</span>
                        {!isCollapsed && <span className="ml-4 font-medium text-base">ย่อเมนู</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
