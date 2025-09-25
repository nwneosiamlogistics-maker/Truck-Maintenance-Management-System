import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface SupplierModalProps {
    supplier: Supplier | null;
    onSave: (supplier: Supplier) => void;
    onClose: () => void;
    existingSuppliers: Supplier[];
}

const SupplierModal: React.FC<SupplierModalProps> = ({ supplier, onSave, onClose, existingSuppliers }) => {
    const getInitialState = (): Omit<Supplier, 'id'> => {
        return supplier || {
            code: '',
            name: '',
            services: '',
            address: null,
            phone: null,
            email: null,
            otherContacts: null,
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(getInitialState());
    }, [supplier]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            addToast('กรุณากรอกรหัสและชื่อผู้จำหน่าย', 'warning');
            return;
        }

        const isDuplicate = existingSuppliers.some(s =>
            s.id !== supplier?.id && (
                s.code.trim().toLowerCase() === formData.code.trim().toLowerCase() ||
                s.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
            )
        );

        if (isDuplicate) {
            addToast('รหัสหรือชื่อผู้จำหน่ายนี้มีอยู่แล้ว', 'error');
            return;
        }
        
        onSave({ ...formData, id: supplier?.id || '' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{supplier ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลผู้จำหน่าย</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="supplier-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium">รหัส *</label>
                            <input type="text" name="code" value={formData.code || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">ชื่อผู้จำหน่าย *</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">สินค้า/บริการ</label>
                        <input type="text" name="services" value={formData.services || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">ที่อยู่</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">เบอร์โทรศัพท์</label>
                            <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">อีเมล</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">ช่องทางติดต่ออื่นๆ (Line, Facebook)</label>
                        <input type="text" name="otherContacts" value={formData.otherContacts || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="supplier-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

interface SupplierManagementProps {
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({ suppliers, setSuppliers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeSuppliers = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);

    const filteredSuppliers = useMemo(() => {
        return safeSuppliers
            .filter(s =>
                searchTerm === '' ||
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.services.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }, [safeSuppliers, searchTerm]);

    const handleOpenModal = (supplier: Supplier | null = null) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleSaveSupplier = (supplierData: Supplier) => {
        if (supplierData.id) { // Editing
            setSuppliers(prev => prev.map(s => s.id === supplierData.id ? supplierData : s));
            addToast(`อัปเดตข้อมูล ${supplierData.name} สำเร็จ`, 'success');
        } else { // Adding
            const newSupplier = { ...supplierData, id: `SUP-${Date.now()}` };
            setSuppliers(prev => [newSupplier, ...prev]);
            addToast(`เพิ่มผู้จำหน่าย ${newSupplier.name} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteSupplier = (supplier: Supplier) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${supplier.name}?`)) {
            setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
            addToast(`ลบ ${supplier.name} สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (รหัส, ชื่อ, บริการ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                    + เพิ่มผู้จำหน่าย
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สินค้า/บริการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ติดต่อ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSuppliers.map(supplier => (
                            <tr key={supplier.id}>
                                <td className="px-4 py-3"><div className="font-semibold">{supplier.name}</div><div className="text-sm text-gray-500 font-mono">{supplier.code}</div></td>
                                <td className="px-4 py-3 text-sm">{supplier.services}</td>
                                <td className="px-4 py-3 text-sm">
                                    {supplier.phone && <div>📞 {supplier.phone}</div>}
                                    {supplier.email && <div>✉️ {supplier.email}</div>}
                                </td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button onClick={() => handleOpenModal(supplier)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteSupplier(supplier)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <SupplierModal
                    supplier={editingSupplier}
                    onSave={handleSaveSupplier}
                    onClose={() => setIsModalOpen(false)}
                    existingSuppliers={safeSuppliers}
                />
            )}
        </div>
    );
};

export default SupplierManagement;