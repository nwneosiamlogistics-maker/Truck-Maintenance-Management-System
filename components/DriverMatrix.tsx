import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Driver, DrivingIncident, Vehicle, SafetyCheck, SafetyTopic, IncabAssessment, TrainingPlan } from '../types';
import { useToast } from '../context/ToastContext';
import { uploadToNAS } from '../utils/nasUpload';
import { uploadFileToStorage } from '../utils/fileUpload';
import { confirmAction } from '../utils';
import { isNewEmployee } from '../hooks/useSafetyPlan';
import Training120Modal from './Training120Modal';

interface DriverMatrixProps {
    drivers: Driver[];
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    vehicles: Vehicle[];
    incidents: DrivingIncident[];
    safetyChecks?: SafetyCheck[];
    safetyTopics?: SafetyTopic[];
    trainingPlans?: TrainingPlan[];
    incabAssessments?: IncabAssessment[];
    zoom?: number;
    onEditDriver?: (driver: Driver) => void;
    onDeleteDriver?: (driver: Driver) => void;
    onOpenIncab?: (driver: Driver) => void;
    onDefensiveTrainingSaved?: (driverId: string, patch: Partial<NonNullable<Driver['defensiveDriving']>>) => void;
}

// ---- helpers ----
const parseDate = (dateStr: string): Date | null => {
    const yearMatch = dateStr.match(/^(\d{4})/);
    if (yearMatch && parseInt(yearMatch[1], 10) > 2400) {
        const ceStr = dateStr.replace(/^\d{4}/, String(parseInt(yearMatch[1], 10) - 543));
        const d = new Date(ceStr);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

const daysBetween = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (!d) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// Convert date string to Thai display: dd Mon. พ.ศ.
// Handles both CE (YYYY-MM-DD) and BE (BBBB-MM-DD where BBBB > 2400) stored formats
const toThaiDate = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    // Try to detect if year portion is already BE (> 2400)
    const yearMatch = dateStr.match(/^(\d{4})/);
    if (yearMatch) {
        const storedYear = parseInt(yearMatch[1], 10);
        if (storedYear > 2400) {
            // Already BE — convert to CE for Date parsing
            const ceStr = dateStr.replace(/^\d{4}/, String(storedYear - 543));
            const d = new Date(ceStr);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = THAI_MONTHS[d.getMonth()];
                return `${day} ${month} ${storedYear}`;
            }
        }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = THAI_MONTHS[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
};

const formatDate = (dateStr?: string) => toThaiDate(dateStr) ?? '-';

// For EditCell display
const fmtD = (dateStr?: string) => toThaiDate(dateStr);

const ExpiryBadge: React.FC<{ dateStr?: string }> = ({ dateStr }) => {
    if (!dateStr) return <span className="text-slate-300">-</span>;
    const days = daysBetween(dateStr);
    if (days === null) return <span className="text-slate-400 whitespace-nowrap">{dateStr}</span>;
    if (days < 0) return <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">หมดแล้ว</span>;
    if (days <= 30) return <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">{formatDate(dateStr)} ({days}ว.)</span>;
    return <span className="text-slate-600 whitespace-nowrap">{formatDate(dateStr)}</span>;
};

const CriminalBadge: React.FC<{ result?: string }> = ({ result }) => {
    if (!result) return <span className="text-slate-300">-</span>;
    const color = result === 'ผ่าน' ? 'bg-emerald-100 text-emerald-700' : result === 'ไม่ผ่าน' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    return <span className={`${color} text-xs font-bold px-1.5 py-0.5 rounded-full`}>{result}</span>;
};

// Thai ID Card utilities
const formatThaiId = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 13);
    if (digits.length === 0) return '';
    const p = [digits.slice(0, 1), digits.slice(1, 5), digits.slice(5, 10), digits.slice(10, 12), digits.slice(12, 13)].filter(Boolean);
    return p.join('-');
};

const validateThaiId = (raw: string): boolean => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (13 - i);
    const check = (11 - (sum % 11)) % 10;
    return check === parseInt(digits[12]);
};

// Inline editable Thai ID card cell with mask + validation
const IdCardCell: React.FC<{ value: string; onSave: (v: string) => void }> = ({ value, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value.replace(/\D/g, ''));
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => { setEditing(true); setVal(value.replace(/\D/g, '')); setTimeout(() => inputRef.current?.focus(), 50); };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
        setVal(digits);
    };

    const handleCommit = () => {
        setEditing(false);
        const digits = val.replace(/\D/g, '');
        if (digits && digits.length === 13) {
            onSave(digits); // store raw digits
        } else if (!digits) {
            onSave('');
        }
        // if partial, discard change
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommit();
        if (e.key === 'Escape') { setEditing(false); setVal(value.replace(/\D/g, '')); }
    };

    const digits = value.replace(/\D/g, '');
    const isValid = digits.length === 13 && validateThaiId(digits);
    const isInvalid = digits.length === 13 && !isValid;

    if (editing) {
        const masked = formatThaiId(val);
        return (
            <div className="flex flex-col gap-0.5">
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={val}
                    onChange={handleChange}
                    onBlur={handleCommit}
                    onKeyDown={handleKey}
                    placeholder="1234567890123"
                    maxLength={13}
                    title="กรอกเลขบัตรประชาชน 13 หลัก"
                    aria-label="หมายเลขบัตรประชาชน"
                    className="w-full px-1 py-0.5 border border-blue-400 rounded outline-none bg-blue-50 font-mono min-w-[120px]"
                />
                {val.length > 0 && (
                    <span className="font-mono text-slate-400" style={{ fontSize: '0.8em' }}>{masked}</span>
                )}
                {val.length === 13 && !validateThaiId(val) && (
                    <span className="text-red-500" style={{ fontSize: '0.8em' }}>Checksum ไม่ถูกต้อง</span>
                )}
            </div>
        );
    }

    if (!digits) {
        return (
            <span onClick={handleClick} title="คลิกเพื่อแก้ไข"
                className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors text-slate-300 font-mono whitespace-nowrap">
                กรอกเลขบัตร
            </span>
        );
    }

    return (
        <div onClick={handleClick} title="คลิกเพื่อแก้ไข" className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors">
            <div className={`font-mono whitespace-nowrap ${isInvalid ? 'text-red-600' : 'text-slate-700'}`}>
                {formatThaiId(digits)}
            </div>
            {isValid && <div className="text-emerald-600" style={{ fontSize: '0.75em' }}>✓ ถูกต้อง</div>}
            {isInvalid && <div className="text-red-500" style={{ fontSize: '0.75em' }}>✗ Checksum ผิด</div>}
        </div>
    );
};

