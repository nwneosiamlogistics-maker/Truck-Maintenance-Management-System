import React from 'react';
import type { Repair, Technician } from '../types';

interface RepairOrderPrintLayoutProps {
    repair: Repair;
    technicians: Technician[];
}

const RepairOrderPrintLayout: React.FC<RepairOrderPrintLayoutProps> = ({ repair, technicians }) => {

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '...........................';
        try {
            return new Date(dateString).toLocaleDateString('th-TH', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch {
            return '...........................';
        }
    };
    
    const Checkbox: React.FC<{ checked: boolean, label: string }> = ({ checked, label }) => (
        <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center">
                {checked && <div className="w-3 h-3 bg-black"></div>}
            </div>
            <span>{label}</span>
        </div>
    );

    const mainTechnician = technicians.find(t => t.id === repair.assignedTechnicianId);
    const assistantTechnicians = technicians.filter(t => (repair.assistantTechnicianIds || []).includes(t.id));
    const allTechnicians = [mainTechnician, ...assistantTechnicians].filter(Boolean as any);

    const parts = Array.isArray(repair.parts) ? repair.parts : [];
    // Create an array with a fixed size for the table layout
    const partRows = Array.from({ length: 8 }, (_, i) => parts[i] || null);

    return (
        <div className="h-full flex flex-col bg-white text-black text-xs">
            {/* Header */}
            <div className="flex justify-between items-start pb-1">
                <div className="w-1/4">
                    <div className="w-32 h-12 border-2 border-black flex items-center justify-center font-bold text-xl">
                        NEO
                    </div>
                </div>
                <div className="w-1/2 text-center">
                    <p className="font-bold text-sm">นีโอสยาม โลจิสติกส์เทรานสปอร์ต</p>
                    <p className="font-bold text-sm">NEOSIAM LOGISTICS & TRANSPORT</p>
                </div>
                <div className="w-1/4">
                    <div className="border border-black p-1">
                        <p className="font-bold">เลขที่ใบแจ้งซ่อม :</p>
                        <p className="text-center">{repair.repairOrderNo || ''}</p>
                    </div>
                </div>
            </div>

            {/* Sub-Header */}
            <div className="flex justify-between items-end border-y-2 border-black py-1">
                <div className="flex items-end space-x-2">
                    <p><strong>ทะเบียน :</strong> {repair.licensePlate || '..................'}</p>
                    <p><strong>ประเภทของรถ :</strong> {repair.vehicleType || '..................'}</p>
                </div>
                <div>
                    <p><strong>เลขไมค์ :</strong> {repair.currentMileage ? `${Number(repair.currentMileage).toLocaleString()} กม.` : '..................'}</p>
                </div>
            </div>

            {/* Requester Details */}
            <div className="border border-black mt-1">
                <div className="bg-gray-300 text-center font-bold py-0.5">ผู้แจ้งซ่อมกรอกรายละเอียด</div>
                <div className="flex justify-around p-1">
                    <p><strong>ประเภทของการซ่อม</strong></p>
                    <Checkbox checked={repair.repairCategory.includes('ซ่อม')} label="ซ่อม" />
                    <Checkbox checked={repair.repairCategory.includes('เปลี่ยน')} label="เปลี่ยน" />
                    <Checkbox checked={repair.repairCategory.includes('ตรวจเช็ค')} label="ตรวจเช็ค" />
                </div>
                <div className="p-1 border-t border-black overflow-hidden">
                    <p><strong>อาการของพาหนะที่เสียหรือผิดปกติพอสังเขป :</strong></p>
                    <p className="pl-4 h-12 break-words">{repair.problemDescription || ''}</p>
                </div>
            </div>
            
             {/* Requester Signatures */}
            <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="text-center">
                    <p><strong>ผู้แจ้ง</strong>.................................................</p>
                    <p className="text-left text-xs">(พนักงานขับรถ) {repair.reportedBy || ''}</p>
                    <p className="text-left text-xs"><strong>วันที่</strong> {formatDate(repair.createdAt)}</p>
                </div>
                <div className="text-center">
                    <p><strong>ผู้รับแจ้ง</strong>...........................................</p>
                    <p className="text-left text-xs">(ช่างซ่อมบำรุง) {mainTechnician?.name || ''}</p>
                    <p className="text-left text-xs"><strong>วันที่</strong> {formatDate(repair.createdAt)}</p>
                </div>
                 <div className="text-center">
                    <p><strong>ผู้อนุมัติ</strong>.............................................</p>
                    <p className="text-left text-xs">(ผู้จัดการ/หัวหน้าแผนก)</p>
                    <p className="text-left text-xs"><strong>วันที่</strong> {formatDate(repair.approvalDate)}</p>
                </div>
            </div>
            
            {/* Maintenance Section */}
            <div className="border-2 border-black mt-1 flex-grow">
                 <div className="bg-gray-300 text-center font-bold py-0.5">สำหรับหน่วยงานซ่อมบำรุง</div>
                 <div className="grid grid-cols-2 h-[calc(100%-1.25rem)]">
                    <div className="border-r-2 border-black p-1 overflow-hidden">
                        <p className="font-bold text-center">สาเหตุ</p>
                         <p className="mt-2 pl-2 h-12 break-words">{repair.problemDescription || ''}</p>
                    </div>
                    <div className="p-1 overflow-hidden">
                        <p className="font-bold text-center">การแก้ไข</p>
                        <p className="mt-2 pl-2 h-12 break-words">{repair.repairResult || ''}</p>
                    </div>
                 </div>
            </div>

            {/* Repair type & Parts Table */}
             <div className="border-x-2 border-b-2 border-black">
                 <div className="flex justify-around p-1 border-b-2 border-black">
                     <p><strong>การตรวจซ่อม</strong></p>
                     <Checkbox checked={repair.dispatchType === 'ภายใน'} label="ซ่อมโดยช่างภายใน" />
                     <Checkbox checked={repair.dispatchType === 'ภายนอก'} label="ติดต่อผู้ซ่อมจากภายนอก" />
                 </div>
                 <div className="bg-gray-300 text-center font-bold py-0.5">รายการอะไหล่ที่ใช้ ( กรณีซ่อมภายใน )</div>
                 <table className="w-full">
                     <thead>
                         <tr className="text-center">
                             <th className="border w-8">ลำดับ</th>
                             <th className="border">รายการ</th>
                             <th className="border w-16">จำนวน</th>
                             <th className="border w-24">ใบสั่งซื้อเลขที่</th>
                             <th className="border w-28">เวลาในการรออะไหล่(วัน)</th>
                             <th className="border w-24">หมายเหตุ</th>
                         </tr>
                     </thead>
                     <tbody>
                        {partRows.map((part, i) => (
                            <tr key={i} className="h-6">
                                <td className="border text-center">{part ? i + 1 : ''}</td>
                                <td className="border pl-1">{part?.name || ''}</td>
                                <td className="border text-center">{part ? `${part.quantity} ${part.unit}` : ''}</td>
                                <td className="border text-center">{i === 0 ? (repair.requisitionNumber || '') : ''}</td>
                                <td className="border"></td>
                                <td className="border"></td>
                            </tr>
                        ))}
                     </tbody>
                 </table>
             </div>

            {/* Final Dates & Signatures */}
            <div className="mt-1">
                 <div className="grid grid-cols-4 gap-2">
                    <p><strong>กำหนดเสร็จเบื้องต้น วันที่</strong> {formatDate(repair.estimations[0]?.estimatedEndDate)}</p>
                    <p><strong>วันที่เริ่มซ่อม:</strong> {formatDate(repair.repairStartDate)}</p>
                    <p><strong>วันที่ซ่อมเสร็จ:</strong> {formatDate(repair.repairEndDate)}</p>
                    <p><strong>ผู้รับรถ:</strong>.............................</p>
                 </div>
                 <div className="grid grid-cols-4 gap-2">
                    <p><strong>กำหนดเสร็จแก้ไขเพิ่มเติม วันที่</strong>...........................</p>
                    <p></p>
                    <p></p>
                    <p><strong>วันที่</strong>.............................</p>
                 </div>
            </div>

            <div className="mt-2 flex justify-between">
                 <div className="w-1/2">
                     <p className="font-bold">ช่างผู้ปฏิบัติงาน</p>
                     {allTechnicians.slice(0, 3).map((tech, i) => (
                         <p key={i} className="pl-2">{i+1}. {tech?.name || '...........................................'}</p>
                     ))}
                      {allTechnicians.length === 0 && Array.from({length: 3}).map((_, i) => <p key={i} className="pl-2">{i+1}. ...........................................</p>)}
                 </div>
                 <div className="w-1/2 text-center">
                     <p className="mt-8">ผู้ตรวจสอบ.................................................</p>
                     <p className="text-left pl-14 text-xs"><strong>วันที่</strong>.................................................</p>
                 </div>
            </div>
        </div>
    );
};

export default RepairOrderPrintLayout;