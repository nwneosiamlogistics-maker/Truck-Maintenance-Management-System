import React, { useState, useMemo } from 'react';
import type { PartWarranty, InsuranceClaim, Vehicle, WarrantyAlert, InsuranceAlert, StockItem, Supplier } from '../types';
import { formatCurrency } from '../utils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '../context/ToastContext';
import AddPartWarrantyModal from './AddPartWarrantyModal';
import AddWarrantyClaimModal from './AddWarrantyClaimModal';
import AddInsuranceClaimModal from './AddInsuranceClaimModal';
import CargoInsuranceView from './CargoInsuranceView';
import AddCargoPolicyModal from './AddCargoPolicyModal';
import AddCargoClaimModal from './AddCargoClaimModal';
import type { CargoInsurancePolicy, CargoInsuranceClaim, IncidentInvestigationReport } from '../types';
import AddIncidentInvestigationModal from './AddIncidentInvestigationModal';
import ReactDOMServer from 'react-dom/server';
import IncidentInvestigationPrintLayout from './IncidentInvestigationPrintLayout';

interface WarrantyInsuranceManagementProps {
    partWarranties: PartWarranty[];
    setPartWarranties: React.Dispatch<React.SetStateAction<PartWarranty[]>>;
    insuranceClaims: InsuranceClaim[];
    setInsuranceClaims: React.Dispatch<React.SetStateAction<InsuranceClaim[]>>;
    vehicles: Vehicle[];
    stock: StockItem[];
    suppliers: Supplier[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const WarrantyInsuranceManagement: React.FC<WarrantyInsuranceManagementProps> = ({
    partWarranties,
    setPartWarranties,
    insuranceClaims,
    setInsuranceClaims,
    vehicles,
    stock,
    suppliers
}) => {
    const [activeTab, setActiveTab] = useState<'warranty' | 'insurance' | 'cargo' | 'investigation'>('warranty');
    const [isAddWarrantyModalOpen, setIsAddWarrantyModalOpen] = useState(false);
    const [isAddInsuranceClaimModalOpen, setIsAddInsuranceClaimModalOpen] = useState(false);
    const [isAddCargoPolicyModalOpen, setIsAddCargoPolicyModalOpen] = useState(false);
    const [isAddCargoClaimModalOpen, setIsAddCargoClaimModalOpen] = useState(false);

    // Mock Data for Cargo (Prototype)
    const [cargoPolicies, setCargoPolicies] = useState<CargoInsurancePolicy[]>([]);
    const [cargoClaims, setCargoClaims] = useState<CargoInsuranceClaim[]>([]);

    // Incident Investigation State
    const [incidentReports, setIncidentReports] = useState<IncidentInvestigationReport[]>([]);
    const [isAddInvestigationModalOpen, setIsAddInvestigationModalOpen] = useState(false);

    const { addToast } = useToast();

    const handlePrintReport = (report: IncidentInvestigationReport) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = ReactDOMServer.renderToString(
                <IncidentInvestigationPrintLayout data={report} />
            );

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Incident Report - ${report.reportNo || 'Draft'}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            @page {
                                size: A4;
                                margin: 10mm;
                            }
                            html, body {
                                margin: 0;
                                padding: 0;
                                font-family: 'Sarabun', sans-serif;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                background: white;
                            }
                            .page-break {
                                page-break-after: always;
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            // Wait for Tailwind CDN and Fonts
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 1000);
        }
    };

