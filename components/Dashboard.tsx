import React, { useMemo } from 'react';
import Swal from 'sweetalert2';
import type { Repair, StockItem, Tab, MaintenancePlan, Vehicle } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertCircle, Clock, Package, Calendar, ArrowRight, CheckCircle2, Activity, PieChart as PieChartIcon, Send, ShieldCheck } from 'lucide-react';
import { sendRepairStatusTelegramNotification, checkBotStatus } from '../utils/telegramService';
import { useToast } from '../context/ToastContext';

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

interface DashboardProps {
  repairs: Repair[];
  stock: StockItem[];
  maintenancePlans: MaintenancePlan[];
  vehicles: Vehicle[];
  setActiveTab: (tab: Tab) => void;
}

// --- Premium Styled Local Components ---

const ModernStatCard = ({ title, value, subtext, theme, icon, delay = '' }: any) => {
  let gradient = '';
  switch (theme) {
    case 'blue': gradient = 'from-blue-600 to-indigo-700'; break;
    case 'green': gradient = 'from-emerald-500 to-teal-700'; break;
    case 'yellow': gradient = 'from-amber-500 to-orange-700'; break;
    case 'red': gradient = 'from-rose-500 to-red-700'; break;
    case 'purple': gradient = 'from-violet-500 to-purple-700'; break;
    default: gradient = 'from-slate-700 to-slate-900';
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-8 rounded-[3rem] text-white shadow-2xl animate-scale-in ${delay} group hover:scale-[1.02] transition-all duration-700`}>
      <div className="absolute -right-10 -bottom-10 opacity-20 transform group-hover:scale-110 transition-transform duration-700">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/70 mb-3">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-black tracking-tighter">{value}</h3>
        </div>
        {subtext && <div className="mt-4 inline-flex items-center gap-1.5 bg-white/10 w-fit px-3 py-1.5 rounded-full text-xs font-black border border-white/10 backdrop-blur-md uppercase tracking-widest">{subtext}</div>}
      </div>
    </div>
  );
};

const PremiumCard = ({ title, children, className = '', icon, delay = '', subTitle = '' }: any) => (
  <div className={`glass p-10 rounded-[3.5rem] border border-white/50 shadow-2xl shadow-slate-200/40 hover:shadow-3xl transition-all duration-700 animate-scale-in ${delay} ${className}`}>
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="w-2.5 h-10 bg-gradient-to-b from-blue-600/50 to-indigo-600/50 rounded-full shadow-lg shadow-blue-500/10"></div>
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{title}</h3>
          {subTitle && <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{subTitle}</p>}
        </div>
      </div>
      {icon && <div className="p-3 bg-slate-50 rounded-[1.5rem] text-slate-400 border border-slate-100 shadow-sm">{icon}</div>}
    </div>
    <div className="h-[calc(100%-80px)]">
      {children}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ repairs, stock, maintenancePlans, vehicles, setActiveTab }) => {
  const { addToast } = useToast();
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
    const criticalItems = safeStock.filter(s => s.quantity <= s.minStock * 0.5 && !s.isFungibleUsedItem).slice(0, 3);
    criticalItems.forEach(item => {
      alerts.push({
        id: `stock-${item.id}`,
        type: item.quantity <= 0 ? 'danger' : 'warning',
        icon: <Package className="w-6 h-6" />,
        title: item.quantity <= 0 ? `อะไหล่หมดสต็อก: ${item.name}` : `อะไหล่ใกล้หมด: ${item.name}`,
        description: `จำนวนคงเหลือ ${item.quantity} ${item.unit} (ขั้นต่ำ ${item.minStock})`,
        tab: 'stock',
        action: 'จัดการสต็อก',
        enLabel: 'STOCK CRITICAL'
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
      alerts.push({
        id: `pm-${plan.id}`,
        type: 'warning',
        icon: <Calendar className="w-6 h-6" />,
        title: `ใกล้กำหนด PM: ${plan.vehicleLicensePlate}`,
        description: `รายการ: ${plan.planName} ภายใน 7 วันนี้`,
        tab: 'preventive-maintenance',
        action: 'บันทึก PM',
        enLabel: 'PM REMINDER'
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
        action: 'ตรวจสอบช่าง',
        enLabel: 'EFFICIENCY ALERT'
      });
    });

    return alerts;
  }, [safeStock, safePlans, safeRepairs, vehicles]);

  return (
    <div className="space-y-12 animate-fade-in-up pb-12">
      {/* Row 1: Key Stats Bento Grid */}
      <div className="bento-grid h-auto lg:h-auto gap-8">
        <ModernStatCard delay="delay-100" theme="blue" title="แจ้งซ่อมวันนี้" value={stats.reportedToday} subtext="Reported Repairs" icon={<Clock size={150} />} />
        <ModernStatCard delay="delay-150" theme="green" title="ซ่อมเสร็จวันนี้" value={stats.completedToday} subtext="Completed Tasks" icon={<CheckCircle2 size={150} />} />
        <ModernStatCard delay="delay-200" theme="yellow" title="กำลังซ่อม" value={stats.inProgress} subtext="Currently Active" icon={<Activity size={150} />} />
        <ModernStatCard delay="delay-250" theme="red" title="รอซ่อม" value={stats.waitingForRepair} subtext="Pending Queue" icon={<AlertCircle size={150} />} />

        {/* Analysis & Alerts Intelligence Grid */}
        <PremiumCard
          title="สถานะงานซ่อมปัจจุบัน"
          subTitle="Real-time Repair Distribution"
          className="lg:col-span-2 lg:row-span-2 min-h-[450px]"
          delay="delay-300"
          icon={<PieChartIcon size={24} />}
        >
          <div className="flex-1 w-full h-full min-h-[400px] relative">
            {stats.statusDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistData}
                    innerRadius={85}
                    outerRadius={120}
                    paddingAngle={12}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.statusDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.8)' }}
                  />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '30px', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <Activity size={64} className="opacity-20" />
                <p className="italic font-black text-sm uppercase tracking-widest text-slate-400">ยังไม่มีงานซ่อมวันนี้ (No Data Today)</p>
              </div>
            )}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-5 text-center pointer-events-none">
              <span className="block text-6xl font-black text-slate-900 leading-none">{safeRepairs.filter(r => r.status !== 'ซ่อมเสร็จ').length}</span>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 block">งานค้างสะสม</span>
            </div>
          </div>
        </PremiumCard>

        {/* Insights Section */}
        <PremiumCard
          title="อินไซต์เร่งด่วน"
          subTitle="Urgent Operational Insights"
          className="lg:col-span-2 lg:row-span-2 min-h-[450px]"
          delay="delay-400"
          icon={<AlertCircle size={24} />}
        >
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar h-full">
            {dynamicAlerts.length > 0 ? (
              dynamicAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`group flex flex-col xl:flex-row items-center p-6 rounded-[2.5rem] border border-white/40 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl ${alert.type === 'danger' ? 'bg-red-50/40 text-red-900 border-red-100' :
                    alert.type === 'warning' ? 'bg-amber-50/40 text-amber-900 border-amber-100' :
                      'bg-blue-50/40 text-blue-900 border-blue-100'
                    }`}
                >
                  <div className={`flex items-center justify-center w-16 h-16 rounded-[1.5rem] shrink-0 xl:mr-6 shadow-2xl transition-transform group-hover:rotate-6 ${alert.type === 'danger' ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/20' :
                    alert.type === 'warning' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20' :
                      'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
                    }`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-center xl:text-left mt-4 xl:mt-0">
                    <div className="flex items-center gap-2 mb-1 justify-center xl:justify-start">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 italic">{alert.enLabel}</span>
                    </div>
                    <h4 className="font-black text-slate-800 text-base leading-tight">{alert.title}</h4>
                    <p className="text-slate-500 text-xs font-bold opacity-80 mt-1">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab(alert.tab as Tab)}
                    title={alert.action}
                    className="mt-6 xl:mt-0 xl:ml-6 flex items-center gap-3 py-4 px-8 bg-slate-950 text-white text-[10px] font-black rounded-2xl shadow-2xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap"
                  >
                    {alert.action}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse border-2 border-emerald-100 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 size={48} />
                </div>
                <p className="text-slate-800 font-black text-2xl mb-2 italic">Operation Perfect!</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">ยังไม่มีรายการเร่งด่วนในขณะนี้</p>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Stock Value Card - Premium Glass-Dark */}
        <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[4rem] text-white shadow-3xl flex flex-col md:flex-row items-center justify-between group overflow-hidden relative animate-scale-in delay-500 border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-blue-400 font-black uppercase tracking-[0.4em] text-[10px] mb-4 flex items-center gap-2 italic">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              Total Inventory Value Asset
            </span>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                {stats.totalStockValue.toLocaleString()}
              </span>
              <span className="text-xl font-black text-slate-500 uppercase tracking-widest">บาท (THB)</span>
            </div>
          </div>
          <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center text-5xl group-hover:rotate-12 transition-all duration-500 shadow-2xl border border-white/10 mt-8 md:mt-0 backdrop-blur-xl">
            💰
          </div>
        </div>

        <ModernStatCard delay="delay-550" theme="purple" title="รายการต้องสั่งเพิ่ม" value={`${stats.lowStockCount} ชิ้น`} subtext="Replenishment Alert" icon={<Package size={150} />} />
        <ModernStatCard delay="delay-600" theme="red" title="รายการหมดสต็อก" value={`${stats.outOfStockCount} ชิ้น`} subtext="Critical Out of Stock" icon={<Activity size={150} />} />

        {/* Quick Actions Navigator - High Contrast */}
        <div className="lg:col-span-4 bg-slate-50 p-12 rounded-[4rem] border-2 border-dashed border-slate-200 animate-scale-in delay-700 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-5 justify-center">
              <span className="w-4 h-4 bg-amber-400 rounded-full animate-bounce"></span>
              ทางลัดการจัดการคลังความรู้ (Intelligence Navigator)
              <span className="w-4 h-4 bg-amber-400 rounded-full animate-bounce delay-75"></span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {[
                { id: 'form', icon: '📝', label: 'แจ้งซ่อมใหม่', en: 'Maint Request', color: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-500/20' },
                { id: 'stock', icon: '📦', label: 'เช็คสต็อก', en: 'Inv Intel', color: 'from-slate-800 to-slate-950', shadow: 'shadow-slate-950/20' },
                { id: 'preventive-maintenance', icon: '📅', label: 'ตาราง PM', en: 'PM Schedule', color: 'from-emerald-600 to-teal-800', shadow: 'shadow-emerald-500/20' },
                { id: 'technician-view', icon: '👨‍🔧', label: 'ห้องพักช่าง', en: 'Tech Hub', color: 'from-amber-500 to-orange-700', shadow: 'shadow-amber-500/20' }
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => setActiveTab(action.id as Tab)}
                  className="group flex flex-col items-center gap-6 transition-all"
                >
                  <div className={`w-24 h-24 bg-gradient-to-br ${action.color} rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl ${action.shadow} group-hover:-translate-y-4 group-hover:scale-110 group-hover:rotate-3 active:scale-95 transition-all duration-500 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {action.icon}
                  </div>
                  <div className="text-center group-hover:scale-105 transition-transform">
                    <span className="block font-black text-slate-900 text-sm tracking-tight">{action.label}</span>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{action.en}</span>
                  </div>
                </button>
              ))}

              {/* Test Button */}
              <button
                onClick={async () => {
                  addToast('กำลังทดสอบส่ง Telegram...', 'info');
                  const dummyRepair: any = {
                    licensePlate: 'กข-1234 (TEST)',
                    repairOrderNo: 'RO-TEST-001',
                    problemDescription: 'ทดสอบระบบแจ้งเตือน (Testing Notification System)',
                    createdAt: new Date().toISOString()
                  };
                  const success = await sendRepairStatusTelegramNotification(dummyRepair, 'เริ่มทดสอบ', 'กำลังทดสอบ');
                  if (success) {
                    addToast('ส่ง Telegram สำเร็จ! (Check your group)', 'success');
                  } else {
                    addToast('ส่ง Telegram ล้มเหลว! ตรวจสอบ Console เพื่อดู Error', 'error');
                  }
                }}
                className="group flex flex-col items-center gap-6 transition-all md:col-start-2 lg:col-start-2"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-rose-500/20 group-hover:-translate-y-4 group-hover:scale-110 group-hover:rotate-3 active:scale-95 transition-all duration-500">
                  <Send className="w-12 h-12 text-white" />
                </div>
                <div className="text-center group-hover:scale-105 transition-transform">
                  <span className="block font-black text-slate-900 text-sm tracking-tight">ทดสอบ Bot</span>
                  <span className="block text-[9px] font-black text-rose-400 uppercase tracking-widest mt-1 opacity-60">Test Notification</span>
                </div>
              </button>

              <button
                onClick={async () => {
                  addToast('กำลังตรวจสอบสถานะ Bot...', 'info');
                  const result = await checkBotStatus();
                  if (result.ok) {
                    Swal.fire({
                      title: 'Bot OK!',
                      text: result.message,
                      icon: 'success',
                      confirmButtonText: 'รับทราบ',
                      confirmButtonColor: '#10b981',
                      customClass: { popup: 'rounded-[2rem]' }
                    });
                  } else {
                    Swal.fire({
                      title: 'Bot Error!',
                      text: result.message,
                      icon: 'error',
                      confirmButtonText: 'ลองอีกครั้ง',
                      confirmButtonColor: '#ef4444',
                      customClass: { popup: 'rounded-[2rem]' }
                    });
                  }
                }}
                className="group flex flex-col items-center gap-6 transition-all md:col-start-3 lg:col-start-3"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/20 group-hover:-translate-y-4 group-hover:scale-110 group-hover:rotate-3 active:scale-95 transition-all duration-500">
                  <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <div className="text-center group-hover:scale-105 transition-transform">
                  <span className="block font-black text-slate-900 text-sm tracking-tight">เช็คสถานะ Bot</span>
                  <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1 opacity-60">Diagnostic</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;