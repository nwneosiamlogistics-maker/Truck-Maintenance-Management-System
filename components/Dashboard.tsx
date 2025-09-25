import React, { useMemo } from 'react';
import type { Repair, StockItem, Tab } from '../types';
import StatCard from './StatCard';

interface DashboardProps {
  repairs: Repair[];
  stock: StockItem[];
  setActiveTab: (tab: Tab) => void;
}

const isToday = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    } catch {
        return false;
    }
};


const Dashboard: React.FC<DashboardProps> = ({ repairs, stock, setActiveTab }) => {
  const safeRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);
  const safeStock = useMemo(() => Array.isArray(stock) ? stock : [], [stock]);
  
  const stats = useMemo(() => {
    // Repair stats
    const reportedToday = safeRepairs.filter(r => isToday(r.createdAt)).length;
    const completedToday = safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && isToday(r.repairEndDate)).length;
    const inProgress = safeRepairs.filter(r => r.status === 'กำลังซ่อม').length;
    const waitingForRepair = safeRepairs.filter(r => r.status === 'รอซ่อม').length;

    // Stock stats
    const totalStockValue = safeStock.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const lowStockCount = safeStock.filter(s => s.quantity > 0 && s.quantity <= s.minStock && !s.isFungibleUsedItem).length;
    const outOfStockCount = safeStock.filter(s => s.quantity <= 0 && !s.isFungibleUsedItem).length;
    
    return { 
      reportedToday, completedToday, inProgress, waitingForRepair,
      totalStockValue, lowStockCount, outOfStockCount
    };
  }, [safeRepairs, safeStock]);

  const alerts = [
    {
      type: 'warning',
      icon: '⚠️',
      title: 'แผนบำรุงรักษาใกล้ถึงกำหนด',
      description: 'มีรายการที่ต้องดำเนินการภายใน 30 วัน หรือใกล้ถึงระยะ',
      tab: 'maintenance',
      buttonText: 'ดูรายละเอียด'
    },
    {
      type: 'danger',
      icon: '🔴',
      title: 'สต๊อกอะไหล่ต่ำ',
      description: `มี ${stats.lowStockCount} รายการที่สต๊อกต่ำกว่าจุดสั่งซื้อ`,
      tab: 'stock',
      buttonText: 'ตรวจสอบ'
    },
    {
      type: 'info',
      icon: 'ℹ️',
      title: 'งานซ่อมรอดำเนินการ',
      description: `${stats.waitingForRepair} ใบแจ้งซ่อมที่รอการมอบหมายช่าง`,
      tab: 'list',
      buttonText: 'จัดการ'
    }
  ];
  
  const getAlertClasses = (type: string) => {
    switch(type) {
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'danger': return 'bg-red-100 border-red-400 text-red-800';
      case 'info': return 'bg-blue-100 border-blue-400 text-blue-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };
  
  const getButtonClasses = (type: string) => {
      switch(type) {
        case 'warning': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'danger': return 'bg-red-500 hover:bg-red-600';
        case 'info': return 'bg-blue-500 hover:bg-blue-600';
        default: return 'bg-gray-500 hover:bg-gray-600';
      }
  }


  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="แจ้งซ่อมวันนี้" value={stats.reportedToday} theme="blue" />
        <StatCard title="ซ่อมเสร็จวันนี้" value={stats.completedToday} theme="green" />
        <StatCard title="กำลังซ่อม" value={stats.inProgress} theme="yellow" />
        <StatCard title="รอซ่อม" value={stats.waitingForRepair} theme="red" />
        <StatCard title="มูลค่าสต็อกทั้งหมด" value={`${Math.round(stats.totalStockValue).toLocaleString()} ฿`} theme="purple" />
        <StatCard title="อะไหล่ใกล้หมด" value={stats.lowStockCount} theme="yellow" />
        <StatCard title="อะไหล่หมดสต็อก" value={stats.outOfStockCount} theme="red" />
      </div>

      {/* Quick Menu */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🚀 เมนูด่วน</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setActiveTab('form')} className="w-full text-white font-semibold py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-base">
            📝 เพิ่มใบแจ้งซ่อมใหม่
          </button>
          <button onClick={() => setActiveTab('estimation')} className="w-full text-white font-semibold py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-base">
            ⏱️ ระบบประมาณการณ์
          </button>
          <button onClick={() => setActiveTab('maintenance')} className="w-full text-white font-semibold py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-base">
            📅 วางแผนซ่อมบำรุง
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚨 แจ้งเตือนด่วน</h3>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-start p-4 rounded-lg border ${getAlertClasses(alert.type)}`}>
                <span className="text-2xl mr-4">{alert.icon}</span>
                <div className="flex-1">
                  <strong className="font-semibold">{alert.title}:</strong>
                  <p className="text-base">{alert.description}</p>
                </div>
                <button onClick={() => setActiveTab(alert.tab as Tab)} className={`ml-4 text-white text-base font-semibold py-1.5 px-4 rounded-lg shadow-sm transition-colors ${getButtonClasses(alert.type)}`}>
                  {alert.buttonText}
                </button>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;