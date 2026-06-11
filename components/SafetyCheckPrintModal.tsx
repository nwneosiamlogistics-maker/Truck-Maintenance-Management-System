import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { SafetyCheck } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const COMPANY_NAME = 'NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.';
const COMPANY_NAME_TH = 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด';
const COMPANY_ADDRESS_EN = 'A 159/9-10 Village No.7 | Bang Muang Sub-district | Muang Nakhon Sawan District | Nakhon Sawan 60000 | Thailand';
const LOGO_URL = '/logo.png';
const FORM_ROWS = 20;

interface Props {
    check: SafetyCheck;
    onClose: () => void;
}

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const formatDateTH = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const formatDateForm = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day} / ${month} / ${year}`;
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
    @page { size: A4 portrait; margin: 10mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Sarabun', 'TH SarabunPSK', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }
    .page { width: 100%; }
    /* Header: company left, logo right */
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 8px; }
    .company-block { flex: 1; }
    .company-name-en { font-size: 9.5pt; font-weight: 700; color: #111; line-height: 1.4; }
    .company-addr { font-size: 8pt; color: #444; margin-top: 2px; line-height: 1.4; }
    .logo { height: 55px; width: auto; object-fit: contain; margin-left: 12px; flex-shrink: 0; }
    /* Title block */
    .title-block { text-align: center; margin: 6px 0 4px; }
    .title-th { font-size: 13pt; font-weight: 700; }
    .title-en { font-size: 10pt; color: #333; margin-top: 1px; }
    /* Date row */
    .date-row { text-align: right; font-size: 10pt; margin-bottom: 6px; }
    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th { background: #fff; color: #111; padding: 4px 5px; text-align: center; font-size: 9.5pt; border: 1px solid #333; line-height: 1.4; font-weight: 700; }
    td { border: 1px solid #555; padding: 3px 5px; font-size: 9.5pt; vertical-align: middle; height: 18pt; }
    .col-no { text-align: center; width: 26px; }
    .col-name { width: 140px; }
    .col-pos { text-align: center; width: 80px; }
    .col-company { width: 100px; }
    .col-result { text-align: center; font-weight: 700; width: 70px; }
    .col-remark { width: 70px; }
    .pass-val { color: #166534; }
    .fail-val { color: #991b1b; }
    tr.fail-row td { background: #fff0f0 !important; }
    /* Signature */
    .sign-section { display: flex; justify-content: flex-end; margin-top: 20px; }
    .sign-box { text-align: center; min-width: 220px; }
    .sign-dept { font-size: 11pt; font-weight: 700; margin-bottom: 32px; }
    .sign-label { font-size: 10pt; margin-bottom: 28px; }
    .sign-line { border-bottom: 1px solid #333; width: 200px; margin: 0 auto 4px; }
    .sign-name { font-size: 10pt; font-weight: 600; }
    .sign-title { font-size: 9pt; color: #555; }
    /* Footer */
    .footer { position: fixed; bottom: 6mm; left: 14mm; right: 14mm; font-size: 7pt; color: #aaa; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 3px; }
`;

