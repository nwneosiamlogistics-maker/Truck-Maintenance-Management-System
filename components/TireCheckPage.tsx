import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { TireInspection, TireData, Vehicle, VehicleLayout, TireType, TireAction } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

// --- CONFIG & CONSTANTS ---
const TREAD_DEPTH_THRESHOLDS = {
    good: 4, // mm
    warning: 2, // mm
};

const VEHICLE_LAYOUTS: Record<VehicleLayout, { id: string; label: string }[]> = {
    'รถพ่วง 22 ล้อ': [
        // Truck
        { id: '1', label: 'หัวลาก-หน้าซ้าย' }, { id: '2', label: 'หัวลาก-หน้าขวา' },
        { id: '3', label: 'หัวลาก-หลัง1ซ้าย นอก' }, { id: '4', label: 'หัวลาก-หลัง1ซ้าย ใน' },
        { id: '5', label: 'หัวลาก-หลัง1ขวา นอก' }, { id: '6', label: 'หัวลาก-หลัง1ขวา ใน' },
        { id: '7', label: 'หัวลาก-หลัง2ซ้าย นอก' }, { id: '8', label: 'หัวลาก-หลัง2ซ้าย ใน' },
        { id: '9', label: 'หัวลาก-หลัง2ขวา นอก' }, { id: '10', label: 'หัวลาก-หลัง2ขวา ใน' },
        // Trailer
        { id: '11', label: 'หาง-หน้าซ้าย นอก' }, { id: '12', label: 'หาง-หน้าซ้าย ใน' },
        { id: '13', label: 'หาง-หน้าขวา นอก' }, { id: '14', label: 'หาง-หน้าขวา ใน' },
        { id: '15', label: 'หาง-กลางซ้าย นอก' }, { id: '16', label: 'หาง-กลางซ้าย ใน' },
        { id: '17', label: 'หาง-กลางขวา นอก' }, { id: '18', label: 'หาง-กลางขวา ใน' },
        { id: '19', label: 'หาง-หลังซ้าย นอก' }, { id: '20', label: 'หาง-หลังซ้าย ใน' },
        { id: '21', label: 'หาง-หลังขวา นอก' }, { id: '22', label: 'หาง-หลังขวา ใน' },
        // Spares
        { id: '23', label: 'ยางอะไหล่หัวลาก' },
        { id: '24', label: 'ยางอะไหล่หาง' },
    ],
    'รถ 12 ล้อ': [
        { id: '1', label: 'หน้า1ซ้าย' }, { id: '2', label: 'หน้า1ขวา' },
        { id: '3', label: 'หน้า2ซ้าย' }, { id: '4', label: 'หน้า2ขวา' },
        { id: '5', label: 'หลัง1ซ้าย นอก' }, { id: '6', label: 'หลัง1ซ้าย ใน' },
        { id: '7', label: 'หลัง1ขวา นอก' }, { id: '8', label: 'หลัง1ขวา ใน' },
        { id: '9', label: 'หลัง2ซ้าย นอก' }, { id: '10', label: 'หลัง2ซ้าย ใน' },
        { id: '11', label: 'หลัง2ขวา นอก' }, { id: '12', label: 'หลัง2ขวา ใน' },
        { id: '13', label: 'ยางอะไหล่' },
    ],
    'รถ 10 ล้อ': [
        { id: '1', label: 'หน้าซ้าย' }, { id: '2', label: 'หน้าขวา' },
        { id: '3', label: 'หลัง1ซ้าย นอก' }, { id: '4', label: 'หลัง1ซ้าย ใน' },
        { id: '5', label: 'หลัง1ขวา นอก' }, { id: '6', label: 'หลัง1ขวา ใน' },
        { id: '7', label: 'หลัง2ซ้าย นอก' }, { id: '8', label: 'หลัง2ซ้าย ใน' },
        { id: '9', label: 'หลัง2ขวา นอก' }, { id: '10', label: 'หลัง2ขวา ใน' },
        { id: '11', label: 'ยางอะไหล่' },
    ],
    'รถ 6 ล้อ': [
        { id: '1', label: 'หน้าซ้าย' }, { id: '2', label: 'หน้าขวา' },
        { id: '3', label: 'หลังซ้าย นอก' }, { id: '4', label: 'หลังซ้าย ใน' },
        { id: '5', label: 'หลังขวา นอก' }, { id: '6', label: 'หลังขวา ใน' },
        { id: '7', label: 'ยางอะไหล่' },
    ],
    'รถกระบะ 4 ล้อ': [
        { id: '1', label: 'หน้าซ้าย' }, { id: '2', label: 'หน้าขวา' },
        { id: '3', label: 'หลังซ้าย' }, { id: '4', label: 'หลังขวา' },
        { id: '5', label: 'ยางอะไหล่' },
    ],
    'หาง 3 เพลา': [
        { id: '1', label: 'เพลา1ซ้าย นอก' }, { id: '2', label: 'เพลา1ซ้าย ใน' },
        { id: '3', label: 'เพลา1ขวา นอก' }, { id: '4', label: 'เพลา1ขวา ใน' },
        { id: '5', label: 'เพลา2ซ้าย นอก' }, { id: '6', label: 'เพลา2ซ้าย ใน' },
        { id: '7', label: 'เพลา2ขวา นอก' }, { id: '8', label: 'เพลา2ขวา ใน' },
        { id: '9', label: 'เพลา3ซ้าย นอก' }, { id: '10', label: 'เพลา3ซ้าย ใน' },
        { id: '11', label: 'เพลา3ขวา นอก' }, { id: '12', label: 'เพลา3ขวา ใน' },
        { id: '13', label: 'ยางอะไหล่' },
    ],
    'หาง 2 เพลา': [
        { id: '1', label: 'เพลา1ซ้าย นอก' }, { id: '2', label: 'เพลา1ซ้าย ใน' },
        { id: '3', label: 'เพลา1ขวา นอก' }, { id: '4', label: 'เพลา1ขวา ใน' },
        { id: '5', label: 'เพลา2ซ้าย นอก' }, { id: '6', label: 'เพลา2ซ้าย ใน' },
        { id: '7', label: 'เพลา2ขวา นอก' }, { id: '8', label: 'เพลา2ขวา ใน' },
        { id: '9', label: 'ยางอะไหล่' },
    ],
    'หางแม่ลูก 3 เพลา': [
        { id: '1', label: 'เพลา1ซ้าย นอก' }, { id: '2', label: 'เพลา1ซ้าย ใน' },
        { id: '3', label: 'เพลา1ขวา นอก' }, { id: '4', label: 'เพลา1ขวา ใน' },
        { id: '5', label: 'เพลา2ซ้าย นอก' }, { id: '6', label: 'เพลา2ซ้าย ใน' },
        { id: '7', label: 'เพลา2ขวา นอก' }, { id: '8', label: 'เพลา2ขวา ใน' },
        { id: '9', label: 'เพลา3ซ้าย นอก' }, { id: '10', label: 'เพลา3ซ้าย ใน' },
        { id: '11', label: 'เพลา3ขวา นอก' }, { id: '12', label: 'เพลา3ขวา ใน' },
        { id: '13', label: 'ยางอะไหล่' },
    ],
    'หางแม่ลูก 2 เพลา': [
        { id: '1', label: 'เพลา1ซ้าย นอก' }, { id: '2', label: 'เพลา1ซ้าย ใน' },
        { id: '3', label: 'เพลา1ขวา นอก' }, { id: '4', label: 'เพลา1ขวา ใน' },
        { id: '5', label: 'เพลา2ซ้าย นอก' }, { id: '6', label: 'เพลา2ซ้าย ใน' },
        { id: '7', label: 'เพลา2ขวา นอก' }, { id: '8', label: 'เพลา2ขวา ใน' },
        { id: '9', label: 'ยางอะไหล่' },
    ],
};

