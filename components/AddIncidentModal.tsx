import React, { useState } from 'react';
import type { Driver, DrivingIncident, Vehicle } from '../types';

interface AddIncidentModalProps {
    driver?: Driver; // Pre-selected driver if applicable
    drivers: Driver[];
    vehicles: Vehicle[];
    onClose: () => void;
    onSave: (incident: Omit<DrivingIncident, 'id' | 'createdAt' | 'createdBy'>) => void;
}

const AddIncidentModal: React.FC<AddIncidentModalProps> = ({ driver: initialDriver, drivers, vehicles, onClose, onSave }) => {
    const [selectedDriverId, setSelectedDriverId] = useState(initialDriver?.id || '');
    const [formData, setFormData] = useState({
        vehicleId: initialDriver?.primaryVehicle ? vehicles.find(v => v.licensePlate === initialDriver.primaryVehicle)?.id || '' : '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        location: '',
        type: 'ฝ่าฝืนกฎจราจร' as DrivingIncident['type'],
        severity: 'medium' as DrivingIncident['severity'],
        description: '',
        fineAmount: 0,
        actionsTaken: ''
    });
    const [customType, setCustomType] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriverId) return;

        let finalDescription = formData.description;
        if (formData.type === 'อื่นๆ' && customType.trim()) {
            finalDescription = `[ประเภท: ${customType}] ${finalDescription}`;
        }

        onSave({
            driverId: selectedDriverId,
            ...formData,
            description: finalDescription,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-red-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">บันทึกอุบัติเหตุ / การฝ่าฝืน</h3>
                        <p className="text-sm text-slate-500">บันทึกข้อมูลเพื่อประเมินความปลอดภัย</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600" title="ปิดหน้าต่าง">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Driver Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">พนักงานขับรถ *</label>
                            <select
                                value={selectedDriverId}
                                onChange={(e) => {
                                    setSelectedDriverId(e.target.value);
                                    // Auto-select primary vehicle if available
                                    const drv = drivers.find(d => d.id === e.target.value);
                                    if (drv?.primaryVehicle) {
                                        const v = vehicles.find(v => v.licensePlate === drv.primaryVehicle);
                                        if (v) setFormData(prev => ({ ...prev, vehicleId: v.id }));
                                    }
                                }}
                                required
                                title="เลือกพนักงานขับรถ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                disabled={!!initialDriver}
                            >
                                <option value="">เลือกพนักงานขับรถ...</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
                                ))}
                            </select>
                        </div>

                        {/* Incident Details */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทเหตุการณ์ *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                title="เลือกประเภทเหตุการณ์"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            >
                                <option value="ฝ่าฝืนกฎจราจร">ฝ่าฝืนกฎจราจร</option>
                                <option value="อุบัติเหตุ">อุบัติเหตุ</option>
                                <option value="การขับขี่เสี่ยง">การขับขี่เสี่ยง</option>
                                <option value="อื่นๆ">อื่นๆ</option>
                            </select>
                            {formData.type === 'อื่นๆ' && (
                                <input
                                    type="text"
                                    placeholder="ระบุประเภทเหตุการณ์..."
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value)}
                                    className="mt-3 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    title="ระบุประเภทเหตุการณ์เพิ่มเติม"
                                    autoFocus
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ระดับความรุนแรง *</label>
                            <select
                                value={formData.severity}
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                                title="เลือกระดับความรุนแรง"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            >
                                <option value="low">ต่ำ (ตัด 5 คะแนน)</option>
                                <option value="medium">ปานกลาง (ตัด 15 คะแนน)</option>
                                <option value="high">สูง (ตัด 30 คะแนน)</option>
                                <option value="critical">ร้ายแรง (ตัด 50 คะแนน)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                title="วันที่เกิดเหตุ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เวลา</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                title="เวลาที่เกิดเหตุ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ยานพาหนะ</label>
                            <select
                                value={formData.vehicleId}
                                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                title="เลือกยานพาหนะ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            >
                                <option value="">ไม่ระบุ / ไม่เกี่ยวข้อง</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.licensePlate} - {v.vehicleType}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">สถานที่เกิดเหตุ</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="ระบุสถานที่..."
                                title="สถานที่เกิดเหตุ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">รายละเอียดเหตุการณ์</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                rows={3}
                                placeholder="อธิบายสิ่งที่เกิดขึ้น..."
                                title="รายละเอียดเหตุการณ์"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ค่าปรับ (บาท)</label>
                            <input
                                type="number"
                                value={formData.fineAmount}
                                onChange={(e) => setFormData({ ...formData, fineAmount: Number(e.target.value) })}
                                min="0"
                                title="จำนวนเงินค่าปรับ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">การดำเนินการลงโทษ</label>
                            <input
                                type="text"
                                value={formData.actionsTaken}
                                onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                                placeholder="เช่น ตักเตือน, พักงาน"
                                title="การดำเนินการลงโทษ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                        >
                            บันทึกข้อมูล
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddIncidentModal;
