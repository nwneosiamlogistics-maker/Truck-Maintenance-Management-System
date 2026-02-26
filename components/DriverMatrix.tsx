import React, { useState, useMemo, useRef } from 'react';
import type { Driver, DrivingIncident, Vehicle } from '../types';
import { useToast } from '../context/ToastContext';

interface DriverMatrixProps {
    drivers: Driver[];
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    vehicles: Vehicle[];
    incidents: DrivingIncident[];
}

// ---- helpers ----
const daysBetween = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
};

const ExpiryBadge: React.FC<{ dateStr?: string }> = ({ dateStr }) => {
    if (!dateStr) return <span className="text-slate-300">-</span>;
    const days = daysBetween(dateStr);
    if (days === null) return <span className="text-slate-400 text-xs">{dateStr}</span>;
    if (days < 0) return <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">หมดแล้ว</span>;
    if (days <= 30) return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">{formatDate(dateStr)} ({days}ว.)</span>;
    return <span className="text-slate-600 text-xs whitespace-nowrap">{formatDate(dateStr)}</span>;
};

const CriminalBadge: React.FC<{ result?: string }> = ({ result }) => {
    if (!result) return <span className="text-slate-300">-</span>;
    const color = result === 'ผ่าน' ? 'bg-emerald-100 text-emerald-700' : result === 'ไม่ผ่าน' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    return <span className={`${color} text-xs font-bold px-1.5 py-0.5 rounded-full`}>{result}</span>;
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
                className={`w-full px-1 py-0.5 border border-blue-400 rounded text-xs outline-none bg-blue-50 min-w-[80px] ${className}`}
            />
        );
    }
    return (
        <span
            onClick={handleClick}
            title="คลิกเพื่อแก้ไข"
            className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors text-xs whitespace-nowrap ${!value ? 'text-slate-300' : 'text-slate-700'} ${className}`}
        >
            {value || placeholder}
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
                className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs outline-none bg-blue-50"
            >
                <option value="">- เลือก -</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    }
    const label = options.find(o => o.value === value)?.label || value;
    return (
        <span onClick={() => setEditing(true)} title="คลิกเพื่อแก้ไข"
            className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors text-xs whitespace-nowrap ${!value ? 'text-slate-300' : ''}`}>
            {label || '-'}
        </span>
    );
};

