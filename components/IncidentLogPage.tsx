import React, { useState, useMemo } from 'react';
import type { DrivingIncident, Driver, Vehicle } from '../types';
import { formatCurrency } from '../utils';
import { exportToCSV } from '../utils/exportUtils';
import {
    Search, Download, FileText, Filter, AlertTriangle,
    TrendingDown, ShieldCheck, DollarSign, Calendar, MapPin,
    User, Truck, Info, Printer, Clock, X, Eye, FileCheck, Camera,
    Zap
} from 'lucide-react';

interface IncidentLogPageProps {
    incidents: DrivingIncident[];
    drivers: Driver[];
    vehicles: Vehicle[];
}

const IncidentLogPage: React.FC<IncidentLogPageProps> = ({ incidents, drivers, vehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | DrivingIncident['type']>('all');
    const [severityFilter, setSeverityFilter] = useState<'all' | DrivingIncident['severity']>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedIncident, setSelectedIncident] = useState<DrivingIncident | null>(null);

    // Filter Logic
    const filteredIncidents = useMemo(() => {
        const safeIncidents = Array.isArray(incidents) ? incidents : [];
        const safeDrivers = Array.isArray(drivers) ? drivers : [];
        const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

        return safeIncidents.filter(i => {
            const driver = safeDrivers.find(d => d.id === i.driverId);
            const vehicle = safeVehicles.find(v => v.id === i.vehicleId);

            const matchesSearch =
                (driver?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (vehicle?.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (i.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (i.description || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'all' || i.type === typeFilter;
            const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;

            const incidentDate = new Date(i.date);
            const matchesStart = !dateRange.start || incidentDate >= new Date(dateRange.start);
            const matchesEnd = !dateRange.end || incidentDate <= new Date(dateRange.end);

            return matchesSearch && matchesType && matchesSeverity && matchesStart && matchesEnd;
        });
    }, [incidents, drivers, vehicles, searchTerm, typeFilter, severityFilter, dateRange]);

    // Statistics
    const stats = useMemo(() => {
        const total = filteredIncidents.length;
        const totalFines = filteredIncidents.reduce((sum, i) => sum + (i.fineAmount || 0), 0);
        const totalDamage = filteredIncidents.reduce((sum, i) => sum + (i.damageToVehicle || 0) + (i.damageToProperty || 0), 0);
        const totalPoints = filteredIncidents.reduce((sum, i) => sum + (i.pointsDeducted || 0), 0);

        return { total, totalFines, totalDamage, totalPoints };
    }, [filteredIncidents]);

    const handleExportCSV = () => {
        const data = filteredIncidents.map(i => {
            const driver = (Array.isArray(drivers) ? drivers : []).find(d => d.id === i.driverId);
            const vehicle = (Array.isArray(vehicles) ? vehicles : []).find(v => v.id === i.vehicleId);
            return {
                'วันที่': i.date,
                'เวลา': i.time,
                'พนักงานขับรถ': driver ? `${driver.name} (${driver.employeeId})` : i.driverId,
                'ทะเบียนรถ': vehicle?.licensePlate || '-',
                'ประเภท': i.type,
                'ความรุนแรง': i.severity,
                'สถานที่': i.location,
                'หักคะแนน': i.pointsDeducted || 0,
                'ค่าปรับ (บาท)': i.fineAmount || 0,
                'ความเสียหายรถ': i.damageToVehicle || 0,
                'ความเสียหายทรัพย์สิน': i.damageToProperty || 0,
                'ผู้บาดเจ็บ': i.injuries || '-',
                'รายละเอียด': i.description,
                'การดำเนินการ': i.actionsTaken
            };
        });
        exportToCSV('Driving_Incidents_Report', data);
    };

    const handlePrintPDF = () => {
        window.print();
    };

    const getSeverityStyle = (severity: DrivingIncident['severity']) => {
        switch (severity) {
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'critical': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getSeverityLabel = (severity: DrivingIncident['severity']) => {
        switch (severity) {
            case 'low': return 'ต่ำ';
            case 'medium': return 'ปานกลาง';
            case 'high': return 'สูง';
            case 'critical': return 'ร้ายแรง';
            default: return severity;
        }
    };

    return (
        <div className={`space-y-8 animate-fade-in-up pb-12 print:p-0 ${selectedIncident ? 'is-printing-detail' : ''}`}>
            <style>{`
                .official-report-container {
                    color: #000;
                    font-family: 'Sarabun', sans-serif;
                    background: white;
                }
                .official-report-page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm 15mm;
                    margin: 0 auto;
                    position: relative;
                    font-size: 10pt;
                    line-height: 1.5;
                    background: white !important;
                    color: black !important;
                    box-sizing: border-box;
                    border: 1px solid #eee; /* For screen preview */
                }
                .checkbox-box {
                    width: 14px;
                    height: 14px;
                    border: 1.5px solid #000;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 6px;
                    vertical-align: middle;
                    background: #fff;
                    font-size: 10px;
                    font-weight: bold;
                }
                .report-header-grid {
                    border: 2px solid #000;
                    display: grid;
                    grid-template-columns: 2.5fr 1fr;
                    margin-bottom: 1rem;
                }
                .header-box { padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                .header-box-l { border-right: 2px solid #000; }
                .footer-maroon { 
                    border-top: 3.5px solid #800000; 
                    padding-top: 8px; 
                    font-weight: 900; 
                    color: #000; 
                    display: flex; 
                    justify-content: space-between; 
                    font-size: 9pt; 
                }
                .signature-line { border-bottom: 1.5px solid #000; flex: 1; margin: 0 8px; min-width: 80px; display: inline-block; }
                table, th, td { border: 1.5px solid #000 !important; border-collapse: collapse; }
                
                .why-why-tree { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 20px; }
                .why-box { border: 2px solid #3b82f6; border-radius: 8px; padding: 10px; width: 140px; text-align: center; background: #eff6ff; font-size: 8pt; }
                .why-header { border: 2px solid #3b82f6; border-radius: 8px; padding: 10px; width: 140px; text-align: center; background: #60a5fa; color: white; font-weight: 900; font-size: 8pt; }
                .scat-column { border: 2px solid #000; padding: 10px; width: 100px; text-align: center; background: #fff; font-size: 8pt; min-height: 120px; display: flex; flex-direction: column; justify-content: center; }

                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm;
                        height: auto !important; /* Allow growing for multiple pages */
                        overflow: visible !important;
                        background: white !important;
                    }
                    
                    /* Hide everything via visibility pattern to avoid blank pages from parents */
                    body {
                        visibility: hidden !important;
                    }

                    #root, .app-container {
                        visibility: hidden !important;
                    }

                    /* TARGET THE REPORT CONTAINER */
                    .official-report-container {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important; /* Absolute allows flowing multiple pages */
                        top: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        height: auto !important;
                        z-index: 999999 !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    .official-report-container * {
                        visibility: visible !important;
                    }

                    .official-report-page {
                        margin: 0 !important;
                        border: none !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        page-break-after: always !important;
                        background: white !important;
                        box-shadow: none !important;
                        position: relative !important;
                        /* Ensure no offsets */
                        left: auto !important;
                        top: auto !important;
                    }

                    .footer-maroon {
                        position: absolute !important;
                        bottom: 12mm !important;
                        left: 15mm !important;
                        right: 15mm !important;
                        border-top: 3.5px solid #800000 !important;
                        display: flex !important;
                    }
                }
            `}</style>
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print:hidden">
                <div className="flex items-center gap-5">
                    <div className="bg-red-50 p-4 rounded-3xl border border-red-100 shadow-inner group transition-all">
                        <AlertTriangle className="w-10 h-10 text-red-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">ประวัติอุบัติเหตุและเหตุการณ์</h2>
                        <p className="text-slate-500 font-medium mt-1">ตรวจสอบและกำกับดูแลความปลอดภัยในการขับขี่ (Fleet Safety Monitor)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={handlePrintPDF}
                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        <Printer size={18} />
                        <span>พิมพ์รายงาน PDF</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Count</span>
                    </div>
                    <div className="mt-8">
                        <h4 className="text-4xl font-black text-slate-800 tabular-nums">{stats.total}</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">เหตุการณ์ทั้งหมดในช่วงที่เลือก</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Points</span>
                    </div>
                    <div className="mt-8">
                        <h4 className="text-4xl font-black text-orange-600 tabular-nums">-{stats.totalPoints}</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">คะแนนความปลอดภัยที่ถูกหักรวม</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fines</span>
                    </div>
                    <div className="mt-8">
                        <h4 className="text-4xl font-black text-blue-600 tabular-nums">฿{stats.totalFines.toLocaleString()}</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">มูลค่าค่าปรับสะสม</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-xl flex flex-col justify-between group text-white">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-white/10 rounded-2xl text-white backdrop-blur-md">
                            <Zap size={24} />
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Loss</span>
                    </div>
                    <div className="mt-8">
                        <h4 className="text-4xl font-black tabular-nums">฿{stats.totalDamage.toLocaleString()}</h4>
                        <p className="text-xs text-white/60 font-bold mt-1 uppercase tracking-wider">ความเสียหายต่อทรัพย์สินรวม</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-lg sticky top-6 z-20 print:hidden">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Search Incidents</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อพนักงาน, ทะเบียนรถ, สถานที่ หรือรายละเอียด..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="w-48">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            title="Filter by Type"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="ฝ่าฝืนกฎจราจร">🚧 ฝ่าฝืนกฎ</option>
                            <option value="อุบัติเหตุ">💥 อุบัติเหตุ</option>
                            <option value="การขับขี่เสี่ยง">⚠️ ความเสี่ยง</option>
                            <option value="อื่นๆ">📝 อื่นๆ</option>
                        </select>
                    </div>

                    <div className="w-48">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Severity</label>
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value as any)}
                            title="Filter by Severity"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                        >
                            <option value="all">ทุกระดับ</option>
                            <option value="low">🟡 ต่ำ</option>
                            <option value="medium">🟠 ปานกลาง</option>
                            <option value="high">🔴 สูง</option>
                            <option value="critical">💀 ร้ายแรง</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                title="Start Date Filter"
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                title="End Date Filter"
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('all');
                            setSeverityFilter('all');
                            setDateRange({ start: '', end: '' });
                        }}
                        className="p-4 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        title="Clear Filters"
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print-list-section">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่ / เวลา</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">พนักงาน & ยานพาหนะ</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">เหตุการณ์</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ระดับ</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานที่</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ผลกระทบ</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest print:hidden text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredIncidents.length > 0 ? (
                                filteredIncidents.map((incident) => {
                                    const driver = (Array.isArray(drivers) ? drivers : []).find(d => d.id === incident.driverId);
                                    const vehicle = (Array.isArray(vehicles) ? vehicles : []).find(v => v.id === incident.vehicleId);

                                    return (
                                        <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {new Date(incident.date).toLocaleDateString('th-TH')}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        {incident.time} น.
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                                            {driver?.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-800">{driver?.name || 'Unknown'}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-blue-600 mt-1.5 pl-10 flex items-center gap-1.5">
                                                        <Truck size={12} />
                                                        {vehicle?.licensePlate || 'ไม่ระบุ'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700 text-sm">{incident.type}</span>
                                                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[200px] font-medium" title={incident.description}>
                                                        {incident.description}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getSeverityStyle(incident.severity)}`}>
                                                    {getSeverityLabel(incident.severity)}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                                                    <MapPin size={14} className="shrink-0" />
                                                    <span className="line-clamp-1">{incident.location || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-red-600 font-black text-sm">หัก {incident.pointsDeducted} แต้ม</span>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                                        ค่าปรับ: {formatCurrency(incident.fineAmount)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 print:hidden">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setSelectedIncident(incident)}
                                                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                                                <AlertTriangle size={40} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-400">ไม่พบประวัติเหตุการณ์ที่ค้นหา</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedIncident && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 print:hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedIncident(null)}></div>
                    <div className="bg-white w-full max-w-4xl max-h-full overflow-y-auto rounded-[3rem] shadow-2xl relative z-10 animate-scale-in">
                        <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getSeverityStyle(selectedIncident.severity)}`}>
                                    <Info size={20} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800">รายละเอียดเหตุการณ์</h3>
                            </div>
                            <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Close">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 bg-slate-100/50 official-report-preview-container">
                            {/* Page 1 Preview exactly as Print */}
                            <div className="official-report-page shadow-xl mx-auto">
                                <div className="report-header-grid">
                                    <div className="header-box header-box-l">
                                        <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                        <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                                        <p className="text-[8px] font-bold text-slate-500">ส่งด่วน ส่งไว แน่นอน</p>
                                    </div>
                                    <div className="header-box flex items-center justify-center p-4">
                                        <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                                    </div>
                                </div>
                                <div className="text-right italic mb-2">Report No ................................................................</div>
                                <div className="text-center mb-10">
                                    <h2 className="text-xl font-bold underline">รายงานการสอบสวนอุบัติเหตุและอุบัติการณ์</h2>
                                    <p className="text-sm">(Incident Investigation Report)</p>
                                </div>
                                <div className="space-y-4 mb-8 text-[11px]">
                                    <div className="flex"><span className="w-32 font-bold">ต้นฉบับ (Original) :</span> <span>ผู้จัดการด้านความปลอดภัย (Safety Manager)</span></div>
                                    <div className="flex"><span className="w-32 font-bold">สำเนา (Copy) :</span> <span>หัวหน้าแผนกและหน่วยงานที่เกี่ยวข้อง (Section & Department Heads)</span></div>
                                </div>
                                <div className="space-y-6 text-sm">
                                    <div className="flex items-center">
                                        <span className="font-bold">1. วันที่เกิดเหตุ (Date of Incident):</span>
                                        <span className="signature-line text-center">{new Date(selectedIncident.date).toLocaleDateString('th-TH')}</span>
                                        <span className="font-bold">เวลา</span>
                                        <span className="signature-line text-center w-24">{selectedIncident.time}</span>
                                        <span className="font-bold">น.</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-bold">หัวข้ออุบัติเหตุ (Incident Title) :</span>
                                        <span className="signature-line flex-[2]">{selectedIncident.type}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-bold underline uppercase">รายงานเกี่ยวกับ (Report of)</p>
                                        <div className="pl-6 space-y-2">
                                            <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> <span>เหตุการณ์เกือบสูญเสีย (Near Miss)</span></div>
                                            <div className="flex items-center">
                                                <div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> <span>อุบัติเหตุ (Accident)</span>
                                                <div className="flex gap-6 ml-10">
                                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> พื้นที่บริษัทฯ</div>
                                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> พื้นที่ลูกค้า</div>
                                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> ระหว่างการขนส่ง</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold underline">2. ชื่อผู้ประสบเหตุ (Name of Witness/Person Involved)</p>
                                        <div className="flex">
                                            <span className="font-bold">พ.ข.ร. ชื่อ:</span>
                                            <span className="signature-line text-center">{(Array.isArray(drivers) ? drivers : []).find(d => d.id === selectedIncident.driverId)?.name || '-'}</span>
                                            <span className="font-bold">อายุ:</span>
                                            <span className="signature-line text-center w-20 underline">{(drivers.find(d => d.id === selectedIncident.driverId) as any)?.age || '...'}</span>
                                            <span className="font-bold">ปี</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                                    <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                                    <span>หน้า 1</span>
                                </div>
                            </div>
                            <p className="text-center text-slate-400 text-xs mt-4 italic">* นี่คือตัวอย่างรูปแบบรายงานทางการ คุณสามารถกดพิมพ์เพื่อดูทั้ง 10 หน้าได้</p>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                <Printer size={18} />
                                <span>พิมพ์ใบสรุปเหตุการณ์ (A4)</span>
                            </button>
                            <button onClick={() => setSelectedIncident(null)} className="px-10 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Official A4 Report (10 Pages) */}
            {selectedIncident && (
                <div className="hidden print:block absolute inset-0 bg-white z-[200] text-slate-900 official-report-container ring-0 outline-none">

                    {/* Page 1 */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                                <p className="text-[8px] font-bold text-slate-500">ส่งด่วน ส่งไว แน่นอน</p>
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="text-right italic mb-2">Report No ................................................................</div>
                        <div className="text-center mb-10">
                            <h2 className="text-xl">รายงานการสอบสวนอุบัติเหตุและอุบัติการณ์</h2>
                            <p className="text-sm">(Incident Investigation Report)</p>
                        </div>
                        <div className="space-y-3 mb-8">
                            <div className="flex"><span className="w-32 font-bold">ต้นฉบับ (Original) :</span> <span>ผู้จัดการด้านความปลอดภัย (Safety Manager)</span></div>
                            <div className="flex"><span className="w-32 font-bold">สำเนา (Copy) :</span> <span>หัวหน้าแผนกและหน่วยงานที่เกี่ยวข้อง (Section & Department Heads)</span></div>
                        </div>
                        <div className="space-y-5">
                            <div className="flex items-center">
                                <span className="font-bold">1. วันที่เกิดเหตุ (Date of Incident):</span>
                                <span className="signature-line text-center">{new Date(selectedIncident.date).toLocaleDateString('th-TH')}</span>
                                <span className="font-bold">เวลา</span>
                                <span className="signature-line text-center w-24">{selectedIncident.time}</span>
                                <span className="font-bold">น.</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-bold">หัวข้ออุบัติเหตุ (Incident Title) :</span>
                                <span className="signature-line flex-[2]">{selectedIncident.type}</span>
                            </div>
                            <div className="space-y-2">
                                <p className="font-bold underline">รายงานเกี่ยวกับ (Report of)</p>
                                <div className="pl-6 space-y-2">
                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> <span>เหตุการณ์เกือบสูญเสีย (Near Miss)</span></div>
                                    <div className="flex items-center">
                                        <div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> <span>อุบัติเหตุ (Accident)</span>
                                        <div className="flex gap-6 ml-10">
                                            <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> พื้นที่บริษัทฯ</div>
                                            <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center"></div> พื้นที่ลูกค้า</div>
                                            <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> ระหว่างการขนส่ง</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold underline">2. ชื่อผู้ประสบเหตุ (Name of Witness/Person Involved)</p>
                                <div className="flex">
                                    <span className="font-bold">พ.ข.ร. ชื่อ:</span>
                                    <span className="signature-line text-center">{(Array.isArray(drivers) ? drivers : []).find(d => d.id === selectedIncident.driverId)?.name || '-'}</span>
                                    <span className="font-bold">อายุ:</span>
                                    <span className="signature-line text-center w-20 underline">{(drivers.find(d => d.id === selectedIncident.driverId) as any)?.age || '...'}</span>
                                    <span className="font-bold">ปี</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 1</span>
                        </div>
                    </div>

                    {/* Page 2 */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="font-bold underline">3. สถานที่เกิดเหตุ (Location)</p>
                                <p className="signature-line w-full pb-2">{selectedIncident.location || 'ไม่ระบุสถานที่ (Location not specified)'}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="font-bold italic">รูปภาพที่เกิดเหตุ (Site Photos)</p>
                                <div className="border-2 border-slate-400 aspect-video rounded-3xl overflow-hidden bg-slate-50 flex items-center justify-center">
                                    {selectedIncident.photos && selectedIncident.photos[0] ? (
                                        <img src={selectedIncident.photos[0].url} className="w-full h-full object-contain" alt="Site" />
                                    ) : (
                                        <div className="text-slate-300 font-bold italic">Photo Area</div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold underline">4. รายละเอียดเหตุการณ์ (Description of Incident)</p>
                                <div className="min-h-[250px] p-6 border-2 border-slate-900 rounded-2xl whitespace-pre-wrap leading-relaxed text-[11pt]">
                                    {selectedIncident.description || 'ไม่มีรายละเอียดเหตุการณ์ระบุไว้ (No incident description provided)'}
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 2</span>
                        </div>
                    </div>

                    {/* Page 3: Immediate Action & Notification */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <p className="font-bold underline">5. การแก้ไขเบื้องต้น (Immediate Actions Taken)</p>
                                <div className="p-6 border-2 border-slate-900 rounded-2xl min-h-[150px] whitespace-pre-wrap">
                                    {selectedIncident.actionsTaken}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="font-bold underline">5.1 การติดต่อผู้เกี่ยวข้อง (Notification Log)</p>
                                <div className="pl-6 space-y-3">
                                    <div className="flex items-center"><div className="checkbox-box">&#10003;</div> ผู้บังคับบัญชา (Line Management)</div>
                                    <div className="flex items-center"><div className="checkbox-box">&#10003;</div> ประกันภัย (Insurance): {selectedIncident.insuranceProvider || '-'}</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> อื่นๆ (Others) ................................................................</div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="font-bold underline">5.2 หลักฐาน (Evidences)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedIncident.photos?.slice(1, 3).map((p: any, idx: number) => (
                                        <div key={idx} className="border border-slate-300 aspect-square rounded-xl overflow-hidden bg-slate-100">
                                            <img src={p.url} className="w-full h-full object-cover" alt="Evidence" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 3</span>
                        </div>
                    </div>

                    {/* Page 4: Drug/Alcohol Test and Injuries */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-4 text-sm">
                                <p className="font-bold underline">6. ตรวจหาการใช้ยาเสพติด (Drug & Alcohol Test)</p>
                                <div className="pl-6 space-y-4">
                                    <div className="flex items-center gap-10">
                                        <div className="flex items-center"><div className="checkbox-box">&#10003;</div> ตรวจแอลกอฮอล์ (Alcohol Test)</div>
                                        <div className="flex items-center">ผล: <div className="checkbox-box ml-4"></div> พบ <div className="checkbox-box ml-4">&#10003;</div> ไม่พบ</div>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="flex items-center"><div className="checkbox-box">&#10003;</div> ตรวจสารเสพติด (Drug Test)</div>
                                        <div className="flex items-center">ผล: <div className="checkbox-box ml-4"></div> พบ <div className="checkbox-box ml-4">&#10003;</div> ไม่พบ</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4">
                                <p className="font-bold underline">7. รายการบาดเจ็บพนักงาน (Injured Service Personnel)</p>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="p-2">ลำดับ</th>
                                            <th className="p-2">ชื่อ - นามสกุล</th>
                                            <th className="p-2">อายุ</th>
                                            <th className="p-2">ตำแหน่ง</th>
                                            <th className="p-2">อาการบาดเจ็บ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-10">
                                            <td className="text-center">1</td>
                                            <td className="px-2">{(Array.isArray(drivers) ? drivers : []).find(d => d.id === selectedIncident.driverId)?.name || '-'}</td>
                                            <td className="text-center underline underline-offset-4">{(drivers.find(d => d.id === selectedIncident.driverId) as any)?.age || '-'}</td>
                                            <td className="text-center">พนักงานขับรถ</td>
                                            <td className="px-2">{(selectedIncident as any).injuries || 'ไม่มี'}</td>
                                        </tr>
                                        {[2, 3, 4, 5].map(n => (
                                            <tr key={n} className="h-10">
                                                <td className="text-center">{n}</td><td></td><td></td><td></td><td></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 4</span>
                        </div>
                    </div>

                    {/* Page 5: Financial Damages & Disciplinary Action */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <p className="font-bold underline">8. ทรัพย์สินเสียหาย (Damages Summary)</p>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="p-4">รายการความเสียหาย</th>
                                            <th className="p-4">เจ้าของ</th>
                                            <th className="p-4">มูลค่าประเมิน (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-4">ความเสียหายยานพาหนะบริษัท</td>
                                            <td className="p-4 text-center">บริษัทฯ</td>
                                            <td className="p-4 text-right">฿{(selectedIncident.damageToVehicle || 0).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4">ความเสียหายทรัพย์สินบุคคลที่ 3</td>
                                            <td className="p-4 text-center">คู่กรณี</td>
                                            <td className="p-4 text-right">฿{(selectedIncident.damageToProperty || 0).toLocaleString()}</td>
                                        </tr>
                                        <tr className="font-black bg-slate-50">
                                            <td className="p-4" colSpan={2}>ยอดประเมินความเสียหายรวม</td>
                                            <td className="p-4 text-right underline underline-offset-4">฿{((selectedIncident.damageToVehicle || 0) + (selectedIncident.damageToProperty || 0)).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-4 pt-6">
                                <p className="font-bold underline">📍 ผลตรวจสอบบทลงโทษ (Disciplinary Action Outcome)</p>
                                <div className="p-8 border-2 border-red-600 rounded-3xl bg-red-50/50 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold">หักคะแนนพฤติกรรม (Driver Deductions):</span>
                                        <span className="text-3xl font-black text-red-600">-{selectedIncident.pointsDeducted} แต้ม</span>
                                    </div>
                                    <p className="text-sm text-slate-500 italic">* อ้างอิงตามระเบียบบริษัท หมวดความปลอดภัยในการใช้รถและถนน</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 5</span>
                        </div>
                    </div>

                    {/* Page 6: Root Cause Analysis Matrix */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-base">14. การวิเคราะห์สาเหตุเชิงลึก (Root Cause Analysis - RCA)</h2>
                            <div className="grid grid-cols-1 gap-4 text-[9pt] font-bold">
                                <div className="border border-black p-4 space-y-1">
                                    <p className="underline mb-2">14.1 ปัจจัยด้านบุคลากร (Personal Factors)</p>
                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> ขาดทักษะ/ความรู้ไม่เพียงพอ (Lack of Skill/Knowledge)</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> ฝ่าฝืนกฎ (Violation of Policy)</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> ความล้า (Fatigue)</div>
                                </div>
                                <div className="border border-black p-4 space-y-1">
                                    <p className="underline mb-2">14.2 ปัจจัยด้านเส้นทาง (Route/Road Conditions)</p>
                                    <div className="flex items-center"><div className="checkbox-box"></div> ขาดการประเมินความเสี่ยงเส้นทาง (Lack of Risk Assessment)</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> จุดเสี่ยงไม่ได้รับการแจ้งเตือน (Hazard not communicated)</div>
                                </div>
                                <div className="border border-black p-4 space-y-1">
                                    <p className="underline mb-2">14.3 ปัจจัยด้านยานพาหนะ (Vehicle Factors)</p>
                                    <div className="flex items-center"><div className="checkbox-box"></div> ขาดการตรวจความสม่ำเสมอ (Lack of maintenance)</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> อุปกรณ์ขัดข้อง (Mechanical failure)</div>
                                </div>
                                <div className="border border-black p-4 space-y-1">
                                    <p className="underline mb-2">14.4 ปัจจัยด้านสภาพแวดล้อม (Environmental Factors)</p>
                                    <div className="flex items-center"><div className="checkbox-box text-[8px] flex items-center justify-center font-bold">✓</div> ทัศนวิสัยไม่ดี/ฝนตก (Bad visibility/Rain)</div>
                                    <div className="flex items-center"><div className="checkbox-box"></div> แสงสว่างไม่เพียงพอ (Poor lighting)</div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 6</span>
                        </div>
                    </div>

                    {/* Page 7: Preventive Action Plan */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-base font-black underline">15. มาตรการป้องกันการเกิดซ้ำ (Preventive Action Plan)</h2>
                            <table className="w-full text-[8pt]">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="p-3 w-1/2">มาตรการแก้ไขและป้องกัน (Action Item)</th>
                                        <th className="p-3">ผู้รับผิดชอบ</th>
                                        <th className="p-3">กำหนดเสร็จ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="h-14">
                                        <td className="p-3 border">อบรมพฤติกรรมการขับขี่อย่างปลอดภัย (Defensive Driving Refresh)</td>
                                        <td className="p-3 border text-center">Fleet Manager</td>
                                        <td className="p-3 border text-center">ถัดไป 7 วัน</td>
                                    </tr>
                                    {[1, 2, 3, 4].map(i => <tr key={i} className="h-14"><td className="border"></td><td className="border"></td><td className="border"></td></tr>)}
                                </tbody>
                            </table>
                            <h2 className="text-base font-black underline pt-4">17. รายชื่อทีมบุคลากรที่ร่วมสอบสวน (Investigation Team)</h2>
                            <table className="w-full text-[8pt]">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="p-2">ชื่อ</th>
                                        <th className="p-2">ตำแหน่ง</th>
                                        <th className="p-2">ลายเซ็นต์</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="h-10"><td>1. .....................................</td><td>FLEET MANAGER</td><td></td></tr>
                                    <tr className="h-10"><td>2. .....................................</td><td>SAFETY OFFICER</td><td></td></tr>
                                    <tr className="h-10"><td>3. .....................................</td><td>DRIVER</td><td></td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 7</span>
                        </div>
                    </div>

                    {/* Page 8: Management Signoff */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <h2 className="text-base font-black underline">18. ความคิดเห็นของผู้บริหาร (Management Review)</h2>
                                <div className="p-6 border-2 border-slate-900 min-h-[150px] rounded-2xl italic text-slate-400">
                                    Comment Area...
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-20 pt-10">
                                <div className="text-center space-y-20">
                                    <p className="signature-line w-full"></p>
                                    <p className="font-bold underline uppercase">Reviewer / Manager</p>
                                </div>
                                <div className="text-center space-y-20">
                                    <p className="signature-line w-full"></p>
                                    <p className="font-bold underline uppercase">Safety Manager</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 8</span>
                        </div>
                    </div>

                    {/* Page 9: Analysis Detail (Road & Why-Why) */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="grid grid-cols-3 gap-4 font-bold text-[8pt]">
                                <div className="border p-2"><p className="underline mb-1">สภาพถนน</p><div className="checkbox-box text-[6px] mb-1">✓</div> เรียบ<br /><div className="checkbox-box text-[6px] mb-1"></div> ขรุขระ</div>
                                <div className="border p-2"><p className="underline mb-1">แสงสว่าง</p><div className="checkbox-box text-[6px] mb-1">✓</div> กลางวัน<br /><div className="checkbox-box text-[6px] mb-1"></div> กลางคืน</div>
                                <div className="border p-2"><p className="underline mb-1">ทัศนวิสัย</p><div className="checkbox-box text-[6px] mb-1">✓</div> ชัดเจน<br /><div className="checkbox-box text-[6px] mb-1"></div> มีหมอก/ฝน</div>
                            </div>
                            <div className="pt-6">
                                <p className="font-bold underline text-center mb-8 uppercase text-sm">การวิเคราะห์หาสาเหตุเชิงลึก (WHY-WHY Analysis)</p>
                                <div className="why-why-tree">
                                    <div className="why-header">อุบัติเหตุที่เกิด</div>
                                    <div className="w-10 border-t-2 border-slate-900"></div>
                                    <div className="why-box">Why 1</div>
                                    <div className="w-10 border-t-2 border-slate-900"></div>
                                    <div className="why-box">Why 2</div>
                                    <div className="w-10 border-t-2 border-slate-900"></div>
                                    <div className="why-box">Why 3 (Root)</div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 9</span>
                        </div>
                    </div>

                    {/* Page 10: SCAT & Final Signatures */}
                    <div className="official-report-page">
                        <div className="report-header-grid">
                            <div className="header-box header-box-l">
                                <p className="text-[10px] font-black leading-tight mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                                <img src="/logo.png" className="h-10 object-contain mb-1" alt="Neo Logo" />
                            </div>
                            <div className="header-box flex items-center justify-center p-4">
                                <p className="text-[14px] font-black text-blue-900 text-center leading-snug">Incident Report, Investigation And Analysis</p>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <p className="font-black text-center underline uppercase text-sm">การสืบสวนตามรูปแบบ SCAT (Systematic Cause Analysis Technique)</p>
                            <div className="flex justify-between items-center px-4">
                                {['Loss', 'Incident', 'Immediate Causes', 'Basic Causes', 'Control'].map((lbl, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className="scat-column">{lbl}</div>
                                        {idx < 4 && <div className="text-xl font-black">➔</div>}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-20 pt-20">
                                <div className="text-center space-y-16">
                                    <p className="signature-line w-full"></p>
                                    <p className="font-black text-xs uppercase underline">พนักงานขับรถ (DRIVER)</p>
                                </div>
                                <div className="text-center space-y-16">
                                    <p className="signature-line w-full"></p>
                                    <p className="font-black text-xs uppercase underline">ผู้ตรวจสอบ (FLEET MANAGER)</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-15 right-15 footer-maroon">
                            <span>บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</span>
                            <span>หน้า 10</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentLogPage;
