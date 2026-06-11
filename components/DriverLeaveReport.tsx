import React, { useState, useMemo } from 'react';
import { Driver } from '../types';
import { Search, FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DriverLeaveReportProps {
    drivers: Driver[];
}

const DriverLeaveReport: React.FC<DriverLeaveReportProps> = ({ drivers }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const stats = useMemo(() => {
        return drivers.map(driver => {
            const yearLeaves = (driver.leaves || []).filter(leave =>
                new Date(leave.startDate).getFullYear() === selectedYear && leave.status === 'approved'
            );
            const usage = { sick: 0, personal: 0, vacation: 0, other: 0, total: 0 };
            yearLeaves.forEach(leave => {
                const days = leave.totalDays;
                if (['sick', 'personal', 'vacation', 'other'].includes(leave.type)) {
                    usage[leave.type as keyof typeof usage] += days;
                }
                usage.total += days;
            });
            return { ...driver, usage };
        }).filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [drivers, selectedYear, searchTerm]);

    const exportToExcel = () => {
        const data = stats.map(d => ({
            'รหัสพนักงาน': d.employeeId, 'ชื่อ-นามสกุล': d.name,
            'ลาป่วย (วัน)': d.usage.sick, 'ลากิจ (วัน)': d.usage.personal,
            'ลาพักร้อน (วัน)': d.usage.vacation, 'อื่นๆ (วัน)': d.usage.other,
            'รวมทั้งสิ้น (วัน)': d.usage.total, 'หมายเหตุ': d.status === 'on_leave' ? 'กำลังลา' : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `LeaveReport_${selectedYear}`);
        XLSX.writeFile(wb, `Driver_Leave_Report_${selectedYear}.xlsx`);
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) return;
        const html = `<html><head><title>รายงานประวัติการลา ${selectedYear}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet"><style>body { font-family: 'Sarabun', sans-serif; padding: 40px; }.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }h1 { margin: 0; color: #1e293b; font-size: 24px; }p { margin: 5px 0; color: #64748b; font-size: 14px; }table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }th { background-color: #f1f5f9; color: #475569; font-weight: bold; padding: 10px; border: 1px solid #e2e8f0; }td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #334155; }.text-center { text-align: center; }.text-right { text-align: right; }.font-bold { font-weight: bold; }.sum-row { background-color: #f8fafc; font-weight: bold; }.footer { margin-top: 30px; text-align: right; font-size: 10px; color: #94a3b8; }</style></head><body><div class="header"><h1>รายงานประวัติการลางานพนักงานขับรถ</h1><p>ประจำปี พ.ศ. ${selectedYear + 543} (ค.ศ. ${selectedYear})</p><p>ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p></div><table><thead><tr><th style="width: 15%">รหัส</th><th style="width: 35%">ชื่อ-นามสกุล</th><th style="width: 10%">ลาป่วย</th><th style="width: 10%">ลากิจ</th><th style="width: 10%">พักร้อน</th><th style="width: 10%">อื่นๆ</th><th style="width: 10%">รวม</th></tr></thead><tbody>${stats.map(d => `<tr><td>${d.employeeId}</td><td>${d.name}</td><td class="text-center">${d.usage.sick || '-'}</td><td class="text-center">${d.usage.personal || '-'}</td><td class="text-center">${d.usage.vacation || '-'}</td><td class="text-center">${d.usage.other || '-'}</td><td class="text-center font-bold">${d.usage.total}</td></tr>`).join('')}</tbody><tfoot><tr class="sum-row"><td colspan="2" class="text-right">รวมทั้งหมด</td><td class="text-center">${stats.reduce((sum, d) => sum + d.usage.sick, 0)}</td><td class="text-center">${stats.reduce((sum, d) => sum + d.usage.personal, 0)}</td><td class="text-center">${stats.reduce((sum, d) => sum + d.usage.vacation, 0)}</td><td class="text-center">${stats.reduce((sum, d) => sum + d.usage.other, 0)}</td><td class="text-center">${stats.reduce((sum, d) => sum + d.usage.total, 0)}</td></tr></tfoot></table><div class="footer">พิมพ์โดยระบบ Truck Maintenance Management System</div></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div className="space-y-12 animate-fade-in-up pb-12">
            {/* Header / Filter */}
            <div className="flex flex-col lg:flex-row justify-between items-center glass p-5 lg:p-10 rounded-[4rem] border border-white/50 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-pink-600/5 pointer-events-none"></div>
                <div className="relative z-10 text-center lg:text-left">
                    <h2 className="text-2xl lg:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-900 via-pink-900 to-indigo-900 leading-none">
                        HR Analytics
                    </h2>
                    <p className="text-slate-400 font-black mt-2 lg:mt-4 uppercase tracking-[0.3em] lg:tracking-[0.4em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                        <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse shadow-glow"></span>
                        รายงานประวัติการลางาน (Driver Attendance Hub)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-6 lg:mt-0 relative z-10">
                    <div className="bg-white/60 backdrop-blur-xl px-6 py-2 rounded-2xl border border-white shadow-xl flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">เลือกปี (Select Year)</span>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} title="เลือกปีรายงาน" className="bg-transparent text-xs font-black text-slate-700 outline-none">
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>พ.ศ. {y + 543}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="glass p-4 lg:p-10 rounded-[3.5rem] border border-white/50 shadow-2xl relative animate-scale-in delay-100 min-h-[600px]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 lg:gap-6 mb-4 lg:mb-10">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50/50 pl-16 pr-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-purple-200 transition-all shadow-inner" />
                    </div>
                    <div className="flex gap-3 lg:gap-4 w-full md:w-auto">
                        <button onClick={exportToExcel} className="flex-1 md:flex-none justify-center p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
                            <FileSpreadsheet size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Excel</span>
                        </button>
                        <button onClick={exportToPDF} className="flex-1 md:flex-none justify-center p-4 bg-rose-600 text-white rounded-[1.5rem] shadow-lg shadow-rose-500/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
                            <Printer size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table (>= lg) */}
                <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="py-6 px-4">พนักงาน (Driver)</th>
                                <th className="py-6 px-4 text-center">ลาป่วย</th>
                                <th className="py-6 px-4 text-center">ลากิจ</th>
                                <th className="py-6 px-4 text-center">ลาพักร้อน</th>
                                <th className="py-6 px-4 text-center">อื่นๆ</th>
                                <th className="py-6 px-4 text-right">รวมสุทธิ (วัน)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.map(driver => (
                                <tr key={driver.id} className="hover:bg-slate-50/50 group transition-colors border-b border-slate-50 last:border-0">
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-600 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                {driver.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-sm">{driver.name}</span>
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">{driver.employeeId}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black ${driver.usage.sick > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm' : 'text-slate-300'}`}>
                                            {driver.usage.sick}
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black ${driver.usage.personal > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm' : 'text-slate-300'}`}>
                                            {driver.usage.personal}
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black ${driver.usage.vacation > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm' : 'text-slate-300'}`}>
                                            {driver.usage.vacation}
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <div className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black ${driver.usage.other > 0 ? 'bg-slate-50 text-slate-600 border border-slate-100 shadow-sm' : 'text-slate-300'}`}>
                                            {driver.usage.other}
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <span className="font-black text-slate-800 text-sm">{driver.usage.total} วัน</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-slate-200">
                            <tr className="bg-slate-50/50">
                                <td className="py-8 px-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">Grand Totals</td>
                                <td className="py-8 px-4 text-center text-rose-600 font-black text-sm">{stats.reduce((s, d) => s + d.usage.sick, 0)}</td>
                                <td className="py-8 px-4 text-center text-indigo-600 font-black text-sm">{stats.reduce((s, d) => s + d.usage.personal, 0)}</td>
                                <td className="py-8 px-4 text-center text-amber-600 font-black text-sm">{stats.reduce((s, d) => s + d.usage.vacation, 0)}</td>
                                <td className="py-8 px-4 text-center text-slate-600 font-black text-sm">{stats.reduce((s, d) => s + d.usage.other, 0)}</td>
                                <td className="py-8 px-4 text-right text-slate-950 font-black text-lg">{stats.reduce((s, d) => s + d.usage.total, 0)} <span className="text-xs uppercase">Days</span></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile Card View (< lg) */}
                <div className="lg:hidden space-y-3">
                    {stats.map(driver => (
                        <div key={driver.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-600 font-black text-sm shadow-sm shrink-0">
                                        {driver.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-900 text-sm">{driver.name}</div>
                                        <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">{driver.employeeId}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-slate-900 text-lg tabular-nums">{driver.usage.total}</div>
                                    <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest">รวม (วัน)</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
                                <div className={`text-center rounded-xl py-2 ${driver.usage.sick > 0 ? 'bg-rose-50' : 'bg-slate-50/50'}`}>
                                    <div className="text-[8px] font-black uppercase text-rose-400 tracking-wider">ลาป่วย</div>
                                    <div className={`text-sm font-black ${driver.usage.sick > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{driver.usage.sick}</div>
                                </div>
                                <div className={`text-center rounded-xl py-2 ${driver.usage.personal > 0 ? 'bg-indigo-50' : 'bg-slate-50/50'}`}>
                                    <div className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">ลากิจ</div>
                                    <div className={`text-sm font-black ${driver.usage.personal > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{driver.usage.personal}</div>
                                </div>
                                <div className={`text-center rounded-xl py-2 ${driver.usage.vacation > 0 ? 'bg-amber-50' : 'bg-slate-50/50'}`}>
                                    <div className="text-[8px] font-black uppercase text-amber-400 tracking-wider">พักร้อน</div>
                                    <div className={`text-sm font-black ${driver.usage.vacation > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{driver.usage.vacation}</div>
                                </div>
                                <div className={`text-center rounded-xl py-2 ${driver.usage.other > 0 ? 'bg-slate-100' : 'bg-slate-50/50'}`}>
                                    <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider">อื่นๆ</div>
                                    <div className={`text-sm font-black ${driver.usage.other > 0 ? 'text-slate-600' : 'text-slate-300'}`}>{driver.usage.other}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {stats.length === 0 && (
                        <div className="text-center py-10 text-slate-400 bg-white rounded-3xl border border-slate-100 text-sm font-bold">
                            ไม่พบข้อมูลพนักงาน
                        </div>
                    )}

                    {/* Grand Total Card */}
                    {stats.length > 0 && (
                        <div className="rounded-3xl bg-gradient-to-r from-purple-900 to-pink-900 text-white p-4 mt-2">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest">รวมทั้งหมด</span>
                                <span className="text-lg font-black tabular-nums">{stats.reduce((s, d) => s + d.usage.total, 0)} <span className="text-[10px] uppercase">วัน</span></span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="text-center">
                                    <div className="text-[8px] font-black text-rose-300/60 uppercase">ลาป่วย</div>
                                    <div className="text-sm font-black text-rose-300">{stats.reduce((s, d) => s + d.usage.sick, 0)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] font-black text-indigo-300/60 uppercase">ลากิจ</div>
                                    <div className="text-sm font-black text-indigo-300">{stats.reduce((s, d) => s + d.usage.personal, 0)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] font-black text-amber-300/60 uppercase">พักร้อน</div>
                                    <div className="text-sm font-black text-amber-300">{stats.reduce((s, d) => s + d.usage.vacation, 0)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] font-black text-slate-300/60 uppercase">อื่นๆ</div>
                                    <div className="text-sm font-black text-slate-300">{stats.reduce((s, d) => s + d.usage.other, 0)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverLeaveReport;
