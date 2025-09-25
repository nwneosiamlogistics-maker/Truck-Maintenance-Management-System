
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
            className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'
            }`}
        >
            <span className="text-xl mt-1">{getIcon(notification.type)}</span>
            <div>
                <p className="text-sm text-gray-800">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{timeSince(notification.createdAt)}</p>
            </div>
            {!notification.isRead && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5 ml-auto"></div>}
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
        onClose();
    };

    return (
        <div className="bg-white rounded-lg shadow-2xl w-96 border">
            <div className="p-4 flex justify-between items-center border-b">
                <h3 className="text-lg font-bold text-gray-800">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-sm text-blue-600 font-semibold hover:underline"
                    >
                        อ่านทั้งหมด
                    </button>
                )}
            </div>
            <ul className="max-h-96 overflow-y-auto divide-y">
                {safeNotifications.length > 0 ? (
                    safeNotifications.map(notification => (
                        <NotificationItem 
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification)}
                        />
                    ))
                ) : (
                    <li className="p-6 text-center text-gray-500">ไม่มีการแจ้งเตือน</li>
                )}
            </ul>
        </div>
    );
};

export default NotificationPanel;
