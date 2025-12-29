import React, { useState, useRef, useEffect } from 'react';
import NotificationPanel from './NotificationPanel';
import GlobalSearch from './GlobalSearch';
import type { Notification, Tab, Repair, StockItem, Vehicle, Technician } from '../types';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle: string;
  toggleMobileSidebar: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  unreadCount: number;
  setActiveTab: (tab: Tab) => void;
  repairs: Repair[];
  stock: StockItem[];
  vehicles: Vehicle[];
  technicians: Technician[];
}

const Header: React.FC<HeaderProps> = ({
  pageTitle, pageSubtitle, toggleMobileSidebar, notifications,
  setNotifications, unreadCount, setActiveTab,
  repairs, stock, vehicles, technicians
}) => {
  const [isPanelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigate = (tab: Tab) => {
    setActiveTab(tab);
    setPanelOpen(false);
  };

  return (
    <header className="glass sticky top-0 z-20 border-b border-white/20 backdrop-blur-md print:hidden">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={toggleMobileSidebar}
              title="Toggle Sidebar"
              className="lg:hidden p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
            >
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-4 truncate hidden sm:block">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{pageTitle}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-4">
            <GlobalSearch
              repairs={repairs}
              stock={stock}
              vehicles={vehicles}
              technicians={technicians}
              onNavigate={setActiveTab}
            />
          </div>

          <div className="flex items-center space-x-6 shrink-0">
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setPanelOpen(!isPanelOpen)}
                title="Notifications"
                className={`p-2 rounded-2xl transition-all duration-300 relative group active:scale-90 ${isPanelOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <span className={`text-2xl block transition-transform duration-300 ${isPanelOpen ? 'scale-110' : 'group-hover:rotate-12'}`}>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white ring-2 ring-rose-500/20">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {isPanelOpen && (
                <div ref={panelRef} className="absolute top-full right-0 mt-4 z-50 animate-scale-in">
                  <NotificationPanel
                    notifications={notifications}
                    setNotifications={setNotifications}
                    onClose={() => setPanelOpen(false)}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}
            </div>
            <div className="relative group">
              <button title="User Profile" className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border-2 border-white shadow-xl shadow-slate-200 hover:scale-110 hover:rotate-3 transition-all duration-300 active:scale-90 overflow-hidden p-1">
                <img src="/logo.png" alt="User" className="w-full h-full object-contain" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white ring-4 ring-green-500/10"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;