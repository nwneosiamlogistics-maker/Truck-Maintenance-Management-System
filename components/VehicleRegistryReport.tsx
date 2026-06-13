import React, { useState, useMemo } from 'react';
import type { Repair, Vehicle } from '../types';
import { calculateDurationHours, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Truck, Activity, Clock, AlertTriangle, ChevronDown, ChevronUp, Search,
    Wrench, Package, Calendar, ShieldAlert
} from 'lucide-react';

interface VehicleRegistryReportProps {
    repairs: Repair[];
    vehicles: Vehicle[];
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',      // รอซ่อม
    inProgress: '#3b82f6',   // กำลังซ่อม
    waitingParts: '#ef4444', // รออะไหล่
    external: '#8b5cf6',     // ส่งซ่อมนอก
    done: '#10b981',         // ซ่อมเสร็จ
};

const STATUS_LABELS: { key: string, label: string, color: string }[] = [
    { key: 'pending', label: 'รอซ่อม', color: STATUS_COLORS.pending },
    { key: 'inProgress', label: 'กำลังซ่อม', color: STATUS_COLORS.inProgress },
    { key: 'waitingParts', label: 'รออะไหล่', color: STATUS_COLORS.waitingParts },
    { key: 'external', label: 'ส่งซ่อมนอก', color: STATUS_COLORS.external },
    { key: 'done', label: 'ซ่อมเสร็จ', color: STATUS_COLORS.done },
];

const ACTIVE_STATUSES = ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'];

