import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

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

interface VehicleManagementProps {
    vehicles: Vehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicles, setVehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);

    const filteredVehicles = useMemo(() => {
        return safeVehicles
            .filter(v =>
                searchTerm === '' ||
                v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.make.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }, [safeVehicles, searchTerm]);

    const handleOpenModal = (vehicle: Vehicle | null = null) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSaveVehicle = (vehicleData: Vehicle) => {
        if (vehicleData.id) { // Editing
            setVehicles(prev => prev.map(v => v.id === vehicleData.id ? vehicleData : v));
            addToast(`อัปเดตข้อมูลรถทะเบียน ${vehicleData.licensePlate} สำเร็จ`, 'success');
        } else { // Adding
            const newVehicle = { ...vehicleData, id: `VEH-${Date.now()}` };
            setVehicles(prev => [newVehicle, ...prev]);
            addToast(`เพิ่มรถทะเบียน ${newVehicle.licensePlate} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };
    
    const handleDeleteVehicle = (vehicle: Vehicle) => {
        if (promptForPassword('ลบ') && window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรถทะเบียน ${vehicle.licensePlate}?`)) {
            setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
            addToast(`ลบข้อมูลรถทะเบียน ${vehicle.licensePlate} สำเร็จ`, 'info');
        }
    };
    
    const getExpiryStatus = (dateString: string | null) => {
        if (!dateString) return { text: 'ไม่มีข้อมูล', className: 'text-gray-500' };
        const expiryDate = new Date(dateString);
        const today = new Date();
        const daysDiff = (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 0) return { text: 'หมดอายุ', className: 'text-red-600 font-bold' };
        if (daysDiff <= 30) return { text: 'ใกล้หมดอายุ', className: 'text-yellow-600 font-bold' };
        return { text: 'ปกติ', className: 'text-green-600' };
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหา (ทะเบียน, ประเภท, ยี่ห้อ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                    + เพิ่มข้อมูลรถ
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภท / ยี่ห้อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประกันภัย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">พรบ.</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVehicles.map(vehicle => {
                            const insuranceStatus = getExpiryStatus(vehicle.insuranceExpiryDate);
                            const actStatus = getExpiryStatus(vehicle.actExpiryDate);
                            return (
                                <tr key={vehicle.id}>
                                    <td className="px-4 py-3 font-semibold">{vehicle.licensePlate}</td>
                                    <td className="px-4 py-3"><div>{vehicle.vehicleType}</div><div className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</div></td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{vehicle.insuranceCompany || '-'}</div>
                                        <div className={insuranceStatus.className}>{vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toLocaleDateString('th-TH') : '-'} ({insuranceStatus.text})</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{vehicle.actCompany || '-'}</div>
                                        <div className={actStatus.className}>{vehicle.actExpiryDate ? new Date(vehicle.actExpiryDate).toLocaleDateString('th-TH') : '-'} ({actStatus.text})</div>
                                    </td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <button onClick={() => handleOpenModal(vehicle)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                        <button onClick={() => handleDeleteVehicle(vehicle)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <VehicleModal 
                    vehicle={editingVehicle}
                    onSave={handleSaveVehicle}
                    onClose={() => setIsModalOpen(false)}
                    existingVehicles={safeVehicles}
                />
            )}
        </div>
    );
};

export default VehicleManagement;