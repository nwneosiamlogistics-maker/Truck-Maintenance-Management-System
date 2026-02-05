import React, { useMemo } from 'react';
import type { UsedPart } from '../types';

interface UsedPartSaleReceiptModalProps {
    part: UsedPart;
    onClose: () => void;
}

const UsedPartSaleReceiptModal: React.FC<UsedPartSaleReceiptModalProps> = ({ part, onClose }) => {

    const saleDisposition = useMemo(() => {
        const sales = (part.dispositions || []).filter(d => d.dispositionType === 'ขาย');
        if (sales.length === 0) return null;
        // Get the most recent one by sorting by date
        return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [part]);

    const handlePrint = () => {
        window.print();
    };

    if (!saleDisposition) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4 no-print">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">ไม่พบข้อมูลการขาย</h3>
                    <p className="text-gray-600">ไม่พบรายการ "ขาย" สำหรับอะไหล่ชิ้นนี้</p>
                    <button onClick={onClose} className="mt-6 px-6 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        ปิด
                    </button>
                </div>
            </div>
        );
    }

    const totalSalePrice = (saleDisposition.salePricePerUnit || 0) * saleDisposition.quantity;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[105] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center no-print">
                    <h3 className="text-xl font-bold text-gray-800">ตัวอย่างใบขายอะไหล่เก่า</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full" aria-label="ปิด">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto printable-area">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                            <div>
                                <h1 className="text-3xl font-bold">ใบขายอะไหล่เก่า</h1>
                                <p className="text-gray-500">Used Part Sales Slip</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-lg">NEOSIAM LOGISTICS & TRANSPORT</p>
                                <p className="text-sm">เลขที่: SALE-{part.id.substring(3, 10)}</p>
                                <p className="text-sm">วันที่: {new Date(saleDisposition.date).toLocaleDateString('th-TH')}</p>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h2 className="font-semibold border-b mb-2">ข้อมูลผู้ขาย</h2>
                                <p>NEOSIAM LOGISTICS & TRANSPORT</p>
                            </div>
                            <div>
                                <h2 className="font-semibold border-b mb-2">ข้อมูลผู้รับซื้อ</h2>
                                <p>{saleDisposition.soldTo}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full border-collapse border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">ลำดับ</th>
                                    <th className="border p-2 text-left">รายการ</th>
                                    <th className="border p-2 text-right">จำนวน</th>
                                    <th className="border p-2 text-right">ราคา/หน่วย</th>
                                    <th className="border p-2 text-right">ราคารวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-2 text-center">1</td>
                                    <td className="border p-2">{part.name}</td>
                                    <td className="border p-2 text-right">{saleDisposition.quantity}</td>
                                    <td className="border p-2 text-right">{(saleDisposition.salePricePerUnit || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="border p-2 text-right">{totalSalePrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Total */}
                         <div className="flex justify-end">
                             <div className="w-1/2">
                                <div className="flex justify-between p-2 border-t border-b-2 border-black font-bold text-lg">
                                    <span>ยอดรวมสุทธิ</span>
                                    <span>{totalSalePrice.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4 pt-16">
                            <div className="text-center">
                                <p className="border-t pt-2">.................................................</p>
                                <p>ผู้ขาย</p>
                            </div>
                             <div className="text-center">
                                <p className="border-t pt-2">.................................................</p>
                                <p>ผู้รับเงิน</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end space-x-4 bg-gray-50 no-print">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ปิด</button>
                    <button type="button" onClick={handlePrint} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsedPartSaleReceiptModal;
