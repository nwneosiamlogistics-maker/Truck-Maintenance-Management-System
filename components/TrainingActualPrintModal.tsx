import React, { useRef, useState } from 'react';
import type { TrainingSession, TrainingPlan, SafetyTopic, Driver } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface Props {
    session: TrainingSession;
    plans: TrainingPlan[];         // plans ที่ sessionId === session.id หรือ done ใน topic นี้
    topic: SafetyTopic;
    drivers: Driver[];
    onClose: () => void;
}

const fmtDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

const fmtDateNum = (d?: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()+543}`;
};

export default function TrainingActualPrintModal({ session, plans, topic, drivers, onClose }: Props) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    // รวม attendees จาก session.attendeeIds + plans ที่ done
    const attendeeIds = Array.from(new Set([
        ...session.attendeeIds,
        ...plans.filter(p => p.status === 'done').map(p => p.driverId),
    ]));
    const attendees = attendeeIds.map(id => {
        const d = drivers.find(dr => dr.id === id);
        const plan = plans.find(p => p.driverId === id);
        return { driver: d, plan };
    }).filter(a => a.driver);

    const actualDate = session.startDate;
    const location = session.location ?? '-';
    const trainer = session.trainer ?? '-';

    // ===== PDF Export via window.print() — สร้าง HTML ตรงๆ ไม่พึ่ง Tailwind =====
    const handleExportPDF = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const photoImgs = session.evidencePhotos
            .filter(u => !u.toLowerCase().includes('.pdf'))
            .map((url, i) => `<img src="${url}" alt="หลักฐาน ${i+1}" style="width:100%;height:160px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block;" />`)
            .join('');

        const pdfLinks = session.evidencePhotos
            .filter(u => u.toLowerCase().includes('.pdf'))
            .map((url, i) => `<a href="${url}" style="color:#dc2626;font-size:9pt;">📄 PDF [${i+1}]</a>`)
            .join(' ');

        const rows = Array.from({ length: Math.max(20, attendees.length) }, (_, i) => {
            const a = attendees[i];
            const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `<tr style="background:${bg};page-break-inside:avoid;">
                <td style="text-align:center;color:#94a3b8;width:36px;">${i + 1}</td>
                <td style="text-align:left;padding-left:12px;font-weight:${a ? '500' : '400'};color:#334155;">${a?.driver?.name ?? ''}</td>
                <td style="text-align:center;color:#64748b;">${a ? 'พนักงานขับรถ' : ''}</td>
                <td style="border-left:1px solid #e2e8f0;height:32px;"></td>
            </tr>`;
        }).join('');

        printWindow.document.write(`<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8"/>
<title>Training_${topic.code}_${actualDate}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'TH Sarabun New', 'Sarabun', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; background: #fff; }
  @page { size: A4 portrait; margin: 14mm 16mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #1e3a8a; margin-bottom: 14px; }
  .header-logo { height: 52px; width: auto; }
  .company-name { font-size: 11pt; font-weight: 700; color: #1e293b; }
  .company-addr { font-size: 8pt; color: #64748b; margin-top: 3px; line-height: 1.5; }
  .title-block { text-align: center; margin-bottom: 14px; }
  .title-main { font-size: 15pt; font-weight: 700; color: #1e293b; }
  .title-sub { font-size: 11pt; color: #475569; margin-top: 3px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 14px; font-size: 10pt; }
  .info-label { font-weight: 700; color: #475569; }
  .info-value { color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 10pt; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  thead tr { background-color: #1e3a8a; color: #fff; }
  thead th { padding: 9px 8px; text-align: center; font-size: 10pt; font-weight: 700; }
  thead th.name-col { text-align: left; padding-left: 14px; }
  tbody td { padding: 8px; border-top: 1px solid #e2e8f0; font-size: 10pt; }
  tbody tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .photos-section { margin-bottom: 18px; }
  .photos-title { font-size: 10pt; font-weight: 700; color: #334155; margin-bottom: 8px; border-left: 3px solid #1e3a8a; padding-left: 8px; }
  .photos-wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .sig-section { margin-top: 24px; border-top: 2px solid #334155; padding-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; page-break-inside: avoid; }
  .sig-box { text-align: center; }
  .sig-title { font-size: 11pt; font-weight: 700; color: #1e293b; letter-spacing: 0.5px; margin-bottom: 4px; }
  .sig-subtitle { font-size: 9pt; color: #64748b; margin-bottom: 16px; }
  .sig-area { height: 70px; border: 2px dashed #93c5fd; border-radius: 8px; background: #eff6ff; margin-bottom: 12px; }
  .sig-line { width: 75%; margin: 0 auto 8px; border-bottom: 2px solid #334155; }
  .sig-name { font-size: 10pt; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
  .sig-role { font-size: 9pt; color: #64748b; margin-bottom: 4px; }
  .sig-date { font-size: 9pt; color: #94a3b8; }
</style>
</head><body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="company-name">NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.</div>
      <div class="company-addr">
        A 159/9-10 Village No.7 | Bang Muang Sub-district<br/>
        Muang Nakhon Sawan District | Nakhon Sawan 60000 | Thailand
      </div>
    </div>
    <img src="/logo.png" class="header-logo" alt="NEO SIAM Logo"/>
  </div>

  <!-- TITLE -->
  <div class="title-block">
    <div class="title-main">บันทึกการอบรม / Training Record</div>
    <div class="title-sub">${topic.name}</div>
  </div>

  <!-- INFO -->
  <div class="info-grid">
    <div><span class="info-label">วันที่อบรม : </span><span class="info-value">${fmtDate(actualDate)}</span></div>
    <div><span class="info-label">วิทยากร : </span><span class="info-value">${trainer}</span></div>
    <div><span class="info-label">สถานที่ : </span><span class="info-value">${location}</span></div>
    <div><span class="info-label">จำนวนผู้เข้าอบรม : </span><span class="info-value">${attendees.length} คน</span></div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width:40px;">ลำดับ<br/><span style="font-weight:400;font-size:8pt;opacity:0.8;">NO.</span></th>
        <th class="name-col">ชื่อ-สกุล<br/><span style="font-weight:400;font-size:8pt;opacity:0.8;">(Name-Surname)</span></th>
        <th style="width:120px;">ตำแหน่ง<br/><span style="font-weight:400;font-size:8pt;opacity:0.8;">(Position)</span></th>
        <th style="min-width:140px;">ลายเซ็น<br/><span style="font-weight:400;font-size:8pt;opacity:0.8;">(Signature)</span></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${photoImgs || pdfLinks ? `
  <!-- PHOTOS -->
  <div class="photos-section">
    <div class="photos-title">หลักฐานภาพการอบรม / Training Evidence Photos</div>
    <div class="photos-wrap">${photoImgs}${pdfLinks}</div>
  </div>` : ''}

  <!-- SIGNATURE -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-title">วิทยากรผู้อบรม</div>
      <div class="sig-subtitle">Trainer</div>
      <div class="sig-area"></div>
      <div class="sig-line"></div>
      <div class="sig-name">( ${trainer} )</div>
      <div class="sig-role">วิทยากรผู้อบรม / Trainer</div>
      <div class="sig-date">วันที่ ........... / ........... / ................</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">ผู้รับทราบ</div>
      <div class="sig-subtitle">Acknowledged by</div>
      <div class="sig-area"></div>
      <div class="sig-line"></div>
      <div class="sig-name">( .................................................. )</div>
      <div class="sig-role">ผู้จัดการ / Manager</div>
      <div class="sig-date">วันที่ ........... / ........... / ................</div>
    </div>
  </div>

</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    };

    // ===== Excel Export =====
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // --- Sheet 1: รายชื่อผู้อบรม ---
        const rows: (string | number)[][] = [
            ['NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.'],
            ['บันทึกการอบรม / Training Record'],
            [topic.name],
            [],
            ['วันที่อบรม:', fmtDateNum(actualDate), '', 'วิทยากร:', trainer],
            ['สถานที่:', location, '', 'จำนวน:', `${attendees.length} คน`],
            [],
            ['ลำดับ', 'ชื่อ-สกุล', 'ตำแหน่ง', 'ลายเซ็น (Signature)'],
            ...attendees.map((a, i) => [
                i + 1,
                a.driver!.name,
                'พนักงานขับรถ',
                '',
            ]),
        ];

        // Pad to 20 rows
        const dataStart = 8;
        while (rows.length - dataStart < 20) {
            rows.push([rows.length - dataStart + 1, '', '', '']);
        }

        rows.push([]);
        rows.push(['', 'วิทยากร', '', 'ผู้รับทราบ']);
        rows.push(['', 'ลายเซ็น..............................', '', 'ลายเซ็น..............................']);
        rows.push(['', `(${trainer})`, '', '(........................................)']);
        rows.push(['', 'วิทยากรผู้อบรม', '', 'ผู้จัดการ']);

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            { wch: 8 }, { wch: 36 }, { wch: 18 }, { wch: 35 },
        ];

        // Merge title rows
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อผู้อบรม');

        XLSX.utils.book_new();
        XLSX.writeFile(wb, `Training_${topic.code}_${actualDate}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="bg-blue-800 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🖨</span>
                            <span className="font-bold">พิมพ์บันทึกการอบรม</span>
                        </div>
                        <p className="text-blue-200 text-sm mt-0.5">{topic.name} — {fmtDate(actualDate)}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
                </div>

                {/* Preview */}
                <div className="overflow-y-auto flex-1 p-5">
                    <div ref={previewRef} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-sm">

                        {/* Header NEO SIAM */}
                        <div className="flex items-start justify-between pb-3 border-b border-slate-200 mb-4">
                            <div>
                                <p className="font-bold text-slate-800 text-xs">NEO SIAM LOGISTICS AND TRANSPORT CO., LTD.</p>
                                <p className="text-slate-500 text-[10px]">A 159/9-10 Village No.7 | Bang Muang Sub-district</p>
                                <p className="text-slate-500 text-[10px]">Muang Nakhon Sawan District | Nakhon Sawan 60000 | Thailand</p>
                            </div>
                            <img src="/logo.png" alt="NEO SIAM Logo" className="h-14 w-auto object-contain shrink-0" />
                        </div>

                        {/* Title */}
                        <div className="text-center mb-4">
                            <h2 className="text-base font-bold text-slate-800">บันทึกการอบรม / Training Record</h2>
                            <p className="text-slate-600 text-xs mt-0.5">{topic.name}</p>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4 text-xs">
                            <div><span className="font-semibold text-slate-600">วันที่อบรม:</span> <span className="text-slate-800">{fmtDate(actualDate)}</span></div>
                            <div><span className="font-semibold text-slate-600">วิทยากร:</span> <span className="text-slate-800">{trainer}</span></div>
                            <div><span className="font-semibold text-slate-600">สถานที่:</span> <span className="text-slate-800">{location}</span></div>
                            <div><span className="font-semibold text-slate-600">จำนวน:</span> <span className="text-slate-800">{attendees.length} คน</span></div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200 mb-5">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-blue-800 text-white text-center">
                                        <th className="px-2 py-2.5 font-semibold text-xs w-10">ลำดับ<br/><span className="font-normal text-blue-200 text-[9px]">NO.</span></th>
                                        <th className="px-3 py-2.5 font-semibold text-xs">ชื่อ-สกุล<br/><span className="font-normal text-blue-200 text-[9px]">(Name-Surname)</span></th>
                                        <th className="px-2 py-2.5 font-semibold text-xs w-28">ตำแหน่ง<br/><span className="font-normal text-blue-200 text-[9px]">(Position)</span></th>
                                        <th className="px-2 py-2.5 font-semibold text-xs min-w-[120px]">ลายเซ็น<br/><span className="font-normal text-blue-200 text-[9px]">(Signature)</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: Math.max(20, attendees.length) }, (_, i) => {
                                        const a = attendees[i];
                                        return (
                                            <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}`}>
                                                <td className="px-2 py-2.5 text-center text-slate-500 text-xs font-mono">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-left font-medium text-slate-700 text-xs">{a?.driver?.name ?? ''}</td>
                                                <td className="px-2 py-2.5 text-center text-slate-500 text-xs">{a ? 'พนักงานขับรถ' : ''}</td>
                                                <td className="px-2 py-2.5 border-l border-slate-100 h-9"></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Evidence Photos */}
                        {session.evidencePhotos.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-600 mb-2 border-l-4 border-blue-800 pl-2">หลักฐานภาพการอบรม / Training Evidence Photos</p>
                                <div className="grid grid-cols-3 gap-1">
                                    {session.evidencePhotos.filter(u => !u.toLowerCase().includes('.pdf')).map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer">
                                            <img src={url} alt={`หลักฐาน ${i+1}`} className="w-full h-36 object-cover rounded border border-slate-200" />
                                        </a>
                                    ))}
                                </div>
                                {session.evidencePhotos.filter(u => u.toLowerCase().includes('.pdf')).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {session.evidencePhotos.filter(u => u.toLowerCase().includes('.pdf')).map((url, i) => (
                                            <a key={`pdf-${i}`} href={url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100">
                                                📄 PDF [{i+1}]
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Signature Block */}
                        <div className="mt-6 border-t-2 border-slate-300 pt-5 grid grid-cols-2 gap-6">
                            {/* Trainer */}
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">วิทยากรผู้อบรม</p>
                                <p className="text-[10px] text-slate-400 mb-2">Trainer</p>
                                <div className="w-full h-16 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30" />
                                <div className="w-3/4 border-b-2 border-slate-600 mt-3 mb-1.5" />
                                <p className="text-xs font-semibold text-slate-700">( {trainer} )</p>
                                <p className="text-[10px] text-slate-400">วันที่ ......... / ......... / ............</p>
                            </div>
                            {/* Manager */}
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">ผู้รับทราบ</p>
                                <p className="text-[10px] text-slate-400 mb-2">Acknowledged by</p>
                                <div className="w-full h-16 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30" />
                                <div className="w-3/4 border-b-2 border-slate-600 mt-3 mb-1.5" />
                                <p className="text-xs font-semibold text-slate-700">( ................................................ )</p>
                                <p className="text-[10px] text-slate-500 font-medium">ผู้จัดการ / Manager</p>
                                <p className="text-[10px] text-slate-400">วันที่ ......... / ......... / ............</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3 bg-slate-50 border-t rounded-b-2xl flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                        {attendees.length} คน · {fmtDate(actualDate)} · {location}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 transition-colors">
                            ปิด
                        </button>
                        <button onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                            Excel
                        </button>
                        <button onClick={handleExportPDF}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            พิมพ์ / PDF
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
