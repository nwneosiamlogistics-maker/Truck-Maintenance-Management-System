import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { SafetyCheck } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COMPANY_NAME = 'NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.';
const COMPANY_NAME_TH = 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด';
const COMPANY_ADDRESS = '159/9-10 หมู่ 7 ต.บางมวง อ.เมือง จ.นครสวรรค์ 60000';
const LOGO_URL = '/logo.png';

interface Props {
    check: SafetyCheck;
    onClose: () => void;
}

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const formatDateTH = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const TITLE_MAP = {
    alcohol: {
        th: 'รายชื่อพนักงานที่ผ่านการตรวจแอลกอฮอล์',
        en: 'Name list of personnel who passed alcohol check',
        resultHeader: ['ผลตรวจ', '(Alcohol level)'],
        methodTH: 'วัดระดับแอลกอฮอล์ (Breathalyzer)',
    },
    substance: {
        th: 'รายชื่อพนักงานที่ผ่านการตรวจปัสสาวะหาสารเสพติด',
        en: 'Name list of personnel who passed Urine Test for Substance Abuse',
        resultHeader: ['ผลตรวจ', '(Found / Not Found)'],
        methodTH: 'ตรวจปัสสาวะหาสารเสพติด (Urine Test)',
    },
};

const PRINT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    @page { size: A4 portrait; margin: 12mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Sarabun', 'TH SarabunPSK', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }
    .page { width: 100%; }
    /* Header */
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 10px; }
    .logo { height: 60px; width: auto; object-fit: contain; }
    .company-block { flex: 1; }
    .company-name-en { font-size: 10pt; font-weight: 700; color: #1e3a5f; line-height: 1.3; }
    .company-name-th { font-size: 9pt; color: #444; line-height: 1.4; }
    .company-addr { font-size: 8pt; color: #666; margin-top: 2px; }
    .doc-ref { text-align: right; font-size: 8pt; color: #555; min-width: 130px; }
    /* Title block */
    .title-block { text-align: center; margin: 6px 0 10px; }
    .title-th { font-size: 14pt; font-weight: 700; color: #1e3a5f; }
    .title-en { font-size: 10pt; color: #555; margin-top: 2px; }
    /* Meta row */
    .meta-row { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 8px; }
    .meta-item { display: flex; gap: 6px; }
    .meta-label { color: #555; }
    .meta-value { font-weight: 600; }
    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #1e3a5f; color: #fff; padding: 5px 6px; text-align: center; font-size: 9pt; border: 1px solid #1e3a5f; line-height: 1.4; }
    td { border: 1px solid #aaa; padding: 4px 6px; font-size: 9.5pt; vertical-align: middle; }
    tr:nth-child(even) td { background: #f7f9fc; }
    tr.fail-row td { background: #fff0f0 !important; }
    .col-no { text-align: center; width: 28px; }
    .col-result { text-align: center; font-weight: 700; font-size: 11pt; width: 70px; }
    .col-remark { width: 90px; }
    .pass-val { color: #166534; }
    .fail-val { color: #991b1b; }
    /* Summary */
    .summary { font-size: 10pt; margin: 6px 0 16px; display: flex; gap: 20px; }
    .sum-pass { color: #166534; font-weight: 700; }
    .sum-fail { color: #991b1b; font-weight: 700; }
    /* Signature */
    .sign-section { display: flex; justify-content: flex-end; margin-top: 24px; }
    .sign-box { text-align: center; min-width: 200px; }
    .sign-dept { font-size: 10pt; font-weight: 700; color: #1e3a5f; margin-bottom: 36px; }
    .sign-line { border-bottom: 1px dashed #555; width: 200px; margin: 0 auto 6px; }
    .sign-name { font-size: 10pt; font-weight: 600; }
    .sign-title { font-size: 9pt; color: #555; }
    /* Evidence */
    .evidence { margin-top: 12px; font-size: 8.5pt; color: #666; border-top: 1px dashed #ccc; padding-top: 6px; }
    /* Footer */
    .footer { position: fixed; bottom: 8mm; left: 16mm; right: 16mm; font-size: 7.5pt; color: #aaa; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 4px; }
`;

export default function SafetyCheckPrintModal({ check, onClose }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    const meta = TITLE_MAP[check.type];
    const passedAttendees = check.attendees.filter(a => a.result === 'pass');
    const failedAttendees = check.attendees.filter(a => a.result === 'fail');
    const ROWS = Math.max(15, check.attendees.length + 5);
    const paddedAttendees = [
        ...check.attendees,
        ...Array(Math.max(0, ROWS - check.attendees.length)).fill(null),
    ];

    const buildPrintHTML = () => {
        const rows = paddedAttendees.map((a, i) => {
            const isFail = a?.result === 'fail';
            const resultDisplay = a
                ? check.type === 'alcohol'
                    ? `<span class="${isFail ? 'fail-val' : 'pass-val'}">${a.alcoholLevel !== undefined ? a.alcoholLevel.toFixed(2) + ' mg%' : '0.00'}</span>`
                    : `<span class="${isFail ? 'fail-val' : 'pass-val'}">${a.result === 'pass' ? 'Not Found ✓' : 'Found ✗'}</span>`
                : '';
            return `<tr class="${isFail ? 'fail-row' : ''}">
                <td class="col-no">${i + 1}</td>
                <td>${a ? `<span ${isFail ? 'style="font-weight:600"' : ''}>${a.name}</span>` : ''}</td>
                <td style="text-align:center">${a?.position ?? ''}</td>
                <td>${a?.company ?? ''}</td>
                <td class="col-result">${resultDisplay}</td>
                <td class="col-remark">${a?.remark ?? ''}</td>
            </tr>`;
        }).join('');

        const evidenceHtml = check.evidenceFiles.length > 0
            ? `<div class="evidence">หลักฐานแนบ (Evidence): ${check.evidenceFiles.length} ไฟล์ — ${check.evidenceFiles.map((u, i) => `<a href="${u}" style="color:#2563eb">[${i + 1}]</a>`).join(' ')}</div>`
            : '';

        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Safety Check</title><style>${PRINT_STYLES}</style></head>
        <body><div class="page">
        <div class="header">
            <img src="${LOGO_URL}" class="logo" alt="Logo" />
            <div class="company-block">
                <div class="company-name-en">${COMPANY_NAME}</div>
                <div class="company-name-th">${COMPANY_NAME_TH}</div>
                <div class="company-addr">${COMPANY_ADDRESS}</div>
            </div>
            <div class="doc-ref">
                <div>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</div>
            </div>
        </div>
        <div class="title-block">
            <div class="title-th">${meta.th}</div>
            <div class="title-en">${meta.en}</div>
        </div>
        <div class="meta-row">
            <div class="meta-item"><span class="meta-label">วันที่ตรวจ (Date):</span><span class="meta-value">${formatDateTH(check.date)}</span></div>
            <div class="meta-item"><span class="meta-label">สถานที่ (Location):</span><span class="meta-value">${check.location}</span></div>
            <div class="meta-item"><span class="meta-label">วิธีตรวจ:</span><span class="meta-value">${meta.methodTH}</span></div>
        </div>
        <table>
            <thead><tr>
                <th>ลำดับ<br><span style="font-weight:400;font-size:8pt">NO.</span></th>
                <th>ชื่อ-สกุล<br><span style="font-weight:400;font-size:8pt">Name-Surname</span></th>
                <th>ตำแหน่ง<br><span style="font-weight:400;font-size:8pt">Position</span></th>
                <th>บริษัท<br><span style="font-weight:400;font-size:8pt">Company</span></th>
                <th>${meta.resultHeader[0]}<br><span style="font-weight:400;font-size:8pt">${meta.resultHeader[1]}</span></th>
                <th>หมายเหตุ<br><span style="font-weight:400;font-size:8pt">Remark</span></th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="summary">
            <span>รวมผู้เข้ารับการตรวจ: <strong>${check.attendees.length} คน</strong></span>
            <span class="sum-pass">✓ ผ่าน: ${passedAttendees.length} คน</span>
            ${failedAttendees.length > 0 ? `<span class="sum-fail">✗ ไม่ผ่าน: ${failedAttendees.length} คน</span>` : ''}
        </div>
        <div class="sign-section">
            <div class="sign-box">
                <div style="margin-bottom:36px"></div>
                <div class="sign-line"></div>
                <div class="sign-name">(${check.auditor})</div>
                <div class="sign-title">ผู้ตรวจ / Auditor</div>
            </div>
        </div>
        ${evidenceHtml}
        <div class="footer">
            <span>${meta.th}</span>
            <span>พิมพ์: ${new Date().toLocaleString('th-TH')}</span>
        </div>
        </div></body></html>`;
    };

    const handlePrint = () => {
        const win = window.open('', '_blank', 'width=860,height=1100');
        if (!win) return;
        win.document.write(buildPrintHTML());
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 800);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const logoImg = new window.Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = LOGO_URL;

        const buildDoc = () => {
            const hasLogo = logoImg.complete && logoImg.naturalWidth > 0;
            let y = 10;

            if (hasLogo) {
                doc.addImage(logoImg, 'PNG', 14, y, 22, 14);
            }
            // Company
            doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
            doc.text(COMPANY_NAME, hasLogo ? 40 : 14, y + 4);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
            doc.setFontSize(7);
            doc.text(COMPANY_NAME_TH, hasLogo ? 40 : 14, y + 8);
            doc.text(COMPANY_ADDRESS, hasLogo ? 40 : 14, y + 12);
            // Line
            y = 28;
            doc.setDrawColor(30, 58, 95); doc.setLineWidth(0.5);
            doc.line(14, y, 196, y);
            y += 6;
            // Title
            doc.setTextColor(30, 58, 95); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(meta.th, 105, y, { align: 'center' }); y += 5;
            doc.setTextColor(80); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.text(meta.en, 105, y, { align: 'center' }); y += 7;
            // Meta
            doc.setTextColor(0); doc.setFontSize(9);
            doc.text(`วันที่ตรวจ: ${formatDateTH(check.date)}`, 14, y);
            doc.text(`สถานที่: ${check.location}`, 80, y);
            doc.text(`วิธีตรวจ: ${meta.methodTH}`, 14, y + 5);
            y += 10;
            // Table
            const tableBody = paddedAttendees.map((a, i) => {
                if (!a) return [String(i + 1), '', '', '', '', ''];
                const rv = check.type === 'alcohol'
                    ? (a.alcoholLevel !== undefined ? `${a.alcoholLevel.toFixed(2)} mg%` : '0.00')
                    : (a.result === 'pass' ? 'Not Found' : 'Found');
                return [String(i + 1), a.name, a.position, a.company, rv, a.remark ?? ''];
            });
            autoTable(doc, {
                head: [[
                    'NO.', 'ชื่อ-สกุล\n(Name-Surname)',
                    'ตำแหน่ง\n(Position)', 'บริษัท\n(Company)',
                    `${meta.resultHeader[0]}\n${meta.resultHeader[1]}`, 'หมายเหตุ\n(Remark)'
                ]],
                body: tableBody,
                startY: y,
                styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center', font: 'helvetica', lineColor: [170, 170, 170], lineWidth: 0.3 },
                headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: [247, 249, 252] },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 50, halign: 'left' },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 28, fontStyle: 'bold' },
                    5: { cellWidth: 26, halign: 'left' },
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4 && data.row.index < check.attendees.length) {
                        const a = check.attendees[data.row.index];
                        if (a?.result === 'fail') {
                            data.cell.styles.fillColor = [255, 235, 235];
                            data.cell.styles.textColor = [153, 27, 27];
                        } else if (a?.result === 'pass') {
                            data.cell.styles.textColor = [22, 101, 52];
                        }
                    }
                },
            });
            const finalY = (doc as any).lastAutoTable.finalY + 5;
            // Summary
            doc.setFontSize(9); doc.setTextColor(0); doc.setFont('helvetica', 'normal');
            doc.text(`รวม ${check.attendees.length} คน  |  ผ่าน ${passedAttendees.length} คน  |  ไม่ผ่าน ${failedAttendees.length} คน`, 14, finalY);
            // Signature
            const sigY = finalY + 20;
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(130, sigY + 14, 196, sigY + 14);
            doc.setFontSize(9);
            doc.text(`(${check.auditor})`, 163, sigY + 19, { align: 'center' });
            doc.text('ผู้ตรวจ / Auditor', 163, sigY + 24, { align: 'center' });
            // Footer
            const pages = (doc as any).internal.getNumberOfPages();
            for (let p = 1; p <= pages; p++) {
                doc.setPage(p);
                doc.setFontSize(7); doc.setTextColor(180);
                doc.text(`${meta.th}  |  หน้า ${p}/${pages}  |  พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, 105, 290, { align: 'center' });
            }
            doc.save(`SafetyCheck_${check.type}_${check.date}.pdf`);
        };

        logoImg.onload = buildDoc;
        logoImg.onerror = buildDoc;
        if (logoImg.complete) buildDoc();
    };

    // Preview HTML content
    const rows = paddedAttendees.map((a, i) => {
        const isFail = a?.result === 'fail';
        return (
            <tr key={i} className={isFail ? 'bg-red-50' : i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-xs text-slate-500">{i + 1}</td>
                <td className="border border-slate-300 px-3 py-1.5 text-sm font-medium">
                    {a ? <span className={isFail ? 'text-red-700 font-semibold' : 'text-slate-800'}>{a.name}</span> : <span className="text-transparent select-none">—</span>}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-xs text-slate-600">{a?.position ?? ''}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-xs text-slate-600">{a?.company ?? ''}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-sm font-bold">
                    {a ? (
                        check.type === 'alcohol'
                            ? <span className={isFail ? 'text-red-600' : 'text-emerald-700'}>
                                {a.alcoholLevel !== undefined ? `${a.alcoholLevel.toFixed(2)} mg%` : '0.00'}
                              </span>
                            : <span className={isFail ? 'text-red-600' : 'text-emerald-700'}>
                                {a.result === 'pass' ? 'Not Found ✓' : 'Found ✗'}
                              </span>
                    ) : null}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500">{a?.remark ?? ''}</td>
            </tr>
        );
    });

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">

                {/* Toolbar */}
                <div className="px-5 py-3 bg-slate-800 rounded-t-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-base font-bold">📄 พรีวิวฟอร์มการตรวจ</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${check.type === 'alcohol' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                            {check.type === 'alcohol' ? 'แอลกอฮอล์' : 'สารเสพติด'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5">
                            🖨 พิมพ์
                        </button>
                        <button onClick={handleDownloadPDF}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5">
                            ⬇ ดาวน์โหลด PDF
                        </button>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xl font-bold">×</button>
                    </div>
                </div>

                {/* Preview area */}
                <div className="overflow-y-auto flex-1 bg-slate-200 p-6">
                    <div className="bg-white shadow-xl mx-auto rounded-sm" style={{ width: '210mm', minHeight: '297mm', padding: '16mm 18mm', fontFamily: "'Sarabun', Arial, sans-serif" }}>

                        {/* Company Header */}
                        <div className="flex items-center gap-4 pb-3 border-b-2 border-slate-800 mb-5">
                            <img src={LOGO_URL} alt="NEO SIAM Logo" className="h-14 w-auto object-contain flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800 leading-tight">{COMPANY_NAME}</div>
                                <div className="text-xs text-slate-600 leading-tight mt-0.5">{COMPANY_NAME_TH}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{COMPANY_ADDRESS}</div>
                            </div>
                            <div className="text-right text-xs text-slate-400 flex-shrink-0">
                                <div>วันที่พิมพ์</div>
                                <div className="font-semibold text-slate-600">{new Date().toLocaleDateString('th-TH')}</div>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-5">
                            <div className="text-base font-bold text-slate-800">{meta.th}</div>
                            <div className="text-sm text-slate-500 mt-0.5">{meta.en}</div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm mb-4 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                            <div className="flex gap-2">
                                <span className="text-slate-500">วันที่ตรวจ:</span>
                                <span className="font-semibold text-slate-800">{formatDateTH(check.date)}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-slate-500">สถานที่:</span>
                                <span className="font-semibold text-slate-800">{check.location}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-slate-500">วิธีตรวจ:</span>
                                <span className="font-semibold text-slate-800">{meta.methodTH}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-slate-500">ผู้ตรวจ:</span>
                                <span className="font-semibold text-slate-800">{check.auditor}</span>
                            </div>
                        </div>

                        {/* Table */}
                        <table className="w-full border-collapse text-sm mb-3">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="border border-slate-600 px-2 py-2 text-center text-xs w-10">
                                        ลำดับ<br /><span className="font-normal opacity-75">NO.</span>
                                    </th>
                                    <th className="border border-slate-600 px-3 py-2 text-left">
                                        ชื่อ-สกุล<br /><span className="font-normal text-xs opacity-75">Name-Surname</span>
                                    </th>
                                    <th className="border border-slate-600 px-2 py-2 text-center">
                                        ตำแหน่ง<br /><span className="font-normal text-xs opacity-75">Position</span>
                                    </th>
                                    <th className="border border-slate-600 px-2 py-2 text-center">
                                        บริษัท<br /><span className="font-normal text-xs opacity-75">Company</span>
                                    </th>
                                    <th className="border border-slate-600 px-2 py-2 text-center">
                                        {meta.resultHeader[0]}<br />
                                        <span className="font-normal text-xs opacity-75">{meta.resultHeader[1]}</span>
                                    </th>
                                    <th className="border border-slate-600 px-2 py-2 text-center">
                                        หมายเหตุ<br /><span className="font-normal text-xs opacity-75">Remark</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </table>

                        {/* Summary row */}
                        <div className="flex items-center gap-6 text-sm py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 mb-6">
                            <span className="text-slate-600">รวมผู้เข้ารับการตรวจ: <strong className="text-slate-800">{check.attendees.length} คน</strong></span>
                            <span className="text-emerald-700 font-semibold">✓ ผ่าน {passedAttendees.length} คน</span>
                            {failedAttendees.length > 0
                                ? <span className="text-red-600 font-semibold">✗ ไม่ผ่าน {failedAttendees.length} คน</span>
                                : null
                            }
                        </div>

                        {/* Signature */}
                        <div className="flex justify-end mt-4">
                            <div className="text-center w-56">
                                <div className="mb-8"></div>
                                <div className="border-b border-dashed border-slate-400 mb-2"></div>
                                <div className="text-sm font-semibold text-slate-800">({check.auditor})</div>
                                <div className="text-xs text-slate-500 mt-0.5">ผู้ตรวจ / Auditor</div>
                            </div>
                        </div>

                        {/* Evidence */}
                        {check.evidenceFiles.length > 0 && (
                            <div className="mt-6 pt-3 border-t border-dashed border-slate-200 text-xs text-slate-500">
                                <span className="font-semibold text-slate-600">หลักฐานแนบ ({check.evidenceFiles.length} ไฟล์):</span>
                                {check.evidenceFiles.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                        className="ml-2 text-blue-600 hover:underline">[{i + 1}]</a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Fail banner */}
                {failedAttendees.length > 0 && (
                    <div className="px-5 py-2.5 bg-red-50 border-t border-red-200 text-sm text-red-700 font-semibold rounded-b-2xl">
                        ⚠ ไม่ผ่าน {failedAttendees.length} คน: {failedAttendees.map(a => a.name).join(', ')}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
