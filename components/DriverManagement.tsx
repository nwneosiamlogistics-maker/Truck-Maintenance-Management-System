import React, { useState, useMemo } from 'react';
import type { Driver, DriverPerformance, DrivingIncident, Vehicle, FuelRecord, Repair } from '../types';
import { formatCurrency } from '../utils';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, FileText, Edit } from 'lucide-react';
import AddDriverModal from './AddDriverModal';
import { useToast } from '../context/ToastContext';
import DriverDetailModal from './DriverDetailModal';
import DriverLeaveReport from './DriverLeaveReport';
import { promptForPasswordAsync, showAlert } from '../utils';

interface DriverManagementProps {
    drivers: Driver[];
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    vehicles: Vehicle[];
    fuelRecords: FuelRecord[];
    incidents: DrivingIncident[];
    repairs: Repair[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, vehicles, fuelRecords, incidents, repairs }) => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('safety_desc');
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [modalTab, setModalTab] = useState<'overview' | 'performance' | 'leaves'>('overview');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'leave-report'>('list');
    const { addToast } = useToast();

    const handleSaveDriver = (driver: Driver | Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>) => {
        if ('id' in driver) {
            // Update existing driver
            setDrivers(prev => prev.map(d => d.id === driver.id ? driver : d));
            setEditingDriver(null);
            showAlert('สำเร็จ', `อัปเดตข้อมูล ${driver.name} สำเร็จ`, 'success');
        } else {
            // Add new driver
            const newDriver: Driver = {
                ...driver,
                id: `DRV-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setDrivers(prev => [newDriver, ...prev]);
            setIsAddModalOpen(false);
            showAlert('สำเร็จ', `เพิ่มคนขับ ${newDriver.name} สำเร็จ`, 'success');
        }
    };

    const handleEditClick = async (e: React.MouseEvent, driver: Driver) => {
        e.stopPropagation();
        const isAdmin = await promptForPasswordAsync(`แก้ไขข้อมูลคุณ ${driver.name}`);
        if (isAdmin) {
            setEditingDriver(driver);
        }
    };

    const handleUpdateDriver = (updatedDriver: Driver) => {
        setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
        setSelectedDriver(updatedDriver);
        addToast('อัปเดตข้อมูลคนขับสำเร็จ', 'success');
    };

    // Calculate driver performance
    const driverPerformances = useMemo(() => {
        return drivers.map(driver => {
            const driverFuelRecords = fuelRecords.filter(f => f.driverName === driver.name);
            const driverIncidents = incidents.filter(i => i.driverId === driver.id);

            // Link repairs to driver:
            // 1. Explicit driverId match
            // 2. Reported by match
            // 3. Primary vehicle match (Assumption: Primary driver is responsible for maintenance)
            const driverRepairs = repairs.filter(r =>
                r.driverId === driver.id ||
                r.reportedBy === driver.name ||
                (driver.primaryVehicle && r.licensePlate === driver.primaryVehicle)
            );

            const totalDistance = driverFuelRecords.reduce((sum, f) => sum + f.distanceTraveled, 0);
            const totalLiters = driverFuelRecords.reduce((sum, f) => sum + f.liters, 0);
            const avgEfficiency = totalLiters > 0 ? totalDistance / totalLiters : 0;

            const safetyDeductions = driverIncidents.reduce((sum, i) => {
                const severityPoints = { low: 5, medium: 15, high: 30, critical: 50 };
                return sum + (severityPoints[i.severity] || 0);
            }, 0);

            const safetyScore = Math.max(0, 100 - safetyDeductions);

            // Calculate Maintenance Metrics
            const maintenanceCost = driverRepairs.reduce((sum, r) => sum + (r.repairCost || 0), 0);
            const repairFrequency = driverRepairs.length;

            // Calculate Downtime (approximate days)
            const vehicleDowntime = driverRepairs.reduce((sum, r) => {
                if (r.repairStartDate && r.repairEndDate) {
                    const start = new Date(r.repairStartDate).getTime();
                    const end = new Date(r.repairEndDate).getTime();
                    const hours = (end - start) / (1000 * 60 * 60);
                    return sum + Math.max(0, hours);
                }
                return sum;
            }, 0);

            return {
                ...driver,
                performance: {
                    avgEfficiency,
                    totalDistance,
                    fuelCost: driverFuelRecords.reduce((sum, f) => sum + f.totalCost, 0),
                    incidentCount: driverIncidents.length,
                    safetyScore,
                    maintenanceCost,
                    repairFrequency,
                    vehicleDowntime
                }
            };
        });
    }, [drivers, fuelRecords, incidents, repairs]);

    // Filter and sort
    const filteredDrivers = useMemo(() => {
        let filtered = driverPerformances.filter(d =>
            statusFilter === 'all' || d.status === statusFilter
        );

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'safety_desc': return b.performance.safetyScore - a.performance.safetyScore;
                case 'safety_asc': return a.performance.safetyScore - b.performance.safetyScore;
                case 'efficiency_desc': return b.performance.avgEfficiency - a.performance.avgEfficiency;
                case 'efficiency_asc': return a.performance.avgEfficiency - b.performance.avgEfficiency;
                case 'distance_desc': return b.performance.totalDistance - a.performance.totalDistance;
                case 'maintenance_desc': return b.performance.maintenanceCost - a.performance.maintenanceCost; // New Sort
                case 'maintenance_asc': return a.performance.maintenanceCost - b.performance.maintenanceCost; // New Sort
                default: return 0;
            }
        });
    }, [driverPerformances, statusFilter, sortBy]);

    // Top performers calculation ...
    const topPerformers = useMemo(() => {
        return [...filteredDrivers]
            .sort((a, b) => b.performance.safetyScore - a.performance.safetyScore)
            .slice(0, 5);
    }, [filteredDrivers]);

    // License expiry alerts
    const licenseAlerts = useMemo(() => {
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        return drivers.filter(d => {
            const expiry = new Date(d.licenseExpiry);
            return expiry <= thirtyDaysLater && expiry > now;
        });
    }, [drivers]);

    // Performance comparison chart data
    const performanceChartData = useMemo(() => {
        return topPerformers.map(d => ({
            name: d.name,
            safety: d.performance.safetyScore,
            efficiency: Math.min(100, (d.performance.avgEfficiency / 10) * 100),
            experience: Math.min(100, (d.experience / 20) * 100),
            onTime: d.onTimeDeliveryRate,
            maintenance: Math.max(0, 100 - (d.performance.repairFrequency * 10)) // Inverse score for maintenance
        }));
    }, [topPerformers]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">จัดการพนักงานขับรถ</h2>
                        <p className="text-gray-500 mt-1">ข้อมูลคนขับและประเมินผลการทำงาน</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto">
                        {/* View Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <LayoutGrid size={18} />
                                รายชื่อ
                            </button>
                            <button
                                onClick={() => setViewMode('leave-report')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'leave-report'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <FileText size={18} />
                                รายงานการลา
                            </button>
                        </div>

                        {viewMode === 'list' && (
                            <>
                                <div className="flex gap-2 shrink-0">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        title="กรองสถานะพนักงาน"
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    >
                                        <option value="all">สถานะทั้งหมด</option>
                                        <option value="active">ปฏิบัติงาน</option>
                                        <option value="on_leave">ลา</option>
                                        <option value="suspended">พักงาน</option>
                                    </select>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        title="เรียงลำดับพนักงาน"
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    >
                                        <option value="safety_desc">ความปลอดภัย (สูง-ต่ำ)</option>
                                        <option value="safety_asc">ความปลอดภัย (ต่ำ-สูง)</option>
                                        <option value="efficiency_desc">ประสิทธิภาพน้ำมัน (สูง-ต่ำ)</option>
                                        <option value="distance_desc">ระยะทาง (มาก-น้อย)</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    เพิ่มคนขับ
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* License Alerts (Only show in list mode) */}
                {viewMode === 'list' && licenseAlerts.length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-amber-800">แจ้งเตือน: ใบขับขี่ใกล้หมดอายุ</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    {licenseAlerts.map(d => d.name).join(', ')} - ใบขับขี่จะหมดอายุภายใน 30 วัน
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">คนขับทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{drivers.length}</h3>
                                    <p className="text-xs text-blue-100 mt-1">{drivers.filter(d => d.status === 'active').length} คนปฏิบัติงาน</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-emerald-100 font-bold uppercase tracking-wider">คะแนนปลอดภัยเฉลี่ย</p>
                                    <h3 className="text-3xl font-extrabold mt-2">
                                        {drivers.length > 0 ? (
                                            (driverPerformances.reduce((sum, d) => sum + (isNaN(d.performance.safetyScore) ? 0 : d.performance.safetyScore), 0) / drivers.length).toFixed(0)
                                        ) : '0'}
                                    </h3>
                                    <p className="text-xs text-emerald-100 mt-1">จาก 100 คะแนน</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-amber-100 font-bold uppercase tracking-wider">อุบัติเหตุทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{incidents.length}</h3>
                                    <p className="text-xs text-amber-100 mt-1">{incidents.filter(i => i.severity === 'critical').length} รายการร้ายแรง</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-purple-100 font-bold uppercase tracking-wider">ค่าซ่อมบำรุงเฉลี่ย</p>
                                    <h3 className="text-3xl font-extrabold mt-2">
                                        {formatCurrency(driverPerformances.reduce((sum, d) => sum + d.performance.maintenanceCost, 0) / (drivers.length || 1))}
                                    </h3>
                                    <p className="text-xs text-purple-100 mt-1">บาท/คน</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Performers Chart */}
                    <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">5 อันดับคนขับยอดเยี่ยม</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={performanceChartData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <Radar name="ความปลอดภัย" dataKey="safety" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                <Radar name="ประสิทธิภาพน้ำมัน" dataKey="efficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                <Radar name="การบำรุงรักษา" dataKey="maintenance" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                                <Legend />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Driver List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDrivers.map((driver, index) => (
                            <div
                                key={driver.id}
                                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group cursor-pointer"
                            >
                                <div className="p-6" onClick={() => { setSelectedDriver(driver); setModalTab('overview'); }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{driver.name}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">รหัส: {driver.employeeId}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${driver.status === 'active' ? 'bg-green-100 text-green-700' :
                                            driver.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {driver.status === 'active' ? 'ปฏิบัติงาน' : driver.status === 'on_leave' ? 'ลา' : 'พักงาน'}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                                            <span>{driver.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" /></svg>
                                            <span className="truncate">{driver.email || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                            <span>ใบขับขี่: {driver.licenseClass}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 text-center border-t border-slate-100 pt-4">
                                        <div className="flex-1">
                                            <p className="text-xl font-black text-emerald-600">{driver.performance.safetyScore}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Safety</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xl font-black text-blue-600">{driver.performance.avgEfficiency.toFixed(1)}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">กม./ลิตร</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xl font-black text-purple-600">{formatCurrency(driver.performance.maintenanceCost)}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">ค่าซ่อม</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setModalTab('overview'); }}
                                        className="flex-1 bg-white hover:bg-blue-50 text-slate-600 font-bold py-2 px-3 rounded-xl transition-all text-xs shadow-sm border border-slate-200 group-hover:border-blue-200 group-hover:text-blue-600"
                                    >
                                        รายละเอียด
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setModalTab('leaves'); }}
                                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2 px-3 rounded-xl transition-all shadow-sm border border-amber-200 flex items-center gap-2"
                                        title="บันทึกการลาพักผ่อน/ลากิจ/ลาป่วย"
                                    >
                                        <span className="text-xs">📅 ลา</span>
                                    </button>
                                    <button
                                        onClick={(e) => handleEditClick(e, driver)}
                                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2 px-3 rounded-xl transition-all shadow-sm border border-slate-200 flex items-center gap-2"
                                        title="แก้ไขข้อมูลพนักงาน"
                                    >
                                        <Edit size={14} />
                                        <span className="text-xs">แก้ไข</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDrivers.length === 0 && (
                        <div className="bg-white rounded-[2rem] shadow-sm p-16 text-center border border-slate-100">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-slate-400 font-medium">ไม่พบข้อมูลคนขับ</p>
                        </div>
                    )}
                </>
            ) : (
                <DriverLeaveReport drivers={drivers} />
            )}

            {/* Add Driver Modal */}
            {isAddModalOpen && (
                <AddDriverModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleSaveDriver}
                />
            )}

            {/* Edit Driver Modal */}
            {editingDriver && (
                <AddDriverModal
                    driver={editingDriver}
                    onClose={() => setEditingDriver(null)}
                    onSave={handleSaveDriver}
                />
            )}

            {/* Driver Detail Modal */}
            {selectedDriver && (
                <DriverDetailModal
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                    onUpdate={handleUpdateDriver}
                    initialTab={modalTab}
                />
            )}
        </div>
    );
};

export default DriverManagement;
