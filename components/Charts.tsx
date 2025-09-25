import React from 'react';
import { formatHoursToHHMM } from '../utils';

// --- Reusable Chart Components ---

// KPICard Component
interface KPICardProps {
    title: string;
    value: string | number;
    target: number;
    lowerIsBetter: boolean;
    unit?: string;
    trend?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, target, lowerIsBetter, unit, trend }) => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
    let status: 'good' | 'warning' | 'bad' = 'good';

    if (lowerIsBetter) {
        if (numericValue > target) status = 'bad';
        else if (numericValue > target * 0.9) status = 'warning';
        else status = 'good';
    } else {
        if (numericValue < target) status = 'bad';
        else if (numericValue < target * 1.1) status = 'warning';
        else status = 'good';
    }

    const theme = {
        good: 'from-green-400 to-emerald-600',
        warning: 'from-yellow-400 to-amber-500',
        bad: 'from-red-400 to-rose-600',
    };

    return (
        <div className={`bg-gradient-to-br ${theme[status]} text-white p-5 rounded-2xl shadow-lg`}>
            <p className="text-base font-medium opacity-80">{title}</p>
            <p className="text-4xl font-bold mt-1">{value} <span className="text-xl">{unit}</span></p>
            {trend && <p className="text-sm opacity-90 mt-2">{trend}</p>}
        </div>
    );
};


// BarChart Component
interface BarChartProps {
    title: string;
    data: { label: string, value: number, formattedValue: string }[];
}

export const BarChart: React.FC<BarChartProps> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.length > 0 ? data.map(item => (
                    <div key={item.label} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-semibold text-gray-600 truncate">{item.label}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                            <div
                                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-6 rounded-full flex items-center justify-end px-2"
                                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                            >
                                <span className="text-white text-xs font-bold">{item.formattedValue}</span>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">ไม่มีข้อมูล</p>}
            </div>
        </div>
    );
};


// PieChart Component
interface PieChartProps {
    title: string;
    data: { name: string, value: number }[];
}

export const PieChart: React.FC<PieChartProps> = ({ title, data }) => {
    const colors = ['#22c55e', '#ef4444', '#3b82f6', '#f97316'];
    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            {total > 0 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    <div className="relative w-40 h-40 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {(() => {
                                let accumulatedAngle = 0;
                                return data.map((d, i) => {
                                    const percentage = total > 0 ? d.value / total : 0;
                                    const angle = percentage * 360;
                                    const x1 = 50 + 50 * Math.cos(accumulatedAngle * Math.PI / 180);
                                    const y1 = 50 + 50 * Math.sin(accumulatedAngle * Math.PI / 180);
                                    accumulatedAngle += angle;
                                    const x2 = 50 + 50 * Math.cos(accumulatedAngle * Math.PI / 180);
                                    const y2 = 50 + 50 * Math.sin(accumulatedAngle * Math.PI / 180);
                                    const largeArcFlag = angle > 180 ? 1 : 0;

                                    return (
                                        <path
                                            key={i}
                                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                            fill={colors[i % colors.length]}
                                        >
                                            <title>{d.name}: {d.value.toLocaleString()} ({ (percentage * 100).toFixed(1) }%)</title>
                                        </path>
                                    );
                                });
                            })()}
                        </svg>
                    </div>
                     <div className="w-full md:w-auto md:max-w-[200px] flex-1">
                        <ul className="space-y-2 text-sm">
                            {data.map((d, i) => (
                                <li key={i} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                                        <span className="truncate" title={d.name}>{d.name}</span>
                                    </div>
                                    <span className="font-semibold">{d.value.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : <p className="text-center text-gray-500 py-4">ไม่มีข้อมูล</p>}
        </div>
    );
};
