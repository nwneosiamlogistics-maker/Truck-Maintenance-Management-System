
import React, { useState, useMemo } from 'react';
import type { StockItem } from '../types';
import StockModal from './StockModal';
import AddStockModal from './AddStockModal';
import { useToast } from '../context/ToastContext';

interface StockManagementProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    updateStockItem: (item: StockItem) => void;
    deleteStockItem: (itemId: string) => void;
    addStock: (data: {
      stockItem: StockItem;
      quantityAdded: number;
      pricePerUnit?: number;
      requisitionNumber?: string;
      invoiceNumber?: string;
      notes?: string;
    }) => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ stock, setStock, updateStockItem, deleteStockItem, addStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [itemToAddStock, setItemToAddStock] = useState<StockItem | null>(null);
    
    const { addToast } = useToast();

    const filteredStock = useMemo(() => {
        return stock
            .filter(item => statusFilter === 'all' || item.status === statusFilter)
            .filter(item => 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [stock, searchTerm, statusFilter]);

    const getStatusBadge = (status: StockItem['status']) => {
        switch (status) {
            case 'ปกติ': return 'bg-green-100 text-green-800';
            case 'สต๊อกต่ำ': return 'bg-yellow-100 text-yellow-800';
            case 'สต๊อกเกิน': return 'bg-purple-100 text-purple-800';
            case 'หมดสต๊อก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleOpenEditModal = (item: StockItem | null = null) => {
        setEditingItem(item);
        setEditModalOpen(true);
    };
    
    const handleOpenAddModal = (item: StockItem) => {
        setItemToAddStock(item);
        setAddModalOpen(true);
    };

    const handleSaveStock = (item: StockItem) => {
        if (editingItem) {
            updateStockItem(item);
        } else {
            const newItem = { ...item, id: `P${Date.now()}` };
            setStock(prev => [newItem, ...prev]);
            addToast(`เพิ่มอะไหล่ ${newItem.name} สำเร็จ`, 'success');
        }
        setEditModalOpen(false);
        setEditingItem(null);
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                     <input
                        type="text"
                        placeholder="ค้นหา (ชื่อ, ID, หมวด)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-60 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base">
                        <option value="all">สถานะทั้งหมด</option>
                        <option value="ปกติ">ปกติ</option>
                        <option value="สต๊อกต่ำ">สต๊อกต่ำ</option>
                        <option value="สต๊อกเกิน">สต๊อกเกิน</option>
                        <option value="หมดสต๊อก">หมดสต๊อก</option>
                    </select>
                </div>
                 <button onClick={() => handleOpenEditModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">เพิ่มอะไหล่ใหม่</button>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวนคงเหลือ</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase">สต็อก (Min/Max)</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStock.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="text-base font-semibold">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.id}</div>
                                </td>
                                <td className="px-6 py-4 text-base">{item.category}</td>
                                <td className="px-6 py-4 text-right text-base font-bold">{`${item.quantity} ${item.unit}`}</td>
                                <td className="px-6 py-4 text-right text-base">{`${item.minStock} / ${item.maxStock || 'N/A'}`}</td>
                                <td className="px-6 py-4"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center items-center space-x-2">
                                        <button onClick={() => handleOpenAddModal(item)} className="p-2 rounded-full hover:bg-green-100 text-green-600" title="เพิ่มสต็อก">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => handleOpenEditModal(item)} className="p-2 rounded-full hover:bg-yellow-100 text-yellow-600" title="แก้ไข">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => deleteStockItem(item.id)} className="p-2 rounded-full hover:bg-red-100 text-red-600" title="ลบ">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditModalOpen && (
                <StockModal
                    item={editingItem}
                    onSave={handleSaveStock}
                    onClose={() => setEditModalOpen(false)}
                />
            )}

            {isAddModalOpen && itemToAddStock && (
                <AddStockModal
                    item={itemToAddStock}
                    onSave={addStock}
                    onClose={() => setAddModalOpen(false)}
                />
            )}

        </div>
    );
};

export default StockManagement;