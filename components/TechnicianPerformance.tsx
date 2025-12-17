import React, { useState, useMemo } from 'react';
import type { Repair, Technician, EstimationAttempt } from '../types';
import { formatHoursToHHMM, formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell, PieChart, Pie, RadialBarChart, RadialBar
} from 'recharts';

interface TechnicianPerformanceProps {
    repairs: Repair[];
    technicians: Technician[];
}

type SortKey = 'name' | 'jobs' | 'avgTime' | 'onTimeRate' | 'value';
type SortOrder = 'asc' | 'desc';
type DateRange = 'all' | '7d' | '30d' | 'this_month' | 'last_month';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TechnicianPerformance: React.FC<TechnicianPerformanceProps> = ({ repairs, technicians }) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [sortBy, setSortBy] = useState<SortKey>('jobs');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const performanceData = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const filteredRepairs = repairs.filter(r => {
            if (r.status !== 'ซ่อมเสร็จ' || !r.repairEndDate) return false;
            const endDate = new Date(r.repairEndDate);
            switch (dateRange) {
                case '7d': return endDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                case '30d': return endDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                case 'this_month': return endDate >= startOfMonth;
                case 'last_month': return endDate >= startOfLastMonth && endDate <= endOfLastMonth;
                case 'all': default: return true;
            }
        });

        const techStats = technicians.map(tech => {
            const techRepairs = filteredRepairs.filter(r => r.assignedTechnicianId === tech.id || (r.assistantTechnicianIds || []).includes(tech.id));
            if (techRepairs.length === 0) return null;

            let totalRepairMillis = 0;
            let onTimeJobs = 0;
            let estimatedJobsCount = 0;

            techRepairs.forEach(r => {
                if (r.repairStartDate && r.repairEndDate) {
                    totalRepairMillis += new Date(r.repairEndDate).getTime() - new Date(r.repairStartDate).getTime();
                }

                let finalEstimation: EstimationAttempt | undefined = (r.estimations || []).find(e => e.status === 'Completed');

                if (!finalEstimation && r.estimations && r.estimations.length > 0) {
                    finalEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
                }

                if (finalEstimation && r.repairEndDate) {
                    estimatedJobsCount++;
                    if (new Date(r.repairEndDate) <= new Date(finalEstimation.estimatedEndDate)) {
                        onTimeJobs++;
                    }
                }
            });

            const totalValue = techRepairs.reduce((sum: number, r) => {
                const partsCost = (r.parts || []).reduce((pSum: number, p) => {
                    const quantity = Number(p.quantity) || 0;
                    const unitPrice = Number(p.unitPrice) || 0;
                    return pSum + (quantity * unitPrice);
                }, 0);
                const repairCost = Number(r.repairCost) || 0;
                const partsVat = Number(r.partsVat) || 0;
                const laborVat = Number(r.laborVat) || 0;
                return sum + repairCost + partsCost + partsVat + laborVat;
            }, 0);

            return {
                id: tech.id,
                name: tech.name,
                jobs: techRepairs.length,
                avgTime: techRepairs.length > 0 ? (totalRepairMillis / techRepairs.length) / (1000 * 60 * 60) : 0,
                onTimeRate: estimatedJobsCount > 0 ? (onTimeJobs / estimatedJobsCount) * 100 : 0,
                value: totalValue,
                fill: COLORS[technicians.indexOf(tech) % COLORS.length] // Assign stable color
            };
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        techStats.sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Calculate Totals/Averages for Cards
        const totalJobs = techStats.reduce((sum, t) => sum + t.jobs, 0);
        const totalValue = filteredRepairs.reduce((sum, r) => { /* ... simplified total value logic ... */
            // Re-implementing simplified total value for speed, better to sum techStats.value but overlaps exist due to assistants?
            // Actually techStats.value sums full repair cost for each tech involved? Might double count.
            // Better to sum distinct repair values from filteredRepairs directly.
            const partsCost = (r.parts || []).reduce((p, item) => p + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
            return sum + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        }, 0);

        const avgOnTime = techStats.length > 0 ? techStats.reduce((sum, t) => sum + t.onTimeRate, 0) / techStats.length : 0;

        return { stats: techStats, kpis: { totalJobs, totalValue, avgOnTime } };

    }, [repairs, technicians, dateRange, sortBy, sortOrder]);


    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const SortableHeader: React.FC<{ headerKey: SortKey, title: string, align?: 'left' | 'right' | 'center' }> = ({ headerKey, title, align = 'left' }) => (
        <th
            className={`px-6 py-4 text-${align} text-sm font-bold text-gray-600 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors duration-200`}
            onClick={() => handleSort(headerKey)}
        >
            <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} gap-1`}>
                <span>{title}</span>
                <span className={`text-gray-400 group-hover:text-blue-500 transition-colors ${sortBy === headerKey ? 'text-blue-600' : ''}`}>
                    {sortBy === headerKey ? (sortOrder === 'desc' ? '↓' : '↑') : '↕'}
                </span>
            </div>
        </th>
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                        Technician Performance
                    </h2>
                    <p className="text-gray-500 mt-1">ติดตามประสิทธิภาพการทำงานและคุณภาพของทีมช่าง</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <span className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">PERIOD:</span>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-1 shadow-lg transform transition hover:-translate-y-1">
                    <div className="bg-white rounded-xl p-5 h-full flex flex-col justify-center items-center text-center">
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-semibold text-gray-400 uppercase mb-2">งานเสร็จสิ้นทั้งหมด</p>
                            <h3 className="text-4xl font-bold text-gray-800">{performanceData.kpis.totalJobs} <span className="text-sm font-normal text-gray-500">งาน</span></h3>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-1 shadow-lg transform transition hover:-translate-y-1">
                    <div className="bg-white rounded-xl p-5 h-full flex flex-col justify-center items-center text-center">
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-semibold text-gray-400 uppercase mb-2">อัตราตรงต่อเวลาเฉลี่ย</p>
                            <h3 className="text-4xl font-bold text-gray-800">{performanceData.kpis.avgOnTime.toFixed(1)} <span className="text-sm font-normal text-gray-500">%</span></h3>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-1 shadow-lg transform transition hover:-translate-y-1">
                    <div className="bg-white rounded-xl p-5 h-full flex flex-col justify-center items-center text-center">
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-semibold text-gray-400 uppercase mb-2">มูลค่าผลงานรวม</p>
                            <h3 className="text-4xl font-bold text-gray-800">{formatCurrency(performanceData.kpis.totalValue)} <span className="text-sm font-normal text-gray-500">บาท</span></h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Job Count Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">🏆 ผลงานรายบุคคล (จำนวนงาน)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData.stats.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="jobs" name="จำนวนงาน" radius={[0, 6, 6, 0]} barSize={24}>
                                    {performanceData.stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* On-Time Rate Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">⚡ อัตราความตรงต่อเวลา (%)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData.stats.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis unit="%" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px' }}
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'On-Time Rate']}
                                />
                                <Bar dataKey="onTimeRate" name="On-Time Rate" radius={[6, 6, 0, 0]} barSize={32}>
                                    {performanceData.stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.onTimeRate >= 80 ? '#10b981' : entry.onTimeRate >= 50 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-slate-800">ตารางข้อมูลละเอียด</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader headerKey="name" title="ชื่อช่าง" />
                                <SortableHeader headerKey="jobs" title="จำนวนงาน" align="center" />
                                <SortableHeader headerKey="avgTime" title="เวลาเฉลี่ย (ชม.)" align="center" />
                                <SortableHeader headerKey="onTimeRate" title="ตรงเวลา (%)" align="center" />
                                <SortableHeader headerKey="value" title="มูลค่าผลงาน (บาท)" align="right" />
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {performanceData.stats.map((tech) => (
                                <tr key={tech.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                {tech.name.substring(0, 1)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-gray-900">{tech.name}</div>
                                                <div className="text-xs text-gray-500">Technician</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {tech.jobs}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-600">
                                        {formatHoursToHHMM(tech.avgTime)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div className={`h-2.5 rounded-full ${tech.onTimeRate >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${tech.onTimeRate}%` }}></div>
                                            </div>
                                            <span className="text-sm text-gray-600">{tech.onTimeRate.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-800">
                                        {formatCurrency(tech.value)} บาท
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TechnicianPerformance;
