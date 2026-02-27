import React, { useState } from 'react';
import type { Driver, DrivingIncident, Vehicle } from '../types';
import PhotoUpload from './PhotoUpload';
import { confirmAction } from '../utils';

interface AddIncidentModalProps {
    driver?: Driver; // Pre-selected driver if applicable
    drivers: Driver[];
    vehicles: Vehicle[];
    onClose: () => void;
    onSave: (incident: Omit<DrivingIncident, 'id' | 'createdAt' | 'createdBy'>) => void;
}

const AddIncidentModal: React.FC<AddIncidentModalProps> = ({ driver: initialDriver, drivers, vehicles, onClose, onSave }) => {
    const [selectedDriverId, setSelectedDriverId] = useState(initialDriver?.id || '');
    const [driverSearchQuery, setDriverSearchQuery] = useState(initialDriver?.name || '');
    const [isDriverSuggestionsOpen, setIsDriverSuggestionsOpen] = useState(false);
    const [driverSuggestions, setDriverSuggestions] = useState<Driver[]>([]);
    const driverSuggestionsRef = React.useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        vehicleId: initialDriver?.primaryVehicle ? vehicles.find(v => v.licensePlate === initialDriver.primaryVehicle)?.id || '' : '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        location: '',
        type: 'ฝ่าฝืนกฎจราจร' as DrivingIncident['type'],
        severity: 'medium' as DrivingIncident['severity'],
        pointsDeducted: 15,
        description: '',
        fineAmount: 0,
        actionsTaken: '',
        damageToVehicle: 0,
        damageToProperty: 0,
        injuries: '',
        photos: [] as string[]
    });
    const [customType, setCustomType] = useState('');

    const severityConfig = {
        low: { label: 'ต่ำ', points: 5, color: 'text-blue-600', bg: 'bg-blue-50' },
        medium: { label: 'ปานกลาง', points: 15, color: 'text-amber-600', bg: 'bg-amber-50' },
        high: { label: 'สูง', points: 30, color: 'text-orange-600', bg: 'bg-orange-50' },
        critical: { label: 'ร้ายแรง', points: 50, color: 'text-red-600', bg: 'bg-red-50' }
    };

    const handleSeverityChange = (severity: DrivingIncident['severity']) => {
        setFormData(prev => ({
            ...prev,
            severity,
            pointsDeducted: severityConfig[severity].points
        }));
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (driverSuggestionsRef.current && !driverSuggestionsRef.current.contains(event.target as Node)) {
                setIsDriverSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDriverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDriverSearchQuery(value);

        if (value) {
            const filteredDrivers = drivers.filter(d =>
                d.name.toLowerCase().includes(value.toLowerCase()) ||
                d.employeeId.toLowerCase().includes(value.toLowerCase())
            );
            setDriverSuggestions(filteredDrivers);
            setIsDriverSuggestionsOpen(true);
        } else {
            setDriverSuggestions(drivers);
            setIsDriverSuggestionsOpen(true);
        }

        if (!value) {
            setSelectedDriverId('');
        }
    };

    const handleDriverSuggestionClick = (driver: Driver) => {
        setSelectedDriverId(driver.id);
        setDriverSearchQuery(driver.name);
        setIsDriverSuggestionsOpen(false);

        if (driver.primaryVehicle) {
            const v = vehicles.find(v => v.licensePlate === driver.primaryVehicle);
            if (v) setFormData(prev => ({ ...prev, vehicleId: v.id }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriverId) return;

        const driverName = drivers.find(d => d.id === selectedDriverId)?.name || '';
        const ok = await confirmAction(
            'ยืนยันการบันทึกเหตุการณ์',
            `บันทึกเหตุการณ์ “${formData.type}” ของ ${driverName} วันที่ ${formData.date} ใช่หรือไม่?`,
            'บันทึก'
        );
        if (!ok) return;

        const safePhotos = Array.isArray(formData.photos) ? formData.photos : [];

        let finalDescription = formData.description;
        if (formData.type === 'อื่นๆ' && customType.trim()) {
            finalDescription = `[ประเภท: ${customType}] ${finalDescription}`;
        }

        onSave({
            driverId: selectedDriverId,
            ...formData,
            description: finalDescription,
            photos: safePhotos,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-3 rounded-2xl shadow-inner">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">บันทึกเหตุการณ์ความปลอดภัย</h3>
                            <p className="text-slate-500 font-medium">ระบุรายละเอียดการฝ่าฝืนหรืออุบัติเหตุ</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-600 hover:rotate-90" title="ปิดหน้าต่าง">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form id="add-incident-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Section: Who & When */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-red-600">
                            <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                            <h4 className="font-bold uppercase tracking-wider text-sm">ข้อมูลพื้นฐานและเวลา</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div ref={driverSuggestionsRef} className="md:col-span-2 relative">
                                <label className="block text-sm font-bold text-slate-700 mb-2">พนักงานขับรถ *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={driverSearchQuery}
                                        onChange={handleDriverInputChange}
                                        onFocus={() => {
                                            setDriverSuggestions(drivers.filter(d =>
                                                d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                                                d.employeeId.toLowerCase().includes(driverSearchQuery.toLowerCase())
                                            ));
                                            setIsDriverSuggestionsOpen(true);
                                        }}
                                        disabled={!!initialDriver}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-medium"
                                        placeholder="พิมพ์ชื่อหรือรหัสพนักงานเพื่อค้นหา..."
                                        autoComplete="off"
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                {isDriverSuggestionsOpen && !initialDriver && (
                                    <ul className="absolute z-[100] w-full bg-white border border-slate-200 rounded-2xl mt-2 max-h-60 overflow-y-auto shadow-xl animate-scale-in">
                                        {driverSuggestions.length > 0 ? (
                                            driverSuggestions.map(d => (
                                                <li
                                                    key={d.id}
                                                    onClick={() => handleDriverSuggestionClick(d)}
                                                    className="px-5 py-3 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-50 transition-colors"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800">{d.name}</p>
                                                        <p className="text-xs text-slate-500">{d.employeeId}</p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{d.status}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-5 py-4 text-center text-slate-400 text-sm font-medium">ไม่พบข้อมูลพนักงานขับรถ</li>
                                        )}
                                    </ul>
                                )}
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">วันที่เกิดเหตุ *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        title="วันที่เกิดเหตุ"
                                        placeholder="วว/ดด/ปปปป"
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">เวลาเกิดเหตุ</label>
                                <input
                                    type="time"
                                    title="เวลาที่เกิดเหตุ"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Incident Details */}
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-orange-600">
                            <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div>
                            <h4 className="font-bold uppercase tracking-wider text-sm">รายละเอียดเหตุการณ์</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทเหตุการณ์ *</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    title="เลือกประเภทเหตุการณ์"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-medium"
                                >
                                    <option value="ฝ่าฝืนกฎจราจร">🚧 ฝ่าฝืนกฎจราจร</option>
                                    <option value="อุบัติเหตุ">💥 อุบัติเหตุ</option>
                                    <option value="การขับขี่เสี่ยง">⚠️ การขับขี่เสี่ยง</option>
                                    <option value="อื่นๆ">📝 อื่นๆ</option>
                                </select>
                                {formData.type === 'อื่นๆ' && (
                                    <input
                                        type="text"
                                        placeholder="ระบุประเภทเหตุการณ์..."
                                        value={customType}
                                        onChange={(e) => setCustomType(e.target.value)}
                                        className="mt-3 w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium border-dashed"
                                        autoFocus
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ระดับความรุนแรง *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(severityConfig) as Array<keyof typeof severityConfig>).map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleSeverityChange(key)}
                                            className={`py-3 px-2 rounded-xl text-xs font-black transition-all border-2 ${formData.severity === key
                                                ? `${severityConfig[key].bg} border-slate-800 ${severityConfig[key].color} shadow-md`
                                                : 'bg-slate-50 border-transparent text-slate-400 grayscale hover:grayscale-0 hover:bg-white hover:border-slate-200'
                                                }`}
                                        >
                                            {severityConfig[key].label}
                                            <div className="text-[10px] opacity-70 mt-0.5">-{severityConfig[key].points} แต้ม</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">ยานพาหนะ</label>
                                <select
                                    title="ยานพาหนะ"
                                    value={formData.vehicleId}
                                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/10 outline-none transition-all font-medium"
                                >
                                    <option value="">-- ไม่ระบุ / ไม่เกี่ยวข้อง --</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.licensePlate} - {v.vehicleType} ({v.make})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">สถานที่เกิดเหตุ</label>
                                <input
                                    type="text"
                                    title="สถานที่เกิดเหตุ"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="เช่น ถนนพระราม 2, คลังสินค้า A"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/10 outline-none transition-all font-medium"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">รายละเอียดเหตุการณ์ *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={4}
                                    placeholder="อธิบายสิ่งที่เกิดขึ้นโดยละเอียด..."
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/10 outline-none transition-all font-medium resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Consequences & Action */}
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                            <h4 className="font-bold uppercase tracking-wider text-sm">ผลกระทบและการดำเนินการ</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ค่าปรับ (บาท)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</div>
                                    <input
                                        type="number"
                                        title="จำนวนเงินค่าปรับ"
                                        value={formData.fineAmount}
                                        onChange={(e) => setFormData({ ...formData, fineAmount: Number(e.target.value) })}
                                        min="0"
                                        className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">คะแนนที่หักจริง</label>
                                <input
                                    type="number"
                                    title="จำนวนคะแนนที่หัก"
                                    value={formData.pointsDeducted}
                                    onChange={(e) => setFormData({ ...formData, pointsDeducted: Number(e.target.value) })}
                                    className="w-full px-5 py-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl outline-none font-black text-xl text-center"
                                    placeholder="0"
                                />
                                <p className="text-[10px] text-red-500 mt-1 text-center font-bold">ค่าเริ่มต้นจากระดับความรุนแรง</p>
                            </div>

                            <div className="md:col-span-1 lg:col-span-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">การลงโทษ</label>
                                <input
                                    type="text"
                                    title="การดำเนินการลงโทษ"
                                    value={formData.actionsTaken}
                                    onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                                    placeholder="ตักเตือน, พักงาน"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ความเสียหายรถ (บาท)</label>
                                <input
                                    type="number"
                                    title="ความเสียหายต่อตัวรถ"
                                    value={formData.damageToVehicle}
                                    onChange={(e) => setFormData({ ...formData, damageToVehicle: Number(e.target.value) })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ความเสียหายทรัพย์สิน</label>
                                <input
                                    type="number"
                                    title="ความเสียหายต่อทรัพย์สิน"
                                    value={formData.damageToProperty}
                                    onChange={(e) => setFormData({ ...formData, damageToProperty: Number(e.target.value) })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ผู้บาดเจ็บ</label>
                                <input
                                    type="text"
                                    title="รายละเอียดผู้บาดเจ็บ"
                                    value={formData.injuries}
                                    onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                                    placeholder="ถ้ามี"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Evidence Section */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-slate-600">
                            <div className="w-1.5 h-6 bg-slate-600 rounded-full"></div>
                            <h4 className="font-bold uppercase tracking-wider text-sm">หลักฐานและรูปภาพ</h4>
                        </div>
                        <PhotoUpload
                            photos={formData.photos}
                            onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                            entity="incident"
                            entityId="new"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="add-incident-form"
                        disabled={!selectedDriverId}
                        className="px-12 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-2xl hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-200 hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                    >
                        บันทึกเหตุการณ์
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddIncidentModal;
