
import React, { useState, useMemo } from 'react';
import type { Vehicle } from '../types';
import VehicleModal from './VehicleModal';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

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
