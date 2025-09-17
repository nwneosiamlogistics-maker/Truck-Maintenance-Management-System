
import React, { useState, useMemo } from 'react';
import type { Repair, Technician, RepairStatus, StockItem, StockTransaction, StockStatus } from '../types';
import { useToast } from '../context/ToastContext';

interface TechnicianViewProps {
    repairs: Repair[];
    setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
    technicians: Technician[];
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    transactions: StockTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
}

const TechnicianView: React.FC<TechnicianViewProps> = ({ repairs, setRepairs, technicians, stock, setStock, transactions, setTransactions }) => {
    const [selectedTechId, setSelectedTechId] = useState<string>('');
    const { addToast } = useToast();

    const activeRepairs = useMemo(() => {
        return (Array.isArray(repairs) ? repairs : [])
            .filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status));
    }, [repairs]);

    const techRepairs = useMemo(() => {
        if (!selectedTechId) return [];
        return activeRepairs
            .filter(r => (r.assignedTechnicians || []).includes(selectedTechId))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [activeRepairs, selectedTechId]);

    const handleStatusUpdate = (repairId: string, newStatus: RepairStatus) => {
        const repairToUpdate = repairs.find(r => r.id === repairId);
        if (!repairToUpdate) return;

        // 1. Update repair status optimistically
        const updatedRepair = { ...repairToUpdate, status: newStatus, updatedAt: new Date().toISOString() };
        if (newStatus === 'กำลังซ่อม' && !repairToUpdate.repairStartDate) {
            updatedRepair.repairStartDate = new Date().toISOString();
        }
        if (newStatus === 'ซ่อมเสร็จ' && !repairToUpdate.repairEndDate) {
            updatedRepair.repairEndDate = new Date().toISOString();
        }
        setRepairs(prev => prev.map(r => r.id === repairId ? updatedRepair : r));
        addToast(`อัปเดตสถานะใบซ่อม ${updatedRepair.repairOrderNo} เป็น "${newStatus}"`, 'success');

        // 2. If completed, handle stock update
        if (newStatus === 'ซ่อมเสร็จ') {
            const partsToWithdraw = (updatedRepair.parts || []).filter(p => p.source === 'สต็อกอู่');
            if (partsToWithdraw.length === 0) return;

            const technicianNames = technicians
                .filter(t => updatedRepair.assignedTechnicians.includes(t.id))
                .map(t => t.name)
                .join(', ') || 'ไม่ระบุ';
            
            const now = new Date().toISOString();

            const existingWithdrawalPartIds = new Set(
                (Array.isArray(transactions) ? transactions : [])
                    .filter(t => t.relatedRepairOrder === updatedRepair.repairOrderNo && t.type === 'เบิกใช้')
                    .map(t => t.stockItemId)
            );

            const newPartsToProcess = partsToWithdraw.filter(part => !existingWithdrawalPartIds.has(part.partId));

            if (newPartsToProcess.length > 0) {
                const stockUpdates: Record<string, number> = {};
                const transactionsToAdd: StockTransaction[] = [];

                newPartsToProcess.forEach(part => {
                    stockUpdates[part.partId] = (stockUpdates[part.partId] || 0) + part.quantity;
                    transactionsToAdd.push({
                        id: `TXN-${now}-${part.partId}`,
                        stockItemId: part.partId,
                        stockItemName: part.name,
                        type: 'เบิกใช้',
                        quantity: -part.quantity,
                        transactionDate: now,
                        actor: technicianNames,
                        notes: `ใช้สำหรับใบแจ้งซ่อม ${updatedRepair.repairOrderNo}`,
                        relatedRepairOrder: updatedRepair.repairOrderNo,
                        pricePerUnit: part.unitPrice
                    });
                });

                setStock(prevStock => prevStock.map(s => {
                    if (stockUpdates[s.id]) {
                        const change = stockUpdates[s.id];
                        const newQuantity = s.quantity - change;
                        const newReserved = Math.max(0, (s.quantityReserved || 0) - change);

                        let newStatus: StockStatus = 'ปกติ';
                        if (newQuantity <= 0) newStatus = 'หมดสต๊อก';
                        else if (newQuantity <= s.minStock) newStatus = 'สต๊อกต่ำ';
                        else if (s.maxStock && newQuantity > s.maxStock) newStatus = 'สต๊อกเกิน';
                        
                        return { ...s, quantity: newQuantity, quantityReserved: newReserved, status: newStatus };
                    }
                    return s;
                }));

                setTransactions(prev => [...transactionsToAdd, ...prev]);
                addToast(`หักสต็อกและบันทึกการเบิกจ่าย ${newPartsToProcess.length} รายการ`, 'info');
            }
        }
    };

    const getStatusBadge = (status: RepairStatus) => {
        switch (status) {
            case 'รอซ่อม': return 'bg-gray-200 text-gray-800';
            case 'กำลังซ่อม': return 'bg-blue-100 text-blue-800';
            case 'รออะไหล่': return 'bg-yellow-100 text-yellow-800';
            case 'ซ่อมเสร็จ': return 'bg-green-100 text-green-800';
            case 'ยกเลิก': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-2">เลือกช่างเพื่อดูรายการงาน</h2>
                <select 
                    value={selectedTechId} 
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg text-lg"
                >
                    <option value="">-- กรุณาเลือกชื่อของคุณ --</option>
                    {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                </select>
            </div>

            {selectedTechId && (
                <div className="space-y-4">
                    {techRepairs.length > 0 ? techRepairs.map(repair => (
                        <div key={repair.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{repair.licensePlate} <span className="text-base font-normal text-gray-500">({repair.vehicleMake} {repair.vehicleModel})</span></h3>
                                    <p className="text-gray-600 mt-1">{repair.problemDescription}</p>
                                    <p className="text-sm text-gray-400 mt-2">เลขที่: {repair.repairOrderNo}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(repair.status)}`}>
                                        {repair.status}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 border-t pt-4 flex flex-wrap justify-between items-center gap-4">
                                <p className="text-sm text-gray-500">
                                    วันที่แจ้ง: {new Date(repair.createdAt).toLocaleDateString('th-TH')}
                                </p>
                                <div className="flex items-center gap-2">
                                    {repair.status === 'รอซ่อม' && (
                                        <button onClick={() => handleStatusUpdate(repair.id, 'กำลังซ่อม')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">เริ่มซ่อม</button>
                                    )}
                                    {repair.status === 'กำลังซ่อม' && (
                                        <>
                                            <button onClick={() => handleStatusUpdate(repair.id, 'รออะไหล่')} className="px-4 py-2 text-sm font-semibold text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">รออะไหล่</button>
                                            <button onClick={() => handleStatusUpdate(repair.id, 'ซ่อมเสร็จ')} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">ซ่อมเสร็จ</button>
                                        </>
                                    )}
                                     {repair.status === 'รออะไหล่' && (
                                        <button onClick={() => handleStatusUpdate(repair.id, 'กำลังซ่อม')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">กลับมาซ่อมต่อ</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-10 rounded-2xl shadow-sm text-center text-gray-500">
                            <p className="text-lg">ไม่มีงานที่ต้องดำเนินการในขณะนี้</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TechnicianView;
