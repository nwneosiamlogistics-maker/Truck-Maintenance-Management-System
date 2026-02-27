import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type {
    Driver, IncabAssessment, IncabVisionTest, IncabDrivingChecklist, IncabApprovalStatus
} from '../types';
import { uploadFileToStorage } from '../utils/fileUpload';

interface Props {
    drivers: Driver[];
    editAssessment?: IncabAssessment | null;
    onSave: (a: IncabAssessment) => void;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// ---- helpers ----
const calcVisionScore = (v: IncabVisionTest): number => {
    let s = 0;
    if (v.eyeSight === 'normal') s += 15;
    else if (v.eyeSight !== '') s += 7;
    if (v.colorVision === 'normal') s += 10;
    if (v.hearing === 'normal') s += 5;
    return s;
};

const calcDrivingScore = (c: IncabDrivingChecklist): number => {
    const keys = Object.values(c);
    const passed = keys.filter(v => v === 'pass').length;
    return Math.round((passed / 6) * 40);
};

const DRIVING_ITEMS: { key: keyof IncabDrivingChecklist; label: string }[] = [
    { key: 'parking', label: 'การจอดรถ' },
    { key: 'reversing', label: 'การกลับรถ' },
    { key: 'speedControl', label: 'ความเร็วในเขต' },
    { key: 'mirrorUsage', label: 'การใช้กระจก' },
    { key: 'signalUsage', label: 'การให้สัญญาณ' },
    { key: 'laneKeeping', label: 'การรักษาช่องทาง' },
];

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5];

