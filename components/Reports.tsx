import React, { useState, useMemo } from 'react';
import type { Repair, StockItem, Technician } from '../types';
import StatCard from './StatCard';

// --- Reusable Chart Components (SVG-based with 3D effects) ---

const BarChart = ({ data }: { data: { label: string, value: number }[] }) => {
    if (!data || data.length === 0) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูล</div>;

    const width = 500;
    const height = 250;
    const margin = { top: 30, right: 0, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map(d => d.value), 0);
    const yScale = chartHeight / (maxValue > 0 ? maxValue : 1);
    const xScale = chartWidth / data.length;

    const yAxisLabels = Array.from({ length: 6 }, (_, i) => {
        const value = (maxValue / 5) * i;
        return { value, y: chartHeight - (value * yScale) };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Bar chart">
            <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
            </defs>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {yAxisLabels.map(label => (
                    <g key={label.value} transform={`translate(0, ${label.y})`}>
                        <line x2={chartWidth} stroke="rgba(255,255,255,0.2)" />
                        <text x="-10" dy=".32em" textAnchor="end" className="text-xs fill-current text-gray-600">
                            {label.value > 1000 ? `${(label.value/1000).toFixed(0)}k` : label.value.toLocaleString()}
                        </text>
                    </g>
                ))}
                {data.map((d, i) => {
                     const barHeight = d.value * yScale;
                     return (
                        <g key={i} transform={`translate(${i * xScale}, 0)`}>
                            <rect
                                x={xScale * 0.1}
                                y={chartHeight - barHeight}
                                width={xScale * 0.8}
                                height={barHeight}
                                fill="url(#barGradient)"
                                rx="4"
                                className="transition-all duration-300"
                            >
                                <title>{d.label}: {d.value.toLocaleString()}</title>
                            </rect>
                             <text x={xScale / 2} y={chartHeight - barHeight - 8} textAnchor="middle" className="text-xs font-semibold fill-current text-gray-700">
                                {d.value > 1000 ? `${(d.value/1000).toFixed(1)}k` : d.value.toLocaleString()}
                            </text>
                            <text x={xScale / 2} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-current text-gray-500">
                                {d.label}
                            </text>
                        </g>
                     )
                })}
            </g>
        </svg>
    );
};

const DonutChart = ({ data, unit = 'ชิ้น' }: { data: { label: string, value: number }[], unit?: string }) => {
    const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
    if (!data || data.length === 0) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูล</div>;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = 80;
    const innerRadius = 55;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="relative w-48 h-48 flex-shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                     <defs>
                        <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.1)" />
                        </filter>
                    </defs>
                    {data.map((d, i) => {
                        const percentage = total > 0 ? d.value / total : 0;
                        const strokeDasharray = `${percentage * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedAngle * circumference;
                        accumulatedAngle += percentage;
                        return (
                            <circle
                                key={i}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="transparent"
                                stroke={colors[i % colors.length]}
                                strokeWidth={radius - innerRadius}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                filter="url(#donutShadow)"
                            >
                                 <title>{d.label}: {d.value.toLocaleString()} ({ (percentage * 100).toFixed(1) }%)</title>
                            </circle>
                        );
                    })}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">{total.toLocaleString()}</span>
                    <span className="text-lg text-gray-500">{unit}</span>
                </div>
            </div>
            <div className="w-full md:w-auto md:max-w-[200px] flex-1">
                <ul className="space-y-2 text-sm">
                    {data.map((d, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                                <span className="truncate" title={d.label}>{d.label}</span>
                            </div>
                            <span className="font-semibold">{d.value.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const LineChart = ({ data }: { data: { date: string, count: number }[] }) => {
    if (!data || data.length < 2) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟเส้น</div>;

    const width = 500;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 30 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map(d => d.count), 0);
    const yScale = chartHeight / (maxValue > 0 ? maxValue : 1);
    const getX = (index: number) => (chartWidth / (data.length - 1)) * index;

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${chartHeight - (d.count * yScale)}`).join(' ');
    const areaPath = `${linePath} L${getX(data.length - 1)},${chartHeight} L${getX(0)},${chartHeight} Z`;

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    };

    const labelsToShow = useMemo(() => {
        const maxLabels = Math.floor(chartWidth / 50);
        if (data.length <= maxLabels) return data.map((d, i) => ({ ...d, index: i }));
        const step = Math.ceil(data.length / maxLabels);
        return data.filter((_, i) => i % step === 0).map((d, i_step) => ({ ...d, index: i_step * step }));
    }, [data, chartWidth]);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
             <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                <g className="axis y-axis">
                    {Array.from({ length: 5 }).map((_, i) => {
                        const value = Math.round(maxValue / 4 * i);
                        const y = chartHeight - (value * yScale);
                        return (
                            <g key={i} transform={`translate(0, ${y})`}>
                                <line x2={chartWidth} stroke="rgba(255,255,255,0.2)" />
                                <text x="-10" dy=".32em" textAnchor="end" className="text-xs fill-current text-gray-500">{value}</text>
                            </g>
                        );
                    })}
                </g>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={chartHeight - (d.count * yScale)} r="4" fill="#3b82f6" className="cursor-pointer">
                        <title>{formatShortDate(d.date)}: {d.count} งาน</title>
                    </circle>
                ))}
                 <g className="labels x-labels">
                    {labelsToShow.map(d => (
                        <text key={d.index} x={getX(d.index)} y={chartHeight + 20} className="text-xs fill-current text-gray-500" textAnchor="middle">
                            {formatShortDate(d.date)}
                        </text>
                    ))}
                </g>
            </g>
        </svg>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white/40 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        {children}
    </div>
);