// แปลงชั่วโมงเป็นรูปแบบอ่านง่าย เช่น "1 วัน 30 นาที"
const formatDowntime = (hours: number): string => {
    if (!hours || hours <= 0) return '-';
    const totalMinutes = Math.round(hours * 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const h = Math.floor((totalMinutes % (24 * 60)) / 60);
    const m = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (h > 0) parts.push(`${h} ชม.`);
    if (m > 0) parts.push(`${m} นาที`);
    return parts.length > 0 ? parts.join(' ') : '0 นาที';
};

// --- Styled bits ---
const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    switch (theme) {
        case 'blue': gradient = 'from-blue-600 to-indigo-700'; break;
        case 'green': gradient = 'from-emerald-500 to-teal-700'; break;
        case 'orange': gradient = 'from-orange-500 to-red-700'; break;
        case 'purple': gradient = 'from-purple-500 to-pink-700'; break;
        default: gradient = 'from-slate-700 to-slate-900';
    }
    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-6 lg:p-8 rounded-[2.5rem] text-white shadow-2xl hover:scale-[1.02] transition-all duration-500 group`}>
            <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:scale-110 transition-transform duration-700">{icon}</div>
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-3">{title}</p>
                <h3 className="text-2xl lg:text-4xl font-black tracking-tighter">{value}</h3>
                {subtext && <div className="mt-3 inline-flex bg-white/10 px-3 py-1 rounded-full text-[9px] font-black border border-white/10 uppercase tracking-widest">{subtext}</div>}
            </div>
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: React.ReactNode }> = ({ title, children, className = '', icon }) => (
    <div className={`glass p-5 lg:p-8 rounded-[2.5rem] border border-white/50 shadow-2xl shadow-slate-200/40 ${className}`}>
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-base lg:text-xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <div className="w-2 h-7 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                {title}
            </h3>
            {icon && <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100">{icon}</div>}
        </div>
        {children}
    </div>
);

type PeriodType = 'all' | 'week' | 'month' | 'year';

const VehicleRegistryReport: React.FC<VehicleRegistryReportProps> = ({ repairs, vehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPlate, setExpandedPlate] = useState<string | null>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('all');
    const [periodOffset, setPeriodOffset] = useState(0);

    const changePeriodType = (t: PeriodType) => { setPeriodType(t); setPeriodOffset(0); };

    const data = useMemo(() => {
        const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
        const allRepairs = Array.isArray(repairs) ? repairs : [];
        const now = new Date();

        // คำนวณช่วงเวลาที่เลือก (กรอง repairs ตาม createdAt)
        let start: Date | null = null, end: Date | null = null, periodLabel = 'ทั้งหมด';
        if (periodType === 'year') {
            const y = now.getFullYear() + periodOffset;
            start = new Date(y, 0, 1, 0, 0, 0, 0);
            end = new Date(y, 11, 31, 23, 59, 59, 999);
            periodLabel = `ปี ${y + 543}`;
        } else if (periodType === 'month') {
            const base = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
            start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
            periodLabel = `${start.toLocaleDateString('th-TH', { month: 'long' })} ${start.getFullYear() + 543}`;
        } else if (periodType === 'week') {
            const base = new Date(now);
            base.setDate(now.getDate() + periodOffset * 7);
            const dow = (base.getDay() + 6) % 7; // จันทร์ = 0
            start = new Date(base); start.setDate(base.getDate() - dow); start.setHours(0, 0, 0, 0);
            end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
            const fmt = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            periodLabel = `${fmt(start)} - ${fmt(end)} ${end.getFullYear() + 543}`;
        }

        const inPeriod = (r: Repair): boolean => {
            if (!start || !end || !r.createdAt) return periodType === 'all';
            const d = new Date(r.createdAt);
            return d >= start && d <= end;
        };
        const safeRepairs = periodType === 'all' ? allRepairs : allRepairs.filter(inPeriod);

        const repairCost = (r: Repair): number => {
            const partsCost = (r.parts || []).reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);
            return (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        };

        const getAge = (v: Vehicle): number | null => {
            if (v.registrationDate) {
                const y = new Date(v.registrationDate).getFullYear();
                if (y > 1950 && y <= now.getFullYear()) return now.getFullYear() - y;
            }
            if (v.yearOfManufacture && v.yearOfManufacture > 1950) return now.getFullYear() - v.yearOfManufacture;
            return null;
        };

        // กลุ่มงานซ่อมรายทะเบียน (ตามช่วงเวลา — ใช้คำนวณสถิติ)
        const repairsByPlate = safeRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            const plate = r.licensePlate || 'ไม่ระบุ';
            if (!acc[plate]) acc[plate] = [];
            acc[plate].push(r);
            return acc;
        }, {});
        // กลุ่มงานซ่อมทั้งหมด (ใช้คำนวณสถานะปัจจุบัน real-time)
        const repairsByPlateAll = allRepairs.reduce((acc: Record<string, Repair[]>, r) => {
            const plate = r.licensePlate || 'ไม่ระบุ';
            if (!acc[plate]) acc[plate] = [];
            acc[plate].push(r);
            return acc;
        }, {});

        // สถานะงานซ่อม (5 ประเภท exclusive)
        const statusCounts = { pending: 0, inProgress: 0, waitingParts: 0, external: 0, done: 0 };
        safeRepairs.forEach(r => {
            if (r.status === 'ยกเลิก') return;
            if (r.status === 'ซ่อมเสร็จ') { statusCounts.done++; return; }
            if (r.dispatchType === 'ภายนอก') { statusCounts.external++; return; }
            if (r.status === 'รอซ่อม') statusCounts.pending++;
            else if (r.status === 'กำลังซ่อม') statusCounts.inProgress++;
            else if (r.status === 'รออะไหล่') statusCounts.waitingParts++;
        });

        // แจ้งเตือนภาษี/ประกัน (ภายใน 30 วัน หรือหมดแล้ว)
        const daysLeft = (dateStr: string | null): number | null => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        };

        // สถิติรายคัน
        const registry = safeVehicles.map(v => {
            const reps = repairsByPlate[v.licensePlate] || [];       // ช่วงเวลา → สถิติ
            const allReps = repairsByPlateAll[v.licensePlate] || []; // ทั้งหมด → สถานะปัจจุบัน
            const completed = reps.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate);
            const downtimeHours = completed.reduce((s, r) => s + calculateDurationHours(r.createdAt, r.repairEndDate ?? null), 0);
            const totalCost = reps.reduce((s, r) => s + repairCost(r), 0);
            // สถานะปัจจุบันคิดจากงานที่ค้างอยู่จริง (ไม่ขึ้นกับช่วงเวลาที่เลือก)
            const activeRepair = allReps.find(r => ACTIVE_STATUSES.includes(r.status));
            const isExternal = allReps.some(r => r.dispatchType === 'ภายนอก' && ACTIVE_STATUSES.includes(r.status));
            const lastRepair = allReps.length > 0
                ? allReps.reduce((latest, r) => new Date(r.createdAt) > new Date(latest.createdAt) ? r : latest)
                : null;
            const taxDays = daysLeft(v.taxExpiryDate);
            const insDays = daysLeft(v.insuranceExpiryDate);

            let currentStatus: 'พร้อมใช้งาน' | 'กำลังซ่อม' | 'ส่งซ่อมนอก' | 'จอด';
            if (isExternal) currentStatus = 'ส่งซ่อมนอก';
            else if (activeRepair) currentStatus = 'กำลังซ่อม';
            else if (v.status === 'Inactive') currentStatus = 'จอด';
            else currentStatus = 'พร้อมใช้งาน';

            return {
                vehicle: v,
                plate: v.licensePlate,
                age: getAge(v),
                repairCount: reps.length,
                completedCount: completed.length,
                downtimeHours,
                totalCost,
                currentStatus,
                lastRepairDate: lastRepair?.createdAt || null,
                taxDays,
                insDays,
                repairs: [...reps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            };
        }).sort((a, b) => b.repairCount - a.repairCount);

        // KPI ภาพรวม
        const ages = registry.map(r => r.age).filter((a): a is number => a !== null);
        const avgAge = ages.length > 0 ? ages.reduce((s, a) => s + a, 0) / ages.length : 0;
        const inServiceNow = registry.filter(r => r.currentStatus === 'กำลังซ่อม' || r.currentStatus === 'ส่งซ่อมนอก').length;
        const activeCount = safeVehicles.filter(v => v.status === 'Active').length;

        // วิเคราะห์: รถเสียซ้ำบ่อย (Top 8 by repairCount)
        const topFrequent = registry.filter(r => r.repairCount > 0).slice(0, 8)
            .map(r => ({ name: r.plate, value: r.repairCount }));

        // อะไหล่ใช้บ่อย (Top 8 by quantity)
        const partUsage: Record<string, number> = {};
        safeRepairs.forEach(r => (r.parts || []).forEach(p => {
            partUsage[p.name] = (partUsage[p.name] || 0) + (Number(p.quantity) || 0);
        }));
        const topParts = Object.entries(partUsage).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value).slice(0, 8);

        // งานซ่อม Downtime สูง (Top 8 individual repairs)
        const topDowntime = safeRepairs
            .filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate)
            .map(r => ({
                plate: r.licensePlate,
                problem: (r.problemDescription || '-').trim(),
                hours: calculateDurationHours(r.createdAt, r.repairEndDate ?? null),
                repairOrderNo: r.repairOrderNo,
            }))
            .sort((a, b) => b.hours - a.hours).slice(0, 8);

        return {
            totalVehicles: safeVehicles.length,
            activeCount,
            inactiveCount: safeVehicles.length - activeCount,
            avgAge,
            inServiceNow,
            statusCounts,
            registry,
            topFrequent,
            topParts,
            topDowntime,
            repairCost,
            periodLabel,
            totalRepairsInPeriod: safeRepairs.length,
        };
    }, [repairs, vehicles, periodType, periodOffset]);

    const filteredRegistry = useMemo(() => {
        const term = searchTerm.toLowerCase();
        // เมื่อเลือกช่วงเวลา → ซ่อนรถที่ไม่มีงานซ่อมในช่วงนั้น
        let list = periodType === 'all' ? data.registry : data.registry.filter(r => r.repairCount > 0);
        if (!term) return list;
        return list.filter(r =>
            r.plate.toLowerCase().includes(term) ||
            (r.vehicle.vehicleType || '').toLowerCase().includes(term) ||
            (r.vehicle.make || '').toLowerCase().includes(term) ||
            (r.vehicle.model || '').toLowerCase().includes(term)
        );
    }, [data.registry, searchTerm, periodType]);

    const statusPieData = STATUS_LABELS.map(s => ({
        name: s.label,
        value: data.statusCounts[s.key as keyof typeof data.statusCounts],
        color: s.color,
    })).filter(d => d.value > 0);

    const statusBadge = (status: string) => {
        switch (status) {
            case 'พร้อมใช้งาน': return 'bg-emerald-100 text-emerald-700';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-700';
            case 'ส่งซ่อมนอก': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-200 text-slate-600';
        }
    };

    const expiryBadge = (days: number | null) => {
        if (days === null) return null;
        if (days < 0) return <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-red-100 text-red-600">หมดแล้ว {Math.abs(days)} วัน</span>;
        if (days <= 30) return <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-600">เหลือ {days} วัน</span>;
        return null;
    };

    // ศูนย์แจ้งเตือน (ด้านบนสุด)
    const docAlerts = data.registry.filter(r => (r.taxDays !== null && r.taxDays <= 30) || (r.insDays !== null && r.insDays <= 30));
    const repairAlerts = data.registry.filter(r => r.currentStatus === 'กำลังซ่อม' || r.currentStatus === 'ส่งซ่อมนอก');
    const focusVehicle = (plate: string) => { setSearchTerm(plate); setExpandedPlate(plate); };

    // ตัวช่วยเลือกปี/เดือนตรงๆ จาก dropdown
    const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const _now = new Date();
    const curYear = _now.getFullYear();
    const curMonth = _now.getMonth();
    const yearOptions = Array.from({ length: 7 }, (_, i) => curYear - i); // 7 ปีย้อนหลัง
    const monthBase = new Date(curYear, curMonth + periodOffset, 1); // ช่วงเดือนที่เลือกอยู่
    const selYear = monthBase.getFullYear();
    const selMonth = monthBase.getMonth();
    const setMonthSelection = (y: number, m: number) => setPeriodOffset((y - curYear) * 12 + (m - curMonth));
    const setYearSelection = (y: number) => setPeriodOffset(y - curYear);

    return (
        <div className="space-y-6 lg:space-y-10 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-5 lg:p-10 rounded-[3rem] lg:rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 via-transparent to-blue-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-2xl lg:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 leading-none">
                        Fleet Registry
                    </h2>
                    <p className="text-slate-400 font-black mt-2 lg:mt-4 uppercase tracking-[0.3em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                        ทะเบียนรถ ประวัติซ่อม อายุรถ และสถานะรายทะเบียน
                    </p>
                </div>
                <div className="relative z-10 mt-5 lg:mt-0 w-full lg:w-auto">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหาทะเบียน / ประเภท / ยี่ห้อ..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full lg:w-72 bg-white/60 pl-12 pr-5 py-3 rounded-2xl text-[11px] font-bold text-slate-700 border border-white shadow-inner outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                </div>
            </div>

            {/* ⓪ ศูนย์แจ้งเตือน (ด้านบนสุด) */}
            {(docAlerts.length > 0 || repairAlerts.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* เอกสารต้องต่ออายุ */}
                    {docAlerts.length > 0 && (
                        <div className="glass p-5 rounded-3xl border-2 border-red-100 shadow-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="p-2 bg-red-100 text-red-600 rounded-xl"><ShieldAlert size={16} /></span>
                                <h3 className="text-sm font-black text-slate-800">เอกสารต้องต่ออายุ <span className="text-red-600">({docAlerts.length} คัน)</span></h3>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                                {docAlerts.map(r => (
                                    <button key={r.plate} type="button" onClick={() => focusVehicle(r.plate)} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 hover:border-red-200 hover:shadow-sm transition-all active:scale-95">
                                        <span className="text-[11px] font-black text-slate-800">{r.plate}</span>
                                        {r.taxDays !== null && r.taxDays <= 30 && <span className="flex items-center gap-0.5"><span className="text-[8px] font-black text-slate-400">ภาษี</span>{expiryBadge(r.taxDays)}</span>}
                                        {r.insDays !== null && r.insDays <= 30 && <span className="flex items-center gap-0.5"><span className="text-[8px] font-black text-slate-400">ประกัน</span>{expiryBadge(r.insDays)}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* รถอยู่ระหว่างซ่อม */}
                    {repairAlerts.length > 0 && (
                        <div className="glass p-5 rounded-3xl border-2 border-blue-100 shadow-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Wrench size={16} /></span>
                                <h3 className="text-sm font-black text-slate-800">รถอยู่ระหว่างซ่อม <span className="text-blue-600">({repairAlerts.length} คัน)</span></h3>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                                {repairAlerts.map(r => (
                                    <button key={r.plate} type="button" onClick={() => focusVehicle(r.plate)} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 hover:border-blue-200 hover:shadow-sm transition-all active:scale-95">
                                        <span className="text-[11px] font-black text-slate-800">{r.plate}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${statusBadge(r.currentStatus)}`}>{r.currentStatus}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ตัวกรองช่วงเวลา (มีผลเฉพาะสถิติการซ่อม) */}
            <div className="glass p-3 rounded-[1.5rem] border border-white/50 shadow-lg flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/60 p-1 rounded-2xl w-full sm:w-auto">
                    {([
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'week', label: 'รายสัปดาห์' },
                        { id: 'month', label: 'รายเดือน' },
                        { id: 'year', label: 'รายปี' },
                    ] as { id: PeriodType, label: string }[]).map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => changePeriodType(p.id)}
                            className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest transition-all whitespace-nowrap ${periodType === p.id ? 'bg-slate-950 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {periodType !== 'all' && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                        <button type="button" onClick={() => setPeriodOffset(o => o - 1)} title="ช่วงก่อนหน้า" className="p-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95">
                            <ChevronDown size={16} className="rotate-90" />
                        </button>

                        {periodType === 'week' && (
                            <span className="min-w-[130px] text-center text-xs font-black text-slate-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">{data.periodLabel}</span>
                        )}
                        {periodType === 'month' && (
                            <>
                                <select value={selMonth} onChange={e => setMonthSelection(selYear, Number(e.target.value))} title="เลือกเดือน" className="bg-blue-50 border border-blue-100 text-xs font-black text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer">
                                    {THAI_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <select value={selYear} onChange={e => setMonthSelection(Number(e.target.value), selMonth)} title="เลือกปี" className="bg-blue-50 border border-blue-100 text-xs font-black text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer">
                                    {yearOptions.map(y => <option key={y} value={y}>{y + 543}</option>)}
                                </select>
                            </>
                        )}
                        {periodType === 'year' && (
                            <select value={curYear + periodOffset} onChange={e => setYearSelection(Number(e.target.value))} title="เลือกปี" className="bg-blue-50 border border-blue-100 text-xs font-black text-slate-700 px-4 py-2 rounded-xl outline-none cursor-pointer min-w-[110px]">
                                {yearOptions.map(y => <option key={y} value={y}>ปี {y + 543}</option>)}
                            </select>
                        )}

                        <button type="button" onClick={() => setPeriodOffset(o => Math.min(0, o + 1))} disabled={periodOffset >= 0} title="ช่วงถัดไป" className="p-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronDown size={16} className="-rotate-90" />
                        </button>
                    </div>
                )}
            </div>

            {/* ① ภาพรวมกองรถ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <ModernStatCard theme="blue" title="รถทั้งหมด" value={`${data.totalVehicles} คัน`} subtext={`ใช้งาน ${data.activeCount} · จอด ${data.inactiveCount}`} icon={<Truck size={120} />} />
                <ModernStatCard theme="green" title="อายุเฉลี่ยกองรถ" value={data.avgAge > 0 ? `${data.avgAge.toFixed(1)} ปี` : '-'} subtext="Average Fleet Age" icon={<Calendar size={120} />} />
                <ModernStatCard theme="orange" title="กำลังซ่อม/ส่งนอก" value={`${data.inServiceNow} คัน`} subtext="In Service Now" icon={<Wrench size={120} />} />
                <ModernStatCard theme="purple" title="งานซ่อมรวม" value={`${data.totalRepairsInPeriod.toLocaleString()}`} subtext={periodType === 'all' ? 'Total Repair Orders' : data.periodLabel} icon={<Activity size={120} />} />
            </div>

            {/* ② สถานะงานซ่อม 5 ประเภท */}
            <Card title="สถานะงานซ่อม (แยกประเภท)" icon={<Activity size={18} />}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {STATUS_LABELS.map(s => (
                            <div key={s.key} className="rounded-2xl p-4 border border-slate-100 bg-slate-50/50 text-center">
                                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: s.color }}></div>
                                <div className="text-2xl font-black text-slate-800 tabular-nums">{data.statusCounts[s.key as keyof typeof data.statusCounts]}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="h-[200px]">
                        {statusPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6} dataKey="value">
                                        {statusPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300 text-[11px] font-black uppercase">ไม่มีงานซ่อม</div>
                        )}
                    </div>
                </div>
            </Card>

            {/* ③ วิเคราะห์ 3 มุม */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="รถเสียซ้ำบ่อย" icon={<AlertTriangle size={18} />}>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={data.topFrequent} margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" name="ครั้ง" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="อะไหล่ใช้บ่อย" icon={<Package size={18} />}>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={data.topParts} margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" name="จำนวน" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="งานซ่อม Downtime สูง" icon={<Clock size={18} />}>
                    <div className="h-[280px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                        {data.topDowntime.length > 0 ? data.topDowntime.map((d, i) => (
                            <div key={i} className="p-3 rounded-2xl bg-slate-50/60 border border-slate-100">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-800">{d.plate}</div>
                                        <div className="text-[10px] font-bold text-slate-500 truncate">{d.problem}</div>
                                    </div>
                                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg whitespace-nowrap shrink-0">{formatDowntime(d.hours)}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex items-center justify-center h-full text-slate-300 text-[11px] font-black uppercase">ไม่มีข้อมูล</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ④ ตารางทะเบียนรถรายคัน */}
            <Card title={`ทะเบียนรถรายคัน (${filteredRegistry.length} คัน)`} icon={<Truck size={18} />}>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="py-4 px-3">ทะเบียน</th>
                                <th className="py-4 px-3">ประเภท / ยี่ห้อ-รุ่น</th>
                                <th className="py-4 px-3 text-center">อายุรถ</th>
                                <th className="py-4 px-3 text-center">จำนวนซ่อม</th>
                                <th className="py-4 px-3 text-right">Downtime รวม</th>
                                <th className="py-4 px-3 text-right">ค่าซ่อมรวม</th>
                                <th className="py-4 px-3 text-center">สถานะ</th>
                                <th className="py-4 px-3">แจ้งเตือน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRegistry.map(r => (
                                <React.Fragment key={r.plate}>
                                    <tr onClick={() => setExpandedPlate(expandedPlate === r.plate ? null : r.plate)} className={`cursor-pointer transition-colors ${expandedPlate === r.plate ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                                        <td className="py-4 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${expandedPlate === r.plate ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {expandedPlate === r.plate ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                </span>
                                                <span className="font-black text-slate-900 text-sm">{r.plate}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <div className="text-xs font-bold text-slate-700">{r.vehicle.vehicleType || '-'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{[r.vehicle.make, r.vehicle.model].filter(Boolean).join(' ') || '-'}</div>
                                        </td>
                                        <td className="py-4 px-3 text-center text-xs font-black text-slate-600">{r.age !== null ? `${r.age} ปี` : '-'}</td>
                                        <td className="py-4 px-3 text-center">
                                            <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-blue-50 text-blue-600 font-black text-sm">{r.repairCount}</span>
                                        </td>
                                        <td className="py-4 px-3 text-right text-xs font-bold text-slate-600 tabular-nums">{r.downtimeHours > 0 ? formatDowntime(r.downtimeHours) : '-'}</td>
                                        <td className="py-4 px-3 text-right text-xs font-black text-slate-800 tabular-nums">{r.totalCost > 0 ? `฿${formatCurrency(r.totalCost)}` : '-'}</td>
                                        <td className="py-4 px-3 text-center">
                                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black whitespace-nowrap ${statusBadge(r.currentStatus)}`}>{r.currentStatus}</span>
                                        </td>
                                        <td className="py-4 px-3">
                                            <div className="flex flex-col gap-1">
                                                {r.taxDays !== null && expiryBadge(r.taxDays) && <div className="flex items-center gap-1"><span className="text-[8px] font-black text-slate-400">ภาษี</span>{expiryBadge(r.taxDays)}</div>}
                                                {r.insDays !== null && expiryBadge(r.insDays) && <div className="flex items-center gap-1"><span className="text-[8px] font-black text-slate-400">ประกัน</span>{expiryBadge(r.insDays)}</div>}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPlate === r.plate && (
                                        <tr>
                                            <td colSpan={8} className="px-0 py-0 bg-slate-50/60">
                                                <div className="px-6 py-4 animate-fade-in-up">
                                                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">ประวัติการซ่อม — {r.plate} ({r.repairs.length} รายการ)</div>
                                                    {r.repairs.length > 0 ? (
                                                        <table className="min-w-full bg-white rounded-xl overflow-hidden border border-slate-200">
                                                            <thead className="bg-slate-100">
                                                                <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                                    <th className="px-4 py-2.5 text-left">วันที่</th>
                                                                    <th className="px-4 py-2.5 text-left">ใบซ่อม</th>
                                                                    <th className="px-4 py-2.5 text-left">อาการ</th>
                                                                    <th className="px-4 py-2.5 text-center">สถานะ</th>
                                                                    <th className="px-4 py-2.5 text-center">Downtime</th>
                                                                    <th className="px-4 py-2.5 text-right">ค่าซ่อม</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {r.repairs.map((rep, ri) => (
                                                                    <tr key={ri} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(rep.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                        <td className="px-4 py-2.5 text-[10px] font-black text-blue-600">{rep.repairOrderNo}</td>
                                                                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700">{(rep.problemDescription || '-').trim()}{rep.dispatchType === 'ภายนอก' && <span className="ml-1.5 text-[8px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">ส่งนอก</span>}</td>
                                                                        <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{rep.status}</span></td>
                                                                        <td className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">{rep.status === 'ซ่อมเสร็จ' && rep.repairEndDate ? formatDowntime(calculateDurationHours(rep.createdAt, rep.repairEndDate)) : '-'}</td>
                                                                        <td className="px-4 py-2.5 text-right text-[11px] font-black text-slate-800 tabular-nums">฿{formatCurrency(data.repairCost(rep))}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="text-[11px] font-bold text-slate-400 py-4 text-center bg-white rounded-xl border border-slate-100">ยังไม่มีประวัติการซ่อม</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredRegistry.length === 0 && (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-400 text-sm font-bold">ไม่พบรถที่ค้นหา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-3">
                    {filteredRegistry.map(r => (
                        <div key={r.plate} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <button type="button" onClick={() => setExpandedPlate(expandedPlate === r.plate ? null : r.plate)} className="w-full p-4 text-left">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${expandedPlate === r.plate ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {expandedPlate === r.plate ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                        </span>
                                        <div>
                                            <div className="font-black text-slate-900 text-sm">{r.plate}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{r.vehicle.vehicleType || '-'} · {r.age !== null ? `${r.age} ปี` : '-'}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black whitespace-nowrap ${statusBadge(r.currentStatus)}`}>{r.currentStatus}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
                                    <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">ซ่อม</div><div className="text-sm font-black text-blue-600">{r.repairCount}</div></div>
                                    <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">Downtime</div><div className="text-[11px] font-black text-slate-700">{r.downtimeHours > 0 ? formatDowntime(r.downtimeHours) : '-'}</div></div>
                                    <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">ค่าซ่อม</div><div className="text-[11px] font-black text-slate-800">{r.totalCost > 0 ? `฿${formatCurrency(r.totalCost)}` : '-'}</div></div>
                                </div>
                                {(expiryBadge(r.taxDays) || expiryBadge(r.insDays)) && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-50">
                                        {expiryBadge(r.taxDays) && <div className="flex items-center gap-1"><span className="text-[8px] font-black text-slate-400">ภาษี</span>{expiryBadge(r.taxDays)}</div>}
                                        {expiryBadge(r.insDays) && <div className="flex items-center gap-1"><span className="text-[8px] font-black text-slate-400">ประกัน</span>{expiryBadge(r.insDays)}</div>}
                                    </div>
                                )}
                            </button>
                            {expandedPlate === r.plate && (
                                <div className="px-3 pb-3 space-y-2 animate-fade-in-up">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ประวัติซ่อม ({r.repairs.length})</div>
                                    {r.repairs.length > 0 ? r.repairs.map((rep, ri) => (
                                        <div key={ri} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-black text-slate-800">{rep.problemDescription || '-'}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(rep.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })} · {rep.repairOrderNo}</div>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">{rep.status}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400">{rep.status === 'ซ่อมเสร็จ' && rep.repairEndDate ? `Downtime ${formatDowntime(calculateDurationHours(rep.createdAt, rep.repairEndDate))}` : ''}</span>
                                                <span className="text-[11px] font-black text-slate-800">฿{formatCurrency(data.repairCost(rep))}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-[11px] font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-xl">ยังไม่มีประวัติการซ่อม</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredRegistry.length === 0 && (
                        <div className="py-10 text-center text-slate-400 text-sm font-bold">ไม่พบรถที่ค้นหา</div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default VehicleRegistryReport;