export default function IncabAssessmentModal({ drivers, editAssessment, onSave, onClose, onToast }: Props) {
    const today = new Date().toISOString().split('T')[0];

    const [driverId, setDriverId] = useState(editAssessment?.driverId ?? '');
    const [date, setDate] = useState(editAssessment?.date ?? today);
    const [assessor, setAssessor] = useState(editAssessment?.assessor ?? '');
    const [approvedBy, setApprovedBy] = useState(editAssessment?.approvedBy ?? '');
    const [approvalStatus, setApprovalStatus] = useState<IncabApprovalStatus>(editAssessment?.approvalStatus ?? 'pending');
    const [nextTestDate, setNextTestDate] = useState(editAssessment?.nextTestDate ?? '');
    const [remark, setRemark] = useState(editAssessment?.remark ?? '');

    const [visionTest, setVisionTest] = useState<IncabVisionTest>(
        editAssessment?.visionTest ?? { eyeSight: '', colorVision: '', hearing: '' }
    );

    const [situationQ1, setSituationQ1] = useState(editAssessment?.situationQ1 ?? '');
    const [situationQ1Score, setSituationQ1Score] = useState(editAssessment?.situationQ1Score ?? 0);
    const [situationQ2, setSituationQ2] = useState(editAssessment?.situationQ2 ?? '');
    const [situationQ2Score, setSituationQ2Score] = useState(editAssessment?.situationQ2Score ?? 0);
    const [situationQ3, setSituationQ3] = useState(editAssessment?.situationQ3 ?? '');
    const [situationQ3Score, setSituationQ3Score] = useState(editAssessment?.situationQ3Score ?? 0);

    const [drivingChecklist, setDrivingChecklist] = useState<IncabDrivingChecklist>(
        editAssessment?.drivingChecklist ?? {
            parking: '', reversing: '', speedControl: '',
            mirrorUsage: '', signalUsage: '', laneKeeping: '',
        }
    );

    const [evidenceFiles, setEvidenceFiles] = useState<string[]>(editAssessment?.evidenceFiles ?? []);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // ---- computed scores ----
    const visionScore = calcVisionScore(visionTest);
    const situationScore = Math.round(((situationQ1Score + situationQ2Score + situationQ3Score) / 15) * 30);
    const drivingScore = calcDrivingScore(drivingChecklist);
    const totalScore = visionScore + situationScore + drivingScore;
    const result = totalScore >= 70 ? 'pass' : 'fail';

    const selectedDriver = drivers.find(d => d.id === driverId);

    // ---- upload ----
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setUploading(true);
        try {
            const urls: string[] = [];
            for (const file of files) {
                const id = editAssessment?.id ?? `INCAB-${Date.now()}`;
                const path = `truck-maintenance/incab/${id}/${Date.now()}_${file.name}`;
                const url = await uploadFileToStorage(file, path);
                if (url) urls.push(url);
            }
            setEvidenceFiles(prev => [...prev, ...urls]);
            onToast(`อัปโหลด ${urls.length} ไฟล์สำเร็จ`, 'success');
        } catch {
            onToast('อัปโหลดไม่สำเร็จ', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }, [editAssessment, onToast]);

    // ---- save ----
    const handleSubmit = () => {
        if (!driverId) { onToast('กรุณาเลือกพนักงานขับรถ', 'warning'); return; }
        if (!date) { onToast('กรุณาระบุวันที่', 'warning'); return; }
        if (!assessor.trim()) { onToast('กรุณาระบุผู้ประเมิน', 'warning'); return; }

        setSaving(true);
        try {
            const driver = drivers.find(d => d.id === driverId)!;
            const assessment: IncabAssessment = {
                id: editAssessment?.id ?? `INCAB-${Date.now()}`,
                year: new Date(date).getFullYear(),
                driverId,
                driverName: driver.name,
                employeeId: driver.employeeId,
                date,
                assessor: assessor.trim(),
                approvedBy: approvedBy.trim() || undefined,
                approvalStatus,
                nextTestDate: nextTestDate || undefined,
                visionTest,
                visionScore,
                situationQ1,
                situationQ1Score,
                situationQ2,
                situationQ2Score,
                situationQ3,
                situationQ3Score,
                situationScore,
                drivingChecklist,
                drivingScore,
                totalScore,
                result,
                remark: remark.trim() || undefined,
                evidenceFiles,
                createdAt: editAssessment?.createdAt ?? new Date().toISOString(),
            };
            onSave(assessment);
            onToast('บันทึกผลการทดสอบสำเร็จ', 'success');
            onClose();
        } catch {
            onToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
        } finally {
            setSaving(false);
        }
    };

    const scoreColor = totalScore >= 70
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-red-700 bg-red-50 border-red-200';

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 bg-slate-800 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white">📋 แบบฟอร์มทดสอบพนักงานขับรถ</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Incab Assessment Form</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xl">×</button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* ข้อมูลพื้นฐาน */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">ข้อมูลทั่วไป</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล ผู้ทดสอบ <span className="text-red-500">*</span></label>
                                <select value={driverId} onChange={e => setDriverId(e.target.value)}
                                    title="ชื่อ-นามสกุล ผู้ทดสอบ"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                                    <option value="">— เลือกพนักงาน —</option>
                                    {drivers.filter(d => d.status === 'active').map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่ <span className="text-red-500">*</span></label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                    title="วันที่" placeholder="วว/ดด/ปปปป"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้ประเมิน <span className="text-red-500">*</span></label>
                                <input type="text" value={assessor} onChange={e => setAssessor(e.target.value)}
                                    placeholder="ชื่อผู้ประเมิน"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">วันทดสอบครั้งถัดไป</label>
                                <input type="date" value={nextTestDate} onChange={e => setNextTestDate(e.target.value)}
                                    title="วันทดสอบครั้งถัดไป" placeholder="วว/ดด/ปปปป"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                        </div>
                    </div>

                    {/* ส่วนที่ 1: ร่างกาย */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">ส่วนที่ 1 — การทดสอบร่างกาย</span>
                            <span className="text-white/80 text-xs">คะแนน {visionScore} / 30</span>
                        </div>
                        <div className="p-4 space-y-4 bg-blue-50/30">
                            {/* 1.1 สายตา */}
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">1.1 การมองเห็นของสายตา</p>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'short', label: 'สายตาสั้น', score: 7 },
                                        { value: 'long', label: 'สายตายาว', score: 7 },
                                        { value: 'normal', label: 'สายตาปกติ', score: 15 },
                                    ].map(opt => (
                                        <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                            visionTest.eyeSight === opt.value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                                        }`}>
                                            <input type="radio" name="eyeSight" value={opt.value}
                                                checked={visionTest.eyeSight === opt.value}
                                                onChange={() => setVisionTest(v => ({ ...v, eyeSight: opt.value as any }))}
                                                className="hidden" />
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${visionTest.eyeSight === opt.value ? 'border-white bg-white' : 'border-slate-300'}`} />
                                            {opt.label}
                                            <span className="text-xs opacity-70">({opt.score} คะแนน)</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {/* 1.2 การมองเห็นที่ */}
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">1.2 การทดสอบการมองเห็นที่</p>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'deficient', label: 'ตาบอดสี', score: 0 },
                                        { value: 'normal', label: 'สายตาปกติ', score: 10 },
                                    ].map(opt => (
                                        <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                            visionTest.colorVision === opt.value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                                        }`}>
                                            <input type="radio" name="colorVision" value={opt.value}
                                                checked={visionTest.colorVision === opt.value}
                                                onChange={() => setVisionTest(v => ({ ...v, colorVision: opt.value as any }))}
                                                className="hidden" />
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${visionTest.colorVision === opt.value ? 'border-white bg-white' : 'border-slate-300'}`} />
                                            {opt.label}
                                            <span className="text-xs opacity-70">({opt.score} คะแนน)</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {/* 1.3 การได้ยิน */}
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">1.3 การได้ยิน</p>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'normal', label: 'ปกติ', score: 5 },
                                        { value: 'deficient', label: 'บกพร่อง', score: 0 },
                                    ].map(opt => (
                                        <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                            visionTest.hearing === opt.value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                                        }`}>
                                            <input type="radio" name="hearing" value={opt.value}
                                                checked={visionTest.hearing === opt.value}
                                                onChange={() => setVisionTest(v => ({ ...v, hearing: opt.value as any }))}
                                                className="hidden" />
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${visionTest.hearing === opt.value ? 'border-white bg-white' : 'border-slate-300'}`} />
                                            {opt.label}
                                            <span className="text-xs opacity-70">({opt.score} คะแนน)</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ส่วนที่ 2: สภาพจิตใจ */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-purple-600 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">ส่วนที่ 2 — สภาพจิตใจและการแก้ปัญหา</span>
                            <span className="text-white/80 text-xs">คะแนน {situationScore} / 30</span>
                        </div>
                        <div className="p-4 space-y-4 bg-purple-50/30">
                            {[
                                { q: '2.1 หากต้องส่งสินค้าเร่งด่วน ท่านคิดว่าท่านจะทำอย่างไร', val: situationQ1, setVal: setSituationQ1, score: situationQ1Score, setScore: setSituationQ1Score },
                                { q: '2.2 หากขับรถแล้วมีรถขับปาดหน้าท่านอย่างกะทันหัน ท่านจะแก้ปัญหาอย่างไร', val: situationQ2, setVal: setSituationQ2, score: situationQ2Score, setScore: setSituationQ2Score },
                                { q: '2.3 หากผู้โดยสารหรือผู้ร่วมทางโต้เถียงหรือสร้างความเครียดให้ท่าน ท่านจะจัดการอย่างไร', val: situationQ3, setVal: setSituationQ3, score: situationQ3Score, setScore: setSituationQ3Score },
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <p className="text-sm font-semibold text-slate-700 mb-1.5">{item.q}</p>
                                    <textarea
                                        value={item.val}
                                        onChange={e => item.setVal(e.target.value)}
                                        rows={2}
                                        placeholder="คำตอบของผู้ทดสอบ..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none mb-2"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">คะแนน (0-5):</span>
                                        {SCORE_OPTIONS.map(s => (
                                            <button key={s} type="button"
                                                onClick={() => item.setScore(s)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                                                    item.score === s
                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                                                }`}>
                                                {s}
                                            </button>
                                        ))}
                                        <span className="text-xs text-slate-400 ml-1">({item.score === 5 ? 'ดีเยี่ยม' : item.score >= 3 ? 'ผ่าน' : 'ต้องปรับปรุง'})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ส่วนที่ 3: การขับขี่ */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-teal-600 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">ส่วนที่ 3 — การทดการขับขี่</span>
                            <span className="text-white/80 text-xs">คะแนน {drivingScore} / 40</span>
                        </div>
                        <div className="p-4 bg-teal-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {DRIVING_ITEMS.map(item => (
                                    <div key={item.key} className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-3 py-2">
                                        <span className="text-sm text-slate-700">{item.label}</span>
                                        <div className="flex gap-1.5">
                                            {(['pass', 'fail'] as const).map(v => (
                                                <button key={v} type="button"
                                                    onClick={() => setDrivingChecklist(c => ({ ...c, [item.key]: v }))}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                        drivingChecklist[item.key] === v
                                                            ? v === 'pass' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}>
                                                    {v === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* คะแนนรวม */}
                    <div className={`rounded-xl border-2 p-4 ${scoreColor}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold">คะแนนรวมทั้งหมด</div>
                                <div className="text-xs opacity-70 mt-0.5">ส่วนที่ 1: {visionScore}/30 + ส่วนที่ 2: {situationScore}/30 + ส่วนที่ 3: {drivingScore}/40</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black">{totalScore}</div>
                                <div className="text-sm font-bold">{result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}</div>
                                <div className="text-xs opacity-70">(เกณฑ์ผ่าน ≥ 70 คะแนน)</div>
                            </div>
                        </div>
                    </div>

                    {/* ผู้อนุมัติ */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">การอนุมัติ</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้บังคับบัญชา</label>
                                <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                                    placeholder="ชื่อผู้บังคับบัญชา"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะอนุมัติ</label>
                                <div className="flex gap-2">
                                    {([
                                        { v: 'approved', label: '✓ อนุมัติ', cls: 'bg-emerald-600 text-white border-emerald-600' },
                                        { v: 'rejected', label: '✗ ไม่อนุมัติ', cls: 'bg-red-500 text-white border-red-500' },
                                        { v: 'pending', label: '⏳ รอดำเนินการ', cls: 'bg-amber-500 text-white border-amber-500' },
                                    ] as const).map(opt => (
                                        <button key={opt.v} type="button"
                                            onClick={() => setApprovalStatus(opt.v)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                approvalStatus === opt.v ? opt.cls : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* หมายเหตุ */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                        <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2}
                            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" />
                    </div>

                    {/* หลักฐาน */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">หลักฐานแนบ (รูปฟอร์มที่เซ็นแล้ว)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {evidenceFiles.map((url, i) => {
                                const isPdf = url.toLowerCase().includes('.pdf');
                                return isPdf ? (
                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100">
                                        📄 PDF [{i + 1}]
                                    </a>
                                ) : (
                                    <div key={i} className="relative group">
                                        <a href={url} target="_blank" rel="noreferrer"
                                            title={`หลักฐาน ${i + 1}`}
                                            className="block w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-300">
                                            <img src={url} alt={`หลักฐาน ${i + 1}`} className="w-full h-full object-cover" />
                                        </a>
                                        <button onClick={() => setEvidenceFiles(p => p.filter((_, j) => j !== i))}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                                    </div>
                                );
                            })}
                        </div>
                        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                            uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}>
                            {uploading ? '⏳ กำลังอัปโหลด...' : '📎 แนบไฟล์หลักฐาน'}
                            <input type="file" accept="image/*,.pdf" multiple disabled={uploading}
                                onChange={handleFileUpload} className="hidden" />
                        </label>
                        <label className={`ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                            uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                        }`}>
                            📷 ถ่ายรูป
                            <input type="file" accept="image/*" disabled={uploading}
                                onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t rounded-b-2xl flex items-center justify-between gap-3">
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${result === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {result === 'pass' ? `✓ ผ่าน ${totalScore} คะแนน` : `✗ ไม่ผ่าน ${totalScore} คะแนน`}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
                            ยกเลิก
                        </button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="px-6 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors disabled:opacity-50">
                            {saving ? 'กำลังบันทึก...' : '💾 บันทึกผล'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
