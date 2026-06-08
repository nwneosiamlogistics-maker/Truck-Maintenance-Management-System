import React, { useState, useMemo } from 'react';
import type { Repair, Vehicle } from '../types';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Line, ComposedChart
} from 'recharts';
import { Download, ChevronDown, ChevronUp, Truck, Calendar, DollarSign, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { exportToXLSX } from '../utils/exportUtils';
import type { XLSXSheet } from '../utils/exportUtils';

// --- Types ---
interface VehicleExpenseReportProps {
    repairs: Repair[];
    vehicles: Vehicle[];
}

interface MonthlyTotal {
    month: number;
    monthLabel: string;
    repairCount: number;
    laborCost: number;
    partsCost: number;
    vatCost: number;
    totalCost: number;
}

interface VehicleMonthlyDetail {
    licensePlate: string;
    vehicleType: string;
    repairCount: number;
    laborCost: number;
    partsCost: number;
    vatCost: number;
    totalCost: number;
    repairs: Repair[];
}

// --- Helper ---
const calculateRepairCosts = (repair: Repair) => {
    const laborCost = Number(repair.repairCost) || 0;
    const partsCost = (repair.parts || []).reduce((sum, p) =>
        sum + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);
    const vatCost = (Number(repair.partsVat) || 0) + (Number(repair.laborVat) || 0);
    return { laborCost, partsCost, vatCost, totalCost: laborCost + partsCost + vatCost };
};

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-5 border border-white shadow-2xl rounded-3xl z-50 backdrop-blur-xl">
                <p className="font-black text-slate-800 mb-3 text-xs border-b border-slate-100/50 pb-2 uppercase tracking-widest">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-[11px] font-black mt-1.5 flex items-center gap-2" style={{ color: entry.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}: ฿{Number(entry.value).toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// --- Main Component ---
const VehicleExpenseReport: React.FC<VehicleExpenseReportProps> = ({ repairs, vehicles }) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
    const [sortField, setSortField] = useState<'totalCost' | 'repairCount' | 'licensePlate'>('totalCost');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Get available years from repairs
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        (Array.isArray(repairs) ? repairs : []).forEach(r => {
            if (r.createdAt) {
                const y = new Date(r.createdAt).getFullYear();
                if (y > 2000 && y < 2100) years.add(y);
            }
        });
        if (years.size === 0) years.add(currentYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [repairs, currentYear]);

    // Calculate monthly totals
    const { monthlyTotals, yearTotal, monthlyVehicleDetails } = useMemo(() => {
        const safeRepairs = Array.isArray(repairs) ? repairs : [];

        // Filter repairs for selected year based on createdAt + status ซ่อมเสร็จ
        const yearRepairs = safeRepairs.filter(r => {
            if (!r.createdAt) return false;
            const d = new Date(r.createdAt);
            return d.getFullYear() === selectedYear && r.status === 'ซ่อมเสร็จ';
        });

        const monthMap: Record<number, Repair[]> = {};
        for (let m = 0; m < 12; m++) monthMap[m] = [];

        yearRepairs.forEach(r => {
            const month = new Date(r.createdAt).getMonth();
            monthMap[month].push(r);
        });

        const totals: MonthlyTotal[] = [];
        const vehicleDetails: Record<number, VehicleMonthlyDetail[]> = {};
        let yearLaborCost = 0, yearPartsCost = 0, yearVatCost = 0, yearTotalCost = 0, yearRepairCount = 0;

        for (let m = 0; m < 12; m++) {
            const monthRepairs = monthMap[m];
            let mLabor = 0, mParts = 0, mVat = 0, mTotal = 0;

            // Group by vehicle
            const vehicleMap: Record<string, VehicleMonthlyDetail> = {};

            monthRepairs.forEach(r => {
                const costs = calculateRepairCosts(r);
                mLabor += costs.laborCost;
                mParts += costs.partsCost;
                mVat += costs.vatCost;
                mTotal += costs.totalCost;

                const plate = r.licensePlate || 'ไม่ระบุ';
                if (!vehicleMap[plate]) {
                    vehicleMap[plate] = {
                        licensePlate: plate,
                        vehicleType: r.vehicleType || '-',
                        repairCount: 0,
                        laborCost: 0,
                        partsCost: 0,
                        vatCost: 0,
                        totalCost: 0,
                        repairs: []
                    };
                }
                vehicleMap[plate].repairCount += 1;
                vehicleMap[plate].laborCost += costs.laborCost;
                vehicleMap[plate].partsCost += costs.partsCost;
                vehicleMap[plate].vatCost += costs.vatCost;
                vehicleMap[plate].totalCost += costs.totalCost;
                vehicleMap[plate].repairs.push(r);
            });

            totals.push({
                month: m,
                monthLabel: `${THAI_MONTHS_SHORT[m]} ${selectedYear + 543}`,
                repairCount: monthRepairs.length,
                laborCost: mLabor,
                partsCost: mParts,
                vatCost: mVat,
                totalCost: mTotal
            });

            vehicleDetails[m] = Object.values(vehicleMap);

            yearLaborCost += mLabor;
            yearPartsCost += mParts;
            yearVatCost += mVat;
            yearTotalCost += mTotal;
            yearRepairCount += monthRepairs.length;
        }

        return {
            monthlyTotals: totals,
            yearTotal: {
                repairCount: yearRepairCount,
                laborCost: yearLaborCost,
                partsCost: yearPartsCost,
                vatCost: yearVatCost,
                totalCost: yearTotalCost
            },
            monthlyVehicleDetails: vehicleDetails
        };
    }, [repairs, selectedYear]);

    // Chart data
    const chartData = useMemo(() => {
        return monthlyTotals.map(m => ({
            name: THAI_MONTHS_SHORT[m.month],
            ค่าแรง: m.laborCost,
            ค่าอะไหล่: m.partsCost,
            VAT: m.vatCost,
            รวม: m.totalCost
        }));
    }, [monthlyTotals]);

    // Sorted vehicle details for expanded month
    const sortedVehicleDetails = useMemo(() => {
        if (expandedMonth === null) return [];
        const details = [...(monthlyVehicleDetails[expandedMonth] || [])];
        details.sort((a, b) => {
            if (sortField === 'licensePlate') {
                return sortDir === 'asc'
                    ? a.licensePlate.localeCompare(b.licensePlate)
                    : b.licensePlate.localeCompare(a.licensePlate);
            }
            const aVal = a[sortField];
            const bVal = b[sortField];
            return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
        return details;
    }, [expandedMonth, monthlyVehicleDetails, sortField, sortDir]);

    // Toggle sort
    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    // Export: selected month
    const handleExportMonth = (month: number) => {
        const details = monthlyVehicleDetails[month] || [];
        if (details.length === 0) return;

        const monthName = `${THAI_MONTHS[month]} ${selectedYear + 543}`;
        const rows = details
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((v, idx) => ({
                'ลำดับ': idx + 1,
                'ทะเบียนรถ': v.licensePlate,
                'ประเภทรถ': v.vehicleType,
                'จำนวนครั้งที่ซ่อม': v.repairCount,
                'ค่าแรง (บาท)': Number(v.laborCost.toFixed(2)),
                'ค่าอะไหล่ (บาท)': Number(v.partsCost.toFixed(2)),
                'VAT (บาท)': Number(v.vatCost.toFixed(2)),
                'รวมทั้งสิ้น (บาท)': Number(v.totalCost.toFixed(2))
            }));

        exportToXLSX(`ค่าใช้จ่ายรถ_${THAI_MONTHS[month]}_${selectedYear + 543}`, [{
            sheetName: monthName,
            data: rows,
            columnWidths: [6, 16, 18, 14, 16, 16, 14, 18]
        }]);
    };

    // Export: full year (separate sheet per month)
    const handleExportYear = () => {
        const sheets: XLSXSheet[] = [];

        // Summary sheet
        const summaryRows = monthlyTotals.map((m, idx) => ({
            'ลำดับ': idx + 1,
            'เดือน': `${THAI_MONTHS[m.month]} ${selectedYear + 543}`,
            'จำนวนงานซ่อม': m.repairCount,
            'ค่าแรง (บาท)': Number(m.laborCost.toFixed(2)),
            'ค่าอะไหล่ (บาท)': Number(m.partsCost.toFixed(2)),
            'VAT (บาท)': Number(m.vatCost.toFixed(2)),
            'รวมทั้งสิ้น (บาท)': Number(m.totalCost.toFixed(2))
        }));

        // Add year total row
        summaryRows.push({
            'ลำดับ': 0,
            'เดือน': `รวมทั้งปี ${selectedYear + 543}`,
            'จำนวนงานซ่อม': yearTotal.repairCount,
            'ค่าแรง (บาท)': Number(yearTotal.laborCost.toFixed(2)),
            'ค่าอะไหล่ (บาท)': Number(yearTotal.partsCost.toFixed(2)),
            'VAT (บาท)': Number(yearTotal.vatCost.toFixed(2)),
            'รวมทั้งสิ้น (บาท)': Number(yearTotal.totalCost.toFixed(2))
        });

        sheets.push({
            sheetName: `สรุปรายเดือน ${selectedYear + 543}`,
            data: summaryRows,
            columnWidths: [6, 22, 14, 16, 16, 14, 18]
        });

        // Per-month sheets
        for (let m = 0; m < 12; m++) {
            const details = monthlyVehicleDetails[m] || [];
            if (details.length === 0) continue;

            const rows = details
                .sort((a, b) => b.totalCost - a.totalCost)
                .map((v, idx) => ({
                    'ลำดับ': idx + 1,
                    'ทะเบียนรถ': v.licensePlate,
                    'ประเภทรถ': v.vehicleType,
                    'จำนวนครั้งที่ซ่อม': v.repairCount,
                    'ค่าแรง (บาท)': Number(v.laborCost.toFixed(2)),
                    'ค่าอะไหล่ (บาท)': Number(v.partsCost.toFixed(2)),
                    'VAT (บาท)': Number(v.vatCost.toFixed(2)),
                    'รวมทั้งสิ้น (บาท)': Number(v.totalCost.toFixed(2))
                }));

            sheets.push({
                sheetName: THAI_MONTHS_SHORT[m],
                data: rows,
                columnWidths: [6, 16, 18, 14, 16, 16, 14, 18]
            });
        }

        if (sheets.length > 0) {
            exportToXLSX(`ค่าใช้จ่ายรถ_ทั้งปี_${selectedYear + 543}`, sheets);
        }
    };

    // Find max cost month for highlight
    const maxCostMonth = useMemo(() => {
        return monthlyTotals.reduce((max, m) => m.totalCost > max.totalCost ? m : max, monthlyTotals[0]);
    }, [monthlyTotals]);

    return (
        <div className="space-y-10 animate-fade-in-up pb-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-teal-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-900 leading-none">
                        ค่าใช้จ่ายเกี่ยวกับรถ
                    </h2>
                    <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-glow"></span>
                        สรุปค่าใช้จ่ายซ่อมบำรุงรายเดือน (Monthly Vehicle Expense Report)
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-8 lg:mt-0 relative z-10">
                    {/* Year Selector */}
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-xl px-6 py-3 rounded-[2rem] border border-white shadow-xl">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ปี พ.ศ.</span>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            title="เลือกปี พ.ศ."
                            className="bg-slate-50/80 border border-slate-200 px-4 py-2 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-emerald-500 transition-all"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y + 543}</option>
                            ))}
                        </select>
                    </div>

                    {/* Export Buttons */}
                    <button
                        onClick={handleExportYear}
                        className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-black rounded-[2rem] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all transform hover:-translate-y-0.5 active:scale-95 group"
                    >
                        <FileSpreadsheet size={18} className="group-hover:animate-bounce" />
                        <span className="tracking-[0.15em] text-[11px]">Export ทั้งปี (XLSX)</span>
                    </button>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                        <Truck size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 font-black text-[9px] uppercase tracking-[0.3em] mb-2">งานซ่อมรวมทั้งปี</h3>
                        <div className="text-3xl font-black tabular-nums">{yearTotal.repairCount.toLocaleString()}</div>
                        <div className="mt-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Total Repairs</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                        <DollarSign size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 font-black text-[9px] uppercase tracking-[0.3em] mb-2">ค่าใช้จ่ายรวมทั้งปี</h3>
                        <div className="text-2xl font-black tabular-nums">฿{formatCurrency(yearTotal.totalCost)}</div>
                        <div className="mt-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Total Expense</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-orange-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-white/60 font-black text-[9px] uppercase tracking-[0.3em] mb-2">ค่าแรงรวม</h3>
                        <div className="text-2xl font-black tabular-nums">฿{formatCurrency(yearTotal.laborCost)}</div>
                        <div className="mt-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Labor Cost</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-violet-500 to-purple-700 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-violet-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-white/60 font-black text-[9px] uppercase tracking-[0.3em] mb-2">ค่าอะไหล่รวม</h3>
                        <div className="text-2xl font-black tabular-nums">฿{formatCurrency(yearTotal.partsCost)}</div>
                        <div className="mt-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Parts Cost</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-slate-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                        <TrendingUp size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 font-black text-[9px] uppercase tracking-[0.3em] mb-2">เดือนที่แพงที่สุด</h3>
                        <div className="text-xl font-black">{THAI_MONTHS_SHORT[maxCostMonth?.month ?? 0]}</div>
                        <div className="mt-3 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            ฿{formatCurrency(maxCostMonth?.totalCost ?? 0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="glass p-10 rounded-[3.5rem] border border-white/50 shadow-2xl">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                        <div className="w-2.5 h-10 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full shadow-lg shadow-emerald-500/30"></div>
                        แนวโน้มค่าใช้จ่ายรายเดือน ปี {selectedYear + 543}
                    </h3>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={11} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} fontWeight="900" stroke="#94a3b8" tickLine={false} axisLine={false}
                                tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="ค่าแรง" name="ค่าแรง" stackId="cost" fill="#f97316" radius={[0, 0, 0, 0]} barSize={35} />
                            <Bar dataKey="ค่าอะไหล่" name="ค่าอะไหล่" stackId="cost" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={35} />
                            <Bar dataKey="VAT" name="VAT" stackId="cost" fill="#a855f7" radius={[8, 8, 0, 0]} barSize={35} />
                            <Line type="monotone" dataKey="รวม" name="ค่าใช้จ่ายรวม" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-8 mt-6">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                        <div className="w-3 h-3 rounded bg-orange-500"></div> ค่าแรง
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                        <div className="w-3 h-3 rounded bg-blue-500"></div> ค่าอะไหล่
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                        <div className="w-3 h-3 rounded bg-purple-500"></div> VAT
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div> รวมทั้งหมด
                    </div>
                </div>
            </div>

            {/* Monthly Table with Drill-down */}
            <div className="glass rounded-[3.5rem] border border-white/50 shadow-2xl overflow-hidden">
                <div className="p-10 border-b border-slate-100/50">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                        <div className="w-2.5 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                        สรุปค่าใช้จ่ายรายเดือน — คลิกเพื่อดูรายละเอียดแยกรายคัน
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">เดือน</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนงาน</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">ค่าแรง (บาท)</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">ค่าอะไหล่ (บาท)</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">VAT (บาท)</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">รวมทั้งสิ้น (บาท)</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Export</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {monthlyTotals.map((m) => (
                                <React.Fragment key={m.month}>
                                    <tr
                                        onClick={() => setExpandedMonth(expandedMonth === m.month ? null : m.month)}
                                        className={`cursor-pointer transition-all duration-300 group ${expandedMonth === m.month ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'} ${m.totalCost === 0 ? 'opacity-40' : ''}`}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expandedMonth === m.month ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                    {expandedMonth === m.month ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-slate-700">{THAI_MONTHS[m.month]}</span>
                                                    <span className="text-[10px] text-slate-400 ml-2 font-bold">{selectedYear + 543}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm ${m.repairCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {m.repairCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right text-sm font-bold text-orange-600 tabular-nums">{m.laborCost > 0 ? formatCurrency(m.laborCost) : '-'}</td>
                                        <td className="px-6 py-5 text-right text-sm font-bold text-blue-600 tabular-nums">{m.partsCost > 0 ? formatCurrency(m.partsCost) : '-'}</td>
                                        <td className="px-6 py-5 text-right text-sm font-bold text-purple-600 tabular-nums">{m.vatCost > 0 ? formatCurrency(m.vatCost) : '-'}</td>
                                        <td className="px-6 py-5 text-right text-lg font-black text-slate-800 tabular-nums">{m.totalCost > 0 ? `฿${formatCurrency(m.totalCost)}` : '-'}</td>
                                        <td className="px-6 py-5 text-center">
                                            {m.repairCount > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleExportMonth(m.month); }}
                                                    className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-all hover:scale-110 active:scale-95"
                                                    title={`Export ${THAI_MONTHS[m.month]}`}
                                                >
                                                    <Download size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Expanded Detail */}
                                    {expandedMonth === m.month && m.repairCount > 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-0 py-0">
                                                <div className="bg-gradient-to-b from-emerald-50/50 to-white border-t-2 border-emerald-200/50 animate-fade-in-up">
                                                    <div className="px-10 py-6 flex items-center justify-between">
                                                        <h4 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                                                            <Truck size={16} />
                                                            รายละเอียดค่าใช้จ่ายแยกรายคัน — {THAI_MONTHS[m.month]} {selectedYear + 543}
                                                            <span className="ml-2 px-3 py-1 bg-emerald-200/50 text-emerald-700 rounded-full text-[10px] font-black">
                                                                {sortedVehicleDetails.length} คัน
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <div className="px-6 pb-6">
                                                        <table className="min-w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                                                            <thead className="bg-slate-900 text-white">
                                                                <tr>
                                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">ลำดับ</th>
                                                                    <th
                                                                        onClick={() => handleSort('licensePlate')}
                                                                        className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-emerald-300 transition-colors"
                                                                    >
                                                                        ทะเบียนรถ {sortField === 'licensePlate' && (sortDir === 'asc' ? '↑' : '↓')}
                                                                    </th>
                                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">ประเภท</th>
                                                                    <th
                                                                        onClick={() => handleSort('repairCount')}
                                                                        className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-emerald-300 transition-colors"
                                                                    >
                                                                        จำนวนครั้ง {sortField === 'repairCount' && (sortDir === 'asc' ? '↑' : '↓')}
                                                                    </th>
                                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">ค่าแรง</th>
                                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">ค่าอะไหล่</th>
                                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">VAT</th>
                                                                    <th
                                                                        onClick={() => handleSort('totalCost')}
                                                                        className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-emerald-300 transition-colors"
                                                                    >
                                                                        รวม {sortField === 'totalCost' && (sortDir === 'asc' ? '↑' : '↓')}
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {sortedVehicleDetails.map((v, idx) => (
                                                                    <tr key={v.licensePlate} className="hover:bg-emerald-50/50 transition-colors">
                                                                        <td className="px-6 py-3.5 text-sm text-slate-400 font-bold">{idx + 1}</td>
                                                                        <td className="px-6 py-3.5 text-sm font-black text-slate-800">{v.licensePlate}</td>
                                                                        <td className="px-6 py-3.5">
                                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{v.vehicleType}</span>
                                                                        </td>
                                                                        <td className="px-6 py-3.5 text-center">
                                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm">{v.repairCount}</span>
                                                                        </td>
                                                                        <td className="px-6 py-3.5 text-right text-sm font-bold text-orange-600 tabular-nums">{formatCurrency(v.laborCost)}</td>
                                                                        <td className="px-6 py-3.5 text-right text-sm font-bold text-blue-600 tabular-nums">{formatCurrency(v.partsCost)}</td>
                                                                        <td className="px-6 py-3.5 text-right text-sm font-bold text-purple-600 tabular-nums">{formatCurrency(v.vatCost)}</td>
                                                                        <td className="px-6 py-3.5 text-right text-sm font-black text-slate-900 tabular-nums">฿{formatCurrency(v.totalCost)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                                <tr>
                                                                    <td colSpan={3} className="px-6 py-4 text-right text-sm font-black text-slate-600 uppercase tracking-widest">รวมเดือนนี้</td>
                                                                    <td className="px-6 py-4 text-center text-sm font-black text-slate-800">{m.repairCount}</td>
                                                                    <td className="px-6 py-4 text-right text-sm font-black text-orange-700 tabular-nums">{formatCurrency(m.laborCost)}</td>
                                                                    <td className="px-6 py-4 text-right text-sm font-black text-blue-700 tabular-nums">{formatCurrency(m.partsCost)}</td>
                                                                    <td className="px-6 py-4 text-right text-sm font-black text-purple-700 tabular-nums">{formatCurrency(m.vatCost)}</td>
                                                                    <td className="px-6 py-4 text-right text-lg font-black text-slate-900 tabular-nums">฿{formatCurrency(m.totalCost)}</td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>

                        {/* Year Total Footer */}
                        <tfoot className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                            <tr>
                                <td className="px-8 py-6">
                                    <span className="text-sm font-black uppercase tracking-widest">รวมทั้งปี {selectedYear + 543}</span>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 font-black text-lg">{yearTotal.repairCount}</span>
                                </td>
                                <td className="px-6 py-6 text-right text-sm font-black text-orange-300 tabular-nums">{formatCurrency(yearTotal.laborCost)}</td>
                                <td className="px-6 py-6 text-right text-sm font-black text-blue-300 tabular-nums">{formatCurrency(yearTotal.partsCost)}</td>
                                <td className="px-6 py-6 text-right text-sm font-black text-purple-300 tabular-nums">{formatCurrency(yearTotal.vatCost)}</td>
                                <td className="px-6 py-6 text-right text-xl font-black tabular-nums">฿{formatCurrency(yearTotal.totalCost)}</td>
                                <td className="px-6 py-6"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VehicleExpenseReport;
