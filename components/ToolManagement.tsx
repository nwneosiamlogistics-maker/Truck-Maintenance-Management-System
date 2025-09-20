
import React, { useState, useMemo } from 'react';
import type { Tool, ToolTransaction, Technician } from '../types';
import { useToast } from '../context/ToastContext';

interface ToolManagementProps {
    tools: Tool[];
    setTools: React.Dispatch<React.SetStateAction<Tool[]>>;
    transactions: ToolTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<ToolTransaction[]>>;
    technicians: Technician[];
}

const ToolManagement: React.FC<ToolManagementProps> = ({ tools, setTools, transactions, setTransactions, technicians }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
    
    // You would typically have modals for these actions
    const handleAddTool = () => addToast('ฟังก์ชันเพิ่มเครื่องมือยังไม่เปิดใช้งาน', 'info');
    const handleCheckout = () => addToast('ฟังก์ชันยืมเครื่องมือยังไม่เปิดใช้งาน', 'info');
    const handleCheckIn = () => addToast('ฟังก์ชันคืนเครื่องมือยังไม่เปิดใช้งาน', 'info');

    const safeTools = useMemo(() => Array.isArray(tools) ? tools : [], [tools]);
    const safeTransactions = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions]);

    const TabButton: React.FC<{ tabId: 'inventory' | 'history', label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <TabButton tabId="inventory" label="คลังเครื่องมือ" />
                    <TabButton tabId="history" label="ประวัติยืม-คืน" />
                </div>
                 <div className="flex items-center gap-2">
                     <button onClick={handleCheckout} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">ยืม</button>
                     <button onClick={handleCheckIn} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600">คืน</button>
                    <button onClick={handleAddTool} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">+ เพิ่มเครื่องมือใหม่</button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
                             <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อเครื่องมือ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน (ทั้งหมด / ยืม)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่เก็บ</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y">
                            {safeTools.map(tool => (
                                <tr key={tool.id}>
                                    <td className="px-4 py-3"><div className="font-semibold">{tool.name}</div><div className="text-sm text-gray-500">{tool.code}</div></td>
                                    <td className="px-4 py-3">{tool.category}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-bold text-lg">{tool.totalQuantity}</span> / <span className="text-orange-600">{tool.quantityCheckedOut}</span>
                                    </td>
                                    <td className="px-4 py-3">{tool.status}</td>
                                    <td className="px-4 py-3">{tool.storageLocation}</td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            ) : (
                 <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
                             <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันที่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภท</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เครื่องมือ</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ช่าง</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y">
                             {safeTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3">{new Date(tx.transactionDate).toLocaleString('th-TH')}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${tx.type === 'ยืม' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{tx.type}</span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{tx.toolName}</td>
                                    <td className="px-4 py-3 text-right">{tx.quantity}</td>
                                    <td className="px-4 py-3">{tx.technicianName}</td>
                                </tr>
                             ))}
                         </tbody>
                     </table>
                </div>
            )}
        </div>
    );
};

export default ToolManagement;
