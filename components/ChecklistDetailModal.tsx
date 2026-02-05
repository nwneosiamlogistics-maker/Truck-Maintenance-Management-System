import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { DailyChecklist, RepairFormSeed, ChecklistItemResult } from '../types';
import { checklistDefinitions } from '../data/checklist-definitions';
import ChecklistPrintLayout from './ChecklistPrintLayout';

interface ChecklistDetailModalProps {
    checklist: DailyChecklist;
    onClose: () => void;
    onNavigateAndCreateRepair: (seedData: RepairFormSeed) => void;
    userRole: string;
}

const ChecklistDetailModal: React.FC<ChecklistDetailModalProps> = ({ checklist, onClose, onNavigateAndCreateRepair, userRole }) => {
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
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                                font-family: 'Sarabun', sans-serif; 
                                width: 210mm;
                                min-height: 297mm;
                                margin: 0 auto;
                                padding: 8mm;
                            }
                            @media print {
                                @page { size: A4 portrait; margin: 8mm; }
                                body { padding: 0; width: 194mm; }
                                .no-print { display: none; }
                            }
                            @media screen {
                                body { 
                                    background: white;
                                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                    margin: 20px auto;
                                }
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b flex justify-between items-center no-print">
                    <div>
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-800">รายละเอียดใบตรวจเช็ค</h3>
                        <p className="text-sm sm:text-base text-gray-500">{checklist.vehicleLicensePlate} - {new Date(checklist.inspectionDate).toLocaleDateString('th-TH')}</p>
                    </div>
                    <button onClick={onClose} title="Close" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-3 sm:p-6 overflow-y-auto overflow-x-auto">
                    <div className="min-w-[320px]">
                        <ChecklistPrintLayout checklist={checklist} />
                    </div>
                </div>
                <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 no-print">
                    <div>
                        {abnormalItems.length > 0 && userRole !== 'inspector' && userRole !== 'driver' && (
                            <button onClick={handleCreateRepair} className="px-4 sm:px-6 py-2 text-sm sm:text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 w-full sm:w-auto">
                                สร้างใบแจ้งซ่อม ({abnormalItems.length} รายการ)
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handlePrint} className="px-4 sm:px-6 py-2 text-sm sm:text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 flex-1 sm:flex-none">พิมพ์</button>
                        <button onClick={onClose} className="px-4 sm:px-8 py-2 text-sm sm:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex-1 sm:flex-none">ปิด</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChecklistDetailModal;
