import React, { useState, useMemo, useEffect } from 'react';
import type { RepairKPI, RepairCategoryMaster } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction, formatHoursDescriptive } from '../utils';
import * as XLSX from 'xlsx';

interface KPIModalProps {
    kpi: RepairKPI | null;
    onSave: (kpi: RepairKPI) => void;
    onClose: () => void;
    existingKpiData: RepairKPI[];
    repairCategories: RepairCategoryMaster[];
}

const KPIModal: React.FC<KPIModalProps> = ({ kpi, onSave, onClose, existingKpiData, repairCategories }) => {
    const safeCats = useMemo(() => (Array.isArray(repairCategories) ? repairCategories : []).filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [repairCategories]);

    const detectCatFromName = (catName: string) => {
        const mainName = catName.split(' > ')[0];
        return safeCats.find(c => c.nameTh === mainName) || null;
    };

    const detectSubFromName = (catName: string, parentCat: RepairCategoryMaster | null) => {
        if (!catName.includes(' > ') || !parentCat) return null;
        const subName = catName.split(' > ')[1];
        return (parentCat.subCategories || []).find(s => s.nameTh === subName) || null;
    };

    const getInitialState = (): Omit<RepairKPI, 'id'> => {
        if (kpi) return kpi;
        return { category: '', item: '', standardHours: 0, categoryCode: undefined, subCategoryCode: undefined };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('0');
    const { addToast } = useToast();

    const selectedMainCat = useMemo(() => {
        if (formData.categoryCode) return safeCats.find(c => c.code === formData.categoryCode) || null;
        return detectCatFromName(formData.category);
    }, [formData.categoryCode, formData.category, safeCats]);

    const activeSubs = useMemo(() => (selectedMainCat?.subCategories || []).filter(s => s.isActive), [selectedMainCat]);

    useEffect(() => {
        if (kpi) {
            const cat = kpi.categoryCode ? safeCats.find(c => c.code === kpi.categoryCode) : detectCatFromName(kpi.category);
            const sub = cat ? detectSubFromName(kpi.category, cat) : null;
            setFormData({
                ...kpi,
                categoryCode: cat?.code || kpi.categoryCode,
                subCategoryCode: sub?.code || kpi.subCategoryCode,
            });
            const h = Math.floor(kpi.standardHours);
            const m = Math.round((kpi.standardHours % 1) * 60);
            setHours(String(h));
            setMinutes(String(m));
        } else {
            setFormData(getInitialState());
            setHours('0');
            setMinutes('0');
        }
    }, [kpi]);

    const handleMainCatChange = (catCode: string) => {
        const cat = safeCats.find(c => c.code === catCode);
        if (!cat) {
            setFormData(prev => ({ ...prev, categoryCode: undefined, subCategoryCode: undefined, category: '' }));
            return;
        }
        setFormData(prev => ({ ...prev, categoryCode: cat.code, subCategoryCode: undefined, category: cat.nameTh }));
    };

    const handleSubCatChange = (subCode: string) => {
        if (!selectedMainCat) return;
        if (!subCode) {
            setFormData(prev => ({ ...prev, subCategoryCode: undefined, category: selectedMainCat.nameTh }));
            return;
        }
        const sub = (selectedMainCat.subCategories || []).find(s => s.code === subCode);
        if (sub) {
            setFormData(prev => ({ ...prev, subCategoryCode: sub.code, category: `${selectedMainCat.nameTh} > ${sub.nameTh}` }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.categoryCode) {
            addToast('กรุณาเลือกหมวดหมู่หลัก', 'warning');
            return;
        }
        if (!formData.item.trim()) {
            addToast('กรุณากรอกรายการซ่อม', 'warning');
            return;
        }

        const h = parseInt(hours, 10) || 0;
        const m = parseInt(minutes, 10) || 0;
        const totalStandardHours = h + (m / 60);

        if (totalStandardHours <= 0) {
            addToast('เวลามาตรฐานต้องมากกว่า 0', 'warning');
            return;
        }
        if (m >= 60) {
            addToast('นาทีต้องไม่เกิน 59', 'warning');
            return;
        }

        const isDuplicate = existingKpiData.some(
            item => item.id !== kpi?.id && item.item.trim().toLowerCase() === formData.item.trim().toLowerCase()
        );
        if (isDuplicate) {
            addToast('มีรายการซ่อมนี้อยู่ในระบบแล้ว', 'error');
            return;
        }

        onSave({ ...formData, standardHours: totalStandardHours, id: kpi?.id || '' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <form id="kpi-form" onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{kpi ? 'แก้ไข' : 'เพิ่ม'} KPI ใหม่</h3>
                        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium">หมวดหมู่หลัก *</label>
                            <select
                                value={formData.categoryCode || ''}
                                onChange={e => handleMainCatChange(e.target.value)}
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                aria-label="เลือกหมวดหมู่หลัก"
                            >
                                <option value="">🔧 เลือกหมวดหมู่หลัก...</option>
                                {safeCats.map(cat => (
                                    <option key={cat.code} value={cat.code}>{cat.icon} {cat.nameTh} ({cat.nameEn})</option>
                                ))}
                            </select>
                        </div>
                        {selectedMainCat && activeSubs.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium">หมวดย่อย</label>
                                <select
                                    value={formData.subCategoryCode || ''}
                                    onChange={e => handleSubCatChange(e.target.value)}
                                    className="mt-1 w-full p-2 border border-blue-300 bg-blue-50 rounded-lg"
                                    aria-label="เลือกหมวดย่อย"
                                >
                                    <option value="">📋 เลือกงานย่อย (ไม่บังคับ)...</option>
                                    {activeSubs.map(sub => (
                                        <option key={sub.code} value={sub.code}>▸ {sub.nameTh} ({sub.nameEn})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {formData.categoryCode && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-semibold">
                                    ✅ {formData.category}
                                </span>
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                    {formData.categoryCode}{formData.subCategoryCode ? ` / ${formData.subCategoryCode}` : ''}
                                </span>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium">รายการซ่อม *</label>
                            <input
                                type="text"
                                name="item"
                                value={formData.item}
                                onChange={handleInputChange}
                                required
                                aria-label="รายการซ่อม"
                                className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="เช่น เปลี่ยนถ่ายน้ำมันเครื่อง 15W-40"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">เวลามาตรฐาน *</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    min="0"
                                    aria-label="ชั่วโมง"
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                                <span>ชั่วโมง</span>
                                <input
                                    type="number"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    min="0"
                                    max="59"
                                    aria-label="นาที"
                                    step="1"
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                                <span>นาที</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                        <button type="submit" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface KPIManagementProps {
    kpiData: RepairKPI[];
    setKpiData: React.Dispatch<React.SetStateAction<RepairKPI[]>>;
    repairCategories: RepairCategoryMaster[];
}

const KPIManagement: React.FC<KPIManagementProps> = ({ kpiData, setKpiData, repairCategories }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingKPI, setEditingKPI] = useState<RepairKPI | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeKpiData = useMemo(() => Array.isArray(kpiData) ? kpiData : [], [kpiData]);

    const filteredKpiData = useMemo(() => {
        return safeKpiData
            .filter(kpi =>
                searchTerm === '' ||
                kpi.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kpi.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.category.localeCompare(b.category) || a.item.localeCompare(b.item));
    }, [safeKpiData, searchTerm]);

    const handleOpenModal = async (kpi: RepairKPI | null = null) => {
        if (kpi && !(await promptForPasswordAsync('แก้ไข'))) {
            return;
        }
        setEditingKPI(kpi);
        setIsModalOpen(true);
    };

    const handleSaveKPI = (kpi: RepairKPI) => {
        if (kpi.id) {
            setKpiData(prev => prev.map(item => item.id === kpi.id ? kpi : item));
            addToast(`อัปเดต KPI '${kpi.item}' สำเร็จ`, 'success');
        } else {
            const newKPI = { ...kpi, id: `kpi-${Date.now()}` };
            setKpiData(prev => [newKPI, ...prev]);
            addToast(`เพิ่ม KPI '${newKPI.item}' สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteKPI = async (kpi: RepairKPI) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `ยืนยันการลบ KPI '${kpi.item}'?`, 'ลบ');
            if (confirmed) {
                setKpiData(prev => prev.filter(item => item.id !== kpi.id));
                addToast(`ลบ KPI '${kpi.item}' สำเร็จ`, 'info');
            }
        }
    };

    const safeCats = useMemo(() => (Array.isArray(repairCategories) ? repairCategories : []).filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [repairCategories]);

    const unassignedCount = useMemo(() => safeKpiData.filter(k => !k.categoryCode).length, [safeKpiData]);

    const handleAutoAssignCategories = async () => {
        const unassigned = safeKpiData.filter(k => !k.categoryCode);
        if (unassigned.length === 0) {
            addToast('KPI ทุกรายการมีรหัสหมวดหมู่ครบแล้ว', 'info');
            return;
        }

        const confirmed = await confirmAction(
            'จัดหมวดหมู่อัตโนมัติ',
            `พบ KPI ${unassigned.length} รายการที่ยังไม่มีรหัสหมวดหมู่ ระบบจะจับคู่จากชื่อหมวดหมู่กับโครงสร้าง 13 หมวดหลักให้อัตโนมัติ`,
            'ดำเนินการ'
        );
        if (!confirmed) return;

        const buildKeywords = (): { code: string; subCode?: string; catName: string; keywords: string[] }[] => {
            const entries: { code: string; subCode?: string; catName: string; keywords: string[] }[] = [];
            for (const cat of safeCats) {
                const catKeywords = [cat.nameTh.toLowerCase(), cat.nameEn.toLowerCase()];
                entries.push({ code: cat.code, catName: cat.nameTh, keywords: catKeywords });
                for (const sub of (cat.subCategories || []).filter(s => s.isActive)) {
                    const subKeywords = [sub.nameTh.toLowerCase(), sub.nameEn.toLowerCase(), sub.code.toLowerCase()];
                    entries.push({ code: cat.code, subCode: sub.code, catName: `${cat.nameTh} > ${sub.nameTh}`, keywords: subKeywords });
                }
            }
            return entries;
        };

        const keywordEntries = buildKeywords();
        let assignedCount = 0;

        setKpiData(prev => prev.map(kpi => {
            if (kpi.categoryCode) return kpi;

            const catLower = (kpi.category || '').toLowerCase().trim();
            if (!catLower) return kpi;

            // 1. Try exact match on main category name
            const mainParts = catLower.split('>').map(s => s.trim());
            const mainName = mainParts[0];
            const subName = mainParts.length > 1 ? mainParts[1] : null;

            const exactMainMatch = safeCats.find(c =>
                c.nameTh.toLowerCase() === mainName || c.nameEn.toLowerCase() === mainName
            );

            if (exactMainMatch) {
                let subMatch = null;
                if (subName) {
                    subMatch = (exactMainMatch.subCategories || []).find(s =>
                        s.nameTh.toLowerCase() === subName || s.nameEn.toLowerCase() === subName
                    );
                }
                assignedCount++;
                return {
                    ...kpi,
                    categoryCode: exactMainMatch.code,
                    subCategoryCode: subMatch?.code,
                    category: subMatch ? `${exactMainMatch.nameTh} > ${subMatch.nameTh}` : exactMainMatch.nameTh,
                };
            }

            // 2. Try keyword/substring matching
            let bestMatch: { code: string; subCode?: string; catName: string } | null = null;
            let bestScore = 0;

            for (const entry of keywordEntries) {
                for (const kw of entry.keywords) {
                    if (catLower.includes(kw) || kw.includes(catLower)) {
                        const score = entry.subCode ? 2 : 1; // prefer sub-category match
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = entry;
                        }
                    }
                }
            }

            if (bestMatch) {
                assignedCount++;
                return {
                    ...kpi,
                    categoryCode: bestMatch.code as any,
                    subCategoryCode: bestMatch.subCode,
                    category: bestMatch.catName,
                };
            }

            // 3. Fallback: assign to OTH (อื่นๆ)
            assignedCount++;
            return {
                ...kpi,
                categoryCode: 'OTH' as any,
                subCategoryCode: 'OTH-GEN',
                category: `อื่นๆ > งานทั่วไป`,
            };
        }));

        addToast(`จัดหมวดหมู่อัตโนมัติสำเร็จ ${assignedCount} รายการ`, 'success');
    };

    const handleExportExcel = () => {
        if (filteredKpiData.length === 0) {
            addToast('ไม่มีข้อมูล KPI สำหรับ Export', 'warning');
            return;
        }
        const data = filteredKpiData.map((kpi, idx) => ({
            'ลำดับ': idx + 1,
            'รหัสหมวด': kpi.categoryCode || '',
            'รหัสย่อย': kpi.subCategoryCode || '',
            'หมวดหมู่': kpi.category,
            'รายการซ่อม': kpi.item,
            'เวลามาตรฐาน (ชม.)': Number(kpi.standardHours.toFixed(2)),
            'เวลามาตรฐาน (แสดง)': formatHoursDescriptive(kpi.standardHours, 8),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 40 }, { wch: 18 }, { wch: 22 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KPI Data');
        XLSX.writeFile(wb, `KPI_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
        addToast(`Export KPI ${filteredKpiData.length} รายการ สำเร็จ`, 'success');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-3">
                <input type="text" aria-label="ค้นหา KPI" placeholder="ค้นหา (รายการซ่อม, หมวดหมู่)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base" />
                <div className="flex items-center gap-2">
                    {unassignedCount > 0 && (
                        <button onClick={handleAutoAssignCategories} className="px-4 py-2 text-base font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 whitespace-nowrap flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            จัดหมวดอัตโนมัติ ({unassignedCount})
                        </button>
                    )}
                    <button onClick={handleExportExcel} className="px-4 py-2 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 whitespace-nowrap flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Excel
                    </button>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">+ เพิ่ม KPI ใหม่</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase w-20">รหัส</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายการซ่อม</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">เวลามาตรฐาน</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredKpiData.map(kpi => (
                            <tr key={kpi.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded font-bold">
                                        {kpi.categoryCode || '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{kpi.category}</td>
                                <td className="px-4 py-3 font-semibold">{kpi.item}</td>
                                <td className="px-4 py-3 text-right font-bold">{formatHoursDescriptive(kpi.standardHours, 8)}</td>
                                <td className="px-4 py-3 text-center space-x-4">
                                    <button onClick={() => handleOpenModal(kpi)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteKPI(kpi)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                        {filteredKpiData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูล KPI</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <KPIModal
                    kpi={editingKPI}
                    onSave={handleSaveKPI}
                    onClose={() => setIsModalOpen(false)}
                    existingKpiData={safeKpiData}
                    repairCategories={repairCategories}
                />
            )}
        </div>
    );
};

export default KPIManagement;