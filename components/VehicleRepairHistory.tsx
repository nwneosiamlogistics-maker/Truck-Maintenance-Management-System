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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    รายการอะไหล่ที่ใช้
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full" aria-label="ปิด">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {parts.map((part, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{part.name}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">{part.quantity} {part.unit}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">{formatCurrency(part.unitPrice)}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-blue-600 font-mono">{formatCurrency(part.quantity * part.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">รวมเป็นเงินทั้งสิ้น</span>
                <span className="text-xl font-extrabold text-gray-800">{formatCurrency(parts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0))}</span>
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
                    <button onClick={() => setSelectedVehiclePlate(null)} className="p-3 text-gray-500 hover:text-blue-600 bg-white shadow-md hover:shadow-lg rounded-xl border border-gray-100 transition-all transform hover:scale-105 active:scale-95" aria-label="กลับ">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                            {selectedVehiclePlate}
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{selectedVehicleInfo.vehicleType}</span>
                        </h2>
                        <p className="text-gray-500 text-sm font-medium mt-1">{selectedVehicleInfo.make} {selectedVehicleInfo.model}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
                            <svg width="120" height="120" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Repairs</p>
                        <p className="text-4xl font-extrabold text-slate-800 mt-2">{selectedVehicleStats.totalRepairs} <span className="text-lg font-semibold text-slate-400">Times</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
                            <svg width="120" height="120" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Cost</p>
                        <p className="text-4xl font-extrabold text-blue-600 mt-2">{formatCurrency(selectedVehicleStats.totalCost)} <span className="text-lg font-semibold text-slate-400">THB</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
                            <svg width="120" height="120" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Avg Cost / Repair</p>
                        <p className="text-4xl font-extrabold text-amber-500 mt-2">{formatCurrency(selectedVehicleStats.avgCost)} <span className="text-lg font-semibold text-slate-400">THB</span></p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="text-xl font-extrabold text-gray-800">📜 Repair History Timeline</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Job No.</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Problem</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Parts</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {selectedVehicleRepairs.map(repair => (
                                    <tr key={repair.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5 text-sm text-gray-600 font-semibold whitespace-nowrap">
                                            {new Date(repair.repairEndDate || repair.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-blue-600 font-mono whitespace-nowrap">
                                            {repair.repairOrderNo}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-700 max-w-md truncate font-medium" title={repair.problemDescription}>
                                            {repair.problemDescription}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {(repair.parts && repair.parts.length > 0) ? (
                                                <button onClick={() => setViewingParts(repair.parts)} className="px-4 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors shadow-sm">
                                                    {repair.parts.length} Items
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 font-medium">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right font-extrabold text-gray-800 font-mono">{formatCurrency(calculateTotalCost(repair))}</td>
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
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-xl overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <svg width="300" height="300" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            Top 5 Highest Maintenance Costs
                        </h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topExpensiveVehicles} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="licensePlate" type="category" width={80} tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                    <Bar dataKey="totalCost" name="Total Cost" radius={[0, 6, 6, 0]} barSize={24}>
                                        {
                                            topExpensiveVehicles.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#60a5fa'} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-center gap-8 relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
                        <svg width="200" height="200" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Fleet Cost</p>
                        <p className="text-5xl font-extrabold text-slate-800 mt-2 tracking-tight">
                            {formatCurrency(vehicleStats.reduce((sum, v) => sum + v.totalCost, 0)).split('.')[0]}
                            <span className="text-lg font-medium text-slate-400 ml-1">THB</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vehicles Serviced</p>
                        <p className="text-5xl font-extrabold text-blue-600 mt-2 tracking-tight">
                            {vehicleStats.filter(v => v.repairCount > 0).length} <span className="text-2xl text-slate-300 font-light">/ {vehicles.length}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Grid */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 md:mb-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Vehicle Directory</h3>
                    </div>
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Search License Plate..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-xl font-medium text-slate-600 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredVehicles.map(vehicle => (
                        <div
                            key={vehicle.id}
                            onClick={() => setSelectedVehiclePlate(vehicle.licensePlate)}
                            className="bg-white rounded-[1.5rem] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-100 group"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{vehicle.licensePlate}</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{vehicle.vehicleType || 'Vehicle'} {vehicle.model}</p>
                            </div>

                            <div className="flex bg-slate-50 rounded-xl p-4 group-hover:bg-blue-50 transition-colors">
                                <div className="flex-1 text-center border-r border-slate-200 group-hover:border-blue-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">REPAIRS</p>
                                    <p className="text-lg font-extrabold text-slate-700">{vehicle.repairCount}</p>
                                </div>
                                <div className="flex-1 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">COST</p>
                                    <p className="text-lg font-extrabold text-slate-700">{formatCurrency(vehicle.totalCost).replace('฿', '')}</p>
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