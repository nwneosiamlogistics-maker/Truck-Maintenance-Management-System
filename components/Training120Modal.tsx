import React, { useState } from 'react';
import type { Driver } from '../types';
import { uploadToNAS } from '../utils/nasUpload';

interface Training120ModalProps {
    driver: Driver;
    onSave: (patch: Partial<NonNullable<Driver['defensiveDriving']>>) => void;
    onClose: () => void;
}

const Training120Modal: React.FC<Training120ModalProps> = ({ driver, onSave, onClose }) => {
    const [trainingDate, setTrainingDate] = useState(driver.defensiveDriving?.trainingDate || '');
    const [trainer, setTrainer] = useState(driver.defensiveDriving?.trainer || '');
    const [provider, setProvider] = useState(driver.defensiveDriving?.provider || '');
    const [note, setNote] = useState(driver.defensiveDriving?.note || '');
    const [files, setFiles] = useState<{ id: string; name: string; url: string; type: 'image' | 'pdf'; }[]>(driver.defensiveDriving?.evidence || []);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const ts = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `training/120days/${driver.id}/${ts}_${safeName}`;
            const url = await uploadToNAS(file, path);
            if (url) {
                setFiles(prev => [...prev, { id: `${ts}`, name: safeName, url, type: file.type === 'application/pdf' ? 'pdf' : 'image' }]);
            }
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSave = () => {
        onSave({
            trainingDate: trainingDate || undefined,
            trainer: trainer || undefined,
            provider: provider || undefined,
            note: note || undefined,
            evidence: files.map(f => ({ ...f, uploadedAt: new Date().toISOString() })),
            status: trainingDate ? 'completed' : undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">บันทึกอบรมภายใน 120 วัน</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">วันที่อบรมจริง</label>
                        <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" title="เลือกวันที่อบรมจริง" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Trainer</label>
                            <input type="text" value={trainer} onChange={e => setTrainer(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="ระบุชื่อผู้สอน" title="ระบุชื่อผู้สอน" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Provider</label>
                            <input type="text" value={provider} onChange={e => setProvider(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="บริษัท/ผู้ให้บริการ" title="บริษัท/ผู้ให้บริการ" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุ</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="รายละเอียดเพิ่มเติม" title="รายละเอียดเพิ่มเติม"></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">หลักฐาน (NAS)</label>
                        <div className="flex items-center gap-2">
                            <label className="px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">
                                อัปโหลด
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
                            </label>
                            {uploading && <span className="text-xs text-blue-600">กำลังอัปโหลด...</span>}
                        </div>
                        <div className="mt-2 space-y-1">
                            {files.length === 0 && <div className="text-xs text-slate-400">ยังไม่มีไฟล์</div>}
                            {files.map(f => (
                                <div key={f.id} className="flex items-center justify-between text-sm border border-slate-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">{f.type === 'pdf' ? '📄' : '🖼️'}</span>
                                        <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{f.name}</a>
                                    </div>
                                    <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:text-red-600">ลบ</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">ยกเลิก</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={uploading}>บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default Training120Modal;
