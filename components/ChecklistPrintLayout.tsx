import React from 'react';
import type { DailyChecklist } from '../types';
import { checklistDefinitions } from '../data/checklist-definitions';

interface ChecklistPrintLayoutProps {
    checklist: DailyChecklist;
}

const ChecklistPrintLayout: React.FC<ChecklistPrintLayoutProps> = ({ checklist }) => {
    const definition = checklistDefinitions[checklist.checklistId];
    if (!definition) return <p>ไม่พบรูปแบบของใบตรวจเช็ค</p>;

    const allItems = definition.sections.flatMap(s => s.items);
    // Split items into two columns for better A4 layout
    const midPoint = Math.ceil(allItems.length / 2);
    const column1Items = allItems.slice(0, midPoint);
    const column2Items = allItems.slice(midPoint);

    const isAbnormal = (status: string, notes: string): boolean => {
        const lowerStatus = status.toLowerCase();
        return (
            lowerStatus.includes('ไม่ปกติ') ||
            lowerStatus.includes('ชำรุด') ||
            lowerStatus.includes('ไม่ดัง') ||
            lowerStatus.includes('ไม่ติด') ||
            (lowerStatus.includes('มีรอยบุบ') && notes.trim() !== '') ||
            (lowerStatus.includes('มีเสียที่..') && notes.trim() !== '') ||
            lowerStatus.includes('เติมบ่อย') ||
            lowerStatus.includes('ขาดบ่อย') ||
            lowerStatus.includes('ติดยาก')
        );
    };

    const renderTableColumn = (items: typeof allItems) => (
        <table className="w-full border-collapse border">
            <thead className="bg-gray-100">
                <tr>
                    <th className="border p-2 text-left text-base">รายการ</th>
                    <th className="border p-2 text-left text-base">ผลการตรวจ</th>
                </tr>
            </thead>
            <tbody>
                {items.map(item => {
                    const result = checklist.items[item.id];
                    if (!result) return null;
                    const abnormal = isAbnormal(result.status, result.notes);
                    return (
                        <tr key={item.id} className={abnormal ? 'bg-gray-100' : ''}>
                            <td className="border px-2 py-1 align-top text-base">{item.label}</td>
                            <td className="border px-2 py-1 align-top text-base">
                                {result.status}
                                {result.notes && <span className="italic text-gray-600"> ({result.notes})</span>}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <div className="bg-white p-4 font-sans text-sm" style={{ display: 'flex', flexDirection: 'column', minHeight: '95vh' }}>
            {/* Header */}
            <header className="flex justify-between items-center pb-2 border-b-2 border-gray-800">
                <div>
                    <h1 className="text-xl font-bold">NEOSIAM LOGISTICS & TRANSPORT</h1>
                    <p className="text-lg font-semibold">{definition.title}</p>
                </div>
                <div className="text-right text-xs">
                    <p className="font-mono">เอกสาร: {checklist.checklistId}</p>
                </div>
            </header>
            
            {/* Info Section */}
            <section className="grid grid-cols-2 gap-x-6 gap-y-1 my-3 text-base border p-2 rounded-md">
                <div><strong>ทะเบียน:</strong> {checklist.vehicleLicensePlate}</div>
                <div><strong>ประเภทรถ:</strong> {checklist.vehicleType}</div>
                <div><strong>วันที่ตรวจ:</strong> {new Date(checklist.inspectionDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div><strong>ผู้รายงาน:</strong> {checklist.reporterName}</div>
            </section>

            {/* Items Section */}
            <main className="grid grid-cols-2 gap-x-4 flex-grow">
                <div>{renderTableColumn(column1Items)}</div>
                <div>{renderTableColumn(column2Items)}</div>
            </main>
            
            {/* Footer */}
            <footer className="mt-auto pt-12">
                <div className="grid grid-cols-3 gap-8 text-base">
                    <div className="text-center">
                        <p className="pt-8 border-t border-dotted border-gray-400">({checklist.reporterName})</p>
                        <p className="font-semibold">ผู้รายงาน</p>
                    </div>
                    <div className="text-center">
                        <p className="pt-8 border-t border-dotted border-gray-400">(...........................................)</p>
                        <p className="font-semibold">ผู้รับรายงาน</p>
                    </div>
                    <div className="text-center">
                        <p className="pt-8 border-t border-dotted border-gray-400">(...........................................)</p>
                        <p className="font-semibold">ผู้จัดการ/ผู้รับมอบอำนาจ</p>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-400 mt-4">
                    หน้า 1/1
                </div>
            </footer>
        </div>
    );
};

export default ChecklistPrintLayout;
