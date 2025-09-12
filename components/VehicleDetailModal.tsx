
import React from 'react';
import type { Repair, Technician } from '../types';

interface VehicleDetailModalProps {
    repair: Repair;
    allRepairs: Repair[];
    technicians: Technician[];
    onClose: () => void;
}

const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({ repair, allRepairs, technicians, onClose }) => {
    
    const repairHistory = (Array.isArray(allRepairs) ? allRepairs : [])
        .filter(r => r.licensePlate === repair.licensePlate && r.status === 'ซ่อมเสร็จ' && r.id !== repair.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getTechnicianNames = (ids: string[]) => {
        if (!ids || ids.length === 0) return 'ไม่ระบุ';
        return ids.map(id => technicians.find(t => t.id === id)?.name || 'ไม่พบชื่อ').join(', ');
    };
    
    const calculateTotalCost = (repairItem: Repair) => {
        const repairParts = Array.isArray(repairItem.parts) ? repairItem.parts : [];
        const partsCost = repairParts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0);
        const laborCost = repairItem.repairCost || 0;
        return partsCost + laborCost;
    };

    const safeParts = Array.isArray(repair.parts) ? repair.parts : [];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-3xl font-bold text-gray-800">
                                <span>รายละเอียดรถ: </span> 
                                <span className="text-blue-600">{repair.licensePlate}</span>
                            </h3>
                            <p className="text-base text-gray-500">{repair.vehicleMake} {repair.vehicleModel} ({repair.vehicleType})</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Current Repair Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">ข้อมูลการซ่อมปัจจุบัน</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                            <p><strong>เลขที่ใบแจ้งซ่อม:</strong> {repair.repairOrderNo}</p>
                            <p><strong>สถานะ:</strong> {repair.status}</p>
                            <p><strong>เลขที่ใบเบิก:</strong> {repair.requisitionNumber || '-'}</p>
                            <p><strong>ความสำคัญ:</strong> {repair.priority}</p>
                            <p><strong>เลขที่ Invoice:</strong> {repair.invoiceNumber || '-'}</p>
                            <p><strong>ช่างที่รับผิดชอบ:</strong> {getTechnicianNames(repair.assignedTechnicians)}</p>
                            <p className="md:col-span-2"><strong>ประเภทงานซ่อม:</strong> {repair.repairCategory}</p>
                            <p className="md:col-span-2"><strong>รายละเอียดปัญหา:</strong> {repair.problemDescription}</p>
                        </div>
                    </div>
                    
                    {/* Parts List */}
                    <div>
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">รายการอะไหล่ที่ใช้ ({safeParts.length} รายการ)</h4>
                        {safeParts.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ชื่ออะไหล่</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ที่มา</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่ซื้อ</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคารวม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {safeParts.map((part, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm font-medium">{part.name}</td>
                                                <td className="px-4 py-2 text-sm">{part.source}</td>
                                                <td className="px-4 py-2 text-sm">{part.purchaseDate ? new Date(part.purchaseDate).toLocaleDateString('th-TH') : '-'}</td>
                                                <td className="px-4 py-2 text-sm text-right">{part.quantity} {part.unit}</td>
                                                <td className="px-4 py-2 text-sm text-right font-semibold">{(part.quantity * part.unitPrice).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">ไม่พบรายการอะไหล่</p>
                        )}
                    </div>


                    {/* Repair History */}
                    <div>
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">ประวัติการซ่อม</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภทงานซ่อม</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">ค่าใช้จ่ายรวม (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {repairHistory.length > 0 ? (
                                        repairHistory.map(hist => (
                                            <tr key={hist.id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-base text-gray-600">{new Date(hist.createdAt).toLocaleDateString('th-TH')}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-base text-gray-800 font-medium">{hist.repairCategory}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-base text-gray-600">{getTechnicianNames(hist.assignedTechnicians)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-base text-gray-800 text-right font-semibold">{calculateTotalCost(hist).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-500">
                                                 <div className="flex flex-col items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="font-semibold text-base">ไม่พบประวัติการซ่อมสำหรับรถคันนี้</span>
                                                    <span className="text-sm text-gray-400">นี่อาจเป็นการซ่อมครั้งแรกที่ถูกบันทึกในระบบ</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailModal;