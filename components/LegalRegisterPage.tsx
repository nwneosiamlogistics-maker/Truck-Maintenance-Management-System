import React, { useState, useMemo } from 'react';
import { Scale, Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, Database, X, Save } from 'lucide-react';
import type { LegalItem, LegalStatus } from '../types';
import { useLegalRegister } from '../hooks/useLegalRegister';
import { useToast } from '../context/ToastContext';
import { confirmAction } from '../utils';

// ──────────────────────────────────────────
// Config
// ──────────────────────────────────────────
const STATUS_CONFIG: Record<LegalStatus, { label: string; bg: string; text: string; dot: string }> = {
    compliant:       { label: 'ปฏิบัติแล้ว',        bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'in-progress':   { label: 'กำลังดำเนินการ',      bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-400' },
    'non-compliant': { label: 'ยังไม่ปฏิบัติ',       bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'    },
    'n-a':           { label: 'ไม่เกี่ยวข้อง',       bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'  },
};

const SECTIONS = [
    { id: 1 as const, title: 'กฎหมายด้านการขนส่งทางบก',            short: 'ขนส่งทางบก',    color: 'blue'    },
    { id: 2 as const, title: 'ความปลอดภัยในการทำงาน (Safety)',       short: 'Safety',        color: 'emerald' },
    { id: 3 as const, title: 'อัคคีภัยและเหตุฉุกเฉิน',               short: 'อัคคีภัย',     color: 'orange'  },
    { id: 4 as const, title: 'สิ่งแวดล้อมและการจัดการของเสีย',       short: 'สิ่งแวดล้อม',  color: 'teal'    },
    { id: 5 as const, title: 'คลังสินค้าและอาคาร',                    short: 'คลังสินค้า',   color: 'purple'  },
    { id: 6 as const, title: 'ข้อมูลส่วนบุคคล (PDPA)',               short: 'PDPA',          color: 'indigo'  },
    { id: 7 as const, title: 'เอกสารควบคุมและการติดตาม',             short: 'เอกสาร',        color: 'slate'   },
];

// ──────────────────────────────────────────
// Seed data (used only when DB is empty)
// ──────────────────────────────────────────
const makeSeedData = (): LegalItem[] => {
    const now = new Date().toISOString();
    const rows: Omit<LegalItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
        { section: 1, order: '1.1', name: 'พ.ร.บ.การขนส่งทางบก พ.ศ. 2522', description: 'กำหนดการขอใบอนุญาตประกอบการขนส่ง, ประเภทรถ, ผู้ขับขี่', guidelines: 'จัดทำใบอนุญาตขนส่ง, ต่ออายุทะเบียนรถ, ตรวจสภาพรถ', evidence: 'ใบอนุญาตประกอบการ, ทะเบียนรถ, ใบตรวจสภาพ', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 1, order: '1.2', name: 'พ.ร.บ.รถยนต์ พ.ศ. 2522', description: 'การจดทะเบียนรถ, ภาษี, พ.ร.บ.', guidelines: 'ต่อภาษีประจำปี, ตรวจสภาพรถ', evidence: 'ภาษีรถ, พ.ร.บ., เอกสารประจำรถ', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 1, order: '1.3', name: 'พ.ร.บ.จราจรทางบก พ.ศ. 2522', description: 'ความเร็ว, น้ำหนัก, ความปลอดภัย', guidelines: 'ควบคุมความเร็ว, GPS, อบรมคนขับ', evidence: 'GPS Report, บันทึกอบรม', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
        { section: 1, order: '1.4', name: 'กฎหมายควบคุมน้ำหนักบรรทุก', description: 'ห้ามบรรทุกเกินน้ำหนัก, ความปลอดภัยถนน', guidelines: 'ชั่งน้ำหนักก่อนวิ่ง, ตรวจโหลดสินค้า', evidence: 'ใบชั่งน้ำหนัก, Checklist โหลด', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 1, order: '1.5', name: 'กฎหมายสินค้าอันตราย', description: 'ควบคุมการขนส่งวัตถุอันตราย', guidelines: 'แยกพื้นที่เก็บ, SDS, อบรม', evidence: 'SDS, บันทึกอบรม', status: 'n-a', responsible: '', reviewDate: '', notes: '' },
        { section: 2, order: '2.1', name: 'พ.ร.บ.ความปลอดภัย อาชีวอนามัยฯ พ.ศ. 2554', description: 'นายจ้างต้องจัดสภาพแวดล้อมปลอดภัย', guidelines: 'ประเมินความเสี่ยง, PPE', evidence: 'JSA, Risk Assessment', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
        { section: 2, order: '2.2', name: 'กฎกระทรวงยกของ / Forklift', description: 'ควบคุมการยก, รถยก, อุบัติเหตุ', guidelines: 'อบรมรถยก, ตรวจสภาพ', evidence: 'ใบอบรม, ใบตรวจรถยก', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 2, order: '2.3', name: 'กฎกระทรวงความร้อน แสง เสียง พ.ศ. 2559', description: 'มาตรฐานแสงสว่าง / เสียง', guidelines: 'ตรวจวัดแสง / เสียง', evidence: 'รายงานตรวจวัด', status: 'non-compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 2, order: '2.4', name: 'กฎหมายแรงงาน / ชั่วโมงทำงาน', description: 'ชั่วโมงทำงาน, OT, พัก', guidelines: 'ควบคุมเวลาคนขับ / พนักงาน', evidence: 'Time attendance', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 3, order: '3.1', name: 'กฎกระทรวงป้องกันและระงับอัคคีภัย พ.ศ. 2555', description: 'ถังดับเพลิง, แผนหนีไฟ, ซ้อมดับเพลิง', guidelines: 'ติดตั้งถัง, ตรวจถัง, ซ้อมประจำปี', evidence: 'Checklist ถัง, รูปถ่าย, รายงานซ้อม', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 3, order: '3.2', name: 'ประกาศรายงานซ้อมดับเพลิง', description: 'รายงานผ่านระบบ', guidelines: 'ส่งแผนและรายงาน', evidence: 'หลักฐานส่งกรมแรงงาน', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 4, order: '4.1', name: 'พ.ร.บ.การสาธารณสุข', description: 'การจัดการขยะ / น้ำเสีย', guidelines: 'แยกขยะ, จุดพักขยะ', evidence: 'รูปถ่าย, บันทึกขยะ', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 4, order: '4.2', name: 'กฎกระทรวงสุขลักษณะการจัดการมูลฝอย', description: 'จุดพักขยะถูกสุขลักษณะ', guidelines: 'ทำพื้นที่พักขยะ', evidence: 'รูปถ่าย / แบบตรวจ', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
        { section: 4, order: '4.3', name: 'กฎหมายท้องถิ่น / เทศบัญญัติ', description: 'ควบคุมทิ้งขยะ / น้ำเสีย', guidelines: 'ปฏิบัติตามเทศบาล', evidence: 'เอกสาร อบต./เทศบาล', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 4, order: '4.4', name: 'กฎหมายควบคุมน้ำมัน / สารเคมี', description: 'น้ำมันรั่วไหล / ของเสียอันตราย', guidelines: 'ถาดรองน้ำมัน / Spill Kit', evidence: 'Checklist / รูป', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 5, order: '5.1', name: 'พ.ร.บ.ควบคุมอาคาร', description: 'ความปลอดภัยโครงสร้าง', guidelines: 'ตรวจอาคาร / ทางหนีไฟ', evidence: 'รายงานตรวจ', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 5, order: '5.2', name: 'กฎหมายไฟฟ้า / เครื่องจักร', description: 'ความปลอดภัยระบบไฟ', guidelines: 'PM ระบบไฟ / DB', evidence: 'PM Report', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
        { section: 5, order: '5.3', name: 'มาตรฐานคลังสินค้า', description: 'ชั้นวาง / ทางเดิน / Forklift', guidelines: '5ส / Layout / ทางหนีไฟ', evidence: 'Audit 5ส', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 6, order: '6.1', name: 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562', description: 'คุ้มครองข้อมูลลูกค้า / พนักงาน', guidelines: 'นโยบาย PDPA, จำกัดสิทธิ์เข้าถึง', evidence: 'Privacy Policy, Log', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
        { section: 6, order: '6.2', name: 'CCTV / GPS / POD', description: 'ใช้ข้อมูลอย่างเหมาะสม', guidelines: 'ติดป้ายแจ้ง, จำกัดสิทธิ์', evidence: 'ป้ายแจ้ง / Log', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 7, order: '7.1', name: 'ทะเบียนรถ / ภาษี / พ.ร.บ.', description: 'เอกสารประจำรถครบถ้วน', guidelines: 'ต่ออายุตามกำหนด', evidence: 'สำเนาเอกสาร', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 7, order: '7.2', name: 'ใบอนุญาตประกอบการขนส่ง', description: 'ใบอนุญาตจากกรมการขนส่ง', guidelines: 'ต่ออายุก่อนหมดอายุ', evidence: 'ใบอนุญาต', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 7, order: '7.3', name: 'ใบขับขี่คนขับ / ประวัติอบรม', description: 'ใบขับขี่ตามประเภทรถ', guidelines: 'ตรวจสอบรายปี', evidence: 'สำเนาใบขับขี่, บันทึกอบรม', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 7, order: '7.4', name: 'แผน PM รถ / Forklift', description: 'ซ่อมบำรุงตามวาระ', guidelines: 'ทำตาม PM Schedule', evidence: 'PM Report', status: 'compliant', responsible: '', reviewDate: '', notes: '' },
        { section: 7, order: '7.5', name: 'แผนซ้อมอัคคีภัย / PDPA Policy', description: 'เอกสารควบคุมสำคัญ', guidelines: 'ทบทวนประจำปี', evidence: 'เอกสารที่ลงนาม', status: 'in-progress', responsible: '', reviewDate: '', notes: '' },
    ];
    return rows.map((r, i) => ({ ...r, id: `seed-${i}-${Date.now()}`, createdAt: now, updatedAt: now }));
};

// ──────────────────────────────────────────
// StatusBadge
// ──────────────────────────────────────────
const StatusBadge: React.FC<{ status: LegalStatus }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} border-transparent`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

// ──────────────────────────────────────────
// Add/Edit Modal
// ──────────────────────────────────────────
interface ModalProps {
    item: Partial<LegalItem> | null;
    onClose: () => void;
    onSave: (item: LegalItem) => void;
}

const EMPTY_FORM = (): Partial<LegalItem> => ({
    section: 1, order: '', name: '', description: '', guidelines: '', evidence: '',
    status: 'compliant', responsible: '', reviewDate: '', notes: '',
});

const AddEditModal: React.FC<ModalProps> = ({ item, onClose, onSave }) => {
    const [form, setForm] = useState<Partial<LegalItem>>(item ? { ...item } : EMPTY_FORM());
    const set = (k: keyof LegalItem, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = () => {
        if (!form.name?.trim()) { alert('กรุณากรอกชื่อกฎหมาย'); return; }
        if (!form.order?.trim()) { alert('กรุณากรอกลำดับ'); return; }
        const now = new Date().toISOString();
        onSave({
            id: form.id ?? `lr-${Date.now()}`,
            section: form.section ?? 1,
            order: form.order ?? '',
            name: form.name ?? '',
            description: form.description ?? '',
            guidelines: form.guidelines ?? '',
            evidence: form.evidence ?? '',
            status: form.status ?? 'compliant',
            responsible: form.responsible ?? '',
            reviewDate: form.reviewDate ?? '',
            notes: form.notes ?? '',
            createdAt: form.createdAt ?? now,
            updatedAt: now,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 bg-slate-800 rounded-t-2xl flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">{form.id && !form.id.startsWith('seed') ? '✏️ แก้ไขรายการ' : '➕ เพิ่มรายการใหม่'}</h2>
                    <button onClick={onClose} title="ปิด" aria-label="ปิด" className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">หมวด *</label>
                            <select value={form.section} onChange={e => set('section', Number(e.target.value) as LegalItem['section'])}
                                title="หมวด" aria-label="หมวด"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                                {SECTIONS.map(s => <option key={s.id} value={s.id}>หมวด {s.id} — {s.short}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">ลำดับ *</label>
                            <input value={form.order ?? ''} onChange={e => set('order', e.target.value)}
                                placeholder="เช่น 1.1, 2.3"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อกฎหมาย / ข้อกำหนด *</label>
                        <input value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                            title="ชื่อกฎหมาย / ข้อกำหนด" placeholder="ชื่อกฎหมาย / ข้อกำหนด"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">สาระสำคัญของกฎหมาย</label>
                        <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2}
                            title="สาระสำคัญของกฎหมาย" placeholder="ระบุสาระสำคัญ..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">แนวทางปฏิบัติ</label>
                        <textarea value={form.guidelines ?? ''} onChange={e => set('guidelines', e.target.value)} rows={2}
                            title="แนวทางปฏิบัติ" placeholder="ระบุแนวทางปฏิบัติ..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">หลักฐานการปฏิบัติ</label>
                        <input value={form.evidence ?? ''} onChange={e => set('evidence', e.target.value)}
                            title="หลักฐานการปฏิบัติ" placeholder="เช่น รายงานตรวจ, บันทึกอบรม"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">สถานะ</label>
                            <select value={form.status} onChange={e => set('status', e.target.value as LegalStatus)}
                                title="สถานะ" aria-label="สถานะ"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                {(Object.entries(STATUS_CONFIG) as [LegalStatus, any][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่ทบทวนครั้งถัดไป</label>
                            <input type="date" value={form.reviewDate ?? ''} onChange={e => set('reviewDate', e.target.value)}
                                title="วันที่ทบทวนครั้งถัดไป" aria-label="วันที่ทบทวนครั้งถัดไป"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">ผู้รับผิดชอบ</label>
                        <input value={form.responsible ?? ''} onChange={e => set('responsible', e.target.value)}
                            title="ผู้รับผิดชอบ" placeholder="ชื่อผู้รับผิดชอบ"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">หมายเหตุ</label>
                        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
                            title="หมายเหตุ" placeholder="หมายเหตุเพิ่มเติม..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors flex items-center gap-2">
                        <Save size={15} /> บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
const SECTION_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
type SectionFilter = 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function LegalRegisterPage() {
    const { items, addItem, updateItem, deleteItem, seedItems } = useLegalRegister();
    const { addToast } = useToast();
    const [activeSection, setActiveSection] = useState<SectionFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<LegalStatus | 'all'>('all');
    const [modalData, setModalData] = useState<Partial<LegalItem> | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let list = [...items].sort((a, b) => a.order.localeCompare(b.order));
        if (activeSection !== 'all') list = list.filter(i => i.section === activeSection);
        if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i => i.name.toLowerCase().includes(q) || i.order.includes(q) || (i.responsible ?? '').toLowerCase().includes(q));
        }
        return list;
    }, [items, activeSection, statusFilter, searchQuery]);

    const stats = useMemo(() => ({
        total: items.length,
        compliant: items.filter(i => i.status === 'compliant').length,
        inProgress: items.filter(i => i.status === 'in-progress').length,
        nonCompliant: items.filter(i => i.status === 'non-compliant').length,
    }), [items]);

    const handleSave = (item: LegalItem) => {
        if (items.find(i => i.id === item.id)) { updateItem(item); addToast('อัปเดตรายการสำเร็จ', 'success'); }
        else { addItem(item); addToast('เพิ่มรายการสำเร็จ', 'success'); }
        setModalData(null);
    };

    const handleDelete = async (item: LegalItem) => {
        const ok = await confirmAction('ยืนยันการลบ', `ลบ "${item.order} ${item.name}" ?`);
        if (ok) { deleteItem(item.id); addToast('ลบรายการแล้ว', 'success'); }
    };

    const handleSeed = async () => {
        const ok = await confirmAction('โหลดข้อมูลเริ่มต้น', 'โหลดข้อมูลตัวอย่าง 25 รายการ? (จะแทนที่ข้อมูลเดิมทั้งหมด)');
        if (ok) { seedItems(makeSeedData()); addToast('โหลดข้อมูลสำเร็จ', 'success'); }
    };

    const sectionInfo = SECTIONS.find(s => s.id === activeSection);

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Scale className="text-blue-600" size={26} /> ทะเบียนกฎหมายและข้อกำหนด
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">ธุรกิจขนส่งและคลังสินค้า — ติดตามสถานะการปฏิบัติตามกฎหมาย</p>
                </div>
                <div className="flex gap-2">
                    {items.length === 0 && (
                        <button onClick={handleSeed}
                            className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-xl shadow flex items-center gap-2 transition-colors">
                            <Database size={15} /> โหลดข้อมูลเริ่มต้น
                        </button>
                    )}
                    <button onClick={() => setModalData(EMPTY_FORM())}
                        className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow flex items-center gap-2 transition-colors">
                        <Plus size={15} /> เพิ่มรายการ
                    </button>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'ทั้งหมด', value: stats.total, color: 'bg-slate-700', text: 'text-white' },
                    { label: 'ปฏิบัติแล้ว', value: stats.compliant, color: 'bg-emerald-500', text: 'text-white' },
                    { label: 'กำลังดำเนินการ', value: stats.inProgress, color: 'bg-yellow-400', text: 'text-yellow-900' },
                    { label: 'ยังไม่ปฏิบัติ', value: stats.nonCompliant, color: 'bg-red-500', text: 'text-white' },
                ].map(c => (
                    <div key={c.label} className={`${c.color} ${c.text} rounded-2xl px-5 py-4 shadow-lg`}>
                        <div className="text-3xl font-black">{c.value}</div>
                        <div className="text-sm font-semibold opacity-90 mt-0.5">{c.label}</div>
                        {c.label !== 'ทั้งหมด' && stats.total > 0 && (
                            <div className="text-xs opacity-75 mt-0.5">{Math.round(c.value / stats.total * 100)}%</div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Section Tabs ── */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveSection('all')}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${activeSection === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                    ภาพรวมทั้งหมด
                </button>
                {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${activeSection === s.id ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                        หมวด {s.id} — {s.short}
                    </button>
                ))}
            </div>

            {/* ── Section Title (when filtered) ── */}
            {activeSection !== 'all' && sectionInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
                    <h2 className="text-blue-800 font-bold text-base">หมวด {sectionInfo.id}: {sectionInfo.title}</h2>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อกฎหมาย..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                    title="กรองตามสถานะ" aria-label="กรองตามสถานะ"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">สถานะ: ทั้งหมด</option>
                    {(Object.entries(STATUS_CONFIG) as [LegalStatus, any][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {/* ── Table ── */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                    <Scale size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-semibold text-lg">ยังไม่มีข้อมูล</p>
                    {items.length === 0 && (
                        <button onClick={handleSeed} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                            <Database size={16} /> โหลดข้อมูลเริ่มต้น 25 รายการ
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-16">ลำดับ</th>
                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">ชื่อกฎหมาย / ข้อกำหนด</th>
                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-40">แนวทางปฏิบัติ</th>
                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-36">หลักฐาน</th>
                                    <th className="px-4 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider w-36">สถานะ</th>
                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-28">ผู้รับผิดชอบ</th>
                                    <th className="px-4 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider w-20">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(item => {
                                    const isExpanded = expandedId === item.id;
                                    const isFail = item.status === 'non-compliant';
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className={`hover:bg-slate-50 transition-colors ${isFail ? 'bg-red-50/50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{item.order}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                        className="text-left group flex items-start gap-1.5 w-full">
                                                        <span className="font-semibold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors text-sm">{item.name}</span>
                                                        {isExpanded ? <ChevronUp size={14} className="text-slate-400 mt-0.5 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 mt-0.5 shrink-0" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">{item.guidelines}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{item.evidence}</td>
                                                <td className="px-4 py-3 text-center"><StatusBadge status={item.status} /></td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{item.responsible || <span className="text-slate-300">—</span>}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setModalData({ ...item })}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-blue-50/40">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">สาระสำคัญ</p>
                                                                <p className="text-slate-700 leading-relaxed">{item.description || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">วันที่ทบทวนถัดไป</p>
                                                                <p className="text-slate-700">{item.reviewDate ? new Date(item.reviewDate).toLocaleDateString('th-TH') : '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">หมายเหตุ</p>
                                                                <p className="text-slate-700 leading-relaxed">{item.notes || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                        <span>แสดง {filtered.length} รายการ {filtered.length !== items.length ? `(กรองจาก ${items.length})` : ''}</span>
                        <span>อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}</span>
                    </div>
                </div>
            )}

            {/* ── Modal ── */}
            {modalData !== null && (
                <AddEditModal item={modalData} onClose={() => setModalData(null)} onSave={handleSave} />
            )}
        </div>
    );
}