    // Calculate warranty alerts
    const warrantyAlerts = useMemo((): WarrantyAlert[] => {
        const alerts: WarrantyAlert[] = [];
        const now = new Date();

        partWarranties.forEach(warranty => {
            if (!warranty.isActive) return;

            const expiryDate = new Date(warranty.warrantyExpiry);
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysRemaining < 0) {
                alerts.push({
                    id: `alert-${warranty.id}`,
                    type: 'warranty_expired',
                    warrantyId: warranty.id,
                    partName: warranty.partName,
                    expiryDate: warranty.warrantyExpiry,
                    daysRemaining,
                    severity: 'high',
                    message: `การรับประกัน ${warranty.partName} หมดอายุแล้ว ${Math.abs(daysRemaining)} วัน`
                });
            } else if (daysRemaining <= 30) {
                alerts.push({
                    id: `alert-${warranty.id}`,
                    type: 'warranty_expiring',
                    warrantyId: warranty.id,
                    partName: warranty.partName,
                    expiryDate: warranty.warrantyExpiry,
                    daysRemaining,
                    severity: daysRemaining <= 7 ? 'high' : 'medium',
                    message: `การรับประกัน ${warranty.partName} จะหมดอายุใน ${daysRemaining} วัน`
                });
            }

            // Check pending claims
            const pendingClaims = warranty.claims.filter(c => c.claimStatus === 'pending');
            if (pendingClaims.length > 0) {
                alerts.push({
                    id: `claim-alert-${warranty.id}`,
                    type: 'claim_pending',
                    warrantyId: warranty.id,
                    partName: warranty.partName,
                    severity: 'medium',
                    message: `มี ${pendingClaims.length} การเคลมรอดำเนินการสำหรับ ${warranty.partName}`
                });
            }
        });

        return alerts.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }, [partWarranties]);

    // Calculate insurance alerts
    const insuranceAlerts = useMemo((): InsuranceAlert[] => {
        const alerts: InsuranceAlert[] = [];
        const now = new Date();

        vehicles.forEach(vehicle => {
            // Check vehicle insurance
            if (vehicle.insuranceExpiryDate) {
                const expiryDate = new Date(vehicle.insuranceExpiryDate);
                const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysRemaining < 0) {
                    alerts.push({
                        id: `ins-alert-${vehicle.id}`,
                        type: 'policy_expired',
                        vehicleId: vehicle.id,
                        vehicleLicensePlate: vehicle.licensePlate,
                        insuranceType: 'vehicle',
                        expiryDate: vehicle.insuranceExpiryDate,
                        daysRemaining,
                        severity: 'high',
                        message: `ประกันรถ ${vehicle.licensePlate} หมดอายุแล้ว ${Math.abs(daysRemaining)} วัน`
                    });
                } else if (daysRemaining <= 60) {
                    alerts.push({
                        id: `ins-alert-${vehicle.id}`,
                        type: 'policy_expiring',
                        vehicleId: vehicle.id,
                        vehicleLicensePlate: vehicle.licensePlate,
                        insuranceType: 'vehicle',
                        expiryDate: vehicle.insuranceExpiryDate,
                        daysRemaining,
                        severity: daysRemaining <= 30 ? 'high' : 'medium',
                        message: `ประกันรถ ${vehicle.licensePlate} จะหมดอายุใน ${daysRemaining} วัน`
                    });
                }
            }

            // Check ACT insurance
            if (vehicle.actExpiryDate) {
                const expiryDate = new Date(vehicle.actExpiryDate);
                const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysRemaining < 0) {
                    alerts.push({
                        id: `act-alert-${vehicle.id}`,
                        type: 'policy_expired',
                        vehicleId: vehicle.id,
                        vehicleLicensePlate: vehicle.licensePlate,
                        insuranceType: 'act',
                        expiryDate: vehicle.actExpiryDate,
                        daysRemaining,
                        severity: 'high',
                        message: `พ.ร.บ. ${vehicle.licensePlate} หมดอายุแล้ว ${Math.abs(daysRemaining)} วัน`
                    });
                } else if (daysRemaining <= 60) {
                    alerts.push({
                        id: `act-alert-${vehicle.id}`,
                        type: 'policy_expiring',
                        vehicleId: vehicle.id,
                        vehicleLicensePlate: vehicle.licensePlate,
                        insuranceType: 'act',
                        expiryDate: vehicle.actExpiryDate,
                        daysRemaining,
                        severity: daysRemaining <= 30 ? 'high' : 'medium',
                        message: `พ.ร.บ. ${vehicle.licensePlate} จะหมดอายุใน ${daysRemaining} วัน`
                    });
                }
            }
        });

        // Check pending insurance claims
        const pendingClaims = insuranceClaims.filter(c => c.status === 'filed' || c.status === 'under_review');
        pendingClaims.forEach(claim => {
            alerts.push({
                id: `claim-${claim.id}`,
                type: 'claim_pending',
                vehicleId: claim.vehicleId,
                vehicleLicensePlate: claim.vehicleLicensePlate,
                insuranceType: 'vehicle',
                severity: 'medium',
                message: `การเคลมประกัน ${claim.claimNumber} รอดำเนินการ`
            });
        });

        return alerts.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }, [vehicles, insuranceClaims]);

    // Warranty statistics
    const warrantyStats = useMemo(() => {
        const active = partWarranties.filter(w => w.isActive).length;
        const totalClaims = partWarranties.reduce((sum, w) => sum + w.claims.length, 0);
        const pendingClaims = partWarranties.reduce((sum, w) =>
            sum + w.claims.filter(c => c.claimStatus === 'pending').length, 0
        );
        const approvedClaims = partWarranties.reduce((sum, w) =>
            sum + w.claims.filter(c => c.claimStatus === 'approved' || c.claimStatus === 'completed').length, 0
        );
        const totalValue = partWarranties.reduce((sum, w) => sum + w.purchaseCost, 0);

        return { active, totalClaims, pendingClaims, approvedClaims, totalValue };
    }, [partWarranties]);

    // Insurance statistics
    const insuranceStats = useMemo(() => {
        const totalClaims = insuranceClaims.length;
        const pending = insuranceClaims.filter(c => c.status === 'filed' || c.status === 'under_review').length;
        const approved = insuranceClaims.filter(c => c.status === 'approved' || c.status === 'paid').length;
        const totalClaimed = insuranceClaims.reduce((sum, c) => sum + c.claimAmount, 0);
        const totalPaid = insuranceClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

        return { totalClaims, pending, approved, totalClaimed, totalPaid };
    }, [insuranceClaims]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">การรับประกันและประกันภัย</h2>
                        <p className="text-gray-500 mt-1">จัดการการรับประกันอะไหล่และเคลมประกันรถ</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setActiveTab('warranty');
                                setIsAddWarrantyModalOpen(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all font-bold ${activeTab === 'warranty'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">เพิ่มการรับประกัน</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab('insurance');
                                setIsAddInsuranceClaimModalOpen(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all font-bold ${activeTab === 'insurance'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="hidden sm:inline">แจ้งเคลมประกัน</span>
                        </button>

                        {activeTab === 'cargo' && (
                            <button
                                onClick={() => setIsAddCargoPolicyModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">เพิ่มกรมธรรม์สินค้า</span>
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('investigation')}
                            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'investigation' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                🚔 สอบสวนอุบัติเหตุ
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('warranty')}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'warranty'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        📦 การรับประกันอะไหล่
                    </button>
                    <button
                        onClick={() => setActiveTab('insurance')}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'insurance'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        🚗 การเคลมประกันรถ
                    </button>
                    <button
                        onClick={() => setActiveTab('cargo')}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'cargo'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        🚛 ประกันภัยสินค้า (Cargo)
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            {(warrantyAlerts.length > 0 || insuranceAlerts.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {warrantyAlerts.length > 0 && (
                        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                                </svg>
                                แจ้งเตือนการรับประกัน ({warrantyAlerts.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {warrantyAlerts.map(alert => (
                                    <div key={alert.id} className={`p-3 rounded-xl border-l-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                                        alert.severity === 'medium' ? 'bg-amber-50 border-amber-500' :
                                            'bg-blue-50 border-blue-500'
                                        }`}>
                                        <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {insuranceAlerts.length > 0 && (
                        <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                </svg>
                                แจ้งเตือนประกันภัย ({insuranceAlerts.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {insuranceAlerts.map(alert => (
                                    <div key={alert.id} className={`p-3 rounded-xl border-l-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                                        alert.severity === 'medium' ? 'bg-amber-50 border-amber-500' :
                                            'bg-blue-50 border-blue-500'
                                        }`}>
                                        <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* Content based on active tab */}
            {activeTab === 'warranty' ? (
                <>
                    {/* Warranty Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">การรับประกันทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{warrantyStats.active}</h3>
                                    <p className="text-xs text-blue-100 mt-1">รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-emerald-100 font-bold uppercase tracking-wider">เคลมอนุมัติ</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{warrantyStats.approvedClaims}</h3>
                                    <p className="text-xs text-emerald-100 mt-1">จาก {warrantyStats.totalClaims} รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-amber-100 font-bold uppercase tracking-wider">รอดำเนินการ</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{warrantyStats.pendingClaims}</h3>
                                    <p className="text-xs text-amber-100 mt-1">รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-purple-100 font-bold uppercase tracking-wider">มูลค่าทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(warrantyStats.totalValue).replace('฿', '')}</h3>
                                    <p className="text-xs text-purple-100 mt-1">บาท</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warranty Table */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">รายการการรับประกันอะไหล่</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">ชื่ออะไหล่</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">ผู้จำหน่าย</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">วันหมดอายุ</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">มูลค่า</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase">การเคลม</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {partWarranties.map(warranty => {
                                        const expiryDate = new Date(warranty.warrantyExpiry);
                                        const daysRemaining = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        const isExpired = daysRemaining < 0;
                                        const isExpiringSoon = daysRemaining <= 30 && daysRemaining >= 0;

                                        return (
                                            <tr key={warranty.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{warranty.partName}</p>
                                                        {warranty.vehicleLicensePlate && (
                                                            <p className="text-xs text-slate-500">{warranty.vehicleLicensePlate}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{warranty.supplier}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className={`text-sm font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                                                            {new Date(warranty.warrantyExpiry).toLocaleDateString('th-TH')}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {isExpired ? `หมดอายุแล้ว ${Math.abs(daysRemaining)} วัน` : `เหลือ ${daysRemaining} วัน`}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">{formatCurrency(warranty.purchaseCost)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-medium text-slate-600">
                                                        {warranty.claims.length} รายการ
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${warranty.isActive && !isExpired ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {warranty.isActive && !isExpired ? 'ใช้งานได้' : 'หมดอายุ'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {partWarranties.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                    </svg>
                                    <p className="font-medium">ยังไม่มีข้อมูลการรับประกัน</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Insurance Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">การเคลมทั้งหมด</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{insuranceStats.totalClaims}</h3>
                                    <p className="text-xs text-blue-100 mt-1">รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-emerald-100 font-bold uppercase tracking-wider">อนุมัติแล้ว</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{insuranceStats.approved}</h3>
                                    <p className="text-xs text-emerald-100 mt-1">รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-amber-100 font-bold uppercase tracking-wider">รอดำเนินการ</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{insuranceStats.pending}</h3>
                                    <p className="text-xs text-amber-100 mt-1">รายการ</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-purple-100 font-bold uppercase tracking-wider">จ่ายแล้ว</p>
                                    <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(insuranceStats.totalPaid).replace('฿', '')}</h3>
                                    <p className="text-xs text-purple-100 mt-1">บาท</p>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insurance Claims Table */}
                    <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800">รายการเคลมประกันรถ</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">เลขที่เคลม</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">ทะเบียนรถ</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">ประเภท</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">วันที่เกิดเหตุ</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">จำนวนเคลม</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {insuranceClaims.map(claim => (
                                        <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{claim.claimNumber}</p>
                                                    <p className="text-xs text-slate-500">{claim.insuranceCompany}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{claim.vehicleLicensePlate}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">
                                                    {claim.incidentType === 'collision' ? 'ชน' :
                                                        claim.incidentType === 'theft' ? 'ขโมย' :
                                                            claim.incidentType === 'fire' ? 'ไฟไหม้' :
                                                                claim.incidentType === 'flood' ? 'น้ำท่วม' : 'อื่นๆ'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(claim.incidentDate).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                                {formatCurrency(claim.claimAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${claim.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    claim.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                        claim.status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                                            claim.status === 'denied' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {claim.status === 'paid' ? 'จ่ายแล้ว' :
                                                        claim.status === 'approved' ? 'อนุมัติ' :
                                                            claim.status === 'under_review' ? 'ตรวจสอบ' :
                                                                claim.status === 'denied' ? 'ปฏิเสธ' : 'ยื่นเคลม'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {insuranceClaims.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="font-medium">ยังไม่มีข้อมูลการเคลมประกัน</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Cargo View */}
            {activeTab === 'cargo' && (
                <CargoInsuranceView
                    policies={cargoPolicies}
                    claims={cargoClaims}
                    onAddPolicy={() => setIsAddCargoPolicyModalOpen(true)}
                    onAddClaim={() => setIsAddCargoClaimModalOpen(true)}
                />
            )}

            {activeTab === 'investigation' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-orange-100 p-2 rounded-lg text-2xl">🕵️</span>
                                รายงานการสอบสวนอุบัติเหตุ (Incident Investigation)
                            </h3>
                            <p className="text-slate-500 text-sm mt-1 ml-12">บันทึกและวิเคราะห์อุบัติเหตุเพื่อป้องกันการเกิดซ้ำ</p>
                        </div>
                        <button
                            onClick={() => setIsAddInvestigationModalOpen(true)}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            สร้างรายงานสอบสวน
                        </button>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">รายงานทั้งหมด</p>
                                <p className="text-2xl font-bold text-slate-800">{incidentReports.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="bg-orange-50 p-3 rounded-full text-orange-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">รอการแก้ไข (Open)</p>
                                <p className="text-2xl font-bold text-slate-800">{incidentReports.filter(r => r.status === 'Open').length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="bg-green-50 p-3 rounded-full text-green-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">ปิดงานแล้ว (Closed)</p>
                                <p className="text-2xl font-bold text-slate-800">{incidentReports.filter(r => r.status === 'Closed').length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Report List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">เลขที่เอกสาร</th>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">วันที่ / เวลา</th>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">รถ / คนขับ</th>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">รายละเอียดอุบัติเหตุ</th>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">สาเหตุ (Root Cause)</th>
                                        <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">การเชื่อมโยง</th>
                                        <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">สถานะ</th>
                                        <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Export</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {incidentReports.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p>ยังไม่มีรายงานอุบัติเหตุ</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        incidentReports.map(report => (
                                            <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                        {report.reportNo || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{new Date(report.incidentDate).toLocaleDateString('th-TH')}</div>
                                                    <div className="text-xs text-slate-500">{report.incidentTime} น.</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700">{report.vehicleLicensePlate}</div>
                                                    <div className="text-xs text-slate-500">{report.driverName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs break-words text-sm text-slate-600 line-clamp-2" title={report.description}>
                                                        {report.description}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs break-words text-sm text-slate-600 line-clamp-2" title={report.rootCause}>
                                                        {report.rootCause}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-2">
                                                        {report.relatedVehicleClaimId && (
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs px-2 py-1 rounded-full border border-blue-200" title="มีประกันรถ">
                                                                🚗 เคลมรถ
                                                            </span>
                                                        )}
                                                        {report.relatedCargoClaimId && (
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs px-2 py-1 rounded-full border border-purple-200" title="มีประกันสินค้า">
                                                                📦 เคลมสินค้า
                                                            </span>
                                                        )}
                                                        {!report.relatedVehicleClaimId && !report.relatedCargoClaimId && (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${report.status === 'Open' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        report.status === 'Investigating' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                            'bg-green-100 text-green-700 border-green-200'
                                                        }`}>
                                                        {report.status === 'Open' ? 'รอแก้ไข' :
                                                            report.status === 'Investigating' ? 'กำลังสอบสวน' : 'ปิดงาน'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => handlePrintReport(report)} className="text-slate-400 hover:text-red-500 transition-colors" title="Export to PDF">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {isAddWarrantyModalOpen && (
                <AddPartWarrantyModal
                    onClose={() => setIsAddWarrantyModalOpen(false)}
                    onSave={(newWarranty) => {
                        const warrantyWithId: PartWarranty = {
                            id: `W-${Date.now()}`,
                            ...newWarranty,
                            isActive: true,
                            claims: []
                        };
                        setPartWarranties(prev => [...prev, warrantyWithId]);
                        setIsAddWarrantyModalOpen(false);
                        addToast('เพิ่มการรับประกันสำเร็จ', 'success');
                    }}
                    stock={stock}
                    suppliers={suppliers}
                />
            )}

            {isAddInsuranceClaimModalOpen && (
                <AddInsuranceClaimModal
                    onClose={() => setIsAddInsuranceClaimModalOpen(false)}
                    onSave={(newClaim) => {
                        const claimWithId: InsuranceClaim = {
                            id: `CLM-${Date.now()}`,
                            ...newClaim,
                            status: 'filed',
                            history: [{
                                date: new Date().toISOString(),
                                status: 'filed',
                                note: 'ยื่นเรื่องเคลมใหม่'
                            }]
                        };
                        setInsuranceClaims(prev => [...prev, claimWithId]);
                        setIsAddInsuranceClaimModalOpen(false);
                        addToast(`แจ้งเคลมประกันสำเร็จ (เลขที่: ${newClaim.claimNumber})`, 'success');
                    }}
                    vehicles={vehicles}
                    existingClaims={insuranceClaims}
                />
            )}

            {isAddCargoPolicyModalOpen && (
                <AddCargoPolicyModal
                    onClose={() => setIsAddCargoPolicyModalOpen(false)}
                    onSave={(newPolicy) => {
                        const policyWithId: CargoInsurancePolicy = {
                            id: `CP-${Date.now()}`,
                            ...newPolicy
                        };
                        setCargoPolicies(prev => [...prev, policyWithId]);
                        addToast('เพิ่มกรมธรรม์ประกันภัยสินค้าสำเร็จ', 'success');
                    }}
                />
            )}

            {isAddCargoClaimModalOpen && (
                <AddCargoClaimModal
                    onClose={() => setIsAddCargoClaimModalOpen(false)}
                    policies={cargoPolicies}
                    onSave={(newClaim) => {
                        const claimWithId: CargoInsuranceClaim = {
                            id: `CC-${Date.now()}`,
                            ...newClaim
                        };
                        setCargoClaims(prev => [...prev, claimWithId]);
                        addToast('บันทึกการเคลมประกันสินค้าสำเร็จ', 'success');
                    }}
                />
            )}
            {isAddInvestigationModalOpen && (
                <AddIncidentInvestigationModal
                    onClose={() => setIsAddInvestigationModalOpen(false)}
                    vehicles={vehicles}
                    existingVehicleClaims={insuranceClaims}
                    existingCargoClaims={cargoClaims}
                    onSave={(newReport) => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const yearPrefix = `RPT-${year}-`;

                        // Calculate next sequence ID
                        const currentYearReports = incidentReports.filter(r => r.reportNo && r.reportNo.startsWith(yearPrefix));
                        let nextSeq = 1;
                        if (currentYearReports.length > 0) {
                            const seqs = currentYearReports.map(r => {
                                const parts = r.reportNo.split('-');
                                return parts.length === 3 ? parseInt(parts[2], 10) : 0;
                            });
                            nextSeq = Math.max(...seqs) + 1;
                        }
                        const reportNo = `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;

                        const reportWithId: IncidentInvestigationReport = {
                            id: `INV-${Date.now()}`,
                            reportNo: reportNo,
                            ...newReport as any, // Ensuring reportNo is included even if omitted in interface
                            createdAt: now.toISOString(),
                            updatedAt: now.toISOString(),
                            createdBy: 'Admin' // Should be current user
                        };
                        setIncidentReports(prev => [reportWithId, ...prev]);
                        setIsAddInvestigationModalOpen(false);
                        addToast(`บันทึกรายงานสำเร็จ เลขที่ ${reportNo}`, 'success');
                    }}
                />
            )}
        </div>
    );
};

export default WarrantyInsuranceManagement;
