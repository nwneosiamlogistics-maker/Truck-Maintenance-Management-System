import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import type { IncidentInvestigationReport, Vehicle, InsuranceClaim, CargoInsuranceClaim, Driver } from '../types';
import { formatCurrency } from '../utils';
import IncidentInvestigationPrintLayout from './IncidentInvestigationPrintLayout';

interface AddIncidentInvestigationModalProps {
    onClose: () => void;
    onSave: (report: Omit<IncidentInvestigationReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
    vehicles: Vehicle[];
    drivers: Driver[];
    existingVehicleClaims: InsuranceClaim[];
    existingCargoClaims: CargoInsuranceClaim[];
}

const AddIncidentInvestigationModal: React.FC<AddIncidentInvestigationModalProps> = ({
    onClose,
    onSave,
    vehicles,
    drivers,
    existingVehicleClaims,
    existingCargoClaims
}) => {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = ReactDOMServer.renderToString(
                <IncidentInvestigationPrintLayout data={formData as IncidentInvestigationReport} />
            );

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Incident Report - ${formData.reportNo || 'Draft'}</title>
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

    // Initial State - Matches the COMPLEX FORM
    const [formData, setFormData] = useState<Partial<IncidentInvestigationReport>>({
        reportNo: `RPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        incidentDate: new Date().toISOString().split('T')[0],
        incidentTime: '00:00',
        incidentShift: '06:01-12:00',
        reportType: 'Accident',
        incidentTitle: '',

        incidentType: {
            injuryFatality: false,
            fireExplosion: false,
            spill: false,
            propertyDamage: false,
            envImpact: false,
            vehicleIncident: false,
            reputationImpact: false,
            other: false
        },

        driverName: '',
        location: '',
        locationIsCompanyPremise: false,
        vehicleLicensePlate: '',
        description: '',

        immediateCorrectiveActions: '',
        restorationDetails: '',

        notifications: {},
        drugAlcoholTest: {
            alcoholResult: 'Not Tested',
            drugResult: 'Not Tested',
            medicationCheck: 'Unknown'
        },

        injuredEmployees: [],
        injuredThirdParties: [],
        damagedProducts: [],
        damagedProperties: [],

        rootCauseAnalysis: {
            personalFactors: [],
            routeHazardous: [],
            truckCondition: [],
            environment: [],
            companyPolicy: [],
            remarks: ''
        },
        whyWhyAnalysis: {
            problem: '',
            roots: [{ id: 'init-1', text: '', children: [] }]
        },
        scatAnalysis: {
            lackOfControl: '',
            basicCauses: '',
            immediateCauses: '',
            incident: '',
            accident: ''
        },

        preventiveActions: [],
        recommendations: [],
        investigationTeam: [],

        siteConditions: {},
        managementReview: {
            requireMoreInvestigation: false,
            reviewerName: '',
            reviewerPosition: '',
            reviewerCompany: '',
            reviewedDate: ''
        },
        topManagementAcknowledge: {
            name: '',
            position: '',
            company: '',
            date: ''
        },

        status: 'Open',
        investigatorName: '',
        investigationDate: new Date().toISOString().split('T')[0]
    });

    const [activeTab, setActiveTab] = useState<'General' | 'Details' | 'Analysis' | 'Outcome'>('General');
    const [isDriverSuggestionsOpen, setIsDriverSuggestionsOpen] = useState(false);
    const [driverSuggestions, setDriverSuggestions] = useState<Driver[]>([]);
    const driverSuggestionsRef = React.useRef<HTMLDivElement>(null);

    const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const vehicleId = e.target.value;
        const vehicle = vehicles.find(v => v.id === vehicleId);

        setFormData(prev => ({
            ...prev,
            vehicleId: vehicleId,
            vehicleLicensePlate: vehicle ? vehicle.licensePlate : ''
        }));
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (driverSuggestionsRef.current && !driverSuggestionsRef.current.contains(event.target as Node)) {
                setIsDriverSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDriverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, driverName: value }));

        if (value) {
            const filtered = drivers.filter(d =>
                d.name.toLowerCase().includes(value.toLowerCase()) ||
                d.employeeId.toLowerCase().includes(value.toLowerCase())
            );
            setDriverSuggestions(filtered);
            setIsDriverSuggestionsOpen(true);
        } else {
            setDriverSuggestions(drivers);
            setIsDriverSuggestionsOpen(true);
        }
    };

    const handleDriverSuggestionClick = (driver: Driver) => {
        const vehicle = driver.primaryVehicle ? vehicles.find(v => v.licensePlate === driver.primaryVehicle) : null;
        setFormData(prev => ({
            ...prev,
            driverName: driver.name,
            vehicleId: vehicle ? vehicle.id : prev.vehicleId,
            vehicleLicensePlate: vehicle ? vehicle.licensePlate : prev.vehicleLicensePlate
        }));
        setIsDriverSuggestionsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation could be added here
        onSave(formData as Omit<IncidentInvestigationReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>);
    };

    // Helper for updating nested incident types
    const updateIncidentType = (field: keyof IncidentInvestigationReport['incidentType'], value: any) => {
        setFormData(prev => ({
            ...prev,
            incidentType: {
                ...prev.incidentType!,
                [field]: value
            }
        }));
    };

    // Helper for checklists in Root Cause
    const toggleRootCause = (category: keyof IncidentInvestigationReport['rootCauseAnalysis'], item: string) => {
        setFormData(prev => {
            const currentList = prev.rootCauseAnalysis![category] as string[];
            const isAdding = !currentList.includes(item);
            const newList = isAdding
                ? [...currentList, item]
                : currentList.filter(i => i !== item);

            // Sync with Why-Why Analysis Tree
            let newRoots = [...(prev.whyWhyAnalysis?.roots || [])];

            if (isAdding) {
                const alreadyExists = newRoots.some(root => root.text === item);
                if (!alreadyExists) {
                    newRoots.push({
                        id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        text: item,
                        children: []
                    });
                }
            } else {
                // Optional: Only remove if it hasn't been modified? 
                // For now, we remove if the text matches exactly.
                newRoots = newRoots.filter(root => root.text !== item);
            }

            // Sync with SCAT Analysis
            const newScat = { ...(prev.scatAnalysis || { lackOfControl: '', basicCauses: '', immediateCauses: '', incident: '', accident: '' }) };
            let targetScatField: keyof typeof newScat | null = null;

            if (category === 'personalFactors') targetScatField = 'basicCauses';
            else if (['routeHazardous', 'truckCondition', 'environment'].includes(category)) targetScatField = 'immediateCauses';
            else if (category === 'companyPolicy') targetScatField = 'lackOfControl';

            if (targetScatField) {
                const currentText = newScat[targetScatField] || '';
                const itemBullet = `- ${item}`;

                if (isAdding) {
                    if (!currentText.includes(itemBullet)) {
                        newScat[targetScatField] = currentText ? `${currentText}\n${itemBullet}` : itemBullet;
                    }
                } else {
                    const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?:^|\\n)- ${escapedItem}(?=$|\\n)`, 'g');
                    newScat[targetScatField] = currentText.replace(regex, '').trim();
                }
            }

