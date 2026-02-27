import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import type { IncabAssessment } from '../types';

interface Props {
    assessment: IncabAssessment;
    onClose: () => void;
}

const LOGO_URL = '/logo.png';
const COMPANY_TH = 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด';
const COMPANY_EN = 'NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.';

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function IncabAssessmentPrintModal({ assessment: a, onClose }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    const passCount = Object.values(a.drivingChecklist).filter(v => v === 'pass').length;
    const drivingPct = Math.round((passCount / 6) * 100);

    const DRIVING_LABELS: Record<string, string> = {
        parking: 'การจอดรถ', reversing: 'การกลับรถ', speedControl: 'ความเร็วในเขต',
        mirrorUsage: 'การใช้กระจก', signalUsage: 'การให้สัญญาณ', laneKeeping: 'การรักษาช่องทาง',
    };

    const handlePrint = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body > *:not(#incab-print-root) { display: none !important; }
                #incab-print-root { display: block !important; position: static !important; background: white !important; }
                @page { size: A4 portrait; margin: 15mm; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        document.head.removeChild(style);
    };

    const handleDownloadPDF = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = 210, ph = 297, ml = 15, mr = 15, mt = 15;
        let y = mt;

        // --- Header ---
        try {
            const img = new Image(); img.crossOrigin = 'anonymous'; img.src = LOGO_URL;
            await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 2000); });
            if (img.complete && img.naturalWidth > 0) doc.addImage(img, 'PNG', pw / 2 - 18, y, 36, 14);
        } catch { /* skip logo */ }
        y += 18;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 40, 100);
        doc.text(COMPANY_TH, pw / 2, y, { align: 'center' }); y += 5.5;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
        doc.text(COMPANY_EN, pw / 2, y, { align: 'center' }); y += 5;

        doc.setDrawColor(20, 40, 100); doc.setLineWidth(0.8);
        doc.line(ml, y, pw - mr, y); y += 1;
        doc.setLineWidth(0.3); doc.line(ml, y, pw - mr, y); y += 6;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 40, 100);
        doc.text('แบบฟอร์มใบทดสอบพนักงานขับรถก่อนทำงานจริง', pw / 2, y, { align: 'center' }); y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
        doc.text('การทดสอบนี้เพื่อทราบถึงความสามารถในการควบคุมรถขนส่ง เพื่อความปลอดภัยในการขับขี่', pw / 2, y, { align: 'center' }); y += 8;

        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(`ชื่อ-นามสกุล ผู้ทดสอบ: ${a.driverName} (${a.employeeId})`, ml, y); y += 6;
        doc.text(`วันที่: ${fmt(a.date)}`, ml, y); y += 8;

        // --- ส่วนที่ 1 ---
        doc.setFillColor(41, 82, 163); doc.rect(ml, y, pw - ml - mr, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255);
        doc.text(`1. การทดสอบร่างกาย`, ml + 3, y + 5);
        doc.setFont('helvetica', 'normal'); doc.text(`คะแนน ${a.visionScore}/30`, pw - mr - 3, y + 5, { align: 'right' });
        y += 10; doc.setTextColor(0); doc.setFontSize(9);

        doc.text('การทดสอบสายตาและการมองเห็น', ml + 3, y); y += 5;
        doc.text('1.1 การมองเห็นของสายตา', ml + 6, y); y += 5;
        const eyeOpts = [['short', 'สายตาสั้น'], ['long', 'สายตายาว'], ['normal', 'สายตาปกติ']];
        let ex = ml + 10;
        eyeOpts.forEach(([v, lbl]) => {
            const checked = a.visionTest.eyeSight === v;
            if (checked) { doc.setFillColor(0, 0, 0); doc.circle(ex + 2, y - 1.5, 2, 'FD'); doc.circle(ex + 2, y - 1.5, 1, 'F'); doc.setFillColor(255, 255, 255); }
            else { doc.circle(ex + 2, y - 1.5, 2, 'S'); }
            doc.text(lbl, ex + 6, y); ex += 42;
        });
        y += 6;
        doc.text('1.2 การทดสอบการมองเห็นที่', ml + 6, y); y += 5;
        const colorOpts = [['deficient', 'ตาบอดสี'], ['normal', 'สายตาปกติ']];
        ex = ml + 10;
        colorOpts.forEach(([v, lbl]) => {
            const checked = a.visionTest.colorVision === v;
            if (checked) { doc.setFillColor(0, 0, 0); doc.circle(ex + 2, y - 1.5, 2, 'FD'); doc.setFillColor(255, 255, 255); }
            else { doc.circle(ex + 2, y - 1.5, 2, 'S'); }
            doc.text(lbl, ex + 6, y); ex += 50;
        });
        y += 6;
        doc.text('1.3 การได้ยิน', ml + 6, y); y += 5;
        const hearOpts = [['normal', 'ปกติ'], ['deficient', 'บกพร่อง']];
        ex = ml + 10;
        hearOpts.forEach(([v, lbl]) => {
            const checked = a.visionTest.hearing === v;
            if (checked) { doc.setFillColor(0, 0, 0); doc.circle(ex + 2, y - 1.5, 2, 'FD'); doc.setFillColor(255, 255, 255); }
            else { doc.circle(ex + 2, y - 1.5, 2, 'S'); }
            doc.text(lbl, ex + 6, y); ex += 40;
        });
        y += 8;

        // --- ส่วนที่ 2 ---
        doc.setFillColor(88, 28, 135); doc.rect(ml, y, pw - ml - mr, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255);
        doc.text('2. การทดสอบสภาพจิตใจและการแก้ปัญหา', ml + 3, y + 5);
        doc.text(`คะแนน ${a.situationScore}/30`, pw - mr - 3, y + 5, { align: 'right' });
        y += 10; doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'normal');

        const qItems = [
            { label: '2.1 หากต้องส่งสินค้าเร่งด่วน ท่านคิดว่าท่านจะทำอย่างไร', answer: a.situationQ1, score: a.situationQ1Score },
            { label: '2.2 หากขับรถแล้วมีรถขับปาดหน้าท่านอย่างกะทันหัน ท่านจะแก้ปัญหาอย่างไร', answer: a.situationQ2, score: a.situationQ2Score },
            { label: '2.3 หากผู้ร่วมทางโต้เถียงหรือสร้างความเครียด ท่านจะจัดการอย่างไร', answer: a.situationQ3, score: a.situationQ3Score },
        ];
        qItems.forEach(q => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(q.label, ml + 3, y); y += 4;
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(q.answer || '(ไม่ได้ตอบ)', pw - ml - mr - 10);
            doc.text(lines, ml + 6, y); y += lines.length * 4 + 1;
            for (let i = 0; i < 3; i++) {
                doc.setDrawColor(180); doc.line(ml + 6, y, pw - mr - 6, y); y += 4;
            }
            doc.setTextColor(100); doc.text(`คะแนน: ${q.score}/5`, pw - mr - 3, y - 3, { align: 'right' }); doc.setTextColor(0);
            y += 3;
        });
        y += 2;

        // --- ส่วนที่ 3 ---
        doc.setFillColor(13, 148, 136); doc.rect(ml, y, pw - ml - mr, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255);
        doc.text('3. การทดการขับขี่', ml + 3, y + 5);
        doc.text(`คะแนน ${a.drivingScore}/40 (${drivingPct}%)`, pw - mr - 3, y + 5, { align: 'right' });
        y += 10; doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'normal');

        const dlKeys = Object.keys(a.drivingChecklist) as (keyof typeof a.drivingChecklist)[];
        dlKeys.forEach((k, i) => {
            const val = a.drivingChecklist[k];
            const x = i % 2 === 0 ? ml + 6 : pw / 2 + 3;
            if (i % 2 === 0 && i > 0) y += 6;
            if (val === 'pass') doc.setFillColor(34, 197, 94);
            else if (val === 'fail') doc.setFillColor(220, 38, 38);
            else doc.setFillColor(200, 200, 200);
            doc.rect(x, y - 3.5, 3, 3, 'F'); doc.setFillColor(255, 255, 255);
            doc.text(`${DRIVING_LABELS[k]}: ${val === 'pass' ? 'ผ่าน' : val === 'fail' ? 'ไม่ผ่าน' : '-'}`, x + 5, y);
        });
        y += 8;

        // --- คะแนนรวม ---
        if (a.result === 'pass') doc.setFillColor(5, 150, 105);
        else doc.setFillColor(220, 38, 38);
        doc.rect(ml, y, pw - ml - mr, 10, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255);
        doc.text(`คะแนนรวม: ${a.totalScore}/100  —  ${a.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}`, pw / 2, y + 7, { align: 'center' });
        y += 16; doc.setTextColor(0);

        // --- ลายเซ็น ---
        doc.setDrawColor(0); doc.setLineWidth(0.3);
        const leftX = ml + 5, rightX = pw / 2 + 10, lineW = 60, sigY = y + 14;
        doc.line(leftX, sigY, leftX + lineW, sigY);
        doc.line(rightX, sigY, rightX + lineW, sigY);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(a.assessor ? `(${a.assessor})` : '(................................)', leftX + lineW / 2, sigY + 4, { align: 'center' });
        doc.text('ผู้ประเมิน', leftX + lineW / 2, sigY + 8, { align: 'center' });
        const approvalLabel = a.approvalStatus === 'approved' ? '☑ อนุมัติ  ☐ ไม่อนุมัติ'
            : a.approvalStatus === 'rejected' ? '☐ อนุมัติ  ☑ ไม่อนุมัติ'
            : '☐ อนุมัติ  ☐ ไม่อนุมัติ';
        doc.text(approvalLabel, rightX + lineW / 2, sigY - 4, { align: 'center' });
        doc.text(a.approvedBy ? `(${a.approvedBy})` : '(................................)', rightX + lineW / 2, sigY + 4, { align: 'center' });
        doc.text('ผู้บังคับบัญชา', rightX + lineW / 2, sigY + 8, { align: 'center' });
        y = sigY + 14;

        // --- Footer ---
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(7); doc.setTextColor(150);
            doc.text(`${COMPANY_TH}  |  พิมพ์: ${new Date().toLocaleString('th-TH')}`, pw / 2, ph - 8, { align: 'center' });
            doc.text(`หน้า ${p}/${totalPages}`, pw - mr, ph - 8, { align: 'right' });
        }

        doc.save(`IncabAssessment_${a.driverName}_${a.date}.pdf`);
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">

                {/* Toolbar */}
                <div className="px-5 py-3 bg-slate-800 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-white">📄 พรีวิวแบบฟอร์มทดสอบ — {a.driverName}</h2>
                        <p className="text-slate-400 text-xs">Incab Assessment Preview</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                            🖨 พิมพ์
                        </button>
                        <button onClick={handleDownloadPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                            ⬇ PDF
                        </button>
                        <button onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-lg">×</button>
                    </div>
                </div>

                {/* Preview */}
                <div className="overflow-y-auto flex-1 bg-slate-100 p-4">
                    <div id="incab-print-root" ref={printRef}
                        className="bg-white shadow-lg mx-auto max-w-[210mm] p-10 font-sans text-sm text-slate-800"
                        style={{ fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif", minHeight: '297mm' }}>

                        {/* หัวกระดาษ */}
                        <div className="flex flex-col items-center mb-4">
                            <img src={LOGO_URL} alt="logo" className="h-16 object-contain mb-1"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            <div className="text-base font-bold text-blue-900">{COMPANY_TH}</div>
                            <div className="text-xs text-slate-500">{COMPANY_EN}</div>
                            <div className="w-full border-t-4 border-blue-900 mt-2 mb-1" />
                            <div className="w-full border-t border-blue-900 mb-3" />
                            <div className="text-lg font-bold text-blue-900 text-center">แบบฟอร์มใบทดสอบพนักงานขับรถก่อนทำงานจริง</div>
                            <div className="text-xs text-slate-500 text-center mt-0.5">การทดสอบนี้เพื่อทราบถึงความสามารถในการควบคุมรถขนส่ง เพื่อความปลอดภัยในการขับขี่</div>
                        </div>

                        {/* ข้อมูล */}
                        <div className="mb-4 space-y-1.5 text-sm">
                            <div>ชื่อ-นามสกุล ผู้ทดสอบ: <span className="font-semibold">{a.driverName}</span>
                                <span className="text-slate-400 ml-2 text-xs">({a.employeeId})</span>
                                <span className="ml-6">วันที่: <span className="font-semibold">{fmt(a.date)}</span></span>
                            </div>
                        </div>

                        {/* ส่วนที่ 1 */}
                        <div className="mb-4">
                            <div className="bg-blue-800 text-white text-sm font-bold px-3 py-1.5 rounded-t flex justify-between">
                                <span>1. การทดสอบร่างกาย</span>
                                <span className="font-normal text-blue-200">คะแนน {a.visionScore}/30</span>
                            </div>
                            <div className="border border-blue-200 rounded-b p-3 space-y-3 text-xs">
                                <div>
                                    <div className="font-semibold mb-1 text-slate-600">การทดสอบสายตาและการมองเห็น</div>
                                    <div className="ml-2 mb-1.5">
                                        <span className="text-slate-500">1.1 การมองเห็นของสายตา</span>
                                        <div className="flex flex-wrap gap-4 mt-1 ml-3">
                                            {[['short', 'สายตาสั้น'], ['long', 'สายตายาว'], ['normal', 'สายตาปกติ']].map(([v, l]) => (
                                                <label key={v} className="flex items-center gap-1.5">
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${a.visionTest.eyeSight === v ? 'border-blue-800 bg-blue-800' : 'border-slate-400'}`}>
                                                        {a.visionTest.eyeSight === v && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </span>
                                                    {l}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ml-2 mb-1.5">
                                        <span className="text-slate-500">1.2 การทดสอบการมองเห็นที่</span>
                                        <div className="flex flex-wrap gap-4 mt-1 ml-3">
                                            {[['deficient', 'ตาบอดสี'], ['normal', 'สายตาปกติ']].map(([v, l]) => (
                                                <label key={v} className="flex items-center gap-1.5">
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${a.visionTest.colorVision === v ? 'border-blue-800 bg-blue-800' : 'border-slate-400'}`}>
                                                        {a.visionTest.colorVision === v && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </span>
                                                    {l}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ml-2">
                                        <span className="text-slate-500">1.3 การได้ยิน</span>
                                        <div className="flex flex-wrap gap-4 mt-1 ml-3">
                                            {[['normal', 'ปกติ'], ['deficient', 'บกพร่อง']].map(([v, l]) => (
                                                <label key={v} className="flex items-center gap-1.5">
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${a.visionTest.hearing === v ? 'border-blue-800 bg-blue-800' : 'border-slate-400'}`}>
                                                        {a.visionTest.hearing === v && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </span>
                                                    {l}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ส่วนที่ 2 */}
                        <div className="mb-4">
                            <div className="bg-purple-800 text-white text-sm font-bold px-3 py-1.5 rounded-t flex justify-between">
                                <span>2. การทดสอบสภาพจิตใจและการแก้ปัญหา</span>
                                <span className="font-normal text-purple-200">คะแนน {a.situationScore}/30</span>
                            </div>
                            <div className="border border-purple-200 rounded-b p-3 space-y-3 text-xs">
                                {[
                                    { q: '2.1 หากต้องส่งสินค้าเร่งด่วน ท่านคิดว่าท่านจะทำอย่างไร', ans: a.situationQ1, sc: a.situationQ1Score },
                                    { q: '2.2 หากขับรถแล้วมีรถขับปาดหน้าท่านอย่างกะทันหัน ท่านจะแก้ปัญหาอย่างไร', ans: a.situationQ2, sc: a.situationQ2Score },
                                    { q: '2.3 หากผู้ร่วมทางโต้เถียงหรือสร้างความเครียดให้ท่าน ท่านจะจัดการอย่างไร', ans: a.situationQ3, sc: a.situationQ3Score },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <div className="font-semibold text-slate-700 mb-1">{item.q}</div>
                                        <div className="ml-2 min-h-[32px] text-slate-600 italic">{item.ans || '(ไม่ได้ตอบ)'}</div>
                                        <div className="border-b border-slate-200 mt-1" />
                                        <div className="border-b border-slate-200 mt-2" />
                                        <div className="border-b border-slate-200 mt-2" />
                                        <div className="text-right text-slate-500 mt-1">คะแนน: <span className="font-bold text-purple-700">{item.sc}/5</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ส่วนที่ 3 */}
                        <div className="mb-4">
                            <div className="bg-teal-700 text-white text-sm font-bold px-3 py-1.5 rounded-t flex justify-between">
                                <span>3. การทดการขับขี่</span>
                                <span className="font-normal text-teal-200">คะแนน {a.drivingScore}/40 ({drivingPct}%)</span>
                            </div>
                            <div className="border border-teal-200 rounded-b p-3 text-xs">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {Object.entries(a.drivingChecklist).map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between border-b border-slate-100 pb-1">
                                            <span className="text-slate-600">{DRIVING_LABELS[k]}</span>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1">
                                                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px] ${v === 'pass' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'}`}>
                                                        {v === 'pass' ? '✓' : ''}
                                                    </span>
                                                    ผ่าน
                                                </label>
                                                <label className="flex items-center gap-1">
                                                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px] ${v === 'fail' ? 'bg-red-500 border-red-500 text-white' : 'border-slate-400'}`}>
                                                        {v === 'fail' ? '✓' : ''}
                                                    </span>
                                                    ไม่ผ่าน
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* คะแนนรวม */}
                        <div className={`rounded-xl p-3 mb-4 flex items-center justify-between text-sm ${
                            a.result === 'pass' ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-red-50 border-2 border-red-400'
                        }`}>
                            <div className="text-slate-600">
                                <span className="font-bold">คะแนนรวม</span>
                                <span className="text-xs ml-2">
                                    (ร่างกาย {a.visionScore}/30 + จิตใจ {a.situationScore}/30 + ขับขี่ {a.drivingScore}/40)
                                </span>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-black ${a.result === 'pass' ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {a.totalScore}
                                </span>
                                <span className="text-xs text-slate-500">/100</span>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                                    a.result === 'pass' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                                }`}>
                                    {a.result === 'pass' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                                </span>
                            </div>
                        </div>

                        {/* ท้ายกระดาษ — ช่องเซ็น */}
                        <div className="border border-slate-300 rounded-xl mt-5 overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 tracking-wide border-b border-slate-300">
                                การรับรองและอนุมัติ
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-slate-200">

                                {/* ฝั่งซ้าย — ผู้ประเมิน */}
                                <div className="px-6 py-6 flex flex-col items-center">
                                    <div className="text-xs text-slate-500 mb-1">ลงชื่อผู้ประเมิน</div>
                                    {/* พื้นที่เซ็น */}
                                    <div className="w-full h-16 border border-dashed border-slate-300 rounded-lg bg-slate-50/60 mb-3" />
                                    {/* เส้นชื่อ */}
                                    <div className="w-4/5 border-b-2 border-slate-400 mb-1.5" />
                                    <div className="text-xs font-semibold text-slate-700">
                                        ({a.assessor || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'})
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 font-medium">ผู้ประเมิน</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        วันที่ ........./........./...........
                                    </div>
                                </div>

                                {/* ฝั่งขวา — ผู้บังคับบัญชา */}
                                <div className="px-6 py-6 flex flex-col items-center">
                                    {/* checkbox อนุมัติ */}
                                    <div className="flex gap-5 mb-3">
                                        <label className="flex items-center gap-1.5 text-xs cursor-default">
                                            <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                a.approvalStatus === 'approved'
                                                    ? 'bg-blue-700 border-blue-700 text-white'
                                                    : 'border-slate-400 bg-white'
                                            }`}>
                                                {a.approvalStatus === 'approved' ? '✓' : ''}
                                            </span>
                                            <span className={a.approvalStatus === 'approved' ? 'font-bold text-blue-700' : 'text-slate-600'}>
                                                อนุมัติ
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-default">
                                            <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                a.approvalStatus === 'rejected'
                                                    ? 'bg-red-500 border-red-500 text-white'
                                                    : 'border-slate-400 bg-white'
                                            }`}>
                                                {a.approvalStatus === 'rejected' ? '✓' : ''}
                                            </span>
                                            <span className={a.approvalStatus === 'rejected' ? 'font-bold text-red-600' : 'text-slate-600'}>
                                                ไม่อนุมัติ
                                            </span>
                                        </label>
                                    </div>
                                    {/* พื้นที่เซ็น */}
                                    <div className="w-full h-16 border border-dashed border-slate-300 rounded-lg bg-slate-50/60 mb-3" />
                                    {/* เส้นชื่อ */}
                                    <div className="w-4/5 border-b-2 border-slate-400 mb-1.5" />
                                    <div className="text-xs font-semibold text-slate-700">
                                        ({a.approvedBy || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'})
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 font-medium">ผู้บังคับบัญชา</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        วันที่ ........./........./...........
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* หลักฐาน */}
                        {a.evidenceFiles.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-xs text-slate-500">
                                <span className="font-semibold text-slate-600">หลักฐานแนบ ({a.evidenceFiles.length} ไฟล์):</span>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                    {a.evidenceFiles.map((url, i) => (
                                        url.toLowerCase().includes('.pdf')
                                            ? <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📄 PDF [{i + 1}]</a>
                                            : <a key={i} href={url} target="_blank" rel="noreferrer" title={`หลักฐาน ${i+1}`}>
                                                <img src={url} alt={`หลักฐาน ${i + 1}`} className="h-14 w-14 object-cover rounded border border-slate-200 hover:border-blue-300" />
                                              </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-8 pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                            <span>{COMPANY_TH}</span>
                            <span>พิมพ์: {new Date().toLocaleString('th-TH')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