export default function SafetyCheckPrintModal({ check, onClose }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    const meta = TITLE_MAP[check.type];
    const passedAttendees = check.attendees.filter(a => a.result === 'pass');
    const failedAttendees = check.attendees.filter(a => a.result === 'fail');
    const paddedAttendees = [
        ...check.attendees,
        ...Array(Math.max(0, FORM_ROWS - check.attendees.length)).fill(null),
    ];

    const buildPrintHTML = () => {
        const rows = paddedAttendees.map((a, i) => {
            const isFail = a?.result === 'fail';
            let resultDisplay = '';
            if (a) {
                if (check.type === 'alcohol') {
                    const val = a.alcoholLevel !== undefined ? a.alcoholLevel.toFixed(2) : '0';
                    resultDisplay = `<span class="${isFail ? 'fail-val' : 'pass-val'}">${val} <small>mg%</small></span>`;
                } else {
                    resultDisplay = `<span class="${isFail ? 'fail-val' : 'pass-val'}" style="font-size:13pt">${a.result === 'pass' ? '&#10003;' : '&#10007;'}</span>`;
                }
            }
            return `<tr class="${isFail ? 'fail-row' : ''}">
                <td class="col-no">${i + 1}</td>
                <td class="col-name">${a ? `<span ${isFail ? 'style="font-weight:600"' : ''}>${a.name}</span>` : ''}</td>
                <td class="col-pos">${a?.position ?? ''}</td>
                <td class="col-company">${a?.company ?? ''}</td>
                <td class="col-result">${resultDisplay}</td>
                <td class="col-remark">${a?.remark ?? ''}</td>
            </tr>`;
        }).join('');

        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Safety Check</title><style>${PRINT_STYLES}</style></head>
        <body><div class="page">
        <div class="header">
            <div class="company-block">
                <div class="company-name-en">${COMPANY_NAME}</div>
                <div class="company-addr">${COMPANY_ADDRESS_EN}</div>
            </div>
            <img src="${LOGO_URL}" class="logo" alt="NEOI Logo" />
        </div>
        <div class="title-block">
            <div class="title-th">${meta.th}</div>
            <div class="title-en">(${meta.en})</div>
        </div>
        <div class="date-row">วันที่(Date) <u>&nbsp;${formatDateForm(check.date)}&nbsp;</u></div>
        <table>
            <thead><tr>
                <th class="col-no">ลำดับ<br><span style="font-weight:400;font-size:8pt">NO.</span></th>
                <th class="col-name" style="text-align:left;padding-left:8px">ชื่อ-สกุล<br><span style="font-weight:400;font-size:8pt">(Name-Surname)</span></th>
                <th class="col-pos">ตำแหน่ง<br><span style="font-weight:400;font-size:8pt">(Position)</span></th>
                <th class="col-company">บริษัท<br><span style="font-weight:400;font-size:8pt">(Company)</span></th>
                <th class="col-result">ผลตรวจ<br><span style="font-weight:400;font-size:8pt">${meta.resultHeader[1]}</span></th>
                <th class="col-remark">หมายเหตุ<br><span style="font-weight:400;font-size:8pt">(Remark)</span></th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="sign-section">
            <div class="sign-box">
                <div class="sign-label">ลายเซ็น (Sign)................................</div>
                <div class="sign-line"></div>
                <div class="sign-name">(${check.auditor})</div>
                <div class="sign-title">ผู้ตรวจ / Auditor</div>
            </div>
        </div>
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

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        const canvas = await html2canvas(printRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const pageH = 297;
        const imgW = pageW;
        const imgH = (canvas.height * pageW) / canvas.width;
        let offsetY = 0;
        let pageCount = 0;
        while (offsetY < imgH) {
            if (pageCount > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, -offsetY, imgW, imgH);
            offsetY += pageH;
            pageCount++;
            // หยุดถ้าเหลือเนื้อหาน้อยกว่า 10mm ป้องกันหน้าว่าง
            if (imgH - offsetY < 10) break;
        }
        doc.save(`SafetyCheck_${check.type}_${check.date}.pdf`);
    };

    // Preview HTML content — ตรงกับฟอร์มจริง
    const rows = paddedAttendees.map((a, i) => {
        const isFail = a?.result === 'fail';
        return (
            <tr key={i} className={isFail ? 'bg-red-50' : 'bg-white'}>
                <td className="border border-slate-500 px-1 py-1 text-center text-xs text-slate-500">{i + 1}</td>
                <td className="border border-slate-500 px-2 py-1 text-xs">
                    {a ? <span className={isFail ? 'text-red-700 font-semibold' : 'text-slate-900'}>{a.name}</span> : ''}
                </td>
                <td className="border border-slate-500 px-1 py-1 text-center text-xs text-slate-700">{a?.position ?? ''}</td>
                <td className="border border-slate-500 px-1 py-1 text-xs text-slate-700">{a?.company ?? ''}</td>
                <td className="border border-slate-500 px-1 py-1 text-center text-sm font-bold">
                    {a ? (
                        check.type === 'alcohol'
                            ? <span className={isFail ? 'text-red-600' : 'text-emerald-700'}>
                                {a.alcoholLevel !== undefined ? `${a.alcoholLevel.toFixed(2)} mg%` : '0'}
                              </span>
                            : <span className={isFail ? 'text-red-600 text-base' : 'text-emerald-700 text-base'}>
                                {a.result === 'pass' ? '✓' : '✗'}
                              </span>
                    ) : null}
                </td>
                <td className="border border-slate-500 px-1 py-1 text-xs text-slate-500">{a?.remark ?? ''}</td>
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
                    <div ref={printRef} className="bg-white shadow-xl mx-auto rounded-sm" style={{ width: '210mm', padding: '16mm 18mm', fontFamily: "'Sarabun', Arial, sans-serif" }}>

                        {/* Company Header: company LEFT, logo RIGHT — ตรงกับฟอร์มจริง */}
                        <div className="flex items-start justify-between pb-2 border-b border-slate-400 mb-3">
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-900 leading-tight">{COMPANY_NAME}</div>
                                <div className="text-xs text-slate-600 leading-tight mt-1">{COMPANY_ADDRESS_EN}</div>
                            </div>
                            <img src={LOGO_URL} alt="NEOI Logo" className="h-14 w-auto object-contain ml-4 flex-shrink-0" />
                        </div>

                        {/* Title */}
                        <div className="text-center my-3">
                            <div className="text-base font-bold text-slate-900">{meta.th}</div>
                            <div className="text-sm text-slate-600 mt-0.5">({meta.en})</div>
                        </div>

                        {/* Date right-aligned */}
                        <div className="text-right text-sm mb-2">
                            วันที่(Date) <span className="underline font-semibold">&nbsp;{formatDateForm(check.date)}&nbsp;</span>
                        </div>

                        {/* Table */}
                        <table className="w-full border-collapse text-xs mb-3">
                            <thead>
                                <tr className="bg-white text-slate-900">
                                    <th className="border border-slate-500 px-1 py-1.5 text-center w-8">
                                        ลำดับ<br /><span className="font-normal text-slate-500">NO.</span>
                                    </th>
                                    <th className="border border-slate-500 px-2 py-1.5 text-left">
                                        ชื่อ-สกุล<br /><span className="font-normal text-slate-500">(Name-Surname)</span>
                                    </th>
                                    <th className="border border-slate-500 px-1 py-1.5 text-center">
                                        ตำแหน่ง<br /><span className="font-normal text-slate-500">(Position)</span>
                                    </th>
                                    <th className="border border-slate-500 px-1 py-1.5 text-center">
                                        บริษัท<br /><span className="font-normal text-slate-500">(Company)</span>
                                    </th>
                                    <th className="border border-slate-500 px-1 py-1.5 text-center">
                                        ผลตรวจ<br /><span className="font-normal text-slate-500">{meta.resultHeader[1]}</span>
                                    </th>
                                    <th className="border border-slate-500 px-1 py-1.5 text-center">
                                        หมายเหตุ<br /><span className="font-normal text-slate-500">(Remark)</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </table>

                        {/* Signature */}
                        <div className="flex justify-end mt-6">
                            <div className="text-center w-64">
                                <div className="text-sm text-slate-700 mb-6">ลายเซ็น (Sign)................................</div>
                                <div className="border-b border-slate-600 mb-1"></div>
                                <div className="text-sm font-semibold text-slate-900">({check.auditor})</div>
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
