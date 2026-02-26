import React, { useState } from 'react';
import type { Driver, LeaveRecord, LeaveType } from '../types';
import { formatCurrency } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DriverDetailModalProps {
    driver: Driver;
    onClose: () => void;
    onUpdate: (updatedDriver: Driver) => void;
    onEdit?: () => void;
    initialTab?: 'overview' | 'performance' | 'leaves';
}

const DriverDetailModal: React.FC<DriverDetailModalProps> = ({ driver, onClose, onUpdate, onEdit, initialTab = 'overview' }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'leaves'>(initialTab);
    const [isAddingLeave, setIsAddingLeave] = useState(false);
    const [newLeave, setNewLeave] = useState<Partial<LeaveRecord>>({
        type: 'sick',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'approved'
    });

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [lightbox, setLightbox] = useState<{ index: number } | null>(null);

    const calculateDays = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const getLeavesByYear = (year: number) => {
        if (!driver.leaves) return [];
        return driver.leaves.filter(leave => {
            const leaveYear = new Date(leave.startDate).getFullYear();
            return leaveYear === year;
        });
    };

    const calculateUsageForYear = (year: number) => {
        const yearLeaves = getLeavesByYear(year);
        const usage = { sick: 0, personal: 0, vacation: 0, other: 0 };
        yearLeaves.forEach(leave => {
            if (leave.status === 'approved' || leave.status === 'pending') {
                usage[leave.type as keyof typeof usage] += leave.totalDays;
            }
        });
        return usage;
    };

    const minDateCheck = (dateStr: string) => {
        const year = new Date(dateStr).getFullYear();
        if (year !== selectedYear) {
            // Optional: warning or auto-change year
        }
        setNewLeave({ ...newLeave, startDate: dateStr });
    };

    const handleAddLeave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) return;

        const totalDays = calculateDays(newLeave.startDate, newLeave.endDate);
        const leaveRecord: LeaveRecord = {
            id: `L-${Date.now()}`,
            driverId: driver.id,
            type: newLeave.type as LeaveType,
            startDate: newLeave.startDate,
            endDate: newLeave.endDate,
            totalDays,
            reason: newLeave.reason,
            status: 'approved' // Default to approved for now
        };

        const updatedDriver = {
            ...driver,
            leaves: [leaveRecord, ...(driver.leaves || [])], // Add to beginning
            // Note: We don't need to manually update static 'usedLeave' anymore for display, 
            // but we might want to keep it sync if the backend expects it. 
            // For this UI, we rely on dynamic calculation.

            // Update status if currently on leave (simplified logic)
            status: new Date(newLeave.startDate!) <= new Date() && new Date(newLeave.endDate!) >= new Date() ? 'on_leave' : driver.status
        };

        onUpdate(updatedDriver as Driver);
        setIsAddingLeave(false);
        setNewLeave({
            type: 'sick',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
            status: 'approved'
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-start pt-4 pb-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                            {driver.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{driver.name}</h3>
                            <p className="text-sm text-slate-500">{driver.employeeId} • {driver.licenseClass}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={() => { onClose(); onEdit(); }}
                                title="แก้ไขข้อมูล"
                                aria-label="แก้ไขข้อมูล"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                แก้ไข
                            </button>
                        )}
                        <button onClick={onClose} title="ปิด" aria-label="ปิด" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 shrink-0">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        ข้อมูลทั่วไป
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'performance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        ประสิทธิภาพการทำงาน
                    </button>
                    <button
                        onClick={() => setActiveTab('leaves')}
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'leaves' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        ประวัติการลา
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-gray-50/50">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">ข้อมูลส่วนตัว</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">ชื่อเล่น:</span> <span className="font-medium">{driver.nickname}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">เบอร์โทร:</span> <span className="font-medium">{driver.phone}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">อีเมล:</span> <span className="font-medium">{driver.email || '-'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">ที่อยู่:</span> <span className="font-medium text-right max-w-[200px] truncate">{driver.address || '-'}</span></div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">ข้อมูลงาน</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">วันที่เริ่มงาน:</span> <span className="font-medium">{new Date(driver.hireDate).toLocaleDateString('th-TH')}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">ประสบการณ์:</span> <span className="font-medium">{driver.experience} ปี</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">เงินเดือน:</span> <span className="font-medium">{formatCurrency(driver.monthlySalary || 0)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500 text-sm">สถานะ:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${driver.status === 'active' ? 'bg-green-100 text-green-700' : driver.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {driver.status === 'active' ? 'ปฏิบัติงาน' : driver.status === 'on_leave' ? 'ลา' : 'พ้นสภาพ'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">ใบขับขี่และการรับรอง</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-slate-500 text-sm">เลขที่ใบขับขี่:</span> <span className="font-medium">{driver.licenseNumber}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500 text-sm">ประเภท:</span> <span className="font-medium">{driver.licenseClass}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500 text-sm">วันหมดอายุ:</span> <span className="font-medium">{new Date(driver.licenseExpiry).toLocaleDateString('th-TH')}</span></div>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-sm mb-2">ใบรับรอง:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {driver.certifications?.map((cert, index) => (
                                                <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium border border-blue-100">
                                                    {cert}
                                                </span>
                                            ))}
                                            {(!driver.certifications || driver.certifications.length === 0) && <span className="text-slate-400 text-sm">-</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Photos Section */}
                            {driver.photos && driver.photos.length > 0 && (
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
                                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">📷 รูปภาพ / เอกสาร ({driver.photos.length} รูป)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {driver.photos.map((url, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setLightbox({ index })}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group"
                                                title={`ดูรูปที่ ${index + 1}`}
                                            >
                                                <img src={url} alt={`รูปภาพพนักงาน ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <p className="text-slate-500 text-xs uppercase font-bold">ระยะทางรวม</p>
                                    <p className="text-2xl font-black text-blue-600 mt-2">{driver.totalDistanceDriven.toLocaleString()}</p>
                                    <p className="text-slate-400 text-xs">กม.</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <p className="text-slate-500 text-xs uppercase font-bold">จำนวนเที่ยว</p>
                                    <p className="text-2xl font-black text-purple-600 mt-2">{driver.totalTrips.toLocaleString()}</p>
                                    <p className="text-slate-400 text-xs">เที่ยว</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <p className="text-slate-500 text-xs uppercase font-bold">คะแนนความปลอดภัย</p>
                                    <p className="text-2xl font-black text-emerald-600 mt-2">{driver.safetyScore}</p>
                                    <p className="text-slate-400 text-xs">คะแนน</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <p className="text-slate-500 text-xs uppercase font-bold">ส่งตรงเวลา</p>
                                    <p className="text-2xl font-black text-amber-600 mt-2">{driver.onTimeDeliveryRate}%</p>
                                    <p className="text-slate-400 text-xs">เปอร์เซ็นต์</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4">อุบัติเหตุและการฝ่าฝืนกฎ</h4>
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg">{driver.accidentCount}</div>
                                        <span className="text-slate-600 font-medium">ครั้งที่เกิดอุบัติเหตุ</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">{driver.violationCount}</div>
                                        <span className="text-slate-600 font-medium">ครั้งที่ฝ่าฝืนกฎจราจร</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'leaves' && (
                        <div className="space-y-6">
                            {/* Year Selector */}
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-slate-800">ข้อมูลการลาประจำปี {selectedYear}</h4>
                                <select
                                    title="เลือกปี"
                                    aria-label="เลือกปี"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year + 543} ({year})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Leave Quota Cards (Dynamic Calculation) */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Sick Leave */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-500 text-sm font-bold">ลาป่วย</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${calculateUsageForYear(selectedYear).sick >= (driver.leaveQuota?.sick || 30) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {(driver.leaveQuota?.sick || 30) - calculateUsageForYear(selectedYear).sick} วันคงเหลือ
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                                        <div
                                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (calculateUsageForYear(selectedYear).sick / (driver.leaveQuota?.sick || 30)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>ใช้ไป {calculateUsageForYear(selectedYear).sick} วัน</span>
                                        <span>โควต้า {driver.leaveQuota?.sick || 30} วัน</span>
                                    </div>
                                </div>

                                {/* Personal Leave */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-500 text-sm font-bold">ลากิจ</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${calculateUsageForYear(selectedYear).personal >= (driver.leaveQuota?.personal || 15) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {(driver.leaveQuota?.personal || 15) - calculateUsageForYear(selectedYear).personal} วันคงเหลือ
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                                        <div
                                            className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (calculateUsageForYear(selectedYear).personal / (driver.leaveQuota?.personal || 15)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>ใช้ไป {calculateUsageForYear(selectedYear).personal} วัน</span>
                                        <span>โควต้า {driver.leaveQuota?.personal || 15} วัน</span>
                                    </div>
                                </div>

                                {/* Vacation Leave */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-500 text-sm font-bold">ลาพักร้อน</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${calculateUsageForYear(selectedYear).vacation >= (driver.leaveQuota?.vacation || 10) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {(driver.leaveQuota?.vacation || 10) - calculateUsageForYear(selectedYear).vacation} วันคงเหลือ
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                                        <div
                                            className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (calculateUsageForYear(selectedYear).vacation / (driver.leaveQuota?.vacation || 10)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>ใช้ไป {calculateUsageForYear(selectedYear).vacation} วัน</span>
                                        <span>โควต้า {driver.leaveQuota?.vacation || 10} วัน</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Leave Form (Only if selected year is current or future) */}
                            {selectedYear >= new Date().getFullYear() && (
                                isAddingLeave ? (
                                    <form onSubmit={handleAddLeave} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-fade-in-up">
                                        <h5 className="font-bold text-slate-800 mb-3">บันทึกการลา (ปี {selectedYear})</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="leave-type" className="block text-xs font-bold text-slate-700 mb-1">ประเภทการลา</label>
                                                <select
                                                    id="leave-type"
                                                    title="ประเภทการลา"
                                                    value={newLeave.type}
                                                    onChange={e => setNewLeave({ ...newLeave, type: e.target.value as LeaveType })}
                                                    className="w-full p-2 rounded-xl border border-slate-300 text-sm"
                                                >
                                                    <option value="sick">ลาป่วย</option>
                                                    <option value="personal">ลากิจ</option>
                                                    <option value="vacation">ลาพักร้อน</option>
                                                    <option value="other">อื่นๆ</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผล</label>
                                                <input
                                                    type="text"
                                                    value={newLeave.reason}
                                                    onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                                                    className="w-full p-2 rounded-xl border border-slate-300 text-sm"
                                                    placeholder="ระบุเหตุผล"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="leave-start-date" className="block text-xs font-bold text-slate-700 mb-1">วันที่เริ่ม</label>
                                                <input
                                                    id="leave-start-date"
                                                    type="date"
                                                    title="วันที่เริ่มลา"
                                                    value={newLeave.startDate}
                                                    onChange={e => minDateCheck(e.target.value)}
                                                    className="w-full p-2 rounded-xl border border-slate-300 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="leave-end-date" className="block text-xs font-bold text-slate-700 mb-1">วันที่สิ้นสุด</label>
                                                <input
                                                    id="leave-end-date"
                                                    type="date"
                                                    title="วันที่สิ้นสุดการลา"
                                                    value={newLeave.endDate}
                                                    onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                                                    className="w-full p-2 rounded-xl border border-slate-300 text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingLeave(false)}
                                                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                                            >
                                                บันทึก
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingLeave(true)}
                                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        เพิ่มรายการลา
                                    </button>
                                )
                            )}

                            {/* Leaves History List */}
                            <div className="space-y-3">
                                <h5 className="font-bold text-slate-800">ประวัติการลา (ปี {selectedYear})</h5>
                                {getLeavesByYear(selectedYear).length > 0 ? (
                                    getLeavesByYear(selectedYear).map(leave => (
                                        <div key={leave.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${leave.type === 'sick' ? 'bg-red-50 text-red-500' : leave.type === 'personal' ? 'bg-purple-50 text-purple-500' : 'bg-amber-50 text-amber-500'}`}>
                                                    {leave.type === 'sick' ? '🤒' : leave.type === 'personal' ? '📝' : '🏖️'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{leave.reason}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(leave.startDate).toLocaleDateString('th-TH')} - {new Date(leave.endDate).toLocaleDateString('th-TH')}
                                                        <span className="ml-2 font-bold text-slate-600">({leave.totalDays} วัน)</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${leave.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {leave.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                                        <span className="text-3xl block mb-2">📅</span>
                                        <p className="text-slate-400 text-sm">ไม่มีประวัติการลาในปี {selectedYear}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && driver.photos && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[300] flex flex-col items-center justify-start pt-6 p-4 overflow-y-auto"
                    onClick={() => setLightbox(null)}
                >
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightbox(null)}
                            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 z-10"
                            aria-label="ปิด"
                        >
                            ✕
                        </button>
                        <img
                            src={driver.photos[lightbox.index]}
                            alt={`รูปที่ ${lightbox.index + 1}`}
                            className="w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={() => setLightbox({ index: (lightbox.index - 1 + driver.photos!.length) % driver.photos!.length })}
                                disabled={driver.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ‹ ก่อนหน้า
                            </button>
                            <span className="text-white text-sm">{lightbox.index + 1} / {driver.photos.length}</span>
                            <button
                                onClick={() => setLightbox({ index: (lightbox.index + 1) % driver.photos!.length })}
                                disabled={driver.photos.length <= 1}
                                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ถัดไป ›
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 justify-center flex-wrap">
                            {driver.photos.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLightbox({ index: idx })}
                                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${idx === lightbox.index ? 'border-blue-400' : 'border-transparent hover:border-gray-400'}`}
                                >
                                    <img src={url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDetailModal;
