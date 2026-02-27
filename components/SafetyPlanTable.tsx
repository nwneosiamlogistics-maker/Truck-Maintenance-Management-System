import React, { useState, useMemo } from 'react';
import type { SafetyTopic, TrainingSession, TrainingPlan, Driver } from '../types';
import { useSafetyPlan, generateDefaultTopicsForYear, generatePlansForDriver, computePlanStatus } from '../hooks/useSafetyPlan';
import TrainingSessionModal from './TrainingSessionModal';
import TrainingActualModal from './TrainingActualModal';
import TrainingActualPrintModal from './TrainingActualPrintModal';
import { formatCurrency, confirmAction, showAlert } from '../utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SafetyPlanTableProps {
    drivers: Driver[];
}

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MONTH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const QUARTER_COLORS: Record<number, string> = {
    0: 'bg-blue-50',   // Q1: ม.ค.–มี.ค.
    1: 'bg-blue-50',
    2: 'bg-blue-50',
    3: 'bg-green-50',  // Q2: เม.ย.–มิ.ย.
    4: 'bg-green-50',
    5: 'bg-green-50',
    6: 'bg-amber-50',  // Q3: ก.ค.–ก.ย.
    7: 'bg-amber-50',
    8: 'bg-amber-50',
    9: 'bg-purple-50', // Q4: ต.ค.–ธ.ค.
    10: 'bg-purple-50',
    11: 'bg-purple-50',
};

const TARGET_LABEL: Record<string, string> = {
    all: 'ทุกคน',
    new_employee: 'พนง.ใหม่',
    existing_employee: 'พนง.เดิม',
};

const fmtDateShort = (d?: string) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
};

interface CellStatus {
    status: 'none' | 'planned' | 'booked' | 'done' | 'overdue' | 'partial';
    doneCount: number;
    totalCount: number;
    sessions: TrainingSession[];
    plans: TrainingPlan[];
}

