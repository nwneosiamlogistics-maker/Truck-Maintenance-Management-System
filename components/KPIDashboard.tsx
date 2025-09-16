import React, { useMemo } from 'react';
import type { Repair } from '../types';
import StatCard from './StatCard';
import { formatHoursToHHMM } from '../utils';

interface KPIDashboardProps {
    repairs: Repair[];
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ repairs }) => {
    const kpiData = useMemo(() => {
        const completedRepairs = (Array.isArray(repairs) ? repairs : []).filter(
            r => r.status === 'ซ่อมเสร็จ' && r.repairStartDate && r.repairEndDate && r.createdAt
        );

        if (completedRepairs.length === 0) {
            return {
                mttr: 0,
                avgDowntime: 0,
                avgCost: 0,
                vehicleDowntime: [],
            };
        }

        // 1. MTTR (Mean Time To Repair)
        const totalRepairTime = completedRepairs.reduce((acc, r) => {
            const startTime = new Date(r.repairStartDate!).getTime();
            const endTime = new Date(r.repairEndDate!).getTime();
            return acc + (endTime - startTime);
        }, 0);
        const mttrHours = totalRepairTime / completedRepairs.length / (1000 * 60 * 60);

        // 2. Average Downtime
        const totalDowntime = completedRepairs.reduce((acc, r) => {
            const createTime = new Date(r.createdAt).getTime();
            const endTime = new Date(r.repairEndDate!).getTime();
            return acc + (endTime - createTime);
        }, 0);
        const avgDowntimeHours = totalDowntime / completedRepairs.length / (1000 * 60 * 60);
        
        // 3. Average Cost per Repair
        const totalCost = completedRepairs.reduce((acc, r) => {
            const partsCost = (r.parts || []).reduce((pAcc, p) => pAcc + (p.quantity * p.unitPrice), 0);
            return acc + (r.repairCost || 0) + partsCost + (r.partsVat || 0);
        }, 0);
        const avgCost = totalCost / completedRepairs.length;

        // 4. Downtime per Vehicle (Top 5)
        const downtimeByVehicle: { [key: string]: number } = {};
        repairs.forEach(r => {
             if (r.repairEndDate && r.createdAt) {
                const downtime = new Date(r.repairEndDate).getTime() - new Date(r.createdAt).getTime();
                downtimeByVehicle[r.licensePlate] = (downtimeByVehicle[r.licensePlate] || 0) + downtime;
            }
        });

        const vehicleDowntime = Object.entries(downtimeByVehicle)
            .map(([plate, totalMillis]) => ({
                plate,
                hours: totalMillis / (1000 * 60 * 60),
            }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);

        return {
            mttr: mttrHours,
            avgDowntime: avgDowntimeHours,
            avgCost: avgCost,
            vehicleDowntime: vehicleDowntime,
        };

    }, [repairs]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="MTTR (เวลาซ่อมเฉลี่ย)" 
                    value={formatHoursToHHMM(kpiData.mttr)} 
                    bgColor="bg-blue-50" 
                    textColor="text-blue-600"
                    trend="เป้าหมาย: < 24:00" 
                />
                <StatCard 
                    title="Downtime เฉลี่ย" 
                    value={formatHoursToHHMM(kpiData.avgDowntime)} 
                    bgColor="bg-yellow-50" 
                    textColor="text-yellow-600"
                    trend="เวลาที่รถจอดรอซ่อม" 
                />
                <StatCard 
                    title="ค่าซ่อมเฉลี่ย" 
                    value={`${kpiData.avgCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ฿`} 
                    bgColor="bg-green-50" 
                    textColor="text-green-600"
                    trend="ต่อใบแจ้งซ่อม"
                />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">5 อันดับรถที่ใช้เวลาจอดซ่อม (Downtime) นานที่สุด</h3>
                <div className="space-y-3">
                    {kpiData.vehicleDowntime.map(vehicle => (
                        <div key={vehicle.plate} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-semibold text-gray-600 truncate">{vehicle.plate}</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-6">
                                <div
                                    className="bg-red-500 h-6 rounded-full flex items-center justify-end px-2"
                                    style={{ width: `${(vehicle.hours / Math.max(...kpiData.vehicleDowntime.map(v => v.hours), 1)) * 100}%` }}
                                >
                                    <span className="text-white text-xs font-bold">{formatHoursToHHMM(vehicle.hours)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                     {kpiData.vehicleDowntime.length === 0 && (
                        <p className="text-center text-gray-500 py-4">ยังไม่มีข้อมูลเพียงพอสำหรับแสดงผล</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KPIDashboard;