// Inline vehicle plate selector — dropdown from vehicles list
const VehiclePlateCell: React.FC<{
    value: string; // licensePlate or vehicle id
    vehicles: import('../types').Vehicle[];
    onSave: (licensePlate: string) => void; // always saves as licensePlate
}> = ({ value, vehicles, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    // Resolve display: value may be licensePlate or vehicle id
    const matched = vehicles.find(v => v.licensePlate === value || v.id === value);
    const displayPlate = matched?.licensePlate || (value && !value.startsWith('VEH-') ? value : '');

    const filtered = vehicles.filter(v =>
        v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        v.make.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        v.vehicleType.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpen = () => { setEditing(true); setSearch(''); setTimeout(() => inputRef.current?.focus(), 50); };

    const handleSelect = (plate: string) => {
        setEditing(false);
        setSearch('');
        onSave(plate);
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (dropRef.current?.contains(e.relatedTarget as Node)) return;
        setEditing(false);
        setSearch('');
    };

    if (editing) {
        return (
            <div ref={dropRef} className="relative min-w-[130px]" onBlur={handleBlur}>
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ค้นทะเบียน..."
                    className="w-full px-2 py-1 border-2 border-blue-400 rounded outline-none bg-blue-50 font-mono text-sm"
                    aria-label="ค้นหาทะเบียนรถ"
                />
                <div className="absolute top-full left-0 z-[99] bg-white border border-slate-200 rounded-xl shadow-2xl mt-1 w-64 max-h-60 overflow-y-auto">
                    {displayPlate && (
                        <button
                            onMouseDown={() => handleSelect('')}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-slate-100"
                        >
                            × ยกเลิกการผูกทะเบียน
                        </button>
                    )}
                    {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-slate-400 text-center">ไม่พบรถในระบบ</div>
                    ) : filtered.map(v => {
                        const isSelected = v.licensePlate === displayPlate;
                        return (
                            <button
                                key={v.id}
                                onMouseDown={() => handleSelect(v.licensePlate)}
                                className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 ${isSelected ? 'bg-blue-100' : ''
                                    }`}
                            >
                                <div className={`font-mono font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                                    {isSelected ? '✓ ' : ''}{v.licensePlate}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">{[v.vehicleType, v.make, v.model].filter(Boolean).join(' • ')}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleOpen}
            title="คลิกเพื่อเลือกทะเบียนรถ"
            className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors min-w-[90px] group"
        >
            {displayPlate ? (
                <div>
                    <span className="font-mono font-bold text-blue-700">{displayPlate}</span>
                    {matched && <div className="text-slate-400 text-[10px] leading-tight">{matched.vehicleType || matched.make}</div>}
                </div>
            ) : (
                <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-xs">
                    + เลือกทะเบียน
                </span>
            )}
        </div>
    );
};

// Inline editable cell
const EditCell: React.FC<{
    value: string;
    onSave: (v: string) => void;
    type?: string;
    placeholder?: string;
    className?: string;
}> = ({ value, onSave, type = 'text', placeholder = '-', className = '' }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); };
    const handleBlur = () => { setEditing(false); if (val !== value) onSave(val); };
    const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { setEditing(false); if (val !== value) onSave(val); } if (e.key === 'Escape') { setEditing(false); setVal(value); } };

    if (editing) {
        return (
            <input
                ref={inputRef}
                type={type}
                value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKey}
                title={placeholder}
                aria-label={placeholder}
                placeholder={placeholder}
                className={`w-full px-1 py-0.5 border border-blue-400 rounded outline-none bg-blue-50 min-w-[80px] ${className}`}
            />
        );
    }
    const displayValue = type === 'date' && value ? (fmtD(value) ?? value) : (value || placeholder);
    return (
        <span
            onClick={handleClick}
            title="คลิกเพื่อแก้ไข"
            className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors whitespace-nowrap ${!value ? 'text-slate-300' : 'text-slate-700'} ${className}`}
        >
            {displayValue}
        </span>
    );
};

// Select cell inline
const SelectCell: React.FC<{
    value: string;
    options: { value: string; label: string }[];
    onSave: (v: string) => void;
}> = ({ value, options, onSave }) => {
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (
            <select
                autoFocus
                value={value}
                onChange={e => { onSave(e.target.value); setEditing(false); }}
                onBlur={() => setEditing(false)}
                title="เลือกค่า"
                aria-label="เลือกค่า"
                className="w-full px-1 py-0.5 border border-blue-400 rounded outline-none bg-blue-50"
            >
                <option value="">- เลือก -</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    }
    const label = options.find(o => o.value === value)?.label || value;
    return (
        <span onClick={() => setEditing(true)} title="คลิกเพื่อแก้ไข"
            className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors whitespace-nowrap ${!value ? 'text-slate-300' : ''}`}>
            {label || '-'}
        </span>
    );
};

const TH: React.FC<{ children: React.ReactNode; sub?: string; className?: string; rowSpan?: number; colSpan?: number }> = ({ children, sub, className = '', rowSpan, colSpan }) => (
    <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 px-2 py-2 text-center font-semibold whitespace-nowrap ${className}`}>
        <div>{children}</div>
        {sub && <div className="font-normal opacity-75 mt-0.5" style={{ fontSize: '0.85em' }}>{sub}</div>}
    </th>
);

const TD: React.FC<{ children?: React.ReactNode; className?: string; highlight?: boolean; rowSpan?: number }> = ({ children, className = '', highlight, rowSpan }) => (
    <td rowSpan={rowSpan} className={`border border-slate-200 px-1.5 py-1 text-center align-middle ${highlight ? 'bg-amber-50' : ''} ${className}`}>
        {children}
    </td>
);

// ---- main component ----
const DriverMatrix: React.FC<DriverMatrixProps> = ({ drivers, setDrivers, vehicles, incidents, safetyChecks = [], safetyTopics = [], trainingPlans = [], incabAssessments = [], zoom: zoomProp, onEditDriver, onDeleteDriver, onOpenIncab, onDefensiveTrainingSaved }) => {
    const { addToast } = useToast();
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const effectiveZoom = zoomProp ?? 1;
    const [trainingModalDriver, setTrainingModalDriver] = useState<Driver | null>(null);

    // --- Criminal check upload modal ---
    const [criminalModal, setCriminalModal] = useState<{ driver: Driver; pendingResult: string } | null>(null);
    const [criminalFiles, setCriminalFiles] = useState<string[]>([]);
    const [isCriminalUploading, setIsCriminalUploading] = useState(false);
    const [criminalStep, setCriminalStep] = useState<1 | 2>(1); // 1=upload, 2=remark
    const [criminalRemarkFound, setCriminalRemarkFound] = useState<'ไม่พบ' | 'พบ' | ''>('');
    const [criminalRemarkText, setCriminalRemarkText] = useState('');

    const resetCriminalModal = () => {
        setCriminalModal(null);
        setCriminalFiles([]);
        setCriminalStep(1);
        setCriminalRemarkFound('');
        setCriminalRemarkText('');
    };

    const handleCriminalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !criminalModal) return;
        setIsCriminalUploading(true);
        try {
            const urls = await Promise.all(files.map(file => {
                const isPdf = file.type === 'application/pdf';
                const ts = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `truck-maintenance/criminal-check/${criminalModal.driver.id}/${ts}_${safeName}`;
                return isPdf ? uploadToNAS(file, path) : uploadFileToStorage(file, path);
            }));
            setCriminalFiles(prev => [...prev, ...urls]);
        } finally {
            setIsCriminalUploading(false);
            e.target.value = '';
        }
    };

    const handleConfirmCriminal = async () => {
        if (!criminalModal) return;
        // Validate step 2
        if (!criminalRemarkFound) return;
        if (criminalRemarkFound === 'พบ' && !criminalRemarkText.trim()) return;

        const ok = await confirmAction(
            'ยืนยันการบันทึกผลตรวจอาชญากรรม',
            `บันทึกผล "${criminalModal.pendingResult}" คดีที่พบ: ${criminalRemarkFound}${criminalRemarkFound === 'พบ' ? ` (${criminalRemarkText.trim()})` : ''} สำหรับ ${criminalModal.driver.name}`,
            'บันทึก'
        );
        if (!ok) return;
        const existing = criminalModal.driver.criminalCheck?.files || [];
        const remark = criminalRemarkFound === 'พบ' ? criminalRemarkText.trim() : 'ไม่พบคดี';
        setDrivers(prev => prev.map(d => {
            if (d.id !== criminalModal.driver.id) return d;
            const ex = (d.criminalCheck as any) || {};
            return { ...d, criminalCheck: { ...ex, result: criminalModal.pendingResult, files: [...existing, ...criminalFiles], remark }, updatedAt: new Date().toISOString() };
        }));
        resetCriminalModal();
        addToast('บันทึกผลตรวจอาชญากรรมพร้อมหลักฐานสำเร็จ', 'success');
    };

    const handleDeleteDriver = async (driver: Driver) => {
        const ok = await confirmAction(
            'ยืนยันการลบพนักงาน',
            `ต้องการลบข้อมูลของ "${driver.name}" ออกจากระบบใช่หรือไม่? ไม่สามารถย้อนคืนได้`,
            'ลบออก'
        );
        if (!ok) return;
        if (onDeleteDriver) {
            onDeleteDriver(driver);
        } else {
            setDrivers(prev => prev.filter(d => d.id !== driver.id));
            addToast(`ลบข้อมูล ${driver.name} สำเร็จ`, 'success');
        }
    };

    const handleCriminalSelectChange = (driver: Driver, val: string) => {
        if (val === 'ผ่าน') {
            setCriminalModal({ driver, pendingResult: val });
            setCriminalFiles([]);
        } else {
            updateNested(driver.id, 'criminalCheck', { result: val as any });
        }
    };

    const updateDriver = async (id: string, patch: Partial<Driver>, label?: string) => {
        const driver = drivers.find(d => d.id === id);
        const ok = await confirmAction(
            'ยืนยันการบันทึกข้อมูล',
            `${label ? label + ' ' : ''}บันทึกข้อมูลของ ${driver?.name || ''} ใช่หรือไม่?`,
            'บันทึก'
        );
        if (!ok) return;
        setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
        addToast('บันทึกข้อมูลสำเร็จ', 'success');
    };

    // ---- Defensive Driving 120d helpers ----
    const computeDefensiveDueDate = (driver: Driver) => {
        if (driver.defensiveDriving?.dueDate120) return driver.defensiveDriving.dueDate120;
        if (driver.hireDate) {
            const d = new Date(driver.hireDate);
            d.setDate(d.getDate() + 120);
            return d.toISOString().split('T')[0];
        }
        const d = new Date();
        d.setDate(d.getDate() + 120);
        return d.toISOString().split('T')[0];
    };

    const computeDefensiveStatus = (driver: Driver) => {
        if (driver.defensiveDriving?.status === 'waived') return { status: 'waived' as const };

        // อ่าน trainingDate จาก defensiveDriving ก่อน
        // fallback 1: startDate ของ defensiveDriving (กรณี manual input startDate แต่ไม่ได้ set trainingDate)
        // fallback 2: trainingRecords สำหรับ defensive/defensive_refresh (sync จาก SafetyPlan, รองรับ custom code)
        const rawTRForStatus = driver.trainingRecords ?? [];
        const allRecordsForStatus = Array.isArray(rawTRForStatus) ? rawTRForStatus : Object.values(rawTRForStatus as Record<string, NonNullable<typeof driver.trainingRecords>[0]>);
        const trainingDate = driver.defensiveDriving?.trainingDate
            ?? driver.defensiveDriving?.startDate
            ?? allRecordsForStatus
                .filter(r =>
                    r.topicCode === 'defensive'
                    || r.topicCode === 'defensive_refresh'
                    || r.topicCode?.toLowerCase().includes('defensive')
                    || r.topicName?.toLowerCase().includes('defensive')
                )
                .sort((a, b) => b.actualDate.localeCompare(a.actualDate))[0]?.actualDate;

        // 1. ถ้าอบรมแล้ว -> ตรวจสอบการ Refresh (12 เดือน)
        if (trainingDate) {
            const d = new Date(trainingDate);
            d.setFullYear(d.getFullYear() + 1);
            const refreshDate = d.toISOString().split('T')[0];
            const days = daysBetween(refreshDate) ?? 0;

            if (days < 0) return { status: 'refresh_overdue' as const, date: refreshDate, days: Math.abs(days) };
            if (days <= 30) return { status: 'refresh_near' as const, date: refreshDate, days };
            return { status: 'completed' as const, date: trainingDate };
        }

        // 2. ถ้ายังไม่เคยอบรม -> ตรวจว่าเป็น พนง. ใหม่ หรือ เดิม
        const isNew = isNewEmployee(driver);
        const dueDate = computeDefensiveDueDate(driver);
        const days = daysBetween(dueDate) ?? 0;

        if (!isNew) {
            return { status: 'never_trained' as const, date: dueDate, days: Math.abs(days) };
        }

        // 3. พนง. ใหม่ -> ดู countdown 120 วัน
        if (days < 0) return { status: 'overdue' as const, date: dueDate, days: Math.abs(days) };
        if (days <= 30) return { status: 'near_due' as const, date: dueDate, days };
        return { status: 'pending' as const, date: dueDate, days };
    };
    const statusChip = (status: string, days?: number, date?: string) => {
        const dayStr = days !== undefined ? (days > 999 ? "999+" : days) : "";

        switch (status) {
            case 'completed':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✅ สำเร็จ</span>
                        {date && <span className="text-[9px] text-emerald-600 mt-0.5 font-medium">{formatDate(date)}</span>}
                    </div>
                );
            case 'refresh_near':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">🔄 ต้อง Refresh</span>
                        <span className="text-[9px] text-amber-600 mt-0.5 font-medium">เหลือ {days} วัน</span>
                    </div>
                );
            case 'refresh_overdue':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">🟠 Refresh เกินกำหนด</span>
                        <span className="text-[9px] text-orange-600 mt-0.5 font-medium">เกิน {dayStr} วัน</span>
                    </div>
                );
            case 'near_due':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-bold">⚠️ ใกล้กำหนด</span>
                        <span className="text-[9px] text-yellow-600 mt-0.5 font-medium">เหลือ {days} วัน</span>
                    </div>
                );
            case 'overdue':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">🔴 เกินกำหนด</span>
                        <span className="text-[9px] text-red-600 mt-0.5 font-medium">เกิน {dayStr} วัน</span>
                    </div>
                );
            case 'never_trained':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold italic">🔴 ไม่เคยอบรม</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">พนง.เดิม</span>
                    </div>
                );
            case 'pending':
                return (
                    <div className="inline-flex flex-col items-center">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-100">⏳ รอดำเนินการ</span>
                        <span className="text-[9px] text-blue-500 mt-0.5 font-medium">เหลือ {days} วัน</span>
                    </div>
                );
            case 'waived':
                return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">⛔ ยกเว้น</span>;
            default:
                return <span className="text-slate-300">-</span>;
        }
    };

    const handleSaveTraining120 = async (driverId: string, patch: Partial<NonNullable<Driver['defensiveDriving']>>) => {
        const due = computeDefensiveDueDate(drivers.find(d => d.id === driverId)!);
        await updateNested(driverId, 'defensiveDriving', { ...patch, dueDate120: due }, 'อบรม 120 วัน');
        setTrainingModalDriver(null);
        // Sync to TrainingPlan
        if (onDefensiveTrainingSaved) {
            onDefensiveTrainingSaved(driverId, patch);
        }
    };

    const updateNested = async <K extends keyof Driver>(id: string, key: K, patch: Partial<NonNullable<Driver[K]>>, label?: string) => {
        const driver = drivers.find(d => d.id === id);
        const ok = await confirmAction(
            'ยืนยันการบันทึกข้อมูล',
            `${label ? label + ' ' : ''}บันทึกข้อมูลของ ${driver?.name || ''} ใช่หรือไม่?`,
            'บันทึก'
        );
        if (!ok) return;
        setDrivers(prev => prev.map(d => {
            if (d.id !== id) return d;
            const existing = (d[key] as any) || {};
            return { ...d, [key]: { ...existing, ...patch }, updatedAt: new Date().toISOString() };
        }));
        addToast('บันทึกข้อมูลสำเร็จ', 'success');
    };

    const filteredDrivers = useMemo(() => {
        return drivers.filter(d => {
            const q = filter.toLowerCase();
            const matchSearch = !q || d.name.toLowerCase().includes(q) || d.employeeId.toLowerCase().includes(q) || (d.idCard || '').includes(q);
            const matchStatus = statusFilter === 'all' || d.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [drivers, filter, statusFilter]);

    return (
        <div className="space-y-3">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="ค้นหาชื่อ / รหัส / บัตรประชาชน..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    title="กรองสถานะ"
                    aria-label="กรองสถานะพนักงาน"
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none"
                >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="active">ปฏิบัติงาน</option>
                    <option value="on_leave">ลา</option>
                    <option value="suspended">พักงาน</option>
                    <option value="terminated">ออกจากงาน</option>
                </select>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    คลิกที่ช่องข้อมูลเพื่อแก้ไข • แสดง {filteredDrivers.length} / {drivers.length} คน
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[2800px]" style={{ fontSize: `${effectiveZoom * 12}px` }}>
                        <thead>
                            {/* Group header row 1 */}
                            <tr>
                                <TH rowSpan={3} className="bg-slate-600 text-white w-8">ลำดับ</TH>
                                <TH colSpan={9} className="bg-blue-600 text-white py-2">ข้อมูลพนักงานขับรถ</TH>
                                <TH colSpan={4} className="bg-emerald-600 text-white py-2">อบรมความปลอดภัย<br /><span className="font-normal" style={{ fontSize: '0.85em' }}>Safety Induction</span></TH>
                                <TH colSpan={3} className="bg-red-500 text-white py-2">ประวัติอุบัติเหตุล่าสุด<br /><span className="font-normal" style={{ fontSize: '0.85em' }}>Accident Record</span></TH>
                                <TH colSpan={5} className="bg-purple-600 text-white py-2">ใบขับขี่<br /><span className="font-normal" style={{ fontSize: '0.85em' }}>Driving License</span></TH>
                                <TH colSpan={2} className="bg-orange-500 text-white py-2">ตรวจสารเสพติด / แอลกอฮอล์<br /><span className="font-normal" style={{ fontSize: '0.85em' }}>Drug Test &amp; Alcohol Check</span></TH>
                                <TH colSpan={2} className="bg-teal-600 text-white py-2">GPS / กล้อง</TH>
                                <TH colSpan={10} className="bg-indigo-600 text-white py-2">ข้อมูลรถที่รับผิดชอบ</TH>
                                <TH colSpan={7} className="bg-pink-600 text-white py-2">รูปภาพรถ / อุปกรณ์</TH>
                                <TH colSpan={10} className="bg-cyan-700 text-white py-2">Defensive Driving Program & Refresh Training</TH>
                                <TH colSpan={2} className="bg-teal-700 text-white py-2">Safety Training History<br /><span className="font-normal" style={{ fontSize: '0.85em' }}>ประวัติอบรมทั้งหมด</span></TH>
                                <TH colSpan={2} className="bg-violet-600 text-white py-2">Incab Coaching</TH>
                                <TH colSpan={2} className="bg-rose-600 text-white py-2">Certificate</TH>
                                <TH rowSpan={3} className="bg-slate-700 text-white min-w-[80px] sticky right-0 z-10">จัดการ</TH>
                            </tr>
                            {/* Group header row 2 */}
                            <tr className="bg-slate-50">
                                {/* Employee Info */}
                                <TH rowSpan={2} className="min-w-[70px] bg-blue-50 text-blue-900">รหัส<br /><span style={{ fontSize: '0.85em' }}>Employee ID</span></TH>
                                <TH rowSpan={2} className="min-w-[110px] bg-blue-50 text-blue-900">หมายเลขบัตรประชาชน<br /><span style={{ fontSize: '0.85em' }}>ID Number</span></TH>
                                <TH rowSpan={2} className="min-w-[130px] bg-blue-50 text-blue-900">ชื่อพนักงาน<br /><span style={{ fontSize: '0.85em' }}>Name</span></TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-blue-50 text-blue-900">วันเริ่มงาน<br /><span style={{ fontSize: '0.85em' }}>Started date</span></TH>
                                <TH rowSpan={2} className="min-w-[60px] bg-blue-50 text-blue-900">รูป พขร.<br /><span style={{ fontSize: '0.85em' }}>Picture</span></TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-blue-50 text-blue-900">ผลตรวจ<br />อาชญากรรม</TH>
                                <TH rowSpan={2} className="min-w-[100px] bg-blue-50 text-blue-900">คดีที่พบ<br /><span style={{ fontSize: '0.85em' }}>Remark</span></TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-blue-50 text-blue-900">วัน/เดือน/ปีเกิด<br /><span style={{ fontSize: '0.85em' }}>Date of Birth</span></TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-blue-50 text-blue-900">เบอร์โทร<br /><span style={{ fontSize: '0.85em' }}>Telephone</span></TH>
                                {/* Safety Induction Q1-Q4 */}
                                <TH rowSpan={2} className="bg-emerald-50 text-emerald-900">Q1</TH>
                                <TH rowSpan={2} className="bg-emerald-50 text-emerald-900">Q2</TH>
                                <TH rowSpan={2} className="bg-emerald-50 text-emerald-900">Q3</TH>
                                <TH rowSpan={2} className="bg-emerald-50 text-emerald-900">Q4</TH>
                                {/* Accident */}
                                <TH rowSpan={2} className="min-w-[90px] bg-red-50 text-red-900">วันที่เกิดเหตุ</TH>
                                <TH rowSpan={2} className="min-w-[100px] bg-red-50 text-red-900">สาเหตุ</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-red-50 text-red-900">ไซต์งาน</TH>
                                {/* License */}
                                <TH rowSpan={2} className="min-w-[100px] bg-purple-50 text-purple-900">หมายเลขใบขับขี่</TH>
                                <TH rowSpan={2} className="min-w-[60px] bg-purple-50 text-purple-900">ประเภท</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-purple-50 text-purple-900">วันอนุญาต</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-purple-50 text-purple-900">วันหมดอายุ</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-purple-50 text-purple-900">กำหนดต่อ<br /><span style={{ fontSize: '0.85em' }}>Lead time</span></TH>
                                {/* Safety Check latest */}
                                <TH rowSpan={2} className="min-w-[90px] bg-orange-50 text-orange-900">แอลกอฮอล์<br /><span style={{ fontSize: '0.85em' }}>ล่าสุด</span></TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-orange-50 text-orange-900">สารเสพติด<br /><span style={{ fontSize: '0.85em' }}>ล่าสุด</span></TH>
                                {/* GPS */}
                                <TH rowSpan={2} className="min-w-[100px] bg-teal-50 text-teal-900">GPS Provider</TH>
                                <TH rowSpan={2} className="min-w-[100px] bg-teal-50 text-teal-900">Facing Camera</TH>
                                {/* Vehicle */}
                                <TH rowSpan={2} className="min-w-[80px] bg-indigo-50 text-indigo-900">ประเภทรถ</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-indigo-50 text-indigo-900">ทะเบียน</TH>
                                <TH rowSpan={2} className="min-w-[70px] bg-indigo-50 text-indigo-900">ยี่ห้อ</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-indigo-50 text-indigo-900">วันหมดอายุภาษี</TH>
                                <TH rowSpan={2} className="min-w-[70px] bg-indigo-50 text-indigo-900">จังหวัด</TH>
                                <TH rowSpan={2} className="min-w-[60px] bg-indigo-50 text-indigo-900">เชื้อเพลิง</TH>
                                <TH rowSpan={2} className="min-w-[70px] bg-indigo-50 text-indigo-900">วันหมดอายุ<br />ประกัน</TH>
                                <TH rowSpan={2} className="min-w-[70px] bg-indigo-50 text-indigo-900">วันหมดอายุ<br />พรบ.</TH>
                                <TH rowSpan={2} className="min-w-[60px] bg-indigo-50 text-indigo-900">อายุรถ<br /><span style={{ fontSize: '0.85em' }}>(ปี)</span></TH>
                                <TH rowSpan={2} className="min-w-[140px] bg-indigo-50 text-indigo-900">หมายเลขตัวถัง<br />ตัวเครื่อง</TH>
                                {/* Photos */}
                                <TH rowSpan={2} className="min-w-[65px] bg-pink-50 text-pink-900">รูปหน้ารถ<br />+อุปกรณ์</TH>
                                <TH rowSpan={2} className="min-w-[65px] bg-pink-50 text-pink-900">คาดเข็มขัด</TH>
                                <TH rowSpan={2} className="min-w-[55px] bg-pink-50 text-pink-900">ซ้าย</TH>
                                <TH rowSpan={2} className="min-w-[55px] bg-pink-50 text-pink-900">ขวา</TH>
                                <TH rowSpan={2} className="min-w-[55px] bg-pink-50 text-pink-900">หลัง</TH>
                                <TH rowSpan={2} className="min-w-[65px] bg-pink-50 text-pink-900">กล่อง<br />ปฐมพยาบาล</TH>
                                <TH rowSpan={2} className="min-w-[65px] bg-pink-50 text-pink-900">ไฟฉาย</TH>
                                {/* Defensive Driving */}
                                <TH rowSpan={2} className="min-w-[60px] bg-cyan-50 text-cyan-900">Plan</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-cyan-50 text-cyan-900">ได้รับอบรม<br />ภายใน 120 วัน</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-cyan-50 text-cyan-900">Booking Date</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-cyan-50 text-cyan-900">วันเริ่มอบรม</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-cyan-50 text-cyan-900">วันสิ้นสุด</TH>
                                <TH rowSpan={2} className="min-w-[65px] bg-cyan-50 text-cyan-900">Pre Test</TH>
                                <TH rowSpan={2} className="min-w-[65px] bg-cyan-50 text-cyan-900">Post Test</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-cyan-50 text-cyan-900">Trainer</TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-cyan-50 text-cyan-900">Next Training<br /><span style={{ fontSize: '0.85em' }}>Refresh</span></TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-cyan-50 text-cyan-900">Record</TH>
                                {/* Training History */}
                                <TH rowSpan={2} className="min-w-[160px] bg-teal-50 text-teal-900">หัวข้ออบรม (ปีนี้)<br /><span style={{ fontSize: '0.85em' }}>จากแผนความปลอดภัย</span></TH>
                                <TH rowSpan={2} className="min-w-[90px] bg-teal-50 text-teal-900">อบรมแล้ว<br />(Total)</TH>
                                {/* Incab */}
                                <TH rowSpan={2} className="min-w-[60px] bg-violet-50 text-violet-900">Score</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-violet-50 text-violet-900">Date</TH>
                                {/* Certificate */}
                                <TH rowSpan={2} className="min-w-[100px] bg-rose-50 text-rose-900">Certificate No.</TH>
                                <TH rowSpan={2} className="min-w-[80px] bg-rose-50 text-rose-900">Issued Date</TH>
                            </tr>
                            <tr className="bg-slate-50">
                                {/* Intentionally empty — rowSpan covers all */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={60} className="text-center text-slate-400 py-12">
                                        ไม่พบข้อมูลพนักงานขับรถ
                                    </td>
                                </tr>
                            ) : filteredDrivers.map((driver, idx) => {
                                const vehicle = vehicles.find(v =>
                                    v.licensePlate === driver.primaryVehicle ||
                                    v.id === driver.primaryVehicle ||
                                    (driver.assignedVehicles ?? []).includes(v.id) ||
                                    (driver.assignedVehicles ?? []).includes(v.licensePlate)
                                );

                                // Latest accident
                                const driverIncidents = incidents
                                    .filter(i => i.driverId === driver.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                const latestIncident = driverIncidents[0];

                                // License expiry days
                                const licExpDays = driver.licenseExpiry ? daysBetween(driver.licenseExpiry) : null;

                                const deadline120Str = computeDefensiveDueDate(driver);

                                const rowBg = driver.status === 'terminated' ? 'bg-slate-50 opacity-60' :
                                    driver.status === 'suspended' ? 'bg-red-50' :
                                        driver.status === 'on_leave' ? 'bg-amber-50' : '';

                                const photoUrl = driver.photos?.[0];

                                // รวม defensive records จาก trainingRecords + fallback จาก defensiveDriving object
                                const defensiveRecords = (() => {
                                    // normalize: Firebase อาจ return nested array เป็น object {0:{...},1:{...}}
                                    const rawTR = driver.trainingRecords ?? [];
                                    if (rawTR && (Array.isArray(rawTR) ? (rawTR as unknown[]).length > 0 : Object.keys(rawTR as object).length > 0)) {
                                        console.log(`[DriverMatrix] driver=${driver.name} trainingRecords:`, rawTR);
                                    }
                                    const allRecords = Array.isArray(rawTR) ? rawTR : Object.values(rawTR as Record<string, NonNullable<typeof driver.trainingRecords>[0]>);
                                    const fromTraining = allRecords
                                        .filter(r =>
                                            r.topicCode === 'defensive'
                                            || r.topicCode === 'defensive_refresh'
                                            || r.topicCode?.toLowerCase().includes('defensive')
                                            || r.topicName?.toLowerCase().includes('defensive')
                                        )
                                        .sort((a, b) => b.actualDate.localeCompare(a.actualDate));
                                    if (fromTraining.length > 0) return fromTraining;
                                    // fallback: สร้าง record จาก defensiveDriving object (ข้อมูลเก่าที่กรอกมือ)
                                    const dd = driver.defensiveDriving;
                                    const trainingDate = dd?.trainingDate || dd?.startDate;
                                    if (trainingDate) {
                                        return [{
                                            sessionId: '',
                                            topicId: '',
                                            topicCode: 'defensive' as string,
                                            topicName: dd?.plan || 'Defensive Driving',
                                            actualDate: trainingDate,
                                            location: undefined as string | undefined,
                                            trainer: dd?.trainer,
                                            preTest: dd?.preTest,
                                            postTest: dd?.postTest,
                                            evidencePhotos: [] as string[],
                                            year: new Date(trainingDate).getFullYear(),
                                            _fromDD: true, // flag ว่ามาจาก defensiveDriving object
                                            _dd: dd,
                                        }];
                                    }
                                    return [] as typeof fromTraining;
                                })();
                                const fmtDate = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); };

                                return (
                                    <React.Fragment key={driver.id}>
                                    <tr className={`hover:bg-blue-50/30 transition-colors ${rowBg}`}>
                                        {/* ลำดับ */}
                                        <TD className="font-bold text-slate-500 w-8">{idx + 1}</TD>

                                        {/* รหัสพนักงาน */}
                                        <TD className="font-mono font-bold text-blue-700">{driver.employeeId}</TD>

                                        {/* บัตรประชาชน */}
                                        <TD className="min-w-[140px]">
                                            <IdCardCell
                                                value={driver.idCard || ''}
                                                onSave={v => updateDriver(driver.id, { idCard: v })}
                                            />
                                        </TD>

                                        {/* ชื่อ */}
                                        <TD className="text-left font-medium min-w-[120px]">
                                            <div className="flex items-center gap-1.5">
                                                {photoUrl && (
                                                    <img src={photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" />
                                                )}
                                                <span className="truncate">{driver.name}</span>
                                            </div>
                                        </TD>

                                        {/* วันเริ่มงาน */}
                                        <TD><span className="whitespace-nowrap">{formatDate(driver.hireDate)}</span></TD>

                                        {/* รูป พขร. */}
                                        <TD>
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={driver.name} className="w-10 h-10 object-cover rounded-lg mx-auto border border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg mx-auto flex items-center justify-center text-slate-300 text-lg">👤</div>
                                            )}
                                        </TD>

                                        {/* ผลตรวจอาชญากรรม */}
                                        <TD className="min-w-[130px]">
                                            <div className="flex flex-col gap-1 items-center">
                                                <SelectCell
                                                    value={driver.criminalCheck?.result || ''}
                                                    options={[
                                                        { value: 'ผ่าน', label: 'ผ่าน' },
                                                        { value: 'ไม่ผ่าน', label: 'ไม่ผ่าน' },
                                                        { value: 'รอผล', label: 'รอผล' },
                                                    ]}
                                                    onSave={v => handleCriminalSelectChange(driver, v)}
                                                />
                                                {/* ไฟล์แนบ */}
                                                {(driver.criminalCheck?.files || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                                        {(driver.criminalCheck!.files!).map((url, i) => {
                                                            const isPdf = url.toLowerCase().includes('.pdf');
                                                            return isPdf ? (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-0.5 px-1 py-0.5 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                                                                    title="ดู PDF">
                                                                    <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" /></svg>
                                                                    <span style={{ fontSize: '0.8em' }} className="text-red-600">PDF</span>
                                                                </a>
                                                            ) : (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                                    className="block w-7 h-7 rounded overflow-hidden border border-slate-200 hover:opacity-80"
                                                                    title="ดูรูป">
                                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                                </a>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => { setCriminalModal({ driver, pendingResult: driver.criminalCheck?.result || '' }); setCriminalFiles([]); }}
                                                            className="w-7 h-7 rounded border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500"
                                                            title="เพิ่มไฟล์">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </TD>

                                        {/* คดีที่พบ */}
                                        <TD>
                                            <EditCell
                                                value={driver.criminalCheck?.remark || ''}
                                                onSave={v => updateNested(driver.id, 'criminalCheck', { remark: v })}
                                                placeholder="ระบุ"
                                            />
                                        </TD>

                                        {/* วันเกิด */}
                                        <TD>
                                            <EditCell
                                                value={driver.dateOfBirth || ''}
                                                onSave={v => updateDriver(driver.id, { dateOfBirth: v })}
                                                type="date"
                                                placeholder="ระบุวันเกิด"
                                            />
                                        </TD>

                                        {/* เบอร์โทร */}
                                        <TD className="font-mono">{driver.phone || '-'}</TD>

                                        {/* Safety Induction Q1-Q4 — อ่านจาก TrainingPlans อัตโนมัติ */}
                                        {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                            const code = `induction_${q}`;
                                            const plan = trainingPlans.find(
                                                p => p.driverId === driver.id && p.topicCode === code
                                            );
                                            const isDone = plan?.status === 'done' && !!plan.actualDate;
                                            const isOverdue = plan?.status === 'overdue';
                                            const isBooked = plan?.status === 'booked';
                                            const isPlanned = plan?.status === 'planned';
                                            return (
                                                <TD key={q} highlight={isOverdue}>
                                                    {isDone ? (
                                                        <div className="text-center">
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">✓ ผ่าน</span>
                                                            <div className="text-[9px] text-slate-400 mt-0.5">
                                                                {new Date(plan!.actualDate!).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                            </div>
                                                            {plan?.trainer && <div className="text-[9px] text-slate-400 truncate max-w-[60px] mx-auto" title={plan.trainer}>{plan.trainer}</div>}
                                                        </div>
                                                    ) : isOverdue ? (
                                                        <div className="text-center">
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">⚠ เกิน</span>
                                                            <div className="text-[9px] text-slate-400 mt-0.5">{new Date(plan!.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                                                        </div>
                                                    ) : isBooked ? (
                                                        <div className="text-center">
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">📅 นัด</span>
                                                            {plan?.bookingDate && <div className="text-[9px] text-slate-400 mt-0.5">{new Date(plan.bookingDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>}
                                                        </div>
                                                    ) : isPlanned ? (
                                                        <div className="text-center">
                                                            <span className="text-[10px] text-slate-400">• แผน</span>
                                                            <div className="text-[9px] text-slate-300">{new Date(plan!.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-200 text-xs">-</span>
                                                    )}
                                                </TD>
                                            );
                                        })}

                                        {/* อุบัติเหตุล่าสุด */}
                                        <TD>
                                            {latestIncident ? (
                                                <span className="text-red-600 whitespace-nowrap">{formatDate(latestIncident.date)}</span>
                                            ) : <span className="text-emerald-500">ไม่มี</span>}
                                        </TD>
                                        <TD className="text-left">
                                            <span className="text-slate-600 line-clamp-2">{latestIncident?.description || '-'}</span>
                                        </TD>
                                        <TD>
                                            <span className="text-slate-500">{latestIncident?.location || '-'}</span>
                                        </TD>

                                        {/* ใบขับขี่ */}
                                        <TD className="font-mono">{driver.licenseNumber || '-'}</TD>
                                        <TD>
                                            <span className="bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">{driver.licenseClass || '-'}</span>
                                        </TD>
                                        <TD><span className="whitespace-nowrap">{formatDate(driver.licenseIssueDate)}</span></TD>
                                        <TD highlight={licExpDays !== null && licExpDays <= 30}>
                                            <ExpiryBadge dateStr={driver.licenseExpiry} />
                                        </TD>
                                        <TD highlight={licExpDays !== null && licExpDays <= 30}>
                                            {licExpDays !== null ? (
                                                <span className={`font-bold ${licExpDays < 0 ? 'text-red-600' : licExpDays <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                                    {licExpDays < 0 ? `เกิน ${Math.abs(licExpDays)} วัน` : `${licExpDays} วัน`}
                                                </span>
                                            ) : '-'}
                                        </TD>

                                        {/* Safety Check Latest — แอลกอฮอล์ / สารเสพติด */}
                                        {(() => {
                                            const driverChecks = safetyChecks.filter(c =>
                                                c.attendees.some(a => a.driverId === driver.id)
                                            );
                                            const latestAlcohol = driverChecks
                                                .filter(c => c.type === 'alcohol')
                                                .sort((a, b) => b.date.localeCompare(a.date))[0];
                                            const latestSubstance = driverChecks
                                                .filter(c => c.type === 'substance')
                                                .sort((a, b) => b.date.localeCompare(a.date))[0];
                                            const alcAtt = latestAlcohol?.attendees.find(a => a.driverId === driver.id);
                                            const subAtt = latestSubstance?.attendees.find(a => a.driverId === driver.id);
                                            return (
                                                <>
                                                    <TD>
                                                        {alcAtt ? (
                                                            <div className="text-center">
                                                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${alcAtt.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {alcAtt.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                                                </span>
                                                                {alcAtt.alcoholLevel !== undefined && (
                                                                    <div className="text-[10px] text-slate-400 mt-0.5">{alcAtt.alcoholLevel.toFixed(2)} mg%</div>
                                                                )}
                                                                <div className="text-[10px] text-slate-400">{new Date(latestAlcohol.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                                                            </div>
                                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                                    </TD>
                                                    <TD>
                                                        {subAtt ? (
                                                            <div className="text-center">
                                                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${subAtt.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {subAtt.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(latestSubstance.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                                                            </div>
                                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                                    </TD>
                                                </>
                                            );
                                        })()}

                                        {/* GPS Provider */}
                                        <TD>
                                            <EditCell
                                                value={driver.gpsProvider || ''}
                                                onSave={v => updateDriver(driver.id, { gpsProvider: v })}
                                                placeholder="ชื่อผู้ให้บริการ"
                                            />
                                        </TD>

                                        {/* Facing Camera */}
                                        <TD>
                                            <EditCell
                                                value={driver.facingCamera || ''}
                                                onSave={v => updateDriver(driver.id, { facingCamera: v })}
                                                placeholder="ชื่อผู้ให้บริการ"
                                            />
                                        </TD>

                                        {/* ข้อมูลรถ — auto-fill จาก vehicles */}
                                        <TD>
                                            <span className={vehicle?.vehicleType ? 'text-indigo-700 font-medium' : 'text-slate-300'}>
                                                {vehicle?.vehicleType || '-'}
                                            </span>
                                        </TD>
                                        <TD>
                                            <VehiclePlateCell
                                                value={driver.primaryVehicle || ''}
                                                vehicles={vehicles}
                                                onSave={plate => updateDriver(driver.id, { primaryVehicle: plate }, '\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e23\u0e16:')}
                                            />
                                        </TD>
                                        <TD>
                                            <span className={vehicle?.make ? 'text-indigo-700' : 'text-slate-300'}>
                                                {vehicle ? `${vehicle.make}${vehicle.model ? ' ' + vehicle.model : ''}` : '-'}
                                            </span>
                                        </TD>
                                        <TD>
                                            {vehicle?.taxExpiryDate
                                                ? <ExpiryBadge dateStr={vehicle.taxExpiryDate} />
                                                : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            <span className={vehicle?.province ? 'text-indigo-700' : 'text-slate-300'}>
                                                {vehicle?.province || '-'}
                                            </span>
                                        </TD>
                                        <TD>
                                            <span className={vehicle?.fuelType ? 'text-indigo-700' : 'text-slate-300'}>
                                                {vehicle?.fuelType || '-'}
                                            </span>
                                        </TD>
                                        <TD>
                                            {vehicle?.insuranceExpiryDate
                                                ? <ExpiryBadge dateStr={vehicle.insuranceExpiryDate} />
                                                : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            {vehicle?.actExpiryDate
                                                ? <ExpiryBadge dateStr={vehicle.actExpiryDate} />
                                                : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            {vehicle
                                                ? (() => {
                                                    let ageYears: number | null = null;
                                                    let ageMonths: number | null = null;
                                                    if (vehicle.yearOfManufacture) {
                                                        ageYears = new Date().getFullYear() - vehicle.yearOfManufacture;
                                                    } else if (vehicle.registrationDate) {
                                                        const reg = new Date(vehicle.registrationDate);
                                                        if (!isNaN(reg.getTime())) {
                                                            const now = new Date();
                                                            const diffMs = now.getTime() - reg.getTime();
                                                            const diffDays = diffMs / 86400000;
                                                            ageYears = Math.floor(diffDays / 365);
                                                            ageMonths = Math.floor((diffDays % 365) / 30);
                                                        }
                                                    }
                                                    if (ageYears === null) return <span className="text-slate-300">-</span>;
                                                    const color = ageYears >= 15 ? 'text-red-600 font-bold' : ageYears >= 10 ? 'text-amber-600 font-semibold' : 'text-indigo-700';
                                                    return <span className={color}>{ageYears} ปี{ageMonths !== null && ageMonths > 0 ? ` ${ageMonths} เดือน` : ''}</span>;
                                                })()
                                                : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            {vehicle ? (
                                                <div className="font-mono text-xs space-y-0.5">
                                                    {vehicle.chassisNumber && <div><span className="text-slate-400">ถัง:</span> <span className="text-slate-700">{vehicle.chassisNumber}</span></div>}
                                                    {vehicle.engineNumber && <div><span className="text-slate-400">เครื่อง:</span> <span className="text-slate-700">{vehicle.engineNumber}</span></div>}
                                                    {!vehicle.chassisNumber && !vehicle.engineNumber && <span className="text-slate-300">-</span>}
                                                </div>
                                            ) : <span className="text-slate-300">-</span>}
                                        </TD>

                                        {/* รูปภาพรถ — คลิกดู / อัปโหลด / เปลี่ยนรูป → NAS */}
                                        {([
                                            { field: 'vehicleFrontPhoto', label: 'หน้ารถ', slug: 'front' },
                                            { field: 'safetyBeltPhoto', label: 'เข็มขัด', slug: 'belt' },
                                            { field: 'vehicleLeftPhoto', label: 'ซ้าย', slug: 'left' },
                                            { field: 'vehicleRightPhoto', label: 'ขวา', slug: 'right' },
                                            { field: 'vehicleBackPhoto', label: 'หลัง', slug: 'back' },
                                        ] as const).map(({ field, label, slug }) => {
                                            const url = driver[field] as string | undefined;
                                            const inputId = `photo-${driver.id}-${slug}`;
                                            const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const path = `truck-maintenance/driver/${driver.id}/${Date.now()}_${slug}.webp`;
                                                const uploaded = await uploadToNAS(file, path);
                                                if (uploaded) await updateDriver(driver.id, { [field]: uploaded } as Partial<Driver>, `รูป${label}:`);
                                                e.target.value = '';
                                            };
                                            return (
                                                <TD key={field}>
                                                    {url ? (
                                                        <div className="relative group flex justify-center">
                                                            <a href={url} target="_blank" rel="noreferrer" title={`ดูรูป${label}`}>
                                                                <img src={url} alt={label} className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:scale-110 transition-transform cursor-zoom-in" />
                                                            </a>
                                                            <label htmlFor={inputId} className="absolute -top-1 -right-1 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="เปลี่ยนรูป">
                                                                ✎
                                                                <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-0.5 text-slate-300 hover:text-pink-500 transition-colors" title={`อัปโหลดรูป${label}`}>
                                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                                            <span className="text-[9px]">{label}</span>
                                                            <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                                        </label>
                                                    )}
                                                </TD>
                                            );
                                        })}

                                        {/* กล่องปฐมพยาบาล */}
                                        <TD>
                                            {driver.firstAidBoxPhoto ? (
                                                <div className="relative group flex justify-center">
                                                    <a href={driver.firstAidBoxPhoto} target="_blank" rel="noreferrer" title="ดูรูปกล่องปฐมพยาบาล">
                                                        <img src={driver.firstAidBoxPhoto} alt="กล่องปฐมพยาบาล" className="w-10 h-10 object-cover rounded-lg mx-auto border border-slate-200 hover:scale-110 transition-transform cursor-zoom-in" />
                                                    </a>
                                                    <label htmlFor={`photo-${driver.id}-firstaid`} className="absolute -top-1 -right-1 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="เปลี่ยนรูป">
                                                        ✎
                                                        <input id={`photo-${driver.id}-firstaid`} type="file" accept="image/*" className="hidden" onChange={async e => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const path = `truck-maintenance/driver/${driver.id}/${Date.now()}_firstAidBox.webp`;
                                                            const url = await uploadToNAS(file, path);
                                                            if (url) await updateDriver(driver.id, { firstAidBoxPhoto: url }, 'รูปกล่องปฐมพยาบาล:');
                                                            e.target.value = '';
                                                        }} />
                                                    </label>
                                                </div>
                                            ) : (
                                                <label htmlFor={`photo-${driver.id}-firstaid`} className="cursor-pointer flex flex-col items-center gap-0.5 text-slate-300 hover:text-blue-400 transition-colors" title="อัปโหลดรูปกล่องปฐมพยาบาล">
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                                    <span className="text-[9px]">ปฐมพยาบาล</span>
                                                    <input id={`photo-${driver.id}-firstaid`} type="file" accept="image/*" className="hidden" onChange={async e => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const path = `truck-maintenance/driver/${driver.id}/${Date.now()}_firstAidBox.webp`;
                                                        const url = await uploadToNAS(file, path);
                                                        if (url) await updateDriver(driver.id, { firstAidBoxPhoto: url }, 'รูปกล่องปฐมพยาบาล:');
                                                        e.target.value = '';
                                                    }} />
                                                </label>
                                            )}
                                        </TD>

                                        {/* ไฟฉาย */}
                                        <TD>
                                            {driver.flashlightPhoto ? (
                                                <div className="relative group flex justify-center">
                                                    <a href={driver.flashlightPhoto} target="_blank" rel="noreferrer" title="ดูรูปไฟฉาย">
                                                        <img src={driver.flashlightPhoto} alt="ไฟฉาย" className="w-10 h-10 object-cover rounded-lg mx-auto border border-slate-200 hover:scale-110 transition-transform cursor-zoom-in" />
                                                    </a>
                                                    <label htmlFor={`photo-${driver.id}-flashlight`} className="absolute -top-1 -right-1 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="เปลี่ยนรูป">
                                                        ✎
                                                        <input id={`photo-${driver.id}-flashlight`} type="file" accept="image/*" className="hidden" onChange={async e => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const path = `truck-maintenance/driver/${driver.id}/${Date.now()}_flashlight.webp`;
                                                            const url = await uploadToNAS(file, path);
                                                            if (url) await updateDriver(driver.id, { flashlightPhoto: url }, 'รูปไฟฉาย:');
                                                            e.target.value = '';
                                                        }} />
                                                    </label>
                                                </div>
                                            ) : (
                                                <label htmlFor={`photo-${driver.id}-flashlight`} className="cursor-pointer flex flex-col items-center gap-0.5 text-slate-300 hover:text-yellow-400 transition-colors" title="อัปโหลดรูปไฟฉาย">
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                                    <span className="text-[9px]">ไฟฉาย</span>
                                                    <input id={`photo-${driver.id}-flashlight`} type="file" accept="image/*" className="hidden" onChange={async e => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const path = `truck-maintenance/driver/${driver.id}/${Date.now()}_flashlight.webp`;
                                                        const url = await uploadToNAS(file, path);
                                                        if (url) await updateDriver(driver.id, { flashlightPhoto: url }, 'รูปไฟฉาย:');
                                                        e.target.value = '';
                                                    }} />
                                                </label>
                                            )}
                                        </TD>

                                        {/* Defensive Driving — แสดงอัตโนมัติจาก defensiveRecords ทุก session ในแถวเดียว */}
                                        {(() => {
                                            const dd = driver.defensiveDriving;
                                            const { status, date, days } = computeDefensiveStatus(driver);
                                            return (
                                                <>
                                                    {/* Plan — แสดงชื่อทุก session ซ้อนกัน */}
                                                    <TD className="relative">
                                                        {isNewEmployee(driver) && (
                                                            <div className="absolute -top-1 -left-1 z-10">
                                                                <span className="bg-emerald-500 text-white text-[8px] px-1 rounded shadow-sm font-bold uppercase tracking-tighter">NEW</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-1">
                                                            {defensiveRecords.length > 0 ? defensiveRecords.map((r, ri) => (
                                                                <span key={ri} className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded leading-tight">
                                                                    {r.topicName || 'Defensive Driving'}
                                                                </span>
                                                            )) : (
                                                                <span className="text-slate-300 text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </TD>
                                                    {/* ได้รับอบรม 120 วัน */}
                                                    <TD className="space-y-1">
                                                        <div>{statusChip(status, days, date)}</div>
                                                        {status !== 'completed' && date && <div className="text-[10px] text-slate-400">กำหนด: {fmtDate(date)}</div>}
                                                    </TD>
                                                    {/* Booking Date — อัตโนมัติจาก trainingRecords.bookingDate */}
                                                    <TD className={defensiveRecords.some(r => r.bookingDate) ? 'bg-cyan-50/60' : ''}>
                                                        {defensiveRecords.some(r => r.bookingDate) ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => (
                                                                    r.bookingDate ? (
                                                                        <span key={ri} className="text-xs font-semibold text-cyan-700 block">{fmtDate(r.bookingDate)}</span>
                                                                    ) : (
                                                                        <span key={ri} className="text-slate-300 text-xs block">-</span>
                                                                    )
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <EditCell
                                                                value={dd?.bookingDate || ''}
                                                                onSave={v => updateNested(driver.id, 'defensiveDriving', { bookingDate: v })}
                                                                type="date"
                                                                placeholder="-"
                                                            />
                                                        )}
                                                    </TD>
                                                    {/* วันเริ่มอบรม — แสดงทุก session ซ้อนกัน */}
                                                    <TD className={defensiveRecords.length > 0 ? 'bg-cyan-50' : ''}>
                                                        {defensiveRecords.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => (
                                                                    <span key={ri} className="text-xs font-semibold text-cyan-700 block">{fmtDate(r.actualDate)}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <EditCell value={dd?.startDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { startDate: v })} type="date" placeholder="-" />
                                                        )}
                                                    </TD>
                                                    {/* วันสิ้นสุด */}
                                                    <TD>
                                                        <EditCell value={dd?.endDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { endDate: v })} type="date" placeholder="-" />
                                                    </TD>
                                                    {/* Pre Test — แสดงทุก session */}
                                                    <TD className={defensiveRecords.some(r => r.preTest !== undefined) ? 'bg-cyan-50' : ''}>
                                                        {defensiveRecords.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => (
                                                                    <span key={ri} className="text-xs font-bold text-cyan-700 block">{r.preTest !== undefined ? r.preTest : '-'}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <EditCell value={dd?.preTest !== undefined ? String(dd.preTest) : ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { preTest: Number(v) })} type="number" placeholder="-" />
                                                        )}
                                                    </TD>
                                                    {/* Post Test — แสดงทุก session */}
                                                    <TD className={defensiveRecords.some(r => r.postTest !== undefined) ? 'bg-cyan-50' : ''}>
                                                        {defensiveRecords.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => (
                                                                    <span key={ri} className="text-xs font-bold text-cyan-700 block">{r.postTest !== undefined ? r.postTest : '-'}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <EditCell value={dd?.postTest !== undefined ? String(dd.postTest) : ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { postTest: Number(v) })} type="number" placeholder="-" />
                                                        )}
                                                    </TD>
                                                    {/* Trainer — แสดงทุก session */}
                                                    <TD className={defensiveRecords.some(r => r.trainer) ? 'bg-cyan-50' : ''}>
                                                        {defensiveRecords.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => (
                                                                    <span key={ri} className="text-xs text-cyan-700 block">{r.trainer || '-'}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <EditCell value={dd?.trainer || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { trainer: v })} placeholder="-" />
                                                        )}
                                                    </TD>
                                                    {/* Next Refresh — แสดงทุก session */}
                                                    <TD className={defensiveRecords.length > 0 ? 'bg-amber-50' : ''}>
                                                        {defensiveRecords.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {defensiveRecords.map((r, ri) => {
                                                                    const nr = r.actualDate ? (() => { const d = new Date(r.actualDate); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; })() : dd?.nextRefreshDate;
                                                                    return <span key={ri} className="text-xs font-semibold text-amber-700 block">{fmtDate(nr)}</span>;
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <EditCell value={dd?.nextRefreshDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { nextRefreshDate: v })} type="date" placeholder="-" />
                                                        )}
                                                    </TD>
                                                    {/* Record — แสดง evidencePhotos จาก trainingRecords */}
                                                    <TD>
                                                        {(() => {
                                                            const photos = defensiveRecords.flatMap(r => r.evidencePhotos ?? []).filter(Boolean);
                                                            return photos.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 justify-center">
                                                                    {photos.map((url, pi) => {
                                                                        const isPdf = url.toLowerCase().includes('.pdf');
                                                                        return isPdf ? (
                                                                            <a key={pi} href={url} target="_blank" rel="noreferrer"
                                                                                className="flex items-center gap-1 px-1.5 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 hover:bg-red-100">
                                                                                📄
                                                                            </a>
                                                                        ) : (
                                                                            <a key={pi} href={url} target="_blank" rel="noreferrer" title={`หลักฐาน ${pi + 1}`}>
                                                                                <img src={url} alt="" className="w-10 h-10 object-cover rounded border border-slate-200 hover:scale-110 transition-transform" />
                                                                            </a>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-slate-300 text-xs">-</span>
                                                                    <label className="cursor-pointer px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded text-[10px] border border-slate-200 transition-colors">
                                                                        📷
                                                                        <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={async e => {
                                                                            const files = Array.from(e.target.files ?? []);
                                                                            if (!files.length) return;
                                                                            const urls: string[] = [];
                                                                            for (const file of files) {
                                                                                const path = `truck-maintenance/driver/${driver.id}/dd_evidence/${Date.now()}_${file.name}`;
                                                                                const url = await uploadToNAS(file, path);
                                                                                if (url) urls.push(url);
                                                                            }
                                                                            if (urls.length) {
                                                                                await updateNested(driver.id, 'defensiveDriving', { evidencePhotos: [...(dd?.evidencePhotos ?? []), ...urls] });
                                                                            }
                                                                            e.target.value = '';
                                                                        }} />
                                                                    </label>
                                                                </div>
                                                            );
                                                        })()}
                                                    </TD>
                                                </>
                                            );
                                        })()}

                                        {/* Safety Training History — จาก trainingRecords ที่ sync มาจาก SafetyPlan */}
                                        {(() => {
                                            const currentYear = new Date().getFullYear();
                                            const records = (driver.trainingRecords ?? []).filter(r => r.year === currentYear);
                                            const THAI_M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
                                            const fmtShort = (d: string) => { const dt = new Date(d); return isNaN(dt.getTime()) ? d : `${dt.getDate()} ${THAI_M[dt.getMonth()]}`; };
                                            return (
                                                <>
                                                    <TD>
                                                        {records.length > 0 ? (
                                                            <div className="flex flex-col gap-1 py-0.5">
                                                                {records.map((r, i) => (
                                                                    <div key={i} className="flex items-center gap-1">
                                                                        <span className="inline-block px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded text-[9px] font-semibold leading-tight max-w-[140px] truncate" title={r.topicName}>
                                                                            {r.topicName}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 shrink-0">{fmtShort(r.actualDate)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">-</span>
                                                        )}
                                                    </TD>
                                                    <TD>
                                                        {records.length > 0 ? (
                                                            <div className="text-center">
                                                                <span className="inline-block px-2 py-0.5 bg-teal-600 text-white rounded-full text-xs font-bold">
                                                                    {records.length}
                                                                </span>
                                                                <div className="text-[9px] text-slate-400 mt-0.5">หัวข้อ</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">0</span>
                                                        )}
                                                    </TD>
                                                </>
                                            );
                                        })()}

                                        {/* Incab Coaching — linked to IncabAssessment */}
                                        {(() => {
                                            const latest = incabAssessments
                                                .filter(a => a.driverId === driver.id)
                                                .sort((a, b) => b.date.localeCompare(a.date))[0];
                                            const nextDate = latest?.nextTestDate;
                                            const daysToNext = nextDate ? Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86400000) : null;
                                            const nearDue = daysToNext !== null && daysToNext <= 30;
                                            const overDue = daysToNext !== null && daysToNext < 0;
                                            return (
                                                <>
                                                    <TD>
                                                        {latest ? (
                                                            <div className="text-center">
                                                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${latest.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {latest.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5 font-bold">{latest.totalScore}/100</div>
                                                                {onOpenIncab && (
                                                                    <button onClick={() => onOpenIncab(driver)}
                                                                        className="mt-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded text-[9px] transition-colors">
                                                                        ดูฟอร์ม
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <span className="text-slate-300 text-xs">-</span>
                                                                {onOpenIncab && (
                                                                    <div>
                                                                        <button onClick={() => onOpenIncab(driver)}
                                                                            className="mt-0.5 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] transition-colors">
                                                                            + บันทึก
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TD>
                                                    <TD>
                                                        {latest?.date ? (
                                                            <span className="text-xs text-slate-600">
                                                                {new Date(latest.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                            </span>
                                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                                    </TD>
                                                </>
                                            );
                                        })()}

                                        {/* Certificate */}
                                        <TD>
                                            <EditCell value={driver.certificate?.certificateNo || ''} onSave={v => updateNested(driver.id, 'certificate', { certificateNo: v })} placeholder="Certificate No." />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.certificate?.issuedDate || ''} onSave={v => updateNested(driver.id, 'certificate', { issuedDate: v })} type="date" placeholder="-" />
                                        </TD>

                                        {/* Actions */}
                                        <TD className="sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.06)] z-10">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => onEditDriver?.(driver)}
                                                    title="แก้ไขข้อมูลพนักงาน"
                                                    aria-label="แก้ไข"
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    แก้ไข
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDriver(driver)}
                                                    title="ลบพนักงาน"
                                                    aria-label="ลบ"
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    ลบ
                                                </button>
                                            </div>
                                        </TD>
                                    </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="p-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> ใกล้หมดอายุ (≤30 วัน)</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> พักงาน / หมดอายุแล้ว</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span> ผ่านการตรวจ</div>
                    <div className="flex items-center gap-1.5">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">แก้ไขได้</span>
                        คลิกช่องข้อมูลเพื่อแก้ไขทันที (บันทึกอัตโนมัติ)
                    </div>
                </div>
            </div>

            {/* Criminal Check Upload Modal — rendered via portal to bypass overflow:auto stacking context */}
            {criminalModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex justify-center items-center p-4" onClick={resetCriminalModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">ผลตรวจอาชญากรรม — {criminalModal.driver.name}</h3>
                                <p className="text-sm text-emerald-600 font-medium mt-0.5">ผล: {criminalModal.pendingResult}</p>
                            </div>
                            <button onClick={resetCriminalModal} aria-label="ปิด" title="ปิด"
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {/* Step Indicator */}
                        <div className="px-5 pt-4 flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 text-sm font-bold ${criminalStep === 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${criminalStep === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>1</span>
                                แนบหลักฐาน
                            </div>
                            <div className={`flex-1 h-0.5 rounded ${criminalStep === 2 ? 'bg-blue-400' : 'bg-slate-200'}`} />
                            <div className={`flex items-center gap-1.5 text-sm font-bold ${criminalStep === 2 ? 'text-blue-700' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${criminalStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
                                คดีที่พบ
                            </div>
                        </div>

                        {/* Step 1: Upload files */}
                        {criminalStep === 1 && (
                            <div className="p-5 space-y-4">
                                <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-emerald-700">หลักฐานการตรวจ <span className="text-red-500">*</span></h4>
                                            <p className="text-xs text-red-500 mt-0.5">บังคับแนบอย่างน้อย 1 ไฟล์ก่อนดำเนินการต่อ</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isCriminalUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                ถ่ายรูป
                                                <input type="file" accept="image/*" capture="environment" disabled={isCriminalUploading} onChange={handleCriminalFileUpload} className="hidden" />
                                            </label>
                                            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isCriminalUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                                                {isCriminalUploading ? (
                                                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>อัปโหลด...</>
                                                ) : (
                                                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>แนบไฟล์</>
                                                )}
                                                <input type="file" accept="image/*,.pdf,image/heic,image/heif" multiple disabled={isCriminalUploading} onChange={handleCriminalFileUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">รองรับ: รูปภาพ (JPG, PNG, HEIC) และ PDF — อัปโหลดไปยัง NAS</p>
                                    {criminalFiles.length === 0 ? (
                                        <div className="text-center py-4 text-emerald-400">
                                            <svg className="w-8 h-8 mx-auto mb-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <p className="text-sm">ยังไม่มีไฟล์ — กรุณาแนบหลักฐาน</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {criminalFiles.map((url, i) => {
                                                const isPdf = url.toLowerCase().includes('.pdf');
                                                return isPdf ? (
                                                    <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white border border-red-200 rounded-lg shadow-sm">
                                                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" /></svg>
                                                        <span className="text-xs text-gray-600 max-w-[80px] truncate">PDF {i + 1}</span>
                                                        <button onClick={() => setCriminalFiles(prev => prev.filter((_, idx) => idx !== i))} aria-label="ลบไฟล์" title="ลบไฟล์" className="text-red-400 hover:text-red-600 ml-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        <button onClick={() => setCriminalFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                            aria-label="ลบรูป" title="ลบรูป"
                                                            className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl flex items-center justify-center">
                                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* Existing files */}
                                {(criminalModal.driver.criminalCheck?.files || []).length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">ไฟล์ที่แนบไว้แล้ว ({criminalModal.driver.criminalCheck!.files!.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {criminalModal.driver.criminalCheck!.files!.map((url, i) => {
                                                const isPdf = url.toLowerCase().includes('.pdf');
                                                return isPdf ? (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600 hover:bg-red-100">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" /></svg>
                                                        PDF {i + 1}
                                                    </a>
                                                ) : (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={`รูปภาพ ${i + 1}`}
                                                        className="block w-10 h-10 rounded overflow-hidden border border-gray-200 hover:opacity-80">
                                                        <img src={url} alt={`รูปภาพ ${i + 1}`} className="w-full h-full object-cover" />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Criminal found/not found */}
                        {criminalStep === 2 && (
                            <div className="p-5 space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <h4 className="font-bold text-blue-800 mb-3">คดีที่พบ (Remark) <span className="text-red-500">*</span></h4>
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            onClick={() => { setCriminalRemarkFound('ไม่พบ'); setCriminalRemarkText(''); }}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${criminalRemarkFound === 'ไม่พบ'
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.02]'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                                                }`}
                                        >
                                            <span className="block text-lg">✅</span>
                                            ไม่พบคดี
                                        </button>
                                        <button
                                            onClick={() => setCriminalRemarkFound('พบ')}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${criminalRemarkFound === 'พบ'
                                                ? 'bg-red-600 border-red-600 text-white shadow-md scale-[1.02]'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-700'
                                                }`}
                                        >
                                            <span className="block text-lg">⚠️</span>
                                            พบคดี
                                        </button>
                                    </div>
                                    {criminalRemarkFound === 'พบ' && (
                                        <div>
                                            <label className="block text-sm font-bold text-red-700 mb-1.5">
                                                ระบุรายละเอียดคดีที่พบ <span className="text-red-500">*</span>
                                                <span className="text-xs font-normal text-slate-500 ml-1">(บังคับกรอก)</span>
                                            </label>
                                            <textarea
                                                value={criminalRemarkText}
                                                onChange={e => setCriminalRemarkText(e.target.value)}
                                                placeholder="ระบุประเภทคดี, เลขคดี, วันที่คดี หรือรายละเอียดที่เกี่ยวข้อง..."
                                                rows={3}
                                                aria-label="รายละเอียดคดี"
                                                className={`w-full px-3 py-2 border-2 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 ${!criminalRemarkText.trim() ? 'border-red-400 bg-red-50' : 'border-emerald-400 bg-white'
                                                    }`}
                                            />
                                            {!criminalRemarkText.trim() && (
                                                <p className="text-xs text-red-500 mt-1">❗ กรุณาระบุรายละเอียดคดีที่พบ</p>
                                            )}
                                        </div>
                                    )}
                                    {!criminalRemarkFound && (
                                        <p className="text-xs text-amber-600 font-medium">❗ กรุณาเลือกสถานะคดีที่พบ</p>
                                    )}
                                </div>
                                {/* Summary */}
                                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                                    <span className="font-semibold">สรุป:</span> {criminalModal.pendingResult}
                                    {criminalFiles.length > 0 && <span className="ml-2 text-emerald-600">• {criminalFiles.length} ไฟล์หลักฐาน</span>}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="p-5 border-t flex justify-between gap-3 bg-gray-50 rounded-b-2xl">
                            <button onClick={resetCriminalModal}
                                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                                ยกเลิก
                            </button>
                            <div className="flex gap-2">
                                {criminalStep === 2 && (
                                    <button onClick={() => setCriminalStep(1)}
                                        className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        ย้อนกลับ
                                    </button>
                                )}
                                {criminalStep === 1 && (
                                    <button
                                        onClick={() => setCriminalStep(2)}
                                        disabled={criminalFiles.length === 0 || isCriminalUploading}
                                        title={criminalFiles.length === 0 ? 'กรุณาแนบหลักฐานก่อน' : ''}
                                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-1.5 transition-colors ${criminalFiles.length === 0 || isCriminalUploading
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        ถัดไป: ระบุคดี
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                )}
                                {criminalStep === 2 && (
                                    <button
                                        onClick={handleConfirmCriminal}
                                        disabled={!criminalRemarkFound || (criminalRemarkFound === 'พบ' && !criminalRemarkText.trim())}
                                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${!criminalRemarkFound || (criminalRemarkFound === 'พบ' && !criminalRemarkText.trim())
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                    >
                                        ยืนยันบันทึก
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {trainingModalDriver && createPortal(
                <Training120Modal
                    driver={trainingModalDriver}
                    onSave={patch => handleSaveTraining120(trainingModalDriver.id, patch)}
                    onClose={() => setTrainingModalDriver(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default DriverMatrix;
