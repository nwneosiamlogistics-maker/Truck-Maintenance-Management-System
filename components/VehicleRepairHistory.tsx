import React, { useState, useMemo } from 'react';
import type { Repair, Vehicle, PartRequisitionItem } from '../types';
import { formatCurrency } from '../utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';

// Helper function to calculate total cost for a single repair
const calculateTotalCost = (repair: Repair): number => {
    const partsCost = (repair.parts || []).reduce((sum, part) => {
        return sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
    }, 0);
    return (Number(repair.repairCost) || 0) + partsCost + (Number(repair.partsVat) || 0);
};

// Parts Modal Component
const PartsListModal: React.FC<{ parts: PartRequisitionItem[], onClose: () => void }> = ({ parts, onClose }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">📦 รายการอะไหล่ที่ใช้</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-0 max-h-80 overflow-y-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Item</th>
                            <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty</th>
                            <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Price</th>
                            <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {parts.map((part, index) => (
                            <tr key={index}>
                                <td className="px-5 py-3 text-sm font-medium text-gray-800">{part.name}</td>
                                <td className="px-5 py-3 text-right text-sm text-gray-600">{part.quantity} {part.unit}</td>
                                <td className="px-5 py-3 text-right text-sm text-gray-600">{formatCurrency(part.unitPrice)}</td>
                                <td className="px-5 py-3 text-right text-sm font-bold text-blue-600">{formatCurrency(part.quantity * part.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-right">
                <span className="text-sm text-gray-500 mr-2">Total Parts Cost:</span>
                <span className="text-lg font-bold text-gray-800">{formatCurrency(parts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0))}</span>
            </div>
        </div>
    </div>
);


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

        // Combine with vehicle list
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

    // Top 5 Most Expensive Vehicles for Chart
    const topExpensiveVehicles = useMemo(() => {
        return [...vehicleStats].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
    }, [vehicleStats]);

    // Render Detail View
    if (selectedVehiclePlate && selectedVehicleInfo && selectedVehicleStats) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => setSelectedVehiclePlate(null)} className="p-2 text-gray-500 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            {selectedVehiclePlate}
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{selectedVehicleInfo.vehicleType}</span>
                        </h2>
                        <p className="text-gray-500 text-sm">{selectedVehicleInfo.make} {selectedVehicleInfo.model}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-gray-500 text-sm font-medium uppercase">Total Repairs</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{selectedVehicleStats.totalRepairs} <span className="text-sm font-normal text-gray-400">Times</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-500">
                        <p className="text-gray-500 text-sm font-medium uppercase">Total Cost</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{formatCurrency(selectedVehicleStats.totalCost)} <span className="text-sm font-normal text-gray-400">บาท</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500">
                        <p className="text-gray-500 text-sm font-medium uppercase">Avg Cost / Repair</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{formatCurrency(selectedVehicleStats.avgCost)} <span className="text-sm font-normal text-gray-400">บาท</span></p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">📜 Repair History Timeline</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Job No.</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Problem</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Parts</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {selectedVehicleRepairs.map(repair => (
                                    <tr key={repair.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                            {new Date(repair.repairEndDate || repair.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-blue-600">
                                            {repair.repairOrderNo}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={repair.problemDescription}>
                                            {repair.problemDescription}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(repair.parts && repair.parts.length > 0) ? (
                                                <button onClick={() => setViewingParts(repair.parts)} className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors">
                                                    {repair.parts.length} Items
                                                </button>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(calculateTotalCost(repair))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {viewingParts && <PartsListModal parts={viewingParts} onClose={() => setViewingParts(null)} />}
            </div>
        );
    }

    // Main List View with Top Chart
    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Top Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-4">Top 5 Highest Maintenance Costs</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topExpensiveVehicles} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="licensePlate" type="category" width={80} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                                    <Bar dataKey="totalCost" name="Total Cost" radius={[0, 4, 4, 0]} barSize={20}>
                                        {
                                            topExpensiveVehicles.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#3b82f6'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center gap-6">
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Total Fleet Cost</p>
                        <p className="text-4xl font-extrabold text-slate-800 mt-2">
                            {formatCurrency(vehicleStats.reduce((sum, v) => sum + v.totalCost, 0))}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Vehicles Serviced</p>
                        <p className="text-4xl font-extrabold text-blue-600 mt-2">
                            {vehicleStats.filter(v => v.repairCount > 0).length} <span className="text-lg text-gray-400 font-normal">/ {vehicles.length}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Grid */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">📚 Vehicle Directory</h3>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search License Plate..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm w-64"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {filteredVehicles.map(vehicle => (
                        <div key={vehicle.id} onClick={() => setSelectedVehiclePlate(vehicle.licensePlate)} className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{vehicle.licensePlate}</h4>
                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{vehicle.make} {vehicle.model}</p>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <p className="text-xs text-gray-400 uppercase">Repairs</p>
                                        <p className="font-bold text-gray-700">{vehicle.repairCount}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <p className="text-xs text-gray-400 uppercase">Cost</p>
                                        <p className="font-bold text-gray-700">{formatCurrency(vehicle.totalCost).split('.')[0]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VehicleRepairHistory;