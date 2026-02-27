import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle, Repair } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPasswordAsync, confirmAction } from '../utils';
import { Download } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';
import PhotoUpload from './PhotoUpload';

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
            chassisNumber: null,
            engineNumber: null,
            registrationDate: null,
            taxExpiryDate: null,
            province: null,
            fuelType: null,
            yearOfManufacture: null,
            insuranceCompany: null,
            insuranceExpiryDate: null,
            insuranceType: null,
            actCompany: null,
            actExpiryDate: null,
            cargoInsuranceCompany: null,
            status: 'Active',
            photos: [],
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(getInitialState());
    }, [vehicle]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

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

        setIsSubmitting(true);
        try {
            const safePhotos = Array.isArray(formData.photos) ? formData.photos : [];
            await onSave({ ...formData, photos: safePhotos, id: vehicle?.id || '' });
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        } finally {
            // Keep button disabled for 2s to prevent multiple quick clicks after return
            setTimeout(() => setIsSubmitting(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">{vehicle ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลรถและประกันภัย</h3>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="vehicle-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ข้อมูลรถ</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">ทะเบียนรถ *</label>
                                <input type="text" name="licensePlate" placeholder="ระบุทะเบียนรถ" aria-label="License Plate" value={formData.licensePlate || ''} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">ประเภทรถ</label>
                                <input type="text" name="vehicleType" placeholder="เช่น รถบรรทุก 10 ล้อ" aria-label="Vehicle Type" value={formData.vehicleType || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ยี่ห้อ</label>
                                <input type="text" name="make" placeholder="เช่น Hino, Isuzu" aria-label="Make" value={formData.make || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">รุ่น</label>
                                <input type="text" name="model" placeholder="ระบุรุ่น" aria-label="Model" value={formData.model || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">หมายเลขตัวถัง (Chassis)</label>
                                <input type="text" name="chassisNumber" placeholder="ระบุหมายเลขตัวถัง" aria-label="Chassis Number" value={formData.chassisNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">หมายเลขตัวเครื่องยนต์</label>
                                <input type="text" name="engineNumber" placeholder="ระบุหมายเลขตัวเครื่องยนต์" aria-label="Engine Number" value={formData.engineNumber || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ปีที่ผลิต (ค.ศ.)</label>
                                <input type="number" name="yearOfManufacture" placeholder="เช่น 2018" aria-label="Year of Manufacture" value={formData.yearOfManufacture || ''} onChange={e => setFormData(prev => ({ ...prev, yearOfManufacture: e.target.value ? Number(e.target.value) : null }))} min={1990} max={new Date().getFullYear()} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">จังหวัดที่จดทะเบียน</label>
                                <input type="text" name="province" placeholder="เช่น กรุงเทพมหานคร" aria-label="Province" value={formData.province || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">เชื้อเพลิง</label>
                                <select name="fuelType" aria-label="Fuel Type" value={formData.fuelType || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">- เลือก -</option>
                                    <option value="ดีเซล">ดีเซล</option>
                                    <option value="เบนซิน">เบนซิน</option>
                                    <option value="NGV">NGV</option>
                                    <option value="LPG">LPG</option>
                                    <option value="ไฟฟ้า">ไฟฟ้า (EV)</option>
                                    <option value="ไฮบริด">ไฮบริด</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">วันหมดอายุภาษีรถยนต์</label>
                                <input
                                    type="date"
                                    name="taxExpiryDate"
                                    aria-label="Tax Expiry Date"
                                    value={formData.taxExpiryDate || ''}
                                    onChange={e => {
                                        const val = e.target.value || null;
                                        setFormData(prev => ({
                                            ...prev,
                                            taxExpiryDate: val,
                                            ...(!prev.actExpiryDate ? { actExpiryDate: val } : {})
                                        }));
                                    }}
                                    className={`mt-1 w-full p-2 border rounded-lg ${
                                        formData.taxExpiryDate && formData.actExpiryDate && formData.taxExpiryDate !== formData.actExpiryDate
                                            ? 'border-amber-400 bg-amber-50'
                                            : 'border-gray-300'
                                    }`}
                                />
                                {formData.actExpiryDate && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, taxExpiryDate: prev.actExpiryDate }))}
                                        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        <span>⇐</span> ซิงค์จากวัน พรบ. ({new Date(formData.actExpiryDate).toLocaleDateString('th-TH')})
                                    </button>
                                )}
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium">วันจดทะเบียนรถ</label>
                                <input type="date" name="registrationDate" aria-label="Registration Date" value={formData.registrationDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div className="lg:col-span-2">
                                <label htmlFor="vehicle-status-select" className="block text-sm font-medium">สถานะการใช้งาน</label>
                                <select
                                    id="vehicle-status-select"
                                    name="status"
                                    aria-label="สถานะการใช้งาน"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="Active">ใช้งานอยู่ (Active)</option>
                                    <option value="Inactive">เลิกใช้งาน (Inactive)</option>
                                </select>
                            </div>
                        </div>
                        <PhotoUpload
                            photos={formData.photos || []}
                            onChange={(photos) => setFormData({ ...formData, photos })}
                            entity="vehicle"
                            entityId={vehicle?.id || 'new'}
                        />
                    </div>
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ประกันภัย</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium">บริษัทประกันภัย</label>
                                <input type="text" name="insuranceCompany" placeholder="ระบุบริษัทประกัน" aria-label="Insurance Company" value={formData.insuranceCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ประเภทประกัน</label>
                                <input type="text" name="insuranceType" placeholder="เช่น ชั้น 1" aria-label="Insurance Type" value={formData.insuranceType || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">วันที่หมดอายุ</label>
                                <input type="date" name="insuranceExpiryDate" aria-label="Insurance Expiry Date" value={formData.insuranceExpiryDate || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">พ.ร.บ.</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">บริษัท พ.ร.บ.</label>
                                <input type="text" name="actCompany" placeholder="ระบุบริษัท พ.ร.บ." aria-label="ACT Company" value={formData.actCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">วันที่หมดอายุ พรบ.</label>
                                <input
                                    type="date"
                                    name="actExpiryDate"
                                    aria-label="ACT Expiry Date"
                                    value={formData.actExpiryDate || ''}
                                    onChange={e => {
                                        const val = e.target.value || null;
                                        setFormData(prev => ({
                                            ...prev,
                                            actExpiryDate: val,
                                            ...(!prev.taxExpiryDate ? { taxExpiryDate: val } : {})
                                        }));
                                    }}
                                    className={`mt-1 w-full p-2 border rounded-lg ${
                                        formData.taxExpiryDate && formData.actExpiryDate && formData.taxExpiryDate !== formData.actExpiryDate
                                            ? 'border-amber-400 bg-amber-50'
                                            : 'border-gray-300'
                                    }`}
                                />
                                {formData.actExpiryDate && formData.taxExpiryDate && formData.actExpiryDate === formData.taxExpiryDate
                                    ? <p className="mt-1 text-xs text-green-600">✓ ตรงกับวันหมดภาษี</p>
                                    : formData.taxExpiryDate && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, actExpiryDate: prev.taxExpiryDate }))}
                                            className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <span>⇐</span> ซิงค์จากวันภาษี ({new Date(formData.taxExpiryDate).toLocaleDateString('th-TH')})
                                        </button>
                                    )
                                }
                            </div>
                        </div>
                    </div>

                    {/* Mismatch warning banner */}
                    {formData.actExpiryDate && formData.taxExpiryDate && formData.actExpiryDate !== formData.taxExpiryDate && (
                        <div className="p-4 border-2 border-amber-300 rounded-lg bg-amber-50">
                            <div className="flex items-start gap-3">
                                <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
                                <div className="flex-1">
                                    <p className="font-semibold text-amber-800">วันหมดภาษี และ พรบ. ไม่ตรงกัน</p>
                                    <p className="text-xs text-amber-700 mt-1">โดยปกติวันหมดภาษีรถยนต์ควรตรงกันกับวันหมด พรบ. — หากต่างกันสามารถซิงค์ได้ตามต้องการ</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                        <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                                            <span className="text-gray-500">ภาษี:</span>
                                            <span className="font-mono font-bold text-gray-800">{new Date(formData.taxExpiryDate).toLocaleDateString('th-TH')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                                            <span className="text-gray-500">พรบ.:</span>
                                            <span className="font-mono font-bold text-gray-800">{new Date(formData.actExpiryDate).toLocaleDateString('th-TH')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, taxExpiryDate: prev.actExpiryDate }))}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            ซิงค์ภาษี ← ตาม พรบ. ({new Date(formData.actExpiryDate).toLocaleDateString('th-TH')})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, actExpiryDate: prev.taxExpiryDate }))}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            ซิงค์ พรบ. ← ตามภาษี ({new Date(formData.taxExpiryDate).toLocaleDateString('th-TH')})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-2">ประกันสินค้า</h4>
                        <div className="grid grid-cols-1">
                            <div>
                                <label className="block text-sm font-medium">บริษัทประกันสินค้า</label>
                                <input type="text" name="cargoInsuranceCompany" placeholder="ระบุบริษัทประกันสินค้า" aria-label="Cargo Insurance Company" value={formData.cargoInsuranceCompany || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </form>
                <div className="p-6 border-t flex justify-end space-x-4">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">ยกเลิก</button>
                    <button type="submit" form="vehicle-form" disabled={isSubmitting} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[120px]">
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface VehicleManagementProps {
    vehicles: Vehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
    repairs?: Repair[];
}

const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicles, setVehicles, repairs = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);

    // คำนวณรถที่กำลังซ่อมจากข้อมูลใบซ่อม
    const repairingPlates = useMemo(() => {
        const activeStatuses = ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'];
        const plates = new Set<string>();
        (Array.isArray(repairs) ? repairs : []).forEach(r => {
            if (activeStatuses.includes(r.status)) plates.add(r.licensePlate);
        });
        return plates;
    }, [repairs]);

    const getVehicleStatus = (vehicle: Vehicle): { label: string; className: string } => {
        if (vehicle.status === 'Inactive') return { label: 'เลิกใช้งาน', className: 'bg-slate-100 text-slate-500' };
        if (repairingPlates.has(vehicle.licensePlate)) return { label: 'กำลังซ่อม', className: 'bg-amber-100 text-amber-700' };
        return { label: 'ใช้งานได้', className: 'bg-green-100 text-green-700' };
    };

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

    const handleDeleteVehicle = async (vehicle: Vehicle) => {
        if (await promptForPasswordAsync('ลบ')) {
            const confirmed = await confirmAction('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรถทะเบียน ${vehicle.licensePlate}?`, 'ลบ');
            if (confirmed) {
                setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
                addToast(`ลบข้อมูลรถทะเบียน ${vehicle.licensePlate} สำเร็จ`, 'info');
            }
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

    const calculateVehicleAge = (dateString: string | null) => {
        if (!dateString) return '-';
        const start = new Date(dateString);
        const end = new Date();

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
            months--;
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        if (years < 0) return '-';
        if (years === 0 && months === 0) return 'น้อยกว่า 1 เดือน';

        return `${years} ปี ${months} เดือน`;
    };

    const handleExportVehicles = () => {
        const exportData = filteredVehicles.map(v => ({
            'ทะเบียน': v.licensePlate,
            'ประเภทรถ': v.vehicleType,
            'ยี่ห้อ': v.make,
            'รุ่น': v.model,
            'หมายเลขตัวเครื่อง': v.chassisNumber || '-',
            'อายุรถ': calculateVehicleAge(v.registrationDate),
            'วันที่จดทะเบียน': v.registrationDate || '-',
            'บริษัทประกัน': v.insuranceCompany || '-',
            'วันหมดอายุประกัน': v.insuranceExpiryDate || '-',
            'บริษัท พรบ.': v.actCompany || '-',
            'วันหมดอายุ พรบ.': v.actExpiryDate || '-',
            'รูปภาพ': v.photos ? v.photos.length : 0,
        }));
        exportToCSV('Fleet_Vehicles_List', exportData);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="ค้นหา (ทะเบียน, ประเภท, ยี่ห้อ)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 p-2 border border-gray-300 rounded-lg text-base"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleExportVehicles}
                        className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 border border-slate-200 flex items-center gap-2"
                    >
                        <Download size={16} />
                        ส่งออก CSV
                    </button>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        + เพิ่มข้อมูลรถ
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-auto max-h-[65vh]">
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียน</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประเภท / ยี่ห้อ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">อายุรถ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">หมายเลขตัวถัง / ตัวเครื่อง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">วันหมดอายุภาษี</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">จังหวัด</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">เชื้อเพลิง</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประกันภัย</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">พรบ.</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase">รูปภาพ</th>
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
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {vehicle.yearOfManufacture
                                            ? (() => { const age = new Date().getFullYear() - vehicle.yearOfManufacture!; return <span className={age >= 15 ? 'text-red-600 font-bold' : age >= 10 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>{age} ปี</span>; })()
                                            : calculateVehicleAge(vehicle.registrationDate)}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                                        {vehicle.chassisNumber && <div><span className="text-xs text-gray-400">ตัวถัง:</span> {vehicle.chassisNumber}</div>}
                                        {vehicle.engineNumber && <div><span className="text-xs text-gray-400">ตัวเครื่อง:</span> {vehicle.engineNumber}</div>}
                                        {!vehicle.chassisNumber && !vehicle.engineNumber && <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {vehicle.taxExpiryDate
                                            ? (() => { const s = getExpiryStatus(vehicle.taxExpiryDate); return <div><div className="text-gray-700">{new Date(vehicle.taxExpiryDate).toLocaleDateString('th-TH')}</div><div className={s.className + ' text-xs'}>({s.text})</div></div>; })()
                                            : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{vehicle.province || <span className="text-gray-300">-</span>}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {vehicle.fuelType
                                            ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{vehicle.fuelType}</span>
                                            : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{vehicle.insuranceCompany || '-'}</div>
                                        <div className={insuranceStatus.className}>{vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toLocaleDateString('th-TH') : '-'} ({insuranceStatus.text})</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{vehicle.actCompany || '-'}</div>
                                        <div className={actStatus.className}>{vehicle.actExpiryDate ? new Date(vehicle.actExpiryDate).toLocaleDateString('th-TH') : '-'} ({actStatus.text})</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => { const vs = getVehicleStatus(vehicle); return (
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${vs.className}`}>
                                                {vs.label}
                                            </span>
                                        ); })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">{vehicle.photos && vehicle.photos.length > 0 ? `${vehicle.photos.length} รูป` : '-'}</td>
                                    <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(vehicle)} className="text-yellow-600 hover:text-yellow-800 text-base font-medium">แก้ไข</button>
                                        <button onClick={() => handleDeleteVehicle(vehicle)} className="text-red-500 hover:text-red-700 text-base font-medium">ลบ</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>


                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {filteredVehicles.map(vehicle => {
                        const insuranceStatus = getExpiryStatus(vehicle.insuranceExpiryDate);
                        const actStatus = getExpiryStatus(vehicle.actExpiryDate);
                        return (
                            <div key={vehicle.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg text-gray-800">{vehicle.licensePlate}</span>
                                    {(() => { const vs = getVehicleStatus(vehicle); return (
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black ${vs.className}`}>
                                            {vs.label}
                                        </span>
                                    ); })()}
                                </div>
                                <div className="text-sm space-y-1 text-gray-600">
                                    <p>{vehicle.vehicleType} {vehicle.make} {vehicle.model}</p>
                                    <p>อายุรถ: {vehicle.yearOfManufacture ? `${new Date().getFullYear() - vehicle.yearOfManufacture} ปี` : calculateVehicleAge(vehicle.registrationDate)}</p>
                                    {vehicle.chassisNumber && <p>หมายเลขตัวถัง: {vehicle.chassisNumber}</p>}
                                    {vehicle.engineNumber && <p>หมายเลขตัวเครื่อง: {vehicle.engineNumber}</p>}
                                    {vehicle.taxExpiryDate && <p>วันหมดภาษี: {new Date(vehicle.taxExpiryDate).toLocaleDateString('th-TH')}</p>}
                                    {vehicle.province && <p>จังหวัด: {vehicle.province}</p>}
                                    {vehicle.fuelType && <p>เชื้อเพลิง: {vehicle.fuelType}</p>}
                                    <p>รูปภาพ: {vehicle.photos ? vehicle.photos.length : 0} รูป</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                                    <div>
                                        <span className="block text-xs text-gray-500">ประกัน</span>
                                        <span className="block font-medium truncate">{vehicle.insuranceCompany || '-'}</span>
                                        <span className={`text-xs ${insuranceStatus.className}`}>{vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toLocaleDateString('th-TH') : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-500">พรบ.</span>
                                        <span className="block font-medium truncate">{vehicle.actCompany || '-'}</span>
                                        <span className={`text-xs ${actStatus.className}`}>{vehicle.actExpiryDate ? new Date(vehicle.actExpiryDate).toLocaleDateString('th-TH') : '-'}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                    <button onClick={() => handleOpenModal(vehicle)} className="text-yellow-600 hover:text-yellow-800 font-bold text-sm bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">แก้ไข</button>
                                    <button onClick={() => handleDeleteVehicle(vehicle)} className="text-red-600 hover:text-red-800 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">ลบข้อมูล</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {
                isModalOpen && (
                    <VehicleModal
                        vehicle={editingVehicle}
                        onSave={handleSaveVehicle}
                        onClose={() => setIsModalOpen(false)}
                        existingVehicles={safeVehicles}
                    />
                )
            }
        </div >
    );
};

export default VehicleManagement;