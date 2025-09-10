import React from 'react';
import StatCard from './StatCard';

const Estimation: React.FC = () => {
    const sampleData = [
        { id: 'MR 01-2024-2025', vehicle: 'กข-1234', type: 'รถบรรทุก 6 ล้อ', repair: 'ซ่อมเครื่องยนต์', estimated: '16 ชั่วโมง', actual: '18 ชั่วโมง', accuracy: 89, status: 'เสร็จแล้ว' },
        { id: 'MR 01-2025-2025', vehicle: 'คง-5678', type: 'รถบรรทุก 10 ล้อ', repair: 'ซ่อมเบรก', estimated: '8 ชั่วโมง', actual: '-', accuracy: null, status: 'กำลังซ่อม' }
    ];

    const getStatusBadge = (status: string) => status === 'เสร็จแล้ว' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    const getAccuracyColor = (accuracy: number | null) => {
        if (accuracy === null) return 'text-gray-500';
        if (accuracy >= 90) return 'text-green-600';
        if (accuracy >= 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="ประมาณการทั้งหมด" value="89" bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="ตรงเวลา" value="76" bgColor="bg-green-50" textColor="text-green-600" />
                <StatCard title="ล่าช้า" value="13" bgColor="bg-red-50" textColor="text-red-600" />
                <StatCard title="ความแม่นยำเฉลี่ย" value="85.4%" bgColor="bg-indigo-50" textColor="text-indigo-600" />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">รายการประมาณการณ์</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ประมาณการ</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">ใช้จริง</th>
                                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase">ความแม่นยำ</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sampleData.map(item => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-base font-semibold">{item.vehicle}</div>
                                        <div className="text-sm text-gray-500">{item.repair}</div>
                                    </td>
                                    <td className="px-6 py-4 text-base">{item.estimated}</td>
                                    <td className="px-6 py-4 text-base">{item.actual}</td>
                                    <td className={`px-6 py-4 text-base text-center font-bold ${getAccuracyColor(item.accuracy)}`}>{item.accuracy ? `${item.accuracy}%` : '-'}</td>
                                    <td className="px-6 py-4"><span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Estimation;