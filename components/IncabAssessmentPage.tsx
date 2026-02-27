import React, { useState, useMemo } from 'react';
import type { Driver, IncabAssessment } from '../types';
import { useIncabAssessments } from '../hooks/useIncabAssessments';
import { useToast } from '../context/ToastContext';
import IncabAssessmentModal from './IncabAssessmentModal';
import IncabAssessmentPrintModal from './IncabAssessmentPrintModal';
import { confirmAction } from '../utils';

interface Props {
    drivers: Driver[];
}

const RESULT_BADGE: Record<string, string> = {
    pass: 'bg-emerald-100 text-emerald-700',
    fail: 'bg-red-100 text-red-700',
};

export default function IncabAssessmentPage({ drivers }: Props) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const { assessments, addAssessment, updateAssessment, deleteAssessment } = useIncabAssessments(year);
    const { addToast } = useToast();

    const [search, setSearch] = useState('');
    const [filterResult, setFilterResult] = useState<'all' | 'pass' | 'fail'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editAssessment, setEditAssessment] = useState<IncabAssessment | null>(null);
    const [printAssessment, setPrintAssessment] = useState<IncabAssessment | null>(null);

    const filtered = useMemo(() => {
        return assessments
            .filter(a => {
                if (filterResult !== 'all' && a.result !== filterResult) return false;
                if (search) {
                    const s = search.toLowerCase();
                    return a.driverName.toLowerCase().includes(s) || (a.employeeId ?? '').toLowerCase().includes(s);
                }
                return true;
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [assessments, search, filterResult]);

    const handleSave = (assessment: IncabAssessment) => {
        const exists = assessments.some(a => a.id === assessment.id);
        if (exists) updateAssessment(assessment);
        else addAssessment(assessment);
        setShowModal(false);
        setEditAssessment(null);
        setPrintAssessment(assessment);
    };

    const handleEdit = (a: IncabAssessment) => {
        setEditAssessment(a);
        setShowModal(true);
    };

    const handleDelete = async (a: IncabAssessment) => {
        const ok = await confirmAction('ยืนยันการลบ', `ลบผลทดสอบของ ${a.driverName} วันที่ ${new Date(a.date).toLocaleDateString('th-TH')} ใช่หรือไม่?`, 'ลบ');
        if (!ok) return;
        deleteAssessment(a.id);
        addToast('ลบผลทดสอบสำเร็จ', 'success');
    };

    const passCount = assessments.filter(a => a.result === 'pass').length;
    const failCount = assessments.filter(a => a.result === 'fail').length;
    const avgScore = assessments.length > 0
        ? Math.round(assessments.reduce((s, a) => s + a.totalScore, 0) / assessments.length)
        : 0;

    const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

    return (
        <div className="p-4 space-y-4">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">📋 แบบฟอร์มทดสอบพนักงานขับรถ</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Incab Coaching Assessment — บันทึกผลการทดสอบร่างกาย / จิตใจ / การขับขี่</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        title="เลือกปี"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                        onClick={() => { setEditAssessment(null); setShowModal(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow transition-colors"
                    >
                        + บันทึกผลทดสอบ
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'ทั้งหมด', value: assessments.length, color: 'bg-slate-100 text-slate-700' },
                    { label: 'ผ่าน', value: passCount, color: 'bg-emerald-100 text-emerald-700' },
                    { label: 'ไม่ผ่าน', value: failCount, color: 'bg-red-100 text-red-700' },
                    { label: 'คะแนนเฉลี่ย', value: assessments.length ? `${avgScore}/100` : '-', color: 'bg-blue-100 text-blue-700' },
                ].map((s, i) => (
                    <div key={i} className={`rounded-xl p-3 ${s.color} flex flex-col`}>
                        <span className="text-xs font-medium opacity-70">{s.label}</span>
                        <span className="text-2xl font-black mt-0.5">{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ / รหัสพนักงาน..."
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 w-56"
                />
                <div className="flex gap-1">
                    {(['all', 'pass', 'fail'] as const).map(v => (
                        <button key={v} onClick={() => setFilterResult(v)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                filterResult === v
                                    ? v === 'pass' ? 'bg-emerald-600 text-white border-emerald-600'
                                      : v === 'fail' ? 'bg-red-500 text-white border-red-500'
                                      : 'bg-slate-700 text-white border-slate-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}>
                            {v === 'all' ? 'ทั้งหมด' : v === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-sm">ยังไม่มีผลการทดสอบ{search ? 'ที่ตรงกับการค้นหา' : `ประจำปี ${year}`}</div>
                    {!search && (
                        <button onClick={() => { setEditAssessment(null); setShowModal(true); }}
                            className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors">
                            + บันทึกผลทดสอบแรก
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-800 text-white text-xs">
                                <th className="px-3 py-2.5 text-left font-semibold">พนักงาน</th>
                                <th className="px-3 py-2.5 text-center font-semibold">วันที่</th>
                                <th className="px-3 py-2.5 text-center font-semibold">ร่างกาย<br/><span className="font-normal opacity-70">/30</span></th>
                                <th className="px-3 py-2.5 text-center font-semibold">จิตใจ<br/><span className="font-normal opacity-70">/30</span></th>
                                <th className="px-3 py-2.5 text-center font-semibold">ขับขี่<br/><span className="font-normal opacity-70">/40</span></th>
                                <th className="px-3 py-2.5 text-center font-semibold">รวม<br/><span className="font-normal opacity-70">/100</span></th>
                                <th className="px-3 py-2.5 text-center font-semibold">ผล</th>
                                <th className="px-3 py-2.5 text-center font-semibold">ผู้ประเมิน</th>
                                <th className="px-3 py-2.5 text-center font-semibold">ทดสอบครั้งถัดไป</th>
                                <th className="px-3 py-2.5 text-center font-semibold">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((a, idx) => {
                                const nextDate = a.nextTestDate;
                                const daysToNext = nextDate ? Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86400000) : null;
                                const overDue = daysToNext !== null && daysToNext < 0;
                                const nearDue = daysToNext !== null && daysToNext <= 30 && !overDue;

                                return (
                                    <tr key={a.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                        <td className="px-3 py-2.5">
                                            <div className="font-semibold text-slate-800">{a.driverName}</div>
                                            <div className="text-xs text-slate-400">{a.employeeId}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">
                                            {new Date(a.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="font-bold text-blue-700">{a.visionScore}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="font-bold text-purple-700">{a.situationScore}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="font-bold text-teal-700">{a.drivingScore}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-lg font-black ${a.result === 'pass' ? 'text-emerald-700' : 'text-red-600'}`}>
                                                {a.totalScore}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RESULT_BADGE[a.result]}`}>
                                                {a.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-slate-500 text-xs">
                                            {a.assessor || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {nextDate ? (
                                                <span className={`text-xs font-semibold ${overDue ? 'text-red-600' : nearDue ? 'text-amber-600' : 'text-slate-500'}`}>
                                                    {overDue ? `เกิน ${Math.abs(daysToNext!)} วัน` : nearDue ? `${daysToNext} วัน` : new Date(nextDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                    {(overDue || nearDue) && (
                                                        <div className="text-[10px] font-normal">{new Date(nextDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                                                    )}
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => setPrintAssessment(a)}
                                                    title="พรีวิว / พิมพ์"
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs">
                                                    🖨
                                                </button>
                                                <button onClick={() => handleEdit(a)}
                                                    title="แก้ไข"
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-xs">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(a)}
                                                    title="ลบ"
                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs">
                                                    🗑
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {showModal && (
                <IncabAssessmentModal
                    drivers={drivers}
                    editAssessment={editAssessment}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditAssessment(null); }}
                    onToast={(msg, type) => addToast(msg, type)}
                />
            )}
            {printAssessment && (
                <IncabAssessmentPrintModal
                    assessment={printAssessment}
                    onClose={() => setPrintAssessment(null)}
                />
            )}
        </div>
    );
}
