
import React, { useState, useMemo } from 'react';
import type { Repair, StockItem, Technician } from '../types';

import { formatCurrency } from '../utils';

// --- Reusable Chart Components ---

const HorizontalBarChart = ({ data }: { data: { label: string, value: number }[] }) => {
    if (!data || data.length === 0) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูล</div>;
    const maxValue = Math.max(...data.map(d => d.value), 0);

    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-2/5 text-gray-600 font-medium truncate text-right" title={item.label}>
                        {item.label}
                    </div>
                    <div className="w-3/5">
                        <div className="bg-gray-200 rounded-full h-6 relative">
                            <div
                                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-6 rounded-full flex items-center justify-end px-2"
                                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                            >
                                <span className="text-white text-xs font-bold">{item.value.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


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
                        <line x2={chartWidth} stroke="rgba(0,0,0,0.05)" />
                        <text x="-10" dy=".32em" textAnchor="end" className="text-xs fill-current text-gray-600">
                            {label.value > 1000 ? `${(label.value / 1000).toFixed(0)}k` : formatCurrency(label.value)}
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
                                <title>{d.label}: {formatCurrency(d.value)}</title>
                            </rect>
                            <text x={xScale / 2} y={chartHeight - barHeight - 8} textAnchor="middle" className="text-xs font-semibold fill-current text-gray-700">
                                {d.value > 1000 ? `${(d.value / 1000).toFixed(1)}k` : formatCurrency(d.value)}
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

const DonutChart = ({ data, unit = 'รายการ' }: { data: { label: string, value: number }[], unit?: string }) => {
    const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#84cc16', '#14b8a6'];
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
                                <title>{d.label}: {d.value.toLocaleString()} ({(percentage * 100).toFixed(1)}%)</title>
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
                                <line x2={chartWidth} stroke="rgba(0,0,0,0.05)" />
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

const MixedBarLineChart = ({ data }: { data: { label: string; count: number; avgCost: number }[] }) => {
    if (!data || data.length === 0) return <div className="text-center text-gray-500 py-10">ไม่มีข้อมูล</div>;

    const width = 500;
    const height = 300;
    const margin = { top: 30, right: 50, bottom: 90, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxCount = Math.max(...data.map(d => d.count), 0);
    const maxCost = Math.max(...data.map(d => d.avgCost), 0);

    const yCountScale = chartHeight / (maxCount > 0 ? maxCount : 1);
    const yCostScale = chartHeight / (maxCost > 0 ? maxCost : 1);
    const xScale = chartWidth / data.length;

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * xScale + xScale / 2},${chartHeight - d.avgCost * yCostScale}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
                <linearGradient id="mixedBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <filter id="barShadow" x="-20%" y="-10%" width="140%" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                    <feOffset dx="2" dy="2" result="offsetblur" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {/* Count Y-Axis (Left) */}
                <g>
                    {Array.from({ length: 6 }, (_, i) => {
                        const value = (maxCount / 5) * i;
                        return (
                            <g key={`count-${i}`} transform={`translate(0, ${chartHeight - value * yCountScale})`}>
                                <line x2={chartWidth} stroke="#e5e7eb" strokeDasharray="2,2" />
                                <text x="-8" dy=".32em" textAnchor="end" className="text-xs fill-purple-600 font-semibold">{Math.round(value)}</text>
                            </g>
                        );
                    })}
                    <text transform={`translate(-35, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" className="text-sm fill-purple-600 font-bold">จำนวน (ครั้ง)</text>
                </g>

                {/* Cost Y-Axis (Right) */}
                <g transform={`translate(${chartWidth}, 0)`}>
                    {Array.from({ length: 6 }, (_, i) => {
                        const value = (maxCost / 5) * i;
                        return (
                            <g key={`cost-${i}`} transform={`translate(0, ${chartHeight - value * yCostScale})`}>
                                <text x="8" dy=".32em" textAnchor="start" className="text-xs fill-teal-600 font-semibold">{value > 1000 ? `${(value / 1000).toFixed(0)}k` : Math.round(value)}</text>
                            </g>
                        );
                    })}
                    <text transform={`translate(40, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" className="text-sm fill-teal-600 font-bold">ค่าซ่อมเฉลี่ย (บาท)</text>
                </g>

                {/* Bars (Count) */}
                {data.map((d, i) => (
                    <g key={`bar-${i}`}>
                        <rect
                            x={i * xScale + xScale * 0.15}
                            y={chartHeight - d.count * yCountScale}
                            width={xScale * 0.7}
                            height={d.count * yCountScale}
                            fill="url(#mixedBarGradient)"
                            filter="url(#barShadow)"
                            rx="3"
                        >
                            <title>{d.label} - จำนวน: {d.count} ครั้ง</title>
                        </rect>
                        <text
                            x={i * xScale + xScale / 2}
                            y={chartHeight + 15}
                            transform={`rotate(-45, ${i * xScale + xScale / 2}, ${chartHeight + 15})`}
                            textAnchor="end"
                            className="text-xs fill-gray-600"
                        >
                            {d.label}
                        </text>
                    </g>
                ))}

                {/* Line (Avg Cost) */}
                <path d={linePath} fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                {data.map((d, i) => (
                    <g key={`dot-${i}`}>
                        <circle
                            cx={i * xScale + xScale / 2}
                            cy={chartHeight - d.avgCost * yCostScale}
                            r="4"
                            fill="white"
                            stroke="#14b8a6"
                            strokeWidth="2"
                        >
                            <title>{d.label} - ค่าซ่อมเฉลี่ย: {formatCurrency(d.avgCost)} บาท</title>
                        </circle>
                    </g>
                ))}
            </g>
        </svg>
    );
};


const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
            break;
        case 'purple':
            gradient = 'from-purple-500 to-pink-500';
            iconPath = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
            break;
        case 'orange':
            gradient = 'from-orange-500 to-red-500';
            iconPath = 'M13 10V3L4 14h7v7l9-11h-7z';
            break;
        default: // gray/indigo default
            gradient = 'from-slate-700 to-slate-800';
            iconPath = 'M4 6h16M4 10h16M4 14h16M4 18h16';
    }

    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg hover:transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center`}>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d={iconPath} /></svg>
            </div>
            <p className="text-white/90 font-medium mb-1 relative z-10">{title}</p>
            <h3 className="text-3xl font-extrabold relative z-10">{value}</h3>
            {subtext && <p className="text-sm mt-2 opacity-80 relative z-10">{subtext}</p>}
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white rounded-3xl shadow-sm p-6 border border-slate-100 ${className}`}>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full inline-block"></span>
            {title}
        </h3>
        {children}
    </div>
);

// Helper function
const calculateTotalCost = (repair: Repair): number => {
    const partsCost = (repair.parts || []).reduce((sum: number, part) => {
        return sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
    }, 0);
    return (Number(repair.repairCost) || 0) + partsCost + (Number(repair.partsVat) || 0) + (Number(repair.laborVat) || 0);
};

// Helper to get week number
const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

const Reports: React.FC<{ repairs: Repair[], stock: StockItem[], technicians: Technician[], purchaseOrders?: import('../types').PurchaseOrder[], suppliers?: import('../types').Supplier[] }> = ({ repairs, stock, technicians, purchaseOrders = [], suppliers = [] }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supplierViewMode, setSupplierViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

    const data = useMemo(() => {
        const safeAllRepairs = Array.isArray(repairs) ? repairs : [];
        const safeStock = Array.isArray(stock) ? stock : [];
        const safePOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        // Filter Repairs
        const dateFilteredCreatedRepairs = safeAllRepairs.filter(r => {
            const repairDate = new Date(r.createdAt);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        const dateFilteredCompletedRepairs = safeAllRepairs.filter(r => {
            if (r.status !== 'ซ่อมเสร็จ' || !r.repairEndDate) return false;
            const repairDate = new Date(r.repairEndDate);
            return (!start || repairDate >= start) && (!end || repairDate <= end);
        });

        // Filter Purchase Orders
        const dateFilteredPOs = safePOs.filter(po => {
            // Only count active POs? Or all? Usually 'Ordered' or 'Received'. Let's include everything except Cancelled for now, or just 'Ordered'/'Received'.
            // Assuming 'Ordered' and 'Received' are valid purchases.
            if (po.status === 'Cancelled' || po.status === 'Draft') return false;

            const poDate = new Date(po.orderDate);
            return (!start || poDate >= start) && (!end || poDate <= end);
        });


        // --- Supplier Stats Logic ---
        // Group by Time Period
        const supplierPurchaseOverTime: Record<string, number> = {};

        dateFilteredPOs.forEach(po => {
            const date = new Date(po.orderDate);
            let key = '';

            if (supplierViewMode === 'daily') {
                key = date.toISOString().split('T')[0]; // YYYY-MM-DD
            } else if (supplierViewMode === 'weekly') {
                key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
            } else if (supplierViewMode === 'monthly') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (supplierViewMode === 'yearly') {
                key = `${date.getFullYear()}`;
            }

            supplierPurchaseOverTime[key] = (supplierPurchaseOverTime[key] || 0) + po.totalAmount;
        });

        // Convert to Chart Data
        const supplierTrendData = Object.entries(supplierPurchaseOverTime)
            .map(([key, value]) => ({ label: key, value }))
            .sort((a, b) => a.label.localeCompare(b.label)); // Chronological Sort

        // Format Labels for Display
        const formattedSupplierTrendData = supplierTrendData.map(d => {
            let label = d.label;
            if (supplierViewMode === 'monthly') {
                const [y, m] = d.label.split('-');
                const date = new Date(Number(y), Number(m) - 1);
                label = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            } else if (supplierViewMode === 'daily') {
                const date = new Date(d.label);
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }
            // Weekly and Yearly left as is (YYYY-Www, YYYY) or formatted if needed
            return { label, value: d.value };
        });

        // Top Suppliers
        const supplierStats = dateFilteredPOs.reduce((acc: Record<string, number>, po) => {
            acc[po.supplierName] = (acc[po.supplierName] || 0) + po.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        const topSuppliers = Object.entries(supplierStats)
            .map(([label, value]) => ({ label, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        // --- Stat Cards ---
        const totalRepairs = dateFilteredCreatedRepairs.length;
        const totalCompleted = dateFilteredCompletedRepairs.length;
        const totalCost = dateFilteredCompletedRepairs.reduce((sum, r) => sum + calculateTotalCost(r), 0);
        const avgCost = totalCompleted > 0 ? totalCost / totalCompleted : 0;

        // --- Charts ---
        const commonCategories = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRepairCategories = Object.entries(commonCategories).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5);

        const repairedVehicles = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRepairedVehicles = Object.entries(repairedVehicles).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5);

        const dispatchStats = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            acc[r.dispatchType] = (acc[r.dispatchType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const dispatchData = Object.entries(dispatchStats).map(([label, value]) => ({ label, value: value as number }));

        const repairsByDay = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            const date = new Date(r.repairEndDate!).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const repairTrendData = Object.entries(repairsByDay).map(([date, count]) => ({ date, count: count as number })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const partUsage = dateFilteredCompletedRepairs.reduce((acc: Record<string, number>, r) => {
            (r.parts || []).forEach(p => {
                const category = stock.find(s => s.id === p.partId)?.category || 'อื่นๆ';
                acc[category] = (acc[category] || 0) + p.quantity;
            });
            return acc;
        }, {} as Record<string, number>);
        const partUsageData = Object.entries(partUsage).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5);

        // Corrected logic for monthly expenses
        const monthlyExpenses: Record<string, { value: number, label: string }> = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        safeAllRepairs.filter(r => new Date(r.createdAt) >= sixMonthsAgo && r.status === 'ซ่อมเสร็จ').forEach(r => {
            const date = new Date(r.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            const label = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

            if (!monthlyExpenses[key]) {
                monthlyExpenses[key] = { value: 0, label: label };
            }
            monthlyExpenses[key].value = (monthlyExpenses[key].value || 0) + calculateTotalCost(r);
        });
        const lastSixMonthsExpenses = Object.keys(monthlyExpenses).sort().slice(-6).map(key => ({ label: monthlyExpenses[key].label, value: monthlyExpenses[key].value }));

        const repairsByVehicleType = dateFilteredCompletedRepairs.reduce((acc: Record<string, { count: number; totalCost: number }>, r) => {
            const type = r.vehicleType || 'ไม่ระบุ';
            if (!acc[type]) {
                acc[type] = { count: 0, totalCost: 0 };
            }
            acc[type].count += 1;
            acc[type].totalCost += calculateTotalCost(r);
            return acc;
        }, {} as Record<string, { count: number; totalCost: number }>);

        const vehicleTypeAnalysisData = Object.entries(repairsByVehicleType)
            .map(([label, data]: [string, { count: number; totalCost: number }]) => ({
                label,
                count: data.count,
                avgCost: data.count > 0 ? data.totalCost / data.count : 0,
            }))
            .sort((a, b) => b.count - a.count).slice(0, 7);

        return {
            stats: { totalRepairs, totalCompleted, totalCost, avgCost },
            charts: {
                topRepairCategories,
                topRepairedVehicles,
                dispatchData,
                repairTrendData,
                partUsageData,
                lastSixMonthsExpenses,
                vehicleTypeAnalysisData,
                formattedSupplierTrendData,
                topSuppliers, // New: Top Suppliers
            }
        };
    }, [repairs, stock, startDate, endDate, purchaseOrders, supplierViewMode]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        รายงานและสถิติ (Reports & Statistics)
                    </h2>
                    <p className="text-gray-500 mt-1">ภาพรวมสถิติการซ่อมบำรุงและค่าใช้จ่าย</p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-gray-600">จาก:</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm font-semibold text-gray-600">ถึง:</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard theme="blue" title="งานซ่อมทั้งหมด" value={data.stats.totalRepairs.toLocaleString()} subtext="งาน" />
                <ModernStatCard theme="green" title="งานซ่อมที่เสร็จสิ้น" value={data.stats.totalCompleted.toLocaleString()} subtext="งาน" />
                <ModernStatCard theme="orange" title="ค่าใช้จ่ายรวม" value={`${formatCurrency(data.stats.totalCost)}`} subtext="บาท" />
                <ModernStatCard theme="purple" title="ค่าซ่อมเฉลี่ย" value={`${formatCurrency(data.stats.avgCost)}`} subtext="บาท/งาน" />
            </div>

            {/* Supplier Purchase Analysis Section */}
            <Card title="วิเคราะห์ยอดการสั่งซื้อ (ผู้จำหน่าย)">
                <div className="mb-4 flex flex-wrap gap-2 justify-end">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setSupplierViewMode(mode)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${supplierViewMode === mode
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                        >
                            {mode === 'daily' ? 'รายวัน' : mode === 'weekly' ? 'รายสัปดาห์' : mode === 'monthly' ? 'รายเดือน' : 'รายปี'}
                        </button>
                    ))}
                </div>
                <BarChart data={data.charts.formattedSupplierTrendData} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="5 อันดับผู้จำหน่ายที่มียอดซื้อสูงสุด (บาท)">{<HorizontalBarChart data={data.charts.topSuppliers} />}</Card>
                <Card title="ประเภทการซ่อมที่พบบ่อย">{<HorizontalBarChart data={data.charts.topRepairCategories} />}</Card>
                <Card title="5 อันดับรถที่ซ่อมบ่อยที่สุด">{<HorizontalBarChart data={data.charts.topRepairedVehicles} />}</Card>
                <Card title="สถิติการส่งซ่อม">{<DonutChart data={data.charts.dispatchData} unit="งาน" />}</Card>
                <Card title="สัดส่วนการใช้อะไหล่ (5 อันดับแรก)">{<DonutChart data={data.charts.partUsageData} unit="ชิ้น" />}</Card>
            </div>

            <Card title="ประสิทธิภาพการซ่อม (แนวโน้มงานซ่อมที่เสร็จสิ้น)">
                <LineChart data={data.charts.repairTrendData} />
            </Card>

            <Card title="สรุปค่าใช้จ่ายรายเดือน (6 เดือนล่าสุด)">
                <BarChart data={data.charts.lastSixMonthsExpenses} />
            </Card>

            <Card title="วิเคราะห์การซ่อมตามประเภทรถ (จำนวนครั้ง vs ค่าใช้จ่ายเฉลี่ย)">
                <MixedBarLineChart data={data.charts.vehicleTypeAnalysisData} />
            </Card>
        </div>
    );
};

export default Reports;
