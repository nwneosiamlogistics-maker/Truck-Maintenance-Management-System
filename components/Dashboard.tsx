import React, { useMemo } from 'react';
import type { Repair, StockItem, Tab, MaintenancePlan, Vehicle } from '../types';
import StatCard from './StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertCircle, Clock, Package, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  repairs: Repair[];
  stock: StockItem[];
  maintenancePlans: MaintenancePlan[];
  vehicles: Vehicle[];
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

const Dashboard: React.FC<DashboardProps> = ({ repairs, stock, maintenancePlans, vehicles, setActiveTab }) => {
  const safeRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);
  const safeStock = useMemo(() => Array.isArray(stock) ? stock : [], [stock]);
  const safePlans = useMemo(() => Array.isArray(maintenancePlans) ? maintenancePlans : [], [maintenancePlans]);

  const stats = useMemo(() => {
    const reportedToday = safeRepairs.filter(r => isToday(r.createdAt)).length;
    const completedToday = safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && isToday(r.repairEndDate)).length;
    const inProgress = safeRepairs.filter(r => r.status === 'กำลังซ่อม').length;
    const waitingForRepair = safeRepairs.filter(r => r.status === 'รอซ่อม').length;
    const pendingParts = safeRepairs.filter(r => r.status === 'รออะไหล่').length;

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

  const dynamicAlerts = useMemo(() => {
    const alerts: any[] = [];

    // 1. Critical Low Stock Alerts
    const criticalItems = safeStock.filter(s => s.quantity <= s.minStock * 0.5 && !s.isFungibleUsedItem).slice(0, 2);
    criticalItems.forEach(item => {
      alerts.push({
        id: `stock-${item.id}`,
        type: item.quantity <= 0 ? 'danger' : 'warning',
        icon: <Package className="w-6 h-6" />,
        title: item.quantity <= 0 ? `อะไหล่หมดสต็อก: ${item.name}` : `อะไหล่ใกล้หมด: ${item.name}`,
        description: `จำนวนคงเหลือ ${item.quantity} ${item.unit} (ขั้นต่ำ ${item.minStock})`,
        tab: 'stock',
        action: 'จัดการสต็อก'
      });
    });

    // 2. PM Due Soon Alerts (Within 7 days)
    const pmSoon = safePlans.filter(plan => {
      const nextServiceDate = new Date(plan.lastServiceDate);
      if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
      else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
      else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);

      const diffDays = (nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).slice(0, 2);

    pmSoon.forEach(plan => {
      const vehicle = (vehicles || []).find(v => v.id === plan.vehicleId);
      alerts.push({
        id: `pm-${plan.id}`,
        type: 'warning',
        icon: <Calendar className="w-6 h-6" />,
        title: `ใกล้กำหนด PM: ${vehicle ? vehicle.licensePlate : 'ไม่ทราบทะเบียน'}`,
        description: `รายการ: ${plan.serviceName} ภายใน 7 วันนี้`,
        tab: 'preventive-maintenance',
        action: 'บันทึก PM'
      });
    });

    // 3. Overdue Repairs (In progress > 2 days)
    const overdueRepairs = safeRepairs.filter(r => {
      if (r.status !== 'กำลังซ่อม' || !r.repairStartDate) return false;
      const start = new Date(r.repairStartDate);
      const diffDays = (new Date().getTime() - start.getTime()) / (1000 * 3600 * 24);
      return diffDays > 2;
    }).slice(0, 2);

    overdueRepairs.forEach(r => {
      alerts.push({
        id: `repair-${r.id}`,
        type: 'info',
        icon: <Clock className="w-6 h-6" />,
        title: `งานซ่อมใช้เวลานานผิดปกติ: ${r.repairOrderNo}`,
        description: `คัน: ${r.licensePlate} เริ่มซ่อมมาแล้วกว่า 2 วัน`,
        tab: 'list',
        action: 'ตรวจสอบช่าง'
      });
    });

    return alerts;
  }, [safeStock, safePlans, safeRepairs, vehicles]);

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="แจ้งซ่อมวันนี้" value={stats.reportedToday} theme="blue" icon={<Clock size={20} />} />
        <StatCard title="ซ่อมเสร็จวันนี้" value={stats.completedToday} theme="green" icon={<CheckCircle2 size={20} />} />
        <StatCard title="กำลังซ่อม" value={stats.inProgress} theme="yellow" icon={<Clock size={20} />} />
        <StatCard title="รอซ่อม" value={stats.waitingForRepair} theme="red" icon={<AlertCircle size={20} />} />
        <StatCard title="อะไหล่ใกล้หมด" value={stats.lowStockCount} theme="yellow" icon={<Package size={20} />} />
        <StatCard title="อะไหล่หมดสต็อก" value={stats.outOfStockCount} theme="red" icon={<Package size={20} />} />
        <div className="md:col-span-2 xl:col-span-2">
          <StatCard
            title="มูลค่าสต็อกคงเหลือ"
            value={`${stats.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} บาท`}
            theme="purple"
            icon={<ArrowRight size={20} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Status Distribution Chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col min-h-[350px]">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-blue-500" />
            สถานะงานซ่อมปัจจุบัน
          </h3>
          <div className="flex-1 w-full relative">
            {stats.statusDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistData}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.statusDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">ยังไม่มีงานซ่อมวันนี้</div>
            )}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="block text-3xl font-bold text-slate-700">{safeRepairs.filter(r => r.status !== 'ซ่อมเสร็จ').length}</span>
              <span className="text-xs text-slate-400 font-medium">งานค้าง</span>
            </div>
          </div>
        </div>

        {/* Alerts Section (Proactive) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle size={24} />
              </span>
              อินไซต์ที่ต้องดำเนินการ
            </h3>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
              {dynamicAlerts.length} รายการเร่งด่วน
            </span>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {dynamicAlerts.length > 0 ? (
              dynamicAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`group flex flex-col sm:flex-row items-start sm:items-center p-5 rounded-2xl border-2 transition-all hover:bg-slate-50 ${alert.type === 'danger' ? 'border-red-100 bg-red-50/10' :
                    alert.type === 'warning' ? 'border-yellow-100 bg-yellow-50/10' :
                      'border-blue-100 bg-blue-50/10'
                    }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 mb-4 sm:mb-0 sm:mr-5 ${alert.type === 'danger' ? 'bg-red-500 text-white' :
                    alert.type === 'warning' ? 'bg-yellow-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{alert.title}</h4>
                    <p className="text-slate-500 text-sm font-medium">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab(alert.tab as Tab)}
                    className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2 py-2.5 px-5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all group-hover:shadow-md"
                  >
                    {alert.action}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-slate-500 font-bold">ยอดเยี่ยม! ยังไม่มีรายการเร่งด่วนในขณะนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full -mr-32 -mt-32 opacity-20"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-6">🎯 ทางลัดการจัดการ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'form', icon: '📝', label: 'แจ้งซ่อมใหม่', color: 'bg-blue-500' },
              { id: 'stock', icon: '📦', label: 'เช็คสต็อก', color: 'bg-indigo-500' },
              { id: 'preventive-maintenance', icon: '📅', label: 'ตาราง PM', color: 'bg-emerald-500' },
              { id: 'technician-view', icon: '👨‍🔧', label: 'ห้องพักช่าง', color: 'bg-amber-500' }
            ].map(action => (
              <button
                key={action.id}
                onClick={() => setActiveTab(action.id as Tab)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <span className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                  {action.icon}
                </span>
                <span className="font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;