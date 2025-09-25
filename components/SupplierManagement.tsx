
import React, { useState, useMemo } from 'react';
import type { Supplier } from '../types';
import SupplierModal from './SupplierModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

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
