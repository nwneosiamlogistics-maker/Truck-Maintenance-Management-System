import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { DailyChecklist, RepairFormSeed, ChecklistItemResult } from '../types';
import { checklistDefinitions } from '../data/checklist-definitions';
import ChecklistPrintLayout from './ChecklistPrintLayout';

interface ChecklistDetailModalProps {
    checklist: DailyChecklist;
    onClose: () => void;
    onNavigateAndCreateRepair: (seedData: RepairFormSeed) => void;
}

const ChecklistDetailModal: React.FC<ChecklistDetailModalProps> = ({ checklist, onClose, onNavigateAndCreateRepair }) => {
    const definition = checklistDefinitions[checklist.checklistId];
    if (!definition) return null;

    const abnormalItems = Object.entries(checklist.items)
        .filter(([, result]: [string, ChecklistItemResult]) => 
            result.status.includes('ไม่ปกติ') || 
            result.status.includes('ชำรุด') || 
            result.status.includes('ไม่ดัง') || 
            result.status.includes('ไม่ติด') ||
            result.status.includes('เติมบ่อย') ||
            result.status.includes('ขาดบ่อย') ||
            result.status.includes('ติดยาก') ||
            (result.status.includes('มีรอยบุบ') && result.notes.trim() !== '') ||
            (result.status.includes('มีเสียที่..') && result.notes.trim() !== '')
        )
        .map(([itemId]) => {
            const itemDef = definition.sections.flatMap(s => s.items).find(i => i.id === itemId);
            const notesText = checklist.items[itemId].notes ? ` (${checklist.items[itemId].notes})` : '';
            return itemDef ? `${itemDef.label}: ${checklist.items[itemId].status}${notesText}` : 'Unknown issue';
        });

    const handleCreateRepair = () => {
        const problemDescription = `สร้างจากใบตรวจเช็คประจำวัน:\n- ${abnormalItems.join('\n- ')}`;
        const seedData: RepairFormSeed = {
            licensePlate: checklist.vehicleLicensePlate,
            vehicleType: checklist.vehicleType,
            reportedBy: checklist.reporterName,
            problemDescription: problemDescription,
        };
        onNavigateAndCreateRepair(seedData);
        onClose();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = ReactDOMServer.renderToString(<ChecklistPrintLayout checklist={checklist} />);
            printWindow.document.write(`
                <html>
                    <head>
                        <title>ใบตรวจเช็ค ${checklist.vehicleLicensePlate}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Sarabun', sans-serif; }
                            @media print {
                                @page { size: A4; margin: 0.5in; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>${printContent}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center no-print">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">รายละเอียดใบตรวจเช็ค</h3>
                        <p className="text-base text-gray-500">{checklist.vehicleLicensePlate} - {new Date(checklist.inspectionDate).toLocaleDateString('th-TH')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <ChecklistPrintLayout checklist={checklist} />
                </div>
                <div className="p-6 border-t flex justify-between items-center bg-gray-50 no-print">
                    <div>
                        {abnormalItems.length > 0 && (
                            <button onClick={handleCreateRepair} className="px-6 py-2 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
                                สร้างใบแจ้งซ่อม ({abnormalItems.length} รายการ)
                            </button>
                        )}
                    </div>
                    <div className="space-x-4">
                        <button onClick={handlePrint} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">พิมพ์</button>
                        <button onClick={onClose} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">ปิด</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChecklistDetailModal;
