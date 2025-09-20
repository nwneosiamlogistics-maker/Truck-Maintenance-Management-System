
import React, { useState, useMemo } from 'react';
import type { UsedPartBuyer } from '../types';
import UsedPartBuyerModal from './UsedPartBuyerModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface UsedPartBuyerManagementProps {
    buyers: UsedPartBuyer[];
    setBuyers: React.Dispatch<React.SetStateAction<UsedPartBuyer[]>>;
}

const UsedPartBuyerManagement: React.FC<UsedPartBuyerManagementProps> = ({ buyers, setBuyers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingBuyer, setEditingBuyer] = useState<UsedPartBuyer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeBuyers = useMemo(() => Array.isArray(buyers) ? buyers : [], [buyers]);

    const filteredBuyers = useMemo(() => {
        return safeBuyers
            .filter(b =>
                searchTerm === '' ||
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
            setBuyers(prev => prev.map(b => b.id === buyerData.id ? buyerData : b));
            addToast(`อัปเดตข้อมูล ${buyerData.name} สำเร็จ`, 'success');
        } else { // Adding
            const newBuyer = { ...buyerData, id: `UPB-${Date.now()}` };
            setBuyers(prev => [newBuyer, ...prev]);
            addToast(`เพิ่มผู้รับซื้อ ${newBuyer.name} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteBuyer = (buyer: UsedPartBuyer) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${buyer.name}?`)) {
            setBuyers(prev => prev.filter(b => b.id !== buyer.id));
            addToast(`ลบ ${buyer.name} สำเร็จ`, 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (รหัส, ชื่อ, สินค้า)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                    + เพิ่มผู้รับซื้อ
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สินค้าที่รับซื้อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ติดต่อ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBuyers.map(buyer => (
                            <tr key={buyer.id}>
                                <td className="px-4 py-3"><div className="font-semibold">{buyer.name}</div><div className="text-sm text-gray-500 font-mono">{buyer.code}</div></td>
                                <td className="px-4 py-3 text-sm">{buyer.products}</td>
                                <td className="px-4 py-3 text-sm">
                                    {buyer.phone && <div>📞 {buyer.phone}</div>}
                                    {buyer.email && <div>✉️ {buyer.email}</div>}
                                </td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button onClick={() => handleOpenModal(buyer)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                    <button onClick={() => handleDeleteBuyer(buyer)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                </td>
                            </tr>
                        ))}
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
