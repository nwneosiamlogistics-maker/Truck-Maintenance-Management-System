import React, { useState, useMemo } from 'react';
import type { Repair, Vehicle, PartRequisitionItem } from '../types';
import StatCard from './StatCard';

// Helper function to calculate total cost for a single repair
const calculateTotalCost = (repair: Repair): number => {
    const partsCost = (repair.parts || []).reduce((sum, part) => {
        return sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
    }, 0);
    return (Number(repair.repairCost) || 0) + partsCost + (Number(repair.partsVat) || 0);
};

// Parts Modal Component
const PartsListModal: React.FC<{ parts: PartRequisitionItem[], onClose: () => void }> = ({ parts, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">รายการอะไหล่ที่ใช้</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">รวม</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {parts.map((part, index) => (
                            <tr key={index}>
                                <td className="px-2 py-2">{part.name}</td>
                                <td className="px-2 py-2 text-right">{part.quantity} {part.unit}</td>
                                <td className="px-2 py-2 text-right">{part.unitPrice.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right font-semibold">{(part.quantity * part.unitPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);


// Main Component
interface VehicleRepairHistoryProps {
    repairs: Repair[];
    vehicles: Vehicle[];
}

const VehicleRepairHistory: React.FC<VehicleRepairHistoryProps> = ({ repairs, vehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string | null>(null);
    const [viewingParts, setViewingParts] = useState<PartRequisitionItem[] | null>(null);

    const vehicleStats = useMemo(() => {
        const statsMap = new Map<string, { repairCount: number, totalCost: number }>();
        (Array.isArray(repairs) ? repairs : []).forEach(repair => {
            const currentStats = statsMap.get(repair.licensePlate) || { repairCount: 0, totalCost: 0 };
            currentStats.repairCount += 1;
            currentStats.totalCost += calculateTotalCost(repair);
            statsMap.set(repair.licensePlate, currentStats);
        });

        // Combine with vehicle list to include all vehicles, even those with 0 repairs
        const allVehicleStats = (Array.isArray(vehicles) ? vehicles : []).map(vehicle => {
            const stats = statsMap.get(vehicle.licensePlate) || { repairCount: 0, totalCost: 0 };
            return {
                ...vehicle,
                ...stats,
            };
        });

        return allVehicleStats;
    }, [repairs, vehicles]);

    const filteredVehicles = useMemo(() => {
        if (!searchTerm) return vehicleStats.sort((a, b) => b.totalCost - a.totalCost);
        const lowercasedFilter = searchTerm.toLowerCase();
        return vehicleStats.filter(vehicle =>
            vehicle.licensePlate.toLowerCase().includes(lowercasedFilter)
        ).sort((a, b) => b.totalCost - a.totalCost);
    }, [vehicleStats, searchTerm]);

    const { selectedVehicleRepairs, selectedVehicleInfo, selectedVehicleStats } = useMemo(() => {
        if (!selectedVehiclePlate) return { selectedVehicleRepairs: [], selectedVehicleInfo: null, selectedVehicleStats: null };
        
        const vehicleRepairs = (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.licensePlate === selectedVehiclePlate)
            .sort((a, b) => new Date(b.repairEndDate || b.createdAt).getTime() - new Date(a.repairEndDate || a.createdAt).getTime());

        const vehicleInfo = (Array.isArray(vehicles) ? vehicles : []).find(v => v.licensePlate === selectedVehiclePlate);
        
        const vehicleStats = {
            totalRepairs: vehicleRepairs.length,
            totalCost: vehicleRepairs.reduce((sum, r) => sum + calculateTotalCost(r), 0),
            avgCost: vehicleRepairs.length > 0 ? vehicleRepairs.reduce((sum, r) => sum + calculateTotalCost(r), 0) / vehicleRepairs.length : 0,
        };

        return { selectedVehicleRepairs: vehicleRepairs, selectedVehicleInfo: vehicleInfo, selectedVehicleStats: vehicleStats };
    }, [repairs, vehicles, selectedVehiclePlate]);

    // Render Detail View
    if (selectedVehiclePlate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedVehiclePlate(null)} className="px-4 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                        &larr; กลับไปที่รายการรถ
                    </button>
                    <h2 className="text-2xl font-bold">
                        ประวัติการซ่อม: <span className="text-blue-600">{selectedVehiclePlate}</span>
                    </h2>
                    {selectedVehicleInfo && <p className="text-gray-500">{selectedVehicleInfo.vehicleType} - {selectedVehicleInfo.make} {selectedVehicleInfo.model}</p>}
                </div>

                {selectedVehicleStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <StatCard title="จำนวนการซ่อมทั้งหมด" value={selectedVehicleStats.totalRepairs} theme="blue" />
                        <StatCard title="ค่าใช้จ่ายซ่อมรวม" value={`${selectedVehicleStats.totalCost.toLocaleString()} ฿`} theme="red" />
                        <StatCard title="ค่าใช้จ่ายเฉลี่ย" value={`${selectedVehicleStats.avgCost.toLocaleString('en-US', {maximumFractionDigits: 0})} ฿`} theme="yellow" />
                    </div>
                )}
                
                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ซ่อมเสร็จ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่ใบแจ้งซ่อม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายละเอียดปัญหา</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">รายการอะไหล่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ค่าใช้จ่ายรวม</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {selectedVehicleRepairs.map(repair => (
                                <tr key={repair.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{new Date(repair.repairEndDate || repair.createdAt).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3 text-sm font-mono">{repair.repairOrderNo}</td>
                                    <td className="px-4 py-3 text-sm max-w-sm truncate" title={repair.problemDescription}>{repair.problemDescription}</td>
                                    <td className="px-4 py-3 text-center">
                                        {(repair.parts && repair.parts.length > 0) ? (
                                            <button onClick={() => setViewingParts(repair.parts)} className="text-blue-600 hover:underline text-sm">ดู ({repair.parts.length})</button>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{calculateTotalCost(repair).toLocaleString()} ฿</td>
                                </tr>
                            ))}
                             {selectedVehicleRepairs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบประวัติการซ่อมสำหรับรถคันนี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {viewingParts && <PartsListModal parts={viewingParts} onClose={() => setViewingParts(null)} />}
            </div>
        );
    }
    
    // Render List View
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <input
                    type="text"
                    placeholder="ค้นหาด้วยทะเบียนรถ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg text-lg"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{vehicle.licensePlate}</h3>
                            <p className="text-gray-500 text-sm">{vehicle.vehicleType} - {vehicle.make}</p>
                        </div>
                        <div className="mt-4 border-t pt-4">
                            <div className="flex justify-around text-center">
                                <div><p className="text-lg font-bold">{vehicle.repairCount}</p><p className="text-sm text-gray-500">ครั้ง</p></div>
                                <div><p className="text-lg font-bold">{vehicle.totalCost.toLocaleString()}</p><p className="text-sm text-gray-500">บาท</p></div>
                            </div>
                            <button 
                                onClick={() => setSelectedVehiclePlate(vehicle.licensePlate)} 
                                className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                ดูประวัติ
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {filteredVehicles.length === 0 && (
                <div className="bg-white p-10 rounded-2xl shadow-sm text-center">
                    <p className="text-gray-500">ไม่พบรถที่ตรงกับคำค้นหา</p>
                </div>
            )}
        </div>
    );
};

export default VehicleRepairHistory;