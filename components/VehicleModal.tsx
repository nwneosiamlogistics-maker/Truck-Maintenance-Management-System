import React, { useState, useEffect } from 'react';
import type { Vehicle } from '../types';
import { useToast } from '../context/ToastContext';

interface VehicleModalProps {
    vehicle: Vehicle | null;
    onSave: (vehicle: Vehicle) => void;
    onClose: () => void;
    existingVehicles: Vehicle[];
}

const VehicleModal: React.FC<VehicleModalProps> = ({ vehicle, onSave, onClose, existingVehicles }) => {
    const getInitialState = (): Omit<Vehicle, 'id'> => {
        return vehicle || {
            licensePlate: '',
            vehicleType: '',
            make: '',
            model: '',
            registrationDate: null,
            insuranceCompany: null,
            insuranceExpiryDate: null,
            insuranceType: null,
            actCompany: null,
            actExpiryDate: null,

            cargoInsuranceCompany: null,
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(getInitialState());
    }, [vehicle]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.licensePlate.trim()) {
            addToast('กรุณากรอกทะเบียนรถ', 'warning');
            return;
        }

        // Check for duplicate license plate only when adding a new vehicle
        if (!vehicle) {
            const isDuplicate = existingVehicles.some(
                v => v.licensePlate.trim().toLowerCase() === formData.licensePlate.trim().toLowerCase()
            );
            if (isDuplicate) {
                addToast('ทะเบียนรถนี้มีอยู่ในระบบแล้ว', 'error');
                return;
            }
        }
        
        onSave({ ...formData, id: vehicle?.id || '' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{vehicle ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลรถและประกันภัย</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="vehicle-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ข้อมูลรถ</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">ทะเบียนรถ *</label>
                                <input type="text" name="licensePlate" value={formData.licensePlate || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">ประเภทรถ</label>
                                <input type="text" name="vehicleType" value={formData.vehicleType || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ยี่ห้อ</label>
                                <input type="text" name="make" value={formData.make || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">รุ่น</label>
                                <input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">วันจดทะเบียนรถ</label>
                                <input type="date" name="registrationDate" value={formData.registrationDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                        </div>
                    </div>
                     <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ประกันภัย</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium">บริษัทประกันภัย</label>
                                <input type="text" name="insuranceCompany" value={formData.insuranceCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">ประเภทประกัน</label>
                                <input type="text" name="insuranceType" value={formData.insuranceType || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">วันที่หมดอายุ</label>
                                <input type="date" name="insuranceExpiryDate" value={formData.insuranceExpiryDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                         </div>
                    </div>
                     <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">พ.ร.บ.</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium">บริษัท พ.ร.บ.</label>
                                <input type="text" name="actCompany" value={formData.actCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">วันที่หมดอายุ</label>
                                <input type="date" name="actExpiryDate" value={formData.actExpiryDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                         </div>
                    </div>
                     <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ประกันสินค้า</h4>
                         <div className="grid grid-cols-1">
                             <div>
                                <label className="block text-sm font-medium">บริษัทประกันสินค้า</label>
                                <input type="text" name="cargoInsuranceCompany" value={formData.cargoInsuranceCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                         </div>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" form="vehicle-form" className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </div>
    );
};

export default VehicleModal;
