
import React, { useState, useMemo } from 'react';
import type { Tool, ToolTransaction, Technician } from '../types';
import { useToast } from '../context/ToastContext';
import ToolModal from './ToolModal';
import { promptForPassword } from '../utils';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    
    const handleCheckout = () => addToast('ฟังก์ชันยืมเครื่องมือยังไม่เปิดใช้งาน', 'info');
    const handleCheckIn = () => addToast('ฟังก์ชันคืนเครื่องมือยังไม่เปิดใช้งาน', 'info');

    const safeTools = useMemo(() => Array.isArray(tools) ? tools : [], [tools]);
    const safeTransactions = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions]);

    const handleOpenModal = (tool: Tool | null = null) => {
        setEditingTool(tool);
        setIsModalOpen(true);
    };

    const handleSaveTool = (toolData: Tool) => {
        if (toolData.id) { // Editing
            setTools(prev => prev.map(t => t.id === toolData.id ? toolData : t));
            addToast(`อัปเดตข้อมูลเครื่องมือ '${toolData.name}' สำเร็จ`, 'success');
        } else { // Adding
            const newTool: Tool = {
                ...toolData,
                id: `TOOL-${Date.now()}`,
                quantityCheckedOut: 0, 
            };
            setTools(prev => [newTool, ...prev]);
            addToast(`เพิ่มเครื่องมือใหม่ '${newTool.name}' สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteTool = (tool: Tool) => {
        if (tool.quantityCheckedOut > 0) {
            addToast(`ไม่สามารถลบ '${tool.name}' ได้เนื่องจากมีผู้ยืมอยู่`, 'error');
            return;
        }
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ '${tool.name}'?`)) {
            setTools(prev => prev.filter(t => t.id !== tool.id));
            addToast(`ลบเครื่องมือ '${tool.name}' สำเร็จ`, 'info');
        }
    };

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
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">+ เพิ่มเครื่องมือใหม่</button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
                             <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">รหัส / ชื่อเครื่องมือ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ยี่ห้อ / รุ่น</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">จำนวน (ทั้งหมด / ยืม)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ที่เก็บ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y">
                            {safeTools.map(tool => (
                                <tr key={tool.id}>
                                    <td className="px-4 py-3"><div className="font-semibold">{tool.name}</div><div className="text-sm text-gray-500">{tool.code}</div></td>
                                    <td className="px-4 py-3"><div className="font-semibold">{tool.brand || '-'}</div><div className="text-sm text-gray-500">{tool.model || '-'}</div></td>
                                    <td className="px-4 py-3">{tool.category}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-bold text-lg">{tool.totalQuantity}</span> / <span className="text-orange-600">{tool.quantityCheckedOut}</span>
                                    </td>
                                    <td className="px-4 py-3">{tool.status}</td>
                                    <td className="px-4 py-3">{tool.storageLocation}</td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <button onClick={() => handleOpenModal(tool)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                        <button onClick={() => handleDeleteTool(tool)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                    </td>
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

            {isModalOpen && (
                <ToolModal
                    tool={editingTool}
                    onSave={handleSaveTool}
                    onClose={() => setIsModalOpen(false)}
                    existingTools={safeTools}
                />
            )}
        </div>
    );
};

export default ToolManagement;
