import React, { useEffect } from 'react';
import { Repair } from '../types';
import { formatHoursDescriptive, formatCurrency, calculateDurationHours } from '../utils';

interface RepairTimelineModalProps {
    repair: Repair;
    onClose: () => void;
}

const RepairTimelineModal: React.FC<RepairTimelineModalProps> = ({ repair, onClose }) => {
    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Construct Timeline Events
    const events = [
        {
            title: 'แจ้งซ่อม (Request Created)',
            date: repair.createdAt,
            description: `ผู้แจ้ง: ${repair.reportedBy} | อาการ: ${repair.problemDescription}`,
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', // File Text
            color: 'bg-blue-500',
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            order: 1
        }
    ];

    if (repair.assignedTechnicianId || repair.externalTechnicianName) {
        // Note: We don't have an exact assigned date, so we assume it happens after creation but before start
        // Using createdAt + 1 minute simply for sorting visualization if actual dates are missing, 
        // but visually we will just place it in the flow.
        const date = repair.repairStartDate ? new Date(new Date(repair.repairStartDate).getTime() - 10000).toISOString() : new Date(new Date(repair.createdAt).getTime() + 600000).toISOString();

        events.push({
            title: 'มอบหมายงาน (Assigned)',
            date: date,
            description: repair.dispatchType === 'ภายนอก' ? `ซ่อมภายนอก: ${repair.externalTechnicianName}` : `ช่างภายใน`,
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', // User
            color: 'bg-indigo-500',
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            order: 2
        });
    }

    const hasStarted = repair.repairStartDate || ['กำลังซ่อม', 'รออะไหล่', 'ซ่อมเสร็จ'].includes(repair.status);
    if (hasStarted) {
        // Fallback: If no start date, use end date (if exists) or creation date
        const startDate = repair.repairStartDate || (repair.repairEndDate || repair.createdAt);
        events.push({
            title: 'เริ่มดำเนินการ (Started)',
            date: startDate,
            description: 'เริ่มทำการซ่อมบำรุง',
            icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', // Tool/Wrench
            color: 'bg-orange-500',
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            order: 3
        });
    }

    const hasPhotos = Array.isArray(repair.photos) && repair.photos.length > 0;

    if (repair.repairEndDate) {
        events.push({
            title: 'ซ่อมเสร็จสิ้น (Completed)',
            date: repair.repairEndDate,
            description: `สถานะจบงาน: ${repair.status}${hasPhotos ? ` | 📷 ${repair.photos!.length} รูป` : ''}`,
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', // Check Circle
            color: 'bg-green-500',
            bg: 'bg-green-50',
            text: 'text-green-700',
            order: 4
        });
    } else if (repair.status === 'ยกเลิก') {
        events.push({
            title: 'ยกเลิก (Cancelled)',
            date: repair.updatedAt || new Date().toISOString(),
            description: 'ใบงานถูกยกเลิก',
            icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', // X Circle
            color: 'bg-red-500',
            bg: 'bg-red-50',
            text: 'text-red-700',
            order: 5
        });
    }

    // Sort events
    const sortedEvents = [...events].sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();

        if (timeA !== timeB) {
            return timeA - timeB;
        }

        // Use order as tie-breaker for identical timestamps
        return (a as any).order - (b as any).order;
    });

    // Calculate total duration (Request Created until Completed)
    const rawHours = calculateDurationHours(repair.createdAt, repair.repairEndDate || null);
    const duration = repair.repairEndDate
        ? formatHoursDescriptive(rawHours)
        : '-';

    // Detection for Manual Record (Full process completed within 5 minutes of creation, or start/end is identical)
    const isManualRecord = repair.repairStartDate && repair.repairEndDate &&
        (new Date(repair.repairEndDate).getTime() - new Date(repair.createdAt).getTime() < 300000 ||
            new Date(repair.repairEndDate).getTime() === new Date(repair.repairStartDate).getTime());

    // Calculate total cost (Labor + Parts + VAT)
    const totalPartsCost = (repair.parts || []).reduce((sum, part) => sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0), 0);
    const calculatedTotalCost = (repair.repairCost || 0) + (repair.laborVat || 0) + totalPartsCost + (repair.partsVat || 0);

    // Helper to calculate time gap between events
    const getTimeGap = (currentDate: string, prevDate: string | null) => {
        if (!prevDate) return null;
        const diffMs = new Date(currentDate).getTime() - new Date(prevDate).getTime();
        if (diffMs < 0) return null; // Should not happen with sorting
        if (diffMs < 60000) return '⚡ ดำเนินการต่อเนื่อง';

        const diffHours = diffMs / (1000 * 60 * 60);
        return `⏱️ ใช้เวลา ${formatHoursDescriptive(diffHours)}`;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex justify-between items-start">
                        <div>
                            <h3 className="text-xl leading-6 font-bold text-white flex items-center gap-2">
                                <span className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md border border-white/10">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                Timeline การซ่อม
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-sm text-slate-300">
                                    ใบแจ้งซ่อม: <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white">{repair.repairOrderNo}</span> • ทะเบียน: <span className="font-mono text-white">{repair.licensePlate}</span>
                                </p>
                                {isManualRecord && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold backdrop-blur-sm animate-pulse">
                                        Manual Record
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="ปิดหน้าต่าง"
                            className="bg-white/10 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/20 transition-all focus:outline-none"
                            onClick={onClose}
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-8 bg-gray-50/50">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">สถานะปัจจุบัน</p>
                                <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold ${repair.status === 'ซ่อมเสร็จ' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {repair.status}
                                </span>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">ระยะเวลาซ่อม</p>
                                <p className="text-xl font-extrabold text-slate-700 mt-1">{duration}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">ค่าใช้จ่าย</p>
                                <p className="text-xl font-extrabold text-slate-700 mt-1">{formatCurrency(calculatedTotalCost)} บาท</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">ผู้รับผิดชอบ</p>
                                <p className="text-sm font-bold text-slate-700 mt-2 truncate">
                                    {repair.assignedTechnicianId ? 'ช่างภายใน' : repair.externalTechnicianName || '-'}
                                </p>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-gray-200 to-green-200"></div>

                            <div className="space-y-0">
                                {sortedEvents.map((event, index) => {
                                    const prevEvent = index > 0 ? sortedEvents[index - 1] : null;
                                    const timeGap = getTimeGap(event.date, prevEvent?.date || null);

                                    return (
                                        <div key={index}>
                                            {/* Time Gap Indicator */}
                                            {timeGap && (
                                                <div className="ml-16 py-2 flex items-center gap-2">
                                                    <div className="w-4 h-0.5 bg-gray-200"></div>
                                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/50 uppercase tracking-tighter">
                                                        {timeGap}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="relative flex items-start group pb-8">
                                                {/* Icon Wrapper */}
                                                <div className={`absolute left-0 w-16 h-16 flex items-center justify-center rounded-full border-4 border-white shadow-md z-10 ${event.color} text-white transition-all transform group-hover:scale-110 group-hover:shadow-lg`}>
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={event.icon} />
                                                    </svg>
                                                </div>

                                                {/* Content */}
                                                <div className="ml-24 flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative hover:shadow-md transition-all hover:border-blue-100 group-hover:-translate-y-0.5">
                                                    {/* Arrow */}
                                                    <div className="absolute top-6 -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100"></div>

                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                                                        <h4 className={`text-lg font-bold ${event.text}`}>{event.title}</h4>
                                                        <span className="text-sm font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 group-hover:text-gray-600 group-hover:bg-gray-100 transition-colors">
                                                            {new Date(event.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                                                    {/* Show photos on the Completed event */}
                                                    {event.order === 4 && hasPhotos && (
                                                        <div className="mt-3">
                                                            <p className="text-xs font-semibold text-gray-500 mb-2">📷 รูปภาพประกอบ ({repair.photos!.length} รูป)</p>
                                                            <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                                                                {repair.photos!.map((url, idx) => (
                                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                                                        <img
                                                                            src={url}
                                                                            alt={`รูปที่ ${idx + 1}`}
                                                                            className="w-full h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer shadow-sm"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
                        <button
                            type="button"
                            className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-sm transition-colors"
                            onClick={onClose}
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RepairTimelineModal;
