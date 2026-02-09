
import React from 'react';
import type { Notification, Tab } from '../types';

interface NotificationPanelProps {
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    onClose: () => void;
    onNavigate: (tab: Tab) => void;
}

const NotificationItem: React.FC<{
    notification: Notification;
    onClick: () => void;
}> = ({ notification, onClick }) => {

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'danger': return '🔴';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'success': return '✅';
            default: return '🔔';
        }
    };

    const timeSince = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " ปีที่แล้ว";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " เดือนที่แล้ว";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " วันที่แล้ว";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " ชั่วโมงที่แล้ว";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " นาทีที่แล้ว";
        return "เมื่อสักครู่";
    };

    return (
        <li
            onClick={onClick}
            className={`p-3 sm:p-5 flex items-start gap-3 sm:gap-4 cursor-pointer transition-all duration-300 border-l-4 ${!notification.isRead
                ? 'bg-blue-50/50 border-blue-500 hover:bg-blue-100/50 shadow-sm'
                : 'bg-white border-transparent hover:bg-slate-50'
                }`}
        >
            <div className={`text-2xl mt-0.5 p-2 rounded-xl shrink-0 ${notification.type === 'danger' ? 'bg-red-50' :
                notification.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs sm:text-sm leading-relaxed break-words ${!notification.isRead ? 'font-black text-slate-800' : 'text-slate-600 font-medium'}`}>
                    {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timeSince(notification.createdAt)}</span>
                    {!notification.isRead && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    )}
                </div>
            </div>
            {notification.linkTo && (
                <div className="mt-1 transition-transform group-hover:translate-x-1">
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </li>
    );
};


const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, setNotifications, onClose, onNavigate }) => {

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const unreadCount = safeNotifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }
        if (notification.linkTo) {
            onNavigate(notification.linkTo);
        }
    };

    return (
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] w-full sm:max-w-[400px] border border-slate-100 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[600px]">
            {/* Header */}
            <div className="p-4 sm:p-6 flex justify-between items-center border-b border-slate-50 bg-slate-50/30 backdrop-blur-xl">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">การแจ้งเตือน</h3>
                    {unreadCount > 0 && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">คุณมี {unreadCount} รายการใหม่</p>}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="px-4 py-2 text-[10px] font-black text-white bg-blue-600 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        อ่านทั้งหมด
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {safeNotifications.length > 0 ? (
                    <ul className="divide-y divide-slate-50">
                        {safeNotifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onClick={() => handleNotificationClick(notification)}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <p className="text-sm font-black italic">ไม่มีการแจ้งเตือนใหม่ในขณะนี้</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-50 text-center">
                <button onClick={onClose} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors">
                    ปิดหน้าต่าง
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;
