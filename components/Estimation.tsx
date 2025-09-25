import React, { useMemo } from 'react';
import type { Repair, RepairKPI, EstimationAttempt } from '../types';
import StatCard from './StatCard';
import { formatHoursDescriptive, calculateDurationHours } from '../utils';


interface EstimationProps {
    repairs: Repair[];
    kpiData: RepairKPI[];
}

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
                 relevantEstimation = [...r.estimations].sort((a,b) => b.sequence - a.sequence)[0];
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
            details: allDetailedEstimations.sort((a,b) => Math.abs(b.deviationHours) - Math.abs(a.deviationHours)),
        };
    }, [repairs]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="จำนวนงานที่เสร็จสิ้น" value={estimationData.totalJobsWithEstimation} theme="blue" />
                <StatCard 
                    title="ความแม่นยำในการประเมิน" 
                    value={`${estimationData.accuracy.toFixed(1)}%`} 
                    theme="green" 
                    trend="งานที่เสร็จตรงเวลาหรือเร็วกว่า"
                />
                 <StatCard 
                    title="ส่วนต่างเวลาเฉลี่ย" 
                    value={`${estimationData.avgDeviationHours >= 0 ? '+' : ''}${formatHoursDescriptive(estimationData.avgDeviationHours)}`} 
                    theme={Math.abs(estimationData.avgDeviationHours) > 1 ? 'red' : 'purple'}
                    trend={estimationData.avgDeviationHours > 0 ? 'ช้ากว่าที่ประเมิน' : 'เร็วกว่าที่ประเมิน'}
                />
                <StatCard 
                    title="เวลาซ่อมเฉลี่ย" 
                    value={formatHoursDescriptive(estimationData.avgActualHours)} 
                    theme="yellow"
                    trend="เวลาที่ใช้จริงต่อ 1 งาน"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใบซ่อม / ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อาการ</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">เวลาประเมิน</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">เวลาจริง</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ส่วนต่าง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {estimationData.details.map(item => (
                            <tr key={item.repairOrderNo}>
                                <td className="px-4 py-3"><div className="font-semibold">{item.repairOrderNo}</div><div className="text-sm text-gray-500">{item.licensePlate}</div></td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate" title={item.problemDescription}>{item.problemDescription}</td>
                                <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                                    {formatHoursDescriptive(item.estimatedHours)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold">{formatHoursDescriptive(item.actualHours)}</td>
                                <td className={`px-4 py-3 text-right text-sm font-bold ${item.deviationHours > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {item.deviationHours >= 0 ? '+' : ''}{formatHoursDescriptive(item.deviationHours)}
                                </td>
                                <td className="px-4 py-3">
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.deviationHours <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.deviationHours <= 0 ? 'ตรงเวลา' : 'ช้ากว่ากำหนด'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                         {estimationData.details.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    ไม่มีข้อมูลการซ่อมที่เสร็จสมบูรณ์เพื่อวิเคราะห์
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Estimation;