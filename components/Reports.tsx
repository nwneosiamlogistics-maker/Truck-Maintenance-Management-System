

import React, { useMemo } from 'react';
import type { Report, Repair, StockItem, Technician } from '../types';
import StatCard from './StatCard';

interface ReportsProps {
    repairs: Repair[];
    stock: StockItem[];
    technicians: Technician[];
}

const Reports: React.FC<ReportsProps> = ({ repairs, stock, technicians }) => {

    const repairStats = useMemo(() => {
        const safeRepairs = Array.isArray(repairs) ? repairs : [];
        const totalRepairs = safeRepairs.length;

        const totalCost = safeRepairs.reduce((acc, r) => {
            const repairParts = Array.isArray(r.parts) ? r.parts : [];
            const partsCost = repairParts.reduce((pAcc, p) => pAcc + (p.quantity * p.unitPrice), 0);
            return acc + (r.repairCost || 0) + partsCost;
        }, 0);

        const repairsByType = safeRepairs.reduce((acc, r) => {
            acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const repairsByVehicle = safeRepairs.reduce((acc, r) => {
            acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostCommonRepair = Object.entries(repairsByType).sort((a, b) => b[1] - a[1])[0];
        const busiestVehicle = Object.entries(repairsByVehicle).sort((a, b) => b[1] - a[1])[0];

        return {
            totalRepairs,
            totalCost,
            avgCost: totalRepairs > 0 ? (totalCost / totalRepairs) : 0,
            mostCommonRepair: mostCommonRepair ? `${mostCommonRepair[0]} (${mostCommonRepair[1]} ครั้ง)` : 'N/A',
            busiestVehicle: busiestVehicle ? `${busiestVehicle[0]} (${busiestVehicle[1]} ครั้ง)` : 'N/A',
            repairsByType: Object.entries(repairsByType).sort((a,b) => b[1] - a[1]),
            repairsByDispatch: safeRepairs.reduce((acc, r) => {
                // Infer dispatch type for older records that might not have it set
                const dispatchType = r.dispatchType || (r.externalTechnicianName ? 'ภายนอก' : 'ภายใน');
                acc[dispatchType] = (acc[dispatchType] || 0) + 1;
                return acc;
            }, {} as Record<'ภายใน' | 'ภายนอก', number>),
        }
    }, [repairs]);
    
    const stockStats = useMemo(() => {
        const safeStock = Array.isArray(stock) ? stock : [];
        const totalStockValue = safeStock.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        return { totalStockValue };
    }, [stock]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard title="งานซ่อมทั้งหมด" value={repairStats.totalRepairs} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="ค่าใช้จ่ายซ่อมรวม" value={`${repairStats.totalCost.toLocaleString()} ฿`} bgColor="bg-red-50" textColor="text-red-600" />
                <StatCard title="ค่าใช้จ่ายเฉลี่ย" value={`${repairStats.avgCost.toLocaleString('en-US', {maximumFractionDigits: 0})} ฿`} bgColor="bg-yellow-50" textColor="text-yellow-600" />
                <StatCard title="รถซ่อมบ่อยสุด" value={repairStats.busiestVehicle.split(' ')[0]} bgColor="bg-purple-50" textColor="text-purple-600" />
                <StatCard title="มูลค่าสต๊อกรวม" value={`${stockStats.totalStockValue.toLocaleString()} ฿`} bgColor="bg-emerald-50" textColor="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">ประเภทการซ่อมที่พบบ่อย</h3>
                    <table className="w-full">
                        <thead className="border-b">
                            <tr className="text-left text-sm font-medium text-gray-500">
                                <th className="py-2">ประเภท</th>
                                <th className="py-2 text-right">จำนวน (ครั้ง)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {repairStats.repairsByType.map(([type, count]) => (
                                <tr key={type} className="border-b text-base">
                                    <td className="py-3 font-medium">{type}</td>
                                    <td className="py-3 text-right font-semibold">{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">สถิติการส่งซ่อม</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg">
                            <span className="text-lg font-semibold text-green-800">ซ่อมภายใน</span>
                            <span className="text-2xl font-bold text-green-700">{repairStats.repairsByDispatch['ภายใน'] || 0} ครั้ง</span>
                        </div>
                        <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg">
                            <span className="text-lg font-semibold text-indigo-800">ซ่อมภายนอก</span>
                            <span className="text-2xl font-bold text-indigo-700">{repairStats.repairsByDispatch['ภายนอก'] || 0} ครั้ง</span>
                        </div>
                    </div>
                </div>
            </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">ภาพรวมสต๊อกอะไหล่</h3>
                 <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                         <tr>
                             <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อะไหล่</th>
                             <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">คงเหลือ</th>
                             <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">มูลค่า (บาท)</th>
                             <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                         </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                         {stock.map(item => (
                             <tr key={item.id}>
                                 <td className="px-4 py-3 text-base font-medium">{item.name}</td>
                                 <td className="px-4 py-3 text-right text-base">{item.quantity} {item.unit}</td>
                                 <td className="px-4 py-3 text-right text-base font-semibold">{(item.quantity * item.price).toLocaleString()}</td>
                                 <td className="px-4 py-3 text-base">{item.status}</td>
                             </tr>
                         ))}
                         </tbody>
                         <tfoot className="bg-gray-100 font-bold">
                            <tr>
                                <td colSpan={2} className="px-4 py-3 text-right text-base">มูลค่ารวมทั้งหมด</td>
                                <td className="px-4 py-3 text-right text-lg text-emerald-700">{stockStats.totalStockValue.toLocaleString()}</td>
                                <td className="px-4 py-3 text-base">บาท</td>
                            </tr>
                        </tfoot>
                     </table>
                 </div>
             </div>
        </div>
    );
};

export default Reports;