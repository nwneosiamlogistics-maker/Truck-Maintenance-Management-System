import React, { useState, useMemo } from 'react';
import type { Vehicle } from '../types';

interface AddVehicleToPMModalProps {
    vehicles: Vehicle[];
    existingPlatesForYear: Set<string>;
    onClose: () => void;
    onSave: (licensePlate: string) => void;
}

export const AddVehicleToPMModal: React.FC<AddVehicleToPMModalProps> = ({ vehicles, existingPlatesForYear, onClose, onSave }) => {
    const [selectedPlate, setSelectedPlate] = useState('');

    const availableVehicles = useMemo(() => {
        return vehicles
            .filter(v => !existingPlatesForYear.has(v.licensePlate))
            .sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }, [vehicles, existingPlatesForYear]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlate) {
            onSave(selectedPlate);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-2xl font-bold text-gray-800">เพิ่มรถเข้าแผน PM ประจำปี</h3>
                    </div>
                    <div className="p-6">
                        <label htmlFor="vehicle-select" className="block text-base font-medium text-gray-700 mb-2">
                            เลือกรถที่ต้องการเพิ่ม
                        </label>
                        <select
                            id="vehicle-select"
                            value={selectedPlate}
                            onChange={(e) => setSelectedPlate(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg"
                        >
                            <option value="" disabled>-- กรุณาเลือกทะเบียนรถ --</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.licensePlate}>
                                    {v.licensePlate} ({v.vehicleType})
                                </option>
                            ))}
                        </select>
                         {availableVehicles.length === 0 && (
                            <p className="text-sm text-gray-500 mt-2">รถทุกคันถูกเพิ่มในแผนของปีนี้แล้ว</p>
                        )}
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                            ยกเลิก
                        </button>
                        <button type="submit" disabled={!selectedPlate} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                            เพิ่ม
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
