import React, { useMemo } from 'react';
import type { Repair, EstimationAttempt } from '../types';
import StatCard from './StatCard';
import { formatHoursToHHMM } from '../utils';

interface EstimationProps {
    repairs: Repair[];
}

const Estimation: React.FC<EstimationProps> = ({ repairs }) => {

    const estimationData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate && r.repairStartDate);

        const allDetailedEstimations = completedRepairs.map(r => {
            const finalEstimation = r.estimations?.find(e => e.status === 'Completed') || [...(r.estimations || [])].sort((a, b) => b.sequence - a.sequence)[0];
            const hasValidEstimate = finalEstimation && finalEstimation.estimatedLaborHours > 0 && finalEstimation.estimatedEndDate;
            
            const actualMillis = new Date(r.repairEndDate!).getTime() - new Date(r.repairStartDate!).getTime();
            
            if (hasValidEstimate) {
                const estimatedMillis = finalEstimation.estimatedLaborHours * 60 * 60 * 1000;
                const deviationMillis = actualMillis - estimatedMillis;
                const isOnTime = new Date(r.repairEndDate!) <= new Date(finalEstimation.estimatedEndDate);

                return {
                    repairOrderNo: r.repairOrderNo,
                    licensePlate: r.licensePlate,
                    problemDescription: r.problemDescription,
                    estimatedHours: finalEstimation.estimatedLaborHours,
                    actualHours: actualMillis / (1000 * 60 * 60),
                    deviationHours: deviationMillis / (1000 * 60 * 60),
                    isOnTime,
                    isValid: true,
                };
            } else {
                 return {
                    repairOrderNo: r.repairOrderNo,
                    licensePlate: r.licensePlate,
                    problemDescription: r.problemDescription,
                    estimatedHours: 0,
                    actualHours: actualMillis / (1000 * 60 * 60),
                    deviationHours: null,
                    isOnTime: null,
                    isValid: false,
                };
            }
        });

        // Filter for valid estimations to be used in KPI calculations
        const validEstimations = allDetailedEstimations.filter(e => e.isValid);

        const totalCount = validEstimations.length;
        const onTimeCount = validEstimations.filter(e => e.isOnTime).length;
        const totalDeviationMillis = validEstimations.reduce((acc, e) => acc + (e.deviationHours! * 1000 * 60 * 60), 0);
        
        const accuracyRate = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0;
        const avgDeviationHours = totalCount > 0 ? (totalDeviationMillis / totalCount) / (1000 * 60 * 60) : 0;

        return {
            totalCount,
            accuracyRate,
            avgDeviationHours,
            details: allDetailedEstimations.sort((a,b) => {
                const absA = a.deviationHours !== null ? Math.abs(a.deviationHours) : -1;
                const absB = b.deviationHours !== null ? Math.abs(b.deviationHours) : -1;
                return absB - absA;
            }),
        };

    }, [repairs]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="จำนวนงานที่ประเมิน" value={estimationData.totalCount} theme="blue" />
                <StatCard title="ความแม่นยำ (ตรงเวลา)" value={`${estimationData.accuracyRate.toFixed(1)}%`} theme="green" trend={estimationData.accuracyRate >= 80 ? 'เป้าหมายสำเร็จ' : 'ต่ำกว่าเป้าหมาย (80%)'} />
                <StatCard 
                    title="ค่าเบี่ยงเบนเฉลี่ย" 
                    value={`${estimationData.avgDeviationHours >= 0 ? '+' : ''}${formatHoursToHHMM(estimationData.avgDeviationHours)}`} 
                    theme={Math.abs(estimationData.avgDeviationHours) > 2 ? 'red' : 'yellow'}
                    trend={estimationData.avgDeviationHours > 0 ? 'ช้ากว่าประมาณ' : 'เร็วกว่าประมาณ'}
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
                                <td className="px-4 py-3 text-right text-sm">
                                    {item.isValid ? formatHoursToHHMM(item.estimatedHours) : <span className="text-gray-500 italic">ไม่ได้ประเมิน</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-sm">{formatHoursToHHMM(item.actualHours)}</td>
                                <td className={`px-4 py-3 text-right text-sm font-bold ${!item.isValid ? 'text-gray-500' : (item.deviationHours! > 0 ? 'text-red-600' : 'text-green-600')}`}>
                                    {item.isValid ? `${item.deviationHours! >= 0 ? '+' : ''}${formatHoursToHHMM(item.deviationHours!)}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {item.isValid ? (
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isOnTime ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.isOnTime ? 'ตรงเวลา' : 'ล่าช้า'}
                                        </span>
                                    ) : (
                                        <span className="text-gray-500">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {estimationData.details.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    ไม่มีข้อมูลการประเมินที่เสร็จสมบูรณ์
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