import React, { useState, useMemo } from 'react';
import type { RepairCategoryMaster, RepairSubCategory, RepairCategoryCode } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';

interface Props {
    repairCategories: RepairCategoryMaster[];
    setRepairCategories: React.Dispatch<React.SetStateAction<RepairCategoryMaster[]>>;
}

const RepairCategoryManagement: React.FC<Props> = ({ repairCategories, setRepairCategories }) => {
    const { addToast } = useToast();
    const safeCategories = useMemo(() => Array.isArray(repairCategories) ? repairCategories : [], [repairCategories]);

    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [editingCat, setEditingCat] = useState<RepairCategoryMaster | null>(null);
    const [editingSub, setEditingSub] = useState<RepairSubCategory | null>(null);
    const [editingSubParent, setEditingSubParent] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- New Category Modal ---
    const [isNewCatOpen, setIsNewCatOpen] = useState(false);
    const [newCat, setNewCat] = useState({ code: '', nameTh: '', nameEn: '', icon: '🔧' });

    // --- New Sub Category Modal ---
    const [isNewSubOpen, setIsNewSubOpen] = useState(false);
    const [newSubParent, setNewSubParent] = useState<string>('');
    const [newSub, setNewSub] = useState({ code: '', nameTh: '', nameEn: '', suggestedParts: '' });

    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return safeCategories.sort((a, b) => a.sortOrder - b.sortOrder);
        const term = searchTerm.toLowerCase();
        return safeCategories.filter(c =>
            c.code.toLowerCase().includes(term) ||
            c.nameTh.includes(term) ||
            c.nameEn.toLowerCase().includes(term) ||
            c.subCategories.some(s => s.nameTh.includes(term) || s.nameEn.toLowerCase().includes(term) || s.code.toLowerCase().includes(term))
        ).sort((a, b) => a.sortOrder - b.sortOrder);
    }, [safeCategories, searchTerm]);

    const totalSubs = safeCategories.reduce((sum, c) => sum + (c.subCategories?.length || 0), 0);
    const activeCount = safeCategories.filter(c => c.isActive).length;

    // ==================== CRUD: Main Category ====================

    const handleAddCategory = async () => {
        if (!newCat.code.trim() || !newCat.nameTh.trim() || !newCat.nameEn.trim()) {
            addToast('กรุณากรอกข้อมูลให้ครบ', 'warning');
            return;
        }
        const codeUpper = newCat.code.toUpperCase().trim();
        if (safeCategories.some(c => c.code === codeUpper)) {
            addToast(`รหัส ${codeUpper} มีอยู่แล้ว`, 'error');
            return;
        }
        const newCategory: RepairCategoryMaster = {
            id: `CAT-${codeUpper}`,
            code: codeUpper as RepairCategoryCode,
            nameTh: newCat.nameTh.trim(),
            nameEn: newCat.nameEn.trim(),
            icon: newCat.icon || '🔧',
            isActive: true,
            sortOrder: safeCategories.length + 1,
            subCategories: [],
        };
        setRepairCategories(prev => [...(Array.isArray(prev) ? prev : []), newCategory]);
        addToast(`เพิ่มหมวดหมู่ ${newCat.nameTh} สำเร็จ`, 'success');
        setNewCat({ code: '', nameTh: '', nameEn: '', icon: '🔧' });
        setIsNewCatOpen(false);
    };

    const handleUpdateCategory = async (cat: RepairCategoryMaster) => {
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === cat.id ? cat : c));
        addToast(`อัปเดตหมวดหมู่ ${cat.nameTh} สำเร็จ`, 'success');
        setEditingCat(null);
    };

    const handleToggleCategory = (catId: string) => {
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c =>
            c.id === catId ? { ...c, isActive: !c.isActive } : c
        ));
    };

    const handleDeleteCategory = async (cat: RepairCategoryMaster) => {
        const confirmed = await confirmAction('ลบหมวดหมู่', `ยืนยันลบ "${cat.nameTh}" และหมวดย่อยทั้งหมด?`);
        if (!confirmed) return;
        const pwdOk = await promptForPasswordAsync('ลบหมวดหมู่');
        if (!pwdOk) return;
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== cat.id));
        addToast(`ลบหมวดหมู่ ${cat.nameTh} สำเร็จ`, 'success');
    };

    // ==================== CRUD: Sub Category ====================

    const handleAddSubCategory = () => {
        if (!newSub.code.trim() || !newSub.nameTh.trim() || !newSub.nameEn.trim() || !newSubParent) {
            addToast('กรุณากรอกข้อมูลให้ครบ', 'warning');
            return;
        }
        const parentCat = safeCategories.find(c => c.id === newSubParent);
        if (!parentCat) return;

        const subCode = newSub.code.toUpperCase().trim();
        if (parentCat.subCategories.some(s => s.code === subCode)) {
            addToast(`รหัส ${subCode} มีอยู่แล้วในหมวด ${parentCat.nameTh}`, 'error');
            return;
        }

        const newSubCat: RepairSubCategory = {
            id: subCode,
            code: subCode,
            nameTh: newSub.nameTh.trim(),
            nameEn: newSub.nameEn.trim(),
            parentCode: parentCat.code,
            suggestedParts: newSub.suggestedParts ? newSub.suggestedParts.split(',').map(s => s.trim()).filter(Boolean) : [],
            isActive: true,
        };

        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c =>
            c.id === newSubParent ? { ...c, subCategories: [...c.subCategories, newSubCat] } : c
        ));
        addToast(`เพิ่มหมวดย่อย ${newSub.nameTh} สำเร็จ`, 'success');
        setNewSub({ code: '', nameTh: '', nameEn: '', suggestedParts: '' });
        setIsNewSubOpen(false);
    };

    const handleUpdateSubCategory = (parentId: string, sub: RepairSubCategory) => {
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c =>
            c.id === parentId ? { ...c, subCategories: c.subCategories.map(s => s.id === sub.id ? sub : s) } : c
        ));
        addToast(`อัปเดต ${sub.nameTh} สำเร็จ`, 'success');
        setEditingSub(null);
        setEditingSubParent(null);
    };

    const handleToggleSub = (parentId: string, subId: string) => {
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c =>
            c.id === parentId ? { ...c, subCategories: c.subCategories.map(s => s.id === subId ? { ...s, isActive: !s.isActive } : s) } : c
        ));
    };

    const handleDeleteSub = async (parentId: string, sub: RepairSubCategory) => {
        const confirmed = await confirmAction('ลบหมวดย่อย', `ยืนยันลบ "${sub.nameTh}"?`);
        if (!confirmed) return;
        setRepairCategories(prev => (Array.isArray(prev) ? prev : []).map(c =>
            c.id === parentId ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sub.id) } : c
        ));
        addToast(`ลบ ${sub.nameTh} สำเร็จ`, 'success');
    };

    // ==================== RENDER ====================

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
                    <div className="text-3xl font-black text-blue-600">{safeCategories.length}</div>
                    <div className="text-sm text-gray-500">หมวดหมู่หลัก</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
                    <div className="text-3xl font-black text-emerald-600">{totalSubs}</div>
                    <div className="text-sm text-gray-500">หมวดย่อยทั้งหมด</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
                    <div className="text-3xl font-black text-amber-600">{activeCount}/{safeCategories.length}</div>
                    <div className="text-sm text-gray-500">เปิดใช้งาน</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-3">
                <input
                    type="text"
                    placeholder="ค้นหา (รหัส, ชื่อหมวด, ชื่อหมวดย่อย)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                    aria-label="ค้นหาหมวดหมู่"
                />
                <button
                    onClick={() => setIsNewCatOpen(true)}
                    className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                    + เพิ่มหมวดหมู่หลัก
                </button>
            </div>

            {/* Category List */}
            <div className="space-y-3">
                {filteredCategories.map(cat => (
                    <div key={cat.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cat.isActive ? 'border-blue-500' : 'border-gray-300 opacity-60'}`}>
                        {/* Category Header */}
                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{cat.icon}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">{cat.code}</span>
                                        <span className="font-bold text-lg">{cat.nameTh}</span>
                                        <span className="text-gray-400 text-sm">({cat.nameEn})</span>
                                    </div>
                                    <div className="text-sm text-gray-500">{cat.subCategories?.length || 0} หมวดย่อย</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={e => { e.stopPropagation(); handleToggleCategory(cat.id); }}
                                    className={`px-3 py-1 text-xs rounded-full font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {cat.isActive ? 'เปิด' : 'ปิด'}
                                </button>
                                <button onClick={e => { e.stopPropagation(); setEditingCat({ ...cat }); }}
                                    className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200">แก้ไข</button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200">ลบ</button>
                                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedCat === cat.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Sub Categories (Expanded) */}
                        {expandedCat === cat.id && (
                            <div className="border-t bg-gray-50 p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm text-gray-600">หมวดย่อยของ {cat.nameTh}</h4>
                                    <button onClick={() => { setNewSubParent(cat.id); setIsNewSubOpen(true); }}
                                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                                        + เพิ่มหมวดย่อย
                                    </button>
                                </div>
                                {(!cat.subCategories || cat.subCategories.length === 0) ? (
                                    <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีหมวดย่อย</p>
                                ) : (
                                    <div className="space-y-2">
                                        {cat.subCategories.map(sub => (
                                            <div key={sub.id} className={`bg-white rounded-xl p-3 flex items-center justify-between ${!sub.isActive ? 'opacity-50' : ''}`}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded">{sub.code}</span>
                                                        <span className="font-medium">{sub.nameTh}</span>
                                                        <span className="text-gray-400 text-xs">({sub.nameEn})</span>
                                                    </div>
                                                    {sub.suggestedParts && sub.suggestedParts.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {sub.suggestedParts.map((p, i) => (
                                                                <span key={i} className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">{p}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleToggleSub(cat.id, sub.id)}
                                                        className={`px-2 py-0.5 text-xs rounded-full ${sub.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {sub.isActive ? 'เปิด' : 'ปิด'}
                                                    </button>
                                                    <button onClick={() => { setEditingSub({ ...sub }); setEditingSubParent(cat.id); }}
                                                        className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200">แก้ไข</button>
                                                    <button onClick={() => handleDeleteSub(cat.id, sub)}
                                                        className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200">ลบ</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filteredCategories.length === 0 && (
                    <div className="text-center py-12 text-gray-400">ไม่พบหมวดหมู่ที่ค้นหา</div>
                )}
            </div>

            {/* ==================== Modal: New Category ==================== */}
            {isNewCatOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIsNewCatOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b"><h3 className="text-lg font-bold">เพิ่มหมวดหมู่หลักใหม่</h3></div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">รหัสหมวด (3 ตัวอักษร) *</label>
                                <input type="text" maxLength={3} value={newCat.code} onChange={e => setNewCat(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                    className="w-full p-2 border rounded-lg uppercase" placeholder="เช่น ENG, BRK" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาไทย *</label>
                                <input type="text" value={newCat.nameTh} onChange={e => setNewCat(p => ({ ...p, nameTh: e.target.value }))}
                                    className="w-full p-2 border rounded-lg" placeholder="เช่น เครื่องยนต์" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาอังกฤษ *</label>
                                <input type="text" value={newCat.nameEn} onChange={e => setNewCat(p => ({ ...p, nameEn: e.target.value }))}
                                    className="w-full p-2 border rounded-lg" placeholder="เช่น Engine" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ไอคอน (Emoji)</label>
                                <input type="text" value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))}
                                    className="w-20 p-2 border rounded-lg text-center text-2xl" aria-label="ไอคอน" />
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-2">
                            <button onClick={() => setIsNewCatOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                            <button onClick={handleAddCategory} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Modal: Edit Category ==================== */}
            {editingCat && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingCat(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b"><h3 className="text-lg font-bold">แก้ไขหมวดหมู่: {editingCat.code}</h3></div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาไทย *</label>
                                <input type="text" value={editingCat.nameTh} onChange={e => setEditingCat(p => p ? { ...p, nameTh: e.target.value } : p)}
                                    className="w-full p-2 border rounded-lg" aria-label="ชื่อภาษาไทย" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาอังกฤษ *</label>
                                <input type="text" value={editingCat.nameEn} onChange={e => setEditingCat(p => p ? { ...p, nameEn: e.target.value } : p)}
                                    className="w-full p-2 border rounded-lg" aria-label="ชื่อภาษาอังกฤษ" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ไอคอน</label>
                                <input type="text" value={editingCat.icon} onChange={e => setEditingCat(p => p ? { ...p, icon: e.target.value } : p)}
                                    className="w-20 p-2 border rounded-lg text-center text-2xl" aria-label="ไอคอน" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ลำดับ</label>
                                <input type="number" value={editingCat.sortOrder} onChange={e => setEditingCat(p => p ? { ...p, sortOrder: Number(e.target.value) } : p)}
                                    className="w-24 p-2 border rounded-lg" aria-label="ลำดับ" />
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-2">
                            <button onClick={() => setEditingCat(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                            <button onClick={() => handleUpdateCategory(editingCat)} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Modal: New Sub Category ==================== */}
            {isNewSubOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIsNewSubOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b"><h3 className="text-lg font-bold">เพิ่มหมวดย่อย</h3></div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">รหัส (เช่น ENG-OIL) *</label>
                                <input type="text" value={newSub.code} onChange={e => setNewSub(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                    className="w-full p-2 border rounded-lg uppercase" placeholder="เช่น ENG-OIL" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาไทย *</label>
                                <input type="text" value={newSub.nameTh} onChange={e => setNewSub(p => ({ ...p, nameTh: e.target.value }))}
                                    className="w-full p-2 border rounded-lg" placeholder="เช่น เปลี่ยนน้ำมันเครื่อง" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาอังกฤษ *</label>
                                <input type="text" value={newSub.nameEn} onChange={e => setNewSub(p => ({ ...p, nameEn: e.target.value }))}
                                    className="w-full p-2 border rounded-lg" placeholder="เช่น Oil Change" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">อะไหล่แนะนำ (คั่นด้วย ,)</label>
                                <input type="text" value={newSub.suggestedParts} onChange={e => setNewSub(p => ({ ...p, suggestedParts: e.target.value }))}
                                    className="w-full p-2 border rounded-lg" placeholder="เช่น น้ำมันเครื่อง, ไส้กรอง" />
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-2">
                            <button onClick={() => setIsNewSubOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                            <button onClick={handleAddSubCategory} className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Modal: Edit Sub Category ==================== */}
            {editingSub && editingSubParent && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setEditingSub(null); setEditingSubParent(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b"><h3 className="text-lg font-bold">แก้ไขหมวดย่อย: {editingSub.code}</h3></div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาไทย *</label>
                                <input type="text" value={editingSub.nameTh} onChange={e => setEditingSub(p => p ? { ...p, nameTh: e.target.value } : p)}
                                    className="w-full p-2 border rounded-lg" aria-label="ชื่อหมวดย่อยภาษาไทย" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อภาษาอังกฤษ *</label>
                                <input type="text" value={editingSub.nameEn} onChange={e => setEditingSub(p => p ? { ...p, nameEn: e.target.value } : p)}
                                    className="w-full p-2 border rounded-lg" aria-label="ชื่อหมวดย่อยภาษาอังกฤษ" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">อะไหล่แนะนำ (คั่นด้วย ,)</label>
                                <input type="text" value={(editingSub.suggestedParts || []).join(', ')}
                                    onChange={e => setEditingSub(p => p ? { ...p, suggestedParts: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : p)}
                                    className="w-full p-2 border rounded-lg" aria-label="อะไหล่แนะนำ" />
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-2">
                            <button onClick={() => { setEditingSub(null); setEditingSubParent(null); }} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                            <button onClick={() => handleUpdateSubCategory(editingSubParent, editingSub)} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepairCategoryManagement;
