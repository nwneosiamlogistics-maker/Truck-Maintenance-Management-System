import React, { useState, useMemo } from 'react';
import type { UsedPartBuyer } from '../types';
import UsedPartBuyerModal from './UsedPartBuyerModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface UsedPartBuyerManagementProps {
    usedPartBuyers: UsedPartBuyer[];
    setUsedPartBuyers: React.Dispatch<React.SetStateAction<UsedPartBuyer[]>>;
}

const UsedPartBuyerManagement: React.FC<UsedPartBuyerManagementProps> = ({ usedPartBuyers, setUsedPartBuyers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingBuyer, setEditingBuyer] = useState<UsedPartBuyer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeBuyers = useMemo(() => Array.isArray(usedPartBuyers) ? usedPartBuyers : [], [usedPartBuyers]);

    const filteredBuyers = useMemo(() => {
        return safeBuyers
            .filter(b => searchTerm === '' ||
                b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.products.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }, [safeBuyers, searchTerm]);

    const handleOpenModal = (buyer: UsedPartBuyer | null = null) => {
        setEditingBuyer(buyer);
        setIsModalOpen(true);
    };

    const handleSaveBuyer = (buyerData: UsedPartBuyer) => {
        if (buyerData.id) { // Editing
            setUsedPartBuyers(prev => prev.map(b => b.id === buyerData.id ? buyerData : b));
            addToast(`อัปเดตข้อมูล ${buyerData.name} สำเร็จ`, 'success');
        } else { // Adding new
            const newBuyer = { ...buyerData, id: `UPB-${Date.now()}` };
            setUsedPartBuyers(prev => [newBuyer, ...prev]);
            addToast(`เพิ่ม ${newBuyer.name} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteBuyer = (buyerId: string, name: string) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้รับซื้อ "${name}"?`)) {
            setUsedPartBuyers(prev => prev.filter(b => b.id !== buyerId));
            addToast(`ลบ "${name}" สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (ชื่อ, รหัส, สินค้า)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มผู้รับซื้อใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่อผู้รับซื้อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สินค้าที่รับซื้อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เบอร์โทร</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อีเมล</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBuyers.map(buyer => (
                            <tr key={buyer.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-sm">{buyer.code}</td>
                                <td className="px-4 py-3 font-semibold text-base">{buyer.name}</td>
                                <td className="px-4 py-3 text-base text-gray-600 max-w-xs truncate">{buyer.products}</td>
                                <td className="px-4 py-3 text-base">{buyer.phone || '-'}</td>
                                <td className="px-4 py-3 text-base">{buyer.email || '-'}</td>
                                <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                                    <button onClick={() => handleOpenModal(buyer)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteBuyer(buyer.id, buyer.name)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
                        {filteredBuyers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">ไม่พบข้อมูลผู้รับซื้อ</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>

            {isModalOpen && (
                <UsedPartBuyerModal
                    buyer={editingBuyer}
                    onSave={handleSaveBuyer}
                    onClose={() => setIsModalOpen(false)}
                    existingBuyers={safeBuyers}
                />
            )}
        </div>
    );
};

export default UsedPartBuyerManagement;