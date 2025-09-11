import React, { useMemo } from 'react';
import type { Repair } from '../types';
import StatCard from './StatCard';

interface EstimationProps {
    repairs: Repair[];
}

const Estimation: React.FC<EstimationProps> = ({ repairs }) => {
    const estimationStats = useMemo(() => {
        const estimatedRepairs = repairs.filter(r => 
            r.status === 'ซ่อมเสร็จ' && 
            r.estimatedStartDate && r.estimatedEndDate &&
            r.repairStartDate && r.repairEndDate
        );

        if (estimatedRepairs.length === 0) {
            return {
                totalEstimations: 0,
                onTime: 0,
                delayed: 0,
                avgAccuracy: 0,
                list: []
            };
        }

        let totalAccuracy = 0;
        let onTimeCount = 0;

        const list = estimatedRepairs.map(r => {
            const estimatedStart = new Date(r.estimatedStartDate!).getTime();
            const estimatedEnd = new Date(r.estimatedEndDate!).getTime();
            const actualStart = new Date(r.repairStartDate!).getTime();
            const actualEnd = new Date(r.repairEndDate!).getTime();

            const estimatedDuration = estimatedEnd - estimatedStart;
            const actualDuration = actualEnd - actualStart;

            let accuracy: number | null = null;
            if (estimatedDuration > 0) {
                const diff = Math.abs(actualDuration - estimatedDuration);
                accuracy = Math.max(0, (1 - (diff / estimatedDuration))) * 100;
                totalAccuracy += accuracy;
            }

            const isDelayed = actualEnd > estimatedEnd;
            if (!isDelayed) {
                onTimeCount++;
            }

            return {
                id: r.id,
                repairOrderNo: r.repairOrderNo,
                vehicle: r.licensePlate,
                repair: r.problemDescription,
                estimated: `${(estimatedDuration / (1000 * 3600)).toFixed(1)} ชั่วโมง`,
                actual: `${(actualDuration / (1000 * 3600)).toFixed(1)} ชั่วโมง`,
                accuracy: accuracy,
                status: r.status,
            };
        });

        return {
            totalEstimations: estimatedRepairs.length,
            onTime: onTimeCount,
            delayed: estimatedRepairs.length - onTimeCount,
            avgAccuracy: estimatedRepairs.length > 0 ? totalAccuracy / estimatedRepairs.length : 0,
            list,
        };
    }, [repairs]);

    const getAccuracyColor = (accuracy: number | null) => {
        if (accuracy === null) return 'text-gray-500';
        if (accuracy >= 90) return 'text-green-600';
        if (accuracy >= 80) return 'text-yellow-600';
        return 'text-red-600';
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">รายการประมาณการณ์</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประมาณการ</th>
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
                                    <td className={`px-6 py-4 text-base text-center font-bold ${getAccuracyColor(item.accuracy)}`}>{item.accuracy ? `${item.accuracy.toFixed(1)}%` : '-'}</td>
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