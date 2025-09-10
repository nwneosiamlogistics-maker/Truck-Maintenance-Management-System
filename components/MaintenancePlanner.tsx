import React, { useState, useMemo } from 'react';
import StatCard from './StatCard';
import type { MaintenancePlan } from '../types';
import MaintenancePlanModal from './MaintenancePlanModal';

interface MaintenancePlannerProps {
    plans: MaintenancePlan[];
    addPlan: (plan: Omit<MaintenancePlan, 'id'>) => void;
}

const unitMap = {
    days: 'วัน',
    weeks: 'สัปดาห์',
    months: 'เดือน',
};

const calculatePlanDetails = (plan: MaintenancePlan) => {
    const lastService = new Date(plan.lastServiceDate);
    // Adjust for timezone to prevent date shifts
    lastService.setMinutes(lastService.getMinutes() + lastService.getTimezoneOffset());
    
    let nextDueDate = new Date(lastService);
    let totalPeriodDays = 0;

    switch (plan.frequencyUnit) {
        case 'days':
            nextDueDate.setDate(lastService.getDate() + plan.frequencyValue);
            totalPeriodDays = plan.frequencyValue;
            break;
        case 'weeks':
            nextDueDate.setDate(lastService.getDate() + plan.frequencyValue * 7);
            totalPeriodDays = plan.frequencyValue * 7;
            break;
        case 'months':
            nextDueDate.setMonth(lastService.getMonth() + plan.frequencyValue);
            // Recalculate the difference in days for progress bar accuracy
            totalPeriodDays = Math.round((nextDueDate.getTime() - lastService.getTime()) / (1000 * 3600 * 24));
            break;
    }
    
    return {
        ...plan,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        nextDueMileage: plan.lastServiceMileage + plan.mileageFrequency,
        frequencyText: `ทุก ${plan.frequencyValue} ${unitMap[plan.frequencyUnit]} / ${plan.mileageFrequency.toLocaleString()} กม.`,
        totalPeriodDays,
    };
};

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ plans, addPlan }) => {
    
    const [isModalOpen, setModalOpen] = useState(false);

    const processedPlans = useMemo(() => {
        return plans.map(calculatePlanDetails).sort((a,b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    }, [plans]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getMaintenanceStatus = (dueDate: string) => {
        const nextDueDate = new Date(dueDate);
        nextDueDate.setHours(0, 0, 0, 0);

        const timeDiff = nextDueDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let status: 'เกินกำหนด' | 'ใกล้ถึง' | 'ปกติ';
        let statusText: string;

        if (daysRemaining < 0) {
            status = 'เกินกำหนด';
            statusText = `เกินมา ${Math.abs(daysRemaining)} วัน`;
        } else if (daysRemaining <= 7) {
            status = 'ใกล้ถึง';
            statusText = `เหลือ ${daysRemaining} วัน`;
        } else {
            status = 'ปกติ';
            statusText = `เหลือ ${daysRemaining} วัน`;
        }

        return { daysRemaining, status, statusText };
    };

    const getStatusBadge = (status: string) => {
        if (status === 'ใกล้ถึง') return 'bg-yellow-100 text-yellow-800';
        if (status === 'เกินกำหนด') return 'bg-red-100 text-red-800';
        return 'bg-green-100 text-green-800';
    };

    const getRemainingBarColor = (status: string) => {
        if (status === 'เกินกำหนด') return 'bg-red-500';
        if (status === 'ใกล้ถึง') return 'bg-yellow-500';
        return 'bg-green-500';
    };
    
    const stats = processedPlans.reduce((acc, item) => {
        const { status } = getMaintenanceStatus(item.nextDueDate);
        if (status === 'ใกล้ถึง') acc.approaching++;
        if (status === 'เกินกำหนด') acc.overdue++;
        return acc;
    }, { approaching: 0, overdue: 0 });

    return (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard title="แผนทั้งหมด" value={processedPlans.length} bgColor="bg-blue-50" textColor="text-blue-600" />
                    <StatCard title="ใกล้ถึงกำหนด" value={stats.approaching} bgColor="bg-yellow-50" textColor="text-yellow-600" />
                    <StatCard title="เกินกำหนด" value={stats.overdue} bgColor="bg-red-50" textColor="text-red-600" />
                    <StatCard title="ความสอดคล้อง" value="95%" bgColor="bg-green-50" textColor="text-green-600" />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">แผนการบำรุงรักษา (ตามกำหนดเวลา)</h2>
                        <button onClick={() => setModalOpen(true)} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            + เพิ่มแผนใหม่
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">แผนการบำรุงรักษา</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">กำหนดการครั้งถัดไป</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">เป้าหมาย (กม.)</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">เวลาคงเหลือ</th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {processedPlans.map(item => {
                                    const { daysRemaining, status, statusText } = getMaintenanceStatus(item.nextDueDate);
                                    const progressPercentage = item.totalPeriodDays > 0
                                        ? Math.min(100, Math.max(0, (daysRemaining / item.totalPeriodDays) * 100))
                                        : 0;
                                    
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4"><div className="text-base font-semibold">{item.vehicleLicensePlate}</div></td>
                                            <td className="px-6 py-4">
                                                <div className="text-base font-medium">{item.planName}</div>
                                                <div className="text-sm text-gray-500">{item.frequencyText}</div>
                                            </td>
                                            <td className="px-6 py-4 text-base">
                                                {new Date(item.nextDueDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-base font-semibold">{item.nextDueMileage.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-3">
                                                        <div 
                                                            className={`${getRemainingBarColor(status)} h-2.5 rounded-full`} 
                                                            style={{ width: `${status === 'เกินกำหนด' ? '0' : progressPercentage}%`}}>
                                                        </div>
                                                    </div>
                                                    <span className={`text-base font-semibold w-28 text-right ${status === 'เกินกำหนด' ? 'text-red-600' : 'text-gray-700'}`}>{statusText}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(status)}`}>{status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isModalOpen && (
                <MaintenancePlanModal 
                    onClose={() => setModalOpen(false)}
                    onAddPlan={addPlan}
                />
            )}
        </>
    );
};

export default MaintenancePlanner;