const SafetyPlanTable: React.FC<SafetyPlanTableProps> = ({ drivers }) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const { topics, setTopics, sessions, setSessions, plans, setPlans } = useSafetyPlan(year);

    const [modalTopic, setModalTopic] = useState<SafetyTopic | null>(null);
    const [actualModalTopic, setActualModalTopic] = useState<SafetyTopic | null>(null);
    const [printData, setPrintData] = useState<{ session: TrainingSession; plans: TrainingPlan[]; topic: SafetyTopic } | null>(null);
    const [editTopic, setEditTopic] = useState<SafetyTopic | null>(null);
    const [showAddTopic, setShowAddTopic] = useState(false);
    const [newTopic, setNewTopic] = useState<Partial<SafetyTopic>>({});

    // คำนวณสถานะเซลล์ (topic x month)
    const cellStatus = useMemo(() => {
        const map: Record<string, Record<number, CellStatus>> = {};
        for (const topic of topics) {
            map[topic.id] = {};
            for (let m = 0; m < 12; m++) {
                const monthSessions = sessions.filter(s => {
                    if (s.topicId !== topic.id) return false;
                    const d = new Date(s.startDate);
                    return d.getMonth() === m && d.getFullYear() === year;
                });
                const monthPlans = plans.filter(p => {
                    if (p.topicId !== topic.id) return false;
                    const sess = sessions.find(s => s.id === p.sessionId);
                    if (sess) {
                        const d = new Date(sess.startDate);
                        return d.getMonth() === m && d.getFullYear() === year;
                    }
                    // solo plan: ใช้ actualDate หรือ bookingDate
                    const dateStr = p.actualDate || p.bookingDate;
                    if (dateStr) {
                        const d = new Date(dateStr);
                        return d.getMonth() === m && d.getFullYear() === year;
                    }
                    return false;
                });

                const doneCount = monthPlans.filter(p => p.status === 'done').length;
                const totalCount = monthPlans.length;

                let status: CellStatus['status'] = 'none';
                if (totalCount > 0) {
                    if (doneCount === totalCount) status = 'done';
                    else if (doneCount > 0) status = 'partial';
                    else if (monthPlans.some(p => p.status === 'overdue')) status = 'overdue';
                    else if (monthPlans.some(p => p.status === 'booked')) status = 'booked';
                    else status = 'planned';
                }

                map[topic.id][m] = { status, doneCount, totalCount, sessions: monthSessions, plans: monthPlans };
            }
        }
        return map;
    }, [topics, sessions, plans, year]);

    // compliance per topic
    const topicCompliance = useMemo(() => {
        const map: Record<string, { done: number; total: number }> = {};
        for (const topic of topics) {
            const topicPlans = plans.filter(p => p.topicId === topic.id && p.year === year);
            const doneCount = topicPlans.filter(p => p.status === 'done').length;
            map[topic.id] = { done: doneCount, total: topicPlans.length };
        }
        return map;
    }, [topics, plans, year]);

    const totalBudget = topics.reduce((s, t) => s + (t.budget ?? 0), 0);
    const overallDone = plans.filter(p => p.status === 'done' && p.year === year).length;
    const overallTotal = plans.filter(p => p.year === year).length;
    const compliancePct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

    const handleGeneratePlan = async () => {
        let toAdd: TrainingPlan[] = [];
        for (const driver of drivers) {
            const newPlans = generatePlansForDriver(driver, topics, plans, year);
            toAdd = [...toAdd, ...newPlans];
        }
        if (toAdd.length === 0) {
            await showAlert('ไม่มีแผนใหม่', 'ทุกคนมีแผนครบแล้วสำหรับปีนี้', 'info');
            return;
        }
        const ok = await confirmAction(
            `สร้างแผนทั้งปี ${year + 543}`,
            `จะสร้างแผนใหม่ ${toAdd.length} รายการให้พนักงาน ${drivers.length} คน ยืนยันหรือไม่?`,
            'สร้างแผน'
        );
        if (!ok) return;
        setPlans(prev => [...(Array.isArray(prev) ? prev : []), ...toAdd]);
        await showAlert('สร้างแผนสำเร็จ', `สร้างแผนใหม่ ${toAdd.length} รายการเรียบร้อย`, 'success');
    };

    const handleInitDefaultTopics = async () => {
        const ok = await confirmAction(
            `สร้างหัวข้อเริ่มต้น ปี ${year + 543}`,
            `จะสร้าง Safety Induction Q1–Q4 + Defensive Driving อัตโนมัติ ยืนยันหรือไม่?`,
            'สร้างหัวข้อ'
        );
        if (!ok) return;
        const defaults = generateDefaultTopicsForYear(year);
        setTopics(defaults);
        await showAlert('สร้างหัวข้อสำเร็จ', `สร้าง ${defaults.length} หัวข้อสำหรับปี ${year + 543} เรียบร้อย`, 'success');
    };

    const handleSaveSession = (session: TrainingSession) => {
        setSessions(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            const idx = arr.findIndex(s => s.id === session.id);
            if (idx >= 0) return arr.map((s, i) => i === idx ? session : s);
            return [...arr, session];
        });
    };

    const handleUpdatePlans = (updatedPlans: TrainingPlan[]) => {
        setPlans(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            const map = new Map(arr.map(p => [p.id, p]));
            for (const p of updatedPlans) map.set(p.id, p);
            return Array.from(map.values());
        });
    };

    const handleSaveActual = (session: TrainingSession, updatedPlans: TrainingPlan[]) => {
        handleSaveSession(session);
        handleUpdatePlans(updatedPlans);
        if (actualModalTopic) {
            setPrintData({ session, plans: updatedPlans, topic: actualModalTopic });
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        const topic = topics.find(t => t.id === topicId);
        const ok = await confirmAction(
            'ยืนยันการลบหัวข้อ',
            `ต้องการลบ "${topic?.name ?? 'หัวข้อนี้'}" ใช่หรือไม่? แผนที่เชื่อมกับหัวข้อนี้จะไม่ถูกลบ`,
            'ลบหัวข้อ'
        );
        if (!ok) return;
        setTopics(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== topicId));
    };

    const handleSaveTopic = async () => {
        if (!newTopic.name || !newTopic.windowStart || !newTopic.windowEnd) {
            await showAlert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อหัวข้อ วันเริ่มต้น และวันสิ้นสุดให้ครบถ้วน', 'warning'); return;
        }
        const now = new Date().toISOString();
        const topic: SafetyTopic = {
            id: editTopic?.id ?? `TOPIC-${year}-${Date.now()}`,
            year,
            code: newTopic.code ?? `custom_${Date.now()}`,
            name: newTopic.name ?? '',
            description: newTopic.description,
            target: (newTopic.target as SafetyTopic['target']) ?? 'all',
            inCharge: newTopic.inCharge,
            byLegal: newTopic.byLegal,
            budget: newTopic.budget ? Number(newTopic.budget) : undefined,
            windowStart: newTopic.windowStart ?? '',
            windowEnd: newTopic.windowEnd ?? '',
            isMandatory: newTopic.isMandatory ?? true,
            sortOrder: editTopic?.sortOrder ?? (topics.length + 1),
            remark: newTopic.remark,
            isActive: true,
            createdAt: editTopic?.createdAt ?? now,
        };
        if (editTopic) {
            setTopics(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === editTopic.id ? topic : t));
        } else {
            setTopics(prev => [...(Array.isArray(prev) ? prev : []), topic]);
        }
        setShowAddTopic(false);
        setEditTopic(null);
        setNewTopic({});
    };

    const openEditTopic = (topic: SafetyTopic) => {
        setEditTopic(topic);
        setNewTopic({ ...topic });
        setShowAddTopic(true);
    };

    // ==================== EXPORT ====================

    const buildExportRows = () => {
        const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        const STATUS_LABEL: Record<string, string> = { done: '✓', booked: 'B', planned: '•', overdue: '⚠', partial: '~', none: '' };
        return topics.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((topic, idx) => {
            const comp = topicCompliance[topic.id] ?? { done: 0, total: 0 };
            const pct = comp.total > 0 ? `${Math.round((comp.done / comp.total) * 100)}%` : '-';
            const row: Record<string, string | number> = {
                'ลำดับ': idx + 1,
                'หัวข้อ / กิจกรรม': topic.name,
                'กลุ่มเป้าหมาย': { all: 'ทุกคน', new_employee: 'พนง.ใหม่', existing_employee: 'พนง.เดิม' }[topic.target] ?? topic.target,
                'ผู้รับผิดชอบ': topic.inCharge ?? '-',
                'งบประมาณ (บาท)': topic.budget ?? 0,
                'By Legal': topic.byLegal ?? '-',
            };
            MONTHS.forEach((m, mi) => {
                const cell = cellStatus[topic.id]?.[mi];
                row[m] = cell ? STATUS_LABEL[cell.status] ?? '' : '';
            });
            row['ผลสำเร็จ'] = pct;
            row['หมายเหตุ'] = topic.remark ?? '';
            return row;
        });
    };

    const handleExportExcel = () => {
        if (topics.length === 0) { showAlert('ไม่มีข้อมูล', 'ยังไม่มีหัวข้อในปีนี้', 'info'); return; }
        const rows = buildExportRows();
        const ws = XLSX.utils.json_to_sheet(rows);

        // column widths
        ws['!cols'] = [
            { wch: 6 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
            ...Array(12).fill({ wch: 6 }),
            { wch: 10 }, { wch: 20 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Safety Plan ${year + 543}`);

        // Summary sheet — per-driver compliance
        const driverRows = drivers.map(d => {
            const driverPlans = plans.filter(p => p.driverId === d.id && p.year === year);
            const done = driverPlans.filter(p => p.status === 'done').length;
            const total = driverPlans.length;
            return {
                'รหัสพนักงาน': d.employeeId,
                'ชื่อ': d.name,
                'แผนทั้งหมด': total,
                'สำเร็จ': done,
                'คงเหลือ': total - done,
                'Compliance %': total > 0 ? `${Math.round((done / total) * 100)}%` : '-',
            };
        });
        if (driverRows.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(driverRows);
            ws2['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Compliance รายคน');
        }

        XLSX.writeFile(wb, `SafetyPlan_${year + 543}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPDF = () => {
        if (topics.length === 0) { showAlert('ไม่มีข้อมูล', 'ยังไม่มีหัวข้อในปีนี้', 'info'); return; }
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`SAFETY AND HEALTH ENVIRONMENT MASTER PLAN`, 14, 16);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Year: ${year + 543} (C.E. ${year})   Compliance: ${compliancePct}%   Topics: ${topics.filter(t => t.isActive).length}`, 14, 23);

        const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const STATUS_LABEL: Record<string, string> = { done: 'OK', booked: 'B', planned: '-', overdue: '!!', partial: '~', none: '' };

        const head = [['#', 'หัวข้อ / กิจกรรม', 'กลุ่มเป้าหมาย', 'ผู้รับผิดชอบ', 'งบประมาณ', 'By Legal',
            ...MONTHS_SHORT, 'ผล %', 'หมายเหตุ']];

        const body = topics.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((topic, idx) => {
            const comp = topicCompliance[topic.id] ?? { done: 0, total: 0 };
            const pct = comp.total > 0 ? `${Math.round((comp.done / comp.total) * 100)}%` : '-';
            const TARGET_TH: Record<string, string> = { all: 'ทุกคน', new_employee: 'พนง.ใหม่', existing_employee: 'พนง.เดิม' };
            return [
                String(idx + 1),
                topic.name,
                TARGET_TH[topic.target] ?? topic.target,
                topic.inCharge ?? '-',
                topic.budget ? topic.budget.toLocaleString() : '-',
                topic.byLegal ?? '-',
                ...Array.from({ length: 12 }, (_, mi) => {
                    const cell = cellStatus[topic.id]?.[mi];
                    return cell ? (STATUS_LABEL[cell.status] ?? '') : '';
                }),
                pct,
                topic.remark ?? '',
            ];
        });

        autoTable(doc, {
            head,
            body,
            startY: 28,
            styles: { fontSize: 7.5, cellPadding: 2, halign: 'center' },
            headStyles: { fillColor: [31, 120, 80], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 55, halign: 'left' },
                2: { cellWidth: 18 },
                3: { cellWidth: 20 },
                4: { cellWidth: 18 },
                5: { cellWidth: 16 },
                18: { cellWidth: 12 },
                19: { cellWidth: 20, halign: 'left' },
            },
            alternateRowStyles: { fillColor: [245, 250, 248] },
            didParseCell: (data) => {
                const val = String(data.cell.raw ?? '');
                if (data.section === 'body' && data.column.index >= 6 && data.column.index <= 17) {
                    if (val === 'OK') data.cell.styles.fillColor = [34, 197, 94];
                    else if (val === 'B') data.cell.styles.fillColor = [59, 130, 246];
                    else if (val === '!!') data.cell.styles.fillColor = [239, 68, 68];
                    else if (val === '~') data.cell.styles.fillColor = [251, 191, 36];
                    if (['OK','B','!!','~'].includes(val)) data.cell.styles.textColor = 255;
                }
            },
        });

        // footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`หน้า ${i}/${pageCount}  |  พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, 14, doc.internal.pageSize.getHeight() - 6);
        }

        doc.save(`SafetyPlan_${year + 543}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-4">
            {/* ===== Toolbar ===== */}
            <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-3">
                {/* Year Switcher */}
                <div className="flex items-center gap-2">
                    <button onClick={() => setYear(y => y - 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 flex items-center justify-center">‹</button>
                    <span className="text-lg font-bold text-slate-700 w-20 text-center">
                        ปี {year + 543}
                    </span>
                    <button onClick={() => setYear(y => y + 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 flex items-center justify-center">›</button>
                </div>

                <div className="h-6 w-px bg-slate-200" />

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">หัวข้อ: <strong className="text-slate-700">{topics.filter(t => t.isActive).length}</strong></span>
                    <span className="text-slate-500">แผน: <strong className="text-slate-700">{overallTotal}</strong></span>
                    <span className={`font-bold ${compliancePct >= 80 ? 'text-green-600' : compliancePct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        Compliance {compliancePct}%
                    </span>
                </div>

                <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {topics.length === 0 && (
                        <button onClick={handleInitDefaultTopics}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow transition-colors">
                            🏗 สร้างหัวข้อเริ่มต้น
                        </button>
                    )}
                    <button onClick={() => { setEditTopic(null); setNewTopic({ target: 'all', isMandatory: true, windowStart: `${year}-01-01`, windowEnd: `${year}-12-31` }); setShowAddTopic(true); }}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                        + เพิ่มหัวข้อ
                    </button>
                    <button onClick={handleGeneratePlan}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow transition-colors">
                        ⚡ Generate แผนทั้งปี
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <button onClick={handleExportExcel}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        Excel
                    </button>
                    <button onClick={handleExportPDF}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        PDF
                    </button>
                </div>
            </div>

            {/* ===== Legend ===== */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-slate-600 items-center">
                <span className="font-semibold text-slate-500">สัญลักษณ์:</span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-flex flex-col w-10 rounded overflow-hidden border border-slate-200 text-[8px] text-center leading-tight">
                        <span className="bg-blue-100 text-blue-700 py-0.5 font-bold">แผน</span>
                        <span className="bg-slate-50 text-slate-300 py-0.5">จริง</span>
                    </span>
                    จองแล้ว / มีแผน
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-flex flex-col w-10 rounded overflow-hidden border border-slate-200 text-[8px] text-center leading-tight">
                        <span className="bg-slate-100 text-slate-500 py-0.5 font-bold">แผน</span>
                        <span className="bg-green-500 text-white py-0.5 font-bold">จริง</span>
                    </span>
                    อบรมสำเร็จ
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-flex flex-col w-10 rounded overflow-hidden border border-slate-200 text-[8px] text-center leading-tight">
                        <span className="bg-slate-100 text-slate-500 py-0.5 font-bold">แผน</span>
                        <span className="bg-amber-400 text-white py-0.5 font-bold">จริง</span>
                    </span>
                    บางส่วน
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-flex flex-col w-10 rounded overflow-hidden border border-slate-200 text-[8px] text-center leading-tight">
                        <span className="bg-red-100 text-red-700 py-0.5 font-bold">แผน</span>
                        <span className="bg-slate-50 text-slate-300 py-0.5">จริง</span>
                    </span>
                    เกินกำหนด
                </span>
            </div>

            {/* ===== Table ===== */}
            <div className="overflow-x-auto rounded-2xl shadow border border-slate-100">
                <table className="w-full text-sm border-collapse min-w-[1200px]">
                    <thead>
                        {/* Row 1: Title + Q Groups */}
                        <tr>
                            <th colSpan={6} className="bg-green-700 text-white text-center py-3 px-4 font-bold text-base" style={{ letterSpacing: '0.03em' }}>
                                SAFETY AND HEALTH ENVIRONMENT MASTER PLAN — ปี {year + 543} (C.E. {year})
                            </th>
                            <th colSpan={3} className="bg-blue-600 text-white text-center py-3 font-bold text-xs">Q1<br /><span className="font-normal opacity-80">ม.ค. – มี.ค.</span></th>
                            <th colSpan={3} className="bg-green-600 text-white text-center py-3 font-bold text-xs">Q2<br /><span className="font-normal opacity-80">เม.ย. – มิ.ย.</span></th>
                            <th colSpan={3} className="bg-amber-500 text-white text-center py-3 font-bold text-xs">Q3<br /><span className="font-normal opacity-80">ก.ค. – ก.ย.</span></th>
                            <th colSpan={3} className="bg-purple-600 text-white text-center py-3 font-bold text-xs">Q4<br /><span className="font-normal opacity-80">ต.ค. – ธ.ค.</span></th>
                            <th rowSpan={2} className="bg-slate-600 text-white text-center py-3 px-2 font-semibold text-xs min-w-[80px]">ผลสำเร็จ</th>
                            <th rowSpan={2} className="bg-slate-600 text-white text-center py-3 px-2 font-semibold text-xs min-w-[60px]">หมายเหตุ</th>
                        </tr>
                        {/* Row 2: Column headers */}
                        <tr className="bg-slate-700 text-white text-xs">
                            <th className="px-2 py-2 text-center font-semibold w-8">ลำดับ</th>
                            <th className="px-3 py-2 text-left font-semibold min-w-[200px]">หัวข้อ / กิจกรรม</th>
                            <th className="px-2 py-2 text-center font-semibold min-w-[80px]">กลุ่มเป้าหมาย</th>
                            <th className="px-2 py-2 text-center font-semibold min-w-[90px]">ผู้รับผิดชอบ</th>
                            <th className="px-2 py-2 text-center font-semibold min-w-[70px]">งบประมาณ</th>
                            <th className="px-2 py-2 text-center font-semibold min-w-[60px]">By Legal</th>
                            {THAI_MONTHS_SHORT.map((m, i) => (
                                <th key={i} className={`px-1 py-2 text-center font-semibold w-14 ${QUARTER_COLORS[i]?.replace('bg-', 'bg-opacity-20 text-') ?? ''}`}>{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {topics.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((topic, idx) => {
                            const comp = topicCompliance[topic.id] ?? { done: 0, total: 0 };
                            const pct = comp.total > 0 ? Math.round((comp.done / comp.total) * 100) : null;
                            return (
                                <tr key={topic.id} className="hover:bg-slate-50 group">
                                    <td className="px-2 py-2.5 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-start gap-2">
                                            <div>
                                                <p className="font-semibold text-slate-800 leading-tight">{topic.name}</p>
                                                {topic.description && <p className="text-xs text-slate-400 mt-0.5">{topic.description}</p>}
                                                {topic.isMandatory && <span className="text-[10px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded-full">MUST DO</span>}
                                            </div>
                                            <div className="ml-auto flex gap-1 shrink-0">
                                                <button onClick={() => setActualModalTopic(topic)} title="บันทึกการอบรมจริง"
                                                    className="text-xs text-emerald-600 hover:text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 hover:bg-emerald-50 font-semibold">✓ Actual</button>
                                                {(() => {
                                                    const topicSession = sessions.find(s => s.topicId === topic.id);
                                                    if (!topicSession) return null;
                                                    const topicPlans = plans.filter(p => p.topicId === topic.id && p.status === 'done');
                                                    return (
                                                        <button
                                                            onClick={() => setPrintData({ session: topicSession, plans: topicPlans, topic })}
                                                            title="พิมพ์บันทึกการอบรม"
                                                            className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-50">
                                                            🖨
                                                        </button>
                                                    );
                                                })()}
                                                <button onClick={() => openEditTopic(topic)} title="แก้ไข"
                                                    className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-50">✎</button>
                                                <button onClick={() => handleDeleteTopic(topic.id)} title="ลบ"
                                                    className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded border border-red-200 hover:bg-red-50">✕</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${topic.target === 'all' ? 'bg-teal-50 text-teal-700' : topic.target === 'new_employee' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                            {TARGET_LABEL[topic.target]}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-xs text-slate-600">{topic.inCharge ?? '-'}</td>
                                    <td className="px-2 py-2.5 text-center text-xs font-mono text-slate-600">
                                        {topic.budget ? formatCurrency(topic.budget) : '-'}
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-xs text-slate-600">{topic.byLegal ?? '-'}</td>

                                    {/* Month cells — Plan (top) + Actual (bottom) */}
                                    {Array.from({ length: 12 }, (_, m) => {
                                        const cell = cellStatus[topic.id]?.[m];
                                        const inWindow = topic.windowStart && topic.windowEnd
                                            ? m >= new Date(topic.windowStart).getMonth() && m <= new Date(topic.windowEnd).getMonth()
                                            : true;

                                        // Plan row: ใช้ session.startDate หรือ plan.bookingDate หรือ plan.dueDate
                                        const planSession = cell?.sessions[0];
                                        const planDate = planSession?.startDate
                                            ?? cell?.plans.find(p => p.bookingDate)?.bookingDate
                                            ?? cell?.plans.find(p => p.dueDate)?.dueDate;
                                        const planDateFmt = planDate ? fmtDateShort(planDate) : null;

                                        // Actual row: plan.actualDate ของ done plans
                                        const donePlans = cell?.plans.filter(p => p.status === 'done' && p.actualDate) ?? [];
                                        const actualDate = donePlans[0]?.actualDate;
                                        const actualDateFmt = actualDate ? fmtDateShort(actualDate) : null;
                                        const doneCount = cell?.doneCount ?? 0;
                                        const totalCount = cell?.totalCount ?? 0;

                                        const hasData = cell && cell.status !== 'none';

                                        return (
                                            <td key={m} className={`px-0.5 py-0.5 text-center ${QUARTER_COLORS[m]} border-l border-slate-100`}>
                                                <button
                                                    onClick={() => inWindow ? setModalTopic(topic) : undefined}
                                                    title={`${MONTH_FULL[m]} — ${topic.name}`}
                                                    className={`w-full rounded-lg transition-all text-[9px] overflow-hidden
                                                        ${!inWindow ? 'opacity-20 cursor-default' : 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 cursor-pointer'}`}
                                                >
                                                    {/* ชั้นบน — แผน */}
                                                    <div className={`px-1 py-1 flex flex-col items-center min-h-[28px] justify-center
                                                        ${!hasData ? 'bg-transparent' :
                                                          cell.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                          cell.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                                                          cell.status === 'planned' ? 'bg-slate-100 text-slate-500' :
                                                          'bg-slate-100 text-slate-500'}`}
                                                    >
                                                        {hasData && planDateFmt ? (
                                                            <>
                                                                <span className="text-[8px] font-bold opacity-60">แผน</span>
                                                                <span className="font-semibold">{planDateFmt}</span>
                                                            </>
                                                        ) : inWindow ? (
                                                            <span className="text-slate-200 text-[10px]">—</span>
                                                        ) : null}
                                                    </div>

                                                    {/* เส้นคั่น */}
                                                    {inWindow && <div className="h-px bg-slate-200" />}

                                                    {/* ชั้นล่าง — จริง */}
                                                    <div className={`px-1 py-1 flex flex-col items-center min-h-[28px] justify-center
                                                        ${!hasData ? 'bg-transparent' :
                                                          cell.status === 'done' ? 'bg-green-500 text-white' :
                                                          cell.status === 'partial' ? 'bg-amber-400 text-white' :
                                                          'bg-slate-50 text-slate-300'}`}
                                                    >
                                                        {cell?.status === 'done' || cell?.status === 'partial' ? (
                                                            <>
                                                                <span className="text-[8px] font-bold opacity-80">จริง</span>
                                                                {actualDateFmt && <span className="font-semibold">{actualDateFmt}</span>}
                                                                {totalCount > 0 && (
                                                                    <span className="text-[8px] font-normal opacity-90">
                                                                        {doneCount}/{totalCount}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : hasData ? (
                                                            <span className="text-[9px] opacity-40">—</span>
                                                        ) : inWindow ? (
                                                            <span className="text-slate-200 text-[10px]">—</span>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            </td>
                                        );
                                    })}

                                    {/* ผลสำเร็จ */}
                                    <td className="px-2 py-2.5 text-center">
                                        {pct !== null ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-xs font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {pct}%
                                                </span>
                                                <span className="text-[10px] text-slate-400">{comp.done}/{comp.total}</span>
                                                <div className="w-12 bg-slate-100 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                        style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-xs text-slate-400 max-w-[80px] truncate" title={topic.remark}>{topic.remark ?? ''}</td>
                                </tr>
                            );
                        })}

                        {topics.length === 0 && (
                            <tr>
                                <td colSpan={20} className="py-16 text-center">
                                    <div className="text-slate-400 text-sm">
                                        <p className="text-4xl mb-3">📋</p>
                                        <p className="font-semibold">ยังไม่มีหัวข้อความปลอดภัยสำหรับปี {year + 543}</p>
                                        <p className="text-xs mt-1">กด "สร้างหัวข้อเริ่มต้น" เพื่อสร้างหัวข้อ Safety Induction Q1–Q4 + Defensive Driving อัตโนมัติ</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Footer: Budget total */}
                        {topics.length > 0 && (
                            <tr className="bg-slate-700 text-white font-bold">
                                <td colSpan={4} className="px-3 py-2.5 text-sm text-right">GRAND TOTAL BUDGET</td>
                                <td className="px-2 py-2.5 text-center text-sm font-mono text-yellow-300">
                                    {totalBudget > 0 ? formatCurrency(totalBudget) : '-'}
                                </td>
                                <td colSpan={14} />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== Add/Edit Topic Modal ===== */}
            {showAddTopic && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => { setShowAddTopic(false); setEditTopic(null); setNewTopic({}); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{editTopic ? 'แก้ไขหัวข้อ' : 'เพิ่มหัวข้อใหม่'}</h3>
                            <button onClick={() => { setShowAddTopic(false); setEditTopic(null); setNewTopic({}); }} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="px-6 py-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อหัวข้อ *</label>
                                <input type="text" value={newTopic.name ?? ''} onChange={e => setNewTopic(p => ({ ...p, name: e.target.value }))}
                                    placeholder="เช่น อบรมความปลอดภัย Q1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่มเป้าหมาย</label>
                                    <select value={newTopic.target ?? 'all'} onChange={e => setNewTopic(p => ({ ...p, target: e.target.value as SafetyTopic['target'] }))}
                                        aria-label="กลุ่มเป้าหมาย" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                        <option value="all">ทุกคน</option>
                                        <option value="new_employee">พนักงานใหม่</option>
                                        <option value="existing_employee">พนักงานเดิม</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้รับผิดชอบ</label>
                                    <input type="text" value={newTopic.inCharge ?? ''} onChange={e => setNewTopic(p => ({ ...p, inCharge: e.target.value }))}
                                        placeholder="Safety Officer" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">วันเริ่มต้น *</label>
                                    <input type="date" value={newTopic.windowStart ?? ''} onChange={e => setNewTopic(p => ({ ...p, windowStart: e.target.value }))}
                                        aria-label="วันเริ่มต้น" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">วันสิ้นสุด *</label>
                                    <input type="date" value={newTopic.windowEnd ?? ''} onChange={e => setNewTopic(p => ({ ...p, windowEnd: e.target.value }))}
                                        aria-label="วันสิ้นสุด" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">งบประมาณ (บาท)</label>
                                    <input type="number" value={newTopic.budget ?? ''} onChange={e => setNewTopic(p => ({ ...p, budget: Number(e.target.value) }))}
                                        placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">By Legal</label>
                                    <input type="text" value={newTopic.byLegal ?? ''} onChange={e => setNewTopic(p => ({ ...p, byLegal: e.target.value }))}
                                        placeholder="Safety & Training" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียด</label>
                                <textarea value={newTopic.description ?? ''} onChange={e => setNewTopic(p => ({ ...p, description: e.target.value }))}
                                    rows={2} placeholder="รายละเอียดเพิ่มเติม"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                                <input type="text" value={newTopic.remark ?? ''} onChange={e => setNewTopic(p => ({ ...p, remark: e.target.value }))}
                                    placeholder="หมายเหตุ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input type="checkbox" checked={newTopic.isMandatory ?? true} onChange={e => setNewTopic(p => ({ ...p, isMandatory: e.target.checked }))}
                                    className="rounded" aria-label="บังคับ (MUST DO)" />
                                <span className="text-slate-700">บังคับ (MUST DO)</span>
                            </label>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => { setShowAddTopic(false); setEditTopic(null); setNewTopic({}); }}
                                className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSaveTopic}
                                className="px-6 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow">
                                {editTopic ? 'บันทึกการแก้ไข' : 'เพิ่มหัวข้อ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Training Actual Print Modal ===== */}
            {printData && (
                <TrainingActualPrintModal
                    session={printData.session}
                    plans={printData.plans}
                    topic={printData.topic}
                    drivers={drivers}
                    onClose={() => setPrintData(null)}
                />
            )}

            {/* ===== Training Actual Modal ===== */}
            {actualModalTopic && (
                <TrainingActualModal
                    topic={actualModalTopic}
                    drivers={drivers}
                    existingSession={sessions.find(s => s.topicId === actualModalTopic.id) ?? null}
                    existingPlans={plans}
                    year={year}
                    onSave={handleSaveActual}
                    onClose={() => setActualModalTopic(null)}
                />
            )}

            {/* ===== Training Session Modal ===== */}
            {modalTopic && (
                <TrainingSessionModal
                    topic={modalTopic}
                    year={year}
                    drivers={drivers}
                    sessions={sessions}
                    plans={plans}
                    onClose={() => setModalTopic(null)}
                    onSaveSession={handleSaveSession}
                    onUpdatePlans={handleUpdatePlans}
                />
            )}
        </div>
    );
};

export default SafetyPlanTable;
