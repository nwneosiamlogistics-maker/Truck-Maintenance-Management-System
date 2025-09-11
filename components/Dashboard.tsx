
import React from 'react';
import type { Repair, StockItem, Tab } from '../types';
import StatCard from './StatCard';

interface DashboardProps {
  repairs: Repair[];
  stock: StockItem[];
  setActiveTab: (tab: Tab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ repairs, stock, setActiveTab }) => {
  const totalRepairs = repairs.length;
  // FIX: Changed status from 'เสร็จแล้ว' to 'ซ่อมเสร็จ' to match the type definition.
  const completedRepairs = repairs.filter(r => r.status === 'ซ่อมเสร็จ').length;
  const inProgressRepairs = repairs.filter(r => r.status === 'กำลังซ่อม').length;
  const totalVehicles = 48; // Sample data

  const alerts = [
    {
      type: 'warning',
      icon: '⚠️',
      title: 'แผนบำรุงรักษาใกล้ถึงกำหนด',
      description: 'มี 18 รายการที่ต้องดำเนินการภายใน 7 วัน',
      tab: 'maintenance',
      buttonText: 'ดูรายละเอียด'
    },
    {
      type: 'danger',
      icon: '🔴',
      title: 'สต๊อกอะไหล่ต่ำ',
      description: `มี ${stock.filter(s => s.quantity <= s.minStock).length} รายการที่สต๊อกต่ำกว่าจุดสั่งซื้อ`,
      tab: 'stock',
      buttonText: 'ตรวจสอบ'
    },
    {
      type: 'info',
      icon: 'ℹ️',
      title: 'งานซ่อมรอดำเนินการ',
      // FIX: Changed status from 'รอดำเนินการ' to 'รอซ่อม' to match the type definition.
      description: `มี ${repairs.filter(r => r.status === 'รอซ่อม').length} ใบแจ้งซ่อมที่รอการมอบหมายช่าง`,
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
        <StatCard title="งานซ่อมทั้งหมด" value={totalRepairs} bgColor="bg-blue-50" textColor="text-blue-600" trend="+12%" trendDirection="up" />
        <StatCard title="ซ่อมเสร็จแล้ว" value={completedRepairs} bgColor="bg-green-50" textColor="text-green-600" trend="+8%" trendDirection="up" />
        <StatCard title="กำลังซ่อม" value={inProgressRepairs} bgColor="bg-yellow-50" textColor="text-yellow-600" trend="-5%" trendDirection="down" />
        <StatCard title="รถทั้งหมด" value={totalVehicles} bgColor="bg-purple-50" textColor="text-purple-600" trend="+2" trendDirection="up" />
      </div>

      {/* Vehicle Type Stats */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🚛 สถิติตามประเภทรถ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard title="กระบะ 4 ล้อ" value="12" icon="🚐" bgColor="bg-indigo-50" textColor="text-indigo-600" />
            <StatCard title="รถบรรทุก 6 ล้อ" value="18" icon="🚛" bgColor="bg-emerald-50" textColor="text-emerald-600" />
            <StatCard title="รถบรรทุก 10 ล้อ" value="8" icon="🚚" bgColor="bg-amber-50" textColor="text-amber-600" />
            <StatCard title="รถหัวลาก & หางพ่วง" value="10" icon="🚜" bgColor="bg-rose-50" textColor="text-rose-600" />
        </div>
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
