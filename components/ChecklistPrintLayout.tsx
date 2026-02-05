import React from 'react';
import type { DailyChecklist } from '../types';
import { checklistDefinitions, trailerWarnings, checklistWarnings } from '../data/checklist-definitions';

interface ChecklistPrintLayoutProps {
    checklist: DailyChecklist;
}

const ChecklistPrintLayout: React.FC<ChecklistPrintLayoutProps> = ({ checklist }) => {
    const definition = checklistDefinitions[checklist.checklistId];
    if (!definition) return <p>ไม่พบรูปแบบของใบตรวจเช็ค</p>;

    const allItems = definition.sections.flatMap(s => s.items);
    
    // Determine if this is a trailer checklist
    const isTrailer = checklist.checklistId === 'FM-MN-TRAILER';
    const warnings = isTrailer ? trailerWarnings : checklistWarnings;
    
    const logoUrl = "https://img2.pic.in.th/pic/logo-neo.png";

    const getResultClass = (status: string) => {
        if (status.includes('ปกติ') || status === 'ดัง' || status === 'ครบถ้วน' || status === 'ทำแล้ว' || status === 'มี') {
            return 'text-green-700';
        }
        if (status.includes('ไม่') || status.includes('ชำรุด') || status.includes('รั่ว') || status.includes('หลวม') || status === 'ยังไม่ได้ทำ') {
            return 'text-red-700 font-bold';
        }
        return 'text-gray-700';
    };

    return (
        <div className="bg-white font-sarabun text-gray-900 text-[9px] sm:text-[11px] leading-snug mx-auto relative p-1 sm:p-4 w-full">
            {/* --- HEADER SECTION --- */}
            <div className="flex justify-between items-start mb-0.5 sm:mb-2">
                {/* Left: Company Info */}
                <div className="w-3/4 pr-1 sm:pr-4">
                    <h1 className="text-xs sm:text-lg font-bold text-gray-900">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h1>
                    <h2 className="text-[10px] sm:text-sm font-bold text-gray-600 mb-0.5 hidden sm:block">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h2>
                </div>
                {/* Right: Logo */}
                <div className="w-1/4 flex justify-end">
                    <img
                        src={logoUrl}
                        alt="Neosiam Logo"
                        className="h-8 sm:h-14 w-auto object-contain"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>

            <div className="border-b-2 border-gray-800 mb-0.5 sm:mb-2"></div>

            {/* --- DOCUMENT TITLE --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-0.5 sm:mb-2 gap-1">
                <div>
                    <div className="text-sm sm:text-2xl font-bold text-gray-800 tracking-wide">
                        {isTrailer ? 'รายการตรวจสอบหางลาก/หางพ่วง' : 'รายการตรวจสอบรถบรรทุก'}
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-gray-500 tracking-widest hidden sm:block">
                        {isTrailer ? 'TRAILER INSPECTION CHECKLIST' : 'TRUCK INSPECTION CHECKLIST'}
                    </div>
                </div>
                <div className="text-right text-[8px] sm:text-[9px]">
                    <p className="font-bold">เอกสาร: {checklist.checklistId}</p>
                    <p>วันที่: {new Date(checklist.inspectionDate).toLocaleDateString('th-TH')}</p>
                </div>
            </div>

            {/* --- VEHICLE INFO --- */}
            <div className="border border-gray-400 rounded p-1 sm:p-2 mb-1 sm:mb-2 text-[8px] sm:text-[10px]">
                <div className="grid grid-cols-2 gap-0.5 sm:gap-2">
                    <div>
                        <p><span className="font-bold w-12 sm:w-20 inline-block">ทะเบียน:</span> {checklist.vehicleLicensePlate}</p>
                        <p><span className="font-bold w-12 sm:w-20 inline-block">ประเภท:</span> {checklist.vehicleType || '-'}</p>
                    </div>
                    <div>
                        <p><span className="font-bold w-12 sm:w-20 inline-block">ผู้ตรวจ:</span> {checklist.reporterName}</p>
                        <p><span className="font-bold w-12 sm:w-20 inline-block">วันที่ตรวจ:</span> {new Date(checklist.inspectionDate).toLocaleDateString('th-TH')}</p>
                    </div>
                </div>
            </div>

            {/* --- CHECKLIST TABLE --- */}
            <div className="mb-1 sm:mb-2 overflow-x-auto">
                <table className="w-full border-collapse text-[8px] sm:text-[10px] border border-gray-400 min-w-[300px]">
                    <thead className="bg-[#E5E5E5] text-black font-bold">
                        <tr>
                            <th className="border border-gray-400 py-0.5 px-0.5 sm:px-1 w-5 sm:w-8 text-center">ข้อ</th>
                            <th className="border border-gray-400 py-0.5 px-0.5 sm:px-1 text-left">รายการตรวจ</th>
                            <th className="border border-gray-400 py-0.5 px-0.5 sm:px-1 w-14 sm:w-20 text-center">ผล</th>
                            <th className="border border-gray-400 py-0.5 px-0.5 sm:px-1 text-left w-1/4">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allItems.map((item, index) => {
                            const result = checklist.items[item.id];
                            return (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-400 py-0.5 px-0.5 sm:px-1 text-center align-top">{index + 1}</td>
                                    <td className="border border-gray-400 py-0.5 px-0.5 sm:px-1 align-top leading-tight">{item.label.replace(/^\d+\.\s*/, '')}</td>
                                    <td className={`border border-gray-400 py-0.5 px-0.5 sm:px-1 text-center align-top leading-tight ${getResultClass(result?.status || '-')}`}>
                                        {result?.status || '-'}
                                    </td>
                                    <td className="border border-gray-400 py-0.5 px-0.5 sm:px-1 align-top text-[7px] sm:text-[9px] leading-tight">
                                        {result?.notes || ''}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- WARNINGS SECTION --- */}
            <div className="border border-amber-300 bg-amber-50 rounded p-1 sm:p-2 mb-2 sm:mb-3">
                <h3 className="font-bold text-amber-900 border-b border-amber-300 pb-0.5 mb-1 text-[9px] sm:text-[10px]">
                    ⚠️ ข้อเตือนใจ
                </h3>
                <ol className="list-decimal list-inside text-[8px] sm:text-[9px] text-amber-900 space-y-0 leading-tight">
                    {warnings.map((warning, i) => (
                        <li key={i}>{warning.substring(3)}</li>
                    ))}
                </ol>
            </div>

            {/* --- SIGNATURES --- */}
            <div className="mt-2 sm:mt-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-6 text-[9px] sm:text-[10px]">
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-5 sm:h-6"></div>
                        <p className="font-bold mt-0.5">ลงชื่อผู้ตรวจสอบ</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">( {checklist.reporterName} )</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">วันที่ ....../....../......</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-5 sm:h-6"></div>
                        <p className="font-bold mt-0.5">ลงชื่อผู้รับรอง</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">(___________)</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">วันที่ ....../....../......</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-5 sm:h-6"></div>
                        <p className="font-bold mt-0.5">ลงชื่อผู้ควบคุม</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">(___________)</p>
                        <p className="text-gray-500 text-[8px] sm:text-[9px]">วันที่ ....../....../......</p>
                    </div>
                </div>
            </div>

            <div className="text-right text-[8px] sm:text-[9px] text-gray-400 mt-1 sm:mt-2">
                {checklist.checklistId}
            </div>
        </div>
    );
};

export default ChecklistPrintLayout;
