import React, { useState } from 'react';
import type { FuelRecord, FuelType, Vehicle } from '../types';

interface AddFuelRecordModalProps {
    onClose: () => void;
    onSave: (record: Omit<FuelRecord, 'id' | 'createdAt' | 'createdBy'>) => void;
    vehicles: Vehicle[];
}

const FUEL_TYPES: FuelType[] = ['ดีเซล', 'เบนซิน 91', 'เบนซิน 95', 'แก๊สโซฮอล์ E20', 'แก๊สโซฮอล์ E85', 'NGV'];
const PAYMENT_METHODS = ['เงินสด', 'บัตรเครดิต', 'บัตรน้ำมัน', 'โอน'] as const;

const AddFuelRecordModal: React.FC<AddFuelRecordModalProps> = ({ onClose, onSave, vehicles }) => {
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverName: '',
        date: new Date().toISOString().split('T')[0],
        station: '',
        stationLocation: '',
        fuelType: 'ดีเซล' as FuelType,
        liters: 0,
        pricePerLiter: 0,
        odometerBefore: 0,
        odometerAfter: 0,
        receiptImage: '',
        fuelCardNumber: '',
        paymentMethod: 'เงินสด' as typeof PAYMENT_METHODS[number],
        notes: ''
    });

    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
    const distanceTraveled = formData.odometerAfter - formData.odometerBefore;
    const totalCost = formData.liters * formData.pricePerLiter;
    const fuelEfficiency = distanceTraveled > 0 && formData.liters > 0
        ? distanceTraveled / formData.liters
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vehicleId || !selectedVehicle) {
            alert('กรุณาเลือกรถ');
            return;
        }

        if (formData.odometerAfter > 0 && formData.odometerBefore > 0 && formData.odometerAfter <= formData.odometerBefore) {
            alert('เลขไมล์หลังเติมต้องมากกว่าเลขไมล์ก่อนเติม');
            return;
        }

        const record: Omit<FuelRecord, 'id' | 'createdAt' | 'createdBy'> = {
            ...formData,
            licensePlate: selectedVehicle.licensePlate,
            totalCost,
            distanceTraveled,
            fuelEfficiency
        };

        onSave(record);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['liters', 'pricePerLiter', 'odometerBefore', 'odometerAfter'].includes(name)
                ? Number(value)
                : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">บันทึกการเติมน้ำมัน</h3>
                            <p className="text-sm text-slate-500 mt-1">กรอกข้อมูลการเติมน้ำมันให้ครบถ้วน</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form id="add-fuel-form" onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vehicle Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลือกรถ *</label>
                            <select
                                name="vehicleId"
                                value={formData.vehicleId}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            >
                                <option value="">-- เลือกรถ --</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.licensePlate} ({v.make} {v.model})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Driver Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อคนขับ *</label>
                            <input
                                type="text"
                                name="driverName"
                                value={formData.driverName}
                                onChange={handleInputChange}
                                required
                                placeholder="ระบุชื่อคนขับ"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่เติม *</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Station */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ปั๊มน้ำมัน *</label>
                            <input
                                type="text"
                                name="station"
                                value={formData.station}
                                onChange={handleInputChange}
                                required
                                placeholder="เช่น PTT, Shell, Bangchak"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Station Location */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">สถานที่</label>
                            <input
                                type="text"
                                name="stationLocation"
                                value={formData.stationLocation}
                                onChange={handleInputChange}
                                placeholder="เช่น กม.100 ทางหลวง 1"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Fuel Type */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทน้ำมัน *</label>
                            <select
                                name="fuelType"
                                value={formData.fuelType}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            >
                                {FUEL_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วิธีชำระเงิน *</label>
                            <select
                                name="paymentMethod"
                                value={formData.paymentMethod}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            >
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>

                        {/* Liters */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนลิตร *</label>
                            <input
                                type="number"
                                name="liters"
                                value={formData.liters}
                                onChange={(e) => {
                                    handleInputChange(e);
                                    // if price per liter is set, update total Amount
                                    if (formData.pricePerLiter > 0) {
                                        // We don't have totalAmount in state yet, but we will add logic there soon.
                                        // Actually let's just use the handleInputChange logic we will add below.
                                    }
                                }}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Price Per Liter */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ราคาต่อลิตร (บาท) *</label>
                            <input
                                type="number"
                                name="pricePerLiter"
                                value={formData.pricePerLiter}
                                onChange={handleInputChange}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Total Price (Auto Calculate) */}
                        <div className="md:col-span-2">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                <label className="text-sm font-bold text-blue-800">ราคารวม (บาท):</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={(formData.liters * formData.pricePerLiter) || ''}
                                        onChange={(e) => {
                                            const total = parseFloat(e.target.value);
                                            if (!isNaN(total) && formData.pricePerLiter > 0) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    liters: parseFloat((total / prev.pricePerLiter).toFixed(2))
                                                }));
                                            }
                                        }}
                                        placeholder="ระบุยอดเงินรวม"
                                        className="w-48 px-4 py-2 bg-white border border-blue-200 rounded-lg text-right font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <span className="text-sm text-blue-600 font-medium">บาท (คำนวณลิตรให้อัตโนมัติ)</span>
                                </div>
                            </div>
                        </div>

                        {/* Odometer Before */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลขไมล์ก่อนเติม (กม.)</label>
                            <input
                                type="number"
                                name="odometerBefore"
                                value={formData.odometerBefore}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Odometer After */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">เลขไมล์หลังเติม (กม.)</label>
                            <input
                                type="number"
                                name="odometerAfter"
                                value={formData.odometerAfter}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Summary Card */}
                        {distanceTraveled > 0 && formData.liters > 0 && (
                            <div className="md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">สรุปข้อมูล</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-slate-800">{distanceTraveled}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-bold">กม.วิ่ง</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-emerald-600">{fuelEfficiency.toFixed(2)}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-bold">กม./ลิตร</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-amber-600">{totalCost.toFixed(2)}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-bold">บาท</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fuel Card Number */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเลขบัตรน้ำมัน (ถ้ามี)</label>
                            <input
                                type="text"
                                name="fuelCardNumber"
                                value={formData.fuelCardNumber}
                                onChange={handleInputChange}
                                placeholder="ระบุหมายเลขบัตร"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={2}
                                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none resize-none"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="add-fuel-form"
                        className="px-8 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        บันทึกการเติมน้ำมัน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddFuelRecordModal;
