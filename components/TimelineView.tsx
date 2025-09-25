
import React, { useMemo } from 'react';
import type { EnrichedPlan } from './PreventiveMaintenance';

interface TimelineViewProps {
    plans: EnrichedPlan[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ plans }) => {

    const months = useMemo(() => {
        const result: { year: number, month: number, label: string }[] = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            result.push({
                year: date.getFullYear(),
                month: date.getMonth(),
                label: date.toLocaleDateString('th-TH-u-ca-buddhist', { month: 'short', year: '2-digit' }),
            });
        }
        return result;
    }, []);

    const formatFrequency = (plan: EnrichedPlan) => {
        const unitMap = { days: 'วัน', weeks: 'สัปดาห์', months: 'เดือน' };
        const timePart = `${plan.frequencyValue} ${unitMap[plan.frequencyUnit]}`;
        const mileagePart = `${plan.mileageFrequency.toLocaleString()} กม.`;
        return `${mileagePart} หรือ ${timePart}`;
    };
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB-u-ca-buddhist', {
            day: '2-digit', month: 'short', year: '2-digit'
        }).replace(/ /g, '-');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm">
            <div className="overflow-auto max-h-[65vh] relative">
                <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-20">
                        <tr>
                            <th className="sticky left-0 bg-gray-100 z-30 p-2 border text-xs w-12">No.</th>
                            <th className="sticky left-12 bg-gray-100 z-30 p-2 border text-xs w-32">Truck ID</th>
                            <th className="p-2 border text-xs w-32">Type</th>
                            <th className="p-2 border text-xs w-32">Brand</th>
                            <th className="p-2 border text-xs w-32">Last Service Date</th>
                            <th className="p-2 border text-xs w-32">Last Service Odometer</th>
                            <th className="p-2 border text-xs w-48">Next Service @</th>
                            <th className="p-2 border text-xs w-48">Remark</th>
                            {months.map(m => (
                                <th key={m.label} className="p-2 border text-xs w-28">{m.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((plan, index) => {
                            const lastServiceDate = new Date(plan.lastServiceDate);
                            
                            return (
                                <tr key={plan.id} className="group hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 p-2 border text-sm text-center">{index + 1}</td>
                                    <td className="sticky left-12 bg-white group-hover:bg-gray-50 z-10 p-2 border text-sm font-semibold">{plan.vehicleLicensePlate}</td>
                                    <td className="p-2 border text-sm">{plan.vehicleType}</td>
                                    <td className="p-2 border text-sm">{plan.vehicleMake}</td>
                                    <td className="p-2 border text-sm">{formatDate(plan.lastServiceDate)}</td>
                                    <td className="p-2 border text-sm text-right">{plan.lastServiceMileage.toLocaleString()}</td>
                                    <td className="p-2 border text-sm">
                                        <div>{plan.nextServiceMileage.toLocaleString()} กม.</div>
                                        <div className="text-xs text-gray-500">({formatFrequency(plan)})</div>
                                    </td>
                                    <td className="p-2 border text-sm">{plan.planName}</td>
                                    {months.map(m => {
                                        const isLastServiceMonth = lastServiceDate.getMonth() === m.month && lastServiceDate.getFullYear() === m.year;
                                        const isNextServiceMonth = plan.nextServiceDate.getMonth() === m.month && plan.nextServiceDate.getFullYear() === m.year;
                                        
                                        return (
                                            <td key={`${plan.id}-${m.label}`} className="p-2 border text-center align-middle">
                                                {isLastServiceMonth && (
                                                    <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                                        {formatDate(plan.lastServiceDate)}
                                                    </span>
                                                )}
                                                {isNextServiceMonth && (
                                                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                                        Next Plan
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                         {plans.length === 0 && (
                            <tr>
                                <td colSpan={8 + months.length} className="text-center py-10 text-gray-500">
                                    ไม่พบข้อมูลแผนซ่อมบำรุง
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimelineView;