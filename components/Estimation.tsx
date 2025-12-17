import React, { useMemo } from 'react';
import type { Repair, RepairKPI, EstimationAttempt } from '../types';
import { formatHoursDescriptive, calculateDurationHours } from '../utils';

interface EstimationProps {
    repairs: Repair[];
    kpiData: RepairKPI[];
}

// --- Styled Components (Infographic Style) ---

const ModernStatCard = ({ title, value, subtext, theme, icon }: any) => {
    let gradient = '';
    let iconPath = '';
    let textColor = 'text-white';
    let subclass = 'opacity-80';

    switch (theme) {
        case 'blue':
            gradient = 'from-blue-500 to-indigo-600';
            iconPath = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'; // Clipboard
            break;
        case 'green':
            gradient = 'from-emerald-500 to-teal-600';
            iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // Check Circle
            break;
        case 'red': // For negative deviation (or significant deviation)
            gradient = 'from-rose-500 to-pink-600';
            iconPath = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Exclamation
            break;
        case 'yellow':
            gradient = 'from-amber-400 to-orange-500';
            iconPath = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock
            break;
        default:
            gradient = 'from-slate-700 to-slate-800';
            iconPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }

    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg hover:transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full min-h-[160px]`}>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
                <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor"><path d={iconPath} /></svg>
            </div>

            <div className="relative z-10">
                <p className="text-white/90 font-medium mb-2">{title}</p>
                <h3 className="text-4xl font-extrabold tracking-tight mb-1">{value}</h3>
            </div>

            {subtext && (
                <div className={`mt-4 text-sm font-medium ${subclass} relative z-10 border-t border-white/20 pt-2`}>
                    {subtext}
                </div>
            )}
        </div>
    );
};

const Estimation: React.FC<EstimationProps> = ({ repairs }) => {

    const estimationData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : [])
            .filter(r =>
                r.status === 'ซ่อมเสร็จ' &&
                r.repairEndDate &&
                r.repairStartDate
            );

        const allDetailedEstimations = completedRepairs.map(r => {
            const actualHours = calculateDurationHours(r.repairStartDate, r.repairEndDate);

            // Find the most relevant estimation (completed or latest active)
            let relevantEstimation: EstimationAttempt | undefined = (r.estimations || []).find(e => e.status === 'Completed');
            if (!relevantEstimation && r.estimations && r.estimations.length > 0) {
                relevantEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
            }

            if (!relevantEstimation || !relevantEstimation.estimatedStartDate || !relevantEstimation.estimatedEndDate) {
                return null; // Skip if no valid estimation data
            }

            const estimatedHours = calculateDurationHours(relevantEstimation.estimatedStartDate, relevantEstimation.estimatedEndDate);
            const deviationHours = actualHours - estimatedHours;

            return {
                repairOrderNo: r.repairOrderNo,
                licensePlate: r.licensePlate,
                problemDescription: r.problemDescription,
                actualHours,
                estimatedHours,
                deviationHours,
            };
        }).filter((e): e is NonNullable<typeof e> => e !== null);

        const totalJobsWithEstimation = allDetailedEstimations.length;
        if (totalJobsWithEstimation === 0) {
            return {
                totalJobsWithEstimation: 0,
                accuracy: 0,
                avgDeviationHours: 0,
                avgActualHours: 0,
                details: [],
            };
        }

        const onTimeJobs = allDetailedEstimations.filter(e => e.deviationHours <= 0).length;
        const accuracy = (onTimeJobs / totalJobsWithEstimation) * 100;

        const totalDeviationHours = allDetailedEstimations.reduce((acc, e) => acc + e.deviationHours, 0);
        const avgDeviationHours = totalDeviationHours / totalJobsWithEstimation;

        const totalActualHours = allDetailedEstimations.reduce((acc, e) => acc + e.actualHours, 0);
        const avgActualHours = totalActualHours / totalJobsWithEstimation;

        return {
            totalJobsWithEstimation,
            accuracy,
            avgDeviationHours,
            avgActualHours,
            details: allDetailedEstimations.sort((a, b) => Math.abs(b.deviationHours) - Math.abs(a.deviationHours)),
        };
    }, [repairs]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                        วิเคราะห์ประสิทธิภาพ (KPI)
                    </h2>
                    <p className="text-gray-500 mt-1 text-lg">เปรียบเทียบเวลาซ่อมจริงกับเวลาที่ประเมิน</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard
                    title="จำนวนงานที่เสร็จสิ้น"
                    value={estimationData.totalJobsWithEstimation}
                    theme="blue"
                />
                <ModernStatCard
                    title="ความแม่นยำในการประเมิน"
                    value={`${estimationData.accuracy.toFixed(1)}%`}
                    theme="green"
                    subtext="งานที่เสร็จตรงเวลาหรือเร็วกว่า"
                />
                <ModernStatCard
                    title="ส่วนต่างเวลาเฉลี่ย"
                    value={`${estimationData.avgDeviationHours >= 0 ? '+' : ''}${formatHoursDescriptive(estimationData.avgDeviationHours)}`}
                    theme="red"
                    subtext={estimationData.avgDeviationHours > 0 ? 'ช้ากว่าที่ประเมิน' : 'เร็วกว่าที่ประเมิน'}
                />
                <ModernStatCard
                    title="เวลาซ่อมเฉลี่ย"
                    value={formatHoursDescriptive(estimationData.avgActualHours)}
                    theme="yellow"
                    subtext="เวลาที่ใช้จริงต่อ 1 งาน"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-slate-800">รายละเอียดรายใบงาน</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">ใบซ่อม / ทะเบียน</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">อาการ</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-600 uppercase tracking-wider">เวลาประเมิน</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-600 uppercase tracking-wider">เวลาจริง</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-600 uppercase tracking-wider">ส่วนต่าง</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {estimationData.details.map(item => (
                                <tr key={item.repairOrderNo} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-base">{item.repairOrderNo}</div>
                                        <div className="text-sm text-slate-500 mt-0.5">{item.licensePlate}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate font-medium" title={item.problemDescription}>
                                        {item.problemDescription}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-blue-600 whitespace-nowrap">
                                        {formatHoursDescriptive(item.estimatedHours)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-700 whitespace-nowrap">
                                        {formatHoursDescriptive(item.actualHours)}
                                    </td>
                                    <td className={`px-6 py-4 text-right text-sm font-extrabold whitespace-nowrap ${item.deviationHours > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {item.deviationHours >= 0 ? '+' : ''}{formatHoursDescriptive(item.deviationHours)}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block shadow-sm ${item.deviationHours <= 0 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                            {item.deviationHours <= 0 ? 'ตรงเวลา' : 'ช้ากว่ากำหนด'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {estimationData.details.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-400">
                                        ไม่มีข้อมูลการซ่อมที่เสร็จสมบูรณ์เพื่อวิเคราะห์
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Estimation;