const TH: React.FC<{ children: React.ReactNode; sub?: string; className?: string; rowSpan?: number; colSpan?: number }> = ({ children, sub, className = '', rowSpan, colSpan }) => (
    <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 px-2 py-1.5 text-center text-[10px] font-bold text-slate-700 bg-slate-100 whitespace-nowrap ${className}`}>
        <div>{children}</div>
        {sub && <div className="text-[9px] font-normal text-slate-500 mt-0.5">{sub}</div>}
    </th>
);

const TD: React.FC<{ children: React.ReactNode; className?: string; highlight?: boolean }> = ({ children, className = '', highlight }) => (
    <td className={`border border-slate-200 px-1.5 py-1 text-xs text-center align-middle ${highlight ? 'bg-amber-50' : ''} ${className}`}>
        {children}
    </td>
);

// ---- main component ----
const DriverMatrix: React.FC<DriverMatrixProps> = ({ drivers, setDrivers, vehicles, incidents }) => {
    const { addToast } = useToast();
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const updateDriver = (id: string, patch: Partial<Driver>) => {
        setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
        addToast('บันทึกข้อมูลสำเร็จ', 'success');
    };

    const updateNested = <K extends keyof Driver>(id: string, key: K, patch: Partial<NonNullable<Driver[K]>>) => {
        setDrivers(prev => prev.map(d => {
            if (d.id !== id) return d;
            const existing = (d[key] as any) || {};
            return { ...d, [key]: { ...existing, ...patch }, updatedAt: new Date().toISOString() };
        }));
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
                    <table className="w-full border-collapse text-xs min-w-[2800px]">
                        <thead>
                            {/* Group header row 1 */}
                            <tr className="bg-slate-700 text-white">
                                <TH rowSpan={3} className="bg-slate-700 text-white w-8">ลำดับ<br/><span className="text-[9px] font-normal">Item</span></TH>
                                <TH colSpan={9} className="bg-blue-700 text-white">ข้อมูลพนักงานขับรถ</TH>
                                <TH colSpan={4} className="bg-emerald-700 text-white">อบรมความปลอดภัย<br/><span className="text-[9px] font-normal">Safety Induction</span></TH>
                                <TH colSpan={3} className="bg-red-700 text-white">ประวัติอุบัติเหตุล่าสุด<br/><span className="text-[9px] font-normal">Accident Record</span></TH>
                                <TH colSpan={5} className="bg-purple-700 text-white">ใบขับขี่<br/><span className="text-[9px] font-normal">Driving License</span></TH>
                                <TH colSpan={5} className="bg-orange-700 text-white">ตรวจสารเสพติด<br/><span className="text-[9px] font-normal">Drug Test</span></TH>
                                <TH colSpan={2} className="bg-teal-700 text-white">GPS / กล้อง</TH>
                                <TH colSpan={8} className="bg-indigo-700 text-white">ข้อมูลรถที่รับผิดชอบ</TH>
                                <TH colSpan={6} className="bg-pink-700 text-white">รูปภาพรถ / อุปกรณ์</TH>
                                <TH colSpan={10} className="bg-cyan-700 text-white">Defensive Driving Program & Refresh Training</TH>
                                <TH colSpan={2} className="bg-violet-700 text-white">Incab Coaching</TH>
                                <TH colSpan={2} className="bg-rose-700 text-white">Certificate</TH>
                            </tr>
                            {/* Group header row 2 */}
                            <tr className="bg-slate-100">
                                {/* Employee Info */}
                                <TH rowSpan={2} className="min-w-[70px]">รหัส<br/><span className="text-[9px]">Employee ID</span></TH>
                                <TH rowSpan={2} className="min-w-[110px]">หมายเลขบัตรประชาชน<br/><span className="text-[9px]">ID Number</span></TH>
                                <TH rowSpan={2} className="min-w-[120px]">ชื่อพนักงาน<br/><span className="text-[9px]">Name</span></TH>
                                <TH rowSpan={2} className="min-w-[90px]">วันเริ่มงาน<br/><span className="text-[9px]">Started date</span></TH>
                                <TH rowSpan={2} className="min-w-[60px]">รูป พขร.<br/><span className="text-[9px]">Picture</span></TH>
                                <TH rowSpan={2} className="min-w-[70px]">ผลตรวจ<br/>อาชญากรรม</TH>
                                <TH rowSpan={2} className="min-w-[100px]">คดีที่พบ<br/><span className="text-[9px]">Remark</span></TH>
                                <TH rowSpan={2} className="min-w-[90px]">วัน/เดือน/ปีเกิด<br/><span className="text-[9px]">Date of Birth</span></TH>
                                <TH rowSpan={2} className="min-w-[90px]">เบอร์โทร<br/><span className="text-[9px]">Telephone</span></TH>
                                {/* Safety Induction Q1-Q4 */}
                                <TH rowSpan={2}>Q1</TH>
                                <TH rowSpan={2}>Q2</TH>
                                <TH rowSpan={2}>Q3</TH>
                                <TH rowSpan={2}>Q4</TH>
                                {/* Accident */}
                                <TH rowSpan={2} className="min-w-[90px]">วันที่เกิดเหตุ</TH>
                                <TH rowSpan={2} className="min-w-[100px]">สาเหตุ</TH>
                                <TH rowSpan={2} className="min-w-[90px]">ไซต์งาน</TH>
                                {/* License */}
                                <TH rowSpan={2} className="min-w-[100px]">หมายเลขใบขับขี่</TH>
                                <TH rowSpan={2} className="min-w-[60px]">ประเภท</TH>
                                <TH rowSpan={2} className="min-w-[80px]">วันอนุญาต</TH>
                                <TH rowSpan={2} className="min-w-[90px]">วันหมดอายุ</TH>
                                <TH rowSpan={2} className="min-w-[80px]">กำหนดต่อ<br/><span className="text-[9px]">Lead time</span></TH>
                                {/* Drug Test */}
                                <TH rowSpan={2} className="min-w-[60px]">สูตร<br/><span className="text-[9px]">Formula</span></TH>
                                <TH rowSpan={2}>Q1</TH>
                                <TH rowSpan={2}>Q2</TH>
                                <TH rowSpan={2}>Q3</TH>
                                <TH rowSpan={2}>Q4</TH>
                                {/* GPS */}
                                <TH rowSpan={2} className="min-w-[100px]">GPS Provider</TH>
                                <TH rowSpan={2} className="min-w-[100px]">Facing Camera</TH>
                                {/* Vehicle */}
                                <TH rowSpan={2} className="min-w-[80px]">ประเภทรถ</TH>
                                <TH rowSpan={2} className="min-w-[80px]">ทะเบียน</TH>
                                <TH rowSpan={2} className="min-w-[70px]">ยี่ห้อ</TH>
                                <TH rowSpan={2} className="min-w-[90px]">วันหมดอายุภาษี</TH>
                                <TH rowSpan={2} className="min-w-[70px]">จังหวัด</TH>
                                <TH rowSpan={2} className="min-w-[60px]">เชื้อเพลิง</TH>
                                <TH rowSpan={2} className="min-w-[60px]">วันหมดอายุ<br/>ประกัน</TH>
                                <TH rowSpan={2} className="min-w-[60px]">วันหมดอายุ<br/>พรบ.</TH>
                                {/* Photos */}
                                <TH rowSpan={2} className="min-w-[60px]">รูปหน้ารถ<br/>+อุปกรณ์<br/><span className="text-[9px]">Front</span></TH>
                                <TH rowSpan={2} className="min-w-[60px]">คาดเข็มขัด<br/><span className="text-[9px]">Safety Belt</span></TH>
                                <TH rowSpan={2} className="min-w-[50px]">ซ้าย<br/><span className="text-[9px]">Left</span></TH>
                                <TH rowSpan={2} className="min-w-[50px]">ขวา<br/><span className="text-[9px]">Right</span></TH>
                                <TH rowSpan={2} className="min-w-[50px]">หลัง<br/><span className="text-[9px]">Back</span></TH>
                                <TH rowSpan={2} className="min-w-[60px]">แต่งกาย<br/><span className="text-[9px]">Appearance</span></TH>
                                {/* Defensive Driving */}
                                <TH rowSpan={2} className="min-w-[60px]">Plan</TH>
                                <TH rowSpan={2} className="min-w-[80px]">ได้รับอบรม<br/>ภายใน 120 วัน</TH>
                                <TH rowSpan={2} className="min-w-[90px]">Booking Date</TH>
                                <TH rowSpan={2} className="min-w-[90px]">วันเริ่มอบรม<br/><span className="text-[9px]">Start</span></TH>
                                <TH rowSpan={2} className="min-w-[90px]">วันสิ้นสุด<br/><span className="text-[9px]">Finished</span></TH>
                                <TH rowSpan={2} className="min-w-[60px]">Pre Test</TH>
                                <TH rowSpan={2} className="min-w-[60px]">Post Test</TH>
                                <TH rowSpan={2} className="min-w-[80px]">Trainer</TH>
                                <TH rowSpan={2} className="min-w-[90px]">Next Training<br/><span className="text-[9px]">Refresh</span></TH>
                                <TH rowSpan={2} className="min-w-[80px]">Record<br/>2022</TH>
                                {/* Incab */}
                                <TH rowSpan={2} className="min-w-[60px]">Score</TH>
                                <TH rowSpan={2} className="min-w-[80px]">Date</TH>
                                {/* Certificate */}
                                <TH rowSpan={2} className="min-w-[100px]">Certificate No.</TH>
                                <TH rowSpan={2} className="min-w-[80px]">Issued Date</TH>
                            </tr>
                            <tr className="bg-slate-50">
                                {/* Intentionally empty — rowSpan covers all */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={60} className="text-center text-slate-400 py-12 text-sm">
                                        ไม่พบข้อมูลพนักงานขับรถ
                                    </td>
                                </tr>
                            ) : filteredDrivers.map((driver, idx) => {
                                const vehicle = vehicles.find(v =>
                                    v.licensePlate === driver.primaryVehicle ||
                                    driver.assignedVehicles.includes(v.id)
                                );

                                // Latest accident
                                const driverIncidents = incidents
                                    .filter(i => i.driverId === driver.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                const latestIncident = driverIncidents[0];

                                // License expiry days
                                const licExpDays = driver.licenseExpiry ? daysBetween(driver.licenseExpiry) : null;

                                // 120-day deadline from hireDate
                                const hireDate = driver.hireDate ? new Date(driver.hireDate) : null;
                                const deadline120 = hireDate ? new Date(hireDate.getTime() + 120 * 86400000) : null;
                                const deadline120Str = deadline120 ? deadline120.toISOString().split('T')[0] : undefined;

                                const rowBg = driver.status === 'terminated' ? 'bg-slate-50 opacity-60' :
                                    driver.status === 'suspended' ? 'bg-red-50' :
                                    driver.status === 'on_leave' ? 'bg-amber-50' : '';

                                const photoUrl = driver.photos?.[0];

                                return (
                                    <tr key={driver.id} className={`hover:bg-blue-50/30 transition-colors ${rowBg}`}>
                                        {/* ลำดับ */}
                                        <TD className="font-bold text-slate-500 w-8">{idx + 1}</TD>

                                        {/* รหัสพนักงาน */}
                                        <TD className="font-mono font-bold text-blue-700">{driver.employeeId}</TD>

                                        {/* บัตรประชาชน */}
                                        <TD>
                                            <EditCell
                                                value={driver.idCard || ''}
                                                onSave={v => updateDriver(driver.id, { idCard: v })}
                                                placeholder="กรอกเลขบัตร"
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
                                        <TD><span className="text-xs whitespace-nowrap">{formatDate(driver.hireDate)}</span></TD>

                                        {/* รูป พขร. */}
                                        <TD>
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={driver.name} className="w-10 h-10 object-cover rounded-lg mx-auto border border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg mx-auto flex items-center justify-center text-slate-300 text-lg">👤</div>
                                            )}
                                        </TD>

                                        {/* ผลตรวจอาชญากรรม */}
                                        <TD>
                                            <SelectCell
                                                value={driver.criminalCheck?.result || ''}
                                                options={[
                                                    { value: 'ผ่าน', label: 'ผ่าน' },
                                                    { value: 'ไม่ผ่าน', label: 'ไม่ผ่าน' },
                                                    { value: 'รอผล', label: 'รอผล' },
                                                ]}
                                                onSave={v => updateNested(driver.id, 'criminalCheck', { result: v as any })}
                                            />
                                            <CriminalBadge result={driver.criminalCheck?.result} />
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

                                        {/* Safety Induction Q1-Q4 */}
                                        {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                                            <TD key={q}>
                                                <EditCell
                                                    value={driver.safetyInduction?.[q] || ''}
                                                    onSave={v => updateNested(driver.id, 'safetyInduction', { [q]: v })}
                                                    type="date"
                                                    placeholder="-"
                                                />
                                            </TD>
                                        ))}

                                        {/* อุบัติเหตุล่าสุด */}
                                        <TD>
                                            {latestIncident ? (
                                                <span className="text-xs text-red-600 whitespace-nowrap">{formatDate(latestIncident.date)}</span>
                                            ) : <span className="text-emerald-500 text-xs">ไม่มี</span>}
                                        </TD>
                                        <TD className="text-left">
                                            <span className="text-xs text-slate-600 line-clamp-2">{latestIncident?.description || '-'}</span>
                                        </TD>
                                        <TD>
                                            <span className="text-xs text-slate-500">{latestIncident?.location || '-'}</span>
                                        </TD>

                                        {/* ใบขับขี่ */}
                                        <TD className="font-mono text-xs">{driver.licenseNumber || '-'}</TD>
                                        <TD>
                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{driver.licenseClass || '-'}</span>
                                        </TD>
                                        <TD><span className="text-xs whitespace-nowrap">{formatDate(driver.licenseIssueDate)}</span></TD>
                                        <TD highlight={licExpDays !== null && licExpDays <= 30}>
                                            <ExpiryBadge dateStr={driver.licenseExpiry} />
                                        </TD>
                                        <TD highlight={licExpDays !== null && licExpDays <= 30}>
                                            {licExpDays !== null ? (
                                                <span className={`text-xs font-bold ${licExpDays < 0 ? 'text-red-600' : licExpDays <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                                    {licExpDays < 0 ? `เกิน ${Math.abs(licExpDays)} วัน` : `${licExpDays} วัน`}
                                                </span>
                                            ) : '-'}
                                        </TD>

                                        {/* ตรวจสารเสพติด */}
                                        <TD>
                                            <EditCell
                                                value={driver.drugTests?.formula || ''}
                                                onSave={v => updateNested(driver.id, 'drugTests', { formula: v })}
                                                placeholder="สูตร"
                                            />
                                        </TD>
                                        {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                                            <TD key={`drug-${q}`}>
                                                <EditCell
                                                    value={driver.drugTests?.[q] || ''}
                                                    onSave={v => updateNested(driver.id, 'drugTests', { [q]: v })}
                                                    type="date"
                                                    placeholder="-"
                                                />
                                            </TD>
                                        ))}

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

                                        {/* ข้อมูลรถ — เชื่อมจาก vehicles */}
                                        <TD><span className="text-xs">{vehicle?.vehicleType || '-'}</span></TD>
                                        <TD>
                                            <span className="font-mono text-xs font-bold text-blue-700">{vehicle?.licensePlate || driver.primaryVehicle || '-'}</span>
                                        </TD>
                                        <TD><span className="text-xs">{vehicle?.make || '-'}</span></TD>
                                        <TD>
                                            {vehicle?.insuranceExpiryDate ? (
                                                <ExpiryBadge dateStr={vehicle.insuranceExpiryDate} />
                                            ) : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            <EditCell
                                                value={(driver as any).vehicleProvince || ''}
                                                onSave={v => updateDriver(driver.id, { notes: (driver.notes || '') })}
                                                placeholder="จังหวัด"
                                            />
                                        </TD>
                                        <TD>
                                            <EditCell
                                                value={(driver as any).vehicleFuel || ''}
                                                onSave={v => updateDriver(driver.id, { notes: (driver.notes || '') })}
                                                placeholder="เชื้อเพลิง"
                                            />
                                        </TD>
                                        <TD>
                                            {vehicle?.insuranceExpiryDate ? (
                                                <ExpiryBadge dateStr={vehicle.insuranceExpiryDate} />
                                            ) : <span className="text-slate-300">-</span>}
                                        </TD>
                                        <TD>
                                            {vehicle?.actExpiryDate ? (
                                                <ExpiryBadge dateStr={vehicle.actExpiryDate} />
                                            ) : <span className="text-slate-300">-</span>}
                                        </TD>

                                        {/* รูปภาพรถ */}
                                        {(['vehicleFrontPhoto', 'safetyBeltPhoto', 'vehicleLeftPhoto', 'vehicleRightPhoto', 'vehicleBackPhoto'] as const).map(field => (
                                            <TD key={field}>
                                                {driver[field] ? (
                                                    <a href={driver[field] as string} target="_blank" rel="noreferrer">
                                                        <img src={driver[field] as string} alt={field} className="w-10 h-10 object-cover rounded-lg mx-auto border border-slate-200 hover:scale-105 transition-transform" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-200 text-lg">📷</span>
                                                )}
                                            </TD>
                                        ))}

                                        {/* แต่งกาย */}
                                        <TD>
                                            <button
                                                onClick={() => updateDriver(driver.id, { driverAppearanceOk: !driver.driverAppearanceOk })}
                                                className={`text-lg transition-transform hover:scale-110 ${driver.driverAppearanceOk ? 'opacity-100' : 'opacity-30'}`}
                                                title="คลิกเพื่อสลับ"
                                            >
                                                {driver.driverAppearanceOk ? '✅' : '⬜'}
                                            </button>
                                        </TD>

                                        {/* Defensive Driving */}
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.plan || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { plan: v })} placeholder="-" />
                                        </TD>
                                        <TD highlight={!!(deadline120Str && daysBetween(deadline120Str) !== null && (daysBetween(deadline120Str) ?? 0) <= 14)}>
                                            <ExpiryBadge dateStr={deadline120Str} />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.bookingDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { bookingDate: v })} type="date" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.startDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { startDate: v })} type="date" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.endDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { endDate: v })} type="date" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.preTest !== undefined ? String(driver.defensiveDriving.preTest) : ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { preTest: Number(v) })} type="number" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.postTest !== undefined ? String(driver.defensiveDriving.postTest) : ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { postTest: Number(v) })} type="number" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.trainer || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { trainer: v })} placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.nextRefreshDate || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { nextRefreshDate: v })} type="date" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.defensiveDriving?.record2022 || ''} onSave={v => updateNested(driver.id, 'defensiveDriving', { record2022: v })} placeholder="-" />
                                        </TD>

                                        {/* Incab Coaching */}
                                        <TD>
                                            <EditCell value={driver.incabCoaching?.score !== undefined ? String(driver.incabCoaching.score) : ''} onSave={v => updateNested(driver.id, 'incabCoaching', { score: Number(v) })} type="number" placeholder="-" />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.incabCoaching?.date || ''} onSave={v => updateNested(driver.id, 'incabCoaching', { date: v })} type="date" placeholder="-" />
                                        </TD>

                                        {/* Certificate */}
                                        <TD>
                                            <EditCell value={driver.certificate?.certificateNo || ''} onSave={v => updateNested(driver.id, 'certificate', { certificateNo: v })} placeholder="Certificate No." />
                                        </TD>
                                        <TD>
                                            <EditCell value={driver.certificate?.issuedDate || ''} onSave={v => updateNested(driver.id, 'certificate', { issuedDate: v })} type="date" placeholder="-" />
                                        </TD>
                                    </tr>
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
        </div>
    );
};

export default DriverMatrix;
