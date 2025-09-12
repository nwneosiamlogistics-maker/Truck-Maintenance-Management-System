import React, { useState, useMemo } from 'react';
import type { StockTransaction, StockTransactionType } from '../types';

interface StockHistoryProps {
    transactions: StockTransaction[];
}

const StockHistory: React.FC<StockHistoryProps> = ({ transactions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<StockTransactionType | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const filteredTransactions = useMemo(() => {
        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        return safeTransactions
            .filter(t => {
                const transactionDate = new Date(t.transactionDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if(start) start.setHours(0,0,0,0);
                if(end) end.setHours(23,59,59,999);

                const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                const isTypeMatch = typeFilter === 'all' || t.type === typeFilter;
                const isSearchMatch = searchTerm === '' ||
                    t.stockItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.actor && t.actor.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (t.relatedRepairOrder && t.relatedRepairOrder.toLowerCase().includes(searchTerm.toLowerCase()));

                return isDateInRange && isTypeMatch && isSearchMatch;
            })
            .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }, [transactions, searchTerm, startDate, endDate, typeFilter]);

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
        setCurrentPage(1);
    };

    const getTypeBadge = (type: StockTransactionType) => {
        switch (type) {
            case 'รับเข้า': return 'bg-green-100 text-green-800';
            case 'เบิกใช้': return 'bg-orange-100 text-orange-800';
            case 'คืนร้านค้า': return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-gray-100';
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <option value="คืนร้านค้า">คืนร้านค้า</option>
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
                                <td className="px-4 py-3 text-sm text-gray-600">{new Date(t.transactionDate).toLocaleString('th-TH')}</td>
                                <td className="px-4 py-3 font-semibold">{t.stockItemName}</td>
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
                                <td colSpan={7} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td>
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