const TIRE_ACTIONS: TireAction[] = ['ปกติ', 'ถอด', 'สลับยาง', 'เปลี่ยน'];
const TIRE_TYPES: TireType[] = ['เรเดียล', 'ไบแอส', 'อื่นๆ'];

// --- HELPER FUNCTIONS ---
type TireStatus = 'good' | 'warning' | 'danger' | 'unchecked';

const calculateTireAge = (changeDateStr: string | null | undefined): string => {
    if (!changeDateStr) {
        return '-';
    }
    const startDate = new Date(changeDateStr);
    const endDate = new Date();
    if (isNaN(startDate.getTime()) || startDate > endDate) {
        return '-';
    }
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    if (days < 0) {
        months--;
        const lastDayOfPreviousMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
        days += lastDayOfPreviousMonth;
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    if (days > 0) parts.push(`${days} วัน`);
    return parts.length > 0 ? parts.join(' ') : 'วันนี้';
};

const getTireStatus = (tire: Partial<TireData> | undefined): TireStatus => {
    if (!tire?.isFilled || tire.treadDepth === null || tire.treadDepth === undefined) return 'unchecked';
    if (tire.action === 'เปลี่ยน') return 'danger';
    if (tire.treadDepth < TREAD_DEPTH_THRESHOLDS.warning) return 'danger';
    if (tire.treadDepth < TREAD_DEPTH_THRESHOLDS.good) return 'warning';
    return 'good';
};

const getTireStyling = (status: TireStatus) => {
    switch (status) {
        case 'good': return 'border-green-500 bg-green-100 text-green-800';
        case 'warning': return 'border-yellow-500 bg-yellow-100 text-yellow-800';
        case 'danger': return 'border-red-500 bg-red-100 text-red-800';
        default: return 'border-gray-400 bg-gray-100 text-gray-600 border-dashed';
    }
};

// --- SUB-COMPONENTS ---
const TireDataModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TireData) => void;
    tireData: TireData;
    positionLabel: string;
}> = ({ isOpen, onClose, onSave, tireData, positionLabel }) => {
    const [formData, setFormData] = useState<TireData>(tireData);

    useEffect(() => {
        setFormData(tireData);
    }, [tireData]);

    useEffect(() => {
        if (formData.action === 'เปลี่ยน') {
            // When action changes to 'เปลี่ยน', pre-fill the date with today if it's currently empty.
            // This prevents overwriting a date the user may have explicitly set.
            setFormData(prev => {
                if (prev && !prev.changeDate) {
                    return { ...prev, changeDate: new Date().toISOString().split('T')[0] };
                }
                return prev; // No change needed
            });
        } else {
            // If the action is anything other than 'เปลี่ยน', the change date is irrelevant.
            // Clear it if it has a value to maintain data consistency.
            setFormData(prev => {
                if (prev && prev.changeDate !== '') {
                    return { ...prev, changeDate: '' };
                }
                return prev; // No change needed
            });
        }
    }, [formData.action]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = () => {
        onSave({ ...formData, isFilled: true });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[101] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h3 className="text-xl font-bold">ข้อมูลยาง - {positionLabel}</h3>
                </div>
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Tire Condition */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ความลึกดอกยาง (mm)</label>
                            <input type="number" name="treadDepth" value={formData.treadDepth ?? ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">แรงดันลม (PSI)</label>
                            <input type="number" name="psi" value={formData.psi ?? ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                    </div>

                    {/* Tire Identity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ยี่ห้อ</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="เช่น Michelin" className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">รุ่น</label>
                            <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="เช่น XZY3" className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">สัปดาห์/ปีผลิต (WW/YY)</label>
                            <input type="text" name="productionDate" value={formData.productionDate} onChange={handleChange} placeholder="เช่น 35/23" className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                    
                    {/* Action */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">การดำเนินการ</label>
                            <select name="action" value={formData.action} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg">
                                {TIRE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่เปลี่ยนยาง</label>
                            <input
                                type="date"
                                name="changeDate"
                                value={formData.changeDate}
                                onChange={handleChange}
                                className="mt-1 w-full p-2 border rounded-lg disabled:bg-gray-100"
                                disabled={formData.action !== 'เปลี่ยน'}
                            />
                        </div>
                    </div>

                    {/* Misc */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ประเภทยาง</label>
                        <select name="tireType" value={formData.tireType} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg">
                            {TIRE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="หมายเหตุเพิ่มเติม..." rows={2} className="mt-1 w-full p-2 border rounded-lg" />
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">บันทึกข้อมูลยาง</button>
                </div>
            </div>
        </div>
    );
};

const TruckDiagram: React.FC<{
    layout: VehicleLayout;
    tires: Record<string, TireData>;
    onSelectTire: (positionId: string) => void;
}> = ({ layout, tires, onSelectTire }) => {
    const TireButton = ({ positionId, label, className = '' }: { positionId: string, label: string | number, className?: string }) => {
        const tire = tires[positionId.toString()];
        const status = getTireStatus(tire);
        const positionLabel = VEHICLE_LAYOUTS[layout]?.find(p => p.id === positionId.toString())?.label || `Tire ${positionId}`;
        return (
            <button
                onClick={() => onSelectTire(positionId.toString())}
                className={`w-12 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all shadow-sm hover:shadow-md ${getTireStyling(status)} ${className}`}
                title={positionLabel}
            >
                <span className="font-bold text-lg">{label}</span>
                <span className="text-xs">{tire?.isFilled ? (tire.treadDepth != null ? `${tire.treadDepth}mm` : '-') : '...'}</span>
            </button>
        );
    };

    const DualWheel = ({ pos1, pos2 }: { pos1: number, pos2: number }) => (
        <div className="flex gap-1">
            <TireButton positionId={pos1.toString()} label={pos1} />
            <TireButton positionId={pos2.toString()} label={pos2} />
        </div>
    );
    
    // Trailer-only layouts
    if (layout === 'หาง 3 เพลา' || layout === 'หางแม่ลูก 3 เพลา') {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">{layout}</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={1} pos2={2} />
                            <DualWheel pos1={3} pos2={4} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={5} pos2={6} />
                            <DualWheel pos1={7} pos2={8} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={9} pos2={10} />
                            <DualWheel pos1={11} pos2={12} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="13" label={13} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (layout === 'หาง 2 เพลา' || layout === 'หางแม่ลูก 2 เพลา') {
        return (
             <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">{layout}</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={1} pos2={2} />
                            <DualWheel pos1={3} pos2={4} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={5} pos2={6} />
                            <DualWheel pos1={7} pos2={8} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="9" label={9} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (layout === 'รถ 12 ล้อ') {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">{layout}</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full px-4 items-center">
                            <TireButton positionId="1" label={1} />
                            <div className="w-20 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-500 text-sm">Cab</div>
                            <TireButton positionId="2" label={2} />
                        </div>
                         <div className="flex justify-between w-full px-4">
                            <TireButton positionId="3" label={3} />
                            <TireButton positionId="4" label={4} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={5} pos2={6} />
                            <DualWheel pos1={7} pos2={8} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={9} pos2={10} />
                            <DualWheel pos1={11} pos2={12} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="13" label={13} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                 </div>
            </div>
        );
    }

    if (layout === 'รถ 6 ล้อ') {
         return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">{layout}</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full px-4 items-center">
                            <TireButton positionId="1" label={1} />
                            <div className="w-20 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-500 text-sm">Cab</div>
                            <TireButton positionId="2" label={2} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={3} pos2={4} />
                            <DualWheel pos1={5} pos2={6} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="7" label={7} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                 </div>
            </div>
        );
    }
    
    if (layout === 'รถกระบะ 4 ล้อ') {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">{layout}</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full px-4 items-center">
                            <TireButton positionId="1" label={1} />
                             <div className="w-20 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-500 text-sm">Cab</div>
                            <TireButton positionId="2" label={2} />
                        </div>
                        <div className="flex justify-between w-full px-4">
                            <TireButton positionId="3" label={3} />
                            <TireButton positionId="4" label={4} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="5" label={5} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                 </div>
            </div>
        );
    }

    if (layout === 'รถพ่วง 22 ล้อ') {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">หัวลาก</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full px-4 items-center">
                            <TireButton positionId="1" label={1} />
                            <div className="w-20 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-500 text-sm">Cab</div>
                            <TireButton positionId="2" label={2} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={3} pos2={4} />
                            <DualWheel pos1={5} pos2={6} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={7} pos2={8} />
                            <DualWheel pos1={9} pos2={10} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="23" label={23} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                 </div>

                 <div className="w-1 h-4 bg-gray-400"></div>
                
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">หางพ่วง</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={11} pos2={12} />
                            <DualWheel pos1={13} pos2={14} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={15} pos2={16} />
                            <DualWheel pos1={17} pos2={18} />
                        </div>
                         <div className="flex justify-between w-full">
                            <DualWheel pos1={19} pos2={20} />
                            <DualWheel pos1={21} pos2={22} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="24" label={24} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    } else if (layout === 'รถ 10 ล้อ') {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg font-sans">
                 <div className="border p-4 rounded-lg bg-white w-full max-w-sm relative shadow-inner">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded">รถ 10 ล้อ</div>
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="flex justify-between w-full px-4 items-center">
                            <TireButton positionId="1" label={1} />
                            <div className="w-20 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-500 text-sm">Cab</div>
                            <TireButton positionId="2" label={2} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={3} pos2={4} />
                            <DualWheel pos1={5} pos2={6} />
                        </div>
                        <div className="flex justify-between w-full">
                            <DualWheel pos1={7} pos2={8} />
                            <DualWheel pos1={9} pos2={10} />
                        </div>
                        <div className="flex justify-center pt-2">
                             <TireButton positionId="11" label={11} className="w-16 h-16 rounded-full" />
                        </div>
                    </div>
                 </div>
            </div>
        );
    }
    
// FIX: Replaced unreachable fallback code with `null`.
// The previous series of `if/else if` statements handled all possible values of `layout`,
// making the fallback code unreachable. TypeScript inferred the `layout` variable as type `never`
// in this block, causing a type error on `axles.map`. Returning null ensures the component
// has a valid return path without containing unreachable logic.
    return null;
};

// --- MAIN COMPONENTS ---
interface TireCheckPageProps {
    inspections: TireInspection[];
    setInspections: React.Dispatch<React.SetStateAction<TireInspection[]>>;
    vehicles: Vehicle[];
}

const TireCheckPage: React.FC<TireCheckPageProps> = ({ inspections, setInspections, vehicles }) => {
    const [view, setView] = useState<'form' | 'history'>('form');
    const [editingInspection, setEditingInspection] = useState<TireInspection | null>(null);

    const handleEdit = (inspection: TireInspection) => {
        setEditingInspection(inspection);
        setView('form');
    };

    const handleCancel = () => {
        setEditingInspection(null);
        setView('history');
    };
    
    const handleComplete = () => {
        setEditingInspection(null);
        setView('history');
    };


    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-2xl shadow-sm flex items-center justify-center gap-2 max-w-md mx-auto">
                <button
                    onClick={() => { setView('form'); setEditingInspection(null); }}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'form' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    📝 บันทึกการตรวจเช็ค
                </button>
                <button
                    onClick={() => { setView('history'); setEditingInspection(null); }}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'history' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    📜 ประวัติการตรวจเช็ค
                </button>
            </div>

            {view === 'form' ? (
                <TireCheckForm
                    vehicles={vehicles}
                    setInspections={setInspections}
                    inspectionToEdit={editingInspection}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                />
            ) : (
                <TireCheckHistory inspections={inspections} onEdit={handleEdit} setInspections={setInspections} />
            )}
        </div>
    );
};

interface TireCheckFormProps {
    vehicles: Vehicle[];
    setInspections: React.Dispatch<React.SetStateAction<TireInspection[]>>;
    inspectionToEdit: TireInspection | null;
    onComplete: () => void;
    onCancel: () => void;
}

const TireCheckForm: React.FC<TireCheckFormProps> = ({ vehicles, setInspections, inspectionToEdit, onComplete, onCancel }) => {
    const { addToast } = useToast();

    const getInitialInspectionState = useCallback((inspection: TireInspection | null): Omit<TireInspection, 'id'> => {
        if (inspection) {
            return {
                licensePlate: inspection.licensePlate,
                trailerLicensePlate: inspection.trailerLicensePlate || '',
                vehicleLayout: inspection.vehicleLayout,
                inspectionDate: inspection.inspectionDate.split('T')[0],
                inspectorName: inspection.inspectorName,
                tires: inspection.tires,
            };
        }
        return {
            licensePlate: '',
            trailerLicensePlate: '',
            vehicleLayout: 'รถ 10 ล้อ',
            inspectionDate: new Date().toISOString().split('T')[0],
            inspectorName: '',
            tires: {},
        };
    }, []);

    const [formData, setFormData] = useState(getInitialInspectionState(inspectionToEdit));
    const [selectedTirePos, setSelectedTirePos] = useState<string | null>(null);
    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);


    useEffect(() => {
        setFormData(getInitialInspectionState(inspectionToEdit));
    }, [inspectionToEdit, getInitialInspectionState]);

    useEffect(() => {
        const layoutPositions = VEHICLE_LAYOUTS[formData.vehicleLayout];
        if (!layoutPositions) return;

        setFormData(prev => {
            const newTires: Record<string, TireData> = {};
            for (const pos of layoutPositions) {
                newTires[pos.id] = prev.tires[pos.id] || {
                    positionId: pos.id,
                    isFilled: false,
                    treadDepth: null,
                    productionDate: '',
                    serialNumber: '',
                    tireType: 'เรเดียล',
                    psi: null,
                    action: 'ปกติ',
                    notes: '',
                    changeDate: '',
                    brand: '',
                    model: '',
                };
            }
            return { ...prev, tires: newTires };
        });
    }, [formData.vehicleLayout]);

    const handleTireDataSave = (data: TireData) => {
        setFormData(prev => ({
            ...prev,
            tires: { ...prev.tires, [data.positionId]: data },
        }));
    };
    
    const handleSaveInspection = () => {
        if (!formData.licensePlate.trim() || !formData.inspectorName.trim()) {
            addToast('กรุณากรอกทะเบียนรถและชื่อผู้ตรวจ', 'warning');
            return;
        }

// FIX: Explicitly type parameter 't' as TireData to resolve 'unknown' type error.
        const filledTires = Object.values(formData.tires).filter((t: TireData) => t.isFilled).length;
        if (filledTires === 0) {
            addToast('กรุณากรอกข้อมูลยางอย่างน้อย 1 เส้น', 'warning');
            return;
        }

        if (inspectionToEdit) {
            setInspections(prev => prev.map(insp => 
                insp.id === inspectionToEdit.id ? { ...formData, id: insp.id, inspectionDate: new Date(formData.inspectionDate).toISOString() } : insp
            ));
            addToast('แก้ไขข้อมูลการตรวจเช็คสำเร็จ', 'success');
        } else {
            const newInspection: TireInspection = {
                ...formData,
                id: `TireInsp-${Date.now()}`,
                inspectionDate: new Date(formData.inspectionDate).toISOString(),
            };
            setInspections(prev => [newInspection, ...prev]);
            addToast('บันทึกการตรวจเช็คสำเร็จ', 'success');
        }
        onComplete();
    };
    
// FIX: Explicitly type parameter 't' as TireData to resolve 'unknown' type error.
    const filledTireCount = useMemo(() => Object.values(formData.tires).filter((t: TireData) => t.isFilled).length, [formData.tires]);
    const totalTires = useMemo(() => Object.keys(formData.tires).length, [formData.tires]);
    const progress = totalTires > 0 ? (filledTireCount / totalTires) * 100 : 0;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center">{inspectionToEdit ? `แก้ไขการตรวจเช็ค: ${inspectionToEdit.licensePlate}` : 'สร้างใบตรวจเช็คยาง'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">ทะเบียนรถ *</label>
                    <input list="license-plates" name="licensePlate" value={formData.licensePlate} onChange={e => setFormData(p => ({...p, licensePlate: e.target.value}))} className="mt-1 w-full p-2 border rounded-lg" required/>
                    <datalist id="license-plates">
                        {safeVehicles.map(v => <option key={v.id} value={v.licensePlate} />)}
                    </datalist>
                </div>
                {formData.vehicleLayout === 'รถพ่วง 22 ล้อ' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ทะเบียนหางพ่วง</label>
                        <input type="text" name="trailerLicensePlate" value={formData.trailerLicensePlate || ''} onChange={e => setFormData(p => ({...p, trailerLicensePlate: e.target.value}))} className="mt-1 w-full p-2 border rounded-lg" />
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-gray-700">รูปแบบรถ *</label>
                    <select name="vehicleLayout" value={formData.vehicleLayout} onChange={e => setFormData(p => ({...p, vehicleLayout: e.target.value as VehicleLayout, tires: {}}))} className="mt-1 w-full p-2 border rounded-lg">
                        {Object.keys(VEHICLE_LAYOUTS).map(layout => <option key={layout} value={layout}>{layout}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">ผู้ตรวจ *</label>
                    <input type="text" name="inspectorName" value={formData.inspectorName} onChange={e => setFormData(p => ({...p, inspectorName: e.target.value}))} className="mt-1 w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">วันที่ตรวจ</label>
                    <input type="date" name="inspectionDate" value={formData.inspectionDate} onChange={e => setFormData(p => ({...p, inspectionDate: e.target.value}))} className="mt-1 w-full p-2 border rounded-lg" />
                </div>
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">ความคืบหน้าการตรวจเช็ค ({filledTireCount}/{totalTires})</label>
                 <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                 </div>
            </div>

            <TruckDiagram layout={formData.vehicleLayout} tires={formData.tires} onSelectTire={setSelectedTirePos} />

            <div className="flex justify-end gap-4 pt-4 border-t">
                 {inspectionToEdit && <button onClick={onCancel} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>}
                 <button onClick={handleSaveInspection} className="px-8 py-2 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    {inspectionToEdit ? 'บันทึกการแก้ไข' : 'บันทึกการตรวจเช็ค'}
                 </button>
            </div>

            {selectedTirePos && (
                <TireDataModal
                    isOpen={!!selectedTirePos}
                    onClose={() => setSelectedTirePos(null)}
                    onSave={handleTireDataSave}
                    tireData={formData.tires[selectedTirePos]}
                    positionLabel={VEHICLE_LAYOUTS[formData.vehicleLayout].find(p => p.id === selectedTirePos)?.label || ''}
                />
            )}
        </div>
    );
};


interface TireCheckHistoryProps {
    inspections: TireInspection[];
    onEdit: (inspection: TireInspection) => void;
    setInspections: React.Dispatch<React.SetStateAction<TireInspection[]>>;
}

const TireCheckHistory: React.FC<TireCheckHistoryProps> = ({ inspections, onEdit, setInspections }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { addToast } = useToast();

    const filteredInspections = useMemo(() => {
        return (Array.isArray(inspections) ? inspections : [])
            .filter(insp => 
                searchTerm === '' || 
                insp.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (insp.trailerLicensePlate && insp.trailerLicensePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
                insp.inspectorName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
    }, [inspections, searchTerm]);

    const handleDelete = (id: string, plate: string) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการตรวจเช็คของทะเบียน ${plate}?`)) {
            setInspections(prev => prev.filter(i => i.id !== id));
            addToast(`ลบการตรวจเช็คของ ${plate} สำเร็จ`, 'info');
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
             <input
                type="text"
                placeholder="ค้นหา (ทะเบียน, ผู้ตรวจ)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-lg"
            />
            <div className="space-y-2">
                {filteredInspections.map(insp => {
                    const isExpanded = expandedId === insp.id;
                    const layoutPositions = VEHICLE_LAYOUTS[insp.vehicleLayout] || [];
// FIX: Explicitly type parameter 't' as TireData to resolve 'unknown' type error.
                    const tireList = Object.values(insp.tires).filter((t: TireData) => t.isFilled);

                    return (
                        <div key={insp.id} className="border rounded-lg">
                            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : insp.id)}>
                                <div>
                                    <p className="font-bold text-lg">{insp.licensePlate} {insp.trailerLicensePlate && ` / ${insp.trailerLicensePlate}`}</p>
                                    <p className="text-sm text-gray-500">{new Date(insp.inspectionDate).toLocaleDateString('th-TH')} - โดย {insp.inspectorName}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <button onClick={(e) => { e.stopPropagation(); if (promptForPassword('แก้ไข')) { onEdit(insp); } }} className="text-yellow-600 hover:text-yellow-800">แก้ไข</button>
                                     <button onClick={(e) => { e.stopPropagation(); handleDelete(insp.id, insp.licensePlate); }} className="text-red-500 hover:text-red-700">ลบ</button>
                                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="p-4 border-t bg-gray-50">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="p-2 text-left">ตำแหน่ง</th>
                                                <th className="p-2 text-right">ดอกยาง (mm)</th>
                                                <th className="p-2 text-right">ลม (PSI)</th>
                                                <th className="p-2 text-left">การดำเนินการ</th>
                                                <th className="p-2 text-left">ยี่ห้อ/รุ่น</th>
                                                <th className="p-2 text-left">วันที่เปลี่ยน</th>
                                                <th className="p-2 text-left">อายุการใช้งาน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* FIX: Explicitly type parameter 'tire' as TireData to resolve multiple property access errors. */}
                                            {tireList.map((tire: TireData) => {
                                                const positionLabel = layoutPositions.find(p => p.id === tire.positionId)?.label || tire.positionId;
                                                return (
                                                <tr key={tire.positionId} className="border-b">
                                                    <td className="p-2 font-medium">{positionLabel}</td>
                                                    <td className="p-2 text-right">{tire.treadDepth}</td>
                                                    <td className="p-2 text-right">{tire.psi}</td>
                                                    <td className="p-2">{tire.action}</td>
                                                    <td className="p-2">{tire.brand} {tire.model}</td>
                                                    <td className="p-2">{tire.changeDate ? new Date(tire.changeDate).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td className="p-2">{calculateTireAge(tire.changeDate)}</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                })}
                 {filteredInspections.length === 0 && (
                    <p className="text-center text-gray-500 py-8">ไม่พบประวัติการตรวจเช็ค</p>
                )}
            </div>
        </div>
    );
}

export default TireCheckPage;