import React, { useState, useMemo, useCallback } from 'react';
import type { SafetyTopic, TrainingSession, TrainingPlan, Driver } from '../types';
import { uploadFilesToStorage } from '../utils/fileUpload';
import { useToast } from '../context/ToastContext';

interface Props {
    topic: SafetyTopic;
    drivers: Driver[];
    existingSession?: TrainingSession | null;
    existingPlans: TrainingPlan[];
    year: number;
    onSave: (session: TrainingSession, plans: TrainingPlan[]) => void;
    onClose: () => void;
}

export default function TrainingActualModal({
    topic, drivers, existingSession, existingPlans, year, onSave, onClose
}: Props) {
    const { addToast } = useToast();

    // session fields
    const [actualDate, setActualDate] = useState(existingSession?.startDate ?? new Date().toISOString().split('T')[0]);
    const [trainer, setTrainer] = useState(existingSession?.trainer ?? '');
    const [location, setLocation] = useState(existingSession?.location ?? '');
    const [note, setNote] = useState(existingSession?.note ?? '');
    const [evidencePhotos, setEvidencePhotos] = useState<string[]>(existingSession?.evidencePhotos ?? []);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // attendees: Map<driverId, { preTest, postTest }>
    const [attendees, setAttendees] = useState<Map<string, { preTest: string; postTest: string }>>(() => {
        const m = new Map<string, { preTest: string; postTest: string }>();
        if (existingSession) {
            existingSession.attendeeIds.forEach(id => {
                const plan = existingPlans.find(p => p.driverId === id && p.sessionId === existingSession.id);
                m.set(id, { preTest: String(plan?.preTest ?? ''), postTest: String(plan?.postTest ?? '') });
            });
        }
        return m;
    });

    const activeDrivers = useMemo(() => {
        return drivers.filter(d => d.status === 'active').sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }, [drivers]);

    const toggleAttendee = useCallback((driverId: string) => {
        setAttendees(prev => {
            const next = new Map(prev);
            if (next.has(driverId)) next.delete(driverId);
            else next.set(driverId, { preTest: '', postTest: '' });
            return next;
        });
    }, []);

    const updateScore = useCallback((driverId: string, field: 'preTest' | 'postTest', value: string) => {
        setAttendees(prev => {
            const next = new Map(prev);
            const cur = next.get(driverId) ?? { preTest: '', postTest: '' };
            next.set(driverId, { ...cur, [field]: value });
            return next;
        });
    }, []);

    const selectAll = () => {
        setAttendees(prev => {
            const next = new Map(prev);
            activeDrivers.forEach(d => {
                if (!next.has(d.id)) next.set(d.id, { preTest: '', postTest: '' });
            });
            return next;
        });
    };

    const clearAll = () => setAttendees(new Map());

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setUploading(true);
        try {
            const sessionId = existingSession?.id ?? `SES-${topic.id}-${Date.now()}`;
            const urls = await uploadFilesToStorage(files, `truck-maintenance/training/${sessionId}`);
            setEvidencePhotos(prev => [...prev, ...urls]);
            addToast(`อัปโหลด ${urls.length} ไฟล์สำเร็จ`, 'success');
        } catch {
            addToast('อัปโหลดไม่สำเร็จ', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!actualDate) { addToast('กรุณาระบุวันที่อบรมจริง', 'warning'); return; }
        if (!trainer.trim()) { addToast('กรุณาระบุวิทยากร/ผู้สอน', 'warning'); return; }
        if (attendees.size === 0) { addToast('กรุณาเลือกผู้เข้าอบรมอย่างน้อย 1 คน', 'warning'); return; }

        setSaving(true);
        try {
            const now = new Date().toISOString();
            const sessionId = existingSession?.id ?? `SES-${topic.id}-${Date.now()}`;

            const session: TrainingSession = {
                id: sessionId,
                year,
                topicId: topic.id,
                topicCode: topic.code,
                startDate: actualDate,
                endDate: actualDate,
                trainer: trainer.trim(),
                location: location.trim() || undefined,
                capacity: attendees.size,
                attendeeIds: Array.from(attendees.keys()),
                evidencePhotos,
                note: note.trim() || undefined,
                createdAt: existingSession?.createdAt ?? now,
            };

            // สร้าง/อัปเดต TrainingPlan สำหรับแต่ละ driver ที่เข้าอบรม
            const updatedPlans: TrainingPlan[] = [];
            const attendeeEntries = Array.from(attendees.entries());

            for (const [driverId, scores] of attendeeEntries) {
                const existing = existingPlans.find(
                    p => p.driverId === driverId && p.topicId === topic.id && p.year === year
                );
                const pre = scores.preTest !== '' ? Number(scores.preTest) : undefined;
                const post = scores.postTest !== '' ? Number(scores.postTest) : undefined;

                if (existing) {
                    updatedPlans.push({
                        ...existing,
                        status: 'done',
                        actualDate,
                        sessionId,
                        trainer: trainer.trim(),
                        preTest: pre,
                        postTest: post,
                        updatedAt: now,
                    });
                } else {
                    // สร้างใหม่ถ้ายังไม่มีแผน
                    updatedPlans.push({
                        id: `PLN-${driverId}-${topic.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                        year,
                        driverId,
                        topicId: topic.id,
                        topicCode: topic.code,
                        dueDate: topic.windowEnd,
                        status: 'done',
                        actualDate,
                        sessionId,
                        trainer: trainer.trim(),
                        preTest: pre,
                        postTest: post,
                        evidencePhotos: [],
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }

            onSave(session, updatedPlans);
            addToast(`บันทึกการอบรม "${topic.name}" สำเร็จ — ${attendees.size} คน`, 'success');
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const quarterLabel = topic.code.includes('q1') ? 'Q1' : topic.code.includes('q2') ? 'Q2' : topic.code.includes('q3') ? 'Q3' : topic.code.includes('q4') ? 'Q4' : '';
    const headerColor = quarterLabel === 'Q1' ? 'bg-blue-700' : quarterLabel === 'Q2' ? 'bg-green-700' : quarterLabel === 'Q3' ? 'bg-amber-600' : quarterLabel === 'Q4' ? 'bg-purple-700' : 'bg-cyan-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className={`${headerColor} text-white px-5 py-4 rounded-t-2xl flex items-start justify-between`}>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-lg">📋</span>
                            <span className="font-bold text-base">บันทึกการอบรมจริง</span>
                            {quarterLabel && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{quarterLabel}</span>}
                        </div>
                        <p className="text-white/80 text-sm">{topic.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none ml-3">×</button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-4">

                    {/* Session Info */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">ข้อมูลการอบรม</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่อบรมจริง <span className="text-red-500">*</span></label>
                                <input type="date" value={actualDate} onChange={e => setActualDate(e.target.value)}
                                    title="วันที่อบรมจริง"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">วิทยากร / ผู้สอน <span className="text-red-500">*</span></label>
                                <input type="text" value={trainer} onChange={e => setTrainer(e.target.value)}
                                    placeholder="ชื่อวิทยากร"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">สถานที่</label>
                                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                                    placeholder="ห้องประชุม / สถานที่"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="หมายเหตุเพิ่มเติม"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                        </div>
                    </div>

                    {/* Attendees */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-emerald-700 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">ผู้เข้าอบรม ({attendees.size} คน)</span>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs transition-colors">เลือกทั้งหมด</button>
                                <button onClick={clearAll} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs transition-colors">ล้าง</button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-8"></th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">ชื่อพนักงาน</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-24">Pre-test<br/><span className="font-normal text-slate-400">(คะแนน)</span></th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-24">Post-test<br/><span className="font-normal text-slate-400">(คะแนน)</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeDrivers.map((driver, idx) => {
                                        const isChecked = attendees.has(driver.id);
                                        const scores = attendees.get(driver.id);
                                        return (
                                            <tr key={driver.id} className={`border-t border-slate-100 ${isChecked ? 'bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                                <td className="px-3 py-1.5 text-center">
                                                    <input type="checkbox" checked={isChecked} onChange={() => toggleAttendee(driver.id)}
                                                        title={`เลือก ${driver.name}`}
                                                        className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`font-medium ${isChecked ? 'text-emerald-800' : 'text-slate-600'}`}>{driver.name}</span>
                                                    <span className="text-slate-400 ml-1.5">{driver.employeeId}</span>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="number" min="0" max="100"
                                                        value={scores?.preTest ?? ''}
                                                        onChange={e => updateScore(driver.id, 'preTest', e.target.value)}
                                                        disabled={!isChecked}
                                                        title="Pre-test score"
                                                        placeholder="-"
                                                        className="w-full px-2 py-1 border border-slate-200 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300 disabled:bg-slate-50 disabled:text-slate-300" />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="number" min="0" max="100"
                                                        value={scores?.postTest ?? ''}
                                                        onChange={e => updateScore(driver.id, 'postTest', e.target.value)}
                                                        disabled={!isChecked}
                                                        title="Post-test score"
                                                        placeholder="-"
                                                        className="w-full px-2 py-1 border border-slate-200 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300 disabled:bg-slate-50 disabled:text-slate-300" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Evidence Files */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-600 mb-3">หลักฐานการอบรม (ภาพ / PDF)</h3>
                        {evidencePhotos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {evidencePhotos.map((url, i) => {
                                    const isPdf = url.toLowerCase().includes('.pdf');
                                    return isPdf ? (
                                        <a key={i} href={url} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100">
                                            📄 PDF [{i + 1}]
                                        </a>
                                    ) : (
                                        <div key={i} className="relative group">
                                            <a href={url} target="_blank" rel="noreferrer" title={`หลักฐาน ${i + 1}`}
                                                className="block w-14 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-300">
                                                <img src={url} alt={`หลักฐาน ${i + 1}`} className="w-full h-full object-cover" />
                                            </a>
                                            <button onClick={() => setEvidencePhotos(p => p.filter((_, j) => j !== i))}
                                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                            {uploading ? '⏳ กำลังอัปโหลด...' : '📎 แนบหลักฐาน'}
                            <input type="file" accept="image/*,.pdf" multiple disabled={uploading} onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t rounded-b-2xl flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                        {attendees.size > 0 ? (
                            <span className="text-emerald-700 font-semibold">✓ เลือก {attendees.size} คน</span>
                        ) : (
                            <span className="text-slate-400">ยังไม่ได้เลือกผู้เข้าอบรม</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 transition-colors">ยกเลิก</button>
                        <button onClick={handleSave} disabled={saving || uploading}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors shadow">
                            {saving ? '⏳ กำลังบันทึก...' : '✓ บันทึกการอบรม'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
