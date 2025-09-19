import React, { useState, useMemo, useCallback } from 'react';
import type { Tool, ToolTransaction, Technician, ToolStatus, ToolTransactionType } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

// --- CONSTANTS ---
const TOOL_CATEGORIES = [
  'เครื่องมือวัดและตรวจสอบ (Measuring & Inspection Tools)',
  'เครื่องมือช่างมือ (Hand Tools)',
  'เครื่องมือไฟฟ้าและลม (Power & Air Tools)',
  'เครื่องมือเฉพาะงานซ่อมรถบรรทุก (Specialty Tools)',
  'อื่นๆ',
];


// --- Reusable Modal Component ---
interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ title, onClose, children, footer }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {children}
            </div>
            <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                {footer}
            </div>
        </div>
    </div>
);

// --- Tool Modal for Add/Edit ---
interface ToolModalProps {
    tool: Omit<Tool, 'id'> | Tool | null;
    onSave: (toolData: Omit<Tool, 'id'> | Tool) => void;
    onClose: () => void;
    existingTools: Tool[];
}

const ToolModal: React.FC<ToolModalProps> = ({ tool, onSave, onClose, existingTools }) => {
    const { addToast } = useToast();
    const getInitialState = () => tool || {
        code: '', name: '', category: TOOL_CATEGORIES[0], brand: '', totalQuantity: 1, quantityCheckedOut: 0,
        storageLocation: '', status: 'ปกติ' as ToolStatus, lowStockThreshold: 1, notes: ''
    };
    const [formData, setFormData] = useState(getInitialState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = () => {
        if (!formData.code.trim() || !formData.name.trim()) {
            addToast('กรุณากรอกรหัสและชื่อเครื่องมือ', 'warning');
            return;
        }
        if (!('id' in formData)) { // Only check for duplicates when adding new
            if (existingTools.some(t => t.code.toLowerCase() === formData.code.toLowerCase().trim())) {
                addToast('รหัสเครื่องมือนี้มีอยู่แล้ว', 'error');
                return;
            }
        }
        onSave(formData);
    };

    return (
        <Modal
            title={tool && 'id' in tool ? 'แก้ไขข้อมูลเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}
            onClose={onClose}
            footer={<>
                <button onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                <button onClick={handleSubmit} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
            </>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">รหัสเครื่องมือ *</label><input type="text" name="code" value={formData.code} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">ชื่อเครื่องมือ *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div>
                    <label className="block text-sm font-medium">หมวดหมู่</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg">
                        {TOOL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div><label className="block text-sm font-medium">ยี่ห้อ/รุ่น</label><input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">จำนวนทั้งหมด *</label><input type="number" min="0" name="totalQuantity" value={formData.totalQuantity} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">จุดสั่งซื้อ (แจ้งเตือนเหลือน้อย)</label><input type="number" min="0" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium">ตำแหน่งจัดเก็บ</label><input type="text" name="storageLocation" value={formData.storageLocation || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium">หมายเหตุ</label><textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={2} className="mt-1 w-full p-2 border rounded-lg" /></div>
            </div>
        </Modal>
    );
};

// --- Checkout/Check-in Modal ---
interface CheckoutModalProps {
    tool: Tool;
    technicians: Technician[];
    onClose: () => void;
    onSaveTransaction: (transaction: Omit<ToolTransaction, 'id' | 'transactionDate'>) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ tool, technicians, onClose, onSaveTransaction }) => {
    const [technicianId, setTechnicianId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [transactionType, setTransactionType] = useState<'ยืม' | 'คืน'>('ยืม');
    const { addToast } = useToast();

    const availableToCheckout = tool.totalQuantity - tool.quantityCheckedOut;
    const availableToCheckin = tool.quantityCheckedOut;

    const handleSubmit = () => {
        if (!technicianId) {
            addToast('กรุณาเลือกช่าง', 'warning');
            return;
        }
        if (quantity <= 0) {
            addToast('จำนวนต้องมากกว่า 0', 'warning');
            return;
        }
        if (transactionType === 'ยืม' && quantity > availableToCheckout) {
            addToast(`ยืมเกินจำนวนที่มี (${availableToCheckout})`, 'error');
            return;
        }
        if (transactionType === 'คืน' && quantity > availableToCheckin) {
            addToast(`คืนเกินจำนวนที่ยืมไป (${availableToCheckin})`, 'error');
            return;
        }
        
        onSaveTransaction({
            toolId: tool.id,
            toolName: tool.name,
            type: transactionType,
            quantity,
            technicianId,
            technicianName: technicians.find(t => t.id === technicianId)?.name || 'N/A',
            notes,
        });
        onClose();
    };

    return (
        <Modal
            title={`ยืม/คืน: ${tool.name}`}
            onClose={onClose}
            footer={<>
                <button onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                <button onClick={handleSubmit} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">ยืนยัน</button>
            </>}
        >
             <div className="flex justify-center p-2 bg-gray-100 rounded-lg">
                <button onClick={() => setTransactionType('ยืม')} className={`px-4 py-2 text-sm rounded-md w-full ${transactionType === 'ยืม' ? 'bg-white shadow' : ''}`}>ยืม</button>
                <button onClick={() => setTransactionType('คืน')} className={`px-4 py-2 text-sm rounded-md w-full ${transactionType === 'คืน' ? 'bg-white shadow' : ''}`}>คืน</button>
            </div>
            <p className="text-center text-gray-600">พร้อมใช้งาน: {availableToCheckout} / {tool.totalQuantity} | ถูกยืมไป: {tool.quantityCheckedOut}</p>
            <div><label>ช่าง *</label><select value={technicianId} onChange={e => setTechnicianId(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"><option value="">-- เลือกช่าง --</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label>จำนวน *</label><input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" max={transactionType === 'ยืม' ? availableToCheckout : availableToCheckin} className="mt-1 w-full p-2 border rounded-lg" /></div>
            <div><label>หมายเหตุ</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full p-2 border rounded-lg" /></div>
        </Modal>
    );
};

// --- Main Component ---
interface ToolManagementProps {
    tools: Tool[];
    setTools: React.Dispatch<React.SetStateAction<Tool[]>>;
    toolTransactions: ToolTransaction[];
    setToolTransactions: React.Dispatch<React.SetStateAction<ToolTransaction[]>>;
    technicians: Technician[];
}

const ToolManagement: React.FC<ToolManagementProps> = ({ tools, setTools, toolTransactions, setToolTransactions, technicians }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [checkoutTool, setCheckoutTool] = useState<Tool | null>(null);
    const { addToast } = useToast();

    const safeTools = useMemo(() => Array.isArray(tools) ? tools : [], [tools]);
    const safeTransactions = useMemo(() => Array.isArray(toolTransactions) ? toolTransactions : [], [toolTransactions]);
    
    const filteredTools = useMemo(() => safeTools
        .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
        .filter(t => searchTerm === '' || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.code.toLowerCase().includes(searchTerm.toLowerCase()))
    , [safeTools, categoryFilter, searchTerm]);
    
    const filteredTransactions = useMemo(() => safeTransactions
        .filter(t => searchTerm === '' || t.toolName.toLowerCase().includes(searchTerm.toLowerCase()) || t.technicianName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a,b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    , [safeTransactions, searchTerm]);


    const handleSaveTool = (toolData: Omit<Tool, 'id'> | Tool) => {
        if ('id' in toolData && toolData.id) { // Edit
            setTools(prev => prev.map(t => t.id === toolData.id ? toolData : t));
            addToast('อัปเดตข้อมูลเครื่องมือสำเร็จ', 'success');
        } else { // Add
            const newTool: Tool = { ...toolData, id: `TOOL-${Date.now()}` };
            setTools(prev => [newTool, ...prev]);
            addToast('เพิ่มเครื่องมือใหม่สำเร็จ', 'success');
        }
        setIsToolModalOpen(false);
        setEditingTool(null);
    };
    
    const handleDeleteTool = (tool: Tool) => {
        if (tool.quantityCheckedOut > 0) {
            addToast('ไม่สามารถลบได้ เนื่องจากมีคนยืมอยู่', 'error');
            return;
        }
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${tool.name}?`)) {
            setTools(prev => prev.filter(t => t.id !== tool.id));
            addToast(`ลบ ${tool.name} สำเร็จ`, 'info');
        }
    };

    const handleSaveTransaction = (transaction: Omit<ToolTransaction, 'id' | 'transactionDate'>) => {
        const newTransaction: ToolTransaction = {
            ...transaction,
            id: `T_TXN-${Date.now()}`,
            transactionDate: new Date().toISOString(),
        };
        
        setToolTransactions(prev => [newTransaction, ...prev]);
        setTools(prevTools => prevTools.map(t => {
            if (t.id === transaction.toolId) {
                const change = transaction.type === 'ยืม' ? transaction.quantity : -transaction.quantity;
                return { ...t, quantityCheckedOut: t.quantityCheckedOut + change };
            }
            return t;
        }));
        addToast(`บันทึกการ${transaction.type} ${transaction.toolName} สำเร็จ`, 'success');
    };

    const getStatusIndicator = (tool: Tool) => {
        const available = tool.totalQuantity - tool.quantityCheckedOut;
        if (tool.status === 'ชำรุด' || tool.status === 'สูญหาย') return { icon: '⚠️', color: 'text-red-600', text: tool.status };
        if (available <= 0) return { icon: '❌', color: 'text-red-600', text: 'หมด' };
        if (available <= tool.lowStockThreshold) return { icon: '🟡', color: 'text-yellow-600', text: 'เหลือน้อย' };
        return { icon: '✅', color: 'text-green-600', text: 'ปกติ' };
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-md font-semibold ${activeTab === 'inventory' ? 'bg-white shadow' : ''}`}>คลังเครื่องมือ</button>
                        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md font-semibold ${activeTab === 'history' ? 'bg-white shadow' : ''}`}>ประวัติการยืม-คืน</button>
                    </div>
                    {activeTab === 'inventory' && <button onClick={() => { setEditingTool(null); setIsToolModalOpen(true); }} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ เพิ่มเครื่องมือใหม่</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg md:col-span-2" />
                    {activeTab === 'inventory' && (
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 border rounded-lg">
                            <option value="all">ทุกหมวดหมู่</option>
                            {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                {activeTab === 'inventory' ? (
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">รหัส/ชื่อเครื่องมือ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">หมวดหมู่</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จำนวน (พร้อมใช้/ทั้งหมด)</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">จัดการ</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y">
                            {filteredTools.map(tool => {
                                const available = tool.totalQuantity - tool.quantityCheckedOut;
                                const status = getStatusIndicator(tool);
                                return (
                                <tr key={tool.id}>
                                    <td className="px-4 py-3"><div className="font-semibold">{tool.name}</div><div className="text-sm text-gray-500 font-mono">{tool.code}</div></td>
                                    <td className="px-4 py-3 text-sm">{tool.category}</td>
                                    <td className="px-4 py-3 text-center"><span className="font-bold text-lg">{available}</span> / {tool.totalQuantity}</td>
                                    <td className="px-4 py-3"><span className={`font-semibold ${status.color}`}>{status.icon} {status.text}</span></td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <button onClick={() => setCheckoutTool(tool)} className="text-white bg-green-500 hover:bg-green-600 font-medium px-3 py-1 rounded-md text-sm">ยืม/คืน</button>
                                        <button onClick={() => { if (promptForPassword('แก้ไข')) { setEditingTool(tool); setIsToolModalOpen(true); } }} className="text-yellow-600 hover:text-yellow-800">แก้</button>
                                        <button onClick={() => handleDeleteTool(tool)} className="text-red-500 hover:text-red-700">ลบ</button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                ) : (
                     <table className="min-w-full divide-y">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">วันที่</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">เครื่องมือ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ธุรกรรม</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">จำนวน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ช่าง</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y">
                            {filteredTransactions.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3 text-sm">{new Date(t.transactionDate).toLocaleString('th-TH')}</td>
                                    <td className="px-4 py-3 font-semibold">{t.toolName}</td>
                                    <td className="px-4 py-3 text-sm">{t.type}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${t.type === 'ยืม' ? 'text-red-600' : 'text-green-600'}`}>{t.type === 'ยืม' ? '-' : '+'}{t.quantity}</td>
                                    <td className="px-4 py-3 text-sm">{t.technicianName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isToolModalOpen && <ToolModal tool={editingTool} onSave={handleSaveTool} onClose={() => setIsToolModalOpen(false)} existingTools={safeTools} />}
            {checkoutTool && <CheckoutModal tool={checkoutTool} technicians={technicians} onClose={() => setCheckoutTool(null)} onSaveTransaction={handleSaveTransaction} />}
        </div>
    );
};

export default ToolManagement;