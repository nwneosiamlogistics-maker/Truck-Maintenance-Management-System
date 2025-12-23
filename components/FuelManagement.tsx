import React, { useState, useMemo } from 'react';
import type { FuelRecord, FuelAnalytics, FuelAlert, Vehicle } from '../types';
import { formatCurrency } from '../utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import AddFuelRecordModal from './AddFuelRecordModal';
import { useToast } from '../context/ToastContext';
import { Download } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';

interface FuelManagementProps {
    fuelRecords: FuelRecord[];
    setFuelRecords: React.Dispatch<React.SetStateAction<FuelRecord[]>>;
    vehicles: Vehicle[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const FuelManagement: React.FC<FuelManagementProps> = ({ fuelRecords, setFuelRecords, vehicles }) => {
    const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { addToast } = useToast();

    const handleAddFuelRecord = (record: Omit<FuelRecord, 'id' | 'createdAt' | 'createdBy'>) => {
        const newRecord: FuelRecord = {
            ...record,
            id: `FUEL-${Date.now()}`,
            createdAt: new Date().toISOString(),
            createdBy: 'System'
        };
        setFuelRecords(prev => [newRecord, ...prev]);
        setIsAddModalOpen(false);
        addToast(`บันทึกการเติมน้ำมัน ${newRecord.licensePlate} สำเร็จ`, 'success');
    };

    // Calculate date range
    const getDateRange = () => {
        const now = new Date();
        const ranges = {
            week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        };
        return ranges[dateRange];
    };

    // Filter records
    const filteredRecords = useMemo(() => {
        const startDate = getDateRange();
        return fuelRecords.filter(record => {
            const recordDate = new Date(record.date);
            const vehicleMatch = selectedVehicle === 'all' || record.vehicleId === selectedVehicle;
            const dateMatch = recordDate >= startDate;
            return vehicleMatch && dateMatch;
        });
    }, [fuelRecords, selectedVehicle, dateRange]);

    // Calculate summary statistics
    const summary = useMemo(() => {
        const total = filteredRecords.reduce((acc, r) => ({
            liters: acc.liters + r.liters,
            cost: acc.cost + r.totalCost,
            distance: acc.distance + r.distanceTraveled
        }), { liters: 0, cost: 0, distance: 0 });

        const avgEfficiency = total.distance > 0 ? total.distance / total.liters : 0;
        const avgCostPerLiter = total.liters > 0 ? total.cost / total.liters : 0;
        const totalRecords = filteredRecords.length;

        return {
            totalLiters: total.liters,
            totalCost: total.cost,
            totalDistance: total.distance,
            avgEfficiency,
            avgCostPerLiter,
            totalRecords
        };
    }, [filteredRecords]);

    // Prepare efficiency trend data
    const efficiencyTrendData = useMemo(() => {
        const sortedRecords = [...filteredRecords].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return sortedRecords.map(record => ({
            date: new Date(record.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
            efficiency: record.fuelEfficiency,
            cost: record.pricePerLiter,
            vehicle: record.licensePlate
        }));
    }, [filteredRecords]);

    // Calculate vehicle comparison
    const vehicleComparison = useMemo(() => {
        const vehicleStats = new Map<string, { liters: number; distance: number; cost: number; count: number }>();

        filteredRecords.forEach(record => {
            const existing = vehicleStats.get(record.vehicleId) || { liters: 0, distance: 0, cost: 0, count: 0 };
            vehicleStats.set(record.vehicleId, {
                liters: existing.liters + record.liters,
                distance: existing.distance + record.distanceTraveled,
                cost: existing.cost + record.totalCost,
                count: existing.count + 1
            });
        });

        return Array.from(vehicleStats.entries()).map(([vehicleId, stats]) => {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            return {
                vehicleId,
                licensePlate: vehicle?.licensePlate || vehicleId,
                avgEfficiency: stats.distance / stats.liters,
                totalCost: stats.cost,
                totalLiters: stats.liters,
                totalDistance: stats.distance,
                refillCount: stats.count
            };
        }).sort((a, b) => b.avgEfficiency - a.avgEfficiency);
    }, [filteredRecords, vehicles]);

    // Fuel type distribution
    const fuelTypeDistribution = useMemo(() => {
        const distribution = filteredRecords.reduce((acc, record) => {
            acc[record.fuelType] = (acc[record.fuelType] || 0) + record.totalCost;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(distribution).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    const handleExportFuel = () => {
        const exportData = filteredRecords.map(r => ({
            'วันที่': r.date,
            'ทะเบียนรถ': r.licensePlate,
            'ประเภทน้ำมัน': r.fuelType,
            'จำนวน (ลิตร)': r.liters,
            'ราคา/ลิตร': r.pricePerLiter,
            'ยอดรวม (บาท)': r.totalCost,
            'เลขไมล์': r.odometerAfter,
            'ระยะทาง (กม.)': r.distanceTraveled,
            'กม./ลิตร': r.fuelEfficiency.toFixed(2),
            'สถานที่เติม': r.station || '-'
        }));
        exportToCSV('Fuel_Consumption_Report', exportData);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    <div>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">บริหารจัดการน้ำมัน</h2>
                        <p className="text-gray-500 mt-1">บันทึกการเติมน้ำมันและวิเคราะห์ประสิทธิภาพการใช้เชื้อเพลิง</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        <div className="flex gap-2 flex-1 lg:flex-none">
                            <select
                                value={selectedVehicle}
                                onChange={(e) => setSelectedVehicle(e.target.value)}
                                title="เลือกทะเบียนรถ"
                                className="flex-1 lg:w-40 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                            >
                                <option value="all">รถทั้งหมด</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.licensePlate}</option>
                                ))}
                            </select>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as any)}
                                title="เลือกช่วงเวลา"
                                className="flex-1 lg:w-40 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                            >
                                <option value="week">7 วันล่าสุด</option>
                                <option value="month">30 วันล่าสุด</option>
                                <option value="quarter">90 วันล่าสุด</option>
                                <option value="year">1 ปีล่าสุด</option>
                            </select>
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <button
                                onClick={handleExportFuel}
                                className="flex-1 lg:flex-none px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                ส่งออก CSV
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex-1 lg:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                เติมน้ำมัน
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-amber-100 font-bold uppercase tracking-wider">น้ำมันทั้งหมด</p>
                            <h3 className="text-3xl font-extrabold mt-2">{summary.totalLiters.toFixed(0)}</h3>
                            <p className="text-xs text-amber-100 mt-1">ลิตร ({summary.totalRecords} ครั้ง)</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">ราคาเฉลี่ย/ลิตร</p>
                            <h3 className="text-3xl font-extrabold mt-2">{summary.avgCostPerLiter.toFixed(2)}</h3>
                            <p className="text-xs text-blue-100 mt-1">บาท/ลิตร</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-emerald-100 font-bold uppercase tracking-wider">ประสิทธิภาพเฉลี่ย</p>
                            <h3 className="text-3xl font-extrabold mt-2">{summary.avgEfficiency.toFixed(2)}</h3>
                            <p className="text-xs text-emerald-100 mt-1">กม./ลิตร</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-red-100 font-bold uppercase tracking-wider">ค่าใช้จ่ายทั้งหมด</p>
                            <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(summary.totalCost).replace('฿', '')}</h3>
                            <p className="text-xs text-red-100 mt-1">บาท</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-2 0H3V6h14v8zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm13 0v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Efficiency Trend */}
                <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">แนวโน้มประสิทธิภาพการใช้น้ำมัน</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={efficiencyTrendData}>
                            <defs>
                                <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => `${value.toFixed(2)} กม./ลิตร`}
                            />
                            <Area type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEfficiency)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Fuel Type Distribution */}
                <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">การใช้น้ำมันตามประเภท</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={fuelTypeDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                label={(entry) => `${entry.name}`}
                            >
                                {fuelTypeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Vehicle Comparison Table */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-800">เปรียบเทียบประสิทธิภาพตามรถ</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">ทะเบียนรถ</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">ประสิทธิภาพ (กม./ลิตร)</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">ระยะทาง</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">น้ำมันใช้</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">ค่าใช้จ่าย</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">จำนวนครั้ง</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {vehicleComparison.map((vehicle, index) => (
                                <tr key={vehicle.vehicleId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {index < 3 && (
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-100 text-gray-600' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                            )}
                                            <span className="text-sm font-bold text-slate-800">{vehicle.licensePlate}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-bold ${vehicle.avgEfficiency > summary.avgEfficiency ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                            {vehicle.avgEfficiency.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">
                                        {vehicle.totalDistance.toLocaleString()} กม.
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">
                                        {vehicle.totalLiters.toFixed(0)} ลิตร
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                        {formatCurrency(vehicle.totalCost)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">
                                        {vehicle.refillCount} ครั้ง
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {vehicleComparison.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="font-medium">ยังไม่มีข้อมูลการเติมน้ำมัน</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Fuel Record Modal */}
            {isAddModalOpen && (
                <AddFuelRecordModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddFuelRecord}
                    vehicles={vehicles}
                />
            )}
        </div>
    );
};

export default FuelManagement;
