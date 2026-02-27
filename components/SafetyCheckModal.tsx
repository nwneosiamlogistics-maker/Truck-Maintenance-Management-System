import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SafetyCheck, SafetyCheckAttendee, SafetyCheckType, SafetyCheckMethod, Driver } from '../types';
import { uploadFilesToStorage } from '../utils/fileUpload';

const ALCOHOL_LIMIT = 0; // Zero tolerance: > 0 = fail

interface Props {
    drivers: Driver[];
    editCheck?: SafetyCheck | null;
    onSave: (check: SafetyCheck) => void;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const METHOD_OPTIONS: { value: SafetyCheckMethod; label: string }[] = [
    { value: 'breathalyzer', label: 'เครื่องวัดแอลกอฮอล์ (Breathalyzer)' },
    { value: 'urine', label: 'ตรวจปัสสาวะ (Urine Test)' },
    { value: 'blood', label: 'ตรวจเลือด (Blood Test)' },
];

export default function SafetyCheckModal({ drivers, editCheck, onSave, onClose, onToast }: Props) {
    const today = new Date().toISOString().split('T')[0];

    const [type, setType] = useState<SafetyCheckType>(editCheck?.type ?? 'alcohol');
    const [method, setMethod] = useState<SafetyCheckMethod>(
        editCheck?.method ?? (type === 'alcohol' ? 'breathalyzer' : 'urine')
    );
    const [date, setDate] = useState(editCheck?.date ?? today);
    const [location, setLocation] = useState(editCheck?.location ?? '');
    const [auditor, setAuditor] = useState(editCheck?.auditor ?? '');
    const [remark, setRemark] = useState(editCheck?.remark ?? '');

    // attendees state — keyed by driverId
    const [attendees, setAttendees] = useState<Map<string, SafetyCheckAttendee>>(() => {
        const m = new Map<string, SafetyCheckAttendee>();
        if (editCheck) editCheck.attendees.forEach(a => m.set(a.driverId, { ...a }));
        return m;
    });

    const [evidenceFiles, setEvidenceFiles] = useState<string[]>(editCheck?.evidenceFiles ?? []);
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const toggleDriver = (driver: Driver) => {
        setAttendees(prev => {
            const m = new Map(prev);
            if (m.has(driver.id)) {
                m.delete(driver.id);
            } else {
                m.set(driver.id, {
                    driverId: driver.id,
                    employeeId: driver.employeeId,
                    name: driver.name,
                    position: 'พนักงานขับรถ',
                    company: 'บริษัทนีโอสยาม โลจิสติกส์ฯ',
                    alcoholLevel: undefined,
                    result: 'pass',
                    remark: '',
                });
            }
            return m;
        });
    };

    const selectAll = () => {
        setAttendees(() => {
            const m = new Map<string, SafetyCheckAttendee>();
            drivers.forEach(d => {
                m.set(d.id, {
                    driverId: d.id,
                    employeeId: d.employeeId,
                    name: d.name,
                    position: 'พนักงานขับรถ',
                    company: 'บริษัทนีโอสยาม โลจิสติกส์ฯ',
                    result: 'pass',
                });
            });
            return m;
        });
    };

    const clearAll = () => setAttendees(new Map());

    const setAlcoholLevel = (driverId: string, val: string) => {
        const num = parseFloat(val);
        const level = isNaN(num) ? 0 : num;
        const result = level > ALCOHOL_LIMIT ? 'fail' : 'pass';
        setAttendees(prev => {
            const m = new Map(prev);
            const a = m.get(driverId);
            if (a) m.set(driverId, { ...a, alcoholLevel: level, result });
            return m;
        });
    };

    const setSubstanceResult = (driverId: string, result: 'pass' | 'fail') => {
        setAttendees(prev => {
            const m = new Map(prev);
            const a = m.get(driverId);
            if (a) m.set(driverId, { ...a, result });
            return m;
        });
    };

    const setAttendeeRemark = (driverId: string, val: string) => {
        setAttendees(prev => {
            const m = new Map(prev);
            const a = m.get(driverId);
            if (a) m.set(driverId, { ...a, remark: val });
            return m;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []).filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
            const ok = f.type.startsWith('image/') || f.type === 'application/pdf' || ext === 'pdf';
            return ok;
        });
        if (files.length > 0) setUploadingFiles(prev => [...prev, ...files]);
        e.target.value = '';
    };

