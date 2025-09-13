import React, { useEffect } from 'react';
import type { PurchaseRequisition } from '../types';

interface PurchaseRequisitionPrintProps {
    requisition: PurchaseRequisition;
    onClosePrintView: () => void;
}

const PurchaseRequisitionPrint: React.FC<PurchaseRequisitionPrintProps> = ({ requisition, onClosePrintView }) => {

    useEffect(() => {
        // Automatically trigger the print dialog when the component mounts
        window.print();
    }, []);

    const subtotal = requisition.totalAmount;
    // Assuming VAT is not explicitly stored, but can be derived or is part of notes if applicable.
    // For this view, we'll show a simple structure.
    const grandTotal = subtotal;

    return (
        <div className="fixed inset-0 bg-white z-[110] p-4 sm:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-white">
                <div className="flex justify-between items-center mb-4 no-print">
                    <h2 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์</h2>
                    <div className="space-x-2">
                        <button onClick={onClosePrintView} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                           กลับไปแก้ไข
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            พิมพ์
                        </button>
                    </div>
                </div>

                <div className="p-8 border-2 border-gray-300">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                        <div className="w-1/3">
                            <h1 className="text-3xl font-bold text-black">ใบขอซื้อ</h1>
                            <h2 className="text-xl font-semibold text-gray-600">Purchase Requisition</h2>
                        </div>
                        <div className="w-1/3 text-center">
                            <p className="text-lg font-semibold">NEOSIAM LOGISTICS & TRANSPORT</p>
                            <p className="text-xs">ที่อยู่บริษัท...</p>
                        </div>
                        <div className="w-1/3 text-right">
                            <p><strong>เลขที่:</strong> {requisition.prNumber}</p>
                            <p><strong>วันที่:</strong> {new Date(requisition.createdAt).toLocaleDateString('th-TH')}</p>
                        </div>
                    </div>

                    {/* Requester Info */}
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="border p-3">
                             <p><strong>ผู้จำหน่าย (Supplier):</strong></p>
                             <p>{requisition.supplier || '-'}</p>
                        </div>
                        <div className="border p-3">
                             <p><strong>ผู้ขอซื้อ:</strong> {requisition.requesterName}</p>
                             <p><strong>แผนก:</strong> {requisition.department}</p>
                             <p><strong>วันที่ต้องการใช้:</strong> {new Date(requisition.dateNeeded).toLocaleDateString('th-TH')}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2 text-center">ลำดับ</th>
                                <th className="border border-black p-2 text-left">รายการ</th>
                                <th className="border border-black p-2 text-right">จำนวน</th>
                                <th className="border border-black p-2 text-center">หน่วย</th>
                                <th className="border border-black p-2 text-right">ราคา/หน่วย</th>
                                <th className="border border-black p-2 text-right">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(Array.isArray(requisition.items) ? requisition.items : []).map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-black p-2 text-center">{index + 1}</td>
                                    <td className="border border-black p-2">{item.name}</td>
                                    <td className="border border-black p-2 text-right">{item.quantity}</td>
                                    <td className="border border-black p-2 text-center">{item.unit}</td>
                                    <td className="border border-black p-2 text-right">{item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="border border-black p-2 text-right">{(item.quantity * item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                     <div className="flex justify-end mt-4">
                        <div className="w-1/2">
                            <div className="flex justify-between p-2">
                                <span>รวมเป็นเงิน</span>
                                <span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between p-2 border-t border-b border-black font-bold">
                                <span>ยอดรวมสุทธิ</span>
                                <span>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                        <p><strong>หมายเหตุ:</strong> {requisition.notes || '-'}</p>
                    </div>


                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-4 mt-16 pt-8">
                        <div className="text-center">
                            <p>.................................................</p>
                            <p>({requisition.requesterName})</p>
                            <p>ผู้ขอซื้อ</p>
                        </div>
                        <div className="text-center">
                             <p>.................................................</p>
                             <p>({requisition.approverName || ' '})</p>
                             <p>ผู้อนุมัติ</p>
                        </div>
                        <div className="text-center">
                             <p>.................................................</p>
                             <p>(ผู้รับสินค้า)</p>
                             <p>ผู้รับสินค้า</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseRequisitionPrint;
