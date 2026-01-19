
import React from 'react';
import type { Tab } from '../types';
import {
    Home, BarChart2, FileText, ClipboardList, Smartphone, History, Truck,
    Shield, Calendar, Clock, ClipboardCheck, Disc, Box, ShoppingCart,
    File, Store, Users, PenTool, UserCog, BookOpen, Wallet, Fuel,
    Settings, ChevronLeft, ChevronRight, AlertTriangle, User, Target
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
                className={`w-full flex items-center p-3 my-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-slate-200 rounded-xl group relative overflow-hidden active:scale-95 ${isActive
                    ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/40'
                    : 'hover:bg-slate-700/50 hover:text-white'
                    }`}
                onClick={() => onClick(id)}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                )}
                <span className={`text-2xl w-6 flex justify-center items-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </span>
                {!isCollapsed && (
                    <span className={`ml-4 font-bold text-sm flex-1 text-left transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-100 group-hover:translate-x-1'}`}>
                        {label}
                    </span>
                )}
                {!isCollapsed && badgeCount && badgeCount > 0 ? (
                    <span className={`text-[10px] font-black text-white ${badgeBg} rounded-full px-1.5 py-0.5 shadow-lg shadow-black/20 animate-pulse`}>
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
            section: 'วิสัยทัศน์และเป้าหมาย', items: [
                { id: 'okr-management', icon: <Target size={20} />, label: 'OKR Strategy' },
            ]
        },
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
                { id: 'incident-log', icon: <AlertTriangle size={20} />, label: 'ประวัติอุบัติเหตุ' },
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
            <aside className={`fixed top-0 left-0 h-full glass-dark text-slate-100 flex flex-col z-40 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isCollapsed ? 'w-[76px]' : 'w-72'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl print:hidden`}>
                <div className={`flex items-center p-6 border-b border-white/5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0 overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
                        </div>
                        {!isCollapsed && (
                            <div className="animate-fade-in-up">
                                <h1 className="font-black text-sm tracking-tight leading-none text-white">ระบบซ่อมบำรุง</h1>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Neosiam Logistics</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {navItems.map((section, idx) => (
                        <div key={section.section} className={`animate-fade-in-up delay-${idx * 100}`}>
                            {!isCollapsed && <h2 className="px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{section.section}</h2>}
                            <ul className="space-y-1">
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

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button
                        onClick={() => setCollapsed(!isCollapsed)}
                        className="w-full hidden lg:flex items-center justify-center h-12 hover:bg-white/5 rounded-2xl transition-all active:scale-95 group"
                    >
                        <div className={`p-2 rounded-xl bg-slate-800 border border-white/5 shadow-inner transition-transform duration-500 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
                            <ChevronLeft size={20} className="text-slate-400 group-hover:text-white" />
                        </div>
                        {!isCollapsed && <span className="ml-3 font-bold text-xs text-slate-300 group-hover:text-white transition-colors">ซ่อนเมนูจัดการ</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