    const removeUploadingFile = (idx: number) => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const removeEvidenceFile = (idx: number) => {
        setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUpload = async () => {
        if (uploadingFiles.length === 0) return;
        setUploading(true);
        try {
            const checkId = editCheck?.id ?? `SC-${Date.now()}`;
            const yr = new Date(date).getFullYear();
            const basePath = `truck-maintenance/safety-checks/${yr}/${checkId}`;
            const urls = await uploadFilesToStorage(uploadingFiles, basePath);
            setEvidenceFiles(prev => [...prev, ...urls]);
            setUploadingFiles([]);
            onToast(`อัปโหลด ${urls.length} ไฟล์สำเร็จ`, 'success');
        } catch (err) {
            console.error('[SafetyCheckModal] upload error:', err);
            onToast('อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!date || !location || !auditor) {
            onToast('กรุณากรอกวันที่ สถานที่ และผู้ตรวจให้ครบถ้วน', 'error');
            return;
        }
        if (attendees.size === 0) {
            onToast('กรุณาเลือกพนักงานอย่างน้อย 1 คน', 'error');
            return;
        }
        setSaving(true);
        try {
            const checkId = editCheck?.id ?? `SC-${Date.now()}`;
            // Auto-upload pending files before saving
            let finalEvidenceFiles = [...evidenceFiles];
            if (uploadingFiles.length > 0) {
                onToast(`กำลังอัปโหลด ${uploadingFiles.length} ไฟล์ไปยัง NAS...`, 'info');
                const yr = new Date(date).getFullYear();
                const basePath = `truck-maintenance/safety-checks/${yr}/${checkId}`;
                const uploaded = await uploadFilesToStorage(uploadingFiles, basePath);
                finalEvidenceFiles = [...finalEvidenceFiles, ...uploaded];
                setUploadingFiles([]);
                setEvidenceFiles(finalEvidenceFiles);
            }
            const cleanAttendees: SafetyCheckAttendee[] = Array.from(attendees.values()).map(a => {
                const base: SafetyCheckAttendee = {
                    driverId: a.driverId,
                    employeeId: a.employeeId,
                    name: a.name,
                    position: a.position,
                    company: a.company,
                    result: a.result,
                };
                if (a.alcoholLevel !== undefined) base.alcoholLevel = a.alcoholLevel;
                if (a.remark) base.remark = a.remark;
                return base;
            });
            const check: SafetyCheck = {
                id: checkId,
                date,
                location,
                auditor,
                type,
                method,
                attendees: cleanAttendees,
                evidenceFiles: finalEvidenceFiles,
                ...(remark ? { remark } : {}),
                createdAt: editCheck?.createdAt ?? new Date().toISOString(),
                ...(editCheck?.createdBy ? { createdBy: editCheck.createdBy } : {}),
            };
            onSave(check);
            onToast(`บันทึกผลการตรวจ${type === 'alcohol' ? 'แอลกอฮอล์' : 'สารเสพติด'}สำเร็จ`, 'success');
            onClose();
        } catch (err) {
            console.error('[SafetyCheckModal] save error:', err);
            onToast('บันทึกไม่สำเร็จ: ' + String(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    const failCount = Array.from(attendees.values()).filter(a => a.result === 'fail').length;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className={`px-6 py-4 rounded-t-2xl flex items-center justify-between ${type === 'alcohol' ? 'bg-blue-700' : 'bg-purple-700'}`}>
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {type === 'alcohol' ? '🍺 ตรวจวัดระดับแอลกอฮอล์' : '💊 ตรวจสารเสพติด'}
                        </h2>
                        <p className="text-white/70 text-sm mt-0.5">
                            {editCheck ? 'แก้ไขบันทึกการตรวจ' : 'บันทึกผลการตรวจใหม่'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none">×</button>
                </div>

                {/* Type Toggle */}
                <div className="px-6 pt-4 flex gap-2">
                    <button onClick={() => { setType('alcohol'); setMethod('breathalyzer'); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${type === 'alcohol' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        🍺 ตรวจแอลกอฮอล์
                    </button>
                    <button onClick={() => { setType('substance'); setMethod('urine'); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${type === 'substance' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        💊 ตรวจสารเสพติด
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่ตรวจ *</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                aria-label="วันที่ตรวจ"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">วิธีตรวจ</label>
                            <select value={method} onChange={e => setMethod(e.target.value as SafetyCheckMethod)}
                                aria-label="วิธีตรวจ"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {METHOD_OPTIONS.filter(m =>
                                    type === 'alcohol' ? m.value === 'breathalyzer' : m.value !== 'breathalyzer'
                                ).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">สถานที่ *</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                                placeholder="เช่น อู่รถ สำนักงาน"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้ตรวจ *</label>
                            <input type="text" value={auditor} onChange={e => setAuditor(e.target.value)}
                                placeholder="ชื่อ-สกุล ผู้ตรวจ"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>

                    {/* Driver Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-700">
                                เลือกพนักงาน ({attendees.size}/{drivers.length} คน)
                                {failCount > 0 && <span className="ml-2 text-red-600">⚠ ไม่ผ่าน {failCount} คน</span>}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">เลือกทั้งหมด</button>
                                <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">ล้างทั้งหมด</button>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left w-10"></th>
                                        <th className="px-3 py-2 text-left">รหัส</th>
                                        <th className="px-3 py-2 text-left">ชื่อ-สกุล</th>
                                        <th className="px-3 py-2 text-center">
                                            {type === 'alcohol' ? 'ระดับแอลกอฮอล์ (mg%)' : 'ผลตรวจ (Found/Not Found)'}
                                        </th>
                                        <th className="px-3 py-2 text-center w-20">สถานะ</th>
                                        <th className="px-3 py-2 text-left">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map((driver, idx) => {
                                        const att = attendees.get(driver.id);
                                        const checked = !!att;
                                        return (
                                            <tr key={driver.id} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${att?.result === 'fail' ? 'bg-red-50' : ''}`}>
                                                <td className="px-3 py-2 text-center">
                                                    <input type="checkbox" checked={checked}
                                                        onChange={() => toggleDriver(driver)}
                                                        aria-label={`เลือก ${driver.name}`}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 text-xs">{driver.employeeId}</td>
                                                <td className="px-3 py-2 font-medium text-slate-800">{driver.name}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {checked && type === 'alcohol' && (
                                                        <input type="number" min="0" step="0.01"
                                                            value={att?.alcoholLevel ?? ''}
                                                            onChange={e => setAlcoholLevel(driver.id, e.target.value)}
                                                            aria-label={`ระดับแอลกอฮอล์ ${driver.name}`}
                                                            placeholder="0.00"
                                                            className={`w-24 border rounded-lg px-2 py-1 text-sm text-center ${att?.result === 'fail' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
                                                    )}
                                                    {checked && type === 'substance' && (
                                                        <select value={att?.result}
                                                            onChange={e => setSubstanceResult(driver.id, e.target.value as 'pass' | 'fail')}
                                                            aria-label={`ผลตรวจสารเสพติด ${driver.name}`}
                                                            className={`border rounded-lg px-2 py-1 text-sm ${att?.result === 'fail' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200'}`}>
                                                            <option value="pass">✓ Not Found (ผ่าน)</option>
                                                            <option value="fail">✗ Found (ไม่ผ่าน)</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {checked && (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${att?.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {att?.result === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {checked && (
                                                        <input type="text" value={att?.remark ?? ''}
                                                            onChange={e => setAttendeeRemark(driver.id, e.target.value)}
                                                            placeholder="หมายเหตุ"
                                                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Evidence Upload */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">หลักฐาน (รูปถ่าย / PDF)</label>
                        <div className="flex items-center gap-3 flex-wrap">
                                <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl border border-dashed border-slate-300 transition-colors">
                                📎 เลือกไฟล์ / PDF
                                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                            </label>
                            <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-xl border border-dashed border-blue-200 transition-colors">
                                📷 ถ่ายรูป
                                <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                            </label>
                            {uploadingFiles.length > 0 && (
                                <button onClick={handleUpload} disabled={uploading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow transition-colors">
                                    {uploading ? '⏳ กำลังอัปโหลด...' : `⬆ อัปโหลด ${uploadingFiles.length} ไฟล์`}
                                </button>
                            )}
                        </div>
                        {/* Pending files */}
                        {uploadingFiles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {uploadingFiles.map((f, i) => (
                                    <div key={i} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs text-amber-700">
                                        <span>{f.name.slice(0, 24)}{f.name.length > 24 ? '…' : ''}</span>
                                        <button onClick={() => removeUploadingFile(i)} className="ml-1 text-amber-500 hover:text-red-500 font-bold">×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Uploaded files */}
                        {evidenceFiles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {evidenceFiles.map((url, i) => {
                                    const isPDF = url.toLowerCase().includes('.pdf');
                                    return (
                                        <div key={i} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1 text-xs text-green-700">
                                            {isPDF ? (
                                                <a href={url} target="_blank" rel="noreferrer" className="hover:underline">📄 PDF {i + 1}</a>
                                            ) : (
                                                <a href={url} target="_blank" rel="noreferrer">
                                                    <img src={url} alt={`evidence-${i}`} className="w-10 h-10 object-cover rounded" />
                                                </a>
                                            )}
                                            <button onClick={() => removeEvidenceFile(i)} className="ml-1 text-green-500 hover:text-red-500 font-bold">×</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Remark */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุรวม</label>
                        <input type="text" value={remark} onChange={e => setRemark(e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        เลือก {attendees.size} คน
                        {failCount > 0 && <span className="ml-2 text-red-600 font-bold">⚠ ไม่ผ่าน {failCount} คน</span>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                            ยกเลิก
                        </button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow transition-colors">
                            {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
