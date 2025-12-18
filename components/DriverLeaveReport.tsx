import React, { useState, useMemo } from 'react';
import { Driver, LeaveType } from '../types';
import { Calendar, Search, Filter, Download, FileSpreadsheet, Printer } from 'lucide-react';
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

            const usage = {
                sick: 0,
                personal: 0,
                vacation: 0,
                other: 0,
                total: 0
            };

            yearLeaves.forEach(leave => {
                const days = leave.totalDays;
                if (['sick', 'personal', 'vacation', 'other'].includes(leave.type)) {
                    usage[leave.type as keyof typeof usage] += days;
                }
                usage.total += days;
            });

            return {
                ...driver,
                usage
            };
        }).filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [drivers, selectedYear, searchTerm]);

    const exportToExcel = () => {
        const data = stats.map(d => ({
            'รหัสพนักงาน': d.employeeId,
            'ชื่อ-นามสกุล': d.name,
            'ลาป่วย (วัน)': d.usage.sick,
            'ลากิจ (วัน)': d.usage.personal,
            'ลาพักร้อน (วัน)': d.usage.vacation,
            'อื่นๆ (วัน)': d.usage.other,
            'รวมทั้งสิ้น (วัน)': d.usage.total,
            'หมายเหตุ': d.status === 'on_leave' ? 'กำลังลา' : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `LeaveReport_${selectedYear}`);
        XLSX.writeFile(wb, `Driver_Leave_Report_${selectedYear}.xlsx`);
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>รายงานประวัติการลา ${selectedYear}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Sarabun', sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                        h1 { margin: 0; color: #1e293b; font-size: 24px; }
                        p { margin: 5px 0; color: #64748b; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th { background-color: #f1f5f9; color: #475569; font-weight: bold; padding: 10px; border: 1px solid #e2e8f0; }
                        td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #334155; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .sum-row { background-color: #f8fafc; font-weight: bold; }
                        .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>รายงานประวัติการลางานพนักงานขับรถ</h1>
                        <p>ประจำปี พ.ศ. ${selectedYear + 543} (ค.ศ. ${selectedYear})</p>
                        <p>ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">รหัส</th>
                                <th style="width: 35%">ชื่อ-นามสกุล</th>
                                <th style="width: 10%">ลาป่วย</th>
                                <th style="width: 10%">ลากิจ</th>
                                <th style="width: 10%">พักร้อน</th>
                                <th style="width: 10%">อื่นๆ</th>
                                <th style="width: 10%">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.map(d => `
                                <tr>
                                    <td>${d.employeeId}</td>
                                    <td>${d.name}</td>
                                    <td class="text-center">${d.usage.sick || '-'}</td>
                                    <td class="text-center">${d.usage.personal || '-'}</td>
                                    <td class="text-center">${d.usage.vacation || '-'}</td>
                                    <td class="text-center">${d.usage.other || '-'}</td>
                                    <td class="text-center font-bold">${d.usage.total}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="sum-row">
                                <td colspan="2" class="text-right">รวมทั้งหมด</td>
                                <td class="text-center">${stats.reduce((sum, d) => sum + d.usage.sick, 0)}</td>
                                <td class="text-center">${stats.reduce((sum, d) => sum + d.usage.personal, 0)}</td>
                                <td class="text-center">${stats.reduce((sum, d) => sum + d.usage.vacation, 0)}</td>
                                <td class="text-center">${stats.reduce((sum, d) => sum + d.usage.other, 0)}</td>
                                <td class="text-center">${stats.reduce((sum, d) => sum + d.usage.total, 0)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">
                        พิมพ์โดยระบบ Truck Maintenance Management System
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header / Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">รายงานประวัติการลางาน</h3>
                        <p className="text-sm text-slate-500">ประจำปี {selectedYear + 543}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                    </div>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>ปี {year + 543}</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm transition-colors shadow-sm"
                            title="ดาวน์โหลดเป็น Excel"
                        >
                            <FileSpreadsheet size={18} />
                            <span>Export Excel</span>
                            <Download size={14} className="opacity-75" />
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm transition-colors shadow-sm"
                            title="ดาวน์โหลดเป็น PDF"
                        >
                            <Printer size={18} />
                            <span>Export PDF</span>
                            <Download size={14} className="opacity-75" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-slate-600">พนักงาน</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-600">ลาป่วย (วัน)</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-600">ลากิจ (วัน)</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-600">ลาพักร้อน (วัน)</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-600">อื่นๆ (วัน)</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-800 bg-slate-100/50">รวม (วัน)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.length > 0 ? (
                                stats.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                    {driver.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{driver.name}</p>
                                                    <p className="text-xs text-slate-500">{driver.employeeId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${driver.usage.sick > 0 ? 'bg-red-50 text-red-600' : 'text-slate-400'}`}>
                                                {driver.usage.sick}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${driver.usage.personal > 0 ? 'bg-purple-50 text-purple-600' : 'text-slate-400'}`}>
                                                {driver.usage.personal}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${driver.usage.vacation > 0 ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}>
                                                {driver.usage.vacation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${driver.usage.other > 0 ? 'bg-gray-100 text-gray-600' : 'text-slate-400'}`}>
                                                {driver.usage.other}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center bg-slate-50/30">
                                            <span className="font-black text-slate-800">{driver.usage.total}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        ไม่พบข้อมูลพนักงาน
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                                <td className="px-6 py-4 font-bold text-slate-800 text-right">รวมทั้งหมด</td>
                                <td className="px-6 py-4 text-center font-bold text-red-600">
                                    {stats.reduce((sum, d) => sum + d.usage.sick, 0)}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-purple-600">
                                    {stats.reduce((sum, d) => sum + d.usage.personal, 0)}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-amber-600">
                                    {stats.reduce((sum, d) => sum + d.usage.vacation, 0)}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-600">
                                    {stats.reduce((sum, d) => sum + d.usage.other, 0)}
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-900 bg-slate-100">
                                    {stats.reduce((sum, d) => sum + d.usage.total, 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DriverLeaveReport;
