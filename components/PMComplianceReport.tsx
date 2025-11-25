
import React, { useState, useMemo } from 'react';
import type { MaintenancePlan, PMHistory, Vehicle } from '../types';
import { PieChart } from './Charts';

interface PMComplianceReportProps {
    plans: MaintenancePlan[];
    history: PMHistory[];
    vehicles: Vehicle[];
}

type ComplianceStatus = 'On Time' | 'Early' | 'Late' | 'Missed' | 'Unknown';

interface ComplianceItem {
    id: string;
    vehicleLicensePlate: string;
    planName: string;
    targetDate: Date;
    targetMileage?: number;
    actualDate?: Date;
    actualMileage?: number;
    status: ComplianceStatus;
    dateDiff?: number; // days
    mileageDiff?: number; // km
}

const PMComplianceReport: React.FC<PMComplianceReportProps> = ({ plans, history, vehicles }) => {
    const now = new Date();
    // Default to current month
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const complianceData = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const results: ComplianceItem[] = [];
        const TOLERANCE_DAYS = 7;
        const TOLERANCE_KM = 2000;

        // 1. Process Historical Records (Completed PMs)
        const relevantHistory = history.filter(h => {
            const serviceDate = new Date(h.serviceDate);
            const targetDate = h.targetServiceDate ? new Date(h.targetServiceDate) : null;
            
            // Include if service date OR target date is in range
            const serviceInRange = serviceDate >= start && serviceDate <= end;
            const targetInRange = targetDate ? (targetDate >= start && targetDate <= end) : false;
            
            return serviceInRange || targetInRange;
        });

        // Keep track of plan occurrences to identify missed ones
        // Key: planId-targetDateString
        const processedPlanOccurrences = new Set<string>();

        relevantHistory.forEach(h => {
            let status: ComplianceStatus = 'Unknown';
            let dateDiff = 0;
            let mileageDiff = 0;

            const actualDate = new Date(h.serviceDate);
            const targetDate = h.targetServiceDate ? new Date(h.targetServiceDate) : null;

            if (targetDate) {
                const timeDiff = actualDate.getTime() - targetDate.getTime();
                dateDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                if (h.targetMileage) {
                    mileageDiff = h.mileage - h.targetMileage;
                }

                // Determine Status Logic
                const isDateOk = Math.abs(dateDiff) <= TOLERANCE_DAYS;
                const isMileageOk = h.targetMileage ? Math.abs(mileageDiff) <= TOLERANCE_KM : true;

                if (isDateOk || (h.targetMileage && Math.abs(mileageDiff) <= TOLERANCE_KM)) {
                    // Relaxed logic: if either date OR mileage is within tolerance, we consider it 'On Time'/Compliant
                    status = 'On Time';
                } else if (dateDiff < -TOLERANCE_DAYS) {
                    status = 'Early';
                } else {
                    status = 'Late';
                }
                
                // Mark this occurrence as processed
                processedPlanOccurrences.add(`${h.maintenancePlanId}-${targetDate.toISOString().split('T')[0]}`);

            } else {
                // No target recorded (legacy data), assume On Time for reporting purposes
                status = 'On Time'; 
            }

            results.push({
                id: h.id,
                vehicleLicensePlate: h.vehicleLicensePlate,
                planName: h.planName,
                targetDate: targetDate || actualDate, // Use actual date for sorting if target missing
                targetMileage: h.targetMileage,
                actualDate: actualDate,
                actualMileage: h.mileage,
                status,
                dateDiff: targetDate ? dateDiff : undefined,
                mileageDiff: h.targetMileage ? mileageDiff : undefined
            });
        });

        // 2. Identify Missed PMs
        // Iterate through all active plans and calculate if they *should* have happened in this window
        const today = new Date();
        plans.forEach(plan => {
            const lastDate = new Date(plan.lastServiceDate);
            let nextServiceDate = new Date(lastDate);
            
            // Calculate next theoretical due date based on current plan settings
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(lastDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(lastDate.getMonth() + plan.frequencyValue);

            // If the calculated next due date falls within the report range
            if (nextServiceDate >= start && nextServiceDate <= end) {
                const dateKey = nextServiceDate.toISOString().split('T')[0];
                
                // Check if we already have a history record that matches this Plan ID and approx Target Date
                // This is a heuristic since we don't have unique instance IDs for recurring plans yet
                // We check if any history record for this plan has a target date matching this calculated date
                const isHandled = Array.from(processedPlanOccurrences).some(key => key === `${plan.id}-${dateKey}`);

                if (!isHandled) {
                    // If date is in the past relative to "Today", it's Missed. 
                    // If it's in the future (but within report range), it's just "Due Soon" (not shown as missed in strict reports usually, but let's show if asked)
                    // Here we interpret "Missed" as overdue and not done.
                    if (nextServiceDate < today) {
                        results.push({
                            id: `missed-${plan.id}-${dateKey}`,
                            vehicleLicensePlate: plan.vehicleLicensePlate,
                            planName: plan.planName,
                            targetDate: nextServiceDate,
                            targetMileage: plan.lastServiceMileage + plan.mileageFrequency,
                            status: 'Missed',
                        });
                    }
                }
            }
        });

        return results
            .filter(r => searchTerm === '' || 
                r.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.planName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => b.targetDate.getTime() - a.targetDate.getTime());

    }, [history, plans, startDate, endDate, searchTerm]);

    const stats = useMemo(() => {
        const counts = {
            'On Time': 0,
            'Early': 0,
            'Late': 0,
            'Missed': 0,
            'Unknown': 0
        };
        complianceData.forEach(d => {
            if (counts[d.status] !== undefined) counts[d.status]++;
        });
        return counts;
    }, [complianceData]);

    const getStatusBadge = (status: ComplianceStatus) => {
        switch (status) {
            case 'On Time': return 'bg-green-100 text-green-800 border border-green-200';
            case 'Early': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'Late': return 'bg-red-100 text-red-800 border border-red-200';
            case 'Missed': return 'bg-gray-200 text-gray-800 border border-gray-300 font-bold';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const StatBox = ({ label, value, color, icon }: { label: string, value: number, color: string, icon: string }) => (
        <div className={`p-4 rounded-xl shadow-sm border-l-4 ${color} bg-white flex-1 min-w-[150px] flex items-center justify-between`}>
            <div>
                <p className="text-gray-500 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
            <div className="text-2xl opacity-50">{icon}</div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
                    <input
                        type="text"
                        placeholder="ทะเบียน, ชื่อแผน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จากวันที่ (เป้าหมาย)</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่ (เป้าหมาย)</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>

            {/* Dashboard Cards */}
            <div className="flex flex-wrap gap-4">
                <StatBox label="ตรงเวลา (On Time)" value={stats['On Time']} color="border-green-500" icon="🟢" />
                <StatBox label="ก่อนกำหนด (Early)" value={stats['Early']} color="border-yellow-500" icon="🟡" />
                <StatBox label="ล่าช้า (Late)" value={stats['Late']} color="border-red-500" icon="🔴" />
                <StatBox label="ไม่ได้ทำ (Missed)" value={stats['Missed']} color="border-gray-500" icon="⚪" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Table Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">รายละเอียดการปฏิบัติตามแผน (Compliance Detail)</h3>
                        <span className="text-xs text-gray-500">จำนวน: {complianceData.length} รายการ</span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">ทะเบียน / แผน</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">เป้าหมาย (Target)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ทำจริง (Actual)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ส่วนต่าง (Variance)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {complianceData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-800">{item.vehicleLicensePlate}</div>
                                            <div className="text-xs text-gray-500 line-clamp-1" title={item.planName}>{item.planName}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            <div className="font-medium text-blue-600">{item.targetDate.toLocaleDateString('th-TH')}</div>
                                            {item.targetMileage && <div className="text-xs text-gray-500">{item.targetMileage.toLocaleString()} กม.</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {item.actualDate ? (
                                                <>
                                                    <div className="font-medium text-gray-800">{item.actualDate.toLocaleDateString('th-TH')}</div>
                                                    {item.actualMileage && <div className="text-xs text-gray-500">{item.actualMileage.toLocaleString()} กม.</div>}
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">- ยังไม่ทำ -</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {item.dateDiff !== undefined ? (
                                                <div className={`${item.dateDiff > 7 ? 'text-red-600 font-bold' : item.dateDiff < -7 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {item.dateDiff > 0 ? `+${item.dateDiff}` : item.dateDiff} วัน
                                                </div>
                                            ) : '-'}
                                            {item.mileageDiff !== undefined && (
                                                <div className={`text-xs ${Math.abs(item.mileageDiff) > 2000 ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {item.mileageDiff > 0 ? `+${item.mileageDiff.toLocaleString()}` : item.mileageDiff.toLocaleString()} กม.
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {complianceData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="lg:col-span-1 space-y-6">
                    <PieChart 
                        title="สัดส่วนสถานะ (Compliance Overview)" 
                        data={[
                            { name: 'On Time', value: stats['On Time'] },
                            { name: 'Early', value: stats['Early'] },
                            { name: 'Late', value: stats['Late'] },
                            { name: 'Missed', value: stats['Missed'] },
                        ].filter(d => d.value > 0)}
                    />
                    
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">เกณฑ์การวัดผล (Evaluation Criteria)</h4>
                        <ul className="text-sm text-blue-800 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">●</span>
                                <div><strong>On Time (ตรงเวลา):</strong> ทำภายใน +/- 7 วัน หรือ +/- 2,000 กม. จากเป้าหมาย</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500 mt-0.5">●</span>
                                <div><strong>Early (ก่อนกำหนด):</strong> ทำก่อนกำหนดเกิน 7 วัน หรือ 2,000 กม.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">●</span>
                                <div><strong>Late (ล่าช้า):</strong> ทำหลังกำหนดเกิน 7 วัน หรือ 2,000 กม.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-500 mt-0.5">●</span>
                                <div><strong>Missed (ไม่ได้ทำ):</strong> เลยกำหนดแล้ว และยังไม่มีการบันทึกประวัติ</div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PMComplianceReport;
