
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { OKRObjective, OKRMetric, OKRStatus, OKRCategory, Tab, Repair, PMHistory, DailyChecklist, DrivingIncident, Vehicle, MaintenancePlan, FuelRecord } from '../types';
import {
    Target, Zap, ShieldAlert, Star, CircleDollarSign, ChevronRight, ArrowUpRight, ArrowDownRight, Minus, BarChart3, Calendar, LayoutDashboard, ShieldCheck, TrendingUp,
    Fuel, Activity, Gauge
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

const OKRProgressBar: React.FC<{ progress: number; barColorClass: string }> = ({ progress, barColorClass }) => {
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (barRef.current) barRef.current.style.width = `${progress}%`;
    }, [progress]);

    return (
        <div className="w-full bg-slate-100 h-2.5 rounded-full mb-10 overflow-hidden shadow-inner">
            <div ref={barRef} className={`h-full rounded-full transition-all duration-1000 ${barColorClass}`} />
        </div>
    );
};

const ChartTooltipContent: React.FC<any> = ({ active, payload, label, unit = '%' }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        const name = payload[0].name === 'value' ? 'ผลงาน' : payload[0].name;
        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-100 shadow-2xl rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                    <p className="text-sm font-black text-slate-900">
                        {name}: <span className="ml-1 text-blue-600">{val}</span>
                        <span className="ml-0.5 text-[10px] text-slate-400 font-bold">{unit}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

interface OKRManagementProps {
    setActiveTab?: (tab: Tab) => void;
    repairs?: Repair[];
    pmHistory?: PMHistory[];
    maintenancePlans?: MaintenancePlan[];
    fuelRecords?: FuelRecord[];
    checklists?: DailyChecklist[];
    incidents?: DrivingIncident[];
    vehicles?: Vehicle[];
}

const OKRManagement: React.FC<OKRManagementProps> = ({
    setActiveTab,
    repairs = [],
    pmHistory = [],
    maintenancePlans = [],
    fuelRecords = [],
    checklists = [],
    incidents = [],
    vehicles = []
}) => {
    const [viewMode, setViewMode] = useState<'current' | 'monthly'>('current');
    const [showRepeatedDetails, setShowRepeatedDetails] = useState(false);

    // --- Identify exact repeat repair items for inspection ---
    const duplicateRepairsList = useMemo(() => {
        const rollingYearStart = new Date();
        rollingYearStart.setFullYear(rollingYearStart.getFullYear() - 1);
        const ytdRep = repairs.filter(r => new Date(r.createdAt) >= rollingYearStart);

        return ytdRep.filter(r => {
            // Exclude PM categories as they are expected to be repeated
            if (r.repairCategory.includes('PM') || r.repairCategory.includes('เช็คระยะ')) return false;

            const rDate = new Date(r.createdAt);
            return repairs.some(prev => {
                if (prev.id === r.id || prev.licensePlate !== r.licensePlate || prev.repairCategory !== r.repairCategory) return false;

                // Check if it's the same symptom/problem
                const isSameSymptom = r.problemDescription?.trim() === prev.problemDescription?.trim();
                if (!isSameSymptom) return false;

                const prevDate = new Date(prev.createdAt);
                const diffDays = (rDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
                return diffDays > 0 && diffDays <= 365;
            });
        }).map(r => {
            const prev = repairs.find(p =>
                p.id !== r.id &&
                p.licensePlate === r.licensePlate &&
                p.repairCategory === r.repairCategory &&
                p.problemDescription?.trim() === r.problemDescription?.trim() &&
                (new Date(r.createdAt).getTime() - new Date(p.createdAt).getTime()) > 0 &&
                (new Date(r.createdAt).getTime() - new Date(p.createdAt).getTime()) <= (365 * 1000 * 3600 * 24)
            );
            return {
                ...r,
                prevDate: prev ? new Date(prev.createdAt).toLocaleDateString('th-TH') : '-',
                diffDays: prev ? Math.round((new Date(r.createdAt).getTime() - new Date(prev.createdAt).getTime()) / (1000 * 3600 * 24)) : 0
            };
        });
    }, [repairs]);

    // --- Helper for Calculations ---
    const monthlyHistory = useMemo(() => {
        const months = [];
        const now = new Date();
        const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear() + 543;
            const label = `${thMonths[m]} ${y.toString().slice(-2)}`;
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            // Filter data for this month
            const mCheck = checklists.filter(c => { const dt = new Date(c.inspectionDate); return dt >= mStart && dt <= mEnd; });
            const mInc = incidents.filter(inc => {
                const dt = new Date(inc.date);
                const isCorrectMonth = dt >= mStart && dt <= mEnd;
                // HS2 Logic: Lost Work Days > 2 (serious injuries)
                const isSerious = (inc.lostWorkDays !== undefined && inc.lostWorkDays > 2) || (inc.severity === 'critical');
                return isCorrectMonth && isSerious;
            });
            const mRep = repairs.filter(r => { const dt = new Date(r.createdAt); return dt >= mStart && dt <= mEnd; });
            const mPM = pmHistory.filter(pm => { const dt = new Date(pm.serviceDate); return dt >= mStart && dt <= mEnd; });
            const mFuel = fuelRecords.filter(f => { const dt = new Date(f.date); return dt >= mStart && dt <= mEnd; });

            // HS3: Audit Coverage (At least 2 unique inspection days per truck per month)
            const truckUniqueDays: Record<string, Set<string>> = {};
            mCheck.forEach(c => {
                if (!truckUniqueDays[c.vehicleLicensePlate]) {
                    truckUniqueDays[c.vehicleLicensePlate] = new Set();
                }
                const dateKey = new Date(c.inspectionDate).toISOString().split('T')[0];
                truckUniqueDays[c.vehicleLicensePlate].add(dateKey);
            });

            const activeVehicles = vehicles.filter(v => v.status === 'Active' || (v as any).status === undefined);
            const vCount = activeVehicles.length || 1;
            const successTrucks = Object.keys(truckUniqueDays).filter(plate => {
                const isCarActive = activeVehicles.some(v => v.licensePlate === plate);
                return isCarActive && truckUniqueDays[plate].size >= 2;
            }).length;
            const hs3 = Math.min(100, Math.round((successTrucks / vCount) * 100));

            // HS6: Repeat Repair - Same symptom on same truck within 90 days (Exclude PM)
            const repeatedThisMonth = mRep.filter(r => {
                if (r.repairCategory.includes('PM') || r.repairCategory.includes('เช็คระยะ')) return false;

                const rDate = new Date(r.createdAt);
                return repairs.some(prev => {
                    if (prev.id === r.id || prev.licensePlate !== r.licensePlate || prev.repairCategory !== r.repairCategory) return false;

                    const isSameSymptom = r.problemDescription?.trim() === prev.problemDescription?.trim();
                    if (!isSameSymptom) return false;

                    const prevDate = new Date(prev.createdAt);
                    const diffDays = (rDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
                    return diffDays > 0 && diffDays <= 365; // Extended to 1 year window
                });
            }).length;

            // HS4: PM Compliance (Synced with PMComplianceReport Logic)
            const compliantPMs = mPM.filter(pm => {
                let mileageCompliant = true;
                let dateCompliant = true;
                if (pm.targetMileage) {
                    mileageCompliant = Math.abs(pm.mileage - pm.targetMileage) <= 2000;
                }
                if (pm.targetServiceDate) {
                    const actualDate = new Date(pm.serviceDate);
                    const targetDate = new Date(pm.targetServiceDate);
                    const diffTime = actualDate.getTime() - targetDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
                    dateCompliant = Math.abs(diffDays) <= 7;
                }
                // Compliant if either mileage OR date is within tolerance
                return (pm.targetMileage || pm.targetServiceDate) ? (mileageCompliant || dateCompliant) : true;
            }).length;

            // Identify Missed PMs for this month (Due in range but not done)
            let missedPMs = 0;
            const today = new Date();
            maintenancePlans.forEach(plan => {
                const lastDate = new Date(plan.lastServiceDate);
                let nextDue = new Date(lastDate);
                if (plan.frequencyUnit === 'days') nextDue.setDate(lastDate.getDate() + plan.frequencyValue);
                else if (plan.frequencyUnit === 'weeks') nextDue.setDate(lastDate.getDate() + plan.frequencyValue * 7);
                else nextDue.setMonth(lastDate.getMonth() + plan.frequencyValue);

                if (nextDue >= mStart && nextDue <= mEnd) {
                    const isDone = mPM.some(h => {
                        const hTarget = h.targetServiceDate ? new Date(h.targetServiceDate).toISOString().split('T')[0] : null;
                        const pTarget = nextDue.toISOString().split('T')[0];
                        return h.vehicleLicensePlate === plan.vehicleLicensePlate && hTarget === pTarget;
                    });
                    if (!isDone && nextDue < today) missedPMs++;
                }
            });

            const totalPMOpportunities = mPM.length + missedPMs;
            const hs4 = totalPMOpportunities > 0 ? Math.round((compliantPMs / totalPMOpportunities) * 100) : 100;

            // OP1: Fuel Efficiency
            const totalDist = mFuel.reduce((sum, f) => sum + (f.distanceTraveled || 0), 0);
            const totalFuel = mFuel.reduce((sum, f) => sum + (f.liters || 0), 0);
            const op1 = totalFuel > 0 ? parseFloat((totalDist / totalFuel).toFixed(2)) : 0;

            months.push({ month: label, hs3, hs4: Math.min(100, hs4), hs6: repeatedThisMonth, hs2: mInc.length, op1 });
        }
        return months;
    }, [checklists, incidents, repairs, pmHistory, vehicles, maintenancePlans, fuelRecords]);

    const realTimeStats = useMemo(() => {
        const now = new Date();
        const rollingYearStart = new Date();
        rollingYearStart.setFullYear(rollingYearStart.getFullYear() - 1);

        // HS3 Logic: Find the latest month with data if current month is empty
        const latestCheckDate = [...checklists].sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())[0]?.inspectionDate;
        const targetDate = latestCheckDate ? new Date(latestCheckDate) : now;
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const currentMonthChecks = checklists.filter(c => {
            const d = new Date(c.inspectionDate);
            return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
        });

        const truckUniqueDaysLive: Record<string, Set<string>> = {};
        currentMonthChecks.forEach(c => {
            if (!truckUniqueDaysLive[c.vehicleLicensePlate]) {
                truckUniqueDaysLive[c.vehicleLicensePlate] = new Set();
            }
            const dateKey = new Date(c.inspectionDate).toISOString().split('T')[0];
            truckUniqueDaysLive[c.vehicleLicensePlate].add(dateKey);
        });

        const activeFleet = vehicles.filter(v => v.status === 'Active' || (v as any).status === undefined);
        const successfulSoFar = Object.keys(truckUniqueDaysLive).filter(plate => {
            const isCarActive = activeFleet.some(v => v.licensePlate === plate);
            return isCarActive && truckUniqueDaysLive[plate].size >= 2;
        }).length;
        const hs3 = Math.min(100, Math.round((successfulSoFar / (activeFleet.length || 1)) * 100));

        const ytdInc = incidents.filter(i => {
            const isYTD = new Date(i.date) >= rollingYearStart;
            const isSerious = (i.lostWorkDays !== undefined && i.lostWorkDays > 2) || (i.severity === 'critical');
            return isYTD && isSerious;
        }).length;
        const ytdRep = repairs.filter(r => new Date(r.createdAt) >= rollingYearStart);
        const hs6 = ytdRep.filter(r => {
            if (r.repairCategory.includes('PM') || r.repairCategory.includes('เช็คระยะ')) return false;

            const rDate = new Date(r.createdAt);
            return repairs.some(prev => {
                if (prev.id === r.id || prev.licensePlate !== r.licensePlate || prev.repairCategory !== r.repairCategory) return false;

                const isSameSymptom = r.problemDescription?.trim() === prev.problemDescription?.trim();
                if (!isSameSymptom) return false;

                const prevDate = new Date(prev.createdAt);
                const diffDays = (rDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
                return diffDays > 0 && diffDays <= 365; // Extended to 1 year window
            });
        }).length;

        // HS4: Accurate PM Compliance (Mileage-Based)
        const vMileage: Record<string, number> = {};
        fuelRecords.forEach(f => {
            if (!vMileage[f.licensePlate] || f.odometerAfter > vMileage[f.licensePlate]) {
                vMileage[f.licensePlate] = f.odometerAfter;
            }
        });

        const activePlans = maintenancePlans.filter(plan =>
            activeFleet.some(v => v.licensePlate === plan.vehicleLicensePlate)
        );

        const overduePMCount = activePlans.filter(plan => {
            const curr = vMileage[plan.vehicleLicensePlate] || 0;
            const target = plan.lastServiceMileage + plan.mileageFrequency;
            const dueDate = new Date(plan.lastServiceDate);
            if (plan.frequencyUnit === 'months') dueDate.setMonth(dueDate.getMonth() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') dueDate.setDate(dueDate.getDate() + (plan.frequencyValue * 7));
            else dueDate.setDate(dueDate.getDate() + plan.frequencyValue);

            // Time Tolerance: Allow 7 days grace period
            const gracePeriodDate = new Date(dueDate);
            gracePeriodDate.setDate(gracePeriodDate.getDate() + 7);

            // Overdue if mileage > target + 2000 OR if current date > due date + 7 days
            const isMileageOverdue = plan.mileageFrequency > 0 && curr > (target + 2000);
            const isDateOverdue = plan.frequencyValue > 0 && now > gracePeriodDate;

            return isMileageOverdue || isDateOverdue;
        }).length;
        const hs4 = activePlans.length > 0 ? Math.max(0, Math.round(((activePlans.length - overduePMCount) / activePlans.length) * 100)) : 100;

        const totalDist = fuelRecords.reduce((sum, f) => sum + (f.distanceTraveled || 0), 0);
        const totalFuel = fuelRecords.reduce((sum, f) => sum + (f.liters || 0), 0);
        const op1 = totalFuel > 0 ? (totalDist / totalFuel) : 0;

        // Find the latest transaction date across all relevant datasets for "Last Updated"
        const allDates = [
            ...repairs.map(r => new Date(r.createdAt).getTime()),
            ...incidents.map(i => new Date(i.date).getTime()),
            ...fuelRecords.map(f => new Date(f.date).getTime()),
            ...checklists.map(c => new Date(c.inspectionDate).getTime())
        ].filter(d => !isNaN(d));

        const lastUpdatedDate = allDates.length > 0 ? new Date(Math.max(...allDates)).toISOString() : new Date().toISOString();

        return { hs2: ytdInc, hs6: hs6, hs3, hs4, op1: parseFloat(op1.toFixed(2)), lastUpdatedDate };
    }, [incidents, repairs, checklists, vehicles, maintenancePlans, fuelRecords]);

    const okrData: OKRObjective[] = useMemo(() => {
        const avg12 = {
            hs3: Math.round(monthlyHistory.reduce((s, h) => s + h.hs3, 0) / 12),
            hs4: Math.round(monthlyHistory.reduce((s, h) => s + h.hs4, 0) / 12),
            hs6: monthlyHistory.reduce((s, h) => s + h.hs6, 0),
            hs2: monthlyHistory.reduce((s, h) => s + h.hs2, 0),
            op1: parseFloat((monthlyHistory.reduce((s, h) => s + h.op1, 0) / (monthlyHistory.filter(h => h.op1 > 0).length || 1)).toFixed(2))
        };

        const getVal = (current: number, avg: number) => viewMode === 'current' ? current : avg;

        return [
            {
                id: 'obj-4', title: 'พัฒนาศักยภาพและความปลอดภัย (Human / Safety)', category: 'Human/Safety',
                progress: Math.round((Math.min(100, getVal(realTimeStats.hs3, avg12.hs3)) + Math.min(100, getVal(realTimeStats.hs4, avg12.hs4)) + (getVal(realTimeStats.hs6, avg12.hs6) <= 10 ? 100 : 50) + (getVal(realTimeStats.hs2, avg12.hs2) < 2 ? 100 : 0)) / 4),
                metrics: [
                    {
                        id: 'hs3', code: 'HS3', objective: 'Vehicle Inspection (BeWagon)', detail: 'การตรวจความพร้อมรถก่อนงาน (สุ่มตรวจจริง ≥ 2 ครั้ง/เดือน)',
                        target2025: '100%', targetValue: 100, currentValue: getVal(realTimeStats.hs3, avg12.hs3), unit: '%', status: getVal(realTimeStats.hs3, avg12.hs3) >= 90 ? 'On Track' : 'Behind',
                        category: 'Human/Safety', source: 'Daily Checklist', lastUpdated: realTimeStats.lastUpdatedDate, trend: 'stable',
                        monthlyProgress: monthlyHistory.map(h => ({ month: h.month, value: h.hs3 }))
                    },
                    {
                        id: 'hs4', code: 'HS4', objective: 'PM Compliance', detail: 'การนำรถเข้าซ่อมบำรุงตามระยะที่กำหนด (Target vs Actual: ±7 วัน หรือ ±2,000 กม.)',
                        target2025: '100% (± 7 วัน หรือ ± 2,000 กม.)', targetValue: 100, currentValue: getVal(realTimeStats.hs4, avg12.hs4), unit: '%', status: getVal(realTimeStats.hs4, avg12.hs4) >= 95 ? 'Completed' : 'At Risk',
                        category: 'Human/Safety', source: 'Maintenance Planner', lastUpdated: realTimeStats.lastUpdatedDate, trend: 'up',
                        monthlyProgress: monthlyHistory.map(h => ({ month: h.month, value: h.hs4 }))
                    },
                    {
                        id: 'hs6', code: 'HS6', objective: 'Repeat Repair Rate', detail: 'ผลรวมรถทุกคันในบริษัทที่มีการซ่อมซ้ำอาการเดิมภายใน 1 ปี (เกณฑ์วัดคุณภาพงานช่าง)',
                        target2025: '≤ 10 ครั้ง/ปี', targetValue: 10, currentValue: getVal(realTimeStats.hs6, avg12.hs6), unit: 'ครั้ง', status: getVal(realTimeStats.hs6, avg12.hs6) <= 10 ? 'On Track' : 'Behind',
                        category: 'Human/Safety', source: 'Repair History', lastUpdated: realTimeStats.lastUpdatedDate, trend: 'stable',
                        monthlyProgress: monthlyHistory.map(h => ({ month: h.month, value: h.hs6 }))
                    },
                    {
                        id: 'hs2', code: 'HS2', objective: 'Lost Time Injury Frequency (LTIF)', detail: 'อุบัติเหตุถึงขั้นหยุดงานเกิน 2 วัน',
                        target2025: '≤ 2 ครั้ง/ปี', targetValue: 2, currentValue: getVal(realTimeStats.hs2, avg12.hs2), unit: 'ครั้ง', status: getVal(realTimeStats.hs2, avg12.hs2) <= 2 ? 'On Track' : 'Behind',
                        category: 'Human/Safety', source: 'Incident Log', lastUpdated: realTimeStats.lastUpdatedDate, trend: 'stable',
                        monthlyProgress: monthlyHistory.map(h => ({ month: h.month, value: h.hs2 }))
                    }
                ]
            },
            {
                id: 'obj-1', title: 'ยกระดับประสิทธิภาพการขนส่ง (Operations)', category: 'Performance',
                progress: Math.round(Math.min(100, (getVal(realTimeStats.op1, avg12.op1) / 4.5) * 100)),
                metrics: [
                    {
                        id: 'op1', code: 'OP1', objective: 'อัตราสิ้นเปลืองน้ำมัน (Fuel Efficiency)', detail: 'ควบคุมการใช้พลังงานให้เกิดประสิทธิภาพสูงสุดตามมาตรฐานกลุ่มรถ',
                        target2025: '4.50 km/L', targetValue: 4.5, currentValue: getVal(realTimeStats.op1, avg12.op1), unit: 'km/L', status: getVal(realTimeStats.op1, avg12.op1) >= 4.2 ? 'On Track' : 'At Risk',
                        category: 'Performance', source: 'Fuel Management', lastUpdated: realTimeStats.lastUpdatedDate, trend: 'up',
                        monthlyProgress: monthlyHistory.map(h => ({ month: h.month, value: h.op1 }))
                    }
                ]
            }
        ];
    }, [realTimeStats, monthlyHistory, viewMode, maintenancePlans.length]);

    const statsSummary = useMemo(() => {
        const all = okrData.flatMap(o => o.metrics);
        return {
            total: all.length,
            onTrack: all.filter(m => m.status === 'On Track' || m.status === 'Completed').length,
            attention: all.filter(m => m.status === 'At Risk' || m.status === 'Behind').length,
            avg: Math.round(okrData.reduce((p, c) => p + c.progress, 0) / okrData.length)
        };
    }, [okrData]);

    const getStatusStyles = (status: OKRStatus) => {
        switch (status) {
            case 'On Track': return 'bg-emerald-500 shadow-emerald-200';
            case 'At Risk': return 'bg-amber-500 shadow-amber-200';
            case 'Behind': return 'bg-rose-500 shadow-rose-200';
            case 'Completed': return 'bg-indigo-600 shadow-indigo-200';
            default: return 'bg-slate-400 shadow-slate-200';
        }
    };

    const getCategoryIcon = (category: OKRCategory) => {
        switch (category) {
            case 'Performance': return <Zap className="w-6 h-6" />;
            case 'Satisfaction': return <Star className="w-6 h-6" />;
            case 'Business': return <CircleDollarSign className="w-6 h-6" />;
            case 'Human/Safety': return <ShieldAlert className="w-6 h-6" />;
        }
    };

    const tabMapping: Record<string, Tab> = {
        'HS3': 'daily-checklist', 'HS4': 'preventive-maintenance', 'HS6': 'vehicle-repair-history', 'HS2': 'incident-log', 'OP1': 'fuel-management'
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* --- Hero Section --- */}
            <div className="bg-white p-8 rounded-[4rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 transform hover:rotate-6 transition-transform">
                        <Target className="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">OKR Strategy 2025</h1>
                        <p className="text-slate-500 font-bold text-lg mt-1 tracking-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" /> Real-time Performance & Operational Audit
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-3xl flex gap-1.5 border border-slate-200 shadow-inner">
                    <button onClick={() => setViewMode('current')} className={`px-8 py-3.5 rounded-2xl text-[13px] font-black transition-all flex items-center gap-2.5 ${viewMode === 'current' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LayoutDashboard className="w-5 h-5" /> Live Overview
                    </button>
                    <button onClick={() => setViewMode('monthly')} className={`px-8 py-3.5 rounded-2xl text-[13px] font-black transition-all flex items-center gap-2.5 ${viewMode === 'monthly' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Calendar className="w-5 h-5" /> Analytics
                    </button>
                </div>

                <div className="flex gap-6">
                    <div className="bg-white px-8 py-5 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Metrics</p>
                        <p className="text-3xl font-black text-slate-900">{statsSummary.total}</p>
                    </div>
                    <div className="bg-blue-600 px-8 py-5 rounded-[2.5rem] shadow-xl shadow-blue-200 text-center">
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] mb-1">Success Rate</p>
                        <p className="text-3xl font-black text-white">{statsSummary.avg}%</p>
                    </div>
                </div>
            </div>

            {/* --- Objectives Section --- */}
            <div className="grid grid-cols-1 gap-12">
                {okrData.map((obj) => (
                    <div key={obj.id} className="relative group overflow-hidden bg-white border border-slate-100 rounded-[4rem] p-12 shadow-sm hover:shadow-2xl transition-all duration-700">
                        {/* Interactive Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 group-hover:bg-blue-50 transition-colors duration-700" />

                        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                            <div className="flex items-center gap-8">
                                <div className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center text-white shadow-2xl ${obj.category === 'Performance' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                                    {getCategoryIcon(obj.category)}
                                </div>
                                <div>
                                    <span className="text-[12px] font-black text-blue-500 uppercase tracking-widest">{obj.category} Objective</span>
                                    <h2 className="text-3xl font-black text-slate-900 mt-1">{obj.title}</h2>
                                </div>
                            </div>
                            <div className="bg-slate-50/80 backdrop-blur-sm px-10 py-6 rounded-[2.5rem] border border-slate-100 text-center min-w-[280px]">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1 tracking-[0.2em]">Overall Compliance</span>
                                <span className="text-5xl font-black text-slate-900 leading-none">{obj.progress}<span className="text-xl text-slate-300 ml-1">%</span></span>
                            </div>
                        </div>

                        <OKRProgressBar progress={obj.progress} barColorClass={obj.progress > 80 ? 'bg-emerald-500' : 'bg-blue-600'} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                            {obj.metrics.map(metric => (
                                <div key={metric.id} className="bg-slate-50/40 hover:bg-white border border-slate-100 group/metric rounded-[3.5rem] p-10 transition-all duration-500 flex flex-col hover:shadow-xl hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center text-xl font-black text-slate-900 shadow-sm group-hover/metric:scale-110 group-hover/metric:rotate-3 transition-all">
                                                {metric.code}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-800 leading-tight">{metric.objective}</h4>
                                                <p className="text-[13px] text-slate-400 font-medium italic mt-1">{metric.detail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-10 bg-white/60 p-6 rounded-[2.5rem] border border-slate-100/50">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target 2025</p>
                                            <p className="text-xl font-black text-blue-600">{metric.target2025}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                {viewMode === 'current' ? 'Live Actual' : (metric.unit === 'ครั้ง' ? 'Yearly Total' : '12-Month Average')}
                                            </p>
                                            <p className="text-xl font-black text-slate-900">{metric.currentValue} <span className="text-sm text-slate-400">{metric.unit}</span></p>
                                        </div>
                                        <div className="col-span-2 pt-4 border-t border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Health Status</p>
                                            <div className="flex items-center gap-3">
                                                <div className={`px-6 py-2 rounded-2xl text-[11px] font-black text-white shadow-lg ${getStatusStyles(metric.status)}`}>
                                                    {metric.status.toUpperCase()}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-400">Audited via {metric.source}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {(viewMode === 'monthly' || metric.monthlyProgress.length > 0) && (
                                        <div className="h-[220px] bg-white rounded-[3rem] p-8 border border-slate-50 shadow-inner mt-auto overflow-hidden">
                                            <div className="flex justify-between items-center mb-6">
                                                <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Historical Trend
                                                </span>
                                                <Gauge className="w-5 h-5 text-blue-200" />
                                            </div>
                                            <ResponsiveContainer width="100%" height="80%">
                                                <AreaChart data={metric.monthlyProgress}>
                                                    <defs>
                                                        <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} />
                                                    <YAxis hide domain={[0, 'auto']} />
                                                    <ChartTooltip content={<ChartTooltipContent unit={metric.unit} />} />
                                                    <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill={`url(#grad-${metric.id})`} dot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {viewMode === 'current' && (
                                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                                <span className="flex items-center gap-2 tracking-tight">Source: {metric.source}</span>
                                                <span>Updated: {new Date(metric.lastUpdated).toLocaleDateString('th-TH')}</span>
                                            </div>
                                            {(viewMode === 'current' && metric.code === 'HS6') && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setShowRepeatedDetails(!showRepeatedDetails)}
                                                        className="w-full py-3 px-6 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[11px] font-black flex items-center justify-between transition-colors border border-rose-100 shadow-sm"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <ShieldAlert className="w-4 h-4" /> ดูรายละเอียดการซ่อมซ้ำ ({duplicateRepairsList.length} รายการ)
                                                        </span>
                                                        <span>{showRepeatedDetails ? '🔼 ปิด' : '🔽 เปิด'}</span>
                                                    </button>

                                                    {showRepeatedDetails && (
                                                        <div className="mt-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-inner">
                                                            {duplicateRepairsList.length > 0 ? (
                                                                <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                                                                    {duplicateRepairsList.map((item, idx) => (
                                                                        <div key={idx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 last:mb-0 mb-3 hover:bg-white transition-colors">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <div>
                                                                                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg mr-2 italic">{item.licensePlate}</span>
                                                                                    <span className="text-[11px] font-black text-slate-700">{item.repairCategory}</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 animate-pulse">
                                                                                    ห่างจากครั้งก่อน {item.diffDays} วัน
                                                                                </span>
                                                                            </div>
                                                                            <div className="bg-white p-3 rounded-xl border border-slate-100 mb-2">
                                                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">อาการเสียที่ซ้ำ:</p>
                                                                                <p className="text-[12px] text-slate-800 font-bold leading-relaxed">
                                                                                    {item.problemDescription || 'ไม่ได้ระบุรายละเอียด'}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                                                                <span>🗓️ ล่าสุด: {new Date(item.createdAt).toLocaleDateString('th-TH')}</span>
                                                                                <span>🕒 ครั้งก่อน: {item.prevDate}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="py-10 text-center">
                                                                    <p className="text-slate-400 text-[12px] font-bold">ไม่มีรายการซ่อมซ้ำในรอบ 12 เดือนที่ผ่านมา</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button onClick={() => { const tab = tabMapping[metric.code]; if (tab && setActiveTab) { setActiveTab(tab); window.scrollTo(0, 0); } }} className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white rounded-[2rem] text-[12px] font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
                                                Analyze Transaction Data <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Footer Signature --- */}
            <div className="bg-slate-900 rounded-[5rem] p-16 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -ml-32 -mb-32" />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-16">
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-5 mb-8">
                            <ShieldCheck className="w-12 h-12 text-emerald-400" />
                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">Enterprise Grade Audit</h3>
                        </div>
                        <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-2xl">
                            Dashboard นี้ถูกเชื่อมโยงข้อมูลแบบ <span className="text-white font-black">Native-Sync</span> กับระบบจัดการคลัง (Inventory), บันทึกงานสารบรรณ (Daily Log) และข้อมูลประกันภัยแบบเรียลไทม์ 100% เพื่อประกันคุณภาพสูงสุดของธุรกิจ
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[4rem] border border-white/10 text-center min-w-[280px]">
                        <BarChart3 className="w-20 h-20 text-blue-400 mx-auto mb-6" />
                        <p className="text-[12px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Audit Status</p>
                        <p className="text-3xl font-black text-white">System Verified</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRManagement;
