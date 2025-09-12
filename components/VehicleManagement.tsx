// FIX: Implemented the VehicleManagement component which was previously a placeholder.
import React, { useState, useMemo } from 'react';
import type { Vehicle } from '../types';
import VehicleModal from './VehicleModal';
import { useToast } from '../context/ToastContext';

interface VehicleManagementProps {
    vehicles: Vehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicles, setVehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);

    const vehicleTypes = useMemo(() => {
        const types = new Set(safeVehicles.map(v => v.vehicleType).filter(Boolean));
        return ['all', ...Array.from(types)];
    }, [safeVehicles]);

    const filteredVehicles = useMemo(() => {
        return safeVehicles
            .filter(v => filterType === 'all' || v.vehicleType === filterType)
            .filter(v => searchTerm === '' ||
                v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.make && v.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (v.model && v.model.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }, [safeVehicles, searchTerm, filterType]);

    const handleOpenModal = (vehicle: Vehicle | null = null) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSaveVehicle = (vehicleData: Vehicle) => {
        if (vehicleData.id) { // Editing
            setVehicles(prev => prev.map(v => v.id === vehicleData.id ? vehicleData : v));
            addToast(`อัปเดตข้อมูลรถ ${vehicleData.licensePlate} สำเร็จ`, 'success');
        } else { // Adding new
            const newVehicle = { ...vehicleData, id: `VEH-${Date.now()}` };
            setVehicles(prev => [newVehicle, ...prev]);
            addToast(`เพิ่มรถ ${newVehicle.licensePlate} สำเร็จ`, 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteVehicle = (vehicleId: string, licensePlate: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรถทะเบียน ${licensePlate}?`)) {
            setVehicles(prev => prev.filter(v => v.id !== vehicleId));
            addToast(`ลบรถทะเบียน ${licensePlate} สำเร็จ`, 'info');
        }
    };
    
    const calculateVehicleAge = (registrationDate: string | null): string => {
        if (!registrationDate) {
            return '-';
        }
    
        try {
            const regDate = new Date(registrationDate);
            if (isNaN(regDate.getTime())) {
                return '-';
            }
            
            const today = new Date();
            
            let years = today.getFullYear() - regDate.getFullYear();
            let months = today.getMonth() - regDate.getMonth();
            
            if (months < 0 || (months === 0 && today.getDate() < regDate.getDate())) {
                years--;
                months += 12;
            }
    
            if (years < 0) return '-'; // Registration date is in the future
            if (years === 0 && months === 0) return "น้อยกว่า 1 เดือน";
            
            let result = '';
            if (years > 0) {
                result += `${years} ปี `;
            }
            if (months > 0) {
                result += `${months} เดือน`;
            }
            
            return result.trim() || '-';
        } catch (e) {
            return '-';
        }
    };

    const getExpiryDisplay = (dateString: string | null, type: 'insurance' | 'act') => {
        if (!dateString || dateString === 'N/A') return { date: 'ไม่มีข้อมูล', statusText: '', color: 'text-gray-500' };
        
        const expiryDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(expiryDate.getTime())) return { date: 'ข้อมูลผิดพลาด', statusText: '', color: 'text-gray-500' };

        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const formattedDate = expiryDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const warningDays = type === 'act' ? 90 : 30;

        if (diffDays < 0) {
            return { date: formattedDate, statusText: `(หมดอายุ)`, color: 'text-red-600 font-bold' };
        }
        if (diffDays <= warningDays) {
            return { date: formattedDate, statusText: `(อีก ${diffDays} วัน)`, color: 'text-yellow-600 font-semibold' };
        }
        return { date: formattedDate, statusText: '', color: 'text-green-600' };
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="ค้นหา (ทะเบียน, ยี่ห้อ, รุ่น)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-72 p-2 border border-gray-300 rounded-lg text-base"
                    />
                     <select value={filterType} onChange={e => setFilterType(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-base">
                        {vehicleTypes.map(type => (
                            <option key={type} value={type}>{type === 'all' ? 'ทุกประเภท' : type}</option>
                        ))}
                    </select>
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + เพิ่มข้อมูลรถใหม่
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ข้อมูลรถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประกันภัยหลัก</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">พ.ร.บ. / อื่นๆ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVehicles.map(vehicle => {
                            const insuranceStatus = getExpiryDisplay(vehicle.insuranceExpiryDate, 'insurance');
                            const actStatus = getExpiryDisplay(vehicle.actExpiryDate, 'act');
                            const vehicleAge = calculateVehicleAge(vehicle.registrationDate);

                            return (
                                <tr key={vehicle.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-semibold text-base align-top">{vehicle.licensePlate}</td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="text-base font-medium">{vehicle.vehicleType || '-'}</div>
                                        <div className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</div>
                                        <div className="text-sm text-gray-500">อายุ: {vehicleAge}</div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="text-base font-semibold">{vehicle.insuranceCompany || '-'}</div>
                                        <div className="text-sm text-gray-600">ประเภท: {vehicle.insuranceType || '-'}</div>
                                        <div className={`text-sm ${insuranceStatus.color}`}>
                                            หมดอายุ: {insuranceStatus.date} {insuranceStatus.statusText}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                         <div className="text-base font-semibold">พ.ร.บ.: {vehicle.actCompany || '-'}</div>
                                         <div className={`text-sm ${actStatus.color}`}>
                                            หมดอายุ: {actStatus.date} {actStatus.statusText}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">ประกันสินค้า: {vehicle.cargoInsuranceCompany || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center align-top whitespace-nowrap space-x-2">
                                        <button onClick={() => handleOpenModal(vehicle)} className="text-yellow-600 hover:text-yellow-800 font-medium">แก้ไข</button>
                                        <button onClick={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)} className="text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredVehicles.length === 0 && ( <tr><td colSpan={5} className="text-center py-10 text-gray-500">ไม่พบข้อมูลรถ</td></tr> )}
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