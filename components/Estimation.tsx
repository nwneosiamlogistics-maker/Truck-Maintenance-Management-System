import React, { useMemo } from 'react';
import type { Repair, EstimationAttempt } from '../types';
import StatCard from './StatCard';
import { formatHoursToHHMM } from '../utils';

interface EstimationProps {
    repairs: Repair[];
}

const Estimation: React.FC<EstimationProps> = ({ repairs }) => {
    const estimationStats = useMemo(() => {
        const safeRepairs = Array.isArray(repairs) ? repairs : [];

        const completedRepairs = safeRepairs.filter(r => 
            r.status === 'ซ่อมเสร็จ' && 
            r.repairStartDate && 
            r.repairEndDate &&
            r.estimations &&
            r.estimations.length > 0
        );

        const list = completedRepairs.flatMap(r => {
            let finalEstimation: EstimationAttempt | undefined = r.estimations.find(e => e.status === 'Completed');
            
            if (!finalEstimation && r.estimations.length > 0) {
                finalEstimation = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
            }
            
            if (!finalEstimation) {
                return []; 
            }

            const estimatedEnd = new Date(finalEstimation.estimatedEndDate).getTime();
            const actualEnd = new Date(r.repairEndDate!).getTime();

            const estimatedStart = new Date(finalEstimation.estimatedStartDate).getTime();
            const actualStart = new Date(r.repairStartDate!).getTime();
            
            const estimatedDuration = estimatedEnd - estimatedStart;
            const actualDuration = actualEnd - actualStart;

            let accuracy: number | null = null;
            if (estimatedDuration > 0) {
                const diff = Math.abs(actualDuration - estimatedDuration);
                accuracy = Math.max(0, (1 - (diff / estimatedDuration))) * 100;
            }

            const isDelayed = actualEnd > estimatedEnd;
            const deviation = actualDuration - estimatedDuration; // Negative means early, positive means late

            const estimatedHours = estimatedDuration / (1000 * 3600);
            const actualHours = actualDuration / (1000 * 3600);

            return [{
                id: `${r.id}-${finalEstimation.sequence}`,
                repairOrderNo: r.repairOrderNo,
                vehicle: r.licensePlate,
                repair: r.problemDescription,
                estimated: `${formatHoursToHHMM(estimatedHours)} (ครั้งที่ ${finalEstimation.sequence})`,
                actual: `${formatHoursToHHMM(actualHours)}`,
                accuracy: accuracy,
                isDelayed,
                deviation,
            }];
        });
        
        if (list.length === 0) {
            return {
                totalEstimations: 0,
                onTime: 0,
                delayed: 0,
                avgAccuracy: 0,
                list: []
            };
        }

        const onTimeCount = list.filter(item => !item.isDelayed).length;
        const totalAccuracy = list.reduce((sum, item) => sum + (item.accuracy || 0), 0);
        
        return {
            totalEstimations: list.length,
            onTime: onTimeCount,
            delayed: list.length - onTimeCount,
            avgAccuracy: list.length > 0 ? totalAccuracy / list.length : 0,
            list,
        };
    }, [repairs]);

    const AccuracyDisplay: React.FC<{ accuracy: number | null, isDelayed: boolean, deviation: number }> = ({ accuracy, isDelayed, deviation }) => {
        if (accuracy === null) return <span className="text-gray-500">-</span>;

        const isEarly = !isDelayed && accuracy < 99.9;
        let colorClass = 'text-gray-700';
        let contextText = '';

        if (isDelayed) {
            colorClass = 'text-red-600';
            contextText = '(ล่าช้า)';
        } else {
            colorClass = 'text-green-600';
            if (isEarly) {
                contextText = '(เร็วกว่า)';
            }
        }

        return (
            <div className={`text-center font-bold ${colorClass}`}>
                <span>{accuracy.toFixed(1)}%</span>
                {contextText && <span className="text-xs font-normal ml-1">{contextText}</span>}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="ประมาณการทั้งหมด" value={estimationStats.totalEstimations} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="ตรงเวลา" value={estimationStats.onTime} bgColor="bg-green-50" textColor="text-green-600" />
                <StatCard title="ล่าช้า" value={estimationStats.delayed} bgColor="bg-red-50" textColor="text-red-600" />
                <StatCard title="ความแม่นยำเฉลี่ย" value={`${estimationStats.avgAccuracy.toFixed(1)}%`} bgColor="bg-indigo-50" textColor="text-indigo-600" />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">รายการประมาณการณ์ (เฉพาะงานที่เสร็จสิ้น)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประมาณการ (ครั้งล่าสุด)</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใช้จริง</th>
                                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase">ความแม่นยำ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {estimationStats.list.length > 0 ? estimationStats.list.map(item => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-base font-semibold">{item.vehicle}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{item.repair}</div>
                                    </td>
                                    <td className="px-6 py-4 text-base">{item.estimated}</td>
                                    <td className="px-6 py-4 text-base">{item.actual}</td>
                                    <td className="px-6 py-4 text-base">
                                        <AccuracyDisplay 
                                            accuracy={item.accuracy} 
                                            isDelayed={item.isDelayed} 
                                            deviation={item.deviation} 
                                        />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">
                                        ยังไม่มีข้อมูลการประมาณการณ์ที่เสร็จสิ้น
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