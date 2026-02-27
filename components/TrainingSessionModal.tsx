import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { SafetyTopic, TrainingSession, TrainingPlan, Driver } from '../types';
import { uploadFileToStorage } from '../utils/fileUpload';
import { useToast } from '../context/ToastContext';

interface TrainingSessionModalProps {
    topic: SafetyTopic;
    year: number;
    drivers: Driver[];
    sessions: TrainingSession[];
    plans: TrainingPlan[];
    onClose: () => void;
    onSaveSession: (session: TrainingSession) => void;
    onUpdatePlans: (plans: TrainingPlan[]) => void;
    /** If editing existing session */
    existingSession?: TrainingSession;
}

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtDate = (d?: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${String(dt.getDate()).padStart(2,'0')} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
};

const TrainingSessionModal: React.FC<TrainingSessionModalProps> = ({
    topic, year, drivers, sessions, plans,
    onClose, onSaveSession, onUpdatePlans, existingSession
}) => {
    const { addToast } = useToast();
    const now = new Date().toISOString().split('T')[0];

    const [mode, setMode] = useState<'session' | 'done'>(existingSession ? 'done' : 'session');
    const [sessionForm, setSessionForm] = useState({
        startDate: existingSession?.startDate ?? now,
        endDate: existingSession?.endDate ?? now,
        trainer: existingSession?.trainer ?? '',
        location: existingSession?.location ?? '',
        capacity: existingSession?.capacity ?? 0,
        note: existingSession?.note ?? '',
    });
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>(existingSession?.attendeeIds ?? []);
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<string[]>(existingSession?.evidencePhotos ?? []);
    const [doneForm, setDoneForm] = useState({
        actualDate: now,
        trainer: existingSession?.trainer ?? '',
        note: '',
    });
    const [perDriverScores, setPerDriverScores] = useState<Record<string, { preTest: string; postTest: string }>>({});
    const [driverSearch, setDriverSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // กรอง driver ตาม topic target
    const eligibleDrivers = useMemo(() => {
        return drivers.filter(d => {
            if (topic.target === 'all') return true;
            const hire = d.hireDate ? new Date(d.hireDate) : null;
            if (topic.target === 'new_employee') return hire && hire.getFullYear() === year;
            if (topic.target === 'existing_employee') return !hire || hire.getFullYear() !== year;
            return true;
        });
    }, [drivers, topic, year]);

    const filteredDrivers = useMemo(() =>
        eligibleDrivers.filter(d =>
            d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
            d.employeeId.toLowerCase().includes(driverSearch.toLowerCase())
        ), [eligibleDrivers, driverSearch]);

    const toggleDriver = (id: string) =>
        setSelectedDriverIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const selectAll = () => setSelectedDriverIds(filteredDrivers.map(d => d.id));
    const clearAll = () => setSelectedDriverIds([]);

    const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        setEvidenceFiles(prev => [...prev, ...files]);
    };

    const handleSubmit = async () => {
        if (!sessionForm.trainer.trim()) {
            addToast('กรุณาระบุวิทยากร', 'error'); return;
        }
        if (selectedDriverIds.length === 0) {
            addToast('กรุณาเลือกผู้เข้าอบรมอย่างน้อย 1 คน', 'error'); return;
        }
        setIsSubmitting(true);
        try {
            // อัปโหลดหลักฐาน → NAS
            const uploadedUrls: string[] = [...existingPhotos];
            for (const file of evidenceFiles) {
                const sessionId = existingSession?.id ?? `TMP-${Date.now()}`;
                const path = `truck-maintenance/training/${year}/${topic.id}/${sessionId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
                const url = await uploadFileToStorage(file, path);
                if (url) uploadedUrls.push(url);
            }

            const sessionId = existingSession?.id ?? `SES-${Date.now()}`;
            const session: TrainingSession = {
                id: sessionId,
                year,
                topicId: topic.id,
                topicCode: topic.code,
                startDate: sessionForm.startDate,
                endDate: sessionForm.endDate,
                trainer: sessionForm.trainer,
                location: sessionForm.location,
                capacity: sessionForm.capacity || undefined,
                attendeeIds: selectedDriverIds,
                evidencePhotos: uploadedUrls,
                note: sessionForm.note,
                createdAt: existingSession?.createdAt ?? new Date().toISOString(),
                createdBy: 'Admin',
            };
            onSaveSession(session);

            // อัปเดต TrainingPlan ของแต่ละ driver
            const nowIso = new Date().toISOString();
            const updatedPlans: TrainingPlan[] = [];
            const isMarkDone = mode === 'done';

            for (const driverId of selectedDriverIds) {
                const existingPlan = plans.find(p =>
                    p.driverId === driverId &&
                    p.topicId === topic.id &&
                    p.year === year
                );

                const scores = perDriverScores[driverId];

                const nextDueDate = isMarkDone && (topic.code === 'defensive' || topic.code === 'defensive_refresh')
                    ? (() => {
                        const d = new Date(doneForm.actualDate);
                        d.setFullYear(d.getFullYear() + 1);
                        return d.toISOString().split('T')[0];
                    })()
                    : undefined;

                if (existingPlan) {
                    updatedPlans.push({
                        ...existingPlan,
                        sessionId,
                        bookingDate: existingPlan.bookingDate ?? sessionForm.startDate,
                        status: isMarkDone ? 'done' : 'booked',
                        actualDate: isMarkDone ? doneForm.actualDate : existingPlan.actualDate,
                        trainer: sessionForm.trainer,
                        preTest: scores?.preTest ? Number(scores.preTest) : existingPlan.preTest,
                        postTest: scores?.postTest ? Number(scores.postTest) : existingPlan.postTest,
                        evidencePhotos: uploadedUrls,
                        nextDueDate: nextDueDate ?? existingPlan.nextDueDate,
                        note: doneForm.note || existingPlan.note,
                        updatedAt: nowIso,
                    });
                } else {
                    updatedPlans.push({
                        id: `PLN-${driverId}-${topic.id}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
                        year,
                        driverId,
                        topicId: topic.id,
                        topicCode: topic.code,
                        dueDate: topic.windowEnd,
                        sessionId,
                        bookingDate: sessionForm.startDate,
                        status: isMarkDone ? 'done' : 'booked',
                        actualDate: isMarkDone ? doneForm.actualDate : undefined,
                        trainer: sessionForm.trainer,
                        preTest: scores?.preTest ? Number(scores.preTest) : undefined,
                        postTest: scores?.postTest ? Number(scores.postTest) : undefined,
                        evidencePhotos: uploadedUrls,
                        nextDueDate,
                        note: doneForm.note,
                        createdAt: nowIso,
                        updatedAt: nowIso,
                    });
                }
            }

            onUpdatePlans(updatedPlans);
            addToast(isMarkDone ? 'บันทึกผลการอบรมสำเร็จ' : 'จองรอบอบรมสำเร็จ', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            addToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const doneCount = plans.filter(p => p.topicId === topic.id && p.year === year && p.status === 'done').length;
    const totalEligible = eligibleDrivers.length;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-green-50 to-teal-50 rounded-t-2xl flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{topic.name}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            ช่วงเวลา: {fmtDate(topic.windowStart)} – {fmtDate(topic.windowEnd)}
                            &nbsp;•&nbsp; ทำแล้ว {doneCount}/{totalEligible} คน
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
                </div>

                {/* Mode Toggle */}
                <div className="px-6 pt-4 flex gap-2">
                    <button
                        onClick={() => setMode('session')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === 'session' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >📅 จองรอบอบรม</button>
                    <button
                        onClick={() => setMode('done')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === 'done' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >✓ บันทึกผลสำเร็จ</button>
                </div>

                <div className="px-6 py-4 space-y-5">
                    {/* Session Details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่จัด *</label>
                            <input type="date" value={sessionForm.startDate} onChange={e => setSessionForm(p => ({ ...p, startDate: e.target.value }))}
                                aria-label="วันที่จัด" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่สิ้นสุด</label>
                            <input type="date" value={sessionForm.endDate} onChange={e => setSessionForm(p => ({ ...p, endDate: e.target.value }))}
                                aria-label="วันที่สิ้นสุด" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">วิทยากร *</label>
                            <input type="text" value={sessionForm.trainer} onChange={e => setSessionForm(p => ({ ...p, trainer: e.target.value }))}
                                placeholder="ชื่อวิทยากร" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">สถานที่</label>
                            <input type="text" value={sessionForm.location} onChange={e => setSessionForm(p => ({ ...p, location: e.target.value }))}
                                placeholder="สถานที่อบรม" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        {mode === 'done' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่อบรมจริง *</label>
                                <input type="date" value={doneForm.actualDate} onChange={e => setDoneForm(p => ({ ...p, actualDate: e.target.value }))}
                                    aria-label="วันที่อบรมจริง" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                            <input type="text" value={sessionForm.note} onChange={e => setSessionForm(p => ({ ...p, note: e.target.value }))}
                                placeholder="หมายเหตุเพิ่มเติม" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>

                    {/* อัปโหลดหลักฐาน */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">หลักฐาน/รูปถ่าย (อัปโหลดไป NAS)</label>
                        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg px-4 py-3 text-sm text-slate-500 hover:text-blue-500 transition-colors">
                            <span>📎</span> คลิกเพื่อเลือกรูป/ไฟล์
                            <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleEvidenceChange} />
                        </label>
                        {(evidenceFiles.length > 0 || existingPhotos.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {existingPhotos.map((url, i) => (
                                    <div key={i} className="relative group">
                                        <img src={url} alt={`evidence-${i}`} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                                        <button onClick={() => setExistingPhotos(prev => prev.filter((_, j) => j !== i))}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                ))}
                                {evidenceFiles.map((f, i) => (
                                    <div key={`new-${i}`} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-lg">
                                        📎 {f.name.slice(0, 15)}{f.name.length > 15 ? '…' : ''}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* เลือกผู้เข้าร่วม */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-slate-600">ผู้เข้าอบรม ({selectedDriverIds.length}/{eligibleDrivers.length})</label>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">เลือกทั้งหมด</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={clearAll} className="text-xs text-red-500 hover:underline">ล้าง</button>
                            </div>
                        </div>
                        <input type="text" placeholder="ค้นหาชื่อ/รหัส..." value={driverSearch}
                            onChange={e => setDriverSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm mb-2" />
                        <div className="border border-slate-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="w-8 px-3 py-2"></th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">รหัส</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">ชื่อ</th>
                                        {mode === 'done' && <>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Pre</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Post</th>
                                        </>}
                                        <th className="px-3 py-2 text-center font-semibold text-slate-600">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredDrivers.map(driver => {
                                        const plan = plans.find(p => p.driverId === driver.id && p.topicId === topic.id && p.year === year);
                                        const isSelected = selectedDriverIds.includes(driver.id);
                                        const statusColor = plan?.status === 'done' ? 'text-green-600 bg-green-50' :
                                            plan?.status === 'overdue' ? 'text-red-600 bg-red-50' :
                                            plan?.status === 'booked' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50';
                                        const statusLabel = plan?.status === 'done' ? '✓ สำเร็จ' :
                                            plan?.status === 'overdue' ? '⚠ เกินกำหนด' :
                                            plan?.status === 'booked' ? 'B จอง' : '• แผน';
                                        return (
                                            <tr key={driver.id} className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => toggleDriver(driver.id)}>
                                                <td className="px-3 py-2 text-center">
                                                    <input type="checkbox" checked={isSelected} readOnly className="rounded" aria-label={`เลือก ${driver.name}`} />
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs text-slate-500">{driver.employeeId}</td>
                                                <td className="px-3 py-2 font-medium text-slate-700">{driver.name}</td>
                                                {mode === 'done' && (
                                                    <>
                                                        <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                                                            <input type="number" min={0} max={100} placeholder="-"
                                                                aria-label={`คะแนน Pre Test ของ ${driver.name}`}
                                                                value={perDriverScores[driver.id]?.preTest ?? ''}
                                                                onChange={e => setPerDriverScores(prev => ({ ...prev, [driver.id]: { ...prev[driver.id], preTest: e.target.value } }))}
                                                                className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs text-center" />
                                                        </td>
                                                        <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                                                            <input type="number" min={0} max={100} placeholder="-"
                                                                aria-label={`คะแนน Post Test ของ ${driver.name}`}
                                                                value={perDriverScores[driver.id]?.postTest ?? ''}
                                                                onChange={e => setPerDriverScores(prev => ({ ...prev, [driver.id]: { ...prev[driver.id], postTest: e.target.value } }))}
                                                                className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs text-center" />
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSubmitting}
                        className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
                        ยกเลิก
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className={`px-6 py-2 text-sm font-bold text-white rounded-xl shadow transition-all disabled:opacity-50 ${mode === 'done' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isSubmitting ? 'กำลังบันทึก…' : mode === 'done' ? '✓ บันทึกผลสำเร็จ' : '📅 บันทึกการจอง'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TrainingSessionModal;