const RepairTypeChart: React.FC<{ data: { label: string, value: number }[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูล</div>;
    const maxValue = Math.max(...data.map(d => d.value), 0);
    const colors = ['from-blue-400 to-blue-600', 'from-sky-400 to-sky-600', 'from-cyan-400 to-cyan-600'];

    return (
        <div className="space-y-4">
            {data.map((item, index) => (
                <div key={item.label}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-semibold text-gray-700">{item.label}</span>
                        <span className="font-bold text-gray-600">{item.value.toLocaleString('th-TH')} ครั้ง</span>
                    </div>
                    <div className="w-full bg-gray-200/70 rounded-full h-4 overflow-hidden">
                        <div
                            className={`bg-gradient-to-r ${colors[index % colors.length]} h-4 rounded-full`}
                            style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const Reports: React.FC<{ repairs: Repair[], stock: StockItem[], technicians: Technician[] }> = ({ repairs, stock, technicians }) => {
    const [timeFilter, setTimeFilter] = useState('30d');

    const filteredRepairs = useMemo(() => {
        if (timeFilter === 'all') return repairs;
        const now = Date.now();
        const days = parseInt(timeFilter);
        return repairs.filter(r => (now - new Date(r.createdAt).getTime()) < (days * 24 * 60 * 60 * 1000));
    }, [repairs, timeFilter]);

    const data = useMemo(() => {
        const safeRepairs = Array.isArray(filteredRepairs) ? filteredRepairs : [];
        const safeAllRepairs = Array.isArray(repairs) ? repairs : [];
        const safeStock = Array.isArray(stock) ? stock : [];

        // Monthly Expenses (from all repairs, not just filtered)
        const monthlyExpenses: Record<string, number> = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        safeAllRepairs.filter(r => new Date(r.createdAt) >= sixMonthsAgo).forEach(r => {
            const month = new Date(r.createdAt).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            const partsTotal = (r.parts || []).reduce((partsSum, part) => {
                return partsSum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
            }, 0);
            const totalCost = (Number(r.repairCost) || 0) + (Number(r.partsVat) || 0) + partsTotal;
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + totalCost;
        });
        
        const sortedMonths = Object.keys(monthlyExpenses).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const lastSixMonthsExpenses = sortedMonths.slice(-6).map(month => ({ label: month, value: monthlyExpenses[month] }));

        // Data from time-filtered repairs
        const partUsageByCategory = safeRepairs.reduce((acc, r) => {
            (r.parts || []).forEach(p => {
                const category = (stock.find(s => s.id === p.partId)?.category || 'อื่นๆ').split('. ')[1] || 'อื่นๆ';
                acc[category] = (acc[category] || 0) + p.quantity;
            });
            return acc;
        }, {} as Record<string, number>);

        const dailyCompletions: Record<string, number> = {};
        safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate).forEach(r => {
            const date = new Date(r.repairEndDate!).toISOString().split('T')[0];
            dailyCompletions[date] = (dailyCompletions[date] || 0) + 1;
        });

        const repairsByVehicle = safeRepairs.reduce((acc, r) => ({ ...acc, [r.licensePlate]: (acc[r.licensePlate] || 0) + 1 }), {} as Record<string, number>);
        
        const totalCost = safeRepairs.reduce((sum, r) => {
            const partsTotal = (r.parts || []).reduce((partsSum, part) => {
                return partsSum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
            }, 0);
            return sum + (Number(r.repairCost) || 0) + (Number(r.partsVat) || 0) + partsTotal;
        }, 0);
        
        const repairsByCategory = safeRepairs.reduce((acc, r) => {
            acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const repairsByDispatch = safeRepairs.reduce((acc, r) => {
            acc[r.dispatchType] = (acc[r.dispatchType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            monthlyExpenses: lastSixMonthsExpenses,
            partUsage: Object.entries(partUsageByCategory).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value).slice(0, 5),
            dailyCompletions: Object.entries(dailyCompletions).map(([date, count]) => ({ date, count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            topVehicles: Object.entries(repairsByVehicle).map(([plate, count]) => ({ plate, count })).sort((a, b) => b.count - a.count).slice(0, 5),
            repairsByCategory: Object.entries(repairsByCategory).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
            repairsByDispatch: Object.entries(repairsByDispatch).map(([label, value]) => ({ label, value })),
            stats: {
                totalRepairs: safeRepairs.length,
                totalCost,
                avgCost: safeRepairs.length > 0 ? totalCost / safeRepairs.length : 0,
                lowStock: safeStock.filter(s => s.quantity - (s.quantityReserved || 0) <= s.minStock).length,
            },
        };
    }, [filteredRepairs, repairs, stock]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-white/30">
                    <button onClick={() => setTimeFilter('7d')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${timeFilter === '7d' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-white/50'}`}>7 วัน</button>
                    <button onClick={() => setTimeFilter('30d')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${timeFilter === '30d' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-white/50'}`}>30 วัน</button>
                    <button onClick={() => setTimeFilter('90d')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${timeFilter === '90d' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-white/50'}`}>90 วัน</button>
                    <button onClick={() => setTimeFilter('all')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${timeFilter === 'all' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-white/50'}`}>ทั้งหมด</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                 <StatCard theme="blue" title="งานซ่อมทั้งหมด" value={data.stats.totalRepairs.toLocaleString('th-TH')} />
                 <StatCard theme="green" title="ค่าใช้จ่ายรวม" value={`${Math.round(data.stats.totalCost).toLocaleString('th-TH')} ฿`} />
                 <StatCard theme="yellow" title="ค่าซ่อมเฉลี่ย" value={`${Math.round(data.stats.avgCost).toLocaleString('th-TH')} ฿`} />
                 <StatCard theme="red" title="อะไหล่ใกล้หมด" value={data.stats.lowStock} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="ประเภทการซ่อมที่พบบ่อย">
                    <RepairTypeChart data={data.repairsByCategory} />
                </Card>
                <Card title="สถิติการส่งซ่อม">
                    <DonutChart data={data.repairsByDispatch} unit="ครั้ง" />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="สรุปค่าใช้จ่ายรายเดือน" className="lg:col-span-2">
                    <BarChart data={data.monthlyExpenses} />
                </Card>
                <Card title="5 อันดับรถที่ซ่อมบ่อยที่สุด">
                    <table className="w-full text-base">
                        <thead><tr className="border-b border-white/20"><th className="text-left font-medium pb-2">ทะเบียนรถ</th><th className="text-right font-medium pb-2">จำนวน (ครั้ง)</th></tr></thead>
                        <tbody>
                            {data.topVehicles.map(v => (
                                <tr key={v.plate} className="border-b border-white/20 last:border-b-0"><td className="py-3 font-semibold">{v.plate}</td><td className="py-3 text-right font-bold">{v.count}</td></tr>
                            ))}
                            {data.topVehicles.length === 0 && (<tr><td colSpan={2} className="text-center py-6 text-gray-500">ไม่มีข้อมูล</td></tr>)}
                        </tbody>
                    </table>
                </Card>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card title="ประสิทธิภาพการซ่อม (จำนวนงานที่เสร็จสิ้น)" className="lg:col-span-3">
                    <LineChart data={data.dailyCompletions} />
                </Card>
                 <Card title="สัดส่วนการใช้อะไหล่" className="lg:col-span-2">
                    <DonutChart data={data.partUsage} unit="ชิ้น" />
                </Card>
            </div>
        </div>
    );
};

export default Reports;