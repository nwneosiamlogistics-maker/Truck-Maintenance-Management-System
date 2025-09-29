

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Chat } from "@google/genai";
import type { Repair, Technician, MaintenancePlan, ChatMessage, Vehicle, StockItem } from '../types';
import { isToday, isYesterday, calculateDurationHours, formatHoursDescriptive, formatDateTime24h } from '../utils';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    repairs: Repair[];
    technicians: Technician[];
    plans: MaintenancePlan[];
    vehicles: Vehicle[];
    stock: StockItem[];
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, repairs, technicians, plans, vehicles, stock }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<Chat | null>(null);
    const [systemInstruction, setSystemInstruction] = useState<string>('');
    const isInitialized = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getSystemContext = useMemo(() => () => {
        // --- 1. Data Preparation ---
        const safeRepairs = Array.isArray(repairs) ? repairs : [];
        const safePlans = Array.isArray(plans) ? plans : [];
        const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
        const safeStock = Array.isArray(stock) ? stock : [];
        const safeTechnicians = Array.isArray(technicians) ? technicians : [];

        // --- 2. Data Filtering ---
        const repairsReportedToday = safeRepairs.filter(r => isToday(r.createdAt));
        const repairsCompletedYesterday = safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && isYesterday(r.repairEndDate));
        const activeRepairs = safeRepairs.filter(r => ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status));
        const completedRepairs = safeRepairs.filter(r => r.status === 'ซ่อมเสร็จ' && r.repairStartDate && r.repairEndDate);

        // --- 3. KPI Calculations ---
        const totalRepairTime = completedRepairs.reduce((acc, r) => acc + calculateDurationHours(r.repairStartDate, r.repairEndDate), 0);
        const mttrHours = completedRepairs.length > 0 ? totalRepairTime / completedRepairs.length : 0;
        
        const totalDowntime = completedRepairs.reduce((acc: number, r) => acc + calculateDurationHours(r.createdAt, r.repairEndDate), 0);
        const avgDowntimeHours = completedRepairs.length > 0 ? totalDowntime / completedRepairs.length : 0;
        
        const totalCost = completedRepairs.reduce((acc: number, r) => {
            const partsCost = (r.parts || []).reduce((pAcc: number, p) => pAcc + (Number(p.quantity) * Number(p.unitPrice)), 0);
            return acc + (Number(r.repairCost) || 0) + partsCost + (Number(r.partsVat) || 0) + (Number(r.laborVat) || 0);
        }, 0);
        const avgCost = completedRepairs.length > 0 ? totalCost / completedRepairs.length : 0;
        
        const repairTypeCounts = safeRepairs.reduce((acc, r) => { acc[r.repairCategory] = (acc[r.repairCategory] || 0) + 1; return acc; }, {} as Record<string, number>);
        const mostFrequentRepairType = Object.entries(repairTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        const vehicleRepairCounts = safeRepairs.reduce((acc, r) => { acc[r.licensePlate] = (acc[r.licensePlate] || 0) + 1; return acc; }, {} as Record<string, number>);
        const mostServicedVehicle = Object.entries(vehicleRepairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        const overduePlans = safePlans.filter(plan => {
            const nextServiceDate = new Date(plan.lastServiceDate);
            if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
            else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
            else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
            return nextServiceDate < new Date();
        }).length;

        // FIX: The arithmetic operation was causing type errors. Enforcing Number type on operands resolves this issue, which may have been a symptom of a previous syntax error (like a duplicate variable declaration) that confused the linter.
        const pmComplianceRate = safePlans.length > 0 ? ((Number(safePlans.length) - Number(overduePlans)) / Number(safePlans.length)) * 100 : 100;

        // --- 4. Data Formatting for Prompt ---
        const repairsReportedTodayData = repairsReportedToday.map(r => `- ทะเบียน: ${r.licensePlate}, อาการ: ${r.problemDescription}, สถานะ: ${r.status}`).join('\n');
        const repairsCompletedYesterdayData = repairsCompletedYesterday.map(r => `- ทะเบียน: ${r.licensePlate}, การซ่อม: ${r.repairResult || r.problemDescription}`).join('\n');
        const activeRepairsData = activeRepairs.map(r => {
            let latestEstimationDate = '(ไม่มีข้อมูล)';
            if (Array.isArray(r.estimations) && r.estimations.length > 0) {
                const latestEst = [...r.estimations].sort((a, b) => b.sequence - a.sequence)[0];
                if (latestEst && latestEst.estimatedEndDate) {
                    latestEstimationDate = formatDateTime24h(latestEst.estimatedEndDate);
                }
            }
            return `- RO: ${r.repairOrderNo}, ทะเบียน: ${r.licensePlate}, อาการ: ${r.problemDescription}, สถานะ: ${r.status}, คาดว่าจะเสร็จ: ${latestEstimationDate}`;
        }).join('\n');
        
        const totalVehicles = safeVehicles.length;
        const vehicleTypes = [...new Set(safeVehicles.map(v => v.vehicleType).filter(Boolean))].slice(0, 5).join(', ');
        const vehicleMakes = [...new Set(safeVehicles.map(v => v.make).filter(Boolean))].slice(0, 5).join(', ');
        const vehicleSummary = `มีรถในระบบทั้งหมด ${totalVehicles} คัน. ประเภทหลักๆ เช่น: ${vehicleTypes}, etc. ยี่ห้อหลักๆ เช่น: ${vehicleMakes}, etc.` || 'ไม่มีข้อมูลรถ';
        
        const technicianSummary = safeTechnicians.map(t => `- ชื่อ: ${t.name}, ตำแหน่ง: ${t.role}, สถานะ: ${t.status}`).join('\n') || 'ไม่มีข้อมูลช่าง';
        const lowStockItemsSummary = safeStock.filter(s => s.quantity <= s.minStock).map(s => `- ${s.name} (เหลือ ${s.quantity} ${s.unit})`).join('\n') || 'ไม่มีอะไหล่ที่สต็อกต่ำ';

        // --- 5. System Instruction Assembly ---
        return `
            You are "N-Bot", an intelligent AI assistant for a truck maintenance system. Your sole purpose is to provide accurate, data-driven answers based ONLY on the real-time data provided below. You must answer in professional and polite Thai.

            **ABSOLUTE RULES:**
            1.  **NEVER LIE OR HALLUCINATE.** Do not invent information.
            2.  **STICK TO THE DATA.** Your knowledge is strictly limited to the data sections below.
            3.  **IF DATA IS MISSING, SAY SO.** If asked for information not present, you MUST reply with "ดิฉันไม่พบข้อมูลในระบบค่ะ".
            4.  **BE CONCISE.** Provide direct answers.
            5.  **UNDERSTAND DATA CONTEXT.** Use the correct data section for the question.
            6.  **USE THE KPIs.** For questions about averages or performance, use the "Core Maintenance KPIs" section.
            7.  When asked about repairs reported 'today' ('แจ้งซ่อมวันนี้'), use 'Repairs reported today data'.
            8.  When asked for an estimated completion time ('คาดว่าจะเสร็จเมื่อไหร่'), use the 'คาดว่าจะเสร็จ' information for each active repair.
            9.  When asked about events from 'yesterday' ('เมื่อวาน'), you MUST use 'Repairs completed yesterday data'.
            10. For questions about vehicles ('รถ'), use 'Vehicle Data'. This section contains a summary (total count, types, makes). You CANNOT list all vehicles or provide details for a specific vehicle unless that vehicle is also mentioned in the 'Current active repairs data'.
            11. For questions about technicians ('ช่าง'), use 'Technician Data'.
            12. For questions about stock ('สต็อก', 'อะไหล่'), use 'Low Stock Alerts Data'.

            --- REAL-TIME DATA ---

            **1. Repairs reported today data (${new Date().toLocaleDateString('th-TH')}):**
            ${repairsReportedTodayData || 'ไม่มีการแจ้งซ่อมสำหรับวันนี้'}

            **2. Repairs completed yesterday data (ข้อมูลการซ่อมที่เสร็จสิ้นเมื่อวาน):**
            ${repairsCompletedYesterdayData ? `ซ่อมเสร็จทั้งหมด ${repairsCompletedYesterday.length} คัน:\n${repairsCompletedYesterdayData}` : 'ไม่มีข้อมูลการซ่อมที่เสร็จสิ้นเมื่อวาน'}

            **3. Current active repairs data (งานที่ยังซ่อมไม่เสร็จ):**
            ${activeRepairsData || 'ไม่มีงานซ่อมที่ค้างอยู่ในระบบ'}
            
            **4. Vehicle Data (ข้อมูลรถ):**
            ${vehicleSummary}
            
            **5. Technician Data (ข้อมูลช่าง):**
            ${technicianSummary}
            
            **6. Low Stock Alerts Data (ข้อมูลอะไหล่ใกล้หมด):**
            ${lowStockItemsSummary}

            **7. Core Maintenance KPIs (ข้อมูลวิเคราะห์เชิงลึก):**
            - Mean Time To Repair (MTTR - เวลาซ่อมเฉลี่ย): ${formatHoursDescriptive(mttrHours)}
            - Average Vehicle Downtime (เวลาที่รถจอดซ่อมโดยเฉลี่ย): ${formatHoursDescriptive(avgDowntimeHours)}
            - Average Repair Cost (ค่าซ่อมเฉลี่ยต่อครั้ง): ${avgCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท
            - Most Frequent Repair Type (ประเภทงานซ่อมที่พบบ่อยที่สุด): ${mostFrequentRepairType}
            - Most Serviced Vehicle (รถที่เข้าซ่อมบ่อยที่สุด): ${mostServicedVehicle}
            - PM Compliance Rate (อัตราการบำรุงรักษาเชิงป้องกันตามแผน): ${pmComplianceRate.toFixed(1)}%

            --- END OF DATA ---
        `;
    }, [repairs, technicians, plans, vehicles, stock]);

    useEffect(() => {
        if (isOpen) {
            const context = getSystemContext();
            setSystemInstruction(context);

            // Always create a new chat instance when the context might have changed to ensure it has the latest data.
            // FIX: Remove non-null assertion `!` from API key to align with coding guidelines.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatRef.current = ai.chats.create({ 
                model: 'gemini-2.5-flash', 
                config: { systemInstruction: context } 
            });
            
            // Only set the initial welcome message once per opening.
            if (!isInitialized.current) {
                setMessages([
                    { id: '1', text: 'สวัสดีครับ ผม N-Bot ผู้ช่วย AI อัจฉริยะ มีอะไรให้ช่วยวิเคราะห์ข้อมูลไหมครับ?', sender: 'bot' }
                ]);
                isInitialized.current = true;
            }
        } else {
            isInitialized.current = false;
        }
    }, [isOpen, getSystemContext]);
    
    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (input.trim() === '' || !chatRef.current) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response: GenerateContentResponse = await chatRef.current.sendMessage({ message: currentInput });
            
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: response.text, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('Gemini API error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง',
                sender: 'bot'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-8 w-[32rem] h-[75vh] bg-white rounded-xl shadow-2xl flex flex-col z-50">
            <header className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl flex justify-between items-center">
                <h3 className="font-bold text-xl">ผู้ช่วย AI อัจฉริยะ</h3>
                <button onClick={onClose} className="text-white opacity-80 hover:opacity-100 text-3xl font-bold">&times;</button>
            </header>
            <main className="flex-1 p-4 overflow-y-auto bg-slate-50">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                                <p className="text-base whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                     {isLoading && (
                        <div className="flex justify-start">
                             <div className="max-w-sm px-4 py-3 rounded-2xl bg-slate-200 text-slate-800 rounded-bl-none">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t bg-white">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="พิมพ์ข้อความ..."
                        className="flex-1 p-3 border rounded-lg text-base"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="px-5 py-3 bg-blue-500 text-white rounded-lg disabled:bg-blue-300 text-base font-semibold">
                        ส่ง
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Chatbot;