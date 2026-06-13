import React, { useState, useMemo } from 'react';
import type { Repair, Technician } from '../types';
import { calculateDurationHours, formatCurrency } from '../utils';
import {
    Scale, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
    PackageCheck, ShieldAlert, ExternalLink
} from 'lucide-react';

interface MaintenanceDecisionHubProps {
    repairs: Repair[];
    technicians?: Technician[];
}

// --- ตัวจำแนกระบบจากคีย์เวิร์ด (เหมือนรายงานซ่อมซ้ำ) ---
const SYSTEM_KEYWORDS: { system: string, keywords: string[] }[] = [
    { system: '🛑 ระบบเบรก', keywords: ['เบรค', 'เบรก', 'ดิสเบรก', 'ดรัมเบรก', 'ลูกสูบเบรก'] },
    { system: '🔧 เครื่องยนต์', keywords: ['เครื่องยนต์', 'น้ำมันเครื่อง', 'เทอร์โบ', 'หม้อน้ำ', 'สตาร์ทไม่ติด', 'ปะเก็น', 'ลูกสูบ', 'วาล์ว', 'ปั๊มน้ำ', 'สายพาน', 'กรองอากาศ', 'กรองโซล่า', 'หัวฉีด', 'แคร้ง'] },
    { system: '🔩 ช่วงล่าง', keywords: ['ช่วงล่าง', 'โช้ค', 'โช๊ค', 'แหนบ', 'ลูกหมาก', 'บุชยาง', 'คันชัก', 'ปีกนก', 'ยูโบลท์', 'คานหน้า'] },
    { system: '⚡ ระบบไฟฟ้า', keywords: ['แบตเตอรี่', 'แบต', 'ไดชาร์จ', 'ไดสตาร์ท', 'สายไฟ', 'ไฟหน้า', 'ไฟท้าย', 'ไฟเลี้ยว', 'ฟิวส์', 'รีเลย์', 'หลอดไฟ'] },
    { system: '⚙️ ระบบส่งกำลัง', keywords: ['เกียร์', 'คลัตช์', 'คลัช', 'ครัช', 'เพลา', 'เฟืองท้าย', 'pto', 'ลูกปืน'] },
    { system: '🛞 ยาง/ล้อ', keywords: ['ยาง', 'ลมยาง', 'ปะยาง', 'สลับยาง', 'กระทะล้อ', 'ดุมล้อ'] },
    { system: '❄️ ระบบแอร์', keywords: ['แอร์', 'น้ำยาแอร์', 'คอมแอร์', 'คอมเพรสเซอร์', 'คอนเดนเซอร์', 'ตู้แอร์', 'r134'] },
    { system: '🚛 หางลาก/ตัวถัง', keywords: ['หาง', 'คิงพิน', 'ขาช้าง', 'ตัวถัง', 'ประตู', 'ผ้าใบ', 'กระบะ', 'คอก', 'เพลาหาง'] },
];

// ระดับความเสี่ยง "รถเสียกลางทาง" ของแต่ละระบบ
const SYSTEM_RISK: Record<string, 'สูง' | 'กลาง' | 'ต่ำ'> = {
    '🛑 ระบบเบรก': 'สูง',
    '🔧 เครื่องยนต์': 'สูง',
    '🔩 ช่วงล่าง': 'สูง',
    '⚙️ ระบบส่งกำลัง': 'สูง',
    '🛞 ยาง/ล้อ': 'สูง',
    '⚡ ระบบไฟฟ้า': 'กลาง',
    '❄️ ระบบแอร์': 'ต่ำ',
    '🚛 หางลาก/ตัวถัง': 'ต่ำ',
    '🔧 อื่นๆ/ทั่วไป': 'กลาง',
};

