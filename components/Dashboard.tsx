import React, { useMemo } from 'react';
import type { Repair, StockItem, Tab } from '../types';
import StatCard from './StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ repairs, stock, setActiveTab }) => {
  const safeRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);
  const safeStock = useMemo(() => Array.isArray(stock) ? stock : [], [stock]);

  const stats = useMemo(() => {
    // Repair stats
    const reportedToday = safeRepairs.filter(r => isToday(r.createdAt)).length;
    const completedToday = safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && isToday(r.repairEndDate)).length;
    const inProgress = safeRepairs.filter(r => r.status === 'กำลังซ่อม').length;
    const waitingForRepair = safeRepairs.filter(r => r.status === 'รอซ่อม').length;
    const pendingParts = safeRepairs.filter(r => r.status === 'รออะไหล่').length;

    // Stock stats
    const totalStockValue = safeStock.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const lowStockCount = safeStock.filter(s => s.quantity > 0 && s.quantity <= s.minStock && !s.isFungibleUsedItem).length;
    const outOfStockCount = safeStock.filter(s => s.quantity <= 0 && !s.isFungibleUsedItem).length;

    const statusDistData = [
      { name: 'รอซ่อม', value: waitingForRepair, color: '#ef4444' },
      { name: 'กำลังซ่อม', value: inProgress, color: '#f59e0b' },
      { name: 'รออะไหล่', value: pendingParts, color: '#8b5cf6' },
      { name: 'ซ่อมเสร็จวันนี้', value: completedToday, color: '#10b981' }
    ].filter(d => d.value > 0);

    return {
      reportedToday, completedToday, inProgress, waitingForRepair,
      totalStockValue, lowStockCount, outOfStockCount,
      statusDistData
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
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getButtonClasses = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'danger': return 'bg-red-500 hover:bg-red-600';
      case 'info': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  }


  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="แจ้งซ่อมวันนี้" value={stats.reportedToday} theme="blue" align="center" />
        <StatCard title="ซ่อมเสร็จวันนี้" value={stats.completedToday} theme="green" align="center" />
        <StatCard title="กำลังซ่อม" value={stats.inProgress} theme="yellow" align="center" />
        <StatCard title="รอซ่อม" value={stats.waitingForRepair} theme="red" align="center" />
        <StatCard title="มูลค่าสต็อกทั้งหมด" value={`${stats.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`} theme="purple" align="center" />
        <StatCard title="อะไหล่ใกล้หมด" value={stats.lowStockCount} theme="yellow" align="center" />
        <StatCard title="อะไหล่หมดสต็อก" value={stats.outOfStockCount} theme="red" align="center" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Distribution Chart or Quick Menu */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xl font-bold text-gray-800 mb-6">🚀 เมนูด่วน</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full items-center">
            <button onClick={() => setActiveTab('form')} className="w-full h-24 flex flex-col items-center justify-center text-white font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-lg gap-2">
              <span className="text-3xl">📝</span>
              เพิ่มใบแจ้งซ่อมใหม่
            </button>
            <button onClick={() => setActiveTab('estimation')} className="w-full h-24 flex flex-col items-center justify-center text-white font-semibold rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-lg gap-2">
              <span className="text-3xl">⏱️</span>
              ระบบประมาณการณ์
            </button>
            <button onClick={() => setActiveTab('maintenance')} className="w-full h-24 flex flex-col items-center justify-center text-white font-semibold rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-1 shadow-md text-lg gap-2">
              <span className="text-3xl">📅</span>
              วางแผนซ่อมบำรุง
            </button>
          </div>
        </div>

        {/* Work Load Status Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xl font-bold text-gray-800 mb-2">สถานะงานซ่อมปัจจุบัน</h3>
          <div className="flex-1 w-full min-h-[200px]">
            {stats.statusDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.statusDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีงานซ่อมวันนี้</div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">🚨 แจ้งเตือนด่วน</h3>
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className={`flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl border ${getAlertClasses(alert.type)} transition-transform hover:scale-[1.01]`}>
              <div className="flex items-center mb-3 md:mb-0">
                <span className="text-3xl mr-4">{alert.icon}</span>
                <div className="flex-1 md:mr-4">
                  <strong className="font-bold text-lg">{alert.title}</strong>
                  <p className="opacity-90">{alert.description}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab(alert.tab as Tab)}
                className={`mt-2 md:mt-0 md:ml-auto w-full md:w-auto text-white text-sm font-bold py-2 px-6 rounded-lg shadow-sm transition-colors ${getButtonClasses(alert.type)}`}
              >
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