            return {
                ...prev,
                rootCauseAnalysis: {
                    ...prev.rootCauseAnalysis!,
                    [category]: newList
                },
                whyWhyAnalysis: {
                    ...prev.whyWhyAnalysis!,
                    roots: newRoots
                },
                scatAnalysis: newScat
            };
        });
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-[95vw] max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-2xl font-bold text-slate-800 truncate">📄 รายงานการสอบสวนอุบัติเหตุ</h3>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">Report No: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{formData.reportNo || 'Auto-generated'}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors shrink-0 ml-2" title="ปิดหน้าต่าง" aria-label="ปิดหน้าต่าง">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex overflow-x-auto bg-white/50 p-1 rounded-xl backdrop-blur-sm border border-slate-200 -mx-1 sm:mx-0">
                        {['General', 'Details', 'Analysis', 'Outcome'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'bg-white shadow text-orange-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab === 'General' && '1. ข้อมูลทั่วไป'}
                                {tab === 'Details' && '2. รายละเอียด'}
                                {tab === 'Analysis' && '3. วิเคราะห์'}
                                {tab === 'Outcome' && '4. แก้ไข'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body - Scrollable */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 sm:space-y-8 bg-slate-50/50">

                    {/* TAB 1: GENERAL INFORMATION */}
                    {
                        activeTab === 'General' && (
                            <div className="space-y-8 animate-fade-in">
                                {/* Section 1: Date/Time/Title */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">1. วันที่เกิดเหตุ & ข้อมูลเบื้องต้น</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ (Date)</label>
                                            <input type="date" value={formData.incidentDate} onChange={e => setFormData({ ...formData, incidentDate: e.target.value })} className="w-full form-input" required title="วันที่เกิดเหตุ" aria-label="วันที่เกิดเหตุ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">เวลา (Time)</label>
                                            <input type="time" value={formData.incidentTime} onChange={e => setFormData({ ...formData, incidentTime: e.target.value })} className="w-full form-input" required title="เวลาที่เกิดเหตุ" aria-label="เวลาที่เกิดเหตุ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">กะ/ช่วงเวลา (Shift)</label>
                                            <select value={formData.incidentShift} onChange={e => setFormData({ ...formData, incidentShift: e.target.value as any })} className="w-full form-select" title="กะ/ช่วงเวลา" aria-label="กะ/ช่วงเวลา">
                                                <option value="02:01-06:00">02:01 - 06:00</option>
                                                <option value="06:01-12:00">06:01 - 12:00</option>
                                                <option value="12:01-18:00">12:01 - 18:00</option>
                                                <option value="18:01-02:00">18:01 - 02:00</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทรายงาน</label>
                                            <div className="flex gap-4 mt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="reportType" checked={formData.reportType === 'Near Miss'} onChange={() => setFormData({ ...formData, reportType: 'Near Miss' })} className="text-orange-500 focus:ring-orange-500" />
                                                    <span className="text-sm font-medium">Near Miss</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="reportType" checked={formData.reportType === 'Accident'} onChange={() => setFormData({ ...formData, reportType: 'Accident' })} className="text-red-500 focus:ring-red-500" />
                                                    <span className="text-sm font-medium">Accident</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">หัวข้ออุบัติเหตุ (Incident Title)</label>
                                        <input type="text" value={formData.incidentTitle} onChange={e => setFormData({ ...formData, incidentTitle: e.target.value })} className="w-full form-input" placeholder="เช่น รถเฉี่ยวชนที่ลานจอด..." required />
                                    </div>
                                </div>

                                {/* Section 2: Type of Incident Checklist */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">ประเภทของอุบัติเหตุ (Type of Incident)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.injuryFatality} onChange={e => updateIncidentType('injuryFatality', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">บาดเจ็บ / เสียชีวิต</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.fireExplosion} onChange={e => updateIncidentType('fireExplosion', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">ไฟไหม้ / ระเบิด</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.spill} onChange={e => updateIncidentType('spill', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">สินค้าหก / รั่วไหล</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.propertyDamage} onChange={e => updateIncidentType('propertyDamage', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">ทรัพย์สินเสียหาย</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.envImpact} onChange={e => updateIncidentType('envImpact', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">ผลกระทบสิ่งแวดล้อม/ชุมชน</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.incidentType?.vehicleIncident} onChange={e => updateIncidentType('vehicleIncident', e.target.checked)} className="text-red-600 rounded focus:ring-red-500" />
                                            <span className="font-medium text-slate-700">เกี่ยวกับยานพาหนะ</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Section 3: Driver & Vehicle */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">3. ผู้ประสบเหตุ / พนักงานขับรถ & ยานพาหนะ</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div ref={driverSuggestionsRef} className="relative">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อพนักงานขับรถ (Driver Name)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.driverName}
                                                    onChange={handleDriverInputChange}
                                                    onFocus={() => {
                                                        setDriverSuggestions(drivers.filter(d =>
                                                            d.name.toLowerCase().includes((formData.driverName || '').toLowerCase()) ||
                                                            d.employeeId.toLowerCase().includes((formData.driverName || '').toLowerCase())
                                                        ));
                                                        setIsDriverSuggestionsOpen(true);
                                                    }}
                                                    className="w-full form-input"
                                                    placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                                                    autoComplete="off"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {isDriverSuggestionsOpen && (
                                                <ul className="absolute z-[10000] w-full bg-white border border-slate-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-2xl animate-scale-in">
                                                    {driverSuggestions.length > 0 ? (
                                                        driverSuggestions.map(d => (
                                                            <li
                                                                key={d.id}
                                                                onClick={() => handleDriverSuggestionClick(d)}
                                                                className="px-4 py-2.5 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-50 transition-colors text-sm"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{d.name}</p>
                                                                    <p className="text-[10px] text-slate-500">{d.employeeId}</p>
                                                                </div>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="px-4 py-4 text-center text-slate-400 text-xs font-medium">ไม่พบข้อมูล</li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">อายุ (Age)</label>
                                                <input type="number" value={formData.driverAge || ''} onChange={e => setFormData({ ...formData, driverAge: parseInt(e.target.value) })} className="w-full form-input" placeholder="ปี" title="อายุ" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">ประสบการณ์ (ปี)</label>
                                                <input type="number" value={formData.driverExperienceYears || ''} onChange={e => setFormData({ ...formData, driverExperienceYears: parseInt(e.target.value) })} className="w-full form-input" placeholder="ปี" title="ประสบการณ์ขับรถ" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">รถที่เกิดเหตุ (Vehicle)</label>
                                            <select onChange={handleVehicleSelect} value={formData.vehicleId || ''} className="w-full form-select" title="รถที่เกิดเหตุ" aria-label="รถที่เกิดเหตุ">
                                                <option value="">-- ระบุรถ (ถ้ามี) --</option>
                                                {vehicles.map(v => (
                                                    <option key={v.id} value={v.id}>{v.licensePlate} ({v.vehicleType})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ประวัติการอบรม (Training)</label>
                                            <textarea value={formData.driverTrainingHistory} onChange={e => setFormData({ ...formData, driverTrainingHistory: e.target.value })} rows={2} className="w-full form-textarea" placeholder="ระบุหลักสูตรที่ผ่านการอบรม..." />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Location */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">4. สถานที่เกิดเหตุ (Location)</h4>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">ระบุสถานที่</label>
                                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full form-input" placeholder="จุดที่เกิดเหตุ..." />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="block text-sm font-bold text-slate-700">ในบริเวณบริษัท (Company Premise)?</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={formData.locationIsCompanyPremise === true} onChange={() => setFormData({ ...formData, locationIsCompanyPremise: true })} className="text-blue-500" />
                                                <span>ใช่ (Yes)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={formData.locationIsCompanyPremise === false} onChange={() => setFormData({ ...formData, locationIsCompanyPremise: false })} className="text-blue-500" />
                                                <span>ไม่ใช่ (No)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* TAB 2: DETAILS & DAMAGE */}
                    {
                        activeTab === 'Details' && (
                            <div className="space-y-8 animate-fade-in">

                                {/* Description */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">4. รายละเอียดเหตุการณ์ (Description) *</h4>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={6}
                                        className="w-full form-textarea font-mono text-sm"
                                        placeholder="อธิบายลำดับเหตุการณ์โดยละเอียด..."
                                        required
                                    />
                                </div>

                                {/* Immediate Action */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">5. การแก้ไขเบื้องต้น (Immediate Actions)</h4>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">การแก้ไขสถานการณ์</label>
                                        <textarea value={formData.immediateCorrectiveActions} onChange={e => setFormData({ ...formData, immediateCorrectiveActions: e.target.value })} rows={3} className="w-full form-textarea" placeholder="สิ่งที่ทำทันทีหลังเกิดเหตุ..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">การฟื้นฟูสถานที่</label>
                                        <textarea value={formData.restorationDetails} onChange={e => setFormData({ ...formData, restorationDetails: e.target.value })} rows={2} className="w-full form-textarea" placeholder="การเคลียร์พื้นที่..." />
                                    </div>
                                </div>

                                {/* Notification */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">5.1 การติดต่อผู้เกี่ยวข้อง (Notification)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="ผู้บังคับบัญชา (Line Management)"
                                            value={formData.notifications?.lineManager}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, lineManager: e.target.value } })}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="บริษัทรับผิดชอบ (Carrier)"
                                            value={formData.notifications?.carrier}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, carrier: e.target.value } })}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="บริษัทประกัน (Insurance)"
                                            value={formData.notifications?.insurance}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, insurance: e.target.value } })}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="ญาติ (Relatives)"
                                            value={formData.notifications?.relatives}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, relatives: e.target.value } })}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="เจ้าหน้าที่ (Authorities)"
                                            value={formData.notifications?.authorities}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, authorities: e.target.value } })}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="อื่นๆ (Others)"
                                            value={formData.notifications?.others}
                                            onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, others: e.target.value } })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                {/* Evidences (Mock Uploads) */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">5.2 หลักฐาน (Evidences)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-400 hover:bg-slate-50 cursor-pointer h-32">
                                            <span className="text-2xl">📸</span>
                                            <span className="text-xs mt-2">รูปที่เกิดเหตุ</span>
                                        </div>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-400 hover:bg-slate-50 cursor-pointer h-32">
                                            <span className="text-2xl">🛣️</span>
                                            <span className="text-xs mt-2">รูปแนวเบรก</span>
                                        </div>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-400 hover:bg-slate-50 cursor-pointer h-32">
                                            <span className="text-2xl">📄</span>
                                            <span className="text-xs mt-2">ใบกำกับขนส่ง</span>
                                        </div>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-400 hover:bg-slate-50 cursor-pointer h-32">
                                            <span className="text-2xl">🛰️</span>
                                            <span className="text-xs mt-2">กราฟ GPS</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Drug & Alcohol */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">6. ตรวจหาสารเสพติด/แอลกอฮอล์ (Drug & Alcohol Test)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                            <h5 className="font-bold text-slate-600">🍺 แอลกอฮอล์ (Alcohol)</h5>
                                            <select
                                                value={formData.drugAlcoholTest?.alcoholResult}
                                                onChange={e => setFormData({ ...formData, drugAlcoholTest: { ...formData.drugAlcoholTest!, alcoholResult: e.target.value as any } })}
                                                className="w-full form-select"
                                                title="ผลตรวจแอลกอฮอล์"
                                                aria-label="ผลตรวจแอลกอฮอล์"
                                            >
                                                <option value="Not Tested">ไม่ได้ตรวจ (Not Tested)</option>
                                                <option value="Found">พบ (Found)</option>
                                                <option value="Not Found">ไม่พบ (Not Found)</option>
                                            </select>
                                            {formData.drugAlcoholTest?.alcoholResult === 'Found' && (
                                                <input type="text" placeholder="ระบุปริมาณ mg%" value={formData.drugAlcoholTest?.alcoholValueMg || ''} onChange={e => setFormData({ ...formData, drugAlcoholTest: { ...formData.drugAlcoholTest!, alcoholValueMg: e.target.value } })} className="w-full form-input" />
                                            )}
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                            <h5 className="font-bold text-slate-600">💊 สารเสพติด (Drug)</h5>
                                            <select
                                                value={formData.drugAlcoholTest?.drugResult}
                                                onChange={e => setFormData({ ...formData, drugAlcoholTest: { ...formData.drugAlcoholTest!, drugResult: e.target.value as any } })}
                                                className="w-full form-select"
                                                title="ผลตรวจสารเสพติด"
                                                aria-label="ผลตรวจสารเสพติด"
                                            >
                                                <option value="Not Tested">ไม่ได้ตรวจ (Not Tested)</option>
                                                <option value="Found">พบ (Found)</option>
                                                <option value="Not Found">ไม่พบ (Not Found)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Damages List */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">ความเสียหาย (Damages)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                        {/* Product Damage */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">สินค้าเสียหาย (Product)</label>
                                            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                                + เพิ่มรายการสินค้าเสียหาย
                                            </div>
                                        </div>
                                        {/* Property Damage */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ทรัพย์สินเสียหาย (Property)</label>
                                            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                                + เพิ่มรายการทรัพย์สินเสียหาย
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )
                    }

                    {/* TAB 3: ROOT CAUSE ANALYSIS */}
                    {
                        activeTab === 'Analysis' && (
                            <div className="space-y-8 animate-fade-in">

                                {/* SCAT Analysis */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">การวิเคราะห์หาสาเหตุแบบ SCAT (Systematic Cause Analysis Technique)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 overflow-x-auto min-w-[800px] md:min-w-0">
                                        <div className="flex flex-col h-full">
                                            <div className="bg-slate-100 p-2 font-bold text-center border border-slate-300 rounded-t-lg text-sm h-12 flex items-center justify-center">
                                                ขาดการควบคุมดูแล<br />(Lack of Control)
                                            </div>
                                            <textarea
                                                className="flex-1 form-textarea rounded-t-none min-h-[150px] resize-none border-t-0 p-2 text-sm"
                                                value={formData.scatAnalysis?.lackOfControl || ''}
                                                onChange={e => setFormData({ ...formData, scatAnalysis: { ...formData.scatAnalysis!, lackOfControl: e.target.value } })}
                                                placeholder="ระบุสิ่งที่ขาดการควบคุม..."
                                            />
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <div className="bg-slate-100 p-2 font-bold text-center border border-slate-300 rounded-t-lg text-sm h-12 flex items-center justify-center">
                                                สาเหตุพื้นฐาน<br />(Basic Causes)
                                            </div>
                                            <textarea
                                                className="flex-1 form-textarea rounded-t-none min-h-[150px] resize-none border-t-0 p-2 text-sm"
                                                value={formData.scatAnalysis?.basicCauses || ''}
                                                onChange={e => setFormData({ ...formData, scatAnalysis: { ...formData.scatAnalysis!, basicCauses: e.target.value } })}
                                                placeholder="ระบุสาเหตุพื้นฐาน..."
                                            />
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <div className="bg-slate-100 p-2 font-bold text-center border border-slate-300 rounded-t-lg text-sm h-12 flex items-center justify-center">
                                                สาเหตุขณะนั้น<br />(Immediate Causes)
                                            </div>
                                            <textarea
                                                className="flex-1 form-textarea rounded-t-none min-h-[150px] resize-none border-t-0 p-2 text-sm"
                                                value={formData.scatAnalysis?.immediateCauses || ''}
                                                onChange={e => setFormData({ ...formData, scatAnalysis: { ...formData.scatAnalysis!, immediateCauses: e.target.value } })}
                                                placeholder="ระบุสาเหตุขณะเกิดเหตุ..."
                                            />
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <div className="bg-slate-100 p-2 font-bold text-center border border-slate-300 rounded-t-lg text-sm h-12 flex items-center justify-center">
                                                อุบัติการณ์<br />(Incident)
                                            </div>
                                            <textarea
                                                className="flex-1 form-textarea rounded-t-none min-h-[150px] resize-none border-t-0 p-2 text-sm"
                                                value={formData.scatAnalysis?.incident || ''}
                                                onChange={e => setFormData({ ...formData, scatAnalysis: { ...formData.scatAnalysis!, incident: e.target.value } })}
                                                placeholder="ระบุเหตุการณ์..."
                                            />
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <div className="bg-slate-100 p-2 font-bold text-center border border-slate-300 rounded-t-lg text-sm h-12 flex items-center justify-center">
                                                อุบัติเหตุ<br />(Accident)
                                            </div>
                                            <textarea
                                                className="flex-1 form-textarea rounded-t-none min-h-[150px] resize-none border-t-0 p-2 text-sm"
                                                value={formData.scatAnalysis?.accident || ''}
                                                onChange={e => setFormData({ ...formData, scatAnalysis: { ...formData.scatAnalysis!, accident: e.target.value } })}
                                                placeholder="ระบุอุบัติเหตุและความสูญเสีย..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Why-Why Analysis Tree View */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 overflow-x-auto">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">การวิเคราะห์หาสาเหตุแบบ Why-Why Analysis (Tree Diagram)</h3>

                                    <div className="min-w-[800px] p-4">
                                        {/* Problem Statement as Root */}
                                        <div className="flex items-center">
                                            <div className="relative group mr-4">
                                                <div className="bg-slate-800 text-white rounded-xl p-3 shadow-lg border-2 border-slate-700 min-w-[200px] z-10 relative">
                                                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Problem Statement</label>
                                                    <textarea
                                                        className="bg-transparent text-white w-full text-sm outline-none resize-none overflow-hidden font-medium"
                                                        rows={2}
                                                        placeholder="ระบุปัญหาที่เกิดขึ้น..."
                                                        value={formData.whyWhyAnalysis?.problem || ''}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            whyWhyAnalysis: {
                                                                ...formData.whyWhyAnalysis!,
                                                                problem: e.target.value,
                                                                roots: formData.whyWhyAnalysis?.roots || [{ id: '1', text: '', children: [] }]
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                {/* Connector out from Problem */}
                                                {(formData.whyWhyAnalysis?.roots?.length || 0) > 0 && (
                                                    <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-slate-400"></div>
                                                )}
                                            </div>

                                            {/* Tree Container */}
                                            <div className="flex flex-col relative">
                                                {(() => {
                                                    // Helper functions for tree manipulation
                                                    const updateNodeText = (nodes: any[], id: string, text: string): any[] => {
                                                        return nodes.map(node => {
                                                            if (node.id === id) return { ...node, text };
                                                            if (node.children) return { ...node, children: updateNodeText(node.children, id, text) };
                                                            return node;
                                                        });
                                                    };
                                                    const addNodeChild = (nodes: any[], parentId: string): any[] => {
                                                        return nodes.map(node => {
                                                            if (node.id === parentId) return { ...node, children: [...(node.children || []), { id: Date.now().toString() + Math.random(), text: '', children: [] }] };
                                                            if (node.children) return { ...node, children: addNodeChild(node.children, parentId) };
                                                            return node;
                                                        });
                                                    };
                                                    const removeNode = (nodes: any[], id: string): any[] => {
                                                        return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: n.children ? removeNode(n.children, id) : [] }));
                                                    };

                                                    const handleTextChange = (id: string, text: string) => {
                                                        const newRoots = updateNodeText(formData.whyWhyAnalysis?.roots || [], id, text);
                                                        setFormData({ ...formData, whyWhyAnalysis: { ...formData.whyWhyAnalysis!, roots: newRoots } });
                                                    };
                                                    const handleAddChild = (id: string) => {
                                                        const newRoots = addNodeChild(formData.whyWhyAnalysis?.roots || [], id);
                                                        setFormData({ ...formData, whyWhyAnalysis: { ...formData.whyWhyAnalysis!, roots: newRoots } });
                                                    };
                                                    const handleRemoveNode = (id: string) => {
                                                        const newRoots = removeNode(formData.whyWhyAnalysis?.roots || [], id);
                                                        setFormData({ ...formData, whyWhyAnalysis: { ...formData.whyWhyAnalysis!, roots: newRoots } });
                                                    };

                                                    const handleAddRoot = () => {
                                                        const newRoots = [...(formData.whyWhyAnalysis?.roots || []), { id: Date.now().toString(), text: '', children: [] }];
                                                        setFormData({ ...formData, whyWhyAnalysis: { ...formData.whyWhyAnalysis!, roots: newRoots } });
                                                    };

                                                    // Helper to build recursive WhyNode structure from flat array
                                                    const buildWhyChain = (steps: string[]) => {
                                                        const createNode = (index: number): any => {
                                                            if (index >= steps.length) return null;
                                                            return {
                                                                id: `auto-chain-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                                                                text: steps[index],
                                                                children: index < steps.length - 1 ? [createNode(index + 1)].filter(Boolean) : []
                                                            };
                                                        };
                                                        return createNode(0);
                                                    };

                                                    // Smart Templates based on User Examples
                                                    const smartTemplates = {
                                                        brakeFailure: {
                                                            label: '⚡ ตัวอย่าง: เบรกแตก (Brake Failure)',
                                                            problem: 'รถบรรทุกชนท้ายรถคันหน้าเนื่องจากเบรกไม่อยู่',
                                                            node: buildWhyChain([
                                                                'ทำไมเบรกถึงไม่อยู่? -> ผ้าเบรกเสื่อมสภาพจนไม่สามารถสร้างแรงเสียดทานเพียงพอ',
                                                                'ทำไมถึงเสื่อมสภาพผิดปกติ? -> รถถูกใช้งานหนักเกินพิกัดอย่างต่อเนื่อง',
                                                                'ทำไมถึงบรรทุกเกิน? -> ต้องการทำรอบเพื่อค่าเที่ยวตามเป้า',
                                                                'ทำไมระบบอนุญาต? -> ไม่มีระบบชั่งน้ำหนักตรวจสอบก่อนออก',
                                                                'ROOT CAUSE: นโยบายเน้นลดต้นทุนมากกว่าความปลอดภัย'
                                                            ])
                                                        },
                                                        drowsyDriving: {
                                                            label: '😴 ตัวอย่าง: หลับใน (Drowsy Driving)',
                                                            problem: 'รถบรรทุกพุ่งตกข้างทางในช่วงเช้ามืด',
                                                            node: buildWhyChain([
                                                                'ทำไมถึงตกข้างทาง? -> คนขับหลับใน (Fatigue)',
                                                                'ทำไมถึงหลับใน? -> พักผ่อนเพียง 3 ชม. ก่อนเข้ากะ',
                                                                'ทำไมพักน้อย? -> ตารางงานบีบให้ขับเกิน 10 ชม.',
                                                                'ทำไมตารางบีบ? -> แผนไม่เผื่อรถติด/จุดพัก',
                                                                'ROOT CAUSE: ซอฟต์แวร์จัดเส้นทางคำนวณแต่ระยะทาง ไม่สนจราจรจริง'
                                                            ])
                                                        },
                                                        trafficCongestion: {
                                                            label: '🚦 ตัวอย่าง: ส่งของล่าช้า (Traffic Congestion)',
                                                            problem: 'พนักงานขับรถส่งสินค้าล่าช้ากว่ากำหนด (Late Delivery)',
                                                            node: buildWhyChain([
                                                                'ทำไมถึงส่งช้า? -> เลือกเส้นทางที่มีการจราจรติดขัดหนัก',
                                                                'ทำไมเลือกทางนี้? -> พยายามทำเวลาให้ทันตามที่ระบบคำนวณไว้',
                                                                'ทำไมระบบคำนวณแบบนั้น? -> ระบบวางแผน (Routing) คำนวณจากระยะทางที่สั้นที่สุดเท่านั้น',
                                                                'ทำไมไม่ดูรถติด? -> ซอฟต์แวร์ไม่มีการดึงข้อมูลการจราจรแบบ Real-time',
                                                                'ROOT CAUSE: ขาดการลงทุนในระบบ Logistics Intelligence และเกณฑ์การวัดผลที่ไม่ยืดหยุ่น'
                                                            ])
                                                        }
                                                    };

                                                    const loadSmartTemplate = (templateKey: keyof typeof smartTemplates) => {
                                                        const template = smartTemplates[templateKey];
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            whyWhyAnalysis: {
                                                                problem: template.problem,
                                                                roots: [...(prev.whyWhyAnalysis?.roots || []), template.node]
                                                            }
                                                        }));
                                                    };

                                                    // Recursive Render
                                                    const renderTree = (nodes: any[]) => (
                                                        <div className="flex flex-col">
                                                            {nodes.map((node, idx) => {
                                                                const isFirst = idx === 0;
                                                                const isLast = idx === nodes.length - 1;
                                                                const isOnly = nodes.length === 1;

                                                                return (
                                                                    <div key={node.id} className="flex items-center">
                                                                        {/* Connector Lines */}
                                                                        <div className="w-8 relative self-stretch flex items-center">
                                                                            {!isOnly && (
                                                                                <div className={`absolute left-0 w-0.5 bg-slate-300 ${isFirst ? 'top-1/2 bottom-0' : isLast ? 'top-0 bottom-1/2' : 'top-0 bottom-0'}`}></div>
                                                                            )}
                                                                            <div className="w-full h-0.5 bg-slate-300"></div>
                                                                        </div>

                                                                        {/* Node */}
                                                                        <div className="relative group my-2 mr-4">
                                                                            <div className="bg-blue-500 rounded-lg p-2 shadow-md border border-blue-600 w-[180px] hover:bg-blue-600 transition-colors">
                                                                                <textarea
                                                                                    value={node.text}
                                                                                    onChange={(e) => handleTextChange(node.id, e.target.value)}
                                                                                    className="bg-transparent text-white w-full text-xs outline-none resize-none overflow-hidden text-center placeholder-blue-200 font-medium"
                                                                                    rows={Math.max(2, Math.ceil(node.text.length / 20))}
                                                                                    placeholder="Why?..."
                                                                                />
                                                                            </div>

                                                                            {/* Buttons */}
                                                                            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-20">
                                                                                <button type="button" onClick={() => handleAddChild(node.id)} className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-110 active:scale-95 transition-all" title="Add Branch">+</button>
                                                                                <button type="button" onClick={() => handleRemoveNode(node.id)} className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-110 active:scale-95 transition-all" title="Remove">×</button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Children */}
                                                                        {node.children && node.children.length > 0 && (
                                                                            <div>
                                                                                {renderTree(node.children)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );

                                                    return (
                                                        <div className="relative">
                                                            {renderTree(formData.whyWhyAnalysis?.roots || [])}

                                                            <div className="mt-4 ml-8 flex flex-col gap-2 items-start">
                                                                {(formData.whyWhyAnalysis?.roots?.length || 0) === 0 && (
                                                                    <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-xl w-full max-w-lg">
                                                                        <p className="text-sm text-orange-800 font-bold mb-2">🤖 Smart Suggestions (AI Templates)</p>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => loadSmartTemplate('brakeFailure')}
                                                                                className="px-3 py-1.5 bg-white border border-orange-200 text-orange-700 text-xs rounded-lg shadow-sm hover:bg-orange-100 transition-colors"
                                                                            >
                                                                                {smartTemplates.brakeFailure.label}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => loadSmartTemplate('drowsyDriving')}
                                                                                className="px-3 py-1.5 bg-white border-orange-200 text-orange-700 text-xs rounded-lg shadow-sm hover:bg-orange-100 transition-colors"
                                                                            >
                                                                                {smartTemplates.drowsyDriving.label}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => loadSmartTemplate('trafficCongestion')}
                                                                                className="px-3 py-1.5 bg-white border-orange-200 text-orange-700 text-xs rounded-lg shadow-sm hover:bg-orange-100 transition-colors"
                                                                            >
                                                                                {smartTemplates.trafficCongestion.label}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <button type="button" onClick={handleAddRoot} className="px-4 py-2 bg-slate-100 text-slate-500 text-sm rounded-lg hover:bg-slate-200 border border-dashed border-slate-300">
                                                                    + เพิ่มหัวข้อวิเคราะห์เอง (Manual Start)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800">14. การวิเคราะห์สาเหตุ (Checklist Root Cause Analysis)</h3>

                                {/* 14.1 Personal Factors */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-blue-900 mb-4">14.1 เกิดจากคน (Personal Factors)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'ความรู้ไม่เพียงพอ/ ไม่ชำนาญพอ (Lack of Skill / Knowledge)',
                                            'ฝ่าฝืนกฎหมาย/ข้อบังคับของบริษัท (Violation of rules)',
                                            'ประมาท/ไม่ปฏิบัติตามหลักการขับขี่อย่างปลอดภัย (Negligence / Unsafe Act)',
                                            'เมื่อยล้า (Fatigue)',
                                            'อื่นๆ (Other)'
                                        ].map(item => (
                                            <div key={item} className="flex flex-col">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox"
                                                        checked={formData.rootCauseAnalysis?.personalFactors.includes(item)}
                                                        onChange={() => toggleRootCause('personalFactors', item)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">{item}</span>
                                                </label>
                                                {item.includes('Other') && formData.rootCauseAnalysis?.personalFactors.includes(item) && (
                                                    <input
                                                        type="text"
                                                        placeholder="ระบุสาเหตุอื่นๆ..."
                                                        className="mt-2 ml-6 form-input text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 14.2 Route */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-blue-900 mb-4">14.2 เกิดจากเส้นทางการขนส่ง (Route Hazardous)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'ขาดการประเมินความเสี่ยงเส้นทางการขนส่ง (Lack of Risk Assessment)',
                                            'จุดจอดที่มีอยู่ไม่เหมาะสม (Inadequate Parking Point)',
                                            'ขาดการสื่อความในเรื่องของจุดเสี่ยง/จุดจอด (Lack of Communication)',
                                            'อื่นๆ (Other)'
                                        ].map(item => (
                                            <div key={item} className="flex flex-col">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox"
                                                        checked={formData.rootCauseAnalysis?.routeHazardous.includes(item)}
                                                        onChange={() => toggleRootCause('routeHazardous', item)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">{item}</span>
                                                </label>
                                                {item.includes('Other') && formData.rootCauseAnalysis?.routeHazardous.includes(item) && (
                                                    <input
                                                        type="text"
                                                        placeholder="ระบุสาเหตุอื่นๆ..."
                                                        className="mt-2 ml-6 form-input text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 14.3 Truck */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-blue-900 mb-4">14.3 เกิดจากสภาพรถขนส่ง (Truck Condition)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'รถขนส่งไม่ได้ตามมาตรฐาน (Not Standard)',
                                            'ขาดการตรวจความพร้อมของรถขนส่งก่อนรับผลิตภัณฑ์ (Lack of Daily Inspection)',
                                            'ขาดการบำรุงรักษา (Lack of Preventive Maintenance)',
                                            'อื่นๆ (Other)'
                                        ].map(item => (
                                            <div key={item} className="flex flex-col">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox"
                                                        checked={formData.rootCauseAnalysis?.truckCondition.includes(item)}
                                                        onChange={() => toggleRootCause('truckCondition', item)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">{item}</span>
                                                </label>
                                                {item.includes('Other') && formData.rootCauseAnalysis?.truckCondition.includes(item) && (
                                                    <input
                                                        type="text"
                                                        placeholder="ระบุสาเหตุอื่นๆ..."
                                                        className="mt-2 ml-6 form-input text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 14.4 Environment */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-blue-900 mb-4">14.4 เกิดจากสภาพแวดล้อม (Environment)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'ฝนตก / หมอกลง (Rain / Fog)',
                                            'ความมืด / ไม่มีแสงไฟส่องสว่าง (Darkness)',
                                            'บุคคลที่ 3 วิ่งตัดหน้า (3rd Party Cut Off)',
                                            'อื่นๆ (Other)'
                                        ].map(item => (
                                            <div key={item} className="flex flex-col">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox"
                                                        checked={formData.rootCauseAnalysis?.environment.includes(item)}
                                                        onChange={() => toggleRootCause('environment', item)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">{item}</span>
                                                </label>
                                                {item.includes('Other') && formData.rootCauseAnalysis?.environment.includes(item) && (
                                                    <input
                                                        type="text"
                                                        placeholder="ระบุสาเหตุอื่นๆ..."
                                                        className="mt-2 ml-6 form-input text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 14.5 Company Policy (New) */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-blue-900 mb-4">14.5 เกิดจากนโยบายบริษัท (Company Policy)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'ชั่วโมงการทำงาน/การพักผ่อนไม่เหมาะสม (Inappropriate Working Hour)',
                                            'ขาดการตรวจสอบการปฏิบัติงาน (Lack of Transportation control)',
                                            'อื่นๆ (Other)'
                                        ].map(item => (
                                            <div key={item} className="flex flex-col">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox"
                                                        checked={formData.rootCauseAnalysis?.companyPolicy.includes(item)}
                                                        onChange={() => toggleRootCause('companyPolicy', item)}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">{item}</span>
                                                </label>
                                                {item.includes('Other') && formData.rootCauseAnalysis?.companyPolicy.includes(item) && (
                                                    <input
                                                        type="text"
                                                        placeholder="ระบุสาเหตุอื่นๆ..."
                                                        className="mt-2 ml-6 form-input text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Remarks */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">คำอธิบายเพิ่มเติมสาเหตุ (Explanation for Others)</label>
                                    <textarea
                                        value={formData.rootCauseAnalysis?.remarks}
                                        onChange={e => setFormData({ ...formData, rootCauseAnalysis: { ...formData.rootCauseAnalysis!, remarks: e.target.value } })}
                                        className="w-full form-textarea"
                                        rows={3}
                                        placeholder="ระบุคำอธิบายเพิ่มเติม..."
                                        title="คำอธิบายเพิ่มเติมสาเหตุ"
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* TAB 4: OUTCOME & CLOSING */}
                    {
                        activeTab === 'Outcome' && (
                            <div className="space-y-8 animate-fade-in">

                                {/* Preventive Action */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4">15. มาตรการแก้ไข (Preventive Action)</h4>
                                    <textarea className="w-full form-textarea mb-4" placeholder="ระบุมาตรการ..." rows={3} />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <input type="text" placeholder="ผู้รับผิดชอบ" className="form-input" />
                                        <input type="date" placeholder="กำหนดเสร็จ" className="form-input" />
                                        <input type="date" placeholder="เสร็จจริง" className="form-input" />
                                    </div>
                                </div>

                                {/* Investigation Team */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4">17. ทีมสอบสวน (Investigation Team)</h4>
                                    <div className="space-y-2">
                                        <div className="hidden sm:grid grid-cols-3 gap-4 text-sm font-bold text-slate-500 mb-2">
                                            <div>ชื่อ-นามสกุล</div>
                                            <div>ตำแหน่ง</div>
                                            <div>บริษัท</div>
                                        </div>
                                        {/* Mock row 1 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <input type="text" placeholder="Name" className="form-input" />
                                            <input type="text" placeholder="Position" className="form-input" />
                                            <input type="text" placeholder="Company" className="form-input" />
                                        </div>
                                        {/* Mock row 2 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <input type="text" placeholder="Name" className="form-input" />
                                            <input type="text" placeholder="Position" className="form-input" />
                                            <input type="text" placeholder="Company" className="form-input" />
                                        </div>
                                    </div>
                                </div>

                                {/* 18. Management Review */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4">18. ความคิดเห็นของผู้บังคับบัญชา (Responsible Manager's Review / Comment)</h4>
                                    <div className="space-y-4">
                                        <p className="font-bold text-sm text-slate-700">ต้องการค้นหาสาเหตุเพิ่มเติมไปกว่านี้หรือไม่ (More detailed investigation required?)</p>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={formData.managementReview?.requireMoreInvestigation === false}
                                                    onChange={() => setFormData({ ...formData, managementReview: { ...formData.managementReview!, requireMoreInvestigation: false } })}
                                                    className="text-green-600 focus:ring-green-500"
                                                />
                                                <span className="font-medium text-slate-700">ไม่ต้องการ (No)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={formData.managementReview?.requireMoreInvestigation === true}
                                                    onChange={() => setFormData({ ...formData, managementReview: { ...formData.managementReview!, requireMoreInvestigation: true } })}
                                                    className="text-red-600 focus:ring-red-500"
                                                />
                                                <span className="font-medium text-slate-700">ต้องการ (Yes)</span>
                                            </label>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="ระบุเหตุผล (ถ้าต้องการ)..."
                                            className="form-input w-full"
                                            disabled={!formData.managementReview?.requireMoreInvestigation}
                                        />

                                        <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                                            <h5 className="font-bold text-slate-600 text-sm">อนุมัติรายงานโดย (Reviewed / Approved by)</h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <input type="text" placeholder="ชื่อ-นามสกุล (Name)" value={formData.managementReview?.reviewerName} onChange={e => setFormData({ ...formData, managementReview: { ...formData.managementReview!, reviewerName: e.target.value } })} className="form-input" />
                                                <input type="text" placeholder="ตำแหน่ง (Position)" value={formData.managementReview?.reviewerPosition || ''} onChange={e => setFormData({ ...formData, managementReview: { ...formData.managementReview!, reviewerPosition: e.target.value } })} className="form-input" />
                                                <input type="text" placeholder="บริษัท (Company)" value={formData.managementReview?.reviewerCompany || ''} onChange={e => setFormData({ ...formData, managementReview: { ...formData.managementReview!, reviewerCompany: e.target.value } })} className="form-input" />
                                                <input type="date" value={formData.managementReview?.reviewedDate} onChange={e => setFormData({ ...formData, managementReview: { ...formData.managementReview!, reviewedDate: e.target.value } })} className="form-input" title="วันที่อนุมัติ" aria-label="วันที่อนุมัติ" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 19. Top Management Acknowledge */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4">19. ผู้บริหารระดับสูงรับทราบ (Responsible Top Management Acknowledge)</h4>
                                    <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                                        <h5 className="font-bold text-slate-600 text-sm">เพื่อโปรดรับทราบผลการสอบสวนอุบัติเหตุ</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <input type="text" placeholder="ชื่อ-นามสกุล (Name)" value={formData.topManagementAcknowledge?.name || ''} onChange={e => setFormData({ ...formData, topManagementAcknowledge: { ...formData.topManagementAcknowledge!, name: e.target.value } })} className="form-input" />
                                            <input type="text" placeholder="ตำแหน่ง (Position)" value={formData.topManagementAcknowledge?.position || ''} onChange={e => setFormData({ ...formData, topManagementAcknowledge: { ...formData.topManagementAcknowledge!, position: e.target.value } })} className="form-input" />
                                            <input type="text" placeholder="บริษัท (Company)" value={formData.topManagementAcknowledge?.company || ''} onChange={e => setFormData({ ...formData, topManagementAcknowledge: { ...formData.topManagementAcknowledge!, company: e.target.value } })} className="form-input" />
                                            <input type="date" value={formData.topManagementAcknowledge?.date || ''} onChange={e => setFormData({ ...formData, topManagementAcknowledge: { ...formData.topManagementAcknowledge!, date: e.target.value } })} className="form-input" title="วันที่รับทราบ" aria-label="วันที่รับทราบ" />
                                        </div>
                                    </div>
                                </div>


                                {/* Site Conditions */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-800 border-b pb-2">สภาพแวดล้อมที่เกิดเหตุ (Site Conditions)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">สภาพผิวถนน</label>
                                            <select
                                                className="form-select w-full"
                                                value={formData.siteConditions?.roadSurface}
                                                onChange={e => setFormData({ ...formData, siteConditions: { ...formData.siteConditions, roadSurface: e.target.value as any } })}
                                                title="สภาพผิวถนน"
                                                aria-label="สภาพผิวถนน"
                                            >
                                                <option value="">-- ระบุ --</option>
                                                <option value="Smooth">เรียบ</option>
                                                <option value="Rough">ขรุขระ</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">แสงสว่าง</label>
                                            <select
                                                className="form-select w-full"
                                                value={formData.siteConditions?.lighting}
                                                onChange={e => setFormData({ ...formData, siteConditions: { ...formData.siteConditions, lighting: e.target.value as any } })}
                                                title="แสงสว่าง"
                                                aria-label="แสงสว่าง"
                                            >
                                                <option value="">-- ระบุ --</option>
                                                <option value="Night (Street Lights)">กลางคืนมีไฟถนน</option>
                                                <option value="Night (No Lights)">กลางคืนไม่มีไฟถนน</option>
                                                <option value="Day">กลางวัน</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ทัศนวิสัย</label>
                                            <select
                                                className="form-select w-full"
                                                value={formData.siteConditions?.visibility}
                                                onChange={e => setFormData({ ...formData, siteConditions: { ...formData.siteConditions, visibility: e.target.value as any } })}
                                                title="ทัศนวิสัย"
                                                aria-label="ทัศนวิสัย"
                                            >
                                                <option value="">-- ระบุ --</option>
                                                <option value="Clear">มองชัดเจน</option>
                                                <option value="Fog/Dust">มีหมอก/ฝุ่น</option>
                                                <option value="Glare">ลายตา</option>
                                                <option value="Rain">ฝนตกหนัก</option>
                                                <option value="Obstacle">มีวัตถุข้างหน้า</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">สถานที่เกิดเหตุ (Accident Location 1-16)</label>
                                        <select
                                            className="form-select w-full"
                                            value={formData.siteConditions?.locationType}
                                            onChange={e => setFormData({ ...formData, siteConditions: { ...formData.siteConditions, locationType: e.target.value } })}
                                            title="สถานที่เกิดเหตุ"
                                            aria-label="สถานที่เกิดเหตุ"
                                        >
                                            <option value="">-- เลือกสถานที่ (1-16) --</option>
                                            <option value="1">1. ลานจอด</option>
                                            <option value="2">2. ถนนตัดกัน</option>
                                            <option value="3">3. สามแยกลักษณะ T</option>
                                            <option value="4">4. สามแยก</option>
                                            <option value="5">5. ทางคู่ขนาน</option>
                                            <option value="6">6. วงเวียน</option>
                                            <option value="7">7. เนินเขา, ขึ้นเนิน</option>
                                            <option value="8">8. สะพาน/ทางข้าม</option>
                                            <option value="9">9. ทางตรง</option>
                                            <option value="10">10. ทางตรงลาดชัน</option>
                                            <option value="11">11. ทางโค้ง หรือเลี้ยว (ทัศนวิสัยเปิด)</option>
                                            <option value="12">12. ทางโค้ง หรือเลี้ยว (ทัศนวิสัยปิด)</option>
                                            <option value="13">13. ทางโค้ง หรือเลี้ยว ลาดชัน (เปิด)</option>
                                            <option value="14">14. ทางโค้ง หรือเลี้ยว ลาดชัน (ปิด)</option>
                                            <option value="15">15. ทางเดินข้าม</option>
                                            <option value="16">16. อื่นๆ</option>
                                        </select>
                                        {formData.siteConditions?.locationType === '16' && (
                                            <input
                                                type="text"
                                                placeholder="ระบุสถานที่อื่นๆ..."
                                                className="mt-2 form-input"
                                                value={formData.siteConditions?.locationTypeOther || ''}
                                                onChange={e => setFormData({ ...formData, siteConditions: { ...formData.siteConditions, locationTypeOther: e.target.value } })}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Helper: Linked Claims */}
                                <div className="space-y-4 bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                    <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-4">
                                        🔗 ความเชื่อมโยงกับการเคลมประกัน (Linked Claims)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ใบเคลมประกันรถยนต์ (Vehicle Claim)</label>
                                            <select
                                                value={formData.relatedVehicleClaimId || ''}
                                                onChange={e => setFormData({ ...formData, relatedVehicleClaimId: e.target.value })}
                                                className="w-full form-select bg-white"
                                                title="ใบเคลมประกันรถยนต์"
                                                aria-label="ใบเคลมประกันรถยนต์"
                                            >
                                                <option value="">-- ไม่มีการเคลม / ไม่ได้ระบุ --</option>
                                                {existingVehicleClaims.map(c => (
                                                    <option key={c.id} value={c.id}>{c.claimNumber} ({c.vehicleLicensePlate})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ใบเคลมประกันสินค้า (Cargo Claim)</label>
                                            <select
                                                value={formData.relatedCargoClaimId || ''}
                                                onChange={e => setFormData({ ...formData, relatedCargoClaimId: e.target.value })}
                                                className="w-full form-select bg-white"
                                                title="ใบเคลมประกันสินค้า"
                                                aria-label="ใบเคลมประกันสินค้า"
                                            >
                                                <option value="">-- ไม่มีการเคลม / ไม่ได้ระบุ --</option>
                                                {existingCargoClaims.map(c => (
                                                    <option key={c.id} value={c.id}>{c.claimNumber} ({formatCurrency(c.claimedAmount)})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )
                    }

                </form>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-100 bg-slate-50 flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 rounded-b-[2rem]">
                    <button onClick={handlePrint} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                        🖨️ พิมพ์ / Export PDF
                    </button>
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        ยกเลิก
                    </button>
                    <button onClick={handleSubmit} className="px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-md hover:shadow-lg transition-all active:scale-95">
                        บันทึกรายงาน
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};


export default AddIncidentInvestigationModal;