type FlagKey = 'red' | 'yellow' | 'purple' | 'green';
const FLAG_CONFIG: Record<FlagKey, { label: string, badge: string, dot: string, ring: string }> = {
    red: { label: 'เปลี่ยนยกชุดด่วน', badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', ring: 'from-red-500 to-rose-600' },
    yellow: { label: 'เฝ้าระวัง / พิจารณายกชุด', badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', ring: 'from-amber-500 to-orange-600' },
    purple: { label: 'ส่งซ่อมนอก', badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', ring: 'from-purple-500 to-fuchsia-600' },
    green: { label: 'ซ่อมเฉพาะชิ้นพอ', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', ring: 'from-emerald-500 to-teal-600' },
};

const isPlannedMaintenance = (r: Repair): boolean => {
    const desc = (r.problemDescription || '').trim();
    return r.reportedBy === 'ระบบแผนซ่อมบำรุง' || desc.startsWith('ซ่อมบำรุงตามแผน');
};
const normalizeProblem = (desc: string): string =>
    (desc || '').replace(/^[\s\-–—•.]+/, '').replace(/\s+/g, ' ').trim();
const isRoutineWork = (desc: string): boolean => {
    const d = normalizeProblem(desc);
    if (!d) return false;
    if (['ตรวจเช็ค', 'ตรวจเชค', 'เช็ค', 'เช็ก', 'เติม'].some(p => d.startsWith(p))) return true;
    return d.includes('เปลี่ยนถ่าย') || d.includes('ถ่ายน้ำมัน');
};
const detectSystems = (r: Repair): string[] => {
    const haystack = [r.repairCategory || '', r.problemDescription || '', ...(r.parts || []).map(p => p.name || '')].join(' ').toLowerCase();
    const found = SYSTEM_KEYWORDS.filter(s => s.keywords.some(k => haystack.includes(k.toLowerCase()))).map(s => s.system);
    return found.length > 0 ? found : ['🔧 อื่นๆ/ทั่วไป'];
};
// งานยาง "สิ้นเปลือง" (เปลี่ยน/ปะ/สลับยาง, ถ่วงล้อ, ตั้งศูนย์) — เป็นการสึกหรอตามปกติ ไม่ใช่ซ่อมไม่จบ
const isConsumableTireWork = (desc: string): boolean => {
    const d = normalizeProblem(desc);
    if (!d) return false;
    if (d.includes('ท่อยาง')) return false; // "ท่อยาง" = ท่อยาง(hose) ไม่ใช่ยางล้อ
    return /เปลี่ยน\s*ยาง|ปะ\s*ยาง|สลับ\s*ยาง|ถ่วงล้อ|ถ่วงยาง|ตั้งศูนย์/.test(d);
};
// ระบบของอะไหล่ 1 ชิ้น (จากชื่อชิ้น)
const detectPartSystem = (name: string): string | null => {
    const h = (name || '').toLowerCase();
    if (h.includes('ท่อยาง')) return null; // ท่อยาง = hose ไม่ใช่ยางล้อ
    const found = SYSTEM_KEYWORDS.find(s => s.keywords.some(k => h.includes(k.toLowerCase())));
    return found ? found.system : null;
};

// แยกต้นทุนของใบซ่อม 1 ใบ → ออกเป็นรายระบบ (ค่าอะไหล่ตามชิ้น + ค่าแรง/VAT แบ่งตามสัดส่วนค่าอะไหล่)
const repairSystemCosts = (r: Repair): Record<string, number> => {
    const laborVat = (Number(r.repairCost) || 0) + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
    const partCostBySys: Record<string, number> = {};
    let totalAssigned = 0, totalAll = 0;
    (r.parts || []).forEach(p => {
        const cost = (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
        totalAll += cost;
        const ps = detectPartSystem(p.name);
        if (ps) { partCostBySys[ps] = (partCostBySys[ps] || 0) + cost; totalAssigned += cost; }
    });
    const unassigned = totalAll - totalAssigned; // อะไหล่ที่แยกระบบไม่ได้
    const descSystems = detectSystems(r);
    const systemsSet = new Set<string>([...Object.keys(partCostBySys), ...descSystems]);
    const result: Record<string, number> = {};
    systemsSet.forEach(s => { result[s] = partCostBySys[s] || 0; });
    if (totalAssigned > 0) {
        // แบ่งค่าแรง+VAT+อะไหล่ที่แยกไม่ได้ ตามสัดส่วนค่าอะไหล่ของแต่ละระบบ
        systemsSet.forEach(s => {
            const ratio = (partCostBySys[s] || 0) / totalAssigned;
            result[s] += (unassigned + laborVat) * ratio;
        });
    } else {
        // ไม่มีอะไหล่ (ค่าแรงล้วน) → แบ่งเท่าๆ กันตามระบบที่อยู่ในใบ
        const n = descSystems.length || 1;
        descSystems.forEach(s => { result[s] = (result[s] || 0) + laborVat / n; });
    }
    return result;
};

// แปลงชั่วโมงเป็น "X วัน Y ชม."
const formatDowntime = (hours: number): string => {
    if (!hours || hours <= 0) return '-';
    const totalMinutes = Math.round(hours * 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const h = Math.floor((totalMinutes % (24 * 60)) / 60);
    const m = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (h > 0) parts.push(`${h} ชม.`);
    if (m > 0 && days === 0) parts.push(`${m} นาที`);
    return parts.length > 0 ? parts.join(' ') : '0 นาที';
};

const MaintenanceDecisionHub: React.FC<MaintenanceDecisionHubProps> = ({ repairs, technicians = [] }) => {
    const [overhaulMultiplier, setOverhaulMultiplier] = useState(3);
    const [windowMonths, setWindowMonths] = useState<'6' | '12' | '24' | 'all'>('12');
    const [flagFilter, setFlagFilter] = useState<'all' | FlagKey>('all');
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const data = useMemo(() => {
        const all = Array.isArray(repairs) ? repairs : [];
        const techMap = new Map<string, string>();
        (Array.isArray(technicians) ? technicians : []).forEach(t => techMap.set(t.id, t.name));
        const getTechNames = (r: Repair): string => {
            const names: string[] = [];
            if (r.assignedTechnicianId && techMap.get(r.assignedTechnicianId)) names.push(techMap.get(r.assignedTechnicianId)!);
            (r.assistantTechnicianIds || []).forEach(id => { const n = techMap.get(id); if (n) names.push(n); });
            if (r.externalTechnicianName) names.push(`${r.externalTechnicianName} (ภายนอก)`);
            return names.length > 0 ? names.join(', ') : 'ไม่ระบุช่าง';
        };

        // ช่วงเวลา
        const now = new Date();
        let startDate: Date | null = null;
        if (windowMonths !== 'all') {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - Number(windowMonths));
        }
        const inWindow = (r: Repair) => {
            if (!startDate || !r.createdAt) return true;
            return new Date(r.createdAt) >= startDate;
        };

        // กรอง: ตัด PM + routine + นอกช่วง
        const valid = all.filter(r => !isPlannedMaintenance(r) && !isRoutineWork(r.problemDescription || '') && inWindow(r));

        // group by (plate + system)
        const groups: Record<string, { plate: string, system: string, repairs: Repair[] }> = {};
        valid.forEach(r => {
            const plate = r.licensePlate || 'ไม่ระบุ';
            detectSystems(r).forEach(system => {
                // ข้ามงานยางสิ้นเปลือง (เปลี่ยน/ปะ/สลับยาง) ในระบบ "ยาง/ล้อ" — แต่ยังเก็บงานดุม/ลูกปืนล้อ
                if (system === '🛞 ยาง/ล้อ' && isConsumableTireWork(r.problemDescription || '')) return;
                const key = `${plate}||${system}`;
                if (!groups[key]) groups[key] = { plate, system, repairs: [] };
                groups[key].repairs.push(r);
            });
        });

        const decide = (count: number, costRatio: number, risk: string, everExternal: boolean): FlagKey => {
            if (count >= 3 && (costRatio >= 0.8 || risk === 'สูง')) return 'red';
            if (everExternal) return 'purple';
            if (count >= 2 && (costRatio >= 0.5 || count >= 3)) return 'yellow';
            return 'green';
        };

        // cache ต้นทุนรายระบบต่อใบ (กันคำนวณซ้ำ)
        const costCache = new Map<string, Record<string, number>>();
        const sysCostOf = (r: Repair, system: string): number => {
            let m = costCache.get(r.id);
            if (!m) { m = repairSystemCosts(r); costCache.set(r.id, m); }
            return m[system] || 0;
        };

        const rows = Object.entries(groups)
            .filter(([, g]) => g.repairs.length >= 2) // เฉพาะที่ซ่อมซ้ำ
            .map(([key, g]) => {
                const reps = [...g.repairs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                const count = reps.length;
                // ต้นทุนเฉพาะระบบนี้ (ไม่รวมงานต่างระบบในใบเดียวกัน เช่น ค่ายาง)
                const cumulativeCost = reps.reduce((s, r) => s + sysCostOf(r, g.system), 0);
                const avgCost = cumulativeCost / count;
                const estimatedOverhaul = avgCost * overhaulMultiplier;
                const costRatio = estimatedOverhaul > 0 ? cumulativeCost / estimatedOverhaul : 0;
                const downtimeHours = reps.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate)
                    .reduce((s, r) => s + calculateDurationHours(r.createdAt, r.repairEndDate ?? null), 0);
                const risk = SYSTEM_RISK[g.system] || 'กลาง';
                const everExternal = reps.some(r => r.dispatchType === 'ภายนอก');

                // เสียถี่ขึ้นไหม (ระยะห่างล่าสุด < ค่าเฉลี่ย)
                let tighter = false;
                if (count >= 3) {
                    const gaps: number[] = [];
                    for (let i = 1; i < reps.length; i++) {
                        gaps.push((new Date(reps[i].createdAt).getTime() - new Date(reps[i - 1].createdAt).getTime()) / (1000 * 3600 * 24));
                    }
                    const avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
                    tighter = gaps[gaps.length - 1] < avgGap * 0.7;
                }

                const flag = decide(count, costRatio, risk, everExternal);
                const techSet = new Set<string>();
                reps.forEach(r => getTechNames(r).split(', ').forEach(n => techSet.add(n)));

                return {
                    key, plate: g.plate, system: g.system, count,
                    cumulativeCost, avgCost, estimatedOverhaul, costRatio,
                    downtimeHours, risk, everExternal, tighter, flag,
                    technicians: Array.from(techSet),
                    items: reps.map(r => ({
                        date: r.repairEndDate || r.createdAt,
                        description: (r.problemDescription || '-').trim(),
                        cost: sysCostOf(r, g.system), // ต้นทุนเฉพาะระบบนี้ของใบนั้น
                        repairOrderNo: r.repairOrderNo || '-',
                        technicians: getTechNames(r),
                        external: r.dispatchType === 'ภายนอก',
                    })),
                };
            })
            .sort((a, b) => {
                const order: FlagKey[] = ['red', 'purple', 'yellow', 'green'];
                const d = order.indexOf(a.flag) - order.indexOf(b.flag);
                return d !== 0 ? d : b.cumulativeCost - a.cumulativeCost;
            });

        const summary = { red: 0, yellow: 0, purple: 0, green: 0 };
        rows.forEach(r => summary[r.flag]++);

        return { rows, summary };
    }, [repairs, technicians, overhaulMultiplier, windowMonths]);

    const filteredRows = flagFilter === 'all' ? data.rows : data.rows.filter(r => r.flag === flagFilter);

    const riskBadge = (risk: string) =>
        risk === 'สูง' ? 'bg-red-50 text-red-600' : risk === 'กลาง' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500';

    return (
        <div className="space-y-6 lg:space-y-10 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-5 lg:p-10 rounded-[3rem] lg:rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-blue-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-2xl lg:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 leading-none">
                        Decision Hub
                    </h2>
                    <p className="text-slate-400 font-black mt-2 lg:mt-4 uppercase tracking-[0.3em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></span>
                        คัดกรองงานซ่อม — ยกชุด / ซ่อมชิ้น / ส่งซ่อมนอก
                    </p>
                </div>
                <div className="relative z-10 mt-5 lg:mt-0 flex flex-wrap items-center justify-center gap-3">
                    {/* ตัวคูณยกชุด */}
                    <div className="bg-white/60 px-4 py-2 rounded-2xl border border-white shadow-inner flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ตัวคูณยกชุด</span>
                        <select value={overhaulMultiplier} onChange={e => setOverhaulMultiplier(Number(e.target.value))} title="ตัวคูณประมาณราคายกชุด" className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer">
                            {[2, 2.5, 3, 3.5, 4, 5].map(m => <option key={m} value={m}>{m}×</option>)}
                        </select>
                    </div>
                    {/* ช่วงเวลา */}
                    <div className="bg-white/60 px-4 py-2 rounded-2xl border border-white shadow-inner flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ช่วง</span>
                        <select value={windowMonths} onChange={e => setWindowMonths(e.target.value as any)} title="ช่วงเวลาที่นับ" className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer">
                            <option value="6">6 เดือน</option>
                            <option value="12">12 เดือน</option>
                            <option value="24">24 เดือน</option>
                            <option value="all">ทั้งหมด</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* การ์ดสรุป + ตัวกรองธง */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                    { flag: 'red' as FlagKey, icon: <ShieldAlert size={110} /> },
                    { flag: 'yellow' as FlagKey, icon: <AlertTriangle size={110} /> },
                    { flag: 'purple' as FlagKey, icon: <ExternalLink size={110} /> },
                    { flag: 'green' as FlagKey, icon: <PackageCheck size={110} /> },
                ]).map(({ flag, icon }) => (
                    <button
                        key={flag}
                        type="button"
                        onClick={() => setFlagFilter(flagFilter === flag ? 'all' : flag)}
                        className={`relative overflow-hidden bg-gradient-to-br ${FLAG_CONFIG[flag].ring} p-5 lg:p-7 rounded-[2.5rem] text-white shadow-2xl text-left transition-all hover:scale-[1.02] ${flagFilter === flag ? 'ring-4 ring-slate-900/20 scale-[1.02]' : ''}`}
                    >
                        <div className="absolute -right-6 -bottom-6 opacity-20">{icon}</div>
                        <div className="relative z-10">
                            <div className="text-3xl lg:text-4xl font-black tabular-nums">{data.summary[flag]}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest mt-2 leading-tight">{FLAG_CONFIG[flag].label}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* คำอธิบายเกณฑ์ */}
            <div className="glass p-4 rounded-2xl border border-white/50 shadow-lg flex items-start gap-3">
                <Sparkles size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    <span className="text-slate-700 font-black">เกณฑ์ตัดสินใจ:</span> ระบบเทียบ "ต้นทุนซ่อมย่อยสะสม" กับ "ราคายกชุดประมาณ" (ค่าเฉลี่ย/ครั้ง × {overhaulMultiplier}×)
                    ร่วมกับจำนวนครั้งที่ซ่อมซ้ำ, Downtime สะสม และความเสี่ยงรถเสียกลางทางของระบบนั้น
                    {flagFilter !== 'all' && <button type="button" onClick={() => setFlagFilter('all')} className="ml-2 text-purple-600 font-black underline">ล้างตัวกรอง</button>}
                </p>
            </div>

            {/* ตารางคำแนะนำ */}
            <div className="glass p-5 lg:p-8 rounded-[2.5rem] border border-white/50 shadow-2xl">
                <h3 className="text-base lg:text-xl font-black text-slate-800 tracking-tighter flex items-center gap-3 mb-6">
                    <div className="w-2 h-7 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full"></div>
                    คำแนะนำการตัดสินใจ ({filteredRows.length} รายการ)
                </h3>

                {filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <Scale size={60} className="mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-[11px]">ไม่พบงานซ่อมซ้ำที่ต้องตัดสินใจ</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="py-4 px-3">ทะเบียน</th>
                                        <th className="py-4 px-3">ระบบ</th>
                                        <th className="py-4 px-3 text-center">ซ้ำ</th>
                                        <th className="py-4 px-3 text-right">ต้นทุนสะสม</th>
                                        <th className="py-4 px-3 text-right">Downtime</th>
                                        <th className="py-4 px-3 text-center">เสี่ยง</th>
                                        <th className="py-4 px-3">คำแนะนำ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredRows.map(r => (
                                        <React.Fragment key={r.key}>
                                            <tr onClick={() => setExpandedKey(expandedKey === r.key ? null : r.key)} className={`cursor-pointer transition-colors ${expandedKey === r.key ? 'bg-purple-50/50' : 'hover:bg-slate-50/50'}`}>
                                                <td className="py-4 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${expandedKey === r.key ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {expandedKey === r.key ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                        </span>
                                                        <span className="font-black text-slate-900 text-sm">{r.plate}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-3 text-xs font-black text-slate-700 whitespace-nowrap">{r.system}</td>
                                                <td className="py-4 px-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-lg bg-slate-100 text-slate-700 font-black text-sm">{r.count}</span>
                                                        {r.tighter && <span title="ระยะห่างการเสียสั้นลง" className="text-[8px] font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">ถี่ขึ้น</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-3 text-right text-xs font-black text-slate-800 tabular-nums">฿{formatCurrency(r.cumulativeCost)}</td>
                                                <td className="py-4 px-3 text-right text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">{formatDowntime(r.downtimeHours)}</td>
                                                <td className="py-4 px-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${riskBadge(r.risk)}`}>{r.risk}</span>
                                                </td>
                                                <td className="py-4 px-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border whitespace-nowrap ${FLAG_CONFIG[r.flag].badge}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${FLAG_CONFIG[r.flag].dot}`}></span>
                                                        {FLAG_CONFIG[r.flag].label}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedKey === r.key && (
                                                <tr>
                                                    <td colSpan={7} className="px-0 py-0 bg-slate-50/60">
                                                        <div className="px-6 py-4 animate-fade-in-up">
                                                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">ประวัติการซ่อมระบบนี้ ({r.count} ครั้ง) · ช่าง: {r.technicians.join(', ')}</div>
                                                            <table className="min-w-full bg-white rounded-xl overflow-hidden border border-slate-200">
                                                                <thead className="bg-slate-100">
                                                                    <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                                        <th className="px-4 py-2.5 text-left">วันที่</th>
                                                                        <th className="px-4 py-2.5 text-left">อาการ</th>
                                                                        <th className="px-4 py-2.5 text-left">ช่าง</th>
                                                                        <th className="px-4 py-2.5 text-left">ใบซ่อม</th>
                                                                        <th className="px-4 py-2.5 text-right">ค่าซ่อม</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {r.items.map((it, ii) => (
                                                                        <tr key={ii} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-2.5 text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(it.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                            <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700">{it.description}{it.external && <span className="ml-1.5 text-[8px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">ส่งนอก</span>}</td>
                                                                            <td className="px-4 py-2.5 text-[10px] font-bold text-slate-500">{it.technicians}</td>
                                                                            <td className="px-4 py-2.5 text-[10px] font-black text-blue-600">{it.repairOrderNo}</td>
                                                                            <td className="px-4 py-2.5 text-right text-[11px] font-black text-slate-800 tabular-nums">฿{formatCurrency(it.cost)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="lg:hidden space-y-3">
                            {filteredRows.map(r => (
                                <div key={r.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <button type="button" onClick={() => setExpandedKey(expandedKey === r.key ? null : r.key)} className="w-full p-4 text-left">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${expandedKey === r.key ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {expandedKey === r.key ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                </span>
                                                <div>
                                                    <div className="font-black text-slate-900 text-sm">{r.plate}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold">{r.system}</div>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${FLAG_CONFIG[r.flag].badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${FLAG_CONFIG[r.flag].dot}`}></span>
                                                {FLAG_CONFIG[r.flag].label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                                            <div className="text-center">
                                                <div className="text-[8px] font-black text-slate-400 uppercase">ซ้ำ</div>
                                                <div className="text-sm font-black text-slate-700">{r.count}</div>
                                                {r.tighter && <div className="text-[7px] font-black text-red-600 bg-red-50 rounded-full px-1 mt-0.5 leading-tight">ถี่ขึ้น</div>}
                                            </div>
                                            <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">ต้นทุนสะสม</div><div className="text-[11px] font-black text-slate-800">฿{formatCurrency(r.cumulativeCost)}</div></div>
                                            <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">Downtime</div><div className="text-[10px] font-black text-slate-600 leading-tight">{formatDowntime(r.downtimeHours)}</div></div>
                                            <div className="text-center"><div className="text-[8px] font-black text-slate-400 uppercase">เสี่ยง</div><div className={`text-[10px] font-black px-1.5 rounded ${riskBadge(r.risk)}`}>{r.risk}</div></div>
                                        </div>
                                    </button>
                                    {expandedKey === r.key && (
                                        <div className="px-3 pb-3 space-y-2 animate-fade-in-up">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ประวัติการซ่อม ({r.count} ครั้ง)</div>
                                            {r.items.map((it, ii) => (
                                                <div key={ii} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-black text-slate-800">{it.description}{it.external && <span className="ml-1 text-[8px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">ส่งนอก</span>}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(it.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })} · {it.repairOrderNo}</div>
                                                            <div className="text-[9px] font-bold text-slate-400">ช่าง: {it.technicians}</div>
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-800 shrink-0">฿{formatCurrency(it.cost)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MaintenanceDecisionHub;
