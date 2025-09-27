import React, { useState, useMemo } from 'react';
import type { Repair, Technician, EstimationAttempt } from '../types';
import StatCard from './StatCard';
import { formatHoursToHHMM } from '../utils';

interface TechnicianPerformanceProps {
    repairs: Repair[];
    technicians: Technician[];
}

type SortKey = 'name' | 'jobs' | 'avgTime' | 'onTimeRate' | 'value';
type SortOrder = 'asc' | 'desc';
type DateRange = 'all' | '7d' | '30d' | 'this_month' | 'last_month';

const BarChart: React.FC<{ title: string, data: { label: string, value: number, formattedValue: string }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map(item => (
                    <div key={item.label} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-semibold text-gray-600 truncate">{item.label}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                            <div
                                className="bg-blue-500 h-6 rounded-full flex items-center justify-end px-2"
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            >
                                <span className="text-white text-xs font-bold">{item.formattedValue}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
                value: totalValue
            };
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        techStats.sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        const totalJobs = techStats.reduce((sum, t) => sum + t.jobs, 0);

        const totalValue = filteredRepairs.reduce((sum: number, r) => {
            const repairParts = Array.isArray(r.parts) ? r.parts : [];
            const partsCost = repairParts.reduce((pSum: number, p) => {
                return pSum + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
            }, 0);
            const repairVat = Number(r.partsVat) || 0;
            const laborCost = Number(r.repairCost) || 0;
            const laborVat = Number(r.laborVat) || 0;
            return sum + partsCost + laborCost + repairVat + laborVat;
        }, 0);
        
        const overallAvgTime = totalJobs > 0 ? techStats.reduce((sum: number, t) => sum + (t.avgTime * t.jobs), 0) / totalJobs : 0;
        
        const totalWeightedOnTime = techStats.reduce((sum: number, t) => {
            const techRepairs = filteredRepairs.filter(r => r.assignedTechnicianId === t.id || (r.assistantTechnicianIds || []).includes(t.id));
            const estimatedJobsCount = techRepairs.filter(r => {
                let finalEstimation = (r.estimations || []).find(e => e.status === 'Completed');
                if (!finalEstimation && r.estimations && r.estimations.length > 0) {
                     finalEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
                }
                return !!finalEstimation;
            }).length;
            
            return sum + (t.onTimeRate * estimatedJobsCount / 100);
        }, 0);

        const totalEstimatedJobs = techStats.reduce((sum: number, t) => {
             const techRepairs = filteredRepairs.filter(r => r.assignedTechnicianId === t.id || (r.assistantTechnicianIds || []).includes(t.id));
             return sum + techRepairs.filter(r => {
                let finalEstimation = (r.estimations || []).find(e => e.status === 'Completed');
                if (!finalEstimation && r.estimations && r.estimations.length > 0) {
                     finalEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
                }
                return !!finalEstimation;
            }).length;
        }, 0);

        const overallOnTimeRate = totalEstimatedJobs > 0 ? (totalWeightedOnTime / totalEstimatedJobs) * 100 : 0;


        return {
            stats: techStats,
            kpis: {
                totalJobs,
                totalValue,
                avgTime: overallAvgTime,
                onTimeRate: overallOnTimeRate
            }
        };

    }, [repairs, technicians, dateRange, sortBy, sortOrder]);

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const SortableHeader: React.FC<{ headerKey: SortKey, title: string }> = ({ headerKey, title }) => (
        <th
            className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase cursor-pointer"
            onClick={() => handleSort(headerKey)}
        >
            <div className="flex items-center">
                <span>{title}</span>
                {sortBy === headerKey && <span className="ml-2">{sortOrder === 'desc' ? '▼' : '▲'}</span>}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">สรุปประสิทธิภาพทีมช่าง</h2>
                <div className="flex items-center gap-2">
                    <label htmlFor="date-range-filter" className="font-medium text-gray-700 text-base">ช่วงเวลา:</label>
                    <select id="date-range-filter" value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="p-2 border border-gray-300 rounded-lg text-base">
                        <option value="7d">7 วันล่าสุด</option>
                        <option value="30d">30 วันล่าสุด</option>
                        <option value="this_month">เดือนนี้</option>
                        <option value="last_month">เดือนที่แล้ว</option>
                        <option value="all">ทั้งหมด</option>
                    </select>
                </div>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="งานเสร็จสิ้นทั้งหมด" value={performanceData.kpis.totalJobs} theme="blue" />
                <StatCard title="เวลาซ่อมเฉลี่ย" value={formatHoursToHHMM(performanceData.kpis.avgTime)} theme="yellow" />
                <StatCard title="อัตราตรงต่อเวลา" value={`${performanceData.kpis.onTimeRate.toFixed(1)}%`} theme="green" />
                <StatCard title="มูลค่าซ่อมรวม" value={`${performanceData.kpis.totalValue.toLocaleString()} ฿`} theme="purple" />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart
                    title="จำนวนงานที่เสร็จสิ้น (รายบุคคล)"
                    data={performanceData.stats.slice(0, 5).map(t => ({ label: t.name, value: t.jobs, formattedValue: `${t.jobs} งาน` }))}
                />
                <BarChart
                    title="เวลาซ่อมเฉลี่ย (รายบุคคล)"
                    data={performanceData.stats.slice(0, 5).map(t => ({ label: t.name, value: t.avgTime, formattedValue: formatHoursToHHMM(t.avgTime) }))}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader headerKey="name" title="ชื่อช่าง" />
                            <SortableHeader headerKey="jobs" title="งานที่เสร็จสิ้น" />
                            <SortableHeader headerKey="avgTime" title="เวลาซ่อมเฉลี่ย (ชม:นาที)" />
                            <SortableHeader headerKey="onTimeRate" title="อัตราตรงต่อเวลา" />
                            <SortableHeader headerKey="value" title="มูลค่าซ่อมรวม (บาท)" />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {performanceData.stats.map(tech => (
                            <tr key={tech.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-base">{tech.name}</td>
                                <td className="px-6 py-4 text-base">{tech.jobs}</td>
                                <td className="px-6 py-4 text-base">{formatHoursToHHMM(tech.avgTime)}</td>
                                <td className="px-6 py-4 text-base">{tech.onTimeRate.toFixed(1)}%</td>
                                <td className="px-6 py-4 text-base font-bold">{tech.value.toLocaleString()}</td>
                            </tr>
                        ))}
                         {performanceData.stats.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TechnicianPerformance;
