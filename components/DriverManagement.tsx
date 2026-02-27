import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Driver, DriverPerformance, DrivingIncident, Vehicle, FuelRecord, Repair } from '../types';
import { formatCurrency } from '../utils';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, FileText, Edit, Table2 } from 'lucide-react';
import AddDriverModal from './AddDriverModal';
import { useToast } from '../context/ToastContext';
import DriverDetailModal from './DriverDetailModal';
import DriverLeaveReport from './DriverLeaveReport';
import DriverMatrix from './DriverMatrix';
import { promptForPasswordAsync, showAlert, confirmAction } from '../utils';
import { useSafetyChecks } from '../hooks/useSafetyChecks';
import { useSafetyPlan } from '../hooks/useSafetyPlan';
import { useIncabAssessments } from '../hooks/useIncabAssessments';
import IncabAssessmentModal from './IncabAssessmentModal';
import IncabAssessmentPrintModal from './IncabAssessmentPrintModal';
import type { IncabAssessment } from '../types';

import AddIncidentModal from './AddIncidentModal';

interface DriverManagementProps {
    drivers: Driver[];
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    vehicles: Vehicle[];
    fuelRecords: FuelRecord[];
    incidents: DrivingIncident[];
    repairs: Repair[];
    setIncidents: React.Dispatch<React.SetStateAction<DrivingIncident[]>>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, vehicles, fuelRecords, incidents, repairs, setIncidents }) => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('safety_desc');
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [incidentDriver, setIncidentDriver] = useState<Driver | null>(null); // For reporting incident
    const [modalTab, setModalTab] = useState<'overview' | 'performance' | 'leaves'>('overview');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false); // General incident modal
    const [viewMode, setViewMode] = useState<'list' | 'leave-report' | 'matrix'>('list');
    const [isChartCollapsed, setIsChartCollapsed] = useState(true);
    const [matrixZoom, setMatrixZoom] = useState(1);
    const matrixZoomLevels = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4];
    const matrixZoomIdx = matrixZoomLevels.indexOf(matrixZoom);
    const matrixZoomIn  = () => setMatrixZoom(matrixZoomLevels[Math.min(matrixZoomLevels.length - 1, matrixZoomIdx + 1)]);
    const matrixZoomOut = () => setMatrixZoom(matrixZoomLevels[Math.max(0, matrixZoomIdx - 1)]);
    const matrixZoomReset = () => setMatrixZoom(1);
    const [cardLightbox, setCardLightbox] = useState<{ photos: string[]; index: number } | null>(null);
    const { addToast } = useToast();
    const { checks: safetyChecks } = useSafetyChecks(new Date().getFullYear());
    const { topics: safetyTopics, plans: trainingPlans } = useSafetyPlan(new Date().getFullYear());
    const { assessments: incabAssessments, addAssessment, updateAssessment } = useIncabAssessments(new Date().getFullYear());
    const [incabModalDriver, setIncabModalDriver] = useState<Driver | null>(null);
    const [incabPrintAssessment, setIncabPrintAssessment] = useState<IncabAssessment | null>(null);

    const handleSaveDriver = async (driver: Driver | Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>) => {
        if ('id' in driver) {
            setDrivers(prev => prev.map(d => d.id === driver.id ? driver : d));
            setEditingDriver(null);
            showAlert('บันทึกสำเร็จ', `อัปเดตข้อมูล ${driver.name} เรียบร้อย`, 'success');
        } else {
            const newDriver: Driver = {
                ...driver,
                id: `DRV-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setDrivers(prev => [newDriver, ...prev]);
            setIsAddModalOpen(false);
            showAlert('บันทึกสำเร็จ', `เพิ่มคนขับ ${newDriver.name} เรียบร้อย`, 'success');
        }
    };

    const handleSaveIncident = (incidentData: Omit<DrivingIncident, 'id' | 'createdAt' | 'createdBy'>) => {
        const newIncident: DrivingIncident = {
            ...incidentData,
            id: `INC-${Date.now()}`,
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        };
        setIncidents(prev => [newIncident, ...prev]);
        setIsIncidentModalOpen(false);
        setIncidentDriver(null);
        showAlert('บันทึกสำเร็จ', 'บันทึกเหตุการณ์เรียบร้อย', 'success');
    };

    const handleEditClick = async (e: React.MouseEvent, driver: Driver) => {
        e.stopPropagation();
        const isAdmin = await promptForPasswordAsync(`แก้ไขข้อมูลคุณ ${driver.name}`);
        if (isAdmin) {
            setEditingDriver(driver);
        }
    };

    const handleUpdateDriver = async (updatedDriver: Driver) => {
        const ok = await confirmAction(
            'ยืนยันการบันทึกข้อมูล',
            `บันทึกการเปลี่ยนแปลงข้อมูลของ ${updatedDriver.name} ใช่หรือไม่?`,
            'บันทึก'
        );
        if (!ok) return;
        setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
        setSelectedDriver(updatedDriver);
        addToast('บันทึกสำเร็จ', 'success');
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
                return sum + (i.pointsDeducted ?? severityPoints[i.severity] ?? 0);
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
                safetyScore,
                accidentCount: driverIncidents.filter(i => i.type === 'อุบัติเหตุ').length,
                violationCount: driverIncidents.filter(i => i.type === 'ฝ่าฝืนกฎจราจร' || i.type === 'การขับขี่เสี่ยง').length,
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
        <div className="space-y-4 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
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
                                onClick={() => setViewMode('matrix')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'matrix'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Table2 size={18} />
                                Driver Matrix
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

                        {viewMode === 'matrix' && (
                            <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1.5 border border-slate-200 shrink-0">
                                <span className="text-xs text-slate-500 mr-1">ขนาดตัวอักษร:</span>
                                <button onClick={matrixZoomOut} disabled={matrixZoomIdx === 0} title="ย่อ" aria-label="ย่อตาราง"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                                </button>
                                <button onClick={matrixZoomReset} title="รีเซ็ต" aria-label="รีเซ็ตขนาด"
                                    className="px-2 h-7 text-xs font-bold rounded-lg hover:bg-white text-slate-700 transition-colors min-w-[48px]">
                                    {Math.round(matrixZoom * 100)}%
                                </button>
                                <button onClick={matrixZoomIn} disabled={matrixZoomIdx === matrixZoomLevels.length - 1} title="ขยาย" aria-label="ขยายตาราง"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6M7 10h6" /></svg>
                                </button>
                            </div>
                        )}
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

                {/* License Alerts (Only show in list/matrix mode) */}
                {(viewMode === 'list' || viewMode === 'matrix') && licenseAlerts.length > 0 && (
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

            {viewMode === 'matrix' ? (
                <DriverMatrix
                    drivers={drivers}
                    setDrivers={setDrivers}
                    vehicles={vehicles}
                    incidents={incidents}
                    safetyChecks={safetyChecks}
                    safetyTopics={safetyTopics}
                    trainingPlans={trainingPlans}
                    incabAssessments={incabAssessments}
                    zoom={matrixZoom}
                    onEditDriver={driver => setEditingDriver(driver)}
                    onDeleteDriver={driver => setDrivers(prev => prev.filter(d => d.id !== driver.id))}
                    onOpenIncab={driver => setIncabModalDriver(driver)}
                />
            ) : viewMode === 'list' ? (
                <>
                    {/* Summary Stats - Compact horizontal bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-blue-500 rounded-xl p-3 text-white flex items-center gap-3 shadow">
                            <div className="bg-white/20 p-2 rounded-lg shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-blue-100 font-bold">คนขับทั้งหมด</p>
                                <p className="text-2xl font-extrabold leading-tight">{drivers.length}</p>
                                <p className="text-xs text-blue-100">{drivers.filter(d => d.status === 'active').length} ปฏิบัติงาน</p>
                            </div>
                        </div>
                        <div className="bg-emerald-500 rounded-xl p-3 text-white flex items-center gap-3 shadow">
                            <div className="bg-white/20 p-2 rounded-lg shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-100 font-bold">คะแนนปลอดภัยเฉลี่ย</p>
                                <p className="text-2xl font-extrabold leading-tight">{drivers.length > 0 ? (driverPerformances.reduce((sum, d) => sum + (isNaN(d.performance.safetyScore) ? 0 : d.performance.safetyScore), 0) / drivers.length).toFixed(0) : '0'}</p>
                                <p className="text-xs text-emerald-100">จาก 100 คะแนน</p>
                            </div>
                        </div>
                        <div className="bg-amber-500 rounded-xl p-3 text-white flex items-center gap-3 shadow">
                            <div className="bg-white/20 p-2 rounded-lg shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-amber-100 font-bold">อุบัติเหตุทั้งหมด</p>
                                <p className="text-2xl font-extrabold leading-tight">{incidents.length}</p>
                                <p className="text-xs text-amber-100">{incidents.filter(i => i.severity === 'critical').length} ร้ายแรง</p>
                            </div>
                        </div>
                        <div className="bg-purple-500 rounded-xl p-3 text-white flex items-center gap-3 shadow">
                            <div className="bg-white/20 p-2 rounded-lg shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-purple-100 font-bold">ค่าซ่อมเฉลี่ย</p>
                                <p className="text-xl font-extrabold leading-tight">{formatCurrency(driverPerformances.reduce((sum, d) => sum + d.performance.maintenanceCost, 0) / (drivers.length || 1))}</p>
                                <p className="text-xs text-purple-100">บาท/คน</p>
                            </div>
                        </div>
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

                                <div className="p-3 bg-slate-50/50 border-t border-slate-100 grid grid-cols-5 gap-1.5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setModalTab('overview'); }}
                                        className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl py-2 transition-all shadow-sm group/btn"
                                        title="ดูรายละเอียด"
                                    >
                                        <svg className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="text-[10px] font-bold">ประวัติ</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setModalTab('leaves'); }}
                                        className="flex flex-col items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl py-2 transition-all shadow-sm"
                                        title="บันทึกการลา"
                                    >
                                        <span className="text-sm">📅</span>
                                        <span className="text-[10px] font-bold">วันลา</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const photos = Array.isArray(driver.photos) ? driver.photos.filter(Boolean) : [];
                                            if (photos.length > 0) {
                                                setCardLightbox({ photos, index: 0 });
                                            }
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all shadow-sm border ${
                                            (driver.photos && driver.photos.length > 0)
                                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                        }`}
                                        title={driver.photos && driver.photos.length > 0 ? `ดูรูปภาพ (${driver.photos.length} รูป)` : 'ไม่มีรูปภาพ'}
                                        disabled={!driver.photos || driver.photos.length === 0}
                                    >
                                        <span className="text-sm">🖼️</span>
                                        <span className="text-[10px] font-bold">รูป{driver.photos && driver.photos.length > 0 ? ` (${driver.photos.length})` : ''}</span>
                                    </button>
                                    <button
                                        onClick={(e) => handleEditClick(e, driver)}
                                        className="flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl py-2 transition-all shadow-sm"
                                        title="แก้ไขข้อมูล"
                                    >
                                        <Edit size={16} className="text-slate-500" />
                                        <span className="text-[10px] font-bold">แก้ไข</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIncidentDriver(driver); setIsIncidentModalOpen(true); }}
                                        className="flex flex-col items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl py-2 transition-all shadow-sm"
                                        title="แจ้งอุบัติเหตุ/ฝ่าฝืน"
                                    >
                                        <span className="text-sm">🚨</span>
                                        <span className="text-[10px] font-bold">แจ้งเหตุ</span>
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

                    {/* Top Performers Chart - Collapsible */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <button
                            onClick={() => setIsChartCollapsed(!isChartCollapsed)}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                        >
                            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                <span>📊</span> 5 อันดับคนขับยอดเยี่ยม
                            </h3>
                            <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isChartCollapsed ? '' : 'rotate-180'}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {!isChartCollapsed && (
                            <div className="px-6 pb-6">
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
                        )}
                    </div>
                </>
            ) : (
                <DriverLeaveReport drivers={drivers} />
            )}

            {/* Add Driver Modal */}
            {isAddModalOpen && createPortal(
                <AddDriverModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleSaveDriver}
                />
            , document.body)}

            {/* Edit Driver Modal */}
            {editingDriver && createPortal(
                <AddDriverModal
                    driver={editingDriver}
                    onClose={() => setEditingDriver(null)}
                    onSave={handleSaveDriver}
                />
            , document.body)}

            {/* Driver Detail Modal */}
            {selectedDriver && createPortal(
                <DriverDetailModal
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                    onUpdate={handleUpdateDriver}
                    initialTab={modalTab}
                    onEdit={async () => {
                        const isAdmin = await promptForPasswordAsync(`แก้ไขข้อมูลคุณ ${selectedDriver.name}`);
                        if (isAdmin) {
                            setEditingDriver(selectedDriver);
                            setSelectedDriver(null);
                        }
                    }}
                />
            , document.body)}

            {/* Incident Modal */}
            {isIncidentModalOpen && createPortal(
                <AddIncidentModal
                    driver={incidentDriver || undefined}
                    drivers={drivers}
                    vehicles={vehicles}
                    onClose={() => { setIsIncidentModalOpen(false); setIncidentDriver(null); }}
                    onSave={handleSaveIncident}
                />
            , document.body)}

            {/* Card Photo Lightbox — portal to bypass overflow stacking context */}
            {cardLightbox && createPortal(
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex flex-col items-center justify-start pt-6 p-4 overflow-y-auto"
                    onClick={() => setCardLightbox(null)}
                >
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setCardLightbox(null)}
                            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 z-10"
                            aria-label="ปิด"
                        >
                            ✕
                        </button>
                        <img
                            src={cardLightbox.photos[cardLightbox.index]}
                            alt={`รูปที่ ${cardLightbox.index + 1}`}
                            className="w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => setCardLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null)}
                                disabled={cardLightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ‹ ก่อนหน้า
                            </button>
                            <span className="text-white text-sm">{cardLightbox.index + 1} / {cardLightbox.photos.length}</span>
                            <button
                                onClick={() => setCardLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null)}
                                disabled={cardLightbox.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ถัดไป ›
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 justify-center flex-wrap">
                            {cardLightbox.photos.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCardLightbox(prev => prev ? { ...prev, index: idx } : null)}
                                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${idx === cardLightbox.index ? 'border-blue-400' : 'border-transparent hover:border-gray-400'}`}
                                >
                                    <img src={url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Incab Assessment Modal */}
            {incabModalDriver && (
                <IncabAssessmentModal
                    drivers={drivers}
                    editAssessment={incabAssessments.filter(a => a.driverId === incabModalDriver.id).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null}
                    onSave={(assessment) => {
                        const exists = incabAssessments.some(a => a.id === assessment.id);
                        if (exists) updateAssessment(assessment);
                        else addAssessment(assessment);
                        setDrivers(prev => prev.map(d =>
                            d.id === assessment.driverId
                                ? { ...d, incabCoaching: { score: assessment.totalScore, date: assessment.date } }
                                : d
                        ));
                        setIncabPrintAssessment(assessment);
                    }}
                    onClose={() => setIncabModalDriver(null)}
                    onToast={(msg, type) => addToast(msg, type)}
                />
            )}

            {/* Incab Print Modal */}
            {incabPrintAssessment && (
                <IncabAssessmentPrintModal
                    assessment={incabPrintAssessment}
                    onClose={() => setIncabPrintAssessment(null)}
                />
            )}
        </div>
    );
};

export default DriverManagement;
