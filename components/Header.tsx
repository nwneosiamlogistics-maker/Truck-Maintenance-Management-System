import React, { useState, useRef, useEffect } from 'react';
import NotificationPanel from './NotificationPanel';
import type { Notification, Tab } from '../types';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle: string;
  toggleMobileSidebar: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  unreadCount: number;
  setActiveTab: (tab: Tab) => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle, toggleMobileSidebar, notifications, setNotifications, unreadCount, setActiveTab }) => {
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
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
               <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
              <p className="text-sm text-gray-500">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setPanelOpen(!isPanelOpen)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                <span className="text-2xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {isPanelOpen && (
                  <div ref={panelRef} className="absolute top-full right-0 mt-2 z-50">
                      <NotificationPanel 
                          notifications={notifications}
                          setNotifications={setNotifications}
                          onClose={() => setPanelOpen(false)}
                          onNavigate={handleNavigate}
                      />
                  </div>
              )}
            </div>
            <div className="relative">
              <button className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xl text-white font-bold border-2 border-white shadow-sm hover:scale-105 transition-transform">
                <span>👨‍💼</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;