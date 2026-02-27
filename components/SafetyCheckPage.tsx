import React, { useState, useMemo } from 'react';
import type { Driver, SafetyCheck, SafetyCheckType } from '../types';
import { useSafetyChecks } from '../hooks/useSafetyChecks';
import SafetyCheckModal from './SafetyCheckModal';
import SafetyCheckPrintModal from './SafetyCheckPrintModal';
import { confirmAction, showAlert } from '../utils';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';

interface Props {
    drivers: Driver[];
}

const TYPE_LABEL: Record<SafetyCheckType, string> = {
    alcohol: '🍺 แอลกอฮอล์',
    substance: '💊 สารเสพติด',
};

const METHOD_LABEL: Record<string, string> = {
    breathalyzer: 'Breathalyzer',
    urine: 'Urine Test',
    blood: 'Blood Test',
};

export default function SafetyCheckPage({ drivers }: Props) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const { checks, addCheck, updateCheck, deleteCheck } = useSafetyChecks(year);
    const { addToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [editCheck, setEditCheck] = useState<SafetyCheck | null>(null);
    const [printCheck, setPrintCheck] = useState<SafetyCheck | null>(null);
    const [filterType, setFilterType] = useState<SafetyCheckType | 'all'>('all');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return checks
            .filter(c => filterType === 'all' || c.type === filterType)
            .filter(c =>
                search === '' ||
                c.auditor.toLowerCase().includes(search.toLowerCase()) ||
                c.location.toLowerCase().includes(search.toLowerCase()) ||
                c.attendees.some(a => a.name.toLowerCase().includes(search.toLowerCase()))
            )
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [checks, filterType, search]);

    const handleSave = (check: SafetyCheck) => {
        if (editCheck) updateCheck(check);
        else addCheck(check);
        setEditCheck(null);
        setShowModal(false);
    };

    const handleEdit = (check: SafetyCheck) => {
        setEditCheck(check);
        setShowModal(true);
    };

    const handleDelete = async (check: SafetyCheck) => {
        const ok = await confirmAction(
            'ยืนยันการลบ',
            `ลบบันทึกการตรวจ${check.type === 'alcohol' ? 'แอลกอฮอล์' : 'สารเสพติด'} วันที่ ${check.date} ใช่หรือไม่?`,
            'ลบ'
        );
        if (!ok) return;
        deleteCheck(check.id);
        addToast('ลบบันทึกสำเร็จ', 'info');
    };

    // Export Excel
    const handleExportExcel = () => {
        if (filtered.length === 0) { showAlert('ไม่มีข้อมูล', 'ยังไม่มีบันทึกการตรวจในปีนี้', 'info'); return; }
        const rows = filtered.flatMap(c =>
            c.attendees.map(a => ({
                'วันที่': c.date,
                'ประเภท': c.type === 'alcohol' ? 'แอลกอฮอล์' : 'สารเสพติด',
                'วิธีตรวจ': METHOD_LABEL[c.method] ?? c.method,
                'สถานที่': c.location,
                'ผู้ตรวจ': c.auditor,
                'รหัสพนักงาน': a.employeeId,
                'ชื่อ-สกุล': a.name,
                'ตำแหน่ง': a.position,
                'ผลตรวจ': c.type === 'alcohol'
                    ? (a.alcoholLevel !== undefined ? a.alcoholLevel.toFixed(2) : '0.00')
                    : (a.result === 'pass' ? 'ไม่พบ (Pass)' : 'พบ (Fail)'),
                'สถานะ': a.result === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน',
                'หมายเหตุ': a.remark ?? '',
            }))
        );
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
            { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Safety Check ${year + 543}`);
        XLSX.writeFile(wb, `SafetyCheck_${year + 543}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Stats
    const totalChecks = checks.length;
    const totalFail = checks.reduce((s, c) => s + c.attendees.filter(a => a.result === 'fail').length, 0);
    const uniqueDriversChecked = new Set(checks.flatMap(c => c.attendees.map(a => a.driverId))).size;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-3">
                {/* Year switcher */}
                <div className="flex items-center gap-2">
                    <button onClick={() => setYear(y => y - 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 flex items-center justify-center">‹</button>
                    <span className="text-lg font-bold text-slate-700 w-20 text-center">ปี {year + 543}</span>
                    <button onClick={() => setYear(y => y + 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 flex items-center justify-center">›</button>
                </div>

                <div className="h-6 w-px bg-slate-200" />

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">บันทึกทั้งหมด: <strong className="text-slate-700">{totalChecks}</strong></span>
                    <span className="text-slate-500">คนขับที่ตรวจแล้ว: <strong className="text-slate-700">{uniqueDriversChecked}</strong></span>
                    {totalFail > 0
                        ? <span className="text-red-600 font-bold">⚠ ไม่ผ่าน {totalFail} ครั้ง</span>
                        : <span className="text-green-600 font-semibold">✓ ทุกรายการผ่าน</span>
                    }
                </div>

                <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ สถานที่ ผู้ตรวจ..."
                        className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm w-48" />

                    {/* Type filter */}
                    <select value={filterType} onChange={e => setFilterType(e.target.value as SafetyCheckType | 'all')}
                        aria-label="กรองประเภท"
                        className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
                        <option value="all">ทุกประเภท</option>
                        <option value="alcohol">แอลกอฮอล์</option>
                        <option value="substance">สารเสพติด</option>
                    </select>

                    {/* Export Excel */}
                    <button onClick={handleExportExcel}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Excel
                    </button>

                    {/* New Alcohol */}
                    <button onClick={() => { setEditCheck(null); setShowModal(true); }}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow transition-colors">
                        + บันทึกการตรวจ
                    </button>
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-20 text-center">
                    <div className="text-5xl mb-3">🔬</div>
                    <p className="text-slate-500 font-medium">ยังไม่มีบันทึกการตรวจในปี {year + 543}</p>
                    <p className="text-slate-400 text-sm mt-1">กด "+ บันทึกการตรวจ" เพื่อเพิ่มรายการใหม่</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((check) => {
                        const pass = check.attendees.filter(a => a.result === 'pass').length;
                        const fail = check.attendees.filter(a => a.result === 'fail').length;
                        const isAlcohol = check.type === 'alcohol';
                        return (
                            <div key={check.id}
                                className={`bg-white rounded-2xl shadow-sm border ${fail > 0 ? 'border-l-4 border-l-red-400 border-red-100' : 'border-slate-100'} p-4`}>
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isAlcohol ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {TYPE_LABEL[check.type]}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700">
                                            {new Date(check.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-xs text-slate-400">{METHOD_LABEL[check.method] ?? check.method}</span>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setPrintCheck(check)}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors">
                                            📄
                                        </button>
                                        <button onClick={() => handleEdit(check)}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-lg text-xs font-semibold transition-colors">
                                            ✏
                                        </button>
                                        <button onClick={() => handleDelete(check)}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors">
                                            🗑
                                        </button>
                                    </div>
                                </div>

                                {/* Detail row */}
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                    <span>📍 {check.location}</span>
                                    <span>👤 {check.auditor}</span>
                                    {check.evidenceFiles.length > 0 && (
                                        <span className="text-green-600">📎 {check.evidenceFiles.length} ไฟล์</span>
                                    )}
                                </div>

                                {/* Stats row */}
                                <div className="mt-2.5 flex items-center gap-3">
                                    <span className="text-xs text-slate-500">ผู้เข้ารับการตรวจ {check.attendees.length} คน</span>
                                    <span className="text-xs font-semibold text-green-600">✓ ผ่าน {pass}</span>
                                    {fail > 0
                                        ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠ ไม่ผ่าน {fail} คน</span>
                                        : <span className="text-xs text-slate-300">ไม่ผ่าน 0</span>
                                    }
                                </div>

                                {/* Fail names */}
                                {fail > 0 && (
                                    <div className="mt-1.5 text-xs text-red-600 font-medium">
                                        {check.attendees.filter(a => a.result === 'fail').map(a => a.name).join(', ')}
                                    </div>
                                )}

                                {/* Evidence thumbnails */}
                                {check.evidenceFiles.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {check.evidenceFiles.map((url, i) => {
                                            const isPdf = url.toLowerCase().includes('.pdf');
                                            return isPdf ? (
                                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 transition-colors font-medium">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 12h8v1H8v-1zm0 3h8v1H8v-1zm0 3h5v1H8v-1z"/>
                                                    </svg>
                                                    PDF [{i + 1}]
                                                </a>
                                            ) : (
                                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                                    className="block rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                                                    <img
                                                        src={url}
                                                        alt={`หลักฐาน ${i + 1}`}
                                                        className="h-20 w-20 object-cover"
                                                        loading="lazy"
                                                        onError={e => {
                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            {showModal && (
                <SafetyCheckModal
                    drivers={drivers}
                    editCheck={editCheck}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditCheck(null); }}
                    onToast={(msg, type) => addToast(msg, type)}
                />
            )}
            {printCheck && (
                <SafetyCheckPrintModal
                    check={printCheck}
                    onClose={() => setPrintCheck(null)}
                />
            )}
        </div>
    );
}
