import React, { useState, useMemo } from 'react';
import type { Supplier } from '../types';
import { SupplierModal } from './SupplierModal';
import { useToast } from '../context/ToastContext';

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
            .filter(s => searchTerm === '' ||
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
        } else { // Adding new
            const newSupplier = { ...supplierData, id: `SUP-${Date.now()}` };
            setSuppliers(prev => [newSupplier, ...prev]);
            addToast(`เพิ่ม ${newSupplier.name} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteSupplier = (supplierId: string, name: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้จำหน่าย "${name}"?`)) {
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            addToast(`ลบ "${name}" สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (ชื่อ, รหัส, สินค้า/บริการ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มผู้จำหน่ายใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่อผู้จำหน่าย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สินค้า/บริการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เบอร์โทร</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อีเมล</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSuppliers.map(supplier => (
                            <tr key={supplier.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-sm">{supplier.code}</td>
                                <td className="px-4 py-3 font-semibold text-base">{supplier.name}</td>
                                <td className="px-4 py-3 text-base text-gray-600 max-w-xs truncate">{supplier.services}</td>
                                <td className="px-4 py-3 text-base">{supplier.phone || '-'}</td>
                                <td className="px-4 py-3 text-base">{supplier.email || '-'}</td>
                                <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                                    <button onClick={() => handleOpenModal(supplier)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteSupplier(supplier.id, supplier.name)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                        {filteredSuppliers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">ไม่พบข้อมูลผู้จำหน่าย</td>
                            </tr>
                        )}
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