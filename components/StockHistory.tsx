
import React, { useState, useMemo } from 'react';
import type { StockTransaction, StockTransactionType, StockItem } from '../types';
import { STOCK_CATEGORIES } from '../data/categories';

interface StockHistoryProps {
    transactions: StockTransaction[];
    stock: StockItem[];
}

const StockHistory: React.FC<StockHistoryProps> = ({ transactions, stock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<StockTransactionType | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const filteredTransactions = useMemo(() => {
        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        const stockMap = new Map((Array.isArray(stock) ? stock : []).map(item => [item.id, item]));

        return safeTransactions
            .map(t => ({
                ...t,
                category: stockMap.get(t.stockItemId)?.category || 'ไม่พบ',
            }))
            .filter(t => {
                const transactionDate = new Date(t.transactionDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if(start) start.setHours(0,0,0,0);
                if(end) end.setHours(23,59,59,999);

                const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                const isTypeMatch = typeFilter === 'all' || t.type === typeFilter;
                const isCategoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
                const isSearchMatch = searchTerm === '' ||
                    t.stockItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.actor && t.actor.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (t.relatedRepairOrder && t.relatedRepairOrder.toLowerCase().includes(searchTerm.toLowerCase()));

                return isDateInRange && isTypeMatch && isSearchMatch && isCategoryMatch;
            })
            .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }, [transactions, stock, searchTerm, startDate, endDate, typeFilter, categoryFilter]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setTypeFilter('all');
        setCategoryFilter('all');
        setCurrentPage(1);
    };

    const getTypeBadge = (type: StockTransactionType) => {
        switch (type) {
            case 'รับเข้า': return 'bg-green-100 text-green-800';
            case 'เบิกใช้': return 'bg-orange-100 text-orange-800';
            case 'คืนร้านค้า': return 'bg-indigo-100 text-indigo-800';
            case 'ปรับสต็อก': return 'bg-teal-100 text-teal-800';
            case 'จอง': return 'bg-blue-100 text-blue-800';
            case 'ยกเลิกจอง': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100';
        }
    };

    const renderCategory = (categoryString: string) => {
        if (!categoryString || typeof categoryString !== 'string') {
            return 'ไม่ระบุ';
        }
        const parts = categoryString.split(' ');
        // A simple check to see if the first part is an emoji.
        if (parts.length > 1 && parts[0].length < 4) { 
            return (
                <div className="flex items-center">
                    <span className="text-lg mr-2">{parts[0]}</span>
                    <span>{parts.slice(1).join(' ')}</span>
                </div>
            );
        }
        return <span>{categoryString}</span>;
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่ออะไหล่, ผู้เบิก)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg lg:col-span-2"
                    />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="all">ทุกประเภท</option>
                        <option value="รับเข้า">รับเข้า</option>
                        <option value="เบิกใช้">เบิกใช้</option>
                        <option value="จอง">จอง</option>
                        <option value="ยกเลิกจอง">ยกเลิกจอง</option>
                        <option value="คืนร้านค้า">คืนร้านค้า</option>
                        <option value="ปรับสต็อก">ปรับสต็อก</option>
                    </select>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="all">ทุกหมวดหมู่</option>
                        {STOCK_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
                <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                    ล้างตัวกรอง
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภท</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้ดำเนินการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใบซ่อมที่เกี่ยวข้อง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    <div>{new Date(t.transactionDate).toLocaleDateString('th-TH')}</div>
                                    <div className="text-xs text-gray-500">{new Date(t.transactionDate).toLocaleTimeString('th-TH')}</div>
                                </td>
                                <td className="px-4 py-3 font-semibold">{t.stockItemName}</td>
                                <td className="px-4 py-3 text-sm">{renderCategory(t.category)}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(t.type)}`}>{t.type}</span></td>
                                <td className={`px-4 py-3 text-right font-bold text-base ${t.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                                </td>
                                <td className="px-4 py-3">{t.actor}</td>
                                <td className="px-4 py-3">{t.relatedRepairOrder || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{t.notes || '-'}</td>
                            </tr>
                        ))}
                         {paginatedTransactions.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <span className="text-base text-gray-700">
                    แสดง {paginatedTransactions.length} จาก {filteredTransactions.length} รายการ
                </span>
                <div className="flex items-center gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                     <span className="text-base font-semibold">หน้า {currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                 </div>
            </div>
        </div>
    );
};

export default StockHistory;
