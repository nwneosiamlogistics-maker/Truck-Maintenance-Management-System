import React, { useState, useMemo } from 'react';
import type { StockTransaction, StockTransactionType, StockItem, Repair, Technician } from '../types';
import { STOCK_CATEGORIES } from '../data/categories';

interface StockHistoryProps {
    transactions: StockTransaction[];
    stock: StockItem[];
    repairs: Repair[];
    technicians: Technician[];
}

type FlattenedPart = {
    id: string;
    partName: string;
    partId: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    source: 'สต็อกอู่' | 'ร้านค้า';
    category: string;
    dateUsed: string;
    repairOrderNo: string;
    licensePlate: string;
    // FIX: Use a combined technician ID list instead of deprecated assignedTechnicians
    allTechnicianIds: string[];
};

const StockHistory: React.FC<StockHistoryProps> = ({ transactions, stock, repairs, technicians }) => {
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const stockMap = useMemo(() => new Map((Array.isArray(stock) ? stock : []).map(item => [item.id, item])), [stock]);
    const repairMap = useMemo(() => new Map((Array.isArray(repairs) ? repairs : []).map(item => [item.repairOrderNo, item])), [repairs]);
    
    // Create a map for efficient part source lookup to fix data inconsistencies.
    const repairPartSourceMap = useMemo(() => {
        const map = new Map<string, Map<string, 'สต็อกอู่' | 'ร้านค้า'>>();
        (Array.isArray(repairs) ? repairs : []).forEach(repair => {
            if (repair.repairOrderNo && Array.isArray(repair.parts)) {
                const partMap = new Map<string, 'สต็อกอู่' | 'ร้านค้า'>();
                repair.parts.forEach(part => {
                    partMap.set(part.partId, part.source);
                });
                map.set(repair.repairOrderNo, partMap);
            }
        });
        return map;
    }, [repairs]);


    const flattenedParts = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => r.status === 'ซ่อมเสร็จ' && r.repairEndDate)
            .flatMap(r => 
                (Array.isArray(r.parts) ? r.parts : []).map(p => ({
                    id: `${r.id}-${p.partId}`,
                    partName: p.name,
                    partId: p.partId,
                    quantity: p.quantity,
                    unit: p.unit,
                    unitPrice: p.unitPrice,
                    source: p.source,
                    category: stockMap.get(p.partId)?.category || 'ไม่พบหมวดหมู่',
                    dateUsed: r.repairEndDate!,
                    repairOrderNo: r.repairOrderNo,
                    licensePlate: r.licensePlate,
                    // FIX: Use assignedTechnicianId and assistantTechnicianIds to create a combined list
                    allTechnicianIds: [r.assignedTechnicianId, ...(r.assistantTechnicianIds || [])].filter(Boolean) as string[],
                }))
            );
    }, [repairs, stockMap]);

    const filteredData = useMemo(() => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if(start) start.setHours(0,0,0,0);
        if(end) end.setHours(23,59,59,999);

        if (activeTab === 'internal') {
            return (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    // For 'เบิกใช้' transactions, verify the part source from the original repair.
                    // This prevents parts bought from stores from appearing in internal stock history.
                    if (t.type === 'เบิกใช้' && t.relatedRepairOrder) {
                        const partSource = repairPartSourceMap.get(t.relatedRepairOrder)?.get(t.stockItemId);
                        if (partSource === 'ร้านค้า') {
                            return false; // Exclude this transaction.
                        }
                    }
                    return true; // Include all other valid transactions.
                })
                .map(t => {
                    let displayDate = t.transactionDate;
                    if (t.type === 'เบิกใช้' && t.relatedRepairOrder) {
                        const repair = repairMap.get(t.relatedRepairOrder);
                        if (repair && repair.repairStartDate) {
                            displayDate = repair.repairStartDate;
                        }
                    }
                    return {
                        ...t,
                        displayDate,
                        category: stockMap.get(t.stockItemId)?.category || 'ไม่พบหมวดหมู่',
                    };
                })
                .filter(t => {
                    const transactionDate = new Date(t.displayDate);
                    const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                    const isCategoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
                    const isSearchMatch = searchTerm === '' ||
                        t.stockItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.relatedRepairOrder && t.relatedRepairOrder.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        t.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.documentNumber && t.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
                    
                    return isDateInRange && isCategoryMatch && isSearchMatch;
                })
                .sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
        } else { // 'external'
            return flattenedParts
                .filter(p => p.source === 'ร้านค้า')
                .filter(p => {
                    const transactionDate = new Date(p.dateUsed);
                    const isDateInRange = (!start || transactionDate >= start) && (!end || transactionDate <= end);
                    const isCategoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
                    const isSearchMatch = searchTerm === '' ||
                        p.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.repairOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());

                    return isDateInRange && isCategoryMatch && isSearchMatch;
                })
                .sort((a, b) => new Date(b.dateUsed).getTime() - new Date(a.dateUsed).getTime());
        }
    }, [transactions, flattenedParts, activeTab, searchTerm, startDate, endDate, categoryFilter, stockMap, repairMap, repairPartSourceMap]);


    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setCategoryFilter('all');
        setCurrentPage(1);
    };

    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return '-';
        return ids.map(id => technicians.find(t => t.id === id)?.name || id.substring(0,5)).join(', ');
    };
    
    const TabButton: React.FC<{ tabId: 'internal' | 'external', label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => { setActiveTab(tabId); setCurrentPage(1); }}
            className={`px-6 py-3 text-base font-semibold border-b-4 transition-colors ${
                activeTab === tabId
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-t-2xl shadow-sm">
                <div className="border-b">
                    <TabButton tabId="internal" label="ประวัติสต็อกอู่" />
                    <TabButton tabId="external" label="เบิกจากร้านค้า" />
                </div>
            </div>
             <div className="bg-white p-4 rounded-b-2xl shadow-sm -mt-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่ออะไหล่, ใบซ่อม, ทะเบียน)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg lg:col-span-2"
                    />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="all">ทุกหมวดหมู่</option>
                        {STOCK_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2">
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                         <span>-</span>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                </div>
                <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                    ล้างตัวกรอง
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                {activeTab === 'internal' ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ใช้</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เลขที่เอกสาร</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายการอะไหล่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภทธุรกรรม</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ผู้ดำเนินการ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เอกสารอ้างอิง</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมายเหตุเพิ่มเติม</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">มูลค่ารวม</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.map((t: any) => {
                                const isOut = t.quantity < 0;
                                const isAdjustment = ['ปรับสต็อก'].includes(t.type);
                                let quantityColor = isAdjustment ? 'text-gray-600' : (isOut ? 'text-red-600' : 'text-green-600');
                                const totalValue = (t.pricePerUnit ?? stockMap.get(t.stockItemId)?.price ?? 0) * t.quantity;

                                return (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(t.displayDate).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3 font-mono text-sm">{t.documentNumber || '-'}</td>
                                        <td className="px-4 py-3 font-semibold">{t.stockItemName}</td>
                                        <td className="px-4 py-3 text-sm">{t.category}</td>
                                        <td className="px-4 py-3 text-sm">{t.type}</td>
                                        <td className={`px-4 py-3 text-right font-bold text-base ${quantityColor}`}>
                                            {t.quantity > 0 ? '+' : ''}{t.quantity} {stockMap.get(t.stockItemId)?.unit}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{t.actor}</td>
                                        <td className="px-4 py-3 text-sm">{t.relatedRepairOrder || '-'}</td>
                                        <td className="px-4 py-3 text-sm max-w-xs truncate" title={t.notes}>{t.notes || '-'}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{Math.abs(totalValue).toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={10} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่ใช้</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใบซ่อม / ทะเบียน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รายการอะไหล่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ราคารวม</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.map((p: any) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.dateUsed).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{p.repairOrderNo}</div>
                                        <div className="text-sm text-gray-500">{p.licensePlate}</div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{p.partName}</td>
                                    <td className="px-4 py-3 text-sm">{p.category}</td>
                                    <td className="px-4 py-3 text-right font-bold text-base">{p.quantity} {p.unit}</td>
                                    {/* FIX: Use allTechnicianIds which contains both main and assistant technicians */}
                                    <td className="px-4 py-3 text-sm">{getTechnicianNames(p.allTechnicianIds)}</td>
                                    <td className="px-4 py-3 text-right">{p.unitPrice.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{(p.unitPrice * p.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <span className="text-base text-gray-700">
                    แสดง {paginatedData.length} จาก {filteredData.length} รายการ
                </span>
                <div className="flex items-center gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ก่อนหน้า</button>
                     <span className="text-base font-semibold">หน้า {currentPage} / {totalPages || 1}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">ถัดไป</button>
                 </div>
            </div>
        </div>
    );
};

export default StockHistory;