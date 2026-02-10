import React, { useState, useMemo } from 'react';
import type { MaintenanceBudget, BudgetCategory, Repair, PurchaseOrder, FuelRecord, Vehicle } from '../types';
import { formatCurrency } from '../utils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import AddBudgetModal from './AddBudgetModal';
import { useToast } from '../context/ToastContext';

interface BudgetManagementProps {
    budgets: MaintenanceBudget[];
    setBudgets: React.Dispatch<React.SetStateAction<MaintenanceBudget[]>>;
    repairs: Repair[];
    purchaseOrders: PurchaseOrder[];
    fuelRecords?: FuelRecord[];
    vehicles?: Vehicle[];
}

const CATEGORY_CLASSES: Record<BudgetCategory, string> = {
    'ซ่อมบำรุงรถ': 'bg-blue-500',
    'อะไหล่': 'bg-emerald-500',
    'น้ำมันเชื้อเฟลิง': 'bg-amber-500',
    'ค่าแรงช่าง': 'bg-violet-500',
    'ค่าภาษีและประกันภัย': 'bg-red-500',
    'อื่นๆ': 'bg-slate-500'
};

const BudgetManagement: React.FC<BudgetManagementProps> = ({ budgets, setBudgets, repairs, purchaseOrders, fuelRecords = [], vehicles = [] }) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [activeTab, setActiveTab] = useState<'budget' | 'analysis' | 'forecast'>('budget');
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
    const { addToast } = useToast();

    // ... (Old Logic: Calculate budget summary for current month) ...
    const monthlyBudgetSummary = useMemo(() => {
        const monthBudgets = budgets.filter(b => b.year === selectedYear && b.month === selectedMonth);

        const totalAllocated = monthBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
        const totalSpent = monthBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
        const totalCommitted = monthBudgets.reduce((sum, b) => sum + b.committedAmount, 0);
        const totalAvailable = monthBudgets.reduce((sum, b) => sum + b.availableAmount, 0);

        const utilizationRate = totalAllocated > 0 ? ((totalSpent + totalCommitted) / totalAllocated * 100) : 0;

        return { totalAllocated, totalSpent, totalCommitted, totalAvailable, utilizationRate, budgetCount: monthBudgets.length };
    }, [budgets, selectedYear, selectedMonth]);

    // ... (Trend data: ใช้ข้อมูลจริงจาก repairs/fuel/PO ย้อนหลัง 12 เดือน) ...
    const trendData = useMemo(() => {
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(selectedYear, selectedMonth - 1 - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const monthBudgets = budgets.filter(b => b.year === year && b.month === month);
            const allocated = monthBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);

            const repairCost = repairs.filter(r => {
                const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
                return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === year && d.getMonth() + 1 === month;
            }).reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
            const fuelCost = fuelRecords.filter(f => {
                const d = new Date(f.date);
                return d.getFullYear() === year && d.getMonth() + 1 === month;
            }).reduce((s, f) => s + (Number(f.totalCost) || 0), 0);
            const poCost = purchaseOrders.filter(po => {
                const d = new Date(po.deliveryDate || po.createdAt);
                return po.status === 'Received' && d.getFullYear() === year && d.getMonth() + 1 === month;
            }).reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);

            const realSpent = repairCost + fuelCost + poCost;

            months.push({
                month: `${month}/${year.toString().slice(2)}`,
                allocated: allocated / 1000,
                spent: realSpent / 1000,
                total: realSpent / 1000
            });
        }
        return months;
    }, [budgets, repairs, fuelRecords, purchaseOrders, selectedYear, selectedMonth]);

    // ================= AUTO-CALCULATE BUDGET (ข้อมูลจริงเท่านั้น) =================

    const autoSpentByCategory = useMemo(() => {
        const result: Record<string, number> = {
            'ซ่อมบำรุงรถ': 0, 'อะไหล่': 0, 'น้ำมันเชื้อเฟลิง': 0,
            'ค่าแรงช่าง': 0, 'ค่าภาษีและประกันภัย': 0, 'อื่นๆ': 0
        };
        repairs.filter(r => {
            const d = new Date(r.repairEndDate || r.updatedAt);
            return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        }).forEach(r => {
            const totalCost = Number(r.repairCost) || 0;
            const partsCost = (r.parts || []).reduce((sum, p) => sum + ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 0)), 0);
            const laborCost = Math.max(0, totalCost - partsCost);
            if (r.dispatchType === 'ภายนอก') {
                result['ซ่อมบำรุงรถ'] += totalCost;
            } else {
                result['ค่าแรงช่าง'] += laborCost;
                if (partsCost === 0) result['ซ่อมบำรุงรถ'] += totalCost;
            }
        });
        purchaseOrders.filter(po => {
            const d = new Date(po.deliveryDate || po.createdAt);
            return po.status === 'Received' && d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        }).forEach(po => { result['อะไหล่'] += Number(po.totalAmount) || 0; });
        fuelRecords.filter(f => {
            const d = new Date(f.date);
            return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        }).forEach(f => { result['น้ำมันเชื้อเฟลิง'] += Number(f.totalCost) || 0; });
        return result;
    }, [repairs, purchaseOrders, fuelRecords, selectedYear, selectedMonth]);

    // ... (Category breakdown: ใช้ autoSpentByCategory + budget) ...
    const categoryChartData = useMemo(() => {
        const allCats: BudgetCategory[] = ['ซ่อมบำรุงรถ', 'อะไหล่', 'น้ำมันเชื้อเฟลิง', 'ค่าแรงช่าง', 'ค่าภาษีและประกันภัย', 'อื่นๆ'];
        const monthBudgets = budgets.filter(b => b.year === selectedYear && b.month === selectedMonth);
        return allCats.map(cat => {
            const b = monthBudgets.find(mb => mb.category === cat);
            const autoSpent = autoSpentByCategory[cat] || 0;
            const allocated = b ? b.allocatedAmount : 0;
            const spent = Math.max(b ? b.spentAmount : 0, autoSpent);
            return { category: cat, allocated, spent, autoSpent };
        }).filter(d => d.allocated > 0 || d.spent > 0);
    }, [budgets, autoSpentByCategory, selectedYear, selectedMonth]);

    const budgetVsActual = useMemo(() => {
        const monthBudgets = budgets.filter(b => b.year === selectedYear && b.month === selectedMonth);
        return monthBudgets.map(b => {
            const autoSpent = autoSpentByCategory[b.category] || 0;
            const actualSpent = Math.max(b.spentAmount, autoSpent);
            const remaining = b.allocatedAmount - actualSpent - b.committedAmount;
            const utilization = b.allocatedAmount > 0 ? ((actualSpent + b.committedAmount) / b.allocatedAmount * 100) : 0;
            const autoStatus = utilization >= 100 ? 'เกินงบ' : utilization >= 80 ? 'ใกล้เกิน' : 'ปกติ';
            return { ...b, autoSpent, actualSpent, remaining, utilization, autoStatus };
        });
    }, [budgets, autoSpentByCategory, selectedYear, selectedMonth]);

    // ================= COST ANALYSIS (ข้อมูลจริงจาก repairs.parts) =================

    const analysisData = useMemo(() => {
        const doneRepairs = repairs.filter(r => {
            const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
            return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === selectedYear;
        });
        const yearFuel = fuelRecords.filter(f => new Date(f.date).getFullYear() === selectedYear);

        return vehicles.filter(v => v.status === 'Active').map(v => {
            const vR = doneRepairs.filter(r => r.licensePlate === v.licensePlate);
            const vF = yearFuel.filter(f => f.licensePlate === v.licensePlate);
            const partsCost = vR.reduce((s, r) =>
                s + (r.parts || []).reduce((ps, p) => ps + ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 0)), 0), 0);
            const totalRepair = vR.reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
            const laborCost = Math.max(0, totalRepair - partsCost);
            const externalCost = vR.filter(r => r.dispatchType === 'ภายนอก').reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
            const fuelCost = vF.reduce((s, f) => s + (Number(f.totalCost) || 0), 0);
            const totalKm = vF.reduce((s, f) => s + (Number(f.distanceTraveled) || 0), 0) || 1;
            const totalCost = totalRepair + fuelCost;
            const regDate = v.registrationDate ? new Date(v.registrationDate) : null;
            const vehicleAge = regDate ? Math.round((Date.now() - regDate.getTime()) / (365.25 * 24 * 3600000) * 10) / 10 : 0;
            return {
                vehicleId: v.id, licensePlate: v.licensePlate, vehicleType: v.vehicleType,
                laborCost, partsCost, fuelCost, externalCost, totalCost,
                costPerKm: totalCost / totalKm, repairCount: vR.length, vehicleAge, totalKm
            };
        }).sort((a, b) => b.totalCost - a.totalCost)
            .filter(d => selectedVehicleId === 'all' || d.vehicleId === selectedVehicleId);
    }, [repairs, fuelRecords, vehicles, selectedYear, selectedVehicleId]);

    // ================= ประมาณการค่าใช้จ่ายรายการยอดสูง (อะไหล่ + น้ำมัน) =================

    const topExpenseItems = useMemo(() => {
        const itemMap: Record<string, { name: string; totalCost: number; totalQty: number; unit: string; months: Set<number> }> = {};

        repairs.filter(r => {
            const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
            return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === selectedYear;
        }).forEach(r => {
            const month = new Date(r.repairEndDate || r.updatedAt || r.createdAt).getMonth() + 1;
            (r.parts || []).forEach(p => {
                const key = (p.name || '').trim().toLowerCase();
                if (!key) return;
                const cost = (Number(p.unitPrice) || 0) * (Number(p.quantity) || 0);
                if (!itemMap[key]) itemMap[key] = { name: p.name, totalCost: 0, totalQty: 0, unit: p.unit || 'ชิ้น', months: new Set() };
                itemMap[key].totalCost += cost;
                itemMap[key].totalQty += Number(p.quantity) || 0;
                itemMap[key].months.add(month);
            });
        });

        fuelRecords.filter(f => new Date(f.date).getFullYear() === selectedYear).forEach(f => {
            const key = `fuel_${f.fuelType}`;
            const month = new Date(f.date).getMonth() + 1;
            if (!itemMap[key]) itemMap[key] = { name: `น้ำมัน${f.fuelType}`, totalCost: 0, totalQty: 0, unit: 'ลิตร', months: new Set() };
            itemMap[key].totalCost += Number(f.totalCost) || 0;
            itemMap[key].totalQty += Number(f.liters) || 0;
            itemMap[key].months.add(month);
        });

        const elapsedMonths = Math.min(currentMonth, 12);
        return Object.values(itemMap)
            .map(item => ({
                name: item.name, totalCost: item.totalCost, totalQty: item.totalQty, unit: item.unit,
                activeMonths: item.months.size,
                monthlyAvg: elapsedMonths > 0 ? Math.round(item.totalCost / elapsedMonths) : 0,
                annualProjection: elapsedMonths > 0 ? Math.round((item.totalCost / elapsedMonths) * 12) : 0,
                avgPrice: item.totalQty > 0 ? Math.round(item.totalCost / item.totalQty) : 0
            }))
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, 20);
    }, [repairs, fuelRecords, selectedYear, currentMonth]);

    // ================= BUDGET PLANNING TEMPLATE =================

    const planningData = useMemo(() => {
        const prevYear = selectedYear - 1;
        const categories: BudgetCategory[] = ['ซ่อมบำรุงรถ', 'อะไหล่', 'น้ำมันเชื้อเฟลิง', 'ค่าแรงช่าง', 'ค่าภาษีและประกันภัย', 'อื่นๆ'];

        const calcRealSpent = (year: number) => {
            const result: Record<string, number> = { 'ซ่อมบำรุงรถ': 0, 'อะไหล่': 0, 'น้ำมันเชื้อเฟลิง': 0, 'ค่าแรงช่าง': 0, 'ค่าภาษีและประกันภัย': 0, 'อื่นๆ': 0 };
            repairs.filter(r => {
                const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
                return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === year;
            }).forEach(r => {
                result['ซ่อมบำรุงรถ'] += Number(r.repairCost) || 0;
                const partsCost = (r.parts || []).reduce((s, p) => s + ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 0)), 0);
                result['อะไหล่'] += partsCost;
                const labor = Math.max(0, (Number(r.repairCost) || 0) - partsCost);
                if (r.dispatchType === 'ภายนอก') { result['อื่นๆ'] += labor; } else { result['ค่าแรงช่าง'] += labor; }
            });
            purchaseOrders.filter(po => {
                const d = new Date(po.deliveryDate || po.createdAt);
                return po.status === 'Received' && d.getFullYear() === year;
            }).forEach(po => { result['อะไหล่'] += Number(po.totalAmount) || 0; });
            fuelRecords.filter(f => new Date(f.date).getFullYear() === year)
                .forEach(f => { result['น้ำมันเชื้อเฟลิง'] += Number(f.totalCost) || 0; });
            return result;
        };

        const prevReal = calcRealSpent(prevYear);
        const currReal = calcRealSpent(selectedYear);

        return categories.map(cat => {
            const prevB = budgets.filter(b => b.year === prevYear && b.category === cat);
            const currB = budgets.filter(b => b.year === selectedYear && b.category === cat);
            const prevAllocated = prevB.reduce((s, b) => s + b.allocatedAmount, 0);
            const currAllocated = currB.reduce((s, b) => s + b.allocatedAmount, 0);
            const prevSpent = prevReal[cat] || 0;
            const currSpent = currReal[cat] || 0;
            const baseSpent = Math.max(prevSpent, currSpent);
            const projected = Math.round(baseSpent * 1.05);
            return {
                category: cat, prevYearAllocated: prevAllocated, prevYearSpent: prevSpent,
                currYearAllocated: currAllocated, currYearSpent: currSpent,
                projectedAnnual: projected, projectedMonthly: Math.round(projected / 12),
                variance: currAllocated > 0 ? Math.round(((currSpent - currAllocated) / currAllocated) * 100) : 0
            };
        });
    }, [budgets, repairs, purchaseOrders, fuelRecords, selectedYear]);

    // ================= COST FORECAST (Weighted Moving Average — ไม่ใช้ random) =================

    const forecastData = useMemo(() => {
        const monthlyCosts: { month: number; repair: number; fuel: number; parts: number; total: number; isForecast: boolean }[] = [];
        for (let m = 1; m <= 12; m++) {
            const repair = repairs.filter(r => {
                const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
                return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
            }).reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
            const fuel = fuelRecords.filter(f => {
                const d = new Date(f.date);
                return d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
            }).reduce((s, f) => s + (Number(f.totalCost) || 0), 0);
            const parts = purchaseOrders.filter(po => {
                const d = new Date(po.deliveryDate || po.createdAt);
                return po.status === 'Received' && d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
            }).reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);
            monthlyCosts.push({ month: m, repair, fuel, parts, total: repair + fuel + parts, isForecast: false });
        }
        const past = monthlyCosts.filter(m => m.month <= currentMonth && m.total > 0);
        let fAvgRepair = 0, fAvgFuel = 0, fAvgParts = 0;
        if (past.length >= 1) {
            const wts = past.map((_, i) => i + 1);
            const tw = wts.reduce((a, b) => a + b, 0);
            fAvgRepair = Math.round(past.reduce((s, m, i) => s + m.repair * wts[i], 0) / tw);
            fAvgFuel = Math.round(past.reduce((s, m, i) => s + m.fuel * wts[i], 0) / tw);
            fAvgParts = Math.round(past.reduce((s, m, i) => s + m.parts * wts[i], 0) / tw);
        }
        const fAvgTotal = fAvgRepair + fAvgFuel + fAvgParts;
        for (let m = currentMonth + 1; m <= 12; m++) {
            monthlyCosts[m - 1] = { month: m, repair: fAvgRepair, fuel: fAvgFuel, parts: fAvgParts, total: fAvgTotal, isForecast: true };
        }
        return monthlyCosts.map(d => ({
            name: new Date(selectedYear, d.month - 1).toLocaleDateString('th-TH', { month: 'short' }),
            repair: d.repair, fuel: d.fuel, parts: d.parts, total: d.total,
            type: d.isForecast ? 'forecast' : 'actual'
        }));
    }, [repairs, fuelRecords, purchaseOrders, selectedYear, currentMonth]);

    // ================= FORECAST SUMMARY (เดือนถัดไป / ไตรมาส / ปี) =================

    const forecastSummary = useMemo(() => {
        if (currentMonth === 0) return { monthlyAvg: 0, nextMonth: 0, nextQuarter: 0, remainingYear: 0, fullYear: 0, nextYear: 0, ytd: 0, avgRepair: 0, avgFuel: 0, avgParts: 0 };
        let ytdRepair = 0, ytdFuel = 0, ytdParts = 0;
        repairs.filter(r => {
            const d = new Date(r.repairEndDate || r.updatedAt || r.createdAt);
            return r.status === 'ซ่อมเสร็จ' && d.getFullYear() === selectedYear && d.getMonth() + 1 <= currentMonth;
        }).forEach(r => { ytdRepair += Number(r.repairCost) || 0; });
        fuelRecords.filter(f => {
            const d = new Date(f.date);
            return d.getFullYear() === selectedYear && d.getMonth() + 1 <= currentMonth;
        }).forEach(f => { ytdFuel += Number(f.totalCost) || 0; });
        purchaseOrders.filter(po => {
            const d = new Date(po.deliveryDate || po.createdAt);
            return po.status === 'Received' && d.getFullYear() === selectedYear && d.getMonth() + 1 <= currentMonth;
        }).forEach(po => { ytdParts += Number(po.totalAmount) || 0; });
        const ytd = ytdRepair + ytdFuel + ytdParts;
        const monthlyAvg = Math.round(ytd / currentMonth);
        const avgRepair = Math.round(ytdRepair / currentMonth);
        const avgFuel = Math.round(ytdFuel / currentMonth);
        const avgParts = Math.round(ytdParts / currentMonth);
        const remainingMonths = 12 - currentMonth;
        const remainingYear = monthlyAvg * remainingMonths;
        const fullYear = ytd + remainingYear;
        const nextQuarter = monthlyAvg * 3;
        const nextYear = Math.round(fullYear * 1.05);
        return { monthlyAvg, nextMonth: monthlyAvg, nextQuarter, remainingYear, fullYear, nextYear, ytd, avgRepair, avgFuel, avgParts };
    }, [repairs, fuelRecords, purchaseOrders, selectedYear, currentMonth]);

    const handleAddBudget = (newBudget: Omit<MaintenanceBudget, 'id' | 'createdAt' | 'updatedAt'>) => {
        const budget: MaintenanceBudget = {
            ...newBudget,
            id: `BDG-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setBudgets(prev => [budget, ...prev]);
        setIsAddModalOpen(false);
        addToast(`เพิ่มงบประมาณ ${budget.category} สำเร็จ`, 'success');
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">การจัดการต้นทุนและงบประมาณ</h2>
                        <p className="text-gray-500 mt-1">ควบคุมงบประมาณ วิเคราะห์ต้นทุน และคาดการณ์ค่าใช้จ่าย</p>
                    </div>

                    <div className="flex gap-4 items-center flex-wrap">
                        {/* TAB SWITCHER */}
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'budget' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                งบประมาณ
                            </button>
                            <button
                                onClick={() => setActiveTab('analysis')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                วิเคราะห์ต้นทุน
                            </button>
                            <button
                                onClick={() => setActiveTab('forecast')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'forecast' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                การคาดการณ์
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <select
                                aria-label="Selected Year"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                            >
                                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                                    <option key={year} value={year}>{year + 543}</option>
                                ))}
                            </select>

                            {activeTab === 'budget' && (
                                <select
                                    aria-label="Selected Month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {new Date(2024, month - 1).toLocaleDateString('th-TH', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {activeTab === 'budget' && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                เพิ่มงบประมาณ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TAB CONTENT: BUDGET */}
            {activeTab === 'budget' && (
                <>
                    {/* Summary Cards — ใช้ค่าใช้จ่ายจริงจากระบบ + guard NaN */}
                    {(() => {
                        const autoTotal = Object.values(autoSpentByCategory).reduce((s, v) => s + v, 0);
                        const displaySpent = Math.max(monthlyBudgetSummary.totalSpent, autoTotal);
                        const displayAllocated = monthlyBudgetSummary.totalAllocated;
                        const displayCommitted = monthlyBudgetSummary.totalCommitted;
                        const displayAvailable = displayAllocated > 0 ? displayAllocated - displaySpent - displayCommitted : 0;
                        const pctSpent = displayAllocated > 0 ? ((displaySpent / displayAllocated) * 100).toFixed(1) + '%' : '—';
                        const pctCommitted = displayAllocated > 0 ? ((displayCommitted / displayAllocated) * 100).toFixed(1) + '%' : '—';
                        const pctAvailable = displayAllocated > 0 ? ((displayAvailable / displayAllocated) * 100).toFixed(1) + '%' : '—';
                        return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">งบประมาณทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(displayAllocated)}</h3>
                                    <p className="text-xs text-blue-100 mt-1">{displayAllocated > 0 ? 'บาท' : 'ยังไม่ได้ตั้งงบ'}</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-red-100 font-bold uppercase tracking-wider">ใช้จ่ายจริง (Auto)</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(displaySpent)}</h3>
                                    <p className="text-xs text-red-100 mt-1">{pctSpent} ของงบ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-2 0H3V6h14v8zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm13 0v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-amber-100 font-bold uppercase tracking-wider">งบจอง (PO)</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(displayCommitted)}</h3>
                                    <p className="text-xs text-amber-100 mt-1">{pctCommitted} ของงบ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-emerald-100 font-bold uppercase tracking-wider">คงเหลือ</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(displayAvailable)}</h3>
                                    <p className="text-xs text-emerald-100 mt-1">{pctAvailable} ของงบ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                        );
                    })()}

                    {/* Auto Spent Breakdown — แสดงค่าใช้จ่ายจริงจากระบบแม้ไม่มี budget */}
                    {monthlyBudgetSummary.budgetCount === 0 && Object.values(autoSpentByCategory).some(v => v > 0) && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[2rem] p-6 border border-blue-200">
                            <h3 className="text-lg font-bold text-blue-800 mb-1">ค่าใช้จ่ายจริงเดือนนี้ (คำนวณอัตโนมัติ)</h3>
                            <p className="text-xs text-blue-500 mb-4">ยังไม่ได้ตั้งงบประมาณ — ข้อมูลด้านล่างคำนวณจากใบซ่อม, PO, น้ำมัน ในระบบ</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(autoSpentByCategory).map(([cat, amount]) => (
                                    <div key={cat} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_CLASSES[cat as BudgetCategory] || 'bg-slate-400'}`}></div>
                                            <p className="text-[11px] font-bold text-slate-500 truncate">{cat}</p>
                                        </div>
                                        <p className={`text-sm font-extrabold ${amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{formatCurrency(amount)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between bg-white rounded-xl p-3 border border-blue-200">
                                <span className="text-sm font-bold text-blue-800">รวมค่าใช้จ่ายจริงทั้งหมด</span>
                                <span className="text-lg font-extrabold text-blue-700">{formatCurrency(Object.values(autoSpentByCategory).reduce((s, v) => s + v, 0))}</span>
                            </div>
                        </div>
                    )}

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Trend Chart */}
                        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">แนวโน้มค่าใช้จ่ายจริง (12 เดือน) — หน่วย: พันบาท</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => `${value.toFixed(1)}K`}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="allocated" stroke="#3b82f6" strokeWidth={2} name="งบประมาณ" dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} name="ใช้จ่ายจริง" dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">สัดส่วนต้นทุน (Cost Breakdown)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={categoryChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="category" stroke="#64748b" style={{ fontSize: '10px' }} angle={-15} textAnchor="end" height={80} />
                                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Bar dataKey="allocated" fill="#3b82f6" name="งบประมาณ" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="spent" fill="#ef4444" name="ใช้จ่ายจริง" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Budget vs Actual Table (Auto-Calculated) */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">งบประมาณ vs ค่าใช้จ่ายจริง (คำนวณอัตโนมัติ)</h3>
                            <p className="text-xs text-slate-400 mt-1">ยอด "ใช้จริง (Auto)" คำนวณจากใบซ่อม, PO, และน้ำมันในระบบ</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">หมวดหมู่</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">แผนก</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">งบประมาณ</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">ใช้จริง (Auto)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">จองไว้ (PO)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">คงเหลือ</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {budgetVsActual.map((row) => (
                                        <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.autoStatus === 'เกินงบ' ? 'bg-red-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${CATEGORY_CLASSES[row.category]}`}></div>
                                                    <span className="text-sm font-bold text-slate-800">{row.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">{row.department}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">{formatCurrency(row.allocatedAmount)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-red-600">{formatCurrency(row.actualSpent)}</span>
                                                {row.autoSpent > 0 && row.autoSpent !== row.spentAmount && (
                                                    <span className="block text-[10px] text-blue-500 font-medium">Auto: {formatCurrency(row.autoSpent)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-amber-600">{formatCurrency(row.committedAmount)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{formatCurrency(row.remaining)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${row.autoStatus === 'ปกติ' ? 'bg-green-100 text-green-700' :
                                                    row.autoStatus === 'ใกล้เกิน' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {row.autoStatus} ({row.utilization.toFixed(0)}%)
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {budgetVsActual.length === 0 && Object.values(autoSpentByCategory).some(v => v > 0) && (
                                <>
                                    <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                                        <p className="text-xs font-bold text-blue-600">ยังไม่ได้ตั้งงบประมาณ — แสดงค่าใช้จ่ายจริงจากระบบ</p>
                                    </div>
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-slate-50/80">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">หมวดหมู่</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">ใช้จ่ายจริง (Auto)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {Object.entries(autoSpentByCategory).filter(([, v]) => v > 0).map(([cat, amount]) => (
                                                <tr key={cat} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${CATEGORY_CLASSES[cat as BudgetCategory] || 'bg-slate-400'}`}></div>
                                                            <span className="text-sm font-bold text-slate-800">{cat}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{formatCurrency(amount)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                                <td className="px-6 py-4 text-sm text-slate-800">รวมทั้งหมด</td>
                                                <td className="px-6 py-4 text-right text-sm font-extrabold text-red-700">{formatCurrency(Object.values(autoSpentByCategory).reduce((s, v) => s + v, 0))}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </>
                            )}
                            {budgetVsActual.length === 0 && !Object.values(autoSpentByCategory).some(v => v > 0) && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="font-medium">ยังไม่มีข้อมูลงบประมาณและค่าใช้จ่ายสำหรับเดือนนี้</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* TAB CONTENT: COST ANALYSIS */}
            {activeTab === 'analysis' && (
                <div className="space-y-6">
                    {/* Controls */}
                    <div className="flex gap-4 mb-4">
                        <select
                            aria-label="Select Vehicle"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">รถทั้งหมด</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.licensePlate} ({v.model})</option>
                            ))}
                        </select>
                    </div>

                    {/* Cost Breakdown Chart */}
                    <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">สัดส่วนต้นทุน (Cost Breakdown)</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={analysisData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="licensePlate" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="fuelCost" stackId="a" fill="#f59e0b" name="น้ำมัน" />
                                <Bar dataKey="partsCost" stackId="a" fill="#10b981" name="อะไหล่" />
                                <Bar dataKey="laborCost" stackId="a" fill="#8b5cf6" name="ค่าแรง" />
                                <Bar dataKey="externalCost" stackId="a" fill="#ef4444" name="บริการภายนอก" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detailed Cost-per-Vehicle Table */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">รายละเอียดต้นทุนรายคัน (ปี {selectedYear + 543})</h3>
                            <p className="text-xs text-slate-400 mt-1">คำนวณจากใบซ่อมจริง (สถานะซ่อมเสร็จ) + น้ำมัน — เรียงตามต้นทุนสูงสุด</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase">ทะเบียนรถ</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase">ประเภท</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-400 uppercase">อายุ (ปี)</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-400 uppercase">ซ่อม (ครั้ง)</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">น้ำมัน</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">อะไหล่</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">ค่าแรง</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">ภายนอก</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">รวมทั้งหมด</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">บ./กม.</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {analysisData.map((data, index) => (
                                        <tr key={index} className={`hover:bg-slate-50 ${index === 0 && analysisData.length > 1 ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-4 py-4 text-sm font-bold text-slate-800">{data.licensePlate}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{data.vehicleType}</td>
                                            <td className="px-4 py-4 text-center text-sm text-slate-600">{data.vehicleAge > 0 ? data.vehicleAge.toFixed(1) : '-'}</td>
                                            <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">{data.repairCount}</td>
                                            <td className="px-4 py-4 text-right text-sm text-amber-600">{formatCurrency(data.fuelCost)}</td>
                                            <td className="px-4 py-4 text-right text-sm text-emerald-600">{formatCurrency(data.partsCost)}</td>
                                            <td className="px-4 py-4 text-right text-sm text-violet-600">{formatCurrency(data.laborCost)}</td>
                                            <td className="px-4 py-4 text-right text-sm text-red-600">{formatCurrency(data.externalCost)}</td>
                                            <td className="px-4 py-4 text-right text-sm font-bold text-blue-600">{formatCurrency(data.totalCost)}</td>
                                            <td className="px-4 py-4 text-right text-sm font-bold text-purple-600">{data.costPerKm.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {analysisData.length > 0 && (
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="px-4 py-4 text-sm text-slate-800" colSpan={4}>รวมทั้งหมด ({analysisData.length} คัน)</td>
                                            <td className="px-4 py-4 text-right text-sm text-amber-600">{formatCurrency(analysisData.reduce((s, d) => s + d.fuelCost, 0))}</td>
                                            <td className="px-4 py-4 text-right text-sm text-emerald-600">{formatCurrency(analysisData.reduce((s, d) => s + d.partsCost, 0))}</td>
                                            <td className="px-4 py-4 text-right text-sm text-violet-600">{formatCurrency(analysisData.reduce((s, d) => s + d.laborCost, 0))}</td>
                                            <td className="px-4 py-4 text-right text-sm text-red-600">{formatCurrency(analysisData.reduce((s, d) => s + d.externalCost, 0))}</td>
                                            <td className="px-4 py-4 text-right text-sm text-blue-600">{formatCurrency(analysisData.reduce((s, d) => s + d.totalCost, 0))}</td>
                                            <td className="px-4 py-4"></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {analysisData.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <p className="font-medium">ไม่มีข้อมูลต้นทุนสำหรับปีนี้</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Expense Items — ประมาณการค่าใช้จ่ายรายการยอดสูง */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-amber-100 p-2 rounded-lg text-xl">📊</span>
                                ประมาณการค่าใช้จ่ายรายการยอดสูง (ปี {selectedYear + 543})
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Top 20 รายการ (อะไหล่ + น้ำมัน) เรียงตามยอดเงินสูงสุด — คำนวณจากข้อมูลจริง {currentMonth} เดือนแรก
                            </p>
                        </div>

                        {/* Summary Cards */}
                        {topExpenseItems.length > 0 && (
                            <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                                    <p className="text-xs text-amber-600 font-bold">ยอดรวมทั้งหมด</p>
                                    <p className="text-lg font-extrabold text-amber-700 mt-1">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.totalCost, 0))}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                    <p className="text-xs text-blue-600 font-bold">เฉลี่ย/เดือน</p>
                                    <p className="text-lg font-extrabold text-blue-700 mt-1">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.monthlyAvg, 0))}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                                    <p className="text-xs text-purple-600 font-bold">ประมาณการ/ปี</p>
                                    <p className="text-lg font-extrabold text-purple-700 mt-1">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.annualProjection, 0))}</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-xs text-slate-600 font-bold">จำนวนรายการ</p>
                                    <p className="text-lg font-extrabold text-slate-700 mt-1">{topExpenseItems.length} รายการ</p>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-400 uppercase w-10">#</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase">รายการ</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">จำนวน</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">ราคาเฉลี่ย/หน่วย</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase">ยอดรวม (YTD)</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-400 uppercase">เดือนที่ใช้</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-blue-500 uppercase">เฉลี่ย/เดือน</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-purple-500 uppercase">ประมาณการ/ปี</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {topExpenseItems.map((item, idx) => (
                                        <tr key={idx} className={`hover:bg-slate-50 ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold text-slate-800">{item.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-600">
                                                {item.totalQty.toLocaleString()} {item.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCurrency(item.avgPrice)}/{item.unit}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">{formatCurrency(item.totalCost)}</td>
                                            <td className="px-4 py-3 text-center text-sm text-slate-500">{item.activeMonths}/{currentMonth} เดือน</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{formatCurrency(item.monthlyAvg)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-purple-600">{formatCurrency(item.annualProjection)}</td>
                                        </tr>
                                    ))}
                                    {topExpenseItems.length > 0 && (
                                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                            <td className="px-4 py-4" colSpan={4}><span className="text-sm text-slate-800">รวมทั้งหมด</span></td>
                                            <td className="px-4 py-4 text-right text-sm text-slate-800">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.totalCost, 0))}</td>
                                            <td className="px-4 py-4"></td>
                                            <td className="px-4 py-4 text-right text-sm text-blue-600">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.monthlyAvg, 0))}</td>
                                            <td className="px-4 py-4 text-right text-sm text-purple-600">{formatCurrency(topExpenseItems.reduce((s, i) => s + i.annualProjection, 0))}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {topExpenseItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <p className="font-medium">ยังไม่มีข้อมูลอะไหล่/น้ำมันสำหรับปีนี้</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: FORECAST */}
            {activeTab === 'forecast' && (
                <div className="space-y-6">
                    {/* Forecast Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                            <p className="text-xs text-blue-100 font-bold uppercase tracking-wider">เดือนถัดไป (ประมาณการ)</p>
                            <h3 className="text-2xl font-extrabold mt-2">{formatCurrency(forecastSummary.nextMonth)}</h3>
                            <div className="mt-2 text-xs text-blue-100 space-y-0.5">
                                <p>ค่าซ่อม: {formatCurrency(forecastSummary.avgRepair)}</p>
                                <p>น้ำมัน: {formatCurrency(forecastSummary.avgFuel)}</p>
                                <p>อะไหล่: {formatCurrency(forecastSummary.avgParts)}</p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                            <p className="text-xs text-violet-100 font-bold uppercase tracking-wider">ไตรมาสถัดไป (3 เดือน)</p>
                            <h3 className="text-2xl font-extrabold mt-2">{formatCurrency(forecastSummary.nextQuarter)}</h3>
                            <p className="text-xs text-violet-100 mt-2">= {formatCurrency(forecastSummary.nextMonth)} × 3 เดือน</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                            <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider">ปีนี้ทั้งปี (ประมาณการ)</p>
                            <h3 className="text-2xl font-extrabold mt-2">{formatCurrency(forecastSummary.fullYear)}</h3>
                            <p className="text-xs text-emerald-100 mt-2">YTD: {formatCurrency(forecastSummary.ytd)} + เหลือ: {formatCurrency(forecastSummary.remainingYear)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
                            <p className="text-xs text-amber-100 font-bold uppercase tracking-wider">ปีถัดไป (+5% inflation)</p>
                            <h3 className="text-2xl font-extrabold mt-2">{formatCurrency(forecastSummary.nextYear)}</h3>
                            <p className="text-xs text-amber-100 mt-2">เฉลี่ย/เดือน: {formatCurrency(Math.round(forecastSummary.nextYear / 12))}</p>
                        </div>
                    </div>

                    {/* Forecast Chart */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-8 text-white shadow-lg">
                        <h3 className="text-2xl font-bold mb-2">คาดการณ์ค่าใช้จ่าย (Weighted Moving Average)</h3>
                        <p className="text-indigo-100 mb-8">คำนวณจากข้อมูลจริง {currentMonth} เดือน — เติมค่าคาดการณ์ถึงสิ้นปี</p>

                        <div className="h-[350px] w-full bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={forecastData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#e0e7ff" tick={{ fill: '#e0e7ff' }} />
                                    <YAxis stroke="#e0e7ff" tick={{ fill: '#e0e7ff' }} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#1e293b', borderRadius: '12px' }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Legend wrapperStyle={{ color: '#e0e7ff' }} />
                                    <Bar dataKey="repair" stackId="detail" fill="#ef4444" name="ค่าซ่อม" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="fuel" stackId="detail" fill="#f59e0b" name="น้ำมัน" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="parts" stackId="detail" fill="#10b981" name="อะไหล่ (PO)" radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="total" stroke="#c084fc" strokeWidth={3} name="รวมทั้งหมด" dot={{ fill: '#c084fc', r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex gap-6 text-sm justify-center flex-wrap">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span>ค่าซ่อม</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span>น้ำมัน</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div><span>อะไหล่</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400"></div><span>รวม (เส้น)</span></div>
                            <div className="flex items-center gap-2"><span className="text-purple-300 italic">แท่งจาง = คาดการณ์</span></div>
                        </div>
                    </div>

                    {/* Forecast Breakdown Table */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">สรุปประมาณการค่าใช้จ่าย (ปี {selectedYear + 543})</h3>
                            <p className="text-xs text-slate-400 mt-1">คำนวณจากค่าเฉลี่ยถ่วงน้ำหนัก (Weighted Moving Average) ของ {currentMonth} เดือนที่ผ่านมา</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">ช่วงเวลา</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-red-400 uppercase">ค่าซ่อม</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-amber-500 uppercase">น้ำมัน</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-emerald-500 uppercase">อะไหล่ (PO)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-purple-500 uppercase">รวมทั้งหมด</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">เฉลี่ย/เดือน</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{formatCurrency(forecastSummary.avgRepair)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">{formatCurrency(forecastSummary.avgFuel)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">{formatCurrency(forecastSummary.avgParts)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-purple-600">{formatCurrency(forecastSummary.monthlyAvg)}</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50/50 bg-blue-50/30">
                                        <td className="px-6 py-4 text-sm font-bold text-blue-700">เดือนถัดไป</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{formatCurrency(forecastSummary.avgRepair)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">{formatCurrency(forecastSummary.avgFuel)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">{formatCurrency(forecastSummary.avgParts)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-blue-700">{formatCurrency(forecastSummary.nextMonth)}</td>
                                    </tr>
                                    <tr className="hover:bg-violet-50/50 bg-violet-50/30">
                                        <td className="px-6 py-4 text-sm font-bold text-violet-700">ไตรมาสถัดไป (3 เดือน)</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{formatCurrency(forecastSummary.avgRepair * 3)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">{formatCurrency(forecastSummary.avgFuel * 3)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">{formatCurrency(forecastSummary.avgParts * 3)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-violet-700">{formatCurrency(forecastSummary.nextQuarter)}</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">ที่เหลือของปีนี้ ({12 - currentMonth} เดือน)</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{formatCurrency(forecastSummary.avgRepair * (12 - currentMonth))}</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">{formatCurrency(forecastSummary.avgFuel * (12 - currentMonth))}</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">{formatCurrency(forecastSummary.avgParts * (12 - currentMonth))}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">{formatCurrency(forecastSummary.remainingYear)}</td>
                                    </tr>
                                    <tr className="bg-emerald-50/50 hover:bg-emerald-50 font-bold">
                                        <td className="px-6 py-4 text-sm text-emerald-800">ปีนี้ทั้งปี (YTD + คาดการณ์)</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm font-extrabold text-emerald-700">{formatCurrency(forecastSummary.fullYear)}</td>
                                    </tr>
                                    <tr className="bg-amber-50/50 hover:bg-amber-50 font-bold">
                                        <td className="px-6 py-4 text-sm text-amber-800">ปีถัดไป (+5% inflation)</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm text-amber-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm text-emerald-600">-</td>
                                        <td className="px-6 py-4 text-right text-sm font-extrabold text-amber-700">{formatCurrency(forecastSummary.nextYear)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Budget Planning Template */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">แผนงบประมาณปี {selectedYear + 544} (อิงข้อมูลจริง)</h3>
                            <p className="text-xs text-slate-400 mt-1">เปรียบเทียบปีก่อน vs ปีนี้ + คาดการณ์ปีหน้า (+5% inflation)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">หมวดหมู่</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">งบปีก่อน</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">ใช้จริงปีก่อน</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">งบปีนี้</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">ใช้จริงปีนี้</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-blue-500 uppercase">คาดการณ์/ปี</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-blue-500 uppercase">คาดการณ์/เดือน</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {planningData.map((row) => (
                                        <tr key={row.category} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${CATEGORY_CLASSES[row.category]}`}></div>
                                                    <span className="text-sm font-bold text-slate-800">{row.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-slate-500">{formatCurrency(row.prevYearAllocated)}</td>
                                            <td className="px-6 py-4 text-right text-sm text-slate-600">{formatCurrency(row.prevYearSpent)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">{formatCurrency(row.currYearAllocated)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{formatCurrency(row.currYearSpent)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">{formatCurrency(row.projectedAnnual)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-blue-500">{formatCurrency(row.projectedMonthly)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${row.variance <= 0 ? 'bg-green-100 text-green-700' : row.variance <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {row.variance > 0 ? '+' : ''}{row.variance}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 font-bold">
                                        <td className="px-6 py-4 text-sm text-slate-800">รวมทั้งหมด</td>
                                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(planningData.reduce((s, r) => s + r.prevYearAllocated, 0))}</td>
                                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(planningData.reduce((s, r) => s + r.prevYearSpent, 0))}</td>
                                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(planningData.reduce((s, r) => s + r.currYearAllocated, 0))}</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{formatCurrency(planningData.reduce((s, r) => s + r.currYearSpent, 0))}</td>
                                        <td className="px-6 py-4 text-right text-sm text-blue-600">{formatCurrency(planningData.reduce((s, r) => s + r.projectedAnnual, 0))}</td>
                                        <td className="px-6 py-4 text-right text-sm text-blue-500">{formatCurrency(planningData.reduce((s, r) => s + r.projectedMonthly, 0))}</td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Budget Modal */}
            {isAddModalOpen && (
                <AddBudgetModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddBudget}
                />
            )}
        </div>
    );
};

export default BudgetManagement;
